import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { shareCardText } from "../lib/daily-shares.ts";

const out = new URL("../out/", import.meta.url);
const home = await readFile(new URL("index.html", out), "utf8");
const siteUrl = home.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
assert.ok(siteUrl);
const manifest = JSON.parse(await readFile(new URL("puzzles/manifest.json", out), "utf8"));
const cards = JSON.parse(await readFile(new URL("social/manifest.json", out), "utf8"));
const byDate = new Map(cards.cards.map((card) => [card.date, card]));
const escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

test("exports a dated page and matching social image for every scheduled puzzle", async () => {
  for (const puzzle of manifest.entries) {
    const html = await readFile(new URL(`daily/${puzzle.date}/index.html`, out), "utf8");
    const text = shareCardText(puzzle);
    const imageUrl = new URL(`social/${puzzle.date}.png`, siteUrl).href;
    const card = byDate.get(puzzle.date);
    assert.ok(card, puzzle.date);
    assert.equal(card.letters, puzzle.letters);
    assert.equal(card.centre, puzzle.centre);
    assert.ok(html.includes(`<title>${text.title}</title>`), puzzle.date);
    assert.ok(html.includes(`<link rel="canonical" href="https://playseven.uk/daily/${puzzle.date}/"`), puzzle.date);
    assert.ok(html.includes(`<meta property="og:url" content="${new URL(`daily/${puzzle.date}/`, siteUrl).href}"`));
    assert.ok(html.includes(`<meta property="og:image" content="${imageUrl}"`));
    assert.ok(html.includes(`<meta name="twitter:image" content="${imageUrl}"`));
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image"'));
    assert.ok(html.includes(`<meta name="description" content="${escapeAttribute(text.description)}"`));
    assert.ok(html.includes(`<meta property="og:image:alt" content="${escapeAttribute(text.alt)}"`));
    assert.ok(!html.includes(new URL("social-card.png", siteUrl).href));
    const png = await readFile(new URL(`social/${puzzle.date}.png`, out));
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), card.width);
    assert.equal(png.readUInt32BE(20), card.height);
    assert.equal(createHash("sha256").update(png).digest("hex"), card.imageSha256);
    assert.ok(html.includes(`<meta property="og:image:width" content="${card.width}"`));
    assert.ok(html.includes(`<meta property="og:image:height" content="${card.height}"`));
  }
});

test("all dated cards use the shared template dimensions", () => {
  for (const card of cards.cards) {
    assert.match(card.templateSha256, /^[a-f0-9]{64}$/);
    assert.equal(card.width, 1200);
    assert.equal(card.height, 630);
  }
});
