"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/tool-ui";
import { MIME_GROUPS, MIME_TYPES } from "@/lib/mime-types";

const COPY = {
  zh: {
    search: "搜索类型、扩展名或说明",
    empty: "没有匹配的类型",
    note: "同一个扩展名可能对应多个类型（比如 .xml 既是 text/xml 也是 application/xml），实际以服务端返回的 Content-Type 为准。",
    total: (n: number) => `共 ${n} 个类型`,
    ext: "扩展名",
  },
  en: {
    search: "Search type, extension or description",
    empty: "No matching type",
    note: "One extension can map to several types (.xml is both text/xml and application/xml); what the server actually sends is what counts.",
    total: (n: number) => `${n} types`,
    ext: "Extensions",
  },
};

const GROUP_LABELS: Record<string, string> = {
  text: "text/*",
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
  font: "font/*",
  application: "application/*",
  multipart: "multipart/*",
  message: "message/*",
};

export function MimeTypeTool() {
  const t = useCopy(COPY);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return MIME_TYPES;
    return MIME_TYPES.filter(
      (item) =>
        item.type.toLowerCase().includes(text) ||
        item.ext.toLowerCase().includes(text) ||
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
          {MIME_GROUPS.map((group) => {
            const items = filtered.filter((item) => item.type.startsWith(`${group}/`));
            if (items.length === 0) return null;
            return (
              <section key={group} className="overflow-hidden rounded-lg border border-border bg-surface">
                <header className="flex h-10 items-center gap-2 border-b border-border px-4">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {GROUP_LABELS[group] ?? group}
                  </span>
                  <span className="ml-auto text-[11px] text-foreground-subtle">{items.length}</span>
                </header>
                <ul>
                  {items.map((item) => (
                    <li
                      key={item.type}
                      className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-all font-mono text-xs text-foreground">{item.type}</p>
                        <p className="mt-0.5 text-xs text-foreground-muted">{item.zh}</p>
                        <p className="text-[11px] text-foreground-subtle">{item.en}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">
                        {item.ext}
                      </span>
                      <CopyButton value={item.type} size="icon-xs" />
                    </li>
                  ))}
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
