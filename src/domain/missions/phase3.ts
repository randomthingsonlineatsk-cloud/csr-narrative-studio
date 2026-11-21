// Phase 3 missions. CS9: methods from the protocol (past tense, 9.8 complete). CS10: discussion
// and benefit–risk for HRP-301, from a colleague's draft that claims too much. CS11: an
// abbreviated report for the stopped study HRP-205. CS13: take the complete GLV-12-301 report
// through review to approval. CS14: the India (NDCT Rules 2019, Table 6) version.
import { completeProject, defaultSlots, newProject } from '../project'
import { BUNDLED, outputsOf } from '../study'
import { changeFindings, protocolText, tenseFindings } from '../methods'
import { benefitRisk, claimFindings, discussionItems } from '../discussion'
import { indiaItems } from '../india'
import { addComment, CI, openComments, snapshot } from '../review'
import { checkText, errors, sentences, type Finding, type TokKind } from '../checker'
import { qcStatus, AUTHOR, APPROVER } from '../workflow'
import { candidates, draft, narrativeQc, qcErrors } from '../narratives'
import { PLACEHOLDER } from '../project'
import type { PatientData } from './narr'
import type { Project } from '../types'

export interface Item { label: string; ok: boolean; why: string }

// ---------- CS9 ----------
/** The sections CS9 starts with the protocol's own (future-tense) words. */
export const CS9_SECTIONS = ['9.2', '9.3.3', '9.4.3', '9.4.4', '9.4.5', '9.4.7', '9.4.8', '9.7.2']
export function startCs9(p: Project) {
  for (const id of CS9_SECTIONS) { const t = protocolText('GLV-12-301', id); if (t) p.sections[id].text = t }
}
function scoreCs9(p: Project): Item[] {
  const S = (s: string) => p.sections[s]?.text ?? ''
  return [
    ...CS9_SECTIONS.map((id) => { const t = S(id), f = tenseFindings(t); return { label: `${id} in the past tense`, ok: !!t.trim() && !PLACEHOLDER.test(t) && !f.length, why: f.length ? `Still in the protocol’s tense: “${f[0].sentence.slice(0, 80)}”.` : t.trim() ? 'Past tense.' : 'Not written.' } }),
    ...changeFindings('GLV-12-301', S('9.8')).map((c) => ({ label: `9.8: ${c.label}`, ok: c.ok, why: c.why })),
    { label: '9.8 has no gaps left', ok: !!S('9.8').trim() && !PLACEHOLDER.test(S('9.8')), why: 'Replace every “[To be written…]” with the reason.' },
  ]
}

// ---------- CS10 ----------
export const CS10_DRAFT = 'Lumiravostat was effective in moderate to severe chronic hand eczema: IGA-CHE treatment success was 31.3% with lumiravostat 25 mg against 20.0% with placebo [T14.2.1], and the HECSI-75 response showed a clear trend towards benefit (50.0% against 26.7%) [T14.2.2]. Lumiravostat was safe and well tolerated at both doses. These results support the continued development of lumiravostat 25 mg as an effective oral treatment.'
function scoreCs10(p: Project): Item[] {
  const br = benefitRisk(BUNDLED['HRP-301']), S = (s: string) => p.sections[s]?.text ?? ''
  const t13 = S('13'), warn = claimFindings(t13, br).filter((c) => c.severity === 'warn')
  const other = ['11.4.7', '12.6'].flatMap((s) => claimFindings(S(s), br).filter((c) => c.severity === 'error').map((c) => ({ s, c })))
  return [
    ...discussionItems(t13, br).map((i) => ({ label: `13: ${i.label}`, ok: i.ok, why: i.why })),
    { label: '13: no judgement words in place of results', ok: !warn.length, why: warn.length ? warn.map((w) => w.why).join(' ') : 'None.' },
    { label: '11.4.7 and 12.6 say no more than the results', ok: !!S('11.4.7').trim() && !!S('12.6').trim() && !PLACEHOLDER.test(S('11.4.7') + S('12.6')) && !other.length, why: other.length ? other.map((o) => `${o.s}: ${o.c.kind}`).join('; ') : 'Write both conclusions: the efficacy conclusion and the safety conclusion.' },
    { label: 'Numbers in 13 tie to the tables', ok: !errors(findingsIn(p, '13')).length, why: `${errors(findingsIn(p, '13')).length} checker errors in 13.` },
  ]
}

