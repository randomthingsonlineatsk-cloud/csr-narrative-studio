// Narratives: who needs one, the patient profile and timeline, the safety case, a narrative
// editor with the fixed template or the generator, statements to confirm, and narrative QC.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../state'
import { candidates, primaryKind, profile, challenge, template, draft, narrativeQc, findingKey, medsAtOnset, relevantLabs, studyDay, KIND_LABEL, QC_LABEL, CAUS, type Candidate } from '../domain/narratives'
import { AESI } from '../domain/narratives'
import { missionById } from '../domain/missions'
import { missionCandidates, ARMS, CS7_MINUTES } from '../domain/missions/narr'
import { num, str } from '../domain/sdtm'
import { isLocked } from './Stage'
import { usePatientData } from './usePatient'
import Timeline from './Timeline'
import { Btn, Panel, Pill, Select, Table, TextArea, Tabs } from './ui'

const PROMPT_SPONSOR = /the sponsor assessed it as \[[^\]]*\]\.?/
export default function Narratives() {
  const { p, act } = useStore()
  const d = usePatientData(p)
  const m = p!.mission ? missionById(p!.mission.id) : undefined
  const list = useMemo(() => (d ? (m?.narratives ? missionCandidates(m.id, d) : candidates(d.sdtm)) : []), [d, m])
  const [key, setKey] = useState('')
  const [tab, setTab] = useState<'profile' | 'timeline' | 'case'>('profile')
  const ta = useRef<HTMLTextAreaElement>(null)
  const arms = ARMS[p!.study] ?? []
  const status = (c: Candidate) => { const n = p!.narratives?.[c.key]; if (!n?.text.trim()) return { label: 'to write', tone: 'amber' as const, errors: -1 }; const e = narrativeQc(d!.sdtm, c, n.text, d!.safety, arms, n.queries).filter((x) => x.severity === 'error').length; return e ? { label: `${e} err`, tone: 'red' as const, errors: e } : { label: 'passes QC', tone: 'green' as const, errors: 0 } }
  const cov = d && !m?.narratives ? list.map(status) : []
  const covSig = cov.map((x) => x.errors).join(',')
  useEffect(() => { if (!d || m?.narratives) return; const c = { needed: list.length, written: cov.filter((x) => x.errors >= 0).length, clean: cov.filter((x) => x.errors === 0).length }; const o = p!.coverage; if (!o || o.needed !== c.needed || o.written !== c.written || o.clean !== c.clean) act((x) => { x.coverage = { ...c, utc: new Date().toISOString() } }) }, [d, covSig]) // eslint-disable-line react-hooks/exhaustive-deps
  const [now, setNow] = useState(Date.now())
  useEffect(() => { if (p!.mission?.id !== 'CS7' || p!.mission.submittedUtc) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [p])
  if (!d) return <Panel title="Narratives"><p className="text-sm text-lab-text-muted">Loading the patient data…</p></Panel>
  const c = list.find((x) => x.key === key) ?? list[0]
  if (!c) return <Panel title="Narratives"><p className="text-sm">No patient in this study needs a narrative.</p></Panel>
  const pr = profile(d.sdtm, c.usubjid), ae = pr.ae.find((x) => Number(x.AESEQ) === c.aeseq)!, ch = challenge(pr, ae)
  const sc = d.safety.cases.find((x) => x.usubjid === c.usubjid && (studyDay(x.onset, pr.firstDose) === num(ae.AESTDY) || x.term.toLowerCase() === str(ae.AETERM).toLowerCase()))
  const rec = d.safety.reconciliation.find((x) => x.usubjid === c.usubjid)
  const n = p!.narratives?.[c.key] ?? { text: '', queries: [], updatedUtc: '' }
  const f = n.text.trim() ? narrativeQc(d.sdtm, c, n.text, d.safety, arms, n.queries) : []
  const lock = isLocked(p!.stage) || !!p!.mission?.submittedUtc, noGen = m?.id === 'CS6' || m?.id === 'CS8'
  const set = (fn: (t: string) => string, queries?: string[]) => act((x) => { x.narratives ??= {}; const o = x.narratives[c.key] ?? { text: '', queries: [], updatedUtc: '' }; x.narratives[c.key] = { text: fn(o.text), queries: queries ?? o.queries, updatedUtc: new Date().toISOString() } })
  const insertAt = (s: string, prompt?: RegExp) => set((t) => { if (prompt && prompt.test(t)) return t.replace(prompt, s); const el = ta.current, at = el ? el.selectionStart : t.length; return `${t.slice(0, at)}${at && !/\s$/.test(t.slice(0, at)) ? ' ' : ''}${s}${t.slice(at)}` })
  const left = p!.mission?.id === 'CS7' ? CS7_MINUTES * 60 - Math.floor(((p!.mission.submittedUtc ? Date.parse(p!.mission.submittedUtc) : now) - Date.parse(p!.mission.startedUtc)) / 1000) : null
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)] gap-4 items-start">
      <div className="space-y-2 min-w-0">
        {left !== null && <div role="timer" className={`rounded border px-2 py-1 font-mono text-sm ${left < 0 ? 'border-lab-red text-lab-red' : left < 600 ? 'border-lab-amber text-lab-amber' : 'border-lab-line'}`}>{left < 0 ? `${Math.ceil(-left / 60)} min over time` : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left`}</div>}
        <label className="lg:hidden text-xs text-lab-text-muted">Patient<Select aria-label="Patient" value={c.key} onChange={(e) => setKey(e.target.value)} options={list.map((x) => ({ value: x.key, label: `${x.usubjid.slice(-7)} ${x.pt} · ${status(x).label}` }))} /></label>
        <nav aria-label="Patients who need a narrative" className="hidden lg:block space-y-0.5 text-xs rounded border border-lab-line p-1">
          {list.map((x) => { const s = status(x); return <button key={x.key} onClick={() => setKey(x.key)} aria-current={x.key === c.key ? 'true' : undefined} className={`w-full text-left rounded px-1.5 py-1 ${x.key === c.key ? 'bg-lab-fda-soft text-lab-fda' : 'hover:bg-lab-panel-strong'}`}>
            <span className="flex items-center gap-1"><span className="font-mono">{x.usubjid.slice(-7)}</span><span className="flex-1 truncate">{x.pt}</span><Pill tone={s.tone}>{s.label}</Pill></span>
            <span className="block text-[10px] text-lab-text-muted">{x.kinds.map((k) => KIND_LABEL[k]).join(' · ')}</span></button> })}
        </nav>
        {!m?.narratives && <p className="text-[11px] text-lab-text-muted">{list.length} narratives needed: deaths, serious adverse events, discontinuations because of an adverse event, and events of special interest ({AESI[p!.study]?.label.replace(/^./, (x) => x.toLowerCase())}). {cov.filter((x) => x.errors === 0).length} pass QC.</p>}
      </div>
      <div className="space-y-4 min-w-0">
        <Panel title={`${c.usubjid} · ${c.pt}`} sub={`${pr.arm} · ${c.kinds.map((k) => KIND_LABEL[k]).join(', ')}${rec ? ` · SAE reconciliation: ${rec.status}` : ''}`} right={<Tabs tabs={[{ id: 'profile', label: 'Profile' }, { id: 'timeline', label: 'Timeline' }, { id: 'case', label: 'Safety case' }]} value={tab} onChange={setTab} />}>
          {tab === 'profile' && <div className="space-y-2 text-xs">
            <p>{num(pr.dm.AGE)} years · {str(pr.dm.SEX) === 'F' ? 'female' : 'male'} · {str(pr.dm.RACE).toLowerCase()} · {str(pr.dm.COUNTRY)} · site {str(pr.dm.SITEID)} · first dose Day 1 · last dose Day {Math.max(...pr.ex.map((x) => num(x.EXENDY) ?? 0))}</p>
            <p><b>Medical history:</b> {pr.mh.map((x) => `${str(x.MHDECOD || x.MHTERM)}${x.MHENRTPT ? ` (${str(x.MHENRTPT).toLowerCase()})` : ''}`).join('; ') || 'none recorded'}</p>
            <Table head={['Event (verbatim)', 'Days', 'Severity', 'Serious', 'Related', 'Action', 'Outcome']} rows={pr.ae.map((a) => [<span className={a === ae ? 'font-semibold' : ''}>{str(a.AEDECOD)} <span className="text-lab-text-muted">({str(a.AETERM)})</span></span>, `${num(a.AESTDY)} to ${num(a.AEENDY) ?? '…'}`, str(a.AESEV).toLowerCase(), a.AESER === 'Y' ? `yes${a.AESHOSP === 'Y' ? ', hospital' : ''}${a.AESDTH === 'Y' ? ', death' : ''}` : 'no', str(a.AEREL).toLowerCase(), str(a.AEACN).toLowerCase(), str(a.AEOUT).toLowerCase()])} />
            <Table head={['Study drug', 'Dose', 'Days']} rows={pr.ex.map((x) => [str(x.EXTRT), `${num(x.EXDOSE)} ${str(x.EXDOSU)} ${str(x.EXDOSFRQ)}`, `${num(x.EXSTDY)} to ${num(x.EXENDY) ?? '…'}`])} />
            <Table head={['Medication', 'Dose', 'For', 'Days']} rows={pr.cm.map((x) => [str(x.CMDECOD || x.CMTRT), `${num(x.CMDOSE) ?? ''} ${str(x.CMDOSU)} ${str(x.CMDOSFRQ)}`, str(x.CMINDC), `${num(x.CMSTDY) ?? 'before'} to ${num(x.CMENDY) ?? (str(x.CMENRTPT).toLowerCase() || '…')}`])} empty="No medications." />
            <p><b>At the onset:</b> {medsAtOnset(pr, ae).map((x) => str(x.CMDECOD || x.CMTRT)).join(', ') || 'no other medications'}. <b>Relevant laboratory values:</b> {relevantLabs(pr, ae).map((l) => `${str(l.LBTESTCD)} ${num(l.LBSTRESN)} ${str(l.LBSTRESU)} Day ${num(l.LBDY)} (${num(l.LBSTNRLO) ?? 0}–${num(l.LBSTNRHI)})`).join('; ') || 'none out of range'}</p>
            {pr.ds.length > 0 && <p><b>Disposition:</b> {pr.ds.filter((x) => x.DSCAT === 'DISPOSITION EVENT').map((x) => `${str(x.DSDECOD).toLowerCase()} on Day ${num(x.DSSTDY)}`).join('; ')}</p>}
          </div>}
          {tab === 'timeline' && <Timeline p={pr} selected={ae} />}
          {tab === 'case' && (sc ? <div className="space-y-2 text-xs">
            <Table head={['', 'Clinical database (SDTM)', 'Safety database', '']} rows={[
              ['Case', c.usubjid, sc.caseId, ''],
              ['Event', `${str(ae.AEDECOD)} (${str(ae.AETERM)})`, sc.term, ''],
              ['Onset', `Day ${num(ae.AESTDY)}`, `Day ${studyDay(sc.onset, pr.firstDose)}`, studyDay(sc.onset, pr.firstDose) === num(ae.AESTDY) ? '✓' : '≠'],
              ['Seriousness', [ae.AESHOSP === 'Y' && 'hospitalisation', ae.AESDTH === 'Y' && 'death'].filter(Boolean).join(', '), sc.criteria.map((x) => ({ AESHOSP: 'hospitalisation', AESDTH: 'death', AESLIFE: 'life-threatening', AESMIE: 'medically important', AESDISAB: 'disability', AESCONG: 'congenital anomaly' } as Record<string, string>)[x] ?? x).join(', '), ''],
              ['Outcome', str(ae.AEOUT).toLowerCase(), sc.outcome.toLowerCase(), sc.outcome === str(ae.AEOUT) ? '✓' : '≠'],
              ['Investigator causality', str(ae.AEREL).toLowerCase(), sc.causality.toLowerCase(), sc.causality === str(ae.AEREL) ? '✓' : '≠'],
              ['Sponsor causality', '', sc.sponsorCausality.toLowerCase(), ''],
              ['Action', str(ae.AEACN).toLowerCase(), sc.action.toLowerCase(), sc.action === str(ae.AEACN) ? '✓' : '≠'],
              ['Received by safety', '', `${sc.received} (aware ${sc.aware})`, ''],
            ]} />
            {rec && <p>Reconciliation ({d.safety.source}): <b>{rec.status}</b>{rec.notes.length ? `: ${rec.notes.join('; ')}` : ''}</p>}
            {!lock && <Btn tone="grey" onClick={() => { const w = CAUS[sc.sponsorCausality] ?? sc.sponsorCausality.toLowerCase(); if (PROMPT_SPONSOR.test(n.text)) insertAt(`the sponsor assessed it as ${w}.`, PROMPT_SPONSOR); else insertAt(`The sponsor assessed it as ${w}.`) }}>Insert the sponsor’s causality</Btn>}
          </div> : <p className="text-sm">{ae.AESER === 'Y' ? 'No case for this SAE in the safety database: raise it with the safety team (reconciliation).' : 'Not a serious adverse event: no safety case. The investigator’s causality is in the data.'}</p>)}
        </Panel>
        <Panel title="Narrative" sub="ICH E3 12.3.2: the patient, the event and its course, timing against dosing, relevant tests, action taken and treatment, outcome, and the investigator’s and the sponsor’s opinions on causality. Use study days; no names, initials or dates of birth.">
          {!lock && <div className="flex flex-wrap gap-2">
            <Btn tone="grey" onClick={() => insertAt(template(primaryKind(c)))}>Insert the template</Btn>
            {!noGen && <Btn tone="grey" onClick={() => set(() => draft(d.sdtm, c, sc, false))}>Fill from the data</Btn>}
          </div>}
          {noGen && <p className="text-[11px] text-lab-text-muted">{m?.id === 'CS8' ? 'This mission checks someone else’s narratives: correct the text.' : 'This mission is written from the profile, without the narrative generator.'}</p>}
          <TextArea ref={ta} aria-label={`Narrative for ${c.usubjid}`} readOnly={lock} className="min-h-72 text-sm leading-relaxed" value={n.text} onChange={(e) => set(() => e.target.value)} placeholder="Insert the template or fill from the data, then check every statement." />
          {!lock && (ch.dechallenge.result !== 'not applicable' || ch.rechallenge.result === 'positive' || ch.rechallenge.result === 'negative' || /cannot be assessed/.test(ch.dechallenge.text)) && <div className="rounded border border-lab-line p-2 space-y-1 text-xs">
            <p className="text-lab-text-muted">From the dosing and event dates. Check each against the timeline before you confirm it.</p>
            {[ch.dechallenge, ch.rechallenge].filter((x) => x.result !== 'not applicable').map((x) => <div key={x.text} className="flex flex-wrap items-start gap-2"><span className="flex-1 min-w-[12rem]">{x.text}</span>{n.text.includes(x.text) ? <span className="text-lab-cdsco">in the narrative ✓</span> : <Btn tone="grey" className="py-0.5" onClick={() => insertAt(x.text, /^Dechallenge/.test(x.text) ? /\[Dechallenge statement\.\]/ : /\[Rechallenge statement\.\]/)}>Confirm and insert</Btn>}</div>)}
          </div>}
        </Panel>
        <Panel title="Narrative QC" sub={n.text.trim() ? `${f.filter((x) => x.severity === 'error').length} errors · ${f.filter((x) => x.severity === 'warn').length} warnings` : 'Write the narrative to check it.'}>
          <ul className="space-y-2">{f.map((x, i) => <li key={i} className={`text-xs border-l-2 pl-2 ${x.severity === 'error' ? 'border-lab-red' : 'border-lab-amber'}`}>
            <p className={x.severity === 'error' ? 'text-lab-red' : 'text-lab-amber'}><b>{x.text}</b> · {QC_LABEL[x.kind]}</p><p>{x.message}</p>
            {x.kind === 'contradiction' && !lock && !n.queries.includes(findingKey(x)) && <button className="underline" onClick={() => set((t) => t, [...n.queries, findingKey(x)])}>Raise a data query</button>}</li>)}</ul>
          {n.text.trim() && !f.length && <p className="text-xs text-lab-cdsco">Every fact checked matches the data and the safety case.</p>}
          <p className="text-[11px] text-lab-text-muted">The QC reads ages, days, doses, laboratory values, terms, severity, seriousness, action, outcome and causality, and checks them against this participant’s data; it cannot judge the clinical story. A medical reviewer still reads every narrative.</p>
        </Panel>
      </div>
    </div>
  )
}
