import { describe, expect, test } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { scoreMission, startMission, scoreOf } from '../src/domain/missions'
import { loadPatientData } from '../src/domain/sdtm'
import { DEFAULT_DISCLOSURE, risk } from '../src/domain/disclosure'
import { readOutputsFile } from '../src/domain/imports'
import type { Project } from '../src/domain/types'

describe('CS12: redact the CSR for public release', () => {
  test('starts approved with identifiers and CCI candidates; a complete disclosure scores 100', async () => {
    const d = await loadPatientData('GLV-12-301'), p = startMission('CS12', d)
    expect(p.stage).toBe('approved')
    expect(Object.keys(p.narratives!)).toHaveLength(10)
    expect(scoreOf(scoreMission(p, d))).toBeLessThan(40)
    expect(risk(d, { age: 'drop', sex: 'keep', race: 'drop', country: 'drop' }).risk).toBe(0.03)
    p.disclosure = { ...DEFAULT_DISCLOSURE(), routes: ['ctis', 'ema', 'hc'], rules: { subject: 'pseudonymise', date: 'offset', name: 'redact', site: 'generalise', age: 'redact', race: 'redact' }, qi: { age: 'drop', sex: 'keep', race: 'drop', country: 'drop' },
      cci: { assay: { propose: true, reason: 'The sponsor’s own LC-MS/MS method, used by no other laboratory.' } }, utility: 'Intervals between events are kept by one date offset; doses, outcomes and every aggregate result are unchanged; age is in the tables only.' }
    expect(scoreMission(p, d).filter((i) => !i.ok)).toEqual([])
  })
})

describe('CS15: the capstone', () => {
  test('starts as an empty HRP-301 report and scores low', () => {
    const p = startMission('CS15')
    expect(p.study).toBe('HRP-301')
    const items = scoreMission(p)
    expect(items).toHaveLength(12)
    expect(items.filter((i) => i.ok).map((i) => i.label)).toEqual(['Review comments resolved'])
  })
  test('the learner’s own package and the hand-offs count only after approval', () => {
    const PKG = '../pharmolecule/tests/fixtures/hrp301_analysis_package.zip'
    if (!existsSync(PKG)) return
    const p: Project = startMission('CS15'), r = readOutputsFile('pkg.zip', new Uint8Array(readFileSync(PKG)))
    p.outputs = r.data; p.outputsFrom = r.provenance
    p.handoffs = { ectd: { version: 1, stage: 'draft', utc: '' } }
    const s = Object.fromEntries(scoreMission(p).map((i) => [i.label, i.ok]))
    expect(s['Your own analysis package']).toBe(true)
    expect(s['Handed to the eCTD Dossier Builder']).toBe(false)
  })
})
