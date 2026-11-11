# Workout Tracker (machine-first gym logging and body measurements)

* **Author:** mtmohamed.l
* **Date:** 2026-11-11

## Overview

A mobile-first web app, installed on the phone as a Progressive Web App (PWA),
for planning gym sessions, logging reps and weight per set during a workout, and
tracking body measurements. The first users are the author and a small group of
friends. Data is strictly private; nothing is shared between users in v1. The
app is English only. It is a TypeScript PWA served as static files from the Azure
Static Web Apps Free plan on its default HTTPS subdomain.

**v1 is local-only (decided after the first Goldfish review).** Each user's data
lives only on their own phone. There are no accounts, no server database and no
sync service in v1. Users move or back up their data by exporting a file (for
example to a PC or OneDrive) and importing it on another device. A server-side
copy with accounts and sync is the next stage.

The first version focuses on common gym machines rather than free-weight
movements, to lower the risk of injury from poor technique. Exercises are
browsed by muscle group. Each machine has a photo and a one- or two-line note on
why it is used for that muscle group.

The core value of v1 is fast, reliable set logging inside the gym, including
when the phone has weak or no signal. Body measurements (weight, height,
circumferences) with simple trends are the second v1 feature. Curated goal-based
plans, machine substitution, body-shape analysis, an animated before/after body
and rich analytics are later stages.

Success for v1: the author and friends use it for every gym session for 4 weeks,
logging a set takes 3 taps or fewer, and no logged set is lost.

### Goldfish review status

| Lens | Reviewer | Round 1 (server sync concept) | Round 2 (local-only concept) |
| --- | --- | --- | --- |
| Cost, Quota & Token Economics | `design_critic` | completed | completed |
| Observability & SRE Debuggability | `codebase_details` | completed | completed |
| Contrarian / YAGNI | `zoom_out` | completed | completed |
| UX & Developer Ergonomics | `comprehension` | completed | completed |
| Migration & Backward Compatibility | `implementation_readiness` | completed | completed |
| Long-Term Tech Debt & Maintenance | `structural` | completed | completed |
| Inventive Catalyst | `inventive_catalyst` | completed | completed |

## Analysis

### Round 2 review: local-only TypeScript PWA

The second review ran against the revised concept: local-only, a TypeScript PWA,
and the Azure Static Web Apps Free plan. Hosting cost and load are not a concern.
Static files for a few users are well inside the free quotas. Every lens found
the same core risk. **The phone is the only copy of the data, and the browser can
delete it.**

#### Blockers

1. **Browser storage can be deleted, and on iPhone it is split in two.**
   Safari can delete website data after 7 days without use if the app is not
   installed. Any browser may delete it when the phone is low on storage. On
   iPhone, the installed home-screen app and the same site in a Safari tab keep
   **separate** data. A friend who logs in Safari and then installs the app will
   not see that history. Required:
   * Call `navigator.storage.persist()` on first run and show the result
     ("Storage protected: yes/no").
   * Detect whether the app runs installed (`display-mode: standalone`). In a
     browser tab, show an install guide before any logging. iOS has no install
     prompt, so the guide must show the steps.
   * Make backup a single tap through the share sheet (`navigator.share` with a
     file), so it can go to iCloud, OneDrive, Drive or a chat. Plain downloads
     are unreliable in installed iOS web apps. Offer it at the end of each
     session.
   * Base reminders on the number of sets not yet exported, as well as the date.
   * Keep a record count and a first-run marker. If records drop unexpectedly on
     launch, show "data appears to have been cleared; restore from backup"
     instead of an empty app.

2. **Data is tied to the web address.** IndexedDB data belongs to the exact
   origin, here `<name>.azurestaticapps.net`. Moving to a custom domain or
   another host later, or deleting and recreating the Azure resource, leaves
   every user's data behind. The only way to move is export and re-import.
   Decided: keep the default address for v1 (Key Decision 18).

3. **App updates and database upgrades can lose data.**
   * Use prompt-to-update (`registerType: 'prompt'`), never automatic reload.
     Offer updates only when no session is open.
   * Dexie schema versions only increase. Upgrades only add data and never
     delete it. Take an automatic local JSON snapshot before each upgrade.
     Handle the `versionchange` and `blocked` events.
   * Rollback cannot undo a database upgrade, because the old code cannot open a
     newer database. Fixes are always new releases. If the database fails to
     open, show a recovery screen that can still export the raw data. Never wipe
     data automatically.
   * Serve `sw.js` and the manifest with no-cache headers
     (`staticwebapp.config.json`).

