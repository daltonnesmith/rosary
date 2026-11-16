# Stillwater

A quiet, classy rosary companion for phone and desktop. Ivory, deep green, and muted gold; no account, ads, analytics, external fonts, or backend. Your prayer history and notes stay on your device.

## What it does

- Guides you through the full traditional English rosary, with the complete prayer text on every step, Back/Next controls, current mystery, bead count, and progress.
- Includes all four sets of mysteries and weekday suggestions. Five decades each contain one Our Father, ten Hail Marys, and a Glory Be; the Fatima prayer is optional.
- Writes out the story of each mystery (including the Annunciation and Visitation), with a scripture reference and a short reflection. Open **Read the five mysteries** to read ahead, or read the current mystery above its decade's prayers. These are original devotional retellings, not quotations from a modern Bible translation; the Assumption and Coronation are clearly identified as traditional meditations rather than narrated Gospel events.
- Remembers your exact place, including the mystery set and Fatima setting. Starting over changes only the unfinished rosary, never your notes or completed days.
- Records a rosary only when you choose **Complete rosary** after the final prayer. Completion belongs to the local calendar day when you finish, even if you started before midnight.
- Shows a monthly calendar, daily prayer history, total days, and a current streak. An unfinished current day does not break yesterday's streak.
- Saves dated reflections, supports editing, and exports/imports validated JSON backups. Import merges rather than replacing your journal; conflicting notes are both preserved.
- Installs as an offline-capable progressive web app (PWA), not a native App Store/Play Store package. Includes generated PNG icons (192, 512, and Apple 180 pixels), a maskable icon, a manifest, and an app-shell service worker.

## Run locally

Requires **Node.js 22 or newer**. There are no package dependencies and no install step.

```powershell
npm run build
npm run dev
```

Open the address printed by the server, `http://localhost:4173/rosary/`. The same server supports root hosting at `http://localhost:4173/`. `npm run preview` is an alias for serving the build. Stop with Ctrl+C. Build again and reload after source changes; this is intentionally a small static app, not a hot-reload framework.

The local server listens only on your computer's loopback interface. A phone cannot install it from your PC's localhost address. Publish the contents of `dist` to an approved HTTPS host to install it on a phone.

## Checks

```powershell
npm run check
npm test
npm run build
```

`check` runs JavaScript syntax checks; this dependency-free JavaScript project does not have a TypeScript compiler. Node's built-in test runner checks prayer ordering and all five decades, Fatima toggling, explicit completion, resumption, local dates in different time zones, daylight-saving/leap-year boundaries, streaks, corrupted and denied storage, validated backups, conflict-preserving import, and generated install assets. The build test also creates `dist`.

The GitHub Actions **Check and build** workflow runs these commands and makes a `stillwater-site` artifact available to repository collaborators. It does **not** deploy or change repository visibility.

Before a release, also check 320px and desktop layouts in a real browser, keyboard-only navigation, focus visibility, no horizontal overflow, reload resumption, notes containing HTML displayed as plain text, blocked/quota-full storage feedback, two-tab write protection, and offline reload. On a hosted HTTPS site, test installation on actual iPhone Safari and Android Chrome. These browser/device checks cannot be inferred from unit tests.

## Installation

First visit the **hosted app's HTTPS URL**, not its GitHub repository page. Once the service worker finishes installing, its app files work offline. In-app **Install app** opens these instructions:

- **iPhone / iPad:** open in Safari, Share → **Add to Home Screen** → Add. Enable Open as Web App if offered.
- **Android:** Chrome menu → **Install app** or **Add to Home screen**.
- **PC / Mac:** Chrome or Edge's address-bar install icon or browser **Install app** menu. Other browsers can use the website normally.

There is no verified live deployment included merely by pushing this repository. A build or GitHub Actions artifact is not an installable HTTPS address.

## Hosting while keeping this repository private

