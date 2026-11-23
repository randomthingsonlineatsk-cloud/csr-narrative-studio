// SAE reconciliation as the CSR sees it, deviations from data management, and the patient data
// files: the learner's own SDTM hand-off and the CDM Console's export for the CSR.
import { useRef } from 'react'
import { useStore } from '../state'
import { readSdtmHandoff, readCdmExport, num, str } from '../domain/sdtm'
import { profile, studyDay } from '../domain/narratives'
import { usePatientData } from './usePatient'
import { Btn, Panel, Table } from './ui'

export default function Recon() {
  const { p, act, setError } = useStore()
  const d = usePatientData(p)
  const zip = useRef<HTMLInputElement>(null), cdm = useRef<HTMLInputElement>(null)
  if (!d) return <Panel title="SAE reconciliation"><p className="text-sm text-lab-text-muted">Loading the patient data…</p></Panel>
  const saes = d.sdtm.domains.AE ? d.sdtm.domains.AE.rows.map((r) => Object.fromEntries(d.sdtm.domains.AE.columns.map((c, i) => [c, r[i]]))).filter((a) => a.AESER === 'Y') : []
  const rows = saes.map((a) => {
    const pr = profile(d.sdtm, str(a.USUBJID)), sc = d.safety.cases.find((x) => x.usubjid === a.USUBJID && (studyDay(x.onset, pr.firstDose) === num(a.AESTDY) || x.term.toLowerCase() === str(a.AETERM).toLowerCase()))
    const diffs = sc ? [studyDay(sc.onset, pr.firstDose) !== num(a.AESTDY) && 'onset', sc.outcome !== str(a.AEOUT) && 'outcome', sc.causality !== str(a.AEREL) && 'causality', sc.action !== str(a.AEACN) && 'action'].filter(Boolean) as string[] : []
    const rec = d.safety.reconciliation.find((x) => x.usubjid === a.USUBJID)
    return [str(a.USUBJID), `${str(a.AEDECOD)} (Day ${num(a.AESTDY)})`, sc ? sc.caseId : <span className="text-lab-red">no case</span>, sc ? (diffs.length ? <span className="text-lab-amber">differs: {diffs.join(', ')}</span> : <span className="text-lab-cdsco">agrees</span>) : '—', rec?.status ?? '—', sc ? sc.sponsorCausality.toLowerCase() : '']
  })
  const pick = async (el: HTMLInputElement | null, fn: (f: File) => Promise<void>) => { const f = el?.files?.[0]; if (el) el.value = ''; if (!f) return; try { await fn(f) } catch (x) { setError((x as Error).message) } }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Serious adverse events: clinical and safety databases" sub={`Before the narratives are final, every SAE in the clinical database should match its case in the safety database (onset, seriousness, outcome, causality, action), or the difference should be explained. Safety data: ${d.safety.source}.`}>
          <Table head={['Participant', 'Event', 'Safety case', 'Compared here', 'Reconciliation (data management)', 'Sponsor causality']} rows={rows} empty="No serious adverse events." />
          {d.safety.lock && <p className="text-xs text-lab-text-muted">Database {d.safety.lock.status === 'hard' ? 'hard-locked' : d.safety.lock.status}{d.safety.lock.hardLockUtc ? ` on ${d.safety.lock.hardLockUtc.slice(0, 10)}` : ''}.</p>}
        </Panel>
        <Panel title="Protocol deviations (for section 10.2)" sub="From the CDM Console’s export for the CSR: deviations by category, with whether each was judged important.">
          {d.safety.deviations?.length ? <Table head={['Category', 'Important', 'Deviations', 'Participants']} rows={d.safety.deviations.map((x) => [x.category, x.important ? 'yes' : 'no', x.count, x.subjects.join(', ')])} /> : <p className="text-sm text-lab-text-muted">No deviation data for this study: the CDM Console runs HRP-301, so its export for the CSR is for that study.</p>}
        </Panel>
      </div>
      <Panel title="Patient data files" sub="The bundled data come from the SDTM Mapping Trainer and the CDM Console. Use your own instead to write narratives from data you mapped or locked yourself.">
        <p className="text-xs">SDTM: {d.sdtm.source}</p>
        <input ref={zip} type="file" accept=".zip" className="hidden" onChange={() => pick(zip.current, async (f) => { const s = readSdtmHandoff(new Uint8Array(await f.arrayBuffer()), p!.study); act((x) => { x.sdtm = s }) })} />
        <Btn tone="grey" disabled={!!p!.mission} onClick={() => zip.current?.click()}>Use my SDTM hand-off (.zip)</Btn>
        <p className="text-xs">Safety and data management: {d.safety.source}</p>
        <input ref={cdm} type="file" accept=".json" className="hidden" onChange={() => pick(cdm.current, async (f) => { const s = readCdmExport(await f.text(), p!.study); act((x) => { x.safety = s }) })} />
        <Btn tone="grey" disabled={!!p!.mission} onClick={() => cdm.current?.click()}>Use my CDM export or safety cases (.json)</Btn>
        {(p!.sdtm || p!.safety) && <Btn tone="grey" onClick={() => act((x) => { x.sdtm = undefined; x.safety = undefined })}>Back to the bundled data</Btn>}
        {p!.mission && <p className="text-[11px] text-lab-text-muted">Missions use the bundled data.</p>}
        <p className="text-[11px] text-lab-text-muted">The CDM Console’s export (Lock, after hard lock: “Export for the CSR”) exists for HRP-301 and ONK-44-302, the studies the Console runs. A safety cases file (format csr-studio/safety-cases, one E2B-shaped case per SAE) is also accepted.</p>
      </Panel>
    </div>
  )
}
