// Phase 5 missions, from industry practice. CS16: review an AI-drafted results text, sentence by
// sentence. CS17: post the HRP-301 results to ClinicalTrials.gov and CTIS from the same outputs.
// CS18: plan the HRP-301 report around database lock.
import { newProject, defaultSlots } from '../project'
import { BUNDLED, protocolOf } from '../study'
import { postingItems, studyDates } from '../posting'
import { timelineRules } from '../timeline'
import { startCs16, scoreCs16 } from './aidraft'
import { completeProject } from '../project'
import { AUTHOR, APPROVER } from '../workflow'
import { CI, snapshot } from '../review'
import { addendumItems } from '../addendum'
import type { PatientData } from './narr'
import type { Project } from '../types'

export interface Item { label: string; ok: boolean; why: string }
/** HRP-301's database lock, from the CDM Console's export for the CSR. */
export const HRP_DBL = '2027-03-10'

function hrpProject(title: string): Project {
  const p = newProject(title, 'HRP-301', 'full', 'mission'), slots = defaultSlots(BUNDLED['HRP-301'])
  for (const [s, st] of Object.entries(p.sections)) st.slots = slots[s] ?? []
  p.stage = 'draft'; return p
}
/** CS19: the approved GLV-12-301 report, with an error found after approval in two sections. */
export const CS19_PLANTED = [
  { section: '2', right: 'one, a heart muscle infarction in the GLV-12 10 mg group, was fatal', wrong: 'one, a heart muscle infarction in the GLV-12 5 mg group, was fatal' },
  { section: '13', right: 'one participant on GLV-12 10 mg died', wrong: 'one participant on GLV-12 5 mg died' },
]
export function startCs19(): Project {
  const p = completeProject('Mission CS19: Correct the approved report by addendum'); p.kind = 'mission'
  for (const x of CS19_PLANTED) { if (!p.sections[x.section].text.includes(x.right)) throw new Error(`CS19 ${x.section}`); p.sections[x.section].text = p.sections[x.section].text.replace(x.right, x.wrong) }
  const t = p.createdUtc
  p.signatures.push({ name: 'M. Writer', role: 'Medical writer', meaning: AUTHOR, utc: t, version: 1 }, { name: 'C. Lead', role: 'Clinical lead', meaning: APPROVER, utc: t, version: 1 }, { name: 'Dr H. Vos', role: 'Coordinating investigator', meaning: CI, utc: t, version: 1 })
  p.stage = 'approved'; snapshot(p, 'Approved')
  return p
}
function scoreCs19(p: Project): Item[] {
  const a = (p.addenda ?? [])[0]
  if (!a) return [{ label: 'An addendum started', ok: false, why: 'Open Addenda and start addendum 1.' }]
  const secs = new Set(a.changes.map((c) => c.section)), want = CS19_PLANTED.map((x) => x.section)
  return [
    ...addendumItems(p, a),
    { label: 'An erratum', ok: a.kind === 'erratum', why: 'The data did not change; the text was wrong: this is an erratum.' },
    { label: 'Every place the error appears, and only those', ok: want.every((s) => secs.has(s)) && secs.size === want.length, why: 'Search the approved report for the statement about the death: compare it with Listing 16.2.7 and section 12.3.1.' },
    { label: 'Each correction names the right group', ok: CS19_PLANTED.every((x) => a.changes.some((c) => c.section === x.section && /10 mg/.test(c.now) && !/5 mg/.test(c.now))), why: 'The participant who died was on GLV-12 10 mg (Listing 16.2.7).' },
    { label: 'Conclusions unchanged', ok: a.conclusions === 'unchanged', why: 'The group named in two sentences was wrong; the tables, the analyses and the conclusions do not change.' },
    { label: 'The public version is corrected too', ok: a.documents.includes('Public disclosure version of the report'), why: 'The redacted report for public release carries the same sentences.' },
  ]
}
export function startPhase5(id: string): Project | null {
  if (id === 'CS16') return startCs16()
  if (id === 'CS19') return startCs19()
  if (id === 'CS17') return hrpProject('Mission CS17: Post the VERDANT-1 results')
  if (id === 'CS18') return hrpProject('Mission CS18: Plan the VERDANT-1 report around database lock')
  return null
}
/** The dates a timeline is planned from: database lock (HRP-301's from the CDM Console; for other
 *  studies, the date the writer sets) and the dates in the data. */
export function timelineFacts(d: PatientData | null | undefined, study = 'HRP-301', dbl = '') {
  const prim = protocolOf(study).endpoints.find((e) => /primary/i.test(e.level))?.text ?? ''
  const dt = d && d.sdtm.domains.DS ? studyDates(d.sdtm, prim) : null
  return { dbl: study === 'HRP-301' ? HRP_DBL : dbl, pcd: dt?.lastPrimary ?? '', endOfTrial: dt?.lastVisit ?? '' }
}
export function scorePhase5(p: Project, d?: PatientData | null): Item[] | null {
  const id = p.mission!.id
  if (id === 'CS16') return scoreCs16(p)
  if (id === 'CS19') return scoreCs19(p)
  if (id === 'CS17') return d ? postingItems(p, d.sdtm) : [{ label: 'Patient data', ok: false, why: 'Loading.' }]
  if (id === 'CS18') return d ? timelineRules(p.timeline ?? {}, timelineFacts(d)) : [{ label: 'Patient data', ok: false, why: 'Loading.' }]
  return null
}
