// HRP-205 (VERDANT-AC), a fictional stopped study for the abbreviated-report mission (CS11).
// Lumiravostat 25 mg tablets against clobetasol propionate 0.05% cream, double-dummy,
// non-inferiority (margin 15 percentage points), stopped by the sponsor for slow recruitment
// after 36 of 240 planned participants. The outputs are made by hand here (no TLF Lab programs)
// and the protocol is derived from HRP-301's, with the design facts that differ.
// Run: node scripts/make-hrp-205.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const A = 'Clobetasol cream', B = 'Lumiravostat 25 mg', G = [A, B], GT = [...G, 'Total']
const N = { [A]: 18, [B]: 18 }
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1)
const npct = (n, d) => (n === 0 ? '0' : `${n} (${f1((100 * n) / d)})`)
const frame = []
const cell = (an, g, text, cat = null, stats = {}) => { for (const [k, v] of Object.entries(stats)) frame.push([an, g, cat, k, String(v)]); return { text, keys: [{ an, g, cat }] } }
const row = (label, cells, indent) => ({ label, ...(indent !== undefined ? { indent } : {}), cells })
const nRow = (label, an, counts, groups, cat = null, denom = N, indent) => row(label, groups.map((g) => cell(an, g, npct(counts[g], denom[g]), cat, { n: counts[g], pct: (100 * counts[g]) / denom[g] })), indent)
const tot = (o) => ({ ...o, Total: o[A] + o[B] })
const NT = tot(N)

function output(id, title, area, ref, shell, display) { const fr = { columns: ['ANALYSIS', 'GROUP', 'CATEGORY', 'STAT', 'VALUE'], rows: frame.splice(0) }; return { id, title, kind: 'ard', area, ref, shell, frame: fr, display } }

// 14.1.1 disposition
const disc = { AE: { [A]: 1, [B]: 2 }, WD: { [A]: 1, [B]: 1 }, TERM: { [A]: 5, [B]: 5 } }
const comp = { [A]: 11, [B]: 10 }
const T4 = output('T4', 'Table 14.1.1: disposition (randomised participants)', 'Safety', 'ICH E3 section 10.1', 'Randomised; Treated; Completed; Discontinued, with the primary reason. Columns by group and Total.', {
  title: 'Table 14.1.1 Disposition of participants', population: 'All randomised participants; percentages of randomised participants', head: GT, groups: GT,
  rows: [
    row('Screened', GT.map((g) => cell('SCREENED', 'Total', g === 'Total' ? '47' : '', null, g === 'Total' ? { n: 47 } : {}))),
    row('Screen failures', GT.map((g) => cell('SCRFAIL', 'Total', g === 'Total' ? '11' : '', null, g === 'Total' ? { n: 11 } : {}))),
    row('Randomised', GT.map((g) => cell('POP', g, String(NT[g]), null, { N: NT[g] }))),
    nRow('Treated', 'TREATED', NT, GT, null, NT, 0),
    nRow('Completed the study', 'COMPLETED', tot(comp), GT, null, NT, 0),
    nRow('Discontinued from the study', 'DISC', tot({ [A]: 7, [B]: 8 }), GT, null, NT, 0),
    row('Primary reason', GT.map(() => ({ text: '' }))),
    nRow('Adverse event', 'DCSREAS', tot(disc.AE), GT, 'ADVERSE EVENT', NT, 1),
    nRow('Withdrawal by participant', 'DCSREAS', tot(disc.WD), GT, 'WITHDRAWAL BY SUBJECT', NT, 1),
    nRow('Study terminated by sponsor', 'DCSREAS', tot(disc.TERM), GT, 'STUDY TERMINATED BY SPONSOR', NT, 1),
  ], footnotes: ['The sponsor stopped the study on 2026-06-30 because recruitment was too slow (36 of 240 planned participants). Participants still on treatment stopped at their next visit and were followed up for 4 weeks.'] })

// 14.1.2 demographics
const T1 = output('T1', 'Table 14.1.2: demographics (safety population)', 'Safety', 'ICH E3 section 11.2', 'Age; sex. Columns by group and Total.', {
  title: 'Table 14.1.2 Demographic characteristics', population: 'Safety population', head: GT, groups: GT,
  rows: [
    row('Age (years)', GT.map(() => ({ text: '' }))),
    row('n', GT.map((g) => cell('AGE', g, String(NT[g]), null, { n: NT[g] })), 1),
    row('Mean (SD)', [['44.1', '12.62'], ['46.3', '11.08'], ['45.2', '11.80']].map(([m, s], i) => cell('AGE', GT[i], `${m} (${s})`, null, { mean: m, sd: s })), 1),
    row('Sex, n (%)', GT.map(() => ({ text: '' }))),
    nRow('F', 'SEX', tot({ [A]: 10, [B]: 11 }), GT, 'F', NT, 1),
    nRow('M', 'SEX', tot({ [A]: 8, [B]: 7 }), GT, 'M', NT, 1),
  ], footnotes: [] })

