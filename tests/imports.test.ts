import { describe, expect, test } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { redraw, readOutputsFile } from '../src/domain/imports'
import { BUNDLED } from '../src/domain/study'

describe('importing the learner’s own outputs', () => {
  test('a cell is redrawn statistic by statistic', () => {
    expect(redraw('25 (92.6)', [{ stat: 'n', value: 25 }, { stat: 'pct', value: 92.5926 }], [{ stat: 'n', value: 24 }, { stat: 'pct', value: 88.889 }])).toBe('24 (88.9)')
    expect(redraw('<0.001', [{ stat: 'p', value: 0.00001 }], [{ stat: 'p', value: 0.0123 }])).toBe('0.012')
    expect(redraw('<0.001', [{ stat: 'p', value: 0.00001 }], [{ stat: 'p', value: 0.0002 }])).toBe('<0.001')
  })
  const re = BUNDLED['GLV-12-301'].reportingEvent as { analyses: { id: string; results: { analysis: string; rawValue: unknown; operationId: string }[] }[] }
  test('the reference reporting event redraws the same tables', () => {
    const r = readOutputsFile('ars.json', strToU8(JSON.stringify(re)))
    expect(r.changed).toEqual([]); expect(r.missing).toEqual([])
    expect(JSON.stringify(r.data.outputs.map((o) => o.display))).toBe(JSON.stringify(BUNDLED['GLV-12-301'].outputs.map((o) => o.display)))
  })
  test('a changed result shows in the display; a zip package works', () => {
    const mine = structuredClone(re)
    const t4 = mine.analyses.find((a) => a.id === 'AN_T4')!, scr = t4.results.find((x) => x.analysis === 'SCREENED')!
    scr.rawValue = 91
    const r = readOutputsFile('pkg.zip', zipSync({ 'analysis.json': strToU8(JSON.stringify({ format: 'tlf-lab-analysis-package', producer: { project: 'My GLV run' } })), 'ars-reporting-event.json': strToU8(JSON.stringify(mine)) }))
    expect(r.changed).toEqual(['T4'])
    expect(r.data.outputs.find((o) => o.id === 'T4')!.display!.rows.find((x) => x.label === 'Screened')!.cells.at(-1)!.text).toBe('91')
    expect(r.source).toMatch(/My GLV run/)
  })
  test('anything else is refused with a reason', () => {
    expect(() => readOutputsFile('x.json', strToU8('{"a":1}'))).toThrow(/not an analysis results file/)
  })
})
