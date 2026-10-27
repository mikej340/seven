"use client";

import { useCallback, useState } from "react";
import { GAME_EVENTS, trackGameEvent } from "@/lib/analytics";
import type { GameStats } from "@/lib/game-rules";
import { formatPuzzleDate, type DailyPuzzle } from "@/lib/puzzles";
import { createScoreCardPng, deliverScoreImage, scoreCardFileName } from "@/lib/share-score";

export type ShareStatus = "idle" | "sharing" | "shared" | "copied" | "failed";

export function useScoreSharing() {
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const resetShareStatus = useCallback(() => setShareStatus("idle"), []);

  const shareScore = async (puzzle: DailyPuzzle, stats: GameStats, foundCount: number) => {
    if (shareStatus === "sharing") return;
    setShareStatus("sharing");

    try {
      const image = createScoreCardPng({
        date: formatPuzzleDate(puzzle.date, false),
        rank: stats.currentRank.name,
        score: stats.score,
        progress: stats.progress,
        nextRankText: stats.nextRankText,
        foundWords: foundCount,
      });
      const result = await deliverScoreImage(image, scoreCardFileName(puzzle.date));
      if (result === "cancelled") {
        setShareStatus("idle");
        return;
      }
      if (result === "failed") {
        setShareStatus("failed");
        return;
      }

      setShareStatus(result);
      trackGameEvent(GAME_EVENTS.scoreShared, {
        puzzle: puzzle.id,
        method: result === "shared" ? "native" : "clipboard",
      });
    } catch {
      setShareStatus("failed");
    }
  };

  const shareButtonLabel = shareStatus === "sharing"
    ? "Sharing…"
    : shareStatus === "shared"
      ? "Shared"
      : shareStatus === "copied"
        ? "Score copied"
        : shareStatus === "failed"
          ? "Couldn’t share"
          : "Share score";

  return { shareStatus, shareButtonLabel, resetShareStatus, shareScore };
}
