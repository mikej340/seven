import type { Metadata } from "next";
import type { ReactNode } from "react";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("puzzles/") },
};

export default function PuzzlesLayout({ children }: { children: ReactNode }) {
  return children;
}
