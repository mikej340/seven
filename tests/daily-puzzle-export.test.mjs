import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const out = new URL("../out/", import.meta.url);
const home = await readFile(new URL("index.html", out), "utf8");
const html = await readFile(new URL("daily/2026-11-03/index.html", out), "utf8");
const siteUrl = home.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
assert.ok(siteUrl);
const imageUrl = new URL("social/2026-11-03.png", siteUrl).href;

test("exports a dated puzzle page with its own canonical and social card", () => {
  assert.ok(html.includes('<title>Seven – 3 November 2026 Word Puzzle</title>'));
  assert.ok(html.includes('<link rel="canonical" href="https://playseven.uk/daily/2026-11-03/"'));
  assert.ok(html.includes(`<meta property="og:url" content="${new URL("daily/2026-11-03/", siteUrl).href}"`));
  assert.ok(html.includes(`<meta property="og:image" content="${imageUrl}"`));
  assert.ok(html.includes(`<meta name="twitter:image" content="${imageUrl}"`));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image"'));
  assert.ok(html.includes("G, H, R, T, U and W, with O in every word."));
  assert.ok(!html.includes(new URL("social-card.png", siteUrl).href));
});

test("the published dated PNG matches its metadata and scheduled puzzle", async () => {
  const card = await readFile(new URL("social/2026-11-03.png", out));
  assert.equal(card.toString("hex", 0, 8), "89504e470d0a1a0a");
  const width = card.readUInt32BE(16);
  const height = card.readUInt32BE(20);
  assert.ok(html.includes(`<meta property="og:image:width" content="${width}"`));
  assert.ok(html.includes(`<meta property="og:image:height" content="${height}"`));
  const manifest = JSON.parse(await readFile(new URL("puzzles/manifest.json", out), "utf8"));
  const puzzle = manifest.entries.find((entry) => entry.date === "2026-11-03");
  assert.equal(puzzle?.letters, "ghortuw");
  assert.equal(puzzle?.centre, "o");
});
