# Odia Love Memories

A small Odia song collection with an **audio-only Spotify player**. Plain HTML,
CSS and JavaScript; no runtime packages, server account or paid hosting service.

## Run locally

Use Node.js 20+ for checks and Python 3.10+ for the local HTTP server.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. ES modules require an HTTP server, not a file URL.

## Listening

- The YouTube video section and YouTube API have been removed.
- Spotify loads only after an intentional song/player action.
- The official compact embed is 80px high and at least 280px wide. Provider
  controls remain visible. The supported compact layout uses audio when available.
- The app provides previous/next, shuffle, favorites, recent listening and stable
  song links. Spotify provides its own playback/progress controls.
- No app pause is issued for scrolling or switching tabs. Background/locked-device
  behavior still depends on Spotify, the browser and the operating system.
- **A matched source does not guarantee a free full song.** Signed-out live tests
  of Faguna Re Faguna and Jhum Jhum returned Spotify previews. Full tracks may
  require sign-in/account entitlement and depend on region/browser support.
- There is no automatic repeat/advance based on a preview cutoff. The documented
  Spotify Embed API has no reliable track-ended event. Manual next/previous work.
- No music is downloaded, extracted, proxied or rehosted by this repository.

## Source status

`sources.js` records seven matched Spotify catalogue entries, twelve clearly
labelled candidate recording links, and one unresolved original (E Banara Chhai).
Only confirmed title/known-artist matches are loaded into the player. Candidate
recordings never silently replace an original song; their credited artists are
shown when selected, and the visitor can inspect the official provider page.

See `docs/AUDIO_SOURCE_RESEARCH.md` for the twenty-song evidence table. Metadata
matches were checked against official Spotify/Apple pages. Actual preview
playback was separately tested for the two songs reported unavailable by the user.
Other recordings and full-length playback remain unverified.

For full-song native audio playback independent of Spotify, this project would
need audio files or stable direct audio URLs authorized for that use. Provider
page links do not grant rehosting rights. No such full-length sources are bundled.

## Maintenance

`catalog.js` preserves the original twenty entries and immutable slug IDs. Keep
that order for old `?song=2` links. New links use `?track=jhum-jhum`. Update
`sources.js` after checking an official track page, including its singer/album.
Do not promote an ambiguous same-title recording without confirming identity.
The inherited YouTube IDs remain historical data only; they are not requested.

Favorites/history remain in the visitor's browser with a safe temporary fallback
when storage is unavailable. Clear preferences removes only this app's key.

## Verification and build

```sh
npm run check
npm test
npm run build
```

The static `dist/` release excludes tests, original large PNGs and local artifacts.
The application modules and source registry are copied without a bundler.
Browser tooling is optional and has no effect on the published website:

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium firefox webkit
npm run test:browser
python tests/browser_test.py --browser firefox
python tests/browser_test.py --browser webkit
python tests/browser_test.py --release
```

Tests start an isolated localhost server under the GitHub Pages `/Odia_gita/`
subpath, mock Spotify responses and block other provider traffic. They do not
prove full-track entitlement. See `docs/VERIFICATION.md` for actual checks.

## Release and rollback

The source root and `dist/` remain static-site compatible with the existing
GitHub Pages address https://badalss.github.io/Odia_gita/. No Pages/billing/domain
settings are changed by this branch. Review before merging to the published
branch. Reverting the upgrade commits restores the previous release.

`ws_server.py` is an unused visitor-counter experiment and is excluded from the
release. The site has no live listener counter or database. Existing artwork is
retained with 94-95% smaller WebP versions. A code license would not license music.
