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

test("exports standalone web-app metadata", async () => {
  assert.match(html, /content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  assert.match(html, /href="\/seven\/manifest\.webmanifest"/);

  const manifest = JSON.parse(
    await readFile(new URL("../out/manifest.webmanifest", import.meta.url), "utf8"),
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/seven/");
  assert.equal(manifest.scope, "/seven/");
});
