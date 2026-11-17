"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { trackPageView } from "@/lib/analytics";

/** Sends a collector page view on load and on each client-side navigation. */
function PageViewTrackerInner() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    // Query-only changes (e.g. ?date=) count as page views, as in Umami.
    const page = `${pathname}?${search}`;
    // The ref also absorbs React's development double-run of effects.
    if (lastPage.current === page) return;
    const isFirstPage = lastPage.current === null;
    lastPage.current = page;
    trackPageView(isFirstPage ? document.referrer : undefined);
  }, [pathname, search]);

  return null;
}

// useSearchParams needs a Suspense boundary in a static export.
export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}