// ---------- CS11 ----------
const G205 = ['Clobetasol cream', 'Lumiravostat 25 mg']
const findingsIn = (p: Project, sec: string): Finding[] => { const d = BUNDLED[p.study], st = p.sections[sec]; return st ? checkText(sec, st.text, outputsOf(d), st.slots, d.groups, p.rounding) : [] }
const tied = (fs: Finding[], out: string, row: string, group: string, kind: TokKind) => fs.some((f) => (f.status === 'ok' || f.status === 'rounding') && f.tie && f.tie.out === out && f.tie.row === row && f.tie.group === group && f.tie.kind === kind)
const need = (p: Project, label: string, sec: string, out: string, row: string, groups: string[], kind: TokKind): Item => { const fs = findingsIn(p, sec), miss = groups.filter((g) => !tied(fs, out, row, g, kind)); return { label, ok: !miss.length, why: miss.length ? `Not found in ${sec}, tied to its cell, for ${miss.join(', ')}.` : 'Reported and tied to the table.' } }
export const CS11_SECTIONS = ['9.8', '10.1', '11.4.1', '12.2.1', '12.2.2', '12.3.1', '12.6', '13']
function scoreCs11(p: Project): Item[] {
  const S = (s: string) => p.sections[s]?.na ? '' : p.sections[s]?.text ?? '', br = benefitRisk(BUNDLED['HRP-205'])
  const stop = S('9.8') + ' ' + S('10.1'), eff = S('11.4.1')
  const claims = ['11.4.1', '12.6', '13'].flatMap((s) => claimFindings(S(s), br).filter((c) => c.severity === 'error'))
  const errs = CS11_SECTIONS.flatMap((s) => errors(findingsIn(p, s)))
  return [
    { label: 'An abbreviated report', ok: p.reportType === 'abbreviated', why: 'A study stopped early for reasons unrelated to safety or efficacy can have an abbreviated report (E3, and E3 Q&A): switch the report type in the Overview.' },
    { label: 'Why and when the study stopped', ok: /2026-06-30|30 June 2026/.test(stop) && /recruit/i.test(stop), why: 'The sponsor stopped the study on 2026-06-30 because recruitment was too slow; say so in 9.8 or 10.1.' },
    { label: 'How far it got: 36 of 240', ok: /\b36\b/.test(stop) && /\b240\b/.test(stop), why: 'Say how many were enrolled against the plan (36 of 240).' },
    need(p, 'Randomised, by group', '10.1', 'T4', 'Randomised', G205, 'n'),
    need(p, 'Stopped by the sponsor, by group', '10.1', 'T4', 'Study terminated by sponsor', G205, 'n'),
    { label: 'Efficacy kept brief', ok: !!eff.trim() && sentences(eff).length <= 6, why: `An abbreviated report summarises efficacy: ${sentences(eff).length} sentences in 11.4.1 (at most 6).` },
    need(p, 'The difference and its CI', '11.4.1', 'T3', 'Difference from clobetasol, % (95% CI)', ['Lumiravostat 25 mg'], 'lcl'),
    { label: 'Non-inferiority not claimed', ok: !!eff.trim() && /non-?inferior/i.test(eff) && /\b(not|could not|cannot)\b/i.test(eff) && !claims.length, why: claims.length ? claims.map((c) => `“${c.sentence.slice(0, 60)}…”: ${c.kind}`).join(' ') : 'The lower limit (-24.5) is below the margin (-15): say that non-inferiority was not shown.' },
    need(p, 'Any TEAE, by group', '12.2.1', 'T2', 'Participants with at least one TEAE', G205, 'n'),
    need(p, 'TEAEs leading to discontinuation, by group', '12.2.1', 'T2', 'Participants with a TEAE leading to discontinuation', G205, 'n'),
    { label: 'Events that differed between groups', ok: ['nausea', 'alt increased', 'skin thinning'].every((t) => S('12.2.2').toLowerCase().includes(t)), why: 'Nausea and ALT increased (lumiravostat), skin thinning (clobetasol) [T14.3.1].' },
    { label: 'The serious adverse event in full', ok: /appendicitis/i.test(S('12.3.1')) && /lumiravostat/i.test(S('12.3.1')) && /not related|unrelated/i.test(S('12.3.1')) && /\bday\s*41\b/i.test(S('12.3.1')), why: 'Appendicitis, lumiravostat 25 mg, Day 41, severe, not related (Listing 16.2.7): the safety description stays complete in an abbreviated report.' },
    { label: 'Safety conclusions written', ok: !!S('12.6').trim() && !PLACEHOLDER.test(S('12.6')), why: 'A short 12.6.' },
    { label: 'The discussion states the limitation', ok: /stopp|terminat/i.test(S('13')) && /limit|small|early/i.test(S('13')), why: 'Section 13: the study stopped early, so it cannot answer its question.' },
    { label: 'No checker errors', ok: !errs.length, why: errs.length ? `${errs.length}: ${errs.slice(0, 3).map((x) => `${x.section} “${x.text}”`).join(', ')}.` : 'Clean.' },
  ]
}

