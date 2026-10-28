import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GAME_EVENTS, trackGameEventAsync } from "../lib/analytics.ts";
import { GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY, type StorageAdapter } from "../lib/game-save.ts";
import { createDailyPuzzleLoader, type DailyPuzzle, type PuzzleManifest } from "../lib/puzzles.ts";
import {
  createScoreSnapshot,
  createScoreSnapshotRecorder,
  recordScoreSnapshotsOnAcceptedWord,
  SCORE_SNAPSHOT_KEY,
  type ScoreSnapshot,
} from "../lib/score-snapshots.ts";

class MemoryStorage implements StorageAdapter {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const today = "2026-10-28";
const yesterday = "2026-10-27";
const historical = "2026-08-08";
const puzzle = (date: string): DailyPuzzle => ({
  id: date, date, letters: "abhmort", centre: "m",
  answers: ["moth", "motor", "bathroom"], pangrams: ["bathroom"], maximumScore: 21,
});
const manifest: PuzzleManifest = {
  schemaVersion: 1, timeZone: "UTC", startDate: historical, endDate: "2026-10-29",
  source: { dictionarySha256: "test", scowlRelease: "test", frequencySource: "test" },
  entries: [historical, "2026-10-20", yesterday, today, "2026-10-29"].map((date) => ({
    id: date, date, month: date.slice(0, 7), letters: "abhmort", centre: "m",
    wordCount: 3, pangramCount: 1, maximumScore: 21,
  })),
};
const save = (storage: MemoryStorage, puzzles: Record<string, unknown[]>) => storage.setItem(GAME_SAVE_KEY,
  JSON.stringify({ version: 2, puzzles: Object.fromEntries(Object.entries(puzzles).map(([id, foundWords]) =>
    [id, { foundWords, score: 99999, updatedAt: `${id}T12:00:00.000Z` }])) }));
const ledger = (storage: MemoryStorage) => JSON.parse(storage.getItem(SCORE_SNAPSHOT_KEY)!);
const harness = (storage = new MemoryStorage()) => {
  let date = today;
  let manifests = 0;
  const loads: string[] = [];
  const sent: ScoreSnapshot[] = [];
  let deliver = true;
  const dependencies = {
    getStorage: () => storage,
    now: () => new Date(`${date}T00:00:00.000Z`),
    loadManifest: async () => { manifests++; return manifest; },
    createPuzzleLoader: () => async (entry: { id: string }) => { loads.push(entry.id); return puzzle(entry.id); },
    track: async (snapshot: ScoreSnapshot) => { sent.push(snapshot); return deliver; },
  };
  return {
    storage, dependencies, loads, sent, record: createScoreSnapshotRecorder(dependencies),
    setDate: (value: string) => { date = value; },
    setDelivery: (value: boolean) => { deliver = value; },
    manifests: () => manifests,
  };
};

test("recalculates scores, rounded percentages, ranks and distinct pangrams from validated words", () => {
  const input = { ...puzzle(yesterday), pangrams: ["bathroom", "BATHROOM"] };
  assert.deepEqual(createScoreSnapshot(input, ["bathroom", "BATHROOM", "moth", "invalid"], today), {
    puzzle: yesterday, score: 16, maximumScore: 21, scorePercent: 76.19,
    rank: "Genius", wordCount: 2, pangramsFound: 1, pangramCount: 1, snapshotDate: today,
  });
  assert.equal(createScoreSnapshot(input, [], today), null);
  assert.equal(createScoreSnapshot(input, ["INVALID"], today), null);
  assert.equal(createScoreSnapshot({ ...input, maximumScore: NaN }, ["moth"], today), null);
  const complete = createScoreSnapshot(input, ["moth", "motor", "bathroom", "moth"], today)!;
  assert.equal(complete.score, 21);
  assert.equal(complete.scorePercent, 100);
  assert.equal(complete.rank, "Queen Bee");
  assert.equal(complete.wordCount, 3);
  assert.equal(createScoreSnapshot({ ...input, maximumScore: 1 }, ["moth"], today)!.rank, "Genius");
  const twoPangrams = { ...input, answers: ["bathroom", "motorboat"], pangrams: ["bathroom", "motorboat", "BATHROOM"], maximumScore: 31 };
  assert.equal(createScoreSnapshot(twoPangrams, ["bathroom", "motorboat", "MOTORBOAT"], today)!.pangramsFound, 2);
  assert.equal(createScoreSnapshot(twoPangrams, ["bathroom"], today)!.pangramCount, 2);
});

test("collects yesterday, skipped days and historical saves, excluding today, future and empty progress", async () => {
  const h = harness();
  save(h.storage, { [historical]: ["motor", "MOTOR", 5, "invalid"], "2026-10-20": ["bathroom"],
    [yesterday]: ["moth"], [today]: ["moth"], "2026-10-29": ["motor"] });
  const original = h.storage.getItem(GAME_SAVE_KEY);
  await h.record(today);
  assert.deepEqual(h.sent.map((data) => data.puzzle), [historical, "2026-10-20", yesterday]);
  assert.deepEqual(h.sent.map((data) => data.score), [5, 15, 1]);
  assert.equal(h.storage.getItem(GAME_SAVE_KEY), original);
  assert.deepEqual(ledger(h.storage).reportedPuzzleIds, [historical, "2026-10-20", yesterday]);
  assert.deepEqual(ledger(h.storage).pending, {});
});

test("includes untouched legacy historical progress without migrating its format", async () => {
  const h = harness();
  const original = JSON.stringify({ version: 1, puzzleId: "abhmort:m", foundWords: ["moth"] });
  h.storage.setItem(LEGACY_GAME_SAVE_KEY, original);
  await h.record(today);
  assert.equal(h.sent[0].puzzle, historical);
  assert.equal(h.storage.getItem(LEGACY_GAME_SAVE_KEY), original);
  assert.equal(h.storage.getItem(GAME_SAVE_KEY), null);
});

test("does not load empty or unplayed saves, and ignores invalid saved words", async () => {
  const h = harness();
  save(h.storage, { [historical]: [], "2026-10-20": ["invalid"], [yesterday]: ["moth"] });
  await h.record(today);
  assert.deepEqual(h.loads, ["2026-10-20", yesterday]);
  assert.deepEqual(h.sent.map((data) => data.puzzle), [yesterday]);
});

test("only today's engagement collects; accepted-word retries and reloads do not rescan the same UTC day", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  assert.equal(h.storage.getItem(SCORE_SNAPSHOT_KEY), null);
  await h.record(yesterday);
  await h.record("2026-10-29");
  assert.equal(h.manifests(), 0);
  await h.record(today);
  await h.record(today);
  await createScoreSnapshotRecorder(h.dependencies)(today);
  assert.equal(h.manifests(), 1);
  assert.equal(h.sent.length, 1);
  // Already reported puzzles stay reported even after reset and improved progress.
  save(h.storage, { [yesterday]: ["moth", "motor", "bathroom"], [today]: ["motor"] });
  h.setDate("2026-10-29");
  await h.record(today); // The still-open puzzle has become an archive puzzle.
  assert.equal(h.manifests(), 1);
  await h.record("2026-10-29");
  assert.equal(h.manifests(), 2);
  assert.deepEqual(h.sent.map((data) => data.puzzle), [yesterday, today]);
});

