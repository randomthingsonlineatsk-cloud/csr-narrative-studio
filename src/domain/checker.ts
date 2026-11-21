// The text-versus-table checker. Every number in a section's text is tied to a cell of a study
// output, by an explicit reference ([T14.2.1] or "Table 14.2.1") or, failing that, by the tables
// attached to the section, the group named nearby and the words of the row label. A number that
// matches nothing, or matches the wrong group, is flagged; so are percentages that do not follow
// from their n and N, intervals that do not contain their estimate, p-values written as 0.000,
// and direction words that contradict the sign in the table.
import type { Display, Output, Rounding } from './types'
import { tableNumber } from './e3'

export type TokKind = 'n' | 'pct' | 'mean' | 'sd' | 'se' | 'est' | 'lcl' | 'ucl' | 'p' | 'median' | 'min' | 'max' | 'value'
export interface Tok { out: string; table: string; row: string; context: string; group: string; /** Sub-column within a group (shift tables: “LOW”, “NORMAL”, “HIGH”). */ col: string; value: number; raw: string; dec: number; kind: TokKind; lt?: boolean }

const NUM = /[<>]?[-−–]?\d+(?:\.\d+)?/g
const dec = (s: string) => (s.includes('.') ? s.split('.')[1].length : 0)
const num = (s: string) => Number(s.replace(/[<>]/g, '').replace(/[−–]/, '-'))
const SYN: Record<string, string> = { died: 'death', dying: 'death', dead: 'death', stopped: 'discontinued', stop: 'discontinued', stopping: 'discontinued', withdrew: 'withdrawal', withdrawn: 'withdrawal', women: 'f', female: 'f', men: 'm', male: 'm', randomized: 'randomised', completing: 'completed', complete: 'completed', finished: 'completed' }
const stem = (w: string) => SYN[w] ?? (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).map(stem).filter((w) => (w.length > 2 || w === 'f' || w === 'm') && !STOP.has(w)))
const STOP = new Set(['the', 'and', 'from', 'with', 'for', 'was', 'were', 'had', 'has', 'than', 'that', 'this', 'group', 'groups', 'participant', 'participants', 'patient', 'patients', 'week', 'mean', 'table', 'study'])

function kinds(label: string, context: string, n: number, cell: string): TokKind[] {
  const l = `${context} ${label}`.toLowerCase()
  if (/p-value|p value/.test(label.toLowerCase())) return ['p']
  if (/95% ci|confidence/.test(l) && n === 3) return ['est', 'lcl', 'ucl']
  if (/ls mean \(se\)|\(se\)/.test(label.toLowerCase())) return ['est', 'se']
  if (/mean \(sd\)/.test(label.toLowerCase())) return ['mean', 'sd']
  if (/median/.test(label.toLowerCase()) && n === 1) return ['median']
  if (/min, max|min, ?max|range/.test(label.toLowerCase())) return ['min', 'max']
  if (n === 2 && /\(\d+(\.\d+)?\)/.test(cell)) return ['n', 'pct']
  if (n === 1 && /^\d+$/.test(cell.trim())) return ['n']
  return Array(n).fill('value')
}

/** Every number in every display, with its table, row, group and kind. */
export function tokens(outputs: Output[]): Tok[] {
  const out: Tok[] = []
  for (const o of outputs) {
    const d = o.display; if (!d) continue
    const table = tableNumber(o.title) || tableNumber(d.title)
    let parent = ''
    for (const r of d.rows) {
      const empty = r.cells.every((c) => !c.text.trim())
      if (empty || !r.indent) parent = empty ? r.label : parent && r.indent ? parent : ''
      if (empty) continue
      r.cells.forEach((c, ci) => {
        const ms = c.text.match(NUM) ?? []
        const ks = kinds(r.label, parent, ms.length, c.text)
        const { group, col } = groupOfColumn(d, ci)
        ms.forEach((m, i) => out.push({ out: o.id, table, row: r.label, context: parent, group, col, value: num(m), raw: m.replace(/[<>]/g, ''), dec: dec(m), kind: ks[i] ?? 'value', lt: m.startsWith('<') }))
      })
    }
  }
  return out
}
export function groupOfColumn(d: Display, ci: number): { group: string; col: string } {
  const h = d.groups[ci] ?? d.head[ci] ?? ''
  const [arm, ...rest] = h.split(/:\s*/)
  return rest.length ? { group: arm.trim(), col: rest.join(': ').trim() } : { group: h, col: '' }
}

