"use client";

import { useState } from "react";

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
  kind: "accepted" | "rejected" | "prompt";
  message: string;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

const scoreWord = (word: string) => {
  const letters = new Set(word);
  const isPangram = [centreLetter, ...startingLetters].every((letter) => letters.has(letter));
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
  const [gameComplete, setGameComplete] = useState(false);

  const score = foundWords.reduce((total, word) => total + scoreWord(word), 0);
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
      setFeedback({ id: Date.now(), kind: "rejected", message: "Too short" });
      vibrate(45);
    } else if (!submittedWord.includes(centreLetter)) {
      setFeedback({ id: Date.now(), kind: "rejected", message: `Must include ${centreLetter}` });
      vibrate(45);
    } else if (foundWords.includes(submittedWord)) {
      setFeedback({ id: Date.now(), kind: "prompt", message: "Already found" });
      vibrate([10, 30, 10]);
    } else if (solutionWordSet.has(submittedWord)) {
      const nextFoundWords = [submittedWord, ...foundWords];
      setFoundWords(nextFoundWords);
      const isPangram = scoreWord(submittedWord) === submittedWord.length + 7;
      setFeedback({ id: Date.now(), kind: "accepted", message: isPangram ? "Pangram!" : "Accepted" });
      vibrate([16, 28, 16]);

      if (nextFoundWords.length === solutionWords.length) {
        setGameComplete(true);
        vibrate([25, 40, 25, 40, 80]);
      }
    } else {
      setFeedback({ id: Date.now(), kind: "rejected", message: "Not accepted" });
      vibrate(70);
    }

    setCurrentWord("");
  };

  const retryGame = () => {
    setOuterLetters(startingLetters);
    setCurrentWord("");
    setFoundWords([]);
    setFeedback(null);
    setGameComplete(false);
    vibrate(14);
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

      <section className="game-card" aria-labelledby="game-title">
        <header className="game-heading">
          <h1 id="game-title">Seven</h1>
        </header>

        {gameComplete ? (
          <section className="game-summary" aria-labelledby="summary-title">
            <p className="summary-kicker">Garden complete</p>
            <h2 id="summary-title">Every word found</h2>

            <div className="summary-stats" aria-label="Game summary">
              <div><strong>{score}</strong><span>Score</span></div>
              <div><strong>{foundWords.length}</strong><span>Found</span></div>
              <div><strong className="rank-stat">Queen Bee</strong><span>Rank</span></div>
            </div>

            <div className="answer-list">
              <h3>All words</h3>
              <div className="answer-chips">
                {solutionWords.map((word) => <span key={word}>{word}</span>)}
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

          <div className="word-panel" aria-live="polite" aria-atomic="true">
            <span className={`current-word ${currentWord ? "has-word" : ""}`}>
              {currentWord || "Tap a leaf"}
            </span>
            <span
              className={`feedback ${feedback ? feedback.kind : ""}`}
              key={feedback?.id ?? "empty"}
              role="status"
            >
              {feedback?.message ?? "\u00a0"}
            </span>
          </div>

          <div className="garden" aria-label="Letter garden">
            <div className="garden-halo" aria-hidden="true" />

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
              <span className="required-dot" aria-hidden="true" />
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

          <section className="found-words" aria-labelledby="found-heading">
            <div className="found-heading-row">
              <h2 id="found-heading">Found words</h2>
              <span>{foundWords.length}</span>
            </div>
            {foundWords.length ? (
              <div className="word-chips">
                {foundWords.map((word, index) => (
                  <span key={`${word}-${index}`}>{word}</span>
                ))}
              </div>
            ) : (
              <p>Accepted words will appear here.</p>
            )}
          </section>
        </div>
        )}
      </section>
    </main>
  );
}
