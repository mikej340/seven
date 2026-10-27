import { useCallback, useRef, useState } from "react";
import type { GameStats } from "@/lib/game-rules";
import { formatPuzzleDate } from "@/lib/puzzles";
import NavigationMenu from "../navigation-menu";
import { FoundWordsDialog } from "./found-words-dialog";
import { GameSummary } from "./game-summary";
import { LetterWheel } from "./letter-wheel";
import { ScoreCard } from "./score-card";
import type { PuzzleGameController } from "./use-puzzle-game";
import { WordFeedback } from "./word-feedback";

type ReadyGameProps = {
  controller: PuzzleGameController;
  game: NonNullable<PuzzleGameController["game"]>;
  stats: GameStats;
};

function ReadyGame({ controller, game, stats }: ReadyGameProps) {
  const [foundWordsOpen, setFoundWordsOpen] = useState(false);
  const foundWordsButtonRef = useRef<HTMLButtonElement>(null);
  const closeFoundWords = useCallback(() => {
    setFoundWordsOpen(false);
    queueMicrotask(() => foundWordsButtonRef.current?.focus());
  }, []);
  const { puzzle, selection, rules } = game;
  const {
    outerLetters, currentWord, foundWords, feedback, canRevealAnswers,
    shareStatus, shareButtonLabel, shareScore, addLetter, deleteLetter,
    shuffleLetters, submitWord, retryGame,
  } = controller;
  const onShare = () => void shareScore();

  return (
    <main className={`page-shell${foundWordsOpen ? " has-modal" : ""}`}>
      <div className="ambient-leaves ambient-leaves-left" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="ambient-leaves ambient-leaves-right" aria-hidden="true">
        <i /><i /><i />
      </div>

      <section
        className={`game-card ${stats.gameComplete ? "is-complete" : ""}`}
        aria-labelledby="game-title"
      >
        <header className="game-heading">
          <NavigationMenu
            current={selection.isToday ? "today" : undefined}
            feedbackPuzzleDate={puzzle.date}
          />
          <h1 id="game-title">Seven</h1>
          {stats.gameComplete ? <p className="puzzle-date">
            {selection.isToday ? "Today" : formatPuzzleDate(puzzle.date, false)}
          </p> : null}
          {selection.notice ? (
            <p className="puzzle-notice" role="status">{selection.notice}</p>
          ) : null}
        </header>

        {stats.gameComplete ? (
          <GameSummary
            score={stats.score}
            foundCount={foundWords.length}
            solutionWords={rules.solutionWords}
            pangramWordSet={rules.pangramWordSet}
            shareStatus={shareStatus}
            shareButtonLabel={shareButtonLabel}
            onShare={onShare}
            onRetry={retryGame}
          />
        ) : (
          <div className="interaction-area">
            <ScoreCard
              puzzleDate={puzzle.date}
              stats={stats}
              maximumScore={puzzle.maximumScore}
              foundCount={foundWords.length}
              canRevealAnswers={canRevealAnswers}
              foundWordsOpen={foundWordsOpen}
              foundWordsButtonRef={foundWordsButtonRef}
              onOpenFoundWords={() => setFoundWordsOpen(true)}
              shareStatus={shareStatus}
              shareButtonLabel={shareButtonLabel}
              onShare={onShare}
            />
            <WordFeedback currentWord={currentWord} feedback={feedback} puzzleDate={puzzle.date} />
            <LetterWheel outerLetters={outerLetters} centreLetter={rules.centreLetter} onAddLetter={addLetter} />
            <div className="game-controls" aria-label="Word controls">
              <button type="button" onClick={deleteLetter} disabled={!currentWord}>
                Delete
              </button>
              <button type="button" onClick={shuffleLetters}>Shuffle</button>
              <button className="submit-button" type="button" onClick={submitWord}>
                Enter
              </button>
            </div>
          </div>
        )}
      </section>

      {foundWordsOpen ? (
        <FoundWordsDialog
          puzzleDate={puzzle.date}
          foundWords={foundWords}
          solutionWords={rules.solutionWords}
          pangramWordSet={rules.pangramWordSet}
          canRevealAnswers={canRevealAnswers}
          onClose={closeFoundWords}
        />
      ) : null}
    </main>
  );
}

export function GameView({ controller }: { controller: PuzzleGameController }) {
  const { game, stats, loading, loadError, loadSelectedGame } = controller;
  if (loading || game === null || stats === null) {
    return (
      <main className="page-shell">
        <section className="game-card load-card" aria-live="polite">
          <header className="game-heading">
            <NavigationMenu current="today" />
            <h1>Seven</h1>
          </header>
          {loadError ? (
            <>
              <p>{loadError}</p>
              <button className="retry-button" type="button" onClick={() => void loadSelectedGame()}>
                Try again
              </button>
            </>
          ) : (
            <p>Loading today&apos;s puzzle…</p>
          )}
        </section>
      </main>
    );
  }
  return <ReadyGame key={game.viewSession} controller={controller} game={game} stats={stats} />;
}
