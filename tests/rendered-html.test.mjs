import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta = /<meta[^>]*\bname=["']codex-preview["'][^>]*>/i;
const siteDescription =
  /<meta(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']Find words using seven letters and one required centre letter\.["'])[^>]*>/i;

test("renders neutral product metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Seven Word Puzzle<\/title>/i);
  assert.match(html, siteDescription);
  assert.doesNotMatch(html, developmentPreviewMeta);
});
