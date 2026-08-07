import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");

test("exports the game landing page", () => {
  assert.match(html, /<title>Seven Word Puzzle<\/title>/);
  assert.match(
    html,
    /Find words using seven letters and one required centre letter\./,
  );
});

test("uses repository-relative GitHub Pages asset paths", () => {
  assert.match(html, /(?:href|src)="\/seven\/_next\//);
  assert.match(html, /href="\/seven\/favicon\.svg"/);
  assert.doesNotMatch(html, /(?:href|src)="\/_next\//);
});