4. **Import merge rules are undefined.** "Merge by ID" does not cover a record
   edited on two phones, or a record deleted on one phone (it would come back).
   Required if merge is kept:
   * Each record has a UUID (`crypto.randomUUID`), `createdAt`, `updatedAt` and
     a `deletedAt` marker. The newest `updatedAt` wins, and deletion markers
     are respected.
   * Built-in machines use fixed text IDs (slugs) that are never reused. Retired
     machines are hidden, not deleted. Unknown machine IDs in an import are kept
     as placeholders.
   * Import validates the file, shows a preview ("X added, Y updated, Z
     unchanged") and then applies everything in one transaction or nothing.
     Importing the same file twice gives the same result.
   * The YAGNI lens recommends **replace-all import** for v1 instead. It confirms
     first and exports the current data automatically. This is enough for backup
     and moving to a new phone. It also removes all conflict rules from v1. The
     IDs and timestamps above still go in the data, so merge can be added later.

5. **"Zero lost sets" cannot be checked without on-device records.** With no
   server, nothing shows whether a set was saved. Required:
   * A set counts as saved only after its IndexedDB transaction confirms. The
     screen shows what is stored, not what is held in memory.
   * A small on-device journal records set created, edited and deleted events. A
     consistency check compares the journal with the stored sets.
   * A size-limited local error log captures crashes, storage errors and failed
     migrations. Measurements and set values never go in it.
   * An "Export diagnostics" option produces a file that friends can send to the
     author. It includes the app build, schema version, export format version,
     storage status and counts.
   * Define a lost set: the user tapped log, the app confirmed it, and it was
     later missing.

#### Major

* **Session as saved state.** Use explicit Start and Finish actions. Save the
  session state (not started, active, resting, finished) to storage, so a killed
  or reloaded app reopens the open session.
* **Rest timer.** Store the end time and recalculate it when the app becomes
  visible again. Use the Screen Wake Lock API to keep the screen on during a
  session. Alerts while the phone is locked are not available in v1. Specify the
  default rest length (global and per machine), skip, +/-15 s, and what happens
  when the next set is logged during rest.
* **3-tap definition.** Starting point: the machine is open in the session. If
  the pre-filled values are right, saving takes 1 tap. Changing one value takes
  3 taps or fewer. Pre-fill comes first from the same set number earlier in this
  session, then the last session on this machine, then the routine target, then
  empty. Tapping the number opens the keypad for large jumps.
* **Units and step sizes.** Pick kg or lb, and cm or in, in the profile. Store
  kg and cm. Each machine has its own weight step (for example 2.5, 5 or 7 kg),
  because a fixed step breaks the tap target.
* **Mistakes.** Any set can be edited or deleted. Show undo for about 5 seconds
  after save or delete. Deletes are soft (marked).
* **Custom machines and search.** About 20 built-in machines will not match
  friends' gyms. Users can add a machine (name, muscle group, optional own
  photo). Search by name. Muscle group is a filter, not a separate navigation
  level.
* **Export integrity.** The export includes a manifest with record counts per
  type and a checksum. "Last export" updates only after the file is produced.
  Where the browser cannot confirm the save, the label says "last export
  started".
* **CSV.** It is export only and cannot be imported back. The columns are fixed
  and documented, and new columns are added only at the end. Cells starting with
  `=`, `+`, `-` or `@` are escaped. The file is UTF-8 with a byte-order mark.
  The YAGNI lens recommends dropping CSV from v1 until someone asks for it.
* **Code structure.** Screens use a repository layer (sets, routines, sessions,
  measurements), never Dexie directly. A later sync adapter can then be added
  behind the same interface. The catalog is versioned static JSON plus images,
  separate from user data. Trends are pure functions, separate from the chart
  library.
* **Machine images (challenge to an author decision).** The YAGNI lens notes
  that openly licensed photos of specific machines are hard to find, and that
  finding and crediting them delays v1. Users already know their gym's machines.
  Its alternative is a generic icon per muscle group plus an optional user photo.

