"use client";

import * as React from "react";
import { Columns2, MoveHorizontal } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { OptionBar, Segmented } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    left: "原图",
    right: "对比图",
    mode: "模式",
    slider: "滑动对比",
    overlay: "叠加",
    side: "并排",
    overlayOpacity: "透明度",
    overlayHint: "调整上层图片的不透明度：0% 只看原图，100% 只看对比图",
    drag: "拖动分割线对比",
    note: "两张图按同一个框等比裁切，尺寸不一致时以左图的比例为准。",
    a: "左图",
    b: "右图",
  },
  en: {
    left: "Original",
    right: "Comparison",
    mode: "Mode",
    slider: "Slider",
    overlay: "Overlay",
    side: "Side by side",
    overlayOpacity: "Opacity",
    overlayHint: "Blend the two images: 0% shows only the original, 100% only the comparison",
    drag: "Drag the divider",
    note: "Both images fill the same box; if their sizes differ, the left image's aspect ratio wins.",
    a: "Left",
    b: "Right",
  },
};

export function ImageCompareTool() {
  const t = useCopy(COPY);
  const left = useImageFiles();
  const right = useImageFiles();
  const [mode, setMode] = React.useState<"slider" | "overlay" | "side">("slider");
  const [opacity, setOpacity] = React.useState(50);
  const [position, setPosition] = React.useState(50);
  const [dragging, setDragging] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const a = left.images[0];
  const b = right.images[0];

  const updateFromEvent = (clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  React.useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => updateFromEvent(event.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging]);

  const aspect = a ? `${a.width} / ${a.height}` : "4 / 3";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.a}</span>
          <ImageDrop
            images={left.images}
            onAdd={left.add}
            onRemove={left.remove}
            onClear={left.clear}
            error={left.error}
            loading={left.loading}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.b}</span>
          <ImageDrop
            images={right.images}
            onAdd={right.add}
            onRemove={right.remove}
            onClear={right.clear}
            error={right.error}
            loading={right.loading}
          />
        </div>
      </div>

      {a && b && (
        <>
          <OptionBar>
            <Segmented
              ariaLabel={t.mode}
              value={mode}
              onChange={setMode}
              options={[
                { value: "slider", label: t.slider },
                { value: "overlay", label: t.overlay },
                { value: "side", label: t.side },
              ]}
            />
            {mode === "slider" && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-foreground-subtle">
                <MoveHorizontal className="h-3.5 w-3.5" />
                {t.drag}
              </span>
            )}
            {mode === "overlay" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground-muted">
                    {t.overlayOpacity}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    aria-label={t.overlayOpacity}
                    className="w-40 accent-[var(--accent)]"
                  />
                  <span className="w-8 font-mono text-[11px] text-foreground-subtle">
                    {opacity}%
                  </span>
                </div>
                <span className="ml-auto text-[11px] text-foreground-subtle">{t.overlayHint}</span>
              </>
            )}
          </OptionBar>

          {mode === "slider" ? (
            <div
              ref={boxRef}
              onPointerDown={(e) => {
                setDragging(true);
                updateFromEvent(e.clientX);
              }}
              className="relative select-none overflow-hidden rounded-lg border border-border bg-surface"
              style={{ aspectRatio: aspect }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={t.left}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.url}
                alt={t.right}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ clipPath: `inset(0 0 0 ${position}%)` }}
                draggable={false}
              />

              <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {t.left}
              </span>
              <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {t.right}
              </span>

              <div
                className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                style={{ left: `${position}%` }}
              />
              <div
                className="pointer-events-none absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/90 text-black shadow"
                style={{ left: `${position}%` }}
              >
                <Columns2 className="h-4 w-4" />
              </div>
            </div>
          ) : mode === "overlay" ? (
            <div
              className="relative select-none overflow-hidden rounded-lg border border-border bg-surface"
              style={{ aspectRatio: aspect }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={t.left}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.url}
                alt={t.right}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: opacity / 100 }}
                draggable={false}
              />
              <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {t.right} {opacity}%
              </span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {[a, b].map((item, i) => (
                <div key={item.id} className="overflow-hidden rounded-lg border border-border bg-surface">
                  <header className="flex h-8 items-center border-b border-border px-3 text-[11px] text-foreground-subtle">
                    {i === 0 ? t.left : t.right}
                    <span className="ml-auto font-mono">
                      {item.width}×{item.height}
                    </span>
                  </header>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={i === 0 ? t.left : t.right} className="w-full object-contain" />
                </div>
              ))}
            </div>
          )}

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}
