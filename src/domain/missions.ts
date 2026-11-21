// Missions: scored tasks on the worked studies. Each starts a project set up for the task and
// scores it with rules the learner can read. CS1 to CS5 are Phase 1.
import { newProject, defaultSlots } from './project'
import { tableNumber } from './e3'
import { BUNDLED } from './study'
import { CS2_PLANTED, cs2Draft, cs2Fixed } from './missions/cs2'
import { checkText, errors, sentences, type Finding, type TokKind } from './checker'
import { outputsOf } from './study'
import type { MissionRun, Project } from './types'
import { scoreNarrativeMission, cs8Texts, CS7_MINUTES, type PatientData } from './missions/narr'
import { CS9_SECTIONS, CS11_SECTIONS, startPhase3, scorePhase3 } from './missions/phase3'
import { startPhase4, scorePhase4 } from './missions/phase4'

export interface MissionDef { id: string; title: string; study: string; brief: string; steps: string[]; sections: string[]; core?: boolean; narratives?: boolean; /** Needs the patient data at the start (not a narrative mission). */ patients?: boolean }
export const MISSIONS: MissionDef[] = [
  { id: 'CS1', title: 'Build the report shell for VERDANT-1', study: 'HRP-301', core: true, sections: [],
    brief: 'Programming has delivered the first outputs for HRP-301 (training cut: 48 screened, 45 randomised). Build the shell: attach the outputs that feed each results section, request the outputs that are missing, and mark the sections that do not apply, with a reason.',
    steps: ['Open Shell and outputs.', 'For each section in 10 to 12, attach the outputs that feed it.', 'Where an output a section needs does not exist yet, request it by its conventional number.', 'Mark not applicable only what truly does not apply to this study, with a reason.', 'Submit.'] },
  { id: 'CS2', title: 'Text-versus-table QC: fix 25 errors', study: 'GLV-12-301', core: true, sections: ['10.1', '11.2', '11.4.1', '12.1', '12.2.1', '12.2.2'],
    brief: 'A GLV-12-301 results draft is back from a junior writer. Twenty-five numbers in six sections do not agree with their tables. Find and fix every one without introducing new errors. The checker helps; read its findings, then check the table yourself.',
    steps: ['Open each section in the Report.', 'Read the checker findings beside the text.', 'Open the table and correct the number in the text, keeping the table’s decimals.', 'When the checker is clean in all six sections, submit.'] },
  { id: 'CS3', title: 'Write the study patients sections', study: 'GLV-12-301', sections: ['10.1', '11.2'],
    brief: 'Write 10.1 Disposition of patients and 11.2 Demographic and other baseline characteristics for GLV-12-301 from Tables 14.1.1 and 14.1.2. The reviewer expects the numbers listed below to be reported, each tied to its table.',
    steps: ['Use the results helper for skeleton sentences, then write prose.', 'Report screened, randomised by group, treated, completed by group and the reasons for discontinuation.', 'Report age, sex and race for the safety population, and comment on any imbalance.', 'Name the table for each paragraph; submit when the checker is clean.'] },
  { id: 'CS4', title: 'Report the efficacy results in the right order', study: 'GLV-12-301', core: true, sections: ['11.4.1', '11.4.7'],
    brief: 'Write 11.4.1 Analysis of efficacy and 11.4.7 Efficacy conclusions for GLV-12-301. Follow the SAP: the ANCOVA (Table 14.2.1) is the primary analysis; the placebo-based multiple imputation (14.2.3) is the sensitivity analysis; the MMRM (14.2.2) is supplementary, whatever its title says. The fixed sequence tests 10 mg before 5 mg. Subgroups (Figure 14.2.4) are exploratory.',
    steps: ['Lead with the primary estimand: both differences from placebo, their 95% CIs and p-values.', 'State the testing order of the fixed sequence.', 'Then the sensitivity analysis, then the supplementary MMRM.', 'No claims for subgroups.', 'A short conclusions paragraph in 11.4.7; submit.'] },
  { id: 'CS5', title: 'Write the safety overview', study: 'GLV-12-301', core: true, sections: ['12.1', '12.2.1', '12.2.2', '12.3.1'],
    brief: 'Write 12.1 Extent of exposure, 12.2.1 Brief summary, 12.2.2 Display of adverse events and 12.3.1 Listing of deaths, other serious and significant events for GLV-12-301.',
    steps: ['Exposure by group (Table 14.3.5).', 'Any TEAE by group, discontinuations due to adverse events, and the death (Tables 14.3.1 and 14.1.1).', 'The three most common events overall, and differences between groups.', 'The serious adverse events from Listing 16.2.7: each term and group, and for the fatal one the study day and causality.', 'Report neutrally: no “only”, “mild and transient” or “well tolerated”.', 'Submit.'] },
  { id: 'CS6', title: 'Write the four VERDANT-1 SAE narratives', study: 'HRP-301', core: true, sections: [], narratives: true,
    brief: 'HRP-301 had four serious adverse events. Write a narrative for each (ICH E3 12.3.2) from the patient profile, using the fixed template: no narrative generator in this mission. Every fact must match the data and the safety case. HRP-301 records the bottles dispensed at each visit, not the days dosed: where study drug was interrupted, say so from the AE form without inventing the days.',
    steps: ['Open Narratives and pick each SAE.', 'Read the profile and timeline; insert the template.', 'Fill every prompt from the data: patient, history, medications, the event, action, dechallenge and rechallenge, outcome, both causality opinions (the sponsor’s from the safety case).', 'Where study drug was interrupted, take it from the action taken; the dosing record cannot date it.', 'Submit when all four pass QC.'] },
  { id: 'CS7', title: 'Ten GLV-12-301 narratives against the clock', study: 'GLV-12-301', sections: [], narratives: true,
    brief: `GLV-12-301 needs ten narratives: seven serious adverse events (one fatal) and three discontinuations because of an adverse event. Use the narrative generator, confirm the dechallenge and rechallenge statements, take the sponsor’s causality from each safety case, and get all ten through QC within ${CS7_MINUTES} minutes.`,
    steps: ['Open Narratives (batch mode shows the clock).', 'For each patient: fill from the data, then check every statement against the profile.', 'Confirm the dechallenge and rechallenge statements the dates support.', 'Insert the sponsor’s causality from the safety case.', 'Submit when all ten pass QC.'] },
  { id: 'CS8', title: 'QC a colleague’s narratives', study: 'GLV-12-301', sections: [], narratives: true,
    brief: 'A colleague has drafted four GLV-12-301 narratives. Twelve statements contradict the listings, the patient data or the safety database. Find and correct every one, without introducing new errors.',
    steps: ['Open Narratives: the four drafts are loaded.', 'Read each against the profile, the timeline and the safety case; the QC panel helps.', 'Correct the narrative text.', 'Submit when the four pass QC.'] },
  { id: 'CS9', title: 'Methods from the protocol', study: 'GLV-12-301', sections: [...CS9_SECTIONS, '9.8'],
    brief: 'The protocol says what will happen; the report says what did. Eight methods sections of the GLV-12-301 report hold the protocol’s own words, in the future tense. Put them in the past tense, and write 9.8: protocol amendment 1 from the version history, and every difference between the planned analyses and the outputs, each with its reason.',
    steps: ['Open each section in Write: the protocol’s text is loaded. Rewrite it in the past tense yourself (the draft button is off in this mission).', 'Clear every tense finding: “will”, “shall”, “is planned”.', 'In 9.8, name amendment 1 with its approval date, what changed and why, and how many were enrolled by then.', 'For each analysis change the panel lists, give the reason in the same sentence (because…).', 'Submit.'] },
  { id: 'CS10', title: 'Discussion and benefit–risk', study: 'HRP-301', sections: ['11.4.7', '12.6', '13'],
    brief: 'A colleague’s section 13 for the HRP-301 training cut (45 randomised) says lumiravostat was effective, safe and well tolerated. Neither difference from placebo was significant. Rewrite 13 from the benefit–risk table so the conclusion matches the results, the limitations are stated and nothing is claimed that the data do not support; write the short conclusions in 11.4.7 and 12.6 too.',
    steps: ['Open Discussion: read the benefit–risk table built from the outputs.', 'Rewrite 13: the primary result with its CI, what it means, the main risks, the limitations, benefit against risk.', 'Clear every claim the checks flag: “effective”, “safe”, “well tolerated”, “trend”.', 'Write 11.4.7 and 12.6 in the same spirit.', 'Submit.'] },
  { id: 'CS11', title: 'Write an abbreviated report', study: 'HRP-205', sections: CS11_SECTIONS,
    brief: 'HRP-205 (VERDANT-AC), a non-inferiority study of lumiravostat against clobetasol cream, was stopped by the sponsor after 36 of 240 planned participants because recruitment was too slow. Make it an abbreviated report: keep the sections an abbreviated report needs, summarise efficacy briefly without claiming non-inferiority, and keep the safety description complete.',
    steps: ['In the Overview, change the report type to abbreviated, and see which sections go.', 'In 9.8 or 10.1, say when and why the study stopped and how far it got.', 'Report disposition by group, including those stopped by the sponsor (Table 14.1.1).', 'Summarise efficacy in a few sentences: the difference, its CI and the margin.', 'Report safety in full: 12.2.1, 12.2.2, 12.3.1 (the SAE), 12.6; then 13.', 'Submit.'] },
  { id: 'CS13', title: 'Take the report through review', study: 'GLV-12-301', sections: [], patients: true,
    brief: 'The complete GLV-12-301 report is in review. Five reviewers’ comments wait in Review: some are right, one is wrong, one is answered by the text already. Resolve each (change the text, or say why not), get the QC checklist passed, collect the author’s, the approver’s and the coordinating investigator’s signatures with their meanings, and take the report to approved.',
    steps: ['Open Review: read each comment in its section.', 'Change the text where the reviewer is right, then resolve as changed; where not, resolve with no change and a reason.', 'Open Narratives to measure the coverage; QC: tick the manual items you have checked.', 'Sign as author, move to final; the approver (another person) and the coordinating investigator sign; move to approved.', 'Compare versions in Review to see what changed; submit.'] },
  { id: 'CS14', title: 'Make the India Table 6 version', study: 'GLV-12-301', sections: [],
    brief: 'GLV-12-301 enrolled 18 participants at site 104 in India. For CDSCO, the report follows the 16 headings of the New Drugs and Clinical Trials Rules, 2019, Third Schedule, Table 6. Map the complete report to Table 6 and add what Table 6 asks for that ICH E3 does not.',
    steps: ['Open India: see each Table 6 heading and the E3 sections under it.', 'Add the start and end of accrual, the GCP compliance statement, the ethics committee of site 104 with its constitution and approval date, and the declaration on notifications (GCP and ICMR guidelines).', 'Describe the participants at the Indian site.', 'Name the reference safety information and list every unexpected adverse event, serious or not (13.2).', 'The coordinating investigator signs the certificate (appendix l). Export the Table 6 version; submit.'] },
  { id: 'CS12', title: 'Redact the CSR for public release', study: 'GLV-12-301', sections: [], core: true, patients: true,
    brief: 'The GLV-12-301 report is approved and the product is authorised. Prepare the public version for the EU (CTIS), EMA Policy 0070 and Health Canada: handle every direct identifier, bring the re-identification risk to 0.09 or below on the study’s own participants, propose as commercially confidential only what each route would accept, and complete the anonymisation report.',
    steps: ['Open Disclosure and choose the routes.', 'Set a rule for each kind of identifier (participant IDs, dates, names, site numbers, ages, race) and check what is left in the text.', 'Choose which quasi-identifiers the public version keeps until every group has at least 11 participants (risk 0.09 or below).', 'Propose CCI only where every chosen route allows it, each with a reason.', 'Describe the data utility; download the disclosure package; submit.'] },
  { id: 'CS15', title: 'Capstone: the whole report from your own data', study: 'HRP-301', sections: [],
    brief: 'Write the complete VERDANT-1 (HRP-301) report from your own analysis package (TLF Programming Lab) and your own SDTM (SDTM Mapping Trainer): every section written and tied to your tables, methods from the protocol, narratives that pass QC, a discussion that matches the results, through review to approved, then handed to the eCTD Dossier Builder and the Plain Language Lab.',
    steps: ['Export: open your analysis package (.zip) from the TLF Programming Lab.', 'SAE reconciliation: open your SDTM hand-off from the SDTM Mapping Trainer.', 'Write every section; draft the methods from the protocol; write 9.8 and the discussion; write and QC the narratives.', 'Review: resolve comments; QC; sign; the approver and the coordinating investigator sign; approve.', 'Export: download the report for the eCTD (5.3.5.1) and the lay results for the Plain Language Lab; submit.'] },
]
export const missionById = (id: string) => MISSIONS.find((m) => m.id === id)

