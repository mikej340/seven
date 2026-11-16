"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FoundWordsDialog } from "@/app/_game/found-words-dialog";
import { GameView, type AnswersView } from "@/app/_game/game-view";
import { usePuzzleGame } from "@/app/_game/use-puzzle-game";
import NavigationMenu from "@/app/navigation-menu";
import { GAME_EVENTS, trackGameEvent } from "@/lib/analytics";
import { formatPuzzleDate, PUZZLE_BASE_PATH, utcDateString } from "@/lib/puzzles";
import type { BuildAnswers } from "@/lib/puzzle-answers-build";

type AnswersGameProps = {
  date: string;
  /** Present when the puzzle's day had passed at build time. */
  buildAnswers: BuildAnswers | null;
};

const dayAfter = (date: string) => {
  const next = new Date(`${date}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

export default function AnswersGame({ date, buildAnswers }: AnswersGameProps) {
  const game = usePuzzleGame(date);
  const router = useRouter();
  const gameHref = `${PUZZLE_BASE_PATH}/daily/${date}/`;
  // Decided after mount so the first render matches the static HTML.
  const [released, setReleased] = useState<boolean | null>(null);

  useEffect(() => {
    const isReleased = date < utcDateString();
    queueMicrotask(() => setReleased(isReleased));
    if (isReleased) trackGameEvent(GAME_EVENTS.answersPageOpened, { puzzle: date });
  }, [date]);

  const answersView = useMemo<AnswersView>(() => ({
    onPlay: () => {
      // Closing the answers panel continues into the puzzle at its game URL.
      window.history.replaceState(null, "", gameHref);
      trackGameEvent(GAME_EVENTS.answersPagePlay, { puzzle: date });
    },
  }), [date, gameHref]);

  if (released === false) {
    return (
      <main className="page-shell">
        <section className="game-card load-card" aria-live="polite">
          <header className="game-heading">
            <NavigationMenu />
            <h1>Seven</h1>
          </header>
          <p>
            Answers for {formatPuzzleDate(date, false)} will be available
            from {formatPuzzleDate(dayAfter(date), false)}.
          </p>
          <a className="retry-button" href={`${PUZZLE_BASE_PATH}/`}>Play today&apos;s puzzle</a>
        </section>
      </main>
    );
  }

  const staticAnswers = buildAnswers === null ? null : (
    <FoundWordsDialog
      puzzleDate={date}
      foundWords={[]}
      solutionWords={buildAnswers.answers.map((word) => word.toUpperCase())}
      pangramWordSet={new Set(buildAnswers.pangrams.map((word) => word.toUpperCase()))}
      canRevealAnswers
      // Before the game has loaded, Play goes to the plain game page.
      onClose={() => router.push(`/daily/${date}/`)}
      mode="answers"
      maximumScore={buildAnswers.maximumScore}
    />
  );

  // Only open the answers panel once the requested puzzle itself has loaded.
  const loadedRequestedPuzzle = game.game?.puzzle.date === date;
  return (
    <GameView
      // Hold the loading view until the release check has run, so the answers
      // panel is decided before the game first renders.
      controller={released === null ? { ...game, loading: true } : game}
      answersView={released && loadedRequestedPuzzle ? answersView : undefined}
      loadingOverlay={staticAnswers}
    />
  );
}
