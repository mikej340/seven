import { useEffect, useRef } from "react";

type AddedLaterDialogProps = {
  word: string;
  onClose: () => void;
};

// A puzzle's answers are fixed when it is set, so a word the editor accepts
// later still misses out here. Explain that kindly rather than as a rejection.
export function AddedLaterDialog({ word, onClose }: AddedLaterDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
        className="added-later-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="added-later-title"
        aria-describedby="added-later-message"
      >
        <span className="added-later-icon" aria-hidden="true">✓</span>
        <h2 id="added-later-title">Good find!</h2>
        <p id="added-later-message">
          We added <strong>{word}</strong> to the word list after this puzzle was set,
          so it doesn’t score here. It will count in later puzzles.
        </p>
        <button type="button" onClick={onClose} ref={closeButtonRef}>
          OK
        </button>
      </section>
    </div>
  );
}
