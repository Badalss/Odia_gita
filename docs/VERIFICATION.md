# Upgrade verification — 4 November 2026

Implementation branch: `codex/odia-listening-upgrade`.
Baseline: `c651fd72ceef6619e32a2565eae412729d3c33bb`.

The existing public site has not been replaced. No Pages configuration, billing,
domain, database or external service account was changed. PurchaseShield's
separate working tree was not edited.

## Implemented scope

| Planned area | Delivered |
|---|---|
| Baseline/catalogue | Desktop/mobile baseline captures; twenty original entries with stable IDs, strict numbered/permanent links, validated source format and explicit unverified status |
| Playback | Visible iframe, lazy API, cue without autoplay, accurate state feedback, retry/timeouts, race fencing, repeat modes, shuffle history, volume restore, offline and offscreen pause |
| Design/accessibility | Responsive maroon/cream/gold design, original artwork, semantic song list, native dialogs with explicit focus restoration, labelled controls, visible focus and reduced-motion styling |
| Personal features | Favorites, recently played after real PLAYING events, last selection/mode/volume preferences, safe temporary fallback, namespaced clear, native/clipboard/manual sharing |
| Performance/presentation | Local fonts, optimized backgrounds, favicon, sharing image, metadata, helpful 404 and static release build |
| Maintenance | README, catalogue guidance, npm lockfile, pure logic tests and reproducible provider-mocked browser regression suite |

## Executed checks

| Command/check | Observed result |
|---|---|
| `npm run check` | All three application JavaScript modules passed syntax checks |
| `npm test` | 11 Node tests passed, 0 failed |
| `npm run build` | Static `dist/` release created, with no runtime dependencies |
| `npm run test:browser` | 14 workflow groups passed in Chromium 153.0.8010.12 |
| `python tests/browser_test.py --browser firefox` | Same 14 groups passed in Firefox 155.0 |
| `python tests/browser_test.py --browser webkit` | Same 14 groups passed in Playwright WebKit 26.6 on Windows |
| `python tests/browser_test.py --release` | Same 14 groups passed against the built `dist/` release in Chromium |
| `git diff --check` | Passed after removing a trailing blank line |
| Real, unmocked YouTube initialization | API request failed `net::ERR_CERT_AUTHORITY_INVALID`; retry and external links appeared, with no JavaScript page error |
| Initial page network | No third-party request before intentional video load/play |
| Existing Pages address | HTTPS HEAD returned 200; deployment settings were not changed |

The browser groups exercise search/empty states, favorites persistence, actual
play-event history, keyboard/dialog focus, play/pause/seek/volume, repeat modes,
shuffled history, iframe visibility, distant mobile selection/offscreen pause,
embedding errors/retry, API failures, delayed startup, offline/retry races,
strict links, storage denial/corruption, namespaced clear and manual sharing.

All automated player responses are mocked. They do not request or play music
from a provider. Tests run under the `/Odia_gita/` project subpath and take
screenshots at 320×740, 390×844, 768×1024, 1440×1000 and 844×390, plus a check
with 200% root font size. No horizontal overflow was observed. The loaded
iframe was additionally inspected at 288×200 in a 320px viewport.

Terra inspected populated desktop/mobile screenshots and fixed wrapping, touch
targets, the pause icon and a selector that initially hid the real iframe.
Root also inspected the desktop/mobile output against the baseline.

## Image measurements

| Background | Original PNG | Optimized WebP | Reduction |
|---|---:|---:|---:|
| Desktop | 2,482,634 bytes | 155,938 bytes | 93.72% |
| Mobile | 2,442,892 bytes | 116,672 bytes | 95.22% |

Original PNGs remain in source for provenance; the release build excludes them.
These measurements describe assets, not an invented Lighthouse score or a
guaranteed speed improvement on every network.

## Remaining external/manual verification

- Confirm all twenty recordings and embedding permissions on a network that can
  access YouTube. Every direct metadata request here failed TLS validation.
- Review inherited artist credits and add accurate Odia titles/film/year data.
  No spelling, year, film or recording replacement was invented. Film/year
  filters are deferred until verified metadata supports them.
- Check a physical iPhone/Android device and actual Safari. Playwright WebKit on
  Windows is engine coverage, not a physical Safari/device test.
- Conduct assistive-technology listening checks if needed; keyboard, semantic
  labels and dialog behaviour were checked, but no complete accessibility
  certification or screen-reader audit is claimed.
- Review the branch before merging to the published branch. Successful mocked
  tests do not remove YouTube's region, embedding or browser playback limits.

See `SOURCE_REVIEW.md` for per-song verification status. Local screenshots,
network observations and JSON test results are in gitignored `artifacts/`.
