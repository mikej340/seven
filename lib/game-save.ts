export const LEGACY_GAME_SAVE_KEY = "seven:game:v1";
export const GAME_SAVE_KEY = "seven:games:v2";
export const GAME_SAVE_VERSION = 2;
export const LEGACY_PUZZLE_ID = "abhmort:m";
export const LEGACY_PUZZLE_DATE = "2026-08-08";

export type StorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type PuzzleProgress = {
  foundWords: string[];
  score: number;
  updatedAt: string;
};

type GameSave = {
  version: typeof GAME_SAVE_VERSION;
  puzzles: Record<string, PuzzleProgress>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitiseFoundWords = (
  words: unknown[],
  acceptedWords: ReadonlySet<string>,
) => {
  const foundWords: string[] = [];
  const seen = new Set<string>();

  for (const value of words) {
    if (typeof value !== "string") continue;

    const word = value.toUpperCase();
    if (!acceptedWords.has(word) || seen.has(word)) continue;

    seen.add(word);
    foundWords.push(word);
  }

  return foundWords;
};

const parseProgress = (value: unknown): PuzzleProgress | null => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.foundWords) ||
    typeof value.score !== "number" ||
    !Number.isFinite(value.score) ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    foundWords: value.foundWords.filter((word): word is string => typeof word === "string"),
    score: Math.max(0, value.score),
    updatedAt: value.updatedAt,
  };
};

const readGameSave = (storage: StorageAdapter): GameSave => {
  const empty: GameSave = { version: GAME_SAVE_VERSION, puzzles: {} };
  try {
    const value = storage.getItem(GAME_SAVE_KEY);
    if (value === null) return empty;
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== GAME_SAVE_VERSION || !isRecord(parsed.puzzles)) {
      return empty;
    }

    const puzzles: Record<string, PuzzleProgress> = {};
    for (const [puzzleId, progress] of Object.entries(parsed.puzzles)) {
      const validProgress = parseProgress(progress);
      if (validProgress !== null) puzzles[puzzleId] = validProgress;
    }
    return { version: GAME_SAVE_VERSION, puzzles };
  } catch {
    return empty;
  }
};

const writeGameSave = (storage: StorageAdapter, save: GameSave) => {
  try {
    if (Object.keys(save.puzzles).length === 0) storage.removeItem(GAME_SAVE_KEY);
    else storage.setItem(GAME_SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
};

const migrateLegacyProgress = (
  storage: StorageAdapter,
  acceptedWords: ReadonlySet<string>,
  scoreWord: (word: string) => number,
  updatedAt: string,
): PuzzleProgress | null => {
  try {
    const value = storage.getItem(LEGACY_GAME_SAVE_KEY);
    if (value === null) return null;
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      parsed.puzzleId !== LEGACY_PUZZLE_ID ||
      !Array.isArray(parsed.foundWords)
    ) {
      return null;
    }

    const foundWords = sanitiseFoundWords(parsed.foundWords, acceptedWords);
    return {
      foundWords,
      score: foundWords.reduce((total, word) => total + scoreWord(word), 0),
      updatedAt,
    };
  } catch {
    return null;
  }
};

export const loadGameProgress = (
  storage: StorageAdapter,
  puzzleId: string,
  acceptedWords: ReadonlySet<string>,
  scoreWord: (word: string) => number,
  updatedAt = new Date().toISOString(),
): PuzzleProgress => {
  const save = readGameSave(storage);
  const existing = save.puzzles[puzzleId];
  if (existing !== undefined) {
    const foundWords = sanitiseFoundWords(existing.foundWords, acceptedWords);
    return {
      foundWords,
      score: foundWords.reduce((total, word) => total + scoreWord(word), 0),
      updatedAt: existing.updatedAt,
    };
  }

  if (puzzleId === LEGACY_PUZZLE_DATE) {
    const migrated = migrateLegacyProgress(storage, acceptedWords, scoreWord, updatedAt);
    if (migrated !== null) {
      const migratedSave = {
        ...save,
        puzzles: { ...save.puzzles, [puzzleId]: migrated },
      };
      if (writeGameSave(storage, migratedSave)) {
        try {
          storage.removeItem(LEGACY_GAME_SAVE_KEY);
        } catch {
          // The migrated v2 save is already durable; stale legacy data is harmless.
        }
      }
      return migrated;
    }
  }

  return { foundWords: [], score: 0, updatedAt };
};

export const saveGameProgress = (
  storage: StorageAdapter,
  puzzleId: string,
  foundWords: string[],
  acceptedWords: ReadonlySet<string>,
  scoreWord: (word: string) => number,
  updatedAt = new Date().toISOString(),
) => {
  const sanitised = sanitiseFoundWords(foundWords, acceptedWords);
  const save = readGameSave(storage);
  save.puzzles[puzzleId] = {
    foundWords: sanitised,
    score: sanitised.reduce((total, word) => total + scoreWord(word), 0),
    updatedAt,
  };
  return writeGameSave(storage, save);
};

export const clearGameProgress = (storage: StorageAdapter, puzzleId: string) => {
  const save = readGameSave(storage);
  delete save.puzzles[puzzleId];
  return writeGameSave(storage, save);
};

export const loadProgressSummaries = (
  storage: StorageAdapter,
): Record<string, PuzzleProgress> => readGameSave(storage).puzzles;
