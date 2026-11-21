// Narrative missions. CS6: the four HRP-301 SAE narratives, written from the profile with the
// template. CS7: all ten GLV-12-301 narratives against the clock, with the narrative generator.
// CS8: QC a colleague's four GLV-12-301 narratives with twelve planted contradictions.
import { candidates, draft, narrativeQc, qcErrors, primaryKind, type Candidate } from '../narratives'
import type { Sdtm, Safety } from '../sdtm'
import type { Project } from '../types'

export interface PatientData { sdtm: Sdtm; safety: Safety }
export const ARMS: Record<string, string[]> = { 'GLV-12-301': ['Placebo', 'GLV-12 5 mg', 'GLV-12 10 mg'], 'HRP-301': ['Placebo', 'Lumiravostat 10 mg', 'Lumiravostat 25 mg'] }
export const CS7_MINUTES = 60

/** The narratives a mission asks for. */
export function missionCandidates(id: string, d: PatientData): Candidate[] {
  const all = candidates(d.sdtm)
  if (id === 'CS6') return all.filter((c) => c.kinds.includes('sae'))
  if (id === 'CS8') return all.filter((c) => CS8_SUBJECTS.includes(c.usubjid))
  return all
}

export interface Planted { n: number; usubjid: string; from: string; to: string; kind: string; why: string }
export const CS8_SUBJECTS = ['GLV-12-301-101-001', 'GLV-12-301-102-001', 'GLV-12-301-105-006', 'GLV-12-301-105-015']
/** Each `from` is text of the complete draft; `to` is what the colleague wrote. */
export function cs8Planted(d: PatientData): Planted[] {
  const t = (u: string) => { const c = candidates(d.sdtm).find((x) => x.usubjid === u)!; return draft(d.sdtm, c, d.safety.cases.find((x) => x.usubjid === u)) }
  const age = (u: string) => /(\d+)-year-old/.exec(t(u))![1]
  const outcome105015 = /The event resolved on Day \d+\./.exec(t('GLV-12-301-105-015'))![0]
  return [
    { n: 1, usubjid: 'GLV-12-301-105-006', from: `A ${age('GLV-12-301-105-006')}-year-old`, to: `A ${Number(age('GLV-12-301-105-006')) + 2}-year-old`, kind: 'age', why: `DM gives the age as ${age('GLV-12-301-105-006')}.` },
    { n: 2, usubjid: 'GLV-12-301-105-006', from: 'The event was severe', to: 'The event was moderate', kind: 'severity', why: 'AESEV is SEVERE.' },
    { n: 3, usubjid: 'GLV-12-301-105-006', from: 'On Day 97, the participant reported', to: 'On Day 96, the participant reported', kind: 'onset day', why: 'AESTDY is 97.' },
    { n: 4, usubjid: 'GLV-12-301-102-001', from: 'treated with clarithromycin 500 mg', to: 'treated with amoxicillin 500 mg', kind: 'medication', why: 'CM records clarithromycin for the pneumonia; amoxicillin was given to another participant.' },
    { n: 5, usubjid: 'GLV-12-301-102-001', from: 'Dechallenge: positive', to: 'Dechallenge: negative', kind: 'dechallenge', why: 'The pneumonia resolved on Day 82, during the interruption (Day 74 to Day 84).' },
    { n: 6, usubjid: 'GLV-12-301-102-001', from: 'the sponsor assessed it as not related', to: 'the sponsor assessed it as possibly related', kind: 'sponsor causality', why: 'The safety case gives the sponsor’s assessment as not related.' },
    { n: 7, usubjid: 'GLV-12-301-101-001', from: 'assessed the event as related to study drug', to: 'assessed the event as not related to study drug', kind: 'investigator causality', why: 'AEREL is RELATED.' },
    { n: 8, usubjid: 'GLV-12-301-101-001', from: 'Participant GLV-12-301-101-001 (GLV-12 10 mg)', to: 'Participant GLV-12-301-101-001 (GLV-12 5 mg)', kind: 'treatment group', why: 'ACTARM is GLV-12 10 mg.' },
    { n: 9, usubjid: 'GLV-12-301-101-001', from: 'The event resolved on Day 102.', to: 'The event resolved on Day 102. Participant J.K. was discharged the same day.', kind: 'privacy', why: 'No initials in a narrative.' },
    { n: 10, usubjid: 'GLV-12-301-105-015', from: outcome105015, to: 'The event had not resolved.', kind: 'outcome', why: 'AEOUT is RECOVERED/RESOLVED, with an end date.' },
    { n: 11, usubjid: 'GLV-12-301-105-015', from: 'Action taken: study drug was stopped permanently', to: 'Action taken: study drug was interrupted', kind: 'action taken', why: 'AEACN is DRUG WITHDRAWN.' },
    { n: 12, usubjid: 'GLV-12-301-105-015', from: 'The event was moderate.', to: 'The event was moderate and required hospitalisation.', kind: 'seriousness', why: 'The event was not serious; AESHOSP is not Y.' },
  ]
}
/** The colleague's narratives: complete drafts with the planted contradictions. */
export function cs8Texts(d: PatientData): Record<string, string> {
  const out: Record<string, string> = {}, P = cs8Planted(d)
  for (const u of CS8_SUBJECTS) {
    const c = candidates(d.sdtm).find((x) => x.usubjid === u)!
    let t = draft(d.sdtm, c, d.safety.cases.find((x) => x.usubjid === u))
    for (const p of P.filter((x) => x.usubjid === u)) { if (t.split(p.from).length !== 2) throw new Error(`CS8 error ${p.n}: “${p.from}” must occur once`); t = t.replace(p.from, p.to) }
    out[c.key] = t
  }
  return out
}

