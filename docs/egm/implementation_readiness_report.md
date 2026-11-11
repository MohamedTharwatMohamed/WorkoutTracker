# Goldfish Review Report (Stage 9: Implementation Readiness, round 1)

**Target:** `docs/designs/workout_tracker.md` (lines 522-1103, "Detailed
Implementation Plan" to end)

**Reading list given to reviewers:** `docs/egm/concepts_brief.md`,
`docs/egm/catalog_proposal.md` (linked from the design).

## Reviewer Status

| Reviewer | Standard | Status | Raw findings |
| --- | --- | --- | --- |
| `implementation_readiness` | implementation-readiness-standard | completed | 5 Blocker, 14 Major, 4 Nit |
| `codebase_details` | implementation-readiness-standard | completed | 1 Blocker, 17 Major, 7 Nit |
| `style` | persona only | completed | 10 Major, 7 Nit |

Reviewer verdicts: `implementation_readiness` and `codebase_details` both
say "not ready".

After deduplication: **5 Blockers, 25 Majors, 10 Nits** (40 items). Source IDs
are `<reviewer>-<n>` using each reviewer's own numbering (IR, CD, ST).

## Prioritized Findings (Blockers -> Major -> Nits)

### B1. No phases or checkpoints - Severity: Blocker
* **Reviewer Lens:** `implementation_readiness` (IR-1), `codebase_details` (CD-1)
* **Affected Scope:** Lines 522-1066
* **Discrepancy Description**: 54 items grouped by area, with no build order
  and no buildable, testable checkpoints.
* **Rationale & Recommendation**: The standard requires incremental phases.
  Add ordered phases, each with its items and an exit command.

### B2. Replace-all import leaves journal, meta, marker and deviceId undefined - Severity: Blocker
* **Reviewer Lens:** IR-2, CD-9 (and CD-8)
* **Affected Scope:** Lines 822-823, 877-881, 1009-1010
* **Discrepancy Description**: "Clear and write every table" does not say what
  happens to `journal`, `errors`, `meta`, `photos`, the localStorage marker or
  the local `deviceId`. A kept journal makes the consistency check report every
  pre-import set as missing; an old marker fires the "data cleared" screen; the
  imported profile overwrites the PC's `deviceId`.
* **Rationale & Recommendation**: State the behaviour per table and test it.

### B3. Measurement value field conflicts with the data model - Severity: Blocker
* **Reviewer Lens:** IR-3, CD-11
* **Affected Scope:** Lines 753-759, 817 (and data model line 263)
* **Discrepancy Description**: `types.ts` says `valueCm`/`weightKg`; the data
  model has one `value`. Site and side literals are not listed, and whether
  thigh and calf have sides is unclear.
* **Rationale & Recommendation**: Give the exact interface and site list.

### B4. Record types and function signatures are only partly specified - Severity: Blocker
* **Reviewer Lens:** IR-4, CD-11, CD-23
* **Affected Scope:** Lines 753-770, 794-823, 832-846
* **Discrepancy Description**: The data model lists "key fields" only.
  `BaseRecord` conflicts with tables keyed by `key`, `seq` or `machineId`.
  Repository and domain functions are named without parameter or return types
  (`lastForMachine`, `series`, `addItem`, `transition`, `prefill` inputs).
* **Rationale & Recommendation**: Give full interfaces, `stores()` strings and
  signatures.

### B5. The backup checksum's "canonical JSON" is undefined - Severity: Blocker
* **Reviewer Lens:** IR-5, CD-10
* **Affected Scope:** Lines 865-875
* **Discrepancy Description**: Key order, whitespace, number format, photo
  coverage and the Blob/base64 conversion owner are unstated.
* **Rationale & Recommendation**: Define the algorithm; add a golden-file test.

### M1. Globs instead of exact paths; required files missing - Severity: Major
* **Reviewer Lens:** IR-6, CD-2, CD-3
* **Affected Scope:** Lines 532-575, 794, 940, 960, 996, 1005, 1013, 1027
* **Discrepancy Description**: Items 28, 45-52 use globs; test and fixture
  names are not given; `NumberKeypad.tsx` is hidden inside another entry;
  `src/vite-env.d.ts` is missing; tsconfig options are not given.
* **Rationale & Recommendation**: List every path and the tsconfig settings.

### M2. Dependencies incomplete and major versions not pinned - Severity: Major
* **Reviewer Lens:** IR-19, CD-3
* **Affected Scope:** Lines 534-544
* **Discrepancy Description**: Missing `@types/react`, `@types/react-dom`,
  `@types/node`, `workbox-window`, `@testing-library/dom`, `@eslint/js`,
  `globals`. Only Dexie and React have major versions.
* **Rationale & Recommendation**: Pin majors and list every package.

### M3. CI runs e2e before build; Playwright web server undefined - Severity: Major
* **Reviewer Lens:** IR-7, CD-4
* **Affected Scope:** Lines 584-589, 1050-1052

### M4. PR preview close job, triggers and smoke condition missing; $0 budget - Severity: Major
* **Reviewer Lens:** CD-5, IR-22, ST-12
* **Affected Scope:** Lines 1046-1058, 1068

### M5. `check-catalog` "previous commit" fails in CI - Severity: Major
* **Reviewer Lens:** IR-15, CD-6
* **Affected Scope:** Lines 699-706

### M6. Database version detection unspecified; Dexie version x10 - Severity: Major
* **Reviewer Lens:** IR-9, CD-7
* **Affected Scope:** Lines 772-782

### M7. Cleared-data marker lifecycle and CUJ 7 "Used this app before?" missing - Severity: Major
* **Reviewer Lens:** IR-10, CD-8, CD-15
* **Affected Scope:** Lines 777-781, 897-901, 960-987

### M8. Set save and session rest state not atomic; rest edge cases undefined - Severity: Major
* **Reviewer Lens:** IR-11, CD-13
* **Affected Scope:** Lines 805-815, 839-853
* **Discrepancy Description**: Who sets `restStartedAt`; is `restBeforeSec`
  capped; -15 s past now; undo during rest.

### M9. Journal has no event for undo (restore) - Severity: Major
* **Reviewer Lens:** IR-12, CD-25
* **Affected Scope:** Lines 813-815, 877-881

### M10. Backup result mapping and pre-import export failure undefined - Severity: Major
* **Reviewer Lens:** IR-13, CD-23
* **Affected Scope:** Lines 819-821, 903-908, 970-981

### M11. Catalog ID rule ambiguous; conflicts with line 270; field names differ - Severity: Major
* **Reviewer Lens:** IR-14, ST-2, CD-21
* **Affected Scope:** Lines 270, 664-688

### M12. Test plan misses CUJs, modules and rules; "covered by e2e" overstated - Severity: Major
* **Reviewer Lens:** IR-16, CD-17, ST-5
* **Affected Scope:** Lines 989-1042, 1086-1087

### M13. `update.spec.ts` mechanism undefined - Severity: Major
* **Reviewer Lens:** IR-8, CD-17
* **Affected Scope:** Lines 1038-1039

### M14. Coverage thresholds disagree; ESLint rule misses relative imports; lint command differs - Severity: Major
* **Reviewer Lens:** IR-17, CD-18, ST-6, ST-7, CD-24
* **Affected Scope:** Lines 541-543, 572-582, 1082-1090

### M15. Journal, errors, usage and machine history reads have no owner; usage not in diagnostics - Severity: Major
* **Reviewer Lens:** IR-18, CD-16
* **Affected Scope:** Lines 794-823, 916-923, 966-981, 1097-1099

### M16. `changesSinceExport` scope and indexes unspecified - Severity: Major
* **Reviewer Lens:** CD-12
* **Affected Scope:** Lines 765, 820-821

### M17. "Export raw data" has no owner; snapshot store schema undefined - Severity: Major
* **Reviewer Lens:** CD-14
* **Affected Scope:** Lines 784-789, 981-982

### M18. Search-engine claim overstated; `Disallow: /` hides `noindex` - Severity: Major
* **Reviewer Lens:** ST-4
* **Affected Scope:** Lines 596-598, 630-634

### M19. Playwright emulation claims not calibrated - Severity: Major
* **Reviewer Lens:** ST-8
* **Affected Scope:** Lines 584-589, 1038-1039

### M20. JPEG fallback conflicts with WebP-only photo model - Severity: Major
* **Reviewer Lens:** ST-9, IR-4
* **Affected Scope:** Lines 925-931 (and data model `photos`)

### M21. First-run routing sentence ambiguous - Severity: Major
* **Reviewer Lens:** ST-10
* **Affected Scope:** Lines 718-726

### M22. Success metrics cannot measure the goal - Severity: Major
* **Reviewer Lens:** ST-11
* **Affected Scope:** Lines 1094-1099

### M23. Hammer Strength name check has no owner - Severity: Major
* **Reviewer Lens:** ST-3
* **Affected Scope:** Lines 685-688, 1068-1078

### M24. Item 54 describes the drafting step and makes a false git-history claim - Severity: Major
* **Reviewer Lens:** ST-1, IR-23, CD-19
* **Affected Scope:** Lines 1060-1066

### M25. CSP `style-src 'unsafe-inline'` contradicts the Hosting text - Severity: Major (raised as Nit by CD-20; kept at Nit below)
* Moved to N9.

### Nits
* **N1** (ST-13) Mixed "export"/"back up" wording.
* **N2** (ST-14) "Reorder" and "move up or down" both used; long line 966.
* **N3** (ST-15) "Profile default of 90 s" reads as fixed.
* **N4** (ST-16) Catalog caching description implies network-first.
* **N5** (ST-17) "Type / Scope" missing on items 29-44; "today" is time-relative.
* **N6** (IR-20, CD-24) Routes for `MachineFormScreen` and onboarding missing.
* **N7** (IR-21, CD-22) lb rounding and stepper step in lb undefined.
* **N8** (CD-22) Rest length precedence not ordered.
* **N9** (CD-20) CSP inline styles vs Hosting text.
* **N10** (CD-24) Script bodies for `dev`, `preview`, `test:coverage`,
  `catalog:check`, `images:prepare` missing.
