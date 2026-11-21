// Public disclosure of the CSR: anonymisation of personal data and proposals for commercially
// confidential information (CCI), for three routes:
//   - EU CTR (CTIS): since 18 June 2024 the revised transparency rules publish the CSR after the
//     marketing authorisation decision; the sponsor uploads versions with personal data and CCI
//     removed (Regulation (EU) No 536/2014, Articles 37(4) and 81(4)).
//   - EMA Policy 0070 (clinical data publication; external guidance version 1.5, May 2025):
//     modules 2.5, 2.7 and 5.3, anonymised, with an anonymisation report; CCI accepted rarely.
//   - Health Canada Public Release of Clinical Information (since March 2019): re-identification
//     risk threshold 0.09 (a cell size of 11); only two kinds of clinical information may stay
//     confidential: information not used to support the proposed conditions of use, and tests,
//     methods or assays used exclusively by the manufacturer.
// Risk is measured on the study's own participants: risk = 1 / the smallest group of
// participants who share the published quasi-identifiers, rounded to two decimals, against 0.09.
import { rows, str } from './sdtm'
import type { PatientData } from './missions/narr'
import type { Project } from './types'

export type Route = 'ctis' | 'ema' | 'hc'
export const ROUTES: { id: Route; name: string; short: string; note: string }[] = [
  { id: 'ctis', name: 'EU CTR (CTIS public portal)', short: 'CTIS', note: 'Revised transparency rules since 18 June 2024: the CSR is published after the marketing authorisation decision, in a version without personal data or CCI.' },
  { id: 'ema', name: 'EMA Policy 0070 (clinical data publication)', short: 'EMA', note: 'Modules 2.5, 2.7 and 5.3 with protocol, sample CRF and SAP; anonymised, with an anonymisation report. CCI is accepted only rarely and must be justified.' },
  { id: 'hc', name: 'Health Canada PRCI', short: 'Health Canada', note: 'Modules 2.5, 2.7 and 5.3; risk threshold 0.09 (cell size 11); only two kinds of clinical information may stay confidential.' },
]
export const THRESHOLD = 0.09

export type IdKind = 'subject' | 'date' | 'name' | 'site' | 'age' | 'race'
export const ID_LABEL: Record<IdKind, string> = { subject: 'Participant ID', date: 'Calendar date', name: 'Person’s name', site: 'Site number', age: 'Exact age', race: 'Race' }
export type IdRule = 'keep' | 'redact' | 'pseudonymise' | 'offset' | 'band' | 'generalise'
export const RULE_CHOICES: Record<IdKind, IdRule[]> = { subject: ['pseudonymise', 'redact', 'keep'], date: ['offset', 'redact', 'keep'], name: ['redact', 'keep'], site: ['generalise', 'redact', 'keep'], age: ['band', 'redact', 'keep'], race: ['redact', 'keep'] }
export const RULE_LABEL: Record<IdRule, string> = { keep: 'Keep as it is', redact: 'Redact', pseudonymise: 'Replace with a new ID', offset: 'Shift all dates by one secret offset', band: 'Ten-year band', generalise: 'Replace with “a study site”' }

export type AgeQI = 'exact' | '10y' | '65' | 'drop'
export type SimpleQI = 'keep' | 'group' | 'drop'
export interface QIs { age: AgeQI; sex: 'keep' | 'drop'; race: SimpleQI; country: SimpleQI }
export const QI_LABEL = { age: { exact: 'Exact age', '10y': 'Ten-year bands', '65': 'Under 65 / 65 and over', drop: 'Not published' }, sex: { keep: 'Published', drop: 'Not published' }, race: { keep: 'Each category', group: 'White / all other', drop: 'Not published' }, country: { keep: 'Each country', group: 'Region', drop: 'Not published' } } as const

export interface CciProposal { propose: boolean; reason: string }
export interface DisclosureState { routes: Route[]; rules: Record<IdKind, IdRule>; qi: QIs; cci: Record<string, CciProposal>; utility: string; offsetDays: number }
export const DEFAULT_DISCLOSURE = (): DisclosureState => ({ routes: [], rules: { subject: 'keep', date: 'keep', name: 'keep', site: 'keep', age: 'keep', race: 'keep' }, qi: { age: 'exact', sex: 'keep', race: 'keep', country: 'keep' }, cci: {}, utility: '', offsetDays: -(37 + Math.floor(Math.random() * 300)) })

