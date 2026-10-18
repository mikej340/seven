import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const out = new URL("../out/", import.meta.url);
const html = await readFile(new URL("index.html", out), "utf8");
const archiveHtml = await readFile(new URL("puzzles/index.html", out), "utf8");
const feedbackHtml = await readFile(new URL("feedback/index.html", out), "utf8");

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

test("exports root-domain pages and public assets", async () => {
  assert.match(html, /<title>Seven Word Puzzle<\/title>/);
  assert.match(archiveHtml, /All puzzles/);
  assert.match(feedbackHtml, /Feedback/);

  for (const path of [
    "favicon.svg",
    "icons/icon-32.png",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/icon-maskable-512.png",
    "icons/apple-touch-icon.png",
  ]) {
    assert.ok((await stat(new URL(path, out))).size > 0, `${path} should be exported`);
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
