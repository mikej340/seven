import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const out = new URL("../out/", import.meta.url);
const html = await readFile(new URL("index.html", out), "utf8");
const archiveHtml = await readFile(new URL("puzzles/index.html", out), "utf8");
const feedbackHtml = await readFile(new URL("feedback/index.html", out), "utf8");
const howToPlayHtml = await readFile(new URL("how-to-play/index.html", out), "utf8");

const readJavaScript = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(entries.map(async (entry) => {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory()) return readJavaScript(new URL(`${entry.name}/`, directory));
    return entry.name.endsWith(".js") ? readFile(url, "utf8") : "";
  }));
  return contents.join("\n");
};

const clientJavaScript = await readJavaScript(new URL("_next/static/", out));

const pageTitle = "Seven – Free Daily British Word Puzzle";
const pageDescription =
  "Love the NYT Spelling Bee? Try Seven, a free daily British-English word game. Find words, discover pangrams and climb the ranks at your own pace.";
const socialDescription =
  "Play Seven, a free daily British-English word game. Find words, discover pangrams and climb the ranks at your own pace.";

test("exports root-domain pages and public assets", async () => {
  assert.match(html, new RegExp(`<title>${pageTitle}<\\/title>`));
  assert.ok(
    html.includes(`<meta name="description" content="${pageDescription}"`),
  );
  assert.match(
    html,
    /<section[^>]*class="portrait-only-guard"[^>]*data-nosnippet="true"/,
  );
  assert.match(html, /Please rotate your device/);
  assert.match(archiveHtml, /All puzzles/);
  assert.match(feedbackHtml, /Feedback/);

  for (const path of [
    "favicon.svg",
    "icons/icon-32.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-512.png",
    "icons/apple-touch-icon.png",
    "social-card.png",
  ]) {
    assert.ok((await stat(new URL(path, out))).size > 0, `${path} should be exported`);
  }
});

test("includes the friend invitation action", () => {
  assert.match(archiveHtml, />Invite a friend</);
  assert.match(feedbackHtml, />Invite a friend</);
  assert.match(clientJavaScript, /https:\/\/playseven\.uk\//);
});

test("includes root-domain canonical and social preview metadata", async () => {
  const siteUrl = "https://playseven.uk/";
  const imageUrl = `${siteUrl}social-card.png`;

  assert.match(html, new RegExp(`<link rel="canonical" href="${siteUrl}"`));
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

  const card = await readFile(new URL("social-card.png", out));
  assert.equal(card.readUInt32BE(16), 1200);
  assert.equal(card.readUInt32BE(20), 630);
});

test("exports distinct canonical URLs for the archive and feedback", () => {
  for (const [page, path] of [[archiveHtml, "puzzles/"], [feedbackHtml, "feedback/"]]) {
    const canonicalLinks = [...page.matchAll(/<link rel="canonical" href="([^"]+)"/g)]
      .map((match) => match[1]);
    assert.deepEqual(canonicalLinks, [`https://playseven.uk/${path}`]);
  }
});

test("uses root-relative static, icon and metadata paths", () => {
  assert.match(html, /(?:href|src)="\/_next\//);
  assert.match(html, /href="\/icons\/icon-32\.png"/);
  assert.match(html, /href="\/icons\/icon-192\.png"/);
  assert.match(html, /href="\/icons\/apple-touch-icon\.png"/);
  assert.match(html, /href="\/manifest\.webmanifest"/);
  assert.doesNotMatch(html, /(?:href|src)="\/seven\//);
  assert.doesNotMatch(clientJavaScript, /\/seven\//);
});

test("loads daily puzzle data and builds root-relative archive links", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("puzzles/manifest.json", out), "utf8"),
  );
  const sourceManifest = JSON.parse(
    await readFile(new URL("../public/puzzles/manifest.json", import.meta.url), "utf8"),
  );
  const firstEntry = manifest.entries[0];
  const firstMonth = JSON.parse(
    await readFile(new URL(`puzzles/${firstEntry.month}.json`, out), "utf8"),
  );

  assert.deepEqual(manifest.entries, sourceManifest.entries);
  assert.ok(firstMonth.puzzles.some((puzzle) => puzzle.id === firstEntry.id));
  assert.match(clientJavaScript, /\/puzzles\/manifest\.json/);
  assert.match(clientJavaScript, /\/puzzles\//);
  assert.match(clientJavaScript, /\/?date=/);
});

test("uses root-relative navigation and feedback links", () => {
  for (const page of [archiveHtml, feedbackHtml]) {
    assert.match(page, /href="\/"/);
    assert.match(page, /href="\/puzzles\/"/);
    assert.match(page, /href="\/feedback\/"/);
  }
  assert.match(clientJavaScript, /\/feedback\/\?type=word/);
  assert.doesNotMatch(clientJavaScript, /\/seven\/feedback/);
});

test("exports a static how-to-play guide with root-domain links and metadata", () => {
  assert.match(howToPlayHtml, /<h1>How to play<\/h1>/);
  assert.match(howToPlayHtml, /Hyphenated words and proper nouns are not accepted/);
  assert.match(howToPlayHtml, /A four-letter word earns one point/);
  assert.match(howToPlayHtml, /Find every word/);
  assert.match(howToPlayHtml, /href="\/"/);
  assert.match(howToPlayHtml, /href="\/puzzles\/"/);
  assert.match(howToPlayHtml, /href="\/feedback\/"/);
  assert.match(howToPlayHtml, /<link rel="canonical" href="https:\/\/playseven\.uk\/how-to-play\/"/);
  assert.match(howToPlayHtml, /<meta property="og:url" content="https:\/\/playseven\.uk\/how-to-play\/"/);
  assert.match(howToPlayHtml, /<meta name="twitter:description" content="Learn how to play Seven/);
  assert.match(html, /href="\/how-to-play\/"/);
});

test("exports installable root-domain PWA metadata", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.webmanifest", out), "utf8"),
  );

  assert.equal(manifest.name, "Seven Word Puzzle");
  assert.equal(manifest.short_name, "Seven");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, purpose }) => ({ src, sizes, purpose })),
    [
      { src: "/icons/icon-192.png", sizes: "192x192", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" },
    ],
  );
});

test("allows playseven.uk to use the existing Umami site", () => {
  assert.match(
    html,
    /data-website-id="37db4623-e4fa-4e9a-9c91-f2fcdad09529"/,
  );
  assert.match(html, /data-domains="playseven\.uk"/);
});
