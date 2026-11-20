import { useCallback, useRef, useState, type ReactNode } from "react";
import type { GameStats } from "@/lib/game-rules";
import { PUZZLE_BASE_PATH } from "@/lib/puzzles";
import NavigationMenu from "../navigation-menu";
import { AddedLaterDialog } from "./added-later-dialog";
import { FoundWordsDialog } from "./found-words-dialog";
import { GameSummary } from "./game-summary";
import { LetterWheel } from "./letter-wheel";
import { ScoreCard } from "./score-card";
import { PuzzleDate } from "./puzzle-date";
import type { PuzzleGameController } from "./use-puzzle-game";
import { WordFeedback } from "./word-feedback";

/** The game was opened at /daily/<date>/answers/; onPlay runs when that first panel closes. */
export type AnswersView = { onPlay: () => void };

const currentUrl = () => `${window.location.pathname}${window.location.search}`;
// The address may arrive with or without its trailing slash.
const isAt = (href: string | null) => window.location.pathname.replace(/\/?$/, "/") === href;

type ReadyGameProps = {
  controller: PuzzleGameController;
  game: NonNullable<PuzzleGameController["game"]>;
  stats: GameStats;
  answersView?: AnswersView;
};

function ReadyGame({ controller, game, stats, answersView }: ReadyGameProps) {
  const { puzzle, selection, rules } = game;
  // Once a puzzle's answers can be revealed, its words panel is the answers
  // page: the panel is open exactly while the address is the answers URL.
  const gameHref = `${PUZZLE_BASE_PATH}/daily/${puzzle.date}/`;
  const answersHref = controller.canRevealAnswers ? `${gameHref}answers/` : null;
  const [foundWordsOpen, setFoundWordsOpen] = useState(
    () => answersView !== undefined && isAt(answersHref),
  );
  const openedOnAnswersPage = useRef(foundWordsOpen);
  // Where closing the panel returns to; the game page when opened on the answers URL.
  const returnUrl = useRef(gameHref);
  const foundWordsButtonRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const openFoundWords = useCallback(() => {
    if (answersHref !== null && !isAt(answersHref)) {
      returnUrl.current = currentUrl();
      window.history.replaceState(null, "", answersHref);
    }
    setFoundWordsOpen(true);
  }, [answersHref]);
  const closeFoundWords = useCallback(() => {
    setFoundWordsOpen(false);
    if (answersHref !== null && isAt(answersHref)) {
      window.history.replaceState(null, "", returnUrl.current);
    }
    if (openedOnAnswersPage.current) {
      openedOnAnswersPage.current = false;
      answersView?.onPlay();
    }
    queueMicrotask(() => foundWordsButtonRef.current?.focus());
  }, [answersHref, answersView]);
  const {
    outerLetters, currentWord, foundWords, feedback, canRevealAnswers,
    shareStatus, shareButtonLabel, shareScore, addLetter, deleteLetter,
    shuffleLetters, submitWord, retryGame, addedLaterWord, dismissAddedLaterWord,
  } = controller;
  const modalOpen = foundWordsOpen || addedLaterWord !== null;
  const onShare = () => void shareScore();

  return (
    <main className={`page-shell${modalOpen ? " has-modal" : ""}`}>
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
          {stats.gameComplete ? (
            <PuzzleDate
              date={puzzle.date}
              isToday={selection.isToday}
              isPastPuzzle={controller.isPastPuzzle}
            />
          ) : null}
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
              isPastPuzzle={controller.isPastPuzzle}
              stats={stats}
              maximumScore={puzzle.maximumScore}
              foundCount={foundWords.length}
              foundWordsOpen={foundWordsOpen}
              foundWordsButtonRef={foundWordsButtonRef}
              answersHref={answersHref}
              onOpenFoundWords={openFoundWords}
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
          letters={puzzle.letters}
          centreLetter={puzzle.centre}
          foundWords={foundWords}
          solutionWords={rules.solutionWords}
          pangramWordSet={rules.pangramWordSet}
          canRevealAnswers={canRevealAnswers}
          onClose={closeFoundWords}
        />
      ) : null}

      {addedLaterWord !== null ? (
        <AddedLaterDialog word={addedLaterWord} onClose={dismissAddedLaterWord} />
      ) : null}
    </main>
  );
}

type GameViewProps = {
  controller: PuzzleGameController;
  answersView?: AnswersView;
  /** Shown over the loading card, e.g. answers written into the static HTML. */
  loadingOverlay?: ReactNode;
};

export function GameView({ controller, answersView, loadingOverlay }: GameViewProps) {
  const { game, stats, loading, loadError, loadSelectedGame } = controller;
  if (loading || game === null || stats === null) {
    return (
      <main className={`page-shell${loadingOverlay ? " has-modal" : ""}`}>
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
        {loadError ? null : loadingOverlay}
      </main>
    );
  }
  return (
    <ReadyGame
      key={game.viewSession}
      controller={controller}
      game={game}
      stats={stats}
      answersView={answersView}
    />
  );
}
