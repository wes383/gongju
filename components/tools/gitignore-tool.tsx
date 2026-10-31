"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { CopyButton, OutputArea, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadBlob } from "@/lib/files";
import {
  buildGitignore,
  DEFAULT_IGNORE,
  IGNORE_GROUPS,
  groupLabel,
} from "@/lib/gitignore";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    stacks: "按项目选择",
    search: "搜索分类",
    output: ".gitignore",
    selectAll: "全选",
    clear: "清空",
    download: "下载",
    empty: "至少选择一个分类",
    noMatch: "没有匹配的分类",
    custom: "补充规则",
    customPlaceholder: "每行一条，例如 public/uploads/ 或 *.psd",
    note: "选中的分类会按组拼接、去重，`!` 开头的例外规则会保留；补充规则原样追加在末尾。生成的是标准 .gitignore 文本，可下载后放到项目根目录。",
  },
  en: {
    stacks: "Pick your stack",
    search: "Search groups",
    output: ".gitignore",
    selectAll: "Select all",
    clear: "Clear",
    download: "Download",
    empty: "Pick at least one group",
    noMatch: "No matching groups",
    custom: "Extra rules",
    customPlaceholder: "One per line, e.g. public/uploads/ or *.psd",
    note: "Selected groups are merged and de-duplicated while keeping `!` exceptions; extra rules are appended verbatim. The result is a plain .gitignore you can download into the project root.",
  },
};

export function GitignoreTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [selected, setSelected] = React.useState<string[]>(DEFAULT_IGNORE);
  const [query, setQuery] = React.useState("");
  const [extra, setExtra] = React.useState("");

  const output = React.useMemo(
    () => buildGitignore(selected, locale, extra),
    [selected, locale, extra]
  );

  const keyword = query.trim().toLowerCase();
  const visible = keyword
    ? IGNORE_GROUPS.filter(
        (group) =>
          groupLabel(group, locale).toLowerCase().includes(keyword) ||
          group.id.includes(keyword) ||
          group.patterns.some((pattern) => pattern.toLowerCase().includes(keyword))
      )
    : IGNORE_GROUPS;

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-foreground-muted">{t.stacks}</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          size="xs"
          className="w-40"
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() =>
              setSelected((prev) =>
                Array.from(new Set([...prev, ...visible.map((group) => group.id)]))
              )
            }
            className="text-foreground-muted"
          >
            {t.selectAll}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setSelected([])}
            className="text-foreground-muted"
          >
            {t.clear}
          </Button>
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((group) => {
            const active = selected.includes(group.id);
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(group.id)}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors duration-base ease-out",
                  active
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-border bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground"
                )}
              >
                {groupLabel(group, locale)}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-foreground-subtle">{t.noMatch}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="gitignore-extra" className="text-xs font-medium text-foreground-muted">
          {t.custom}
        </label>
        <textarea
          id="gitignore-extra"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={t.customPlaceholder}
          spellCheck={false}
          className="min-h-[72px] w-full resize-y rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-foreground-faint focus:border-border-strong focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <Pane
          label={t.output}
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={!output}
                onClick={() =>
                  downloadBlob(
                    new Blob([output], { type: "text/plain;charset=utf-8" }),
                    ".gitignore"
                  )
                }
                className="gap-1.5 text-foreground-muted"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.download}</span>
              </Button>
              <CopyButton value={output} />
            </>
          }
          footer={<span>{output ? `${output.split("\n").length} lines` : t.empty}</span>}
        >
          <OutputArea value={output} minHeight="min-h-[320px]" placeholder={t.empty} />
        </Pane>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
