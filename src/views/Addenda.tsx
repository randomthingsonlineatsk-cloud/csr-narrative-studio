// Addenda to an approved report: errata and additional data, each with its changes quoted from the
// approved text, the impact, the signatures and a download.
import { useState } from 'react'
import { useStore } from '../state'
import { addendumHtml, addendumItems, approvedTexts, DOCUMENTS, newAddendum, type Addendum } from '../domain/addendum'
import { AUTHOR, APPROVER, sectionsOf } from '../domain/workflow'
import { download } from '../domain/store'
import { Btn, Panel, Pill, Select, TextArea, ic } from './ui'

export default function Addenda() {
  const { p, act, setError } = useStore()
  const list = p!.addenda ?? [], [open, setOpen] = useState(list.length ? list[list.length - 1].id : '')
  const a = list.find((x) => x.id === open)
  const run = (f: () => void) => { try { f() } catch (e) { setError((e as Error).message) } }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Addenda" sub="An approved report is not edited in place. A correction found later goes out as an erratum (each change quoted, was and now); results that arrive later (long-term follow-up, a final analysis) go out as an addendum with the new data. Each is signed and sits beside the report in eCTD 5.3.5.1.">
          <div className="flex flex-wrap gap-2">{list.map((x) => <Btn key={x.id} tone={x.id === open ? 'solid' : 'grey'} onClick={() => setOpen(x.id)}>{`Addendum ${x.number}`}</Btn>)}
            <Btn disabled={p!.stage !== 'approved'} title={p!.stage !== 'approved' ? 'The report must be approved first' : undefined} onClick={() => run(() => act((x) => { const n = newAddendum(x); setOpen(n.id) }))}>Start an addendum</Btn></div>
          {p!.stage !== 'approved' && <p className="text-xs text-lab-text-muted">The report is not approved yet: until it is, change the text itself.</p>}
        </Panel>
        {a && <Editor a={a} />}
      </div>
      {a && <Checks a={a} />}
    </div>
  )
}

function Editor({ a }: { a: Addendum }) {
  const { p, act } = useStore()
  const set = (f: (x: Addendum) => void) => act((y) => { const x = y.addenda!.find((z) => z.id === a.id)!; f(x) })
  const ap = approvedTexts(p!) ?? {}, secs = sectionsOf(p!).filter((s) => (ap[s.id] ?? '').trim())
  const signed = (m: string) => a.signatures.find((s) => s.meaning === m)
  const [who, setWho] = useState({ name: '', role: 'Medical writer' })
  return (
    <Panel title={`Addendum ${a.number}`}>
      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <label className="text-lab-text-muted">Kind<Select aria-label="Kind" value={a.kind} onChange={(e) => set((x) => { x.kind = e.target.value as Addendum['kind'] })} options={[{ value: '', label: 'Choose' }, { value: 'erratum', label: 'Erratum (corrections)' }, { value: 'additional-data', label: 'Additional data' }]} /></label>
        <label className="text-lab-text-muted">Conclusions<Select aria-label="Conclusions" value={a.conclusions} onChange={(e) => set((x) => { x.conclusions = e.target.value as Addendum['conclusions'] })} options={[{ value: '', label: 'Choose' }, { value: 'unchanged', label: 'Do not change' }, { value: 'changed', label: 'Change' }]} /></label>
      </div>
      <label className="text-xs text-lab-text-muted block">Reason<TextArea className="min-h-12 text-sm" value={a.reason} onChange={(e) => set((x) => { x.reason = e.target.value })} placeholder="What was found, when and by whom" /></label>
      <div className="space-y-2">{a.changes.map((c, i) => <div key={i} className="rounded border border-lab-line p-2 space-y-1 text-xs">
        <div className="flex gap-2 items-end"><label className="text-lab-text-muted">Section<Select aria-label={`Section of change ${i + 1}`} className="w-60" value={c.section} onChange={(e) => set((x) => { x.changes[i].section = e.target.value })} options={[{ value: '', label: 'Choose' }, ...secs.map((s) => ({ value: s.id, label: `${s.id} ${s.heading}`.slice(0, 50) }))]} /></label><Btn tone="grey" onClick={() => set((x) => { x.changes.splice(i, 1) })}>Remove</Btn></div>
        <label className="text-lab-text-muted block">Was (copied exactly from the approved report)<TextArea className="min-h-10 text-sm" value={c.was} onChange={(e) => set((x) => { x.changes[i].was = e.target.value })} /></label>
        <label className="text-lab-text-muted block">Now<TextArea className="min-h-10 text-sm" value={c.now} onChange={(e) => set((x) => { x.changes[i].now = e.target.value })} /></label>
        {c.section && <details><summary className="cursor-pointer text-lab-text-muted">The approved text of {c.section}</summary><p className="mt-1 whitespace-pre-wrap">{ap[c.section]}</p></details>}
      </div>)}</div>
      <Btn tone="grey" onClick={() => set((x) => { x.changes.push({ section: '', was: '', now: '' }) })}>Add a change</Btn>
      <fieldset className="text-xs space-y-0.5"><legend className="text-lab-text-muted">Other documents that need the same change</legend>{DOCUMENTS.map((d) => <label key={d} className="flex gap-2"><input type="checkbox" checked={a.documents.includes(d)} onChange={(e) => set((x) => { x.documents = e.target.checked ? [...x.documents, d] : x.documents.filter((y) => y !== d) })} />{d}</label>)}</fieldset>
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label className="text-lab-text-muted">Name<input className={ic('w-40')} value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} /></label>
        <label className="text-lab-text-muted">Role<input className={ic('w-40')} value={who.role} onChange={(e) => setWho({ ...who, role: e.target.value })} /></label>
        <Btn disabled={!who.name.trim() || !!signed(AUTHOR)} onClick={() => set((x) => { x.signatures.push({ name: who.name.trim(), role: who.role, meaning: AUTHOR, utc: new Date().toISOString(), version: p!.version }) })}>Sign as author</Btn>
        <Btn disabled={!who.name.trim() || !signed(AUTHOR) || !!signed(APPROVER)} onClick={() => set((x) => { x.signatures.push({ name: who.name.trim(), role: who.role, meaning: APPROVER, utc: new Date().toISOString(), version: p!.version }) })}>Sign as approver</Btn>
      </div>
      {a.signatures.map((s) => <p key={s.meaning} className="text-xs"><Pill tone="green">signed</Pill> {s.name}, {s.role}: {s.meaning.split(':')[0]}</p>)}
      <Btn tone="grey" onClick={() => download(`${p!.study}-csr-addendum-${a.number}.html`, addendumHtml(p!, a), 'text/html')}>Download the addendum (HTML)</Btn>
    </Panel>
  )
}

function Checks({ a }: { a: Addendum }) {
  const { p } = useStore()
  const items = addendumItems(p!, a)
  return (
    <Panel title="Addendum checks" className="lg:sticky lg:top-28">
      <ul className="space-y-2">{items.map((i) => <li key={i.label} className="text-sm flex gap-2"><span aria-hidden className={i.ok ? 'text-lab-cdsco' : 'text-lab-amber'}>{i.ok ? '✓' : '✗'}</span><span>{i.label}{!i.ok && <span className="block text-xs text-lab-text-muted">{i.why}</span>}</span></li>)}</ul>
    </Panel>
  )
}
