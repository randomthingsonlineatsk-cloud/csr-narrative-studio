// The review cycle: comments by section with threads and resolutions, and the versions kept at
// each stage with tracked changes between any version and now.
import { useMemo, useState } from 'react'
import { useStore } from '../state'
import { useNav } from '../nav'
import { sectionsOf } from '../domain/workflow'
import { STAGE_LABEL } from '../domain/project'
import { addComment, changesSince, currentTexts, reopen, reply, resolve, ROLES, type Comment } from '../domain/review'
import { Btn, Panel, Pill, Select, TextArea, fmtUtc, ic } from './ui'

export default function Review() {
  const { p, act, setError } = useStore()
  const secs = sectionsOf(p!), [filter, setFilter] = useState<'open' | 'all'>('open')
  const [form, setForm] = useState({ section: secs.find((s) => s.id === '11.4.1')?.id ?? secs[0].id, quote: '', text: '', author: '', role: 'Biostatistician' })
  const list = (p!.comments ?? []).filter((c) => filter === 'all' || !c.resolved)
  const lock = p!.stage === 'approved'
  const run = (f: () => void) => { try { f() } catch (e) { setError((e as Error).message) } }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Comments" sub="Reviewers comment on a section, optionally quoting the words. The author answers each: change the text and resolve it as changed, or resolve with no change and say why. Open comments stop the report going final." right={<Select aria-label="Show comments" className="w-32" value={filter} onChange={(e) => setFilter(e.target.value as 'open' | 'all')} options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }]} />}>
          {!list.length && <p className="text-xs text-lab-text-muted">{filter === 'open' ? 'No open comments.' : 'No comments yet.'}</p>}
          <ul className="space-y-3">{list.map((c) => <CommentCard key={c.id} c={c} lock={lock} run={run} />)}</ul>
        </Panel>
        {!lock && <Panel title="Add a comment" sub="As a reviewer: one point per comment, so each can be resolved on its own.">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="text-lab-text-muted">Section<Select aria-label="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} options={secs.map((s) => ({ value: s.id, label: `${s.id} ${s.heading}`.slice(0, 60) }))} /></label>
            <label className="text-lab-text-muted">Your role<Select aria-label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES.map((r) => ({ value: r, label: r }))} /></label>
            <label className="text-lab-text-muted col-span-2">Your name<input className={ic('')} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label>
            <label className="text-lab-text-muted col-span-2">Words you are commenting on (optional, copied exactly)<input className={ic('')} value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} /></label>
            <label className="text-lab-text-muted col-span-2">Comment<TextArea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></label>
          </div>
          <Btn onClick={() => run(() => act((x) => { if (form.quote && !(x.sections[form.section]?.text ?? '').includes(form.quote)) throw new Error(`Those words are not in ${form.section}: copy them exactly, or leave the quote empty.`); addComment(x, { ...form, quote: form.quote || undefined }); setForm({ ...form, quote: '', text: '' }) }))}>Add the comment</Btn>
        </Panel>}
      </div>
      <Versions />
    </div>
  )
}

function CommentCard({ c, lock, run }: { c: Comment; lock: boolean; run: (f: () => void) => void }) {
  const { act } = useStore()
  const nav = useNav()
  const [r, setR] = useState(''), [who, setWho] = useState(''), [how, setHow] = useState<'changed' | 'no change' | 'withdrawn'>('changed')
  return (
    <li className={`rounded border p-2 text-sm space-y-1 ${c.resolved ? 'border-lab-line opacity-80' : 'border-lab-amber/60'}`}>
      <p className="text-xs"><button className="font-mono underline" onClick={() => nav.go('write', c.section)}>{c.section}</button> · <b>{c.author}</b>, {c.role} · {fmtUtc(c.utc)} {c.resolved ? <Pill tone="green">resolved: {c.resolved.how}</Pill> : <Pill tone="amber">open</Pill>}</p>
      {c.quote && <blockquote className="text-xs border-l-2 border-lab-line pl-2 italic">“{c.quote}”</blockquote>}
      <p>{c.text}</p>
      {c.replies.map((x, i) => <p key={i} className="text-xs pl-3 border-l border-lab-line"><b>{x.author}</b> · {fmtUtc(x.utc)}: {x.text}</p>)}
      {c.resolved && <p className="text-xs text-lab-text-muted">Resolved by {c.resolved.by}, {fmtUtc(c.resolved.utc)}{c.resolved.note ? `: ${c.resolved.note}` : ''} {!lock && <button className="underline" onClick={() => act((x) => reopen(x, c.id))}>Reopen</button>}</p>}
      {!c.resolved && !lock && <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1 text-xs">
        <input aria-label="Your name" placeholder="Your name" className={ic('')} value={who} onChange={(e) => setWho(e.target.value)} />
        <Select aria-label="Resolution" className="w-32" value={how} onChange={(e) => setHow(e.target.value as typeof how)} options={[{ value: 'changed', label: 'Changed' }, { value: 'no change', label: 'No change' }, { value: 'withdrawn', label: 'Withdrawn' }]} />
        <input aria-label="Reply or reason" placeholder="Reply, or the reason for the resolution" className={ic('col-span-2')} value={r} onChange={(e) => setR(e.target.value)} />
        <div className="col-span-2 flex gap-2"><Btn tone="grey" onClick={() => run(() => act((x) => { reply(x, c.id, { author: who, text: r }); setR('') }))}>Reply</Btn><Btn onClick={() => run(() => act((x) => { resolve(x, c.id, who, how, r); setR('') }))}>Resolve</Btn></div>
      </div>}
    </li>
  )
}

function Versions() {
  const { p, tick } = useStore()
  const snaps = p!.snapshots ?? [], [from, setFrom] = useState(String(Math.max(0, snaps.length - 1)))
  const s = snaps[Number(from)], ch = useMemo(() => (s ? changesSince(s, currentTexts(p!)) : []), [s, p, tick])
  return (
    <Panel title="Versions and tracked changes" sub="A version is kept each time the report moves between stages. Compare any of them with the text now: additions underlined in green, deletions struck through in red." className="xl:sticky xl:top-28 xl:max-h-[80vh] xl:overflow-y-auto">
      {!snaps.length ? <p className="text-xs text-lab-text-muted">No versions kept yet: one is kept when the report moves to the next stage.</p> : <>
        <label className="text-xs text-lab-text-muted">Compare now with<Select aria-label="Version to compare" value={from} onChange={(e) => setFrom(e.target.value)} options={snaps.map((x, i) => ({ value: String(i), label: `v${x.version} · ${STAGE_LABEL[x.stage]} · ${x.label} · ${x.utc.slice(0, 16).replace('T', ' ')}` }))} /></label>
        {!ch.length ? <p className="text-xs text-lab-cdsco">No changes since that version.</p> : <ul className="space-y-3">{ch.map((c) => <li key={c.section} className="text-sm">
          <p className="text-xs font-mono">{c.section} <span className="text-lab-cdsco">+{c.added}</span> <span className="text-lab-red">−{c.removed}</span> words</p>
          <p className="whitespace-pre-wrap leading-relaxed">{c.ops.map((o, i) => o.t === '=' ? <span key={i}>{o.w.length > 400 ? `${o.w.slice(0, 150)} … ${o.w.slice(-150)}` : o.w}</span> : o.t === '+' ? <ins key={i} className="text-lab-cdsco underline decoration-2 no-underline-offset">{o.w}</ins> : <del key={i} className="text-lab-red">{o.w}</del>)}</p>
        </li>)}</ul>}
      </>}
    </Panel>
  )
}
