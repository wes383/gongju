"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Minimum thumb height so it stays grabbable on very long content. */
const MIN_THUMB_PX = 18;

/** Line-mode wheel deltas (deltaMode === 1) are in text lines; ~16px per line. */
const LINE_PX = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * ScrollArea — custom-styled scrollbar layered over a native scroll container.
 *
 * Design rules that keep it bug-free:
 * - Wheel / keyboard / touch scrolling is handled by the browser (native
 *   overflow container), so those input paths can never misbehave.
 * - The thumb reads live DOM geometry (scrollTop / scrollHeight /
 *   clientHeight) at event time — no cached measurements in React state.
 * - Every computed position is hard-clamped, so the thumb cannot jump.
 */
export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    const viewportRef = React.useRef<HTMLDivElement | null>(null);
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const thumbRef = React.useRef<HTMLDivElement | null>(null);
    const [scrollable, setScrollable] = React.useState(false);
    const [dragging, setDragging] = React.useState(false);

    /* Sync thumb size and offset from current viewport geometry. */
    const updateThumb = React.useCallback(() => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const thumb = thumbRef.current;
      if (!viewport || !track || !thumb) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const trackSize = track.clientHeight;
      const maxScroll = scrollHeight - clientHeight;
      const nextScrollable = maxScroll > 1;

      const ratio = nextScrollable ? clientHeight / scrollHeight : 1;
      const thumbSize = Math.max(Math.round(trackSize * ratio), MIN_THUMB_PX);
      const maxThumbTop = Math.max(trackSize - thumbSize, 0);
      const thumbTop =
        nextScrollable && maxThumbTop > 0
          ? (scrollTop / maxScroll) * maxThumbTop
          : 0;

      thumb.style.height = `${thumbSize}px`;
      thumb.style.transform = `translateY(${thumbTop}px)`;
      setScrollable((prev) => (prev === nextScrollable ? prev : nextScrollable));
    }, []);

    /* Initial measurement, then keep the thumb in sync with size and scroll. */
    React.useEffect(() => {
      const viewport = viewportRef.current;
      const content = viewport?.firstElementChild;
      if (!viewport) return;

      updateThumb();

      const observer = new ResizeObserver(updateThumb);
      observer.observe(viewport);
      if (content instanceof Element) observer.observe(content);

      viewport.addEventListener("scroll", updateThumb);
      return () => {
        observer.disconnect();
        viewport.removeEventListener("scroll", updateThumb);
      };
    }, [updateThumb]);

    /* Forward wheel events over the track to the viewport. Non-passive so the
       page does not scroll-chain while the cursor is on the scrollbar. */
    React.useEffect(() => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const handleWheel = (event: WheelEvent) => {
        const dy =
          event.deltaMode === WheelEvent.DOM_DELTA_LINE
            ? event.deltaY * LINE_PX
            : event.deltaY;
        viewport.scrollTop += dy;
        event.preventDefault();
      };
      track.addEventListener("wheel", handleWheel, { passive: false });
      return () => track.removeEventListener("wheel", handleWheel);
    }, []);

    /* Thumb drag / track click. Grabs keep the thumb under the cursor; track
       clicks center the thumb at the click point. All values are clamped. */
    const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const thumb = thumbRef.current;
      if (!viewport || !track || !thumb) return;

      const trackSize = track.clientHeight;
      const thumbSize = thumb.getBoundingClientRect().height || MIN_THUMB_PX;
      const maxThumbTop = trackSize - thumbSize;
      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      if (maxThumbTop <= 0 || maxScroll <= 0) return;

      event.preventDefault();

      const grabOffset =
        event.target === thumb
          ? event.clientY - thumb.getBoundingClientRect().top
          : thumbSize / 2;

      const move = (ev: PointerEvent) => {
        const trackTop = track.getBoundingClientRect().top;
        const thumbTop = clamp(ev.clientY - trackTop - grabOffset, 0, maxThumbTop);
        viewport.scrollTop = (thumbTop / maxThumbTop) * maxScroll;
      };

      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      setDragging(true);

      const stop = () => {
        setDragging(false);
        document.body.style.userSelect = prevUserSelect;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);

      /* Jump to the pressed position immediately (track click). */
      move(event.nativeEvent);
    };

    return (
      <div
        ref={ref}
        className={cn("group relative overflow-hidden", className)}
        {...props}
      >
        <div
          ref={viewportRef}
          className="scrollbar-none h-full w-full overflow-y-auto rounded-[inherit] outline-none"
          style={{ scrollbarWidth: "none" }}
        >
          {children}
        </div>
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 right-0 w-2 touch-none select-none",
            "transition-opacity duration-base",
            scrollable
              ? "opacity-0 group-hover:opacity-100"
              : "pointer-events-none opacity-0",
            dragging && "opacity-100"
          )}
        >
          <div
            ref={thumbRef}
            className="absolute inset-x-px top-0 rounded-full bg-hover-bg-strong transition-colors hover:bg-foreground-faint"
            style={{ height: MIN_THUMB_PX }}
          />
        </div>
      </div>
    );
  }
);

ScrollArea.displayName = "ScrollArea";
