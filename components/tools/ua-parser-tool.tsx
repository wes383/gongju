"use client";

import * as React from "react";
import { UAParser } from "ua-parser-js";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { CopyButton, InputArea, OptionBar } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    input: "User-Agent",
    current: "使用当前浏览器",
    result: "解析结果",
    browser: "浏览器",
    version: "版本",
    engine: "内核",
    os: "操作系统",
    device: "设备",
    cpu: "CPU",
    desktop: "桌面设备",
    unknown: "未识别",
    note: "解析基于 ua-parser-js 的规则库；UA 字符串是客户端自称的，可以被随意伪造，不能当作可信信息。",
  },
  en: {
    input: "User-Agent",
    current: "Use this browser",
    result: "Parsed",
    browser: "Browser",
    version: "Version",
    engine: "Engine",
    os: "OS",
    device: "Device",
    cpu: "CPU",
    desktop: "Desktop",
    unknown: "Unknown",
    note: "Parsing uses the ua-parser-js rule set. A UA string is self-declared by the client and can be spoofed, so never treat it as trustworthy.",
  },
};

const SAMPLE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";

export function UaParserTool() {
  const t = useCopy(COPY);
  const [ua, setUa] = React.useState(SAMPLE);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setUa(navigator.userAgent), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const parsed = React.useMemo(() => {
    if (!ua.trim()) return null;
    return new UAParser(ua).getResult();
  }, [ua]);

  const rows = parsed
    ? [
        {
          key: t.browser,
          value: [parsed.browser.name, parsed.browser.version].filter(Boolean).join(" ") || t.unknown,
        },
        {
          key: t.engine,
          value: [parsed.engine.name, parsed.engine.version].filter(Boolean).join(" ") || t.unknown,
        },
        {
          key: t.os,
          value: [parsed.os.name, parsed.os.version].filter(Boolean).join(" ") || t.unknown,
        },
        {
          key: t.device,
          value:
            [parsed.device.vendor, parsed.device.model, parsed.device.type]
              .filter(Boolean)
              .join(" ") || t.desktop,
        },
        { key: t.cpu, value: parsed.cpu.architecture ?? t.unknown },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.input}</span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setUa(navigator.userAgent)}
          className="ml-auto"
        >
          {t.current}
        </Button>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <InputArea
          value={ua}
          onChange={(e) => setUa(e.target.value)}
          placeholder="Mozilla/5.0 …"
          className="min-h-[90px]"
          spellCheck={false}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
          <CopyButton value={ua} size="xs" className="ml-auto" />
        </header>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-foreground-subtle">{t.unknown}</p>
        ) : (
          <dl>
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <dt className="w-24 shrink-0 text-xs text-foreground-muted">{row.key}</dt>
                <dd className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
