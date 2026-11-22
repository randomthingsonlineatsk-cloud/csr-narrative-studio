// ONK-44-302, the oncology study, for the oncology CSR mission. Its SDTM comes from the SDTM
// Mapping Trainer's reference mapping (src/data/sdtm-onk-44-302.json, written by that app's
// tests/csronk.test.ts). This script derives ADSL and the time-to-event and response analyses the
// way a TLF programmer would, and writes the outputs (tables with their ARD rows and ARS keys)
// and the protocol. RECIST 1.1; times from randomisation; data cut-off 2026-10-31.
//   PFS: first progression (overall response PD) or death, whichever first; otherwise censored at
//        the last adequate assessment (overall response other than NE), or at randomisation.
//   OS:  death; otherwise censored at the last contact date (no later than the cut-off).
//   Best overall response: CR > PR > SD (at least 5 weeks after randomisation) > PD > NE;
//        responses need no confirmation in this randomised study (RECIST 1.1).
//   Kaplan-Meier medians with Brookmeyer-Crowley 95% CIs (log-log); Cox model (Breslow ties)
//   for the hazard ratio with a Wald CI; log-rank test; Clopper-Pearson CIs for response rates.
// Run: node scripts/make-onk-44-302.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const S = JSON.parse(readFileSync(new URL('../src/data/sdtm-onk-44-302.json', import.meta.url)))
const rows = (d) => { const t = S.domains[d]; return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]]))) }
const CUT = S.cutoff, A = 'ONK-44 400 mg', B = 'Docetaxel', G = [A, B], GT = [...G, 'Total']
const ARM = { ONK44: A, DOCE: B }
const day = (d) => Date.parse(`${d}T00:00:00Z`) / 86400000
const full = (d) => (/^\d{4}-\d{2}-\d{2}/.test(d ?? '') ? d.slice(0, 10) : /^\d{4}-\d{2}$/.test(d ?? '') ? `${d}-01` : null) // a partial death date: the first of the month
const MON = 30.4375, f1 = (x) => (Math.round(x * 10) / 10).toFixed(1), f2 = (x) => (Math.round(x * 100) / 100).toFixed(2), f3 = (x) => (x < 0.001 ? '<0.001' : (Math.round(x * 1000) / 1000).toFixed(3))

// ---------- ADSL ----------
const dm = rows('DM'), irt = new Map(rows('IRT').map((r) => [r.USUBJID, r])), rs = rows('RS'), dd = new Map(rows('DD').map((r) => [r.USUBJID, r]))
const adsl = dm.filter((r) => irt.has(r.USUBJID)).map((r) => {
  const ir = irt.get(r.USUBJID), trtp = ARM[ir.RANDARM], trta = r.ACTARMCD ? ARM[r.ACTARMCD] : ''
  const dth = full(r.DTHDTC), last = r.RFPENDTC && r.RFPENDTC < CUT ? r.RFPENDTC : CUT
  const ts = r.RFXSTDTC, te = r.RFXENDTC, dur = ts && te ? day(te) - day(ts) + (trta === B ? 21 : 1) : null
  return { USUBJID: r.USUBJID, SITEID: r.SITEID, AGE: Number(r.AGE), AGEGR1: Number(r.AGE) < 65 ? '<65' : '>=65', SEX: r.SEX, RACE: r.RACE, COUNTRY: r.COUNTRY, TRT01P: trtp, TRT01A: trta, RANDDT: ir.RANDDT, TRTSDT: ts || '', TRTEDT: te || '', TRTDURD: dur, ITTFL: 'Y', SAFFL: trta ? 'Y' : 'N', DTHFL: dth ? 'Y' : 'N', DTHDT: dth ?? '', LSTALVDT: dth ?? last }
})
// ---------- ADTTE and best overall response ----------
const ovr = (u, ev) => rs.filter((r) => r.USUBJID === u && r.RSTESTCD === 'OVRLRESP' && r.RSEVAL === ev).sort((a, b) => a.RSDTC.localeCompare(b.RSDTC))
function pfs(s, ev) {
  const o = ovr(s.USUBJID, ev).filter((r) => r.RSDTC <= CUT), pd = o.find((r) => r.RSSTRESC === 'PD'), dth = s.DTHDT && s.DTHDT <= CUT ? s.DTHDT : null
  const evd = [pd?.RSDTC, dth].filter(Boolean).sort()[0]
  if (evd) return { t: day(evd) - day(s.RANDDT) + 1, e: 1, cause: pd && pd.RSDTC === evd ? 'PD' : 'DEATH' }
  const ad = o.filter((r) => r.RSSTRESC !== 'NE').at(-1)
  return { t: ad ? day(ad.RSDTC) - day(s.RANDDT) + 1 : 1, e: 0 }
}
const os = (s) => (s.DTHDT && s.DTHDT <= CUT ? { t: day(s.DTHDT) - day(s.RANDDT) + 1, e: 1 } : { t: day(s.LSTALVDT) - day(s.RANDDT) + 1, e: 0 })
const RANK = { CR: 5, PR: 4, SD: 3, PD: 2, NE: 1 }
function bor(s, ev) {
  let best = 'NE'
  for (const r of ovr(s.USUBJID, ev).filter((x) => x.RSDTC <= CUT)) {
    const v = r.RSSTRESC; if (!RANK[v]) continue
    if (v === 'SD' && day(r.RSDTC) - day(s.RANDDT) + 1 < 36) continue
    if (RANK[v] > RANK[best]) best = v
    if (v === 'PD') break
  }
  return best
}
const IRC = 'INDEPENDENT ASSESSOR', INV = 'INVESTIGATOR'

