"use client";

import * as React from "react";
import { ClipboardPaste, Search, Trash2 } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton, WarningNote } from "@/components/tools/tool-ui";

const STORAGE_KEY = "gongju.clipboard.v1";
const LIMIT = 50;

const COPY = {
  zh: {
    search: "搜索",
    searchPlaceholder: "搜索记录内容",
    read: "读取剪贴板",
    clear: "清空记录",
    empty: "还没有记录",
    emptyHint: "在本页复制或粘贴文本后会自动记在这里",
    readDenied: "浏览器拒绝了剪贴板读取，请手动粘贴一次（Ctrl / Cmd + V）",
    emptyClipboard: "剪贴板里没有文本",
    confirmClear: "清空全部记录？",
    deleteEntry: "删除这条记录",
    clearSearch: "清除搜索",
    note: "浏览器不允许读取系统的剪贴板历史，所以这里只记录你在本页复制或粘贴过的内容，最多保留 50 条，存在本机的 localStorage 里。",
  },
  en: {
    search: "Search",
    searchPlaceholder: "Search saved text",
    read: "Read clipboard",
    clear: "Clear all",
    empty: "Nothing captured yet",
    emptyHint: "Copy or paste text on this page and it lands here automatically",
    readDenied: "The browser blocked clipboard access — paste once manually (Ctrl / Cmd + V)",
    emptyClipboard: "The clipboard holds no text",
    confirmClear: "Clear every entry?",
    deleteEntry: "Delete this entry",
    clearSearch: "Clear search",
    note: "Browsers do not expose the system clipboard history, so this only remembers what you copied or pasted on this page. Up to 50 entries are kept in this device's localStorage.",
  },
};

interface Entry {
  id: string;
  text: string;
  at: number;
}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" && typeof entry.text === "string" && typeof entry.at === "number"
  );
}

function readEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

export function ClipboardHistoryTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setEntries(readEntries());
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch {
        /* quota or private mode — keep it in memory */
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [entries, loaded]);

  const push = React.useCallback((text: string) => {
    const value = text.trim();
    if (!value) return;
    setEntries((prev) =>
      [
        { id: crypto.randomUUID(), text: value, at: Date.now() },
        ...prev.filter((entry) => entry.text !== value),
      ].slice(0, LIMIT)
    );
  }, []);

  React.useEffect(() => {
    const onCopy = () => {
      const selected = window.getSelection()?.toString() ?? "";
      if (selected.trim()) push(selected);
    };
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text.trim()) push(text);
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [push]);

  const readClipboard = async () => {
    setNotice(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) push(text);
      else setNotice(t.emptyClipboard);
    } catch {
      setNotice(t.readDenied);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? entries.filter((entry) => entry.text.toLowerCase().includes(q))
    : entries;

  const timeFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <label className="flex min-w-[180px] flex-1 items-center gap-2">
          <Search className="h-3.5 w-3.5 text-foreground-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.search}
            size="xs"
            spellCheck={false}
            className="min-w-0 flex-1"
          />
        </label>
        <Button type="button" variant="ghost" size="xs" onClick={readClipboard} className="gap-1.5">
          <ClipboardPaste className="h-3.5 w-3.5" />
          {t.read}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            if (entries.length === 0) return;
            if (window.confirm(t.confirmClear)) setEntries([]);
          }}
          disabled={entries.length === 0}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t.clear}
        </Button>
      </div>

      {notice && <WarningNote>{notice}</WarningNote>}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-surface py-12">
          <p className="text-sm text-foreground-subtle">{t.empty}</p>
          <p className="text-xs text-foreground-faint">{t.emptyHint}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((entry) => (
            <li
              key={entry.id}
              className="group flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-3 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-foreground">
                  {entry.text}
                </p>
                <p className="mt-1 font-mono text-[10px] text-foreground-faint">
                  {timeFormat.format(entry.at)} · {[...entry.text].length}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <CopyButton value={entry.text} size="icon-xs" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setEntries((prev) => prev.filter((item) => item.id !== entry.id))}
                  aria-label={t.deleteEntry}
                  title={t.deleteEntry}
                  className="text-foreground-subtle hover:text-red-fg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
