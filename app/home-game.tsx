"use client";

import { GameView } from "./_game/game-view";
import { usePuzzleGame } from "./_game/use-puzzle-game";

export default function HomeGame() {
  const game = usePuzzleGame();
  return <GameView controller={game} />;
}