export function startMission(id: string, d?: PatientData): Project {
  const p3 = startPhase3(id, d) ?? startPhase4(id, d)
  if (p3) { p3.mission = { id, startedUtc: new Date().toISOString(), answers: {} }; return p3 }
  const m = missionById(id)!, p = newProject(`Mission ${m.id}: ${m.title}`, m.study, 'full', 'mission')
  p.mission = { id, startedUtc: new Date().toISOString(), answers: {} }
  if (id === 'CS1') {
    // The first delivery from programming: disposition (14.1.1) and exposure (14.3.5) come later.
    const b = BUNDLED[m.study], late = (o: { title: string }) => ['14.1.1', '14.3.5'].includes(tableNumber(o.title))
    p.outputs = { ...b, outputs: b.outputs.filter((o) => !late(o)) }; p.outputsSource = `${b.source}: first delivery (disposition and exposure not yet delivered)`
  }
  if (id !== 'CS1') {
    const slots = defaultSlots(BUNDLED[m.study])
    for (const [s, st] of Object.entries(p.sections)) st.slots = slots[s] ?? []
    p.stage = 'draft'
  }
  if (id === 'CS2') { const d2 = cs2Draft(); for (const [s, t] of Object.entries(d2)) p.sections[s].text = t }
  if (id === 'CS8') { if (!d) throw new Error('The patient data are still loading.'); p.narratives = Object.fromEntries(Object.entries(cs8Texts(d)).map(([k, t]) => [k, { text: t, queries: [], updatedUtc: p.createdUtc }])) }
  return p
}

