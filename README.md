# Workout Tracker

A web app for planning workouts, logging sets (reps and weight) during a session, and tracking body measurements.
The first version focuses on common gym machines rather than free-weight movements, to reduce the risk of injury.

## Design process

This project is designed spec-first with the [Elephant-Goldfish Model](https://github.com/google/elephant-goldfish-model)
(EGM), pinned as a git submodule in `.egm/`.

```sh
git submodule update --init
```

Design artifacts (concept brief, design drafts, review reports) live in `docs/egm/`.
Approved specifications move to `docs/designs/`.

## Run locally

Requires Node 22 (see `.nvmrc`).

```sh
npm ci
npm run dev          # development server
npm test             # unit tests
npm run lint         # ESLint and type check
npm run build        # production build in dist/
npm run e2e          # Playwright end-to-end tests
```

## Deploy

GitHub Actions (`.github/workflows/azure-static-web-apps.yml`) builds and tests every
push to `master` and every pull request, then deploys `dist/` to Azure Static Web Apps
(Free plan). Pull requests get preview environments, removed when the pull request closes.
After each deploy a smoke step checks the main files and that `sw.js` is not cached.

Live address: _not set yet. Add the `*.azurestaticapps.net` address here after creating
the resource._

One-time setup (in Azure and GitHub, not in this repository):

1. In the Azure portal, create a Static Web App: plan **Free**, any region, and
   **Deployment source: Other** (not GitHub; GitHub would add a second workflow file).
2. In the new resource, open **Manage deployment token** and copy it. In GitHub, add it as
   the repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN_BLACK_WAVE_086835010` (Settings > Secrets and
   variables > Actions), then re-run the latest "CI and deploy" run.
   Until then the deploy step fails; tests still run.
3. Create an Azure budget with an e-mail alert at 100% of actual cost.

`npm run e2e` first builds two extra copies of the app (`dist-a`, `dist-b`) for the
update test, then runs every journey on a phone (Chrome and Safari) and a desktop.
Run `npx playwright install` once before the first local run.

**Never delete the Azure Static Web App resource.** Each user's data is tied to the
site's address; a new resource gets a new address, and the data on every phone would
be left behind at the old one.

## Where data lives

All data stays on the user's device, in the browser's IndexedDB storage for this site.
There is no server and no account. The installed app and a browser tab on the same
phone keep separate data.

## Backup and restore (for users)

1. Settings > Back up now. Save the file to iCloud Drive, Google Drive or e-mail it to yourself.
2. To restore, open the app on any device: Settings > Restore from backup, and pick the file.
   Restoring replaces all data on that device; the app first saves an automatic backup.

## Your own plans and the offline template

On Plans, the "Make your own" card has three actions:

* **Create plan** opens the plan editor (days, machines, sets, reps, set style, target weight).
* **Download template** saves `workout-plan-template.xlsx`. Fill in the Plans and Exercises
  sheets in Excel, LibreOffice or Google Sheets. The drop-downs use the Machines sheet (every
  machine you can pick, with its ID) and the Lists sheet (goals, levels, set styles, muscle groups).
* **Import plan** reads the filled file, shows a preview, and adds the plans. Errors name the
  sheet and row. A plan with the same name as one of your plans replaces it. Weights are in kg.

## Machine photos

The machine photos are copied from brand websites. Therefore:

- The repository stays private.
- Each image's source URL is recorded in `public/catalog/catalog.json`.
- No brand logos are used.
- Any image is removed on request from the brand.

## Design

See [docs/designs/workout_tracker.md](docs/designs/workout_tracker.md).
