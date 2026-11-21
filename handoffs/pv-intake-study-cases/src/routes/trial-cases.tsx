import { createFileRoute } from '@tanstack/react-router'
import { SiteNav, FictionalBanner } from '@/components/site-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import { TRIAL_CASES_FILE } from '@/lib/trial-cases'
import siteMetadata from '@/metadata.json'

const meta = siteMetadata['/trial-cases']

export const Route = createFileRoute('/trial-cases')({
  head: () => ({ meta: [{ title: meta.title }, { name: 'description', content: meta.description }] }),
  component: TrialCasesPage,
})

const lc = (s: string) => s.toLowerCase()

function download() {
  const blob = new Blob([JSON.stringify(TRIAL_CASES_FILE, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'HRP-301-sae-cases-for-the-csr.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function TrialCasesPage() {
  const f = TRIAL_CASES_FILE
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <FictionalBanner />
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Study SAE cases: HRP-301 (VERDANT-1)</CardTitle>
            <CardDescription>
              Serious adverse events from a clinical trial reach the safety database as cases (report type 2, report from study). The medical writer checks each
              CSR narrative against its case: onset, seriousness, outcome, the investigator’s and the sponsor’s causality, and the action taken with study drug.
              This export carries the four HRP-301 cases, shaped after ICH E2B(R3), for the CSR &amp; Narrative Studio (Narratives and SAE reconciliation).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={download} className="gap-2"><FileDown className="size-4" /> Export the cases for the CSR (.json)</Button>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 font-medium">Case</th>
                    <th className="px-3 py-2 font-medium">Participant</th>
                    <th className="px-3 py-2 font-medium">Event (as reported)</th>
                    <th className="px-3 py-2 font-medium">Onset</th>
                    <th className="px-3 py-2 font-medium">Outcome</th>
                    <th className="px-3 py-2 font-medium">Investigator</th>
                    <th className="px-3 py-2 font-medium">Sponsor</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {f.cases.map((c) => (
                    <tr key={c.caseId} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-mono text-xs">{c.caseId}</td>
                      <td className="px-3 py-2 font-mono text-xs">{c.usubjid}</td>
                      <td className="px-3 py-2">{c.term}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{c.onset} (Day {c.e2b['study day of onset']})</td>
                      <td className="px-3 py-2">{lc(c.outcome)}</td>
                      <td className="px-3 py-2">{lc(c.causality)}</td>
                      <td className="px-3 py-2">{lc(c.sponsorCausality)}</td>
                      <td className="px-3 py-2">{lc(c.action)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {f.cases.map((c) => (
              <details key={c.caseId} className="rounded-md border border-border p-3 text-sm">
                <summary className="cursor-pointer font-medium text-ink">{c.caseId}: case narrative (H.1) and E2B(R3) elements</summary>
                <p className="mt-2 whitespace-pre-wrap text-ink">{c.e2b['H.1 case narrative']}</p>
                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-[16rem_1fr]">
                  {Object.entries(c.e2b).filter(([k]) => k !== 'H.1 case narrative').map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-ink-soft">{k}</dt>
                      <dd className="text-ink">{Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : `${x.source}: ${lc(x.result)}`)).join('; ') : String(v ?? '')}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
            <p className="text-xs text-ink-soft">
              Case HRP-2026-00900 was entered at database lock: the wrist fracture was never reported to safety during the study and was found by SAE
              reconciliation in the CDM Query &amp; Edit-Check Console. Training data; not a real safety database.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
