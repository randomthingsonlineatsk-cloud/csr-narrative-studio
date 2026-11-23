// Patient narratives (ICH E3 12.3.2): who needs one, the patient profile and timeline, a fixed
// template for each kind of narrative, dechallenge and rechallenge worked out from the dosing and
// event dates, a draft filled from the data, and the narrative QC: every fact in the text against
// the data and the safety case, missing facts, contradictions, coverage and privacy.
import { rows, str, num, type Row, type Sdtm, type Safety, type SafetyCase } from './sdtm'

// Severity as the study collects it: mild/moderate/severe, or a CTCAE-style grade in oncology.
export const sevText = (ae: Record<string, unknown>) => (String(ae.AESEV ?? '') ? String(ae.AESEV).toLowerCase() : String(ae.AETOXGR ?? '') ? `grade ${ae.AETOXGR}` : 'of unrecorded severity')
export type Kind = 'death' | 'sae' | 'discontinuation' | 'aesi'
export const KIND_LABEL: Record<Kind, string> = { death: 'Death', sae: 'Serious adverse event', discontinuation: 'Discontinued because of an adverse event', aesi: 'Adverse event of special interest' }
export interface Candidate { key: string; usubjid: string; aeseq: number; pt: string; verbatim: string; kinds: Kind[]; arm: string; day: number | null }

/** Adverse events of special interest, per study (sponsor-defined; set in the safety plan). */
export const AESI: Record<string, { label: string; test: (ae: Row, labs: Row[]) => boolean }> = {
  'HRP-301': { label: 'Liver test rise: ALT or AST at least 3 × ULN within 14 days of a hepatic event', test: (ae, labs) => liverPeak(ae, labs) >= 3 },
  'GLV-12-301': { label: 'Liver test rise: ALT or AST at least 3 × ULN within 14 days of a hepatic event', test: (ae, labs) => liverPeak(ae, labs) >= 3 },
}
function liverPeak(ae: Row, labs: Row[]) {
  if (!/liver|hepat|transaminase/i.test(`${str(ae.AEDECOD)} ${str(ae.AEBODSYS)}`)) return 0
  const d0 = num(ae.AESTDY) ?? 0
  return Math.max(0, ...labs.filter((l) => ['ALT', 'AST'].includes(str(l.LBTESTCD)) && Math.abs((num(l.LBDY) ?? 1e9) - d0) <= 14 && num(l.LBSTRESN) !== null && num(l.LBSTNRHI)).map((l) => num(l.LBSTRESN)! / num(l.LBSTNRHI)!))
}

export function candidates(s: Sdtm): Candidate[] {
  const out: Candidate[] = [], dm = new Map(rows(s, 'DM').map((r) => [str(r.USUBJID), r])), aesi = AESI[s.study]
  for (const ae of rows(s, 'AE')) {
    const u = str(ae.USUBJID), kinds: Kind[] = []
    if (ae.AESDTH === 'Y' || ae.AEOUT === 'FATAL') kinds.push('death')
    if (ae.AESER === 'Y') kinds.push('sae')
    if (ae.AEACN === 'DRUG WITHDRAWN') kinds.push('discontinuation')
    if (aesi?.test(ae, rows(s, 'LB', u))) kinds.push('aesi')
    if (kinds.length) out.push({ key: `${u}|${ae.AESEQ}`, usubjid: u, aeseq: Number(ae.AESEQ), pt: str(ae.AEDECOD), verbatim: str(ae.AETERM), kinds, arm: str(dm.get(u)?.ACTARM ?? dm.get(u)?.ARM), day: num(ae.AESTDY) })
  }
  return out.sort((a, b) => a.usubjid.localeCompare(b.usubjid) || a.aeseq - b.aeseq)
}
export const primaryKind = (c: Candidate): Kind => c.kinds.includes('death') ? 'death' : c.kinds.includes('sae') ? 'sae' : c.kinds.includes('discontinuation') ? 'discontinuation' : 'aesi'

// ---------- profile and timeline ----------
/** Studies whose EX holds the bottles dispensed at each visit, not the days dosed: an
 *  interruption is recorded on the AE form (action taken), never as a break in EX. */
