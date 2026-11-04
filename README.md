# Odia Love Memories

A personal collection of twenty Odia songs. Plain HTML, CSS and JavaScript;
no account, application server, runtime packages, database or paid service.

## Run locally

Use Node.js 20+ for checks and Python 3.10+ for the local HTTP server.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. Use an HTTP server rather than opening `index.html`
as a file: browser modules, storage and YouTube origin identification require it.

## Features

- Visible YouTube video, loaded after an intentional Play or Load video action.
- Selecting a distant song reveals its video; scrolling or switching tabs does not make the site pause it.
- Search, favorites, recently played songs and readable source failure messages.
- Repeat off/all/one, shuffled queue with listening history and restored mute volume.
- Stable song links (`?track=jhum-jhum`); original `?song=2` links still resolve.
- Browser-local preferences with a temporary fallback if storage is unavailable.
- Responsive layout, keyboard help, native dialogs and reduced-motion support.

Favorites and history stay in this browser; there is no cross-device sync.
Clearing preferences removes only this site's namespaced preference entry.
YouTube provides video playback and may display ads or restrict availability.
The site does not download or cache music or extract audio. It leaves playback
to YouTube and the browser when you switch tabs or minimize the window, rather
than adding its own visibility-based pauses. Background or locked-screen
playback is not guaranteed: browser, operating-system and YouTube restrictions
still apply. YouTube's embed policies do not support offering background play
as a service feature: https://developers.google.com/youtube/terms/developer-policies-guide.
YouTube is not requested until the visitor chooses to load/play a video; external
listening links are available even when the embed fails.

## Catalogue maintenance

Edit `catalog.js`. Keep each permanent `id` unchanged after publication. Keep the
original twenty entries in their original order because legacy numbered links
use that order. New songs should be appended; update the displayed collection
count and the intentional twenty-entry assertion in `scripts/build.mjs` when
expanding the collection.

Use only an actual 11-character YouTube video ID, or `null` when no source is
known. Valid format does not mean the recording, credits, availability or
embedding permission is verified. Unknown artist credits are `null` and display
as "Artist unknown". Never guess a year, film or singer to fill a gap.

Optional `titleOdia` text is supported by search; add only reviewed spellings.
Film/year filters are intentionally deferred until enough verified metadata is
available. Source review status and current verification limits are documented
in `docs/SOURCE_REVIEW.md`.

## Verification

```sh
npm run check
npm test
npm run build
```

`npm run build` creates a dependency-free static release in `dist/`, excluding
tests, original large PNGs, Python utilities and local artifacts.

Browser tests use Python Playwright with a mocked YouTube API. Install the
optional development tooling, then run:

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium firefox webkit
npm run test:browser
python tests/browser_test.py --browser firefox
python tests/browser_test.py --browser webkit
python tests/browser_test.py --release
```

The browser script starts its own localhost server and tests a `/Odia_gita/`
mount, matching GitHub Pages project paths. It blocks third-party network
requests and simulates player events. Screenshots and results go in gitignored
`artifacts/`. Real playback must be checked separately; mocked tests cannot
establish whether a video is correct, playable or available in another region.
The `--release` option tests the built `dist/` files; run the build first.
See `docs/VERIFICATION.md` for the executed checks and remaining manual checks.

## Hosting and release

The existing public repository can use GitHub Pages at
https://badalss.github.io/Odia_gita/ without an additional hosting service.
GitHub's free-service limits still apply. No custom domain is needed.

The source root remains directly deployable with the repository's existing Pages
configuration. Before merging to the published branch, review the upgrade branch,
test locally, and confirm all required song sources on the intended devices.
Alternatively publish only the `dist/` artifact using a deliberate Pages workflow.
This project does not add an automatic publishing workflow or change Pages settings.

For rollback, revert the upgrade commit on the published branch and let the
existing Pages build finish; keep song IDs stable through later releases.
Browser-local data stays namespaced and is not uploaded.

`ws_server.py` is a legacy, unused visitor-counter experiment. The website does
not connect to it; it is excluded from the release. The inaccurate online count
and its external counting request have been removed from the UI.

The repository does not establish redistribution rights for the songs. Playback
uses YouTube sources; adding a code license would not license the recordings.
