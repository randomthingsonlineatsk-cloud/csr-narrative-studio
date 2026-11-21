import { useState } from 'react'
import { useStore } from '../state'
import { dataOf } from '../domain/project'
import { tableNumber } from '../domain/e3'
import OutputView from './OutputView'
import { Panel, Pill } from './ui'

export default function Outputs() {
  const { p } = useStore()
  const d = dataOf(p!), outs = d.outputs.filter((o) => o.kind !== 'dataset')
  const [id, setId] = useState(outs[0]?.id ?? '')
  const o = outs.find((x) => x.id === id)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)] gap-4 items-start">
      <nav aria-label="Outputs" className="space-y-0.5 text-xs rounded border border-lab-line p-1">{outs.map((x) => <button key={x.id} onClick={() => setId(x.id)} aria-current={x.id === id ? 'true' : undefined} className={`w-full text-left rounded px-1.5 py-1 ${x.id === id ? 'bg-lab-fda-soft text-lab-fda' : 'hover:bg-lab-panel-strong'}`}><span className="font-mono">{tableNumber(x.title) || x.id}</span> {x.title.split(':').slice(1).join(':').trim() || x.title}</button>)}</nav>
      <Panel title="Tables, listings and figures" sub={`Source: ${d.source}. Every display cell carries the keys of its analysis result, so a re-run in the TLF Programming Lab redraws the same cells.`} right={o ? <span className="flex gap-1"><Pill>{o.kind}</Pill><Pill>{o.ref}</Pill></span> : undefined}>
        {o && <OutputView o={o} />}
      </Panel>
    </div>
  )
}