#### Nit

* Store measurements as rows (site, side, value, unit, date). Show body weight
  and waist by default and the other sites as optional. Show trends only after
  2-3 points.
* First-run screen: no account, data stays on this phone, install the app,
  export regularly, set units and height.
* Dark or high-contrast theme, tap targets of 48 px or more, no swipe-only
  gestures.
* Keep text in one strings module and use `Intl` for dates and numbers.
* Local usage summary (active days, sessions, sets) to check "daily use for 4
  weeks".
* A CI smoke check after each deploy: the manifest, `sw.js` and app shell load.
* Contrarian question: Strong, Hevy and FitNotes already cover most of v1.
  Record why this app is being built (machine-first focus, privacy, no accounts,
  learning), and cut v1 features that do not serve that reason.

### Round 1 review history (server sync concept)

The sections below come from round 1, when v1 still had a server. Their severity
labels apply to that concept. Items that still matter for v1 are covered by the
round 2 section above and the Key Decisions.

#### Effect of the local-only v1 decision

The first review assumed a server copy with sync. The author then chose a
local-only v1. This changes the findings below as follows:

* **Removed from v1:** accounts and sign-in, the Azure backend and database,
  sync conflicts, token expiry, server-side reconciliation, telemetry upload and
  free-tier database limits. These sections stay in this brief as input for the
  server stage.
* **Now more serious:** the phone is the **only** copy of the data. A lost phone,
  a factory reset, clearing browser data, or Safari deleting site data destroys
  the history unless it was exported. iPhone storage protection (install to home
  screen, `navigator.storage.persist()`) and regular exports are now the main
  defence for "zero lost sets".
* **New v1 requirements:**
  * Export to a file (JSON for full restore, CSV for reading on a PC) and import
    from that file on another device. Import must not create duplicate sets, so
    sets still use phone-generated IDs and import merges by ID.
  * The export file carries a format version, so a newer app can read older
    exports.
  * A visible "last export" date and a reminder (for example weekly, or after N
    unexported sets) to save a backup.
  * "Zero lost sets" is redefined for v1: no set confirmed on screen is missing
    from the phone's storage or from the next export. It can be checked by
    comparing set counts in the app with the counts in the export file.
* **Kept, because they protect the later server stage:** phone-generated set
  IDs, append-only sets with marked deletes, a versioned local data format,
  canonical units, app-owned catalog IDs, and plan / session / set kept as
  separate records. With these, adding sync later means uploading existing
  records rather than migrating them.
* **Hosting:** v1 is a static PWA. Azure Static Web Apps free tier is enough,
  with no Functions or database.

#### Main contradiction: working offline vs. never losing a set

All seven lenses flagged the same core risk. The app must log sets with no
signal, but success is defined as "zero lost sets". If the server is treated as
the place where a set becomes real, every offline set is at risk.

**Resolution (local-first with an outbox):**

* A set is saved on the phone (IndexedDB) at the moment of the tap. The phone
  holds it until the server confirms it.
* Each set gets an ID generated on the phone (GUID or ULID) and a device
  timestamp. The server stores sets by that ID, so sending the same set twice
  never creates a duplicate.
* Sets are append-only. Edits are new versions with "last edit wins", and
  deletes are marked rather than erased.
* Sync runs every time the app opens, regains focus or comes back online. It
  must not depend on the Background Sync API, because iOS Safari does not
  support it.
* A failed upload stays in the outbox until it succeeds. An expired sign-in
  means "sign in again and retry", never "discard".

**Ideal result:** the phone saves the set within the tap, and sync is a backup
the user never waits on.

#### iPhone storage can be wiped (Blocker)

Safari can delete a website's stored data after about 7 days without a visit,
or sooner when the phone is low on storage. A set that was logged offline and
never synced can be lost. Required countermeasures:

* Ask users to install the app to the home screen (installed apps are not
  subject to the 7-day rule) and request persistent storage
  (`navigator.storage.persist()`).
* Show a visible "N sets not yet synced" badge and the last successful sync time.
* Warn before sign-out while sets are still unsynced.
* Keep user data separate from cached images, which the browser may delete.

#### Sign-in vs. offline use (Blocker)

