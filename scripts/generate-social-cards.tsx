import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { PuzzleManifest } from "../lib/puzzles.ts";
import { createCardRenderer } from "./social-card-renderer";
import { generateSocialCards } from "./social-card-files.ts";

const manifest = JSON.parse(await readFile(new URL("../public/puzzles/manifest.json", import.meta.url), "utf8")) as PuzzleManifest;
const result = await generateSocialCards(
  manifest.entries,
  fileURLToPath(new URL("../public/social/", import.meta.url)),
  createCardRenderer,
);
console.log(`Created ${result.created.length} cards; preserved ${result.preserved} existing cards.`);
if (result.created.length > 0) console.log(`New cards: ${result.created[0]} through ${result.created.at(-1)}.`);
