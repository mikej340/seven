"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearGameProgress, loadGameProgress, saveGameProgress } from "@/lib/game-save";
import { GAME_EVENTS, trackGameEvent } from "@/lib/analytics";
import {
  deriveGameStats,
  evaluateWord,
  MAX_WORD_LENGTH,
  preparePuzzle,
  scoreWord,
  type GameFeedback,
  type PreparedPuzzle,
} from "@/lib/game-rules";
import {
  isPuzzleRevealAvailable,
  loadDailyPuzzle,
  loadPuzzleManifest,
  ranksReachedBetween,
  resolvePuzzleSelection,
  utcDateString,
  type DailyPuzzle,
  type PuzzleSelection,
} from "@/lib/puzzles";
import { useScoreSharing } from "./use-score-sharing";

type LoadedGame = {
  puzzle: DailyPuzzle;
  selection: PuzzleSelection;
  rules: PreparedPuzzle;
  viewSession: number;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
};

export function usePuzzleGame() {
  const [game, setGame] = useState<LoadedGame | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [outerLetters, setOuterLetters] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<GameFeedback | null>(null);
  const [saveLoaded, setSaveLoaded] = useState(false);
  const [currentUtcDate, setCurrentUtcDate] = useState(utcDateString);
  const loadedUtcDateRef = useRef<string | null>(null);
  const engagedPuzzleIdsRef = useRef(new Set<string>());
  const viewSessionRef = useRef(0);
  const { shareStatus, shareButtonLabel, resetShareStatus, shareScore } = useScoreSharing();

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
      const rules = preparePuzzle(puzzle);
      const progress = loadGameProgress(
        localStorage,
        puzzle.id,
        rules.solutionWordSet,
        (word) => scoreWord(word, rules),
      );

      // A fresh view session resets dialog state on every successful load.
      viewSessionRef.current += 1;
      setGame({ puzzle, selection, rules, viewSession: viewSessionRef.current });
      setOuterLetters(rules.puzzleLetters.filter((letter) => letter !== rules.centreLetter));
      setCurrentWord("");
      setFoundWords(progress.foundWords);
      setFeedback(null);
      resetShareStatus();
      setSaveLoaded(true);
      if (requestedDate === null) loadedUtcDateRef.current = utcDateString();
    } catch (error) {
      setGame(null);
      setLoadError(error instanceof Error ? error.message : "Could not load the puzzle");
    } finally {
      setLoading(false);
    }
  }, [resetShareStatus]);

  useEffect(() => {
    queueMicrotask(() => void loadSelectedGame());
    const handleVisibilityChange = () => {
      const visibleUtcDate = utcDateString();
      setCurrentUtcDate(visibleUtcDate);
      if (
        document.visibilityState === "visible" &&
        !new URLSearchParams(window.location.search).has("date") &&
        loadedUtcDateRef.current !== visibleUtcDate
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
        game.rules.solutionWordSet,
        (word) => scoreWord(word, game.rules),
      );
    }
  }, [foundWords, game, saveLoaded]);

  const stats = game === null ? null : deriveGameStats(foundWords, game.rules);
  const canRevealAnswers = game !== null && isPuzzleRevealAvailable(game.puzzle.date, currentUtcDate);

  const addLetter = (letter: string) => {
    setCurrentWord((word) => `${word}${letter}`.slice(0, MAX_WORD_LENGTH));
    setFeedback(null);
    vibrate(10);
  };

  const deleteLetter = () => {
    setCurrentWord((word) => word.slice(0, -1));
    setFeedback(null);
    vibrate(8);
  };

  const shuffleLetters = () => {
    const shuffled = [...outerLetters];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapWith = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]];
    }
    setOuterLetters(shuffled);
    vibrate([8, 24, 8]);
  };

  const submitWord = () => {
    if (game === null || stats === null) return;
    const result = evaluateWord(currentWord, foundWords, game.rules);
    if (result.outcome === "accepted") {
      const nextFoundWords = [result.word, ...foundWords];
      const nextStats = deriveGameStats(nextFoundWords, game.rules);
      setFoundWords(nextFoundWords);
      resetShareStatus();

      if (!engagedPuzzleIdsRef.current.has(game.puzzle.id)) {
        const tracked = trackGameEvent(GAME_EVENTS.puzzleEngaged, { puzzle: game.puzzle.id });
        if (tracked) engagedPuzzleIdsRef.current.add(game.puzzle.id);
      }
      if (result.isPangram) {
        trackGameEvent(GAME_EVENTS.pangramFound, { puzzle: game.puzzle.id });
      }
      for (const reachedRank of ranksReachedBetween(
        stats.score,
        nextStats.score,
        game.puzzle.maximumScore,
        nextStats.gameComplete,
      )) {
        trackGameEvent(GAME_EVENTS.rankReached, { puzzle: game.puzzle.id, rank: reachedRank.name });
      }
      if (nextStats.gameComplete) {
        trackGameEvent(GAME_EVENTS.puzzleCompleted, { puzzle: game.puzzle.id });
      }

      setFeedback({ id: Date.now(), ...result.feedback });
      vibrate(result.isPangram ? [22, 28, 22, 28, 55] : [16, 28, 16]);
      if (nextStats.gameComplete) vibrate([25, 40, 25, 40, 80]);
    } else {
      setFeedback({ id: Date.now(), ...result.feedback });
      switch (result.outcome) {
        case "empty": vibrate(24); break;
        case "too-short":
        case "missing-centre": vibrate(45); break;
        case "duplicate": vibrate([10, 30, 10]); break;
        case "unrecognised": vibrate(70); break;
      }
    }
    if (result.outcome !== "empty") setCurrentWord("");
  };

  const retryGame = () => {
    if (game === null) return;
    setOuterLetters(game.rules.puzzleLetters.filter((letter) => letter !== game.rules.centreLetter));
    setCurrentWord("");
    setFoundWords([]);
    setFeedback(null);
    resetShareStatus();
    clearGameProgress(localStorage, game.puzzle.id);
    vibrate(14);
  };

  return {
    game, loading, loadError, stats, outerLetters, currentWord, foundWords, feedback,
    canRevealAnswers, shareStatus, shareButtonLabel,
    loadSelectedGame, addLetter, deleteLetter, shuffleLetters, submitWord, retryGame,
    shareScore: () => game !== null && stats !== null
      ? shareScore(game.puzzle, stats, foundWords.length)
      : Promise.resolve(),
  };
}

export type PuzzleGameController = ReturnType<typeof usePuzzleGame>;
