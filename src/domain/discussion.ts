// Section 13, discussion and overall conclusions: a benefit–risk table built from the outputs,
// and checks that the conclusions say no more than the results do (E3 13; ICH E9 on
// multiplicity and non-inferiority). The table is the writer's evidence; the checks flag the
// claims regulators push back on: "safe", "well tolerated", efficacy claimed when the primary
// comparison failed, a "trend" offered as a result, and superiority read from a
// non-inferiority comparison.
import { outputsOf } from './study'
import { tableNumber, isAeSocTable } from './e3'
import { sentences } from './checker'
import type { Output, StudyOutputs } from './types'

export interface Effect { output: string; table: string; endpoint: string; group: string; est: number; lcl: number; ucl: number; p: string; text: string; primary: boolean
  /** The comparison met its objective: CI excludes no difference in the favoured direction (superiority) or lies above the margin (non-inferiority). */
  shown: boolean }
export interface Harm { label: string; detail: string }
export interface BenefitRisk { study: string; design: 'superiority' | 'non-inferiority'; margin?: number; comparator: string; effects: Effect[]; primaryShown: boolean; harms: Harm[]; stopped?: Stopped }
export interface Stopped { date: string; reason: string; enrolled: number; planned: number }

const NUMS = /[<>]?[-−–]?\d+(?:\.\d+)?/g
const n = (s: string) => Number(s.replace(/[<>]/g, '').replace(/[−–]/, '-'))
const lowerIsBetter = (title: string) => /hba1c|change from baseline/i.test(title) && !/percent change|improvement|response|success/i.test(title)
const endpointOf = (title: string) => title.replace(/^(?:Table|Figure|Listing)\s+[\d.]+:?\s*/, '').replace(/\s*\((?:primary|key secondary)[^)]*\)\s*$/i, '').replace(/\s*\(ANCOVA\)/, '')

/** What each output says about the treatment effect: one row per comparison with a 95% CI. */
function effectsOf(o: Output, comparator: string, design: BenefitRisk['design'], margin?: number): Effect[] {
  const d = o.display; if (!d) return []
  const ci = d.rows.find((r) => /difference|ratio/i.test(r.label) && /ci/i.test(r.label)); if (!ci) return []
  const pr = d.rows.find((r) => /p-value/i.test(r.label))
  const better = lowerIsBetter(o.title) ? -1 : 1, table = tableNumber(o.title) || tableNumber(d.title)
  return ci.cells.flatMap((c, i) => {
    const m = c.text.match(NUMS); if (!m || m.length < 3) return []
    const [est, lcl, ucl] = m.map(n), group = d.groups[i] ?? d.head[i] ?? ''
    if (group === comparator) return []
    const shown = design === 'non-inferiority' ? (better > 0 ? lcl > -(margin ?? 0) : ucl < (margin ?? 0)) : better > 0 ? lcl > 0 : ucl < 0
    return [{ output: o.id, table, endpoint: endpointOf(o.title), group, est, lcl, ucl, p: pr?.cells[i]?.text ?? '', text: c.text, primary: table === '14.2.1', shown }]
  })
}

