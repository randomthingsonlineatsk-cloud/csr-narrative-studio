// Out-of-date text. When a section is written, the Studio notes a fingerprint of every output the
// section uses (its attached outputs and the tables its text names). If an output later changes, a
// new delivery from programming, a re-run, the learner's own package, the section is marked out of
// date until the writer has checked it against the new output and says so.
import { dataOf } from './project'
import { tableNumber } from './e3'
import type { Output, Project } from './types'

/** A short fingerprint of what a reader sees in an output: its title, cells and footnotes. */
export function fingerprint(o: Output): string {
  const s = JSON.stringify(o.display ? [o.display.title, o.display.head, o.display.rows.map((r) => [r.label, r.cells.map((c) => c.text)]), o.display.footnotes] : [o.title, o.frame.rows])
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** The outputs a section uses: attached ones, ones placed in the text ({{T4}}), and ones it names. */
export function usedOutputs(p: Project, sid: string): Output[] {
  const d = dataOf(p), st = p.sections[sid]; if (!st) return []
  const named = new Set([...st.text.matchAll(/\[T?(\d+(?:\.\d+)+)\]|(?:Table|Listing|Figure)\s+(\d+(?:\.\d+)+)/g)].map((m) => m[1] ?? m[2]))
  const placed = new Set([...st.text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))
  return d.outputs.filter((o) => st.slots.includes(o.id) || placed.has(o.id) || named.has(tableNumber(o.title)))
}

/** Record what the section was written against (called when its text changes, or when the
 *  writer confirms the text still holds against changed outputs). */
export function noteBasis(p: Project, sid: string) {
  const st = p.sections[sid]; if (!st) return
  st.basis = Object.fromEntries(usedOutputs(p, sid).map((o) => [tableNumber(o.title) || o.id, fingerprint(o)]))
}

export interface Stale { section: string; changed: string[]; gone: string[] }
/** Sections whose outputs changed since the text was last written or confirmed. */
export function staleSections(p: Project): Stale[] {
  const d = dataOf(p), byKey = new Map(d.outputs.map((o) => [tableNumber(o.title) || o.id, o]))
  const out: Stale[] = []
  for (const [sid, st] of Object.entries(p.sections)) {
    if (!st.basis || st.na || !st.text.trim()) continue
    const changed: string[] = [], gone: string[] = []
    for (const [k, fp] of Object.entries(st.basis)) { const o = byKey.get(k); if (!o) gone.push(k); else if (fingerprint(o) !== fp) changed.push(k) }
    if (changed.length || gone.length) out.push({ section: sid, changed, gone })
  }
  return out.sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }))
}

/** E3 says the synopsis is usually limited to three pages; about 500 words a page. */
export const SYNOPSIS_WORDS = 1500
export const wordCount = (t: string) => t.replace(/\{\{\w+\}\}/g, ' ').split(/\s+/).filter(Boolean).length
export function synopsisLength(p: Project): { words: number; pages: number; ok: boolean } {
  const w = wordCount(p.sections['2']?.text ?? '')
  return { words: w, pages: Math.round((w / 500) * 10) / 10, ok: w <= SYNOPSIS_WORDS }
}
