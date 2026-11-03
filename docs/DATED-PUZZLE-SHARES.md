# Dated puzzle shares

The first share page is `/daily/2026-11-03/`, with its production image at
`public/social/2026-11-03.png`. Both are maintained manually for now.

## Current implementation

- `app/daily/2026-11-03/page.tsx` supplies static canonical, Open Graph and
  Twitter metadata. Keep the image dimensions in metadata equal to the PNG.
- Its client component calls `usePuzzleGame("2026-11-03")`. The explicit date
  takes precedence over query parameters and prevents automatic selection of
  another puzzle after midnight. Existing puzzle IDs and saved progress are
  shared with the normal game.
- `GameView` opts into a past-puzzle banner linking to the homepage. The date
  comparison uses the existing UTC clock and updates on visibility changes.
- The homepage retains its generic social card. Existing `/?date=...` URLs
  continue working, but cannot serve date-specific metadata on GitHub Pages:
  query parameters do not select a different static HTML file.

## Card design

Use the committed PNG as the visual reference: warm ivory background, centred
botanical letter wheel, date at the top right, no Seven wordmark, a thin sage
rule above the footer, and “Try today’s puzzle at playseven.uk” below it, with
the domain in plum. Show six outer letters and the required centre letter.
The current PNG is 1731 × 909; future output can standardise on 1200 × 630.

## Future automation

Generate dated HTML pages and PNGs when publishing the puzzle schedule, rather
than rebuilding daily. Read dates, letters and centre letters from
`public/puzzles/manifest.json`; monthly shards supply the playable puzzles.
Use a static route per date, for example an App Router `[date]` route with
`generateStaticParams`, while retaining the existing client-side release check.

Render a deterministic image template using the existing botanical wheel styles
(`app/_game/letter-wheel.tsx` and `app/globals.css`) so cards do not require AI
generation. Keep each page's canonical/OG URL and PNG URL specific to its date;
do not replace one shared image each day. Prepublished future files being
publicly accessible is acceptable. No server or daily deployment is required.

`tests/daily-puzzle-export.test.mjs` currently checks this one page, both social
image tags, PNG dimensions and the scheduled letters. Generalise those checks
to all generated dates when automating. Run `npm run test:root` and
`npm run test:pages` to verify both deployments and their different base paths.
