// Bring in the learner's own outputs from the TLF Programming Lab: its analysis package (a zip
// with ars-reporting-event.json inside), the reporting event file on its own, or a study-outputs
// file. The tables keep the reference layout; every cell is redrawn from the learner's results,
// matched by the analysis keys each cell carries.
import { unzipSync, strFromU8 } from 'fflate'
import { BUNDLED } from './study'
import type { Frame, StudyOutputs } from './types'

const round = (v: number, d: number) => (Math.round(v * 10 ** d + (v >= 0 ? 1e-9 : -1e-9)) / 10 ** d).toFixed(d)
const dec = (s: string) => (s.includes('.') ? s.split('.')[1].length : 0)
interface Stat { stat: string; value: number }
const statsOf = (f: Frame, an: string, g: string, cat: string | null): Stat[] => {
  const c = (n: string) => f.columns.indexOf(n)
  return f.rows.filter((r) => r[c('ANALYSIS')] === an && r[c('GROUP')] === g && (r[c('CATEGORY')] ?? null) === cat && r[c('VALUE')] !== null && Number.isFinite(Number(r[c('VALUE')]))).map((r) => ({ stat: String(r[c('STAT')]), value: Number(r[c('VALUE')]) }))
}

/** Redraw one cell's text: each number is replaced by the learner's value of the same statistic. */
export function redraw(text: string, ref: Stat[], mine: Stat[]): string {
  const used = new Set<number>()
  return text.replace(/(<)?-?\d+(?:\.\d+)?/g, (m, lt: string | undefined) => {
    const raw = m.replace('<', ''), d = dec(raw), x = Number(raw)
    const i = ref.findIndex((s, k) => !used.has(k) && (lt ? s.value < x : round(s.value, d) === round(x, d)))
    if (i < 0) return m
    used.add(i)
    const v = mine.find((s) => s.stat === ref[i].stat)?.value
    if (v === undefined) return m
    return lt ? (v < x ? m : round(v, d)) : round(v, d)
  })
}

export interface Provenance { kind: 'package' | 'reporting-event' | 'outputs'; handoff: string | null; lock: string | null; project: string | null }
export interface Imported { data: StudyOutputs; changed: string[]; missing: string[]; source: string; provenance?: Provenance }
export function applyResults(study: string, tables: Record<string, Frame>, source: string): Imported {
  const base = BUNDLED[study]; if (!base) throw new Error(`The file is for ${study}, which the Studio does not have.`)
  const data = structuredClone(base), changed: string[] = [], missing: string[] = []
  for (const o of data.outputs) {
    if (o.kind !== 'ard') continue
    const mine = tables[o.id]; if (!mine) { missing.push(o.id); continue }
    const ref = o.frame; let diff = false
    if (o.display) for (const r of o.display.rows) for (const c of r.cells) {
      if (!c.keys?.length || !c.text.trim()) continue
      const k = c.keys[0], t = redraw(c.text, c.keys.flatMap((x) => statsOf(ref, x.an, x.g, x.cat)), c.keys.flatMap((x) => statsOf(mine, x.an, x.g, x.cat)))
      if (t !== c.text) { diff = true; c.text = t } void k
    }
    o.frame = mine
    if (diff) changed.push(o.id)
  }
  data.source = source
  return { data, changed, missing, source }
}

function fromReportingEvent(re: unknown, source: string): Imported {
  const r = re as { id?: string; analyses?: { id: string; methodId: string; results?: { operationId: string; analysis: string; category: string | null; resultGroups?: { groupName?: string }[]; rawValue: string | number | null }[] }[] }
  if (!r || typeof r.id !== 'string' || !r.id.startsWith('RE_') || !Array.isArray(r.analyses)) throw new Error('This is not an analysis results file from the TLF Programming Lab.')
  const tables: Record<string, Frame> = {}
  for (const a of r.analyses) {
    const p = `${a.methodId}_`
    tables[a.id.replace(/^AN_/, '')] = { columns: ['ANALYSIS', 'GROUP', 'CATEGORY', 'STAT', 'VALUE'], rows: (a.results ?? []).map((x) => [x.analysis, x.resultGroups?.[0]?.groupName ?? null, x.category ?? null, x.operationId.startsWith(p) ? x.operationId.slice(p.length) : x.operationId, x.rawValue === null || x.rawValue === undefined ? null : String(x.rawValue)]) }
  }
  return applyResults(r.id.slice(3), tables, source)
}

/** Read a file the learner chose: a TLF Lab analysis package, its reporting event, or study outputs. */
export function readOutputsFile(name: string, bytes: Uint8Array): Imported {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const files = unzipSync(bytes), ars = files['ars-reporting-event.json'], man = files['analysis.json']
    if (!ars) throw new Error('This zip is not a TLF Programming Lab analysis package (no ars-reporting-event.json).')
    const m = man ? JSON.parse(strFromU8(man)) : {}
    return { ...fromReportingEvent(JSON.parse(strFromU8(ars)), `TLF Programming Lab analysis package${m.producer?.project ? `: ${m.producer.project}` : ''} (${name})`), provenance: { kind: 'package', handoff: m.handoff?.source?.kind ?? null, lock: m.handoff?.source?.lock ?? null, project: m.producer?.project ?? null } }
  }
  let j: Record<string, unknown>
  try { j = JSON.parse(strFromU8(bytes)) } catch { throw new Error('This file is not a zip or JSON.') }
  if (j.format === 'csr-studio/study-outputs') { const d = j as unknown as StudyOutputs; if (!BUNDLED[d.study]) throw new Error(`Unknown study ${d.study}.`); return { data: d, changed: [], missing: [], source: `${d.source} (${name})` } }
  return { ...fromReportingEvent(j, `TLF Programming Lab reporting event (${name})`), provenance: { kind: 'reporting-event', handoff: null, lock: null, project: null } }
}
