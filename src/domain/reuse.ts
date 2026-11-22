// Structured content reuse. Companies write some text once, have it approved, and reuse it word for
// word wherever it belongs: the design statement, the population, the primary result. Here a block
// keeps every version; only an approved version can be placed in the report, and when a block is
// approved again, every section still holding an older approved version is flagged until it is
// brought up to date. The same blocks feed the results posting.
import type { Project } from './types'

export interface BlockVersion { text: string; utc: string; approvedBy?: string; approvedUtc?: string }
export interface Block { id: string; title: string; versions: BlockVersion[] }
export interface Usage { block: string; section: string; version: number; current: boolean }

const now = () => new Date().toISOString()
export const latest = (b: Block) => b.versions[b.versions.length - 1]
export const approvedIndex = (b: Block) => { for (let i = b.versions.length - 1; i >= 0; i--) if (b.versions[i].approvedUtc) return i; return -1 }
export const approvedText = (b: Block) => { const i = approvedIndex(b); return i < 0 ? null : b.versions[i].text }

export function addBlock(p: Project, title: string, text: string): Block {
  if (!title.trim() || !text.trim()) throw new Error('A block needs a title and its text.')
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'block'
  let k = id, n = 2; while ((p.blocks ?? []).some((b) => b.id === k)) k = `${id}-${n++}`
  const b: Block = { id: k, title: title.trim(), versions: [{ text: text.trim(), utc: now() }] }
  ;(p.blocks ??= []).push(b); return b
}
/** Edit: a new draft version after an approved one, or a change to the draft in progress. */
export function editBlock(p: Project, id: string, text: string) {
  const b = (p.blocks ?? []).find((x) => x.id === id); if (!b) return
  const l = latest(b); if (l.text === text.trim()) return
  if (l.approvedUtc) b.versions.push({ text: text.trim(), utc: now() }); else { l.text = text.trim(); l.utc = now() }
}
export function approveBlock(p: Project, id: string, by: string) {
  const b = (p.blocks ?? []).find((x) => x.id === id); if (!b) return
  if (!by.trim()) throw new Error('Approval needs the approver’s name.')
  const l = latest(b); if (l.approvedUtc) return
  l.approvedBy = by.trim(); l.approvedUtc = now()
}
/** Where each block's approved versions stand in the report. */
export function usages(p: Project): Usage[] {
  const out: Usage[] = []
  for (const b of p.blocks ?? []) {
    const cur = approvedIndex(b)
    for (const [sid, st] of Object.entries(p.sections)) {
      if (st.na) continue
      for (let i = b.versions.length - 1; i >= 0; i--) { const v = b.versions[i]; if (v.approvedUtc && st.text.includes(v.text)) { out.push({ block: b.id, section: sid, version: i + 1, current: i === cur }); break } }
    }
  }
  return out
}
/** Bring every section holding an older approved version up to the latest approved one. */
export function updateUsages(p: Project, id: string): number {
  const b = (p.blocks ?? []).find((x) => x.id === id), t = b && approvedText(b); if (!b || !t) return 0
  let n = 0
  for (const u of usages(p).filter((x) => x.block === id && !x.current)) { const st = p.sections[u.section]; st.text = st.text.split(b.versions[u.version - 1].text).join(t); n++ }
  return n
}
export const outdated = (p: Project) => usages(p).filter((u) => !u.current)
