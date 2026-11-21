import { describe, expect, test } from 'vitest'
import glvS from '../src/data/sdtm-glv-12-301.json'
import hrpS from '../src/data/sdtm-hrp-301.json'
import glvC from '../src/data/cases-glv-12-301.json'
import cdm from '../src/data/cdm-hrp-301.json'
import { startMission, scoreMission, scoreOf } from '../src/domain/missions'
import { missionCandidates, modelNarratives, cs8Planted, ARMS } from '../src/domain/missions/narr'
import { narrativeQc, findingKey, template, primaryKind } from '../src/domain/narratives'
import type { Sdtm, Safety } from '../src/domain/sdtm'

const GLV = { sdtm: glvS as unknown as Sdtm, safety: glvC as unknown as Safety }
const HRP = { sdtm: hrpS as unknown as Sdtm, safety: { source: '', cases: (cdm as any).sae.cases, reconciliation: (cdm as any).sae.reconciliation } as Safety }
const fail = (items: { ok: boolean; label: string; why: string }[]) => items.filter((i) => !i.ok).map((i) => `${i.label}: ${i.why}`)

describe('narrative missions', () => {
  test('CS6: templates score 0; the model narratives with the two data queries score 100', () => {
    const p = startMission('CS6', HRP)
    const cs = missionCandidates('CS6', HRP)
    expect(cs).toHaveLength(4)
    p.narratives = Object.fromEntries(cs.map((c) => [c.key, { text: template(primaryKind(c)), queries: [], updatedUtc: '' }]))
    expect(scoreOf(scoreMission(p, HRP))).toBe(0)
    for (const { c, text } of modelNarratives('CS6', HRP)) {
      const q = narrativeQc(HRP.sdtm, c, text, HRP.safety, ARMS['HRP-301']).filter((x) => x.kind === 'contradiction').map(findingKey)
      p.narratives![c.key] = { text, queries: q, updatedUtc: '' }
    }
    expect(fail(scoreMission(p, HRP))).toEqual([])
  })
  test('CS7: ten model narratives in time score 100; over the clock does not', () => {
    const p = startMission('CS7', GLV)
    expect(missionCandidates('CS7', GLV)).toHaveLength(10)
    p.narratives = Object.fromEntries(modelNarratives('CS7', GLV).map(({ c, text }) => [c.key, { text, queries: [], updatedUtc: '' }]))
    expect(fail(scoreMission(p, GLV))).toEqual([])
    p.mission!.startedUtc = new Date(Date.now() - 61 * 60000).toISOString()
    expect(fail(scoreMission(p, GLV)).map((x) => x.split(':')[0])).toEqual(['Within 60 minutes'])
  })
  test('CS8: the colleague’s drafts score 0 and every planted error is caught by QC; the models score 100', () => {
    const p = startMission('CS8', GLV)
    expect(scoreOf(scoreMission(p, GLV))).toBe(0)
    const P = cs8Planted(GLV)
    expect(P).toHaveLength(12)
    for (const x of P) {
      const c = missionCandidates('CS8', GLV).find((y) => y.usubjid === x.usubjid)!
      const model = modelNarratives('CS8', GLV).find((m) => m.c.key === c.key)!.text
      const f = narrativeQc(GLV.sdtm, c, model.replace(x.from, x.to), GLV.safety, ARMS['GLV-12-301']).filter((y) => y.severity === 'error')
      expect(f.length, `error ${x.n} ${x.kind}`).toBeGreaterThan(0)
    }
    for (const { c, text } of modelNarratives('CS8', GLV)) p.narratives![c.key] = { text, queries: [], updatedUtc: '' }
    expect(fail(scoreMission(p, GLV))).toEqual([])
  })
})

import { readCdmExport } from '../src/domain/sdtm'
test('the CDM Console export and a safety cases file are both read; other files are refused', () => {
  expect(readCdmExport(JSON.stringify(cdm), 'HRP-301').cases).toHaveLength(4)
  expect(readCdmExport(JSON.stringify(glvC), 'GLV-12-301').cases).toHaveLength(7)
  expect(() => readCdmExport(JSON.stringify(cdm), 'GLV-12-301')).toThrow(/for HRP-301/)
  expect(() => readCdmExport('{"a":1}', 'HRP-301')).toThrow(/neither/)
})
