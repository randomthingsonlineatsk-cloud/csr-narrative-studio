// Tracing ONK-44-302's efficacy numbers below the analysis data: the participants are recounted
// from SDTM (RS, DM, DS) with the same rules as the TLF Lab's ADTTE and ADRS programs, and the
// records they rest on are shown as collected: the investigator's response form, the independent
// review's vendor file, and the death form.
import { rows, str, type Sdtm } from './sdtm'

export const ONK_CUT = '2026-10-31'
const ARM: Record<string, string> = { ONK44: 'ONK-44 400 mg', DOCE: 'Docetaxel' }
const IRC = 'INDEPENDENT ASSESSOR', INV = 'INVESTIGATOR'
const full = (d: string) => (/^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : /^\d{4}-\d{2}$/.test(d) ? `${d}-01` : '')
const day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86400000

export interface OnkTrace { title: string; n: number; subjects: string[]; records: string[] }
export function onkTrace(s: Sdtm, an: string, group: string, cat: string | null): OnkTrace | null {
  const dm = rows(s, 'DM'), rand = new Map(rows(s, 'DS').filter((r) => str(r.DSDECOD) === 'RANDOMIZED').map((r) => [str(r.USUBJID), str(r.DSSTDTC).slice(0, 10)]))
  const itt = dm.filter((r) => rand.has(str(r.USUBJID)) && (group === 'Total' || ARM[str(r.ARMCD)] === group))
  const death = new Map(itt.map((r) => [str(r.USUBJID), full(str(r.DTHDTC))] as [string, string]).filter(([, d]) => d && d <= ONK_CUT))
  const ov = (u: string, ev: string) => rows(s, 'RS', u).filter((r) => str(r.RSTESTCD) === 'OVRLRESP' && str(r.RSEVAL) === ev && str(r.RSDTC).slice(0, 10) <= ONK_CUT).sort((a, b) => str(a.RSDTC).localeCompare(str(b.RSDTC)))
  const raw = (s as Sdtm & { raw?: Record<string, { columns: string[]; rows: (string | null)[][] }> }).raw ?? {}
  const rawRows = (form: string, subj: string) => { const t = raw[form]; if (!t) return []; return t.rows.filter((r) => r[0] === subj).map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i] ?? '']))) }
  const sid = (u: string) => u.replace(/^ONK-44-302-/, '')
  const srcPd = (u: string, ev: string) => {
    if (ev === IRC) { const r = rawRows('IRC', sid(u)).find((x) => /^PD$/i.test(String(x.OVERALL))); return r ? `${sid(u)}: independent review file, ${r.TIMEPOINT}, scan ${r.SCANDATE}, overall response ${r.OVERALL} (${r.READER})` : '' }
    const r = rawRows('RSP', sid(u)).find((x) => x.OVRLRESP === 'PD'); return r ? `${sid(u)}: Response (investigator) form, ${r.VISIT}, scan ${r.ASSDAT}, overall response PD` : ''
  }
  const srcDeath = (u: string) => { const r = rawRows('DTH', sid(u))[0]; return r ? `${sid(u)}: Death form, date ${r.DTHDAT}, cause ${r.DTHCAUSE}` : '' }
  const pfsEvent = (u: string, ev: string) => { const pd = ov(u, ev).find((r) => str(r.RSSTRESC) === 'PD'), d = death.get(u); const pdd = pd ? str(pd.RSDTC).slice(0, 10) : ''; if (!pdd && !d) return null; return !d || (pdd && pdd <= d) ? 'PD' : 'DEATH' }
  const best = (u: string, ev: string) => { const rk: Record<string, number> = { CR: 5, PR: 4, SD: 3, PD: 2, NE: 1 }; let b = 'NE'
    for (const r of ov(u, ev)) { const v = str(r.RSSTRESC); if (!rk[v]) continue; if (v === 'SD' && day(str(r.RSDTC).slice(0, 10)) - day(rand.get(u)!) + 1 < 36) continue; if (rk[v] > rk[b]) b = v; if (v === 'PD') break }
    return b }
  const ids = itt.map((r) => str(r.USUBJID))
  const pick = (title: string, hit: string[], rec: (u: string) => string): OnkTrace => ({ title, n: hit.length, subjects: hit, records: hit.map(rec).filter(Boolean) })
  const pfsFor = (ev: string, label: string) => pick(`RS overall responses (${label}) and DM death dates, up to ${ONK_CUT}`, ids.filter((u) => pfsEvent(u, ev)), (u) => (pfsEvent(u, ev) === 'PD' ? srcPd(u, ev) : srcDeath(u)))
  if (an === 'PFS_EVT' || an === 'PFSEVT') return pfsFor(IRC, 'independent review')
  if (an === 'PFSINV_EVT') return pfsFor(INV, 'investigator')
  if (an === 'OS_EVT' || an === 'DEATH') return pick(`DM: DTHDTC on or before ${ONK_CUT}`, ids.filter((u) => death.has(u)), srcDeath)
  if (an === 'ALIVE') return pick(`DM: no death on or before ${ONK_CUT}`, ids.filter((u) => !death.has(u)), () => '')
  const m = /^(IRC|INV)_(ORR|BOR)$/.exec(an)
  if (m) {
    const ev = m[1] === 'IRC' ? IRC : INV, want = m[2] === 'ORR' ? ['CR', 'PR'] : [cat ?? '']
    const hit = ids.filter((u) => want.includes(best(u, ev)))
    return pick(`RS: best overall response (${m[1] === 'IRC' ? 'independent review' : 'investigator'}) = ${want.join(' or ')}`, hit, (u) => {
      const b = best(u, ev)
      if (ev === IRC) { const r = rawRows('IRC', sid(u)).find((x) => String(x.OVERALL).toUpperCase() === b); return r ? `${sid(u)}: independent review file, ${r.TIMEPOINT}, scan ${r.SCANDATE}, overall response ${r.OVERALL}` : '' }
      const r = rawRows('RSP', sid(u)).find((x) => x.OVRLRESP === b); return r ? `${sid(u)}: Response (investigator) form, ${r.VISIT}, scan ${r.ASSDAT}, sum of diameters ${r.SUMDIAM} mm, overall response ${r.OVRLRESP}` : ''
    })
  }
  return null
}
