/* eslint-disable @next/next/no-head-element -- Standalone HTML renderer, not a Next.js page. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import type { Page } from "playwright";
import { LetterWheel } from "../app/_game/letter-wheel";
import { puzzleWheelLetters } from "../lib/puzzles.ts";
import { SHARE_CARD_INVITATION, shareCardText, type SharePuzzle } from "../lib/daily-shares.ts";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

export async function createCardRenderer() {
  const sources = await Promise.all([
    readFile(new URL("../app/_game/letter-wheel.css", import.meta.url), "utf8"),
    readFile(new URL("./social-card.css", import.meta.url), "utf8"),
    readFile(new URL("./assets/Lato-Bold.ttf", import.meta.url)),
    readFile(new URL("../app/_game/letter-wheel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/puzzles.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/daily-shares.ts", import.meta.url), "utf8"),
    readFile(new URL("./social-card-renderer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  ]);
  const css = `${sources[0]}\n${String(sources[1]).replace("FONT_DATA", sources[2].toString("base64"))}`;
  const templateSha256 = sha256(sources.map((source) => sha256(source)).join("\n"));
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
    deviceScaleFactor: 1,
    locale: "en-GB",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  return {
    page,
    templateSha256,
    close: () => browser.close(),
    render: async (puzzle: SharePuzzle) => {
      await setCardContent(page, css, puzzle);
      return page.locator(".social-card").screenshot({ animations: "disabled", type: "png" });
    },
  };
}

async function setCardContent(page: Page, css: string, puzzle: SharePuzzle) {
  const { outerLetters, centreLetter } = puzzleWheelLetters(puzzle);
  const html = renderToStaticMarkup(
    <html lang="en">
      <head><meta charSet="utf-8" /><style>{css}</style></head>
      <body>
        <article className="social-card">
          <time dateTime={puzzle.date}>{shareCardText(puzzle).date}</time>
          <div className="wheel-frame">
            <LetterWheel outerLetters={outerLetters} centreLetter={centreLetter} onAddLetter={() => {}} />
          </div>
          <footer>{SHARE_CARD_INVITATION} <strong>playseven.uk</strong></footer>
        </article>
      </body>
    </html>,
  );
  await page.setContent(`<!doctype html>${html}`);
  await page.evaluate(async () => { await document.fonts.ready; });
  // Leave the pointer outside the wheel so its interactive hover style is idle.
  await page.mouse.move(0, 0);
}
