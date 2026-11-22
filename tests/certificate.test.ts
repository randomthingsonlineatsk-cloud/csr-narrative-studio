import { expect, test } from 'vitest'
import { existsSync, writeFileSync } from 'node:fs'
import { certificate, passportRecord, certificateHtml, REQUIRED, sealOf } from '../src/domain/certificate'
import { MISSIONS, levelOf } from '../src/domain/missions'
import { LESSONS } from '../src/domain/learn'
import type { Progress } from '../src/domain/types'

const who = { name: 'Asha Rao', userId: 'U-test-0001' }
const prog = (missions: Record<string, number>, quiz = 8): Progress => ({ id: 'me', userId: who.userId, classId: '', quizzes: Object.fromEntries(LESSONS.map((l) => [l.id, { score: quiz, of: 8, utc: '' }])), drills: {}, missions: Object.fromEntries(Object.entries(missions).map(([k, v]) => [k, { score: v, utc: '' }])) })

test('levels and the core missions', () => {
  expect([levelOf(79), levelOf(80), levelOf(100)]).toEqual(['not yet', 'passed', 'expert'])
  expect(REQUIRED).toEqual(['CS1', 'CS2', 'CS4', 'CS5', 'CS6', 'CS12'])
  expect(MISSIONS).toHaveLength(18)
})
test('certificate, distinction and the passport record (fixtures for the hub)', () => {
  const partial = certificate(prog({ CS1: 100, CS2: 90 }), who)
  expect(partial.eligible).toBe(false)
  const core = certificate(prog(Object.fromEntries(REQUIRED.map((id) => [id, 85]))), who)
  expect(core.eligible).toBe(true); expect(core.distinction).toBe(false)
  expect(core.code).toMatch(/^CS-[0-9A-F]{5}-[0-9A-F]{5}$/)
  const all = certificate(prog(Object.fromEntries(MISSIONS.map((m, i) => [m.id, i < 3 ? 100 : 85]))), who)
  expect(all.distinction).toBe(true)
  const rec = passportRecord(core, who, '2026-11-22')
  expect(rec.seal).toBe(sealOf(rec))
  expect(certificateHtml(core, who, '2026-11-22')).toContain(core.code)
  if (existsSync('../pharmolecule/tests/fixtures')) {
    writeFileSync('../pharmolecule/tests/fixtures/cs.json', JSON.stringify(rec, null, 1))
    writeFileSync('../pharmolecule/tests/fixtures/cs-partial.json', JSON.stringify(passportRecord(partial, who, '2026-11-22'), null, 1))
  }
})
