import { CANONICAL_SITE_URL } from "@/lib/site";
import HomeGame from "./home-game";

// Schema.org description of the site and game for search engines. It is not
// visible to players, so the game screen keeps its no-scroll layout.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${CANONICAL_SITE_URL}#website`,
      name: "Seven",
      url: CANONICAL_SITE_URL,
      inLanguage: "en-GB",
    },
    {
      "@type": "WebApplication",
      "@id": `${CANONICAL_SITE_URL}#game`,
      name: "Seven",
      url: CANONICAL_SITE_URL,
      description:
        "A free daily British-English word puzzle and Spelling Bee alternative. Make words from seven letters, always using the centre letter, and find the pangram.",
      applicationCategory: "GameApplication",
      genre: "Word puzzle",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      inLanguage: "en-GB",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      isPartOf: { "@id": `${CANONICAL_SITE_URL}#website` },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so the JSON can never close the script element early.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <HomeGame />
    </>
  );
}
