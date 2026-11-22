// The content library: reusable, versioned, approved text blocks, and where the report uses them.
import { useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../nav'
import { protocolOf } from '../domain/study'
import { addBlock, approveBlock, approvedIndex, editBlock, latest, updateUsages, usages, type Block } from '../domain/reuse'
import { isLocked } from './Stage'
import { Btn, Panel, Pill, TextArea, fmtUtc, ic } from './ui'

export default function Library() {
  const { p, act, setError } = useStore()
  const nav = useNav()
  const blocks = p!.blocks ?? [], us = usages(p!), lock = isLocked(p!.stage)
  const [title, setTitle] = useState(''), [text, setText] = useState('')
  const pr = protocolOf(p!.study)
  const run = (f: () => void) => { try { f() } catch (e) { setError((e as Error).message) } }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Content library" sub="Text written once, approved, and reused word for word: the design statement, the population, the primary result. Only an approved version goes into the report and the registry; a changed block is a new version that needs approval, and every section still holding the older version is flagged until it is updated.">
          {!blocks.length && <p className="text-xs text-lab-text-muted">No blocks yet. Add one below, or start from the protocol’s title.</p>}
          <ul className="space-y-3">{blocks.map((b) => <BlockCard key={b.id} b={b} lock={lock} used={us.filter((u) => u.block === b.id)} run={run} />)}</ul>
        </Panel>
        {!lock && <Panel title="Add a block">
          <label className="text-xs text-lab-text-muted block">Title<input className={ic('')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="For example: Brief summary" /></label>
          <label className="text-xs text-lab-text-muted block">Text<TextArea value={text} onChange={(e) => setText(e.target.value)} /></label>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => run(() => act((x) => { addBlock(x, title, text); setTitle(''); setText('') }))}>Add the block</Btn>
            {pr.title.full && <Btn tone="grey" onClick={() => { setTitle('Study title'); setText(pr.title.full) }}>Start from the protocol’s title</Btn>}
          </div>
        </Panel>}
      </div>
      <Panel title="Where blocks are used" sub="Found by their exact approved text in each section." className="lg:sticky lg:top-28">
        {!us.length ? <p className="text-xs text-lab-text-muted">No section uses a block yet. In Write, insert an approved block at the cursor.</p> :
          <ul className="text-xs space-y-1">{us.map((u) => <li key={`${u.block}-${u.section}`} className="flex gap-2 items-center"><button className="font-mono underline" onClick={() => nav.go('write', u.section)}>{u.section}</button><span className="flex-1">{blocks.find((b) => b.id === u.block)?.title} v{u.version}</span><Pill tone={u.current ? 'green' : 'amber'}>{u.current ? 'current' : 'outdated'}</Pill></li>)}</ul>}
      </Panel>
    </div>
  )
}

function BlockCard({ b, lock, used, run }: { b: Block; lock: boolean; used: { section: string; current: boolean }[]; run: (f: () => void) => void }) {
  const { act } = useStore()
  const l = latest(b), ai = approvedIndex(b), [edit, setEdit] = useState(l.text), [by, setBy] = useState('')
  const old = used.filter((u) => !u.current)
  return (
    <li className="rounded border border-lab-line p-2 space-y-1">
      <p className="text-sm"><b>{b.title}</b> <span className="font-mono text-xs">{b.id}</span> · v{b.versions.length} {l.approvedUtc ? <Pill tone="green">approved</Pill> : <Pill tone="amber">draft</Pill>} {ai >= 0 && !l.approvedUtc && <span className="text-xs text-lab-text-muted">(v{ai + 1} is the approved version in use)</span>}</p>
      {l.approvedUtc && <p className="text-[11px] text-lab-text-muted">Approved by {l.approvedBy}, {fmtUtc(l.approvedUtc)}</p>}
      {lock ? <p className="text-sm whitespace-pre-wrap">{l.text}</p> : <TextArea aria-label={`Text of ${b.title}`} className="min-h-16 text-sm" value={edit} onChange={(e) => setEdit(e.target.value)} onBlur={() => act((x) => editBlock(x, b.id, edit))} />}
      {!lock && !l.approvedUtc && <div className="flex gap-2 items-end text-xs"><label className="text-lab-text-muted">Approver<input className={ic('w-40')} value={by} onChange={(e) => setBy(e.target.value)} /></label><Btn onClick={() => run(() => act((x) => { editBlock(x, b.id, edit); approveBlock(x, b.id, by) }))}>Approve this version</Btn></div>}
      {old.length > 0 && <div className="text-xs text-lab-amber flex flex-wrap items-center gap-2">Outdated in {old.map((u) => u.section).join(', ')}.{!lock && <Btn tone="grey" onClick={() => act((x) => { updateUsages(x, b.id) })}>Update them to v{ai + 1}</Btn>}</div>}
      {b.versions.length > 1 && <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">Version history</summary><ol className="list-decimal pl-5 space-y-1 mt-1">{b.versions.map((v, i) => <li key={i}>{v.text} <span className="text-lab-text-muted">({v.approvedUtc ? `approved by ${v.approvedBy}` : 'draft'})</span></li>)}</ol></details>}
    </li>
  )
}