Sign-in tokens expire and cannot be renewed without signal. Signing in must
control **sync only**, never logging. Saving a set needs only the account
already on the phone. The server checks that each queued set belongs to the
signed-in user when it arrives. Use long-lived refresh tokens. Each user's data
is partitioned by an internal user ID that maps to the identity provider's ID,
so a later change of provider does not orphan data. The user ID always comes
from the server-side sign-in session, never from the request body. Local data is
cleared on sign-out.

#### "Zero lost sets" must be measurable (Blocker)

As written, the success measure cannot be checked. A lost set looks the same as
a set that was never logged. Required:

* Count sets at each stage: created on the phone, queued, sent, accepted by the
  server, rejected with a reason.
* Daily reconciliation: compare the phone's count and sequence numbers with the
  server's, and record any gap as a loss.
* A small diagnostic log on the phone, uploaded with the next successful sync,
  and a "Copy diagnostics" button for friends to send to the author.
* Telemetry contains only IDs, counts, durations and error codes. It never
  contains set values, body measurements, emails or names.

#### App updates can strand unsynced sets (Blocker)

A PWA can keep running old cached code for days. A new version can change the
local data format while old sets are still waiting to upload. Rolling back the
server does not roll back phones. Required:

* Version the local data format and the sync API. The server accepts at least
  the previous version of the sync payload.
* Local data format changes only add fields. Unsynced sets survive any upgrade.
* A new app version never activates in the middle of a workout or while sets are
  unsynced. The user is prompted to refresh.
* Keep a "kill switch" option to clear a broken cache. Rollback means "roll
  forward with a fix".

#### "3 taps or fewer" needs a defined start and end (Blocker)

Typing numbers on a phone keyboard alone takes more than 3 taps. Definition to
carry forward:

* **Starting point:** the machine is open in today's session.
* Reps and weight are pre-filled from the last set on that machine (or the plan
  target).
* "Same as last time" is a single tap. Small changes use +/- steppers or
  quick-pick buttons, not the keyboard.
* Suggested values look visibly different from confirmed values, so unchecked
  values are not logged by accident.
* Large tap targets (48 dp or more), primary action reachable with the thumb,
  and the screen kept awake during a session where supported.

#### Free tier limits (Major)

Load is tiny: well under one request per second and a few MB per user per year.
The risks come from free-tier behaviour, not from scale:

* App Service F1 has a daily CPU cap and slow restarts after idling. Avoid it.
* The Azure SQL free offer pauses when idle or when its monthly allowance runs
  out. Waking takes tens of seconds.
* Cosmos DB free tier (1000 RU/s, 25 GB) has no cold start and fits per-user
  documents. Only one is allowed per subscription.
* Blob Storage and some other services are free for only 12 months.

The suggested fit is Azure Static Web Apps (free) with managed Azure Functions,
the Cosmos DB free tier keyed by user ID, and the Static Web Apps built-in sign-in
or Entra External ID with an invite-only list. Because of the local-first design,
cold starts do not affect logging. Set a $0 budget alert. Keep storage and
identity behind thin interfaces so a later tier change does not require a
rewrite.

#### Content, photos and licensing (Major)

Open exercise datasets are mostly about free weights and have thin machine
coverage. Their licences differ. **wger** is AGPL for code and CC-BY-SA for
content, which requires attribution and sharing under the same terms.
**free-exercise-db** is public domain. Some popular APIs restrict commercial use.
Photos of branded machines taken from the web are usually copyrighted.

* Start with a small, hand-written catalog of about 20 machines that ships with
  the app. Each machine has an app-owned stable ID, a muscle group, a short
  objective note, and source and licence fields.
* Use openly licensed images only (decided by author), compressed to WebP under
  100 KB, packaged with the app and cached for offline use. Show a placeholder
  when no licensed image exists, and credit each image.
* Users can add or rename their own machine and attach a photo, because machines
  differ between gyms.
* Tag each machine with primary and secondary muscles and a movement pattern now.
  This costs little and enables substitution later.

#### Data model must not block later stages (Major)

Later stages (substitution, curated plans, body-shape analysis, before/after
visuals, analytics) all reuse v1 data. To avoid backfilling and migrations later:

* Keep **plan** (template), **session** (an occurrence on a date) and **set**
  (what was done) as separate records.
* Each set references the machine actually used, separately from the planned one,
  and keeps a snapshot of the display name.
* Store body measurements as raw rows of (site, value, unit, timestamp), not as
  fixed columns. Compute trends when they are displayed.
* Store weights in one internal unit (kg) and convert for display (kg or lb).
  Height is a profile field, not a trend.
* Work out "what is today's plan" from the plan and session history, not from a
  stored "current day" pointer. Store session dates as local date plus UTC time.

#### Scope pressure (Major)

The YAGNI lens challenged three things:

* **Accounts:** don't build sign-up or sign-in code; use a managed provider.
* **Backend:** a relational schema with a separate API is more than about five
  users need. Use document storage with managed Functions until analytics
  actually requires relational queries.
* **Daily plan:** "who writes the v1 plan" was undefined and could quietly grow
  into a plan builder. In v1 the user builds a simple routine by picking machines
  from muscle-group lists. Goal-based grouping is left to the later curated plans,
  so machines are not listed in two places.

#### Other gaps

* **Body measurements:** fix the list of measurement sites, each with a one-line
  "how to measure" hint, so values are comparable over time. Prompt weekly and
  allow skipping.
* **Backup:** free tiers have short backup retention. Add a per-user CSV or JSON
  export and a tested restore procedure before the 4-week trial.
* **First run:** document the invite, PWA install steps for iOS and Android, and
  a sign-in that keeps working offline after the first online sign-in.
* **No "coming soon" placeholders** for deferred features in the v1 interface.
* **Seed content version:** record which dataset version was imported and its
  licence.

## Goals vs. Non-Goals

* **In-Scope Goals (v1):**
  * Installable TypeScript PWA, mobile-first, with a layout that also works in
    a desktop browser for review on a PC. English only, served as static files
    from the Azure Static Web Apps Free plan.
  * Local-only storage on each user's phone. No accounts and no server
    database. No data shared between users.
  * Machine catalog of up to 30 common Technogym, Life Fitness, Hammer Strength and
    Matrix Fitness machines (brand, model, muscle group, objective note, photo
    with source URL). Search by name, muscle group as a filter. Users can add
    their own machines and replace any photo with their own.
  * A user-built routine and a "today" session screen.
  * A rest timer that starts automatically after each logged set.
  * Set logging (reps, weight) that works offline, takes 3 taps or fewer with
    pre-filled values, and loses no sets.
  * Body weight and circumference logging (waist, hips, chest, neck, left and
    right arm, thigh and calf) with simple trend lines. Height is kept in the
    profile.
  * One versioned JSON backup file. Export through the share sheet or a
    download. Replace-all import with confirmation, an automatic export first,
    and a warning about unexported changes. Visible "last export" date and
    reminders based on unexported sets.
  * iPhone storage protection: install-to-home-screen guidance and persistent
    storage request.
  * Safe updates (prompt outside sessions, snapshot before schema upgrade,
    recovery screen) and an "Export diagnostics" option (build, schema and
    format versions, storage status, counts, recent errors without personal
    values).
* **Out-of-Scope Non-Goals (v1):**
  * Curated goal-based plans and automatic machine substitution.
  * Body-shape analysis and plan recommendations based on measurements.
  * Animated or 3D before/after body.
  * Rich analytics dashboards beyond simple trend lines.
  * Accounts, sign-in, server storage and automatic sync between devices
    (next stage).
  * Sharing, friends, leaderboards and multi-tenant features.
  * Free-weight exercises.
  * Languages other than English, right-to-left layout, and localisation work.
  * Native mobile apps and smartwatch support.
  * Paid hosting tiers.
  * CSV export and merge import (replace-all JSON only in v1).

## Alternatives Weighed

* **Using an existing app (Strong, Hevy, JEFIT):** Rejected by author. The goal
  is a personal, machine-first app that can grow into goal-based plans and body
  analysis later.
* **Always-online website:** Rejected by author. Gym signal may be weak, and
  logging must not depend on the network.
* **Shared or social features in v1:** Rejected by author. v1 is strictly
  private per person.
* **Body measurements with animated before/after body in v1:** Rejected by
  author for v1 because of cost. Deferred to a later stage.
