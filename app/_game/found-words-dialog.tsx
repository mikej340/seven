import { useEffect, useRef, useState } from "react";
import { answersPageHref, formatPuzzleDate } from "@/lib/puzzles";

type FoundWordsDialogProps = {
  puzzleDate: string;
  foundWords: readonly string[];
  solutionWords: readonly string[];
  pangramWordSet: ReadonlySet<string>;
  canRevealAnswers: boolean;
  onClose: () => void;
  /** "answers" is the /daily/<date>/answers/ view: titled Answers, closes into play. */
  mode?: "found" | "answers";
  maximumScore?: number;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function FoundWordsDialog({
  puzzleDate, foundWords, solutionWords, pangramWordSet, canRevealAnswers, onClose,
  mode = "found", maximumScore,
}: FoundWordsDialogProps) {
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const closeFoundWordsButtonRef = useRef<HTMLButtonElement>(null);
  const foundWordsDialogRef = useRef<HTMLElement>(null);
  const foundWordSet = new Set(foundWords);
  const isAnswersMode = mode === "answers";
  // When answers can be revealed, every answer stays in the page (folded away
  // until revealed) so search engines can read answer pages; revealing only
  // changes what is shown.
  const listedWords = (canRevealAnswers ? solutionWords : foundWords).toSorted();
  const visibleWordCount = answersRevealed ? listedWords.length : foundWords.length;
  const revealedWordCount = answersRevealed ? solutionWords.length - foundWords.length : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Tab") {
        const focusable = Array.from(
          foundWordsDialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])",
          ) ?? [],
        );
        const first = focusable.at(0);
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    closeFoundWordsButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="found-words-modal-layer">
      <button
        className="found-words-backdrop"
        type="button"
        aria-label={isAnswersMode ? "Close answers and play" : "Close found words"}
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        className="found-words-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="found-words-dialog-title"
        ref={foundWordsDialogRef}
      >
        <header className="found-words-dialog-header">
          <div>
            <p>{formatPuzzleDate(puzzleDate, false)}</p>
            <h2 id="found-words-dialog-title">{isAnswersMode ? "Answers" : "Found words"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            ref={closeFoundWordsButtonRef}
            aria-label={isAnswersMode ? "Play this puzzle" : undefined}
          >
            {isAnswersMode ? "Play" : "Close"}
          </button>
        </header>
        <p className="found-words-dialog-count">
          {answersRevealed ? (
            <>
              {foundWords.length} found · {revealedWordCount} revealed · {solutionWords.length} total
            </>
          ) : isAnswersMode ? (
            <>
              {plural(solutionWords.length, "word")} · {plural(pangramWordSet.size, "pangram")}
              {maximumScore === undefined ? null : <> · {maximumScore} points</>}
              {foundWords.length > 0 ? <> · {foundWords.length} found</> : null}
            </>
          ) : (
            <>{foundWords.length} {foundWords.length === 1 ? "word" : "words"} found</>
          )}
        </p>
        {canRevealAnswers ? (
          <div className="found-words-reveal-control">
            <button
              type="button"
              aria-pressed={answersRevealed}
              onClick={() => setAnswersRevealed((revealed) => !revealed)}
            >
              {answersRevealed ? "Hide revealed words" : "Reveal all words"}
            </button>
            {isAnswersMode ? (
              <span>Try it first: tap Play</span>
            ) : (
              <a href={answersPageHref(puzzleDate)}>Answers page</a>
            )}
          </div>
        ) : null}
        <div
          className="found-words-list"
          role={visibleWordCount > 0 ? "list" : undefined}
        >
          {visibleWordCount === 0 ? (
            <p className="found-words-empty">
              {isAnswersMode ? "No words found yet. Reveal the answers, or tap Play to try it." : "No words found yet."}
            </p>
          ) : null}
          {listedWords.map((word) => {
            const isFound = foundWordSet.has(word);
            const isRevealedWord = answersRevealed && !isFound;
            const isPangram = pangramWordSet.has(word);

            return (
              <div
                className={`${isPangram ? "pangram-word" : ""}${!isFound ? " revealed-word" : ""}`}
                hidden={!isFound && !answersRevealed}
                role="listitem"
                aria-label={`${word}${isPangram ? ", pangram" : ""}${isRevealedWord ? ", revealed" : ""}`}
                key={word}
              >
                <span>{word}</span>
                <span className="word-badges" aria-hidden="true">
                  {isPangram ? <strong className="pangram-badge">Pangram ✦</strong> : null}
                  {isRevealedWord ? <strong className="revealed-badge">Revealed</strong> : null}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
