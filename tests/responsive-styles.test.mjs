import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("the game page scrolls vertically without horizontal overflow", () => {
  const pageShell = stylesheet.match(/\.page-shell\s*\{(?<rules>[\s\S]*?)\n\}/)?.groups?.rules;

  assert.ok(pageShell, "expected a .page-shell rule");
  assert.match(pageShell, /overflow-x:\s*hidden;/);
  assert.match(pageShell, /overflow-y:\s*auto;/);
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