* **Arabic and right-to-left layout in v1:** Rejected by author. English only at
  first.
* **Paid hosting:** Rejected by author. Free tiers only for the foreseeable
  future.
* **Blazor WebAssembly frontend:** Rejected by author. It needs a 2-5 MB first
  download, and phone features such as IndexedDB and wake lock go through
  JavaScript interop. A TypeScript PWA (Vite with `vite-plugin-pwa`/Workbox,
  Dexie for IndexedDB) was chosen instead.
* **MonsterASP.NET free plan:** Rejected after checking the vendor's pricing
  comparison (2026-11-11). The free plan has no HTTPS, and browsers only run
  service workers (offline and install) over HTTPS. Its paid plan (about
  $2/month) breaks the free-hosting constraint.
* **GitHub Pages:** Not chosen. On a free GitHub account the repository must be
  public, and it offers no backend for the later server stage.
* **Server as the source of truth for sets:** Rejected during review. It
  conflicts with offline logging and "zero lost sets".
* **App Service F1 hosting or Azure SQL free offer as the main database:** Not
  recommended by review because of daily CPU caps, pausing and cold starts. Final
  choice open (see below).
* **Merge import in v1:** Rejected by author in round 2. Replace-all import is
  enough because data is entered on the phone and reviewed on the PC.
* **CSV export:** Dropped by author in round 2. The PC opens the same website and
  imports the JSON backup.
* **Linking to brand pages instead of copying photos:** Offered after round 2.
  Rejected by author, who accepted the copyright risk (Key Decision 17).
* **Server-side copy with accounts and sync in v1:** Rejected by author after the
  first review. A local-only v1 with file export and import removes accounts,
  backend, sync conflicts and token expiry from v1. Server sync is the next
  stage.

## Key Decisions & Staging for Next Steps

**Decided:**

1. Users: the author and a small group of friends. Each person's data is private
   and designed so it does not block growth later.
2. Device: phone only, installed as a PWA.
3. v1 is local-only for every user. Data stays on the phone. File export and
   import moves it to a PC or another device. Accounts and server sync are the
   next stage.
4. v1 scope: fast set logging and basic body measurements. Everything else is
   staged later.
5. English only, free hosting.
6. Hosting: Azure Static Web Apps Free plan on the author's personal Azure
   account, using the default `*.azurestaticapps.net` address with HTTPS and no
   custom domain at first. Deployed from GitHub. Set a $0 budget alert.
7. Frontend: TypeScript PWA (Vite, `vite-plugin-pwa`/Workbox, Dexie for
   IndexedDB).
8. Catalog and plan content will be seeded from open-licensed sources, with the
   licence recorded per item.
9. ~~Machine photos: openly licensed images only~~ Superseded by Decisions 16
   and 17. An "Image credits" view still lists the source of each image.
10. Rest timer in v1: starts automatically after a set is logged. Remaining time
    is computed from a stored start time, so it stays correct after the app is
    backgrounded. Alerts while the phone is locked are not guaranteed (iOS
    suspends web apps and does not support web vibration).
11. Body measurement sites in v1: body weight, waist, hips, chest, neck, left and
    right arm, left and right thigh, left and right calf. Height is stored once in
    the profile. Each site has a one-line "how to measure" hint.
12. Import in v1 is replace-all. It confirms first and exports the current data
    automatically. Data is entered only on the phone. The PC is used to review
    the data, not to edit it. Records still carry IDs and timestamps, so merge
    can be added with sync later.
13. PC review uses the same website in a desktop browser. The user imports the
    latest phone backup, which replaces the PC copy. The layout must therefore
    work on a desktop screen as well as a phone. The "install before logging"
    guard applies to phones only.
14. Editing is allowed on any device. Keeping devices in step is the user's
    job: replace-all import overwrites the target device. To reduce surprises,
    import warns when the target device has changes that have not been exported,
    and its automatic export keeps them recoverable.
15. CSV is dropped from v1. Export and import use one versioned JSON backup
    file, created through the share sheet or a download and imported with a
    file picker on any device.
