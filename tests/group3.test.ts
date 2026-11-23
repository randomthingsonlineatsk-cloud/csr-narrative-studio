import { expect, test } from 'vitest'
import { newProject } from '../src/domain/project'
import { BUNDLED, outputsOf } from '../src/domain/study'
import { checkText } from '../src/domain/checker'
import { loadPatientData } from '../src/domain/sdtm'
import { trace } from '../src/domain/trace'

const find = (p: ReturnType<typeof newProject>, sec: string, text: string, num: string) => {
  p.sections[sec].text = text; const d = BUNDLED[p.study]
  return checkText(sec, text, outputsOf(d), p.sections[sec].slots, d.groups, p.rounding).find((f) => f.text === num)!
}
test('trace: a demographic percentage down to ADSL and the form', async () => {
  const p = newProject('t', 'HRP-301'), { sdtm } = await loadPatientData('HRP-301')
  const f = find(p, '11.2', 'In the placebo group, 9 (60.0%) participants were female [T14.1.2].', '60.0')
  const st = trace(p, f, sdtm)
  expect(st.map((s) => s.level)).toEqual(['Report', 'Table', 'Analysis result (ARS)', 'Analysis data (ADaM)', 'Collected data (SDTM)', 'eCRF'])
  expect(st.filter((s) => s.ok === false)).toEqual([])
  expect(st[3].subjects!.length).toBe(9)
})
test('trace: an adverse event count down to the AE domain', async () => {
  const p = newProject('t', 'HRP-301'), { sdtm } = await loadPatientData('HRP-301')
  const f = find(p, '12.2.2', 'Upper respiratory tract infection was reported by 3 (18.8%) participants on lumiravostat 25 mg [T14.3.1].', '3')
  const st = trace(p, f, sdtm); const s = st.find((x) => x.level === 'Collected data (SDTM)')!
  expect(s.ok).toBe(true); expect(s.subjects!.length).toBe(3)
})

import { startMission, scoreMission, scoreOf } from '../src/domain/missions'
import { newAddendum } from '../src/domain/addendum'
import { CS19_PLANTED } from '../src/domain/missions/phase5'
import { AUTHOR, APPROVER } from '../src/domain/workflow'
test('CS19: an erratum by addendum scores 100; editing the approved text fails', () => {
  const p = startMission('CS19')
  expect(scoreOf(scoreMission(p))).toBe(0)
  const a = newAddendum(p)
  a.kind = 'erratum'; a.reason = 'An agency reviewer found that two sentences name the wrong group for the participant who died; Listing 16.2.7 shows GLV-12 10 mg.'
  a.changes = CS19_PLANTED.map((x) => ({ section: x.section, was: x.wrong, now: x.right }))
  a.conclusions = 'unchanged'; a.documents = ['Public disclosure version of the report', 'Lay summary']
  a.signatures = [{ name: 'M. Writer', role: 'Medical writer', meaning: AUTHOR, utc: 'x', version: 1 }, { name: 'C. Lead', role: 'Clinical lead', meaning: APPROVER, utc: 'x', version: 1 }]
  expect(scoreMission(p).filter((i) => !i.ok)).toEqual([])
  p.sections['2'].text = p.sections['2'].text.replace('5 mg group, was fatal', '10 mg group, was fatal')
  expect(scoreMission(p).filter((i) => !i.ok).map((i) => i.label)).toEqual(['The approved report is left as it was'])
})

import { ONK_REFERENCE } from '../src/domain/reference'
test('CS20: the oncology model text scores 100 and ties every number', () => {
  const p = startMission('CS20')
  expect(scoreOf(scoreMission(p))).toBeLessThan(20)
  for (const [s, t] of Object.entries(ONK_REFERENCE)) p.sections[s].text = t
  expect(scoreMission(p).filter((i) => !i.ok)).toEqual([])
  p.sections['11.4.1'].text += ' ONK-44 improved overall survival (hazard ratio 0.51) [T14.2.4].'
  expect(scoreMission(p).filter((i) => !i.ok).map((i) => i.label)).toEqual(['Overall survival reported as immature, no benefit claimed'])
})

test('trace: an oncology number down to the collected records', async () => {
  const p = newProject('t', 'ONK-44-302'), { sdtm } = await loadPatientData('ONK-44-302')
  const f = find(p, '11.4.1', 'Progression or death was reported in 8 (44.4%) participants on ONK-44 and 17 (70.8%) on docetaxel [T14.2.1].', '17')
  const st = trace(p, f, sdtm)
  expect(st.map((s) => s.level)).toEqual(['Report', 'Table', 'Analysis result (ARS)', 'Collected data (SDTM)', 'eCRF and source files'])
  expect(st[3].ok).toBe(true); expect(st[3].subjects!.length).toBe(17)
  expect(st[4].lines.some((l) => /independent review file|Death form/.test(l))).toBe(true)
  const r = find(p, '11.4.1', 'By independent review, 10 (55.6%) participants on ONK-44 had an objective response [T14.2.3].', '10')
  expect(trace(p, r, sdtm).find((s) => s.level === 'Collected data (SDTM)')!.ok).toBe(true)
})

test('trace: an oncology adverse event count down to the adverse event form', async () => {
  const p = newProject('t', 'ONK-44-302'), { sdtm, safety } = await loadPatientData('ONK-44-302')
  const f = find(p, '12.2.2', 'Neutropenia of grade 3 or higher was reported in 11 (45.8%) participants on docetaxel [T14.3.3].', '11')
  const st = trace(p, f, sdtm)
  const col = st.find((s) => s.level === 'Collected data (SDTM)')!
  expect(col.ok).toBe(true); expect(col.subjects!.length).toBe(11)
  expect(st.find((s) => s.level === 'eCRF and source files')!.lines.some((l) => /Adverse event form, .*grade [34]/.test(l))).toBe(true)
  const g = find(p, '12.2.2', 'Diarrhoea was reported in 10 (55.6%) participants on ONK-44 [T14.3.1].', '10')
  expect(trace(p, g, sdtm).find((s) => s.level === 'Collected data (SDTM)')!.ok).toBe(true)
  expect(safety.cases.length).toBeGreaterThanOrEqual(9)
})
