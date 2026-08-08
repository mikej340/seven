"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearGameProgress,
  loadGameProgress,
  saveGameProgress,
} from "@/lib/game-save";

const outerSlots = [
  { position: "top", tone: "sage", rotation: "4deg" },
  { position: "upper-left", tone: "olive", rotation: "-42deg" },
  { position: "upper-right", tone: "lime", rotation: "44deg" },
  { position: "lower-left", tone: "soft", rotation: "-126deg" },
  { position: "lower-right", tone: "forest", rotation: "128deg" },
  { position: "bottom", tone: "fresh", rotation: "176deg" },
] as const;

const centreLetter = "M";
const startingLetters = ["A", "B", "H", "O", "R", "T"];
const puzzleId = [...startingLetters, centreLetter].sort().join("").toLowerCase()
  + `:${centreLetter.toLowerCase()}`;

// Hardcoded puzzle data while the generated catalogue is being integrated.
const solutionWords = [
  "AMBO",
  "AMMO",
  "AROMA",
  "ATOM",
  "BAMBOO",
  "BARM",
  "BARROOM",
  "BATHMAT",
  "BATHROOM",
  "BOMB",
  "BOOM",
  "BOTTOM",
  "BROOM",
  "HARM",
  "HOMO",
  "MAHATMA",
  "MAMA",
  "MAMBA",
  "MAMBO",
  "MAMMA",
  "MAMMOTH",
  "MARA",
  "MARMOT",
  "MART",
  "MATT",
  "MOAT",
  "MOOR",
  "MOOT",
  "MORA",
  "MORT",
  "MORTAR",
  "MOTH",
  "MOTMOT",
  "MOTOR",
  "MOTORBOAT",
  "MOTTO",
  "RHOMB",
  "ROAM",
  "ROOM",
  "TOMATO",
  "TOMB",
  "TRAM",
];

const solutionWordSet = new Set(solutionWords);

const ranks = [
  { name: "Beginner", threshold: 0 },
  { name: "Good Start", threshold: 0.02 },
  { name: "Moving Up", threshold: 0.05 },
  { name: "Good", threshold: 0.08 },
  { name: "Solid", threshold: 0.15 },
  { name: "Nice", threshold: 0.25 },
  { name: "Great", threshold: 0.4 },
  { name: "Amazing", threshold: 0.5 },
  { name: "Genius", threshold: 0.7 },
  { name: "Queen Bee", threshold: 1 },
] as const;

