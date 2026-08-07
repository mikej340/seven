# Seven Word Puzzle

The web-game prototype for a British-English seven-letter word puzzle. **Seven**
is a neutral working name; the final brand and visual themes are still to be
decided.

Puzzle dictionary generation and candidate curation live in the separate
[Spelling-Bee](https://github.com/mikej340/Spelling-Bee) repository.

## Current state

- React and TypeScript interface built with Vinext
- one hardcoded M-centred `ABHMORT` puzzle
- client-side scoring, ranks, pangram detection and completion summary
- no persistent saved-game state yet
- Sites project binding retained in `.openai/hosting.json`

Open product decisions are recorded in `TODO.md`. Original Site import details
are recorded in `SOURCE.md`.

## Development

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

The deployment build targets the Sites/Cloudflare Worker runtime. Its bundled
build wrapper expects GNU `timeout`, so it is designed for the Linux deployment
environment rather than native macOS.
