import assert from "node:assert/strict";
import test from "node:test";

import {
  type CollectorEvent,
  createCollectorSender,
  randomUuid,
  GAME_EVENTS,
  trackGameEvent,
  trackGameEventAsync,
  trackPageView,
} from "../lib/analytics.ts";

test("sends a named game event and its non-identifying properties", () => {
  const calls: unknown[][] = [];
  const target = {
    umami: {
      track(...values: unknown[]) {
        calls.push(values);
      },
    },
  };

  assert.equal(
    trackGameEvent(
      GAME_EVENTS.rankReached,
      { puzzle: "2026-08-23", rank: "Great" },
      target,
    ),
    true,
  );
  assert.deepEqual(calls, [
    ["rank-reached", { puzzle: "2026-08-23", rank: "Great" }],
  ]);
});

test("silently skips analytics when the tracker is unavailable or fails", () => {
  assert.equal(
    trackGameEvent(GAME_EVENTS.puzzleEngaged, { puzzle: "2026-08-23" }, {}),
    false,
  );
  assert.equal(
    trackGameEvent(
      GAME_EVENTS.puzzleEngaged,
      { puzzle: "2026-08-23" },
      {
        umami: {
          track() {
            throw new Error("blocked");
          },
        },
      },
    ),
    false,
  );
});

test("exposes the score sharing event name", () => {
  assert.equal(GAME_EVENTS.scoreShared, "score-shared");
});

test("exposes the friend invitation sharing event name", () => {
  assert.equal(GAME_EVENTS.friendInviteShared, "friend-invite-shared");
});

const collectorEnvironment = (respond: () => Promise<{ ok: boolean }>) => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  return {
    requests,
    environment: {
      fetch: ((url: string, init: RequestInit) => {
        requests.push({ url, init });
        return respond();
      }) as unknown as typeof fetch,
      randomUUID: () => "0f8fad5b-d9cb-469f-a165-70867728950e",
      location: () => "/seven/daily/2026-11-17",
    },
  };
};

test("the collector sender posts a text/plain, cookie-free, keepalive event", async () => {
  const { requests, environment } = collectorEnvironment(async () => ({ ok: true }));
  const send = createCollectorSender("https://collect.example/e", environment);

  const delivered = send({ name: GAME_EVENTS.rankReached, props: { puzzle: "2026-11-17", rank: "Great" } });
  assert.notEqual(delivered, false);
  assert.equal(await delivered, true);
  assert.equal(requests.length, 1);
  const [{ url, init }] = requests;
  assert.equal(url, "https://collect.example/e");
  assert.equal(init.method, "POST");
  assert.equal(init.keepalive, true);
  assert.equal(init.credentials, "omit");
  assert.equal(init.headers, undefined);
  assert.equal(typeof init.body, "string");
  assert.deepEqual(JSON.parse(init.body as string), {
    v: 1,
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    name: "rank-reached",
    path: "/seven/daily/2026-11-17",
    props: { puzzle: "2026-11-17", rank: "Great" },
  });
});

test("collector page views omit the name and empty properties", () => {
  const { requests, environment } = collectorEnvironment(async () => ({ ok: true }));
  const send = createCollectorSender("https://collect.example/e", environment);
  send({ name: null, referrer: "https://news.example/" });
  send({ name: null, referrer: "" });
  assert.deepEqual(requests.map(({ init }) => JSON.parse(init.body as string)), [
    { v: 1, id: "0f8fad5b-d9cb-469f-a165-70867728950e", path: "/seven/daily/2026-11-17", referrer: "https://news.example/" },
    { v: 1, id: "0f8fad5b-d9cb-469f-a165-70867728950e", path: "/seven/daily/2026-11-17" },
  ]);
});

test("the collector sender reports rejected and failed requests as undelivered", async () => {
  const rejected = createCollectorSender("https://collect.example/e", collectorEnvironment(async () => ({ ok: false })).environment);
  assert.equal(await rejected({ name: null }), false);
  const offline = createCollectorSender(
    "https://collect.example/e",
    collectorEnvironment(() => Promise.reject(new TypeError("offline"))).environment,
  );
  assert.equal(await offline({ name: null }), false);
  const broken = createCollectorSender("https://collect.example/e", {
    ...collectorEnvironment(async () => ({ ok: true })).environment,
    randomUUID: () => {
      throw new Error("no crypto");
    },
  });
  assert.equal(broken({ name: null }), false);
});

