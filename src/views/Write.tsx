// The report editor: one E3 section at a time, with its guidance, the outputs attached to it, a
// results helper that writes sentence skeletons, in-text tables, and the checker beside the text.
import { useMemo, useRef, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../nav'
import { dataOf, PLACEHOLDER } from '../domain/project'
import { sectionsOf, needsText } from '../domain/workflow'
import { checkText, issues, errors, LABEL, SEVERITY, type Finding } from '../domain/checker'
import { outputsOf } from '../domain/study'
import { rowsOf, skeleton } from '../domain/helper'
import { tableNumber } from '../domain/e3'
import { isLocked } from './Stage'
import OutputView from './OutputView'
import { Btn, Modal, Panel, Pill, Select, TextArea } from './ui'

const blankOut = (t: string) => t.replace(new RegExp(PLACEHOLDER.source, 'g'), (m) => ' '.repeat(m.length))
const TONE = { ok: 'text-lab-cdsco', warn: 'text-lab-amber', error: 'text-lab-red' } as const

export default function Write() {
  const { p, act } = useStore()
  const nav = useNav()
  const ms = missionSections(p!), secs = sectionsOf(p!).filter((x) => needsText(x) && (!ms.length || ms.includes(x.id))), d = dataOf(p!), outs = outputsOf(d)
  const [id, setId] = useState(nav.arg && p!.sections[nav.arg] ? nav.arg : secs.find((s) => s.id.startsWith('10'))?.id ?? secs[0].id)
  const [show, setShow] = useState(''), [helpOut, setHelpOut] = useState(''), [helpRow, setHelpRow] = useState(0)
  const ta = useRef<HTMLTextAreaElement>(null)
  const s = secs.find((x) => x.id === id) ?? secs[0], st = p!.sections[s.id], lock = isLocked(p!.stage)
  const f = useMemo(() => st.na ? [] : checkText(s.id, blankOut(st.text), outs, st.slots, d.groups, p!.rounding), [st.text, st.slots, st.na, s.id, outs, d.groups, p!.rounding])
  const status = (sid: string) => {
    const x = p!.sections[sid]; if (x.na) return { label: 'n/a', tone: 'grey' as const }
    if (!x.text.trim() || PLACEHOLDER.test(x.text)) return { label: 'to write', tone: 'amber' as const }
    const e = errors(checkText(sid, blankOut(x.text), outs, x.slots, d.groups, p!.rounding)); return e.length ? { label: `${e.length} err`, tone: 'red' as const } : { label: 'ok', tone: 'green' as const }
  }
  const insert = (text: string) => act((x) => {
    const el = ta.current, cur = x.sections[s.id].text.replace(PLACEHOLDER, '').trimEnd()
    const at = el && el.selectionStart <= cur.length ? el.selectionStart : cur.length
    x.sections[s.id].text = `${cur.slice(0, at)}${at && !/\s$/.test(cur.slice(0, at)) ? ' ' : ''}${text}${cur.slice(at)}`
  })
  const fix = (x: Finding) => x.suggestion !== undefined && act((y) => { const t = y.sections[s.id].text; if (t.slice(x.at, x.at + x.text.length) === x.text) y.sections[s.id].text = t.slice(0, x.at) + x.suggestion + t.slice(x.at + x.text.length) })
  const attached = st.slots.map((o) => d.outputs.find((x) => x.id === o)).filter((o): o is NonNullable<typeof o> => !!o)
  const helperOut = d.outputs.find((o) => o.id === (helpOut || attached.find((a) => a.display)?.id))
  const helperRows = helperOut?.display ? rowsOf(helperOut) : []
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_22rem] gap-4 items-start">
      <label className="lg:hidden text-xs text-lab-text-muted">Section<Select aria-label="Section" value={s.id} onChange={(e) => setId(e.target.value)} options={secs.map((x) => ({ value: x.id, label: `${x.id} ${x.heading} · ${status(x.id).label}` }))} /></label>
      <nav aria-label="Sections" className="hidden lg:block lg:sticky lg:top-28 max-h-[70vh] overflow-y-auto space-y-0.5 text-xs rounded border border-lab-line p-1">
        {secs.map((x) => { const t = status(x.id); return <button key={x.id} onClick={() => setId(x.id)} aria-current={x.id === s.id ? 'true' : undefined} className={`w-full flex items-center gap-1 text-left rounded px-1.5 py-1 ${x.id === s.id ? 'bg-lab-fda-soft text-lab-fda' : 'hover:bg-lab-panel-strong'}`} style={{ paddingLeft: `${0.4 + (x.level - 1) * 0.5}rem` }}>
          <span className="font-mono w-10 shrink-0">{x.id}</span><span className="flex-1 truncate">{x.heading}</span><Pill tone={t.tone}>{t.label}</Pill></button> })}
      </nav>
      <div className="space-y-4 min-w-0">
        <Panel title={`${s.id} ${s.heading}`} sub={<span className="flex flex-wrap gap-1 mt-1">{s.feeds.map((x) => <Pill key={x}>{x}</Pill>)}{attached.map((o) => <button key={o.id} onClick={() => setShow(o.id)} className="underline font-mono text-[11px]">{tableNumber(o.title) || o.id}</button>)}</span>}>
          <details className="text-sm" open={!st.text.trim() || PLACEHOLDER.test(st.text)}><summary className="cursor-pointer text-lab-text-muted text-xs">What goes here (ICH E3)</summary><p className="mt-1">{s.guidance}</p></details>
          {st.na ? <p className="text-sm italic">Marked not applicable: {st.na} <button className="underline not-italic text-xs" onClick={() => nav.go('shell')}>change in the shell</button></p> : <>
            <TextArea ref={ta} aria-label={`Text of section ${s.id}`} readOnly={lock} className="min-h-64 text-sm leading-relaxed" value={st.text} onChange={(e) => act((x) => { x.sections[s.id].text = e.target.value })} />
            {lock && <p className="text-xs text-lab-amber">The report is {p!.stage}: reopen it as a new version to edit.</p>}
            {!lock && <div className="flex flex-wrap items-end gap-2 text-xs">
              <label className="text-lab-text-muted">Results helper: output<Select aria-label="Output for the results helper" className="w-56" value={helperOut?.id ?? ''} onChange={(e) => { setHelpOut(e.target.value); setHelpRow(0) }} options={outs.filter((o) => o.display).map((o) => ({ value: o.id, label: o.title.slice(0, 60) }))} /></label>
              <label className="text-lab-text-muted">row<Select aria-label="Row for the results helper" className="w-56" value={String(helpRow)} onChange={(e) => setHelpRow(Number(e.target.value))} options={helperRows.map((r, i) => ({ value: String(i), label: `${r.context ? `${r.context}: ` : ''}${r.row}`.slice(0, 70) }))} /></label>
              <Btn tone="grey" disabled={!helperOut || !helperRows[helpRow]} onClick={() => insert(skeleton(helperOut!, helperRows[helpRow]))}>Insert sentence skeleton</Btn>
              <Btn tone="grey" disabled={!helperOut} title="Places the whole table in the text at the cursor, on its own line" onClick={() => insert(`\n{{${helperOut!.id}}}\n`)}>Insert the table in the text</Btn>
            </div>}
            <p className="text-[11px] text-lab-text-muted">Name the table after each sentence: [T14.1.1] or “(Table 14.1.1)”. A line holding only {'{{T4}}'} places that table in the exported report. The skeleton gives every value as the table shows it; rewrite it as prose and the checker still ties each number to its cell.</p>
          </>}
        </Panel>
        {!st.na && st.text.trim() && <Panel title="Your text, as checked" sub="Each number is coloured by what the checker found. Hover for the detail.">
          <Marked text={st.text} f={f} />
        </Panel>}
      </div>
      <Checker f={f} onFix={lock || p!.mission ? undefined : fix} />
      {show && (() => { const o = d.outputs.find((x) => x.id === show)!; return <Modal wide title={o.title} onClose={() => setShow('')}><OutputView o={o} /></Modal> })()}
    </div>
  )
}
const missionSections = (p: NonNullable<ReturnType<typeof useStore>['p']>) => ({ CS2: ['10.1', '11.2', '11.4.1', '12.1', '12.2.1', '12.2.2'], CS3: ['10.1', '11.2'], CS4: ['11.4.1', '11.4.7'], CS5: ['12.1', '12.2.1', '12.2.2', '12.3.1'] } as Record<string, string[]>)[p.mission?.id ?? ''] ?? []

