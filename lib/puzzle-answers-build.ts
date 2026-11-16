import { readFileSync } from "node:fs";
import { join } from "node:path";
import puzzleManifest from "@/public/puzzles/manifest.json";
import { utcDateString, type DailyPuzzle, type PuzzleManifestEntry } from "./puzzles";

// Build-time only. Answer pages carry their words in the static HTML once a
// puzzle's UTC day is over; later dates are built without them and are filled
// in by the browser after the date passes (and in the HTML at the next build).

export type BuildAnswers = Pick<DailyPuzzle, "answers" | "pangrams">;

const months = new Map<string, DailyPuzzle[]>();

const monthPuzzles = (month: string) => {
  let puzzles = months.get(month);
  if (puzzles === undefined) {
    const file = join(process.cwd(), "public", "puzzles", `${month}.json`);
    puzzles = (JSON.parse(readFileSync(file, "utf8")) as { puzzles: DailyPuzzle[] }).puzzles;
    months.set(month, puzzles);
  }
  return puzzles;
};

export const answersReleasedAtBuild = (date: string, buildDate = utcDateString()) => date < buildDate;

export function buildAnswersFor(date: string, buildDate = utcDateString()): BuildAnswers | null {
  if (!answersReleasedAtBuild(date, buildDate)) return null;
  const entry = (puzzleManifest.entries as PuzzleManifestEntry[]).find((candidate) => candidate.date === date);
  if (entry === undefined) return null;
  const puzzle = monthPuzzles(entry.month).find((candidate) => candidate.id === entry.id);
  if (puzzle === undefined) throw new Error(`Puzzle data is missing for ${date}`);
  return { answers: puzzle.answers, pangrams: puzzle.pangrams };
}