// ---------- identifiers in the text ----------
export interface Hit { kind: IdKind; text: string; at: number }
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
const RACE_WORDS = /\b(White|Black(?: or African American)?|Asian|Native Hawaiian or (?:other|Other) Pacific Islander|American Indian or Alaska Native|multiple races)\b/g
function patterns(d?: PatientData | null): [IdKind, RegExp][] {
  const ids = d ? rows(d.sdtm, 'DM').flatMap((r) => [str(r.USUBJID), str(r.SUBJID)]).filter(Boolean).sort((a, b) => b.length - a.length) : []
  const idRe = ids.length ? new RegExp(`\\b(?:${ids.map((x) => x.replace(/[-]/g, '\\-')).join('|')})\\b`, 'g') : /\b[A-Z]{2,4}-\d{2,3}(?:-\d{3}){2,3}\b/g
  return [
    ['subject', idRe],
    ['date', new RegExp(`\\b20\\d\\d-\\d\\d-\\d\\d(?:T\\d\\d:\\d\\d)?\\b|\\b\\d{1,2} (?:${MONTHS}) 20\\d\\d\\b`, 'g')],
    ['name', /\b(?:Dr|Prof|Professor|Mr|Mrs|Ms)\.? [A-Z][a-z]+(?: [A-Z]\.)?(?: [A-Z][a-z]+)?\b/g],
    ['site', /\bsites? \d{3,4}\b/gi],
    ['age', /\b\d{2}-year-old\b|\baged \d{2}\b(?! (?:or|to|and))/g],
    ['race', RACE_WORDS],
  ]
}
export function findIdentifiers(text: string, d?: PatientData | null): Hit[] {
  const out: Hit[] = []
  for (const [kind, re] of patterns(d)) for (const m of text.matchAll(re)) out.push({ kind, text: m[0], at: m.index ?? 0 })
  // Remove overlaps (a subject ID contains digits that look like other things).
  out.sort((a, b) => a.at - b.at || b.text.length - a.text.length)
  return out.filter((h, i) => !out.slice(0, i).some((x) => h.at < x.at + x.text.length && x.at < h.at + h.text.length))
}

// ---------- transformations ----------
export interface LogEntry { location: string; kind: IdKind | 'cci'; method: string; replacement: string; justification: string }
const band = (age: number) => { const lo = Math.floor(age / 10) * 10; return `${lo}–${lo + 9}` }
function shiftDate(s: string, days: number) {
  const iso = /^(\d{4}-\d\d-\d\d)(T.*)?$/.exec(s)
  const dt = iso ? new Date(`${iso[1]}T00:00:00Z`) : new Date(`${s} UTC`)
  if (Number.isNaN(dt.getTime())) return '[date redacted]'
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}
export class Pseudonyms {
  private map = new Map<string, string>()
  of(id: string, d?: PatientData | null) {
    // SUBJID and USUBJID of the same participant get the same pseudonym.
    const dm = d ? rows(d.sdtm, 'DM').find((r) => str(r.USUBJID) === id || str(r.SUBJID) === id) : undefined
    const key = dm ? str(dm.USUBJID) : id
    if (!this.map.has(key)) this.map.set(key, `P-${String(this.map.size + 1).padStart(3, '0')}`)
    return this.map.get(key)!
  }
}
const JUST: Record<IdKind, string> = { subject: 'Direct identifier: links the text to a participant’s record.', date: 'Quasi-identifier: calendar dates can be matched with outside information; intervals are kept.', name: 'Personal data of a named individual.', site: 'Quasi-identifier: a site number narrows the participant to one centre.', age: 'Quasi-identifier: exact age, generalised to match the risk assessment.', race: 'Quasi-identifier: race, not published, to keep groups at the threshold size.' }

const art = (w: string, cap: boolean) => { const a = /^(?:[aeiou]|8|11-|18-)/i.test(w) ? 'an' : 'a'; return cap ? a[0].toUpperCase() + a.slice(1) : a }
/** How an age is published, following the quasi-identifiers in the risk assessment. */
function ageWords(age: number, s: DisclosureState): string | null {
  if (s.rules.age === 'redact' || s.qi.age === 'drop') return null
  if (s.rules.age === 'keep') return `${age}-year-old`
  return s.qi.age === '65' ? (age >= 65 ? '65-or-older' : 'under-65') : `${band(age)}-year-old`
}
const PHRASE = new RegExp(`\\b(An?|an?) (\\d{2})-year-old (?:(${RACE_WORDS.source.slice(3, -3)}) )?(man|woman)\\b`, 'g')

