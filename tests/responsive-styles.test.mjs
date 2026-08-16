import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const pageSource = await readFile(
  new URL("../app/page.tsx", import.meta.url),
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
  const foundWordsPosition = pageSource.indexOf('className="found-words"');
  const wheelPosition = pageSource.indexOf('className="letter-wheel-stage"');
  const controlsPosition = pageSource.indexOf('className="game-controls"');

  assert.ok(foundWordsPosition > -1);
  assert.ok(foundWordsPosition < wheelPosition);
  assert.ok(wheelPosition < controlsPosition);
  assert.match(
    stylesheet,
    /\.found-words-button\s*\{[\s\S]*?min-height:\s*44px;/,
  );
});

test("the controls retain a non-interactive bottom comfort zone", () => {
  assert.match(
    stylesheet,
    /\.interaction-area\s*\{[\s\S]*?padding-bottom:\s*clamp\(44px, 7dvh, 58px\);/,
  );
});

test("found words is centred beneath the rank details", () => {
  assert.match(stylesheet, /\.rank-footer\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*5px;/);
  assert.match(stylesheet, /\.found-words\s*\{[\s\S]*?justify-self:\s*center;/);
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
