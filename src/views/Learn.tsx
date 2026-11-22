import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state'
import { LESSONS } from '../domain/learn'
import { pooledTable, poolQuestions, scorePool, POOL_STUDIES } from '../domain/pooling'
import { download } from '../domain/store'
import { markSentence, modelSentence, pick, spot, ROUNDS, type DrillRow } from '../domain/drills'
import OutputView from './OutputView'
import { TextArea } from './ui'
import { Btn, Panel, Pill, Table } from './ui'

const EXTRAS = [{ id: 'sentence', title: 'Drill: one sentence from one table', of: ROUNDS }, { id: 'spot', title: 'Drill: spot the error', of: ROUNDS }, { id: 'pool', title: 'Practice: pool two studies (ISS)', of: 8 }]

export default function Learn() {
  const { progress, record } = useStore()
  const [id, setId] = useState<string>(LESSONS[0].id)
  const [ans, setAns] = useState<Record<number, number>>({})
  const l = LESSONS.find((x) => x.id === id) ?? LESSONS[0], done = Object.keys(ans).length === l.quiz.length
  const score = l.quiz.filter((q, i) => ans[i] === q.answer).length
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)] gap-4">
      <nav aria-label="Lessons" className="space-y-1">{LESSONS.map((x) => { const q = progress.quizzes[x.id]; return (
        <button key={x.id} onClick={() => { setId(x.id); setAns({}) }} aria-current={x.id === id ? 'page' : undefined} className={`w-full text-left rounded px-2 py-1.5 text-sm border ${x.id === id ? 'border-lab-fda text-lab-fda' : 'border-transparent hover:border-lab-line'}`}>
          {x.title}{q && <span className="ml-1"><Pill tone={q.score === q.of ? 'green' : 'amber'}>{`${q.score}/${q.of}`}</Pill></span>}
        </button>) })}
        {EXTRAS.map((x) => { const r = progress.drills[x.id]; return <button key={x.id} onClick={() => setId(x.id)} aria-current={id === x.id ? 'page' : undefined} className={`w-full text-left rounded px-2 py-1.5 text-sm border ${id === x.id ? 'border-lab-fda text-lab-fda' : 'border-transparent hover:border-lab-line'}`}>
          {x.title}{r && <span className="ml-1"><Pill tone={r.score === x.of ? 'green' : 'amber'}>{`${r.score}/${x.of}`}</Pill></span>}
        </button> })}</nav>
      {id === 'pool' ? <Pool /> : id === 'sentence' ? <SentenceDrill /> : id === 'spot' ? <SpotDrill /> : <div className="space-y-3 min-w-0">
        <Panel title={l.title}>{l.paras.map((p, i) => <p key={i} className="text-sm leading-relaxed">{p}</p>)}<div className="rounded border border-lab-ema/50 bg-lab-ema-soft p-2 text-sm"><b>Worked example:</b> {l.example}</div></Panel>
        <Panel title="Quiz" sub={`${l.quiz.length} questions. Answer them all to see the explanations.`}>
          {l.quiz.map((q, i) => (
            <fieldset key={i} className="space-y-1"><legend className="text-sm font-semibold">{i + 1}. {q.q}</legend>
              {q.options.map((o, k) => <label key={k} className="flex gap-2 text-sm"><input type="radio" name={`q${i}`} checked={ans[i] === k} onChange={() => setAns({ ...ans, [i]: k })} />{o}{done && k === q.answer && <span className="text-lab-cdsco" aria-label="correct answer">✓</span>}</label>)}
              {done && <p className={`text-xs ${ans[i] === q.answer ? 'text-lab-cdsco' : 'text-lab-amber'}`}>{q.why}</p>}
            </fieldset>))}
          <Btn disabled={!done} onClick={() => record((g) => { g.quizzes[l.id] = { score, of: l.quiz.length, utc: new Date().toISOString() } })}>Save my result ({done ? `${score}/${l.quiz.length}` : `answer all ${l.quiz.length}`})</Btn>
        </Panel>
      </div>}
    </div>
  )
}

