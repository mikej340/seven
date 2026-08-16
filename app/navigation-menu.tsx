"use client";

import { useEffect, useRef, useState } from "react";
import { PUZZLE_BASE_PATH } from "@/lib/puzzles";
import styles from "./navigation-menu.module.css";

type NavigationMenuProps = {
  current?: "today" | "puzzles";
};

export default function NavigationMenu({ current }: NavigationMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
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

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.button}
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-controls="site-navigation-menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
      >
        <span className={styles.icon} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {open ? (
        <nav className={styles.menu} id="site-navigation-menu" aria-label="Site navigation">
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
        </nav>
      ) : null}
    </div>
  );
}