export function transform(text: string, where: string, s: DisclosureState, ps: Pseudonyms, log: LogEntry[], d?: PatientData | null): string {
  // The opening of a narrative ("A 62-year-old White man") is rebuilt as one phrase, so the
  // article, age and race stay grammatical whatever is removed.
  text = text.replace(PHRASE, (all, a: string, ageS: string, race: string | undefined, sex: string) => {
    const age = Number(ageS), words: string[] = []
    const aw = ageWords(age, s); if (aw) words.push(aw)
    if (aw !== `${age}-year-old`) log.push({ location: where, kind: 'age', method: RULE_LABEL[s.rules.age], replacement: aw ?? '(removed)', justification: JUST.age })
    if (race) { if (s.rules.race === 'keep') words.push(race); else log.push({ location: where, kind: 'race', method: RULE_LABEL[s.rules.race], replacement: '(removed)', justification: JUST.race }) }
    words.push(sex)
    return `${art(words[0], a[0] === 'A')} ${words.join(' ')}`
  })
  const hits = findIdentifiers(text, d)
  let out = '', at = 0
  for (const h of hits) {
    const rule = s.rules[h.kind]; if (rule === 'keep') continue
    let rep = '[redacted]'
    if (h.kind === 'subject' && rule === 'pseudonymise') rep = ps.of(h.text, d)
    else if (h.kind === 'date' && rule === 'offset') rep = shiftDate(h.text, s.offsetDays)
    else if (h.kind === 'site' && rule === 'generalise') rep = /^sites/i.test(h.text) ? 'study sites' : 'a study site'
    else if (h.kind === 'age') { const n = Number(h.text.match(/\d+/)![0]), w = ageWords(n, s); rep = w ? (/year-old/.test(h.text) ? w : `aged ${w.replace('-year-old', '')}`) : '[age redacted]' }
    else if (h.kind === 'race') rep = ''
    out += text.slice(at, h.at) + rep; at = h.at + h.text.length
    log.push({ location: where, kind: h.kind, method: RULE_LABEL[rule], replacement: rep || '(removed)', justification: JUST[h.kind] })
  }
  return (out + text.slice(at)).replace(/ {2,}/g, ' ').replace(/ ([,.])/g, '$1')
}

// ---------- CCI ----------
export interface CciCandidate { id: string; section: string; quote: string; label: string; kind: 'results' | 'design' | 'future-indication' | 'proprietary-method' | 'safety'; accept: Record<Route, boolean>; why: string }
export const CCI_CANDIDATES: Record<string, CciCandidate[]> = {
  'GLV-12-301': [
    { id: 'primary', section: '11.4.1', quote: 'The differences from placebo were -0.60 (95% CI -0.72 to -0.47) for 5 mg and -0.70 (95% CI -0.83 to -0.58) for 10 mg, both p<0.001 [T14.2.1].', label: 'The primary efficacy result', kind: 'results', accept: { ctis: false, ema: false, hc: false },
      why: 'Results that support the authorisation are what disclosure exists to publish: no route treats them as confidential.' },
    { id: 'dose', section: '9.4.4', quote: '', label: 'The rationale for the doses', kind: 'design', accept: { ctis: false, ema: false, hc: false },
      why: 'Study design and dose selection are needed to read the results; they are not CCI on any route.' },
    { id: 'dkd', section: '9.5.1', quote: 'Urine albumin-to-creatinine ratio was measured as an exploratory endpoint to inform a planned development programme in diabetic kidney disease.', label: 'An exploratory endpoint for a future indication', kind: 'future-indication', accept: { ctis: true, ema: true, hc: true },
      why: 'Not used to support the proposed conditions of use and reveals a development plan: Health Canada’s first category; EMA and CTIS may accept it with a justification.' },
    { id: 'assay', section: '9.5.4', quote: 'GLV-12 plasma concentrations were measured with the sponsor’s own validated LC-MS/MS method GLV-BA-07, used only by the sponsor’s laboratory.', label: 'The sponsor’s own bioanalytical method', kind: 'proprietary-method', accept: { ctis: true, ema: true, hc: true },
      why: 'A method used exclusively by the manufacturer: Health Canada’s second category; EMA and CTIS may accept it with a justification.' },
    { id: 'signal', section: '12.3.3', quote: '', label: 'The discussion of fainting and light-headedness', kind: 'safety', accept: { ctis: false, ema: false, hc: false },
      why: 'Safety findings are never commercially confidential; a sponsor may not hide a possible signal.' },
  ],
}
CCI_CANDIDATES['HRP-301'] = []
CCI_CANDIDATES['HRP-205'] = []

