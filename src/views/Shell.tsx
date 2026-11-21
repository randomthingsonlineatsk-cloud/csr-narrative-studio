// The report shell: every E3 section the report type keeps, with the outputs that feed it,
// outputs requested from programming, and sections marked not applicable with a reason.
import { useState } from 'react'
import { useStore } from '../state'
import { dataOf, defaultSlots } from '../domain/project'
import { sectionsOf, feedsOutputs } from '../domain/workflow'
import { REQUESTABLE, CS1_KEY } from '../domain/missions'
import { tableNumber } from '../domain/e3'
import { isLocked } from './Stage'
import OutputView from './OutputView'
import { Btn, Modal, Panel, Pill, inputCls } from './ui'

export default function Shell() {
  const { p, act } = useStore()
  const [show, setShow] = useState('')
  const d = dataOf(p!), outs = d.outputs.filter((o) => o.kind !== 'dataset'), lock = isLocked(p!.stage)
  const mission = p!.mission?.id === 'CS1', reveal = mission && p!.mission?.submittedUtc
  const have = new Set(outs.map((o) => tableNumber(o.title)))
  return (
    <div className="space-y-4">
      <Panel title="Shell and outputs" sub="Attach the outputs that feed each section. If an output a section needs does not exist yet, request it by its number. Mark a section not applicable only with a reason; E3 Q&A (R1) allows it when the content does not apply."
        right={!mission && !lock ? <Btn tone="grey" onClick={() => act((x) => { const s = defaultSlots(dataOf(x)); for (const [id, st] of Object.entries(x.sections)) if (!st.slots.length) st.slots = s[id] ?? [] })}>Attach the usual outputs</Btn> : undefined}>
        <ul className="divide-y divide-lab-line/60">{sectionsOf(p!).map((s) => {
          const st = p!.sections[s.id], key = reveal ? CS1_KEY[s.id] : undefined
          return <li key={s.id} className="py-2 space-y-1" style={{ paddingLeft: `${(s.level - 1) * 0.75}rem` }}>
            <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-xs w-12 shrink-0">{s.id}</span><span className="flex-1 min-w-[10rem]">{s.heading}</span>
              {s.feeds.map((f) => <Pill key={f}>{f}</Pill>)}
              {s.optional && <label className="text-xs flex items-center gap-1"><input type="checkbox" disabled={lock} checked={st.na !== undefined} onChange={(e) => act((x) => { x.sections[s.id].na = e.target.checked ? '' : undefined })} />not applicable</label>}
            </div>
            {st.na !== undefined && <input aria-label={`Reason ${s.id} is not applicable`} readOnly={lock} className={`${inputCls} text-xs`} value={st.na} placeholder="Why it does not apply to this study" onChange={(e) => act((x) => { x.sections[s.id].na = e.target.value })} />}
            {feedsOutputs(s) && st.na === undefined && <div className="flex flex-wrap gap-1 text-xs pl-14">
              {outs.map((o) => { const on = st.slots.includes(o.id); return <span key={o.id} className="inline-flex"><button disabled={lock} aria-pressed={on} onClick={() => act((x) => { const sl = x.sections[s.id].slots; x.sections[s.id].slots = on ? sl.filter((y) => y !== o.id) : [...sl, o.id] })} className={`rounded-l border px-1.5 py-0.5 font-mono ${on ? 'border-lab-fda text-lab-fda bg-lab-fda-soft' : 'border-lab-line text-lab-text-muted'}`} title={o.title}>{tableNumber(o.title) || o.id}</button><button aria-label={`View ${o.title}`} className="rounded-r border border-l-0 border-lab-line px-1 text-lab-text-muted" onClick={() => setShow(o.id)}>▸</button></span> })}
              <select aria-label={`Request an output for ${s.id}`} disabled={lock} className="rounded border border-lab-line bg-lab-panel-strong px-1" value="" onChange={(e) => { const v = e.target.value; if (v) act((x) => { const r = x.sections[s.id].requests ?? []; if (!r.includes(v)) x.sections[s.id].requests = [...r, v] }) }}>
                <option value="">Request a missing output…</option>{REQUESTABLE.filter((r) => !have.has(r.id)).map((r) => <option key={r.id} value={r.id}>{r.id} {r.title}</option>)}</select>
              {(st.requests ?? []).map((r) => <Pill key={r} tone="amber">{`requested ${r}`}{!lock && <button aria-label={`Withdraw request ${r}`} onClick={() => act((x) => { x.sections[s.id].requests = (x.sections[s.id].requests ?? []).filter((y) => y !== r) })}>✕</button>}</Pill>)}
            </div>}
            {key && <p className="text-[11px] pl-14 text-lab-ema">Reference: {key.why}</p>}
          </li> })}</ul>
      </Panel>
      {show && (() => { const o = d.outputs.find((x) => x.id === show)!; return <Modal wide title={o.title} onClose={() => setShow('')}><OutputView o={o} /></Modal> })()}
    </div>
  )
}
