import { beforeAll, describe, expect, test } from 'vitest'
import { loadPatientData } from '../src/domain/sdtm'
import { startMission } from '../src/domain/missions'
import { anonymisationReportHtml, CCI_CANDIDATES, disclosureItems, findIdentifiers, redact, redactionLogCsv, risk, DEFAULT_DISCLOSURE } from '../src/domain/disclosure'
import type { PatientData } from '../src/domain/missions/narr'
import type { Project } from '../src/domain/types'

let d: PatientData, p: Project
beforeAll(async () => {
  d = await loadPatientData('GLV-12-301'); p = startMission('CS13', d)
  const c = CCI_CANDIDATES['GLV-12-301']
  p.sections['9.5.1'].text += ' ' + c.find((x) => x.id === 'dkd')!.quote
  p.sections['9.5.4'].na = undefined; p.sections['9.5.4'].text = c.find((x) => x.id === 'assay')!.quote
})
const fail = (q: Project) => disclosureItems(q, d).filter((i) => !i.ok).map((i) => `${i.id}: ${i.why}`)

describe('disclosure and anonymisation', () => {
  test('the report and narratives hold direct and quasi-identifiers', () => {
    const all = Object.values(p.sections).map((s) => s.text).join('\n') + Object.values(p.narratives!).map((n) => n.text).join('\n')
    const kinds = new Set(findIdentifiers(all, d).map((h) => h.kind))
    expect([...kinds].sort()).toEqual(['age', 'date', 'name', 'race', 'site', 'subject'])
    expect(fail({ ...p, disclosure: DEFAULT_DISCLOSURE() }).length).toBeGreaterThanOrEqual(7)
  })
  test('risk on the participants: exact characteristics fail, coarse ones pass', () => {
    expect(risk(d, { age: 'exact', sex: 'keep', race: 'keep', country: 'keep' }).risk).toBe(1)
    const ok = risk(d, { age: 'drop', sex: 'keep', race: 'drop', country: 'drop' })
    expect(ok.smallest).toBeGreaterThanOrEqual(11); expect(ok.ok).toBe(true)
    expect(risk(d, { age: '10y', sex: 'drop', race: 'drop', country: 'drop' })).toMatchObject({ smallest: 10, risk: 0.1, ok: false })
  })
  test('a complete disclosure passes every check, and the outputs are built', () => {
    const q: Project = structuredClone(p)
    q.disclosure = { ...DEFAULT_DISCLOSURE(), routes: ['ctis', 'ema', 'hc'], offsetDays: -120,
      rules: { subject: 'pseudonymise', date: 'offset', name: 'redact', site: 'generalise', age: 'redact', race: 'redact' },
      qi: { age: 'drop', sex: 'keep', race: 'drop', country: 'drop' },
      cci: { dkd: { propose: true, reason: 'Exploratory, not used to support the proposed use; reveals a future development plan.' }, assay: { propose: true, reason: 'A bioanalytical method used only by the sponsor’s own laboratory.' } },
      utility: 'Intervals between events are kept by a single date offset; study days, doses, outcomes and all aggregate results are unchanged.' }
    expect(fail(q)).toEqual([])
    const r = redact(q, d)
    const first = Object.values(r.narratives)[0]
    expect(first).toMatch(/^Participant P-\d{3} \(GLV-12 10 mg\)/)
    expect(first).toMatch(/\nA man with a history/)
    expect(r.sections['9.5.4']).toContain('[Redacted: commercially confidential')
    expect(r.sections['1']).not.toMatch(/Helena Vos|site 103|2026-01-14/)
    expect(redactionLogCsv(r.log).split('\r\n').length).toBeGreaterThan(20)
    expect(anonymisationReportHtml(q, d)).toContain('risk <b>0.0')
    q.disclosure.cci!.primary = { propose: true, reason: 'The sponsor would prefer competitors not to see it.' }
    expect(fail(q).join(' ')).toMatch(/cci: Not acceptable: The primary efficacy result/)
  })
  test('ages follow the published quasi-identifier', () => {
    const q: Project = structuredClone(p)
    q.disclosure = { ...DEFAULT_DISCLOSURE(), rules: { ...DEFAULT_DISCLOSURE().rules, age: 'band', race: 'keep' }, qi: { age: '65', sex: 'keep', race: 'keep', country: 'keep' } }
    expect(Object.values(redact(q, d).narratives)[0]).toMatch(/\nAn under-65 White man/)
  })
})
