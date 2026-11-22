// Results posting from the same outputs as the report: the ClinicalTrials.gov results modules
// (42 CFR 11.48: participant flow, baseline characteristics, outcome measures, adverse events with
// all-cause mortality, serious events and other events above a frequency threshold of no more than
// 5% in any arm) and the EU summary of results in CTIS (Regulation 536/2014, Article 37(4) and
// Annex IV). Deadlines: ClinicalTrials.gov, one year after the primary completion date (42 CFR
// 11.44); CTIS, one year after the end of the trial in all Member States concerned.
import { dataOf } from './project'
import { outputsOf, protocolOf } from './study'
import { tableNumber } from './e3'
import { flowOf } from './consort'
import { approvedText } from './reuse'
import { rows, str, type Sdtm } from './sdtm'
import type { Display, Project } from './types'

export interface PostingState { pcd: string; completion: string; endOfTrial: string; threshold: number; timeFrame: string; collection: '' | 'systematic' | 'non-systematic'; otherAes: '' | 'all' | 'non-serious'; summaryBlock: string }
export const DEFAULT_POSTING = (): PostingState => ({ pcd: '', completion: '', endOfTrial: '', threshold: 5, timeFrame: '', collection: '', otherAes: '', summaryBlock: '' })
export const postingOf = (p: Project): PostingState => ({ ...DEFAULT_POSTING(), ...p.posting })

export interface AeRow { soc: string; term: string; byArm: { n: number; atRisk: number }[] }
export interface Posting {
  arms: string[]; flow: ReturnType<typeof flowOf>
  baseline: Display | null; outcomes: { level: string; endpoint: string; table: string; display: Display }[]
  mortality: { deaths: number; atRisk: number }[]; serious: AeRow[]; other: AeRow[]
}
const n0 = (s: string | undefined) => { const m = /\d+/.exec(s ?? ''); return m ? Number(m[0]) : 0 }

export function buildPosting(p: Project): Posting {
  const d = dataOf(p), outs = outputsOf(d), pr = protocolOf(p.study), st = postingOf(p)
  const flow = flowOf(d), arms = d.groups
  const atRisk = arms.map((g) => flow?.arms.find((a) => a.group === g)?.treated ?? 0)
  const byNum = (n: string) => outs.find((o) => tableNumber(o.title) === n)
  const baseline = byNum('14.1.2')?.display ?? null
  const eff = outs.filter((o) => /^14\.2\./.test(tableNumber(o.title)) && o.display && o.kind === 'ard')
  const outcomes = eff.map((o, i) => { const e = pr.endpoints[Math.min(i, pr.endpoints.length - 1)]; return { level: i === 0 ? 'Primary' : 'Secondary', endpoint: e?.text ?? o.title, table: tableNumber(o.title), display: o.display! } })
  const deaths = arms.map((g) => n0(flow?.arms.find((a) => a.group === g)?.reasons.find((r) => /death/i.test(r.reason))?.n.toString()))
  // Serious events from the SAE listing (participants, by term and arm).
  const l1 = outs.find((o) => tableNumber(o.title) === '16.2.7'), cols = l1?.frame.columns ?? []
  const ix = (c: string) => cols.indexOf(c)
  const sae = (l1?.frame.rows ?? []).map((r) => ({ subj: String(r[ix('USUBJID')]), arm: String(r[ix('TRT01A')]), term: String(r[ix('AEDECOD')]), soc: String(r[ix('AEBODSYS')]) }))
  const terms = [...new Map(sae.map((s) => [s.term, s.soc])).entries()]
  const serious: AeRow[] = terms.map(([term, soc]) => ({ soc, term, byArm: arms.map((g, i) => ({ n: new Set(sae.filter((s) => s.term === term && s.arm === g).map((s) => s.subj)).size, atRisk: atRisk[i] })) }))
  // Other events from the TEAE table: preferred terms (indented rows), above the threshold in any arm.
  const t = byNum('14.3.1')?.display, other: AeRow[] = []
  if (t) { let soc = ''
    for (const r of t.rows) {
      if (!r.indent) { soc = r.label; continue }
      const byArm = arms.map((g, i) => { const ci = t.head.findIndex((h) => h === g || h.startsWith(`${g} `) || h.startsWith(`${g}(`)); const all = n0(r.cells[ci]?.text); const ser = st.otherAes === 'non-serious' ? (serious.find((s) => s.term === r.label)?.byArm[i].n ?? 0) : 0; return { n: Math.max(0, all - ser), atRisk: atRisk[i] } })
      if (byArm.some((a) => a.atRisk && (100 * a.n) / a.atRisk > st.threshold)) other.push({ soc, term: r.label, byArm })
    } }
  return { arms, flow, baseline, outcomes, mortality: arms.map((_, i) => ({ deaths: deaths[i], atRisk: atRisk[i] })), serious, other }
}

