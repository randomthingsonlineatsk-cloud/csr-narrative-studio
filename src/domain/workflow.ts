// The report's life: shell → draft → review → final → approved, each step behind a gate that
// mirrors how a CSR moves in practice. The QC checklist follows common medical-writing QC
// practice; items the app can measure are checked for the writer, the rest are ticked by hand.
import { sectionsFor, isGroup, sectionById, type E3Section } from './e3'
import { checkText, errors, issues, sentences, type Finding } from './checker'
import { dataOf, PLACEHOLDER } from './project'
import { outputsOf } from './study'
import type { Project, Stage } from './types'

export const sectionsOf = (p: Project) => sectionsFor(p.reportType).filter((s) => p.sections[s.id])
export const needsText = (s: E3Section) => s.written && !isGroup(s)
export const feedsOutputs = (s: E3Section) => s.feeds.includes('tlf') && !isGroup(s) && s.written

export function findingsOf(p: Project): Finding[] {
  const d = dataOf(p), outs = outputsOf(d)
  return sectionsOf(p).flatMap((s) => { const st = p.sections[s.id]; return st.na || !needsText(s) ? [] : checkText(s.id, st.text.replace(new RegExp(PLACEHOLDER.source, 'g'), (m) => ' '.repeat(m.length)), outs, st.slots, d.groups, p.rounding) })
}

export interface Gate { ok: boolean; problems: string[] }
export function gate(p: Project, to: Stage): Gate {
  const problems: string[] = [], secs = sectionsOf(p)
  if (to === 'draft') {
    for (const s of secs) { const st = p.sections[s.id]; if (feedsOutputs(s) && !st.na && !st.slots.length && !(st.requests ?? []).length) problems.push(`${s.id} ${s.heading}: attach its outputs, request a missing one, or mark it not applicable with a reason.`) }
    for (const s of secs) { const st = p.sections[s.id]; if (st.na !== undefined && !st.na.trim()) problems.push(`${s.id}: give the reason it is not applicable.`) }
  }
  if (to === 'review') {
    for (const s of secs) { const st = p.sections[s.id]; if (needsText(s) && !st.na && (PLACEHOLDER.test(st.text) || !st.text.trim())) problems.push(`${s.id} ${s.heading}: still to be written.`) }
    const e = errors(findingsOf(p)); if (e.length) problems.push(`The checker finds ${e.length} error${e.length === 1 ? '' : 's'} in the text.`)
  }
  if (to === 'final') {
    const q = qcStatus(p); for (const i of q.filter((x) => !x.done)) problems.push(`QC: ${i.text}`)
    if (!p.signatures.some((s) => s.version === p.version && s.meaning === AUTHOR)) problems.push('The author signs the QC-checked report.')
  }
  if (to === 'approved') {
    const a = p.signatures.find((s) => s.version === p.version && s.meaning === AUTHOR), b = p.signatures.find((s) => s.version === p.version && s.meaning === APPROVER)
    if (!b) problems.push('An approver signs the final report.')
    else if (a && a.name.toLowerCase() === b.name.toLowerCase()) problems.push('The approver must be someone other than the author.')
  }
  return { ok: !problems.length, problems }
}
export const AUTHOR = 'Author: the report is complete, QC findings are resolved, and the text agrees with the tables.'
export const APPROVER = 'Approval: I approve this clinical study report version for submission.'
export const nextStage = (s: Stage): Stage | null => ({ shell: 'draft', draft: 'review', review: 'final', final: 'approved', approved: null } as const)[s]

