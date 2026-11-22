// The CSR timeline: milestones around database lock, checked against common windows and the
// registry deadlines.
import { useMemo } from 'react'
import { useStore } from '../state'
import { MILESTONES, daysBetween, timelineRules } from '../domain/timeline'
import { timelineFacts } from '../domain/missions/phase5'
import { usePatientData } from './usePatient'
import { Panel, ic } from './ui'

export default function ReportTimeline() {
  const { p, act, tick } = useStore()
  const d = usePatientData(p), f = timelineFacts(d, p!.study, p!.timeline?.dbl ?? '')
  const t = p!.timeline ?? {}
  const rules = useMemo(() => timelineRules(t, f), [t, f.dbl, f.pcd, f.endOfTrial, tick])
  const all = MILESTONES.map((m) => ({ ...m, date: m.id === 'dbl' ? f.dbl : t[m.id] ?? '' }))
  const dated = all.filter((m) => m.date), min = dated.reduce((a, m) => (m.date < a ? m.date : a), f.dbl), max = dated.reduce((a, m) => (m.date > a ? m.date : a), f.dbl)
  const span = Math.max(1, daysBetween(min, max))
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Report timeline" sub={`Planned around database lock (${f.dbl || 'set it below'}${p!.study === 'HRP-301' ? ', from the CDM Console’s lock' : ''}). Primary completion ${f.pcd || '…'}; end of trial ${f.endOfTrial || '…'}. The windows are common industry practice; the registry deadlines are regulation.`}>
          <ol className="space-y-2">{all.map((m) => <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_10rem] gap-2 items-center text-sm">
            <span><b>{m.label}</b><span className="block text-xs text-lab-text-muted">{m.what}{m.date && m.id !== 'dbl' ? ` · ${daysBetween(f.dbl, m.date) >= 0 ? `${daysBetween(f.dbl, m.date)} days after` : `${-daysBetween(f.dbl, m.date)} days before`} lock` : ''}</span></span>
            {m.id === 'dbl' && p!.study === 'HRP-301' ? <span className="font-mono text-sm">{f.dbl}</span> : <input type="date" aria-label={m.label} className={ic('')} value={t[m.id] ?? ''} onChange={(e) => act((x) => { x.timeline = { ...(x.timeline ?? {}), [m.id]: e.target.value } })} />}
          </li>)}</ol>
        </Panel>
        {dated.length > 1 && <Panel title="At a glance">
          <div className="relative h-6 rounded bg-lab-panel-strong" aria-hidden>{dated.map((m) => <span key={m.id} title={`${m.label}: ${m.date}`} className={`absolute top-0 h-6 w-1 ${m.id === 'dbl' ? 'bg-lab-red' : 'bg-lab-fda'}`} style={{ left: `${(100 * daysBetween(min, m.date)) / span}%` }} />)}</div>
          <p className="text-xs text-lab-text-muted">{min} → {max}; red marks database lock.</p>
        </Panel>}
      </div>
      <Panel title="Checks" className="lg:sticky lg:top-28">
        <ul className="space-y-2">{rules.map((r) => <li key={r.label} className="text-sm flex gap-2"><span aria-hidden className={r.ok ? 'text-lab-cdsco' : 'text-lab-amber'}>{r.ok ? '✓' : '✗'}</span><span>{r.label}<span className="block text-xs text-lab-text-muted">{r.why}</span></span></li>)}</ul>
      </Panel>
    </div>
  )
}