// 14.2.1 primary: IGA-CHE success at Week 16, non-inferiority
const resp = { [A]: 5, [B]: 6 }, miss = { [A]: 6, [B]: 7 }
const p1 = resp[B] / N[B], p0 = resp[A] / N[A], diff = 100 * (p1 - p0), se = 100 * Math.sqrt((p1 * (1 - p1)) / N[B] + (p0 * (1 - p0)) / N[A])
const lcl = diff - 1.959964 * se, ucl = diff + 1.959964 * se
const T3 = output('T3', 'Table 14.2.1: IGA-CHE treatment success at Week 16 (primary endpoint)', 'Efficacy', 'SAP 9.4; ICH E3 section 11.4.1', 'N; success n (%); missing; difference from clobetasol with 95% CI; non-inferiority margin.', {
  title: 'Table 14.2.1 IGA-CHE treatment success at Week 16', population: 'Intent-to-treat population; missing responses imputed as non-response', head: G, groups: G,
  rows: [
    row('N', G.map((g) => cell('N', g, String(N[g]), null, { N: N[g] }))),
    nRow('IGA-CHE treatment success, n (%)', 'RESP', resp, G),
    row('Missing, imputed as non-response, n', G.map((g) => cell('MISS', g, String(miss[g]), null, { n: miss[g] }))),
    row('Difference from clobetasol, % (95% CI)', [{ text: '' }, cell('DIFF', B, `${f1(diff)} (${f1(lcl)}, ${f1(ucl)})`, null, { est: diff, lcl, ucl })]),
  ], footnotes: ['Non-inferiority margin: −15 percentage points; non-inferiority is shown if the lower limit of the 95% CI is above −15.', 'CI: Wald interval for the difference in proportions. Most missing values are participants stopped by the sponsor before Week 16.'] })

// 14.3.1 adverse events
const ae = [
  ['Participants with at least one TEAE', null, { [A]: 7, [B]: 9 }],
  ['Participants with a serious TEAE', null, { [A]: 0, [B]: 1 }],
  ['Participants with a TEAE leading to discontinuation', null, { [A]: 1, [B]: 2 }],
  ['Infections', 'SOC', { [A]: 2, [B]: 4 }], ['Upper respiratory tract infection', 1, { [A]: 2, [B]: 3 }], ['Appendicitis', 1, { [A]: 0, [B]: 1 }],
  ['Brain and nerves', 'SOC', { [A]: 2, [B]: 2 }], ['Head pain', 1, { [A]: 2, [B]: 2 }],
  ['Digestive system', 'SOC', { [A]: 0, [B]: 3 }], ['Nausea', 1, { [A]: 0, [B]: 3 }],
  ['Skin', 'SOC', { [A]: 3, [B]: 0 }], ['Skin thinning', 1, { [A]: 2, [B]: 0 }], ['Application site burning', 1, { [A]: 1, [B]: 0 }],
  ['Test results', 'SOC', { [A]: 0, [B]: 2 }], ['ALT increased', 1, { [A]: 0, [B]: 2 }],
]
const T2 = output('T2', 'Table 14.3.1: treatment-emergent adverse events by system class and preferred term', 'Safety', 'ICH E3 section 12.2.2', 'Overall rows, then system class and preferred term, n (%). Columns by group and Total.', {
  title: 'Table 14.3.1 Treatment-emergent adverse events by system class and preferred term', population: 'Safety population', head: GT, groups: GT,
  rows: ae.map(([label, kind, c]) => nRow(label, kind === 1 ? 'PT' : kind === 'SOC' ? 'SOC' : 'OVERALL', tot(c), GT, kind ? label.toUpperCase() : label.toUpperCase(), NT, kind === 1 ? 1 : 0)),
  footnotes: ['Terms from the Study Medical Dictionary (fictional). Treatment-emergent: started on or after the first dose of either study treatment.'] })

const L1 = { id: 'L1', title: 'Listing 16.2.7: serious adverse events', kind: 'listing', area: 'Listings', ref: 'ICH E3 section 16.2.7', shell: '',
  frame: { columns: ['USUBJID', 'TRT01A', 'AEDECOD', 'AEBODSYS', 'ASTDT', 'AENDT', 'ASTDY', 'AESEV', 'AEREL', 'TRTEMFL'], rows: [['HRP-205-2104-006', B, 'Appendicitis', 'Infections', '2026-05-19', '2026-05-24', '41', 'SEVERE', 'NOT RELATED', 'Y']] }, display: null }

const outputs = { format: 'csr-studio/study-outputs', schema: 1, study: 'HRP-205', title: 'VERDANT-AC: a randomised, double-blind, double-dummy, active-controlled phase 3 study of lumiravostat 25 mg once daily against clobetasol propionate 0.05% cream for 16 weeks in adults with chronic hand eczema (stopped early)', short: 'Lumiravostat vs clobetasol, non-inferiority, stopped early', sap: 'SAP v1.0', groups: G, source: 'Made by hand for the abbreviated-report mission (fictional)',
  design: 'non-inferiority', margin: 15, stopped: { date: '2026-06-30', reason: 'The sponsor stopped the study because recruitment was too slow to finish on time; there was no safety or efficacy concern.', enrolled: 36, planned: 240 },
  outputs: [T1, T4, T3, T2, L1] }
