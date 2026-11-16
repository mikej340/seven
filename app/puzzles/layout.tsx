import type { Metadata } from "next";
import type { ReactNode } from "react";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "All Puzzles – Seven Daily Word Puzzle Archive",
  description: "Play any past Seven puzzle. Every daily British-English word puzzle, from the first to today’s.",
  alternates: { canonical: canonicalUrl("puzzles/") },
};

export default function PuzzlesLayout({ children }: { children: ReactNode }) {
  return children;
}
