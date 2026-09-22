export const GAME_EVENTS = {
  puzzleEngaged: "puzzle-engaged",
  pangramFound: "pangram-found",
  rankReached: "rank-reached",
  puzzleCompleted: "puzzle-completed",
  scoreShared: "score-shared",
} as const;

export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];
export type GameEventData = Record<string, string | number | boolean>;

type UmamiTracker = {
  track: (eventName: string, data?: GameEventData) => unknown;
};

type AnalyticsTarget = {
  umami?: UmamiTracker;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export const trackGameEvent = (
  eventName: GameEventName,
  data: GameEventData,
  target: AnalyticsTarget | undefined =
    typeof window === "undefined" ? undefined : window,
) => {
  if (typeof target?.umami?.track !== "function") return false;

  try {
    target.umami.track(eventName, data);
    return true;
  } catch {
    return false;
  }
};