// ---------- statistics ----------
function km(data) { // data: [{t,e}]
  const ts = [...new Set(data.filter((d) => d.e).map((d) => d.t))].sort((a, b) => a - b)
  let S = 1, gw = 0; const out = []
  for (const t of ts) { const n = data.filter((d) => d.t >= t).length, d = data.filter((x) => x.t === t && x.e).length, c = data.filter((x) => x.t === t && !x.e).length; S *= 1 - d / n; gw += n > d ? d / (n * (n - d)) : 0; out.push({ t, n, d, c, S, gw }) }
  return out
}
function median(data) {
  const k = km(data), med = k.find((x) => x.S <= 0.5)?.t ?? null
  const band = (x) => { if (x.S <= 0 || x.S >= 1) return [x.S, x.S]; const se = Math.sqrt(x.gw) / Math.abs(Math.log(x.S)), l = Math.log(-Math.log(x.S)); return [Math.exp(-Math.exp(l + 1.959964 * se)), Math.exp(-Math.exp(l - 1.959964 * se))] }
  const lo = k.find((x) => band(x)[0] <= 0.5)?.t ?? null, hi = k.find((x) => band(x)[1] <= 0.5)?.t ?? null
  return { med, lo, hi }
}
function cox(data) { // data: [{t,e,x}] x=1 for ONK-44; Breslow
  const times = [...new Set(data.filter((d) => d.e).map((d) => d.t))]
  const score = (b) => { let U = 0, I = 0; for (const t of times) { const R = data.filter((d) => d.t >= t), D = data.filter((d) => d.t === t && d.e), s0 = R.reduce((a, d) => a + Math.exp(b * d.x), 0), s1 = R.reduce((a, d) => a + d.x * Math.exp(b * d.x), 0), m = s1 / s0; U += D.reduce((a, d) => a + d.x, 0) - D.length * m; I += D.length * (m - m * m) } return { U, I } }
  let b = 0; for (let i = 0; i < 50; i++) { const { U, I } = score(b); const step = U / I; b += step; if (Math.abs(step) < 1e-10) break }
  const { I } = score(b), se = 1 / Math.sqrt(I)
  // The log-rank test, with the hypergeometric variance.
  let O = 0, E = 0, V = 0
  for (const t of times) { const R = data.filter((d) => d.t >= t), n = R.length, n1 = R.filter((d) => d.x).length, D = data.filter((d) => d.t === t && d.e), dd = D.length; O += D.filter((d) => d.x).length; E += (dd * n1) / n; if (n > 1) V += (dd * (n1 / n) * (1 - n1 / n) * (n - dd)) / (n - 1) }
  return { hr: Math.exp(b), lo: Math.exp(b - 1.959964 * se), hi: Math.exp(b + 1.959964 * se), p: chi1(((O - E) * (O - E)) / V) }
}
function chi1(x) { const z = Math.sqrt(x); return 2 * (1 - phi(z)) }
function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989422804014327 * Math.exp((-z * z) / 2), p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))); return z > 0 ? 1 - p : p }
function binCdf(k, n, p) { let s = 0, c = 1; for (let i = 0; i <= k; i++) { if (i > 0) c = (c * (n - i + 1)) / i; s += c * p ** i * (1 - p) ** (n - i) } return s }
function cp(k, n) { const bis = (f) => { let a = 0, b = 1; for (let i = 0; i < 100; i++) { const m = (a + b) / 2; if (f(m)) b = m; else a = m } return (a + b) / 2 }
  const lo = k === 0 ? 0 : bis((p) => 1 - binCdf(k - 1, n, p) >= 0.025), hi = k === n ? 1 : bis((p) => binCdf(k, n, p) <= 0.025); return [lo, hi] }

