// One study output as the reader sees it: a table drawn from its display, a listing from its
// records, or a figure's plotted data as a table.
import type { Output } from '../domain/types'
import { Table } from './ui'

export default function OutputView({ o, max = 200 }: { o: Output; max?: number }) {
  if (o.display) { const d = o.display; return (
    <figure className="space-y-1">
      <figcaption className="text-xs font-semibold">{o.title}<span className="block font-normal text-lab-text-muted">{d.population}</span></figcaption>
      <div className="overflow-x-auto rounded border border-lab-line"><table className="w-full text-xs">
        <thead className="bg-lab-panel-strong"><tr><th className="px-2 py-1 text-left font-normal"></th>{d.head.map((h) => <th key={h} scope="col" className="px-2 py-1 text-right font-normal whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{d.rows.map((r, i) => <tr key={i} className="border-t border-lab-line/60"><th scope="row" className="px-2 py-0.5 text-left font-normal" style={{ paddingLeft: `${0.5 + (r.indent ?? 0) * 1}rem` }}>{r.label}</th>{r.cells.map((c, j) => <td key={j} className="px-2 py-0.5 text-right font-mono whitespace-nowrap">{c.text}</td>)}</tr>)}</tbody>
      </table></div>
      {d.footnotes.map((f) => <p key={f} className="text-[11px] text-lab-text-muted">{f}</p>)}
    </figure>) }
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs font-semibold">{o.title}<span className="block font-normal text-lab-text-muted">{o.kind === 'figure' ? 'The data plotted in the figure.' : `${o.frame.rows.length} record${o.frame.rows.length === 1 ? '' : 's'}.`}</span></figcaption>
      <Table head={o.frame.columns} rows={o.frame.rows.slice(0, max).map((r) => r.map((c) => c ?? ''))} />
      {o.frame.rows.length > max && <p className="text-[11px] text-lab-text-muted">First {max} of {o.frame.rows.length} rows.</p>}
    </figure>
  )
}