writeFileSync(new URL('../src/data/hrp-205.json', import.meta.url), JSON.stringify(outputs, null, 1))

// The protocol: HRP-301's, with what differs.
const src = JSON.parse(readFileSync(new URL('../src/data/protocol-hrp-301.json', import.meta.url)))
const v = structuredClone(src.project.versions[0]); const d = v.data
d.title = { ...d.title, 'Full Title': outputs.title.replace(' (stopped early)', ''), 'Short Title': 'Lumiravostat against clobetasol in chronic hand eczema', 'Trial Acronym': 'VERDANT-AC', 'Sponsor Protocol Identifier': 'HRP-205', 'Trial Phase': 'Phase 3' }
for (const k of Object.keys(d.title)) if (/NCT|EU CT|CTRI|IND/.test(k)) delete d.title[k]
d.design = { ...d.design, 'Control Type': 'Active', 'Trial Blind Schema': 'Double Blind', 'Site Distribution': '12 sites', 'Site Geographic Scope': 'Germany, Poland and India', 'Population Diagnosis or Condition': 'Moderate to severe chronic hand eczema', 'Control Description': 'Clobetasol propionate 0.05% cream, an active control', 'Number of Arms': '2', 'Target/Maximum Number of Participants': '240', 'Number of Participants Randomly Assigned': '36 (the study was stopped early)' }
d.facts = { ...d.facts, participants: 240, perArm: 120 }
d.arms = [
  { id: 'ARM1', code: 'HRP25', name: B, type: 'Investigational', intervention: 'Lumiravostat 25 mg orally once daily with vehicle cream twice daily for 16 weeks', ratio: 1 },
  { id: 'ARM2', code: 'CLOB', name: A, type: 'Active Comparator', intervention: 'Clobetasol propionate 0.05% cream twice daily with a placebo tablet once daily for 16 weeks', ratio: 1 },
]
const base = d.interventions[0]
d.interventions = [
  { ...base, id: 'INT1', name: 'Lumiravostat 25 mg', role: 'Investigational', dose: '25 mg film-coated tablet', doseValue: 25, route: 'Oral', frequency: 'once daily' },
  { ...base, id: 'INT2', name: 'Clobetasol propionate 0.05% cream', role: 'Active Comparator', dose: '0.05% cream, a thin layer to the affected skin', doseValue: null, doseUnit: '', route: 'Topical', frequency: 'twice daily' },
  { ...base, id: 'INT3', name: 'Placebo tablet', role: 'Placebo', dose: 'matching placebo tablet', doseValue: null, doseUnit: '', route: 'Oral', frequency: 'once daily' },
  { ...base, id: 'INT4', name: 'Vehicle cream', role: 'Placebo', dose: 'matching vehicle cream', doseValue: null, doseUnit: '', route: 'Topical', frequency: 'twice daily' },
]
d.objectives = [{ id: 'OBJ1', level: 'Primary', kind: 'Efficacy', text: 'To show that lumiravostat 25 mg is non-inferior to clobetasol propionate 0.05% cream in achieving clear or almost clear hands', endpointIds: ['END1'] }]
d.endpoints = [{ ...d.endpoints[0], id: 'END1', level: 'Primary' }]
d.estimands = [{ ...d.estimands[0], treatment: 'Lumiravostat 25 mg against clobetasol propionate 0.05% cream', summary: 'difference in the proportion with IGA-CHE treatment success, with non-inferiority shown if the lower limit of the two-sided 95% CI is above −15 percentage points', estimator: 'The difference in response rates (lumiravostat minus clobetasol) with a 95% Wald confidence interval, compared with the non-inferiority margin of −15 percentage points.', sensitivity: 'The per-protocol set.' }]
d.multiplicity = 'There is one primary comparison; no adjustment is needed.'
d.statements = { '10.11': 'A sample size of 240 randomised participants (120 per arm) gives 85% power to show non-inferiority with a margin of 15 percentage points, assuming 40% success in both arms, with a one-sided alpha of 0.025 and 10% drop-out.' }
d.narrative = { ...d.narrative, '4.2.3': 'An active control is used because an effective treatment exists: clobetasol propionate 0.05% cream is a standard treatment for chronic hand eczema. A placebo would leave participants without treatment for 16 weeks. The non-inferiority margin of 15 percentage points keeps at least half of the effect of clobetasol over vehicle seen in earlier trials.', '6.4': 'Blinding is kept by a double dummy: every participant takes a tablet once daily and applies a cream twice daily, one active and one matching placebo.' }
const proto = { ...src, exportedUtc: '2026-11-21T00:00:00.000Z', project: { ...src.project, id: 'P-HRP-205', name: 'HRP-205 VERDANT-AC (fictional, stopped study)', versions: [{ ...v, number: '1.0', date: '2025-11-03' }] } }
writeFileSync(new URL('../src/data/protocol-hrp-205.json', import.meta.url), JSON.stringify(proto, null, 1))
console.log('HRP-205:', `${f1(diff)} (${f1(lcl)}, ${f1(ucl)})`)