export interface Item { label: string; ok: boolean; why: string }
const findingsIn = (p: Project, sec: string): Finding[] => { const d = BUNDLED[p.study], st = p.sections[sec]; return st ? checkText(sec, st.text, outputsOf(d), st.slots, d.groups, p.rounding) : [] }
const tied = (fs: Finding[], out: string, row: string, group: string, kind: TokKind) => fs.some((f) => (f.status === 'ok' || f.status === 'rounding') && f.tie && f.tie.out === out && f.tie.row === row && f.tie.group === group && f.tie.kind === kind)
interface Need { label: string; sec: string; out: string; row: string; groups: string[]; kind: TokKind }
const needs = (p: Project, list: Need[]): Item[] => list.map((n) => { const fs = findingsIn(p, n.sec), miss = n.groups.filter((g) => !tied(fs, n.out, n.row, g, n.kind)); return { label: n.label, ok: !miss.length, why: miss.length ? `Not found, tied to its cell, for ${miss.join(', ')}.` : 'Reported and tied to the table.' } })
const clean = (p: Project, secs: string[]): Item => { const e = secs.flatMap((s) => errors(findingsIn(p, s))); return { label: 'No checker errors', ok: !e.length, why: e.length ? `${e.length} error${e.length === 1 ? '' : 's'}: ${e.slice(0, 3).map((x) => `${x.section} “${x.text}”`).join(', ')}.` : 'The checker is clean.' } }
const G = ['Placebo', 'GLV-12 5 mg', 'GLV-12 10 mg'], ALL = [...G, 'Total']

