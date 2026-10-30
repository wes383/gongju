"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { formatUuid, uuidV4, uuidV7, type UuidOptions } from "@/lib/random";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { CopyButton, OptionBar, Segmented, Toggle } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    version: "版本",
    count: "数量",
    uppercase: "大写",
    hyphens: "连字符",
    braces: "花括号",
    generate: "重新生成",
    copyAll: "复制全部",
    note: "v4 完全随机；v7 前 48 位是毫秒时间戳，按时间排序更友好（RFC 9562）。",
  },
  en: {
    version: "Version",
    count: "Count",
    uppercase: "Uppercase",
    hyphens: "Hyphens",
    braces: "Braces",
    generate: "Regenerate",
    copyAll: "Copy all",
    note: "v4 is fully random; v7 starts with a 48-bit millisecond timestamp so it sorts by time (RFC 9562).",
  },
};

type Version = "v4" | "v7";

export function UuidTool() {
  const t = useCopy(COPY);
  const [version, setVersion] = React.useState<Version>("v4");
  const [count, setCount] = React.useState(5);
  const [options, setOptions] = React.useState<UuidOptions>({
    uppercase: false,
    hyphens: true,
    braces: false,
  });
  const [nonce, setNonce] = React.useState(0);
  const [uuids, setUuids] = React.useState<string[]>([]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const total = Math.min(Math.max(count, 1), 100);
      setUuids(
        Array.from({ length: total }, () =>
          formatUuid(version === "v4" ? uuidV4() : uuidV7(), options)
        )
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [version, count, options, nonce]);

  const setOption = (key: keyof UuidOptions) => (value: boolean) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const all = uuids.join("\n");

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.version}
          value={version}
          onChange={setVersion}
          options={[
            { value: "v4", label: "v4" },
            { value: "v7", label: "v7" },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.count}</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 100))}
            aria-label={t.count}
            size="xs"
            className="w-16 text-center font-mono"
          />
        </div>
        <Toggle checked={options.uppercase} onChange={setOption("uppercase")} label={t.uppercase} />
        <Toggle checked={options.hyphens} onChange={setOption("hyphens")} label={t.hyphens} />
        <Toggle checked={options.braces} onChange={setOption("braces")} label={t.braces} />
        <Button
          type="button"
          variant="default"
          size="xs"
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.generate}
        </Button>
        <CopyButton value={all} label={t.copyAll} />
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {uuids.map((uuid, i) => (
          <div
            key={`${uuid}-${i}`}
            className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
          >
            <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-faint">{i + 1}</span>
            <code className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-foreground">
              {uuid}
            </code>
            <CopyButton value={uuid} size="icon-xs" />
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
