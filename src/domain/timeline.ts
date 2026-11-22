// The CSR timeline: the report is planned around database lock (DBL). The windows here are common
// industry practice, not regulation: the CSR shell and table shells are ready about two months
// before lock, a dry run of the tables on blinded data comes before it, topline results within
// about two weeks after, and a final report within about twelve weeks. The registry deadlines are
// regulation (42 CFR 11.44; EU Regulation 536/2014, Article 37(4)).
import { plusYear } from './posting'

export interface Milestone { id: string; label: string; what: string }
export const MILESTONES: Milestone[] = [
  { id: 'shells', label: 'SAP and table shells final', what: 'The statistical analysis plan is final and the table, listing and figure shells are agreed.' },
  { id: 'csrShell', label: 'CSR shell ready', what: 'The report shell, with the methods drafted from the protocol and SAP, and the outputs attached.' },
  { id: 'dryRun', label: 'Dry run of the tables', what: 'Programming runs every output on blinded or dummy data; the writer checks the shells and the text slots.' },
  { id: 'dbl', label: 'Database lock', what: 'Data management locks the database (given).' },
  { id: 'unblind', label: 'Unblinding', what: 'Treatment codes released to the study team after lock.' },
  { id: 'topline', label: 'Topline results', what: 'The key efficacy and safety results to senior management (and, if material, the public).' },
  { id: 'draft1', label: 'First complete draft', what: 'Every section written against the final outputs, numbers QC-ready.' },
  { id: 'review', label: 'Review round closed', what: 'Comments from the team resolved.' },
  { id: 'qc', label: 'QC complete', what: 'Text-versus-table QC and the checklist passed.' },
  { id: 'final', label: 'Final report approved', what: 'Signed by the author, the approver and the coordinating investigator.' },
  { id: 'ctgov', label: 'Results on ClinicalTrials.gov', what: 'The results modules submitted.' },
  { id: 'ctis', label: 'Summary of results and lay summary in CTIS', what: 'The EU summary of results (Annex IV) and the lay summary (Annex V).' },
]
export interface TimelineFacts { dbl: string; pcd: string; endOfTrial: string }
const day = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(`${d}T00:00:00Z`) / 86400000 : NaN)
export const daysBetween = (a: string, b: string) => day(b) - day(a)

export interface Rule { label: string; ok: boolean; why: string }
export function timelineRules(t: Record<string, string>, f: TimelineFacts): Rule[] {
  const T: Record<string, string> = { ...t, dbl: f.dbl }, has = (k: string) => !Number.isNaN(day(T[k] ?? '')), rel = (k: string) => daysBetween(f.dbl, T[k] ?? '')
  const win = (k: string, lo: number, hi: number, label: string, why: string): Rule => ({ label, ok: has(k) && rel(k) >= lo && rel(k) <= hi, why: has(k) ? `${why} You have ${rel(k) >= 0 ? `${rel(k)} days after` : `${-rel(k)} days before`} lock.` : `Set the date. ${why}` })
  const order = ['shells', 'dryRun', 'dbl', 'unblind', 'topline', 'draft1', 'review', 'qc', 'final']
  const seq = order.filter(has), inOrder = order.every(has) && seq.every((k, i) => i === 0 || day(T[k]) >= day(T[seq[i - 1]]))
  return [
    { label: 'Every milestone dated', ok: MILESTONES.every((m) => has(m.id)), why: `Still to date: ${MILESTONES.filter((m) => !has(m.id)).map((m) => m.label).join(', ') || 'none'}.` },
    { label: 'In a workable order', ok: inOrder, why: 'Shells, dry run, lock, unblinding, topline, first draft, review, QC, final: each on or after the one before.' },
    win('shells', -365, -56, 'SAP and shells final at least 8 weeks before lock', 'The SAP must be final before unblinding, and shells come first so the dry run can test them.'),
    win('csrShell', -365, -42, 'CSR shell at least 6 weeks before lock', 'Writers usually hear about two months before lock; the shell and methods are written then.'),
    win('dryRun', -42, -7, 'Dry run 1 to 6 weeks before lock', 'Late enough to use near-complete data, early enough to fix the programs.'),
    win('unblind', 0, 3, 'Unblinding within 3 days after lock', 'Not before lock; usually the same day or the next.'),
    win('topline', 1, 14, 'Topline within 2 weeks of lock', 'After unblinding; sponsors usually report topline within one to two weeks.'),
    win('draft1', 7, 42, 'First draft within 6 weeks of lock', 'Built on the shell written before lock.'),
    { label: 'QC after the review round and before approval', ok: has('review') && has('qc') && has('final') && day(T.review) <= day(T.qc) && day(T.qc) <= day(T.final), why: 'QC checks the text that will be approved, after the last content changes.' },
    win('final', 21, 84, 'Final report within 12 weeks of lock', 'A common target is 8 to 12 weeks from lock to the approved report.'),
    { label: 'ClinicalTrials.gov by one year after primary completion', ok: has('ctgov') && f.pcd !== '' && day(T.ctgov) <= day(plusYear(f.pcd)), why: `Primary completion ${f.pcd}: due by ${plusYear(f.pcd)} (42 CFR 11.44).` },
    { label: 'CTIS by one year after the end of the trial', ok: has('ctis') && f.endOfTrial !== '' && day(T.ctis) <= day(plusYear(f.endOfTrial)), why: `End of trial ${f.endOfTrial}: due by ${plusYear(f.endOfTrial)} (Article 37(4)).` },
  ]
}
