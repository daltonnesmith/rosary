# Stillwater

A quiet, classy rosary companion for phone and desktop. Ivory, deep green, and muted gold; no account, ads, analytics, external fonts, or backend. Your prayer history and notes stay on your device.

## What it does

Collectible art decorates the Profile card only; the chapel keeps the stained-glass window for each decade and your equipped beads. In **Calendar**, select a past or current date to record or undo Mass and Confession check-ins. Lenten dates, starting on Ash Wednesday, offer a seven-day prayer challenge. These private milestones do not earn rosary points; JSON backups include the check-in dates and activities.

**Calendar → Fasting:** Select a date to join a personal fast with an end date, or choose Lent, Ash Wednesday, or Good Friday when offered. A diamond marks the start of a built-in fast. Optionally name what you are setting aside. Tap **I kept this fast** on each day you choose to record; tap again to undo. Seven distinct days during one Lent earn that year's Lent medal. Ash Wednesday and Good Friday each have a one-day annual medal; personal fasts earn medals at one and seven distinct days. These are voluntary devotional milestones, separate from the Lenten prayer challenge and from Church fasting obligations. Intentions and dates stay on your device and are included in exported journal backups.

For local testing, open the app on localhost with `?testEquip=1`. **Try background & beads** applies even unearned styles in that tab until reload, without saving preferences or granting awards.

In the Profile award catalog, expand **Chi-Rho · A year of prayer** to see cumulative prayer-day milestones in order. Multiple rosaries on one date count as one day here, and breaks do not reset the count.

Profile awards are illustrated Catholic medallions. The **Jerusalem Cross** (a central cross with four smaller crosses) is earned by completing every chapter of Matthew, Mark, Luke, and John in Scripture & prayer. Previously recorded chapters count; previewing a medal never grants it.

**Profile → My Little Chapel** shows all medals, with unearned medals greyed out. Open the Jerusalem Cross to see Matthew, Mark, Luke, and John with their own chapter counts and finishes. Each completed Gospel unlocks its finish, and all four unlock Jerusalem gold. Preview locked rewards freely without changing progress; **Equip background & beads** saves an unlocked profile background and prayer-strand finish on the device. The candlelit alcove also has a votive to light.

