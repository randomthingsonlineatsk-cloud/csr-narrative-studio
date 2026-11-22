// The liver test screen for 12.4, from the participants' laboratory data (SDTM LB). Each
// participant's peak ALT, AST and total bilirubin is taken as a multiple of the upper limit of
// normal (ULN), counted by group at the usual cut-offs (above 3, 5 and 10 times ULN), and screened
// for potential Hy's law: ALT or AST above 3 × ULN with total bilirubin above 2 × ULN. FDA's
// guidance on drug-induced liver injury (2009) sets these thresholds; a potential case still needs
// alkaline phosphatase and other causes reviewed before it is called a Hy's law case.
import { rows, str, num, type Sdtm } from './sdtm'

export interface Peak { usubjid: string; group: string; alt: number | null; ast: number | null; bili: number | null; altDay: number | null; biliDay: number | null }
export interface LiverScreen { tests: string[]; bilirubin: boolean; groups: { group: string; n: number; gt3: number; gt5: number; gt10: number; bili2: number; hy: number }[]; peaks: Peak[]; potentialHy: Peak[] }

const ALT = ['ALT'], AST = ['AST'], BILI = ['BILI', 'TBILI']

export function liverScreen(s: Sdtm, groups: string[]): LiverScreen {
  const dm = rows(s, 'DM'), lb = rows(s, 'LB')
  const arm = new Map(dm.map((r) => [str(r.USUBJID), str(r.ACTARM) || str(r.ARM)]))
  const tests = [...new Set(lb.map((r) => str(r.LBTESTCD)))]
  const peaks = new Map<string, Peak>()
  for (const r of lb) {
    const code = str(r.LBTESTCD), v = num(r.LBSTRESN), hi = num(r.LBSTNRHI)
    if (v === null || !hi) continue
    const k = ALT.includes(code) ? 'alt' : AST.includes(code) ? 'ast' : BILI.includes(code) ? 'bili' : null; if (!k) continue
    const u = str(r.USUBJID), g = arm.get(u) ?? ''; if (!groups.includes(g)) continue
    const p = peaks.get(u) ?? { usubjid: u, group: g, alt: null, ast: null, bili: null, altDay: null, biliDay: null }
    const x = Math.round((v / hi) * 100) / 100
    if ((p[k] ?? -1) < x) { p[k] = x; if (k === 'alt') p.altDay = num(r.LBDY); if (k === 'bili') p.biliDay = num(r.LBDY) }
    peaks.set(u, p)
  }
  const all = [...peaks.values()], tx = (p: Peak) => Math.max(p.alt ?? 0, p.ast ?? 0)
  const bilirubin = tests.some((t) => BILI.includes(t))
  const potentialHy = all.filter((p) => tx(p) > 3 && (p.bili ?? 0) > 2)
  return {
    tests, bilirubin, peaks: all.sort((a, b) => tx(b) - tx(a)), potentialHy,
    groups: groups.map((g) => { const ps = all.filter((p) => p.group === g); return { group: g, n: ps.length, gt3: ps.filter((p) => tx(p) > 3).length, gt5: ps.filter((p) => tx(p) > 5).length, gt10: ps.filter((p) => tx(p) > 10).length, bili2: ps.filter((p) => (p.bili ?? 0) > 2).length, hy: potentialHy.filter((p) => p.group === g).length } }),
  }
}

export interface LiverItem { label: string; ok: boolean; why: string }
/** What 12.4 must say, given the screen. */
export function liverItems(text: string, sc: LiverScreen): LiverItem[] {
  const t = text.toLowerCase(), any3 = sc.groups.reduce((a, g) => a + g.gt3, 0)
  return [
    { label: 'The liver tests are reported', ok: /\b(alt|ast|alanine|aspartate|transaminase|aminotransferase|liver)\b/.test(t), why: 'Section 12.4 reports the liver tests, even when nothing rose.' },
    { label: `Elevations above 3 × ULN are reported (${any3} participant${any3 === 1 ? '' : 's'})`, ok: any3 === 0 ? true : /(3\s*(×|x|times)\s*(the\s*)?(uln|upper limit))|(>\s*3\s*×?\s*uln)/i.test(text), why: any3 ? `${sc.groups.filter((g) => g.gt3).map((g) => `${g.gt3} on ${g.group}`).join(', ')}: give the number and the group with the cut-off.` : 'No participant above 3 × ULN.' },
    { label: 'Hy’s law is addressed', ok: /hy.?s law/i.test(text), why: sc.potentialHy.length ? `${sc.potentialHy.length} potential Hy’s law case(s): each needs its narrative and the review of other causes.` : 'State that no participant met the potential Hy’s law criteria.' },
    { label: 'Total bilirubin is reported, or its absence is', ok: sc.bilirubin ? /bilirubin/.test(t) : /bilirubin/.test(t) && /(not (measured|collected|tested)|was not part)/.test(t), why: sc.bilirubin ? 'Give the bilirubin results beside the transaminases.' : 'Total bilirubin is not in these laboratory data, so Hy’s law can be screened only in part: say so in 12.4, and why.' },
  ]
}
