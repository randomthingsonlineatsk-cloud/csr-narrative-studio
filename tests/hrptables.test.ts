import { expect, test } from 'vitest'
import { BUNDLED } from '../src/domain/study'
import { defaultSlots, dataOf } from '../src/domain/project'
import { startMission } from '../src/domain/missions'

test('HRP-301 has disposition (14.1.1) and exposure (14.3.5); CS1 still starts without them', () => {
  const s = defaultSlots(BUNDLED['HRP-301'])
  expect(s['10.1']).toContain('T5')
  expect(s['12.1']).toContain('T6')
  const p = startMission('CS1')
  expect(dataOf(p).outputs.map((o) => o.id)).not.toContain('T5')
  expect(dataOf(p).outputs.map((o) => o.id)).not.toContain('T6')
})
