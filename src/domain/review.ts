// The review cycle: comments by section with replies and a resolution, version snapshots taken
// at every stage change with a word-level diff between them (tracked changes), and the
// coordinating investigator's signature (E3 16.1.5; also the investigator's certificate of
// NDCT Rules 2019 Table 6 (l)).
import type { Project, Stage } from './types'

export interface Reply { author: string; text: string; utc: string }
export interface Comment {
  id: string; section: string; /** The words the comment is about, if any. */ quote?: string
  author: string; role: string; text: string; utc: string; replies: Reply[]
  resolved?: { by: string; how: 'changed' | 'no change' | 'withdrawn'; note: string; utc: string }
}
export interface Snapshot { version: number; stage: Stage; utc: string; label: string; sections: Record<string, string> }

export const CI = 'Coordinating investigator: I have read this report and confirm that, to the best of my knowledge, it accurately describes the conduct and results of the study.'
export const ROLES = ['Medical writer', 'Biostatistician', 'Clinical scientist', 'Safety physician', 'Regulatory affairs', 'Quality reviewer', 'Coordinating investigator'] as const

const now = () => new Date().toISOString()
const rid = () => `C-${Math.random().toString(36).slice(2, 8)}`

export function addComment(p: Project, c: Omit<Comment, 'id' | 'utc' | 'replies'>): Comment {
  if (!c.text.trim()) throw new Error('Write the comment first.')
  if (!c.author.trim()) throw new Error('Give your name, so the author knows who to ask.')
  if (!p.sections[c.section]) throw new Error(`There is no section ${c.section} in this report.`)
  const x: Comment = { ...c, id: rid(), utc: now(), replies: [] }
  ;(p.comments ??= []).push(x); return x
}
export function reply(p: Project, id: string, r: Omit<Reply, 'utc'>) {
  const c = (p.comments ?? []).find((x) => x.id === id); if (!c) throw new Error('No such comment.')
  if (c.resolved) throw new Error('This comment is resolved; reopen it to reply.')
  if (!r.text.trim() || !r.author.trim()) throw new Error('A reply needs your name and some text.')
  c.replies.push({ ...r, utc: now() })
}
/** Resolving needs a reason: what was changed, or why nothing was (a reviewer can disagree). */
export function resolve(p: Project, id: string, by: string, how: NonNullable<Comment['resolved']>['how'], note: string) {
  const c = (p.comments ?? []).find((x) => x.id === id); if (!c) throw new Error('No such comment.')
  if (!by.trim()) throw new Error('Give your name.')
  if (how === 'no change' && !note.trim()) throw new Error('Say why no change was made: the reviewer will read it.')
  if (how === 'changed' && c.quote && (p.sections[c.section]?.text ?? '').includes(c.quote) && !note.trim()) throw new Error(`The quoted words are still in ${c.section}: change them, or say what you changed elsewhere.`)
  c.resolved = { by, how, note, utc: now() }
}
export const reopen = (p: Project, id: string) => { const c = (p.comments ?? []).find((x) => x.id === id); if (c) delete c.resolved }
export const openComments = (p: Project) => (p.comments ?? []).filter((c) => !c.resolved)

/** Keep the text as it stands, labelled; called at every stage change. */
export function snapshot(p: Project, label: string) {
  ;(p.snapshots ??= []).push({ version: p.version, stage: p.stage, utc: now(), label, sections: Object.fromEntries(Object.entries(p.sections).map(([k, v]) => [k, v.na ? `[Not applicable: ${v.na}]` : v.text])) })
}

export type Op = { t: '=' | '+' | '-'; w: string }
/** Word-level differences (longest common subsequence), merged into runs. */
export function wordDiff(a: string, b: string): Op[] {
  const A = a.split(/(\s+)/).filter(Boolean), B = b.split(/(\s+)/).filter(Boolean)
  if (A.length * B.length > 4_000_000) return [{ t: '-', w: a }, { t: '+', w: b }]
  const m = A.length, n = B.length, L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1))
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out: Op[] = [], push = (t: Op['t'], w: string) => { const l = out.at(-1); if (l && l.t === t) l.w += w; else out.push({ t, w }) }
  let i = 0, j = 0
  while (i < m && j < n) { if (A[i] === B[j]) { push('=', A[i]); i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]); else push('+', B[j++]) }
  while (i < m) push('-', A[i++]); while (j < n) push('+', B[j++])
  return out
}
export interface SectionChange { section: string; ops: Op[]; added: number; removed: number }
/** What changed in each section between a snapshot and now (or another snapshot). */
export function changesSince(from: Snapshot, to: Record<string, string>): SectionChange[] {
  const ids = [...new Set([...Object.keys(from.sections), ...Object.keys(to)])]
  return ids.flatMap((s) => {
    const a = from.sections[s] ?? '', b = to[s] ?? ''; if (a === b) return []
    const ops = wordDiff(a, b), count = (t: Op['t']) => ops.filter((o) => o.t === t).reduce((k, o) => k + o.w.split(/\s+/).filter(Boolean).length, 0)
    return [{ section: s, ops, added: count('+'), removed: count('-') }]
  })
}
export const currentTexts = (p: Project) => Object.fromEntries(Object.entries(p.sections).map(([k, v]) => [k, v.na ? `[Not applicable: ${v.na}]` : v.text]))
