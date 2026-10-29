"use client";

import * as React from "react";

/**
 * Keep `document.title` in sync with the active locale.
 *
 * Next re-applies the server-rendered route metadata during hydration, which
 * silently overwrites a title set from an effect. Observing the head and
 * re-asserting the value survives that, and settles immediately because the
 * second pass finds the title already correct.
 */
export function useDocumentTitle(title: string) {
  React.useEffect(() => {
    const apply = () => {
      if (document.title !== title) document.title = title;
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [title]);
}