/** The dates the data give: the last assessment of the primary endpoint, and the last visit. */
export function studyDates(s: Sdtm, primaryText: string): { primaryVisit: string; lastPrimary: string; lastVisit: string } {
  const week = /week\s*(\d+)/i.exec(primaryText)?.[1], label = week ? `WEEK ${week}` : ''
  const dates = [...rows(s, 'LB'), ...rows(s, 'VS')].filter((r) => str(r.VISIT).toUpperCase() === label).map((r) => str(r.LBDTC ?? r.VSDTC).slice(0, 10)).filter(Boolean)
  const ds = rows(s, 'DS').map((r) => str(r.DSSTDTC).slice(0, 10)).filter(Boolean)
  return { primaryVisit: label, lastPrimary: dates.sort().at(-1) ?? '', lastVisit: ds.sort().at(-1) ?? '' }
}
export const plusYear = (d: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return ''; const [y, m, day] = d.split('-').map(Number); return `${y + 1}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

export interface PostItem { label: string; ok: boolean; why: string }
/** `reveal` false (a mission not yet submitted) keeps the answers out of the hints. */
export function postingItems(p: Project, s: Sdtm | null, reveal = true): PostItem[] {
  const st = postingOf(p), pr = protocolOf(p.study), prim = pr.endpoints.find((e) => /primary/i.test(e.level))?.text ?? ''
  const dt = s ? studyDates(s, prim) : null
  const block = (p.blocks ?? []).find((b) => b.id === st.summaryBlock)
  return [
    { label: 'Primary completion date: the last participant’s last assessment of the primary endpoint', ok: !!dt && st.pcd === dt.lastPrimary, why: !dt ? 'Loading the data.' : reveal ? `The primary endpoint is at ${dt.primaryVisit || 'its time point'}; the last ${dt.primaryVisit || ''} assessment in the data is ${dt.lastPrimary}. Follow-up visits after it do not count.` : `The date the last participant was assessed for the primary endpoint (${dt.primaryVisit || 'its time point'}), not the last visit.` },
    { label: 'Study completion and end of trial: the last participant’s last visit', ok: !!dt && st.completion === dt.lastVisit && st.endOfTrial === dt.lastVisit, why: !dt ? 'Loading the data.' : reveal ? `The last visit in the data (DS) is ${dt.lastVisit}; the protocol defines the end of the trial as the last visit of the last participant.` : 'The last visit of the last participant, from the disposition data.' },
    { label: 'Adverse event frequency threshold no higher than 5%', ok: st.threshold > 0 && st.threshold <= 5, why: '42 CFR 11.48: other adverse events above a threshold of no more than 5% in any arm.' },
    { label: 'Other adverse events exclude the serious ones', ok: st.otherAes === 'non-serious', why: 'Serious events have their own table; the other-events table counts non-serious events only.' },
    { label: 'Adverse event time frame and collection approach', ok: st.timeFrame.trim().length > 20 && /dose|day|week|visit|follow/i.test(st.timeFrame) && st.collection === 'systematic', why: 'Say from when to when events were collected (for example, from the first dose to the follow-up visit), and that collection was systematic (asked at every visit).' },
    { label: 'Brief summary from an approved content block', ok: !!block && !!approvedText(block), why: block ? 'Approve the block in the content library first.' : 'Choose an approved block (the content library) for the brief summary, so the registry and the report say the same.' },
  ]
}

/** The posting as JSON (ClinicalTrials.gov-style modules) for download. */
export function postingFile(p: Project) {
  const b = buildPosting(p), st = postingOf(p), pr = protocolOf(p.study), block = (p.blocks ?? []).find((x) => x.id === st.summaryBlock)
  return {
    format: 'csr-studio/results-posting', schema: 1, exportedUtc: new Date().toISOString(), study: p.study, registry: pr.title.registry,
    dates: { primaryCompletion: st.pcd, studyCompletion: st.completion, endOfTrial: st.endOfTrial, clinicalTrialsGovDue: plusYear(st.pcd), ctisDue: plusYear(st.endOfTrial) },
    briefSummary: block ? approvedText(block) : null,
    participantFlow: b.flow && { arms: b.flow.arms.map((a) => ({ arm: a.group, started: a.randomised, completed: a.completed, notCompleted: a.discontinued, reasons: a.reasons.filter((r) => r.n) })) },
    baseline: b.baseline && { table: '14.1.2', rows: b.baseline.rows.map((r) => ({ measure: r.label, values: r.cells.map((c) => c.text) })), arms: b.baseline.head },
    outcomes: b.outcomes.map((o) => ({ type: o.level, title: o.endpoint, table: o.table, arms: o.display.head, rows: o.display.rows.map((r) => ({ label: r.label, values: r.cells.map((c) => c.text) })) })),
    adverseEvents: { timeFrame: st.timeFrame, collection: st.collection, threshold: st.threshold, arms: b.arms, allCauseMortality: b.mortality, serious: b.serious, other: b.other },
  }
}
