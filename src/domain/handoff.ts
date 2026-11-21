// Files the Studio hands to other apps:
//   - csr-studio/ectd-5-3-5 (JSON): the report for Module 5.3.5.1 of the eCTD Dossier Builder, as
//     documents with their study tagging (study ID and file tag), like the other apps' packages.
//   - csr-studio/lay-results (JSON): the results the Plain Language Lab needs for the lay summary,
//     taken from the report's own outputs and written in the analysis results (ARS) shape the Lab
//     already reads, with the CSR tables each number comes from.
//   - csr-studio-handoff (JSON): the checks the pharmolecule hub's Ostrevia journey reads.
//   - csr-studio/disclosure (zip): the redacted report, the redaction log and the anonymisation report.
import { zipSync, strToU8 } from 'fflate'
import { dataOf } from './project'
import { outputsOf } from './study'
import { tableNumber } from './e3'
import { errors } from './checker'
import { findingsOf, sectionsOf, needsText, AUTHOR, APPROVER } from './workflow'
import { reportBlocks, reportHtml } from './docx'
import { anonymisationReportHtml, disclosureItems, redact, redactedProject, redactionLogCsv, risk, DEFAULT_DISCLOSURE, type DisclosureState } from './disclosure'
import { CI } from './review'
import { PLACEHOLDER } from './project'
import type { PatientData } from './missions/narr'
import type { Project } from './types'

export const ECTD_KIND = 'csr-studio/ectd-5-3-5'
export const LAY_FORMAT = 'csr-studio/lay-results'
export const JOURNEY_FORMAT = 'csr-studio-handoff'
export const DISCLOSURE_FORMAT = 'csr-studio/disclosure'

const textOf = (p: Project, ids?: string[]) => reportBlocks(p).filter((b) => !ids || ('id' in b && b.id ? ids.includes(String(b.id)) : true)).map((b) => ('text' in b ? b.text : '')).filter(Boolean).join('\n')
const pagesOf = (t: string) => Math.max(1, Math.round(t.split(/\s+/).length / 450))

/** The report for Module 5.3.5.1, split as eCTD granularity expects: the synopsis and the body,
 *  with the protocol (16.1.1) and SAP (16.1.9) as their own documents. */
export function ectdPackage(p: Project, now = new Date().toISOString()) {
  const d = dataOf(p), study = p.study
  const synopsis = p.sections['2']?.text ?? '', body = textOf(p)
  const doc = (title: string, fileName: string, content: string, tag: string) => ({ section: '5.3.5.1', title, fileName, pages: pagesOf(content), content, study: { id: study, tag } })
  return {
    kind: ECTD_KIND, schema: 1, exportedUtc: now, userId: p.userId, classId: p.classId, projectId: p.id,
    study: { id: study, title: d.title, version: p.version, stage: p.stage, reportType: p.reportType },
    submission: { description: `Clinical study report ${study}`, submissionType: 'original-application', subType: 'application' },
    documents: [
      doc(`Study ${study} report body`, `${study.toLowerCase()}-csr-body.pdf`, body, 'study-report'),
      doc(`Study ${study} synopsis`, `${study.toLowerCase()}-synopsis.pdf`, synopsis, 'synopsis'),
      doc(`Study ${study} protocol and amendments (16.1.1)`, `${study.toLowerCase()}-protocol.pdf`, `Protocol of ${study}, as approved, with its amendments (appendix 16.1.1).`, 'protocol-or-amendment'),
      doc(`Study ${study} statistical analysis plan (16.1.9)`, `${study.toLowerCase()}-sap.pdf`, `${d.sap} for ${study} (appendix 16.1.9).`, 'statistical-methods-interim-analysis-plan'),
    ],
  }
}

/** The report's outputs in the ARS shape the Plain Language Lab reads (one analysis per output). */
export function layResults(p: Project, now = new Date().toISOString()) {
  const d = dataOf(p), outs = outputsOf(d).filter((o) => o.kind === 'ard')
  return {
    format: LAY_FORMAT, schema: 1, exportedUtc: now, study: p.study, title: d.title,
    csr: { project: p.name, version: p.version, stage: p.stage, approved: p.stage === 'approved', outputs: p.outputsSource ?? d.source },
    tables: outs.map((o) => ({ id: o.id, table: tableNumber(o.title), title: o.title })),
    reportingEvent: { id: `RE_${p.study}`, study: p.study, analyses: outs.map((o) => ({ id: o.id, name: o.title, results: o.frame.rows.map((r) => ({ analysis: String(r[0]), ...(r[2] !== null && r[2] !== undefined ? { category: String(r[2]) } : {}), resultGroups: [{ groupName: String(r[1]) }], operationId: `${o.id}_${r[3]}`, rawValue: r[4] })) })) },
  }
}

/** What the hub's journey step checks: own outputs, a clean text-versus-table check, narratives
 *  that pass QC, and an approved report. */
export function journeyHandoff(p: Project, now = new Date().toISOString()) {
  const f = errors(findingsOf(p)), sig = (m: string) => p.signatures.find((s) => s.version === p.version && s.meaning === m)
  const toWrite = sectionsOf(p).filter((s) => needsText(s) && !p.sections[s.id].na && (!p.sections[s.id].text.trim() || PLACEHOLDER.test(p.sections[s.id].text))).map((s) => s.id)
  return {
    format: JOURNEY_FORMAT, schema: 1, exportedUtc: now, app: 'csr-narrative-studio',
    study: { id: p.study, project: p.name, kind: p.kind, mission: p.mission?.id ?? null },
    outputs: { source: p.outputsSource ?? 'reference outputs', own: !!p.outputs, from: p.outputsFrom ?? null },
    checker: { errors: f.length, sections: [...new Set(f.map((x) => x.section))] },
    toWrite,
    narratives: p.coverage ? { needed: p.coverage.needed, written: p.coverage.written, clean: p.coverage.clean } : null,
    stage: p.stage, version: p.version,
    signatures: { author: !!sig(AUTHOR), approver: !!sig(APPROVER), investigator: !!sig(CI) },
  }
}

/** The disclosure package: the redacted report, its redaction log and the anonymisation report. */
export function disclosureZip(p: Project, d: PatientData, now = new Date()): Uint8Array {
  const s = { ...DEFAULT_DISCLOSURE(), ...p.disclosure } as DisclosureState, r = redact(p, d), rk = risk(d, s.qi)
  const manifest = { format: DISCLOSURE_FORMAT, schema: 1, exportedUtc: now.toISOString(), study: p.study, version: p.version, routes: s.routes, risk: { value: rk.risk, smallest: rk.smallest, threshold: 0.09 }, checks: disclosureItems(p, d).map((i) => ({ id: i.id, ok: i.ok })), files: ['redacted-csr.html', 'redaction-log.csv', 'anonymisation-report.html'] }
  const mtime = now
  return zipSync({
    'manifest.json': [strToU8(JSON.stringify(manifest, null, 1)), { mtime }],
    'redacted-csr.html': [strToU8(reportHtml(redactedProject(p, d))), { mtime }],
    'redaction-log.csv': [strToU8(redactionLogCsv(r.log)), { mtime }],
    'anonymisation-report.html': [strToU8(anonymisationReportHtml(p, d)), { mtime }],
  })
}