// ---------- outputs ----------
let frame = []
const cell = (an, g, text, cat = null, stats = {}) => { for (const [k, v] of Object.entries(stats)) frame.push([an, g, cat, k, String(v)]); return { text, keys: [{ an, g, cat }] } }
const row = (label, cells, indent) => ({ label, ...(indent !== undefined ? { indent } : {}), cells })
const blank = (cols) => cols.map(() => ({ text: '' }))
const npct = (n, d) => (n === 0 ? '0' : `${n} (${f1((100 * n) / d)})`)
const output = (id, title, ref, shell, display) => { const fr = { columns: ['ANALYSIS', 'GROUP', 'CATEGORY', 'STAT', 'VALUE'], rows: frame }; frame = []; return { id, title, kind: 'ard', area: /14\.2/.test(title) ? 'Efficacy' : 'Safety', ref, shell, frame: fr, display } }
const itt = (g) => (g === 'Total' ? adsl : adsl.filter((s) => s.TRT01P === g)), saf = (g) => (g === 'Total' ? adsl : adsl.filter((s) => s.TRT01A === g)).filter((s) => s.SAFFL === 'Y')
const N = Object.fromEntries(GT.map((g) => [g, itt(g).length]))
const nRow = (label, an, pick, cat, indent, pop = itt) => row(label, GT.map((g) => { const n = pop(g).filter(pick).length, d = pop(g).length; return cell(an, g, npct(n, d), cat, { n, pct: (100 * n) / d }) }), indent)

const screened = dm.length, fails = dm.filter((r) => r.ARMNRS === 'SCREEN FAILURE' || !irt.has(r.USUBJID)).length
const pfsI = new Map(adsl.map((s) => [s.USUBJID, pfs(s, IRC)]))
const T1 = output('T1', 'Table 14.1.1: disposition at the data cut-off (randomised participants)', 'SAP 9.1; ICH E3 section 10.1', 'Screened; screen failures; randomised; treated; on treatment at the cut-off; progression or death (independent review); died; alive at the cut-off.', {
  title: 'Table 14.1.1 Disposition at the data cut-off', population: `All randomised participants; data cut-off ${CUT}`, head: GT, groups: GT, rows: [
    row('Screened', GT.map((g) => cell('SCREENED', 'Total', g === 'Total' ? String(screened) : '', null, g === 'Total' ? { n: screened } : {}))),
    row('Screen failures', GT.map((g) => cell('SCRFAIL', 'Total', g === 'Total' ? String(fails) : '', null, g === 'Total' ? { n: fails } : {}))),
    row('Randomised', GT.map((g) => cell('POP', g, String(N[g]), null, { N: N[g] }))),
    nRow('Treated', 'TREATED', (s) => s.SAFFL === 'Y', null, 0),
    nRow('Progressed or died (independent review)', 'PFSEVT', (s) => pfsI.get(s.USUBJID).e === 1, null, 0),
    nRow('Died', 'DEATH', (s) => s.DTHFL === 'Y' && s.DTHDT <= CUT, null, 0),
    nRow('Alive at the data cut-off', 'ALIVE', (s) => !(s.DTHFL === 'Y' && s.DTHDT <= CUT), null, 0),
  ], footnotes: [`Screen failures did not reach randomisation. Data cut-off ${CUT}.`] })

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length, sd = (xs) => Math.sqrt(xs.reduce((a, b) => a + (b - mean(xs)) ** 2, 0) / (xs.length - 1)), med = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length / 2; return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2 }
const ages = (g) => itt(g).map((s) => s.AGE)
const cats = (v) => [...new Set(adsl.map((s) => s[v]))].sort()
const T2 = output('T2', 'Table 14.1.2: demographics (intent-to-treat population)', 'SAP 9.2; ICH E3 section 11.2', 'Age; age group; sex; race; country.', {
  title: 'Table 14.1.2 Demographic characteristics', population: 'Intent-to-treat population (all randomised)', head: GT, groups: GT, rows: [
    row('Age (years)', blank(GT)),
    row('Mean (SD)', GT.map((g) => cell('AGE', g, `${f1(mean(ages(g)))} (${f2(sd(ages(g)))})`, null, { mean: mean(ages(g)), sd: sd(ages(g)) })), 1),
    row('Median', GT.map((g) => cell('AGE', g, f1(med(ages(g))), null, { median: med(ages(g)) })), 1),
    row('Min, Max', GT.map((g) => cell('AGE', g, `${Math.min(...ages(g))}, ${Math.max(...ages(g))}`, null, { min: Math.min(...ages(g)), max: Math.max(...ages(g)) })), 1),
    row('Age group, n (%)', blank(GT)), ...['<65', '>=65'].map((c) => nRow(c, 'AGEGR1', (s) => s.AGEGR1 === c, c, 1)),
    row('Sex, n (%)', blank(GT)), ...cats('SEX').map((c) => nRow(c, 'SEX', (s) => s.SEX === c, c, 1)),
    row('Race, n (%)', blank(GT)), ...cats('RACE').map((c) => nRow(c, 'RACE', (s) => s.RACE === c, c, 1)),
    row('Country, n (%)', blank(GT)), ...cats('COUNTRY').map((c) => nRow(c, 'COUNTRY', (s) => s.COUNTRY === c, c, 1)),
  ], footnotes: [] })

