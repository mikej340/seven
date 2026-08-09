import assert from "node:assert/strict";
import test from "node:test";

import {
  rankForScore,
  resolvePuzzleSelection,
  utcDateString,
  type PuzzleManifest,
} from "../lib/puzzles.ts";

const manifest: PuzzleManifest = {
  schemaVersion: 1,
  timeZone: "UTC",
  startDate: "2026-08-08",
  endDate: "2026-08-09",
  source: {
    dictionarySha256: "test",
    scowlRelease: "test",
    frequencySource: "test",
  },
  entries: [
    {
      id: "2026-08-08",
      date: "2026-08-08",
      month: "2026-08",
      letters: "abhmort",
      centre: "m",
      wordCount: 42,
      pangramCount: 1,
      maximumScore: 150,
    },
    {
      id: "2026-08-09",
      date: "2026-08-09",
      month: "2026-08",
      letters: "cehiknt",
      centre: "k",
      wordCount: 35,
      pangramCount: 3,
      maximumScore: 154,
    },
  ],
};

test("uses UTC rather than local calendar boundaries", () => {
  assert.equal(utcDateString(new Date("2026-08-09T00:00:00.000Z")), "2026-08-09");
  assert.equal(utcDateString(new Date("2026-08-08T23:59:59.999Z")), "2026-08-08");
});

test("selects today and released historical puzzles", () => {
  assert.deepEqual(resolvePuzzleSelection(manifest, null, "2026-08-09"), {
    date: "2026-08-09",
    isToday: true,
    notice: null,
  });
  assert.deepEqual(resolvePuzzleSelection(manifest, "2026-08-08", "2026-08-09"), {
    date: "2026-08-08",
    isToday: false,
    notice: null,
  });
});

test("rejects unavailable dates and handles schedule expiry", () => {
  assert.match(
    resolvePuzzleSelection(manifest, "2026-08-10", "2026-08-09").notice ?? "",
    /not available/,
  );
  const expired = resolvePuzzleSelection(manifest, null, "2026-08-10");
  assert.equal(expired.date, "2026-08-09");
  assert.match(expired.notice ?? "", /not been published/);
});

test("derives rank from saved score and completion", () => {
  assert.equal(rankForScore(77, 154).rank.name, "Amazing");
  assert.equal(rankForScore(154, 154, true).rank.name, "Queen Bee");
});
