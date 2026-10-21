import type { Metadata } from "next";
import { siteAssetUrl } from "@/lib/site";
import { PUZZLE_BASE_PATH } from "@/lib/puzzles";
import NavigationMenu from "../navigation-menu";
import styles from "./how-to-play.module.css";

const title = "How to Play Seven – Rules, Scoring & Pangrams";
const description =
  "Learn how to play Seven, the free daily British-English word puzzle. Discover the rules, scoring, pangrams and ranks, then try today’s puzzle.";
const url = siteAssetUrl("how-to-play/");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    type: "website",
    url,
    siteName: "Seven",
    title,
    description,
    images: [siteAssetUrl("social-card.png")],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [siteAssetUrl("social-card.png")],
  },
};

export default function HowToPlayPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <NavigationMenu current="how-to-play" />
          <p>Seven</p>
          <h1>How to play</h1>
        </header>

        <section className={styles.intro} aria-labelledby="welcome-title">
          <h2 id="welcome-title">A new word puzzle every day</h2>
          <p>
            Seven is a free daily British-English word game. Make as many words
            as you can from the seven letters, collect points and climb the ranks
            at your own pace.
          </p>
          <a className={styles.primaryLink} href={`${PUZZLE_BASE_PATH}/`}>
            Play today&apos;s puzzle
          </a>
        </section>

        <section className={styles.section} aria-labelledby="words-title">
          <h2 id="words-title">Make words</h2>
          <ul>
            <li>Use only the seven letters shown. You can reuse a letter.</li>
            <li>Every word must have at least four letters and include the centre letter.</li>
            <li>Hyphenated words and proper nouns are not accepted.</li>
          </ul>
          <p>
            Seven uses a British-English word list. If you think a valid word is
            missing, <a href={`${PUZZLE_BASE_PATH}/feedback/`}>suggest it through Feedback</a>.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="points-title">
          <h2 id="points-title">Score points</h2>
          <p>
            A four-letter word earns one point. Words of five letters or more
            earn one point per letter. A <strong>pangram</strong> uses all seven
            letters at least once and earns seven bonus points.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="ranks-title">
          <h2 id="ranks-title">Climb the ranks</h2>
          <p>
            Your rank rises as you earn a larger share of the puzzle&apos;s total
            points. Reach Genius at 70% of the available score. Find every word
            to become Queen Bee.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="play-title">
          <h2 id="play-title">Play your way</h2>
          <p>
            Shuffle the outer letters for a fresh look, review the words you&apos;ve
            found and share your score. Your progress is saved in this browser,
            so you can return later.
          </p>
          <p>
            Visit <a href={`${PUZZLE_BASE_PATH}/puzzles/`}>All puzzles</a>{" "}to
            continue a previous day. Once a puzzle&apos;s date has passed, you can
            reveal its remaining answers.
          </p>
        </section>

        <footer className={styles.footer}>
          <a className={styles.primaryLink} href={`${PUZZLE_BASE_PATH}/`}>
            Play today&apos;s puzzle
          </a>
          <a className={styles.secondaryLink} href={`${PUZZLE_BASE_PATH}/puzzles/`}>
            Browse all puzzles
          </a>
        </footer>
      </div>
    </main>
  );
}
