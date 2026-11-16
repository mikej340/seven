import { useEffect, useRef, useState } from "react";
import { formatPuzzleDate } from "@/lib/puzzles";

type FoundWordsDialogProps = {
  puzzleDate: string;
  /** The puzzle's seven letters (in alphabetical order) and its centre letter, for the heading. */
  letters: string;
  centreLetter: string;
  foundWords: readonly string[];
  solutionWords: readonly string[];
  pangramWordSet: ReadonlySet<string>;
  canRevealAnswers: boolean;
  onClose: () => void;
};

const plural = (total: number, word: string) => `${word}${total === 1 ? "" : "s"}`;

// "32 words · 1 pangram" before anything is found; afterwards progress against
// those totals: "12 / 32 words · 0 / 1 pangram".
const summaryPart = (found: number, total: number, word: string, showProgress: boolean) =>
  `${showProgress ? `${found} / ` : ""}${total} ${plural(total, word)}`;

export function FoundWordsDialog({
  puzzleDate, letters, centreLetter, foundWords, solutionWords, pangramWordSet, canRevealAnswers, onClose,
}: FoundWordsDialogProps) {
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const closeFoundWordsButtonRef = useRef<HTMLButtonElement>(null);
  const foundWordsDialogRef = useRef<HTMLElement>(null);
  const foundWordSet = new Set(foundWords);
  const centre = centreLetter.toUpperCase();
  const headingLetters = letters.toUpperCase().split("");
  // One panel serves play and /daily/<date>/answers/. With answers available
  // and nothing found yet it invites the visitor to play first.
  const invitesPlay = canRevealAnswers && foundWords.length === 0;
  // When answers can be revealed, every answer stays in the page (folded away
  // until revealed) so search engines can read answer pages; revealing only
  // changes what is shown.
  const listedWords = (canRevealAnswers ? solutionWords : foundWords).toSorted();
  const visibleWordCount = answersRevealed ? listedWords.length : foundWords.length;
  const pangramsFound = foundWords.filter((word) => pangramWordSet.has(word)).length;
  const showProgress = foundWords.length > 0;
  const summary = [
    summaryPart(foundWords.length, solutionWords.length, "word", showProgress),
    summaryPart(pangramsFound, pangramWordSet.size, "pangram", showProgress),
  ].join(" · ");

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
        aria-label="Close words"
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
            <h2
              id="found-words-dialog-title"
              className="found-words-letters"
              aria-label={`Words from ${headingLetters.join(", ")}, centre ${centre}`}
            >
              {headingLetters.map((letter) => (
                <span className={letter === centre ? "is-centre" : undefined} aria-hidden="true" key={letter}>
                  {letter}
                </span>
              ))}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            ref={closeFoundWordsButtonRef}
            aria-label={invitesPlay ? "Play this puzzle" : undefined}
          >
            {invitesPlay ? "Play" : "Close"}
          </button>
        </header>
        <p className="found-words-dialog-count">{summary}</p>
        {canRevealAnswers ? (
          <div className="found-words-reveal-control">
            <button
              type="button"
              aria-pressed={answersRevealed}
              onClick={() => setAnswersRevealed((revealed) => !revealed)}
            >
              {answersRevealed ? "Hide revealed words" : "Reveal all words"}
            </button>
          </div>
        ) : null}
        <div
          className="found-words-list"
          role={visibleWordCount > 0 ? "list" : undefined}
        >
          {visibleWordCount === 0 ? (
            <p className="found-words-empty">
              {invitesPlay ? "No words found yet. Reveal the answers, or tap Play to try it." : "No words found yet."}
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
