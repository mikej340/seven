import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-static";

// Only effective at a domain root (playseven.uk/robots.txt); the github.io
// build's copy under /seven/ is ignored by crawlers, which is harmless.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: canonicalUrl("sitemap.xml"),
  };
}
