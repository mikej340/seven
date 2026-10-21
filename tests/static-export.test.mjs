import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
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
const howToPlayHtml = await readFile(
  new URL("../out/how-to-play/index.html", import.meta.url),
  "utf8",
);

const readJavaScript = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(entries.map(async (entry) => {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory()) return readJavaScript(new URL(`${entry.name}/`, directory));
    return entry.name.endsWith(".js") ? readFile(url, "utf8") : "";
  }));
  return contents.join("\n");
};

const clientJavaScript = await readJavaScript(
  new URL("../out/_next/static/", import.meta.url),
);

const pageTitle = "Seven – Free Daily British Word Puzzle";
const pageDescription =
  "Love the NYT Spelling Bee? Try Seven, a free daily British-English word game. Find words, discover pangrams and climb the ranks at your own pace.";
const socialDescription =
  "Play Seven, a free daily British-English word game. Find words, discover pangrams and climb the ranks at your own pace.";

test("exports the game landing page", () => {
  assert.match(html, new RegExp(`<title>${pageTitle}<\\/title>`));
  assert.ok(
    html.includes(`<meta name="description" content="${pageDescription}"`),
  );
  assert.match(
    html,
    /<section[^>]*class="portrait-only-guard"[^>]*data-nosnippet="true"/,
  );
  assert.match(html, /Please rotate your device/);
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
  assert.match(clientJavaScript, /https:\/\/playseven\.uk\//);
});

test("includes canonical and social preview metadata", async () => {
  const siteUrl = "https://mikej340.github.io/seven/";
  const canonicalUrl = "https://playseven.uk/";
  const imageUrl = `${siteUrl}social-card.png`;
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonicalUrl}"`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${siteUrl}"`));
  assert.match(html, new RegExp(`<meta property="og:title" content="${pageTitle}"`));
  assert.match(html, new RegExp(`<meta property="og:description" content="${socialDescription}"`));
  assert.match(html, new RegExp(`<meta property="og:image" content="${imageUrl}"`));
  assert.match(html, /<meta property="og:image:width" content="1200"/);
  assert.match(html, /<meta property="og:image:height" content="630"/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
  assert.match(html, new RegExp(`<meta name="twitter:title" content="${pageTitle}"`));
  assert.match(html, new RegExp(`<meta name="twitter:description" content="${socialDescription}"`));
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
  assert.match(archiveHtml, new RegExp(`<title>${pageTitle}<\\/title>`));
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

test("exports a static how-to-play guide with repository-safe links and metadata", () => {
  const guideUrl = "https://mikej340.github.io/seven/how-to-play/";
  assert.match(howToPlayHtml, /<h1>How to play<\/h1>/);
  assert.match(howToPlayHtml, /Hyphenated words and proper nouns are not accepted/);
  assert.match(howToPlayHtml, /A four-letter word earns one point/);
  assert.match(howToPlayHtml, /Find every word/);
  assert.match(howToPlayHtml, /href="\/seven\/"/);
  assert.match(howToPlayHtml, /href="\/seven\/puzzles\/"/);
  assert.match(howToPlayHtml, /href="\/seven\/feedback\/"/);
  assert.match(howToPlayHtml, /<link rel="canonical" href="https:\/\/playseven\.uk\/how-to-play\/"/);
  assert.ok(howToPlayHtml.includes(`<meta property="og:url" content="${guideUrl}"`));
  assert.ok(howToPlayHtml.includes(`<meta name="twitter:description" content="Learn how to play Seven`));
  assert.match(html, /href="\/seven\/how-to-play\/"/);
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
