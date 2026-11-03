import type { Metadata } from "next";
import { canonicalUrl, siteAssetUrl } from "@/lib/site";
import PuzzleGame from "./puzzle-game";

const title = "Seven – 3 November 2026 Word Puzzle";
const description = "Play Seven’s word puzzle for 3 November 2026. Find words using G, H, R, T, U and W, with O in every word.";
const image = siteAssetUrl("social/2026-11-03.png");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalUrl("daily/2026-11-03/") },
  openGraph: {
    type: "website",
    url: siteAssetUrl("daily/2026-11-03/"),
    siteName: "Seven",
    title,
    description,
    images: [{
      url: image,
      width: 1731,
      height: 909,
      alt: "3 November 2026: G, H, R, T, U and W on six green leaves, with O in the centre. Try today’s puzzle at playseven.uk.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
};

export default function DailyPuzzlePage() {
  return <PuzzleGame />;
}
