# RBC Studio

RBC Studio is a static, local-first campaign workspace for RareBagClub. It turns one documented archive piece into coordinated visual and copy packs for Instagram, TikTok, Telegram, Threads and X.

## Run and deploy

There is no build command and no required API.

- Local preview: serve this directory over HTTP, for example `python -m http.server 8080`, then open `http://localhost:8080`.
- Netlify: deploy the repository root. `netlify.toml` sets the publish directory and cache/security headers.
- Phone install: open the HTTPS Netlify URL and use the browser's Add to Home Screen action.

Do not deploy only `index.html`. The PWA and module graph also require `css/`, `js/`, `sw.js`, `manifest.webmanifest`, `icon.svg` and `apple-touch-icon.png`.

## Data model

- Campaign briefs, outputs, readiness, posted state, schedule and canvas positions are saved in `localStorage` as separate campaign records.
- Bag and mood-image blobs are saved per campaign in IndexedDB.
- Existing version 5 single-campaign data migrates into the library on first load.
- Data remains in the current browser profile. There is no cloud account or server database.

## Optional AI polish

Deterministic copy generation is always available offline. AI polish is optional, off by default and uses a user-provided Anthropic API key stored only in that browser. Removing the key disables the network-backed option without affecting the app.

## Architecture

- `index.html`: accessible application structure
- `css/studio.css`: internal tool design system and responsive layout
- `js/app.js`: application wiring
- `js/canvas.js`: canvas interaction, rendering and PNG export
- `js/state.js`: campaign-library persistence and migration
- `js/images.js`: IndexedDB media persistence and downscaling
- `js/facts.js`: verified fact model, copy helpers and linting
- `js/copy/`: one deterministic generator per platform
- `js/templates/`: shared primitives, registry and one module per treatment
- `js/validation.js`: grapheme-aware platform validation
- `js/zip.js`: dependency-free store-only ZIP writer
- `js/calendar.js`: calendar export
- `js/ai.js`: optional Anthropic polish integration

## Verification

No packages are required:

```powershell
node tests/unit.mjs
node tests/browser-e2e.cjs
```

The browser suite uses installed Microsoft Edge and a loopback-only temporary server. It covers campaign creation/duplication, IndexedDB image reload, keyboard canvas movement, platform warnings, posted state and ZIP contents.
