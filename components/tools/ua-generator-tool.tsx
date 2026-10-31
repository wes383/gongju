"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton, OptionBar, OptionField } from "@/components/tools/tool-ui";
import { UA_BROWSERS, UA_OSES, UA_SAMPLES } from "@/lib/ua";

const COPY = {
  zh: {
    browser: "浏览器",
    os: "系统",
    count: "数量",
    any: "不限",
    generate: "生成",
    copyAll: "全部复制",
    empty: "没有匹配的样本",
    note: "样本取自真实浏览器的 UA 字符串；UA 只是客户端自报，用来做兼容性测试或统计清洗都可以，但不要用它做权限判断。",
  },
  en: {
    browser: "Browser",
    os: "OS",
    count: "Count",
    any: "Any",
    generate: "Generate",
    copyAll: "Copy all",
    empty: "No matching samples",
    note: "Samples are real browser UA strings. Handy for compatibility tests or log cleanup, but never use a UA for authorisation.",
  },
};

/** crypto-backed index so the picks are properly random. */
function pickIndex(length: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % length;
}

export function UaGeneratorTool() {
  const t = useCopy(COPY);
  const [browser, setBrowser] = React.useState("any");
  const [os, setOs] = React.useState("any");
  const [count, setCount] = React.useState(5);
  const [list, setList] = React.useState<string[]>([]);
  const [nonce, setNonce] = React.useState(0);

  const pool = React.useMemo(
    () =>
      UA_SAMPLES.filter(
        (item) =>
          (browser === "any" || item.browser === browser) && (os === "any" || item.os === os)
      ),
    [browser, os]
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (pool.length === 0) {
        setList([]);
        return;
      }
      setList(Array.from({ length: count }, () => pool[pickIndex(pool.length)].ua));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pool, count, nonce]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.browser}>
          <Select value={browser} onValueChange={setBrowser}>
            <SelectTrigger size="xs" aria-label={t.browser} className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t.any}</SelectItem>
              {UA_BROWSERS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>

        <OptionField label={t.os}>
          <Select value={os} onValueChange={setOs}>
            <SelectTrigger size="xs" aria-label={t.os} className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t.any}</SelectItem>
              {UA_OSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>

        <OptionField label={t.count}>
          <Input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 20))}
            aria-label={t.count}
            size="xs"
            className="w-16 text-center font-mono"
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

        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={list.length === 0}
          onClick={() => navigator.clipboard.writeText(list.join("\n"))}
        >
          {t.copyAll}
        </Button>
      </OptionBar>

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {list.map((ua, index) => (
            <li
              key={`${ua}-${index}`}
              className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
            >
              <span className="w-5 shrink-0 font-mono text-[11px] text-foreground-subtle">
                {index + 1}
              </span>
              <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed text-foreground">
                {ua}
              </code>
              <CopyButton value={ua} size="icon-xs" />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