function tteTable(id, num, title, ref, an, get, foot) {
  const d = (g) => itt(g).map((s) => get(s)), m = Object.fromEntries(G.map((g) => [g, median(d(g))]))
  const c = cox(adsl.map((s) => ({ ...get(s), x: s.TRT01P === A ? 1 : 0 })))
  const mo = (x) => (x === null ? 'NE' : f1(x / MON))
  const ev = (g) => d(g).filter((x) => x.e).length
  return output(id, `Table ${num}: ${title}`, ref, 'Participants; events; censored; median in months (95% CI); hazard ratio (95% CI); log-rank p-value.', {
    title: `Table ${num} ${title.charAt(0).toUpperCase()}${title.slice(1)}`, population: 'Intent-to-treat population (all randomised), as randomised', head: G, groups: G, rows: [
      row('Participants', G.map((g) => cell(an, g, String(N[g]), null, { n: N[g] }))),
      row('With an event, n (%)', G.map((g) => cell(`${an}_EVT`, g, npct(ev(g), N[g]), null, { n: ev(g), pct: (100 * ev(g)) / N[g] }))),
      row('Censored, n (%)', G.map((g) => cell(`${an}_CNS`, g, npct(N[g] - ev(g), N[g]), null, { n: N[g] - ev(g), pct: (100 * (N[g] - ev(g))) / N[g] }))),
      row('Median, months (95% CI)', G.map((g) => cell(`${an}_MED`, g, `${mo(m[g].med)} (${mo(m[g].lo)}, ${mo(m[g].hi)})`, null, Object.fromEntries([['est', m[g].med && m[g].med / MON], ['lcl', m[g].lo && m[g].lo / MON], ['ucl', m[g].hi && m[g].hi / MON]].filter(([, v]) => v !== null))))),
      row('Hazard ratio, ONK-44 vs docetaxel (95% CI)', [cell(`${an}_HR`, A, `${f2(c.hr)} (${f2(c.lo)}, ${f2(c.hi)})`, null, { est: c.hr, lcl: c.lo, ucl: c.hi }), { text: '' }]),
      row('Log-rank test, p-value', [cell(`${an}_P`, A, f3(c.p), null, { p: c.p }), { text: '' }]),
    ], footnotes: [...foot, 'Kaplan-Meier medians; 95% CI by the Brookmeyer-Crowley method with log(-log) limits. NE: not estimable. Cox proportional hazards model with treatment (Breslow ties); unstratified log-rank test.'] })
}
const T3 = tteTable('T3', '14.2.1', 'progression-free survival by independent review (primary endpoint)', 'SAP 9.3 (primary analysis); ICH E3 section 11.4.1', 'PFS', (s) => pfsI.get(s.USUBJID), ['Progression by RECIST 1.1 as read by the blinded independent central review, or death from any cause. Censored at the last adequate tumour assessment.'])
const T4 = tteTable('T4', '14.2.2', 'progression-free survival by the investigator (sensitivity analysis)', 'SAP 9.3.2; ICH E3 section 11.4.1', 'PFSINV', (s) => pfs(s, INV), ['Progression by RECIST 1.1 as assessed by the investigator, or death. Censored at the last adequate assessment.'])
const T6 = tteTable('T6', '14.2.4', 'overall survival (secondary endpoint, interim)', 'SAP 9.4; ICH E3 section 11.4.1', 'OS', (s) => os(s), [`Death from any cause; censored at the last date known alive, no later than the data cut-off (${CUT}). The analysis is not final: few deaths had occurred at the cut-off.`])

