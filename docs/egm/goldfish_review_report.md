# Goldfish Annotated Review Report

**Target:** `docs/designs/workout_tracker.md` (`522-1103`, Stage 9 round 1)

**Status: resolved** (auto accept). 38 fixes applied, 2 declined (N1, N5),
0 contested. Line numbers below refer to the pre-fix document.

Source: [implementation_readiness_report.md](implementation_readiness_report.md).
No finding is contested or escalated: every Blocker and Major points at a real
gap a fresh implementer would hit. Paths below are relative to
`docs/designs/`.

## Prioritized Findings & AI Suggestions

### [B1] [`implementation_readiness`, `codebase_details`] - Severity: Blocker
*   **Affected Scope:** [Lines 522-1066](../designs/workout_tracker.md#L522-L1066) (Detailed Implementation Plan)
*   **Discrepancy Description:** 54 items grouped by area; no build order, no checkpoints.
*   **Rationale:** Implementation must be incremental with a test at each step.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The items exist; only order and exit checks are missing.
*   ***Proposed Edit:***
    *   Location: new "### Phases" subsection directly under line 522 heading.
    *   Change: Table of six phases, each listing its item numbers and an exit command:
        P1 Scaffold, lint, CI (items 1-9) - `npm run lint && npm run build`;
        P2 DB, domain, data + unit tests (17-28, 45-48) - `npm run test:coverage`;
        P3 Platform: backup, journal, diagnostics, SW (29-35, 49) - `npm run test`;
        P4 Components and screens (36-44, 50-51) - `npm run test && npm run build`;
        P5 E2E (52) - `npm run e2e`;
        P6 Catalog, images, deploy (10-16, 53) - `npm run catalog:check` and a green PR preview.
        Rule: a phase starts only when the previous exit command passes.

### [B2] [`implementation_readiness`, `codebase_details`] - Severity: Blocker
*   **Affected Scope:** [Lines 822-823](../designs/workout_tracker.md#L822-L823), [877-881](../designs/workout_tracker.md#L877-L881), [1009-1010](../designs/workout_tracker.md#L1009-L1010)
*   **Discrepancy Description:** Replace-all import does not define journal, errors, meta, photos, marker or deviceId handling.
*   **Rationale:** Undefined handling causes false consistency alarms and a false "data cleared" screen.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Each table needs one stated rule.
*   ***Proposed Edit:***
    *   Location: `replaceAll` bullet (line 822).
    *   Change: "In one transaction: clear and write every data table (profile minus `deviceId`, machines, machineSettings, routines, sessions, sets, measurements, photos). `journal` is cleared and re-seeded with one `set.created` row per imported live set. `errors` is kept. `meta` keeps `lastExportAt`/`lastExportResult` of this device and drops the rest. The local `deviceId` is kept. After commit, rewrite the cleared-data marker with the new counts." Add the same cases to `backup.test.ts` (line 1009).

### [B3] [`implementation_readiness`, `codebase_details`] - Severity: Blocker
*   **Affected Scope:** [Lines 753-759](../designs/workout_tracker.md#L753-L759), [817](../designs/workout_tracker.md#L817)
*   **Discrepancy Description:** `valueCm`/`weightKg` vs the data model's single `value`; sites and sides not listed.
*   **Rationale:** Implementers must not guess field names.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Brief KD 11 lists the sites; the data model already uses `value`.
*   ***Proposed Edit:***
    *   Location: `types.ts` item (line 759).
    *   Change: "`Measurement { id; date: string (YYYY-MM-DD); site: 'weight'|'waist'|'hips'|'chest'|'neck'|'arm'|'thigh'|'calf'; side?: 'left'|'right'; value: number }` - kg for weight, cm otherwise. `side` is required for arm, thigh, calf and absent otherwise."

### [B4] [`implementation_readiness`, `codebase_details`] - Severity: Blocker
*   **Affected Scope:** [Lines 753-770](../designs/workout_tracker.md#L753-L770), [794-823](../designs/workout_tracker.md#L794-L823), [832-846](../designs/workout_tracker.md#L832-L846)
*   **Discrepancy Description:** Key fields only; `BaseRecord` scope unclear; function signatures missing.
*   **Rationale:** Implementation-ready means types and signatures are given.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:***
    *   Location: `types.ts` and `schema.ts` items; each repository and domain item.
    *   Change: Full TS interface per table. `BaseRecord { id: string; createdAt: number; updatedAt: number; deletedAt?: number }` applies to machines, routines, sessions, sets, measurements, photos. `machineSettings` keyed by `machineId`; `meta` by `key`; `journal` and `errors` by auto-increment `seq`. `Photo` adds `mime: 'image/webp'|'image/jpeg'`. Exact `stores()` strings, e.g. `sets: 'id, sessionId, machineId, createdAt, updatedAt'`. Typed signatures, e.g. `lastForMachine(machineId: string): Promise<{ session: Session; sets: SetRecord[] } | undefined>`.

### [B5] [`implementation_readiness`, `codebase_details`] - Severity: Blocker
*   **Affected Scope:** [Lines 865-875](../designs/workout_tracker.md#L865-L875)
*   **Discrepancy Description:** "Canonical JSON" undefined.
*   **Rationale:** Two implementations would produce different checksums.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:***
    *   Location: checksum sentence in the backup item.
    *   Change: "Checksum = lowercase hex SHA-256 (`crypto.subtle`) of the UTF-8 bytes of `JSON.stringify` with keys sorted recursively and no whitespace, over the whole file except the `checksum` field. Photos are included as base64 strings; `backup.ts` converts Blob to base64 before hashing." Add `tests/fixtures/backup-golden.json` with a known checksum to `backup.test.ts`.

### [M1] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** Items 28, 45-52 (lines 794, 940-1027)
*   **Discrepancy Description:** Globs instead of paths; `NumberKeypad.tsx` and `src/vite-env.d.ts` missing.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Replace every glob with the full file list. Add `src/components/NumberKeypad.tsx` as its own item and `src/vite-env.d.ts` (references `vite/client`, `vite-plugin-pwa/react`; declares `__APP_BUILD__: string`, `__BUILD_TIME__: string`).

### [M2] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 534-544](../designs/workout_tracker.md#L534-L544)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Pin majors: Vite 6, Vitest 3, Tailwind 4 (`@tailwindcss/vite`), ESLint 9 flat config, Recharts 2, React Router 7, vite-plugin-pwa 1, Playwright 1. Add `@types/react`, `@types/react-dom`, `@types/node`, `workbox-window`, `@testing-library/dom`, `@eslint/js`, `globals`. tsconfig: `references` to app and node configs, `lib: ["ES2022","DOM","DOM.Iterable"]`, `moduleResolution: "bundler"`, `strict: true`, `types: ["vite/client"]`.

### [M3] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 584-589](../designs/workout_tracker.md#L584-L589), [1050-1052](../designs/workout_tracker.md#L1050-L1052)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** CI order: install, lint, unit tests, build, e2e. `playwright.config.ts` gets `webServer: { command: 'npm run build && npm run preview -- --port 4173', port: 4173, reuseExistingServer: !process.env.CI }`.

### [M4] [`codebase_details`, `implementation_readiness`, `style`] - Severity: Major
*   **Affected Scope:** [Lines 1046-1058](../designs/workout_tracker.md#L1046-L1058), [1068](../designs/workout_tracker.md#L1068)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** `on.pull_request.types: [opened, synchronize, reopened, closed]`. Deploy job `if: github.event.action != 'closed'`, `action: upload`. Close job `if: github.event.action == 'closed'`, `action: close`. Smoke test uses `steps.deploy.outputs.static_web_app_url`. Manual setup: "Set the smallest budget Azure accepts with an alert at 100%" (replaces $0; not verified).

### [M5] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 699-706](../designs/workout_tracker.md#L699-L706)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** CI checkout uses `fetch-depth: 0`; the script compares against `git show origin/${BASE_REF:-master}:src/catalog/catalog.json`. If that file does not exist, the ID check is skipped. `image: null` is allowed and fails no check.

### [M6] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 772-782](../designs/workout_tracker.md#L772-L782)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** "Before opening the schema, open with `new Dexie('workout')` (no version) to read `verno`; `NoSuchDatabaseError` means a new install, no snapshot. If `verno < SCHEMA_VERSION`, snapshot then upgrade. Note: IndexedDB's version is Dexie's ×10; always compare `db.verno`."

### [M7] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 777-781](../designs/workout_tracker.md#L777-L781), [897-901](../designs/workout_tracker.md#L897-L901), [960-987](../designs/workout_tracker.md#L960-L987)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Marker `{ deviceId, sets, sessions, measurements }` written at onboarding end, on every app launch after open succeeds, and after import. On launch: if the marker exists and the DB is empty, show the cleared-data screen. "Start fresh" deletes the marker then onboards. `WelcomeScreen` gets the CUJ 7 step "Used this app before?" -> Import backup.

### [M8] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 805-815](../designs/workout_tracker.md#L805-L815), [839-853](../designs/workout_tracker.md#L839-L853)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** `setRepository.add` writes the set, its journal row and the session update (`state: 'resting'`, `restStartedAt = now`, `restEndsAt = now + restSec`) in one transaction. `restBeforeSec` = seconds since the previous set's `createdAt` in this session, uncapped, absent for the first set. "−15 s" sets `restEndsAt = max(now, restEndsAt − 15 s)`. Undo of the last set during rest ends the rest (`state: 'active'`).

### [M9] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 813-815](../designs/workout_tracker.md#L813-L815), [877-881](../designs/workout_tracker.md#L877-L881)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Add journal event `set.restored`. The consistency check takes the last event per set ID: `created`/`restored` = must be live, `deleted` = must be deleted.

### [M10] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 819-821](../designs/workout_tracker.md#L819-L821), [903-908](../designs/workout_tracker.md#L903-L908), [970-981](../designs/workout_tracker.md#L970-L981)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Share sheet success -> `lastExportResult: 'completed'`; download -> `'started'`; `AbortError`/cancel -> no change. If the automatic pre-import export fails or is cancelled, the import stops and shows "Import cancelled - export first".

### [M11] [`implementation_readiness`, `style`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Line 270](../designs/workout_tracker.md#L270), [664-688](../designs/workout_tracker.md#L664-L688) (touches FeatureRange)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** One rule: `slug(brand)-slug(line)-slug(name)`, where slug = lowercase, drop bracketed model codes, replace "/" and spaces with "-", collapse repeats. Line 270 example becomes `technogym-selection-chest-press` (no model number). Data model gains `line`; rename `restSec` in catalog to `defaultRestSec` everywhere. If `catalog_proposal.md` lists IDs, align them.

### [M12] [`implementation_readiness`, `codebase_details`, `style`] - Severity: Major
*   **Affected Scope:** [Lines 989-1042](../designs/workout_tracker.md#L989-L1042), [1086-1087](../designs/workout_tracker.md#L1086-L1087)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Add e2e: `onboarding.spec.ts` (CUJ 1 incl. `persist()`), `restore.spec.ts` (CUJ 7), `cleared.spec.ts` (CUJ 8), import warning + automatic export in `backup.spec.ts`. Add unit cases: reminder threshold, 28-day usage, `isStale` via `createdAt`, hidden/retired filters, lb steps, ids, image path, routine/session/measurement/meta/photo repos, errorLog 500 cap, `versionchange`/`blocked`, check-catalog. Replace "covered by e2e" with the list of modules e2e covers.

### [M13] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 1038-1039](../designs/workout_tracker.md#L1038-L1039)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** "Build twice with different `APP_BUILD` into `dist-a` and `dist-b`; serve `dist-a`, load, swap the served folder to `dist-b` at the same origin, call `registration.update()`, assert the update banner, click it, assert the new build ID."

### [M14] [`implementation_readiness`, `codebase_details`, `style`] - Severity: Major
*   **Affected Scope:** [Lines 541-543](../designs/workout_tracker.md#L541-L543), [572-582](../designs/workout_tracker.md#L572-L582), [1082-1090](../designs/workout_tracker.md#L1082-L1090)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Item 4 gets the exact Vitest `coverage.thresholds`: `src/domain/**` and `src/data/**` lines 90 / branches 85; `src/db/**` lines 80. Same numbers in the Verification Plan. ESLint `no-restricted-imports` uses `patterns: ['**/db/*', '**/db']` to catch relative imports. Lint script is `eslint . && tsc -b --noEmit` everywhere.

### [M15] [`implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 794-823](../designs/workout_tracker.md#L794-L823), [916-923](../designs/workout_tracker.md#L916-L923), [966-981](../designs/workout_tracker.md#L966-L981), [1097-1099](../designs/workout_tracker.md#L1097-L1099)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Add `src/data/diagnosticsRepository.ts` (reads journal, errors, counts). Add `setRepository.listByMachine(machineId)` and `listSince(ts)`. `buildDiagnostics` includes `usageSummary` (28-day sessions, sets).

### [M16] [`codebase_details`] - Severity: Major
*   **Affected Scope:** [Line 765](../designs/workout_tracker.md#L765), [820-821](../designs/workout_tracker.md#L820-L821)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** `changesSinceExport` counts records with `updatedAt > lastExportAt` in sets, sessions, measurements, machines, photos (all indexed on `updatedAt`). The reminder shows "N sets not backed up" using the sets count only.

### [M17] [`codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 784-789](../designs/workout_tracker.md#L784-L789), [981-982](../designs/workout_tracker.md#L981-L982)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Snapshot DB `workout-snapshots`, store `snapshots: '++seq, createdAt'`, record `{ seq, createdAt, fromVersion, data: BackupFile }`, keep last 2. `snapshot.exportRaw()` downloads the latest snapshot as JSON; owner of "Export raw data".

### [M18] [`style`] - Severity: Major
*   **Affected Scope:** [Lines 596-598](../designs/workout_tracker.md#L596-L598), [630-634](../designs/workout_tracker.md#L630-L634)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Remove `Disallow: /` from `robots.txt`; keep `<meta name="robots" content="noindex">` and `X-Robots-Tag: noindex`. Wording: "asks search engines not to index the site" instead of "hidden from search engines".

### [M19] [`style`] - Severity: Major
*   **Affected Scope:** [Lines 584-589](../designs/workout_tracker.md#L584-L589), [1038-1039](../designs/workout_tracker.md#L1038-L1039)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** "Installed mode is simulated by stubbing `matchMedia('(display-mode: standalone)')` via `addInitScript`. Playwright WebKit is not iOS Safari; iOS install and storage behaviour is checked manually (Manual setup)."

### [M20] [`style`, `implementation_readiness`] - Severity: Major
*   **Affected Scope:** [Lines 925-931](../designs/workout_tracker.md#L925-L931)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** "Photos are encoded as WebP; if `canvas.toBlob` returns a non-WebP blob, JPEG is stored. Each photo stores its `mime`." Remove "older Safari".

### [M21] [`style`] - Severity: Major
*   **Affected Scope:** [Lines 718-726](../designs/workout_tracker.md#L718-L726)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Ordered rule: "On launch: 1) open fails -> error screen; 2) marker present and DB empty -> cleared-data screen; 3) no profile -> `/welcome`; 4) otherwise `/today`."

### [M22] [`style`] - Severity: Major
*   **Affected Scope:** [Lines 1094-1099](../designs/workout_tracker.md#L1094-L1099)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Add: "At end of week 4 each tester exports diagnostics and sends the file to the author." Metrics read from `usageSummary`: sessions/week ≥ 2 per tester, median set save < 5 s is replaced by "sets logged per session" (save time is not measured).

### [M23] [`style`] - Severity: Major
*   **Affected Scope:** [Lines 685-688](../designs/workout_tracker.md#L685-L688), [1068-1078](../designs/workout_tracker.md#L1068-L1078)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Move to Manual setup: "Author checks Hammer Strength machine names against the gym floor before P6."

### [M24] [`style`, `implementation_readiness`, `codebase_details`] - Severity: Major
*   **Affected Scope:** [Lines 1060-1066](../designs/workout_tracker.md#L1060-L1066)
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Proposed Edit:*** Delete item 54.

### [N1]-[N10] - Severity: Nit
*   ***AI Suggestion:*** N1 export/back-up wording: DECLINE. N2 use "move up/down" only: PROPOSE FIX. N3 "profile default (initially 90 s)": PROPOSE FIX. N4 "catalog served from precache": PROPOSE FIX. N5 Type/Scope and "today": DECLINE. N6 add routes `/machines/new`, `/machines/:id/edit`, `/welcome/*`: PROPOSE FIX. N7 lb shown to 0.5 lb, stepper 2.5 lb, stored in kg: PROPOSE FIX. N8 rest precedence `machineSettings.restSec` > custom `restSec` > catalog `defaultRestSec` > profile: PROPOSE FIX. N9 Hosting text says inline styles allowed for Recharts: PROPOSE FIX. N10 script bodies (`vite`, `vite preview`, `vitest run --coverage`, `tsx scripts/check-catalog.ts`, `tsx scripts/prepare-images.ts`): PROPOSE FIX.
