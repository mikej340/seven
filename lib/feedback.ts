import type { PuzzleManifestEntry } from "./puzzles";
import type { ReviewedWordOutcome, ReviewedWords } from "./reviewed-words";

export type FeedbackKind = "general" | "word";

export type FeedbackDraft = {
  kind: FeedbackKind;
  puzzleDate: string;
  name: string;
  email: string;
  message: string;
  suggestedWord: string;
};

export type FeedbackErrors = Partial<
  Record<"puzzleDate" | "email" | "message" | "suggestedWord", string>
>;

export const NO_PUZZLE = "not-specific";

export const normalizeSuggestedWord = (word: string) => word.trim().toUpperCase();

export function parseFeedbackPrefill(
  search: string,
  entries: PuzzleManifestEntry[],
  fallbackDate: string,
) {
  const params = new URLSearchParams(search);
  const requestedDate = params.get("puzzle");
  const puzzleDate = entries.some((entry) => entry.date === requestedDate)
    ? requestedDate as string
    : fallbackDate;
  const kind: FeedbackKind = params.get("type") === "word" ? "word" : "general";

  return {
    kind,
    puzzleDate,
    suggestedWord: kind === "word"
      ? normalizeSuggestedWord(params.get("word") ?? "").slice(0, 18)
      : "",
  };
}

// Why a reviewed word has its outcome. The feedback form and the game's
// "Why not?" popup share this wording; the word appears exactly once.
export function explainReviewedWord(word: string, outcome: ReviewedWordOutcome): string {
  switch (outcome) {
    case "accepted":
      return `${word} is already in the word list. It was added after some puzzles were set, so it doesn’t score in those.`;
    case "american-english":
      return `Seven uses British English, so we don’t include American spellings or words mainly used in the US. ${word} has been reviewed and isn’t accepted.`;
    case "proper-noun":
      return `Seven doesn’t include proper nouns, such as names of people, places or brands. ${word} has been reviewed and isn’t accepted.`;
    case "rejected":
      return `We’ve already reviewed ${word} and decided not to include it.`;
  }
}

// Words the editor has already reviewed are explained instead of being sent
// again, whether typed into the form or prefilled from elsewhere.
export function reviewedWordMessage(value: string, reviewedWords: ReviewedWords) {
  const word = normalizeSuggestedWord(value);
  const outcome = reviewedWords.get(word);
  return outcome === undefined ? null : explainReviewedWord(word, outcome);
}

export function validateSuggestedWord(
  value: string,
  puzzle: PuzzleManifestEntry | undefined,
  reviewedWords: ReviewedWords = new Map(),
) {
  const word = normalizeSuggestedWord(value);
  if (!puzzle) return "Choose the puzzle this word is for.";
  if (!/^[A-Z]+$/.test(word)) return "Use letters only.";
  if (word.length < 4) return "Suggested words must be at least 4 letters.";
  if (word.length > 18) return "Suggested words can be no more than 18 letters.";

  const allowed = new Set(puzzle.letters.toUpperCase());
  if ([...word].some((letter) => !allowed.has(letter))) {
    return "Use only letters from the selected puzzle.";
  }
  if (!word.includes(puzzle.centre.toUpperCase())) {
    return `The word must include ${puzzle.centre.toUpperCase()}, the centre letter.`;
  }
  return reviewedWordMessage(word, reviewedWords);
}

export function validateFeedback(
  draft: FeedbackDraft,
  entries: PuzzleManifestEntry[],
  reviewedWords: ReviewedWords = new Map(),
): FeedbackErrors {
  const errors: FeedbackErrors = {};
  const email = draft.email.trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address, or leave this blank.";
  }

  if (draft.kind === "general") {
    if (!draft.message.trim()) errors.message = "Tell us what you think.";
  } else {
    const puzzle = entries.find((entry) => entry.date === draft.puzzleDate);
    if (!puzzle) errors.puzzleDate = "Choose the puzzle this word is for.";
    const wordError = validateSuggestedWord(draft.suggestedWord, puzzle, reviewedWords);
    if (wordError) errors.suggestedWord = wordError;
  }

  return errors;
}