/** Names a writer uses for a treatment group: the full name, the dose alone, "placebo", "total". */
export function aliases(groups: string[]): { group: string; re: RegExp }[] {
  const all = [...groups, 'Total']
  return all.map((g) => {
    const dose = /(\d+(?:\.\d+)?\s*mg)$/i.exec(g)?.[1]
    const alts = [g, ...(dose ? [dose] : []), ...(g === 'Total' ? ['overall', 'in total', 'all participants'] : [])].map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'))
    return { group: g, re: new RegExp(`(?<![\\w-])(?:${alts.join('|')})(?![\\w])`, 'gi') }
  })
}

export type Status = 'ok' | 'rounding' | 'wrong-value' | 'wrong-group' | 'no-source' | 'pct-calc' | 'ci-order' | 'p-format' | 'direction'
export const SEVERITY: Record<Status, 'ok' | 'warn' | 'error'> = { ok: 'ok', rounding: 'warn', 'wrong-value': 'error', 'wrong-group': 'error', 'no-source': 'error', 'pct-calc': 'error', 'ci-order': 'error', 'p-format': 'warn', direction: 'error' }
export const LABEL: Record<Status, string> = { ok: 'matches', rounding: 'rounding', 'wrong-value': 'wrong value', 'wrong-group': 'wrong group', 'no-source': 'no source', 'pct-calc': 'percentage does not follow', 'ci-order': 'estimate outside its CI', 'p-format': 'p-value format', direction: 'direction word' }
export interface Finding { section: string; sentence: number; at: number; text: string; status: Status; message: string; tie?: Tok; suggestion?: string }

