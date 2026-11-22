// Sections 7 to 9 from the protocol: drafts in the past tense built from the Protocol Builder's
// structured data (objectives, design, criteria, treatments, estimands, analysis sets, sample
// size), the protocol's own text where only text exists, a tense check, the amendments from the
// protocol's version history (9.8), and the differences between the planned analyses and what
// was run (each needs a reason).
import pHrp from '../data/protocol-hrp-301.json'
import pGlv from '../data/protocol-glv-12-301.json'
import pH205 from '../data/protocol-hrp-205.json'
import pOnk from '../data/protocol-onk-44-302.json'
import { BUNDLED, outputsOf } from './study'
import { tableNumber } from './e3'

/* eslint-disable @typescript-eslint/no-explicit-any */
type D = any
export interface Amendment { number: string; date: string; identifier: string; reason: string; summary: string; safetyRights: string; dataImpact: string; enrolledPct: number; changes: { sections: string[]; description: string; rationale: string }[] }
const PROTO: Record<string, D> = { 'GLV-12-301': pGlv, 'HRP-301': pHrp, 'HRP-205': pH205, 'ONK-44-302': pOnk }
const REASON: Record<string, string> = { C207600: 'change in standard of care', C207601: 'change in strategy', C207602: 'IMP addition', C207603: 'inconsistency or error in the protocol', C207604: 'investigator or site feedback', C207605: 'IRB or IEC feedback', C207606: 'manufacturing change', C207607: 'new data available (other than safety data)', C207608: 'new regulatory guidance', C207609: 'new safety information', C207610: 'protocol design error', C207611: 'recruitment difficulty', C207612: 'regulatory agency request', C17649: 'other' }

export const hasProtocol = (study: string) => !!PROTO[study]
export const protocolData = (study: string): D => PROTO[study]?.project.versions.at(0).data
export const latestData = (study: string): D => PROTO[study]?.project.versions.at(-1).data
export function amendmentsOf(study: string): Amendment[] {
  return (PROTO[study]?.project.versions ?? []).filter((v: D) => v.amendment).map((v: D) => ({ number: v.number, date: v.date, identifier: v.amendment.identifier, reason: REASON[v.amendment.primaryReason] ?? v.amendment.primaryReason, summary: v.amendment.summary, safetyRights: v.amendment.safetyRights, dataImpact: v.amendment.dataImpact, enrolledPct: v.amendment.enrolledPct, changes: v.amendment.changes }))
}

// ---------- the tense ----------
/** Present and future tense, as protocols are written, turned into the past tense of a report. */
export function pastTense(t: string): string {
  return t
    .replace(/\b(\w+)(\)?) will be\b/g, (_, w: string, b: string) => `${w}${b} ${/[^su]s$|^(they|we|both|all)$/i.test(w) ? 'were' : 'was'}`).replace(/\bwill be\b/g, 'was').replace(/\bwill\s+(\w+)/g, (_, v: string) => past(v))
    .replace(/\b(is|are) (\w+ed|\w+en|given|taken|seen|done|made|kept|set|run|read|told|shown|held|sent|paid|met)\b/g, (_, aux: string, v: string) => `${aux === 'is' ? 'was' : 'were'} ${v}`)
    .replace(/\b(has|have) to\b/g, 'had to')
    .replace(/\bcan\b/g, 'could').replace(/\bmay\b/g, 'could')
    .replace(/\b(participants|Participants|who|and) (stop|stay|attend|receive|take|use|continue|complete)\b/g, (_, a: string, v: string) => `${a} ${past(v)}`)
    .replace(/\bare\b/g, 'were').replace(/\bis\b/g, 'was')
    .replace(/\b(gives|takes|keeps|uses|tests|stops|starts|receives|records|follows|has|have|includes|covers|controls|allows|counts|stays)\b/g, (v: string) => PAST3[v] ?? v)
}
const PAST3: Record<string, string> = { gives: 'gave', takes: 'took', keeps: 'kept', uses: 'used', tests: 'tested', stops: 'stopped', starts: 'started', receives: 'received', records: 'recorded', follows: 'followed', has: 'had', have: 'had', includes: 'included', covers: 'covered', controls: 'controlled', allows: 'allowed', counts: 'counted', stays: 'stayed' }
const IRR: Record<string, string> = { be: 'were', have: 'had', give: 'gave', take: 'took', keep: 'kept', see: 'saw', make: 'made', run: 'ran', read: 'read', get: 'got', come: 'came', go: 'went', do: 'did', stop: 'stopped', receive: 'received', continue: 'continued', start: 'started' }
const past = (v: string) => IRR[v] ?? (v.endsWith('e') ? `${v}d` : `${v}ed`)

