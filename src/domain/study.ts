// The two worked studies: their outputs (from the TLF Programming Lab's reference programs) and
// their protocols (from the Protocol Builder), bundled so the app works with no other app open.
import glv from '../data/glv-12-301.json'
import hrp from '../data/hrp-301.json'
import h205 from '../data/hrp-205.json'
import pH205 from '../data/protocol-hrp-205.json'
import pGlv from '../data/protocol-glv-12-301.json'
import pHrp from '../data/protocol-hrp-301.json'
import onk from '../data/onk-44-302.json'
import pOnk from '../data/protocol-onk-44-302.json'
import type { Output, StudyOutputs } from './types'

export interface Protocol {
  title: { full: string; short: string; acronym: string; protocolId: string; phase: string; sponsor: string; product: string; registry?: Record<string, string> }
  objectives: { id: string; level: string; kind: string; text: string; endpointIds: string[] }[]
  endpoints: { id: string; level: string; text: string; purpose: string }[]
  estimands: { id: string; objectiveId: string; endpointId: string; population: string; analysisSetId: string; treatment: string; intercurrentEvents: { name: string; strategy: string; description: string }[]; summary: string; estimator: string; missing: string; sensitivity: string }[]
  multiplicity: string
  analysisSets: { id: string; name: string; text: string }[]
}
export const STUDY_IDS = ['HRP-301', 'GLV-12-301', 'HRP-205', 'ONK-44-302'] as const
export const BUNDLED: Record<string, StudyOutputs> = { 'GLV-12-301': glv as unknown as StudyOutputs, 'HRP-301': hrp as unknown as StudyOutputs, 'HRP-205': h205 as unknown as StudyOutputs, 'ONK-44-302': onk as unknown as StudyOutputs }
const PROTO: Record<string, unknown> = { 'GLV-12-301': pGlv, 'HRP-301': pHrp, 'HRP-205': pH205, 'ONK-44-302': pOnk }

/** The protocol model of the latest version, with the title facts in one place. */
export function protocolOf(study: string): Protocol {
  const f = PROTO[study] as { project: { versions: { data: Record<string, unknown> }[] } }
  const d = f.project.versions.at(-1)!.data as Record<string, any>
  const t = (d.title ?? {}) as Record<string, string>
  const registry = Object.fromEntries(Object.entries(t).filter(([k]) => /NCT|EU CT|CTRI|IND|Number$/.test(k) && !/Version/.test(k)))
  return {
    title: { full: t['Full Title'] ?? '', short: t['Short Title'] ?? '', acronym: t['Trial Acronym'] ?? '', protocolId: t['Sponsor Protocol Identifier'] ?? study, phase: t['Trial Phase'] ?? 'Phase 3', sponsor: t['Sponsor Name and Address'] ?? '', product: t['Investigational Product Name(s)'] ?? '', registry },
    objectives: d.objectives ?? [], endpoints: d.endpoints ?? [], estimands: d.estimands ?? [], multiplicity: d.multiplicity ?? '', analysisSets: d.analysisSets ?? [],
  }
}
export const outputsOf = (data: StudyOutputs) => data.outputs.filter((o) => o.kind !== 'dataset')
export const outputById = (data: StudyOutputs, id: string): Output | undefined => data.outputs.find((o) => o.id === id)
