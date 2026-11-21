// The results text helper: a sentence skeleton for one row of a table, with every value written
// as the table shows it, the group named after it and an explicit table reference. The writer
// then turns it into prose; the checker still ties each number back to its cell.
import type { Output } from './types'
import { tokens, type Tok } from './checker'

export interface RowRef { out: string; row: string; context: string }
export function rowsOf(o: Output): RowRef[] {
  const seen = new Set<string>(), out: RowRef[] = []
  for (const t of tokens([o])) { const k = `${t.context}|${t.row}`; if (!seen.has(k)) { seen.add(k); out.push({ out: o.id, row: t.row, context: t.context }) } }
  return out
}

function part(ts: Tok[]): string {
  const k = ts.map((t) => t.kind).join(','), v = (t: Tok) => `${t.lt ? '<' : ''}${t.raw}`
  if (k === 'n,pct') return `${v(ts[0])} (${v(ts[1])}%)`
  if (k === 'mean,sd') return `${v(ts[0])} (SD ${v(ts[1])})`
  if (k === 'est,se') return `${v(ts[0])} (SE ${v(ts[1])})`
  if (k === 'est,lcl,ucl') return `${v(ts[0])} (95% CI ${v(ts[1])} to ${v(ts[2])})`
  if (k === 'min,max') return `${v(ts[0])} to ${v(ts[1])}`
  if (k === 'p') return `p${ts[0].lt ? '<' : '='}${ts[0].raw}`
  return ts.map(v).join(', ')
}

/** “Context, row”: value with group; value with group [T14.x.y]. */
export function skeleton(o: Output, r: RowRef): string {
  const ts = tokens([o]).filter((t) => t.row === r.row && t.context === r.context)
  const cols = [...new Set(ts.map((t) => `${t.group}\u0000${t.col}`))].map((k) => k.split('\u0000'))
  const parts = cols.map(([g, c]) => { const x = ts.filter((t) => t.group === g && t.col === c); return `${c ? `“${c}” ` : ''}${part(x)} ${x[0].kind === 'p' ? 'for' : 'with'} ${g === 'Total' ? 'all participants' : g}` })
  const table = ts[0]?.table
  return `“${r.context ? `${r.context}, ` : ''}${r.row}”: ${parts.join('; ')}${table ? ` [T${table}]` : ''}.`
}
