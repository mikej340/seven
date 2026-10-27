import type { ShareStatus } from "./use-score-sharing";

type GameSummaryProps = {
  score: number;
  foundCount: number;
  solutionWords: readonly string[];
  pangramWordSet: ReadonlySet<string>;
  shareStatus: ShareStatus;
  shareButtonLabel: string;
  onShare: () => void;
  onRetry: () => void;
};

export function GameSummary({
  score, foundCount, solutionWords, pangramWordSet, shareStatus, shareButtonLabel, onShare, onRetry,
}: GameSummaryProps) {
  return (
    <section className="game-summary" aria-labelledby="summary-title">
      <p className="summary-kicker">Puzzle complete</p>
      <h2 id="summary-title">Every word found</h2>

      <div className="summary-stats" aria-label="Game summary">
        <div><strong>{score}</strong><span>Score</span></div>
        <div><strong>{foundCount}</strong><span>Found</span></div>
        <div><strong className="rank-stat">Queen Bee</strong><span>Rank</span></div>
      </div>

      <button
        className="score-share-summary"
        type="button"
        disabled={shareStatus === "sharing"}
        onClick={onShare}
      >
        <span aria-live="polite">{shareButtonLabel}</span>
      </button>

      <div className="answer-list">
        <h3>All words</h3>
        <div className="answer-chips">
          {solutionWords.map((word) => (
            <span className={pangramWordSet.has(word) ? "pangram-word" : ""} key={word}>
              {pangramWordSet.has(word) ? "✦ " : ""}{word}
            </span>
          ))}
        </div>
      </div>

      <button className="retry-button" type="button" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}
