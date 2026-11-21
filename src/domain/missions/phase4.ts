// Phase 4 missions. CS12: redact the approved GLV-12-301 report for public release (EU CTR,
// EMA Policy 0070, Health Canada): every direct identifier handled, risk at or below 0.09, CCI
// proposals each route would accept, the anonymisation report complete. CS15, the capstone: the
// whole HRP-301 report from the learner's own analysis package and SDTM, approved, and handed to
// the eCTD Dossier Builder and the Plain Language Lab.
import { completeProject, defaultSlots, newProject, PLACEHOLDER } from '../project'
import { BUNDLED } from '../study'
import { CCI_CANDIDATES, disclosureItems } from '../disclosure'
import { candidates, draft } from '../narratives'
import { AUTHOR, APPROVER, findingsOf, needsText, sectionsOf } from '../workflow'
import { errors } from '../checker'
import { changeFindings, DRAFTABLE, tenseFindings } from '../methods'
import { benefitRisk, discussionItems } from '../discussion'
import { CI, openComments, snapshot } from '../review'
import { dataOf } from '../project'
import type { PatientData } from './narr'
import type { Project } from '../types'

export interface Item { label: string; ok: boolean; why: string }

export function startCs12(d?: PatientData): Project {
  const p = completeProject('Mission CS12: Redact the CSR for public release'); p.kind = 'mission'
  const c = CCI_CANDIDATES['GLV-12-301']
  p.sections['9.5.1'].text += ` ${c.find((x) => x.id === 'dkd')!.quote}`
  p.sections['9.5.4'].na = undefined; p.sections['9.5.4'].text = c.find((x) => x.id === 'assay')!.quote
  if (d) p.narratives = Object.fromEntries(candidates(d.sdtm).map((x) => [x.key, { text: draft(d.sdtm, x, d.safety.cases.find((s) => s.usubjid === x.usubjid)), queries: [], updatedUtc: p.createdUtc }]))
  // The report is approved and signed; public release starts from the final version.
  const t = p.createdUtc
  p.signatures.push({ name: 'M. Writer', role: 'Medical writer', meaning: AUTHOR, utc: t, version: 1 }, { name: 'C. Lead', role: 'Clinical lead', meaning: APPROVER, utc: t, version: 1 }, { name: 'Dr H. Vos', role: 'Coordinating investigator', meaning: CI, utc: t, version: 1 })
  p.stage = 'approved'; snapshot(p, 'Approved: the version for public release')
  return p
}

export function startCs15(): Project {
  const p = newProject('Mission CS15: Capstone, the VERDANT-1 report from your own data', 'HRP-301', 'full', 'mission')
  const slots = defaultSlots(BUNDLED['HRP-301']); for (const [s, st] of Object.entries(p.sections)) st.slots = slots[s] ?? []
  return p
}

function scoreCs15(p: Project): Item[] {
  const secs = sectionsOf(p), S = (s: string) => (p.sections[s]?.na ? '' : p.sections[s]?.text ?? '')
  const toWrite = secs.filter((s) => needsText(s) && !p.sections[s.id].na && (!p.sections[s.id].text.trim() || PLACEHOLDER.test(p.sections[s.id].text))).map((s) => s.id)
  const errs = errors(findingsOf(p)), tense = DRAFTABLE.filter((id) => p.sections[id] && !p.sections[id].na && (tenseFindings(S(id)).length || !S(id).trim() || PLACEHOLDER.test(S(id))))
  const changes = changeFindings(p.study, S('9.8')).filter((c) => !c.ok), disc = discussionItems(S('13'), benefitRisk(dataOf(p))).filter((i) => !i.ok)
  const sig = (m: string) => p.signatures.some((s) => s.version === p.version && s.meaning === m)
  const handed = (k: 'ectd' | 'lay') => { const h = p.handoffs?.[k]; return !!h && h.version === p.version && h.stage === 'approved' }
  const cov = p.coverage
  return [
    { label: 'Your own analysis package', ok: !!p.outputs && p.outputsFrom?.kind === 'package', why: 'On the Export page, open the analysis package (.zip) you built in the TLF Programming Lab.' },
    { label: 'Your own SDTM data', ok: !!p.sdtm, why: 'On the SAE reconciliation page, open the SDTM hand-off from the SDTM Mapping Trainer, so the narratives come from your mapped data.' },
    { label: 'Every section written', ok: !toWrite.length, why: toWrite.length ? `Still to write: ${toWrite.slice(0, 8).join(', ')}${toWrite.length > 8 ? '…' : ''}.` : 'All written.' },
    { label: 'Every number ties to the tables', ok: !errs.length && !toWrite.length, why: errs.length ? `${errs.length} checker error(s), first in ${errs[0].section}.` : toWrite.length ? 'Checked once every section is written.' : 'No errors.' },
    { label: 'Methods in the past tense', ok: !tense.length, why: tense.length ? `Not yet written in the past tense: ${tense.slice(0, 8).join(', ')}${tense.length > 8 ? '…' : ''}.` : 'Past tense throughout.' },
    { label: '9.8 complete, every change with its reason', ok: !!S('9.8').trim() && !changes.length && !PLACEHOLDER.test(S('9.8')), why: changes.length ? changes.map((c) => c.label).join('; ') : 'Complete.' },
    { label: 'The discussion matches the results', ok: !disc.length, why: disc.map((i) => i.label).join('; ') || 'All six discussion checks pass.' },
    { label: 'Narratives written and passing QC', ok: !!cov && cov.needed > 0 && cov.clean === cov.needed, why: cov ? `${cov.clean} of ${cov.needed} pass QC.` : 'Open the Narratives page to measure the coverage.' },
    { label: 'Review comments resolved', ok: !openComments(p).length, why: `${openComments(p).length} open.` },
    { label: 'Approved, with the three signatures', ok: p.stage === 'approved' && sig(AUTHOR) && sig(APPROVER) && sig(CI), why: `The report is ${p.stage}.` },
    { label: 'Handed to the eCTD Dossier Builder', ok: handed('ectd'), why: 'After approval, on the Export page, download “Report for the eCTD (Module 5.3.5.1)”.' },
    { label: 'Handed to the Plain Language Lab', ok: handed('lay'), why: 'After approval, on the Export page, download “Lay results for the Plain Language Lab”.' },
  ]
}

export function startPhase4(id: string, d?: PatientData): Project | null {
  return id === 'CS12' ? startCs12(d) : id === 'CS15' ? startCs15() : null
}
export function scorePhase4(p: Project, d?: PatientData | null): Item[] | null {
  const id = p.mission!.id
  if (id === 'CS12') return d ? disclosureItems(p, d).map((i) => ({ label: i.label, ok: i.ok, why: i.why })) : [{ label: 'Patient data', ok: false, why: 'The patient data are still loading.' }]
  if (id === 'CS15') return scoreCs15(p)
  return null
}