function Pool() {
  const { record } = useStore()
  const [ans, setAns] = useState<Record<string, string>>({})
  const qs = poolQuestions(), done = qs.every((q) => (ans[q.id] ?? '') !== ''), score = scorePool(ans)
  const t = pooledTable(), cell = (x: { n: number; N: number }) => `${x.n} (${(Math.round((1000 * x.n) / x.N) / 10).toFixed(1)})`
  const csv = () => ['Event,HRP-301 25 mg n (%),HRP-205 25 mg n (%),Pooled 25 mg n (%)', `N,${t[0].s301.N},${t[0].s205.N},${t[0].pooled.N}`, ...t.map((r) => `"${r.label}",${cell(r.s301)},${cell(r.s205)},${cell(r.pooled)}`)].join('\n')
  return (
    <div className="space-y-3 min-w-0">
      <Panel title="Practice: pool two studies for an integrated summary of safety" sub={`${POOL_STUDIES.join(' and ')}: both tested lumiravostat 25 mg in hand eczema, one against placebo and one against clobetasol cream.`}>
        <p className="text-sm leading-relaxed">An integrated summary of safety (ISS) pools the same drug across studies so that rarer events show up. Each study’s own report stays as it is; the pool is a new analysis with its own plan. Decide which studies go into which pool, recode the events to one dictionary version, then count. The answers come from each study’s table 14.3.1 in this app.</p>
      </Panel>
      <Panel title="Questions" sub="Numbers as whole counts, or a percentage to one decimal. Answer them all to see the explanations and the pooled table.">
        {qs.map((q, i) => <fieldset key={q.id} className="space-y-1"><legend className="text-sm font-semibold">{i + 1}. {q.q}</legend>
          {q.kind === 'choice' ? q.options!.map((o, k) => <label key={k} className="flex gap-2 text-sm"><input type="radio" name={`pool-${q.id}`} checked={ans[q.id] === String(k)} onChange={() => setAns({ ...ans, [q.id]: String(k) })} />{o}{done && k === q.answer && <span className="text-lab-cdsco" aria-label="correct answer">✓</span>}</label>)
            : <input aria-label={`Answer ${i + 1}`} inputMode="decimal" className="w-28 rounded border border-lab-line bg-transparent px-2 py-1 text-sm" value={ans[q.id] ?? ''} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} />}
          {done && <p className={`text-xs ${scorePool({ [q.id]: ans[q.id] }) ? 'text-lab-cdsco' : 'text-lab-amber'}`}>{q.kind === 'number' ? `Answer: ${q.answer}. ` : ''}{q.why}</p>}
        </fieldset>)}
        <Btn disabled={!done} onClick={() => record((g) => { g.drills.pool = { score, utc: new Date().toISOString() } })}>Save my result ({done ? `${score}/${qs.length}` : `answer all ${qs.length}`})</Btn>
      </Panel>
      {done && <Panel title="The pooled table: lumiravostat 25 mg, all studies" sub="Participants with at least one event, n (%). The liver row counts both studies’ terms as one, after harmonisation." right={<Btn tone="grey" onClick={() => download('iss-pool-lumiravostat-25mg.csv', csv(), 'text/csv')}>Download CSV</Btn>}>
        <Table head={['Event', `HRP-301 (N=${t[0].s301.N})`, `HRP-205 (N=${t[0].s205.N})`, `Pooled (N=${t[0].pooled.N})`]} rows={t.map((r) => [r.label, cell(r.s301), cell(r.s205), <b key="p">{cell(r.pooled)}</b>])} />
      </Panel>}
    </div>
  )
}

