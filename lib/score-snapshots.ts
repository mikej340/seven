import { GAME_EVENTS, trackGameEventAsync } from "./analytics.ts";
import { loadSavedFoundWords, type StorageAdapter } from "./game-save.ts";
import { preparePuzzle, scoreWord } from "./game-rules.ts";
import {
  createDailyPuzzleLoader,
  loadPuzzleManifest,
  rankForScore,
  utcDateString,
  type DailyPuzzle,
  type PuzzleManifest,
  type PuzzleManifestEntry,
} from "./puzzles.ts";

export const SCORE_SNAPSHOT_KEY = "seven:score-snapshots:v1";
export const SCORE_SNAPSHOT_LOCK = "seven:score-snapshots";

export type ScoreSnapshot = {
  puzzle: string;
  score: number;
  maximumScore: number;
  scorePercent: number;
  rank: string;
  wordCount: number;
  pangramsFound: number;
  pangramCount: number;
  snapshotDate: string;
};

type SnapshotLedger = {
  version: 1;
  pending: Record<string, ScoreSnapshot>;
  reportedPuzzleIds: string[];
  lastCollectionDate: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const readSnapshot = (value: unknown): ScoreSnapshot | null => {
  if (!isRecord(value) || !isDate(value.puzzle) || !isDate(value.snapshotDate) ||
      typeof value.rank !== "string") return null;
  const numbers = ["score", "maximumScore", "scorePercent", "wordCount", "pangramsFound", "pangramCount"] as const;
  for (const key of numbers) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key]) || value[key] < 0) return null;
  }
  // Explicitly allowlist properties, including when reading locally modified data.
  return {
    puzzle: value.puzzle, snapshotDate: value.snapshotDate, rank: value.rank,
    ...Object.fromEntries(numbers.map((key) => [key, value[key]])),
  } as ScoreSnapshot;
};

const readLedger = (storage: StorageAdapter): SnapshotLedger | null => {
  try {
    const raw = storage.getItem(SCORE_SNAPSHOT_KEY);
    if (raw === null) return { version: 1, pending: {}, reportedPuzzleIds: [], lastCollectionDate: null };
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.pending) ||
        !Array.isArray(value.reportedPuzzleIds) || !value.reportedPuzzleIds.every(isDate) ||
        !(value.lastCollectionDate === null || isDate(value.lastCollectionDate))) return null;
    const pending: Record<string, ScoreSnapshot> = {};
    for (const [id, data] of Object.entries(value.pending)) {
      const snapshot = readSnapshot(data);
      if (snapshot === null || snapshot.puzzle !== id) return null;
      if (!value.reportedPuzzleIds.includes(id)) pending[id] = snapshot;
    }
    return { version: 1, pending, reportedPuzzleIds: [...new Set(value.reportedPuzzleIds)], lastCollectionDate: value.lastCollectionDate };
  } catch {
    return null;
  }
};

const writeLedger = (storage: StorageAdapter, ledger: SnapshotLedger) => {
  try {
    storage.setItem(SCORE_SNAPSHOT_KEY, JSON.stringify(ledger));
    return true;
  } catch {
    return false;
  }
};

export const createScoreSnapshot = (
  puzzle: DailyPuzzle,
  savedWords: readonly string[],
  snapshotDate: string,
): ScoreSnapshot | null => {
  if (!Number.isFinite(puzzle.maximumScore) || puzzle.maximumScore <= 0) return null;
  const rules = preparePuzzle(puzzle);
  const answers = rules.solutionWordSet;
  const pangrams = rules.pangramWordSet;
  const words = new Set(savedWords.map((word) => word.toUpperCase()).filter((word) => answers.has(word)));
  if (words.size === 0) return null;
  const score = [...words].reduce((total, word) => total + scoreWord(word, rules), 0);
  return {
    puzzle: puzzle.id,
    score,
    maximumScore: puzzle.maximumScore,
    scorePercent: Math.round(score / Math.max(1, puzzle.maximumScore) * 10000) / 100,
    rank: rankForScore(score, puzzle.maximumScore, words.size === answers.size).rank.name,
    wordCount: words.size,
    pangramsFound: [...words].filter((word) => pangrams.has(word)).length,
    pangramCount: pangrams.size,
    snapshotDate,
  };
};