const borI = new Map(adsl.map((s) => [s.USUBJID, bor(s, IRC)])), borV = new Map(adsl.map((s) => [s.USUBJID, bor(s, INV)]))
function respRows(label, m, an) {
  const resp = (g) => itt(g).filter((s) => ['CR', 'PR'].includes(m.get(s.USUBJID))).length
  const ci = Object.fromEntries(G.map((g) => [g, cp(resp(g), N[g])]))
  const pa = resp(A) / N[A], pb = resp(B) / N[B], dif = 100 * (pa - pb), se = 100 * Math.sqrt((pa * (1 - pa)) / N[A] + (pb * (1 - pb)) / N[B])
  return [
    row(label, blank(G)),
    ...['CR', 'PR', 'SD', 'PD', 'NE'].map((c) => row({ CR: 'Complete response', PR: 'Partial response', SD: 'Stable disease', PD: 'Progressive disease', NE: 'Not evaluable' }[c], G.map((g) => { const n = itt(g).filter((s) => m.get(s.USUBJID) === c).length; return cell(`${an}_BOR`, g, npct(n, N[g]), c, { n, pct: (100 * n) / N[g] }) }), 1)),
    row('Objective response (CR or PR), n (%)', G.map((g) => cell(`${an}_ORR`, g, npct(resp(g), N[g]), null, { n: resp(g), pct: (100 * resp(g)) / N[g] })), 1),
    row('95% CI for the response rate, %', G.map((g) => cell(`${an}_ORRCI`, g, `${f1(100 * ci[g][0])}, ${f1(100 * ci[g][1])}`, null, { lcl: 100 * ci[g][0], ucl: 100 * ci[g][1] })), 1),
    row('Difference, ONK-44 minus docetaxel, % (95% CI)', [cell(`${an}_DIFF`, A, `${f1(dif)} (${f1(dif - 1.959964 * se)}, ${f1(dif + 1.959964 * se)})`, null, { est: dif, lcl: dif - 1.959964 * se, ucl: dif + 1.959964 * se }), { text: '' }], 1),
  ]
}
const agree = adsl.filter((s) => ['CR', 'PR'].includes(borI.get(s.USUBJID)) === ['CR', 'PR'].includes(borV.get(s.USUBJID))).length
const T5 = output('T5', 'Table 14.2.3: best overall response (RECIST 1.1)', 'SAP 9.4; ICH E3 section 11.4.1', 'Best overall response by independent review, then by the investigator; objective response rate with exact 95% CI; difference with 95% CI; agreement between the two reviews.', {
  title: 'Table 14.2.3 Best overall response', population: 'Intent-to-treat population (all randomised), as randomised', head: G, groups: G, rows: [
    row('N', G.map((g) => cell('N', g, String(N[g]), null, { N: N[g] }))),
    ...respRows('Independent review', borI, 'IRC'), ...respRows('Investigator', borV, 'INV'),
  ], footnotes: [`Independent review and investigator agreed on whether a participant responded for ${agree} of ${N.Total} participants (${f1((100 * agree) / N.Total)}%).`, 'Best overall response from the RECIST 1.1 overall responses up to progression; stable disease counts only if assessed at least 5 weeks after randomisation; responses need no confirmation in this randomised study. 95% CI for each rate by the Clopper-Pearson method; for the difference, a Wald interval.'] })

const durs = (g) => saf(g).map((s) => s.TRTDURD).filter((x) => x !== null)
const T7 = output('T7', 'Table 14.3.5: extent of exposure (safety population)', 'SAP 9.5; ICH E3 section 12.1', 'Duration of treatment in days: n, mean (SD), median, min, max.', {
  title: 'Table 14.3.5 Extent of exposure', population: 'Safety population (all who took at least one dose), as treated', head: G, groups: G, rows: [
    row('Duration of treatment (days)', blank(G)),
    row('n', G.map((g) => cell('DUR', g, String(durs(g).length), null, { n: durs(g).length })), 1),
    row('Mean (SD)', G.map((g) => cell('DUR', g, `${f1(mean(durs(g)))} (${f2(sd(durs(g)))})`, null, { mean: mean(durs(g)), sd: sd(durs(g)) })), 1),
    row('Median', G.map((g) => cell('DUR', g, f1(med(durs(g))), null, { median: med(durs(g)) })), 1),
    row('Min, Max', G.map((g) => cell('DUR', g, `${Math.min(...durs(g))}, ${Math.max(...durs(g))}`, null, { min: Math.min(...durs(g)), max: Math.max(...durs(g)) })), 1),
  ], footnotes: ['ONK-44: from the first to the last daily dose. Docetaxel: from the first infusion to 21 days after the last (one cycle).'] })

