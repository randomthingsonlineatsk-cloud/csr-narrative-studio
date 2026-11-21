import { describe, expect, test } from 'vitest'
import { scoreMission, startMission, MISSIONS } from '../src/domain/missions'
import { methodsDraft } from '../src/domain/methods'
import { setReportType } from '../src/domain/project'
import { sectionsOf, AUTHOR, APPROVER, qcStatus, gate } from '../src/domain/workflow'
import { CI, resolve, snapshot } from '../src/domain/review'
import { loadPatientData } from '../src/domain/sdtm'
import { GLV_COMPLETE } from '../src/domain/reference'
import type { Project } from '../src/domain/types'

const failing = (p: Project) => scoreMission(p).filter((i) => !i.ok).map((i) => `${i.label}: ${i.why}`)

describe('Phase 3 missions', () => {
  test('CS9 to CS14 are defined', () => {
    expect(MISSIONS.map((m) => m.id)).toEqual(expect.arrayContaining(['CS9', 'CS10', 'CS11', 'CS13', 'CS14']))
  })

  test('CS9: the protocol text fails; drafts and a full 9.8 pass', () => {
    const p = startMission('CS9')
    expect(p.sections['9.4.8'].text).toMatch(/will|is|are/)
    expect(scoreMission(p).filter((i) => i.ok).length).toBeLessThan(4)
    for (const id of ['9.2', '9.3.3', '9.4.3', '9.4.4', '9.4.5', '9.4.7', '9.4.8', '9.7.2']) p.sections[id].text = methodsDraft('GLV-12-301', id)!
    p.sections['9.8'].text = GLV_COMPLETE['9.8']
    expect(failing(p)).toEqual([])
  })

  test('CS10: the colleague’s draft fails; a sound discussion passes', () => {
    const p = startMission('CS10')
    expect(failing(p).length).toBeGreaterThan(3)
    p.sections['13'].text = 'In this analysis of 45 randomised participants [T14.1.1], the study did not show a difference from placebo in IGA-CHE treatment success: the difference was 11.3% for lumiravostat 25 mg (95% CI -19.2 to 41.7) and 1.4% for 10 mg (95% CI -28.1 to 31.0) [T14.2.1]. HECSI-75 was tested after IGA-CHE in the fixed sequence and so cannot be interpreted. The main risks were the serious adverse events and the adverse events reported more often on lumiravostat, such as acne. The main limitation is the small number of participants. The benefit cannot be weighed against the risk until the full study is analysed.'
    p.sections['11.4.7'].text = 'The training-cut analysis did not show a difference from placebo in IGA-CHE treatment success or in HECSI-75 response at Week 16.'
    p.sections['12.6'].text = 'Treatment-emergent adverse events were reported in all groups. The serious adverse events are described in 12.3. The analysis is too small to describe uncommon risks.'
    expect(failing(p)).toEqual([])
  })

  test('CS11: an abbreviated report for HRP-205 scores fully', () => {
    const p = startMission('CS11')
    expect(scoreMission(p)[0].ok).toBe(false)
    setReportType(p, 'abbreviated')
    expect(sectionsOf(p).some((s) => s.id === '9.2')).toBe(false)
    expect(sectionsOf(p).some((s) => s.id === '12.3.1')).toBe(true)
    const T = (id: string, t: string) => { p.sections[id].text = t }
    T('9.8', 'The sponsor stopped the study on 2026-06-30 because recruitment was too slow to finish on time, after 36 of the 240 planned participants had been randomised. There was no safety or efficacy concern.')
    T('10.1', 'Of 47 participants screened, 36 were randomised: 18 to clobetasol cream and 18 to lumiravostat 25 mg [T14.1.1]. The sponsor stopped the study for 5 participants in the clobetasol cream group and 5 in the lumiravostat 25 mg group [T14.1.1].')
    T('11.4.1', 'IGA-CHE treatment success at Week 16 was reported for 5 participants (27.8%) on clobetasol cream and 6 (33.3%) on lumiravostat 25 mg [T14.2.1]. The difference was 5.6 (95% CI -24.5 to 35.6) [T14.2.1]. The lower limit is below the margin of -15 percentage points, so non-inferiority was not shown; most missing values were participants stopped by the sponsor.')
    T('12.2.1', 'Treatment-emergent adverse events were reported by 7 participants (38.9%) on clobetasol cream and 9 (50.0%) on lumiravostat 25 mg [T14.3.1]. Adverse events led 1 participant (5.6%) on clobetasol cream and 2 (11.1%) on lumiravostat 25 mg to stop treatment [T14.3.1].')
    T('12.2.2', 'Nausea and ALT increased were reported only on lumiravostat 25 mg, and skin thinning only on clobetasol cream [T14.3.1].')
    T('12.3.1', 'One participant on lumiravostat 25 mg had a serious adverse event: appendicitis starting on Day 41, severe, assessed by the investigator as not related to study treatment (Listing 16.2.7). No participant died.')
    T('12.6', 'The events seen were those expected of each treatment: nausea and liver test rises with lumiravostat, skin thinning with clobetasol. The study was too small to describe its risks fully.')
    T('13', 'The study was stopped early, after 36 of 240 planned participants, so it cannot answer its question: non-inferiority was not shown. This is its main limitation; benefit and risk cannot be weighed from it.')
    expect(failing(p)).toEqual([])
  })

  test('CS13: review to approval', async () => {
    const d = await loadPatientData('GLV-12-301')
    const p = startMission('CS13', d)
    expect(p.comments).toHaveLength(5)
    expect(p.coverage?.needed).toBe(10)
    const byText = (s: string) => p.comments!.find((c) => c.section === s)!
    p.sections['12.6'].text = p.sections['12.6'].text.replace(', and the larger fall in blood pressure on GLV-12 10 mg [T14.3.6] may explain it', '')
    p.sections['11.4.2'].text = p.sections['11.4.2'].text.replace('so no further adjustment for multiplicity was needed', 'which kept the familywise type I error rate at the planned two-sided level')
    p.sections['2'].text = p.sections['2'].text.replace('The main risk seen was light-headedness; the study was too small to describe uncommon risks.', 'The main risk seen was light-headedness. Serious adverse events: fainting, transient brain ischaemia and heart muscle infarction (GLV-12 10 mg); kidney stone and cellulitis (5 mg); pneumonia and wrist fracture (placebo).')
    for (const s of ['12.6', '11.4.2', '2']) resolve(p, byText(s).id, 'M. Writer', 'changed', '')
    resolve(p, byText('11.4.1').id, 'M. Writer', 'no change', 'The SAP makes the ANCOVA primary and the MMRM supplementary; the table title is being corrected (9.8).')
    resolve(p, byText('12.2.2').id, 'M. Writer', 'no change', 'The numbers by dose are in the next clause, from Table 14.3.1.')
    for (const q of qcStatus(p)) if (!q.auto) p.qc[q.id] = true
    expect(p.coverage).toMatchObject({ needed: 10, written: 10, clean: 10 })
    p.signatures.push({ name: 'M. Writer', role: 'Medical writer', meaning: AUTHOR, utc: '', version: 1 })
    expect(gate(p, 'final').problems).toEqual([])
    p.stage = 'final'; snapshot(p, 'Final')
    p.signatures.push({ name: 'C. Lead', role: 'Clinical lead', meaning: APPROVER, utc: '', version: 1 }, { name: 'Dr H. Vos', role: 'Coordinating investigator', meaning: CI, utc: '', version: 1 })
    expect(gate(p, 'approved').problems).toEqual([])
    p.stage = 'approved'
    expect(failing(p)).toEqual([])
  })

  test('CS14: the India items', () => {
    const p = startMission('CS14')
    const before = scoreMission(p).filter((i) => !i.ok).map((i) => i.label)
    expect(before.length).toBeGreaterThanOrEqual(8)
    p.india = {
      accrual: 'First participant enrolled 2026-01-14; last participant enrolled 2026-05-09.',
      gcp: 'The study was conducted in compliance with the Good Clinical Practice guidelines (CDSCO GCP guidelines and ICH E6) and the New Drugs and Clinical Trials Rules, 2019.',
      ec: 'The study followed the ethical principles of the Declaration of Helsinki. Site 104: Ethics Committee, Narmada Diabetes Research Centre, Ahmedabad (fictional), constituted with seven members as the Rules require; it approved the protocol on 2026-01-05 and amendment 1 on 2026-03-10. All notifications to the ethics committees followed the GCP guidelines and the ICMR National Ethical Guidelines.',
      site: 'Site 104 in India randomised 18 participants; their results were in line with those of the whole study.',
      rsi: 'GLV-12 Investigator’s Brochure, edition 5, section 7.4.',
      unexpected: 'Unexpected adverse events: back pain, fainting, transient brain ischaemia, fatigue, pneumonia, kidney stone, wrist fracture, heart muscle infarction, cellulitis, upper respiratory tract infection.',
    }
    p.signatures.push({ name: 'Dr H. Vos', role: 'Coordinating investigator', meaning: CI, utc: '', version: 1 })
    expect(failing(p)).toEqual([])
  })
})
