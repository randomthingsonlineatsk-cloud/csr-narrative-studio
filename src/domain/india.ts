// The India version of the report: the 16 headings of the New Drugs and Clinical Trials Rules,
// 2019, Third Schedule, Table 6 (structure, content and format for a clinical trial report),
// each mapped to the ICH E3 sections that fill it, and the items Table 6 asks for that E3 does
// not: a statement of compliance with the GCP guidelines, the ethics committees of each site
// with their approval dates and a declaration on notifications (GCP and ICMR guidelines), the
// start and end of accrual on the title page, a synopsis of one to two pages, the complete list
// of serious adverse events (13.1) and of unexpected adverse events, serious or not (13.2), and
// the investigator's certificate (appendix l).
import { sectionById, tableNumber } from './e3'
import { outputsOf } from './study'
import { dataOf, PLACEHOLDER } from './project'
import { CI } from './review'
import type { Project } from './types'

export interface T6Heading { n: number; title: string; e3: string[]; note: string; india?: (keyof IndiaFields)[] }
export interface IndiaFields { gcp: string; ec: string; accrual: string; rsi: string; unexpected: string; site: string }
export const EMPTY_INDIA: IndiaFields = { gcp: '', ec: '', accrual: '', rsi: '', unexpected: '', site: '' }

export const TABLE6: T6Heading[] = [
  { n: 1, title: 'Title Page', e3: ['1'], note: 'Title, protocol code, name of the investigational product, development phase, indication, a brief description of the design, the start and end of accrual, the sponsor, and the institutes and investigators.', india: ['accrual'] },
  { n: 2, title: 'Study Synopsis (1 to 2 pages)', e3: ['2'], note: 'A brief overview of the study from the protocol through to the results and conclusions: one to two pages.' },
  { n: 3, title: 'Statement of compliance with the Good Clinical Practices Guidelines', e3: [], note: 'A statement that the trial followed the Good Clinical Practice guidelines (CDSCO GCP and ICH E6) and the New Drugs and Clinical Trials Rules, 2019.', india: ['gcp'] },
  { n: 4, title: 'List of abbreviations and definitions', e3: ['4'], note: 'As E3 section 4.' },
  { n: 5, title: 'Table of contents', e3: ['3'], note: 'As E3 section 3.' },
  { n: 6, title: 'Ethics Committee', e3: ['5', '5.1', '5.2', '5.3'], note: 'That the study followed the ethical principles of the Declaration of Helsinki; the constitution of each ethics committee and the date it approved the protocol, by site; and a declaration that the notifications to the ethics committees followed the GCP guidelines and the ICMR ethical guidelines.', india: ['ec'] },
  { n: 7, title: 'Study Team', e3: ['6'], note: 'The administrative structure of the study: investigators, coordinating investigator, committees, laboratories and contract organisations.' },
  { n: 8, title: 'Introduction', e3: ['7'], note: 'The product, its development and the rationale for the study.' },
  { n: 9, title: 'Study Objective', e3: ['8'], note: 'The primary and secondary objectives.' },
  { n: 10, title: 'Investigational Plan', e3: ['9', '9.1', '9.2', '9.3', '9.3.1', '9.3.2', '9.3.3', '9.4', '9.4.1', '9.4.2', '9.4.3', '9.4.4', '9.4.5', '9.4.6', '9.4.7', '9.4.8', '9.5', '9.5.1', '9.5.2', '9.5.3', '9.5.4', '9.6', '9.7', '9.7.1', '9.7.2', '9.8'], note: 'The design, population, treatments, measurements, data quality, statistics and any changes in conduct.' },
  { n: 11, title: 'Trial Subjects', e3: ['10', '10.1', '10.2'], note: 'The numbers screened, randomised and prematurely discontinued, with the reasons, and the protocol deviations. Describe the participants enrolled at Indian sites.', india: ['site'] },
  { n: 12, title: 'Efficacy evaluation', e3: ['11', '11.1', '11.2', '11.3', '11.4', '11.4.1', '11.4.2', '11.4.3', '11.4.4', '11.4.5', '11.4.6', '11.4.7'], note: 'The efficacy results, by analysis set.' },
  { n: 13, title: 'Safety Evaluation', e3: ['12', '12.1', '12.2', '12.2.1', '12.2.2', '12.2.3', '12.2.4', '12.3', '12.3.1', '12.3.2', '12.3.3', '12.4', '12.5', '12.6'], note: 'The complete list of 13.1 all serious adverse events, expected or unexpected, and 13.2 unexpected adverse events, serious or not, against the reference safety information; brief narratives of the important events.', india: ['rsi', 'unexpected'] },
  { n: 14, title: 'Discussion and overall Conclusion', e3: ['13'], note: 'As E3 section 13.' },
  { n: 15, title: 'List of References', e3: ['15'], note: 'As E3 section 15.' },
  { n: 16, title: 'Appendices', e3: ['14', '16'], note: 'Appendices (a) to (l); appendix (l) is the investigator’s certificate.' },
]
export const APPENDICES: { id: string; text: string; e3: string }[] = [
  { id: 'a', text: 'Protocol and amendments', e3: '16.1.1' }, { id: 'b', text: 'Specimen of Case Record Form', e3: '16.1.2' },
  { id: 'c', text: 'Investigators’ names with contact addresses, phone, e-mail', e3: '16.1.4' }, { id: 'd', text: 'Patient data listings', e3: '16.2' },
  { id: 'e', text: 'List of trial participants treated with investigational product', e3: '16.2.1' }, { id: 'f', text: 'Discontinued participants', e3: '16.2.1' },
  { id: 'g', text: 'Protocol deviations', e3: '16.2.2' }, { id: 'h', text: 'Case Record Forms of cases involving death and life-threatening adverse events', e3: '16.3.1' },
  { id: 'i', text: 'Publications from the trial', e3: '16.1.11' }, { id: 'j', text: 'Important publications referenced in the study', e3: '16.1.12' },
  { id: 'k', text: 'Audit certificate, if available', e3: '16.1.8' }, { id: 'l', text: 'Investigator’s certificate that he or she has read the report and that it accurately describes the conduct and the results of the study', e3: '16.1.5' },
]

