import type { Metadata, Viewport } from "next";
import { CANONICAL_SITE_URL, SITE_URL, siteAssetUrl } from "@/lib/site";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const analyticsDomain = process.env.NEXT_PUBLIC_UMAMI_DOMAIN ?? "mikej340.github.io";
const pageTitle = "Seven – Free Daily British Word Puzzle";
const pageDescription =
  "Love the NYT Spelling Bee? Try Seven, a free daily British-English word game. Find words, discover pangrams and climb the ranks at your own pace.";
const socialDescription =
  "Play Seven, a free daily British-English word game. Find words, discover pangrams and climb the ranks at your own pace.";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_SITE_URL),
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: CANONICAL_SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Seven",
    title: pageTitle,
    description: socialDescription,
    images: [
      {
        url: siteAssetUrl("social-card.png"),
        width: 1200,
        height: 630,
        alt: "Seven Word Puzzle — a daily word puzzle framed by botanical leaves.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: socialDescription,
    images: [siteAssetUrl("social-card.png")],
  },
  icons: {
    icon: [
      { url: `${basePath}/icons/icon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `${basePath}/icons/icon-32.png`,
    apple: {
      url: `${basePath}/icons/apple-touch-icon.png`,
      sizes: "180x180",
      type: "image/png",
    },
  },
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Seven",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f2e7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="37db4623-e4fa-4e9a-9c91-f2fcdad09529"
          data-domains={analyticsDomain}
        />
      </head>
      <body className="antialiased">
        {children}
        <section
          className="portrait-only-guard"
          aria-label="Portrait orientation required"
          data-nosnippet
        >
          <span className="portrait-only-icon" aria-hidden="true">↻</span>
          <strong>Please rotate your device</strong>
          <span>Seven is currently designed for portrait mode.</span>
        </section>
      </body>
    </html>
  );
}
