import { describe, expect, test } from 'vitest'
import { exampleProject } from '../src/domain/project'
import { addComment, changesSince, CI, currentTexts, openComments, reply, resolve, snapshot, wordDiff } from '../src/domain/review'
import { gate } from '../src/domain/workflow'

describe('review cycle', () => {
  test('a comment is threaded and needs a reason to close without a change', () => {
    const p = exampleProject()
    const c = addComment(p, { section: '11.4.1', author: 'B. Stat', role: 'Biostatistician', text: 'Give the p-value for 5 mg.', quote: '' })
    reply(p, c.id, { author: 'M. Writer', text: 'It is below 0.001; added.' })
    expect(() => resolve(p, c.id, 'M. Writer', 'no change', '')).toThrow(/why/)
    resolve(p, c.id, 'M. Writer', 'changed', 'Added p<0.001.')
    expect(openComments(p)).toHaveLength(0)
    expect(() => reply(p, c.id, { author: 'x', text: 'y' })).toThrow(/resolved/)
  })
  test('open comments block the final stage; the CI signs before approval', () => {
    const p = exampleProject()
    addComment(p, { section: '11.4.1', author: 'B. Stat', role: 'Biostatistician', text: 'Check the order.' })
    expect(gate(p, 'final').problems.some((x) => /comment is still open/.test(x))).toBe(true)
    p.signatures.push({ name: 'Dr P. Investigator', role: 'Coordinating investigator', meaning: CI, utc: '', version: p.version })
    expect(gate(p, 'approved').problems.some((x) => /coordinating investigator/.test(x))).toBe(false)
  })
  test('tracked changes between a snapshot and now', () => {
    expect(wordDiff('the mean was 1.2 in all', 'the mean was 1.3 in all')).toEqual([{ t: '=', w: 'the mean was ' }, { t: '-', w: '1.2' }, { t: '+', w: '1.3' }, { t: '=', w: ' in all' }])
    const p = exampleProject(); snapshot(p, 'Draft')
    p.sections['11.4.1'].text += ' A new sentence.'
    const ch = changesSince(p.snapshots![0], currentTexts(p))
    expect(ch.map((c) => [c.section, c.added, c.removed])).toEqual([['11.4.1', 3, 0]])
  })
})
