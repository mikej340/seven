"use client";

import { GameView } from "@/app/_game/game-view";
import { usePuzzleGame } from "@/app/_game/use-puzzle-game";

export default function PuzzleGame() {
  const game = usePuzzleGame("2026-11-03");
  return <GameView controller={game} showPastPuzzleNotice />;
}
