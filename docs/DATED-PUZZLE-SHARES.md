# Dated puzzle shares

Every date in `public/puzzles/manifest.json` has a static share page at
`/daily/YYYY-MM-DD/` and a PNG at `/social/YYYY-MM-DD.png`. They are prepared
with the puzzle release; no server, daily job or daily deployment is needed.

## Prepare a release

After copying the approved puzzle export into `public/puzzles/`:

```sh
npm ci
npx playwright install chromium
npm run cards:generate
npm run test:pages
npm run test:root
```

Commit the intended puzzle changes, new `public/social/*.png` files and the
updated `public/social/manifest.json`. Existing dated images are preserved,
including the original manually designed 3 November 2026 card. Generation
only renders missing dates. If an existing card's puzzle inputs or image bytes
have changed, it stops rather than replacing the published snapshot.

After committing, prepare Markdown for the release PR description:

```sh
npm run --silent cards:preview -- --date YYYY-MM-DD
```

Choose at least one newly generated card from the release. Without `--date`,
the command selects the final date in the card manifest. Paste its output into
the PR description and push the commit: the embedded image uses the exact
commit SHA so it can be reviewed before the site is deployed. The command
refuses an image that has not been committed. Check at least one card manually
before merging; leave its checkbox unchecked until the editor has done so.
A new release does not require an A–Z run or a visual review of every card.

## Rendering and data

- `app/daily/[date]/page.tsx` reads the exported schedule and card manifest at
  build time. `generateStaticParams` creates the dated routes; titles,
  descriptions, alt text and image dimensions come from the same inputs.
  A missing card blocks the build with the generation command to run.
- `scripts/generate-social-cards.tsx` renders a fixed 1200 × 630 HTML card to
  PNG using the pinned Playwright Chromium release. The frame supplies the date,
  warm ivory background, sage rule and plum domain in the footer.
- The renderer uses the actual `LetterWheel` React component and
  `app/_game/letter-wheel.css`, also imported by the game. `puzzleWheelLetters`
  supplies the same initial ordering in both places. Interactive shuffling
  affects only the game. Card geometry is fixed instead of viewport-dependent.
- The font is bundled Lato Bold, licensed under the SIL Open Font License in
  `scripts/assets/OFL-Lato.txt`. Its source is the Google Fonts repository:
  <https://github.com/google/fonts/tree/main/ofl/lato>. No remote assets or AI
  generation are involved in rendering. The card manifest records a SHA-256 of
  each PNG and the template inputs used to render it.
- The original 1731 × 909 PNG is retained at its original URL and dimensions.
  Changes to the template apply to subsequently generated cards.

The dated client calls `usePuzzleGame(date)`. Its date takes precedence over
query parameters, stays pinned across midnight, and shares progress with
`/?date=YYYY-MM-DD` on the same origin. A past-puzzle notice links to today's
puzzle. The existing client-side release selection remains in place.
Prepublished future pages and card files are publicly accessible, as with the
exported schedule. The homepage retains its generic social card, and invitation
and score-sharing behaviour are unchanged.

## Verification

`tests/daily-puzzle-export.test.mjs` checks the complete exported schedule:
page metadata, canonical and asset URLs, card inputs, PNG dimensions and hashes.
Run both deployment tests because `/seven` and the root domain use different
asset paths. Unit tests cover preserving snapshots, repeated generation and
preview Markdown. Deployment builds consume committed cards and do not launch
Chromium.

The optional commissioning check exercises A–Z in all seven positions:

```sh
npm run cards:check-alphabet
```

It writes 26 example PNGs and a geometry report to the ignored
`output/card-alphabet/` directory and checks 182 glyph placements. It is not
part of the weekly release or normal test suite. Repeat it if the wheel or font
changes. The initial implementation passed this check; regular releases use the
manual PR preview check described above.