const EXEMPT_BEFORE = /(?<![A-Za-z])(?:week|weeks|day|days|visit|table|figure|listing|section|sections|appendix|version|v|ich|e|module|step|phase|cycle|study|protocol|sap|amendment|grade|gr|n=|n =|stage|level|class|type|aged|age|ages|over|under|least|first|last)\s*$/i
const EXEMPT_AFTER = /^\s*(?:mg|mcg|µg|ml|mL|g\b|sites?|countries|centres|centers|times|-week|-day|-point|-month|% ci|% confidence|st\b|nd\b|rd\b|th\b|:\d)/i
const UNIT_AFTER = /^\s*(?:weeks?|days?|months?|years?|hours?|kg)\b/i // exempt for whole numbers only ("for 26 weeks")
/** What may stand between a number and the group it belongs to: "27 to placebo", "25 (92.6%) in the placebo group", "-0.60 (95% CI -0.72 to -0.47) for 5 mg". */
const GAP = /^(?:[\s\d.,;%()\-−–]|CI|to|SD|SE|days?|weeks?|years?|mg|kg|participants?|patients?|people)*?(?:to|in|on|with|for|of|receiving|given|and|at)?\s*(?:the\s*)?\(?\s*$/i
const COMPARATOR = /(?:from|versus|vs\.?|against|than|over|compared with|relative to)\s*(?:the\s*)?$/i
const SPLIT = /(?<=[.;!?])\s+(?=[A-Z(\[])|\n+/

export function sentences(text: string) {
  const out: { s: string; at: number }[] = []
  let at = 0
  for (const s of text.split(SPLIT)) { const i = text.indexOf(s, at); out.push({ s, at: i }); at = i + s.length }
  return out.filter((x) => x.s.trim() && !/^\{\{[A-Z0-9]+.*\}\}$/.test(x.s.trim()))
}

/** Outputs a sentence names: [T14.2.1], (Table 14.2.1), Table 14.2.1, or {{T9}}. */
export function referenced(s: string, outputs: Output[]) {
  const nums = [...s.matchAll(/\[T?(\d+(?:\.\d+)+)\]|(?:Table|Listing|Figure)s?\s+(\d+(?:\.\d+)+)/g)].map((m) => m[1] ?? m[2])
  return outputs.filter((o) => nums.includes(tableNumber(o.title)))
}

const round = (v: number, d: number) => Math.round(v * 10 ** d + (v >= 0 ? 1e-9 : -1e-9)) / 10 ** d
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

export function checkText(section: string, text: string, outputs: Output[], slots: string[], groups: string[], rounding: Rounding): Finding[] {
  const all = tokens(outputs), al = aliases(groups), found: Finding[] = []
  sentences(text).forEach(({ s, at: sAt }, si) => {
    const refs = referenced(s, outputs), slotOuts = outputs.filter((o) => slots.includes(o.id))
    const cand = refs.length ? refs : slotOuts.length ? slotOuts : outputs
    const pool = all.filter((t) => cand.some((o) => o.id === t.out))
    // Quoted text (a row label such as “Age ≥65 years”) is not a result: blank it out.
    const clean = s.replace(/“[^”]*”/g, (m) => ' '.repeat(m.length)).replace(/\[T?\d+(?:\.\d+)+\]/g, (m) => ' '.repeat(m.length)).replace(/(?:Table|Listing|Figure)s?\s+\d+(?:\.\d+)+/g, (m) => ' '.repeat(m.length))
    const named = al.flatMap((a) => [...clean.matchAll(a.re)].map((m) => ({ group: a.group, at: m.index!, end: m.index! + m[0].length })))
      .filter((m, _, arr) => !arr.some((o) => o !== m && o.at <= m.at && o.end >= m.end && o.end - o.at > m.end - m.at)) // "5 mg" inside "GLV-12 5 mg"
      .sort((a, b) => a.at - b.at)
    // A group after "from", "than", "versus" is the comparator: numbers near it belong to the other
    // group, unless they sit in brackets straight after it ("than the placebo group (11, 40.7%)").
    const mentions = named.filter((m) => !COMPARATOR.test(clean.slice(Math.max(0, m.at - 20), m.at)))
    const respectively = /\brespectively\b/i.test(s)
    const down = /\b(decreas\w*|fell|fall|falls|reduc\w*|lower\w*|declin\w*|drop\w*)\b/i.test(s), up = /\b(increas\w*|rose|rise|rises|gain\w*|higher)\b/i.test(s)
    const add = (f: Omit<Finding, 'section' | 'sentence'>) => found.push({ section, sentence: si, ...f })
    const nums = [...clean.matchAll(NUM)]
    // Numbers that can be results (not codes such as GLV-12, doses such as 10 mg): they bound the words that describe a number.
    const real = nums.filter((m) => !/[A-Za-z]-?$/.test(clean.slice(Math.max(0, m.index! - 2), m.index!)) && !EXEMPT_AFTER.test(clean.slice(m.index! + m[0].length, m.index! + m[0].length + 14)))
    let last: { tie: Tok; end: number } | undefined
    for (const [k, m] of nums.entries()) {
      const raw = m[0], i = m.index!, before = clean.slice(Math.max(0, i - 14), i), after = clean.slice(i + raw.length, i + raw.length + 14)
      if (/[A-Za-z]-$|[A-Za-z]$/.test(before) || /^[A-Za-z]/.test(after) && !/^%/.test(after)) continue // part of a code such as GLV-12 or HbA1c
      if (/\d-$/.test(before) || /^-\d/.test(after) || (/^[-−–]/.test(raw) && /\d$/.test(before)) || /\d\.$/.test(before)) continue // part of a participant ID such as GLV-12-301-105-006
      if (EXEMPT_BEFORE.test(before) || EXEMPT_AFTER.test(after)) continue
      if (/^\d+$/.test(raw) && UNIT_AFTER.test(after)) continue
      if (/^\.\d/.test(after)) continue
      const v = num(raw), isPct = /^\s*%/.test(after), isP = /p\s*[=<>≤]\s*$/i.test(before)
      if (!isPct && !isP && Number.isInteger(v) && v >= 1900 && v <= 2100) continue // a year
      if (/95\s*$/.test(raw) && /^%\s*(ci|confidence)/i.test(after)) continue
      const d = dec(raw), at = sAt + i
      const back = clean.slice(Math.max(0, i - 40), i)
      const hint: 'lcl' | 'ucl' | 'point' = /CI[:\s]*$/i.test(back) ? 'lcl' : /CI[^()]*?[\d.]\s*(?:to|,)\s*$/i.test(back) ? 'ucl' : 'point'
      // The words that describe this number: back to the previous number or clause break, and on to the next.
      const prevN = real.filter((x) => x.index! < i).at(-1), nextN = real.find((x) => x.index! > i)
      const pe = prevN ? prevN.index! + prevN[0].length : 0, ns = nextN?.index ?? clean.length; void k
      const back2 = clean.slice(pe, i), cut = Math.max(back2.lastIndexOf(', '), back2.lastIndexOf('; '), back2.lastIndexOf(' and '), back2.lastIndexOf(': '))
      const fwd = clean.slice(i + raw.length, ns), stop = fwd.search(/[,;:]\s|\s+and\s/)
      const pair = isPct && last && /^\s*(?:participants?|patients?|people)?\s*[(,]\s*$/i.test(clean.slice(last.end, i)) ? last.tie : undefined
      const C: Ctx = { s, local: `${cut >= 0 ? back2.slice(cut) : back2} ${stop >= 0 ? fwd.slice(0, stop) : fwd}`, hint, pair }
      const end = i + raw.length
      const next = mentions.find((x) => x.at >= end), prev = mentions.filter((x) => x.end <= i).at(-1)
      const bound = named.filter((x) => x.end <= i).at(-1)
      const inBrackets = bound && /^\s*(?:group|arm)?\s*\((?:[\s\d.,%]|n\s*=)*$/i.test(clean.slice(bound.end, i))
      const nearNext = next && next.at - end < 40 && !/[:;]|\d/.test(clean.slice(end, next.at).replace(/^[\s\d.,%()]*\)/, ''))
      const g = respectively ? null : (inBrackets ? bound : next && GAP.test(clean.slice(end, next.at)) ? next : prev && i - prev.end < 80 ? prev : nearNext ? next : null)?.group ?? null
      const kindOk = (t: Tok) => (isPct ? t.kind === 'pct' : isP ? t.kind === 'p' : t.kind !== 'pct' && t.kind !== 'p')
      const inG = (t: Tok) => !g || t.group === g || (g === 'Total' && /total/i.test(t.group))
      const same = (t: Tok) => near(t.value, v) || (!/^[-−–]/.test(raw) && (down || up) && near(Math.abs(t.value), v))
      let G = pool.filter((t) => kindOk(t) && inG(t))
      let exact = G.filter(same)
      if (isPct && !exact.length) { const alt = pool.filter((t) => t.kind !== 'p' && inG(t)); if (alt.some(same)) { G = alt; exact = alt.filter(same) } } // HbA1c and other values measured in %
      if (isP && (/^0\.0+$/.test(raw) || (d > 3 && v < 0.001))) add({ at, text: raw, status: 'p-format', message: v === 0 ? 'A p-value is never 0: write p<0.001.' : `Write p<0.001 rather than p=${raw}.` })
      if (exact.length) {
        const tie = best(exact, C)
        if (!/^[-−–]/.test(raw) && tie.value !== 0 && ['est', 'mean', 'value'].includes(tie.kind) && /change|difference|ls mean/i.test(`${tie.row} ${tie.context}`)) {
          if (down && tie.value > 0 && !up) { add({ at, text: raw, status: 'direction', tie, message: `The table shows +${Math.abs(tie.value)} (${tie.group}, ${tie.row}); “${(/\b(decreas\w*|fell|fall|reduc\w*|lower\w*|declin\w*|drop\w*)\b/i.exec(s) ?? [''])[0]}” says it went down.` }); continue }
          if (up && tie.value < 0 && !down) { add({ at, text: raw, status: 'direction', tie, message: `The table shows ${tie.value} (${tie.group}, ${tie.row}); “${(/\b(increas\w*|rose|rise|gain\w*|higher)\b/i.exec(s) ?? [''])[0]}” says it went up.` }); continue }
        }
        if (d < tie.dec) { add({ at, text: raw, status: 'rounding', tie, message: `The table gives ${tie.raw} (${tie.group}, ${tie.row}). Keep the decimals the table shows.`, suggestion: tie.raw }); continue }
        last = { tie, end: i + raw.length }
        add({ at, text: raw, status: 'ok', tie, message: `${tie.table ? `Table ${tie.table}` : tie.out}, ${tie.context ? `${tie.context}: ` : ''}${tie.row}, ${tie.group}` })
        continue
      }
      const rounded = G.filter((t) => d < t.dec && near(round(t.value, d), v) || (!/^[-−–]/.test(raw) && d < t.dec && near(round(Math.abs(t.value), d), v)))
      if (rounded.length) { const tie = best(rounded, C); last = { tie, end: i + raw.length }; add({ at, text: raw, status: 'rounding', tie, message: `The table gives ${tie.lt ? '<' : ''}${tie.raw} (${tie.group}, ${tie.row}). Report it as in the table${isPct ? `, to ${rounding.pct} decimal place${rounding.pct === 1 ? '' : 's'}` : ''}.`, suggestion: tie.raw }); continue }
      const other = pool.filter((t) => kindOk(t) && same(t) && !inG(t))
      if (g && other.length) { const tie = best(other, C), right = best(G.length ? G : pool, C); add({ at, text: raw, status: 'wrong-group', tie, message: `${raw} is the ${tie.group} value (${tie.row}); the sentence gives it to ${g}${right && right.group === g ? `, whose value is ${right.lt ? '<' : ''}${right.raw}` : ''}.`, suggestion: right && right.group === g ? right.raw : undefined }); continue }
      const like = G.length ? best(G, C) : undefined
      if (like) add({ at, text: raw, status: 'wrong-value', tie: like, message: `No cell matches ${raw}. Nearest by meaning: ${like.table ? `Table ${like.table}` : like.out}, ${like.context ? `${like.context}: ` : ''}${like.row}, ${like.group} = ${like.lt ? '<' : ''}${like.raw}.`, suggestion: like.raw })
      else add({ at, text: raw, status: 'no-source', message: `${raw} is not in ${refs.length ? `the table${refs.length > 1 ? 's' : ''} referenced` : slotOuts.length ? 'the tables attached to this section' : 'any study output'}. Add a reference such as [T14.1.1], or remove the number.` })
    }
    // n of N (x%), n/N (x%)
    for (const m of s.matchAll(/(\d+)\s*(?:\/|of)\s*(\d+)[^()%]{0,40}\((\d+(?:\.\d+)?)\s*%\)/g)) {
      const n = Number(m[1]), N = Number(m[2]), p = Number(m[3]), d = dec(m[3])
      if (N > 0 && !near(round((100 * n) / N, d), p)) add({ at: sAt + m.index!, text: m[0], status: 'pct-calc', message: `${n}/${N} is ${round((100 * n) / N, Math.max(d, 1))}%, not ${p}%.`, suggestion: String(round((100 * n) / N, d)) })
    }
    // estimate (95% CI lo, hi) or (95% CI: lo to hi)
    for (const m of s.matchAll(/([-−–]?\d+(?:\.\d+)?)\s*%?\s*\(95%\s*(?:CI|confidence interval)[:,]?\s*([-−–]?\d+(?:\.\d+)?)%?\s*(?:,|to)\s*([-−–]?\d+(?:\.\d+)?)%?\)/gi)) {
      const e = num(m[1]), lo = num(m[2]), hi = num(m[3])
      if (!(Math.min(lo, hi) <= e && e <= Math.max(lo, hi))) add({ at: sAt + m.index!, text: m[0], status: 'ci-order', message: `${e} is outside its interval ${lo} to ${hi}.` })
    }
  })
  return found
}

interface Ctx { s: string; local: string; hint: 'lcl' | 'ucl' | 'point'; pair?: Tok }
/** The cell that fits best: the n it is the percentage of, then the words next to the number, then the sentence. */
function best(ts: Tok[], c: Ctx): Tok {
  const w = words(c.s), lw = words(c.local)
  const fits = (t: Tok) => c.hint === 'point' ? (t.kind === 'lcl' || t.kind === 'ucl' ? 0 : 3) : t.kind === c.hint ? 3 : 0
  const paired = (t: Tok) => (c.pair && t.out === c.pair.out && t.row === c.pair.row && t.context === c.pair.context && t.group === c.pair.group && t.col === c.pair.col ? 20 : 0)
  const score = (t: Tok) => { const tw = [...words(`${t.context} ${t.row} ${t.col}`)]; return 3 * tw.filter((x) => lw.has(x)).length + tw.filter((x) => w.has(x)).length + fits(t) + paired(t) }
  return [...ts].sort((a, b) => score(b) - score(a))[0]
}

export const issues = (fs: Finding[]) => fs.filter((f) => SEVERITY[f.status] !== 'ok')
export const errors = (fs: Finding[]) => fs.filter((f) => SEVERITY[f.status] === 'error')
