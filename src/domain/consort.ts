// The CONSORT-style flow of participants, read from the disposition table (14.1.1): screened,
// screen failures, randomised, then by group treated, completed and discontinued with the reasons.
// The diagram is drawn from the table, so the checks here are the table's own arithmetic, which a
// flow diagram makes visible: every box must add up.
import { outputsOf } from './study'
import { tableNumber } from './e3'
import type { StudyOutputs } from './types'

export interface Arm { group: string; randomised: number; treated: number; completed: number; discontinued: number; reasons: { reason: string; n: number }[]; /** Event-driven studies (oncology): the status rows at the data cut-off instead of completed/discontinued. */ status: { label: string; n: number }[] }
export interface Flow { table: string; screened: number | null; failures: number | null; randomised: number; arms: Arm[]; eventDriven: boolean }
export interface FlowCheck { label: string; ok: boolean; why: string }

const first = (s: string | undefined) => { const m = /\d+/.exec(s ?? ''); return m ? Number(m[0]) : null }

export function flowOf(d: StudyOutputs): Flow | null {
  const o = outputsOf(d).find((x) => tableNumber(x.title) === '14.1.1'); const t = o?.display
  if (!t) return null
  const row = (re: RegExp) => t.rows.find((r) => re.test(r.label))
  const ti = t.head.findIndex((h) => /^total$/i.test(h))
  const total = (re: RegExp) => first(row(re)?.cells[ti >= 0 ? ti : t.head.length - 1]?.text)
  const ri = t.rows.findIndex((r) => /^primary reason/i.test(r.label))
  const reasons = ri >= 0 ? t.rows.slice(ri + 1) : []
  const eventDriven = !row(/^completed/i), ti2 = t.rows.findIndex((r) => /^treated/i.test(r.label)), statusRows = eventDriven && ti2 >= 0 ? t.rows.slice(ti2 + 1) : []
  const arms = t.head.map((g, i) => ({ g, i })).filter(({ g }) => !/^total$/i.test(g)).map(({ g, i }) => ({
    group: g, randomised: first(row(/^randomi[sz]ed/i)?.cells[i]?.text) ?? 0, treated: first(row(/^treated/i)?.cells[i]?.text) ?? 0,
    completed: first(row(/^completed/i)?.cells[i]?.text) ?? 0, discontinued: first(row(/^discontinued/i)?.cells[i]?.text) ?? 0,
    reasons: reasons.map((r) => ({ reason: r.label, n: first(r.cells[i]?.text) ?? 0 })),
    status: statusRows.map((r) => ({ label: r.label, n: first(r.cells[i]?.text) ?? 0 })),
  }))
  return { table: '14.1.1', screened: total(/^screened/i), failures: total(/^screen fail/i), randomised: total(/^randomi[sz]ed/i) ?? arms.reduce((a, x) => a + x.randomised, 0), arms, eventDriven }
}

/** Do the boxes add up? */
export function flowChecks(f: Flow): FlowCheck[] {
  const out: FlowCheck[] = []
  if (f.screened !== null && f.failures !== null) out.push({ label: 'Screened minus screen failures equals randomised', ok: f.screened - f.failures === f.randomised, why: `${f.screened} − ${f.failures} = ${f.screened - f.failures}; randomised ${f.randomised}.` })
  const sum = f.arms.reduce((a, x) => a + x.randomised, 0)
  out.push({ label: 'The groups add up to the randomised total', ok: sum === f.randomised, why: `${f.arms.map((a) => a.randomised).join(' + ')} = ${sum}; total ${f.randomised}.` })
  for (const a of f.arms) {
    if (f.eventDriven) {
      out.push({ label: `${a.group}: no more treated than randomised`, ok: a.treated <= a.randomised, why: `${a.treated} treated of ${a.randomised} randomised.` })
      for (const st of a.status) out.push({ label: `${a.group}: ${st.label.toLowerCase()} within those randomised`, ok: st.n <= a.randomised, why: `${st.n} of ${a.randomised}.` })
      const died = a.status.find((x) => /^died/i.test(x.label)), alive = a.status.find((x) => /^alive/i.test(x.label))
      if (died && alive) out.push({ label: `${a.group}: died plus alive equals randomised`, ok: died.n + alive.n === a.randomised, why: `${died.n} + ${alive.n} = ${died.n + alive.n}; randomised ${a.randomised}.` })
      continue
    }
    out.push({ label: `${a.group}: completed plus discontinued equals randomised`, ok: a.completed + a.discontinued === a.randomised, why: `${a.completed} + ${a.discontinued} = ${a.completed + a.discontinued}; randomised ${a.randomised}.` })
    const r = a.reasons.reduce((s, x) => s + x.n, 0)
    if (a.reasons.length) out.push({ label: `${a.group}: the reasons add up to the discontinuations`, ok: r === a.discontinued, why: `${r} by reason; ${a.discontinued} discontinued.` })
    if (a.treated > a.randomised) out.push({ label: `${a.group}: no more treated than randomised`, ok: false, why: `${a.treated} treated of ${a.randomised} randomised.` })
  }
  return out
}

