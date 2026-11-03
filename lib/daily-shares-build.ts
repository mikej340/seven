import puzzleManifest from "@/public/puzzles/manifest.json";
import cardManifest from "@/public/social/manifest.json";
import { validateShareCard } from "./daily-shares";

// Reading the committed export at build time keeps previews independent of UTC
// today and makes missing cards fail the release build rather than a live share.
const cards = new Map(cardManifest.cards.map((card) => [card.date, card]));
export const dailyShares = puzzleManifest.entries.map((puzzle) => ({
  puzzle,
  card: validateShareCard(puzzle, cards.get(puzzle.date)),
}));
