// Phase 5 missions, from industry practice. CS16: review an AI-drafted results text, sentence by
// sentence. CS17: post the HRP-301 results to ClinicalTrials.gov and CTIS from the same outputs.
// CS18: plan the HRP-301 report around database lock.
import { newProject, defaultSlots } from '../project'
import { BUNDLED, protocolOf } from '../study'
import { postingItems, studyDates } from '../posting'
import { timelineRules } from '../timeline'
import { startCs16, scoreCs16 } from './aidraft'
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
export function startPhase5(id: string): Project | null {
  if (id === 'CS16') return startCs16()
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
  if (id === 'CS17') return d ? postingItems(p, d.sdtm) : [{ label: 'Patient data', ok: false, why: 'Loading.' }]
  if (id === 'CS18') return d ? timelineRules(p.timeline ?? {}, timelineFacts(d)) : [{ label: 'Patient data', ok: false, why: 'Loading.' }]
  return null
}
