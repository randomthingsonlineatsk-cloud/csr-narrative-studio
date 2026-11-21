import { expect, test } from 'vitest'
import { startMission, submit } from '../src/domain/missions'
import { submissionPayload, verifySubmission, DEFAULT_API, STATUS_PAGE } from '../src/domain/classroom'
import { loadPatientData } from '../src/domain/sdtm'

test('the classroom server address and status page', () => {
  expect(DEFAULT_API).toMatch(/\/cs\/v1$/); expect(STATUS_PAGE).toMatch(/workers\.dev\/$/)
})
test('a submission round trip: the instructor’s re-score matches, patient data loaded when needed', async () => {
  const p = startMission('CS10'); p.mission = submit(p)
  const pl = await submissionPayload(p)
  expect(pl.project.kind).toBe('csr-narrative-studio/mission-submission')
  const v = await verifySubmission(pl.project)
  expect(v.score).toBe(p.mission.score)
  const d = await loadPatientData('GLV-12-301'), q = startMission('CS12', d); q.mission = submit(q, d)
  const w = await verifySubmission((await submissionPayload(q)).project)
  expect(w.score).toBe(q.mission.score)
})
