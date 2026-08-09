# Seven Word Puzzle

The web-game prototype for a British-English seven-letter word puzzle. **Seven**
is a neutral working name; the final brand and visual themes are still to be
decided.

Puzzle dictionary generation and candidate curation live in the separate
[Spelling-Bee](https://github.com/mikej340/Spelling-Bee) repository.

## Current state

- React and TypeScript interface built with Vinext
- static, UTC-dated puzzle schedule with a two-day initial archive
- dedicated all-puzzles page with progress and rank previews
- client-side scoring, ranks, pangram detection and completion summary
- versioned, validated per-puzzle device-local progress with legacy migration
- Sites project binding retained in `.openai/hosting.json`

The app fetches `public/puzzles/manifest.json` first, then the relevant monthly
shard (for example `public/puzzles/2026-08.json`). The root URL selects today in
UTC, while `/?date=YYYY-MM-DD` opens a released historic puzzle. Returning to a
foregrounded root page after midnight refreshes the selected puzzle; no service
worker or server is required.

Open product decisions are recorded in `TODO.md`. Original Site import details
are recorded in `SOURCE.md`.

## Development

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
npm run test:pages
```

The deployment build targets the Sites/Cloudflare Worker runtime. Its bundled
build wrapper expects GNU `timeout`, so it is designed for the Linux deployment
environment rather than native macOS.

## GitHub Pages

The game can also be built as a static site for the repository Pages URL:

<https://mikej340.github.io/seven/>

```sh
npm run build:pages
npm run test:pages
```

The static files are written to `out/`, with asset URLs based at `/seven`.
`.github/workflows/pages.yml` builds and deploys that directory whenever a
change reaches `main`, or when the workflow is run manually. In the repository
settings, Pages must use **GitHub Actions** as its source.
