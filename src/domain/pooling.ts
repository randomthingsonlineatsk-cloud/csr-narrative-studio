// A pooling exercise for an integrated summary of safety (ISS): the two lumiravostat studies,
// HRP-301 (placebo-controlled) and HRP-205 (clobetasol-controlled, stopped early). The learner
// decides which studies belong in which pool, harmonises a term coded differently in the two
// studies, and works out pooled counts; the answers are computed from the studies' own tables.
import { BUNDLED, outputsOf } from './study'
import { tableNumber, isAeSocTable } from './e3'

export const POOL_STUDIES = ['HRP-301', 'HRP-205'] as const
export const ARM = 'Lumiravostat 25 mg'
/** One term in each study for the same kind of event, before harmonisation. */
export const LIVER = { 'HRP-301': 'Liver enzymes raised', 'HRP-205': 'ALT increased' } as const

function aeTable(study: string) {
  const o = outputsOf(BUNDLED[study]).find(isAeSocTable)!
  return o.display!
}
/** Participants with the event (n) and the participants in the group (N) for one study and group. */
export function countOf(study: string, group: string, row: string | RegExp): { n: number; N: number } {
  const d = aeTable(study), gi = d.groups.indexOf(group)
  const head = d.head[gi] ?? '', hn = /N=(\d+)/.exec(head)
  const N = hn ? Number(hn[1]) : Number(BUNDLED[study].outputs.find((o) => tableNumber(o.title) === '14.1.1')?.display?.rows.find((r) => r.label === 'Randomised')?.cells[gi]?.text ?? 0)
  const r = d.rows.find((x) => (typeof row === 'string' ? x.label === row : row.test(x.label)))
  const n = r ? Number((r.cells[gi]?.text ?? '0').split(' ')[0]) || 0 : 0
  return { n, N }
}
const pct = (n: number, N: number) => Math.round((1000 * n) / N) / 10

export interface PoolRow { label: string; s301: { n: number; N: number }; s205: { n: number; N: number }; pooled: { n: number; N: number; pct: number } }
/** The pooled lumiravostat 25 mg table (all-exposure pool). */
export function pooledTable(): PoolRow[] {
  const rows: [string, string | RegExp, string | RegExp][] = [
    ['Any treatment-emergent adverse event', /at least one TEAE/, /at least one TEAE/],
    ['Upper respiratory tract infection', 'Upper respiratory tract infection', 'Upper respiratory tract infection'],
    ['Head pain', 'Head pain', 'Head pain'],
    ['Nausea', 'Nausea', 'Nausea'],
    ['Liver test increased (harmonised)', LIVER['HRP-301'], LIVER['HRP-205']],
  ]
  return rows.map(([label, a, b]) => { const s301 = countOf('HRP-301', ARM, a), s205 = countOf('HRP-205', ARM, b), n = s301.n + s205.n, N = s301.N + s205.N; return { label, s301, s205, pooled: { n, N, pct: pct(n, N) } } })
}

export interface PoolQ { id: string; q: string; kind: 'choice' | 'number'; options?: string[]; answer: number; why: string; tol?: number }
export function poolQuestions(): PoolQ[] {
  const t = pooledTable(), row = (l: string) => t.find((r) => r.label.startsWith(l))!
  return [
    { id: 'pbo', kind: 'choice', q: 'Which studies form the placebo-controlled pool?', options: ['HRP-301 only', 'HRP-301 and HRP-205', 'HRP-205 only'], answer: 0, why: 'Only HRP-301 has a placebo group. HRP-205 compared lumiravostat with clobetasol cream.' },
    { id: 'ctl', kind: 'choice', q: 'Can placebo (HRP-301) and clobetasol (HRP-205) be added together as one “control” column?', options: ['No: they are different comparators, with different expected events', 'Yes: both are controls', 'Yes, if the numbers are similar'], answer: 0, why: 'Clobetasol has its own adverse events (skin thinning). Pool the active drug across studies; keep comparators apart.' },
    { id: 'N', kind: 'number', q: `How many participants are in the pooled lumiravostat 25 mg group (both studies)?`, answer: row('Any').pooled.N, why: `${row('Any').s301.N} in HRP-301 plus ${row('Any').s205.N} in HRP-205.` },
    { id: 'any', kind: 'number', q: 'How many of them had at least one treatment-emergent adverse event?', answer: row('Any').pooled.n, why: `${row('Any').s301.n} + ${row('Any').s205.n} = ${row('Any').pooled.n} (${row('Any').pooled.pct}%).` },
    { id: 'nausea', kind: 'number', q: 'What percentage had nausea in the pooled 25 mg group? (one decimal)', answer: row('Nausea').pooled.pct, tol: 0.1, why: `${row('Nausea').s301.n} + ${row('Nausea').s205.n} = ${row('Nausea').pooled.n} of ${row('Nausea').pooled.N}: ${row('Nausea').pooled.pct}%.` },
    { id: 'code', kind: 'choice', q: `Liver test rises were coded “${LIVER['HRP-301']}” in HRP-301 and “${LIVER['HRP-205']}” in HRP-205. What comes first?`, options: ['Harmonise the coding: one dictionary version and one term for the pool', 'Count them as two different events', 'Leave the HRP-205 events out'], answer: 0, why: 'An integrated summary recodes every study to one dictionary version, so the same event is counted once under one term.' },
    { id: 'liver', kind: 'number', q: 'After harmonising, how many participants on lumiravostat 25 mg had a liver test rise?', answer: row('Liver').pooled.n, why: `${row('Liver').s301.n} in HRP-301 (its one event was on placebo) plus ${row('Liver').s205.n} in HRP-205.` },
    { id: 'where', kind: 'choice', q: 'Where does the integrated summary of safety sit in eCTD?', options: ['5.3.5.3, summarised in 2.7.4', '5.3.5.1, with each study', 'Module 1'], answer: 0, why: 'Reports of analyses of data from more than one study.' },
  ]
}
export function scorePool(ans: Record<string, number | string>) {
  const qs = poolQuestions()
  return qs.filter((q) => { const a = ans[q.id]; if (a === undefined || a === '') return false; return q.kind === 'choice' ? Number(a) === q.answer : Math.abs(Number(String(a).replace(',', '.')) - q.answer) <= (q.tol ?? 0) }).length
}
