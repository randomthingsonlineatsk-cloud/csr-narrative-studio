import { useEffect, useState } from 'react'
import { loadPatientData } from '../domain/sdtm'
import type { PatientData } from '../domain/missions/narr'
import type { Project } from '../domain/types'

/** The patient data for a report: the learner's own files if imported, else the bundled ones. */
export function usePatientData(p: Project | null): PatientData | null {
  const [d, setD] = useState<PatientData | null>(null)
  const study = p?.study, sdtm = p?.sdtm, safety = p?.safety
  useEffect(() => {
    if (!study) return
    let on = true
    loadPatientData(study).then((x) => { if (on) setD({ sdtm: sdtm ?? x.sdtm, safety: safety ?? x.safety }) }).catch(() => {})
    return () => { on = false }
  }, [study, sdtm, safety])
  return d
}