test("pending snapshots are durable before sending, frozen across resets, reloads and later days", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  h.setDelivery(false);
  await h.record(today);
  const frozen = ledger(h.storage).pending[yesterday];
  assert.deepEqual(frozen, h.sent[0]);
  save(h.storage, { [yesterday]: ["moth", "motor", "bathroom"] });
  await createScoreSnapshotRecorder(h.dependencies)(today);
  assert.deepEqual(h.sent[1], frozen);
  save(h.storage, {}); // Reset must not discard the pending snapshot.
  h.setDate("2026-10-29");
  h.setDelivery(true);
  const delivered: ScoreSnapshot[] = [];
  await createScoreSnapshotRecorder({ ...h.dependencies, track: async (data) => {
    assert.deepEqual(ledger(h.storage).pending[yesterday], frozen);
    delivered.push(data);
    return true;
  } })("2026-10-29");
  assert.deepEqual(delivered, [frozen]);
  assert.equal(delivered[0].snapshotDate, today);
  assert.deepEqual(ledger(h.storage).reportedPuzzleIds, [yesterday]);
});

test("failed puzzle loads do not block other snapshots and remain eligible on a later daily collection", async () => {
  const h = harness();
  save(h.storage, { [historical]: ["motor"], [yesterday]: ["moth"] });
  const record = createScoreSnapshotRecorder({ ...h.dependencies, createPuzzleLoader: () => async (entry) => {
    if (entry.id === historical) throw new Error("offline");
    return puzzle(entry.id);
  } });
  await record(today);
  assert.deepEqual(h.sent.map((data) => data.puzzle), [yesterday]);
  h.setDate("2026-10-29");
  await h.record("2026-10-29");
  assert.deepEqual(h.sent.map((data) => data.puzzle), [yesterday, historical]);
});

