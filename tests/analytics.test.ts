import assert from "node:assert/strict";
import test from "node:test";

import { GAME_EVENTS, trackGameEvent } from "../lib/analytics.ts";

test("sends a named game event and its non-identifying properties", () => {
  const calls: unknown[][] = [];
  const target = {
    umami: {
      track(...values: unknown[]) {
        calls.push(values);
      },
    },
  };

  assert.equal(
    trackGameEvent(
      GAME_EVENTS.rankReached,
      { puzzle: "2026-08-23", rank: "Great" },
      target,
    ),
    true,
  );
  assert.deepEqual(calls, [
    ["rank-reached", { puzzle: "2026-08-23", rank: "Great" }],
  ]);
});

test("silently skips analytics when the tracker is unavailable or fails", () => {
  assert.equal(
    trackGameEvent(GAME_EVENTS.puzzleEngaged, { puzzle: "2026-08-23" }, {}),
    false,
  );
  assert.equal(
    trackGameEvent(
      GAME_EVENTS.puzzleEngaged,
      { puzzle: "2026-08-23" },
      {
        umami: {
          track() {
            throw new Error("blocked");
          },
        },
      },
    ),
    false,
  );
});

test("exposes the score sharing event name", () => {
  assert.equal(GAME_EVENTS.scoreShared, "score-shared");
});
