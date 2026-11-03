import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dailyShares } from "@/lib/daily-shares-build";
import { shareCardText } from "@/lib/daily-shares";
import { canonicalUrl, siteAssetUrl } from "@/lib/site";
import PuzzleGame from "../puzzle-game";

type Props = { params: Promise<{ date: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return dailyShares.map(({ puzzle }) => ({ date: puzzle.date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const share = dailyShares.find(({ puzzle }) => puzzle.date === date);
  if (share === undefined) notFound();
  const { title, description, alt } = shareCardText(share.puzzle);
  const image = siteAssetUrl(`social/${date}.png`);
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(`daily/${date}/`) },
    openGraph: {
      type: "website",
      url: siteAssetUrl(`daily/${date}/`),
      siteName: "Seven",
      title,
      description,
      images: [{ url: image, width: share.card.width, height: share.card.height, alt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function DailyPuzzlePage({ params }: Props) {
  const { date } = await params;
  if (!dailyShares.some(({ puzzle }) => puzzle.date === date)) notFound();
  return <PuzzleGame date={date} />;
}
