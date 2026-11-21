import { useStore } from '../state'
import { useNav } from '../nav'
import { protocolOf } from '../domain/study'
import { dataOf, setReportType } from '../domain/project'
import { sectionsOf, needsText, findingsOf } from '../domain/workflow'
import { errors, issues } from '../domain/checker'
import StagePanel, { isLocked } from './Stage'
import { Btn, Panel, Stat } from './ui'

export default function Overview() {
  const { p, act } = useStore()
  const nav = useNav()
  const pr = protocolOf(p!.study), d = dataOf(p!), secs = sectionsOf(p!)
  const written = secs.filter((s) => needsText(s) && !p!.sections[s.id].na), done = written.filter((s) => p!.sections[s.id].text.trim() && !/\[To be written/.test(p!.sections[s.id].text))
  const f = findingsOf(p!)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title={pr.title.full || p!.name} sub={`${pr.title.protocolId} · ${pr.title.phase} · ${pr.title.product}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Sections written" value={`${done.length}/${written.length}`} tone={done.length === written.length ? 'green' : 'grey'} />
            <Stat label="Numbers tied" value={f.filter((x) => x.status === 'ok').length} tone="green" />
            <Stat label="Checker errors" value={errors(f).length} tone={errors(f).length ? 'red' : 'green'} />
            <Stat label="Warnings" value={issues(f).length - errors(f).length} tone={issues(f).length - errors(f).length ? 'amber' : 'green'} />
          </div>
          <p className="text-xs text-lab-text-muted">Outputs: {d.source}. Groups: {d.groups.join(', ')}.</p>
          <div className="flex flex-wrap gap-2"><Btn onClick={() => nav.go('shell')}>Shell and outputs</Btn><Btn onClick={() => nav.go('write')}>Write</Btn><Btn tone="grey" onClick={() => nav.go('outputs')}>Tables and listings</Btn></div>
        </Panel>
        <Panel title="From the protocol" sub="Objectives, endpoints and estimands, as the Protocol Builder records them. Report them as defined: they are what section 9 describes and section 11 answers.">
          <ul className="text-sm space-y-1">{pr.objectives.map((o) => <li key={o.id}><b className="font-mono text-xs">{o.level}</b> {o.text}</li>)}</ul>
          {pr.estimands.map((e) => <details key={e.id} className="text-sm"><summary className="cursor-pointer">Estimand {e.id}: {e.summary.slice(0, 120)}{e.summary.length > 120 ? '…' : ''}</summary>
            <dl className="text-xs grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-1 mt-1"><dt className="text-lab-text-muted">Population</dt><dd>{e.population}</dd><dt className="text-lab-text-muted">Treatment</dt><dd>{e.treatment}</dd>
              <dt className="text-lab-text-muted">Intercurrent events</dt><dd>{e.intercurrentEvents.map((i) => `${i.name}: ${i.strategy}`).join('; ')}</dd><dt className="text-lab-text-muted">Estimator</dt><dd>{e.estimator}</dd><dt className="text-lab-text-muted">Sensitivity</dt><dd>{e.sensitivity}</dd></dl></details>)}
          {pr.multiplicity && <p className="text-xs"><b>Multiplicity.</b> {pr.multiplicity}</p>}
        </Panel>
        <Panel title="Kind of report" sub="ICH E3 describes a full report; a study stopped early, or one of limited importance, can have an abbreviated report (the main design, results and a complete safety description), and E3 Q&A allows a synopsis-style report where the regulator agrees. Sections the shorter report leaves out keep their text, hidden.">
          <div className="flex flex-wrap gap-2">{(['full', 'abbreviated', 'synopsis'] as const).map((t) => <Btn key={t} tone={p!.reportType === t ? 'solid' : 'grey'} disabled={isLocked(p!.stage)} aria-pressed={p!.reportType === t} onClick={() => act((x) => setReportType(x, t))}>{t === 'full' ? 'Full' : t === 'abbreviated' ? 'Abbreviated' : 'Synopsis'}</Btn>)}</div>
          <p className="text-xs text-lab-text-muted">{secs.length} sections in this {p!.reportType} report.{d.stopped ? ` This study stopped early (${d.stopped.enrolled} of ${d.stopped.planned} participants, ${d.stopped.date}): ${d.stopped.reason}` : ''}</p>
        </Panel>
        <Panel title="Rounding" sub="The decimals the SAP sets for the text. The checker flags numbers written with fewer decimals than the table.">
          <div className="flex flex-wrap gap-3 text-xs">{(['pct', 'mean', 'p'] as const).map((k) => <label key={k} className="flex items-center gap-1">{k === 'pct' ? 'Percentages' : k === 'mean' ? 'Means' : 'p-values'}<input type="number" min={0} max={4} className="w-14 rounded border border-lab-line bg-lab-panel-strong px-1" value={p!.rounding[k]} onChange={(e) => act((x) => { x.rounding[k] = Number(e.target.value) })} /></label>)}</div>
        </Panel>
      </div>
      <StagePanel />
    </div>
  )
}
