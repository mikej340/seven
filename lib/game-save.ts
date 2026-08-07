export const GAME_SAVE_KEY = "seven:game:v1";
export const GAME_SAVE_VERSION = 1;

export type StorageAdapter = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type GameSave = {
  version: typeof GAME_SAVE_VERSION;
  puzzleId: string;
  foundWords: string[];
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

const parseGameSave = (
  value: string,
  puzzleId: string,
  acceptedWords: ReadonlySet<string>,
): GameSave | null => {
  const parsed: unknown = JSON.parse(value);

  if (
    !isRecord(parsed) ||
    parsed.version !== GAME_SAVE_VERSION ||
    parsed.puzzleId !== puzzleId ||
    !Array.isArray(parsed.foundWords)
  ) {
    return null;
  }

  return {
    version: GAME_SAVE_VERSION,
    puzzleId,
    foundWords: sanitiseFoundWords(parsed.foundWords, acceptedWords),
  };
};

export const loadGameProgress = (
  storage: StorageAdapter,
  puzzleId: string,
  acceptedWords: ReadonlySet<string>,
) => {
  try {
    const value = storage.getItem(GAME_SAVE_KEY);
    if (value === null) return [];

    return parseGameSave(value, puzzleId, acceptedWords)?.foundWords ?? [];
  } catch {
    return [];
  }
};

export const saveGameProgress = (
  storage: StorageAdapter,
  puzzleId: string,
  foundWords: string[],
  acceptedWords: ReadonlySet<string>,
) => {
  const save: GameSave = {
    version: GAME_SAVE_VERSION,
    puzzleId,
    foundWords: sanitiseFoundWords(foundWords, acceptedWords),
  };

  try {
    storage.setItem(GAME_SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
};

export const clearGameProgress = (storage: StorageAdapter) => {
  try {
    storage.removeItem(GAME_SAVE_KEY);
    return true;
  } catch {
    return false;
  }
};
