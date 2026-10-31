"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton, OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import { parseColor, randomHex, rgbToHsl } from "@/lib/color";
import { readableTextColor } from "@/lib/color";

const COPY = {
  zh: {
    count: "数量",
    format: "格式",
    generate: "重新生成",
    note: "用 crypto.getRandomValues 生成，颜色分布均匀；点色块或复制按钮复制当前格式。",
    empty: "还没有生成颜色",
  },
  en: {
    count: "Count",
    format: "Format",
    generate: "Regenerate",
    note: "Generated with crypto.getRandomValues, so the hue distribution is even. Click a swatch or its copy button to copy the current format.",
    empty: "No colours yet",
  },
};

type Format = "hex" | "rgb" | "hsl";

const round = (n: number) => Math.round(n);

export function RandomColorTool() {
  const t = useCopy(COPY);
  const [count, setCount] = React.useState(12);
  const [format, setFormat] = React.useState<Format>("hex");
  const [colors, setColors] = React.useState<string[]>([]);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setColors(Array.from({ length: count }, () => randomHex()));
    }, 0);
    return () => window.clearTimeout(id);
  }, [count, nonce]);

  const formatValue = (hex: string) => {
    const rgb = parseColor(hex);
    if (!rgb) return hex;
    if (format === "hex") return hex.toUpperCase();
    if (format === "rgb") return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    const hsl = rgbToHsl(rgb);
    return `hsl(${round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%)`;
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.count}>
          <Input
            type="number"
            min={1}
            max={48}
            value={count}
            onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 48))}
            aria-label={t.count}
            size="xs"
            className="w-16 text-center font-mono"
          />
        </OptionField>

        <OptionField label={t.format}>
          <Segmented
            ariaLabel={t.format}
            value={format}
            onChange={setFormat}
            options={[
              { value: "hex", label: "HEX" },
              { value: "rgb", label: "RGB" },
              { value: "hsl", label: "HSL" },
            ]}
          />
        </OptionField>

        <Button
          type="button"
          size="xs"
          className="ml-auto gap-1.5"
          onClick={() => setNonce((n) => n + 1)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.generate}
        </Button>
      </OptionBar>

      {colors.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {colors.map((hex, index) => {
            const value = formatValue(hex);
            return (
              <div
                key={`${hex}-${index}`}
                className="flex items-center gap-2 overflow-hidden rounded-lg border border-border"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-[10px] font-medium"
                  style={{ background: hex, color: readableTextColor(parseColor(hex)!) }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                  {value}
                </code>
                <CopyButton value={value} size="icon-xs" className="mr-1" />
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