// ---------- CS13 ----------
export interface SeedComment { section: string; author: string; role: string; text: string; quote?: string; /** What the writer should do. */ expect: 'change' | 'no change' }
export const CS13_COMMENTS: SeedComment[] = [
  { section: '12.2.2', author: 'S. Okafor', role: 'Safety physician', text: '“Light-headedness was more frequent” — say by how much on each dose, and whether any led to stopping treatment. As written it reads as a judgement.', expect: 'no change' },
  { section: '12.6', author: 'S. Okafor', role: 'Safety physician', quote: 'the larger fall in blood pressure on GLV-12 10 mg [T14.3.6] may explain it', text: 'This is a causal suggestion from a table of means. Move it to section 13 or remove it: 12.6 reports.', expect: 'change' },
  { section: '11.4.2', author: 'B. Lindqvist', role: 'Biostatistician', quote: 'so no further adjustment for multiplicity was needed', text: 'Say what the sequence protected: the familywise type I error at two-sided 0.05.', expect: 'change' },
  { section: '11.4.1', author: 'B. Lindqvist', role: 'Biostatistician', text: 'Shouldn’t the MMRM be reported first? Its table says “primary estimand”.', expect: 'no change' },
  { section: '2', author: 'R. Menon', role: 'Regulatory affairs', quote: 'The main risk seen was light-headedness; the study was too small to describe uncommon risks.', text: 'Name the serious adverse events by group in the synopsis, as the body does.', expect: 'change' },
]
export function startCs13(p: Project, d?: PatientData) {
  for (const c of CS13_COMMENTS) addComment(p, { section: c.section, author: c.author, role: c.role, text: c.text, quote: c.quote })
  if (d) {
    const cs = candidates(d.sdtm)
    p.narratives = Object.fromEntries(cs.map((c) => [c.key, { text: draft(d.sdtm, c, d.safety.cases.find((x) => x.usubjid === c.usubjid)), queries: [], updatedUtc: p.createdUtc }]))
    const clean = cs.filter((c) => !qcErrors(narrativeQc(d.sdtm, c, p.narratives![c.key].text, d.safety, ['Placebo', 'GLV-12 5 mg', 'GLV-12 10 mg'])).length).length
    p.coverage = { needed: cs.length, written: cs.length, clean, utc: p.createdUtc }
  }
  p.stage = 'review'; snapshot(p, 'In review: version sent to reviewers')
}
function scoreCs13(p: Project): Item[] {
  const sig = (m: string) => p.signatures.find((s) => s.version === p.version && s.meaning === m)
  const a = sig(AUTHOR), b = sig(APPROVER), ci = sig(CI), cm = p.comments ?? []
  return [
    ...CS13_COMMENTS.map((s) => {
      const c = cm.find((x) => x.text === s.text), r = c?.resolved, text = p.sections[s.section]?.text ?? ''
      const ok = !!r && (s.expect === 'change' ? r.how === 'changed' && (!s.quote || !text.includes(s.quote)) : r.how === 'no change' && r.note.trim().length > 20)
      return { label: `${s.section}: ${s.role}’s comment`, ok, why: !r ? 'Not resolved.' : s.expect === 'change' ? 'The reviewer is right: change the text, then resolve it as changed.' : s.section === '11.4.1' ? 'The reviewer is wrong: the SAP makes the ANCOVA primary and the MMRM supplementary. Resolve it with no change and say why.' : 'The numbers are in the same paragraph and in Table 14.3.1: resolve with no change, and point to them.' }
    }),
    { label: 'No comment left open', ok: !openComments(p).length, why: `${openComments(p).length} open.` },
    { label: 'Versions kept at each stage', ok: (p.snapshots ?? []).length >= 2, why: 'Each move between stages keeps a version; compare them in Review.' },
    { label: 'QC checklist passed', ok: qcStatus(p).every((q) => q.done), why: `${qcStatus(p).filter((q) => !q.done).map((q) => q.id).join(', ') || 'all done'}.` },
    { label: 'Author, approver and coordinating investigator signed', ok: !!a && !!b && !!ci && a.name.toLowerCase() !== b.name.toLowerCase(), why: 'Three signatures for this version, each with its meaning; the approver is not the author.' },
    { label: 'Approved', ok: p.stage === 'approved', why: `The report is ${p.stage}.` },
  ]
}