export interface Item { label: string; ok: boolean; why: string }
export function scoreNarrativeMission(p: Project, d: PatientData): Item[] {
  const id = p.mission!.id, arms = ARMS[p.study] ?? [], cs = missionCandidates(id, d)
  const qc = (c: Candidate) => { const n = p.narratives?.[c.key]; return n?.text.trim() ? qcErrors(narrativeQc(d.sdtm, c, n.text, d.safety, arms, n.queries)) : null }
  if (id === 'CS8') {
    const P = cs8Planted(d), texts = Object.fromEntries(cs.map((c) => [c.usubjid, p.narratives?.[c.key]?.text ?? '']))
    const left = cs.flatMap((c) => qc(c) ?? [])
    return [...P.map((x) => ({ label: `Error ${x.n}: ${x.kind} (${x.usubjid.slice(-7)})`, ok: texts[x.usubjid].includes(x.from) && !texts[x.usubjid].includes(x.to), why: x.why })),
      { label: 'No QC errors left', ok: !left.length, why: left.length ? `${left.length} QC error${left.length === 1 ? '' : 's'} remain: ${left.slice(0, 3).map((x) => x.message).join(' ')}` : 'The four narratives pass QC.' }]
  }
  const items: Item[] = cs.map((c) => { const f = qc(c); return { label: `${c.usubjid.slice(-7)} ${c.pt} (${primaryKind(c)})`, ok: f !== null && !f.length, why: f === null ? 'Not written yet.' : f.length ? `${f.length} QC error${f.length === 1 ? '' : 's'}: ${f.slice(0, 2).map((x) => `${x.text}: ${x.message}`).join(' ')}` : 'Passes QC.' } })
  if (id === 'CS7') {
    const end = p.mission!.submittedUtc ?? new Date().toISOString(), mins = (Date.parse(end) - Date.parse(p.mission!.startedUtc)) / 60000
    items.push({ label: `Within ${CS7_MINUTES} minutes`, ok: mins <= CS7_MINUTES, why: `${Math.round(mins)} minutes from the start.` })
  }
  return items
}
/** Model narratives (complete drafts), shown after a submission. */
export const modelNarratives = (id: string, d: PatientData) => missionCandidates(id, d).map((c) => ({ c, text: draft(d.sdtm, c, d.safety.cases.find((x) => x.usubjid === c.usubjid)) }))
