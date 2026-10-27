import { useEffect, useRef, useState } from "react";
import { formatPuzzleDate } from "@/lib/puzzles";

type FoundWordsDialogProps = {
  puzzleDate: string;
  foundWords: readonly string[];
  solutionWords: readonly string[];
  pangramWordSet: ReadonlySet<string>;
  canRevealAnswers: boolean;
  onClose: () => void;
};

export function FoundWordsDialog({
  puzzleDate, foundWords, solutionWords, pangramWordSet, canRevealAnswers, onClose,
}: FoundWordsDialogProps) {
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const closeFoundWordsButtonRef = useRef<HTMLButtonElement>(null);
  const foundWordsDialogRef = useRef<HTMLElement>(null);
  const foundWordSet = new Set(foundWords);
  const displayedWords = (answersRevealed ? solutionWords : foundWords).toSorted();
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
        aria-label="Close found words"
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
            <h2 id="found-words-dialog-title">Found words</h2>
          </div>
          <button type="button" onClick={onClose} ref={closeFoundWordsButtonRef}>
            Close
          </button>
        </header>
        <p className="found-words-dialog-count">
          {answersRevealed ? (
            <>
              {foundWords.length} found · {revealedWordCount} revealed · {solutionWords.length} total
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
            <span>Available for past puzzles</span>
          </div>
        ) : null}
        <div
          className="found-words-list"
          role={displayedWords.length > 0 ? "list" : undefined}
        >
          {displayedWords.length === 0 ? (
            <p className="found-words-empty">No words found yet.</p>
          ) : null}
          {displayedWords.map((word) => {
            const isRevealedWord = answersRevealed && !foundWordSet.has(word);
            const isPangram = pangramWordSet.has(word);

            return (
              <div
                className={`${isPangram ? "pangram-word" : ""}${isRevealedWord ? " revealed-word" : ""}`}
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