This repository must remain **private** unless its owner explicitly decides otherwise. At initial setup, the coordinating session reported a Free GitHub plan and no existing Pages site. GitHub Pages from a private repository generally requires an eligible paid plan; a missing Pages site alone is not a deployment. Do not silently make the repository public to enable it.

With the owner's approval, either use an eligible GitHub Pages plan or another static HTTPS host that accepts a private repository/build upload. A public static website may expose the compiled application code even when its source repository is private. The app does not upload notes to that host; access logs are controlled by the chosen host. Password-protected/private hosting is a separate hosting choice.

Build with `npm run build`, then publish **the contents of `dist`** as the site root. The app uses relative paths throughout: both a domain root and a repository path such as `/rosary/` work without recompilation. Keep the trailing slash on the app's base URL. Serve `.webmanifest` as `application/manifest+json`, JavaScript as JavaScript, and `sw.js` without long-lived HTTP caching. Do not rewrite missing static files to the HTML shell. HTTPS is required except on localhost.

No hosting account, paid plan, public visibility, or deployment is configured by the app. A manual Pages deployment workflow can be added after entitlement and the owner's desired public/private site access are confirmed.

## Privacy, storage, and recovery

The app stores a versioned JSON document under localStorage key `stillwater-v1`. Notes and history are separate from the service-worker cache; app-cache updates never clear localStorage. There is no synchronization, account, network API, telemetry, or remote data store.

Data belongs to this browser profile and site origin. Clearing browser/site data, private browsing, uninstalling, storage eviction, or using another device/browser/origin may lose or separate it. On iOS, an installed app may have storage separate from the browser. **Export a backup regularly**, especially before updates, moving hosts, or uninstalling.

Exports contain all saved notes, completions, and current progress as **unencrypted JSON**. Keep them private. Import accepts a version-1 backup up to 2 MB, validates dates, IDs, field types, note lengths, and progress bounds, and merges history/notes without deleting existing data. Reimporting the same backup does not duplicate its notes/history. Existing in-progress prayer takes precedence over imported progress.

If storage is unavailable or full, a visible alert explains that changes are only in the current tab and should be exported. If existing data is corrupt or from an unsupported version, the app leaves that storage untouched and works temporarily in memory. Export new activity before closing; do not clear existing site data until you have recovered/backed it up. An import does not overwrite unreadable storage. If another tab changes the saved document, this tab stops writing to prevent stale overwrites: export any unsaved activity, then reload.

Saving an empty reflection is rejected, not treated as a request to delete notes. Resetting prayer progress never removes reflections or completion history.

## Prayer texts and customs

The opening and closing prayers use traditional public-domain English devotional wording, including the older Apostles' Creed and "Holy Ghost" wording, rather than a modern copyrighted liturgical translation. The prayers are traditional texts, not newly authored quotations from a contemporary prayer book. Spelling/capitalization varies among devotional editions. The Fatima prayer is optional.

The suggested weekday pattern is Joyful Monday/Saturday, Sorrowful Tuesday/Friday, Glorious Wednesday/Sunday, and Luminous Thursday. Sundays may vary by liturgical season or local custom; all sets remain selectable. The three opening Hail Marys are offered for faith, hope, and charity. The full sequence ends with Hail Holy Queen, its response, the concluding collect, and the Sign of the Cross.

## Small, maintainable by design

`src/core.js` contains pure prayer/calendar/backup logic; `src/app.js` handles the DOM and device storage; `src/style.css` provides the responsive design. `scripts/build.mjs` copies the static shell and generates original raster rosary/cross icons using only Node built-ins. There are no third-party runtime assets.

For app-shell releases, increment `CACHE` in `sw.js` whenever cached files change. New service workers wait until existing app tabs close, avoiding forced reloads during prayer or note editing. Old app caches are removed on activation; user data is not. Keep `stillwater-v1` and its data format stable, or implement an explicit, tested migration before changing them.
