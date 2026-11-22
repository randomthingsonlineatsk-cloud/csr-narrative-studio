import { useState } from 'react'
import { useStore } from '../state'
import { LESSONS } from '../domain/learn'
import { pooledTable, poolQuestions, scorePool, POOL_STUDIES } from '../domain/pooling'
import { download } from '../domain/store'
import { Btn, Panel, Pill, Table } from './ui'

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
        <button onClick={() => setId('pool')} aria-current={id === 'pool' ? 'page' : undefined} className={`w-full text-left rounded px-2 py-1.5 text-sm border ${id === 'pool' ? 'border-lab-fda text-lab-fda' : 'border-transparent hover:border-lab-line'}`}>
          Practice: pool two studies (ISS){progress.drills.pool && <span className="ml-1"><Pill tone={progress.drills.pool.score === 8 ? 'green' : 'amber'}>{`${progress.drills.pool.score}/8`}</Pill></span>}
        </button></nav>
      {id === 'pool' ? <Pool /> : <div className="space-y-3 min-w-0">
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