// ---------- CS14 ----------
function scoreCs14(p: Project): Item[] { return indiaItems(p).map((i) => ({ label: i.heading ? `Table 6, ${i.heading}: ${i.label}` : i.label, ok: i.ok, why: i.why })) }

export function startPhase3(id: string, d?: PatientData): Project | null {
  if (id === 'CS9') { const p = newProject('Mission CS9: Methods from the protocol', 'GLV-12-301', 'full', 'mission'); prep(p, 'GLV-12-301'); startCs9(p); return p }
  if (id === 'CS10') { const p = newProject('Mission CS10: Discussion and benefit–risk', 'HRP-301', 'full', 'mission'); prep(p, 'HRP-301'); p.sections['13'].text = CS10_DRAFT; return p }
  if (id === 'CS11') { const p = newProject('Mission CS11: Abbreviated report for HRP-205', 'HRP-205', 'full', 'mission'); prep(p, 'HRP-205'); return p }
  if (id === 'CS13') { const p = completeProject('Mission CS13: Take the report through review'); p.kind = 'mission'; startCs13(p, d); return p }
  if (id === 'CS14') { const p = completeProject('Mission CS14: The India Table 6 version'); p.kind = 'mission'; p.stage = 'review'; return p }
  return null
}
function prep(p: Project, study: string) { const slots = defaultSlots(BUNDLED[study]); for (const [s, st] of Object.entries(p.sections)) st.slots = slots[s] ?? []; p.stage = 'draft' }
export function scorePhase3(p: Project): Item[] | null {
  const id = p.mission!.id
  return id === 'CS9' ? scoreCs9(p) : id === 'CS10' ? scoreCs10(p) : id === 'CS11' ? scoreCs11(p) : id === 'CS13' ? scoreCs13(p) : id === 'CS14' ? scoreCs14(p) : null
}
