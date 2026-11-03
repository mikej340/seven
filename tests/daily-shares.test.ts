import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { puzzleWheelLetters } from "../lib/puzzles.ts";
import { SHARE_CARD_INVITATION, shareCardText, shareCardPreviewMarkdown, validateShareCard, type ShareCard } from "../lib/daily-shares.ts";
import { fileSha256, generateSocialCards } from "../scripts/social-card-files.ts";

const puzzle = { date: "2026-11-03", letters: "ghortuw", centre: "o" };
// A header fixture suffices here; the export tests read the real generated PNGs.
const png = Buffer.alloc(24);
png.write("89504e470d0a1a0a", "hex");
png.writeUInt32BE(1200, 16);
png.writeUInt32BE(630, 20);
const card: ShareCard = { ...puzzle, width: 1200, height: 630, imageSha256: fileSha256(png), templateSha256: "fixture" };

test("game and cards use the same initial outer order and required centre", () => {
  assert.deepEqual(puzzleWheelLetters(puzzle), { outerLetters: ["G", "H", "R", "T", "U", "W"], centreLetter: "O" });
  assert.equal(shareCardText(puzzle).description, "Play Seven’s word puzzle for 3 November 2026. Find words using G, H, R, T, U and W, with O in every word.");
});

test("missing cards and changed puzzle inputs block a release build", () => {
  assert.throws(() => validateShareCard(puzzle, undefined), /cards:generate/);
  assert.throws(() => validateShareCard({ ...puzzle, centre: "g" }, card), /inputs differ/);
  assert.equal(validateShareCard(puzzle, card), card);
});

test("PR previews point at the exact committed card and include the manual check", () => {
  const markdown = shareCardPreviewMarkdown(card, "abc123", "editor/seven");
  assert.ok(markdown.includes("https://raw.githubusercontent.com/editor/seven/abc123/public/social/2026-11-03.png"));
  assert.ok(markdown.includes("- [ ] Manually checked at least one generated card"));
  assert.ok(markdown.includes("3 November 2026"));
  assert.equal(SHARE_CARD_INVITATION, "Try this puzzle at");
  assert.ok(markdown.includes("Try this puzzle at playseven.uk."));
  assert.ok(!markdown.includes("Try today’s puzzle"));
});

test("generation preserves existing card bytes, adds missing dates, and is idempotent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "seven-cards-"));
  let renders = 0;
  let closes = 0;
  const renderer = async () => ({
    templateSha256: "test-template",
    render: async () => { renders += 1; return png; },
    close: async () => { closes += 1; },
  });
  try {
    await writeFile(join(directory, "manifest.json"), JSON.stringify({ schemaVersion: 1, cards: [card] }));
    await writeFile(join(directory, `${puzzle.date}.png`), png);
    const next = { date: "2026-11-04", letters: "bilnoty", centre: "i" };
    assert.deepEqual(await generateSocialCards([puzzle, next], directory, renderer), { created: [next.date], preserved: 1 });
    assert.equal(renders, 1);
    assert.equal(closes, 1);
    assert.deepEqual(await readFile(join(directory, `${puzzle.date}.png`)), png);
    const before = await readFile(join(directory, "manifest.json"));
    assert.deepEqual(await generateSocialCards([puzzle, next], directory, renderer), { created: [], preserved: 2 });
    assert.deepEqual(await readFile(join(directory, "manifest.json")), before);
    assert.equal(renders, 1);
    const saved = JSON.parse(before.toString());
    assert.equal(saved.cards[1].templateSha256, "test-template");
    assert.equal(saved.cards[1].imageSha256, fileSha256(png));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("generation refuses changed schedule inputs or changed image bytes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "seven-cards-"));
  const renderer = async (): Promise<never> => { throw new Error("Must not start rendering"); };
  try {
    await writeFile(join(directory, "manifest.json"), JSON.stringify({ schemaVersion: 1, cards: [card] }));
    await writeFile(join(directory, `${puzzle.date}.png`), png);
    await assert.rejects(generateSocialCards([{ ...puzzle, centre: "g" }], directory, renderer), /inputs differ/);
    assert.deepEqual(await readFile(join(directory, `${puzzle.date}.png`)), png);
    await writeFile(join(directory, `${puzzle.date}.png`), "changed");
    await assert.rejects(generateSocialCards([puzzle], directory, renderer), /Existing card bytes changed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