export const DISPENSING_EX = ['HRP-301']
export interface Profile { usubjid: string; dm: Row; ae: Row[]; cm: Row[]; ex: Row[]; lb: Row[]; mh: Row[]; ds: Row[]; vs: Row[]; firstDose: string; arm: string; dose: number | null; doseUnit: string; drug: string; dispensing: boolean }
export function profile(s: Sdtm, usubjid: string): Profile {
  const dm = rows(s, 'DM', usubjid)[0] ?? { USUBJID: usubjid }, ex = rows(s, 'EX', usubjid).sort((a, b) => (num(a.EXSTDY) ?? 0) - (num(b.EXSTDY) ?? 0))
  const active = ex.find((e) => (num(e.EXDOSE) ?? 0) > 0) ?? ex[0]
  return { usubjid, dm, ae: rows(s, 'AE', usubjid).sort((a, b) => (num(a.AESTDY) ?? 0) - (num(b.AESTDY) ?? 0)), cm: rows(s, 'CM', usubjid), ex, lb: rows(s, 'LB', usubjid), mh: rows(s, 'MH', usubjid), ds: rows(s, 'DS', usubjid), vs: rows(s, 'VS', usubjid),
    firstDose: str(dm.RFXSTDTC).slice(0, 10), arm: str(dm.ACTARM || dm.ARM), dose: active ? num(active.EXDOSE) : null, doseUnit: str(active?.EXDOSU), drug: str(active?.EXTRT), dispensing: DISPENSING_EX.includes(s.study) }
}
/** Study day of a date, counted from the first dose (Day 1; the day before is Day -1). */
export function studyDay(date: string, first: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date) || !/^\d{4}-\d{2}-\d{2}/.test(first)) return null
  const d = Math.round((Date.parse(date.slice(0, 10)) - Date.parse(first.slice(0, 10))) / 864e5)
  return d >= 0 ? d + 1 : d
}

/** Dosing as intervals of study days, and the gaps between them. */
export function dosing(p: Profile) {
  const iv = p.ex.map((e) => ({ from: num(e.EXSTDY), to: num(e.EXENDY), dose: num(e.EXDOSE) })).filter((x) => x.from !== null) as { from: number; to: number | null; dose: number | null }[]
  const gaps: { from: number; to: number }[] = []
  // Infusions given on one day each cycle (docetaxel): the days between infusions are the schedule,
  // not a break. A break is an infusion given later than the usual cycle length.
  const pulsed = iv.length >= 2 && iv.every((x) => x.to === x.from)
  if (pulsed) {
    const diffs = iv.slice(1).map((x, i) => x.from - iv[i].from), count = new Map<number, number>()
    for (const d of diffs) count.set(d, (count.get(d) ?? 0) + 1)
    const cycle = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
    for (let i = 1; i < iv.length; i++) if (iv[i].from - iv[i - 1].from > cycle) gaps.push({ from: iv[i - 1].from + cycle, to: iv[i].from - 1 })
  } else for (let i = 1; i < iv.length; i++) { const prev = iv[i - 1].to; if (prev !== null && iv[i].from > prev + 1) gaps.push({ from: prev + 1, to: iv[i].from - 1 }) }
  return { intervals: iv, gaps, last: Math.max(...iv.map((x) => x.to ?? x.from)) }
}

// ---------- dechallenge and rechallenge ----------
export interface Challenge { dechallenge: { result: 'positive' | 'negative' | 'not applicable'; text: string }; rechallenge: { result: 'positive' | 'negative' | 'not done' | 'not applicable'; text: string } }
export function challenge(p: Profile, ae: Row): Challenge {
  const acn = str(ae.AEACN), out = str(ae.AEOUT), start = num(ae.AESTDY) ?? 0, end = num(ae.AEENDY), d = dosing(p)
  const recovered = /^RECOVERED/.test(out)
  if (out === 'FATAL') return { dechallenge: { result: 'not applicable', text: 'Dechallenge: not applicable; the event was fatal.' }, rechallenge: { result: 'not applicable', text: 'Rechallenge: not applicable.' } }
  if (acn === 'DRUG WITHDRAWN') {
    const stop = d.last
    if (recovered && end !== null && end < stop) return { dechallenge: { result: 'not applicable', text: `Dechallenge: cannot be assessed. The event resolved on Day ${end}, but study drug continued until Day ${stop}: query the action taken against the dosing record.` }, rechallenge: { result: 'not applicable', text: 'Rechallenge: not applicable.' } }
    return { dechallenge: recovered && end !== null ? { result: 'positive', text: `Dechallenge: positive. Study drug was stopped permanently after Day ${stop}, and the event resolved on Day ${end}.` } : { result: 'negative', text: `Dechallenge: negative. Study drug was stopped permanently after Day ${stop}, and the event had not resolved.` },
      rechallenge: { result: 'not done', text: 'Rechallenge: not done; study drug was not restarted.' } }
  }
  if (acn === 'DRUG INTERRUPTED') {
    const g = d.gaps.find((x) => x.to >= start - 1 && x.from <= (end ?? start) + 1) ?? d.gaps.find((x) => x.from >= start - 1)
    if (!g && p.dispensing) {
      const after = d.intervals.some((x) => x.from > (end ?? start)), again = p.ae.some((x) => x !== ae && x.AEDECOD === ae.AEDECOD && (num(x.AESTDY) ?? 0) > (end ?? start))
      const note = '(The dosing record holds the bottles dispensed at each visit, so the days of the interruption are not recorded.)'
      return { dechallenge: recovered && end !== null ? { result: 'positive', text: `Dechallenge: positive. Study drug was interrupted because of the event, and the event resolved on Day ${end}. ${note}` } : { result: 'negative', text: `Dechallenge: negative. Study drug was interrupted because of the event, and the event had not resolved. ${note}` },
        rechallenge: !after ? { result: 'not done', text: 'Rechallenge: not done; no study drug was dispensed after the event.' } : again ? { result: 'positive', text: 'Rechallenge: positive. Study drug was resumed (bottles were dispensed after the event), and the event came back.' } : { result: 'negative', text: 'Rechallenge: negative. Study drug was resumed (bottles were dispensed after the event), and the event did not come back.' } }
    }
    if (!g) return { dechallenge: { result: 'not applicable', text: 'Dechallenge: the dosing record shows no interruption; check the action taken.' }, rechallenge: { result: 'not applicable', text: 'Rechallenge: not applicable.' } }
    const restart = g.to + 1, restarted = d.intervals.some((x) => x.from === restart)
    const de = recovered && end !== null && end <= g.to ? { result: 'positive' as const, text: `Dechallenge: positive. Study drug was interrupted from Day ${g.from} to Day ${g.to}, and the event resolved on Day ${end}, during the interruption.` } : { result: 'negative' as const, text: `Dechallenge: negative. Study drug was interrupted from Day ${g.from} to Day ${g.to}, and the event had not resolved by the restart.` }
    if (!restarted) return { dechallenge: de, rechallenge: { result: 'not done', text: 'Rechallenge: not done; study drug was not restarted.' } }
    const again = p.ae.some((x) => x !== ae && x.AEDECOD === ae.AEDECOD && (num(x.AESTDY) ?? 0) >= restart)
    return { dechallenge: de, rechallenge: again ? { result: 'positive', text: `Rechallenge: positive. Study drug was restarted on Day ${restart}, and the event came back.` } : { result: 'negative', text: `Rechallenge: negative. Study drug was restarted on Day ${restart}, and the event did not come back.` } }
  }
  return { dechallenge: { result: 'not applicable', text: 'Dechallenge: not applicable; the dose was not changed.' }, rechallenge: { result: 'not applicable', text: 'Rechallenge: not applicable.' } }
}

