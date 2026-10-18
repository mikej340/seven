import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL, siteAssetUrl } from "@/lib/site";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const analyticsDomain = process.env.NEXT_PUBLIC_UMAMI_DOMAIN ?? "mikej340.github.io";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Seven Word Puzzle",
  description: "Find words using seven letters and one required centre letter.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Seven",
    title: "Seven Word Puzzle",
    description: "Find words using seven letters and one required centre letter.",
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
    title: "Seven Word Puzzle",
    description: "Find words using seven letters and one required centre letter.",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <aside className="portrait-only-guard" aria-label="Portrait orientation required">
          <span className="portrait-only-icon" aria-hidden="true">↻</span>
          <strong>Please rotate your device</strong>
          <span>Seven is currently designed for portrait mode.</span>
        </aside>
      </body>
    </html>
  );
}
