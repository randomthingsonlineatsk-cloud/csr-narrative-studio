// The ICH E3 structure of a clinical study report, section by section, with guidance written for
// this app (E3 and its Q&A (R1) are summarised, not reproduced). Each section says what feeds it,
// which report types keep it, and whether its content is written or assembled from outputs.

export type ReportType = 'full' | 'abbreviated' | 'synopsis'
export type Feed = 'protocol' | 'sap' | 'tlf' | 'listing' | 'cdm' | 'narrative' | 'admin' | 'derived'
export interface E3Section {
  id: string; heading: string; level: 1 | 2 | 3 | 4
  guidance: string
  feeds: Feed[]
  /** Kept in an abbreviated report (E3 introduction: the safety description stays complete). */
  abbreviated: boolean
  /** Written text (true) or assembled from outputs, lists or attachments (false). */
  written: boolean
  /** May be marked not applicable, with a reason. */
  optional?: boolean
}

const S = (id: string, heading: string, guidance: string, feeds: Feed[], o: { abbreviated?: boolean; written?: boolean; optional?: boolean } = {}): E3Section =>
  ({ id, heading, level: Math.min(4, id.split('.').length) as 1 | 2 | 3 | 4, guidance, feeds, abbreviated: o.abbreviated ?? false, written: o.written ?? true, optional: o.optional })

