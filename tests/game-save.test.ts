import assert from "node:assert/strict";
import test from "node:test";
import {
  clearGameProgress,
  GAME_SAVE_KEY,
  LEGACY_GAME_SAVE_KEY,
  loadGameProgress,
  loadProgressSummaries,
  saveGameProgress,
  type StorageAdapter,
} from "../lib/game-save.ts";

class MemoryStorage implements StorageAdapter {
  values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const acceptedWords = new Set(["MOTH", "ROOM", "MOTOR"]);
const scoreWord = (word: string) => (word.length === 4 ? 1 : word.length);
const timestamp = "2026-08-09T12:00:00.000Z";

test("saves and restores independent validated puzzle progress", () => {
  const storage = new MemoryStorage();
  assert.equal(
    saveGameProgress(
      storage,
      "2026-08-08",
      ["MOTH", "room", "MOTH", "NOT-A-WORD"],
      acceptedWords,
      scoreWord,
      timestamp,
    ),
    true,
  );
  assert.equal(
    saveGameProgress(storage, "2026-08-09", ["MOTOR"], acceptedWords, scoreWord, timestamp),
    true,
  );

  assert.deepEqual(
    loadGameProgress(storage, "2026-08-08", acceptedWords, scoreWord, timestamp),
    { foundWords: ["MOTH", "ROOM"], score: 2, updatedAt: timestamp },
  );
  assert.deepEqual(loadProgressSummaries(storage)["2026-08-09"], {
    foundWords: ["MOTOR"],
    score: 5,
    updatedAt: timestamp,
  });
});

test("migrates the original ABHMORT save into 8 August", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    LEGACY_GAME_SAVE_KEY,
    JSON.stringify({
      version: 1,
      puzzleId: "abhmort:m",
      foundWords: ["MOTH", "room", "INVALID"],
    }),
  );

  assert.deepEqual(
    loadGameProgress(storage, "2026-08-08", acceptedWords, scoreWord, timestamp),
    { foundWords: ["MOTH", "ROOM"], score: 2, updatedAt: timestamp },
  );
  assert.equal(storage.getItem(LEGACY_GAME_SAVE_KEY), null);
  assert.ok(storage.getItem(GAME_SAVE_KEY));
});

test("does not migrate legacy progress to another date", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    LEGACY_GAME_SAVE_KEY,
    JSON.stringify({ version: 1, puzzleId: "abhmort:m", foundWords: ["MOTH"] }),
  );
  assert.deepEqual(
    loadGameProgress(storage, "2026-08-09", acceptedWords, scoreWord, timestamp),
    { foundWords: [], score: 0, updatedAt: timestamp },
  );
});

test("clears only the selected puzzle", () => {
  const storage = new MemoryStorage();
  saveGameProgress(storage, "2026-08-08", ["MOTH"], acceptedWords, scoreWord, timestamp);
  saveGameProgress(storage, "2026-08-09", ["ROOM"], acceptedWords, scoreWord, timestamp);

  assert.equal(clearGameProgress(storage, "2026-08-08"), true);
  assert.equal(loadProgressSummaries(storage)["2026-08-08"], undefined);
  assert.deepEqual(loadProgressSummaries(storage)["2026-08-09"]?.foundWords, ["ROOM"]);
});

test("ignores malformed saves and continues when storage is unavailable", () => {
  const storage = new MemoryStorage();
  storage.setItem(GAME_SAVE_KEY, "not json");
  assert.deepEqual(loadProgressSummaries(storage), {});

  const unavailableStorage: StorageAdapter = {
    getItem() {
      throw new Error("unavailable");
    },
    setItem() {
      throw new Error("unavailable");
    },
    removeItem() {
      throw new Error("unavailable");
    },
  };
  assert.deepEqual(
    loadGameProgress(unavailableStorage, "2026-08-08", acceptedWords, scoreWord, timestamp),
    { foundWords: [], score: 0, updatedAt: timestamp },
  );
  assert.equal(
    saveGameProgress(
      unavailableStorage,
      "2026-08-08",
      ["MOTH"],
      acceptedWords,
      scoreWord,
      timestamp,
    ),
    false,
  );
  assert.equal(clearGameProgress(unavailableStorage, "2026-08-08"), false);
});
