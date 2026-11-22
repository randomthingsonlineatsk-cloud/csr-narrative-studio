// Timed drills for the Learn page, from the bundled studies' own tables:
//   - one sentence from one table row: the learner writes it, the checker marks it;
//   - spot the error: a results sentence with one planted error (a wrong value, a percentage that
//     does not follow from n/N, or two groups' values swapped); the learner picks the wrong number.
import { BUNDLED, outputsOf } from './study'
import { tokens, checkText, errors } from './checker'
import { tableNumber } from './e3'
import type { Output } from './types'

export const ROUNDS = 5
export interface Cellv { group: string; n: string; pct: string | null; N: number | null }
export interface DrillRow { study: string; out: Output; table: string; row: string; context: string; cells: Cellv[] }

function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

/** Rows that give a count and a percentage for every treatment group (not the total). */
export function drillRows(): DrillRow[] {
  const out: DrillRow[] = []
  for (const [study, d] of Object.entries(BUNDLED)) for (const o of outputsOf(d).filter((x) => x.kind === 'ard' && x.display)) {
    const ts = tokens([o]).filter((t) => t.group && t.group !== 'Total' && (t.kind === 'n' || t.kind === 'pct'))
    const keys = [...new Set(ts.map((t) => `${t.context}\u0000${t.row}`))]
    for (const k of keys) {
      const [context, row] = k.split('\u0000'), here = ts.filter((t) => t.context === context && t.row === row)
      const cells = d.groups.map((g) => { const n = here.find((t) => t.group === g && t.kind === 'n'), p = here.find((t) => t.group === g && t.kind === 'pct'); return n && p ? { group: g, n: n.raw, pct: p.raw, N: Math.round(n.value / (p.value / 100)) || null } : null })
      if (cells.every(Boolean) && cells.some((c) => Number(c!.n) > 0) && !/^n$/i.test(row) && !/\d/.test(row + context)) out.push({ study, out: o, table: tableNumber(o.title), row, context, cells: cells as Cellv[] })
    }
  }
  return out
}
export function pick(seed: number, k = ROUNDS): DrillRow[] {
  const all = drillRows(), r = rng(seed), out: DrillRow[] = [], used = new Set<number>()
  while (out.length < Math.min(k, all.length)) { const i = Math.floor(r() * all.length); if (!used.has(i)) { used.add(i); out.push(all[i]) } }
  return out
}
const subject = (d: DrillRow) => { const c = d.context.replace(/,?\s*n \(%\)/i, '').trim(); return `${c ? `${c}: ` : ''}${d.row}` }

/** Drill 1: does the learner's sentence give every group's n and % correctly, tied to the table? */
export function markSentence(d: DrillRow, text: string): { ok: boolean; missing: string[]; errors: string[] } {
  const f = checkText('drill', text, [d.out], [d.out.id], BUNDLED[d.study].groups, { pct: 1, mean: 2, p: 3 })
  const ok = f.filter((x) => x.status === 'ok' && x.tie)
  const missing = d.cells.flatMap((c) => [[c.n, 'n'], [c.pct!, '%']].filter(([v, k]) => !ok.some((x) => x.tie!.group === c.group && x.tie!.raw === v && (k === '%' ? x.tie!.kind === 'pct' : x.tie!.kind === 'n'))).map(([v, k]) => `${c.group} ${k === '%' ? `${v}%` : `n=${v}`}`))
  const e = errors(f).map((x) => `${x.text}: ${x.message}`)
  return { ok: !missing.length && !e.length, missing, errors: e }
}
export const modelSentence = (d: DrillRow) => `${subject(d)}: ${d.cells.map((c) => `${c.n} (${c.pct}%) participants on ${c.group}`).join(', ')} [T${d.table}].`

export type Planted = 'value' | 'pct' | 'swap'
export interface Spot { d: DrillRow; text: string; numbers: string[]; wrong: number[]; kind: Planted; why: string }
/** Drill 2: one planted error. `numbers` are the sentence's numbers in order; `wrong` the indexes
 *  that are wrong (two for a swap: either is an accepted answer). */
export function spot(d: DrillRow, seed: number): Spot {
  const r = rng(seed), cells = d.cells.map((c) => ({ ...c }))
  const kinds: Planted[] = cells.length > 1 && cells.some((c, i) => cells.some((x, j) => j !== i && x.n !== c.n)) ? ['value', 'pct', 'swap'] : ['value', 'pct']
  const kind = kinds[Math.floor(r() * kinds.length)], i = Math.floor(r() * cells.length)
  let why = '', wrong: number[] = []
  if (kind === 'value') { const real = cells[i].n; cells[i].n = String(Number(real) + 1 + Math.floor(r() * 2)); wrong = [i * 2]; why = `The table gives ${real} on ${cells[i].group}, not ${cells[i].n}; the percentage no longer follows from it either.` }
  if (kind === 'pct') { const real = cells[i].pct!; const v = Math.round((Number(real) + (Number(real) >= 50 ? -10 : 10)) * 10) / 10; cells[i].pct = v.toFixed(real.includes('.') ? real.split('.')[1].length : 0); wrong = [i * 2 + 1]; why = `${cells[i].n} of the group is ${real}%, as the table shows, not ${cells[i].pct}%.` }
  if (kind === 'swap') { const j = cells.findIndex((c, k) => k !== i && c.n !== cells[i].n); const a = { n: cells[i].n, pct: cells[i].pct }; cells[i].n = cells[j].n; cells[i].pct = cells[j].pct; cells[j].n = a.n; cells[j].pct = a.pct; wrong = [i * 2, j * 2]; why = `The values of ${cells[i].group} and ${cells[j].group} are swapped.` }
  const text = `${subject(d)}: ${cells.map((c) => `${c.n} (${c.pct}%) participants on ${c.group}`).join(', ')} [T${d.table}].`
  return { d, text, numbers: cells.flatMap((c) => [c.n, `${c.pct}%`]), wrong, kind, why }
}