test("game events go to both Umami and the collector", () => {
  const umamiCalls: unknown[][] = [];
  const collectorCalls: CollectorEvent[] = [];
  const result = trackGameEvent(GAME_EVENTS.pangramFound, { puzzle: "2026-11-17" }, {
    umami: { track: (...values: unknown[]) => void umamiCalls.push(values) },
    collector: (event) => {
      collectorCalls.push(event);
      return Promise.resolve(true);
    },
  });
  assert.equal(result, true);
  assert.deepEqual(umamiCalls, [["pangram-found", { puzzle: "2026-11-17" }]]);
  assert.deepEqual(collectorCalls, [{ name: "pangram-found", props: { puzzle: "2026-11-17" } }]);
});

test("a game event counts as tracked when only one destination accepts it", () => {
  const blockedUmami = { track() { throw new Error("blocked"); } };
  assert.equal(
    trackGameEvent(GAME_EVENTS.puzzleEngaged, { puzzle: "2026-11-17" }, { umami: blockedUmami, collector: () => Promise.resolve(true) }),
    true,
  );
  assert.equal(
    trackGameEvent(GAME_EVENTS.puzzleEngaged, { puzzle: "2026-11-17" }, { collector: () => false }),
    false,
  );
  assert.equal(
    trackGameEvent(GAME_EVENTS.puzzleEngaged, { puzzle: "2026-11-17" }, {
      umami: { track() {} },
      collector: () => {
        throw new Error("broken");
      },
    }),
    true,
  );
});

test("async delivery succeeds when Umami or the collector confirms it", async () => {
  const data = { puzzle: "2026-11-16", score: 10 };
  const failingUmami = { track: async () => ({ ok: false }) };
  const goodUmami = { track: async () => undefined };
  assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data, { umami: failingUmami, collector: () => Promise.resolve(true) }), true);
  assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data, { collector: () => Promise.resolve(true) }), true);
  assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data, { umami: goodUmami, collector: () => Promise.resolve(false) }), true);
  assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data, { umami: failingUmami, collector: () => Promise.resolve(false) }), false);
  assert.equal(await trackGameEventAsync(GAME_EVENTS.puzzleScoreSnapshot, data, { umami: failingUmami, collector: () => false }), false);
});

test("page views go only to the collector, with the referrer", () => {
  const umamiCalls: unknown[] = [];
  const collectorCalls: CollectorEvent[] = [];
  const target = {
    umami: { track: (...values: unknown[]) => void umamiCalls.push(values) },
    collector: (event: CollectorEvent) => {
      collectorCalls.push(event);
      return Promise.resolve(true);
    },
  };
  assert.equal(trackPageView("https://news.example/", target), true);
  assert.equal(trackPageView(undefined, {}), false);
  assert.deepEqual(umamiCalls, []);
  assert.deepEqual(collectorCalls, [{ name: null, referrer: "https://news.example/" }]);
});

test("the collector sender includes the query string and device context", () => {
  const { requests, environment } = collectorEnvironment(async () => ({ ok: true }));
  const send = createCollectorSender("https://collect.example/e", {
    ...environment,
    location: () => "/seven/?date=2026-11-11",
    context: () => ({ language: "en-GB", screen: "390x844", viewport: "390x664", touch: true }),
  });
  send({ name: null });
  assert.deepEqual(JSON.parse(requests[0].init.body as string), {
    v: 1,
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    path: "/seven/?date=2026-11-11",
    language: "en-GB",
    screen: "390x844",
    viewport: "390x664",
    touch: true,
  });
});

test("a failing device context does not stop the event", () => {
  const { requests, environment } = collectorEnvironment(async () => ({ ok: true }));
  const send = createCollectorSender("https://collect.example/e", {
    ...environment,
    context: () => {
      throw new Error("no screen");
    },
  });
  assert.notEqual(send({ name: null }), false);
  assert.equal(requests.length, 1);
});

test("randomUuid falls back to a version 4 UUID without crypto.randomUUID", () => {
  assert.equal(randomUuid({ randomUUID: () => "native", getRandomValues: (a: Uint8Array) => a } as unknown as Crypto), "native");
  const fallback = randomUuid({
    getRandomValues: <T extends ArrayBufferView | null>(array: T) => {
      (array as unknown as Uint8Array).fill(0xff);
      return array;
    },
  });
  assert.equal(fallback, "ffffffff-ffff-4fff-bfff-ffffffffffff");
  assert.match(randomUuid(globalThis.crypto), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