type Feedback = {
  id: number;
  kind: "accepted" | "pangram" | "rejected" | "prompt";
  message: string;
  word?: string;
  points?: number;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

const isPangramWord = (word: string) => {
  const letters = new Set(word);
  return [centreLetter, ...startingLetters].every((letter) => letters.has(letter));
};

const scoreWord = (word: string) => {
  const isPangram = isPangramWord(word);
  const baseScore = word.length <= 4 ? 1 : word.length;
  return baseScore + (isPangram ? 7 : 0);
};

const maximumScore = solutionWords.reduce(
  (total, word) => total + scoreWord(word),
  0,
);

export default function Home() {
  const [outerLetters, setOuterLetters] = useState(startingLetters);
  const [currentWord, setCurrentWord] = useState("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [foundWordsOpen, setFoundWordsOpen] = useState(false);
  const foundWordsButtonRef = useRef<HTMLButtonElement>(null);
  const closeFoundWordsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      setFoundWords(loadGameProgress(localStorage, puzzleId, solutionWordSet));
      setSaveLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!saveLoaded) return;

    if (foundWords.length === 0) {
      clearGameProgress(localStorage);
    } else {
      saveGameProgress(localStorage, puzzleId, foundWords, solutionWordSet);
    }
  }, [foundWords, saveLoaded]);

  useEffect(() => {
    if (!foundWordsOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFoundWordsOpen(false);
        queueMicrotask(() => foundWordsButtonRef.current?.focus());
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeFoundWordsButtonRef.current?.focus();
      }
    };

    closeFoundWordsButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [foundWordsOpen]);

  const score = foundWords.reduce((total, word) => total + scoreWord(word), 0);
  const gameComplete = foundWords.length === solutionWords.length;
  const progress = gameComplete ? 1 : Math.min(score / maximumScore, 0.99);
  const currentRank = [...ranks].reverse().find((rank) => progress >= rank.threshold) ?? ranks[0];
  const currentRankIndex = ranks.findIndex((rank) => rank.name === currentRank.name);
  const nextRank = ranks[currentRankIndex + 1];
  const nextRankScore = nextRank ? Math.ceil(nextRank.threshold * maximumScore) : null;

  const addLetter = (letter: string) => {
    setCurrentWord((word) => `${word}${letter}`.slice(0, 18));
    setFeedback(null);
    vibrate(10);
  };

  const deleteLetter = () => {
    setCurrentWord((word) => word.slice(0, -1));
    setFeedback(null);
    vibrate(8);
  };

  const shuffleLetters = () => {
    setOuterLetters((letters) => {
      const shuffled = [...letters];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapWith = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]];
      }
      return shuffled;
    });
    vibrate([8, 24, 8]);
  };

  const submitWord = () => {
    if (!currentWord) {
      setFeedback({ id: Date.now(), kind: "prompt", message: "Build a word first" });
      vibrate(24);
      return;
    }

    const submittedWord = currentWord.toUpperCase();

    if (submittedWord.length < 4) {
      setFeedback({ id: Date.now(), kind: "rejected", message: "Too short", word: submittedWord });
      vibrate(45);
    } else if (!submittedWord.includes(centreLetter)) {
      setFeedback({
        id: Date.now(),
        kind: "rejected",
        message: `Must include ${centreLetter}`,
        word: submittedWord,
      });
      vibrate(45);
    } else if (foundWords.includes(submittedWord)) {
      setFeedback({ id: Date.now(), kind: "prompt", message: "Already found", word: submittedWord });
      vibrate([10, 30, 10]);
    } else if (solutionWordSet.has(submittedWord)) {
      const nextFoundWords = [submittedWord, ...foundWords];
      setFoundWords(nextFoundWords);
      const isPangram = isPangramWord(submittedWord);
      const wordScore = scoreWord(submittedWord);
      setFeedback({
        id: Date.now(),
        kind: isPangram ? "pangram" : "accepted",
        word: submittedWord,
        points: wordScore,
        message: isPangram
          ? `Pangram! ${submittedWord} · +${wordScore} points`
          : `${submittedWord} is correct · +${wordScore} ${wordScore === 1 ? "point" : "points"}`,
      });
      vibrate(isPangram ? [22, 28, 22, 28, 55] : [16, 28, 16]);

      if (nextFoundWords.length === solutionWords.length) {
        vibrate([25, 40, 25, 40, 80]);
      }
    } else {
      setFeedback({ id: Date.now(), kind: "rejected", message: "Not accepted", word: submittedWord });
      vibrate(70);
    }

    setCurrentWord("");
  };

  const retryGame = () => {
    setOuterLetters(startingLetters);
    setCurrentWord("");
    setFoundWords([]);
    setFeedback(null);
    clearGameProgress(localStorage);
    vibrate(14);
  };

  const closeFoundWords = () => {
    setFoundWordsOpen(false);
    queueMicrotask(() => foundWordsButtonRef.current?.focus());
  };

  return (
    <main className="page-shell">
      <div className="ambient-leaves ambient-leaves-left" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="ambient-leaves ambient-leaves-right" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <section
        className={`game-card ${gameComplete ? "is-complete" : ""}`}
        aria-labelledby="game-title"
      >
        <header className="game-heading">
          <h1 id="game-title">Seven</h1>
        </header>

        {gameComplete ? (
          <section className="game-summary" aria-labelledby="summary-title">
            <p className="summary-kicker">Puzzle complete</p>
            <h2 id="summary-title">Every word found</h2>

            <div className="summary-stats" aria-label="Game summary">
              <div><strong>{score}</strong><span>Score</span></div>
              <div><strong>{foundWords.length}</strong><span>Found</span></div>
              <div><strong className="rank-stat">Queen Bee</strong><span>Rank</span></div>
            </div>

            <div className="answer-list">
              <h3>All words</h3>
              <div className="answer-chips">
                {solutionWords.map((word) => (
                  <span className={isPangramWord(word) ? "pangram-word" : ""} key={word}>
                    {isPangramWord(word) ? "✦ " : ""}{word}
                  </span>
                ))}
              </div>
            </div>

            <button className="retry-button" type="button" onClick={retryGame}>
              Try again
            </button>
          </section>
        ) : (
        <div className="interaction-area">
          <div className="rank-panel">
            <div className="rank-copy">
              <div>
                <span>Rank</span>
                <strong>{currentRank.name}</strong>
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
            <p className="rank-next">
              {nextRank && nextRankScore !== null
                ? `${Math.max(0, nextRankScore - score)} points to ${nextRank.name}`
                : "Every word found"}
            </p>
          </div>

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
                      <span aria-hidden="true">+{feedback.points} {feedback.points === 1 ? "point" : "points"}</span>
                    </>
                  ) : null}
                  {feedback.kind === "pangram" ? (
                    <>
                      <span className="sr-only">{feedback.message}</span>
                      <span className="feedback-icon" aria-hidden="true">✦</span>
                      <span aria-hidden="true">Pangram · +{feedback.points}</span>
                    </>
                  ) : null}
                  {feedback.kind === "rejected" || feedback.kind === "prompt"
                    ? feedback.message
                    : null}
                </span>
              ) : null}
            </div>
          </div>

          <div className="letter-wheel" aria-label="Letter wheel">
            <div className="letter-wheel-halo" aria-hidden="true" />

            {outerSlots.map(({ position, tone, rotation }, index) => {
              const letter = outerLetters[index];
              return (
                <button
                  className={`letter-button ${position}`}
                  style={{ "--leaf-rotation": rotation } as React.CSSProperties}
                  type="button"
                  aria-label={`Add ${letter}`}
                  onClick={() => addLetter(letter)}
                  key={position}
                >
                  <span className={`leaf-surface ${tone}`} aria-hidden="true">
                    <span className="leaf-vein" />
                  </span>
                  <span className="letter" aria-hidden="true">{letter}</span>
                </button>
              );
            })}

            <button
              className="letter-button centre required"
              style={{ "--leaf-rotation": "0deg" } as React.CSSProperties}
              type="button"
              aria-label={`Add ${centreLetter}, required letter`}
              onClick={() => addLetter(centreLetter)}
            >
              <span className="leaf-surface seed" aria-hidden="true" />
              <span className="letter" aria-hidden="true">{centreLetter}</span>
            </button>
          </div>

          <div className="game-controls" aria-label="Word controls">
            <button type="button" onClick={deleteLetter} disabled={!currentWord}>
              Delete
            </button>
            <button type="button" onClick={shuffleLetters}>
              Shuffle
            </button>
            <button className="submit-button" type="button" onClick={submitWord}>
              Enter
            </button>
          </div>

          <section className="found-words" aria-label="Found words">
            <button
              className="found-words-button"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={foundWordsOpen}
              disabled={foundWords.length === 0}
              onClick={() => setFoundWordsOpen(true)}
              ref={foundWordsButtonRef}
            >
              <span>
                <strong>Found words</strong>
                <small>{foundWords.length ? "View your list" : "None yet"}</small>
              </span>
              <span className="found-count" aria-label={`${foundWords.length} found`}>
                {foundWords.length}
              </span>
            </button>
          </section>
        </div>
        )}
      </section>

      {foundWordsOpen ? (
        <div className="found-words-modal-layer">
          <button
            className="found-words-backdrop"
            type="button"
            aria-label="Close found words"
            tabIndex={-1}
            onClick={closeFoundWords}
          />
          <section
            className="found-words-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="found-words-dialog-title"
          >
            <header className="found-words-dialog-header">
              <div>
                <p>Your progress</p>
                <h2 id="found-words-dialog-title">Found words</h2>
              </div>
              <button
                type="button"
                onClick={closeFoundWords}
                ref={closeFoundWordsButtonRef}
              >
                Close
              </button>
            </header>
            <p className="found-words-dialog-count">
              {foundWords.length} {foundWords.length === 1 ? "word" : "words"}
            </p>
            <div className="found-words-list" role="list">
              {[...foundWords].sort().map((word) => (
                <div
                  className={isPangramWord(word) ? "pangram-word" : ""}
                  role="listitem"
                  aria-label={isPangramWord(word) ? `${word}, pangram` : word}
                  key={word}
                >
                  <span>{word}</span>
                  {isPangramWord(word) ? <strong>Pangram ✦</strong> : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
