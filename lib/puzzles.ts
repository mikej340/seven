export const PUZZLE_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const RANKS = [
  { name: "Beginner", threshold: 0 },
  { name: "Good Start", threshold: 0.02 },
  { name: "Moving Up", threshold: 0.05 },
  { name: "Good", threshold: 0.08 },
  { name: "Solid", threshold: 0.15 },
  { name: "Nice", threshold: 0.25 },
  { name: "Great", threshold: 0.4 },
  { name: "Amazing", threshold: 0.5 },
  { name: "Genius", threshold: 0.7 },
  { name: "Queen Bee", threshold: 1 },
] as const;

export type PuzzleManifestEntry = {
  id: string;
  date: string;
  month: string;
  letters: string;
  centre: string;
  wordCount: number;
  pangramCount: number;
  maximumScore: number;
};

export type PuzzleManifest = {
  schemaVersion: 1;
  timeZone: "UTC";
  startDate: string;
  endDate: string;
  source: {
    dictionarySha256: string;
    scowlRelease: string;
    frequencySource: string;
  };
  entries: PuzzleManifestEntry[];
};

export type DailyPuzzle = {
  id: string;
  date: string;
  letters: string;
  centre: string;
  answers: string[];
  pangrams: string[];
  maximumScore: number;
};

type PuzzleMonth = {
  schemaVersion: 1;
  month: string;
  puzzles: DailyPuzzle[];
};

export type PuzzleSelection = {
  date: string;
  isToday: boolean;
  notice: string | null;
};

export const utcDateString = (date = new Date()) => date.toISOString().slice(0, 10);

export const formatPuzzleDate = (date: string, includeWeekday = true) =>
  new Intl.DateTimeFormat("en-GB", {
    ...(includeWeekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));

export function resolvePuzzleSelection(
  manifest: PuzzleManifest,
  requestedDate: string | null,
  today = utcDateString(),
): PuzzleSelection {
  if (manifest.entries.length === 0) throw new Error("Puzzle manifest is empty");
  const available = manifest.entries.filter((entry) => entry.date <= today);
  const fallback = available.at(-1) ?? manifest.entries[0];
  if (fallback === undefined) throw new Error("Puzzle manifest is empty");

  if (requestedDate !== null) {
    const requested = available.find((entry) => entry.date === requestedDate);
    if (requested !== undefined) {
      return { date: requested.date, isToday: requested.date === today, notice: null };
    }
    return {
      date: fallback.date,
      isToday: fallback.date === today,
      notice: "That puzzle is not available. Showing the latest puzzle instead.",
    };
  }

  const todayEntry = available.find((entry) => entry.date === today);
  if (todayEntry !== undefined) return { date: today, isToday: true, notice: null };

  if (today < manifest.startDate) {
    return {
      date: fallback.date,
      isToday: false,
      notice: `Daily puzzles begin on ${formatPuzzleDate(manifest.startDate, false)}.`,
    };
  }

  return {
    date: fallback.date,
    isToday: false,
    notice: "A new daily puzzle has not been published yet. Showing the latest puzzle.",
  };
}

const fetchJson = async <Value>(path: string): Promise<Value> => {
  const response = await fetch(`${PUZZLE_BASE_PATH}${path}`, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load puzzle data (${response.status})`);
  return response.json() as Promise<Value>;
};

export const loadPuzzleManifest = async () => {
  const manifest = await fetchJson<PuzzleManifest>("/puzzles/manifest.json");
  if (
    manifest.schemaVersion !== 1 ||
    manifest.timeZone !== "UTC" ||
    !Array.isArray(manifest.entries)
  ) {
    throw new Error("Unsupported puzzle manifest");
  }
  return manifest;
};

export const loadDailyPuzzle = async (entry: PuzzleManifestEntry) => {
  const shard = await fetchJson<PuzzleMonth>(`/puzzles/${entry.month}.json`);
  if (shard.schemaVersion !== 1 || shard.month !== entry.month || !Array.isArray(shard.puzzles)) {
    throw new Error("Unsupported puzzle data");
  }
  const puzzle = shard.puzzles.find((candidate) => candidate.id === entry.id);
  if (puzzle === undefined) throw new Error(`Puzzle data is missing for ${entry.date}`);
  return puzzle;
};

export const rankForScore = (
  score: number,
  maximumScore: number,
  complete = false,
) => {
  const progress = complete ? 1 : Math.min(score / Math.max(1, maximumScore), 0.99);
  const rank = [...RANKS].reverse().find((candidate) => progress >= candidate.threshold) ?? RANKS[0];
  return { rank, progress };
};
