import assert from "node:assert/strict";
import test from "node:test";

import {
  deliverFriendInvite,
  INVITE_TEXT,
  INVITE_TITLE,
} from "../lib/share-invite.ts";

const url = "https://example.com/seven/";

test("shares the invitation through the native share sheet", async () => {
  const shares: ShareData[] = [];
  const result = await deliverFriendInvite(url, {
    async share(data) {
      shares.push(data);
    },
  });

  assert.equal(result, "shared");
  assert.deepEqual(shares, [{ title: INVITE_TITLE, text: INVITE_TEXT, url }]);
});

test("copies only the URL when native sharing is unavailable", async () => {
  const writes: string[] = [];
  const result = await deliverFriendInvite(url, {
    clipboard: {
      async writeText(text) {
        writes.push(text);
      },
    },
  });

  assert.equal(result, "copied");
  assert.deepEqual(writes, [url]);
});

test("treats cancellation as neither success nor a clipboard fallback", async () => {
  let clipboardWrites = 0;
  const result = await deliverFriendInvite(url, {
    async share() {
      throw new DOMException("Cancelled", "AbortError");
    },
    clipboard: {
      async writeText() {
        clipboardWrites += 1;
      },
    },
  });

  assert.equal(result, "cancelled");
  assert.equal(clipboardWrites, 0);
});

test("falls back to copying after a native share failure", async () => {
  const writes: string[] = [];
  const result = await deliverFriendInvite(url, {
    async share() {
      throw new DOMException("Not allowed", "NotAllowedError");
    },
    clipboard: {
      async writeText(text) {
        writes.push(text);
      },
    },
  });

  assert.equal(result, "copied");
  assert.deepEqual(writes, [url]);
});

test("reports failure when neither delivery mechanism works", async () => {
  assert.equal(await deliverFriendInvite(url, {}), "failed");
});
