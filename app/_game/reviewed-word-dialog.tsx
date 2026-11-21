import { useEffect, useRef } from "react";
import { explainReviewedWord } from "@/lib/feedback";
import type { ReviewedWordOutcome } from "@/lib/reviewed-words";

type ReviewedWordDialogProps = {
  word: string;
  outcome: ReviewedWordOutcome;
  onClose: () => void;
};

// Explains a word the editor has reviewed. A word accepted after this puzzle
// was set opens this straight away, kindly rather than as a rejection; other
// outcomes open it only when the player taps "Why not?".
export function ReviewedWordDialog({ word, outcome, onClose }: ReviewedWordDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const addedLater = outcome === "accepted";

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "Tab") {
        // The close button is the only control, so focus stays on it.
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    closeButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="found-words-modal-layer">
      <button
        className="found-words-backdrop"
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        className={`reviewed-word-dialog${addedLater ? "" : " is-declined"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviewed-word-title"
        aria-describedby="reviewed-word-message"
      >
        {addedLater ? (
          <>
            <span className="reviewed-word-icon" aria-hidden="true">✓</span>
            <h2 id="reviewed-word-title">Good find!</h2>
            <p id="reviewed-word-message">
              We added <strong>{word}</strong> to the word list after this puzzle was set,
              so it doesn’t score here. It will count in later puzzles.
            </p>
          </>
        ) : (
          <>
            <h2 id="reviewed-word-title">Already reviewed</h2>
            <p id="reviewed-word-message">
              <EmphasisedWord text={explainReviewedWord(word, outcome)} word={word} />
            </p>
          </>
        )}
        <button type="button" onClick={onClose} ref={closeButtonRef}>
          OK
        </button>
      </section>
    </div>
  );
}

// The shared explanation names the word once; show it as in "Good find!".
function EmphasisedWord({ text, word }: { text: string; word: string }) {
  const index = text.indexOf(word);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <strong>{word}</strong>
      {text.slice(index + word.length)}
    </>
  );
}