// ---------- wording from the data ----------
const lc = (s: string) => s.toLowerCase()
export const listAnd = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
export const CAUS: Record<string, string> = { 'NOT RELATED': 'not related', 'UNLIKELY RELATED': 'unlikely to be related', 'POSSIBLY RELATED': 'possibly related', 'PROBABLY RELATED': 'probably related', RELATED: 'related' }
const OUTCOME: Record<string, string> = { 'RECOVERED/RESOLVED': 'resolved', 'RECOVERING/RESOLVING': 'was resolving', 'NOT RECOVERED/NOT RESOLVED': 'had not resolved', 'RECOVERED/RESOLVED WITH SEQUELAE': 'resolved with sequelae', FATAL: 'was fatal' }
const FREQ: Record<string, string> = { QD: 'once daily', BID: 'twice daily', TID: 'three times daily', QID: 'four times daily', PRN: 'as needed', QW: 'once weekly' }
const sexWord = (s: string) => (s === 'F' ? 'woman' : s === 'M' ? 'man' : 'participant')
const race = (r: string) => (r ? r.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ Or /g, ' or ').replace(/ Of /g, ' of ') : '')
const verbatim = (v: string) => (/^[A-Z]{2,}\b/.test(v) ? v : v.replace(/^\w/, (c) => c.toLowerCase()))
const drugName = (d: string) => (/^[A-Z]+$/.test(d) ? d[0] + d.slice(1).toLowerCase() : d)
const med = (c: Row) => `${lc(str(c.CMDECOD || c.CMTRT))}${num(c.CMDOSE) ? ` ${num(c.CMDOSE)} ${str(c.CMDOSU)}` : ''}${c.CMDOSFRQ ? ` ${FREQ[str(c.CMDOSFRQ)] ?? lc(str(c.CMDOSFRQ))}` : ''}`
export const medsAtOnset = (p: Profile, ae: Row) => { const d0 = num(ae.AESTDY) ?? 0; return p.cm.filter((c) => (num(c.CMSTDY) ?? -1e9) < d0 && (num(c.CMENDY) === null || num(c.CMENDY)! >= d0 || str(c.CMENRTPT) === 'ONGOING') && !treats(c, ae)) }
export const treats = (c: Row, ae: Row) => { const i = lc(str(c.CMINDC)); return !!i && (i === lc(str(ae.AETERM)) || i === lc(str(ae.AEDECOD))) }
export function relevantLabs(p: Profile, ae: Row) {
  const d0 = num(ae.AESTDY) ?? 0, d1 = num(ae.AEENDY) ?? d0
  const liver = /liver|hepat|transaminase/i.test(`${str(ae.AEDECOD)} ${str(ae.AEBODSYS)}`)
  return p.lb.filter((l) => num(l.LBSTRESN) !== null && (liver ? ['ALT', 'AST'].includes(str(l.LBTESTCD)) : ['H', 'L', 'HIGH', 'LOW'].includes(str(l.LBNRIND)) && !['GLUC', 'HBA1C', 'CHOL', 'HCG'].includes(str(l.LBTESTCD))) && (num(l.LBDY) ?? 1e9) >= d0 - 30 && (num(l.LBDY) ?? -1e9) <= d1 + 30)
}
const LAB_WORD: Record<string, string> = { CREAT: 'creatinine', NEUT: 'neutrophils', LYMPH: 'lymphocytes', GLUC: 'glucose', CHOL: 'cholesterol' }
const labText = (l: Row) => `${LAB_WORD[str(l.LBTESTCD)] ?? str(l.LBTESTCD)} ${num(l.LBSTRESN)} ${str(l.LBSTRESU)} on Day ${num(l.LBDY)} (reference range ${num(l.LBSTNRLO) ?? 0} to ${num(l.LBSTNRHI)})`