// ---------- risk on the participants ----------
const REGION: Record<string, string> = { USA: 'Americas', CAN: 'Americas', BRA: 'Americas', DEU: 'Europe', POL: 'Europe', JPN: 'Asia', IND: 'Asia' }
export function qiKey(r: Record<string, unknown>, q: QIs) {
  const age = Number(r.AGE), parts: string[] = []
  if (q.age === 'exact') parts.push(`age ${age}`); else if (q.age === '10y') parts.push(`age ${band(age)}`); else if (q.age === '65') parts.push(age >= 65 ? 'age 65+' : 'age <65')
  if (q.sex === 'keep') parts.push(str(r.SEX))
  if (q.race === 'keep') parts.push(str(r.RACE).toLowerCase()); else if (q.race === 'group') parts.push(str(r.RACE) === 'WHITE' ? 'white' : 'other race')
  if (q.country === 'keep') parts.push(str(r.COUNTRY)); else if (q.country === 'group') parts.push(REGION[str(r.COUNTRY)] ?? 'other region')
  return parts.join(', ') || 'everyone'
}
export interface Risk { groups: { key: string; n: number }[]; smallest: number; risk: number; ok: boolean; population: number }
/** Groups of randomised participants sharing the published quasi-identifiers. */
export function risk(d: PatientData, q: QIs): Risk {
  const dm = rows(d.sdtm, 'DM').filter((r) => str(r.ARM) && !/screen/i.test(str(r.ARM)))
  const m = new Map<string, number>(); for (const r of dm) { const k = qiKey(r, q); m.set(k, (m.get(k) ?? 0) + 1) }
  const groups = [...m].map(([key, n]) => ({ key, n })).sort((a, b) => a.n - b.n || a.key.localeCompare(b.key))
  const smallest = groups[0]?.n ?? 0, r = smallest ? Math.round((1 / smallest) * 100) / 100 : 1
  return { groups, smallest, risk: r, ok: r <= THRESHOLD, population: dm.length }
}

// ---------- the redacted report ----------
export interface Redacted { sections: Record<string, string>; narratives: Record<string, string>; log: LogEntry[] }
export function redact(p: Project, d?: PatientData | null): Redacted {
  const s = { ...DEFAULT_DISCLOSURE(), ...p.disclosure } as DisclosureState, ps = new Pseudonyms(), log: LogEntry[] = []
  const cands = CCI_CANDIDATES[p.study] ?? []
  const sections: Record<string, string> = {}
  for (const [id, st] of Object.entries(p.sections)) {
    if (st.na) { sections[id] = st.text; continue }
    let t = st.text
    for (const c of cands.filter((x) => x.section === id && s.cci[x.id]?.propose)) {
      if (c.quote && t.includes(c.quote)) { t = t.replace(c.quote, `[Redacted: commercially confidential (${c.label.toLowerCase()})]`); log.push({ location: `Section ${id}`, kind: 'cci', method: 'Redact', replacement: '[Redacted: commercially confidential]', justification: s.cci[c.id].reason || '(no reason given)' }) }
    }
    sections[id] = transform(t, `Section ${id}`, s, ps, log, d)
  }
  const narratives: Record<string, string> = {}
  for (const [k, n] of Object.entries(p.narratives ?? {})) narratives[k] = transform(n.text, `Narrative ${k.split('|')[0]}`, s, ps, log, d)
  return { sections, narratives, log }
}
/** The project as it would be published: the same report with redacted text. */
export function redactedProject(p: Project, d?: PatientData | null): Project {
  const r = redact(p, d), q = structuredClone(p)
  for (const [id, t] of Object.entries(r.sections)) if (q.sections[id]) q.sections[id].text = t
  for (const [k, t] of Object.entries(r.narratives)) if (q.narratives?.[k]) q.narratives[k].text = t
  q.name = `${p.name} (redacted for public release)`
  return q
}

