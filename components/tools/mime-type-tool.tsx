"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/tool-ui";
import { MIME_FULL } from "@/lib/mime-full";
import { MIME_TYPES } from "@/lib/mime-types";

const COPY = {
  zh: {
    search: "搜索类型、扩展名或说明",
    empty: "没有匹配的类型",
    note: "默认展示常用的 68 种（带中文说明）；输入关键词可搜索全部 2,522 条，其中标记「非标准」的是厂商或服务器私有类型。同一个扩展名可能对应多个类型，实际以服务端返回的 Content-Type 为准。",
    total: (n: number) => `共 ${n} 个类型`,
    more: (n: number) => `还有 ${n} 条未显示，继续输入可缩小范围`,
    all: "全部",
    curated: "常用",
    nonStandard: "非标准",
  },
  en: {
    search: "Search type, extension or description",
    empty: "No matching type",
    note: "The default view shows 68 common types with descriptions; typing searches all 2,522 entries. Those marked “non-standard” are vendor or server private types. One extension can map to several types — what the server sends is what counts.",
    total: (n: number) => `${n} types`,
    more: (n: number) => `${n} more not shown — keep typing to narrow it down`,
    all: "All",
    curated: "Common",
    nonStandard: "Non-standard",
  },
};

const GROUP_ORDER = [
  "text",
  "image",
  "audio",
  "video",
  "font",
  "application",
  "multipart",
  "message",
  "model",
  "chemical",
  "example",
];

const GROUP_LABELS: Record<string, string> = {
  text: "text/*",
  image: "image/*",
  audio: "audio/*",
  video: "video/*",
  font: "font/*",
  application: "application/*",
  multipart: "multipart/*",
  message: "message/*",
  model: "model/*",
  chemical: "chemical/*",
  example: "example/*",
};

const LIMIT = 120;

interface Entry {
  type: string;
  ext: string;
  iana: boolean;
  zh?: string;
  en?: string;
}

/** Curated descriptions keyed by MIME type. */
const CURATED = new Map(MIME_TYPES.map((item) => [item.type, item]));

/** Full list with curated descriptions merged in. */
const ALL_TYPES: Entry[] = (() => {
  const list: Entry[] = MIME_FULL.map(([type, ext, iana]) => {
    const curated = CURATED.get(type);
    return {
      type,
      ext: ext || "—",
      iana: iana === 1,
      zh: curated?.zh,
      en: curated?.en,
    };
  });
  const seen = new Set(MIME_FULL.map(([type]) => type));
  MIME_TYPES.forEach((item) => {
    if (!seen.has(item.type)) {
      list.push({ type: item.type, ext: item.ext, iana: true, zh: item.zh, en: item.en });
    }
  });
  return list.sort((a, b) => a.type.localeCompare(b.type));
})();

const CURATED_LIST: Entry[] = MIME_TYPES.map((item) => ({
  type: item.type,
  ext: item.ext,
  iana: true,
  zh: item.zh,
  en: item.en,
}));

function groupOf(type: string): string {
  return type.split("/")[0];
}

export function MimeTypeTool() {
  const t = useCopy(COPY);
  const [query, setQuery] = React.useState("");

  const searching = query.trim().length > 0;

  const filtered = React.useMemo(() => {
    if (!searching) return CURATED_LIST;
    const text = query.trim().toLowerCase();
    return ALL_TYPES.filter(
      (item) =>
        item.type.toLowerCase().includes(text) ||
        item.ext.toLowerCase().includes(text) ||
        (item.zh ?? "").includes(text) ||
        (item.en ?? "").toLowerCase().includes(text)
    );
  }, [query, searching]);

  const shown = filtered.slice(0, LIMIT);
  const hidden = filtered.length - shown.length;

  const groups = React.useMemo(() => {
    const map = new Map<string, Entry[]>();
    shown.forEach((item) => {
      const key = groupOf(item.type);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    });
    return [...map.entries()].sort(([a], [b]) => {
      const ia = GROUP_ORDER.indexOf(a);
      const ib = GROUP_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [shown]);

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
          {searching ? t.all : t.curated} · {t.total(filtered.length)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([group, items]) => (
            <section key={group} className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex h-10 items-center gap-2 border-b border-border px-4">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {GROUP_LABELS[group] ?? `${group}/*`}
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
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="break-all font-mono text-xs text-foreground">
                          {item.type}
                        </span>
                        {!item.iana && (
                          <span className="rounded-full bg-hover-bg-strong px-1.5 py-0.5 text-[10px] text-foreground-subtle">
                            {t.nonStandard}
                          </span>
                        )}
                      </p>
                      {item.zh && (
                        <p className="mt-0.5 text-xs text-foreground-muted">{item.zh}</p>
                      )}
                      {item.en && (
                        <p className="text-[11px] text-foreground-subtle">{item.en}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">
                      {item.ext}
                    </span>
                    <CopyButton value={item.type} size="icon-xs" />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {hidden > 0 && (
            <p className="text-center text-[11px] text-foreground-subtle">{t.more(hidden)}</p>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
