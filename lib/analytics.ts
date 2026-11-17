export const GAME_EVENTS = {
  puzzleEngaged: "puzzle-engaged",
  pangramFound: "pangram-found",
  rankReached: "rank-reached",
  puzzleCompleted: "puzzle-completed",
  scoreShared: "score-shared",
  friendInviteShared: "friend-invite-shared",
  puzzleScoreSnapshot: "puzzle-score-snapshot",
  answersPageOpened: "answers-page-opened",
  answersPagePlay: "answers-page-play",
} as const;

export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];
export type GameEventData = Record<string, string | number | boolean>;

type UmamiTracker = {
  track: (eventName: string, data?: GameEventData) => unknown;
};

/** A collector event; `name: null` is a page view. */
export type CollectorEvent = {
  name: GameEventName | null;
  props?: GameEventData;
  referrer?: string;
};

/**
 * Hands an event to the first-party collector. Returns false when it could not
 * be handed off, otherwise a promise of whether the collector accepted it.
 */
export type CollectorSender = (event: CollectorEvent) => false | Promise<boolean>;

type AnalyticsTarget = {
  umami?: UmamiTracker;
  collector?: CollectorSender;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

type CollectorEnvironment = {
  fetch: typeof fetch;
  randomUUID: () => string;
  /** Current path and query string, without the fragment. */
  location: () => string;
  /** Device context the collector uses for language, screen and device type. */
  context?: () => CollectorContext;
};

export type CollectorContext = {
  language?: string;
  screen?: string;
  viewport?: string;
  touch?: boolean;
};

const hex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/** crypto.randomUUID, with a fallback for browsers that lack it (iOS before 15.4). */
export const randomUuid = (source: Pick<Crypto, "getRandomValues"> & Partial<Pick<Crypto, "randomUUID">>) => {
  if (typeof source.randomUUID === "function") return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = hex(bytes);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};

export const createCollectorSender = (
  endpoint: string,
  environment: CollectorEnvironment,
): CollectorSender => (event) => {
  try {
    let context: CollectorContext = {};
    try {
      context = environment.context?.() ?? {};
    } catch {
      // Context is optional; send the event without it.
    }
    const body = JSON.stringify({
      v: 1,
      id: environment.randomUUID(),
      name: event.name ?? undefined,
      path: environment.location(),
      referrer: event.referrer || undefined,
      props: event.props && Object.keys(event.props).length > 0 ? event.props : undefined,
      ...context,
    });
    // A string body is sent as text/plain, so the browser needs no CORS preflight.
    // keepalive lets the request finish if the page is closing.
    return environment
      .fetch(endpoint, { method: "POST", body, keepalive: true, credentials: "omit", mode: "cors" })
      .then((response) => response.ok, () => false);
  } catch {
    return false;
  }
};

const COLLECTOR_URL = process.env.NEXT_PUBLIC_COLLECTOR_URL ?? "";

const browserContext = (): CollectorContext => ({
  language: navigator.language || undefined,
  screen: `${window.screen.width}x${window.screen.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  // iPadOS reports itself as a Mac; touch support tells the collector it is a tablet.
  touch: navigator.maxTouchPoints > 0,
});

const browserCollector: CollectorSender | undefined =
  COLLECTOR_URL && typeof window !== "undefined" && typeof window.fetch === "function" &&
  typeof window.crypto?.getRandomValues === "function"
    ? createCollectorSender(COLLECTOR_URL, {
      fetch: (...args) => window.fetch(...args),
      randomUUID: () => randomUuid(window.crypto),
      location: () => window.location.pathname + window.location.search,
      context: browserContext,
    })
    : undefined;

// Read window.umami at call time: the Umami script loads after the app.
const defaultTarget = (): AnalyticsTarget | undefined =>
  typeof window === "undefined" ? undefined : { umami: window.umami, collector: browserCollector };

const sendToCollector = (target: AnalyticsTarget | undefined, event: CollectorEvent) => {
  if (typeof target?.collector !== "function") return false;
  try {
    return target.collector(event);
  } catch {
    return false;
  }
};

/**
 * Sends a game event to Umami and the collector. Returns true when at least one
 * accepted the handoff; a handoff is not a delivery receipt.
 */
export const trackGameEvent = (
  eventName: GameEventName,
  data: GameEventData,
  target: AnalyticsTarget | undefined = defaultTarget(),
) => {
  const collected = sendToCollector(target, { name: eventName, props: data });

  let umamiHandedOff = false;
  if (typeof target?.umami?.track === "function") {
    try {
      target.umami.track(eventName, data);
      umamiHandedOff = true;
    } catch {
      umamiHandedOff = false;
    }
  }
  return umamiHandedOff || collected !== false;
};

const umamiOutcome = async (target: AnalyticsTarget | undefined, eventName: GameEventName, data: GameEventData) => {
  if (typeof target?.umami?.track !== "function") return false;
  try {
    const result = await target.umami.track(eventName, data);
    if (result === false) return false;
    if (typeof result === "object" && result !== null) {
      if ("ok" in result && result.ok === false) return false;
      if ("success" in result && result.success === false) return false;
      if ("status" in result && typeof result.status === "number" && result.status >= 400) return false;
      if ("error" in result && result.error) return false;
    }
    return true;
  } catch {
    return false;
  }
};

// Snapshot delivery needs the asynchronous outcome; existing UI events keep their
// synchronous handoff behaviour. Success means Umami accepted the handoff or the
// collector confirmed receipt, so a snapshot is only retried when both failed.
export const trackGameEventAsync = async (
  eventName: GameEventName,
  data: GameEventData,
  target: AnalyticsTarget | undefined = defaultTarget(),
) => {
  const collected = sendToCollector(target, { name: eventName, props: data });
  const [umami, collector] = await Promise.all([
    umamiOutcome(target, eventName, data),
    collected === false ? false : collected,
  ]);
  return umami || collector;
};

/**
 * Records a page view with the collector. Umami records page views itself.
 * Pass the document referrer only for the first page of a visit.
 */
export const trackPageView = (
  referrer?: string,
  target: AnalyticsTarget | undefined = defaultTarget(),
) => sendToCollector(target, { name: null, referrer }) !== false;
