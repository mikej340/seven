import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { shareCardPreviewMarkdown, type ShareCardManifest } from "../lib/daily-shares.ts";
import { fileSha256 } from "./social-card-files.ts";

const { values } = parseArgs({ options: { date: { type: "string" } } });
const root = fileURLToPath(new URL("../", import.meta.url));
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const manifest = JSON.parse(await readFile(new URL("../public/social/manifest.json", import.meta.url), "utf8")) as ShareCardManifest;
const date = values.date ?? manifest.cards.at(-1)?.date;
const card = manifest.cards.find((candidate) => candidate.date === date);
if (card === undefined) throw new Error(`No generated card for ${date}`);
const commit = git("rev-parse", "HEAD");
let bytes: Buffer;
try {
  bytes = execFileSync("git", ["show", `${commit}:public/social/${card.date}.png`], {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch {
  throw new Error(`Commit the card for ${card.date} before preparing the PR preview.`);
}
if (fileSha256(bytes) !== card.imageSha256) throw new Error("Commit the generated cards before preparing the PR preview.");
const remote = git("remote", "get-url", "origin");
const repository = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
if (repository === undefined) throw new Error("The preview requires a GitHub origin remote.");
console.log(shareCardPreviewMarkdown(card, commit, repository));
