"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropBounds {
  width: number;
  height: number;
}

/** Smallest allowed crop, in source pixels */
const MIN_SIZE = 8;

type HandleMode = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "se" | "sw";

const CORNERS: { mode: HandleMode; fx: number; fy: number; cursor: string }[] = [
  { mode: "nw", fx: 0, fy: 0, cursor: "cursor-nwse-resize" },
  { mode: "ne", fx: 1, fy: 0, cursor: "cursor-nesw-resize" },
  { mode: "se", fx: 1, fy: 1, cursor: "cursor-nwse-resize" },
  { mode: "sw", fx: 0, fy: 1, cursor: "cursor-nesw-resize" },
];

const EDGES: { mode: HandleMode; fx: number; fy: number; cursor: string }[] = [
  { mode: "n", fx: 0.5, fy: 0, cursor: "cursor-ns-resize" },
  { mode: "s", fx: 0.5, fy: 1, cursor: "cursor-ns-resize" },
  { mode: "w", fx: 0, fy: 0.5, cursor: "cursor-ew-resize" },
  { mode: "e", fx: 1, fy: 0.5, cursor: "cursor-ew-resize" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampRect(rect: CropRect, bounds: CropBounds): CropRect {
  const width = clamp(rect.width, MIN_SIZE, bounds.width);
  const height = clamp(rect.height, MIN_SIZE, bounds.height);
  return {
    width,
    height,
    x: clamp(rect.x, 0, bounds.width - width),
    y: clamp(rect.y, 0, bounds.height - height),
  };
}

/** Shrink the rect to the target ratio, keeping it centred where it is. */
export function fitRectToAspect(
  rect: CropRect,
  aspect: number,
  bounds: CropBounds
): CropRect {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  let width = rect.width;
  let height = width / aspect;
  if (height > rect.height) {
    height = rect.height;
    width = height * aspect;
  }
  // Never let the box spill outside the image
  const scale = Math.min(1, bounds.width / width, bounds.height / height);
  width *= scale;
  height *= scale;
  return clampRect({ x: centerX - width / 2, y: centerY - height / 2, width, height }, bounds);
}

function resizeRect(
  start: CropRect,
  mode: HandleMode,
  dx: number,
  dy: number,
  bounds: CropBounds,
  aspect: number | null
): CropRect {
  if (mode === "move") {
    return clampRect({ ...start, x: start.x + dx, y: start.y + dy }, bounds);
  }

  const west = mode.includes("w");
  const east = mode.includes("e");
  const north = mode.includes("n");
  const south = mode.includes("s");

  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;

  if (west) left = clamp(start.x + dx, 0, right - MIN_SIZE);
  if (east) right = clamp(start.x + start.width + dx, left + MIN_SIZE, bounds.width);
  if (north) top = clamp(start.y + dy, 0, bottom - MIN_SIZE);
  if (south) bottom = clamp(start.y + start.height + dy, top + MIN_SIZE, bounds.height);

  if (aspect) {
    // Keep the opposite corner pinned and scale down if the box would leave the image
    let width = Math.max(right - left, MIN_SIZE);
    let height = Math.max(bottom - top, MIN_SIZE);
    if (width / height > aspect) height = width / aspect;
    else width = height * aspect;

    const anchorX = west ? right : left;
    const anchorY = north ? bottom : top;
    const maxWidth = west ? anchorX : bounds.width - anchorX;
    const maxHeight = north ? anchorY : bounds.height - anchorY;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width *= scale;
    height *= scale;

    return {
      x: west ? anchorX - width : anchorX,
      y: north ? anchorY - height : anchorY,
      width,
      height,
    };
  }

  return clampRect({ x: left, y: top, width: right - left, height: bottom - top }, bounds);
}

export function ImageCropper({
  src,
  width,
  height,
  rect,
  onChange,
  aspect = null,
  maxHeight = 420,
}: {
  src: string;
  width: number;
  height: number;
  rect: CropRect;
  onChange: (rect: CropRect) => void;
  /** Locked ratio of the crop box, null for free-form */
  aspect?: number | null;
  maxHeight?: number | string;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{
    mode: HandleMode;
    start: CropRect;
    clientX: number;
    clientY: number;
    scale: number;
  } | null>(null);
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const state = drag.current;
      if (!state) return;
      const dx = (event.clientX - state.clientX) * state.scale;
      const dy = (event.clientY - state.clientY) * state.scale;
      onChange(resizeRect(state.start, state.mode, dx, dy, { width, height }, aspect));
    };
    const stop = () => {
      drag.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging, aspect, width, height, onChange]);

  const begin = (event: React.PointerEvent, mode: HandleMode) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = {
      mode,
      start: rect,
      clientX: event.clientX,
      clientY: event.clientY,
      // The image keeps its ratio, so one scale factor covers both axes
      scale: width / box.width,
    };
    setDragging(true);
  };

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <div ref={boxRef} className="relative inline-block touch-none select-none">
      {/* The mask has to be clipped, but the handles must not be — keep them
          outside this wrapper so their outer half stays clickable. */}
      <div className="relative overflow-hidden rounded">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="block max-w-full"
          style={{ maxHeight }}
          draggable={false}
        />

        <div
          data-crop-box
          role="presentation"
          onPointerDown={(event) => begin(event, "move")}
          className={cn(
            "absolute border border-white/90 outline outline-1 outline-black/30",
            dragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{
            left: pct(rect.x, width),
            top: pct(rect.y, height),
            width: pct(rect.width, width),
            height: pct(rect.height, height),
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
          }}
        >
          <span className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/40" />
          <span className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/40" />
          <span className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/40" />
          <span className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/40" />
          <span
            data-crop-size
            className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-white"
          >
            {Math.round(rect.width)} × {Math.round(rect.height)}
          </span>
        </div>
      </div>

      {[...CORNERS, ...(aspect ? [] : EDGES)].map((handle) => (
        <span
          key={handle.mode}
          data-crop-handle={handle.mode}
          role="presentation"
          onPointerDown={(event) => begin(event, handle.mode)}
          className={cn(
            "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-black/40 bg-white shadow-sm",
            handle.cursor
          )}
          style={{
            left: pct(rect.x + rect.width * handle.fx, width),
            top: pct(rect.y + rect.height * handle.fy, height),
          }}
        />
      ))}
    </div>
  );
}
