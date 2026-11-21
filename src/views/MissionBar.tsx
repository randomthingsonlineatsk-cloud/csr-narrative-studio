import { useStore } from '../state'
import { useNav } from '../nav'
import { missionById, scoreMission, scoreOf, submit, CS2_PLANTED } from '../domain/missions'
import { GLV_REFERENCE } from '../domain/reference'
import { modelNarratives } from '../domain/missions/narr'
import { usePatientData } from './usePatient'
import { Btn, Panel, Pill } from './ui'

export default function MissionBar() {
  const { p, act, record } = useStore()
  const nav = useNav()
  const r = p?.mission
  const d = usePatientData(p?.mission && missionById(p.mission.id)?.narratives ? p : null)
  if (!p || !r) return null
  const m = missionById(r.id)!, items = scoreMission(p, d), score = scoreOf(items)
  const go = () => { if (m.narratives && !d) return; act((x) => { x.mission = submit(x, d) }); record((g) => { if (score >= (g.missions[r.id]?.score ?? -1)) g.missions[r.id] = { score, utc: new Date().toISOString() } }) }
  return (
    <Panel className="mb-4 border-lab-ema/60" title={`Mission ${m.id}: ${m.title}`} sub={`${m.study}${m.core ? ' · core mission' : ''}`} right={r.submittedUtc ? <Pill tone={(r.score ?? 0) >= 80 ? 'green' : 'amber'}>{`score ${r.score}`}</Pill> : <Btn onClick={go}>Submit</Btn>}>
      <p className="text-sm">{m.brief}</p>
      <ol className="list-decimal pl-5 text-sm space-y-0.5">{m.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <div className="flex flex-wrap gap-2">{m.narratives ? <Btn tone="grey" onClick={() => nav.go('narratives')}>Open the narratives</Btn> : m.id === 'CS1' ? <Btn tone="grey" onClick={() => nav.go('shell')}>Open the shell</Btn> : m.sections.map((s) => <Btn key={s} tone="grey" onClick={() => nav.go('write', s)}>{`Write ${s}`}</Btn>)}</div>
      {r.submittedUtc ? <ul className="text-xs space-y-0.5">{items.map((d) => <li key={d.label} className={d.ok ? '' : 'text-lab-amber'}>{d.ok ? '✓' : '✗'} {d.label}{d.ok ? '' : `: ${d.why}`}</li>)}</ul>
        : <p className="text-xs text-lab-text-muted">{items.filter((d) => d.ok).length} of {items.length} checks met so far. Submit to see each one.</p>}
      {r.submittedUtc && m.id === 'CS2' && <details className="text-xs"><summary className="cursor-pointer">The 25 planted errors</summary><ol className="list-decimal pl-5 space-y-0.5 mt-1">{CS2_PLANTED.map((x) => <li key={x.n}>{x.section}: “{x.to}” should be “{x.from}”. {x.why}</li>)}</ol></details>}
      {r.submittedUtc && ['CS3', 'CS4', 'CS5'].includes(m.id) && <details className="text-xs"><summary className="cursor-pointer">A model answer</summary>{m.sections.map((s) => <p key={s} className="mt-1"><b>{s}.</b> {GLV_REFERENCE[s]}</p>)}</details>}
      {r.submittedUtc && m.narratives && d && <details className="text-xs"><summary className="cursor-pointer">Model narratives</summary>{modelNarratives(m.id, d).map(({ c, text }) => <p key={c.key} className="mt-2 whitespace-pre-wrap">{text}</p>)}</details>}
      {r.submittedUtc && <Btn tone="grey" onClick={() => act((y) => { y.mission!.submittedUtc = undefined })}>Keep working and submit again</Btn>}
    </Panel>
  )
}
