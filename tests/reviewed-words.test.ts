import assert from "node:assert/strict";
import test from "node:test";

import { NO_REVIEWED_WORDS, parseReviewedWords } from "../lib/reviewed-words.ts";

test("reads reviewed words as uppercase lookups", () => {
  const reviewed = parseReviewedWords({
    schemaVersion: 1,
    words: { donut: "american-english", gonk: "accepted", kenk: "rejected" },
  });
  assert.deepEqual([...reviewed], [
    ["DONUT", "american-english"],
    ["GONK", "accepted"],
    ["KENK", "rejected"],
  ]);
});

test("ignores unknown outcomes and malformed words so newer data cannot break play", () => {
  const reviewed = parseReviewedWords({
    schemaVersion: 1,
    words: { gonk: "accepted", zorb: "australian", "no": "rejected", "café": "rejected", Kenk: "rejected" },
  });
  assert.deepEqual([...reviewed], [["GONK", "accepted"]]);
});

test("treats unsupported files as an empty list", () => {
  for (const value of [null, "words", [], { schemaVersion: 2, words: {} }, { schemaVersion: 1, words: [] }]) {
    assert.equal(parseReviewedWords(value), NO_REVIEWED_WORDS);
  }
});