/** The fixed template: the E3 12.3.2 content in a fixed order, as prompts to fill. */
export function template(kind: Kind): string {
  return [
    `Participant [ID] ([treatment group]): [event term] (${KIND_LABEL[kind].toLowerCase()}).`,
    'A [age]-year-old [race] [man or woman] with [relevant medical history, or no relevant medical history] was randomised to [treatment group] and took the first dose of [study drug and dose, frequency] on Day 1. Concomitant medications at the onset of the event: [names, doses and frequencies, or none].',
    `On Day [onset day], the participant reported [verbatim term] (coded as [event term]). The event was [mild, moderate or severe]${kind === 'sae' || kind === 'death' ? ' and serious ([seriousness criteria: required hospitalisation, resulted in death, life-threatening …])' : ''}. [Course of the event and its treatment: medications with dose and days.]${kind === 'aesi' ? ' [Relevant laboratory values with units, study days and reference ranges.]' : ''}`,
    'Action taken with study drug: [dose not changed, interrupted from Day … to Day …, or stopped permanently after Day …]. [Dechallenge statement.] [Rechallenge statement.]',
    `The event [resolved on Day …, was resolving, had not resolved, was fatal on Day …].${kind === 'discontinuation' ? ' [Discontinuation from the study: day and reason.]' : ''} The investigator assessed the event as [causality] to study drug; the sponsor assessed it as [causality].`,
  ].join('\n\n')
}

/** A draft filled from the data and the safety case. The writer checks every statement. */
/** Complete: every statement filled (model answers, tests). Otherwise the dechallenge, rechallenge
 *  and the sponsor's causality stay as prompts: the writer confirms the first two and takes the
 *  third from the safety case. */
export function draft(s: Sdtm, c: Candidate, sc?: SafetyCase, complete = true): string {
  const p = profile(s, c.usubjid), ae = p.ae.find((x) => Number(x.AESEQ) === c.aeseq)!, kind = primaryKind(c), ch = challenge(p, ae)
  const mh = [...new Set(p.mh.map((m) => lc(str(m.MHDECOD || m.MHTERM))))]
  const onset = medsAtOnset(p, ae), tx = p.cm.filter((x) => treats(x, ae)), labs = relevantLabs(p, ae)
  const crit = [ae.AESHOSP === 'Y' ? 'required hospitalisation' : '', ae.AESDTH === 'Y' ? 'resulted in death' : ''].filter(Boolean)
  const doseWords = p.dose ? `${drugName(p.drug)} ${p.dose} ${p.doseUnit}` : `${lc(p.drug) === 'placebo' ? 'placebo' : drugName(p.drug)}`
  const freq = FREQ[str(p.ex[0]?.EXDOSFRQ)] ?? ''
  const dd = dosing(p)
  const action = ae.AEACN === 'DRUG WITHDRAWN' ? `study drug was stopped permanently after Day ${dd.last}.` : ae.AEACN === 'DRUG INTERRUPTED' ? `study drug was interrupted${(() => { const g = dd.gaps.find((x) => x.to >= (num(ae.AESTDY) ?? 0) - 1); return g ? ` from Day ${g.from} to Day ${g.to}` : '' })()}.` : 'the dose was not changed.'
  const outcome = ae.AEOUT === 'FATAL' ? `The event was fatal; the participant died on Day ${num(ae.AEENDY) ?? num(ae.AESTDY)}.` : `The event ${OUTCOME[str(ae.AEOUT)] ?? lc(str(ae.AEOUT))}${/^RECOVERED/.test(str(ae.AEOUT)) && num(ae.AEENDY) !== null ? ` on Day ${num(ae.AEENDY)}` : ''}.`
  const ds = p.ds.find((x) => x.DSCAT === 'DISPOSITION EVENT')
  const disc = kind === 'discontinuation' && ds ? ` The participant left the study on Day ${num(ds.DSSTDY)} (${lc(str(ds.DSDECOD))}).` : ''
  const sponsor = sc && complete ? ` the sponsor assessed it as ${CAUS[sc.sponsorCausality] ?? lc(sc.sponsorCausality)}.` : ae.AESER === 'Y' ? ' the sponsor assessed it as [sponsor causality, from the safety case].' : ''
  return [
    `Participant ${c.usubjid} (${p.arm}): ${lc(c.pt)} (${c.kinds.map((k) => KIND_LABEL[k].toLowerCase()).join('; ')}).`,
    `A ${num(p.dm.AGE)}-year-old ${race(str(p.dm.RACE))} ${sexWord(str(p.dm.SEX))} with ${mh.length ? `a history of ${listAnd(mh)}` : 'no relevant medical history'} was randomised to ${p.arm} and took the first dose of ${doseWords}${freq ? ` ${freq}` : ''} on Day 1. Concomitant medications at the onset of the event: ${onset.length ? onset.map(med).join('; ') : 'none'}.`,
    `On Day ${num(ae.AESTDY)}, the participant reported ${verbatim(str(ae.AETERM))} (coded as ${lc(c.pt)}). The event was ${sevText(ae)}${ae.AESER === 'Y' ? ` and serious (${crit.join('; ') || 'medically important'})` : ''}. ${tx.length ? `It was treated with ${listAnd(tx.map((t) => `${med(t)} from Day ${num(t.CMSTDY)}${num(t.CMENDY) !== null ? ` to Day ${num(t.CMENDY)}` : ''}`))}.` : 'No treatment for the event was recorded.'}${labs.length ? ` Laboratory values: ${labs.map(labText).join('; ')}.` : ''}`,
    `Action taken: ${action} ${complete ? `${ch.dechallenge.text} ${ch.rechallenge.text}` : '[Dechallenge statement.] [Rechallenge statement.]'}`,
    `${outcome}${disc} The investigator assessed the event as ${CAUS[str(ae.AEREL)] ?? lc(str(ae.AEREL))} to study drug${sponsor ? `;${sponsor}` : '.'}`,
  ].join('\n\n')
}

