import type { Metadata } from "next";
import type { ReactNode } from "react";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("feedback/") },
};

export default function FeedbackLayout({ children }: { children: ReactNode }) {
  return children;
}
