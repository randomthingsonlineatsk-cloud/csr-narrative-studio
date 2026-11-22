# CSR & Narrative Studio

Practise writing a clinical study report the way medical writers do: section by section to
ICH E3, from the study's tables, listings and figures, with every number in the text tied back
to its cell.

**Live:** https://randomthingsonlineatsk-cloud.github.io/csr-narrative-studio/

Training only. Every study, product, sponsor and participant is fictional. Not a validated system.

## What it does

1. **Two worked studies** with real outputs: GLV-12-301 (type 2 diabetes, HbA1c; 81 randomised)
   and HRP-301 (VERDANT-1, chronic hand eczema; training cut: 48 screened, 45 randomised). The tables,
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
8. **Learn:** nine lessons with eight-question quizzes (the E3 structure, writing results from
   tables, estimands in reporting, the safety sections, patient narratives, methods and the
   discussion, review and India, disclosure and anonymisation, the CSR in the CTD).
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

### Methods, review and India (Phase 3)

16. **Methods from the protocol**: sections 7 to 9 drafted from the Protocol Builder's protocol
    in the past tense, with the protocol's own words beside them and a tense check (future and
    present tense of a procedure). Section 9.8 lists every amendment from the version history,
    and every difference between the planned analyses and the outputs (a dictionary changed, an
    analysis not run, a mislabelled table), each needing its reason in the same sentence.
17. **Discussion and benefit–risk** (E3 13): a benefit–risk table built from the outputs (each
    comparison shown or not, against superiority or a non-inferiority margin; serious adverse
    events and events more common on treatment), and checks on 11.4.7, 12.6 and 13 for claims the
    results do not support: "safe", "well tolerated", efficacy after a failed primary comparison,
    a "trend", superiority or "comparable" efficacy from a non-inferiority study.
18. **Review cycle**: comments by section with quotes, replies and a resolution (changed, no
    change with a reason, withdrawn); open comments stop the report going final. A version is kept
    at every stage change, with word-level tracked changes between any version and now. The
    coordinating investigator signs (E3 16.1.5) before approval.
19. **Kinds of report**: full, abbreviated (efficacy shortened, safety complete) and synopsis.
    HRP-205 (VERDANT-AC), a fictional non-inferiority study stopped early (36 of 240), is the
    abbreviated-report case.