export interface TenseFinding { sentence: string; words: string[] }
/** Sentences of a methods section still in the future or present tense of a protocol. */
export function tenseFindings(text: string): TenseFinding[] {
  const out: TenseFinding[] = []
  for (const s of text.split(/(?<=[.;!?])\s+|\n+/).filter((x) => x.trim() && !/^\[/.test(x.trim()) && !/^(?:IN|EX)\d{2}:/.test(x.trim()))) {
    // Future (protocol) tense, and the present tense of a procedure ("participants are randomised",
    // "gives 80% power"). Present tense about the report itself stays ("listed in appendix 16.1.3").
    const w = [...s.matchAll(/\b(will|shall|is planned|are planned|is to be|are to be|is expected to|are expected to)\b|\b(?:is|are)\s+(?!titled\b|labell?ed\b|located\b)(?:\w+ed|\w+en|used|kept|done|made|run|set|held|seen|known|shown|chosen|told|met)\b(?!\s+(?:in|at|on) (?:appendix|appendices|section|table|listing|figure))|\b(?:gives|receives|takes|attends|can|may)\b/gi)].map((m) => m[0])
    if (w.length) out.push({ sentence: s, words: [...new Set(w.map((x) => x.toLowerCase()))] })
  }
  return out
}

// ---------- drafts ----------
/** Lower-case the first letter of a phrase, unless it starts a name or code (GLV-12, HbA1c, Glyvantra). */
const lc = (s: string) => (/^[A-Z][a-z]/.test(s) && !/^(Glyvantra|Ostrevia|Halcyon|Glyvant|Meridian)/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const low = (s: string) => s.toLowerCase()
const listAnd = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
const N = (d: D, k: string) => pastTense(d.narrative?.[k] ?? '').replace(/(^|\n|\.\s)\d+(\.\d+)+\s+/g, '$1').trim()

/** A past-tense draft of a section of 7 to 9, from the protocol in force at the end of the study. */
export function methodsDraft(study: string, id: string): string | null {
  const d = latestData(study), d0 = protocolData(study); if (!d) return null
  const t = d.title, dz = d.design ?? {}, f = d.facts ?? {}
  const arms = (d.arms ?? []) as D[], ints = (d.interventions ?? []) as D[]
  const est = (d.estimands ?? []) as D[], sets = (d.analysisSets ?? []) as D[]
  const crit = (c: string) => (d.criteria as D[]).filter((x) => x.category === c).map((x) => `${x.code}: ${x.text}`)
  switch (id) {
    case '7': return [N(d, '2.1'), N(d, '2.2.1')].filter(Boolean).join('\n\n') || null
    case '8': return [
      ...(d.objectives as D[]).map((o) => `${o.level} objective: ${lc(o.text.replace(/\.$/, ''))}.`),
      ...(d.endpoints as D[]).map((e) => `${e.level} endpoint: ${lc(e.text.replace(/\.$/, ''))}.`),
      ...est.map((e) => `Estimand ${e.id}: in ${lc(e.population)}, the ${lc(e.summary)} between ${lc(e.treatment)}; intercurrent events: ${(e.intercurrentEvents as D[]).map((i) => `${lc(i.name)} (${lc(i.strategy)} strategy)`).join('; ')}.`),
    ].join('\n')
    case '9.1': return `${t['Short Title'] ?? ''} (${t['Sponsor Protocol Identifier']}) was a ${low(t['Trial Phase'] ?? '')}, ${low(dz['Trial Blind Schema'] ?? '').replace('double blind', 'double-blind')}, ${low(dz['Control Type'] ?? '')}-controlled, ${low(dz['Intervention Model'] ?? '')} study in ${lc(dz['Population Diagnosis or Condition'] ?? '')}. ${dz['Randomisation Type'] ? `Participants were randomised: ${lc(dz['Randomisation Type']).replace(/\.$/, '')}.` : ''} The groups were ${listAnd(arms.map((a) => `${a.name} (${lc(a.intervention)})`))}. ${f.treatmentWeeks ? `Treatment lasted ${f.treatmentWeeks} weeks, with follow-up ${f.followUpWeeks} weeks later.` : ''} The study ran at ${lc(dz['Site Distribution'] ?? 'the participating sites')} in ${(dz['Site Geographic Scope'] ?? '').replace(/^United States/, 'the United States').replace(/(, |and )United (States|Kingdom)/g, '$1the United $2')}${dz['Independent Committees'] ? `, overseen by an ${lc(dz['Independent Committees'])}` : ''}. ${f.participants ? `The plan was to randomise ${f.participants} participants.` : ''}`.replace(/\s+/g, ' ').trim()
    case '9.2': return [N(d, '4.2.2'), N(d, '4.2.3'), N(d, '4.2.4')].filter(Boolean).join('\n\n') || null
    case '9.3': return `Adults with ${lc(dz['Population Diagnosis or Condition'] ?? '')}, aged ${dz['Population Age (Minimum and Maximum)'] ?? ''} years, were enrolled.`
    case '9.3.1': return crit('Inclusion').join('\n')
    case '9.3.2': return crit('Exclusion').join('\n')
    case '9.3.3': return [N(d, '7.1'), N(d, '7.2')].filter(Boolean).join('\n\n') || null
    case '9.4.1': return ints.filter((i) => i.role !== 'Rescue').map((i) => `${i.name}: ${i.dose}, ${lc(i.route)}, ${i.frequency}${i.durationWeeks ? ` for ${i.durationWeeks} weeks` : ''} (${lc(i.role)}).`).join('\n')
    case '9.4.2': return `${ints.filter((i) => i.role === 'Investigational' || i.role === 'Placebo').map((i) => `${i.name}: ${i.dose}`).join('; ')}. [To be written: batch numbers of each product, from the clinical supplies records (batches by participant in 16.1.6).]`
    case '9.4.3': return N(d, '6.7') || (dz['Randomisation Type'] ? `Participants were assigned to treatment by ${lc(dz['Randomisation Type']).replace(/\.$/, '')}.` : null)
    case '9.4.4': return N(d, '6.2') || null
    case '9.4.5': return N(d, '6.3') || null
    case '9.4.6': return [`The study was ${low(dz['Trial Blind Schema'] ?? 'blinded').replace('double blind', 'double-blind')}: the ${listAnd(low(dz['Blinded Roles'] ?? '').split(/,\s*/).map((x) => `${x}s`.replace(/ss$/, 's').replace(/teams$/, 'team')))} did not know the assigned treatment.`, N(d, '6.4')].filter(Boolean).join(' ')
    case '9.4.7': return [N(d, '6.9'), N(d, '6.10')].filter(Boolean).join('\n\n') || null
    case '9.4.8': return N(d, '6.8') || null
    case '9.6': return [N(d, '11.6'), N(d, '11.7'), N(d, '11.9')].filter(Boolean).join('\n\n') || null
    case '9.5.1': return (d.procedures as D[]).map((p) => `${p.name}: ${p.visits === 'continuous' ? 'throughout' : (p.visits as string[]).map((v) => (d.visits as D[]).find((x) => x.id === v)?.name ?? v).join(', ')}.`).join('\n')
    case '9.5.3': return est.filter((e) => (d.endpoints as D[]).find((x) => x.id === e.endpointId)?.level === 'Primary').map((e) => `The primary variable was ${lc((d.endpoints as D[]).find((x) => x.id === e.endpointId).text.replace(/\.$/, ''))}. The primary estimand: population, ${lc(e.population)}; treatment, ${lc(e.treatment)}; intercurrent events, ${(e.intercurrentEvents as D[]).map((i) => `${lc(i.name)} handled with a ${lc(i.strategy)} strategy (${lc(i.description.replace(/\.$/, ''))})`).join('; ')}; population-level summary, ${lc(e.summary)}.`).join('\n')
    case '9.7.1': return [
      `Analysis sets: ${sets.map((s) => `${s.name} (${lc(s.text.replace(/\.$/, ''))})`).join('; ')}.`,
      ...est.map((e) => `Estimand ${e.id}: ${pastTense(e.estimator)}${e.missing ? ` Missing data: ${lc(pastTense(e.missing))}` : ''}${e.sensitivity ? ` Sensitivity: ${lc(pastTense(e.sensitivity))}` : ''}`),
      d.multiplicity ? `Multiplicity: ${lc(pastTense(d.multiplicity))}` : '',
      N(d, '10.7'),
    ].filter(Boolean).join('\n')
    case '9.7.2': return N(d, '10.11') || pastTense(d.statements?.['10.11'] ?? '') || null
    case '9.8': {
      const am = amendmentsOf(study), ch = analysisChanges(study)
      return [
        am.length ? am.map((a) => `Amendment ${a.identifier} (protocol version ${a.number}, approved ${a.date}; primary reason: ${a.reason}): ${a.summary}${a.enrolledPct ? ` About ${a.enrolledPct}% of participants had been enrolled when it was approved.` : ''}`).join('\n') : 'The protocol was not amended.',
        ...ch.map((c) => `${c.planned} ${c.done} [To be written: ${c.kind === 'labelling' ? 'how the output will be corrected' : 'the reason'}.]`),
      ].join('\n')
    }
    default: return d0 ? null : null
  }
}
/** The protocol sections each CSR methods section is drafted from, for the side-by-side view. */
export const PROTOCOL_KEYS: Record<string, string[]> = { '7': ['2.1', '2.2.1'], '9.2': ['4.2.2', '4.2.3', '4.2.4'], '9.3.3': ['7.1', '7.2'], '9.4.3': ['6.7'], '9.4.4': ['6.2'], '9.4.5': ['6.3'], '9.4.6': ['6.4'], '9.4.7': ['6.9', '6.10'], '9.4.8': ['6.8'], '9.6': ['11.6', '11.7', '11.9'], '9.7.1': ['10.7'], '9.7.2': ['10.11'] }
/** The protocol's own words for a section, as written (future tense): what a writer starts from. */
export function protocolText(study: string, id: string): string | null {
  const d = latestData(study); if (!d) return null
  return (PROTOCOL_KEYS[id] ?? []).map((k) => String(d.narrative?.[k] ?? d.statements?.[k] ?? '').trim()).filter(Boolean).join('\n\n') || null
}
export const DRAFTABLE = ['7', '8', '9.1', '9.2', '9.3', '9.3.1', '9.3.2', '9.3.3', '9.4.1', '9.4.2', '9.4.3', '9.4.4', '9.4.5', '9.4.6', '9.4.7', '9.4.8', '9.5.1', '9.5.3', '9.6', '9.7.1', '9.7.2', '9.8']

// ---------- planned against done ----------
export interface AnalysisChange { id: string; planned: string; done: string; kind: 'not done' | 'added' | 'changed' | 'labelling'; keywords: RegExp }
/** The differences between the protocol's plan and the analyses the outputs show. Each must be
 *  reported in 9.8 with its reason (E3 9.8; ICH E9 section 5.8). */
export function analysisChanges(study: string): AnalysisChange[] {
  const d = latestData(study); if (!d) return []
  const outs = BUNDLED[study] ? outputsOf(BUNDLED[study]) : [], titles = outs.map((o) => o.title.toLowerCase()).join(' | ')
  const out: AnalysisChange[] = []
  const coding = Object.values(d.narrative ?? {}).some((t) => /meddra/i.test(String(t)))
  if (coding) out.push({ id: 'coding', planned: 'The protocol planned to code adverse events with MedDRA.', done: 'They were coded with the Study Medical Dictionary (the sponsor’s training dictionary, fictional).', kind: 'changed', keywords: /dictionary|meddra/i })
  for (const s of d.analysisSets as D[]) if (/per-protocol/i.test(s.name) && !/per-protocol/.test(titles)) out.push({ id: 'pp', planned: `The protocol planned a ${lc(s.name)} (${lc(s.text.replace(/\.$/, ''))}).`, done: 'No analysis in the per-protocol set was produced.', kind: 'not done', keywords: /per-protocol/i })
  for (const e of d.endpoints as D[]) {
    if (e.level === 'Primary' || /adverse event/i.test(e.text)) continue
    const key = /itch/i.test(e.text) ? 'itch' : /hecsi/i.test(e.text) ? 'hecsi' : /hba1c/i.test(e.text) ? 'hba1c' : e.text.split(' ')[0].toLowerCase()
    if (!titles.includes(key)) out.push({ id: `end-${e.id}`, planned: `The protocol planned the ${lc(e.level)} endpoint ${lc(e.text.replace(/\.$/, ''))}.`, done: 'No output analyses it.', kind: 'not done', keywords: new RegExp(key, 'i') })
  }
  for (const o of outs) if (/primary estimand/i.test(o.title) && (d.estimands as D[]).some((e) => /supplementary:? an mmrm|supplementary: an mmrm/i.test(`${e.estimator} ${e.sensitivity} ${d.narrative?.['10.4'] ?? ''}`)) && /mmrm/i.test(o.title))
    out.push({ id: 'label', planned: 'The protocol made the MMRM a supplementary analysis (protocol 10.4).', done: `${tableNumber(o.title) ? `Table ${tableNumber(o.title)}` : o.id} is titled “primary estimand”.`, kind: 'labelling', keywords: /mmrm/i })
  if (/lab|laborator/i.test(d.narrative?.['10.7'] ?? '') && !/14\.3\.4/.test(outs.map((o) => tableNumber(o.title)).join(' '))) out.push({ id: 'labs', planned: 'The protocol planned laboratory summaries by visit with shifts from baseline.', done: 'No laboratory table was produced.', kind: 'not done', keywords: /laborator/i })
  return out
}

const sentencesOf = (t: string) => t.split(/(?<=[.;!?])\s+|\n+/).filter((x) => x.trim())
const REASON_WORDS = /\b(because|reason|so that|since|as the|due to|owing to|in order to|was not (?:analysed|produced|run) as)\b/i
/** Checks on section 9.8: every amendment and every analysis change is reported, each with a reason. */
export function changeFindings(study: string, text: string): { ok: boolean; label: string; why: string }[] {
  const am = amendmentsOf(study), ch = analysisChanges(study)
  return [
    ...am.map((a) => ({ ok: new RegExp(`amendment\\s+${a.identifier}\\b`, 'i').test(text) && text.includes(a.date), label: `Amendment ${a.identifier} (${a.date})`, why: `Name amendment ${a.identifier} with its approval date (${a.date}), what changed and why.` })),
    ...ch.map((c) => ({ ok: sentencesOf(text).some((x) => c.keywords.test(x) && REASON_WORDS.test(x)), label: c.planned.replace(/^The protocol /, '').replace(/\.$/, ''), why: `${c.planned} ${c.done} Report it in 9.8, with the reason, in the same sentence.` })),
  ]
}
