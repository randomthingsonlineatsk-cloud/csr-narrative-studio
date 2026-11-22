// Aids shown beside particular sections: the CONSORT flow (10.1), the liver test screen (12.4),
// the synopsis length (2), and the out-of-date notice for any section whose outputs changed.
import { useMemo } from 'react'
import { useStore } from '../state'
import { dataOf } from '../domain/project'
import { flowChecks, flowOf, flowSvg } from '../domain/consort'
import { liverItems, liverScreen } from '../domain/liver'
import { noteBasis, staleSections, synopsisLength, SYNOPSIS_WORDS } from '../domain/stale'
import { download } from '../domain/store'
import { usePatientData } from './usePatient'
import { Btn, Panel, Pill, Table } from './ui'

export function StaleNotice({ sid, lock }: { sid: string; lock: boolean }) {
  const { p, act } = useStore()
  const s = staleSections(p!).find((x) => x.section === sid)
  if (!s) return null
  return (
    <div role="status" className="rounded border border-lab-amber/70 bg-lab-amber/10 p-2 text-sm space-y-1">
      <p><b className="text-lab-amber">Out of date.</b> {s.changed.length ? <>The output{s.changed.length > 1 ? 's' : ''} {s.changed.map((c) => <span key={c} className="font-mono">{c} </span>)}changed after this text was written.</> : null} {s.gone.length ? <>No longer in the outputs: {s.gone.join(', ')}.</> : null} Read the text against the new version, change what no longer holds, then confirm.</p>
      {!lock && <Btn tone="grey" onClick={() => act((x) => noteBasis(x, sid))}>I have checked this text against the new outputs</Btn>}
    </div>
  )
}

export function SynopsisLength() {
  const { p } = useStore()
  const l = synopsisLength(p!)
  return <p className={`text-xs ${l.ok ? 'text-lab-text-muted' : 'text-lab-amber'}`}>{l.words} words, about {l.pages} page{l.pages === 1 ? '' : 's'}. {l.ok ? `ICH E3 says the synopsis is usually limited to three pages (about ${SYNOPSIS_WORDS} words).` : `Longer than the three pages ICH E3 usually allows (about ${SYNOPSIS_WORDS} words): keep the key results and move detail to the body.`}</p>
}

export function ConsortPanel() {
  const { p } = useStore()
  const f = flowOf(dataOf(p!))
  const svg = useMemo(() => (f ? flowSvg(f, true) : ''), [f])
  if (!f) return <Panel title="Flow of participants"><p className="text-xs text-lab-text-muted">No disposition table (14.1.1) in the outputs yet: request it from programming in the shell.</p></Panel>
  const ch = flowChecks(f)
  return (
    <Panel title="Flow of participants (CONSORT style)" sub="Drawn from Table 14.1.1. Every box must add up; a flow diagram that does not is the quickest way a reviewer finds a disposition error." right={<Btn tone="grey" onClick={() => download(`${p!.study}-flow-14-1-1.svg`, flowSvg(f), 'image/svg+xml')}>Download SVG (for the report)</Btn>}>
      <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg.replace(/width="\d+" height="\d+"/, 'style="max-width:100%;height:auto"') }} />
      <ul className="space-y-0.5 text-xs">{ch.map((c, i) => <li key={i} className="flex gap-2"><span aria-hidden className={c.ok ? 'text-lab-cdsco' : 'text-lab-red'}>{c.ok ? '✓' : '✗'}</span><span>{c.label} <span className="text-lab-text-muted">({c.why})</span></span></li>)}</ul>
    </Panel>
  )
}

export function LiverPanel({ text }: { text: string }) {
  const { p } = useStore()
  const d = usePatientData(p), groups = dataOf(p!).groups
  const sc = useMemo(() => (d && d.sdtm.domains.LB ? liverScreen(d.sdtm, groups) : null), [d, groups])
  if (!d) return <Panel title="Liver test screen"><p className="text-xs text-lab-text-muted">Loading the participants’ laboratory data…</p></Panel>
  if (!sc) return <Panel title="Liver test screen"><p className="text-xs text-lab-text-muted">This study has no participant-level laboratory data in the Studio, so the screen cannot run.</p></Panel>
  const items = liverItems(text, sc)
  return (
    <Panel title="Liver test screen (Hy’s law)" sub={`Peak ALT, AST and total bilirubin per participant, as multiples of the upper limit of normal (ULN), from the LB domain. Potential Hy’s law: ALT or AST above 3 × ULN with total bilirubin above 2 × ULN (FDA drug-induced liver injury guidance, 2009). Tests in LB: ${sc.tests.join(', ')}.`}>
      <Table head={['Group', 'With results', 'ALT or AST > 3 × ULN', '> 5 × ULN', '> 10 × ULN', 'Bilirubin > 2 × ULN', 'Potential Hy’s law']} rows={sc.groups.map((g) => [g.group, g.n, g.gt3, g.gt5, g.gt10, sc.bilirubin ? g.bili2 : 'not collected', sc.bilirubin ? g.hy : 'cannot assess'])} />
      {!sc.bilirubin && <p className="text-xs text-lab-amber">Total bilirubin is not in these laboratory data. The screen can count transaminase rises, but it cannot rule potential Hy’s law in or out; the report must say so.</p>}
      {sc.peaks.filter((x) => Math.max(x.alt ?? 0, x.ast ?? 0) > 2).length > 0 && <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">Participants above 2 × ULN</summary><Table head={['Participant', 'Group', 'Peak ALT × ULN', 'Peak AST × ULN', 'Peak bilirubin × ULN', 'Study day of peak ALT']} rows={sc.peaks.filter((x) => Math.max(x.alt ?? 0, x.ast ?? 0) > 2).map((x) => [x.usubjid, x.group, x.alt ?? '', x.ast ?? '', x.bili ?? '—', x.altDay ?? ''])} /></details>}
      <ul className="space-y-1 text-xs">{items.map((i) => <li key={i.label} className="flex gap-2"><span aria-hidden className={i.ok ? 'text-lab-cdsco' : 'text-lab-amber'}>{i.ok ? '✓' : '✗'}</span><span>{i.label}{!i.ok && <span className="block text-lab-text-muted">{i.why}</span>}</span></li>)}</ul>
      <Pill tone={items.every((i) => i.ok) ? 'green' : 'amber'}>{`${items.filter((i) => i.ok).length}/${items.length} in the text`}</Pill>
    </Panel>
  )
}
