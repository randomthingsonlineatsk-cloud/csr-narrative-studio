// Mission CS2: a results draft with 25 planted errors. Each one is a real kind of slip seen in
// QC: a mistyped value, a value from the wrong group, a rounding change, a percentage that does
// not follow from n/N, an estimate outside its CI, p=0.000, a direction word that contradicts the
// sign, and a reference to the wrong table.
import { GLV_REFERENCE } from '../reference'

export interface Planted { n: number; section: string; from: string; to: string; kind: string; why: string; scope?: 'sentence' }
export const CS2_PLANTED: Planted[] = [
  { n: 1, section: '10.1', from: 'Of 90 participants', to: 'Of 92 participants', kind: 'wrong value', why: '90 were screened (Table 14.1.1).' },
  { n: 2, section: '10.1', from: '27 to GLV-12 5 mg', to: '28 to GLV-12 5 mg', kind: 'wrong value', why: '27 were randomised to 5 mg.' },
  { n: 3, section: '10.1', from: '80 (98.8%)', to: '80 (98.7%)', kind: 'wrong value', why: '80 of 81 is 98.8%.' },
  { n: 4, section: '10.1', from: '25 (92.6%) in the placebo', to: '25 (88.9%) in the placebo', kind: 'wrong group', why: '88.9% is the completion rate in both GLV-12 groups; placebo was 92.6%.' },
  { n: 5, section: '10.1', from: '3 participants, 3.7%) and withdrawal', to: '3 participants, 4%) and withdrawal', kind: 'rounding', why: 'Report percentages to one decimal place, as in the table.' },
  { n: 6, section: '11.2', from: '36 (45.0%) were female', to: '36 (54.0%) were female', kind: 'wrong value', why: 'Transposed digits: 36 of 80 is 45.0%.' },
  { n: 7, section: '11.2', from: '54.2 (12.15)', to: '54.2 (12.51)', kind: 'wrong value', why: 'The SD is 12.15.' },
  { n: 8, section: '11.2', from: '20 participants (25.0%)', to: '20 participants (25%)', kind: 'rounding', why: 'One decimal place, as in the table.' },
  { n: 9, section: '11.2', from: '30 (37.5%)', to: '30 (35.7%)', kind: 'wrong value', why: '30 of 80 is 37.5%.' },
  { n: 10, section: '11.2', from: '(17, 65.4%)', to: '(17, 64.5%)', kind: 'wrong value', why: '17 of 26 is 65.4%.' },
  { n: 11, section: '11.4.1', from: '-0.72% with GLV-12 5 mg', to: '-0.27% with GLV-12 5 mg', kind: 'wrong value', why: 'The LS mean change with 5 mg is -0.72.' },
  { n: 12, section: '11.4.1', from: '-0.83% with GLV-12 10 mg', to: '-0.38% with GLV-12 10 mg', kind: 'wrong value', why: 'The LS mean change with 10 mg is -0.83.' },
  { n: 13, section: '11.4.1', from: '-0.60 (95% CI -0.72 to -0.47)', to: '-0.80 (95% CI -0.72 to -0.47)', kind: 'estimate outside its CI', why: 'An estimate always lies inside its own interval; the difference is -0.60.' },
  { n: 14, section: '11.4.1', from: 'both p<0.001', to: 'both p=0.000', kind: 'p-value format', why: 'A p-value is never 0: write p<0.001.' },
  { n: 15, section: '11.4.1', from: '-0.62 (95% CI -0.77 to -0.47)', to: '-0.62 (95% CI -0.77 to -0.74)', kind: 'estimate outside its CI', why: 'The upper limit is -0.47.' },
  { n: 16, section: '11.4.1', from: 'gave LS mean differences at Week 26 of -0.59', to: 'showed HbA1c rose, with LS mean differences at Week 26 of 0.59', kind: 'direction word', why: 'HbA1c fell: the differences are negative.' },
  { n: 17, section: '11.4.1', from: '-0.69 (10 mg)', to: '-0.96 (10 mg)', kind: 'wrong value', why: 'The MMRM difference for 10 mg is -0.69.' },
  { n: 18, section: '11.4.1', from: 'for 10 mg [T14.2.3]', to: 'for 10 mg [T14.2.1]', kind: 'wrong table', why: 'The multiple-imputation results are in Table 14.2.3, not 14.2.1.', scope: 'sentence' },
  { n: 19, section: '12.1', from: '176.7 (22.86)', to: '176.7 (28.82)', kind: 'wrong group', why: '28.82 is the SD for 10 mg; placebo is 22.86.' },
  { n: 20, section: '12.1', from: '47 participants (58.8%)', to: '47 participants (58.5%)', kind: 'wrong value', why: '47 of 80 is 58.8%.' },
  { n: 21, section: '12.1', from: 'was 38.1 participant-years', to: 'was 38.7 participant-years', kind: 'wrong value', why: 'Total exposure is 38.1 participant-years.' },
  { n: 22, section: '12.2.1', from: 'reported by 61 participants (76.3%)', to: 'reported by 61/80 participants (73.6%)', kind: 'percentage does not follow', why: '61/80 is 76.3%.' },
  { n: 23, section: '12.2.1', from: '17 (63.0%) in the GLV-12 5 mg', to: '17 (85.2%) in the GLV-12 5 mg', kind: 'wrong group', why: '85.2% is the placebo rate.' },
  { n: 24, section: '12.2.2', from: 'back pain (15, 18.8%)', to: 'back pain (15, 81.8%)', kind: 'wrong value', why: '15 of 80 is 18.8%.' },
  { n: 25, section: '12.2.2', from: '2 (7.7%) in the GLV-12 10 mg', to: '2 (7.4%) in the GLV-12 10 mg', kind: 'wrong value', why: '2 of 26 is 7.7%.' },
]

/** The draft the learner starts from. */
export function cs2Draft(): Record<string, string> {
  const out = { ...GLV_REFERENCE }
  for (const p of CS2_PLANTED) {
    if (out[p.section].split(p.from).length !== 2) throw new Error(`CS2 error ${p.n}: “${p.from}” must occur once in ${p.section}`)
    out[p.section] = out[p.section].replace(p.from, p.to)
  }
  return out
}

/** An error counts as fixed when the learner's text has the correct wording back. */
export const cs2Fixed = (texts: Record<string, string>) => CS2_PLANTED.map((p) => ({ ...p, fixed: (texts[p.section] ?? '').includes(p.from) && !(texts[p.section] ?? '').includes(p.to) }))
