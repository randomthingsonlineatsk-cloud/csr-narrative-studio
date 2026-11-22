// Trace a number: from a sentence in the report back through the table cell, the analysis result
// (CDISC ARS: the analysis, its analysis set, grouping and method), the analysis data (ADaM ADSL,
// recounted here where the Studio holds it), the collected data (SDTM) and the eCRF form it was
// entered on. A reviewer's question “where does this number come from?” is answered step by step.
import { dataOf } from './project'
import { tableNumber } from './e3'
import { rows as sdtmRows, str, type Sdtm } from './sdtm'
import type { Finding } from './checker'
import type { Output, Project } from './types'
import { onkTrace } from './onktrace'

export interface TraceStep { level: string; title: string; lines: string[]; ok?: boolean; subjects?: string[] }

interface Cond { dataset: string; variable: string; comparator: string; value: string[] }
interface Ars { analysisSets: { id: string; name: string; condition: Cond }[]; analysisGroupings: { id: string; name: string; groupingVariable: string; groups: { name: string; condition: Cond }[] }[]; methods: { id: string; name: string; description: string }[]; analyses: { id: string; name: string; analysisSetId: string; methodId: string; orderedGroupings: { groupingId: string }[] }[] }

/** Where each ADSL variable or analysis comes from in SDTM, and the eCRF form behind it. */
export const ORIGIN: Record<string, { sdtm: string; form: string }> = {
  POP: { sdtm: 'DM (ARM: randomised) and EX (SAFFL: at least one dose)', form: 'Randomisation and Study drug forms' },
  N: { sdtm: 'DM (ARM: randomised)', form: 'Randomisation form' },
  TREATED: { sdtm: 'EX: at least one dose recorded (SAFFL)', form: 'Study drug form' },
  SCREENED: { sdtm: 'DM: every participant who signed consent (DS INFORMED CONSENT OBTAINED)', form: 'Informed consent form' },
  SCRFAIL: { sdtm: 'DS: DSDECOD SCREEN FAILURE', form: 'Screening outcome form' },
  COMPLETED: { sdtm: 'DS: disposition event COMPLETED (EOSSTT)', form: 'End of study form' },
  DISC: { sdtm: 'DS: a disposition event other than COMPLETED (EOSSTT)', form: 'End of study form' },
  DCSREAS: { sdtm: 'DS: DSDECOD of the end-of-study record', form: 'End of study form' },
  AGE: { sdtm: 'DM: AGE', form: 'Demographics form (date of birth)' }, AGEGR1: { sdtm: 'DM: AGE, grouped in ADSL', form: 'Demographics form' },
  SEX: { sdtm: 'DM: SEX', form: 'Demographics form' }, RACE: { sdtm: 'DM: RACE', form: 'Demographics form' },
  DUR: { sdtm: 'EX: first and last dose dates (TRTSDT, TRTEDT)', form: 'Study drug form' }, DURCAT: { sdtm: 'EX: first and last dose dates', form: 'Study drug form' }, PYEARS: { sdtm: 'EX: first and last dose dates', form: 'Study drug form' },
  ANY: { sdtm: 'AE (ADAE: treatment-emergent, TRTEMFL)', form: 'Adverse event form' },
  PT: { sdtm: 'AE: AEBODSYS and AEDECOD, coded from AETERM with the Study Medical Dictionary', form: 'Adverse event form (the verbatim term)' },
  // Oncology (ONK-44-302): time to event and response, from RECIST 1.1 assessments.
  PFS: { sdtm: 'RS (overall response PD, RSEVAL INDEPENDENT ASSESSOR) and DM (DTHDTC), from the randomisation date', form: 'Independent review vendor file and the Death form' },
  PFSINV: { sdtm: 'RS (overall response PD, RSEVAL INVESTIGATOR) and DM (DTHDTC)', form: 'Response (investigator) form and the Death form' },
  OS: { sdtm: 'DM (DTHDTC) and the last contact date (RFPENDTC)', form: 'Death and Last contact forms' },
  IRC: { sdtm: 'RS: overall responses by the independent review (RSEVAL INDEPENDENT ASSESSOR)', form: 'Independent review vendor file (read from the scans)' },
  INV: { sdtm: 'RS: overall responses by the investigator, from TR measurements (TU, TR)', form: 'Lesion identification, Lesion assessment and Response forms' },
}
const originOf = (an: string) => ORIGIN[an] ?? ORIGIN[an.split('_')[0]]

