import { expect, test } from 'vitest'
import { startMission, scoreMission, scoreOf } from '../src/domain/missions'
import { CS16_PLANTED, sentencesOf, sentenceKey, CS16_SECTIONS } from '../src/domain/missions/aidraft'
import { GLV_REFERENCE, GLV_COMPLETE } from '../src/domain/reference'
import { loadPatientData } from '../src/domain/sdtm'
import { buildPosting, postingFile, plusYear } from '../src/domain/posting'
import { addBlock, approveBlock, editBlock, usages, updateUsages, outdated } from '../src/domain/reuse'
import { timelineFacts, HRP_DBL } from '../src/domain/missions/phase5'
import { newProject } from '../src/domain/project'

test('CS16: the draft scores low; the reference text, all sentences verified, scores 100', () => {
  const p = startMission('CS16')
  expect(scoreOf(scoreMission(p))).toBeLessThan(30)
  for (const x of CS16_PLANTED) p.sections[x.section].text = p.sections[x.section].text.replace(x.to, x.from)
  for (const s of CS16_SECTIONS) expect(p.sections[s].text).toBe((GLV_REFERENCE as Record<string, string>)[s] ?? GLV_COMPLETE[s])
  p.verified = Object.fromEntries(CS16_SECTIONS.flatMap((s) => sentencesOf(p, s).map((x) => [sentenceKey(s, x), 'now'])))
  const items = scoreMission(p); expect(items.filter((i) => !i.ok)).toEqual([]); expect(scoreOf(items)).toBe(100)
})
test('content blocks: versions, approval, outdated usage and update', () => {
  const p = newProject('t', 'HRP-301')
  const b = addBlock(p, 'Design', 'A randomised, double-blind, placebo-controlled study.')
  expect(() => updateUsages(p, b.id)).not.toThrow()
  approveBlock(p, b.id, 'C. Lead'); p.sections['1'].text = 'Title. A randomised, double-blind, placebo-controlled study.'
  expect(usages(p)).toEqual([{ block: 'design', section: '1', version: 1, current: true }])
  editBlock(p, b.id, 'A randomised, double-blind, placebo-controlled, parallel-group study.')
  expect(outdated(p)).toEqual([]) // the new version is still a draft
  approveBlock(p, b.id, 'C. Lead'); expect(outdated(p).map((u) => u.section)).toEqual(['1'])
  expect(updateUsages(p, b.id)).toBe(1); expect(p.sections['1'].text).toContain('parallel-group'); expect(outdated(p)).toEqual([])
})
test('CS17 and CS18 from the HRP-301 data', async () => {
  const d = await loadPatientData('HRP-301'), f = timelineFacts(d)
  expect(f).toEqual({ dbl: HRP_DBL, pcd: '2026-11-03', endOfTrial: '2026-12-01' })
  const p = startMission('CS17', d)
  expect(scoreOf(scoreMission(p, d))).toBeLessThan(30)
  const b = addBlock(p, 'Brief summary', 'VERDANT-1 compared lumiravostat 10 mg and 25 mg with placebo for 16 weeks in adults with chronic hand eczema.'); approveBlock(p, b.id, 'C. Lead')
  p.posting = { pcd: f.pcd, completion: f.endOfTrial, endOfTrial: f.endOfTrial, threshold: 5, otherAes: 'non-serious', collection: 'systematic', timeFrame: 'From the first dose of study treatment to the follow-up visit, 4 weeks after the last dose.', summaryBlock: b.id }
  expect(scoreMission(p, d).filter((i) => !i.ok)).toEqual([])
  const post = buildPosting(p)
  expect(post.serious.map((s) => s.term).sort()).toEqual(['Cellulitis', 'Herpes zoster', 'Pneumonia', 'Wrist fracture'])
  expect(post.mortality.map((m) => m.deaths)).toEqual([0, 0, 0])
  expect(post.other.every((r) => r.byArm.some((a) => (100 * a.n) / a.atRisk > 5))).toBe(true)
  expect(post.other.find((r) => r.term === 'Upper respiratory tract infection')!.byArm.map((a) => a.n)).toEqual([4, 4, 3])
  expect(post.other.some((r) => r.term === 'Herpes zoster')).toBe(false)
  expect(postingFile(p).dates.clinicalTrialsGovDue).toBe(plusYear('2026-11-03'))
  const q = startMission('CS18', d)
  q.timeline = { shells: '2026-12-15', csrShell: '2027-01-15', dryRun: '2027-02-17', unblind: '2027-03-10', topline: '2027-03-17', draft1: '2027-04-14', review: '2027-05-05', qc: '2027-05-12', final: '2027-05-26', ctgov: '2027-06-15', ctis: '2027-06-15' }
  expect(scoreMission(q, d).filter((i) => !i.ok)).toEqual([])
  q.timeline.topline = '2027-03-01'; expect(scoreMission(q, d).filter((i) => !i.ok).map((i) => i.label)).toEqual(['In a workable order', 'Topline within 2 weeks of lock'])
})
