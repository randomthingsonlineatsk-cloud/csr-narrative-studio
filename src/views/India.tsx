// The India version: NDCT Rules 2019, Third Schedule, Table 6. Each of the 16 headings with the
// E3 sections that fill it, the items Table 6 asks for that E3 does not, and an export in Table 6
// order with numbered pages.
import { useStore } from '../state'
import { useNav } from '../nav'
import { aeByExpectedness, APPENDICES, EMPTY_INDIA, indiaItems, INDIAN_SITES, RSI, seriousTerms, TABLE6, type IndiaFields } from '../domain/india'
import { CI } from '../domain/review'
import { download } from '../domain/store'
import { isLocked } from './Stage'
import { Btn, Panel, Pill, SignForm, Table, TextArea } from './ui'

const FIELDS: { k: keyof IndiaFields; heading: number; label: string; hint: string }[] = [
  { k: 'accrual', heading: 1, label: 'Start and end of accrual (title page)', hint: 'First participant enrolled on …; last participant enrolled on …' },
  { k: 'gcp', heading: 3, label: 'Statement of compliance with the GCP guidelines', hint: 'The study was conducted in compliance with the Good Clinical Practice guidelines … and the New Drugs and Clinical Trials Rules, 2019.' },
  { k: 'ec', heading: 6, label: 'Ethics committees, by site, and the declaration on notifications', hint: 'Declaration of Helsinki; for each Indian site, the committee, its constitution and the date it approved the protocol; notifications followed the GCP guidelines and the ICMR National Ethical Guidelines.' },
  { k: 'site', heading: 11, label: 'Participants at Indian sites', hint: 'How many each Indian site enrolled, and how their results compare with the whole study.' },
  { k: 'rsi', heading: 13, label: 'Reference safety information used for 13.2', hint: 'The document and its edition, for example the investigator’s brochure, edition and section.' },
  { k: 'unexpected', heading: 13, label: '13.2 Unexpected adverse events, serious or not', hint: 'Every event not in the reference safety information.' },
]

export default function India() {
  const { p, act } = useStore()
  const nav = useNav()
  const f = { ...EMPTY_INDIA, ...p!.india }, items = indiaItems(p!), sites = INDIAN_SITES[p!.study] ?? [], ae = aeByExpectedness(p!), sae = seriousTerms(p!)
  const lock = isLocked(p!.stage), ci = p!.signatures.find((s) => s.version === p!.version && s.meaning === CI), base = `${p!.name.replace(/[^\w-]+/g, '-')}-India-Table-6`
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="NDCT Rules 2019, Third Schedule, Table 6" sub={`For CDSCO, the clinical study report follows the 16 headings of Table 6. The global E3 report fills most of them; Table 6 also asks for items E3 does not. ${sites.length ? `This study enrolled in India at ${sites.map((s) => `site ${s.site} (${s.n} participants)`).join(', ')}.` : ''}`}>
          <Table head={['Table 6', 'Filled from (E3)', 'India-only', 'Status']} rows={TABLE6.map((h) => { const its = items.filter((i) => i.heading === h.n); return [
            <span key="h"><b>{h.n}.</b> {h.title}<span className="block text-[11px] text-lab-text-muted">{h.note}</span></span>,
            <span key="e" className="font-mono text-[11px]">{h.e3.length ? h.e3.filter((x) => p!.sections[x]).slice(0, 6).map((x) => <button key={x} className="underline mr-1" onClick={() => nav.go('write', x)}>{x}</button>) : '—'}{h.e3.filter((x) => p!.sections[x]).length > 6 ? '…' : ''}</span>,
            h.india ? <Pill key="i" tone="purple">yes</Pill> : '',
            its.length ? <Pill key="s" tone={its.every((i) => i.ok) ? 'green' : 'amber'}>{its.filter((i) => i.ok).length}/{its.length}</Pill> : <Pill key="s">mapped</Pill>] })} />
        </Panel>
        <Panel title="India-only items" sub="Written once here; the Table 6 export places each under its heading.">
          {FIELDS.map((x) => <label key={x.k} className="block text-xs text-lab-text-muted"><span className="font-mono">{x.heading}.</span> {x.label}
            <TextArea aria-label={x.label} readOnly={lock} placeholder={x.hint} className={x.k === 'ec' || x.k === 'unexpected' ? 'min-h-28' : 'min-h-16'} value={f[x.k]} onChange={(e) => act((y) => { y.india = { ...EMPTY_INDIA, ...y.india, [x.k]: e.target.value } })} /></label>)}
          {sites.length > 0 && <p className="text-[11px] text-lab-text-muted">Indian sites: {sites.map((s) => `${s.site}: ${s.committee}`).join('; ')}.</p>}
        </Panel>
        <Panel title="Adverse events against the reference safety information" sub={`Expected means listed in the RSI: ${RSI[p!.study]?.source ?? 'the investigator’s brochure'} (fictional, for training). 13.2 lists every event that is not, serious or not; 13.1 lists every serious event, expected or not.`}>
          <Table head={['Preferred term', 'By group (Table 14.3.1)', 'In the RSI?']} rows={ae.map((a) => [a.term, <span key="c" className="text-[11px]">{a.counts}</span>, <Pill key="x" tone={a.expected ? 'green' : 'amber'}>{a.expected ? 'expected' : 'unexpected'}</Pill>])} />
          <p className="text-xs">Serious adverse events (Listing 16.2.7): {sae.join(', ') || 'none'}.</p>
        </Panel>
        <Panel title="Appendices (a) to (l)" sub="Table 6 heading 16. Each is the E3 appendix shown.">
          <ul className="text-xs space-y-0.5">{APPENDICES.map((a) => <li key={a.id}>({a.id}) {a.text} <span className="font-mono text-lab-text-muted">E3 {a.e3}</span>{a.id === 'l' && <Pill tone={ci ? 'green' : 'amber'} className="ml-1">{ci ? `signed by ${ci.name}` : 'not signed'}</Pill>}</li>)}</ul>
          {!ci && !lock && <SignForm meaning={CI} label="Sign as coordinating investigator" who={{ name: '', role: 'Coordinating investigator' }} onSign={(s) => act((x) => { x.signatures.push({ ...s, utc: new Date().toISOString(), version: x.version }) })} />}
        </Panel>
      </div>
      <div className="space-y-4 lg:sticky lg:top-28">
        <Panel title="Table 6 checklist" sub="Measured from the text.">
          <ul className="space-y-2">{items.map((i) => <li key={i.id} className="text-sm flex gap-2"><span aria-hidden className={i.ok ? 'text-lab-cdsco' : 'text-lab-amber'}>{i.ok ? '✓' : '✗'}</span><span>{i.heading ? <span className="font-mono text-xs">{i.heading}. </span> : null}{i.label}{!i.ok && <span className="block text-xs text-lab-text-muted">{i.why}</span>}</span></li>)}</ul>
        </Panel>
        <Panel title="Export in Table 6 order" sub="The 16 headings, the E3 sections under each with their E3 numbers, the India-only items and numbered pages.">
          <div className="flex flex-wrap gap-2"><Btn onClick={async () => { const { reportDocx, indiaBlocks } = await import('../domain/docx'); download(`${base}.docx`, await reportDocx(p!, indiaBlocks(p!))) }}>Word (.docx)</Btn><Btn tone="grey" onClick={async () => { const { reportHtml, indiaBlocks } = await import('../domain/docx'); download(`${base}.html`, reportHtml(p!, indiaBlocks(p!)), 'text/html') }}>HTML</Btn></div>
        </Panel>
      </div>
    </div>
  )
}
