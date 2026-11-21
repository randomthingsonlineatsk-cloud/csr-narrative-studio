// QC and sign-off: the checklist (measured items checked by the app), the author's and the
// approver's signatures, and the QC record.
import { useStore } from '../state'
import { qcStatus, findingsOf, AUTHOR, APPROVER } from '../domain/workflow'
import { issues, LABEL } from '../domain/checker'
import { download } from '../domain/store'
import { CI } from '../domain/review'
import StagePanel, { isLocked } from './Stage'
import { Btn, Panel, Pill, SignForm, Table, fmtUtc } from './ui'

export function qcRecordCsv(p: NonNullable<ReturnType<typeof useStore>['p']>) {
  const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`
  const rows = [['Report', 'Version', 'Section', 'Text', 'Finding', 'Message'], ...issues(findingsOf(p)).map((f) => [p.name, String(p.version), f.section, f.text, LABEL[f.status], f.message]), ...qcStatus(p).map((i) => [p.name, String(p.version), 'QC checklist', i.text, i.done ? 'done' : 'open', i.why ?? (i.done ? 'Ticked by the reviewer' : '')]), ...p.signatures.map((s) => [p.name, String(s.version), 'Signature', s.name, s.role, `${s.meaning} ${s.utc}`])]
  return rows.map((r) => r.map(q).join(',')).join('\r\n')
}
export default function Qc() {
  const { p, act } = useStore()
  const items = qcStatus(p!), lock = isLocked(p!.stage), sig = (m: string) => p!.signatures.filter((s) => s.meaning === m && s.version === p!.version)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="QC checklist" sub="A second reader works through this before the report is final. Items marked “measured” are checked by the app from the text; tick the others when you have checked them yourself." right={<Btn tone="grey" onClick={() => download(`${p!.name.replace(/[^\w-]+/g, '-')}-qc-record.csv`, qcRecordCsv(p!), 'text/csv')}>QC record (CSV)</Btn>}>
          <ul className="space-y-2">{items.map((i) => <li key={i.id} className="flex items-start gap-2 text-sm">
            {i.auto ? <span aria-hidden className={i.done ? 'text-lab-cdsco' : 'text-lab-amber'}>{i.done ? '✓' : '✗'}</span> : <input type="checkbox" aria-label={i.text} disabled={lock || p!.stage === 'shell'} checked={!!p!.qc[i.id]} onChange={(e) => act((x) => { x.qc[i.id] = e.target.checked })} />}
            <span className="flex-1">{i.text}{i.auto && <><Pill className="ml-1">measured</Pill><span className="block text-xs text-lab-text-muted">{i.why}</span></>}</span></li>)}</ul>
        </Panel>
        <Panel title="Signatures" sub="The author signs when the report passes QC; an approver (someone else) signs the final version; the coordinating investigator signs that the report describes the study accurately (E3 16.1.5; NDCT Table 6, appendix l). Practice signatures: this app is not a validated system and records no legal signature.">
          {p!.stage === 'review' && !sig(AUTHOR).length && <SignForm meaning={AUTHOR} label="Sign as author" who={{ name: '', role: 'Medical writer' }} onSign={(s) => act((x) => { x.signatures.push({ ...s, utc: new Date().toISOString(), version: x.version }) })} />}
          {p!.stage === 'final' && !sig(APPROVER).length && <SignForm meaning={APPROVER} label="Sign as approver" who={{ name: '', role: 'Clinical lead' }} onSign={(s) => act((x) => { x.signatures.push({ ...s, utc: new Date().toISOString(), version: x.version }) })} />}
          {['review', 'final'].includes(p!.stage) && !sig(CI).length && <SignForm meaning={CI} label="Sign as coordinating investigator" who={{ name: '', role: 'Coordinating investigator' }} onSign={(s) => act((x) => { x.signatures.push({ ...s, utc: new Date().toISOString(), version: x.version }) })} />}
          {!['review', 'final'].includes(p!.stage) && <p className="text-xs text-lab-text-muted">The author signs in review; the approver signs a final report.</p>}
          <Table head={['Version', 'Name', 'Role', 'Meaning', 'Signed (UTC)']} empty="No signatures yet." rows={p!.signatures.map((s) => [s.version, s.name, s.role, s.meaning.split(':')[0], fmtUtc(s.utc)])} />
        </Panel>
      </div>
      <StagePanel />
    </div>
  )
}