// ---------- narrative QC ----------
export type QcKind = 'fact' | 'safety-case' | 'missing' | 'contradiction' | 'privacy' | 'style'
export interface QcFinding { kind: QcKind; severity: 'error' | 'warn'; text: string; message: string }
export const QC_LABEL: Record<QcKind, string> = { fact: 'does not match the data', 'safety-case': 'differs from the safety case', missing: 'missing', contradiction: 'contradiction', privacy: 'privacy', style: 'style' }

const sentencesOf = (t: string) => t.split(/(?<=[.;!?])\s+|\n+/).filter((x) => x.trim())
const causalityIn = (s: string) => /unlikely(?: to be)? related/i.test(s) ? 'UNLIKELY RELATED' : /possibly related/i.test(s) ? 'POSSIBLY RELATED' : /probably related/i.test(s) ? 'PROBABLY RELATED' : /\bnot related|\bunrelated/i.test(s) ? 'NOT RELATED' : /\brelated/i.test(s) ? 'RELATED' : null
const outcomeIn = (s: string) => /not (?:recovered|resolved)|had not resolved|did not resolve|ongoing/i.test(s) ? 'NOT RECOVERED/NOT RESOLVED' : /recovering|resolving/i.test(s) ? 'RECOVERING/RESOLVING' : /sequelae/i.test(s) ? 'RECOVERED/RESOLVED WITH SEQUELAE' : /\bfatal\b|\bdied\b/i.test(s) ? 'FATAL' : /\b(?:recovered|resolved)\b/i.test(s) ? 'RECOVERED/RESOLVED' : null
const actionIn = (s: string) => /stopped permanently|permanently (?:stopped|discontinued)|\bwithdrawn\b|discontinued (?:study drug|the study drug|treatment)/i.test(s) ? 'DRUG WITHDRAWN' : /interrupt|withheld|paused|temporarily stopped/i.test(s) ? 'DRUG INTERRUPTED' : /not changed|unchanged|no change|continued (?:study drug|treatment|to take)/i.test(s) ? 'DOSE NOT CHANGED' : null
const LAB_NAMES: Record<string, RegExp> = { ALT: /\bALT\b/, AST: /\bAST\b/, CREAT: /\bcreatinine\b/i, GLUC: /\bglucose\b/i, HBA1C: /\bHbA1c\b/i, CHOL: /\bcholesterol\b/i, LYMPH: /\blymphocytes?\b/i, NEUT: /\bneutrophils?\b/i }