20. **India (NDCT Rules 2019, Third Schedule, Table 6)**: the 16 headings mapped to E3, the
    India-only items (GCP compliance statement, ethics committee of each Indian site with its
    constitution and approval date, the GCP/ICMR declaration, start and end of accrual, the
    participants at Indian sites, 13.1 all SAEs, 13.2 unexpected adverse events against the
    reference safety information, appendices (a) to (l) with the investigator's certificate), and
    an export in Table 6 order with numbered pages.
21. **Missions** CS9 (methods from the protocol), CS10 (discussion and benefit–risk for the HRP-301
    training cut), CS11 (abbreviated report for HRP-205), CS13 (take the complete GLV-12-301
    report through review to approval) and CS14 (the India Table 6 version); two more lessons.

### Disclosure, hand-offs, certificate and classroom (Phase 4)

22. **Disclosure** for the EU CTR (CTIS; revised transparency rules since 18 June 2024), EMA Policy
    0070 (external guidance version 1.5, May 2025) and Health Canada's Public Release of Clinical
    Information: rules for each identifier (participant IDs replaced, dates shifted by one secret
    offset, names and site numbers removed, ages banded or removed, race removed), the
    quasi-identifiers the public version keeps, and the re-identification risk measured on the
    study's own participants (1 ÷ the smallest group, against 0.09: groups of at least 11). The
    narratives are rewritten to publish no more than the risk assessment allowed. Commercially
    confidential information is proposed passage by passage and checked against each route (Health
    Canada's two categories; results, design and safety never). Outputs: the redacted report, a
    redaction log (CSV) and an anonymisation report, as one `csr-studio/disclosure` zip.
23. **Hand-offs**: the report for Module 5.3.5.1 of the eCTD Dossier Builder (`csr-studio/ectd-5-3-5`:
    seven documents split as eCTD granularity expects, each with its study tagging file tag: synopsis
    (E3 2), the report body (E3 1, 3 to 13, 15), section 14's tables, 16.1.1 protocol and amendments,
    16.1.5 signatures, 16.1.9 statistical methods and 16.2.7 adverse event listings; the same files
    as HTML in an eCTD file set zip), lay results for the Plain Language Lab
    (`csr-studio/lay-results`: the report's own results in the ARS shape the Lab reads), and a hand-off
    for the Ostrevia journey on the pharmolecule hub (`csr-studio-handoff`).
24. **Missions** CS12 (redact the approved GLV-12-301 report for public release, core) and CS15 (the
    capstone: the whole VERDANT-1 report from your own analysis package and SDTM, approved and handed
    on). Pass at 80, expert at 100.
25. **Certificate** (verification code CS-, checked in the Regulatory Skills Passport): the six core
    missions (CS1, CS2, CS4, CS5, CS6, CS12) and all nine Learn quizzes passed; with distinction for
    every mission passed and three at expert level.
26. **Classroom** on the shared classroom server (routes `/cs/v1`, `cs_` tables): classes, assignments,
    submissions re-scored in the instructor's browser, comments and a leaderboard. Two more lessons:
    disclosure and anonymisation; the CSR in the CTD (Module 5, ISS and ISE).
27. **Timed drills** on the Learn page, from the three studies' own tables: write one sentence from
    one table row (the checker marks every group's n and percentage), and spot the error (a wrong
    value, a percentage that does not follow from its n, or two groups' values swapped).
28. **Flow of participants (CONSORT style)** beside 10.1, drawn from Table 14.1.1, with checks that
    every box adds up, downloadable as SVG.
29. **Liver test screen** beside 12.4, from the LB domain: peak ALT, AST and bilirubin as multiples
    of the upper limit of normal by group (above 3, 5 and 10 × ULN), potential Hy's law cases
    (FDA's 2009 drug-induced liver injury criteria), and checks on what 12.4 must say. Total
    bilirubin comes from the source: the CDM Console's central laboratory transfer for HRP-301 and
    the SDTM Mapping Trainer's laboratory file for GLV-12-301 (LBTESTCD BILI), carried through
    the TLF Programming Lab. In HRP-301 the one participant with ALT above 3 × ULN (on placebo)
    had bilirubin below 2 × ULN: not a potential Hy's law case.
30. **Out-of-date marking**: each section remembers the outputs it was written against; when an
    output changes (a re-run, your own package), the section is marked out of date until you
    confirm it against the new version. A QC item stops the report going final while any is.
31. **Synopsis length**: E3's usual limit of three pages (about 1,500 words), shown in the synopsis
    and checked at QC.
32. **Content library** (structured content reuse): text written once, approved and reused word for
    word (the design, the population, the primary result). Blocks keep every version; only an
    approved version is inserted in Write; when a block is approved again, sections holding the
    older version are flagged (QC item) and can be updated in one step. The results posting's
    brief summary comes from a block too.
33. **Results posting** from the same outputs: the ClinicalTrials.gov results modules (participant
    flow, baseline, outcome measures, adverse events with all-cause mortality, serious events and
    other non-serious events above a threshold of no more than 5% in any arm, 42 CFR 11.48) and
    the EU summary of results in CTIS (Regulation 536/2014, Article 37(4), Annex IV), with the
    primary completion date and the end of the trial found in the data and both deadlines (one
    year). Downloads as JSON in the shape of the registry modules.
34. **Timeline**: plan the report around database lock, from the SAP and shells through the dry
    run, unblinding, topline, drafts, review and QC to the approved report, then the registry
    deadlines; windows from common industry practice, deadlines from regulation.
35. **Missions CS16 to CS18**: review an AI-drafted results text (simulated, no AI runs: eight
    planted errors of the kinds drafting tools make, and every sentence ticked as checked against
    its source); post the VERDANT-1 results; plan the VERDANT-1 report around lock.
36. **Trace a number**: in Write, click any checked number to follow it back: the table cell, the
    analysis result (CDISC ARS: analysis set, grouping, method, the raw value and its rounding),
    ADSL (the participants recounted here), SDTM (adverse events recounted from AE) and the eCRF
    form it was entered on.
37. **Addenda**: an approved report is corrected by an erratum (each change quoted from the
    approved text, was and now) or extended by an addendum with additional data, with the impact
    on the conclusions and on other documents, signed, and downloadable for eCTD 5.3.5.1. Mission
    CS19: correct the approved GLV-12-301 report by addendum.
38. **An oncology study, ONK-44-302 (MERIDIAN-2)**: ONK-44 against docetaxel in previously treated
    advanced non-small cell lung cancer. The chain is the same as for the other studies: the SDTM
    Mapping Trainer maps the RECIST 1.1 source data (DM, DS, TU, TR, RS, PR, DD), and the TLF
    Programming Lab's R programs derive ADSL, ADTTE and ADRS and the outputs: disposition at the
    data cut-off, demographics, progression-free survival by independent review (primary) and by
    the investigator (Kaplan-Meier medians with Brookmeyer-Crowley CIs, Cox hazard ratio, log-rank
    test), best overall response with Clopper-Pearson CIs, immature overall survival and exposure.
    `scripts/make-onk-44-302.mjs` is an independent JavaScript derivation of the same analyses
    (its survival statistics cross-checked against a survival library); the TLF Lab's tests
    compare every cell with it. Tracing an oncology number reaches the source: participants are
    recounted from RS, DM and DS, and the investigator's response form, the independent review's
    vendor file or the death form is shown as collected. The training data hold no adverse events,
    so safety sections other than exposure have no outputs. Mission CS20: report the oncology
    efficacy results (primary first, medians in months, the testing order, overall survival as
    immature).
39. **Practice: pool two studies (ISS)** on the Learn page: HRP-301 (placebo) and HRP-205
    (clobetasol), both lumiravostat 25 mg. Choose the pools, keep the comparators apart, harmonise a
    liver term coded differently in each study, and work out the pooled counts (from each study's
    14.3.1); then the pooled table, downloadable as CSV.

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