export const E3: E3Section[] = [
  S('1', 'Title page', 'Study title, investigational product, indication, a one-line description of the design, sponsor, protocol number, phase, study start and completion dates, the coordinating investigator, the sponsor’s responsible medical officer, a statement that the study followed GCP (including archiving of essential documents), and the report date and version. Registry numbers (EU CT, NCT and others) belong here too.', ['protocol', 'admin'], { abbreviated: true }),
  S('2', 'Synopsis', 'A summary of usually no more than three pages, with numbers: design, population, treatments, endpoints, the main efficacy and safety results and the conclusions. Write it last and check every number against the body of the report, not against the tables directly. E3 Annex I gives a model layout.', ['derived'], { abbreviated: true }),
  S('3', 'Table of contents', 'Page numbers or locations of every section, summary table, figure and graph, and a list of appendices, tabulations and case report forms. Generated from the report.', ['derived'], { abbreviated: true, written: false }),
  S('4', 'List of abbreviations and definitions of terms', 'Every abbreviation and specialised term used in the report, spelled out. Abbreviations are also spelled out at their first use in the text.', ['derived'], { abbreviated: true, written: false }),
  S('5', 'Ethics', 'How the study met ethical requirements.', ['admin'], { abbreviated: true }),
  S('5.1', 'Independent ethics committee or institutional review board', 'Confirm that the protocol and every amendment were reviewed by an IEC or IRB. List the committees in appendix 16.1.3.', ['admin'], { abbreviated: true }),
  S('5.2', 'Ethical conduct of the study', 'Confirm the study followed the principles of the Declaration of Helsinki and ICH GCP.', ['admin'], { abbreviated: true }),
  S('5.3', 'Patient information and consent', 'How and when consent was obtained (at randomisation or at screening, for example). Sample forms go in 16.1.3.', ['protocol', 'admin'], { abbreviated: true }),
  S('6', 'Investigators and study administrative structure', 'The administrative structure: investigators, coordinating investigator, steering and data monitoring committees, central laboratories, contract research organisations. Names and affiliations of investigators go in 16.1.4; keep personal data out of the body for disclosure.', ['admin'], { abbreviated: true }),
  S('7', 'Introduction', 'A short page placing the study in the development of the product: the rationale, the population, the key features of the design, and any guidance or advice from regulators that shaped it.', ['protocol']),
  S('8', 'Study objectives', 'The overall purpose and the primary and secondary objectives as in the protocol, in the past tense. With ICH E9(R1), state the estimand each objective led to.', ['protocol'], { abbreviated: true }),
  S('9', 'Investigational plan', 'What was planned, in the past tense. Differences from the protocol go in 9.8.', ['protocol'], { abbreviated: true }),
  S('9.1', 'Overall study design and plan: description', 'The design (parallel, crossover, randomised, blinded, controls), treatment periods, the number of patients and sites, and a schematic diagram with the timing of assessments.', ['protocol'], { abbreviated: true }),
  S('9.2', 'Discussion of study design, including the choice of control groups', 'Why this design and control were chosen, and their limitations (for example, a placebo control and its ethics, or known problems with the design).', ['protocol']),
  S('9.3', 'Selection of study population', 'The population studied.', ['protocol'], { abbreviated: true }),
  S('9.3.1', 'Inclusion criteria', 'The inclusion criteria as in the protocol, and how the diagnosis was established.', ['protocol'], { abbreviated: true }),
  S('9.3.2', 'Exclusion criteria', 'The exclusion criteria, with the reasons for any that are not obvious.', ['protocol'], { abbreviated: true }),
  S('9.3.3', 'Removal of patients from therapy or assessment', 'The planned reasons for stopping treatment or withdrawing a patient, and what follow-up was planned for them.', ['protocol'], { abbreviated: true }),
  S('9.4', 'Treatments', 'The treatments given.', ['protocol'], { abbreviated: true }),
  S('9.4.1', 'Treatments administered', 'Each treatment, its dose and schedule, by group and period.', ['protocol'], { abbreviated: true }),
  S('9.4.2', 'Identity of investigational products', 'Formulation, strength and batch numbers (batches by patient go in 16.1.6).', ['protocol', 'admin'], { abbreviated: true }),
  S('9.4.3', 'Method of assigning patients to treatment groups', 'Randomisation method, ratio, stratification and block size, with the schedule in 16.1.7.', ['protocol', 'sap'], { abbreviated: true }),
  S('9.4.4', 'Selection of doses in the study', 'Why these doses were chosen, with the earlier evidence.', ['protocol']),
  S('9.4.5', 'Selection and timing of dose for each patient', 'How doses were set and timed for each patient, including any titration.', ['protocol']),
  S('9.4.6', 'Blinding', 'How blinding was kept (identical tablets, for example), who was unblinded and when, and any emergency unblinding.', ['protocol'], { abbreviated: true }),
  S('9.4.7', 'Prior and concomitant therapy', 'Medicines allowed and not allowed before and during the study, and rescue therapy.', ['protocol'], { abbreviated: true }),
  S('9.4.8', 'Treatment compliance', 'How compliance was measured (tablet counts, diaries, drug levels).', ['protocol'], { abbreviated: true }),
  S('9.5', 'Efficacy and safety variables', 'The measurements made.', ['protocol'], { abbreviated: true }),
  S('9.5.1', 'Efficacy and safety measurements assessed and flow chart', 'Every efficacy and safety measurement, how and when it was made, with the schedule of assessments as a flow chart. Say how adverse events were collected and how causality was judged.', ['protocol'], { abbreviated: true }),
  S('9.5.2', 'Appropriateness of measurements', 'Why the measurements are reliable and relevant, especially any new or unusual one.', ['protocol'], { optional: true }),
  S('9.5.3', 'Primary efficacy variables', 'The primary variable and, with ICH E9(R1), the primary estimand: population, variable, the strategy for each intercurrent event, and the population-level summary.', ['protocol', 'sap']),
  S('9.5.4', 'Drug concentration measurements', 'Sampling times, bioanalytical method and analysis, if drug concentrations were measured.', ['protocol'], { optional: true }),
  S('9.6', 'Data quality assurance', 'Monitoring, training, central reading, data management and audits that protected data quality.', ['admin', 'cdm'], { abbreviated: true }),
  S('9.7', 'Statistical methods planned in the protocol and determination of sample size', 'The planned statistical methods.', ['sap'], { abbreviated: true }),
  S('9.7.1', 'Statistical and analytical plans', 'The analysis sets, the primary analysis and the estimator for each estimand, sensitivity and supplementary analyses, handling of missing data, multiplicity control, interim analyses and subgroups, as planned in the protocol and SAP.', ['sap'], { abbreviated: true }),
  S('9.7.2', 'Determination of sample size', 'The assumptions (effect, variability, power, alpha, drop-out) and the resulting number of patients.', ['sap']),
  S('9.8', 'Changes in the conduct of the study or planned analyses', 'Every protocol amendment, with the date, what changed, why, and how many patients were enrolled before and after it; and every change to the planned analyses after unblinding or before it, with the reason.', ['protocol', 'sap'], { abbreviated: true }),
  S('10', 'Study patients', 'Who took part.', ['tlf'], { abbreviated: true }),
  S('10.1', 'Disposition of patients', 'Screened, randomised, treated, completed and discontinued, by group, with the reasons for discontinuation; a flow diagram (CONSORT style) helps. Every number must match table 14.1.1 and listing 16.2.1.', ['tlf', 'listing'], { abbreviated: true }),
  S('10.2', 'Protocol deviations', 'Important deviations by category and group (eligibility, wrong treatment, prohibited medicines, missed assessments), and whether they affected the analysis. The listing goes in 16.2.2.', ['cdm', 'listing'], { abbreviated: true }),
  S('11', 'Efficacy evaluation', 'The efficacy results.', ['tlf'], { abbreviated: true }),
  S('11.1', 'Data sets analysed', 'Which patients were in each analysis set, with the reasons for exclusion (listing 16.2.3).', ['tlf', 'sap']),
  S('11.2', 'Demographic and other baseline characteristics', 'Age, sex, race and ethnicity, disease characteristics and baseline values by group, for the main analysis set. Comment on any imbalance the table shows.', ['tlf'], { abbreviated: true }),
  S('11.3', 'Measurements of treatment compliance', 'The compliance results by group.', ['tlf'], { optional: true }),
  S('11.4', 'Efficacy results and tabulations of individual patient data', 'The results.', ['tlf'], { abbreviated: true }),
  S('11.4.1', 'Analysis of efficacy', 'Lead with the primary estimand: the estimate, its 95% confidence interval and p-value, for each comparison in the multiplicity order of the SAP. Then the sensitivity and supplementary analyses, then the secondary endpoints in their testing order. Name every table you cite.', ['tlf'], { abbreviated: true }),
  S('11.4.2', 'Statistical and analytical issues', 'Adjustment for covariates, missing data and drop-outs, interim analyses, multicentre studies, multiplicity, subgroups and the estimand strategies as they worked out in practice.', ['tlf', 'sap']),
  S('11.4.3', 'Tabulation of individual response data', 'By-patient efficacy data go in 16.2.6; here, a pointer and any patterns.', ['listing'], { optional: true }),
  S('11.4.4', 'Drug dose, drug concentration and relationships to response', 'Dose-response and, if measured, concentration-response.', ['tlf'], { optional: true }),
  S('11.4.5', 'Drug-drug and drug-disease interactions', 'Any interactions seen.', ['tlf'], { optional: true }),
  S('11.4.6', 'By-patient displays', 'Usually not needed; individual data go in the appendices.', ['listing'], { optional: true }),
  S('11.4.7', 'Efficacy conclusions', 'A short paragraph: what the study showed for the primary and key secondary estimands, with the size of the effect. No new results and no claims beyond the multiplicity plan.', ['derived']),
  S('12', 'Safety evaluation', 'The safety results, in three steps: exposure, common adverse events, then serious and other significant events and laboratory data.', ['tlf'], { abbreviated: true }),
  S('12.1', 'Extent of exposure', 'Duration of exposure and doses by group (number of patients exposed for given periods, mean and median duration).', ['tlf'], { abbreviated: true }),
  S('12.2', 'Adverse events', 'Adverse events in the study.', ['tlf'], { abbreviated: true }),
  S('12.2.1', 'Brief summary of adverse events', 'An overview in a few sentences: how many patients had any adverse event, any related event, any serious event, events leading to discontinuation, and deaths, by group.', ['tlf'], { abbreviated: true }),
  S('12.2.2', 'Display of adverse events', 'Treatment-emergent events by system organ class and preferred term, by group (table 14.3.1). Describe the most common events and any differences between groups.', ['tlf'], { abbreviated: true }),
  S('12.2.3', 'Analysis of adverse events', 'Events by severity, by relationship, by time of onset, and any analysis of events of special interest.', ['tlf'], { abbreviated: true }),
  S('12.2.4', 'Listing of adverse events by patient', 'Pointer to listing 16.2.7.', ['listing'], { abbreviated: true, written: false }),
  S('12.3', 'Deaths, other serious adverse events and other significant adverse events', 'The events that matter most.', ['tlf', 'listing', 'narrative'], { abbreviated: true }),
  S('12.3.1', 'Listing of deaths, other serious adverse events and other significant adverse events', 'Deaths (12.3.1.1), other serious adverse events (12.3.1.2) and other significant adverse events (12.3.1.3), including marked laboratory abnormalities and events that led to stopping treatment or reducing the dose. Listings in 14.3.2.', ['listing'], { abbreviated: true }),
  S('12.3.2', 'Narratives of deaths, other serious adverse events and certain other significant adverse events', 'One narrative for each such event (they may go in 14.3.3): the patient, the event and its course, timing against dosing, relevant laboratory values, action taken with the drug, countermeasures, outcome, and the investigator’s and sponsor’s causality opinions. Narratives are written in Phase 2 of the app.', ['narrative'], { abbreviated: true }),
  S('12.3.3', 'Analysis and discussion of deaths, other serious adverse events and other significant adverse events', 'What the serious and significant events show about the safety of the drug, compared across groups.', ['tlf'], { abbreviated: true }),
  S('12.4', 'Clinical laboratory evaluation', 'Laboratory values over time, shifts from baseline across the reference range, values of potential clinical importance, and liver tests (including any Hy’s law cases).', ['tlf', 'listing'], { abbreviated: true }),
  S('12.5', 'Vital signs, physical findings and other observations related to safety', 'Vital signs, ECGs, physical examination and other safety measurements.', ['tlf'], { abbreviated: true }),
  S('12.6', 'Safety conclusions', 'The overall safety picture: the main risks, how often they happened, and anything that needs further study.', ['derived'], { abbreviated: true }),
  S('13', 'Discussion and overall conclusions', 'The efficacy and safety results together, in the context of the disease and other treatments: the benefit, the risks, the limitations of the study, and what it means for patients. Do not repeat the results; interpret them.', ['derived'], { abbreviated: true }),
  S('14', 'Tables, figures and graphs referred to but not included in the text', 'Assembled from the study outputs: 14.1 demographic data, 14.2 efficacy data, 14.3 safety data (14.3.1 adverse events, 14.3.2 listings of deaths and serious and significant events, 14.3.3 narratives, 14.3.4 abnormal laboratory values).', ['tlf'], { abbreviated: true, written: false }),
  S('15', 'Reference list', 'Published references cited in the report, in a recognised style.', ['admin'], { abbreviated: true, written: false, optional: true }),
  S('16', 'Appendices', '16.1 study information (protocol and amendments, sample CRF, ethics committees and consent forms, investigators, signatures, batches, randomisation, audit certificates, statistical methods, laboratory standardisation, publications); 16.2 patient data listings (16.2.1 to 16.2.8); 16.3 case report forms for deaths, other serious events and withdrawals; 16.4 individual patient data listings where regulators ask for them.', ['listing', 'admin'], { abbreviated: true, written: false }),
]

export const sectionById = (id: string) => E3.find((s) => s.id === id)
/** Sections a report of this type contains. A synopsis-only report holds the title page and synopsis. */
export const sectionsFor = (t: ReportType) => (t === 'full' ? E3 : t === 'abbreviated' ? E3.filter((s) => s.abbreviated) : E3.filter((s) => ['1', '2'].includes(s.id)))
/** Headings that only group subsections (no text of their own is expected). */
export const isGroup = (s: E3Section) => E3.some((x) => x.id.startsWith(`${s.id}.`))
export const tableNumber = (title: string) => /(?:Table|Listing|Figure)\s+(\d+(?:\.\d+)+)/.exec(title)?.[1] ?? ''
/** The table of treatment-emergent adverse events by system class and preferred term: found by its
 *  title, since its number differs between studies (14.3.1 where it is the first safety table, 14.3.2
 *  where an overview comes first). */
export const isAeSocTable = (o: { title: string }) => /^14\.3\./.test(tableNumber(o.title)) && /adverse events by system (?:organ )?class/i.test(o.title)
