"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { ColorField } from "@/components/tools/color-field";
import { CopyButton, OptionBar, OptionField } from "@/components/tools/tool-ui";
import {
  parseColor,
  readableTextColor,
  rgbToHex,
  simulateBlindness,
  type BLINDNESS_MATRICES,
} from "@/lib/color";

const COPY = {
  zh: {
    color: "颜色",
    original: "原色",
    kinds: {
      protanopia: "红色盲",
      deuteranopia: "绿色盲",
      tritanopia: "蓝色盲",
      achromatopsia: "全色盲",
    },
    note: "用经典色觉缺陷矩阵做近似模拟，用来检查配色是否只靠颜色区分信息；真实视觉差异因人而异。",
    sample: "示例文字",
  },
  en: {
    color: "Colour",
    original: "Original",
    kinds: {
      protanopia: "Protanopia",
      deuteranopia: "Deuteranopia",
      tritanopia: "Tritanopia",
      achromatopsia: "Achromatopsia",
    },
    note: "Approximate simulation using the classic colour-vision-deficiency matrices — good for checking whether colour alone carries meaning. Real perception varies per person.",
    sample: "Sample text",
  },
};

type Kind = keyof typeof BLINDNESS_MATRICES;

const KINDS: Kind[] = ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"];

export function ColorBlindnessTool() {
  const t = useCopy(COPY);
  const [hex, setHex] = React.useState("#e11d48");

  const rgb = parseColor(hex) ?? { r: 225, g: 29, b: 72 };
  const items = [
    { key: "original" as const, label: t.original, color: rgb, value: rgbToHex(rgb) },
    ...KINDS.map((kind) => {
      const simulated = simulateBlindness(rgb, kind);
      return { key: kind, label: t.kinds[kind], color: simulated, value: rgbToHex(simulated) };
    }),
  ];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.color}>
          <ColorField label={t.color} value={hex} onChange={setHex} />
        </OptionField>
      </OptionBar>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.key} className="overflow-hidden rounded-lg border border-border">
            <div
              className="flex h-24 items-end justify-between p-2"
              style={{ background: item.value, color: readableTextColor(item.color) }}
            >
              <span className="font-mono text-xs font-semibold">{item.value.toUpperCase()}</span>
              <CopyButton
                value={item.value.toUpperCase()}
                size="icon-xs"
                className="text-inherit hover:bg-black/10"
              />
            </div>
            <p className="bg-surface px-2 py-1.5 text-[11px] text-foreground-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={`${item.key}-text`}
            className="rounded-lg border border-border px-3 py-2 text-xs"
            style={{ background: item.value, color: readableTextColor(item.color) }}
          >
            {t.sample} · {item.label}
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