/** The benefit–risk table of a study, from its outputs. */
export function benefitRisk(data: StudyOutputs, opts: { design?: BenefitRisk['design']; margin?: number; stopped?: Stopped } = {}): BenefitRisk {
  const outs = outputsOf(data), comparator = data.groups[0], design = opts.design ?? data.design ?? 'superiority'
  opts = { margin: data.margin, stopped: data.stopped, ...opts }
  const effects = outs.filter((o) => o.area === 'Efficacy').flatMap((o) => effectsOf(o, comparator, design, opts.margin))
  // In a fixed sequence the first test gates the rest: the primary is "shown" only if its first comparison is.
  const prim = effects.filter((e) => e.primary)
  const primaryShown = prim.length > 0 && prim.some((e) => e.shown)
  const harms: Harm[] = []
  const ae = outs.find(isAeSocTable)?.display
  if (ae) {
    const any = ae.rows.find((r) => /at least one/i.test(r.label))
    if (any) harms.push({ label: 'Any treatment-emergent adverse event', detail: any.cells.map((c, i) => `${ae.groups[i]} ${c.text}`).join('; ') })
    for (const lab of [/serious/i, /discontinu/i]) { const r = ae.rows.find((x) => lab.test(x.label)); if (r) harms.push({ label: r.label, detail: r.cells.map((c, i) => `${ae.groups[i]} ${c.text}`).join('; ') }) }
    const pct = (t: string) => { const m = /\((\d+(?:\.\d+)?)\)/.exec(t); return m ? Number(m[1]) : t.trim() === '0' ? 0 : null }
    const top = ae.groups.length > 2 && ae.groups.at(-1) === 'Total' ? ae.groups.length - 2 : ae.groups.length - 1
    const excess = ae.rows.filter((r) => r.indent).map((r) => ({ r, d: (pct(r.cells[top]?.text ?? '') ?? 0) - (pct(r.cells[0]?.text ?? '') ?? 0) })).filter((x) => x.d >= 10).sort((a, b) => b.d - a.d).slice(0, 3)
    for (const x of excess) harms.push({ label: `${x.r.label}: more often on ${ae.groups[top]}`, detail: `${ae.groups[top]} ${x.r.cells[top].text} against ${ae.groups[0]} ${x.r.cells[0].text}` })
  }
  const sae = outs.find((o) => tableNumber(o.title) === '16.2.7')
  if (sae) {
    const ci = sae.frame.columns.indexOf('TRT01A'), ti = sae.frame.columns.indexOf('AEDECOD'), ri = sae.frame.columns.indexOf('AEREL')
    const by = new Map<string, string[]>(); for (const r of sae.frame.rows) by.set(String(r[ci]), [...(by.get(String(r[ci])) ?? []), `${String(r[ti]).toLowerCase()}${ri >= 0 && /^RELATED|POSSIBLY|PROBABLY/i.test(String(r[ri])) ? ' (related)' : ''}`])
    harms.push({ label: 'Serious adverse events', detail: data.groups.map((g) => `${g}: ${by.get(g)?.join(', ') ?? 'none'}`).join('; ') })
  }
  return { study: data.study, design, margin: opts.margin, comparator, effects, primaryShown, harms, stopped: opts.stopped }
}

export interface Claim { sentence: string; kind: 'safe' | 'tolerated' | 'efficacy' | 'trend' | 'superiority' | 'non-inferiority' | 'contradiction'; severity: 'error' | 'warn'; why: string }
const NEG = /\b(not|no|did not|does not|was not|were not|failed|neither|nor|cannot|could not|without|unable|insufficient)\b/i
/** Claims in the discussion that the results do not support. */
export function claimFindings(text: string, br: BenefitRisk): Claim[] {
  const out: Claim[] = []
  for (const { s } of sentences(text)) {
    const neg = NEG.test(s)
    if (/\b(?:is|was|were|are|be|proved|shown to be|demonstrated to be|found to be|appears|appeared)\s+(?:generally\s+|very\s+)?safe\b|\bsafety (?:was|has been|is) (?:established|demonstrated|confirmed|proven)\b|\bno safety (?:concerns?|issues?|signals?)\b|\bsafe and effective\b/i.test(s))
      out.push({ sentence: s, kind: 'safe', severity: 'error', why: 'A study describes the risks it saw; it cannot show that a medicine is safe. Say which events happened, how often, and what remains unknown.' })
    if (/\bwell[- ]tolerated\b|\bgood tolerability\b|\bfavourable (?:safety|tolerability) profile\b|\bbenign safety profile\b/i.test(s))
      out.push({ sentence: s, kind: 'tolerated', severity: 'warn', why: 'A judgement, not a result. Give the evidence instead: the rate of discontinuation because of adverse events by group, and the events that were more common on treatment.' })
    if (!br.primaryShown && !neg && /\b(effective|efficacious|efficacy (?:was|has been) (?:demonstrated|shown|established|confirmed)|demonstrated (?:a |clinical )?(?:benefit|efficacy)|showed (?:a |clinical )?benefit|improved (?:the )?(?:signs|symptoms|outcomes?)|significant(?:ly)? (?:better|improv\w*|greater|higher|reduc\w*)|clinically meaningful (?:benefit|improvement))\b/i.test(s))
      out.push({ sentence: s, kind: 'efficacy', severity: 'error', why: `The primary comparison did not meet its objective (${br.effects.filter((e) => e.primary).map((e) => `${e.group}: ${e.text}`).join('; ') || 'no primary result'}). Efficacy cannot be claimed for it or for anything tested after it in the multiplicity order.` })
    if (!br.primaryShown && /\btrend(?:ed|s)? (?:towards?|to|in favou?r)|\bnumerically (?:greater|higher|better|larger)|\bapproached (?:statistical )?significance\b|\bdirectionally\b/i.test(s))
      out.push({ sentence: s, kind: 'trend', severity: 'warn', why: 'A non-significant difference is not a “trend”: report the estimate and its confidence interval, which includes no difference, and say the study did not show an effect.' })
    if (br.design === 'non-inferiority' && !neg && /\bsuperior(?:ity)?\b|\bbetter than\b|\bmore effective than\b|\boutperform/i.test(s))
      out.push({ sentence: s, kind: 'superiority', severity: 'error', why: 'This was a non-inferiority comparison: superiority can only be claimed if the SAP planned a superiority test after non-inferiority was shown, and it was significant.' })
    if (br.design === 'non-inferiority' && !br.primaryShown && !neg && /\bnon-?inferior(?:ity)?\b.*\b(?:shown|demonstrated|established|confirmed|met)\b|\bwas non-?inferior\b|\b(?:comparable|similar|equivalent) (?:efficacy|to)\b/i.test(s))
      out.push({ sentence: s, kind: 'non-inferiority', severity: 'error', why: `The lower limit of the 95% CI (${br.effects.filter((e) => e.primary).map((e) => e.lcl).join(', ')}) is below the margin of −${br.margin}: non-inferiority was not shown, and a stopped study cannot show “comparable” efficacy either.` })
    if (br.primaryShown && /\b(?:did not|failed to) (?:meet|show|demonstrate)\b.*\bprimary\b/i.test(s))
      out.push({ sentence: s, kind: 'contradiction', severity: 'error', why: 'The primary comparison met its objective: the conclusion contradicts Table 14.2.1.' })
  }
  return out
}