function Marked({ text, f }: { text: string; f: Finding[] }) {
  const parts: React.ReactNode[] = []; let at = 0
  for (const x of [...f].sort((a, b) => a.at - b.at)) {
    if (x.at < at) continue
    parts.push(text.slice(at, x.at))
    parts.push(<mark key={x.at} title={`${LABEL[x.status]}: ${x.message}`} className={`bg-transparent font-semibold underline decoration-2 ${TONE[SEVERITY[x.status]]}`}>{text.slice(x.at, x.at + x.text.length)}</mark>)
    at = x.at + x.text.length
  }
  parts.push(text.slice(at))
  return <p className="text-sm whitespace-pre-wrap leading-relaxed">{parts}</p>
}

function Checker({ f, onFix }: { f: Finding[]; onFix?: (x: Finding) => void }) {
  const iss = issues(f), ok = f.filter((x) => x.status === 'ok')
  return (
    <Panel title="Checker" sub={`${ok.length} tied · ${errors(f).length} errors · ${iss.length - errors(f).length} warnings`} className="xl:sticky xl:top-28 xl:max-h-[78vh] xl:overflow-y-auto">
      {!f.length && <p className="text-xs text-lab-text-muted">No numbers in this section yet.</p>}
      <ul className="space-y-2">{iss.map((x, i) => <li key={i} className="text-xs border-l-2 pl-2 border-current">
        <p className={TONE[SEVERITY[x.status]]}><b className="font-mono">{x.text}</b> · {LABEL[x.status]}</p><p>{x.message}</p>
        {onFix && x.suggestion !== undefined && <button className="underline" onClick={() => onFix(x)}>Use {x.suggestion}</button>}</li>)}</ul>
      {ok.length > 0 && <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">{ok.length} numbers tied to their cells</summary><ul className="mt-1 space-y-0.5">{ok.map((x, i) => <li key={i}><span className="font-mono text-lab-cdsco">{x.text}</span> {x.message}</li>)}</ul></details>}
      <p className="text-[11px] text-lab-text-muted">The checker reads numbers, groups and nearby words; it cannot judge meaning. A human QC review still reads every sentence.</p>
    </Panel>
  )
}