/** The reference safety information of each product's investigator's brochure (fictional, training). */
export const RSI: Record<string, { source: string; terms: string[] }> = {
  'HRP-301': { source: 'Lumiravostat Investigator’s Brochure, edition 3, section 7', terms: ['Upper respiratory tract infection', 'ALT increased', 'Alanine aminotransferase increased'] },
  'HRP-205': { source: 'Lumiravostat Investigator’s Brochure, edition 3, section 7', terms: ['Upper respiratory tract infection', 'ALT increased', 'Alanine aminotransferase increased'] },
  'GLV-12-301': { source: 'GLV-12 Investigator’s Brochure, edition 5, section 7.4', terms: ['Light-headedness', 'Head pain', 'Nausea', 'Diarrhoea', 'Liver enzymes raised'] },
}
/** Indian sites and their participants (from DM: COUNTRY = IND). */
export const INDIAN_SITES: Record<string, { site: string; n: number; committee: string }[]> = {
  'HRP-301': [{ site: '303', n: 12, committee: 'Institutional Ethics Committee, Deccan Institute of Dermatology, Hyderabad (fictional)' }],
  'GLV-12-301': [{ site: '104', n: 18, committee: 'Ethics Committee, Narmada Diabetes Research Centre, Ahmedabad (fictional)' }],
  'HRP-205': [{ site: '2108', n: 6, committee: 'Institutional Ethics Committee, Konkan Skin Hospital, Pune (fictional)' }],
}

/** Preferred terms in the adverse event table, split by the RSI. */
export function aeByExpectedness(p: Project): { term: string; counts: string; expected: boolean }[] {
  const d = outputsOf(dataOf(p)).find((o) => tableNumber(o.title) === '14.3.1')?.display, rsi = RSI[p.study]?.terms.map((t) => t.toLowerCase()) ?? []
  if (!d) return []
  return d.rows.filter((r) => r.indent).map((r) => ({ term: r.label, counts: r.cells.map((c, i) => `${d.groups[i]} ${c.text}`).join('; '), expected: rsi.includes(r.label.toLowerCase()) }))
}
export const seriousTerms = (p: Project) => { const l = dataOf(p).outputs.find((o) => tableNumber(o.title) === '16.2.7'); if (!l) return []; const i = l.frame.columns.indexOf('AEDECOD'); return [...new Set(l.frame.rows.map((r) => String(r[i])))] }

