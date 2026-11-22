// Results posting: the ClinicalTrials.gov results modules and the CTIS summary of results, built
// from the report's own outputs, with the dates and choices the writer must make.
import { useMemo } from 'react'
import { useStore } from '../state'
import { useNav } from '../nav'
import { protocolOf } from '../domain/study'
import { approvedText } from '../domain/reuse'
import { buildPosting, DEFAULT_POSTING, plusYear, postingFile, postingItems, postingOf, studyDates, type PostingState } from '../domain/posting'
import { download } from '../domain/store'
import { usePatientData } from './usePatient'
import { isLocked } from './Stage'
import { Btn, Panel, Pill, Select, Table, TextArea, ic } from './ui'

export default function Posting() {
  const { p, act, tick } = useStore()
  const nav = useNav()
  const d = usePatientData(p), st = postingOf(p!), lock = isLocked(p!.stage) && !p!.mission
  const set = (f: (x: PostingState) => void) => act((y) => { const x = { ...DEFAULT_POSTING(), ...y.posting } as PostingState; f(x); y.posting = x })
  const b = useMemo(() => buildPosting(p!), [p, tick])
  const items = useMemo(() => postingItems(p!, d?.sdtm ?? null, !p!.mission || !!p!.mission.submittedUtc), [p, d, tick])
  const pr = protocolOf(p!.study), prim = pr.endpoints.find((e) => /primary/i.test(e.level))?.text ?? ''
  const dt = d ? studyDates(d.sdtm, prim) : null
  const approved = (p!.blocks ?? []).filter((x) => approvedText(x))
  const cell = (x: { n: number; atRisk: number }) => `${x.n}/${x.atRisk}${x.atRisk ? ` (${((100 * x.n) / x.atRisk).toFixed(1)}%)` : ''}`
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Results posting" sub={`Registry results from the same outputs as the report: ClinicalTrials.gov (42 CFR 11.48) and the EU summary of results in CTIS (Regulation 536/2014, Annex IV). Registry IDs: ${Object.values(pr.title.registry ?? {}).join(' · ') || 'none in the protocol'}.`}>
          <div className="grid sm:grid-cols-3 gap-2 text-xs">
            <label className="text-lab-text-muted">Primary completion date<input type="date" disabled={lock} className={ic('')} value={st.pcd} onChange={(e) => set((x) => { x.pcd = e.target.value })} /></label>
            <label className="text-lab-text-muted">Study completion date<input type="date" disabled={lock} className={ic('')} value={st.completion} onChange={(e) => set((x) => { x.completion = e.target.value })} /></label>
            <label className="text-lab-text-muted">End of trial (EU)<input type="date" disabled={lock} className={ic('')} value={st.endOfTrial} onChange={(e) => set((x) => { x.endOfTrial = e.target.value })} /></label>
          </div>
          <p className="text-xs">ClinicalTrials.gov results due: <b>{plusYear(st.pcd) || '—'}</b> (one year after primary completion, 42 CFR 11.44). CTIS summary of results due: <b>{plusYear(st.endOfTrial) || '—'}</b> (one year after the end of the trial in all Member States concerned, Article 37(4)).</p>
          {dt && <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">Dates in the data</summary><p className="mt-1">Primary endpoint: “{prim.slice(0, 120)}”. Use the data to find the last assessment at its time point and the last visit of the last participant.</p><VisitDates d={d!.sdtm} /></details>}
        </Panel>
        <Panel title="Participant flow" sub="From Table 14.1.1.">
          {b.flow ? <Table head={['Arm', 'Started', 'Completed', 'Not completed', 'Reasons']} rows={b.flow.arms.map((a) => [a.group, a.randomised, a.completed, a.discontinued, a.reasons.filter((r) => r.n).map((r) => `${r.reason} ${r.n}`).join('; ') || '—'])} /> : <p className="text-xs text-lab-text-muted">No disposition table.</p>}
        </Panel>
        <Panel title="Outcome measures" sub="Primary and secondary outcomes, from the efficacy tables, with the protocol’s endpoints.">
          {b.outcomes.map((o) => <div key={o.table} className="space-y-1"><p className="text-sm"><Pill tone={o.level === 'Primary' ? 'blue' : 'grey'}>{o.level}</Pill> {o.endpoint} <span className="font-mono text-xs">(Table {o.table})</span></p><Table head={['', ...o.display.head]} rows={o.display.rows.map((r) => [r.label, ...r.cells.map((c) => c.text)])} /></div>)}
        </Panel>
        <Panel title="Adverse events" sub="All-cause mortality, serious events (Listing 16.2.7) and other events above the threshold in any arm (Table 14.3.1). Number affected / number at risk (the safety population).">
          <div className="grid sm:grid-cols-3 gap-2 text-xs">
            <label className="text-lab-text-muted">Frequency threshold (%)<input type="number" min={0} max={100} step={0.5} disabled={lock} className={ic('')} value={st.threshold} onChange={(e) => set((x) => { x.threshold = Number(e.target.value) })} /></label>
            <label className="text-lab-text-muted">Other adverse events count<Select aria-label="Other adverse events count" disabled={lock} value={st.otherAes} onChange={(e) => set((x) => { x.otherAes = e.target.value as PostingState['otherAes'] })} options={[{ value: '', label: 'Choose' }, { value: 'all', label: 'All TEAEs (as Table 14.3.1)' }, { value: 'non-serious', label: 'Non-serious events only' }]} /></label>
            <label className="text-lab-text-muted">Collection approach<Select aria-label="Collection approach" disabled={lock} value={st.collection} onChange={(e) => set((x) => { x.collection = e.target.value as PostingState['collection'] })} options={[{ value: '', label: 'Choose' }, { value: 'systematic', label: 'Systematic' }, { value: 'non-systematic', label: 'Non-systematic' }]} /></label>
          </div>
          <label className="text-xs text-lab-text-muted block">Time frame<TextArea disabled={lock} className="min-h-12 text-sm" value={st.timeFrame} onChange={(e) => set((x) => { x.timeFrame = e.target.value })} placeholder="From when to when adverse events were collected" /></label>
          <Table head={['All-cause mortality', ...b.arms]} rows={[['Deaths', ...b.mortality.map((m) => cell({ n: m.deaths, atRisk: m.atRisk }))]]} />
          <Table head={['Serious event', 'Organ system', ...b.arms]} rows={b.serious.map((r) => [r.term, r.soc, ...r.byArm.map(cell)])} empty="No serious adverse events." />
          <Table head={[`Other events above ${st.threshold}%`, 'Organ system', ...b.arms]} rows={b.other.map((r) => [r.term, r.soc, ...r.byArm.map(cell)])} empty="None above the threshold." />
        </Panel>
      </div>
      <div className="space-y-4 lg:sticky lg:top-28">
        <Panel title="Brief summary" sub="From an approved block in the content library, so the registry and the report say the same.">
          <Select aria-label="Brief summary block" disabled={lock} value={st.summaryBlock} onChange={(e) => set((x) => { x.summaryBlock = e.target.value })} options={[{ value: '', label: approved.length ? 'Choose a block' : 'No approved blocks yet' }, ...approved.map((x) => ({ value: x.id, label: x.title }))]} />
          {st.summaryBlock && <p className="text-sm">{approvedText((p!.blocks ?? []).find((x) => x.id === st.summaryBlock)!) ?? ''}</p>}
          <Btn tone="grey" onClick={() => nav.go('library')}>Open the content library</Btn>
        </Panel>
        <Panel title="Posting checks">
          <ul className="space-y-2">{items.map((i) => <li key={i.label} className="text-sm flex gap-2"><span aria-hidden className={i.ok ? 'text-lab-cdsco' : 'text-lab-amber'}>{i.ok ? '✓' : '✗'}</span><span>{i.label}{!i.ok && <span className="block text-xs text-lab-text-muted">{i.why}</span>}</span></li>)}</ul>
          <Btn onClick={() => download(`${p!.study}-results-posting.json`, JSON.stringify(postingFile(p!), null, 1))}>Download the posting (JSON)</Btn>
          <p className="text-[11px] text-lab-text-muted">A practice file in the shape of the registry modules; it is not uploaded anywhere.</p>
        </Panel>
      </div>
    </div>
  )
}

function VisitDates({ d }: { d: import('../domain/sdtm').Sdtm }) {
  const last = new Map<string, string>()
  for (const dom of ['LB', 'VS', 'DS']) { const t = d.domains[dom]; if (!t) continue; const vi = t.columns.indexOf('VISIT'), di = t.columns.indexOf(dom === 'DS' ? 'DSSTDTC' : `${dom}DTC`), ti = t.columns.indexOf('DSDECOD'); for (const r of t.rows) { const k = dom === 'DS' ? `DS: ${r[ti]}` : String(r[vi] ?? ''); const v = String(r[di] ?? '').slice(0, 10); if (k && v && v > (last.get(k) ?? '')) last.set(k, v) } }
  return <Table head={['Visit or disposition event', 'Latest date in the data']} rows={[...last.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => [k, v])} />
}
