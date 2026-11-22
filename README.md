# Odia Love Memories

A single-page archive of twenty Odia romantic songs, played through the YouTube IFrame Player API.

Live site: https://badalss.github.io/Odia_gita/

## Run locally

It is a static site with no build step. Serve the folder over HTTP (the YouTube player does not work from `file://`):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html` — markup
- `styles.css` — styles
- `script.js` — track list, player and playlist logic
- `assets/` — background artwork and the social share image

## Editing the track list

Tracks live in the `tracks` array at the top of `script.js`. Each entry takes a title, an artist and a `youtubeId` (the 11-character ID from the video URL).

## Deploy

GitHub Pages serves the `main` branch from the repository root.
