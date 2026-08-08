"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./flower-bed.module.css";

type FlowerKind = "four" | "five" | "six" | "seven-plus" | "pangram";

type Flower = {
  id: number;
  kind: FlowerKind;
  score: number;
  wordLength: number;
};

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

const flowerSources: Record<FlowerKind, string> = {
  four: "/flowers/flower-4.svg",
  five: "/flowers/flower-5.svg",
  six: "/flowers/flower-6.svg",
  "seven-plus": "/flowers/flower-7-plus.svg",
  pangram: "/flowers/flower-pangram.svg",
};

const assetBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const randomInteger = (minimum: number, maximum: number) =>
  Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

const variation = (index: number, salt: number) => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const flowerHeight = (score: number) => {
  const cappedScore = Math.min(20, Math.max(1, score));
  const progress = Math.sqrt((cappedScore - 1) / 19);
  return Math.round(44 + progress * 78);
};

const makeFlower = (kind: FlowerKind, id: number): Flower => {
  if (kind === "four") return { id, kind, score: 1, wordLength: 4 };
  if (kind === "five") return { id, kind, score: 5, wordLength: 5 };
  if (kind === "six") return { id, kind, score: 6, wordLength: 6 };

  const wordLength = randomInteger(7, 20);
  return {
    id,
    kind,
    wordLength,
    score: kind === "pangram" ? wordLength + 7 : wordLength,
  };
};

