"use client";

import * as React from "react";
import { parseInBase, safe, toBase } from "@/lib/encoding";
import { CopyButton, ErrorNote, OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const BASES = [
  { base: 2, label: "二进制", short: "BIN" },
  { base: 8, label: "八进制", short: "OCT" },
  { base: 10, label: "十进制", short: "DEC" },
  { base: 16, label: "十六进制", short: "HEX" },
  { base: 36, label: "三十六进制", short: "B36" },
];

/** 根据前缀猜测进制：0x → 16，0b → 2，0o → 8 */
function detectBase(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (/^[-+]?0x[0-9a-f]/.test(v)) return 16;
  if (/^[-+]?0b[01]/.test(v)) return 2;
  if (/^[-+]?0o[0-7]/.test(v)) return 8;
  return null;
}

export function RadixTool() {
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
    return BASES.map((b) => ({
      ...b,
      value: toBase(value, b.base, b.base === 16),
    }));
  }, [value]);

  const bits = value !== null ? toBase(value < 0n ? -value : value, 2).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">输入进制</span>
        <Segmented
          ariaLabel="输入进制"
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
        <span className="text-xs text-foreground-subtle">
          支持 0x / 0b / 0o 前缀自动识别，使用 BigInt 不会溢出
        </span>
      </OptionBar>

      <Input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="输入数值，例如 255 或 0xFF 或 0b11111111"
        spellCheck={false}
        className="font-mono text-base"
        aria-label="待转换的数值"
      />

      {error && input.trim() !== "" && <ErrorNote>{error}</ErrorNote>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {rows.map((r, i) => (
          <div
            key={r.base}
            className={cn(
              "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover-bg",
              i > 0 && "border-t border-border"
            )}
          >
            <div className="flex w-24 shrink-0 flex-col">
              <span className="text-xs font-medium text-foreground">{r.label}</span>
              <span className="font-mono text-[10px] tracking-wide text-foreground-faint">
                {r.short}
              </span>
            </div>
            <code className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
              {r.value || <span className="text-foreground-faint">—</span>}
            </code>
            <CopyButton value={r.value} size="icon-xs" className="opacity-60 group-hover:opacity-100" />
          </div>
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">
            输入一个数值后，这里会同时给出五种进制的表示
          </p>
        )}
      </div>

      {value !== null && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 font-mono text-[11px] text-foreground-faint">
          <span>二进制位数 {bits} bit</span>
          <span>字节数 {Math.ceil(bits / 8)} byte</span>
          <span>是否为 0：{value === 0n ? "是" : "否"}</span>
          <span>符号：{value < 0n ? "负数" : "非负"}</span>
        </div>
      )}
    </div>
  );
}