test("fetches each required monthly shard once per run, including failed shards and missing puzzles", async () => {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    if (String(url).includes("2026-08")) throw new Error("offline");
    return Response.json({ schemaVersion: 1, month: "2026-10", puzzles: [puzzle(yesterday)] });
  };
  try {
    const load = createDailyPuzzleLoader();
    const outcomes = await Promise.allSettled(manifest.entries.map(load));
    assert.equal(requests.length, 2);
    assert.equal(outcomes.filter((value) => value.status === "fulfilled").length, 1);
    await assert.rejects(load(manifest.entries[0]));
    assert.equal(requests.length, 2);
    await assert.rejects(createDailyPuzzleLoader()(manifest.entries[0]));
    assert.equal(requests.length, 3);
  } finally { globalThis.fetch = originalFetch; }
});

test("manifest failure still retries pending snapshots and does not scan again that day", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  h.setDelivery(false);
  await h.record(today);
  h.setDate("2026-10-29");
  h.setDelivery(true);
  let attempts = 0;
  const record = createScoreSnapshotRecorder({ ...h.dependencies, loadManifest: async () => {
    attempts++;
    throw new Error("offline");
  } });
  await record("2026-10-29");
  await record("2026-10-29");
  assert.equal(attempts, 1);
  assert.deepEqual(ledger(h.storage).reportedPuzzleIds, [yesterday]);
});

test("coalesces overlapping calls within a tab and prevents overlapping sends", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let sends = 0;
  const record = createScoreSnapshotRecorder({ ...h.dependencies, track: async () => { sends++; await gate; return true; } });
  const first = record(today);
  assert.equal(record(today), first);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sends, 1);
  assert.equal(record(today), first);
  release();
  await first;
  await record(today);
  assert.equal(sends, 1);
});

test("serializes tabs under a shared lock and re-reads the ledger after lock acquisition", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  let tail = Promise.resolve();
  const withLock = (run: () => Promise<void>) => { tail = tail.then(run); return tail; };
  const tab1 = createScoreSnapshotRecorder({ ...h.dependencies, withLock });
  const tab2 = createScoreSnapshotRecorder({ ...h.dependencies, withLock });
  await Promise.all([tab1(today), tab2(today)]);
  assert.equal(h.sent.length, 1);
  assert.equal(h.manifests(), 1);
});

test("new-day engagement waits for the previous run and still collects after UTC rollover", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"], [today]: ["motor"] });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const sent: string[] = [];
  const record = createScoreSnapshotRecorder({ ...h.dependencies, track: async (data) => {
    sent.push(data.puzzle);
    if (data.puzzle === yesterday) await gate;
    return true;
  } });
  const previous = record(today);
  await new Promise((resolve) => setImmediate(resolve));
  h.setDate("2026-10-29");
  const next = record("2026-10-29");
  assert.deepEqual(sent, [yesterday]);
  release();
  await Promise.all([previous, next]);
  assert.deepEqual(sent, [yesterday, today]);
  assert.equal(ledger(h.storage).lastCollectionDate, "2026-10-29");
});

test("fallback merges a concurrently reported puzzle before sending", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  const record = createScoreSnapshotRecorder({ ...h.dependencies, createPuzzleLoader: () => async (entry) => {
    h.storage.setItem(SCORE_SNAPSHOT_KEY, JSON.stringify({ version: 1, pending: {}, reportedPuzzleIds: [yesterday], lastCollectionDate: today }));
    return puzzle(entry.id);
  } });
  await record(today);
  assert.equal(h.sent.length, 0);
});

test("storage getter, reads, writes and corrupt/unsupported ledgers fail safely", async () => {
  for (const failure of ["getter", "read", "write", "corrupt", "version"]) {
    const h = harness();
    save(h.storage, { [yesterday]: ["moth"] });
    if (failure === "read") h.storage.getItem = () => { throw new Error("blocked"); };
    if (failure === "write") h.storage.setItem = () => { throw new Error("quota"); };
    if (failure === "corrupt") h.storage.setItem(SCORE_SNAPSHOT_KEY, "not json");
    if (failure === "version") h.storage.setItem(SCORE_SNAPSHOT_KEY, '{"version":2}');
    await createScoreSnapshotRecorder({ ...h.dependencies, getStorage: () => {
      if (failure === "getter") throw new Error("blocked");
      return h.storage;
    } })(today);
    assert.equal(h.manifests(), 0, failure);
    assert.equal(h.sent.length, 0, failure);
  }
});