/** CS1 reference: what each section needs. Requests name conventional output numbers. */
export const CS1_KEY: Record<string, { slots?: string[]; requests?: string[]; na?: boolean; why: string }> = {
  '10.1': { requests: ['14.1.1'], why: 'Disposition is Table 14.1.1, which programming has not delivered yet: request it.' },
  '11.2': { slots: ['T1'], why: 'Demographics are in Table 14.1.2 (T1).' },
  '11.4.1': { slots: ['T3', 'T4'], why: 'IGA-CHE (primary, 14.2.1) and HECSI-75 (key secondary, 14.2.2).' },
  '11.4.4': { slots: ['T3'], why: 'Two doses were tested (10 mg and 25 mg): dose-response applies, from the efficacy tables. Not “not applicable”.' },
  '11.4.5': { na: true, why: 'No interaction analyses were planned: not applicable, with that reason.' },
  '11.4.6': { na: true, why: 'Individual data go in the appendices: not applicable here.' },
  '12.1': { requests: ['14.3.5'], why: 'Exposure is Table 14.3.5, not yet delivered: request it.' },
  '12.2.1': { slots: ['T2'], why: 'The TEAE table, 14.3.1.' },
  '12.2.2': { slots: ['T2'], why: 'The TEAE table, 14.3.1.' },
  '12.3.1': { slots: ['L1'], why: 'Serious adverse events are in Listing 16.2.7 (L1).' },
  '12.4': { requests: ['14.3.4'], why: 'Laboratory shifts (14.3.4) are planned but not delivered: request them.' },
  '12.5': { requests: ['14.3.6'], why: 'Vital signs (14.3.6): request.' },
}
/** Outputs a writer can request: the conventional numbering of section 14 and 16.2. */
export const REQUESTABLE: { id: string; title: string }[] = [
  { id: '14.1.1', title: 'Disposition' }, { id: '14.1.3', title: 'Analysis sets' }, { id: '14.1.4', title: 'Protocol deviations' },
  { id: '14.3.2', title: 'Deaths, serious and significant AEs' }, { id: '14.3.4', title: 'Laboratory shifts' }, { id: '14.3.5', title: 'Extent of exposure' },
  { id: '14.3.6', title: 'Vital signs' }, { id: '14.3.7', title: 'Concomitant medications' }, { id: '16.2.1', title: 'Discontinued patients' }, { id: '16.2.2', title: 'Protocol deviations listing' },
]

