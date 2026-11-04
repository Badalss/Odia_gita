# Audio-only verification — 4 November 2026

> Follow-up player diagnosis: in the user's in-app browser, Faguna Re Faguna,
> Jhum Jhum, and Basinda each produced YouTube error 150. YouTube documents this
> as the uploader prohibiting embedding. The app now distinguishes this from
> invalid IDs, deleted videos, HTML5 failures and error 153. The observed
> Phulara Sahare source reported 46:31, consistent with the source listing it
> as the first track of a compilation; it has not been confirmed as a standalone
> song. These checks do not establish the status of the other songs.

> Historical Spotify implementation: the current branch now uses a hidden
> YouTube iframe at the user's request. The following Spotify results describe
> the prior implementation and should not be read as current player checks.

Branch: `codex/odia-listening-upgrade`. The public branch, Pages settings and
PurchaseShield working tree are unchanged.

## Current implementation

- Removed the entire YouTube/video section, loader and API calls.
- Added Spotify's official, fully visible 80px compact audio embed, minimum width
  280px. The original art is now a small static album illustration.
- Replaced inherited broken/unverified playback IDs with seven official Spotify
  title/known-artist catalogue matches. Twelve uncertain recordings have clearly
  labelled official candidate links. E Banara Chhai remains unresolved; an artist
  mismatch was rejected rather than silently substituted.
- Preserved favorites, search, recent actual playback, safe browser preferences,
  stable/legacy links, manual next/previous, shuffle and share fallbacks.
- Removed unsupported duplicate seek/volume/repeat controls. Spotify's native
  compact player owns its playback controls. The app does not infer track end or
  automatic repeat from a preview stopping.
- No application pause on hiding a tab or scrolling. No forced-resume loop,
  hidden video, stream extraction, third-party proxy or rehosting is used.

## Checks executed

- `npm run check`: JavaScript syntax passed, including the new source registry.
- `npm test`: all 11 Node regression tests passed.
- `npm run build`: the static release includes the source registry and excludes
  original PNGs, development files and artifacts.
- `npm run test:browser`: 12 audio workflow groups passed in Chromium 153.0.8010.12.
- `python tests/browser_test.py --browser firefox`: the same groups passed in
  Firefox 155.0.
- `python tests/browser_test.py --release`: the same 12 groups passed against the
  built static release in Chromium.
- `python tests/browser_test.py --browser webkit`: the same groups passed on the
  final source in Playwright WebKit 26.6 on Windows. An earlier transient 320px
  overflow failure was not reproduced by the final suite or ten repeated Terra
  resize checks. No speculative CSS fix is claimed.
- Terra inspected audio-only screenshots at 320/390/768/1440 and short landscape.
  The loaded iframe measured 288×80 at a 320px viewport. The suite checks enlarged
  root text and no horizontal overflow, with zero YouTube/video requests.

The browser suite uses mocked provider events to exercise actual playback state,
no false recent history on load, lazy loading without autoplay, latest-selection
races, retry, native pause state, stopping old audio on an unmatched selection,
storage denial/corruption, sharing and focus restoration. It does not play real
provider music or establish full-track entitlement.

## Real source check

Separate unmocked Chromium checks loaded the exact user-reported songs:

| Song | Official source | Observed provider behavior |
|---|---|---|
| Faguna Re Faguna | Spotify `4JFanZrSD5tDjDR2EKF7aq` | Provider emitted PLAYING; iframe explicitly displayed Preview, correct title and Babul Supriyo/Ira Mohanty credits |
| Jhum Jhum | Spotify `3fufhbcrcSxpkhj0SPF26j` | Provider emitted PLAYING; iframe explicitly displayed Preview, correct title and Kabita Krishna Murrti/Prosan Jeet credits |

Separate official playback-update observations confirmed advancing media time
for both: Faguna Re Faguna reached 1.739s of a 21.753s preview, and Jhum Jhum
reached 2.057s of a 29.713s preview. These establish preview progression only;
they do not establish full-song entitlement or audible output on another device.

No JavaScript page errors were observed. A canceled preview request was logged
for the first track; no full-song success is inferred from network loading or
metadata. Numeric progress observations, screenshots and JSON results are kept
in gitignored `artifacts/`.

## Limits and follow-up

These signed-out previews are not full songs. Full playback can depend on the
listener's account, region, browser DRM and provider entitlement. Neither this
site nor its tests remove those restrictions. Full native audio would require
authorized complete audio sources, which have not been supplied or established.

All twenty source identities were researched; seven are catalogue matches and
thirteen originals remain uncertain. See `AUDIO_SOURCE_RESEARCH.md` for primary
links and specific identity cautions. Metadata does not establish original
master equivalence. Physical phone/Safari and assistive-technology listening
checks are not claimed; WebKit on Windows is engine coverage only.

The earlier YouTube investigation in `SOURCE_REVIEW.md` is retained as historical
context; it no longer describes the current player or source status.
