import { describe, expect, test } from 'vitest'
import { amendmentsOf, analysisChanges, changeFindings, DRAFTABLE, methodsDraft, pastTense, tenseFindings } from '../src/domain/methods'

describe('methods from the protocol', () => {
  test.each(['GLV-12-301', 'HRP-301'])('%s: every draft is in the past tense, without protocol numbering', (s) => {
    for (const id of DRAFTABLE) {
      const t = methodsDraft(s, id) ?? ''
      expect(tenseFindings(t), `${s} ${id}`).toEqual([])
      expect(t, `${s} ${id}`).not.toMatch(/(^|\n)\d+\.\d+\.\d+ /)
    }
  })
  test('names and acronyms keep their case', () => {
    const t = methodsDraft('GLV-12-301', '9.1')!
    expect(t).toContain('double-blind, placebo-controlled')
    expect(t).not.toMatch(/gLV|double Blind/)
    expect(t).toContain('the United States')
  })
  test('the right protocol sections feed each CSR section', () => {
    expect(methodsDraft('GLV-12-301', '9.4.3')).toMatch(/random/i)
    expect(methodsDraft('GLV-12-301', '9.4.4')).toMatch(/dose/i)
    expect(methodsDraft('GLV-12-301', '9.4.8')).toMatch(/[Aa]dherence/)
    expect(methodsDraft('GLV-12-301', '9.2')).toMatch(/parallel/i)
    expect(methodsDraft('GLV-12-301', '9.4.7')).toMatch(/[Rr]escue/)
  })
  test('pastTense turns protocol future into report past', () => {
    expect(pastTense('Participants will be randomised and will receive study drug.')).toBe('Participants were randomised and received study drug.')
    expect(tenseFindings('Participants will attend each visit.').length).toBe(1)
  })
  test('amendments come from the version history', () => {
    expect(amendmentsOf('GLV-12-301')).toHaveLength(1)
    expect(amendmentsOf('HRP-301')[0].date).toBe('2026-08-10')
    expect(methodsDraft('HRP-301', '9.8')).toContain('Amendment 1 (protocol version 2.0')
  })
  test('changes to the planned analyses need a reason', () => {
    expect(analysisChanges('GLV-12-301').map((c) => c.id)).toEqual(expect.arrayContaining(['coding', 'label']))
    expect(analysisChanges('HRP-301').map((c) => c.id)).toEqual(expect.arrayContaining(['pp', 'end-END3', 'labs']))
    const draft = methodsDraft('HRP-301', '9.8')!
    expect(changeFindings('HRP-301', draft).filter((f) => !f.ok).length).toBeGreaterThan(0)
    const fixed = draft + ' The planned per-protocol analysis was not done because the 45-participant training cut was too small for a per-protocol set to be informative. Adverse events were coded with the Study Medical Dictionary because the sponsor uses it for all training studies. The itch responder analysis was not run because the 48-participant cut had too few participants with a baseline itch of 4 or more. Laboratory shift tables were left to the final analysis because the interim cut was for efficacy.'
    expect(changeFindings('HRP-301', fixed).filter((f) => !f.ok)).toEqual([])
  })
})
