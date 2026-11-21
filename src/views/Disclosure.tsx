// Disclosure: the public version of the report for CTIS, EMA Policy 0070 and Health Canada.
// Rules for each identifier, the quasi-identifiers the public version keeps (with the risk on the
// study's own participants), CCI proposals by route, data utility, and the disclosure package.
import { useMemo } from 'react'
import { useStore } from '../state'
import { usePatientData } from './usePatient'
import { download } from '../domain/store'
import { CCI_CANDIDATES, DEFAULT_DISCLOSURE, disclosureItems, findIdentifiers, ID_LABEL, QI_LABEL, redact, risk, ROUTES, RULE_CHOICES, RULE_LABEL, THRESHOLD, type DisclosureState, type IdKind, type QIs } from '../domain/disclosure'
import { Btn, Panel, Pill, Select, Table, TextArea } from './ui'

export default function Disclosure() {
  const { p, act, tick } = useStore()
  const d = usePatientData(p)
  const s = { ...DEFAULT_DISCLOSURE(), ...p!.disclosure } as DisclosureState
  const set = (f: (x: DisclosureState) => void) => act((y) => { const x = { ...DEFAULT_DISCLOSURE(), ...y.disclosure } as DisclosureState; f(x); y.disclosure = x })
  const rk = useMemo(() => (d ? risk(d, s.qi) : null), [d, tick])
  const red = useMemo(() => (d ? redact(p!, d) : null), [d, p, tick])
  const items = useMemo(() => (d ? disclosureItems(p!, d) : []), [d, p, tick])
  const found = useMemo(() => { if (!d) return []; const all = [...Object.values(p!.sections).map((x) => x.text), ...Object.values(p!.narratives ?? {}).map((n) => n.text)].join('\n'); const c = new Map<IdKind, Set<string>>(); for (const h of findIdentifiers(all, d)) { if (!c.has(h.kind)) c.set(h.kind, new Set()); c.get(h.kind)!.add(h.text) } return [...c] }, [d, p, tick])
  const cands = CCI_CANDIDATES[p!.study] ?? [], base = p!.name.replace(/[^\w-]+/g, '-')
  if (!d) return <Panel title="Disclosure"><p className="text-sm text-lab-text-muted">Loading the participants’ data…</p></Panel>
  const firstNarr = red && Object.values(red.narratives)[0]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Where the report will be published" sub="Each route publishes the CSR in a version without personal data. Choose one or more.">
          <div className="space-y-2">{ROUTES.map((r) => <label key={r.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={s.routes.includes(r.id)} onChange={(e) => set((x) => { x.routes = e.target.checked ? [...x.routes, r.id] : x.routes.filter((y) => y !== r.id) })} /><span><b>{r.name}</b><span className="block text-xs text-lab-text-muted">{r.note}</span></span></label>)}</div>
        </Panel>
        <Panel title="Identifiers in the report and the narratives" sub="Found in the text by pattern. Set what the public version does with each kind; the redaction log records every change.">
          <Table head={['Kind', 'Found (examples)', 'Rule']} rows={(Object.keys(ID_LABEL) as IdKind[]).map((k) => { const f = found.find(([x]) => x === k)?.[1]; return [ID_LABEL[k], <span key="f" className="text-xs font-mono">{f ? `${[...f].slice(0, 3).join(', ')}${f.size > 3 ? ` +${f.size - 3}` : ''}` : 'none'}</span>,
            <Select key="r" aria-label={`Rule for ${ID_LABEL[k]}`} value={s.rules[k]} onChange={(e) => set((x) => { x.rules = { ...x.rules, [k]: e.target.value } })} options={RULE_CHOICES[k].map((r) => ({ value: r, label: RULE_LABEL[r] }))} />] })} />
          {firstNarr && <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">A narrative as it would be published</summary><p className="mt-1 whitespace-pre-wrap">{firstNarr}</p></details>}
        </Panel>
        <Panel title="Quasi-identifiers and the re-identification risk" sub={`What the public version tells about each participant. Risk = 1 ÷ the smallest group of the ${rk?.population ?? ''} randomised participants who share these characteristics, to two decimals; the threshold is ${THRESHOLD} (groups of at least 11).`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">{(['age', 'sex', 'race', 'country'] as (keyof QIs)[]).map((k) => <label key={k} className="text-lab-text-muted capitalize">{k}<Select aria-label={`Published ${k}`} value={s.qi[k]} onChange={(e) => set((x) => { x.qi = { ...x.qi, [k]: e.target.value } as QIs })} options={Object.entries(QI_LABEL[k]).map(([v, l]) => ({ value: v, label: l }))} /></label>)}</div>
          {rk && <p className={`text-sm ${rk.ok ? 'text-lab-cdsco' : 'text-lab-amber'}`}>Smallest group: <b>{rk.smallest}</b> · risk <b>{rk.risk.toFixed(2)}</b> {rk.ok ? `(at or below ${THRESHOLD})` : `(above ${THRESHOLD})`}</p>}
          {rk && <details className="text-xs" open={!rk.ok}><summary className="cursor-pointer text-lab-text-muted">{rk.groups.length} groups, smallest first</summary><Table head={['Group', 'Participants']} rows={rk.groups.slice(0, 20).map((g) => [g.key, <span key="n" className={g.n < 11 ? 'text-lab-amber font-semibold' : ''}>{g.n}</span>])} /></details>}
        </Panel>
        <Panel title="Commercially confidential information" sub="Propose only what every chosen route accepts, each with a reason. Results, design and safety findings are never confidential.">
          {!cands.length ? <p className="text-xs text-lab-text-muted">No candidate passages are prepared for this study.</p> :
            <ul className="space-y-3">{cands.map((c) => { const v = s.cci[c.id] ?? { propose: false, reason: '' }, bad = v.propose && s.routes.some((r) => !c.accept[r]); return (
              <li key={c.id} className={`rounded border p-2 text-sm ${bad ? 'border-lab-red/60' : 'border-lab-line'}`}>
                <label className="flex items-start gap-2"><input type="checkbox" checked={v.propose} onChange={(e) => set((x) => { x.cci = { ...x.cci, [c.id]: { ...v, propose: e.target.checked } } })} /><span><b>{c.label}</b> <span className="font-mono text-xs">({c.section})</span>{c.quote && <span className="block text-xs italic">“{c.quote.slice(0, 160)}{c.quote.length > 160 ? '…' : ''}”</span>}</span></label>
                {v.propose && <TextArea aria-label={`Reason for ${c.label}`} className="min-h-12 mt-1 text-xs" placeholder="Why this is commercially confidential, in terms the route accepts" value={v.reason} onChange={(e) => set((x) => { x.cci = { ...x.cci, [c.id]: { ...v, reason: e.target.value } } })} />}
                {bad && <p className="text-xs text-lab-red mt-1">{c.why}</p>}
              </li>) })}</ul>}
        </Panel>
        <Panel title="Data utility" sub="What a reader can still learn from the public version. It goes into the anonymisation report.">
          <TextArea aria-label="Data utility" value={s.utility} onChange={(e) => set((x) => { x.utility = e.target.value })} placeholder="For example: intervals between events are kept by one date offset; doses, outcomes and every aggregate result are unchanged." />
        </Panel>
      </div>
      <div className="space-y-4 lg:sticky lg:top-28">
        <Panel title="Disclosure checklist" sub="Measured from the redacted text and the participants’ data.">
          <ul className="space-y-2">{items.map((i) => <li key={i.id} className="text-sm flex gap-2"><span aria-hidden className={i.ok ? 'text-lab-cdsco' : 'text-lab-amber'}>{i.ok ? '✓' : '✗'}</span><span>{i.label}{!i.ok && <span className="block text-xs text-lab-text-muted">{i.why}</span>}</span></li>)}</ul>
          <Pill tone={items.every((i) => i.ok) ? 'green' : 'amber'}>{items.filter((i) => i.ok).length}/{items.length}</Pill>
        </Panel>
        <Panel title="Downloads" sub={`Redaction log: ${red?.log.length ?? 0} entries.`}>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={async () => { const { disclosureZip } = await import('../domain/handoff'); download(`${base}-disclosure.zip`, new Blob([disclosureZip(p!, d) as BlobPart], { type: 'application/zip' })) }}>Disclosure package (.zip)</Btn>
            <Btn tone="grey" onClick={async () => { const { anonymisationReportHtml } = await import('../domain/disclosure'); download(`${base}-anonymisation-report.html`, anonymisationReportHtml(p!, d), 'text/html') }}>Anonymisation report</Btn>
            <Btn tone="grey" onClick={async () => { const { redactionLogCsv } = await import('../domain/disclosure'); download(`${base}-redaction-log.csv`, redactionLogCsv(red!.log), 'text/csv') }}>Redaction log (CSV)</Btn>
          </div>
          <p className="text-[11px] text-lab-text-muted">The original report is unchanged; the redacted version is made when you download.</p>
        </Panel>
      </div>
    </div>
  )
}
