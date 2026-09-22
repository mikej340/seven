import assert from "node:assert/strict";
import test from "node:test";

import { deliverScoreImage, scoreCardFileName } from "../lib/share-score.ts";

test("names the scorecard using the puzzle day and month", () => {
  assert.equal(scoreCardFileName("2026-09-20"), "Seven Scorecard · 20 September.png");
  assert.equal(scoreCardFileName("2026-01-01"), "Seven Scorecard · 1 January.png");
});

class FakeClipboardItem {
  static items: Record<string, Blob>[] = [];

  constructor(items: Record<string, Blob>) {
    FakeClipboardItem.items.push(items);
  }
}

const image = new Blob(["score"], { type: "image/png" });

test("shares a PNG file through the native share sheet when supported", async () => {
  const shares: ShareData[] = [];
  const result = await deliverScoreImage(
    image,
    scoreCardFileName("2026-09-20"),
    {
      canShare: ({ files }) => files?.[0]?.type === "image/png",
      async share(data) {
        shares.push(data);
      },
    },
    FakeClipboardItem as unknown as typeof ClipboardItem,
  );

  assert.equal(result, "shared");
  assert.equal(shares.length, 1);
  assert.equal(shares[0]?.files?.[0]?.name, "Seven Scorecard · 20 September.png");
  assert.deepEqual(Object.keys(shares[0] ?? {}), ["files"]);
});

test("copies the PNG when file sharing is unsupported", async () => {
  const writes: ClipboardItem[][] = [];
  FakeClipboardItem.items = [];
  const result = await deliverScoreImage(
    image,
    "seven-score.png",
    {
      canShare: () => false,
      async share() {},
      clipboard: {
        async write(items) {
          writes.push(items);
        },
      },
    },
    FakeClipboardItem as unknown as typeof ClipboardItem,
  );

  assert.equal(result, "copied");
  assert.equal(writes.length, 1);
  assert.equal(FakeClipboardItem.items[0]?.["image/png"], image);
});

test("treats cancellation as neither success nor failure", async () => {
  let clipboardWrites = 0;
  const result = await deliverScoreImage(
    image,
    "seven-score.png",
    {
      canShare: () => true,
      async share() {
        throw new DOMException("Cancelled", "AbortError");
      },
      clipboard: {
        async write() {
          clipboardWrites += 1;
        },
      },
    },
    FakeClipboardItem as unknown as typeof ClipboardItem,
  );

  assert.equal(result, "cancelled");
  assert.equal(clipboardWrites, 0);
});

test("falls back to copying after a native share failure", async () => {
  const result = await deliverScoreImage(
    image,
    "seven-score.png",
    {
      canShare: () => true,
      async share() {
        throw new DOMException("Not allowed", "NotAllowedError");
      },
      clipboard: {
        async write() {},
      },
    },
    FakeClipboardItem as unknown as typeof ClipboardItem,
  );

  assert.equal(result, "copied");
});

test("reports failure when neither delivery mechanism works", async () => {
  const result = await deliverScoreImage(
    image,
    "seven-score.png",
    { canShare: () => false },
    undefined,
  );

  assert.equal(result, "failed");
});
