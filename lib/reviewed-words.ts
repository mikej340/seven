import { PUZZLE_BASE_PATH } from "./puzzles.ts";

// Player suggestions the editor has reviewed, with each word's current outcome.
// Published by the generator as public/puzzles/reviewed-words.json. Answers
// are fixed per puzzle, so "accepted" means the word was added after an older
// puzzle was set.
export type ReviewedWordOutcome = "accepted" | "rejected" | "american-english" | "proper-noun";

/** Uppercase word → outcome. */
export type ReviewedWords = ReadonlyMap<string, ReviewedWordOutcome>;

export const NO_REVIEWED_WORDS: ReviewedWords = new Map();

const OUTCOMES: ReadonlySet<unknown> = new Set([
  "accepted",
  "rejected",
  "american-english",
  "proper-noun",
]);

export function parseReviewedWords(value: unknown): ReviewedWords {
  const data = value as { schemaVersion?: unknown; words?: unknown } | null;
  if (
    data === null ||
    typeof data !== "object" ||
    data.schemaVersion !== 1 ||
    data.words === null ||
    typeof data.words !== "object" ||
    Array.isArray(data.words)
  ) {
    return NO_REVIEWED_WORDS;
  }
  const words = new Map<string, ReviewedWordOutcome>();
  for (const [word, outcome] of Object.entries(data.words)) {
    if (/^[a-z]{4,}$/.test(word) && OUTCOMES.has(outcome)) {
      words.set(word.toUpperCase(), outcome as ReviewedWordOutcome);
    }
  }
  return words;
}

// The list only refines messages, so a missing or unreadable file must never
// stop a puzzle or the feedback form from loading.
export async function loadReviewedWords(): Promise<ReviewedWords> {
  try {
    const response = await fetch(`${PUZZLE_BASE_PATH}/puzzles/reviewed-words.json`, {
      cache: "no-cache",
    });
    return response.ok ? parseReviewedWords(await response.json()) : NO_REVIEWED_WORDS;
  } catch {
    return NO_REVIEWED_WORDS;
  }
}