export default function FlowerBedPrototype() {
  const [totalWords, setTotalWords] = useState(42);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [nextFlowerId, setNextFlowerId] = useState(1);
  const [lastAction, setLastAction] = useState("Add a scored word to grow the first flower.");

  const score = flowers.reduce((total, flower) => total + flower.score, 0);
  const modelledMaximumScore = totalWords * 7;
  const progress = Math.min(score / modelledMaximumScore, 1);
  const currentRank =
    [...ranks].reverse().find((rank) => progress >= rank.threshold) ?? ranks[0];
  const currentRankIndex = ranks.findIndex((rank) => rank.name === currentRank.name);
  const nextRank = ranks[currentRankIndex + 1];
  const nextRankScore = nextRank
    ? Math.ceil(nextRank.threshold * modelledMaximumScore)
    : null;

  const slots = useMemo(
    () =>
      Array.from({ length: totalWords }, (_, index) => {
        const fraction = totalWords === 1 ? 0.5 : index / (totalWords - 1);
        return {
          index,
          left: 5 + fraction * 90,
          lean: -5 + variation(index, 1) * 10,
          baseline: -2 + variation(index, 2) * 5,
          depth: Math.floor(variation(index, 3) * 3),
          seedlingHeight: 15 + Math.round(variation(index, 4) * 11),
        };
      }),
    [totalWords],
  );

  const updateTotalWords = (value: number) => {
    const nextTotal = Math.min(80, Math.max(8, value));
    setTotalWords(nextTotal);
    setFlowers((current) => {
      const kept = current.slice(0, nextTotal);
      if (kept.length !== current.length) {
        setLastAction(`Garden reduced to ${nextTotal} slots; later flowers were removed.`);
      }
      return kept;
    });
  };

  const addFlower = (kind: FlowerKind) => {
    if (flowers.length >= totalWords) {
      setLastAction("The garden is full. Reset it or increase the total word count.");
      return;
    }

    const flower = makeFlower(kind, nextFlowerId);
    setFlowers((current) => [...current, flower]);
    setNextFlowerId((current) => current + 1);
    setLastAction(
      flower.kind === "pangram"
        ? `Added a ${flower.wordLength}-letter pangram worth ${flower.score} points.`
        : `Added a ${flower.wordLength}-letter word worth ${flower.score} ${flower.score === 1 ? "point" : "points"}.`,
    );
  };

  const reset = () => {
    setFlowers([]);
    setNextFlowerId(1);
    setLastAction("Garden reset. Add a scored word to begin again.");
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.intro}>
          <p>Seven experiment</p>
          <h1>Flower-bed progress</h1>
          <span>Prototype the density, scoring scale and growth behaviour.</span>
        </header>

        <section className={styles.preview} aria-label="Game progress preview">
          <div className={styles.rankRow}>
            <div className={styles.rank}>
              <span>Rank</span>
              <strong>{currentRank.name}</strong>
            </div>
            <div className={styles.points}>
              <strong>{score}</strong>
              <span>points</span>
            </div>
          </div>

          <div
            className={styles.garden}
            role="img"
            aria-label={`${flowers.length} of ${totalWords} possible words found, scoring ${score} points`}
          >
            <div className={styles.soil} aria-hidden="true" />
            {slots.map((slot) => {
              const flower = flowers[slot.index];
              const slotStyle = {
                "--left": `${slot.left}%`,
                "--lean": `${slot.lean.toFixed(2)}deg`,
                "--baseline": `${slot.baseline.toFixed(2)}px`,
                "--depth": slot.depth + 2,
                "--seedling-height": `${slot.seedlingHeight}px`,
                "--flower-height": flower ? `${flowerHeight(flower.score)}px` : "0px",
              } as React.CSSProperties;

              return (
                <span className={styles.slot} style={slotStyle} key={slot.index}>
                  {flower ? (
                    <Image
                      className={styles.flower}
                      src={`${assetBasePath}${flowerSources[flower.kind]}`}
                      width={120}
                      height={180}
                      alt=""
                      draggable={false}
                      key={flower.id}
                    />
                  ) : (
                    <i className={styles.seedling} aria-hidden="true" />
                  )}
                </span>
              );
            })}
          </div>

          <p className={styles.nextRank}>
            {nextRank && nextRankScore !== null
              ? `${Math.max(0, nextRankScore - score)} points to ${nextRank.name}`
              : "Every rank reached"}
          </p>
        </section>

        <section className={styles.controls} aria-labelledby="controls-title">
          <div className={styles.controlsHeading}>
            <div>
              <p>Prototype controls</p>
              <h2 id="controls-title">Grow the test garden</h2>
            </div>
            <strong>{flowers.length} / {totalWords}</strong>
          </div>

          <label className={styles.totalControl}>
            <span>
              Total word count
              <small>Full beds always span the available width.</small>
            </span>
            <output>{totalWords}</output>
            <input
              type="range"
              min="8"
              max="80"
              step="1"
              value={totalWords}
              onChange={(event) => updateTotalWords(Number(event.target.value))}
            />
          </label>

          <div className={styles.scoreButtons} aria-label="Add scored word">
            <button type="button" onClick={() => addFlower("four")} disabled={flowers.length >= totalWords}>
              <span>4 letters</span>
              <strong>+1</strong>
            </button>
            <button type="button" onClick={() => addFlower("five")} disabled={flowers.length >= totalWords}>
              <span>5 letters</span>
              <strong>+5</strong>
            </button>
            <button type="button" onClick={() => addFlower("six")} disabled={flowers.length >= totalWords}>
              <span>6 letters</span>
              <strong>+6</strong>
            </button>
            <button type="button" onClick={() => addFlower("seven-plus")} disabled={flowers.length >= totalWords}>
              <span>7–20 letters</span>
              <strong>+random</strong>
            </button>
            <button
              className={styles.pangramButton}
              type="button"
              onClick={() => addFlower("pangram")}
              disabled={flowers.length >= totalWords}
            >
              <span>Pangram</span>
              <strong>+length + 7</strong>
            </button>
          </div>

          <div className={styles.controlFooter}>
            <p aria-live="polite">{lastAction}</p>
            <button type="button" onClick={reset} disabled={flowers.length === 0}>
              Reset
            </button>
          </div>

          <p className={styles.modelNote}>
            Rank testing uses a modelled maximum of {modelledMaximumScore} points
            (seven points per possible word).
          </p>
        </section>
      </div>
    </main>
  );
}
