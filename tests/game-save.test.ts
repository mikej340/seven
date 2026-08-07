import assert from "node:assert/strict";
import test from "node:test";
import {
  clearGameProgress,
  GAME_SAVE_KEY,
  loadGameProgress,
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

const puzzleId = "abhmort:m";
const acceptedWords = new Set(["MOTH", "ROOM", "MOTOR"]);

test("saves and restores validated progress", () => {
  const storage = new MemoryStorage();

  assert.equal(
    saveGameProgress(
      storage,
      puzzleId,
      ["MOTH", "room", "MOTH", "NOT-A-WORD"],
      acceptedWords,
    ),
    true,
  );
  assert.deepEqual(
    loadGameProgress(storage, puzzleId, acceptedWords),
    ["MOTH", "ROOM"],
  );
  assert.deepEqual(JSON.parse(storage.getItem(GAME_SAVE_KEY) ?? ""), {
    version: 1,
    puzzleId,
    foundWords: ["MOTH", "ROOM"],
  });
});

test("ignores malformed, unsupported and stale saves", () => {
  const storage = new MemoryStorage();

  storage.setItem(GAME_SAVE_KEY, "not json");
  assert.deepEqual(loadGameProgress(storage, puzzleId, acceptedWords), []);

  storage.setItem(
    GAME_SAVE_KEY,
    JSON.stringify({ version: 2, puzzleId, foundWords: ["MOTH"] }),
  );
  assert.deepEqual(loadGameProgress(storage, puzzleId, acceptedWords), []);

  storage.setItem(
    GAME_SAVE_KEY,
    JSON.stringify({ version: 1, puzzleId: "different:m", foundWords: ["MOTH"] }),
  );
  assert.deepEqual(loadGameProgress(storage, puzzleId, acceptedWords), []);
});

test("clears saved progress", () => {
  const storage = new MemoryStorage();
  storage.setItem(GAME_SAVE_KEY, "saved");

  assert.equal(clearGameProgress(storage), true);
  assert.equal(storage.getItem(GAME_SAVE_KEY), null);
});

test("continues safely when browser storage is unavailable", () => {
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
    loadGameProgress(unavailableStorage, puzzleId, acceptedWords),
    [],
  );
  assert.equal(
    saveGameProgress(unavailableStorage, puzzleId, ["MOTH"], acceptedWords),
    false,
  );
  assert.equal(clearGameProgress(unavailableStorage), false);
});
