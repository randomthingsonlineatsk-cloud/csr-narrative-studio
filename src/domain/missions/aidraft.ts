// CS16: review an AI-drafted results text. Many sponsors and contract research organisations now
// have a language model draft CSR sections from the protocol, the SAP and the tables, and the
// medical writer stays accountable: every sentence is checked against its source before it moves
// on. No AI runs here: the draft is the GLV-12-301 reference text with eight errors of the kinds
// such drafts make (an invented number, values given to the wrong group, an invented table
// reference, a misread value, a claim beyond the data, a made-up citation, a subgroup claim, an
// analysis called primary that the SAP made supplementary).
import { completeProject } from '../project'
import { sentences, checkText, errors } from '../checker'
import { BUNDLED, outputsOf } from '../study'
import type { Project } from '../types'

export const CS16_SECTIONS = ['11.4.1', '11.4.7', '12.2.1', '12.2.2', '13']
export interface Planted16 { n: number; section: string; from: string; to: string; mark: string; kind: string; why: string }
export const CS16_PLANTED: Planted16[] = [
  { n: 1, mark: 'Fasting plasma glucose fell', section: '11.4.1', from: 'both p<0.001 [T14.2.1].', to: 'both p<0.001 [T14.2.1]. Fasting plasma glucose fell by 1.9 mmol/L with GLV-12 10 mg [T14.2.1].', kind: 'Invented number', why: 'No output reports fasting plasma glucose; the sentence has no source.' },
  { n: 2, mark: '-0.70 (95% CI -0.83 to -0.58) for 5 mg', section: '11.4.1', from: '-0.60 (95% CI -0.72 to -0.47) for 5 mg and -0.70 (95% CI -0.83 to -0.58) for 10 mg, both', to: '-0.70 (95% CI -0.83 to -0.58) for 5 mg and -0.60 (95% CI -0.72 to -0.47) for 10 mg, both', kind: 'Values given to the wrong groups', why: 'The 5 mg and 10 mg differences are swapped (Table 14.2.1).' },
  { n: 3, mark: '[T14.2.9]', section: '11.4.1', from: 'for 10 mg [T14.2.3].', to: 'for 10 mg [T14.2.9].', kind: 'Invented table reference', why: 'There is no Table 14.2.9; the multiple imputation is Table 14.2.3.' },
  { n: 4, mark: 'primary MMRM', section: '11.4.1', from: 'The supplementary MMRM analysis', to: 'The primary MMRM analysis', kind: 'Wrong analysis called primary', why: 'The SAP makes the ANCOVA primary and the MMRM supplementary, whatever the MMRM table’s title says.' },
  { n: 5, mark: '19 (70.4%)', section: '12.2.1', from: '17 (63.0%) in the GLV-12 5 mg group', to: '19 (70.4%) in the GLV-12 5 mg group', kind: 'Misread value', why: 'Table 14.3.1 gives 17 (63.0%) on GLV-12 5 mg.' },
  { n: 6, mark: 'well tolerated', section: '12.2.2', from: 'than with placebo (3, 11.1%) [T14.3.1].', to: 'than with placebo (3, 11.1%) [T14.3.1]. Overall, GLV-12 was well tolerated, with no new safety signals.', kind: 'Claim beyond the data', why: '“Well tolerated” and “no new safety signals” are conclusions the results section does not support; 12.2 reports.' },
  { n: 7, mark: 'Marlowe', section: '13', from: 'the differences from placebo were -0.60', to: 'consistent with earlier studies of the drug class (Marlowe et al., 2024), the differences from placebo were -0.60', kind: 'Made-up citation', why: 'There is no such reference in section 15; drafting tools can invent sources. Every citation must be checked against the reference list.' },
  { n: 8, mark: 'greatest in participants aged 65', section: '11.4.7', from: 'does not depend on how missing data were handled.', to: 'does not depend on how missing data were handled. The benefit was greatest in participants aged 65 or over (Figure 14.2.4).', kind: 'Subgroup claim', why: 'The subgroup analyses are exploratory: describe consistency, claim nothing.' },
]

export function startCs16(): Project {
  const p = completeProject('Mission CS16: Review an AI-drafted results text'); p.kind = 'mission'
  for (const x of CS16_PLANTED) { const t = p.sections[x.section].text; if (!t.includes(x.from)) throw new Error(`CS16: ${x.n} not placeable`); p.sections[x.section].text = t.replace(x.from, x.to) }
  p.stage = 'draft'
  return p
}
/** A sentence's key for the verification record: its section and its exact words. */
export const sentenceKey = (section: string, s: string) => `${section}|${s.trim()}`
export const sentencesOf = (p: Project, section: string) => sentences(p.sections[section]?.text ?? '').map((x) => x.s.trim()).filter(Boolean)

export function scoreCs16(p: Project) {
  const S = (s: string) => p.sections[s]?.text ?? '', v = p.verified ?? {}
  const planted = CS16_PLANTED.map((x) => ({ label: `Error ${x.n}: ${x.kind} (${x.section})`, ok: !S(x.section).includes(x.mark), why: x.why }))
  const d = BUNDLED['GLV-12-301'], errs = CS16_SECTIONS.flatMap((s) => errors(checkText(s, S(s), outputsOf(d), p.sections[s]?.slots ?? [], d.groups, p.rounding)))
  const all = CS16_SECTIONS.flatMap((s) => sentencesOf(p, s).map((x) => sentenceKey(s, x))), unverified = all.filter((k) => !v[k])
  return [
    ...planted,
    { label: 'No checker errors left', ok: !errs.length, why: errs.length ? `${errs.length}: ${errs.slice(0, 3).map((e) => `${e.section} “${e.text}”`).join(', ')}.` : 'Clean.' },
    { label: 'Every sentence verified against its source', ok: all.length > 0 && !unverified.length, why: unverified.length ? `${unverified.length} sentence(s) not yet marked as checked (the verification panel beside each section). A changed sentence must be checked again.` : 'All checked.' },
  ]
}
