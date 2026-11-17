"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/analytics";

/** Sends a collector page view on load and on each client-side navigation. */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    // The ref also absorbs React's development double-run of effects.
    if (lastPathname.current === pathname) return;
    const isFirstPage = lastPathname.current === null;
    lastPathname.current = pathname;
    trackPageView(isFirstPage ? document.referrer : undefined);
  }, [pathname]);

  return null;
}
