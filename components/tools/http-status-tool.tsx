"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/tool-ui";
import { HTTP_STATUS, STATUS_CLASSES } from "@/lib/http-status";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    search: "搜索状态码或说明",
    empty: "没有匹配的状态码",
    note: "状态码分五类：1xx 信息、2xx 成功、3xx 重定向、4xx 客户端错误、5xx 服务端错误。标「非标准」的是厂商或服务器私有码（Cloudflare、nginx、cPanel 等），不在 IANA 注册表里。",
    total: (n: number) => `共 ${n} 个状态码`,
    nonStandard: "非标准",
  },
  en: {
    search: "Search by code or description",
    empty: "No matching status code",
    note: "Status codes fall into five classes: 1xx informational, 2xx success, 3xx redirect, 4xx client error, 5xx server error. Codes marked non-standard are vendor or server private (Cloudflare, nginx, cPanel) and are not in the IANA registry.",
    total: (n: number) => `${n} codes`,
    nonStandard: "Non-standard",
  },
};

export function HttpStatusTool() {
  const t = useCopy(COPY);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return HTTP_STATUS;
    return HTTP_STATUS.filter(
      (item) =>
        String(item.code).includes(text) ||
        item.name.toLowerCase().includes(text) ||
        item.zh.includes(text) ||
        item.en.toLowerCase().includes(text)
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          size="sm"
          className="w-full max-w-sm"
        />
        <span className="ml-auto text-[11px] text-foreground-subtle">
          {t.total(filtered.length)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {STATUS_CLASSES.map((group) => {
            const items = filtered.filter((item) => Math.floor(item.code / 100) === Number(group.id[0]));
            if (items.length === 0) return null;
            return (
              <section key={group.id} className="overflow-hidden rounded-lg border border-border bg-surface">
                <header className="flex h-10 items-center gap-2 border-b border-border px-4">
                  <span className="text-xs font-semibold text-foreground">{group.label}</span>
                  <span className="font-mono text-[11px] text-foreground-subtle">{group.range}</span>
                  <span className="ml-auto text-[11px] text-foreground-subtle">{items.length}</span>
                </header>
                <ul>
                  {items.map((item) => {
                    const tone =
                      item.code < 200
                        ? "text-foreground-subtle"
                        : item.code < 300
                          ? "text-green-fg"
                          : item.code < 400
                            ? "text-orange-fg"
                            : "text-red-fg";
                    return (
                      <li
                        key={item.code}
                        className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                      >
                        <span className={cn("w-10 shrink-0 font-mono text-sm font-semibold", tone)}>
                          {item.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-foreground">{item.name}</span>
                            {item.nonStandard && (
                              <span className="rounded-full bg-hover-bg-strong px-1.5 py-0.5 text-[10px] text-foreground-subtle">
                                {t.nonStandard}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
                            {item.zh}
                          </p>
                          <p className="text-[11px] leading-relaxed text-foreground-subtle">
                            {item.en}
                          </p>
                        </div>
                        <CopyButton value={`${item.code} ${item.name}`} size="icon-xs" />
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
