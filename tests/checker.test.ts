import { describe, expect, test } from 'vitest'
import { checkText, issues, tokens } from '../src/domain/checker'
import { BUNDLED, outputsOf } from '../src/domain/study'
import { GLV_REFERENCE } from '../src/domain/reference'

const glv = BUNDLED['GLV-12-301'], outs = outputsOf(glv), R = { pct: 1, mean: 2, p: 3 }
const run = (sec: string, text: string) => checkText(sec, text, outs, [], glv.groups, R)

describe('text-versus-table checker on GLV-12-301', () => {
  test('tokens carry table, row, group and kind', () => {
    const t = tokens(outs).filter((x) => x.table === '14.1.1' && x.row === 'Treated')
    expect(t.map((x) => `${x.group}:${x.kind}:${x.raw}`)).toEqual(['Placebo:n:27', 'Placebo:pct:100.0', 'GLV-12 5 mg:n:26', 'GLV-12 5 mg:pct:96.3', 'GLV-12 10 mg:n:27', 'GLV-12 10 mg:pct:100.0', 'Total:n:80', 'Total:pct:98.8'])
  })
  for (const [sec, text] of Object.entries(GLV_REFERENCE)) test(`reference text ${sec} is clean`, () => {
    const f = run(sec, text)
    expect(issues(f).map((x) => `${x.text}: ${x.status} ${x.message}`)).toEqual([])
    if (sec !== '12.3.1') expect(f.filter((x) => x.status === 'ok').length).toBeGreaterThan(1) // 12.3.1 is written from a listing
  })
})

describe('ties pick the right cell', () => {
  test('point estimate versus confidence limit', () => {
    const f = run('11.4.1', GLV_REFERENCE['11.4.1'])
    expect(f[0].tie?.row).toBe('LS mean (SE)')
    const ci = f.filter((x) => x.sentence === 1).map((x) => x.tie?.kind)
    expect(ci).toEqual(['est', 'lcl', 'ucl', 'est', 'lcl', 'ucl'])
  })
})

import { CS2_PLANTED, cs2Draft, cs2Fixed } from '../src/domain/missions/cs2'
import { sentences } from '../src/domain/checker'
describe('mission CS2: 25 planted errors', () => {
  const draft = cs2Draft()
  test('there are 25, and all are unfixed in the draft', () => {
    expect(CS2_PLANTED).toHaveLength(25)
    expect(cs2Fixed(draft).filter((x) => x.fixed)).toEqual([])
    expect(cs2Fixed(GLV_REFERENCE).every((x) => x.fixed)).toBe(true)
  })
  const found = Object.fromEntries(Object.entries(draft).map(([s, t]) => [s, issues(run(s, t))]))
  for (const p of CS2_PLANTED) test(`error ${p.n} (${p.kind}) is caught`, () => {
    const text = draft[p.section], at = text.indexOf(p.to)
    const si = sentences(text).findIndex((x) => x.at <= at && at < x.at + x.s.length)
    const hit = found[p.section].filter((f) => p.scope === 'sentence' ? f.sentence === si : f.at >= at && f.at < at + p.to.length)
    expect(hit.length, `${p.section}: ${p.to}`).toBeGreaterThan(0)
  })
  test('no issue falls outside a planted sentence', () => {
    for (const [s, fs] of Object.entries(found)) {
      const text = draft[s], planted = CS2_PLANTED.filter((p) => p.section === s).map((p) => { const at = text.indexOf(p.to); return sentences(text).findIndex((x) => x.at <= at && at < x.at + x.s.length) })
      expect(fs.filter((f) => !planted.includes(f.sentence)).map((f) => `${s} ${f.text} ${f.message}`)).toEqual([])
    }
  })
})

import { rowsOf, skeleton } from '../src/domain/helper'
describe('results helper', () => {
  test('every skeleton of every GLV table passes the checker', () => {
    const bad: string[] = []
    for (const o of outs.filter((x) => x.display)) for (const r of rowsOf(o)) {
      const s = skeleton(o, r), f = issues(run('11.4.1', s))
      if (f.length) bad.push(`${s} → ${f.map((x) => `${x.text} ${x.status}: ${x.message}`).join(' | ')}`)
    }
    expect(bad.slice(0, 15)).toEqual([])
  })
  test('skeleton wording', () => {
    const t4 = outs.find((o) => o.id === 'T4')!
    expect(skeleton(t4, rowsOf(t4).find((r) => r.row === 'Treated')!)).toBe('“Treated”: 27 (100.0%) with Placebo; 26 (96.3%) with GLV-12 5 mg; 27 (100.0%) with GLV-12 10 mg; 80 (98.8%) with all participants [T14.1.1].')
  })
})
