import type { GameFeedback } from "@/lib/game-rules";
import { PUZZLE_BASE_PATH } from "@/lib/puzzles";

type WordFeedbackProps = {
  currentWord: string;
  feedback: GameFeedback | null;
  puzzleDate: string;
};

export function WordFeedback({ currentWord, feedback, puzzleDate }: WordFeedbackProps) {
  return (
    <div
      className={`word-panel ${feedback ? `is-${feedback.kind}` : ""}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="word-display">
        {currentWord || feedback?.word ? (
          <span className={`current-word ${currentWord ? "has-word" : ""}`}>
            {currentWord || feedback?.word}
          </span>
        ) : null}
        <span className="feedback-line">
          {feedback ? (
            <span
              className={`feedback ${feedback.kind}`}
              key={feedback.id}
              role="status"
            >
              {feedback.kind === "accepted" ? (
                <>
                  <span className="sr-only">{feedback.message}</span>
                  <span className="feedback-icon" aria-hidden="true">✓</span>
                  <span aria-hidden="true">Correct · +{feedback.points} {feedback.points === 1 ? "point" : "points"}</span>
                </>
              ) : null}
              {feedback.kind === "pangram" ? (
                <>
                  <span className="sr-only">{feedback.message}</span>
                  <span className="feedback-icon" aria-hidden="true">✦</span>
                  <span aria-hidden="true">Pangram · +{feedback.points}</span>
                </>
              ) : null}
              {feedback.kind === "rejected" || feedback.kind === "prompt" ? (
                <>
                  {feedback.message}
                  {feedback.kind === "rejected" && feedback.message === "Not accepted" && feedback.word ? (
                    <a
                      className="suggest-word-link"
                      href={`${PUZZLE_BASE_PATH}/feedback/?type=word&puzzle=${puzzleDate}&word=${encodeURIComponent(feedback.word)}`}
                    >
                      Suggest this word
                    </a>
                  ) : null}
                </>
              ) : null}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
