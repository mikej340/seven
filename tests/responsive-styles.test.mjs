import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const [gameViewSource, scoreCardSource, summarySource, feedbackSource, dialogSource, sharingSource] =
  await Promise.all([
    "game-view.tsx", "score-card.tsx", "game-summary.tsx", "word-feedback.tsx",
    "found-words-dialog.tsx", "use-score-sharing.ts",
  ].map((file) => readFile(new URL(`../app/_game/${file}`, import.meta.url), "utf8")));
const navigationSource = await readFile(
  new URL("../app/navigation-menu.tsx", import.meta.url),
  "utf8",
);
const navigationStyles = await readFile(
  new URL("../app/navigation-menu.module.css", import.meta.url),
  "utf8",
);

test("the normal game shell is a fixed, non-scrolling viewport", () => {
  const pageShell = stylesheet.match(/\.page-shell\s*\{(?<rules>[\s\S]*?)\n\}/)?.groups?.rules;

  assert.ok(pageShell, "expected a .page-shell rule");
  assert.match(pageShell, /height:\s*100dvh;/);
  assert.match(pageShell, /overflow:\s*hidden;/);
  assert.match(pageShell, /overscroll-behavior:\s*none;/);
});

test("opening the found-words dialog locks the game page", () => {
  assert.match(
    stylesheet,
    /\.page-shell\.has-modal\s*\{[\s\S]*?overflow-y:\s*hidden;[\s\S]*?\}/,
  );
});

test("responsive rules never hide the found-words control", () => {
  assert.doesNotMatch(
    stylesheet,
    /\.found-words\s*\{[^}]*display:\s*none;[^}]*\}/,
  );
});

