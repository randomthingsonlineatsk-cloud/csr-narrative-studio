import { describe, expect, test } from 'vitest'
import { startMission, scoreMission, scoreOf, CS1_KEY, MISSIONS } from '../src/domain/missions'
import { GLV_REFERENCE } from '../src/domain/reference'
import { exampleProject, newProject } from '../src/domain/project'
import { gate, findingsOf, qcStatus } from '../src/domain/workflow'
import { issues } from '../src/domain/checker'

const failing = (p: ReturnType<typeof startMission>) => scoreMission(p).filter((i) => !i.ok).map((i) => `${i.label}: ${i.why}`)
describe('missions', () => {
  test('CS1: the key scores 100; an empty shell scores 0', () => {
    const p = startMission('CS1')
    expect(scoreOf(scoreMission(p))).toBeLessThan(20)
    for (const [s, k] of Object.entries(CS1_KEY)) { p.sections[s].slots = k.slots ?? []; p.sections[s].requests = k.requests ?? []; if (k.na) p.sections[s].na = 'No such analyses were planned.' }
    expect(failing(p)).toEqual([])
  })
  test('CS2: the draft scores low; the reference scores 100', () => {
    const p = startMission('CS2')
    expect(scoreOf(scoreMission(p))).toBe(0)
    for (const s of MISSIONS[1].sections) p.sections[s].text = GLV_REFERENCE[s]
    expect(failing(p)).toEqual([])
  })
  for (const id of ['CS3', 'CS4', 'CS5']) test(`${id}: the model answer scores 100; a blank draft does not`, () => {
    const p = startMission(id)
    expect(scoreOf(scoreMission(p))).toBeLessThan(50)
    for (const s of MISSIONS.find((m) => m.id === id)!.sections) p.sections[s].text = GLV_REFERENCE[s]
    expect(failing(p)).toEqual([])
  })
  test('CS4: calling the MMRM primary, claiming a subgroup and leading with the MMRM are caught', () => {
    const p = startMission('CS4')
    p.sections['11.4.1'].text = 'The MMRM primary estimand gave differences at Week 26 of -0.59 (5 mg) and -0.69 (10 mg) [T14.2.2]. ' + GLV_REFERENCE['11.4.1'] + ' The benefit was greater in women (Figure 14.2.4).'
    p.sections['11.4.7'].text = GLV_REFERENCE['11.4.7']
    expect(failing(p).map((x) => x.split(':')[0]).sort()).toEqual(['MMRM not called primary', 'No subgroup claims', 'Primary analysis first'])
  })
  test('CS5: minimising words are caught', () => {
    const p = startMission('CS5')
    for (const s of ['12.1', '12.2.1', '12.2.2', '12.3.1']) p.sections[s].text = GLV_REFERENCE[s]
    p.sections['12.2.2'].text += ' Events were mild and transient.'
    expect(failing(p).map((x) => x.split(':')[0])).toEqual(['Neutral wording'])
  })
})

describe('report workflow', () => {
  test('the worked example: no checker issues, and the stage gates hold', () => {
    const p = exampleProject()
    expect(issues(findingsOf(p)).map((f) => `${f.section} ${f.text} ${f.message}`)).toEqual([])
    expect(gate(p, 'draft').problems).toEqual([])
    expect(gate(p, 'review').ok).toBe(false) // other sections are still to be written
    expect(gate(p, 'review').problems.some((x) => x.startsWith('9'))).toBe(true)
  })
  test('a blank shell cannot move to draft until outputs are attached', () => {
    const p = newProject('x', 'HRP-301')
    const g = gate(p, 'draft'); expect(g.ok).toBe(false); expect(g.problems.some((x) => x.startsWith('11.2'))).toBe(true)
  })
  test('final needs QC and an author signature; approval needs someone else', () => {
    const p = exampleProject()
    expect(gate(p, 'final').problems).toContain('The author signs the QC-checked report.')
    for (const q of qcStatus(p)) if (!q.auto) p.qc[q.id] = true
    p.signatures.push({ name: 'A Writer', role: 'Medical writer', meaning: 'Author: the report is complete, QC findings are resolved, and the text agrees with the tables.', utc: '', version: 1 })
    p.signatures.push({ name: 'a writer', role: 'Medical writer', meaning: 'Approval: I approve this clinical study report version for submission.', utc: '', version: 1 })
    expect(gate(p, 'approved').problems).toEqual(['The approver must be someone other than the author.'])
  })
})