export function scoreMission(p: Project, d?: PatientData | null): Item[] {
  if (missionById(p.mission!.id)?.narratives) return d ? scoreNarrativeMission(p, d) : []
  const p3 = scorePhase3(p) ?? scorePhase4(p, d); if (p3) return p3
  const id = p.mission!.id, S = (s: string) => p.sections[s]?.text ?? ''
  if (id === 'CS1') return Object.entries(CS1_KEY).map(([sec, k]) => {
    const st = p.sections[sec]; if (!st) return { label: sec, ok: false, why: 'Missing section.' }
    const slots = st.slots, req = st.requests ?? []
    const ok = k.na ? !!st.na?.trim() : !st.na && (k.slots ?? []).every((x) => slots.includes(x)) && (k.requests ?? []).every((x) => req.includes(x)) && !slots.some((x) => sec.startsWith('12') ? ['T1', 'T3', 'T4'].includes(x) : ['T2', 'L1'].includes(x))
    return { label: `${sec}`, ok, why: k.why }
  })
  if (id === 'CS2') {
    const f = cs2Fixed(Object.fromEntries(Object.entries(p.sections).map(([k, v]) => [k, v.text])))
    const extra = MISSIONS[1].sections.flatMap((s) => errors(findingsIn(p, s))).length
    return [...f.map((x) => ({ label: `Error ${x.n}: ${x.kind} (${x.section})`, ok: x.fixed, why: x.why })), { label: 'No errors left or introduced', ok: extra === 0, why: extra ? `${extra} checker error${extra === 1 ? '' : 's'} remain.` : 'The six sections are clean.' }]
  }
  if (id === 'CS3') return [
    ...needs(p, [
      { label: 'Screened and screen failures', sec: '10.1', out: 'T4', row: 'Screened', groups: ['Total'], kind: 'n' },
      { label: 'Randomised, by group', sec: '10.1', out: 'T4', row: 'Randomised', groups: G, kind: 'n' },
      { label: 'Treated (all participants)', sec: '10.1', out: 'T4', row: 'Treated', groups: ['Total'], kind: 'n' },
      { label: 'Completed, by group, with %', sec: '10.1', out: 'T4', row: 'Completed the study', groups: G, kind: 'pct' },
      { label: 'Discontinued because of an adverse event', sec: '10.1', out: 'T4', row: 'Adverse event', groups: ['Total'], kind: 'n' },
      { label: 'Death', sec: '10.1', out: 'T4', row: 'Death', groups: ['GLV-12 10 mg'], kind: 'n' },
      { label: 'Mean (SD) age, all participants', sec: '11.2', out: 'T1', row: 'Mean (SD)', groups: ['Total'], kind: 'mean' },
      { label: 'Sex: women, all participants', sec: '11.2', out: 'T1', row: 'F', groups: ['Total'], kind: 'pct' },
      { label: 'Race: the largest group', sec: '11.2', out: 'T1', row: 'ASIAN', groups: ['Total'], kind: 'pct' },
    ]),
    { label: 'Screen failures reported', ok: /screen(?:ing)? fail/i.test(S('10.1')) && tied(findingsIn(p, '10.1'), 'T4', 'Screen failures', 'Total', 'n'), why: '9 screen failures (Table 14.1.1).' },
    { label: 'Imbalance commented on', ok: /imbalanc|more (?:men|women|male|female)|fewer|similar|balanced/i.test(S('11.2')), why: 'The 10 mg group had more men (65.4%) than placebo (40.7%): say so, or say the groups were similar.' },
    clean(p, ['10.1', '11.2']),
  ]
  if (id === 'CS4') {
    const fs = findingsIn(p, '11.4.1'), first = fs.find((f) => f.tie)
    const sens = sentences(S('11.4.1')), cites = (n: string) => sens.filter((x) => x.s.includes(n))
    const order = sens.some((x) => /fixed|hierarch|sequen|order/i.test(x.s) && /10 mg/.test(x.s) && /5 mg/.test(x.s) && x.s.search(/10 mg/) < x.s.search(/(?<!1)5 mg/))
    const t9Primary = cites('14.2.2').some((x) => /primary/i.test(x.s) && !/supplementary|not (?:the )?primary/i.test(x.s))
    const subgroupClaim = [...sens, ...sentences(S('11.4.7'))].some((x) => /subgroup|14\.2\.4|forest/i.test(x.s) && /\b(benefit|greater|better|more effective|superior|significant|stronger)\b/i.test(x.s) && !/not|no |exploratory/i.test(x.s))
    return [
      { label: 'Primary analysis first', ok: first?.tie?.out === 'T3', why: first?.tie ? `The first number ties to ${first.tie.table ? `Table ${first.tie.table}` : first.tie.out}; the primary ANCOVA is Table 14.2.1.` : 'No number tied to a table yet.' },
      ...needs(p, [
        { label: 'Difference from placebo, both doses', sec: '11.4.1', out: 'T3', row: 'Difference from placebo (95% CI)', groups: ['GLV-12 5 mg', 'GLV-12 10 mg'], kind: 'est' },
        { label: '95% CI lower limits', sec: '11.4.1', out: 'T3', row: 'Difference from placebo (95% CI)', groups: ['GLV-12 5 mg', 'GLV-12 10 mg'], kind: 'lcl' },
        { label: '95% CI upper limits', sec: '11.4.1', out: 'T3', row: 'Difference from placebo (95% CI)', groups: ['GLV-12 5 mg', 'GLV-12 10 mg'], kind: 'ucl' },
      ]),
      { label: 'p-values reported', ok: /p\s*<\s*0\.001/i.test(cites('14.2.1').map((x) => x.s).join(' ')), why: 'Both comparisons: p<0.001 (Table 14.2.1).' },
      { label: 'Testing order of the fixed sequence', ok: order, why: 'Say that 10 mg was tested first, then 5 mg.' },
      { label: 'Sensitivity analysis reported as such', ok: cites('14.2.3').some((x) => /sensitivity|multiple imputation/i.test(x.s)), why: 'Cite Table 14.2.3 as the sensitivity analysis.' },
      { label: 'MMRM not called primary', ok: !t9Primary && cites('14.2.2').length > 0, why: t9Primary ? 'The SAP makes the MMRM supplementary; its table title is wrong.' : cites('14.2.2').length ? 'Reported as supplementary.' : 'Report the supplementary MMRM (Table 14.2.2).' },
      { label: 'No subgroup claims', ok: !subgroupClaim, why: 'Subgroups are exploratory: describe consistency, make no claims.' },
      { label: 'Conclusions written', ok: S('11.4.7').trim().length > 80 && !/\[To be written/.test(S('11.4.7')), why: 'A short paragraph in 11.4.7.' },
      clean(p, ['11.4.1', '11.4.7']),
    ]
  }
  if (id === 'CS5') {
    const all = ['12.1', '12.2.1', '12.2.2', '12.3.1'].map(S).join(' ')
    return [
      ...needs(p, [
        { label: 'Mean (SD) exposure, by group', sec: '12.1', out: 'T5', row: 'Mean (SD)', groups: G, kind: 'mean' },
        { label: 'Any TEAE, by group and overall', sec: '12.2.1', out: 'T2', row: 'Participants with at least one TEAE', groups: ALL, kind: 'n' },
        { label: 'Discontinued because of an AE', sec: '12.2.1', out: 'T4', row: 'Adverse event', groups: ['Total'], kind: 'n' },
        { label: 'Most common event overall', sec: '12.2.2', out: 'T2', row: 'Light-headedness', groups: ['Total'], kind: 'n' },
        { label: 'Second most common event', sec: '12.2.2', out: 'T2', row: 'Back pain', groups: ['Total'], kind: 'n' },
        { label: 'Third most common event', sec: '12.2.2', out: 'T2', row: 'Fatigue', groups: ['Total'], kind: 'n' },
      ]),
      { label: 'The death reported', ok: /\bdie[ds]\b|\bdeath\b/i.test(S('12.2.1') + S('12.3.1')), why: 'One participant on GLV-12 10 mg died (Table 14.1.1).' },
      { label: 'Every serious adverse event named', ok: ['fainting', 'transient brain ischaemia', 'heart muscle infarction', 'kidney stone', 'cellulitis', 'pneumonia', 'wrist fracture'].every((t) => S('12.3.1').toLowerCase().includes(t)), why: 'Seven SAEs in Listing 16.2.7: fainting, transient brain ischaemia, heart muscle infarction (GLV-12 10 mg); kidney stone, cellulitis (5 mg); pneumonia, wrist fracture (placebo).' },
      { label: 'The fatal SAE: group, day, causality', ok: /heart muscle infarction/i.test(S('12.3.1')) && /10 mg/.test(S('12.3.1')) && /\bday\s*97\b/i.test(S('12.3.1')) && /not related|unrelated/i.test(S('12.3.1')) && /16\.2\.7/.test(S('12.3.1')), why: 'Heart muscle infarction, GLV-12 10 mg, Day 97, not related (Listing 16.2.7).' },
      { label: 'Neutral wording', ok: !/\bonly\b|mild and transient|well[- ]tolerated|no safety concerns/i.test(all), why: 'Avoid “only”, “mild and transient”, “well tolerated”: report what the data show.' },
      clean(p, ['12.1', '12.2.1', '12.2.2', '12.3.1']),
    ]
  }
  return []
}
/** Pass and expert marks, as in the other apps: 80 to pass, 100 (every check met) for expert. */
export const PASS = 80, EXPERT = 100
export const levelOf = (score: number) => (score >= EXPERT ? 'expert' : score >= PASS ? 'passed' : 'not yet')
export const scoreOf = (items: Item[]) => Math.round((100 * items.filter((x) => x.ok).length) / Math.max(1, items.length))
export function submit(p: Project, d?: PatientData | null): MissionRun { const items = scoreMission({ ...p, mission: { ...p.mission!, submittedUtc: new Date().toISOString() } }, d); return { ...p.mission!, submittedUtc: new Date().toISOString(), score: scoreOf(items), detail: items.map((i) => ({ label: i.label, got: i.ok ? 1 : 0, of: 1 })) } }
export { CS2_PLANTED }