test("failed persistence of collected snapshots prevents all tracker calls", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  const record = createScoreSnapshotRecorder({ ...h.dependencies, createPuzzleLoader: () => async (entry) => {
    h.storage.setItem = () => { throw new Error("quota"); };
    return puzzle(entry.id);
  } });
  await record(today);
  assert.equal(h.sent.length, 0);
});

test("failed reported-state persistence leaves durable pending progress for a later retry", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  const write = h.storage.setItem.bind(h.storage);
  await createScoreSnapshotRecorder({ ...h.dependencies, track: async () => {
    h.storage.setItem = () => { throw new Error("quota"); };
    return true;
  } })(today);
  assert.ok(ledger(h.storage).pending[yesterday]);
  h.storage.setItem = write;
  await h.record(today);
  assert.equal(h.sent.length, 1);
  assert.deepEqual(ledger(h.storage).reportedPuzzleIds, [yesterday]);
});

test("tracker failures retain pending snapshots and retry without new collection", async () => {
  const h = harness();
  save(h.storage, { [yesterday]: ["moth"] });
  let attempts = 0;
  const record = createScoreSnapshotRecorder({ ...h.dependencies, track: async () => {
    attempts++;
    if (attempts === 1) throw new Error("rejected");
    return attempts > 2;
  } });
  await record(today);
  assert.ok(ledger(h.storage).pending[yesterday]);
  await record(today);
  assert.ok(ledger(h.storage).pending[yesterday]);
  await record(today);
  assert.deepEqual(ledger(h.storage).pending, {});
  assert.equal(h.manifests(), 1);
});

test("awaits tracker handoff, accepting void/resolved success and rejecting reported failures", async () => {
  const data = { puzzle: yesterday };
  assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data, {}), false);
  for (const result of [false, { ok: false }, { success: false }, { status: 500 }, { error: "blocked" }]) {
    assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data,
      { umami: { track: async () => result } }), false);
  }
  assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data,
    { umami: { track: async () => { throw new Error("offline"); } } }), false);
  for (const result of [undefined, true, { ok: true }]) {
    assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data,
      { umami: { track: () => result } }), true);
  }
});

test("browser integration loads published shards and uses a mocked Umami tracker with aggregate properties only", async () => {
  const storage = new MemoryStorage();
  save(storage, { [historical]: ["moth", "MOTH", "invalid"] });
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalFetch = globalThis.fetch;
  const calls: unknown[][] = [];
  const target: { localStorage: MemoryStorage; umami?: { track: (...args: unknown[]) => Promise<void> } } = { localStorage: storage };
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  let locked = false;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: {
    request: async (name: string, run: () => Promise<void>) => {
      assert.equal(name, "seven:score-snapshots");
      locked = true;
      try { await run(); } finally { locked = false; }
    },
  } } });
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("manifest.json")) return Response.json(manifest);
    assert.ok(String(url).endsWith("2026-08.json"));
    return Response.json({ schemaVersion: 1, month: "2026-08", puzzles: [puzzle(historical)] });
  };
  try {
    const date = new Date().toISOString().slice(0, 10);
    await recordScoreSnapshotsOnAcceptedWord(date);
    assert.ok(ledger(storage).pending[historical]);
    assert.deepEqual(ledger(storage).reportedPuzzleIds, []);
    target.umami = { track: async (...args: unknown[]) => {
      assert.equal(locked, true);
      calls.push(args);
    } };
    await recordScoreSnapshotsOnAcceptedWord(date);
    assert.deepEqual(calls, [["puzzle-score-snapshot", {
      puzzle: historical, score: 1, maximumScore: 21, scorePercent: 4.76, rank: "Good Start",
      wordCount: 1, pangramsFound: 0, pangramCount: 1, snapshotDate: date,
    }]]);
    assert.deepEqual(ledger(storage).reportedPuzzleIds, [historical]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("the controller invokes snapshot recording only inside its new accepted-word branch", async () => {
  const controller = await readFile(new URL("../app/_game/use-puzzle-game.ts", import.meta.url), "utf8");
  assert.equal(controller.match(/recordScoreSnapshotsOnAcceptedWord\(game.puzzle.date\)/g)?.length, 1);
  const acceptedStart = controller.indexOf('if (result.outcome === "accepted") {');
  const acceptedBranch = controller.slice(acceptedStart, controller.indexOf("\n    } else {", acceptedStart));
  assert.match(acceptedBranch, /recordScoreSnapshotsOnAcceptedWord\(game.puzzle.date\)/);
});
