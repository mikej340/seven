import type { MetadataRoute } from "next";
import puzzleManifest from "@/public/puzzles/manifest.json";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-static";

// Lists canonical (playseven.uk) URLs in both builds. Dated puzzle pages are
// included up to the build date only, so prepublished future puzzles are not
// advertised to search engines before their day.
export default function sitemap(): MetadataRoute.Sitemap {
  const buildDate = new Date().toISOString().slice(0, 10);
  const pastDates = puzzleManifest.entries
    .map(({ date }) => date)
    .filter((date) => date <= buildDate)
    .sort();

  return [
    { url: canonicalUrl(""), changeFrequency: "daily", priority: 1 },
    { url: canonicalUrl("how-to-play/"), changeFrequency: "monthly", priority: 0.8 },
    { url: canonicalUrl("puzzles/"), changeFrequency: "daily", priority: 0.7 },
    { url: canonicalUrl("feedback/"), changeFrequency: "yearly", priority: 0.2 },
    ...pastDates.map((date) => ({
      url: canonicalUrl(`daily/${date}/`),
      lastModified: date,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
