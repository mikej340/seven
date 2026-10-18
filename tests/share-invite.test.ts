import assert from "node:assert/strict";
import test from "node:test";

import {
  copySelectedInvite,
  deliverFriendInvite,
  INVITE_TEXT,
  INVITE_TITLE,
  INVITE_URL,
} from "../lib/share-invite.ts";

const url = "https://example.com/seven/";

test("sends new players to the branded domain", () => {
  assert.equal(INVITE_URL, "https://playseven.uk/");
});

test("copies the selected fallback address before retrying clipboard permissions", async () => {
  const writes: string[] = [];
  let legacyCopies = 0;

  assert.equal(await copySelectedInvite(
    INVITE_URL,
    { async writeText(text) { writes.push(text); } },
    { execCommand() { legacyCopies += 1; return true; } },
  ), true);
  assert.deepEqual(writes, []);
  assert.equal(legacyCopies, 1);
});

test("copies the selected address when clipboard permissions are unavailable", async () => {
  const commands: string[] = [];

  assert.equal(await copySelectedInvite(
    INVITE_URL,
    undefined,
    { execCommand(command) { commands.push(command); return true; } },
  ), true);
  assert.deepEqual(commands, ["copy"]);
});

test("retries the modern clipboard when selected-address copying is unavailable", async () => {
  const writes: string[] = [];

  assert.equal(await copySelectedInvite(
    INVITE_URL,
    { async writeText(text) { writes.push(text); } },
    { execCommand() { return false; } },
  ), true);
  assert.deepEqual(writes, [INVITE_URL]);
});

test("reports when neither fallback copy mechanism succeeds", async () => {
  assert.equal(await copySelectedInvite(
    INVITE_URL,
    { async writeText() { throw new DOMException("Denied", "NotAllowedError"); } },
    { execCommand() { return false; } },
  ), false);
});

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
