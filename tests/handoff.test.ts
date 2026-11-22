// The hand-off files, and fixtures written for the apps that read them (the eCTD Dossier Builder,
// the Plain Language Lab and the pharmolecule hub), when those repositories are beside this one.
import { expect, test } from 'vitest'
import { existsSync, writeFileSync } from 'node:fs'
import { unzipSync, strFromU8 } from 'fflate'
import { completeProject, newProject, defaultSlots } from '../src/domain/project'
import { BUNDLED } from '../src/domain/study'
import { ectdPackage, ectdFileSetZip, layResults, journeyHandoff, disclosureZip } from '../src/domain/handoff'
import { loadPatientData } from '../src/domain/sdtm'
import { DEFAULT_DISCLOSURE } from '../src/domain/disclosure'

const write = (path: string, data: unknown) => { const dir = path.split('/').slice(0, -1).join('/'); if (existsSync(dir)) writeFileSync(path, JSON.stringify(data, null, 1)) }

test('eCTD package and file set: the report split as eCTD granularity expects, each file tagged', () => {
  const p = completeProject(), k = ectdPackage(p, '2026-11-22T00:00:00Z')
  expect(k.kind).toBe('csr-studio/ectd-5-3-5')
  expect(k.documents.map((d) => [d.e3, d.study.tag])).toEqual([['2', 'synopsis'], ['1, 3 to 13, 15', 'study-report-body'], ['14', 'study-report-body'], ['16.1.1', 'protocol-or-amendment'], ['16.1.5', 'signatures-investigators'], ['16.1.9', 'statistical-methods-interim-analysis-plan'], ['16.2.7', 'adverse-event-listings']])
  expect(k.documents.every((d) => d.section === '5.3.5.1')).toBe(true)
  expect(k.documents[0].content).toContain('Of 90 participants screened')
  expect(k.documents[1].content).not.toContain('Of 90 participants screened were') // the synopsis is its own file
  expect(k.documents[2].content).toContain('Table 14.2.1')
  expect(k.documents[3].content).toContain('Amendment 1')
  expect(k.documents[6].content).toMatch(/heart muscle infarction/i)
  const z = unzipSync(ectdFileSetZip(p))
  expect(Object.keys(z).sort()).toEqual(['glv-12-301-16-1-1-protocol.html', 'glv-12-301-16-1-5-signatures.html', 'glv-12-301-16-1-9-sap.html', 'glv-12-301-16-2-7-ae-listings.html', 'glv-12-301-report-body.html', 'glv-12-301-section-14.html', 'glv-12-301-synopsis.html', 'index.json'])
  write('../ectd-dossier-builder/tests/fixtures/csr-ectd-glv-12-301.json', k)
})

test('lay results: the report’s outputs in the ARS shape, HRP-301', () => {
  const p = newProject('HRP-301 CSR', 'HRP-301'); const s = defaultSlots(BUNDLED['HRP-301']); for (const [id, st] of Object.entries(p.sections)) st.slots = s[id] ?? []
  const l = layResults(p, '2026-11-22T00:00:00Z')
  expect(l.format).toBe('csr-studio/lay-results')
  const t3 = l.reportingEvent.analyses.find((a) => /14\.2\.1/.test(a.name))!
  expect(t3.results.find((r) => r.analysis === 'DIFF' && r.operationId.endsWith('_est') && r.resultGroups[0].groupName === 'Lumiravostat 25 mg')).toBeTruthy()
  expect(l.tables.map((t) => t.table)).toEqual(expect.arrayContaining(['14.1.1', '14.1.2', '14.2.1', '14.3.1']))
  write('../plain-language-lab/tests/fixtures/csr-lay-results-hrp-301.json', l)
})

test('journey hand-off and disclosure zip', async () => {
  const p = completeProject(), j = journeyHandoff(p, '2026-11-22T00:00:00Z')
  expect(j).toMatchObject({ format: 'csr-studio-handoff', study: { id: 'GLV-12-301' }, outputs: { own: false }, checker: { errors: 0 }, toWrite: [], stage: 'shell' })
  const d = await loadPatientData('GLV-12-301')
  p.disclosure = { ...DEFAULT_DISCLOSURE(), routes: ['hc'] }
  const z = unzipSync(disclosureZip(p, d))
  expect(Object.keys(z).sort()).toEqual(['anonymisation-report.html', 'manifest.json', 'redacted-csr.html', 'redaction-log.csv'])
  expect(JSON.parse(strFromU8(z['manifest.json']))).toMatchObject({ format: 'csr-studio/disclosure', routes: ['hc'] })
})

import { readFileSync } from 'node:fs'
import { readOutputsFile } from '../src/domain/imports'
import { sectionsOf, needsText, AUTHOR, APPROVER } from '../src/domain/workflow'
import { candidates, draft, narrativeQc, qcErrors } from '../src/domain/narratives'
import { CI } from '../src/domain/review'
test('journey fixtures for the hub: an approved HRP-301 report on the learner’s own package, and a fresh one', async () => {
  const PKG = '../pharmolecule/tests/fixtures/hrp301_analysis_package.zip'
  if (!existsSync(PKG)) return
  const fresh = newProject('VERDANT-1 CSR', 'HRP-301')
  write('../pharmolecule/tests/fixtures/csr-handoff-start.json', journeyHandoff(fresh, '2026-11-22T00:00:00Z'))
  const p = newProject('VERDANT-1 CSR', 'HRP-301')
  const r = readOutputsFile('hrp301_analysis_package.zip', new Uint8Array(readFileSync(PKG)))
  p.outputs = r.data; p.outputsSource = r.source; p.outputsFrom = r.provenance
  expect(r.provenance).toMatchObject({ kind: 'package', handoff: 'learner', lock: 'hard' })
  for (const s of sectionsOf(p).filter(needsText)) p.sections[s.id].text = `Section ${s.id} as written for the journey check.`
  const d = await loadPatientData('HRP-301'), cs = candidates(d.sdtm)
  p.narratives = Object.fromEntries(cs.map((c) => [c.key, { text: draft(d.sdtm, c, d.safety.cases.find((x) => x.usubjid === c.usubjid)), queries: [], updatedUtc: '' }]))
  const clean = cs.filter((c) => !qcErrors(narrativeQc(d.sdtm, c, p.narratives![c.key].text, d.safety, ['Placebo', 'Lumiravostat 10 mg', 'Lumiravostat 25 mg'])).length).length
  p.coverage = { needed: cs.length, written: cs.length, clean, utc: '' }
  p.signatures.push({ name: 'A. Writer', role: 'Medical writer', meaning: AUTHOR, utc: '', version: 1 }, { name: 'B. Lead', role: 'Clinical lead', meaning: APPROVER, utc: '', version: 1 }, { name: 'Dr C. Investigator', role: 'Coordinating investigator', meaning: CI, utc: '', version: 1 })
  p.stage = 'approved'
  const j = journeyHandoff(p, '2026-11-22T00:00:00Z')
  expect(j).toMatchObject({ study: { id: 'HRP-301' }, outputs: { own: true }, checker: { errors: 0 }, toWrite: [], stage: 'approved' })
  expect(j.narratives!.clean).toBe(j.narratives!.needed)
  write('../pharmolecule/tests/fixtures/csr-handoff.json', j)
})