The museum backgrounds unlock at 1, 5, 7, 30, and 365 completed rosaries, respectively: [Madonna and Child](https://www.clevelandart.org/art/1952.110), [Virgin and Child Enthroned](https://www.clevelandart.org/art/1954.834), [The Annunciation](https://www.clevelandart.org/art/1950.251), [Virgin and Child with Angels](https://www.clevelandart.org/art/1916.802), and [The Crucifixion with a Carthusian Monk](https://www.clevelandart.org/art/1931.449). All five are bundled offline from the Cleveland Museum of Art’s CC0 Open Access collection. **Review all awards** shows every milestone without granting it. **Full Bouquet** requires a completion in each of the four distinct mystery sets.

- Guides you through the full traditional English rosary, with the complete prayer text on every step, Back/Next controls, current mystery, bead count, and progress.
- Open **Stained-glass chapel** to pray with dimensional beads and artwork for each decade. Close the chapel to return to guided prayers at the same saved bead.
- Includes all four sets of mysteries and weekday suggestions. Five decades each contain one Our Father, ten Hail Marys, and a Glory Be; the Fatima prayer is optional.
- All twenty mystery cards begin with a cited Bible passage from the public-domain World English Bible, Catholic Edition, followed by a separate meditation and reflection. The Baptism in the Jordan includes Matthew 3:13–17 in full. The Assumption and Coronation use related Scripture for meditation, not a claim that these events are directly narrated there. To regenerate these offline readings, run `node scripts/prepare-mystery-passages.mjs <path-to-eng-web-c_vpl.txt>`.
- In **Stained-glass chapel**, each mystery is its own reading card before that decade's Our Father, not a separate list above the prayer. After the Fatima prayer, the next bead opens the following mystery; with Fatima disabled, it follows the Glory Be. The first mystery follows the opening Glory Be. Reading cards save and resume just like prayers, and Back revisits them without skipping any prayer.
- Long chapel readings turn a page at a time without advancing a bead.
- Remembers your exact place, including the mystery set and Fatima setting. Starting over changes only the unfinished rosary, never your notes or completed days.
- After the final prayer, **Complete rosary** records the rosary immediately for the local day you finish. The completion popup lets you add an optional journal note for that same day or simply tap **Done**. Leaving the note blank never cancels the completion.
- Shows a monthly calendar, daily prayer history, total days, and a current streak. An unfinished current day does not break yesterday's streak.
- **Your journal → Prayer milestones** awards 10 points per completed traditional rosary. Lifetime awards (1, 5, 7, 30, 50, 100, 150, 200, 250, 300, and 365 rosaries), streak awards (7, 30, 40, 60, and 90 consecutive local days), and a year of prayer (365 distinct days, breaks allowed) are calculated from your journal, including restored history. Multiple rosaries on one day earn points separately but count as one prayer day.
- Saves dated reflections, supports editing, and exports/imports validated JSON backups. Import merges rather than replacing your journal; conflicting notes are both preserved.
- Installs as an offline-capable progressive web app (PWA), with a separate Android test APK wrapper for direct installation. Neither is a published App Store/Play Store listing. Includes generated PNG icons (192, 512, and Apple 180 pixels), a maskable icon, a manifest, and an app-shell service worker.
- **The Daily Chapter** offers 235 complete chapters from the deuterocanon and all four Gospels, with quiet prayer pauses, book progress bars, and saved passages. The traditional rosary is unchanged.
- Adds a separate **Calendar** tab for U.S. Roman Catholic feasts and seasons, with color-coded months, daily observances, optional memorials, and Sunday/Thursday Ascension variants, available offline for 2024-2035.

## Run locally

Requires **Node.js 22 or newer**. The static web app has no external runtime dependencies, and its checked-in datasets mean no install step is needed for the web build/tests/server. Run `npm ci` for Android tooling or calendar regeneration. The Android wrapper uses pinned Capacitor packages; it does not fetch application content from a website.

```powershell
npm run build
npm run dev
```

Open the address printed by the server, `http://localhost:4173/rosary/`. The same server supports root hosting at `http://localhost:4173/`. `npm run preview` is an alias for serving the build. Stop with Ctrl+C. Build again and reload after source changes; this is intentionally a small static app, not a hot-reload framework.

The local server listens only on your computer's loopback interface. A phone cannot install it from your PC's localhost address. Publish the contents of `dist` to an approved HTTPS host to install it on a phone.

## Checks

The twenty mysteries, their order and weekday suggestions were checked against the [Vatican's Rosary guide](https://www.vatican.va/special/rosary/documents/misteri_en.html) and [USCCB's How to Pray the Rosary](https://www.usccb.org/how-to-pray-the-rosary) on November 26, 2026. Each decade announces the mystery, then offers an Our Father, ten Hail Marys and a Glory Be; Fatima is optional. "Holy Ghost" in the traditional prayers means the Holy Spirit. The Assumption and Coronation are Catholic teachings (see [Catechism 966](https://www.vatican.va/archive/ENG0015/__P2C.HTM)), not events directly narrated in the Gospels. The written-out stories and reflections remain original devotional retellings, not copied modern Bible passages. The weekday default follows the Vatican's general schedule; the user can choose another set, including seasonal Sunday customs.

```powershell
npm run check
npm test
npm run build
```

`check` runs JavaScript syntax checks; this JavaScript project does not have a TypeScript compiler. Node's built-in test runner checks prayer ordering and all five decades, Fatima toggling, explicit completion, resumption, local dates in different time zones, daylight-saving/leap-year boundaries, streaks, corrupted and denied storage, validated backups, conflict-preserving import, generated install assets, and liturgical seasons, transfers, colors, commemorations and coverage. The build test also creates `dist`.

The GitHub Actions **Check and build** workflow runs these commands and makes a `stillwater-site` artifact available to repository collaborators. It does **not** deploy or change repository visibility.

The separate **Android test APK** workflow builds the Android package, runs an Android 15 emulator test with Wi-Fi and mobile data disabled, checks its signature/manifest, and byte-compares every bundled web asset against `dist`. It runs on relevant feature-branch pushes or manually; it produces a test APK artifact, not an automatic public release.

Before a release, also check 320px and desktop layouts in a real browser, keyboard-only navigation, focus visibility, no horizontal overflow, reload resumption, notes containing HTML displayed as plain text, blocked/quota-full storage feedback, two-tab write protection, and offline reload. On a hosted HTTPS site, test installation on actual iPhone Safari and Android Chrome. These browser/device checks cannot be inferred from unit tests.

## Installation

### Direct Android test APK

The `1.2.0-test.6` APK adds **Stained-glass chapel** to the Rosary screen. Each of the twenty mysteries has its own window. Turn Scripture pages without moving a bead, and tap **Complete rosary** after the final prayer to mark the day in **Your journal**. Earlier test APKs do not update automatically.

On **Android 7.0 or newer**, [download the APK](https://github.com/daltonnesmith/rosary/releases/download/android-test-v1.2.0-6/Stillwater-1.2.0-test.6.apk) and tap the downloaded file to install. No GitHub sign-in is required. If Android asks, grant your browser or Files app permission to install this specific trusted download; turn that permission back off afterward. Keep Play Protect enabled; if installation is blocked, stop and check the exact message rather than bypassing protection.

This installs **Stillwater Test**, package `io.github.daltonnesmith.stillwater.test`, version `1.2.0-test.6` (version code 6). It bundles the entire app and works offline from its first launch, without website hosting or publishing to Google Play. A SHA-256 checksum accompanies the APK. This is a debug-signed personal test build, not a Play Store production release. The build uses a newly generated, disposable CI test key; no existing signing key is recovered or reused, and no signing key is published or committed. Before uninstalling an older build, export your backup and keep the file. Install the new APK, then import your backup to restore your notes and progress.

**Export a journal backup before uninstalling, clearing data, or switching builds.** Android uninstall can erase local progress and notes. Android automatic cloud backup and device transfer are disabled for the wrapper. Its data is separate from Chrome, the PWA, and your PC preview: export there and import the JSON file here to move it. **Export backup** uses Android's system file picker, with a chosen destination, rather than a WebView blob download. Canceling leaves all saved data untouched. Import uses the existing validated file picker and merge.

To build locally, install Node 22+, **Java 21**, Android SDK platform **36** and the Android build tools, then:

```powershell
npm ci
npm run android:sync
Set-Location android
.\gradlew.bat assembleDebug
```

The result is `android\app\build\outputs\apk\debug\app-debug.apk`. The checked-in Gradle wrapper downloads its pinned Gradle distribution. Set `ANDROID_HOME` or Android Studio's local SDK configuration for a local build. On macOS/Linux use `./gradlew assembleDebug` inside `android`. The GitHub workflow supplies these tools when they are not installed locally. To rerun native integration checks, use a fresh Android 15 (API 35) or newer emulator, disable its network connections, and run `connectedDebugAndroidTest` after syncing. The test verifies Android's actual connectivity before the first launch, rather than relying on WebView's unreliable `navigator.onLine` flag.

`capacitor.config.json` intentionally has no remote `server.url`. Native Android uses the installed assets, skips web service-worker registration, applies safe-area insets, and uses the same validated local journal format. Original launcher icons are generated from the same artwork as the web app. Never commit keystores, passwords, APK build outputs or copied assets; publish only the intended test APK and checksum. See `NATIVE-LICENSE.txt` and `APACHE-2.0.txt` for native dependency notices.

### Browser/PWA installation

First visit the **hosted app's HTTPS URL**, not its GitHub repository page. Once the service worker finishes installing, its app files work offline. In-app **Install app** opens these instructions:

- **iPhone / iPad:** open in Safari, Share → **Add to Home Screen** → Add. Enable Open as Web App if offered.
- **Android:** Chrome menu → **Install app** or **Add to Home screen**.
- **PC / Mac:** Chrome or Edge's address-bar install icon or browser **Install app** menu. Other browsers can use the website normally.

There is no verified live deployment included merely by pushing this repository. A build or GitHub Actions artifact is not an installable HTTPS address.

## Website hosting

The owner has made this repository **public** so friends can download the Android APK without a GitHub account. Source code, commit history and published releases are public; saved notes and prayer history remain on each device. Making the repository public does not automatically deploy a website.

With the owner's approval, the browser/PWA version can be deployed through GitHub Pages or another static HTTPS host. The app does not upload notes to that host; access logs are controlled by the chosen host. Password-protected/private hosting is a separate hosting choice.

Build with `npm run build`, then publish **the contents of `dist`** as the site root. The app uses relative paths throughout: both a domain root and a repository path such as `/rosary/` work without recompilation. Keep the trailing slash on the app's base URL. Serve `.webmanifest` as `application/manifest+json`, JavaScript as JavaScript, and `sw.js` without long-lived HTTP caching. Do not rewrite missing static files to the HTML shell. HTTPS is required except on localhost.

No hosting account, paid plan or deployment is configured by the app. A Pages deployment workflow can be added when website hosting is requested; the APK download does not require it.

## Privacy, storage, and recovery

The app stores a versioned JSON document under the stable localStorage key `stillwater-v1`. The current document format is version 2; version-1 rosary data and backups are migrated without changing existing notes, rosary history or place. Notes and history are separate from the service-worker cache; app-cache updates never clear localStorage. There is no synchronization, account, network API, telemetry, or remote data store.

Data belongs to this browser profile and site origin. Clearing browser/site data, private browsing, uninstalling, storage eviction, or using another device/browser/origin may lose or separate it. On iOS, an installed app may have storage separate from the browser. **Export a backup regularly**, especially before updates, moving hosts, or uninstalling.

Exports contain all saved notes, completions, and current progress, including both Scripture companions, as **unencrypted JSON**. Keep them private. Import accepts version-1 or version-2 backups up to 2 MB, validates dates, IDs, field types, note lengths, book/chapter membership and prayer-step bounds, and merges history/notes without deleting existing data. Reimporting the same backup does not duplicate its notes/history. Existing in-progress prayer takes precedence over imported progress. Importing an old backup never clears newer Scripture progress.

If storage is unavailable or full, a visible alert explains that changes are only in the current tab and should be exported. If existing data is corrupt or from an unsupported version, the app leaves that storage untouched and works temporarily in memory. Export new activity before closing; do not clear existing site data until you have recovered/backed it up. An import does not overwrite unreadable storage. If another tab changes the saved document, this tab stops writing to prevent stale overwrites: export any unsaved activity, then reload.

Saving an empty reflection is rejected, not treated as a request to delete notes. Resetting prayer progress never removes reflections or completion history.

## Prayer texts and customs

The opening and closing prayers use traditional public-domain English devotional wording, including the older Apostles' Creed and "Holy Ghost" wording, rather than a modern copyrighted liturgical translation. The prayers are traditional texts, not newly authored quotations from a contemporary prayer book. Spelling/capitalization varies among devotional editions. The Fatima prayer is optional.

The suggested weekday pattern is Joyful Monday/Saturday, Sorrowful Tuesday/Friday, Glorious Wednesday/Sunday, and Luminous Thursday. Sundays may vary by liturgical season or local custom; all sets remain selectable. The three opening Hail Marys are offered for faith, hope, and charity. The full sequence ends with Hail Holy Queen, its response, the concluding collect, and the Sign of the Cross.

## Small, maintainable by design

`src/core.js` contains pure prayer/calendar/backup logic; `src/app.js` handles the DOM and device storage; `src/style.css` provides the responsive design. `scripts/build.mjs` copies the static shell and generates original raster rosary/cross icons using only Node built-ins. There are no third-party runtime assets.

For app-shell releases, increment `CACHE` in `sw.js` whenever cached files change. New service workers wait until existing app tabs close, avoiding forced reloads during prayer or note editing. Old app caches are removed on activation; user data is not. Keep the `stillwater-v1` storage key stable, and implement an explicit, tested migration before changing the document format.

## Scripture & prayer companions

Use **Books & bookmarks** to switch among 13 books without losing your passage. Old bead bookmarks open at the corresponding passage of the same chapter. Completed chapters and Gospel medals are unchanged.

Each complete chapter is divided at verse boundaries into five passages. Each page pairs the text with a prayer; use **Next passage** four times, then **Complete chapter**. A chapter a day is a suggested rhythm, not a lock or deadline.

- **Deuterocanon:** Tobit, Judith, Esther additions, 1 Maccabees, 2 Maccabees, Wisdom, Sirach, Baruch, Daniel additions (146 chapters).
- **Gospels:** Matthew, Mark, Luke, John (89 chapters).

Start at any book/chapter without falsely crediting skipped chapters. Each book has a completion bar. Only finishing the chapter and its prayers records completion; rereading does not double-count it. At a book boundary the companion advances to the next unread chapter, returning to earlier gaps before declaring the entire plan complete. Switching companions preserves both places. **Choose another chapter** asks before clearing only that companion's unfinished place.

Readings are bundled locally from the **public-domain World English Bible, Catholic Edition**, with complete verse text, not summaries. The generated `src/scripture.js` contains 235 chapters (about 1.6 MB uncompressed), source attribution and a source-text checksum. There are no runtime Scripture API calls. See [SCRIPTURE-LICENSE.txt](SCRIPTURE-LICENSE.txt) for the publisher's notice, official download, and reproducible preparation command.

The Greek additions are embedded in their full chapter context: Esther 1, 3, 4, 5, 8 and 10; Daniel 3, 13 and 14. These labels do not imply that the entire books of Esther and Daniel are included. Baruch includes the Letter of Jeremiah as chapter 6. Numbering and brackets follow this edition and can differ from another Bible. Empty source verse entries and footnotes are not included; nonempty verse text is unchanged.

The journal calendar lists Scripture completions separately from rosaries. Its rosary streak and totals still count only traditional rosaries. Saved notes and exports are shared across the app; imports merge chapter completions and protect active positions.

## U.S. liturgical calendar

The separate **Calendar** tab shows daily national solemnities, feasts, memorials, optional memorials and privileged-weekday commemorations. Month backgrounds identify Advent, Christmas, Ordinary Time, Lent, the Paschal Triduum and Easter. A dot shows the primary celebration's vestment color, which can differ from its season. Text labels and full accessible date labels accompany the colors. Select any day for all its observances and color alternatives; use Today, the date picker, previous/next month, or arrow keys, Home/End and Page Up/Down.

Most U.S. dioceses celebrate Ascension on Sunday; select **Thursday** if your diocese retains Thursday. The choice lasts for the current visit. Epiphany and Corpus Christi follow U.S. Sunday observance. The calendar never writes to personal storage, records prayer completion, or changes the journal's activity calendar.

The bundled coverage is **2024-2035**, calculated using current rules, not a reconstruction of past decrees. Navigation cannot go outside this range. Future decrees require a data update. This is a national companion, **not an official diocesan ordo**: local patrons, church dedications, religious orders, obligations and evening liturgies can differ. Holy Thursday distinguishes the daytime weekday from the evening Mass of the Lord's Supper; Holy Saturday explains the nighttime Easter Vigil rather than assigning its white color to a nonexistent daytime Mass. Optional commemorations during privileged weekdays retain the weekday's color. Unimpeded Saturdays in Ordinary Time include the optional Blessed Virgin Mary memorial.

`src/liturgical-data.js` contains 4,383 civil dates generated from the MIT-licensed **romcal 3.0.0-dev.144** engine and matching U.S. English calendar. Only static normalized data is shipped; there is no runtime calendar API or CDN request. The upstream v3 generator is a pinned development release, not represented as an official Church publication. Selected movable dates, national observances, recent Teresa of Calcutta/Newman additions, and U.S. color options were cross-checked against the [USCCB's 2026-2028 calendars](https://www.usccb.org/committees/divine-worship/liturgical-calendar). Source details, normalization notes and the MIT notice are in [CALENDAR-LICENSE.txt](CALENDAR-LICENSE.txt).

To reproduce the dataset, run `npm ci` followed by `npm run prepare:calendar`. Normal builds never regenerate or download data. When refreshing the pinned engine/calendar pair or extending coverage, review official calendars, regenerate, run the checks, inspect transferred celebrations and optional commemorations, and increment the service-worker cache. `src/liturgical.js` contains pure navigation/display rules and `src/liturgical-ui.js` handles the independent calendar interface.
Personal fasts have independent **Start date** and **End date** fields; both default to the selected calendar day. During Lent, the violet seasonal card shows the year’s medal and seven progress marks.

On today's calendar, **Prepare for Lent** lets you save or revise the next Lent's intention before Ash Wednesday. It becomes available for check-ins when the season starts on your device's local calendar; browsing ahead never unlocks it. **Profile → Fasting history** lists ended fasts, intentions and the specific days marked, including fasts with no check-ins.
On **Profile**, the chapel artwork stays visible above four collapsible sections: appearance, fasting history, earned awards, and the full award catalog.
On Calendar, expand **Fasting** directly below the month to manage the selected day's fasts. Dates in your fasting plan are split diagonally between the season color and gold. This marks the schedule, not a check-in.
In the fasting panel, existing fasts and their check-ins appear first. Use **Plan a personal fast → Save fast** for your own practice; seasonal fasts have their own actions when available.
