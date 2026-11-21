// Patient-level data for the narratives: SDTM domains (DM, AE, CM, EX, LB, MH, DS, VS) as the
// SDTM Mapping Trainer hands them off, and the sponsor safety database's cases for each SAE
// (HRP-301 from the CDM Console's export for the CSR; GLV-12-301 bundled). Loaded on demand.
import { unzipSync, strFromU8 } from 'fflate'

export type Row = Record<string, string | number | null>
export interface Table { columns: string[]; rows: (string | number | null)[][] }
export interface Sdtm { format: 'csr-studio/sdtm'; schema: 1; study: string; source: string; domains: Record<string, Table> }
export interface SafetyCase { caseId: string; subj: string; usubjid: string; term: string; onset: string; end: string; criteria: string[]; outcome: string; causality: string; sponsorCausality: string; action: string; aware: string; received: string }
export interface Recon { usubjid: string; term: string; caseId: string | null; status: string; notes: string[] }
export interface Safety { source: string; cases: SafetyCase[]; reconciliation: Recon[]; deviations?: { category: string; important: boolean; count: number; subjects: string[] }[]; lock?: { status: string; hardLockUtc: string | null } }

export const rows = (s: Sdtm, d: string, usubjid?: string): Row[] => {
  const t = s.domains[d]; if (!t) return []
  const out = t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])) as Row)
  return usubjid ? out.filter((r) => r.USUBJID === usubjid) : out
}
export const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
export const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))

const LOADERS: Record<string, () => Promise<{ sdtm: Sdtm; safety: Safety }>> = {
  'GLV-12-301': async () => ({ sdtm: (await import('../data/sdtm-glv-12-301.json')).default as unknown as Sdtm, safety: { ...((await import('../data/cases-glv-12-301.json')).default as unknown as Safety) } }),
  'HRP-301': async () => {
    const cdm = (await import('../data/cdm-hrp-301.json')).default as unknown as { sae: { cases: SafetyCase[]; reconciliation: Recon[] }; deviations: Safety['deviations']; lock: Safety['lock'] }
    return { sdtm: (await import('../data/sdtm-hrp-301.json')).default as unknown as Sdtm, safety: { source: 'CDM Query & Edit-Check Console: export for the CSR from the locked HRP-301 database', cases: cdm.sae.cases, reconciliation: cdm.sae.reconciliation, deviations: cdm.deviations, lock: cdm.lock } }
  },
}
const cache: Record<string, { sdtm: Sdtm; safety: Safety }> = {}
export async function loadPatientData(study: string) { return (cache[study] ??= await LOADERS[study]()) }

/** The CDM Console's export for the CSR, as the Safety shape. */
export function readCdmExport(text: string, study: string): Safety {
  let j: { format?: string; study?: { id: string }; sae?: { cases: SafetyCase[]; reconciliation: Recon[] }; deviations?: Safety['deviations']; lock?: Safety['lock']; exportedUtc?: string }
  try { j = JSON.parse(text) } catch { throw new Error('This file is not JSON.') }
  const k = j as unknown as { format?: string; study?: string | { id: string }; source?: string; cases?: SafetyCase[]; reconciliation?: Recon[] }
  if (k.format === 'csr-studio/safety-cases' && Array.isArray(k.cases)) {
    if (k.study !== study) throw new Error(`Those safety cases are for ${String(k.study)}; this report is for ${study}.`)
    return { source: k.source ?? 'Safety cases file', cases: k.cases, reconciliation: k.reconciliation ?? [] }
  }
  if (j.format !== 'cdm-console/csr-export' || !j.sae) throw new Error('This is neither an export for the CSR from the CDM Query & Edit-Check Console nor a safety cases file.')
  if (j.study?.id !== study) throw new Error(`That export is for ${j.study?.id}; this report is for ${study}.`)
  return { source: `CDM Console export for the CSR (${j.exportedUtc?.slice(0, 10) ?? ''})`, cases: j.sae.cases, reconciliation: j.sae.reconciliation, deviations: j.deviations, lock: j.lock }
}

