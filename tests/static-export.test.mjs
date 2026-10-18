import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
const archiveHtml = await readFile(
  new URL("../out/puzzles/index.html", import.meta.url),
  "utf8",
);
const feedbackHtml = await readFile(
  new URL("../out/feedback/index.html", import.meta.url),
  "utf8",
);

test("exports the game landing page", () => {
  assert.match(html, /<title>Seven Word Puzzle<\/title>/);
  assert.match(
    html,
    /Find words using seven letters and one required centre letter\./,
  );
});

test("includes anonymous Umami analytics", () => {
  assert.match(html, /src="https:\/\/cloud\.umami\.is\/script\.js"/);
  assert.match(
    html,
    /data-website-id="37db4623-e4fa-4e9a-9c91-f2fcdad09529"/,
  );
  assert.match(html, /data-domains="mikej340.github.io"/);
});

test("includes the friend invitation action", () => {
  assert.match(archiveHtml, />Invite a friend</);
  assert.match(feedbackHtml, />Invite a friend</);
});

test("includes canonical and social preview metadata", async () => {
  const siteUrl = "https://mikej340.github.io/seven/";
  const imageUrl = `${siteUrl}social-card.png`;
  assert.match(html, new RegExp(`<link rel="canonical" href="${siteUrl}"`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${siteUrl}"`));
  assert.match(html, new RegExp(`<meta property="og:image" content="${imageUrl}"`));
  assert.match(html, /<meta property="og:image:width" content="1200"/);
  assert.match(html, /<meta property="og:image:height" content="630"/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${imageUrl}"`));

  const cardPath = new URL("../out/social-card.png", import.meta.url);
  assert.ok((await stat(cardPath)).size > 0);
  const card = await readFile(cardPath);
  assert.equal(card.readUInt32BE(16), 1200);
  assert.equal(card.readUInt32BE(20), 630);
});

test("uses repository-relative GitHub Pages asset paths", () => {
  assert.match(html, /(?:href|src)="\/seven\/_next\//);
  assert.match(html, /href="\/seven\/icons\/icon-32\.png"/);
  assert.match(html, /href="\/seven\/icons\/apple-touch-icon\.png"/);
  assert.doesNotMatch(html, /(?:href|src)="\/_next\//);
});

test("exports the archive route and daily puzzle data", async () => {
  assert.match(archiveHtml, /<title>Seven Word Puzzle<\/title>/);
  const manifest = JSON.parse(
    await readFile(new URL("../out/puzzles/manifest.json", import.meta.url), "utf8"),
  );
  const sourceManifest = JSON.parse(
    await readFile(new URL("../public/puzzles/manifest.json", import.meta.url), "utf8"),
  );
  const august = JSON.parse(
    await readFile(new URL("../out/puzzles/2026-08.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(
    manifest.entries.map((entry) => entry.date),
    sourceManifest.entries.map((entry) => entry.date),
  );
  assert.equal(august.puzzles[0].answers.length, 42);
  assert.equal(august.puzzles[1].answers.length, 35);
});

test("exports the feedback route and base-path-safe navigation", () => {
  assert.match(feedbackHtml, /Feedback/);
  assert.match(feedbackHtml, /href="\/seven\/feedback\/"/);
  assert.match(archiveHtml, /href="\/seven\/feedback\/"/);
});

test("exports standalone web-app metadata", async () => {
  assert.match(html, /content="width=device-width, initial-scale=1"/);
  assert.doesNotMatch(html, /viewport-fit=cover/);
  assert.match(html, /href="\/seven\/manifest\.webmanifest"/);

  const manifest = JSON.parse(
    await readFile(new URL("../out/manifest.webmanifest", import.meta.url), "utf8"),
  );
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait");
  assert.equal(manifest.start_url, "/seven/");
  assert.equal(manifest.scope, "/seven/");
  assert.deepEqual(
    manifest.icons.map(({ sizes, purpose }) => ({ sizes, purpose })),
    [
      { sizes: "192x192", purpose: "any" },
      { sizes: "512x512", purpose: "any" },
      { sizes: "512x512", purpose: "maskable" },
    ],
  );
});
