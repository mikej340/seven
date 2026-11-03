import { formatPuzzleDate, puzzleWheelLetters } from "./puzzles.ts";

export type SharePuzzle = { date: string; letters: string; centre: string };

export type ShareCard = SharePuzzle & {
  width: number;
  height: number;
  imageSha256: string;
  templateSha256: string;
};

export type ShareCardManifest = { schemaVersion: 1; cards: ShareCard[] };

export function shareCardText(puzzle: SharePuzzle) {
  const date = formatPuzzleDate(puzzle.date, false);
  const { outerLetters, centreLetter } = puzzleWheelLetters(puzzle);
  const letters = `${outerLetters.slice(0, -1).join(", ")} and ${outerLetters.at(-1)}`;
  return {
    date,
    title: `Seven – ${date} Word Puzzle`,
    description: `Play Seven’s word puzzle for ${date}. Find words using ${letters}, with ${centreLetter} in every word.`,
    alt: `${date}: ${letters} on six green leaves, with ${centreLetter} in the centre. Try today’s puzzle at playseven.uk.`,
  };
}

export function validateShareCard(puzzle: SharePuzzle, card: ShareCard | undefined): ShareCard {
  if (card === undefined) {
    throw new Error(`Missing social card for ${puzzle.date}. Run npm run cards:generate before building.`);
  }
  if (card.date !== puzzle.date || card.letters !== puzzle.letters || card.centre !== puzzle.centre) {
    throw new Error(`Social card inputs differ from the scheduled puzzle for ${puzzle.date}. Existing dated cards must be preserved; investigate the schedule change.`);
  }
  return card;
}

// Call after committing: the preview points at the exact image in that commit.
export function shareCardPreviewMarkdown(card: ShareCard, commit: string, repository: string) {
  const { date, alt } = shareCardText(card);
  const image = `https://raw.githubusercontent.com/${repository}/${commit}/public/social/${card.date}.png`;
  return `### Puzzle card preview\n\n${date} — please check this card before merging.\n\n![${alt}](${image})\n\n- [ ] Manually checked at least one generated card before publication.\n`;
}
