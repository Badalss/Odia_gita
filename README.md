# Odia Love Memories

A responsive Odia song collection using a compact, hidden YouTube iframe and
custom audio controls. YouTube determines playback availability and ads. No
music is hosted or downloaded by the application. Original YouTube IDs remain
unverified, including the two previously reported unavailable tracks.

The requested 1×1 hidden YouTube player does not meet YouTube's documented
200×200 minimum player size. It may stop working, be restricted, or show ads;
background playback depends on the browser and provider. It is not guaranteed
ad-free. Provider documentation: https://developers.google.com/youtube/terms/required-minimum-functionality

To run locally use `npm ci` and `npm run dev`, then visit
http://127.0.0.1:4173. Run `npm run check`, `npm test`, `npm run build` and
`npm run test:browser` for checks; optional browser tests require Python
Playwright from `requirements-dev.txt`. The website has no runtime dependencies.

Catalog entries and stable links are maintained in `catalog.js`; Spotify and
Apple links are retained as fallbacks. See `docs/AUDIO_SOURCE_RESEARCH.md` for
recording metadata and `docs/SOURCE_REVIEW.md` for the YouTube source limitations.
Favorites and history remain in local browser storage. The source root and
`dist/` can be hosted with GitHub Pages. This branch is not yet published.
