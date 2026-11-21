// The report's stage, the gate to the next one, and moving on (or reopening a final report).
import { useStore } from '../state'
import { snapshot } from '../domain/review'
import { STAGES } from '../domain/types'
import { STAGE_LABEL } from '../domain/project'
import { gate, nextStage } from '../domain/workflow'
import { Btn, Panel, Pill } from './ui'

export const isLocked = (stage: string) => stage === 'final' || stage === 'approved'
export default function StagePanel() {
  const { p, act } = useStore()
  const next = nextStage(p!.stage), g = next ? gate(p!, next) : null
  return (
    <Panel title="Report status" sub="A report moves shell → draft → review → final → approved. Each step has a gate.">
      <ol className="flex flex-wrap gap-1 text-xs" aria-label="Stages">{STAGES.map((s) => <li key={s}><Pill tone={s === p!.stage ? 'blue' : STAGES.indexOf(s) < STAGES.indexOf(p!.stage) ? 'green' : 'grey'}>{STAGE_LABEL[s]}</Pill></li>)}</ol>
      <p className="text-sm">Version {p!.version}, {STAGE_LABEL[p!.stage].toLowerCase()}.</p>
      {next && g && <>
        {g.problems.length ? <div className="text-xs"><p className="text-lab-text-muted">Before it can move to {STAGE_LABEL[next].toLowerCase()}:</p><ul className="list-disc pl-5 space-y-0.5 text-lab-amber">{g.problems.slice(0, 12).map((x) => <li key={x}>{x}</li>)}</ul>{g.problems.length > 12 && <p className="text-lab-text-muted">…and {g.problems.length - 12} more.</p>}</div> : <p className="text-xs text-lab-cdsco">Ready to move to {STAGE_LABEL[next].toLowerCase()}.</p>}
        <Btn disabled={!g.ok} onClick={() => act((x) => { x.stage = next; snapshot(x, `Moved to ${STAGE_LABEL[next].toLowerCase()}`) })}>Move to {STAGE_LABEL[next].toLowerCase()}</Btn>
      </>}
      {isLocked(p!.stage) && <div className="text-xs space-y-1"><p className="text-lab-text-muted">A final report is locked. To change it, reopen it as a new version: it goes back to draft, and the signatures stay with the version they signed.</p><Btn tone="grey" onClick={() => act((x) => { x.version += 1; x.stage = 'draft'; snapshot(x, `Reopened as version ${x.version}`) })}>Reopen as version {p!.version + 1}</Btn></div>}
    </Panel>
  )
}