/** The diagram as SVG text (also offered as a download for the report). */
export function flowSvg(f: Flow, dark = false): string {
  const W = Math.max(640, f.arms.length * 230), col = W / f.arms.length, ink = dark ? '#e7e5df' : '#1f2328', line = dark ? '#8b8f96' : '#6b7280', box = dark ? '#23262b' : '#ffffff'
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const rect = (x: number, y: number, w: number, h: number, lines: string[], bold = false) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${box}" stroke="${line}"/>` + lines.map((l, i) => `<text x="${x + w / 2}" y="${y + 18 + i * 15}" text-anchor="middle" font-size="12" ${bold && !i ? 'font-weight="600"' : ''} fill="${ink}">${esc(l)}</text>`).join('')
  const arrow = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${line}" marker-end="url(#a)"/>`
  const parts: string[] = [], cx = W / 2
  let y = 10
  if (f.screened !== null) {
    parts.push(rect(cx - 110, y, 220, 30, [`Screened (n=${f.screened})`], true))
    if (f.failures !== null) { parts.push(arrow(cx, y + 30, cx, y + 60), `<line x1="${cx}" y1="${y + 45}" x2="${cx + 140}" y2="${y + 45}" stroke="${line}"/>`, rect(cx + 140, y + 32, 160, 26, [`Screen failures (n=${f.failures})`])) }
    y += 60
  }
  parts.push(rect(cx - 110, y, 220, 30, [`Randomised (n=${f.randomised})`], true))
  const yA = y + 70, maxR = Math.max(0, ...f.arms.map((a) => (f.eventDriven ? a.status.length : a.reasons.filter((r) => r.n).length)))
  f.arms.forEach((a, i) => {
    const x = i * col + 10, w = col - 20, mid = x + w / 2
    parts.push(`<path d="M${cx} ${y + 30} V${y + 50} H${mid} V${yA}" fill="none" stroke="${line}" marker-end="url(#a)"/>`)
    parts.push(rect(x, yA, w, 46, [a.group, `Randomised ${a.randomised} · treated ${a.treated}`], true))
    parts.push(arrow(mid, yA + 46, mid, yA + 70))
    const rs = f.eventDriven ? a.status.map((s) => ({ reason: s.label, n: s.n })) : a.reasons.filter((r) => r.n)
    parts.push(rect(x, yA + 70, w, 30 + rs.length * 15, [f.eventDriven ? 'At the data cut-off' : `Discontinued (n=${a.discontinued})`, ...rs.map((r) => `${r.reason}: ${r.n}`)]))
    const yC = yA + 70 + 30 + maxR * 15 + 24
    if (!f.eventDriven) { parts.push(arrow(mid, yA + 100 + rs.length * 15, mid, yC)); parts.push(rect(x, yC, w, 30, [`Completed the study (n=${a.completed})`], true)) }
  })
  const H = yA + 70 + 30 + maxR * 15 + 24 + 40
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif" role="img" aria-label="Flow of participants (CONSORT style), from Table ${f.table}"><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${line}"/></marker></defs>${parts.join('')}</svg>`
}