const KEEP: Record<string, string[]> = {
  DM: ['USUBJID', 'SUBJID', 'SITEID', 'AGE', 'AGEU', 'SEX', 'RACE', 'ETHNIC', 'COUNTRY', 'ARM', 'ACTARM', 'RFICDTC', 'RFXSTDTC', 'RFXENDTC', 'DTHDTC', 'DTHFL', 'BRTHDTC'],
  AE: ['USUBJID', 'AESEQ', 'AETERM', 'AEDECOD', 'AEBODSYS', 'AESEV', 'AESER', 'AEREL', 'AEACN', 'AEOUT', 'AESDTH', 'AESHOSP', 'AESTDTC', 'AEENDTC', 'AESTDY', 'AEENDY'],
  CM: ['USUBJID', 'CMSEQ', 'CMTRT', 'CMDECOD', 'CMINDC', 'CMCLAS', 'CMDOSE', 'CMDOSU', 'CMDOSFRQ', 'CMROUTE', 'CMSTDTC', 'CMENDTC', 'CMSTDY', 'CMENDY', 'CMENRTPT'],
  EX: ['USUBJID', 'EXSEQ', 'EXTRT', 'EXDOSE', 'EXDOSU', 'EXDOSFRQ', 'EXROUTE', 'EXSTDTC', 'EXENDTC', 'EXSTDY', 'EXENDY'],
  LB: ['USUBJID', 'LBTESTCD', 'LBTEST', 'LBSTRESN', 'LBSTRESC', 'LBSTRESU', 'LBSTNRLO', 'LBSTNRHI', 'LBNRIND', 'VISIT', 'LBDTC', 'LBDY'],
  MH: ['USUBJID', 'MHTERM', 'MHDECOD', 'MHCAT', 'MHSTDTC', 'MHENRTPT'],
  DS: ['USUBJID', 'DSCAT', 'DSDECOD', 'DSTERM', 'DSSTDTC', 'DSSTDY'],
  VS: ['USUBJID', 'VSTESTCD', 'VSTEST', 'VSSTRESN', 'VSSTRESU', 'VISIT', 'VSDTC', 'VSDY'],
}
/** A learner's own SDTM hand-off (zip) from the SDTM Mapping Trainer, cut to what narratives need. */
export function readSdtmHandoff(bytes: Uint8Array, study: string): Sdtm {
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) throw new Error('Choose the hand-off zip exported from the SDTM Mapping Trainer.')
  const files = unzipSync(bytes), mf = files['handoff.json']
  if (!mf) throw new Error('This zip has no handoff.json: export the hand-off from the SDTM Mapping Trainer.')
  const m = JSON.parse(strFromU8(mf))
  if (m.format !== 'sdtm-trainer-handoff') throw new Error('handoff.json is not an SDTM Mapping Trainer hand-off.')
  if (m.study?.id !== study) throw new Error(`That hand-off is for ${m.study?.id}; this report is for ${study}.`)
  const domains: Record<string, Table> = {}
  for (const d of m.datasets as { name: string; files: { json: string } }[]) {
    const cols = KEEP[d.name], f = files[d.files.json]; if (!cols || !f) continue
    const j = JSON.parse(strFromU8(f)) as { columns: { name: string }[]; rows: unknown[][] }
    const names = j.columns.map((c) => c.name), idx = cols.map((c) => names.indexOf(c))
    domains[d.name] = { columns: cols.filter((_, i) => idx[i] >= 0), rows: j.rows.map((r) => idx.filter((i) => i >= 0).map((i) => (r[i] ?? null) as string | number | null)) }
  }
  if (!domains.AE || !domains.DM) throw new Error('The hand-off has no DM or AE dataset.')
  return { format: 'csr-studio/sdtm', schema: 1, study, source: `Your SDTM hand-off: ${m.producer?.project ?? 'SDTM Mapping Trainer'}${m.study?.transfer ? ` (${m.study.transfer.label})` : ''}`, domains }
}
