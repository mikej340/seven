import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PuzzleDate } from "../app/_game/puzzle-date";
import { PUZZLE_BASE_PATH } from "../lib/puzzles.ts";

test("historic date links work in the score panel and the completion heading", () => {
  for (const tag of ["legend", "p"] as const) {
    // A pinned puzzle's selection may still say isToday after UTC midnight;
    // the updated historic state takes precedence over that original selection.
    for (const isToday of [false, true]) {
      const html = renderToStaticMarkup(<PuzzleDate as={tag} date="2026-11-03" isToday={isToday} isPastPuzzle />);
      assert.ok(html.startsWith(`<${tag} `));
      assert.ok(html.includes('<time dateTime="2026-11-03">3 November 2026</time>'));
      assert.ok(html.includes(`<a href="${PUZZLE_BASE_PATH}/">Play today’s puzzle →</a>`));
      assert.equal([...html.matchAll(/<time /g)].length, 1);
    }
  }
});

test("today's puzzle keeps its score-panel date and completion label without the historic link", () => {
  const legend = renderToStaticMarkup(<PuzzleDate as="legend" date="2026-11-03" isToday isPastPuzzle={false} />);
  assert.ok(legend.includes("3 November 2026"));
  assert.ok(!legend.includes("<a "));
  assert.equal(renderToStaticMarkup(<PuzzleDate date="2026-11-03" isToday isPastPuzzle={false} />), '<p class="puzzle-date">Today</p>');
});
