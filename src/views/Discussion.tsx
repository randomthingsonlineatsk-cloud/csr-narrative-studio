// Discussion and benefit–risk (E3 13): the benefit–risk table built from the outputs, and the
// conclusions sections checked against it.
import { useStore } from '../state'
import { useNav } from '../nav'
import { dataOf, PLACEHOLDER } from '../domain/project'
import { benefitRisk, claimFindings, discussionItems } from '../domain/discussion'
import { Btn, Panel, Pill, Table } from './ui'

export default function Discussion() {
  const { p } = useStore()
  const nav = useNav()
  const br = benefitRisk(dataOf(p!)), S = (s: string) => (p!.sections[s]?.na ? '' : p!.sections[s]?.text ?? '')
  const items = discussionItems(S('13'), br)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Panel title="Benefit–risk table" sub={`Built from the outputs of ${br.study}. The conclusions in 11.4.7, 12.6 and 13 must agree with it. ${br.design === 'non-inferiority' ? `Non-inferiority design: shown if the lower limit of the 95% CI is above −${br.margin}.` : 'Superiority design: shown if the 95% CI excludes no difference in the favoured direction.'}`}>
          {br.stopped && <p className="text-xs rounded border border-lab-amber/60 bg-lab-amber-soft px-2 py-1">Stopped early on {br.stopped.date}: {br.stopped.enrolled} of {br.stopped.planned} planned participants. {br.stopped.reason}</p>}
          <h3 className="text-xs font-semibold text-lab-text-muted">Benefit</h3>
          <Table head={['Endpoint', 'Comparison', 'Estimate (95% CI)', 'p', 'Shown?']} empty="No efficacy comparisons in the outputs." rows={br.effects.map((e) => [<span key="e">{e.endpoint}{e.primary && <Pill tone="blue" className="ml-1">primary</Pill>}<span className="block text-[11px] text-lab-text-muted">Table {e.table}</span></span>, `${e.group} vs ${br.comparator}`, e.text, e.p || '—', <Pill key="s" tone={e.shown ? 'green' : 'amber'}>{e.shown ? 'yes' : 'no'}</Pill>])} />
          <p className={`text-sm ${br.primaryShown ? 'text-lab-cdsco' : 'text-lab-amber'}`}>{br.primaryShown ? 'The primary comparison met its objective.' : 'The primary comparison did not meet its objective: no efficacy claim can be made for it, or for anything tested after it.'}</p>
          <h3 className="text-xs font-semibold text-lab-text-muted">Risk</h3>
          <Table head={['', 'By group']} empty="No safety outputs." rows={br.harms.map((h) => [h.label, h.detail])} />
        </Panel>
        {(['11.4.7', '12.6', '13'] as const).map((s) => { const c = claimFindings(S(s), br); return (
          <Panel key={s} title={`${s} ${s === '13' ? 'Discussion and overall conclusions' : s === '12.6' ? 'Safety conclusions' : 'Efficacy conclusions'}`} right={<Btn tone="grey" onClick={() => nav.go('write', s)}>Edit</Btn>}>
            {!S(s).trim() || PLACEHOLDER.test(S(s)) ? <p className="text-xs text-lab-text-muted">Not written yet.</p> : <p className="text-sm whitespace-pre-wrap">{S(s)}</p>}
            {c.map((x, i) => <p key={i} className={`text-xs border-l-2 pl-2 ${x.severity === 'error' ? 'border-lab-red' : 'border-lab-amber'}`}><b className={x.severity === 'error' ? 'text-lab-red' : 'text-lab-amber'}>{x.kind}</b> · “{x.sentence.slice(0, 110)}”: {x.why}</p>)}
          </Panel>) })}
      </div>
      <Panel title="Section 13 checklist" sub="What a discussion needs, measured from the text." className="lg:sticky lg:top-28">
        <ul className="space-y-2">{items.map((i) => <li key={i.label} className="text-sm flex gap-2"><span aria-hidden className={i.ok ? 'text-lab-cdsco' : 'text-lab-amber'}>{i.ok ? '✓' : '✗'}</span><span>{i.label}{!i.ok && <span className="block text-xs text-lab-text-muted">{i.why}</span>}</span></li>)}</ul>
        <p className="text-[11px] text-lab-text-muted">A single trial describes the risks it saw; it cannot show that a medicine is “safe”. Say what happened, how often, and what is still unknown.</p>
      </Panel>
    </div>
  )
}
