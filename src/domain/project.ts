// Projects: one clinical study report for one of the worked studies. A report starts as a shell
// (the ICH E3 sections the report type keeps, with the study outputs attached to each) and moves
// through draft, review and final to approved. Export and import as one JSON file.
import { sectionsFor, isGroup, sectionById, tableNumber, type ReportType } from './e3'
import { BUNDLED } from './study'
import { GLV_REFERENCE, GLV_COMPLETE } from './reference'
import { DRAFTABLE, methodsDraft } from './methods'
import type { Project, SectionState, Stage, StudyOutputs } from './types'

export const APP_URL = 'https://randomthingsonlineatsk-cloud.github.io/csr-narrative-studio/'
export const FORMAT = 'csr-narrative-studio-project'
const now = () => new Date().toISOString()
const rid = () => Math.random().toString(36).slice(2, 10)
export const PLACEHOLDER = /\[To be written[^\]]*\]/

export function learner(): { userId: string; classId: string } {
  try {
    let u = localStorage.getItem('cs-user'); if (!u) { u = `U-${rid()}`; localStorage.setItem('cs-user', u) }
    return { userId: u, classId: localStorage.getItem('cs-class') ?? '' }
  } catch { return { userId: 'U-local', classId: '' } }
}

/** Which outputs feed which section, by table number (the usual mapping; the writer can change it). */
const SLOT_RULES: [string, RegExp][] = [
  ['10.1', /^14\.1\.1$|^16\.2\.1$/], ['11.1', /^14\.1\.3$/], ['11.2', /^14\.1\.2$/],
  ['11.4.1', /^14\.2\./], ['11.4.2', /^14\.2\.[123]$/], ['12.1', /^14\.3\.5$/], ['12.2.1', /^14\.3\.1$/], ['12.2.2', /^14\.3\.[123]$/], ['12.2.3', /^14\.3\.8$/],
  ['12.3.1', /^16\.2\.7$|^14\.3\.2$/], ['12.3.3', /^16\.2\.7$|^14\.3\.1$/], ['12.4', /^14\.3\.4$/], ['12.5', /^14\.3\.6$/],
]
export function defaultSlots(data: StudyOutputs): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const o of data.outputs) { const n = tableNumber(o.title); for (const [sec, re] of SLOT_RULES) if (n && re.test(n)) (out[sec] ??= []).push(o.id) }
  return out
}

const blank = (id: string, written: boolean): SectionState => ({ text: written && !isGroup(sectionById(id)!) ? `[To be written: ${sectionById(id)!.heading}]` : '', slots: [] })
export function newProject(name: string, study: string, reportType: ReportType = 'full', kind: Project['kind'] = 'report'): Project {
  const l = learner(), t = now()
  return { id: `CS-${rid()}`, name, kind, userId: l.userId, classId: l.classId, study, reportType, stage: 'shell',
    sections: Object.fromEntries(sectionsFor(reportType).map((s) => [s.id, blank(s.id, s.written)])),
    rounding: { pct: 1, mean: 2, p: 3 }, qc: {}, signatures: [], version: 1, createdUtc: t, updatedUtc: t, schema: 1 }
}

/** Change the kind of report. Sections a shorter report leaves out keep their text, hidden. */
export function setReportType(p: Project, t: ReportType) { p.reportType = t; for (const s of sectionsFor(t)) p.sections[s.id] ??= blank(s.id, s.written) }

/** A complete GLV-12-301 report: the worked example, the methods drafted from the protocol, and
 *  every other section written. The review and India missions start from it. */
export function completeProject(name = 'GLV-12-301 clinical study report (complete)'): Project {
  const p = exampleProject(); p.name = name
  for (const id of DRAFTABLE) { const t = methodsDraft('GLV-12-301', id); if (t && p.sections[id]) p.sections[id].text = t }
  for (const [id, t] of Object.entries(GLV_COMPLETE)) if (p.sections[id]) p.sections[id].text = t
  p.sections['9.5.2'].na = 'The measurements are standard and validated for trials in type 2 diabetes.'
  p.sections['9.5.4'].na = 'Drug concentrations were not measured in this study.'
  p.sections['11.4.3'].na = 'By-patient efficacy data are in listing 16.2.6.'
  return p
}

/** The worked example: GLV-12-301 with the results sections written and the outputs attached. */
export function exampleProject(): Project {
  const p = newProject('GLV-12-301 clinical study report (worked example)', 'GLV-12-301')
  const slots = defaultSlots(BUNDLED['GLV-12-301'])
  for (const [id, s] of Object.entries(p.sections)) { s.slots = slots[id] ?? []; if (GLV_REFERENCE[id]) s.text = GLV_REFERENCE[id] }
  p.sections['11.1'].requests = ['14.1.3']
  p.sections['11.3'].na = 'Not applicable to the training data: no drug accountability data were collected in this cut.'
  for (const id of ['11.4.4', '11.4.5', '11.4.6']) p.sections[id].na = 'Not applicable: no dose-response, interaction or by-patient analyses were planned in the SAP.'
  return p
}

export function upgrade(p: Project): Project {
  const q = structuredClone(p)
  q.sections ??= {}; for (const s of sectionsFor(q.reportType ?? 'full')) q.sections[s.id] ??= blank(s.id, s.written)
  for (const s of Object.values(q.sections)) s.slots ??= []
  q.rounding ??= { pct: 1, mean: 2, p: 3 }; q.qc ??= {}; q.signatures ??= []; q.version ??= 1; q.stage ??= 'shell'
  return q
}

/** The outputs this report is written from: the learner's own, or the bundled reference outputs. */
export const dataOf = (p: Project): StudyOutputs => p.outputs ?? BUNDLED[p.study]

export const projectFile = (p: Project) => JSON.stringify({ format: FORMAT, version: 1, exportedUtc: now(), project: p }, null, 1)
export function readProjectFile(text: string): Project {
  let j: { format?: string; project?: Project }
  try { j = JSON.parse(text) } catch { throw new Error('This file is not JSON.') }
  if (j.format !== FORMAT || !j.project) throw new Error('This is not a CSR & Narrative Studio project file.')
  if (!BUNDLED[j.project.study]) throw new Error(`Unknown study ${j.project.study}.`)
  return upgrade({ ...j.project, id: `CS-${rid()}`, ...learner() })
}

export const STAGE_LABEL: Record<Stage, string> = { shell: 'Shell', draft: 'Draft', review: 'In review', final: 'Final', approved: 'Approved' }
