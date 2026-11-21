import { describe, expect, test } from 'vitest'
import { benefitRisk, claimFindings, discussionItems } from '../src/domain/discussion'
import { BUNDLED } from '../src/domain/study'

describe('benefit–risk and section 13', () => {
  const glv = benefitRisk(BUNDLED['GLV-12-301']), hrp = benefitRisk(BUNDLED['HRP-301'])
  test('GLV-12-301: the primary comparison is shown for both doses', () => {
    const p = glv.effects.filter((e) => e.primary)
    expect(p.map((e) => [e.group, e.est, e.shown])).toEqual([['GLV-12 5 mg', -0.6, true], ['GLV-12 10 mg', -0.7, true]])
    expect(glv.primaryShown).toBe(true)
    expect(glv.harms.some((h) => /Serious/.test(h.label) && /heart muscle infarction/.test(h.detail))).toBe(true)
  })
  test('HRP-301 (48-participant cut): nothing is shown', () => {
    expect(hrp.primaryShown).toBe(false)
    expect(hrp.effects.map((e) => e.shown)).toEqual([false, false, false, false])
    expect(hrp.effects.find((e) => e.primary && e.group === 'Lumiravostat 25 mg')).toMatchObject({ est: 11.3, lcl: -19.2, ucl: 41.7, p: '0.685' })
  })
  test('overclaims are flagged', () => {
    const t = 'Lumiravostat was safe and well tolerated. Lumiravostat 25 mg was effective in chronic hand eczema. There was a trend towards a higher response on 25 mg.'
    expect(claimFindings(t, hrp).map((c) => c.kind)).toEqual(['safe', 'tolerated', 'efficacy', 'trend'])
    expect(claimFindings('The study did not show that lumiravostat was effective.', hrp)).toEqual([])
    expect(claimFindings('GLV-12 was effective at both doses.', glv)).toEqual([])
  })
  test('superiority and non-inferiority claims against a non-inferiority design', () => {
    const ni = { ...hrp, design: 'non-inferiority' as const, margin: 15 }
    expect(claimFindings('Lumiravostat was superior to the comparator.', ni).map((c) => c.kind)).toContain('superiority')
    expect(claimFindings('Non-inferiority was demonstrated.', ni).map((c) => c.kind)).toContain('non-inferiority')
  })
  test('a sound HRP-301 discussion passes every item', () => {
    const t = 'In this 48-participant analysis, the study did not show a difference from placebo in IGA-CHE treatment success: the difference for lumiravostat 25 mg was 11.3% (95% CI -19.2, 41.7; Table 14.2.1). Serious adverse events and the events more common on treatment are the main risks. The main limitation is the small number of participants. The benefit cannot be weighed against the risk until the full study is analysed.'
    expect(discussionItems(t, hrp).filter((i) => !i.ok)).toEqual([])
  })
})

describe('HRP-205, the stopped non-inferiority study', () => {
  const br = benefitRisk(BUNDLED['HRP-205'])
  test('non-inferiority is not shown: the lower limit is below the margin', () => {
    expect(br.design).toBe('non-inferiority')
    expect(br.effects).toHaveLength(1)
    expect(br.effects[0]).toMatchObject({ group: 'Lumiravostat 25 mg', est: 5.6, lcl: -24.5, ucl: 35.6, shown: false })
    expect(br.stopped?.enrolled).toBe(36)
    expect(claimFindings('Lumiravostat was comparable to clobetasol and numerically better.', br).map((c) => c.kind)).toEqual(expect.arrayContaining(['non-inferiority']))
  })
})
