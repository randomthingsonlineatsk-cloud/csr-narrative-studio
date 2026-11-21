import { describe, expect, test } from 'vitest'
import glvS from '../src/data/sdtm-glv-12-301.json'
import hrpS from '../src/data/sdtm-hrp-301.json'
import glvC from '../src/data/cases-glv-12-301.json'
import cdm from '../src/data/cdm-hrp-301.json'
import { candidates, draft, narrativeQc, qcErrors, profile, challenge, primaryKind, findingKey } from '../src/domain/narratives'
import type { Sdtm, Safety } from '../src/domain/sdtm'

const glv = glvS as unknown as Sdtm, hrp = hrpS as unknown as Sdtm
const glvSafety = glvC as unknown as Safety
const hrpSafety = { source: 'cdm', cases: (cdm as any).sae.cases, reconciliation: (cdm as any).sae.reconciliation } as Safety
const ARMS = { 'GLV-12-301': ['Placebo', 'GLV-12 5 mg', 'GLV-12 10 mg'], 'HRP-301': ['Placebo', 'Lumiravostat 10 mg', 'Lumiravostat 25 mg'] }

describe('who needs a narrative', () => {
  test('GLV-12-301: seven SAEs (one fatal) and three discontinuations: ten', () => {
    const c = candidates(glv)
    expect(c).toHaveLength(10)
    expect(c.filter((x) => x.kinds.includes('sae'))).toHaveLength(7)
    expect(c.filter((x) => x.kinds.includes('death')).map((x) => x.usubjid)).toEqual(['GLV-12-301-105-006'])
    expect(c.filter((x) => primaryKind(x) === 'discontinuation')).toHaveLength(3)
    expect(c.some((x) => x.kinds.includes('aesi'))).toBe(false) // liver events stay below 3 × ULN
  })
  test('HRP-301: four SAEs and one liver test rise that stopped treatment', () => {
    const c = candidates(hrp)
    expect(c.filter((x) => x.kinds.includes('sae')).map((x) => x.pt).sort()).toEqual(['Cellulitis', 'Herpes zoster', 'Pneumonia', 'Wrist fracture'])
    expect(c.find((x) => x.kinds.includes('aesi'))?.kinds).toEqual(['discontinuation', 'aesi'])
  })
})

describe('dechallenge and rechallenge from the dates', () => {
  test('HRP-301 records bottles dispensed: an interruption comes from the AE form, without days', () => {
    const p = profile(hrp, 'HRP-301-301-007'), ch = challenge(p, p.ae.find((x) => x.AEDECOD === 'Pneumonia')!)
    expect(p.dispensing).toBe(true)
    expect(ch.dechallenge.result).toBe('positive'); expect(ch.dechallenge.text).toMatch(/bottles dispensed/)
    expect(ch.rechallenge.result).toBe('negative')
  })
  test('an interruption with resolution and a restart: positive dechallenge, negative rechallenge', () => {
    const p = profile(glv, 'GLV-12-301-102-001'), ae = p.ae.find((x) => x.AEDECOD === 'Pneumonia')!
    const ch = challenge(p, ae)
    expect(ch.dechallenge.result).toBe('positive'); expect(ch.rechallenge.result).toBe('negative')
  })
  test('withdrawn and resolved: positive dechallenge, rechallenge not done; fatal: not applicable', () => {
    const p = profile(glv, 'GLV-12-301-105-015'), ae = p.ae.find((x) => x.AEDECOD === 'Nausea')!
    expect(challenge(p, ae).dechallenge.result).toBe('positive'); expect(challenge(p, ae).rechallenge.result).toBe('not done')
    const q = profile(glv, 'GLV-12-301-105-006')
    expect(challenge(q, q.ae.find((x) => x.AEOUT === 'FATAL')!).dechallenge.result).toBe('not applicable')
  })
})

describe('drafts pass narrative QC', () => {
  for (const [s, safety] of [[glv, glvSafety], [hrp, hrpSafety]] as const) for (const c of candidates(s)) test(`${c.usubjid} ${c.pt}`, () => {
    const t = draft(s, c, safety.cases.find((x) => x.usubjid === c.usubjid))
    const f = narrativeQc(s, c, t, safety, ARMS[s.study as keyof typeof ARMS])
    const contra = f.filter((x) => x.kind === 'contradiction')
    expect(contra).toEqual([])
    expect(qcErrors(narrativeQc(s, c, t, safety, ARMS[s.study as keyof typeof ARMS], contra.map(findingKey))).map((x) => `${x.text}: ${x.message}`)).toEqual([])
  })
})

describe('QC catches what is wrong', () => {
  const c = candidates(glv).find((x) => x.usubjid === 'GLV-12-301-102-001')!
  const ok = draft(glv, c, glvSafety.cases.find((x) => x.usubjid === c.usubjid))
  const qc = (t: string) => narrativeQc(glv, c, t, glvSafety, ARMS['GLV-12-301'])
  const swap = (a: string, b: string) => { expect(ok).toContain(a); return ok.replace(a, b) }
  test.each([
    ['wrong age', (t: string) => t.replace(/(\d+)-year-old/, (_, n) => `${Number(n) + 3}-year-old`), 'fact'],
    ['wrong severity', () => swap('was severe', 'was moderate'), 'fact'],
    ['wrong group', () => ok.replace(/\(Placebo\)/, '(GLV-12 10 mg)'), 'fact'],
    ['a day not in the data', () => swap('On Day 74', 'On Day 75'), 'fact'],
    ['wrong outcome', () => swap('The event resolved', 'The event had not resolved'), 'fact'],
    ['wrong sponsor causality', () => ok.replace(/the sponsor assessed it as not related/, 'the sponsor assessed it as possibly related'), 'safety-case'],
    ['no investigator causality', () => ok.replace(/The investigator assessed the event as not related to study drug;/, ''), 'missing'],
    ['initials', () => ok + ' Participant J.S. was discharged.', 'privacy'],
    ['a drug the participant did not take', () => ok + ' Paracetamol was given.', 'fact'],
    ['the treatment left out', () => ok.replace(/It was treated with [^.]+\./, ''), 'missing'],
    ['wrong dechallenge', () => swap('Dechallenge: positive', 'Dechallenge: negative'), 'fact'],
  ])('%s', (_, make, kind) => {
    const f = qcErrors(qc((make as (t: string) => string)(ok)))
    expect(f.map((x) => x.kind)).toContain(kind)
  })
})
