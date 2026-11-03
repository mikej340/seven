import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { validateShareCard, type SharePuzzle, type ShareCard, type ShareCardManifest } from "../lib/daily-shares.ts";

export const fileSha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

type Renderer = {
  templateSha256: string;
  render: (puzzle: SharePuzzle) => Promise<Buffer>;
  close: () => Promise<void>;
};

export async function generateSocialCards(
  puzzles: SharePuzzle[],
  directory: string,
  createRenderer: () => Promise<Renderer>,
) {
  let manifest: ShareCardManifest;
  const manifestPath = join(directory, "manifest.json");
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ShareCardManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    manifest = { schemaVersion: 1, cards: [] };
  }
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported social-card manifest");
  const cards = new Map(manifest.cards.map((card) => [card.date, card]));
  if (cards.size !== manifest.cards.length) throw new Error("Duplicate dates in social-card manifest");
  // Check every existing card before creating any new files. Published images
  // are snapshots and are not overwritten by routine generation.
  for (const card of cards.values()) {
    const bytes = await readFile(join(directory, `${card.date}.png`));
    if (fileSha256(bytes) !== card.imageSha256) throw new Error(`Existing card bytes changed: ${card.date}`);
  }
  for (const puzzle of puzzles) {
    const card = cards.get(puzzle.date);
    if (card !== undefined) validateShareCard(puzzle, card);
  }
  const missing = puzzles.filter((puzzle) => !cards.has(puzzle.date));
  if (missing.length === 0) return { created: [], preserved: puzzles.length };

  await mkdir(directory, { recursive: true });
  const renderer = await createRenderer();
  try {
    for (const puzzle of missing) {
      const bytes = await renderer.render(puzzle);
      const card: ShareCard = {
        date: puzzle.date,
        letters: puzzle.letters,
        centre: puzzle.centre,
        width: bytes.readUInt32BE(16),
        height: bytes.readUInt32BE(20),
        imageSha256: fileSha256(bytes),
        templateSha256: renderer.templateSha256,
      };
      await writeFile(join(directory, `${puzzle.date}.png`), bytes, { flag: "wx" });
      cards.set(card.date, card);
      // Save progress after each card so rerunning resumes a partial batch.
      const updated: ShareCardManifest = {
        schemaVersion: 1,
        cards: [...cards.values()].sort((a, b) => a.date.localeCompare(b.date)),
      };
      await writeFile(`${manifestPath}.tmp`, `${JSON.stringify(updated, null, 2)}\n`);
      await rename(`${manifestPath}.tmp`, manifestPath);
    }
  } finally {
    await renderer.close();
  }
  return { created: missing.map((puzzle) => puzzle.date), preserved: puzzles.length - missing.length };
}
