"use client";

import * as React from "react";

// Module scope survives client-side route changes but is reset on a full page
// load. That is exactly the behaviour we want: a fresh visit starts at the top,
// while coming back from a detail page returns to where the list was left.
let savedY = 0;

const useIsoLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

// After a navigation the router resets the offset to 0 in a layout effect that
// runs after ours, so one write is never enough: keep correcting for a few
// frames (~200ms) and hand control back the moment the user touches anything.
const SETTLE_FRAMES = 16;

/**
 * Remembers the window scroll offset of a list page and restores it when the
 * page mounts again within the same session (back button or an in-app link).
 */
export function useScrollRestoration() {
  useIsoLayoutEffect(() => {
    // Captured before the router's reset fires its own scroll event: that event
    // would otherwise overwrite the very value we are trying to restore.
    const target = savedY;
    let settling = target > 0;
    let frames = 0;
    let raf = 0;

    const stopSettling = () => {
      if (!settling) return;
      settling = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      savedY = window.scrollY;
      window.removeEventListener("wheel", stopSettling);
      window.removeEventListener("touchstart", stopSettling);
      window.removeEventListener("pointerdown", stopSettling);
      window.removeEventListener("keydown", stopSettling);
    };

    const tick = () => {
      raf = 0;
      if (Math.abs(window.scrollY - target) > 1) window.scrollTo(0, target);
      frames += 1;
      if (frames >= SETTLE_FRAMES) stopSettling();
      else raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (settling) return;
      savedY = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    if (settling) {
      window.scrollTo(0, target);
      // A real interaction always wins over the restore
      window.addEventListener("wheel", stopSettling, { passive: true });
      window.addEventListener("touchstart", stopSettling, { passive: true });
      window.addEventListener("pointerdown", stopSettling);
      window.addEventListener("keydown", stopSettling);
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", stopSettling);
      window.removeEventListener("touchstart", stopSettling);
      window.removeEventListener("pointerdown", stopSettling);
      window.removeEventListener("keydown", stopSettling);
      if (raf) cancelAnimationFrame(raf);
      // Unmounting happens before the incoming route resets the offset, so this
      // still holds the position the user left at.
      if (!settling) savedY = window.scrollY;
    };
  }, []);
}
