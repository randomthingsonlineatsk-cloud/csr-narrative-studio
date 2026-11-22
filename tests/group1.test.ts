import { expect, test } from 'vitest'
import { BUNDLED } from '../src/domain/study'
import { flowOf, flowChecks, flowSvg } from '../src/domain/consort'
import { liverScreen, liverItems } from '../src/domain/liver'
import { loadPatientData } from '../src/domain/sdtm'
import { drillRows, pick, markSentence, modelSentence, spot } from '../src/domain/drills'
import { newProject } from '../src/domain/project'
import { noteBasis, staleSections, synopsisLength } from '../src/domain/stale'

test('the CONSORT flow comes from 14.1.1 and adds up for all three studies', () => {
  for (const s of ['HRP-301', 'GLV-12-301', 'HRP-205']) {
    const f = flowOf(BUNDLED[s])!
    expect(f.arms.length).toBe(BUNDLED[s].groups.length)
    expect(flowChecks(f).every((c) => c.ok), s + JSON.stringify(flowChecks(f).filter((c) => !c.ok))).toBe(true)
    expect(flowSvg(f)).toContain(`Randomised (n=${f.randomised})`)
  }
  const h = flowOf(BUNDLED['HRP-301'])!; expect([h.screened, h.failures, h.randomised]).toEqual([48, 3, 45])
})
test('a broken disposition table fails its flow checks', () => {
  const d = structuredClone(BUNDLED['HRP-301']); const t = d.outputs.find((o) => o.id === 'T5')!.display!
  t.rows.find((r) => r.label === 'Completed the study')!.cells[0].text = '12 (80.0)'
  expect(flowChecks(flowOf(d)!).filter((c) => !c.ok).map((c) => c.label)).toEqual(['Placebo: completed plus discontinued equals randomised'])
})
test('the liver screen finds HRP-301’s one placebo rise, with bilirubin below 2 × ULN: no Hy’s law', async () => {
  const { sdtm } = await loadPatientData('HRP-301'), sc = liverScreen(sdtm, BUNDLED['HRP-301'].groups)
  expect(sc.bilirubin).toBe(true)
  expect(sc.groups.map((g) => g.bili2)).toEqual([0, 0, 0])
  expect(sc.peaks[0].bili).toBeGreaterThan(1); expect(sc.peaks[0].bili).toBeLessThan(2)
  expect(sc.groups.map((g) => g.gt3)).toEqual([1, 0, 0])
  expect(sc.groups.map((g) => g.gt5)).toEqual([1, 0, 0])
  expect(sc.potentialHy).toEqual([])
  const good = 'Alanine aminotransferase (ALT) rose above 3 × ULN in 1 participant on placebo and in none on lumiravostat. No participant met the potential Hy’s law criteria: total bilirubin stayed below 2 × ULN in every participant.'
  expect(liverItems(good, sc).every((i) => i.ok)).toBe(true)
  expect(liverItems('Liver tests were unremarkable.', sc).filter((i) => !i.ok).length).toBe(3)
  const g = await loadPatientData('GLV-12-301'), sg = liverScreen(g.sdtm, BUNDLED['GLV-12-301'].groups)
  expect(sg.bilirubin).toBe(true); expect(sg.potentialHy).toEqual([])
})
test('drills: rows, the model sentence passes, a wrong sentence fails, planted errors', () => {
  expect(drillRows().length).toBeGreaterThan(20)
  for (const d of pick(7)) {
    expect(markSentence(d, modelSentence(d)).ok, modelSentence(d)).toBe(true)
    const s = spot(d, 3); expect(s.wrong.length).toBeGreaterThan(0)
    expect(markSentence(d, s.text).ok).toBe(false)
  }
})
test('out-of-date marking and the synopsis length', () => {
  const p = newProject('t', 'HRP-301')
  p.sections['10.1'].text = 'Of 45 randomised participants, 42 completed [T14.1.1].'; noteBasis(p, '10.1')
  expect(staleSections(p)).toEqual([])
  p.outputs = structuredClone(BUNDLED['HRP-301']); p.outputs.outputs.find((o) => o.id === 'T5')!.display!.rows[3].cells[0].text = '14 (93.3)'
  expect(staleSections(p).map((s) => [s.section, s.changed])).toEqual([['10.1', ['14.1.1']]])
  noteBasis(p, '10.1'); expect(staleSections(p)).toEqual([])
  p.sections['2'].text = 'word '.repeat(1600); expect(synopsisLength(p)).toMatchObject({ words: 1600, ok: false })
})
test('an event-driven (oncology) disposition table draws and checks', () => {
  const f = flowOf(BUNDLED['ONK-44-302'])!
  expect(f.eventDriven).toBe(true)
  expect(flowChecks(f).every((c) => c.ok)).toBe(true)
  expect(flowSvg(f)).toContain('At the data cut-off')
})
