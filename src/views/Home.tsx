// Home: the reports in this browser, new reports, the worked example, missions and file import.
import { useRef, useState } from 'react'
import { useStore } from '../state'
import { newProject, exampleProject, readProjectFile, projectFile, STAGE_LABEL } from '../domain/project'
import { MISSIONS, startMission } from '../domain/missions'
import { loadPatientData } from '../domain/sdtm'
import { STUDY_IDS, protocolOf } from '../domain/study'
import { download } from '../domain/store'
import type { ReportType } from '../domain/e3'
import { Btn, Panel, Pill, Select, Table, fmtUtc, inputCls } from './ui'

const TYPES: { value: ReportType; label: string }[] = [{ value: 'full', label: 'Full report (ICH E3)' }, { value: 'abbreviated', label: 'Abbreviated report' }, { value: 'synopsis', label: 'Synopsis only' }]
export default function Home({ onOpen }: { onOpen: () => void }) {
  const { projects, open, remove, progress, setError } = useStore()
  const [del, setDel] = useState('')
  const [study, setStudy] = useState<string>('GLV-12-301'), [type, setType] = useState<ReportType>('full'), [name, setName] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const go = (p: Parameters<typeof open>[0]) => { open(p); onOpen() }
  return (
    <div className="space-y-4">
      <Panel title="CSR & Narrative Studio" sub="Write a clinical study report section by section to ICH E3, from the study’s tables, listings and figures. A checker ties every number in your text to its cell. Fictional studies; training only.">
        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-3 gap-3">
          <div className="rounded border border-lab-line p-3 space-y-2">
            <h3 className="text-sm font-semibold">Start a report</h3>
            <label className="block text-xs text-lab-text-muted">Study<Select aria-label="Study" value={study} onChange={(e) => setStudy(e.target.value)} options={STUDY_IDS.map((s) => ({ value: s, label: `${s}: ${protocolOf(s).title.acronym || protocolOf(s).title.short || s}` }))} /></label>
            <label className="block text-xs text-lab-text-muted">Report type<Select aria-label="Report type" value={type} onChange={(e) => setType(e.target.value as ReportType)} options={TYPES} /></label>
            <label className="block text-xs text-lab-text-muted">Name<input aria-label="Report name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${study} clinical study report`} /></label>
            <Btn onClick={() => go(newProject(name.trim() || `${study} clinical study report`, study, type))}>Create the shell</Btn>
          </div>
          <div className="rounded border border-lab-line p-3 space-y-2">
            <h3 className="text-sm font-semibold">Worked example</h3>
            <p className="text-xs text-lab-text-muted">GLV-12-301 with the study patients, efficacy and safety results written and every output attached. Open it to see what a finished section looks like, or to try the checker.</p>
            <Btn tone="grey" onClick={() => go(exampleProject())}>Open the worked example</Btn>
          </div>
          <div className="rounded border border-lab-line p-3 space-y-2">
            <h3 className="text-sm font-semibold">Open a project file</h3>
            <p className="text-xs text-lab-text-muted">A .json file exported from this app (by you or a classmate).</p>
            <input ref={file} type="file" accept=".json,application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { go(readProjectFile(await f.text())) } catch (x) { setError((x as Error).message) } }} />
            <Btn tone="grey" onClick={() => file.current?.click()}>Choose a file</Btn>
          </div>
        </div>
      </Panel>
      <Panel title="Missions" sub="Scored tasks on the worked studies. Your best score is kept in this browser.">
        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 xl:grid-cols-3 gap-3">{MISSIONS.map((m) => { const best = progress.missions[m.id]; return (
          <div key={m.id} className="rounded border border-lab-line p-3 space-y-1 flex flex-col">
            <div className="flex flex-wrap items-center gap-2"><Pill tone="purple">{m.id}</Pill>{m.core && <Pill tone="blue">core</Pill>}<Pill>{m.study}</Pill>{best && <Pill tone={best.score >= 80 ? 'green' : 'amber'}>{`best ${best.score}`}</Pill>}</div>
            <h3 className="text-sm font-semibold">{m.title}</h3>
            <p className="text-xs text-lab-text-muted flex-1">{m.brief}</p>
            <div><Btn onClick={async () => { try { go(startMission(m.id, m.narratives ? await loadPatientData(m.study) : undefined)) } catch (x) { setError((x as Error).message) } }}>Start</Btn></div>
          </div>) })}</div>
      </Panel>
      <Panel title="Your reports" sub="Saved in this browser. Export a file to keep a copy or move it to another device.">
        <Table head={['Report', 'Study', 'Stage', 'Version', 'Updated', '']} empty="No reports yet." rows={projects.map((p) => [
          <button className="text-left underline" onClick={() => go(p)}>{p.name}</button>, p.study, <Pill tone={p.stage === 'approved' ? 'green' : p.stage === 'final' ? 'blue' : 'grey'}>{p.mission ? `mission ${p.mission.id}` : STAGE_LABEL[p.stage]}</Pill>, p.version, fmtUtc(p.updatedUtc),
          <span className="flex gap-2"><button className="underline text-xs" onClick={() => download(`${p.name.replace(/[^\w-]+/g, '-')}.json`, projectFile(p))}>export</button>{del === p.id ? <><button className="underline text-xs text-lab-red" onClick={() => { remove(p.id); setDel('') }}>confirm delete</button><button className="underline text-xs" onClick={() => setDel('')}>keep</button></> : <button className="underline text-xs text-lab-red" onClick={() => setDel(p.id)}>delete</button>}</span>])} />
      </Panel>
    </div>
  )
}
