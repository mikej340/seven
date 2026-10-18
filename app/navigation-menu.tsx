"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_EVENTS, trackGameEvent } from "@/lib/analytics";
import { PUZZLE_BASE_PATH } from "@/lib/puzzles";
import { deliverFriendInvite, type InviteShareResult } from "@/lib/share-invite";
import { SITE_URL } from "@/lib/site";
import styles from "./navigation-menu.module.css";

type NavigationMenuProps = {
  current?: "today" | "puzzles" | "feedback";
  feedbackPuzzleDate?: string;
};

export default function NavigationMenu({ current, feedbackPuzzleDate }: NavigationMenuProps) {
  const [open, setOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<InviteShareResult | "idle" | "sharing">("idle");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inviteInFlightRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setInviteStatus("idle");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setInviteStatus("idle");
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const shareInvite = async () => {
    if (inviteInFlightRef.current) return;
    inviteInFlightRef.current = true;
    setInviteStatus("sharing");

    try {
      const result = await deliverFriendInvite(SITE_URL);
      setInviteStatus(result === "cancelled" ? "idle" : result);

      if (result === "shared" || result === "copied") {
        trackGameEvent(GAME_EVENTS.friendInviteShared, {
          method: result === "shared" ? "native" : "clipboard",
        });
      }
    } finally {
      inviteInFlightRef.current = false;
    }
  };

  const inviteButtonLabel = inviteStatus === "sharing"
    ? "Opening share…"
    : inviteStatus === "shared"
      ? "Invite shared"
      : inviteStatus === "copied"
        ? "Link copied"
        : inviteStatus === "failed"
          ? "Couldn’t share"
          : "Invite a friend";

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.button}
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-controls="site-navigation-menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setInviteStatus("idle");
        }}
        ref={buttonRef}
      >
        <span className={styles.icon} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      <nav
        className={styles.menu}
        id="site-navigation-menu"
        aria-label="Site navigation"
        hidden={!open}
      >
        <a href={`${PUZZLE_BASE_PATH}/`} aria-current={current === "today" ? "page" : undefined}>
          <span>Today</span>
          {current === "today" ? <i aria-hidden="true">Current</i> : null}
        </a>
        <a
          href={`${PUZZLE_BASE_PATH}/puzzles/`}
          aria-current={current === "puzzles" ? "page" : undefined}
        >
          <span>All puzzles</span>
          {current === "puzzles" ? <i aria-hidden="true">Current</i> : null}
        </a>
        <button
          type="button"
          disabled={inviteStatus === "sharing"}
          onClick={() => void shareInvite()}
        >
          <span aria-live="polite">{inviteButtonLabel}</span>
        </button>
        <a
          href={`${PUZZLE_BASE_PATH}/feedback/${feedbackPuzzleDate ? `?puzzle=${feedbackPuzzleDate}` : ""}`}
          aria-current={current === "feedback" ? "page" : undefined}
        >
          <span>Feedback</span>
          {current === "feedback" ? <i aria-hidden="true">Current</i> : null}
        </a>
      </nav>
    </div>
  );
}