/** A clock for the drills: seconds since the round set began. */
function useClock(running: boolean) {
  const [t0] = useState(() => Date.now()), [, tick] = useState(0)
  useEffect(() => { if (!running) return; const h = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(h) }, [running])
  return Math.round((Date.now() - t0) / 1000)
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function DrillShell({ title, sub, round, total, secs, children, done, score, onSave, onAgain }: { title: string; sub: string; round: number; total: number; secs: number; children: React.ReactNode; done: boolean; score: number; onSave: () => void; onAgain: () => void }) {
  return (
    <div className="space-y-3 min-w-0">
      <Panel title={title} sub={sub} right={<span className="font-mono text-sm" aria-label="Time">{fmt(secs)}</span>}>
        <p className="text-xs text-lab-text-muted">{done ? `Done: ${score} of ${total} in ${fmt(secs)}. A writer aims for a minute or less a sentence.` : `Round ${round + 1} of ${total}.`}</p>
        {children}
        {done && <div className="flex gap-2"><Btn onClick={onSave}>Save my result ({score}/{total})</Btn><Btn tone="grey" onClick={onAgain}>New set</Btn></div>}
      </Panel>
    </div>
  )
}

function SentenceDrill() {
  const { record } = useStore()
  const [seed, setSeed] = useState(() => Date.now() % 100000)
  return <SentenceRounds key={seed} rounds={pick(seed)} onAgain={() => setSeed(Date.now() % 100000)} save={(score) => record((g) => { g.drills.sentence = { score, utc: new Date().toISOString() } })} />
}
function SentenceRounds({ rounds, onAgain, save }: { rounds: DrillRow[]; onAgain: () => void; save: (n: number) => void }) {
  const [i, setI] = useState(0), [text, setText] = useState(''), [res, setRes] = useState<ReturnType<typeof markSentence> | null>(null), [score, setScore] = useState(0)
  const done = i >= rounds.length, secs = useClock(!done), d = rounds[Math.min(i, rounds.length - 1)]
  return (
    <DrillShell title="Drill: one sentence from one table" sub="Write one results sentence for the row named below: every group’s n and percentage, the group named beside each, and the table reference. The checker marks it." round={i} total={rounds.length} secs={secs} done={done} score={score} onSave={() => save(score)} onAgain={onAgain}>
      {!done && <>
        <p className="text-sm"><b>{d.study}</b>, Table {d.table}, row <b>“{d.context ? `${d.context}: ` : ''}{d.row}”</b></p>
        <details className="text-xs" open><summary className="cursor-pointer text-lab-text-muted">The table</summary><div className="max-h-72 overflow-y-auto"><OutputView o={d.out} /></div></details>
        <TextArea aria-label="Your sentence" className="min-h-20 text-sm" value={text} disabled={!!res} onChange={(e) => setText(e.target.value)} placeholder={`For example: … on ${d.cells[0].group} … [T${d.table}].`} />
        {!res ? <Btn disabled={!text.trim()} onClick={() => { const r = markSentence(d, text); setRes(r); if (r.ok) setScore((x) => x + 1) }}>Check</Btn> : <>
          <p className={`text-sm ${res.ok ? 'text-lab-cdsco' : 'text-lab-amber'}`}>{res.ok ? '✓ Every number is right and tied to its cell.' : 'Not yet.'}</p>
          {res.missing.length > 0 && <p className="text-xs">Missing or not tied: {res.missing.join('; ')}.</p>}
          {res.errors.length > 0 && <ul className="text-xs list-disc pl-4">{res.errors.map((e, k) => <li key={k}>{e}</li>)}</ul>}
          {!res.ok && <p className="text-xs text-lab-text-muted">One way to write it: {modelSentence(d)}</p>}
          <Btn onClick={() => { setI(i + 1); setText(''); setRes(null) }}>{i + 1 < rounds.length ? 'Next row' : 'Finish'}</Btn>
        </>}
      </>}
    </DrillShell>
  )
}

function SpotDrill() {
  const { record } = useStore()
  const [seed, setSeed] = useState(() => Date.now() % 100000)
  return <SpotRounds key={seed} seed={seed} onAgain={() => setSeed(Date.now() % 100000)} save={(score) => record((g) => { g.drills.spot = { score, utc: new Date().toISOString() } })} />
}
function SpotRounds({ seed, onAgain, save }: { seed: number; onAgain: () => void; save: (n: number) => void }) {
  const items = useMemo(() => pick(seed + 1).map((d, k) => spot(d, seed + k)), [seed])
  const [i, setI] = useState(0), [ans, setAns] = useState<number | null>(null), [score, setScore] = useState(0)
  const done = i >= items.length, secs = useClock(!done), x = items[Math.min(i, items.length - 1)]
  return (
    <DrillShell title="Drill: spot the error" sub="Each sentence has one error against its table: a wrong value, a percentage that does not follow from its n, or two groups’ values swapped. Pick the wrong number." round={i} total={items.length} secs={secs} done={done} score={score} onSave={() => save(score)} onAgain={onAgain}>
      {!done && <>
        <p className="text-sm"><b>{x.d.study}</b> · “{x.text}”</p>
        <details className="text-xs"><summary className="cursor-pointer text-lab-text-muted">The table</summary><div className="max-h-72 overflow-y-auto"><OutputView o={x.d.out} /></div></details>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Which number is wrong?">{x.numbers.map((n, k) => <Btn key={k} tone={ans === k ? 'solid' : 'grey'} disabled={ans !== null} onClick={() => { setAns(k); if (x.wrong.includes(k)) setScore((s) => s + 1) }}>{n}</Btn>)}</div>
        {ans !== null && <>
          <p className={`text-sm ${x.wrong.includes(ans) ? 'text-lab-cdsco' : 'text-lab-amber'}`}>{x.wrong.includes(ans) ? '✓ Found it.' : `Not that one: ${x.wrong.map((w) => x.numbers[w]).join(' or ')}.`} {x.why}</p>
          <Btn onClick={() => { setI(i + 1); setAns(null) }}>{i + 1 < items.length ? 'Next sentence' : 'Finish'}</Btn>
        </>}
      </>}
    </DrillShell>
  )
}