function cellOf(o: Output, f: Finding) {
  const d = o.display!, t = f.tie!
  let parent = ''
  for (const r of d.rows) {
    const empty = r.cells.every((c) => !c.text.trim())
    if (empty || !r.indent) parent = empty ? r.label : parent && r.indent ? parent : ''
    if (r.label !== t.row || parent !== t.context) continue
    const ci = d.head.findIndex((h, i) => { const g = (d.groups[i] ?? h).split(/:\s*/)[0].replace(/\s*\(N=\d+\)$/, ''); return g === t.group && (!t.col || h.includes(t.col)) })
    if (ci >= 0) return { row: r, cell: r.cells[ci], ci }
  }
  return null
}
const statOf: Record<string, string> = { n: 'n', pct: 'pct', mean: 'mean', sd: 'sd', median: 'median', min: 'min', max: 'max', est: 'est', lcl: 'lcl', ucl: 'ucl', p: 'p', se: 'se' }

export function trace(p: Project, f: Finding, s: Sdtm | null): TraceStep[] {
  const d = dataOf(p), t = f.tie
  const steps: TraceStep[] = [{ level: 'Report', title: `Section ${f.section}`, lines: [`“${f.text}” in the text, ${f.status === 'ok' ? 'tied to its cell' : `flagged: ${f.message}`}.`] }]
  if (!t) return [...steps, { level: 'Table', title: 'No source', lines: ['The checker found no cell for this number, so there is nothing to trace.'], ok: false }]
  const o = d.outputs.find((x) => x.id === t.out)
  if (!o?.display) return steps
  const c = cellOf(o, f)
  steps.push({ level: 'Table', title: `${o.title}`, lines: [`Row “${t.context ? `${t.context}: ` : ''}${t.row}”, column ${t.group}${t.col ? ` (${t.col})` : ''}: ${c?.cell.text ?? '?'}.`, `Population: ${o.display.population}. Specified in: ${o.ref}.`] })
  const key = c?.cell.keys?.[0], ars = d.reportingEvent as Ars | undefined
  if (!key || !ars) return [...steps, { level: 'Analysis', title: 'Not available', lines: ['This output carries no analysis results keys; trace it in the TLF Programming Lab.'] }]
  const an = ars.analyses.find((a) => a.id === `AN_${o.id}`), set = ars.analysisSets.find((x) => x.id === an?.analysisSetId)
  const grouping = ars.analysisGroupings.find((g) => g.id === an?.orderedGroupings[0]?.groupingId), method = ars.methods.find((m) => m.id === an?.methodId)
  const ard = o.frame.rows.filter((r) => r[0] === key.an && r[1] === key.g && (r[2] ?? null) === (key.cat ?? null))
  const raw = ard.find((r) => r[3] === statOf[t.kind])?.[4] ?? ard[0]?.[4]
  const shown = Number(f.text.replace(/[−–]/, '-').replace(/[^\d.-]/g, '')), rawN = Number(raw)
  const decs = (f.text.split('.')[1] ?? '').replace(/\D/g, '').length, rounds = raw !== undefined && Math.abs(Number(rawN.toFixed(decs)) - shown) < 1e-9
  steps.push({ level: 'Analysis result (ARS)', title: an ? `${an.id}: ${method?.name ?? an.name}` : key.an, ok: raw !== undefined ? rounds : undefined, lines: [
    `Analysis ${key.an}${key.cat ? `, category “${key.cat}”` : ''}, group ${key.g}, statistic ${t.kind}: raw value ${raw ?? 'not found'}${raw !== undefined ? `, shown as ${f.text}` : ''}.`,
    set ? `Analysis set: ${set.name} (${set.condition.dataset}.${set.condition.variable} = ${set.condition.value.join(', ')}).` : '',
    grouping ? `Grouped by ${grouping.name} (${grouping.groupingVariable}).` : '',
    method?.description ? `Method: ${method.description.slice(0, 220)}${method.description.length > 220 ? '…' : ''}` : '',
  ].filter(Boolean) })
  // ADaM: recount from ADSL where the analysis is a subject-level count.
  const adsl = d.outputs.find((x) => x.id === 'ADSL')
  const gvar = grouping?.groupingVariable ?? 'TRT01A'
  if (adsl && set && ['n', 'pct'].includes(t.kind)) {
    const cols = adsl.frame.columns, col = (r: (string | null)[], v: string) => r[cols.indexOf(v)]
    const inSet = adsl.frame.rows.filter((r) => set.condition.value.includes(String(col(r, set.condition.variable))) && (key.g === 'Total' || col(r, gvar) === key.g))
    const pick = (r: (string | null)[]) => key.an === 'POP' || key.an === 'N' ? true : key.an === 'TREATED' ? col(r, 'SAFFL') === 'Y' : key.an === 'COMPLETED' ? col(r, 'EOSSTT') === 'COMPLETED' : key.an === 'DISC' ? col(r, 'EOSSTT') === 'DISCONTINUED' : cols.includes(key.an) && key.cat ? String(col(r, key.an)) === key.cat : null
    if (inSet.length && pick(inSet[0]) !== null) {
      const hit = inSet.filter((r) => pick(r)), n = hit.length, N = inSet.length
      const expected = t.kind === 'pct' ? Math.round((1000 * n) / N) / 10 : n
      steps.push({ level: 'Analysis data (ADaM)', title: `ADSL: ${set.condition.variable} = ${set.condition.value.join(', ')}${key.g === 'Total' ? '' : `, ${gvar} = ${key.g}`}`, ok: Math.abs(expected - shown) < 0.051, lines: [`Recounted here: ${n} of ${N} participants${t.kind === 'pct' ? ` = ${expected}%` : ''}${['POP', 'N'].includes(key.an) ? '' : ` with ${key.an === 'TREATED' ? 'SAFFL = Y' : key.an === 'COMPLETED' || key.an === 'DISC' ? `EOSSTT = ${key.an === 'COMPLETED' ? 'COMPLETED' : 'DISCONTINUED'}` : `${key.an} = ${key.cat}`}`}.`], subjects: hit.map((r) => String(col(r, 'USUBJID'))) })
    }
  }
  // Oncology: recount from RS, DM and DS, and show the records as collected.
  const ot = p.study === 'ONK-44-302' && s && ['n', 'pct'].includes(t.kind) ? onkTrace(s, key.an, key.g, key.cat ?? null) : null
  if (ot) {
    const N = ot.subjects.length
    steps.push({ level: 'Collected data (SDTM)', title: ot.title, ok: t.kind === 'n' ? N === shown : undefined, lines: [`${N} participant${N === 1 ? '' : 's'} recounted from SDTM${key.g === 'Total' ? '' : ` on ${key.g}`}, with the same rules as the TLF Lab’s programs.`], subjects: ot.subjects })
    steps.push({ level: 'eCRF and source files', title: ot.records.length ? 'The records as collected' : 'No single source record', lines: ot.records.length ? [...ot.records.slice(0, 12), ...(ot.records.length > 12 ? [`… and ${ot.records.length - 12} more.`] : []), 'From the SDTM Mapping Trainer’s ONK-44-302 source data (the EDC forms and the independent review’s vendor file).'] : ['Counted from the absence of an event (no death recorded by the cut-off).'] })
    return steps
  }
  // SDTM: adverse events are recounted from the AE domain.
  if (key.an === 'PT' && s && key.cat) {
    const term = key.cat.split(' | ')[1], arm = new Map(sdtmRows(s, 'DM').map((r) => [str(r.USUBJID), str(r.ACTARM) || str(r.ARM)]))
    const subj = [...new Set(sdtmRows(s, 'AE').filter((r) => str(r.AEDECOD) === term && (key.g === 'Total' || arm.get(str(r.USUBJID)) === key.g)).map((r) => str(r.USUBJID)))]
    steps.push({ level: 'Collected data (SDTM)', title: `AE: AEDECOD = “${term}”`, ok: t.kind === 'n' ? subj.length === shown : undefined, lines: [`${subj.length} participant${subj.length === 1 ? '' : 's'} with this preferred term in the AE domain${key.g === 'Total' ? '' : ` on ${key.g}`} (any record; ADAE keeps those that are treatment-emergent).`], subjects: subj })
  } else {
    const og = originOf(key.an)
    steps.push({ level: 'Collected data (SDTM)', title: og?.sdtm ?? 'An efficacy analysis dataset', lines: [og ? `ADSL takes this from ${og.sdtm}.` : `The ${tableNumber(o.title)} analysis uses an efficacy dataset (for example ADQS) that the Studio does not hold; trace it further in the TLF Programming Lab and the SDTM Mapping Trainer.`] })
  }
  const og = originOf(key.an)
  steps.push({ level: 'eCRF', title: og?.form ?? 'The efficacy assessment forms', lines: [og ? `From the ${og.form}.` : 'Entered at each visit on the assessment forms; the CDM Console holds them for HRP-301.'] })
  return steps
}
