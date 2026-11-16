import type { Metadata } from "next";
import type { ReactNode } from "react";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Feedback – Seven",
  description: "Send feedback, report a missing word or suggest an improvement to Seven, the daily British-English word puzzle.",
  alternates: { canonical: canonicalUrl("feedback/") },
};

export default function FeedbackLayout({ children }: { children: ReactNode }) {
  return children;
}