test("found words is separated from the word controls by the game board", () => {
  const foundWordsPosition = gameViewSource.indexOf('<ScoreCard');
  const wheelPosition = gameViewSource.indexOf('<LetterWheel');
  const controlsPosition = gameViewSource.indexOf('className="game-controls"');

  assert.ok(foundWordsPosition > -1);
  assert.ok(foundWordsPosition < wheelPosition);
  assert.ok(wheelPosition < controlsPosition);
  assert.match(scoreCardSource, /className="found-words"/);
  assert.match(
    stylesheet,
    /\.found-words-button\s*\{[\s\S]*?min-height:\s*44px;/,
  );
});

test("the controls use browser chrome space without changing the default comfort zone", () => {
  assert.match(
    stylesheet,
    /\.interaction-area\s*\{[\s\S]*?padding-bottom:\s*clamp\(44px, 7dvh, 58px\);/,
  );
  assert.match(
    stylesheet,
    /@media \(display-mode: browser\) and \(hover: none\) and \(pointer: coarse\)\s*\{[\s\S]*?\.interaction-area\s*\{[\s\S]*?padding-bottom:\s*0;/,
  );
  assert.match(stylesheet, /env\(safe-area-inset-bottom\)/);
});

test("scorecard actions are separated beneath the rank details", () => {
  assert.match(stylesheet, /\.rank-actions\s*\{[\s\S]*?justify-content:\s*space-between;/);
  assert.match(stylesheet, /\.rank-actions\s*\{[\s\S]*?border-top:/);
});

test("score sharing is available during play and after completion", () => {
  assert.match(scoreCardSource, /className="score-share-button"/);
  assert.match(summarySource, /className="score-share-summary"/);
  assert.match(stylesheet, /\.score-share-button\s*\{[\s\S]*?min-height:\s*44px;/);
  assert.match(stylesheet, /\.score-share-summary\s*\{[\s\S]*?min-height:\s*48px;/);
  assert.match(sharingSource, /scoreCardFileName\(puzzle\.date\)/);
});

test("friend invitations keep a fixed label and expose a manual copy fallback", () => {
  assert.match(navigationSource, /<span>Invite a friend<\/span>/);
  assert.match(navigationSource, /inviteStatus === "failed"/);
  assert.match(navigationSource, /aria-label="Invitation address"/);
  assert.match(navigationSource, /ref=\{inviteAddressRef\}/);
  assert.match(navigationSource, /inviteAddressRef\.current\?\.select\(\)/);
  assert.match(navigationSource, /value=\{INVITE_URL\}/);
  assert.match(navigationSource, /copySelectedInvite\(INVITE_URL\)/);
  assert.match(navigationSource, />\s*Copy\s*<\/button>/);
  assert.match(navigationStyles, /\.inviteFallback\s*\{/);
});

test("past puzzles can reveal answers without adding them to found words", () => {
  assert.match(scoreCardSource, /disabled=\{foundCount === 0 && !canRevealAnswers\}/);
  assert.match(dialogSource, /aria-pressed=\{answersRevealed\}/);
  assert.match(dialogSource, /Reveal all words/);
  assert.match(dialogSource, /revealed-word/);
  assert.doesNotMatch(dialogSource, /setFoundWords\(solutionWords\)/);
  assert.match(
    stylesheet,
    /\.found-words-list div\.revealed-word\s*\{[\s\S]*?color:/,
  );
});

test("rejected unknown words offer a puzzle-aware suggestion link", () => {
  assert.match(feedbackSource, /Suggest this word/);
  assert.match(feedbackSource, /type=word&puzzle=\$\{puzzleDate\}&word=/);
});

test("the fixed-height word panel always reserves a divided feedback strip", () => {
  const feedbackLineRule = stylesheet.match(
    /\.feedback-line\s*\{(?<rules>[\s\S]*?)\n\}/,
  )?.groups?.rules;

  assert.match(feedbackSource, /className="feedback-line"/);
  assert.match(
    stylesheet,
    /\.word-panel\s*\{[\s\S]*?height:\s*clamp\(86px, 13dvh, 104px\);/,
  );
  assert.match(
    stylesheet,
    /\.word-display\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\) clamp\(30px, 4\.5dvh, 36px\);/,
  );
  assert.ok(feedbackLineRule);
  assert.match(feedbackLineRule, /border-top:\s*1px solid/);
});

test("accepted words get a restrained confirmation bloom", () => {
  assert.match(feedbackSource, /Correct · \+\{feedback\.points\}/);
  assert.match(stylesheet, /@keyframes accepted-word-lift/);
  assert.match(stylesheet, /@keyframes accepted-check-pop/);
  assert.match(
    stylesheet,
    /\.word-panel\.is-accepted \.current-word\s*\{[\s\S]*?animation:\s*accepted-word-lift/,
  );
  assert.match(
    stylesheet,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.feedback\.accepted \.feedback-icon/,
  );
});

test("landscape touch devices show the portrait-only guard", () => {
  assert.match(
    stylesheet,
    /@media \(orientation: landscape\) and \(hover: none\) and \(pointer: coarse\)[\s\S]*?\.portrait-only-guard\s*\{[\s\S]*?display:\s*grid;/,
  );
});

test("the app shell gives the board the remaining space", () => {
  assert.match(
    stylesheet,
    /\.interaction-area\s*\{[\s\S]*?grid-template-rows:\s*auto auto minmax\(0, 1fr\) auto;/,
  );
  assert.match(stylesheet, /\.letter-wheel-stage\s*\{[\s\S]*?container-type:\s*size;/);
  assert.match(stylesheet, /--letter-wheel-size:\s*min\(100cqi, 100cqb, 510px\);/);
  assert.doesNotMatch(stylesheet, /calc\(100dvh\s*-\s*\d+px\)/);
});

test("exceptionally short portrait screens can still scroll", () => {
  assert.match(
    stylesheet,
    /@media \(max-height: 520px\) and \(orientation: portrait\)[\s\S]*?\.page-shell\s*\{[\s\S]*?overflow-y:\s*auto;/,
  );
});