export interface DiscussionItem { label: string; ok: boolean; why: string }
/** What a section 13 needs, beyond avoiding unsupported claims. */
export function discussionItems(text: string, br: BenefitRisk): DiscussionItem[] {
  const prim = br.effects.filter((e) => e.primary), claims = claimFindings(text, br)
  const has = (re: RegExp) => re.test(text)
  return [
    { label: 'The primary result, with its confidence interval', ok: prim.some((e) => { const r = (e.text.match(NUMS) ?? []).map(String), t = text.replace(/[−–]/g, '-'); return r.length >= 3 && t.includes(r[0]!) && (t.includes(r[1]!) || t.includes(r[2]!)) }), why: `Restate the size of the effect briefly: ${prim.map((e) => `${e.group} ${e.text}`).join('; ')} (Table 14.2.1).` },
    { label: 'The conclusion matches the primary result', ok: br.primaryShown ? has(/\b(met|showed|demonstrated|superior|reduc|improv)/i) && !claims.some((c) => c.kind === 'contradiction') : has(/\b(did not|failed to|was not|were not|not (?:shown|demonstrated|met))\b/i) && !claims.some((c) => c.kind === 'efficacy' || c.kind === 'non-inferiority'), why: br.primaryShown ? 'Say that the primary objective was met.' : 'Say plainly that the study did not show the effect it was designed to show.' },
    { label: 'The main risks named', ok: br.harms.length === 0 || has(/\b(adverse event|serious|discontinu|risk)/i), why: 'Name the main risks from the benefit–risk table: serious adverse events and the events more common on treatment.' },
    { label: 'Limitations stated', ok: has(/\blimitation|\blimited by|\bsmall (?:number|sample|study)|\bshort (?:duration|treatment)|\bstopped early|\bunderpowered|\bnot powered/i), why: br.stopped ? `The study stopped early (${br.stopped.enrolled} of ${br.stopped.planned} planned participants): say what that means for the results.` : 'State the limitations: the size of the analysis (45 randomised participants in the HRP-301 training cut), the duration, the population.' },
    { label: 'Benefit weighed against risk', ok: has(/\bbenefit/i) && has(/\brisk/i), why: 'Section 13 brings efficacy and safety together: say how the benefit seen compares with the risks.' },
    { label: 'No unsupported claims', ok: !claims.some((c) => c.severity === 'error'), why: claims.filter((c) => c.severity === 'error').map((c) => `“${c.sentence.slice(0, 70)}…”: ${c.kind}`).join(' ') || 'None found.' },
  ]
}
