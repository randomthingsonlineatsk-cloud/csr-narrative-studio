// The data model. Every saved object carries userId and classId for the shared classroom server.
import type { ReportType } from './e3'

export interface Frame { columns: string[]; rows: (string | null)[][] }
export interface Cell { text: string; keys?: { an: string; g: string; cat: string | null }[] }
export interface Display { title: string; population: string; head: string[]; groups: string[]; rows: { label: string; indent?: number; cells: Cell[] }[]; footnotes: string[] }
export interface Output { id: string; title: string; kind: 'dataset' | 'ard' | 'listing' | 'figure'; area: string; ref: string; shell: string; frame: Frame; display: Display | null }
export interface StudyOutputs { format: 'csr-studio/study-outputs'; schema: 1; study: string; title: string; short: string; sap: string; groups: string[]; source: string; outputs: Output[]; reportingEvent?: unknown }

export type Stage = 'shell' | 'draft' | 'review' | 'final' | 'approved'
export const STAGES: Stage[] = ['shell', 'draft', 'review', 'final', 'approved']
export interface SectionState { text: string; na?: string; slots: string[]; /** Outputs the writer has asked programming for (not yet available). */ requests?: string[] }
export interface Rounding { pct: number; mean: number; p: number }
export interface Signature { name: string; role: string; meaning: string; utc: string; version: number }
export interface MissionRun { id: string; startedUtc: string; submittedUtc?: string; score?: number; detail?: { label: string; got: number; of: number }[]; answers: Record<string, string> }
export interface Project {
  id: string; name: string; userId: string; classId: string; kind: 'report' | 'mission'
  study: string; reportType: ReportType; stage: Stage
  sections: Record<string, SectionState>
  rounding: Rounding
  /** The learner's own outputs, imported from the TLF Lab; absent = the bundled reference outputs. */
  outputs?: StudyOutputs; outputsSource?: string
  qc: Record<string, boolean>
  signatures: Signature[]
  version: number
  mission?: MissionRun
  createdUtc: string; updatedUtc: string; schema: 1
}
export interface Progress { id: 'me'; userId: string; classId: string; name?: string; quizzes: Record<string, { score: number; of: number; utc: string }>; drills: Record<string, { score: number; utc: string }>; missions: Record<string, { score: number; utc: string }> }
