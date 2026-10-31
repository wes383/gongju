"use client";

import * as React from "react";
import { Download, FilePlus2, Search, Trash2 } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadBlob } from "@/lib/files";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "gongju.notes.v1";

const COPY = {
  zh: {
    newNote: "新建",
    search: "搜索",
    searchPlaceholder: "搜索标题或正文",
    untitled: "无标题",
    emptyList: "还没有笔记",
    emptyState: "在左侧新建一条笔记开始记录",
    title: "标题",
    titlePlaceholder: "标题",
    body: "正文",
    bodyPlaceholder: "在这里写点什么，内容会自动保存在本机",
    saved: "已保存到本机",
    delete: "删除",
    export: "导出 .md",
    confirmDelete: "删除这条笔记？此操作不可撤销。",
    chars: (n: number, lines: number) => `${n} 字 · ${lines} 行`,
    note: "笔记只保存在这台设备的浏览器里（localStorage），清理浏览器数据或换设备都会丢失，重要内容请先导出。",
  },
  en: {
    newNote: "New",
    search: "Search",
    searchPlaceholder: "Search title or body",
    untitled: "Untitled",
    emptyList: "No notes yet",
    emptyState: "Create a note on the left to start writing",
    title: "Title",
    titlePlaceholder: "Title",
    body: "Body",
    bodyPlaceholder: "Write anything here — it saves to this device automatically",
    saved: "Saved on this device",
    delete: "Delete",
    export: "Export .md",
    confirmDelete: "Delete this note? This cannot be undone.",
    chars: (n: number, lines: number) => `${n} chars · ${lines} lines`,
    note: "Notes live in this browser's localStorage on this device. Clearing site data or switching devices loses them, so export anything important.",
  },
};

interface Note {
  id: string;
  title: string;
  body: string;
  updated: number;
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === "string" &&
    typeof note.title === "string" &&
    typeof note.body === "string" &&
    typeof note.updated === "number"
  );
}

function readNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNote).sort((a, b) => b.updated - a.updated);
  } catch {
    return [];
  }
}

export function NotesTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = readNotes();
      setNotes(stored);
      setSelected(stored[0]?.id ?? null);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Writes are debounced so typing does not hit localStorage on every keystroke
  React.useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      } catch {
        /* quota or private mode — the text stays in memory */
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [notes, loaded]);

  const current = notes.find((note) => note.id === selected) ?? null;

  const create = () => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: "",
      body: "",
      updated: Date.now(),
    };
    setNotes((prev) => [note, ...prev]);
    setSelected(note.id);
  };

  const update = (patch: Partial<Pick<Note, "title" | "body">>) => {
    if (!current) return;
    const id = current.id;
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...patch, updated: Date.now() } : note))
    );
  };

  const remove = () => {
    if (!current) return;
    if (!window.confirm(t.confirmDelete)) return;
    const next = notes.filter((note) => note.id !== current.id);
    setNotes(next);
    setSelected(next[0]?.id ?? null);
  };

  const exportCurrent = () => {
    if (!current) return;
    const name = (current.title.trim() || "note").replace(/[\\/:*?"<>|]/g, "-");
    downloadBlob(new Blob([current.body], { type: "text/markdown;charset=utf-8" }), `${name}.md`);
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? notes.filter(
        (note) =>
          note.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q)
      )
    : notes;

  const timeFormat = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines = current ? (current.body ? current.body.split("\n").length : 0) : 0;

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
        <Button type="button" size="xs" onClick={create} className="gap-1.5">
          <FilePlus2 className="h-3.5 w-3.5" />
          {t.newNote}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className="flex max-h-[520px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
          {visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-foreground-faint">
              {notes.length === 0 ? t.emptyList : t.untitled}
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {visible.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelected(note.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-hover-bg",
                    note.id === selected && "bg-hover-bg"
                  )}
                >
                  <span className="truncate text-xs font-medium text-foreground">
                    {note.title.trim() || t.untitled}
                  </span>
                  <span className="truncate font-mono text-[10px] text-foreground-faint">
                    {timeFormat.format(note.updated)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {current ? (
          <section className="flex min-h-[320px] flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <Input
              value={current.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={t.titlePlaceholder}
              aria-label={t.title}
              className="border-0 bg-transparent px-1 font-display text-base font-semibold shadow-none focus-visible:ring-0"
            />
            <textarea
              value={current.body}
              onChange={(e) => update({ body: e.target.value })}
              placeholder={t.bodyPlaceholder}
              aria-label={t.body}
              spellCheck={false}
              className="min-h-[240px] flex-1 resize-y bg-transparent px-1 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
            />
            <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
              <span className="font-mono text-[10px] text-foreground-faint">
                {t.chars([...current.body].length, lines)}
              </span>
              <span className="text-[10px] text-foreground-faint">· {t.saved}</span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={exportCurrent}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={remove}
                  className="gap-1.5 text-red-fg hover:text-red-fg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.delete}
                </Button>
              </div>
            </footer>
          </section>
        ) : (
          <section className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-surface text-sm text-foreground-subtle">
            {t.emptyState}
          </section>
        )}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