/** A contradiction in the data themselves is raised as a data query; once queried it stays as a warning. */
export const findingKey = (f: QcFinding) => `${f.kind}:${f.text}`
export function narrativeQc(s: Sdtm, c: Candidate, text: string, safety?: Safety, allArms: string[] = [], queried: string[] = []): QcFinding[] {
  const f: QcFinding[] = [], add = (kind: QcKind, severity: 'error' | 'warn', t: string, message: string) => f.push({ kind, severity, text: t, message })
  const p = profile(s, c.usubjid), ae = p.ae.find((x) => Number(x.AESEQ) === c.aeseq)
  if (!ae) return [{ kind: 'fact', severity: 'error', text: c.key, message: 'This event is not in the data.' }]
  const kind = primaryKind(c), sc = safety?.cases.find((x) => x.usubjid === c.usubjid && (lc(x.term) === lc(str(ae.AETERM)) || lc(x.term) === lc(c.pt) || studyDay(x.onset, p.firstDose) === num(ae.AESTDY)))
  const T = text.replace(/\[[^\]]*\]/g, (m) => ' '.repeat(m.length)), S = sentencesOf(T)
  for (const m of text.matchAll(/\[[^\]]+\]/g)) add('missing', 'error', m[0], 'A template prompt is still to be filled.')
  // Remove group names, so their doses are not read as doses given.
  const arms = [...new Set([...allArms, p.arm])].filter(Boolean).sort((a, b) => b.length - a.length)
  let body = T
  for (const a of arms) body = body.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => (a === p.arm ? '\u0001'.repeat(m.length) : (add('fact', 'error', a, `The participant was in ${p.arm}, not ${a}.`), '\u0002'.repeat(m.length))))
  if (!/\u0001/.test(body)) add('missing', 'error', 'treatment group', `Say the treatment group (${p.arm}).`)
  // Participant, age and sex.
  if (!text.includes(c.usubjid)) add('missing', 'warn', 'participant ID', `Name the participant by study ID (${c.usubjid}).`)
  const age = /(\d+)-year-old/.exec(body)
  if (!age) add('missing', 'error', 'age', `Give the age (${num(p.dm.AGE)} years).`)
  else if (Number(age[1]) !== num(p.dm.AGE)) add('fact', 'error', age[0], `The participant was ${num(p.dm.AGE)} years old.`)
  const sx = /\b(man|woman|male|female)\b/i.exec(body)
  if (!sx) add('missing', 'warn', 'sex', `Give the sex (${p.dm.SEX === 'F' ? 'woman' : 'man'}).`)
  else if ((/^(woman|female)$/i.test(sx[1]) ? 'F' : 'M') !== str(p.dm.SEX)) add('fact', 'error', sx[0], `The data record ${p.dm.SEX === 'F' ? 'a woman' : 'a man'}.`)
  // History and medicines.
  if (!/medical history|history of|no relevant/i.test(body) && !p.mh.some((m) => new RegExp(`\\b${lc(str(m.MHDECOD || m.MHTERM)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body))) add('missing', 'warn', 'medical history', 'Give the relevant medical history, or say there is none.')
  if (!/concomitant|no other medication|no medication/i.test(body)) add('missing', 'warn', 'concomitant medications', 'List the concomitant medications at the onset, or say there were none.')
  const allDrugs = new Set(rows(s, 'CM').flatMap((x) => [lc(str(x.CMDECOD)), lc(str(x.CMTRT))]).filter((x) => x.length > 3))
  const mine = new Set(p.cm.flatMap((x) => [lc(str(x.CMDECOD)), lc(str(x.CMTRT))]))
  for (const d of allDrugs) if (new RegExp(`\\b${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body) && !mine.has(d)) add('fact', 'error', d, `${d} is not among this participant’s medications.`)
  for (const t of p.cm.filter((x) => treats(x, ae))) if (!new RegExp(`\\b(${[str(t.CMDECOD), str(t.CMTRT)].filter(Boolean).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i').test(body)) add('missing', 'error', lc(str(t.CMDECOD || t.CMTRT)), `The event was treated with ${med(t)}: say so.`)
  // The event: term, onset, severity, seriousness.
  if (!new RegExp(`\\b${c.pt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body)) add('missing', 'error', 'event term', `Name the event by its coded term (${c.pt}).`)
  const evS = S.filter((x) => new RegExp(c.pt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(x) || /\bthe event\b/i.test(x))
  if (str(ae.AETOXGR) && !str(ae.AESEV)) {
    // Oncology: a CTCAE-style grade instead of a severity.
    const gr = evS.map((x) => /\bgrade\s*([1-5])\b/i.exec(x)).find(Boolean)
    if (!gr) add('missing', 'error', 'grade', `Give the grade (${sevText(ae)}).`)
    else if (gr[1] !== str(ae.AETOXGR)) add('fact', 'error', gr[0], `The event was ${sevText(ae)}, not grade ${gr[1]}.`)
  } else {
  const sev = evS.map((x) => /\b(mild|moderate|severe)\b/i.exec(x)).find(Boolean)
  if (!sev) add('missing', 'error', 'severity', `Give the severity (${lc(str(ae.AESEV))}).`)
  else if (sev[1].toUpperCase() !== str(ae.AESEV)) add('fact', 'error', sev[0], `The event was ${lc(str(ae.AESEV))}, not ${lc(sev[1])}.`)
  }
  const saysHosp = /hospital/i.test(body), saysDeath = /\b(died|death|fatal)\b/i.test(body)
  if (ae.AESER === 'Y') {
    if (!/\bserious\b/i.test(body)) add('missing', 'error', 'seriousness', 'Say the event was serious and why.')
    if (ae.AESHOSP === 'Y' && !saysHosp) add('missing', 'error', 'hospitalisation', 'The event required hospitalisation: say so.')
  }
  if (saysHosp && ae.AESHOSP !== 'Y') add('fact', 'error', 'hospital', 'The data do not record hospitalisation for this event.')
  if (saysDeath && ae.AESDTH !== 'Y' && ae.AEOUT !== 'FATAL') add('fact', 'error', (/\b(died|death|fatal)\b/i.exec(body) ?? [''])[0], 'The event was not fatal.')
  if (ae.AEOUT === 'FATAL' && !saysDeath) add('missing', 'error', 'death', 'The event was fatal: say so, with the day of death.')
  // Study days: every day named must be a day in this participant's data.
  const dd = dosing(p), days = new Set<number>([1, dd.last])
  for (const r of [...p.ae, ...p.cm, ...p.lb, ...p.ds, ...p.vs, ...p.ex]) for (const k of ['AESTDY', 'AEENDY', 'CMSTDY', 'CMENDY', 'LBDY', 'DSSTDY', 'VSDY', 'EXSTDY', 'EXENDY']) { const v = num(r[k]); if (v !== null) days.add(v) }
  for (const g of dd.gaps) { days.add(g.from); days.add(g.to); days.add(g.to + 1) }
  for (const m of body.matchAll(/\bDays?\s+(-?\d+)(?:\s*(?:to|and|–)\s*(?:Day\s+)?(-?\d+))?/gi)) for (const v of [m[1], m[2]].filter(Boolean)) if (!days.has(Number(v))) add('fact', 'error', `Day ${v}`, `Day ${v} is not a day in this participant’s data.`)
  if (!new RegExp(`\\bDay\\s+${num(ae.AESTDY)}\\b`).test(body)) add('missing', 'error', 'onset', `Give the onset day (Day ${num(ae.AESTDY)}).`)
  const onsetClaim = S.map((x) => /\bOn Day\s+(-?\d+),? the participant (?:had|reported|developed)\b/i.exec(x)).find(Boolean)
  if (onsetClaim && Number(onsetClaim[1]) !== num(ae.AESTDY)) add('fact', 'error', onsetClaim[0], `The event started on Day ${num(ae.AESTDY)}.`)
  // Dates: allowed, but they must match the data; study days are preferred in a CSR.
  const allDates = new Set([...p.ae, ...p.cm, ...p.lb, ...p.ds, ...p.ex].flatMap((r) => Object.entries(r).filter(([k]) => /DTC$/.test(k)).map(([, v]) => str(v).slice(0, 10))))
  for (const m of body.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) { if (str(p.dm.BRTHDTC).startsWith(m[0])) continue; if (!allDates.has(m[0])) add('fact', 'error', m[0], 'This date is not in this participant’s data.'); else add('style', 'warn', m[0], 'Use study days rather than dates in a CSR narrative.') }
  // Doses: every "N mg" must be the study drug dose or a medication's dose.
  const doses = new Set([...p.ex.map((x) => num(x.EXDOSE)), ...p.cm.map((x) => num(x.CMDOSE))].filter((x) => x !== null) as number[])
  for (const m of body.matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|g)\b/g)) if (!doses.has(Number(m[1]))) add('fact', 'error', m[0], `No dose of ${m[0]} is recorded for this participant.`)
  // Laboratory values: each value given for a test must be one of the participant's results.
  for (const [code, re] of Object.entries(LAB_NAMES)) for (const m of body.matchAll(new RegExp(`${re.source}[^.;\\d]{0,20}?(\\d+(?:\\.\\d+)?)(?!\\s*(?:mg|mcg)\\b)`, re.flags.includes('i') ? 'gi' : 'g'))) {
    const v = Number(m[m.length - 1]), res = p.lb.filter((l) => str(l.LBTESTCD) === code).map((l) => num(l.LBSTRESN))
    if (res.length && !res.some((r) => r !== null && Math.abs(r - v) < 1e-6)) add('fact', 'error', m[0].trim(), `No ${code} result of ${v} is recorded for this participant.`)
  }
  if (kind === 'aesi' && !Object.values(LAB_NAMES).some((re) => re.test(body))) add('missing', 'error', 'laboratory values', 'An event of special interest needs the laboratory values that define it.')
  // Action taken, dechallenge and rechallenge.
  const act = S.map(actionIn).find(Boolean)
  if (!act) add('missing', 'error', 'action taken', `Say what was done with study drug (${lc(str(ae.AEACN))}).`)
  else if (act !== str(ae.AEACN)) add('fact', 'error', act.toLowerCase(), `The action taken was ${lc(str(ae.AEACN))}.`)
  const ch = challenge(p, ae)
  if (ch.dechallenge.result !== 'not applicable') {
    const de = /dechallenge:?\s*(positive|negative)/i.exec(body)
    if (!de) add('missing', 'warn', 'dechallenge', `State the dechallenge (${ch.dechallenge.result}).`)
    else if (lc(de[1]) !== ch.dechallenge.result) add('fact', 'error', de[0], `The dates show a ${ch.dechallenge.result} dechallenge.`)
  }
  if (ch.rechallenge.result === 'positive' || ch.rechallenge.result === 'negative') {
    const re = /rechallenge:?\s*(positive|negative)/i.exec(body)
    if (!re) add('missing', 'warn', 'rechallenge', `State the rechallenge (${ch.rechallenge.result}).`)
    else if (lc(re[1]) !== ch.rechallenge.result) add('fact', 'error', re[0], `The dates show a ${ch.rechallenge.result} rechallenge.`)
  }
  // Outcome, and contradictions in the data themselves.
  const outS = S.filter((x) => /\bthe event\b/i.test(x) && !/dechallenge|rechallenge|interrupt|stopped permanently|restarted/i.test(x)).map(outcomeIn).find(Boolean)
  if (!outS) add('missing', 'error', 'outcome', `Give the outcome (${lc(str(ae.AEOUT))}).`)
  else if (outS !== str(ae.AEOUT)) add('fact', 'error', lc(outS), `The outcome was ${lc(str(ae.AEOUT))}.`)
  if (/^RECOVERED/.test(str(ae.AEOUT)) && !str(ae.AEENDTC)) add('contradiction', 'error', 'outcome', 'The data say the event resolved but give no end date: query the data before the narrative is final.')
  if (/^NOT RECOVERED|^RECOVERING/.test(str(ae.AEOUT)) && str(ae.AEENDTC)) add('contradiction', 'error', 'outcome', 'The data give an end date for an event that had not resolved: query the data.')
  if (ae.AEACN === 'DRUG WITHDRAWN' && num(ae.AEENDY) !== null && num(ae.AEENDY)! < dd.last) add('contradiction', 'error', 'action taken', `The event ended on Day ${num(ae.AEENDY)}, but the dosing record shows study drug until Day ${dd.last}: query the action taken before the narrative is final.`)
  if (ae.AEACN === 'DRUG INTERRUPTED' && !p.dispensing && !dd.gaps.some((g) => g.to >= (num(ae.AESTDY) ?? 0) - 1 && g.from <= (num(ae.AEENDY) ?? num(ae.AESTDY) ?? 0) + 7)) add('contradiction', 'error', 'action taken', 'The action taken says study drug was interrupted, but the dosing record shows no break around the event: query the dosing dates before the narrative is final.')
  if (kind === 'discontinuation' && p.ds.length && !/left the study|withdr[ae]w|discontinued from the study|stopped the study/i.test(body)) add('missing', 'warn', 'discontinuation', 'Say when and why the participant left the study.')
  // Causality: the investigator's and the sponsor's.
  const inv = S.filter((x) => /investigator/i.test(x)).map(causalityIn).find(Boolean)
  if (!inv) add('missing', 'error', 'investigator causality', `Give the investigator’s causality (${lc(str(ae.AEREL))}).`)
  else if (inv !== str(ae.AEREL)) add('fact', 'error', lc(inv), `The investigator assessed it as ${lc(str(ae.AEREL))}.`)
  const spS = S.find((x) => /sponsor/i.test(x)), sp = spS ? causalityIn(spS.slice(spS.search(/sponsor/i))) : null
  if (ae.AESER === 'Y') {
    if (!sc) add('safety-case', 'warn', 'safety case', 'No case for this SAE in the safety database: raise it with the safety team (reconciliation).')
    if (!sp) add('missing', 'error', 'sponsor causality', `Give the sponsor’s causality${sc ? ` (${lc(sc.sponsorCausality)}, from the safety case)` : ''}.`)
    else if (sc && sp !== sc.sponsorCausality) add('safety-case', 'error', lc(sp), `The safety case gives the sponsor’s assessment as ${lc(sc.sponsorCausality)}.`)
  }
  if (sc) {
    const sd = studyDay(sc.onset, p.firstDose)
    if (sd !== null && sd !== num(ae.AESTDY)) add('safety-case', 'warn', `Day ${sd}`, `The safety database has the onset on Day ${sd}, the clinical database on Day ${num(ae.AESTDY)}: check the reconciliation before the narrative is final.`)
    if (sc.outcome !== str(ae.AEOUT)) add('safety-case', 'warn', 'outcome', `The safety database has the outcome as ${lc(sc.outcome)}: check the reconciliation.`)
    if (sc.causality !== str(ae.AEREL)) add('safety-case', 'warn', 'causality', `The safety database has the investigator’s causality as ${lc(sc.causality)}: check the reconciliation.`)
  }
  // Privacy: no names, initials or dates of birth.
  for (const m of text.matchAll(/\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z][a-z]+/g)) add('privacy', 'error', m[0], 'No names in a narrative: use the participant ID.')
  for (const m of text.matchAll(/\b[A-Z]\.\s?[A-Z]\.(?:\s?[A-Z]\.)?|\binitials\b/g)) add('privacy', 'error', m[0], 'No initials in a narrative.')
  if (/date of birth|\bborn on\b|\bDOB\b/i.test(text) || (str(p.dm.BRTHDTC).length >= 10 && text.includes(str(p.dm.BRTHDTC).slice(0, 10)))) add('privacy', 'error', 'date of birth', 'No dates of birth: give the age.')
  return f.map((x) => (x.kind === 'contradiction' && queried.includes(findingKey(x)) ? { ...x, severity: 'warn' as const, message: `${x.message} (Data query raised.)` } : x))
}
export const qcErrors = (f: QcFinding[]) => f.filter((x) => x.severity === 'error')
