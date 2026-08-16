"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearGameProgress,
  loadGameProgress,
  saveGameProgress,
} from "@/lib/game-save";
import {
  formatPuzzleDate,
  loadDailyPuzzle,
  loadPuzzleManifest,
  rankForScore,
  resolvePuzzleSelection,
  RANKS,
  utcDateString,
  type DailyPuzzle,
  type PuzzleSelection,
} from "@/lib/puzzles";
import NavigationMenu from "./navigation-menu";

const outerSlots = [
  { position: "top", tone: "sage", rotation: "4deg" },
  { position: "upper-left", tone: "olive", rotation: "-42deg" },
  { position: "upper-right", tone: "lime", rotation: "44deg" },
  { position: "lower-left", tone: "soft", rotation: "-126deg" },
  { position: "lower-right", tone: "forest", rotation: "128deg" },
  { position: "bottom", tone: "fresh", rotation: "176deg" },
] as const;

type Feedback = {
  id: number;
  kind: "accepted" | "pangram" | "rejected" | "prompt";
  message: string;
  word?: string;
  points?: number;
};

type LoadedGame = {
  puzzle: DailyPuzzle;
  selection: PuzzleSelection;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

export default function Home() {
  const [game, setGame] = useState<LoadedGame | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [outerLetters, setOuterLetters] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [foundWordsOpen, setFoundWordsOpen] = useState(false);
  const foundWordsButtonRef = useRef<HTMLButtonElement>(null);
  const closeFoundWordsButtonRef = useRef<HTMLButtonElement>(null);
  const loadedUtcDateRef = useRef<string | null>(null);

  const centreLetter = game?.puzzle.centre.toUpperCase() ?? "";
  const puzzleLetters = useMemo(
    () => game?.puzzle.letters.toUpperCase().split("") ?? [],
    [game],
  );
  const solutionWords = useMemo(
    () => game?.puzzle.answers.map((word) => word.toUpperCase()) ?? [],
    [game],
  );
  const solutionWordSet = useMemo(() => new Set(solutionWords), [solutionWords]);
  const pangramWordSet = useMemo(
    () => new Set(game?.puzzle.pangrams.map((word) => word.toUpperCase()) ?? []),
    [game],
  );
  const isPangramWord = useCallback(
    (word: string) => pangramWordSet.has(word.toUpperCase()),
    [pangramWordSet],
  );
  const scoreWord = useCallback(
    (word: string) => {
      const baseScore = word.length <= 4 ? 1 : word.length;
      return baseScore + (isPangramWord(word) ? 7 : 0);
    },
    [isPangramWord],
  );

  const loadSelectedGame = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSaveLoaded(false);

    try {
      const manifest = await loadPuzzleManifest();
      const requestedDate = new URLSearchParams(window.location.search).get("date");
      const selection = resolvePuzzleSelection(manifest, requestedDate);
      const entry = manifest.entries.find((candidate) => candidate.date === selection.date);
      if (entry === undefined) throw new Error("Selected puzzle is missing from the manifest");
      const puzzle = await loadDailyPuzzle(entry);
      const acceptedWords = new Set(puzzle.answers.map((word) => word.toUpperCase()));
      const pangrams = new Set(puzzle.pangrams.map((word) => word.toUpperCase()));
      const scoreLoadedWord = (word: string) => {
        const baseScore = word.length <= 4 ? 1 : word.length;
        return baseScore + (pangrams.has(word) ? 7 : 0);
      };
      const progress = loadGameProgress(
        localStorage,
        puzzle.id,
        acceptedWords,
        scoreLoadedWord,
      );

      setGame({ puzzle, selection });
      setOuterLetters(
        puzzle.letters
          .toUpperCase()
          .split("")
          .filter((letter) => letter !== puzzle.centre.toUpperCase()),
      );
      setCurrentWord("");
      setFoundWords(progress.foundWords);
      setFeedback(null);
      setFoundWordsOpen(false);
      setSaveLoaded(true);
      if (requestedDate === null) loadedUtcDateRef.current = utcDateString();
    } catch (error) {
      setGame(null);
      setLoadError(error instanceof Error ? error.message : "Could not load the puzzle");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadSelectedGame());

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !new URLSearchParams(window.location.search).has("date") &&
        loadedUtcDateRef.current !== utcDateString()
      ) {
        void loadSelectedGame();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadSelectedGame]);

  useEffect(() => {
    if (!saveLoaded || game === null) return;

    if (foundWords.length === 0) {
      clearGameProgress(localStorage, game.puzzle.id);
    } else {
      saveGameProgress(
        localStorage,
        game.puzzle.id,
        foundWords,
        solutionWordSet,
        scoreWord,
      );
    }
  }, [foundWords, game, saveLoaded, scoreWord, solutionWordSet]);

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

  if (loading || game === null) {
    return (
      <main className="page-shell">
        <section className="game-card load-card" aria-live="polite">
          <header className="game-heading"><h1>Seven</h1></header>
          {loadError ? (
            <>
              <p>{loadError}</p>
              <button className="retry-button" type="button" onClick={() => void loadSelectedGame()}>
                Try again
              </button>
            </>
          ) : (
            <p>Loading today&apos;s puzzle…</p>
          )}
        </section>
      </main>
    );
  }

  const { puzzle, selection } = game;
  const maximumScore = puzzle.maximumScore;
  const score = foundWords.reduce((total, word) => total + scoreWord(word), 0);
  const gameComplete = foundWords.length === solutionWords.length;
  const { rank: currentRank, progress } = rankForScore(score, maximumScore, gameComplete);
  const currentRankIndex = RANKS.findIndex((rank) => rank.name === currentRank.name);
  const nextRank = RANKS[currentRankIndex + 1];
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
    setOuterLetters(puzzleLetters.filter((letter) => letter !== centreLetter));
    setCurrentWord("");
    setFoundWords([]);
    setFeedback(null);
    clearGameProgress(localStorage, puzzle.id);
    vibrate(14);
  };

  const closeFoundWords = () => {
    setFoundWordsOpen(false);
    queueMicrotask(() => foundWordsButtonRef.current?.focus());
  };

  return (
    <main className={`page-shell${foundWordsOpen ? " has-modal" : ""}`}>
      <div className="ambient-leaves ambient-leaves-left" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="ambient-leaves ambient-leaves-right" aria-hidden="true">
        <i /><i /><i />
      </div>

      <section
        className={`game-card ${gameComplete ? "is-complete" : ""}`}
        aria-labelledby="game-title"
      >
        <header className="game-heading">
          <NavigationMenu current={selection.isToday ? "today" : undefined} />
          <h1 id="game-title">Seven</h1>
          <p className="puzzle-date">
            {selection.isToday ? "Today" : formatPuzzleDate(puzzle.date, false)}
          </p>
          {selection.notice ? (
            <p className="puzzle-notice" role="status">{selection.notice}</p>
          ) : null}
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
              <div className="rank-footer">
                <p className="rank-next">
                  {nextRank && nextRankScore !== null
                    ? `${Math.max(0, nextRankScore - score)} points to ${nextRank.name}`
                    : "Every word found"}
                </p>
                <section className="found-words" aria-label="Found words">
                  <button
                    className="found-words-button"
                    type="button"
                    aria-label={foundWords.length
                      ? `View ${foundWords.length} found ${foundWords.length === 1 ? "word" : "words"}`
                      : "No words found yet"}
                    aria-haspopup="dialog"
                    aria-expanded={foundWordsOpen}
                    disabled={foundWords.length === 0}
                    onClick={() => setFoundWordsOpen(true)}
                    ref={foundWordsButtonRef}
                  >
                    <span>Found words</span>
                    <span className="found-count" aria-hidden="true">{foundWords.length}</span>
                  </button>
                </section>
              </div>
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

            <div className="letter-wheel-stage">
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
                      onClick={() => addLetter(letter ?? "")}
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
            </div>

            <div className="game-controls" aria-label="Word controls">
              <button type="button" onClick={deleteLetter} disabled={!currentWord}>
                Delete
              </button>
              <button type="button" onClick={shuffleLetters}>Shuffle</button>
              <button className="submit-button" type="button" onClick={submitWord}>
                Enter
              </button>
            </div>

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
                <p>{formatPuzzleDate(puzzle.date, false)}</p>
                <h2 id="found-words-dialog-title">Found words</h2>
              </div>
              <button type="button" onClick={closeFoundWords} ref={closeFoundWordsButtonRef}>
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