type SnapshotDependencies = {
  getStorage: () => StorageAdapter;
  now?: () => Date;
  loadManifest?: () => Promise<PuzzleManifest>;
  createPuzzleLoader?: () => (entry: PuzzleManifestEntry) => Promise<DailyPuzzle>;
  track?: (snapshot: ScoreSnapshot) => Promise<boolean>;
  withLock?: (run: () => Promise<void>) => Promise<void>;
};

// One instance per tab. No page-load collection, timers or polling.
export const createScoreSnapshotRecorder = (dependencies: SnapshotDependencies) => {
  let active: Promise<void> | undefined;
  let activeDate: string | undefined;
  const record = (puzzleDate: string): Promise<void> => {
    const today = utcDateString(dependencies.now?.() ?? new Date());
    if (puzzleDate !== today) return Promise.resolve();
    if (active !== undefined) {
      // Engagement after midnight must still collect the new day's snapshots,
      // even if the previous day's tracker handoff has not finished yet.
      return activeDate === today ? active : active.then(() => record(puzzleDate));
    }

    const run = async () => {
      const storage = dependencies.getStorage();
      let ledger = readLedger(storage);
      // Also probe writability before loading data or handing off pending events.
      if (ledger === null || !writeLedger(storage, ledger)) return;
      if (ledger.lastCollectionDate !== today) {
        const saved = loadSavedFoundWords(storage);
        let manifest: PuzzleManifest | undefined;
        try {
          manifest = await (dependencies.loadManifest ?? loadPuzzleManifest)();
        } catch {
          // Retry collection on a later day, but still deliver frozen pending data.
        }
        const loadPuzzle = (dependencies.createPuzzleLoader ?? createDailyPuzzleLoader)();
        const beforeCollection = ledger;
        const snapshots = await Promise.all((manifest?.entries ?? []).filter((entry) =>
          entry.date < today && saved[entry.id]?.length > 0 &&
          !beforeCollection.reportedPuzzleIds.includes(entry.id) && !beforeCollection.pending[entry.id],
        ).map(async (entry) => {
          try {
            const puzzle = await loadPuzzle(entry);
            if (puzzle.id !== entry.id || puzzle.date !== entry.date) return null;
            return createScoreSnapshot(puzzle, saved[entry.id], today);
          } catch {
            // An unavailable puzzle stays eligible for the next daily scan.
            return null;
          }
        }));
        // Other tabs may have progressed while puzzle data loaded.
        ledger = readLedger(storage);
        if (ledger === null) return;
        for (const snapshot of snapshots) {
          if (snapshot !== null && !ledger.reportedPuzzleIds.includes(snapshot.puzzle) &&
              !ledger.pending[snapshot.puzzle]) ledger.pending[snapshot.puzzle] = snapshot;
        }
        ledger.lastCollectionDate = today;
        if (!writeLedger(storage, ledger)) return;
      }

      for (const id of Object.keys(ledger.pending)) {
        // Best effort cross-tab deduplication in browsers without Web Locks.
        ledger = readLedger(storage);
        if (ledger === null) return;
        const snapshot = ledger.pending[id];
        if (!snapshot || ledger.reportedPuzzleIds.includes(id)) continue;
        if (!writeLedger(storage, ledger)) return;
        let handedOff = false;
        try {
          handedOff = await (dependencies.track ?? ((data) =>
            trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data)))(snapshot);
        } catch {
          // Keep the frozen pending snapshot for a later accepted word.
        }
        if (!handedOff) continue;
        ledger = readLedger(storage);
        if (ledger === null) return;
        delete ledger.pending[id];
        if (!ledger.reportedPuzzleIds.includes(id)) ledger.reportedPuzzleIds.push(id);
        if (!writeLedger(storage, ledger)) return;
      }
    };
    // Defer work so the guard is set even for synchronous dependency failures.
    activeDate = today;
    active = Promise.resolve().then(() => dependencies.withLock ? dependencies.withLock(run) : run())
      .catch(() => { /* Analytics/storage failures must never interrupt play. */ })
      .finally(() => { active = undefined; activeDate = undefined; });
    return active;
  };
  return record;
};

export const recordScoreSnapshotsOnAcceptedWord = createScoreSnapshotRecorder({
  getStorage: () => window.localStorage,
  withLock: async (run) => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      await navigator.locks.request(SCORE_SNAPSHOT_LOCK, run);
    } else {
      await run();
    }
  },
});
