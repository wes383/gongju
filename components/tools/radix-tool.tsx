"use client";

import * as React from "react";
import { parseInBase, safe, toBase } from "@/lib/encoding";
import { useCopy, useLocale } from "@/components/locale-provider";
import { translateError } from "@/lib/i18n";
import { CopyButton, ErrorNote, OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    inputBase: "输入进制",
    baseHint: "支持 0x / 0b / 0o 前缀自动识别，使用 BigInt 不会溢出",
    placeholder: "输入数值，例如 255 或 0xFF 或 0b11111111",
    empty: "输入一个数值后，这里会同时给出五种进制的表示",
    bits: "二进制位数",
    bytes: "字节数",
    isZero: "是否为 0：",
    yes: "是",
    no: "否",
    sign: "符号：",
    negative: "负数",
    nonNegative: "非负",
    bin: "二进制",
    oct: "八进制",
    dec: "十进制",
    hex: "十六进制",
    b36: "三十六进制",
  },
  en: {
    inputBase: "Input base",
    baseHint: "0x / 0b / 0o prefixes are detected automatically; BigInt means no overflow",
    placeholder: "Enter a number, e.g. 255, 0xFF or 0b11111111",
    empty: "Enter a number to see it in all five bases",
    bits: "Bits",
    bytes: "Bytes",
    isZero: "Is zero: ",
    yes: "yes",
    no: "no",
    sign: "Sign: ",
    negative: "negative",
    nonNegative: "non-negative",
    bin: "Binary",
    oct: "Octal",
    dec: "Decimal",
    hex: "Hexadecimal",
    b36: "Base 36",
  },
};

/** Infer the base from a 0x / 0b / 0o prefix */
function detectBase(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (/^[-+]?0x[0-9a-f]/.test(v)) return 16;
  if (/^[-+]?0b[01]/.test(v)) return 2;
  if (/^[-+]?0o[0-7]/.test(v)) return 8;
  return null;
}

export function RadixTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState("");
  const [base, setBase] = React.useState(10);

  const onInputChange = (v: string) => {
    setInput(v);
    const detected = detectBase(v);
    if (detected) setBase(detected);
  };

  const { value, error } = React.useMemo(() => safe(() => parseInBase(input, base)), [input, base]);

  const rows = React.useMemo(() => {
    if (value === null) return [];
    const labels = [
      { base: 2, label: t.bin, short: "BIN" },
      { base: 8, label: t.oct, short: "OCT" },
      { base: 10, label: t.dec, short: "DEC" },
      { base: 16, label: t.hex, short: "HEX" },
      { base: 36, label: t.b36, short: "B36" },
    ];
    return labels.map((b) => ({
      ...b,
      value: toBase(value, b.base, b.base === 16),
    }));
  }, [value, t]);

  const bits = value !== null ? toBase(value < 0n ? -value : value, 2).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.inputBase}</span>
        <Segmented
          ariaLabel={t.inputBase}
          value={String(base)}
          onChange={(v) => setBase(Number(v))}
          options={[
            { value: "2", label: "2" },
            { value: "8", label: "8" },
            { value: "10", label: "10" },
            { value: "16", label: "16" },
            { value: "36", label: "36" },
          ]}
        />
        <span className="text-xs text-foreground-subtle">{t.baseHint}</span>
      </OptionBar>

      <Input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={t.placeholder}
        spellCheck={false}
        className="font-mono text-base"
        aria-label={t.inputBase}
      />

      {error && input.trim() !== "" && <ErrorNote>{translateError(error, locale)}</ErrorNote>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {rows.map((r, i) => (
          <div
            key={r.base}
            className={cn(
              "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover-bg",
              i > 0 && "border-t border-border"
            )}
          >
            <div className="flex w-28 shrink-0 flex-col">
              <span className="text-xs font-medium text-foreground">{r.label}</span>
              <span className="font-mono text-[10px] tracking-wide text-foreground-faint">
                {r.short}
              </span>
            </div>
            <code className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
              {r.value || <span className="text-foreground-faint">—</span>}
            </code>
            <CopyButton
              value={r.value}
              size="icon-xs"
              className="opacity-60 group-hover:opacity-100"
            />
          </div>
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        )}
      </div>

      {value !== null && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 font-mono text-[11px] text-foreground-faint">
          <span>
            {t.bits} {bits} bit
          </span>
          <span>
            {t.bytes} {Math.ceil(bits / 8)} byte
          </span>
          <span>
            {t.isZero}
            {value === 0n ? t.yes : t.no}
          </span>
          <span>
            {t.sign}
            {value < 0n ? t.negative : t.nonNegative}
          </span>
        </div>
      )}
    </div>
  );
}