const kmRows = G.flatMap((g) => km(itt(g).map((s) => pfsI.get(s.USUBJID))).map((x) => [g, f1(x.t / MON), String(x.n), String(x.d), String(x.c), String(x.S)]))
const F1 = { id: 'F1', title: 'Figure 14.2.1: Kaplan-Meier plot of progression-free survival by independent review', kind: 'figure', area: 'Efficacy', ref: 'SAP 9.3', shell: '', frame: { columns: ['TRT01P', 'TIME', 'NRISK', 'NEVENT', 'NCENS', 'SURV'], rows: kmRows }, display: null }
const ADSL = { id: 'ADSL', title: 'ADSL: subject-level analysis dataset', kind: 'dataset', area: 'Data', ref: 'ADaMIG v1.3 section 3', shell: '', frame: { columns: ['USUBJID', 'SITEID', 'AGE', 'AGEGR1', 'SEX', 'RACE', 'COUNTRY', 'TRT01P', 'TRT01A', 'RANDDT', 'TRTSDT', 'TRTEDT', 'TRTDURD', 'ITTFL', 'SAFFL', 'DTHFL', 'DTHDT', 'LSTALVDT'], rows: adsl.map((s) => [s.USUBJID, s.SITEID, String(s.AGE), s.AGEGR1, s.SEX, s.RACE, s.COUNTRY, s.TRT01P, s.TRT01A, s.RANDDT, s.TRTSDT, s.TRTEDT, s.TRTDURD === null ? null : String(s.TRTDURD), s.ITTFL, s.SAFFL, s.DTHFL, s.DTHDT, s.LSTALVDT]) }, display: null }

const outs = [T1, T2, T3, T4, T5, T6, T7, F1]
const reportingEvent = {
  id: 'RE_ONK-44-302', name: 'ONK-44-302 primary analysis', version: 1, study: 'ONK-44-302',
  analysisSets: [{ id: 'AS_ITT', name: 'Intent-to-treat population', condition: { dataset: 'ADSL', variable: 'ITTFL', comparator: 'EQ', value: ['Y'] } }, { id: 'AS_SAF', name: 'Safety population', condition: { dataset: 'ADSL', variable: 'SAFFL', comparator: 'EQ', value: ['Y'] } }],
  analysisGroupings: [{ id: 'GRP_TRTP', name: 'Planned treatment', groupingVariable: 'TRT01P', dataDriven: false, groups: G.map((g, i) => ({ id: `GRP_TRTP_${i + 1}`, name: g, condition: { dataset: 'ADSL', variable: 'TRT01P', comparator: 'EQ', value: [g] } })) }, { id: 'GRP_TRTA', name: 'Actual treatment', groupingVariable: 'TRT01A', dataDriven: false, groups: G.map((g, i) => ({ id: `GRP_TRTA_${i + 1}`, name: g, condition: { dataset: 'ADSL', variable: 'TRT01A', comparator: 'EQ', value: [g] } })) }],
  methods: outs.filter((o) => o.display).map((o) => ({ id: `MTH_${o.id}`, name: o.title, description: o.shell })),
  analyses: outs.filter((o) => o.display).map((o) => ({ id: `AN_${o.id}`, name: o.title, analysisSetId: o.id === 'T7' ? 'AS_SAF' : 'AS_ITT', methodId: `MTH_${o.id}`, orderedGroupings: [{ order: 1, groupingId: o.id === 'T7' ? 'GRP_TRTA' : 'GRP_TRTP', resultsByGroup: true }] })),
  outputs: outs.map((o) => ({ id: `OUT_${o.id}`, name: o.title, analysisIds: [`AN_${o.id}`] })),
}
const doc = { format: 'csr-studio/study-outputs', schema: 1, study: 'ONK-44-302', title: 'A randomised, open-label, phase 3 study of ONK-44 versus docetaxel in adults with advanced non-small cell lung cancer after one prior platinum-based chemotherapy', short: 'ONK-44 versus docetaxel, NSCLC, second line', sap: 'SAP v1.0', groups: G, source: 'Derived from the SDTM Mapping Trainer’s ONK-44-302 SDTM by scripts/make-onk-44-302.mjs (fictional)', outputs: [ADSL, ...outs], reportingEvent }
writeFileSync(new URL('../src/data/onk-44-302.json', import.meta.url), JSON.stringify(doc, null, 1))
if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(adsl.map((s) => ({ arm: s.TRT01P, ...pfsI.get(s.USUBJID), os: os(s) }))))