export function redactionLogCsv(log: LogEntry[]) {
  const q = (x: string) => `"${x.replace(/"/g, '""')}"`
  return [['Location', 'Type', 'Method', 'Replacement', 'Justification'], ...log.map((l) => [l.location, l.kind === 'cci' ? 'Commercially confidential information' : ID_LABEL[l.kind], l.method, l.replacement, l.justification])].map((r) => r.map(q).join(',')).join('\r\n')
}

// ---------- checks ----------
export interface DiscItem { id: string; label: string; ok: boolean; why: string }
export function disclosureItems(p: Project, d: PatientData): DiscItem[] {
  const s = { ...DEFAULT_DISCLOSURE(), ...p.disclosure } as DisclosureState
  const r = redact(p, d), all = [...Object.values(r.sections), ...Object.values(r.narratives)].join('\n')
  const left = findIdentifiers(all, d)
  const leftOf = (k: IdKind) => left.filter((h) => h.kind === k && !(k === 'date' && s.rules.date === 'offset'))
  const rk = risk(d, s.qi), cands = CCI_CANDIDATES[p.study] ?? []
  const proposed = cands.filter((c) => s.cci[c.id]?.propose)
  const refused = proposed.filter((c) => s.routes.some((rt) => !c.accept[rt]))
  const unreasoned = proposed.filter((c) => (s.cci[c.id].reason ?? '').trim().length < 20)
  const exactAges = /\b\d{2}-year-old\b|\baged \d{2}\b(?! (?:or|to|and|years? or))/.test(all), banded = /\b\d0–\d9-year-old\b|\baged \d0–\d9\b/.test(all)
  const ageOk = s.qi.age === 'exact' || (!exactAges && (s.qi.age === '10y' || !banded))
  const sexOk = s.qi.sex === 'keep' || !/\b(man|woman|male|female|he|she|his|her|him)\b/i.test(Object.values(r.narratives).join(' '))
  const raceOk = s.qi.race === 'keep' || !leftOf('race').length
  return [
    { id: 'routes', label: 'Routes chosen', ok: s.routes.length > 0, why: 'Choose where the report will be published: CTIS, EMA Policy 0070, Health Canada, or several.' },
    { id: 'subject', label: 'Participant IDs replaced', ok: !leftOf('subject').length, why: leftOf('subject').length ? `Still in the text: ${[...new Set(leftOf('subject').map((h) => h.text))].slice(0, 3).join(', ')}.` : 'None left.' },
    { id: 'date', label: 'Calendar dates handled', ok: !leftOf('date').length, why: leftOf('date').length ? `Still in the text: ${[...new Set(leftOf('date').map((h) => h.text))].slice(0, 3).join(', ')}.` : s.rules.date === 'offset' ? `All dates shifted by one offset (intervals kept).` : 'None left.' },
    { id: 'name', label: 'Names of people removed', ok: !leftOf('name').length, why: leftOf('name').length ? `Still in the text: ${[...new Set(leftOf('name').map((h) => h.text))].join(', ')}.` : 'None left.' },
    { id: 'site', label: 'Site numbers removed', ok: !leftOf('site').length, why: leftOf('site').length ? `Still in the text: ${[...new Set(leftOf('site').map((h) => h.text))].join(', ')}.` : 'None left.' },
    { id: 'risk', label: `Re-identification risk at or below ${THRESHOLD}`, ok: rk.ok, why: `Smallest group: ${rk.smallest} participant${rk.smallest === 1 ? '' : 's'} (${rk.groups[0]?.key ?? '—'}), risk ${rk.risk.toFixed(2)}. Each group needs at least 11.` },
    { id: 'consistent', label: 'The text publishes no more than the risk assessment allows', ok: ageOk && raceOk && sexOk, why: !ageOk ? 'The text gives ages more precisely than the risk assessment publishes: set the age rule to match.' : !sexOk ? 'Sex is not published in the risk assessment, but the narratives still say man, woman, he or she: edit them, or publish sex and generalise something else.' : !raceOk ? 'Race is not published in the risk assessment, but the narratives still name it: remove it.' : 'The text matches the quasi-identifiers assessed.' },
    { id: 'cci', label: 'CCI proposals each route would accept', ok: !refused.length && !unreasoned.length, why: refused.length ? `Not acceptable: ${refused.map((c) => `${c.label} (${c.why})`).join(' ')}` : unreasoned.length ? `Give a reason for: ${unreasoned.map((c) => c.label).join(', ')}.` : proposed.length ? `${proposed.length} proposal${proposed.length === 1 ? '' : 's'}, each acceptable and justified.` : 'No CCI proposed.' },
    { id: 'utility', label: 'Data utility described', ok: s.utility.trim().length > 60, why: 'Say what a reader can still learn after anonymisation (intervals kept, age bands, which results are untouched).' },
  ]
}

