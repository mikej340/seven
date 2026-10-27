import type { RefObject } from "react";
import type { GameStats } from "@/lib/game-rules";
import { formatPuzzleDate } from "@/lib/puzzles";
import type { ShareStatus } from "./use-score-sharing";

type ScoreCardProps = {
  puzzleDate: string;
  stats: GameStats;
  maximumScore: number;
  foundCount: number;
  canRevealAnswers: boolean;
  foundWordsOpen: boolean;
  foundWordsButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenFoundWords: () => void;
  shareStatus: ShareStatus;
  shareButtonLabel: string;
  onShare: () => void;
};

export function ScoreCard({
  puzzleDate, stats, maximumScore, foundCount, canRevealAnswers, foundWordsOpen,
  foundWordsButtonRef, onOpenFoundWords, shareStatus, shareButtonLabel, onShare,
}: ScoreCardProps) {
  const { currentRank, score, progress } = stats;
  return (
    <fieldset className="rank-panel">
      <legend className="scorecard-date">
        <time dateTime={puzzleDate}>{formatPuzzleDate(puzzleDate, false)}</time>
      </legend>
      <div className="rank-content">
        <div className="rank-copy">
          <div>
            <strong><span className="sr-only">Rank: </span>{currentRank.name}</strong>
          </div>
          <div className="rank-score">
            <strong>{score}</strong>
            <span>points</span>
          </div>
        </div>
        <div
          className="rank-track"
          role="progressbar"
          aria-label={`Rank progress: ${currentRank.name}`}
          aria-valuemin={0}
          aria-valuemax={maximumScore}
          aria-valuenow={Math.min(score, maximumScore)}
        >
          <span className="rank-fill" style={{ width: `${progress * 100}%` }} />
          <i className="rank-sprout" style={{ left: `${progress * 100}%` }} aria-hidden="true" />
        </div>
        <div className="rank-footer">
          <p className="rank-next">
            {stats.nextRankText}
          </p>
          <div className="rank-actions">
            <section className="found-words" aria-label="Found words">
              <button
                className="found-words-button"
                type="button"
                aria-label={foundCount
                  ? `View ${foundCount} found ${foundCount === 1 ? "word" : "words"}`
                  : canRevealAnswers
                    ? "View words and reveal answers"
                    : "No words found yet"}
                aria-haspopup="dialog"
                aria-expanded={foundWordsOpen}
                disabled={foundCount === 0 && !canRevealAnswers}
                onClick={onOpenFoundWords}
                ref={foundWordsButtonRef}
              >
                <span>{foundCount} {foundCount === 1 ? "word" : "words"} found</span>
                <svg className="found-words-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </section>
            <button
              className="score-share-button"
              type="button"
              aria-label={shareStatus === "idle" ? "Share score" : shareButtonLabel}
              disabled={shareStatus === "sharing"}
              onClick={onShare}
            >
              <svg className="score-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15V3m-4 4 4-4 4 4M7 10H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
              </svg>
              <span aria-live="polite">{shareStatus === "idle" ? "Share" : shareButtonLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
