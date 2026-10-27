import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveGameStats,
  evaluateWord,
  MAX_WORD_LENGTH,
  preparePuzzle,
  scoreWord,
} from "../lib/game-rules.ts";
import { loadGameProgress, saveGameProgress, type StorageAdapter } from "../lib/game-save.ts";
import { RANKS, type DailyPuzzle } from "../lib/puzzles.ts";

const puzzle: DailyPuzzle = {
  id: "2026-08-08",
  date: "2026-08-08",
  letters: "abhmort",
  centre: "m",
  answers: ["moth", "motor", "bathroom"],
  pangrams: ["bathroom"],
  maximumScore: 21,
};
const rules = preparePuzzle(puzzle);

test("prepares uppercase letters and lookups without changing source order or data", () => {
  assert.equal(rules.centreLetter, "M");
  assert.deepEqual(rules.puzzleLetters, ["A", "B", "H", "M", "O", "R", "T"]);
  assert.deepEqual(rules.solutionWords, ["MOTH", "MOTOR", "BATHROOM"]);
  assert.ok(rules.solutionWordSet.has("MOTH"));
  assert.ok(rules.pangramWordSet.has("BATHROOM"));
  assert.equal(puzzle.answers[0], "moth");
  assert.equal(MAX_WORD_LENGTH, 18);
});

test("evaluates each rejection and prompt with the existing validation order and wording", () => {
  const cases = [
    ["", [], "empty", "prompt", "Build a word first"],
    ["hat", ["HAT"], "too-short", "rejected", "Too short"],
    ["boat", ["BOAT"], "missing-centre", "rejected", "Must include M"],
    ["moth", ["MOTH"], "duplicate", "prompt", "Already found"],
    ["mammam", [], "unrecognised", "rejected", "Not accepted"],
  ] as const;
  for (const [word, found, outcome, kind, message] of cases) {
    const result = evaluateWord(word, found, rules);
    assert.equal(result.outcome, outcome);
    assert.deepEqual(result.feedback, {
      kind,
      message,
      ...(word ? { word: word.toUpperCase() } : {}),
    });
  }
});

test("scores four-letter words, longer words and pangrams consistently", () => {
  for (const [word, points, pangram] of [["moth", 1, false], ["motor", 5, false], ["bathroom", 15, true]] as const) {
    assert.equal(scoreWord(word, rules), points);
    const result = evaluateWord(word, [], rules);
    assert.equal(result.outcome, "accepted");
    if (result.outcome !== "accepted") throw new Error("Expected accepted word");
    assert.equal(result.word, word.toUpperCase());
    assert.equal(result.points, points);
    assert.equal(result.isPangram, pangram);
    assert.equal(result.feedback.kind, pangram ? "pangram" : "accepted");
    assert.equal(result.feedback.message, pangram
      ? "Pangram! BATHROOM · +15 points"
      : `${word.toUpperCase()} is correct · +${points} ${points === 1 ? "point" : "points"}`);
  }
});

test("derives progress and only awards Queen Bee for completion", () => {
  assert.equal(deriveGameStats([], rules).score, 0);
  const partial = deriveGameStats(["BATHROOM"], rules);
  assert.equal(partial.currentRank.name, "Genius");
  assert.equal(partial.nextRankScore, 21);
  assert.equal(partial.nextRankText, "6 points to Queen Bee");
  const complete = deriveGameStats(["MOTH", "MOTOR", "BATHROOM"], rules);
  assert.equal(complete.score, 21);
  assert.equal(complete.gameComplete, true);
  assert.equal(complete.currentRank.name, "Queen Bee");
  assert.equal(complete.progress, 1);
  assert.equal(complete.nextRankText, "Every word found");
  const staleMaximum = { ...rules, maximumScore: 1 };
  assert.equal(deriveGameStats(["BATHROOM"], staleMaximum).currentRank.name, "Genius");
  assert.equal(deriveGameStats(["BATHROOM"], staleMaximum).progress, 0.99);
});

test("keeps every non-completion rank boundary and next-rank threshold", () => {
  const letters = "ABHOMRT";
  const answers = Array.from({ length: 100 }, (_, index) =>
    `M${index.toString(7).padStart(3, "0").replace(/[0-6]/g, (digit) => letters[Number(digit)])}`,
  );
  const boundaryRules = preparePuzzle({ ...puzzle, answers, pangrams: [], maximumScore: 100 });
  for (let index = 1; index < RANKS.length - 1; index++) {
    const rank = RANKS[index];
    const threshold = Math.ceil(rank.threshold * 100);
    const at = deriveGameStats(boundaryRules.solutionWords.slice(0, threshold), boundaryRules);
    assert.equal(at.currentRank.name, rank.name);
    assert.equal(at.nextRankScore, Math.ceil(RANKS[index + 1].threshold * 100));
    const below = deriveGameStats(boundaryRules.solutionWords.slice(0, threshold - 1), boundaryRules);
    assert.equal(below.currentRank.name, RANKS[index - 1].name);
  }
});

test("restored progress and new submissions use the same scorer", () => {
  const values = new Map<string, string>();
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
  const score = (word: string) => scoreWord(word, rules);
  saveGameProgress(storage, puzzle.id, ["moth", "BATHROOM", "MOTH", "INVALID"], rules.solutionWordSet, score);
  const restored = loadGameProgress(storage, puzzle.id, rules.solutionWordSet, score);
  const newWord = evaluateWord("motor", restored.foundWords, rules);
  assert.equal(newWord.outcome, "accepted");
  if (newWord.outcome !== "accepted") throw new Error("Expected accepted word");
  assert.equal(restored.score, 16);
  const words = [newWord.word, ...restored.foundWords];
  assert.deepEqual(words, ["MOTOR", "MOTH", "BATHROOM"]);
  assert.equal(deriveGameStats(words, rules).score, restored.score + newWord.points);
});