// ---------- the protocol ----------
const src = JSON.parse(readFileSync(new URL('../src/data/protocol-hrp-301.json', import.meta.url)))
const v = structuredClone(src.project.versions[0]), d = v.data
d.title = { 'Full Title': doc.title, 'Short Title': 'ONK-44 versus docetaxel in previously treated advanced NSCLC', 'Trial Acronym': 'MERIDIAN-2', 'Sponsor Protocol Identifier': 'ONK-44-302', 'Trial Phase': 'Phase 3', 'Sponsor Name and Address': 'Meridale Oncology (fictional), Cambridge, United Kingdom', 'Investigational Product Name(s)': 'ONK-44 400 mg tablets', 'NCT Number': 'NCT99944302 (fictional)', 'CTRI Number': 'CTRI/2025/00/000044 (fictional)' }
d.design = { 'Intervention Model': 'Parallel Group', 'Population Type': 'With Disease', 'Population Diagnosis or Condition': 'Advanced non-small cell lung cancer that progressed after one platinum-based chemotherapy', 'Population Age (Minimum and Maximum)': '18 and over', 'Units of Age': 'Years', 'Control Type': 'Active', 'Control Description': 'Docetaxel 75 mg/m² intravenously every 3 weeks', 'Intervention Assignment Method': 'Randomisation', 'Randomisation Type': '1:1 through an interactive response technology system', 'Stratification Indicator': 'No', 'Site Distribution': '2 sites', 'Site Geographic Scope': 'India and the United Kingdom', 'Master Protocol Indicator': 'No', 'Drug/Device Combination Product Indicator': 'No', 'Adaptive Trial Design Indicator': 'No', 'Number of Arms': '2', 'Trial Blind Schema': 'Open Label', 'Blinded Roles': 'Independent central reviewers (blinded to treatment)', 'Target/Maximum Number of Participants': '42', 'Number of Participants Randomly Assigned': '42', 'Total Planned Duration of Trial Intervention': 'Until progression or unacceptable toxicity', 'Total Planned Duration of Trial Participation': 'Until death, withdrawal or the end of the study', 'Independent Committees': 'Blinded independent central review (Lumen Imaging Core, fictional)' }
d.facts = { participants: 42, perArm: 21, dropoutPct: 5, treatmentWeeks: 42, followUpWeeks: 0, participationWeeks: 52, ageMin: 18, ageMax: 99, power: 0.8, alpha: 0.05, sided: 2, assumption: { kind: 'events' } }
d.arms = [{ id: 'ARM1', code: 'ONK44', name: A, type: 'Investigational', intervention: 'ONK-44 400 mg orally once daily in 21-day cycles until progression or unacceptable toxicity', ratio: 1 }, { id: 'ARM2', code: 'DOCE', name: B, type: 'Active Comparator', intervention: 'Docetaxel 75 mg/m² intravenously on day 1 of each 21-day cycle until progression or unacceptable toxicity', ratio: 1 }]
const ib = d.interventions[0]
d.interventions = [{ ...ib, id: 'INT1', name: 'ONK-44 400 mg', role: 'Investigational', dose: '400 mg tablet', doseValue: 400, doseUnit: 'mg', route: 'Oral', frequency: 'once daily', durationWeeks: null }, { ...ib, id: 'INT2', name: 'Docetaxel', role: 'Active Comparator', dose: '75 mg/m² infusion', doseValue: 75, doseUnit: 'mg/m2', route: 'Intravenous', frequency: 'every 3 weeks', durationWeeks: null }]
d.objectives = [
  { id: 'OBJ1', level: 'Primary', kind: 'Efficacy', text: 'To compare progression-free survival with ONK-44 and docetaxel', endpointIds: ['END1'] },
  { id: 'OBJ2', level: 'Secondary', kind: 'Efficacy', text: 'To compare objective response and overall survival with ONK-44 and docetaxel', endpointIds: ['END2', 'END3'] },
]
d.endpoints = [
  { id: 'END1', level: 'Primary', text: 'Progression-free survival by blinded independent central review (RECIST 1.1)', variableType: 'time to event', procedureIds: [], visitIds: [], purpose: 'Efficacy' },
  { id: 'END2', level: 'Secondary', text: 'Objective response rate (complete or partial response) by blinded independent central review (RECIST 1.1)', variableType: 'binary', procedureIds: [], visitIds: [], purpose: 'Efficacy' },
  { id: 'END3', level: 'Secondary', text: 'Overall survival', variableType: 'time to event', procedureIds: [], visitIds: [], purpose: 'Efficacy' },
]
d.estimands = [{ id: 'EST1', objectiveId: 'OBJ1', endpointId: 'END1', population: 'Adults with advanced non-small cell lung cancer that progressed after one platinum-based chemotherapy', analysisSetId: 'ITT', treatment: 'ONK-44 400 mg once daily compared with docetaxel 75 mg/m² every 3 weeks', intercurrentEvents: [{ id: 'EST1-IE1', name: 'Discontinuation of study treatment', strategy: 'Treatment policy', description: 'Tumour assessments continue after treatment stops; progression after stopping counts.' }, { id: 'EST1-IE2', name: 'Start of new anticancer therapy before progression', strategy: 'Hypothetical', description: 'Progression-free survival is censored at the last adequate assessment before the new therapy.' }], summary: 'Hazard ratio for progression or death', estimator: 'A Cox proportional hazards model with treatment; Kaplan-Meier medians; an unstratified log-rank test.', missing: 'Participants without progression or death are censored at their last adequate tumour assessment.', sensitivity: 'Progression-free survival by the investigator.' }]
d.analysisSets = [{ id: 'ITT', name: 'Intent-to-treat set', text: 'All randomised participants, analysed as randomised.' }, { id: 'SAF', name: 'Safety set', text: 'All randomised participants who took at least one dose, analysed as treated.' }]
d.multiplicity = 'The primary endpoint is tested first at a two-sided alpha of 0.05; objective response and then overall survival are tested in that order only if the earlier test is significant (fixed sequence).'
d.statements = { '10.11': 'With 1:1 randomisation, about 34 progression-free survival events among 42 participants give 80% power to detect a hazard ratio of 0.38 with a two-sided log-rank test at the 5% level; this is a training-sized study.' }
d.criteria = [
  { code: 'IN01', category: 'Inclusion', text: 'Aged 18 or over when consent is signed', procedureIds: [] },
  { code: 'IN02', category: 'Inclusion', text: 'Histologically confirmed advanced non-small cell lung cancer that progressed during or after one platinum-based chemotherapy', procedureIds: [] },
  { code: 'IN03', category: 'Inclusion', text: 'At least one measurable lesion by RECIST 1.1', procedureIds: [] },
  { code: 'IN04', category: 'Inclusion', text: 'ECOG performance status 0 or 1', procedureIds: [] },
  { code: 'EX01', category: 'Exclusion', text: 'Untreated or symptomatic brain metastases', procedureIds: [] },
  { code: 'EX02', category: 'Exclusion', text: 'Earlier treatment with docetaxel', procedureIds: [] },
]
d.narrative = {
  '4.1': 'This is an open label, randomised, active-controlled trial with 2 arms (ONK-44 400 mg and docetaxel) in participants with advanced non-small cell lung cancer after one platinum-based chemotherapy. Participants are randomised 1:1 and treated until progression or unacceptable toxicity. Tumours are assessed by RECIST 1.1 at screening and every 6 weeks from randomisation, by the investigator and by a blinded independent central review.',
  '4.2.3': 'Docetaxel is a standard second-line treatment for advanced non-small cell lung cancer, so it is the comparator. The study is open label because the two treatments are given differently (a daily tablet and an infusion every 3 weeks); progression is read by a blinded independent central review to limit the bias this could bring.',
  '10.1': 'Tests are two-sided at a significance level of 0.05. The statistical analysis plan is finalised before the data cut-off for the primary analysis.',
  '10.4': 'Progression-free survival by blinded independent central review is analysed with a Cox proportional hazards model with treatment; the hazard ratio and its 95% confidence interval are given, with Kaplan-Meier medians and an unstratified log-rank test. Participants without progression or death are censored at their last adequate tumour assessment.',
  '10.5': 'Objective response by independent review is compared between arms with exact 95% confidence intervals for each rate. Overall survival is analysed like progression-free survival; it is not final at the primary analysis.',
}
d.rescue = ''; d.aeFrom = 'first dose'; d.aeTo = '30 days after the last dose'
const proto = { ...src, exportedUtc: '2026-11-22T00:00:00.000Z', project: { ...src.project, id: 'P-ONK-44-302', name: 'ONK-44-302 MERIDIAN-2 (fictional)', type: 'drug', phase: 'Phase 3', versions: [{ ...v, number: '1.0', date: '2025-09-15' }] } }
writeFileSync(new URL('../src/data/protocol-onk-44-302.json', import.meta.url), JSON.stringify(proto, null, 1))
console.log('ONK-44-302:', T3.display.rows.map((r) => `${r.label}: ${r.cells.map((c) => c.text).join(' | ')}`).join('\n'))
console.log(T5.display.rows.filter((r) => /Objective|Difference|Agreement/.test(r.label)).map((r) => `${r.label}: ${r.cells.map((c) => c.text).join(' | ')}`).join('\n'))
console.log(T6.display.rows.map((r) => `${r.label}: ${r.cells.map((c) => c.text).join(' | ')}`).join('\n'))
