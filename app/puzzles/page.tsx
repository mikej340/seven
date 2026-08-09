"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadProgressSummaries, type PuzzleProgress } from "@/lib/game-save";
import {
  formatPuzzleDate,
  loadPuzzleManifest,
  PUZZLE_BASE_PATH,
  rankForScore,
  resolvePuzzleSelection,
  utcDateString,
  type PuzzleManifest,
  type PuzzleManifestEntry,
} from "@/lib/puzzles";
import styles from "./puzzles.module.css";

type MonthGroup = {
  id: string;
  label: string;
  entries: PuzzleManifestEntry[];
};

const formatMonth = (month: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-15T12:00:00.000Z`));

export default function PuzzlesPage() {
  const [manifest, setManifest] = useState<PuzzleManifest | null>(null);
  const [progress, setProgress] = useState<Record<string, PuzzleProgress>>({});
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(utcDateString);

  const refreshProgress = useCallback(() => {
    setProgress(loadProgressSummaries(localStorage));
  }, []);

  const loadArchive = useCallback(async () => {
    setError(null);
    try {
      setManifest(await loadPuzzleManifest());
      refreshProgress();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the puzzle archive");
    }
  }, [refreshProgress]);

  useEffect(() => {
    queueMicrotask(() => void loadArchive());
    const handleStorage = () => refreshProgress();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") setToday(utcDateString());
    };
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadArchive, refreshProgress]);

  const groups = useMemo<MonthGroup[]>(() => {
    if (manifest === null) return [];
    const byMonth = new Map<string, PuzzleManifestEntry[]>();
    for (const entry of [...manifest.entries].filter((candidate) => candidate.date <= today).reverse()) {
      const entries = byMonth.get(entry.month) ?? [];
      entries.push(entry);
      byMonth.set(entry.month, entries);
    }
    return [...byMonth.entries()].map(([id, entries]) => ({
      id,
      label: formatMonth(id),
      entries,
    }));
  }, [manifest, today]);

  const scheduleNotice =
    manifest === null ? null : resolvePuzzleSelection(manifest, null, today).notice;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a href={`${PUZZLE_BASE_PATH}/`}>← Today</a>
          <p>Seven</p>
          <h1>All puzzles</h1>
          <span>Return to any released puzzle and continue where you left off.</span>
        </header>

        {scheduleNotice ? <p className={styles.notice}>{scheduleNotice}</p> : null}

        {error ? (
          <section className={styles.state} aria-live="polite">
            <p>{error}</p>
            <button type="button" onClick={() => void loadArchive()}>Try again</button>
          </section>
        ) : manifest === null ? (
          <p className={styles.state} aria-live="polite">Loading puzzles…</p>
        ) : (
          <div className={styles.months}>
            {groups.map((group) => (
              <section className={styles.month} aria-labelledby={`month-${group.id}`} key={group.id}>
                <h2 id={`month-${group.id}`}>{group.label}</h2>
                <div className={styles.cards}>
                  {group.entries.map((entry) => {
                    const saved = progress[entry.id];
                    const foundCount = saved?.foundWords.length ?? 0;
                    const complete = foundCount === entry.wordCount;
                    const currentRank = saved
                      ? rankForScore(saved.score, entry.maximumScore, complete).rank.name
                      : "Not started";

                    return (
                      <a
                        className={`${styles.card} ${entry.date === today ? styles.today : ""}`}
                        href={`${PUZZLE_BASE_PATH}/?date=${entry.date}`}
                        key={entry.id}
                      >
                        <div className={styles.cardHeading}>
                          <div>
                            {entry.date === today ? <span className={styles.todayLabel}>Today</span> : null}
                            <strong>{formatPuzzleDate(entry.date)}</strong>
                          </div>
                          <span className={styles.chevron} aria-hidden="true">›</span>
                        </div>

                        <div className={styles.letters} aria-label={`Letters ${entry.letters}, required ${entry.centre}`}>
                          {entry.letters.toUpperCase().split("").map((letter) => (
                            <span
                              className={letter === entry.centre.toUpperCase() ? styles.centre : ""}
                              key={letter}
                            >
                              {letter}
                            </span>
                          ))}
                        </div>

                        <div className={styles.progress}>
                          <span><small>Rank</small><strong>{currentRank}</strong></span>
                          <span><small>Found</small><strong>{foundCount} / {entry.wordCount}</strong></span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
