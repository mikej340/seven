"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_EVENTS, trackGameEvent } from "@/lib/analytics";
import { PUZZLE_BASE_PATH } from "@/lib/puzzles";
import {
  copySelectedInvite,
  deliverFriendInvite,
  INVITE_URL,
  type InviteShareResult,
} from "@/lib/share-invite";
import styles from "./navigation-menu.module.css";

type NavigationMenuProps = {
  current?: "today" | "puzzles" | "how-to-play" | "feedback";
  feedbackPuzzleDate?: string;
};

export default function NavigationMenu({ current, feedbackPuzzleDate }: NavigationMenuProps) {
  const [open, setOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<
    InviteShareResult | "idle" | "sharing" | "copying"
  >("idle");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inviteAddressRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (inviteStatus !== "shared" && inviteStatus !== "copied") return;

    const timeout = window.setTimeout(() => setInviteStatus("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [inviteStatus]);

  useEffect(() => {
    if (inviteStatus !== "failed") return;

    inviteAddressRef.current?.focus();
    inviteAddressRef.current?.select();
  }, [inviteStatus]);

  const shareInvite = async () => {
    if (inviteInFlightRef.current) return;
    inviteInFlightRef.current = true;
    setInviteStatus("sharing");

    try {
      const result = await deliverFriendInvite(INVITE_URL);
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

  const copyInviteLink = async () => {
    inviteAddressRef.current?.focus();
    inviteAddressRef.current?.select();
    setInviteStatus("copying");

    if (await copySelectedInvite(INVITE_URL)) {
      setInviteStatus("copied");
      trackGameEvent(GAME_EVENTS.friendInviteShared, { method: "clipboard" });
    } else {
      setInviteStatus("failed");
    }
  };

  const inviteStatusLabel = inviteStatus === "shared"
      ? "Shared"
      : inviteStatus === "copied"
        ? "Copied"
        : "";

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
        <a
          href={`${PUZZLE_BASE_PATH}/how-to-play/`}
          aria-current={current === "how-to-play" ? "page" : undefined}
        >
          <span>How to play</span>
          {current === "how-to-play" ? <i aria-hidden="true">Current</i> : null}
        </a>
        <button
          className={styles.inviteAction}
          type="button"
          aria-busy={inviteStatus === "sharing"}
          disabled={inviteStatus === "sharing"}
          onClick={() => void shareInvite()}
        >
          <span>Invite a friend</span>
          <i className={styles.inviteStatus} aria-live="polite">
            {inviteStatusLabel}
          </i>
        </button>
        {inviteStatus === "failed" || inviteStatus === "copying" ? (
          <div className={styles.inviteFallback}>
            <input
              aria-label="Invitation address"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              ref={inviteAddressRef}
              value={INVITE_URL}
            />
            <button
              className={styles.copyButton}
              type="button"
              disabled={inviteStatus === "copying"}
              onClick={() => void copyInviteLink()}
            >
              Copy
            </button>
          </div>
        ) : null}
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
