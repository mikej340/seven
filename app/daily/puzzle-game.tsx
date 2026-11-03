"use client";

import { GameView } from "@/app/_game/game-view";
import { usePuzzleGame } from "@/app/_game/use-puzzle-game";

export default function PuzzleGame({ date }: { date: string }) {
  const game = usePuzzleGame(date);
  return <GameView controller={game} showPastPuzzleNotice />;
}
