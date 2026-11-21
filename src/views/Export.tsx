// Export the report (Word, HTML), the project file, and bring in the learner's own outputs from
// the TLF Programming Lab.
import { useRef, useState } from 'react'
import { useStore } from '../state'
import { download } from '../domain/store'
import { projectFile } from '../domain/project'
import { readOutputsFile, type Imported } from '../domain/imports'
import { BUNDLED } from '../domain/study'
import { Btn, Panel } from './ui'
import type { HandoffMark } from '../domain/types'

const mark = (x: { version: number; stage: HandoffMark['stage'] }): HandoffMark => ({ version: x.version, stage: x.stage, utc: new Date().toISOString() })
function HandRow({ label, note, mark: m, onClick }: { label: string; note: string; mark?: HandoffMark; onClick: () => void }) {
  return <div className="flex flex-wrap items-start justify-between gap-2 border-t border-lab-line/60 pt-2"><span className="flex-1 min-w-48"><b>{label}</b><span className="block text-xs text-lab-text-muted">{note}{m ? ` Last downloaded for version ${m.version} (${m.stage}).` : ''}</span></span><Btn tone="grey" onClick={onClick}>Download</Btn></div>
}

export default function Export() {
  const { p, act, setError } = useStore()
  const file = useRef<HTMLInputElement>(null), [last, setLast] = useState<Imported | null>(null)
  const base = p!.name.replace(/[^\w-]+/g, '-')
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4 items-start">
      <Panel title="Export the report" sub="E3 numbering and headings, a table of contents, your text with in-text tables, “Not applicable” notes, and any text still to be written highlighted. Every page says it is a training document.">
        <div className="flex flex-wrap gap-2"><Btn onClick={async () => { const { reportDocx } = await import('../domain/docx'); download(`${base}.docx`, await reportDocx(p!)) }}>Word (.docx)</Btn><Btn tone="grey" onClick={async () => { const { reportHtml } = await import('../domain/docx'); download(`${base}.html`, reportHtml(p!), 'text/html') }}>HTML</Btn></div>
        <p className="text-[11px] text-lab-text-muted">In Word, update the table of contents (right-click it, then Update field) after opening.</p>
      </Panel>
      <Panel title="Hand-offs to the other apps" sub={`Report ${p!.stage === 'approved' ? 'approved' : `at the ${p!.stage} stage`}, version ${p!.version}. A report goes to the dossier and the lay summary once it is approved.`}>
        <div className="space-y-2 text-sm">
          <HandRow label="Report for the eCTD (Module 5.3.5.1)" note="For the eCTD Dossier Builder: the body, synopsis, protocol and SAP, tagged with the study." mark={p!.handoffs?.ectd} onClick={async () => { const { ectdPackage } = await import('../domain/handoff'); download(`${p!.study}-csr-ectd-5-3-5.json`, JSON.stringify(ectdPackage(p!), null, 1)); act((x) => { x.handoffs = { ...x.handoffs, ectd: mark(x) } }) }} />
          <HandRow label="Lay results for the Plain Language Lab" note="The results the lay summary needs, from this report’s tables, in the analysis results format the Lab reads." mark={p!.handoffs?.lay} onClick={async () => { const { layResults } = await import('../domain/handoff'); download(`${p!.study}-csr-lay-results.json`, JSON.stringify(layResults(p!), null, 1)); act((x) => { x.handoffs = { ...x.handoffs, lay: mark(x) } }) }} />
          <HandRow label="Hand-off for the Ostrevia journey" note="For the pharmolecule hub: whether the report uses your own tables, the checker, the narratives and the stage." mark={p!.handoffs?.journey} onClick={async () => { const { journeyHandoff } = await import('../domain/handoff'); download(`${p!.study}-csr-journey-handoff.json`, JSON.stringify(journeyHandoff(p!), null, 1)); act((x) => { x.handoffs = { ...x.handoffs, journey: mark(x) } }) }} />
        </div>
        {p!.outputsFrom && <p className="text-[11px] text-lab-text-muted">Tables from: {p!.outputsFrom.kind === 'package' ? `your analysis package${p!.outputsFrom.handoff === 'learner' ? ', built from your own locked database' : ''}` : 'a results file'}.</p>}
      </Panel>
      <Panel title="Project file" sub="Everything in this report as one file: keep a copy, move it to another device, or hand it to a reviewer.">
        <Btn tone="grey" onClick={() => download(`${base}.json`, projectFile(p!))}>Export the project file</Btn>
      </Panel>
      <Panel title="Your own outputs from the TLF Programming Lab" sub="Bring in the analysis package (.zip) or the reporting event (.json) you exported from the TLF Lab. The tables keep their layout; each cell is redrawn from your results. Then the checker ties your text to your numbers.">
        <p className="text-xs">Now using: {p!.outputsSource ?? BUNDLED[p!.study].source}</p>
        <input ref={file} type="file" accept=".zip,.json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
          try { const r = readOutputsFile(f.name, new Uint8Array(await f.arrayBuffer())); if (r.data.study !== p!.study) throw new Error(`That file is for ${r.data.study}; this report is for ${p!.study}.`); act((x) => { x.outputs = r.data; x.outputsSource = r.source; x.outputsFrom = r.provenance }); setLast(r) } catch (x) { setError((x as Error).message) } }} />
        <div className="flex flex-wrap gap-2"><Btn disabled={!!p!.mission} onClick={() => file.current?.click()}>Choose a file</Btn>{p!.outputs && <Btn tone="grey" onClick={() => act((x) => { x.outputs = undefined; x.outputsSource = undefined; x.outputsFrom = undefined })}>Back to the reference outputs</Btn>}</div>
        {p!.mission && <p className="text-[11px] text-lab-text-muted">Missions are scored on the reference outputs.</p>}
        {last && <p className="text-xs">{last.changed.length ? `Your results differ from the reference in ${last.changed.join(', ')}.` : 'Your results match the reference outputs.'}{last.missing.length ? ` Not in your file (kept from the reference): ${last.missing.join(', ')}.` : ''}</p>}
      </Panel>
    </div>
  )
}
