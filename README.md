# CSR & Narrative Studio

Practise writing a clinical study report the way medical writers do: section by section to
ICH E3, from the study's tables, listings and figures, with every number in the text tied back
to its cell.

**Live:** https://randomthingsonlineatsk-cloud.github.io/csr-narrative-studio/

Training only. Every study, product, sponsor and participant is fictional. Not a validated system.

## What it does

1. **Two worked studies** with real outputs: GLV-12-301 (type 2 diabetes, HbA1c; 81 randomised)
   and HRP-301 (VERDANT-1, chronic hand eczema; 48-participant training cut). The tables,
   listings and figures come from the TLF Programming Lab's reference programs, and the
   objectives, endpoints and estimands from the Protocol Builder.
2. **Report shell.** The ICH E3 structure for a full report, an abbreviated report or a synopsis.
   Attach the outputs that feed each section, request outputs programming has not delivered yet
   by their conventional numbers, and mark sections not applicable with a reason (E3 Q&A (R1)).
3. **Writer.** One section at a time, with E3 guidance, the attached outputs one click away, a
   results helper that writes a sentence skeleton for any table row, and in-text tables placed
   with a `{{T4}}` line.
4. **Text-versus-table checker.** Every number in the text is tied to a display cell: by an
   explicit reference (`[T14.2.1]` or "Table 14.2.1"), the tables attached to the section, the
   group named nearby and the words around it. It reports matches, rounding and lost decimals,
   wrong values, values from the wrong group, percentages that do not follow from n/N,
   estimates outside their own confidence interval, p=0.000, and direction words that contradict
   the sign.
5. **Stages and QC.** Shell → draft → review → final → approved, each behind a gate. A QC
   checklist (numbers, rounding, synopsis against body, abbreviations, references measured by
   the app; the rest ticked by the reviewer), an author signature, and an approver who must be
   someone else. A final report is locked; reopening it makes a new version. QC record as CSV.
6. **Your own outputs.** Bring in the analysis package (.zip) or reporting event (.json) you
   exported from the TLF Programming Lab: the tables keep their layout and every cell is redrawn
   from your results, matched by the analysis keys each cell carries.
7. **Export** the report as Word (.docx) or HTML with E3 numbering, a table of contents, in-text
   tables and anything still to be written highlighted; or as a project file to move or share.
8. **Learn:** five lessons with eight-question quizzes (the E3 structure, writing results from
   tables, estimands in reporting, the safety sections, patient narratives).
9. **Missions** (scored by rules):
   - CS1 Build the report shell for VERDANT-1 (attach, request, not applicable);
   - CS2 Text-versus-table QC: find and fix 25 planted errors;
   - CS3 Write the study patients sections (10.1, 11.2);
   - CS4 Report the efficacy results in the SAP's order (primary, sensitivity, supplementary;
     fixed testing sequence; no subgroup claims; a table title that mislabels the MMRM);
   - CS5 Write the safety overview (exposure, TEAEs, the most common events, the SAE, neutral
     wording).

### Narratives (Phase 2)

10. **Who needs a narrative** (ICH E3 12.3.2 and 12.3.1.3): deaths, serious adverse events,
    discontinuations because of an adverse event, and events of special interest set per study
    (liver test rise: ALT or AST at least 3 × ULN). GLV-12-301 needs ten, HRP-301 five.
11. **Patient profile and timeline** from the SDTM domains (DM, AE, CM, EX, LB, MH, DS, VS):
    dosing with interruptions, events, medications and out-of-range laboratory values in study days.
12. **Fixed templates** for each kind of narrative, and a **narrative generator** that fills
    what the data hold. Dechallenge and rechallenge are worked out from the dosing and event
    dates and offered as statements to confirm; the sponsor's causality comes from the safety case.
13. **Narrative QC**: ages, sex, group, study days, doses, laboratory values, medications, the
    coded term, severity, seriousness, action taken, dechallenge, rechallenge, outcome and both
    causality opinions are checked against the participant's data and the safety case; missing
    facts, contradictions in the data themselves (raised as data queries), and privacy (no names,
    initials or dates of birth). Coverage feeds the QC checklist; narratives export with 12.3.2.
14. **SAE reconciliation**: each SAE in the clinical database against its case in the safety
    database, with the data-management status, and important protocol deviations for 10.2. Bring
    in your own SDTM hand-off from the SDTM Mapping Trainer, the CDM Console's export for the CSR, or
    a safety cases file (`csr-studio/safety-cases`, E2B(R3)-shaped, as the Pharmacovigilance
    Detective's Study SAEs tab and the PV Intake & Triage Console export for HRP-301).
15. **Missions** CS6 (the four VERDANT-1 SAE narratives, from the profile; HRP-301 records bottles
    dispensed, so interruptions come from the AE form without days), CS7 (ten GLV-12-301 narratives within 60 minutes) and CS8 (QC a
    colleague's narratives: twelve planted contradictions); a fifth lesson on narratives.

Later phases add the synopsis and section 9 from the protocol, the review cycle, the EU and India
specifics, redaction and anonymisation for public disclosure, and the classroom.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # checker, imports, missions and workflow tests
npm run build    # static site in dist/
```

React, TypeScript and Vite; IndexedDB in the browser; the `docx` library for Word export and
`fflate` to read TLF Lab packages. No server and no AI service.

## Data

`src/data/glv-12-301.json` and `src/data/hrp-301.json` are written by
`tests/csrstudio.test.mjs` in the TLF Programming Lab (webR runs the reference R programs);
`src/data/protocol-*.json` by `tests/shared.test.ts` in the Protocol Builder;
`src/data/sdtm-*.json` (patient-level SDTM for the narratives) by the same TLF Lab test, from the
SDTM Mapping Trainer hand-offs; `src/data/cdm-hrp-301.json` by `tests/csrexport.test.ts` in the
CDM Query & Edit-Check Console (a locked HRP-301: deviations, safety cases and SAE
reconciliation). `src/data/cases-glv-12-301.json` is the fictional safety database for
GLV-12-301, written for this app. Each display cell
carries the keys of its analysis result (analysis, group, category), which is what lets a
learner's own results redraw the same table.

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Built by Khan Gulrez Shagufa Fazal Ahmed.
