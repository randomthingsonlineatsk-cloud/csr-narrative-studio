import { expect, test } from 'vitest'
import { pooledTable, poolQuestions, scorePool } from '../src/domain/pooling'

test('the pooled lumiravostat 25 mg table comes from both studies’ tables', () => {
  const t = Object.fromEntries(pooledTable().map((r) => [r.label, r]))
  expect(t['Any treatment-emergent adverse event'].pooled).toEqual({ n: 19, N: 34, pct: 55.9 })
  expect(t['Nausea'].pooled).toEqual({ n: 5, N: 34, pct: 14.7 })
  expect(t['Liver test increased (harmonised)'].s301.n).toBe(0)
  expect(t['Liver test increased (harmonised)'].pooled.n).toBe(2)
})
test('scoring', () => {
  const right = Object.fromEntries(poolQuestions().map((q) => [q.id, q.answer]))
  expect(scorePool(right)).toBe(8)
  expect(scorePool({ ...right, nausea: '14,7', N: 33 })).toBe(7)
})
