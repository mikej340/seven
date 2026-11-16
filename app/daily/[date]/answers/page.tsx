import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dailyShares } from "@/lib/daily-shares-build";
import { buildAnswersFor } from "@/lib/puzzle-answers-build";
import { formatPuzzleDate, puzzleWheelLetters } from "@/lib/puzzles";
import { canonicalUrl, siteAssetUrl } from "@/lib/site";
import AnswersGame from "../../answers-game";

type Props = { params: Promise<{ date: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return dailyShares.map(({ puzzle }) => ({ date: puzzle.date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const share = dailyShares.find(({ puzzle }) => puzzle.date === date);
  if (share === undefined) notFound();
  const answers = buildAnswersFor(date);
  const day = formatPuzzleDate(date, false);
  const { outerLetters, centreLetter } = puzzleWheelLetters(share.puzzle);
  const letters = `${outerLetters.slice(0, -1).join(", ")} and ${outerLetters.at(-1)}`;
  const title = `Seven Answers – ${day}`;
  const description = answers === null
    ? `Answers to Seven’s word puzzle for ${day}, using ${letters} with ${centreLetter} in the centre. Available once the day is over.`
    : `All ${answers.answers.length} answers to Seven’s word puzzle for ${day}, using ${letters} with ${centreLetter} in the centre. Try the puzzle first, then reveal the words.`;
  const image = siteAssetUrl(`social/${date}.png`);
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(`daily/${date}/answers/`) },
    // Built before the puzzle's day ended: no words in the HTML yet, so keep it
    // out of search results until the next build adds them.
    robots: answers === null ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      url: siteAssetUrl(`daily/${date}/answers/`),
      siteName: "Seven",
      title,
      description,
      images: [{ url: image, width: share.card.width, height: share.card.height }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function DailyAnswersPage({ params }: Props) {
  const { date } = await params;
  if (!dailyShares.some(({ puzzle }) => puzzle.date === date)) notFound();
  return <AnswersGame date={date} buildAnswers={buildAnswersFor(date)} />;
}
