import assert from "node:assert/strict";
import test from "node:test";

import {
  NO_PUZZLE,
  normalizeSuggestedWord,
  parseFeedbackPrefill,
  validateFeedback,
  validateSuggestedWord,
  type FeedbackDraft,
} from "../lib/feedback.ts";
import type { PuzzleManifestEntry } from "../lib/puzzles.ts";

const entries: PuzzleManifestEntry[] = [
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
];

const draft = (overrides: Partial<FeedbackDraft> = {}): FeedbackDraft => ({
  kind: "general",
  puzzleDate: NO_PUZZLE,
  name: "",
  email: "",
  message: "Useful feedback",
  suggestedWord: "",
  ...overrides,
});

test("prefills a valid contextual word suggestion", () => {
  assert.deepEqual(
    parseFeedbackPrefill(
      "?type=word&puzzle=2026-08-08&word=moth",
      entries,
      "2026-08-09",
    ),
    { kind: "word", puzzleDate: "2026-08-08", suggestedWord: "MOTH" },
  );
});

test("falls back from unknown puzzle dates and ignores words in general mode", () => {
  assert.deepEqual(
    parseFeedbackPrefill(
      "?puzzle=2099-01-01&word=moth",
      entries,
      "2026-08-09",
    ),
    { kind: "general", puzzleDate: "2026-08-09", suggestedWord: "" },
  );
});

test("normalises suggested words without hiding invalid characters", () => {
  assert.equal(normalizeSuggestedWord("  mo-th  "), "MO-TH");
});

test("enforces the selected puzzle rules", () => {
  assert.equal(validateSuggestedWord("moth", entries[0]), null);
  assert.match(validateSuggestedWord("hat", entries[0]) ?? "", /at least 4/);
  assert.match(validateSuggestedWord("boat", entries[0]) ?? "", /centre letter/);
  assert.match(validateSuggestedWord("mother!", entries[0]) ?? "", /letters only/);
  assert.match(validateSuggestedWord("mouth", entries[0]) ?? "", /selected puzzle/);
});

test("requires only the fields relevant to the selected feedback type", () => {
  assert.deepEqual(validateFeedback(draft({ message: "" }), entries), {
    message: "Tell us what you think.",
  });
  assert.deepEqual(
    validateFeedback(draft({ kind: "word", puzzleDate: "2026-08-08", message: "", suggestedWord: "moth" }), entries),
    {},
  );
  assert.ok(validateFeedback(draft({ email: "not-an-email" }), entries).email);
});