export interface QcItem { id: string; text: string; auto?: (p: Project) => { ok: boolean; why: string } }
const numbersIn = (t: string) => new Set(t.match(/[-−]?\d+\.\d+/g) ?? [])
export const QC_ITEMS: QcItem[] = [
  { id: 'numbers', text: 'Every number in the text matches its table, listing or figure.', auto: (p) => { const e = errors(findingsOf(p)); return { ok: !e.length, why: e.length ? `${e.length} checker error${e.length === 1 ? '' : 's'}.` : 'The checker finds no errors.' } } },
  { id: 'rounding', text: 'Rounding and decimals match the tables and the SAP.', auto: (p) => { const w = issues(findingsOf(p)).filter((f) => f.status === 'rounding' || f.status === 'p-format'); return { ok: !w.length, why: w.length ? `${w.length} rounding or p-value warning${w.length === 1 ? '' : 's'}.` : 'No rounding warnings.' } } },
  { id: 'synopsis', text: 'Every number in the synopsis also appears in the body of the report.', auto: (p) => {
    const syn = p.sections['2']?.text ?? '', body = sectionsOf(p).filter((s) => !['1', '2'].includes(s.id)).map((s) => p.sections[s.id].text).join(' ')
    const missing = [...numbersIn(syn)].filter((n) => !numbersIn(body).has(n)); return { ok: !missing.length, why: missing.length ? `Not in the body: ${missing.slice(0, 6).join(', ')}.` : 'The synopsis numbers are all in the body.' } } },
  { id: 'abbrev', text: 'Abbreviations are spelled out at first use and listed in section 4.', auto: (p) => {
    const seen = new Set<string>(), bad: string[] = []
    for (const s of sectionsOf(p)) for (const m of (p.sections[s.id].text ?? '').matchAll(/\b([A-Z][A-Z0-9]{1,6})\b(?!\))/g)) {
      const a = m[1]; if (seen.has(a) || /^(?:GLV|HRP|SD|SE|CI|ICH|II|III|IV)$/.test(a)) continue
      seen.add(a); if (!new RegExp(`\\(${a}s?\\)`).test(p.sections[s.id].text.slice(0, m.index! + a.length + 3)) && !(p.sections['4']?.text ?? '').includes(a)) bad.push(a)
    }
    return { ok: !bad.length, why: bad.length ? `Not spelled out at first use: ${bad.slice(0, 6).join(', ')}.` : 'No undefined abbreviations found.' } } },
  { id: 'refs', text: 'Table, listing and figure references are correct and cited in order.', auto: (p) => {
    const refs = sectionsOf(p).flatMap((s) => [...(p.sections[s.id].text.matchAll(/\[T?(\d+(?:\.\d+)+)\]|(?:Table|Listing|Figure)\s+(\d+(?:\.\d+)+)/g))].map((m) => m[1] ?? m[2]))
    const known = new Set(dataOf(p).outputs.map((o) => /(\d+(?:\.\d+)+)/.exec(o.title)?.[1]).filter(Boolean))
    const unknown = [...new Set(refs.filter((r) => !known.has(r)))]; return { ok: !unknown.length, why: unknown.length ? `No such output: ${unknown.join(', ')}.` : 'Every reference names an existing output.' } } },
  { id: 'narratives', text: 'Every patient who needs a narrative has one, and each passes narrative QC (12.3.2).', auto: (p) => { const c = p.coverage; if (!c) return { ok: false, why: 'Open Narratives to measure the coverage.' }; return { ok: c.needed > 0 && c.clean === c.needed, why: `${c.clean} of ${c.needed} narratives pass QC; ${c.written} written.` } } },
  { id: 'primary', text: 'The primary analysis comes first, as specified in the SAP, with comparisons in the multiplicity order.' },
  { id: 'sets', text: 'Each result names its analysis set, and the numbers of participants agree across sections.' },
  { id: 'interpret', text: 'Results sections report; interpretation stays in the conclusions (11.4.7, 12.6, 13).' },
  { id: 'terms', text: 'Group names, product names and terms are used the same way throughout.' },
  { id: 'e3', text: 'Headings and numbering follow ICH E3; sections not applicable say why.' },
]
export const qcStatus = (p: Project) => QC_ITEMS.map((i) => { const a = i.auto?.(p); return { ...i, done: a ? a.ok : !!p.qc[i.id], why: a?.why } })

/** Sentences per section, for the QC record. */
export const sentenceCount = (t: string) => sentences(t).length