16. Machine images use a mix. An openly licensed photo is used where one exists.
    Otherwise the app shows a muscle-group icon. Users can always replace either
    with their own photo, which is stored on the device and included in the
    backup (resized, for example to WebP of 50 KB or less). The catalog lists
    real machines from Technogym, Life Fitness, Hammer Strength and Matrix
    Fitness by brand, model and muscle group. Machine names and facts can be
    listed freely. Manufacturer photos are copyrighted: they are used only with
    written permission from the brand or under a stated open licence. Logos are
    never used.
17. **Override of 16 by the author, risk accepted:** v1 copies product photos
    from the brands' websites into the app. Recorded risk: these photos are
    copyrighted, and the site is reachable by anyone with its URL. Mitigations
    that remain required: keep the GitHub repository private (the SWA Free plan
    supports private repos), keep a source URL per image, show no logos, and
    remove any image at once if a brand asks. The icon fallback and own-photo
    replacement from 16 stay.
18. The web address stays the default `*.azurestaticapps.net` address for all of
    v1. The Azure resource is never deleted or recreated. A later custom domain
    means every user exports from the old address and imports at the new one;
    the app will show that guidance when it happens.
19. The v1 catalog has 30 machines or fewer in total across Technogym, Life
    Fitness, Hammer Strength and Matrix Fitness, chosen from the machines at the
    gyms the author and friends use. More come only as custom machines or in
    later releases.
20. Rest timer defaults, chosen by the Elephant (the author delegated this
    choice): 90 s globally, an optional override per machine, +/-15 s and skip
    buttons, and logging the next set during rest ends the rest and records the
    actual rest time.

**Carry into `/egm-draft` as requirements:**

1. Phone-generated set IDs, append-only sets, "last edit wins" edits and marked
   deletes. Import merges by ID. This is the same model the later sync will use.
2. Versioned export file format. Newer app versions read older exports.
3. iOS storage protections: install to home screen, request persistent storage,
   show the "last export" date and backup reminders.
4. Versioned local data format. Format changes only add fields. App updates never
   activate in the middle of a workout.
5. A precise "3 taps" definition with pre-filled values and steppers.
6. "Zero lost sets" (v1): no confirmed set is missing from phone storage or the
   next export, checked by comparing counts.
7. Data model: plan, session and set kept separate. Measurements as raw rows.
   Canonical units (kg, cm). App-owned catalog IDs.
8. Server-stage requirements (sign-in controls sync only, outbox sync, server
   writes that ignore duplicates, free-tier choices, privacy-safe telemetry) are
   recorded in Analysis for the next stage, not v1.
9. Installed-app check: detect a browser tab and guide the user to install
   before logging. Show whether storage is protected. Detect unexpectedly
   cleared data and offer restore.
10. One-tap backup through the share sheet, offered at the end of each session,
    and reminders based on sets not yet exported.
11. Fixed origin for v1. Never delete the Azure resource. A later address change
    is an export and import for every user.
12. Safe upgrades: prompt-to-update outside sessions, additive schema versions,
    an automatic snapshot before each upgrade, a recovery screen that can export
    raw data, and no-cache headers for `sw.js` and the manifest.
13. On-device evidence: a set is confirmed only after storage confirms it, an
    event journal with a consistency check, a local error log without personal
    values, and "Export diagnostics".
14. Session state machine saved to storage, a rest timer based on end time with
    a Wake Lock option, per-machine weight steps, undo and edit for sets, and
    custom machines with search.
15. Export manifest with counts and a checksum. A repository layer between the
    screens and Dexie.

**Open questions for the author (round 2):**

3. ~~Import for v1~~ Decided: replace-all (Key Decision 12).
4. ~~CSV~~ Decided: dropped from v1. The JSON backup file is the only
   export and import format (Key Decision 15).
5. ~~Machine images~~ Decided: brand photos copied in with the risk accepted
   (Key Decision 17). Asking the brands for permission is optional.
6. ~~Why build this~~ Answered: existing apps charge subscriptions, and the
   author wants freedom to customize. v1 therefore stays free, and every feature
   must serve the author's own workflow. Features that copy the other apps
   without that purpose are cut.

**Open questions for the author (round 1):**

1. ~~Licensed-image coverage~~ Superseded by Key Decision 17.
2. Deferred to the server stage, and does not block v1: Cosmos DB free tier
   (recommended by review) or the Azure SQL free offer.