// ---------- the anonymisation report ----------
const esc = (x: string) => x.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
export function anonymisationReportHtml(p: Project, d: PatientData) {
  const s = { ...DEFAULT_DISCLOSURE(), ...p.disclosure } as DisclosureState, r = redact(p, d), rk = risk(d, s.qi), items = disclosureItems(p, d)
  const count = (k: string) => r.log.filter((l) => l.kind === k).length
  const cands = (CCI_CANDIDATES[p.study] ?? []).filter((c) => s.cci[c.id]?.propose)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Anonymisation report: ${esc(p.study)}</title><style>body{font-family:Arial,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;line-height:1.45}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:3px 6px;text-align:left;font-size:13px}.n{color:#555;font-size:12px}</style></head><body>
<p class="n">Training document from the CSR &amp; Narrative Studio. Fictional study. Structure follows the headings of the anonymisation report template shared by EMA and Health Canada, in this app’s own words.</p>
<h1>Anonymisation report: ${esc(p.study)} clinical study report</h1>
<h2>1. Scope and routes</h2><p>Document: the clinical study report of ${esc(p.study)}, version ${p.version}, with its patient narratives. Routes: ${s.routes.map((x) => ROUTES.find((y) => y.id === x)!.name).join('; ') || 'none chosen'}.</p>
<h2>2. Approach</h2><p>Quantitative anonymisation: direct identifiers are removed or replaced; quasi-identifiers are generalised until every group of participants sharing the published characteristics has at least 11 members, so that the re-identification risk (1 ÷ the smallest group, to two decimals) is at or below ${THRESHOLD}.</p>
<h2>3. Identifiers found and how each was handled</h2><table><tr><th>Identifier</th><th>Method</th><th>Occurrences changed</th></tr>${(Object.keys(ID_LABEL) as IdKind[]).map((k) => `<tr><td>${ID_LABEL[k]}</td><td>${RULE_LABEL[s.rules[k]]}${k === 'date' && s.rules.date === 'offset' ? ' (offset kept by the sponsor, not published)' : ''}</td><td>${count(k)}</td></tr>`).join('')}</table>
<h2>4. Re-identification risk</h2><p>Population: ${rk.population} randomised participants. Published quasi-identifiers: age (${QI_LABEL.age[s.qi.age]}), sex (${QI_LABEL.sex[s.qi.sex]}), race (${QI_LABEL.race[s.qi.race]}), country (${QI_LABEL.country[s.qi.country]}).</p>
<p>Smallest group: <b>${rk.smallest}</b>; risk <b>${rk.risk.toFixed(2)}</b> against the threshold of ${THRESHOLD}: ${rk.ok ? 'met' : '<b>not met</b>'}.</p>
<table><tr><th>Group (published characteristics)</th><th>Participants</th></tr>${rk.groups.map((g) => `<tr><td>${esc(g.key)}</td><td>${g.n}</td></tr>`).join('')}</table>
<h2>5. Data utility</h2><p>${esc(s.utility || 'Not described.')}</p>
<h2>6. Commercially confidential information</h2>${cands.length ? `<table><tr><th>Item</th><th>Section</th><th>Reason given</th></tr>${cands.map((c) => `<tr><td>${esc(c.label)}</td><td>${c.section}</td><td>${esc(s.cci[c.id].reason)}</td></tr>`).join('')}</table>` : '<p>None proposed.</p>'}
<h2>7. Conclusion</h2><ul>${items.map((i) => `<li>${i.ok ? '✓' : '✗'} ${esc(i.label)}${i.ok ? '' : `: ${esc(i.why)}`}</li>`).join('')}</ul>
<p class="n">Redaction log: ${r.log.length} entries (redaction-log.csv). Built by Khan Gulrez Shagufa Fazal Ahmed. Not regulatory advice.</p></body></html>`
}
