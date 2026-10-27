import { rankForScore, RANKS, type DailyPuzzle } from "./puzzles.ts";

export const MAX_WORD_LENGTH = 18;

export type PreparedPuzzle = {
  centreLetter: string;
  puzzleLetters: string[];
  solutionWords: string[];
  solutionWordSet: ReadonlySet<string>;
  pangramWordSet: ReadonlySet<string>;
  maximumScore: number;
};

export type SubmissionFeedback = {
  kind: "accepted" | "pangram" | "rejected" | "prompt";
  message: string;
  word?: string;
  points?: number;
};

export type GameFeedback = SubmissionFeedback & { id: number };

export type WordEvaluation =
  | {
      outcome: "empty" | "too-short" | "missing-centre" | "duplicate" | "unrecognised";
      feedback: SubmissionFeedback;
    }
  | {
      outcome: "accepted";
      word: string;
      points: number;
      isPangram: boolean;
      feedback: SubmissionFeedback;
    };

export const preparePuzzle = (puzzle: DailyPuzzle): PreparedPuzzle => {
  const solutionWords = puzzle.answers.map((word) => word.toUpperCase());
  return {
    centreLetter: puzzle.centre.toUpperCase(),
    puzzleLetters: puzzle.letters.toUpperCase().split(""),
    solutionWords,
    solutionWordSet: new Set(solutionWords),
    pangramWordSet: new Set(puzzle.pangrams.map((word) => word.toUpperCase())),
    maximumScore: puzzle.maximumScore,
  };
};

export const isPangramWord = (word: string, puzzle: PreparedPuzzle) =>
  puzzle.pangramWordSet.has(word.toUpperCase());

export const scoreWord = (word: string, puzzle: PreparedPuzzle) =>
  (word.length <= 4 ? 1 : word.length) + (isPangramWord(word, puzzle) ? 7 : 0);

export function evaluateWord(
  currentWord: string,
  foundWords: readonly string[],
  puzzle: PreparedPuzzle,
): WordEvaluation {
  if (!currentWord) {
    return { outcome: "empty", feedback: { kind: "prompt", message: "Build a word first" } };
  }

  const word = currentWord.toUpperCase();
  if (word.length < 4) {
    return { outcome: "too-short", feedback: { kind: "rejected", message: "Too short", word } };
  }
  if (!word.includes(puzzle.centreLetter)) {
    return {
      outcome: "missing-centre",
      feedback: { kind: "rejected", message: `Must include ${puzzle.centreLetter}`, word },
    };
  }
  if (foundWords.includes(word)) {
    return { outcome: "duplicate", feedback: { kind: "prompt", message: "Already found", word } };
  }
  if (!puzzle.solutionWordSet.has(word)) {
    return { outcome: "unrecognised", feedback: { kind: "rejected", message: "Not accepted", word } };
  }

  const points = scoreWord(word, puzzle);
  const isPangram = isPangramWord(word, puzzle);
  return {
    outcome: "accepted",
    word,
    points,
    isPangram,
    feedback: {
      kind: isPangram ? "pangram" : "accepted",
      word,
      points,
      message: isPangram
        ? `Pangram! ${word} · +${points} points`
        : `${word} is correct · +${points} ${points === 1 ? "point" : "points"}`,
    },
  };
}

export const deriveGameStats = (foundWords: readonly string[], puzzle: PreparedPuzzle) => {
  const score = foundWords.reduce((total, word) => total + scoreWord(word, puzzle), 0);
  const gameComplete = foundWords.length === puzzle.solutionWords.length;
  const { rank: currentRank, progress } = rankForScore(score, puzzle.maximumScore, gameComplete);
  const currentRankIndex = RANKS.findIndex((rank) => rank.name === currentRank.name);
  const nextRank = RANKS[currentRankIndex + 1];
  const nextRankScore = nextRank ? Math.ceil(nextRank.threshold * puzzle.maximumScore) : null;

  return {
    score,
    gameComplete,
    currentRank,
    progress,
    nextRank,
    nextRankScore,
    nextRankText: nextRank && nextRankScore !== null
      ? `${Math.max(0, nextRankScore - score)} points to ${nextRank.name}`
      : "Every word found",
  };
};

export type GameStats = ReturnType<typeof deriveGameStats>;
