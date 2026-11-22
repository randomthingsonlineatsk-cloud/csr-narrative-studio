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
import { blocksOf, reportHtml, type Block } from './docx'
import { amendmentsOf } from './methods'
import type { Display } from './types'
import { anonymisationReportHtml, disclosureItems, redact, redactedProject, redactionLogCsv, risk, DEFAULT_DISCLOSURE, type DisclosureState } from './disclosure'
import { CI } from './review'
import { PLACEHOLDER } from './project'
import type { PatientData } from './missions/narr'
import type { Project } from './types'

export const ECTD_KIND = 'csr-studio/ectd-5-3-5'
export const LAY_FORMAT = 'csr-studio/lay-results'
export const JOURNEY_FORMAT = 'csr-studio-handoff'
export const DISCLOSURE_FORMAT = 'csr-studio/disclosure'

const textOf = (b: Block[]) => b.map((x) => (x.kind === 'table' ? `${x.title}\n${x.d.rows.map((r) => `${r.label}: ${r.cells.map((c) => c.text).join(' | ')}`).join('\n')}` : 'text' in x ? x.text : '')).filter(Boolean).join('\n')
const pagesOf = (t: string) => Math.max(1, Math.round(t.split(/\s+/).length / 450))

/** One file of the report, as eCTD granularity splits it, with its ICH study tagging file tag. */
export interface EctdFile { key: string; e3: string; title: string; fileName: string; tag: string; blocks: Block[] }
/** The report split as eCTD expects: the synopsis (E3 2), the body (E3 1, 3 to 13 and 15), section
 *  14's tables as their own file (also tagged study-report-body), and each appendix the Studio holds:
 *  16.1.1 protocol and amendments, 16.1.5 signatures, 16.1.9 statistical methods, 16.2.7 adverse
 *  event listings. File tags follow the ICH study tagging file (FDA's table of contents, 5.3.1.1). */
export function ectdFiles(p: Project): EctdFile[] {
  const d = dataOf(p), st = p.study, low = st.toLowerCase(), H = (id: string, text: string): Block => ({ kind: 'heading', id, text, level: 1 })
  const para = (text: string): Block => ({ kind: 'para', text })
  const am = amendmentsOf(st)
  const sigs = p.signatures.filter((x) => x.version === p.version)
  const l1 = outputsOf(d).find((o) => tableNumber(o.title) === '16.2.7')
  const listing: Block[] = l1 ? [{ kind: 'table', title: l1.title, d: { title: l1.title, population: 'Safety population', head: l1.frame.columns.slice(1), groups: [], rows: l1.frame.rows.map((r) => ({ label: String(r[0]), cells: r.slice(1).map((v) => ({ text: String(v ?? '') })) })), footnotes: [] } as unknown as Display }] : [para('No serious adverse event listing in the outputs.')]
  return [
    { key: 'synopsis', e3: '2', title: `Study ${st} synopsis`, fileName: `${low}-synopsis.html`, tag: 'synopsis', blocks: blocksOf(p, (id) => id === '2') },
    { key: 'body', e3: '1, 3 to 13, 15', title: `Study ${st} report body`, fileName: `${low}-report-body.html`, tag: 'study-report-body', blocks: blocksOf(p, (id) => id !== '2' && id !== '14' && id !== '16') },
    { key: 'tables', e3: '14', title: `Study ${st} section 14 tables, figures and graphs`, fileName: `${low}-section-14.html`, tag: 'study-report-body', blocks: blocksOf(p, (id) => id === '14') },
    { key: 'protocol', e3: '16.1.1', title: `Study ${st} protocol and amendments`, fileName: `${low}-16-1-1-protocol.html`, tag: 'protocol-or-amendment', blocks: [H('16.1.1', '16.1.1 Protocol and protocol amendments'), para(`The protocol of ${st}, as approved, with its amendments.`), ...am.map((a) => para(`Amendment ${a.identifier} (protocol version ${a.number}, approved ${a.date}; primary reason: ${a.reason}): ${a.summary}`))] },
    { key: 'signatures', e3: '16.1.5', title: `Study ${st} signatures`, fileName: `${low}-16-1-5-signatures.html`, tag: 'signatures-investigators', blocks: [H('16.1.5', '16.1.5 Signatures of the principal or coordinating investigator(s) and the sponsor’s responsible medical officer'), ...(sigs.length ? sigs.map((x) => para(`${x.name}, ${x.role}, ${x.utc.slice(0, 10)}: ${x.meaning}`)) : [para('[To be written: no signatures yet for this version]')])] },
    { key: 'sap', e3: '16.1.9', title: `Study ${st} statistical analysis plan`, fileName: `${low}-16-1-9-sap.html`, tag: 'statistical-methods-interim-analysis-plan', blocks: [H('16.1.9', '16.1.9 Documentation of statistical methods'), para(`${d.sap} for ${st}.`)] },
    { key: 'ae-listings', e3: '16.2.7', title: `Study ${st} adverse event listings`, fileName: `${low}-16-2-7-ae-listings.html`, tag: 'adverse-event-listings', blocks: [H('16.2.7', '16.2.7 Adverse event listings (each patient)'), ...listing] },
  ]
}
/** The file set as a zip of HTML files, one per eCTD document, with an index. */
export function ectdFileSetZip(p: Project, now = new Date()): Uint8Array {
  const files = ectdFiles(p), mtime = now
  const index = { format: 'csr-studio/ectd-file-set', schema: 1, study: p.study, version: p.version, stage: p.stage, files: files.map((f) => ({ fileName: f.fileName, title: f.title, e3: f.e3, tag: f.tag })) }
  return zipSync(Object.fromEntries([['index.json', [strToU8(JSON.stringify(index, null, 1)), { mtime }]], ...files.map((f) => [f.fileName, [strToU8(reportHtml({ ...p, name: f.title }, f.blocks)), { mtime }]])]))
}

/** The report for Module 5.3.5.1, as the eCTD Dossier Builder imports it: one document per file of
 *  the split above, each with the study ID and its file tag. */
export function ectdPackage(p: Project, now = new Date().toISOString()) {
  const d = dataOf(p), study = p.study
  return {
    kind: ECTD_KIND, schema: 1, exportedUtc: now, userId: p.userId, classId: p.classId, projectId: p.id,
    study: { id: study, title: d.title, version: p.version, stage: p.stage, reportType: p.reportType },
    submission: { description: `Clinical study report ${study}`, submissionType: 'original-application', subType: 'application' },
    documents: ectdFiles(p).map((f) => { const content = textOf(f.blocks); return { section: '5.3.5.1', title: f.title, fileName: f.fileName.replace(/\.html$/, '.pdf'), pages: pagesOf(content), content, e3: f.e3, study: { id: study, tag: f.tag } } }),
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
