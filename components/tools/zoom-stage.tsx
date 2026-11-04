"use client";

import * as React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Preview frame that can grow into a full-viewport stage.
 *
 * State lives in the tool, not here: the toggle normally sits in the option
 * bar next to the other controls, so this component only owns the layout and
 * the lightbox behaviour (Esc to leave, page scroll locked while open).
 */
export interface ZoomStageProps {
  expanded: boolean;
  onCollapse: () => void;
  collapseLabel: string;
  /** Controls shown at the top of the expanded stage, e.g. page navigation */
  overlayToolbar?: React.ReactNode;
  className?: string;
  /** Height budget differs between the inline and the expanded state */
  children: (expanded: boolean) => React.ReactNode;
}

export function ZoomStage({
  expanded,
  onCollapse,
  collapseLabel,
  overlayToolbar,
  className,
  children,
}: ZoomStageProps) {
  React.useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCollapse();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded, onCollapse]);

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-surface",
        expanded
          ? "fixed inset-0 z-50 flex flex-col gap-3 border-0 bg-background p-3 sm:p-4"
          : cn("p-3", className)
      )}
    >
      {expanded && (
        <div className="flex flex-wrap items-center gap-2">
          {overlayToolbar}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="ml-auto gap-1.5"
            onClick={onCollapse}
          >
            <Minimize2 className="h-3.5 w-3.5" />
            {collapseLabel}
          </Button>
        </div>
      )}

      <div
        className={cn(
          "flex min-h-0 flex-col items-center justify-center",
          expanded && "flex-1 overflow-auto"
        )}
      >
        {children(expanded)}
      </div>
    </section>
  );
}

/** The toolbar button that opens the expanded stage. */
export function ZoomToggle({
  expanded,
  onToggle,
  expandLabel,
  collapseLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  expandLabel: string;
  collapseLabel: string;
}) {
  return (
    <Button type="button" variant="ghost" size="xs" className="gap-1.5" onClick={onToggle}>
      {expanded ? (
        <Minimize2 className="h-3.5 w-3.5" />
      ) : (
        <Maximize2 className="h-3.5 w-3.5" />
      )}
      {expanded ? collapseLabel : expandLabel}
    </Button>
  );
}