const words = (t: string) => t.split(/\s+/).filter(Boolean).length
const DATE = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/g
export interface IndiaItem { id: string; heading: number; label: string; ok: boolean; why: string }
/** The India-only items of Table 6, and whether each heading has its content. */
export function indiaItems(p: Project): IndiaItem[] {
  const f = { ...EMPTY_INDIA, ...p.india }, S = (id: string) => (p.sections[id]?.na ? 'n/a' : p.sections[id]?.text ?? '')
  const filled = (id: string) => { const st = p.sections[id]; return !!st && (!!st.na || sectionById(id)?.written === false || (!!st.text.trim() && !PLACEHOLDER.test(st.text)) || !!st.slots.length) }
  const sites = INDIAN_SITES[p.study] ?? [], ae = aeByExpectedness(p), unexpected = ae.filter((a) => !a.expected), sae = seriousTerms(p)
  const lowU = f.unexpected.toLowerCase(), safety = ['12.2.1', '12.2.2', '12.3.1', '12.3.3'].map(S).join(' ').toLowerCase()
  const syn = words(S('2'))
  const unmapped = TABLE6.filter((h) => h.e3.length && !h.e3.some(filled))
  return [
    { id: 'map', heading: 0, label: 'Every Table 6 heading has its content', ok: !unmapped.length, why: unmapped.length ? `Nothing yet for: ${unmapped.map((h) => `${h.n} ${h.title}`).join('; ')}.` : 'Each heading maps to written E3 sections.' },
    { id: 'accrual', heading: 1, label: 'Title page: start and end of accrual', ok: (f.accrual.match(DATE) ?? []).length >= 2, why: 'Give the date the first participant was enrolled and the date the last one was (two dates).' },
    { id: 'synopsis', heading: 2, label: 'Synopsis of one to two pages', ok: syn > 150 && syn <= 1000, why: `The synopsis has ${syn} words; Table 6 asks for one to two pages (up to about 1,000 words).` },
    { id: 'gcp', heading: 3, label: 'Statement of compliance with the GCP guidelines', ok: /good clinical practice|\bGCP\b/i.test(f.gcp) && /new drugs and clinical trials rules,? 2019|NDCT Rules/i.test(f.gcp), why: 'Name the Good Clinical Practice guidelines and the New Drugs and Clinical Trials Rules, 2019.' },
    { id: 'helsinki', heading: 6, label: 'Ethics: the Declaration of Helsinki', ok: /helsinki/i.test(f.ec + S('5.2')), why: 'State that the study followed the ethical principles of the Declaration of Helsinki.' },
    { id: 'ec-sites', heading: 6, label: 'Ethics committee and approval date of each Indian site', ok: sites.length > 0 && sites.every((s) => f.ec.includes(s.site) && (f.ec.match(DATE) ?? []).length >= 1) && /constitut|members|composition/i.test(f.ec), why: `For ${sites.map((s) => `site ${s.site} (${s.committee})`).join(', ')}: the committee, its constitution and the date it approved the protocol.` },
    { id: 'icmr', heading: 6, label: 'Declaration on notifications: GCP and ICMR guidelines', ok: /icmr/i.test(f.ec) && /notif/i.test(f.ec), why: 'Declare that the notifications to the ethics committees followed the GCP guidelines and the ICMR National Ethical Guidelines.' },
    { id: 'team', heading: 7, label: 'Study team', ok: S('6').trim().length > 40, why: 'Section 6 describes the administrative structure.' },
    { id: 'subjects', heading: 11, label: 'Trial subjects: screened, randomised, discontinued with reasons', ok: /screen/i.test(S('10.1')) && /randomi[sz]ed/i.test(S('10.1')) && /discontinu|withdr/i.test(S('10.1')), why: 'Table 6 names the numbers screened, randomised and prematurely discontinued, with the reasons.' },
    { id: 'site', heading: 11, label: 'Participants at Indian sites', ok: sites.every((s) => new RegExp(`\\b${s.n}\\b`).test(f.site)) && /india/i.test(f.site), why: `Say how many participants the Indian site${sites.length === 1 ? '' : 's'} enrolled (${sites.map((s) => `site ${s.site}: ${s.n}`).join(', ')}) and how their results compare.` },
    { id: 'sae', heading: 13, label: '13.1: every serious adverse event listed', ok: sae.every((t) => safety.includes(t.toLowerCase())), why: `Name every SAE, expected or not: ${sae.join(', ')}.` },
    { id: 'rsi', heading: 13, label: '13.2: the reference safety information named', ok: /brochure|\bIB\b|RSI|reference safety/i.test(f.rsi) && /edition|version|\bed\.|\bv\d/i.test(f.rsi), why: `Say which document decided what was expected, with its edition: ${RSI[p.study]?.source ?? 'the investigator’s brochure'}.` },
    { id: 'unexpected', heading: 13, label: '13.2: every unexpected adverse event, serious or not', ok: unexpected.length > 0 && unexpected.every((a) => lowU.includes(a.term.toLowerCase())), why: `Not listed: ${unexpected.filter((a) => !lowU.includes(a.term.toLowerCase())).map((a) => a.term).join(', ') || 'none'}.` },
    { id: 'expected', heading: 13, label: '13.2: no expected event listed as unexpected', ok: !ae.filter((a) => a.expected).some((a) => lowU.includes(a.term.toLowerCase())), why: `${ae.filter((a) => a.expected).map((a) => a.term).join(', ')} ${ae.filter((a) => a.expected).length === 1 ? 'is' : 'are'} in the RSI: expected.` },
    { id: 'certificate', heading: 16, label: 'Appendix (l): the investigator’s certificate', ok: p.signatures.some((s) => s.version === p.version && s.meaning === CI), why: 'The coordinating investigator signs that the report describes the conduct and results accurately (also E3 16.1.5).' },
  ]
}
