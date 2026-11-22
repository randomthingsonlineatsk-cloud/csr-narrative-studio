// CSR addenda. Once a report is approved it is not quietly edited: a correction found later goes
// out as an addendum (an erratum listing each change, “was” and “now”), and data that arrive later
// (long-term follow-up, a final analysis after an interim report) go out as an addendum with the
// new results. Each states whether the conclusions change and which other documents need the same
// change, and is signed like the report. In eCTD it is a new document beside the report in
// 5.3.5.1, with the same study tags.
import { AUTHOR, APPROVER } from './workflow'
import { protocolOf } from './study'
import type { Project, Signature } from './types'

export interface Change { section: string; was: string; now: string }
export interface Addendum { id: string; number: number; kind: '' | 'erratum' | 'additional-data'; reason: string; changes: Change[]; conclusions: '' | 'unchanged' | 'changed'; documents: string[]; signatures: Signature[]; createdUtc: string }
export const DOCUMENTS = ['Clinical Overview (2.5) and Summaries (2.7)', 'Lay summary', 'Registry results (ClinicalTrials.gov, CTIS)', 'Product information (label, SmPC)', 'Public disclosure version of the report', 'No other document']

export function newAddendum(p: Project): Addendum {
  if (p.stage !== 'approved') throw new Error('An addendum follows an approved report: approve the report first.')
  const n = (p.addenda ?? []).length + 1
  const a: Addendum = { id: `A${n}`, number: n, kind: '', reason: '', changes: [], conclusions: '', documents: [], signatures: [], createdUtc: new Date().toISOString() }
  ;(p.addenda ??= []).push(a); return a
}
/** The approved text: the last snapshot taken at approval. */
export const approvedTexts = (p: Project): Record<string, string> | null => [...(p.snapshots ?? [])].reverse().find((s) => s.stage === 'approved')?.sections ?? null

export interface AddItem { label: string; ok: boolean; why: string }
export function addendumItems(p: Project, a: Addendum): AddItem[] {
  const ap = approvedTexts(p) ?? {}, sig = (m: string) => a.signatures.find((s) => s.meaning === m)
  const bad = a.changes.filter((c) => !c.was.trim() || !(ap[c.section] ?? '').includes(c.was) || c.was === c.now)
  const unchanged = p.stage === 'approved' && Object.entries(ap).every(([k, t]) => { const st = p.sections[k]; return !st || (st.na ? `[Not applicable: ${st.na}]` : st.text) === t })
  return [
    { label: 'The approved report is left as it was', ok: unchanged, why: unchanged ? 'Unchanged since approval.' : 'The approved text has been edited: an approved report is corrected by addendum, not in place.' },
    { label: 'Kind and reason', ok: !!a.kind && a.reason.trim().length >= 30, why: 'Erratum or additional data, and why the addendum is needed (what was found, when, by whom).' },
    { label: 'Each change quotes the approved text exactly, with the correction', ok: a.changes.length > 0 && !bad.length, why: bad.length ? `Check ${bad.map((c) => c.section || '(no section)').join(', ')}: the “was” text must be copied exactly from the approved report, and the “now” text must differ.` : a.changes.length ? 'Every change is quoted.' : 'No changes listed yet.' },
    { label: 'Impact on the conclusions stated', ok: !!a.conclusions, why: 'Say whether the conclusions of the report change.' },
    { label: 'Other documents assessed', ok: a.documents.length > 0 && !(a.documents.includes('No other document') && a.documents.length > 1), why: 'Name every other document that carries the same statement, or say none does.' },
    { label: 'Signed by the author and a different approver', ok: !!sig(AUTHOR) && !!sig(APPROVER) && sig(AUTHOR)!.name.toLowerCase() !== sig(APPROVER)!.name.toLowerCase(), why: 'Author, then an approver who is someone else.' },
  ]
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
export function addendumHtml(p: Project, a: Addendum): string {
  const t = protocolOf(p.study).title
  const rows = a.changes.map((c) => `<tr><td>${esc(c.section)}</td><td>${esc(c.was)}</td><td>${esc(c.now)}</td></tr>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Addendum ${a.number} to the clinical study report ${esc(p.study)}</title><style>body{font-family:Georgia,serif;max-width:48em;margin:2em auto;padding:0 1em;line-height:1.5}table{border-collapse:collapse;font:10pt Arial,sans-serif}td,th{border:1px solid #999;padding:3px 6px;vertical-align:top;text-align:left}</style></head><body>
<h1>Addendum ${a.number} to the clinical study report</h1><p>${esc(t.full || p.study)}<br>Protocol ${esc(t.protocolId)} · report version ${p.version}</p>
<h2>Kind</h2><p>${a.kind === 'erratum' ? 'Erratum: corrections to the approved report.' : 'Additional data reported after the approved report.'}</p>
<h2>Reason</h2><p>${esc(a.reason)}</p>
<h2>Changes</h2><table><thead><tr><th>Section</th><th>Was</th><th>Now</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Impact</h2><p>The conclusions of the report ${a.conclusions === 'changed' ? 'change, as described above' : 'do not change'}. Other documents: ${esc(a.documents.join('; '))}.</p>
<h2>Signatures</h2>${a.signatures.map((s) => `<p>${esc(s.name)}, ${esc(s.role)}, ${s.utc.slice(0, 16).replace('T', ' ')} UTC: ${esc(s.meaning)}</p>`).join('')}
<p><small>eCTD: placed in 5.3.5.1 beside the report, with the same study ID and file tag (study-report-body); the report itself is not replaced. Training only; fictional study.</small></p></body></html>`
}
