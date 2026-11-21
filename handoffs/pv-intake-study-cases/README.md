# PV Intake & Triage Console: study SAE cases page (ready to apply)

Status: written and tested against the Studio (tests/narrmissions.test.ts reads the same cases
from tests/fixtures/pv-hrp-301-cases.json); not yet applied, because the Macaly Cloud monthly
action limit was reached. A scheduled task applies and publishes it on 1 December 2026.

The PV Intake & Triage Console is a Macaly Cloud app (TanStack Start + Convex), chat ID
r6j9p36xbegaek4lcdp5268p. These files go into that app, not into this repo.

Adds a "Study cases" page that lists the four HRP-301 (VERDANT-1) serious adverse event cases,
shaped after ICH E2B(R3), and exports them as a `csr-studio/safety-cases` JSON file that the
CSR & Narrative Studio reads (Narratives and SAE reconciliation tabs). No Convex or database
changes.

Files:

1. `src/lib/trial-cases.ts` (new): the four cases, from the CDM Console's locked HRP-301 safety
   cases, with E2B(R3) element names and the case narrative (H.1).
2. `src/routes/trial-cases.tsx` (new): the page and the export button.
3. `src/metadata.json`: add after the `/dashboard` entry:

```json
  "/trial-cases": {
    "title": "Study SAE cases — PV Intake Console",
    "description": "The HRP-301 clinical trial serious adverse event cases, shaped after ICH E2B(R3), with an export for the CSR & Narrative Studio."
  }
```

4. `src/components/site-nav.tsx`: import `FlaskConical` from lucide-react, and add after the
   Dashboard link:

```tsx
          <Link
            to="/trial-cases"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-secondary hover:text-ink"
            activeProps={{ className: '!bg-secondary !text-ink' }}
          >
            <FlaskConical className="size-4" /> Study cases
          </Link>
```

## Steps

1. In the Macaly app, write `src/lib/trial-cases.ts` and `src/routes/trial-cases.tsx` from this
   folder, unchanged.
2. Edit `src/metadata.json` and `src/components/site-nav.tsx` as shown above.
3. Run `.sandbox/check-errors --strict` and fix anything it reports.
4. Open the preview at `/trial-cases`: four cases in the table, each with its narrative; the
   export button downloads `HRP-301-sae-cases-for-the-csr.json`.
5. Load that file in the CSR & Narrative Studio (an HRP-301 report, SAE reconciliation tab, "Use
   my CDM export or safety cases"): the four cases show as agreeing.
6. Publish the app, and add a Study cases line to the PV Intake Console's card on the hub.
