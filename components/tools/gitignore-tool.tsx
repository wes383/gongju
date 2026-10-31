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
  categoryLabel,
  DEFAULT_IGNORE,
  IGNORE_CATEGORIES,
  IGNORE_GROUPS,
  IGNORE_PRESETS,
  groupLabel,
} from "@/lib/gitignore";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    presets: "快捷预设",
    search: "搜索分类",
    output: ".gitignore",
    selectAll: "全选",
    clear: "清空",
    download: "下载",
    empty: "至少选择一个分类",
    noMatch: "没有匹配的分类",
    groupAll: "全选",
    groupNone: "取消",
    custom: "补充规则",
    customPlaceholder: "每行一条，例如 public/uploads/ 或 *.psd",
    lines: "行",
    note: "规则取自 github/gitignore 官方模板（CC0）：语言、框架、项目类型各自一份模板，编辑器、操作系统与通用工具放在 Global 分类，本地再补充模板缺失的规则。选中的分类按组拼接并去重，`!` 开头的例外规则保留，补充规则追加在末尾。",
  },
  en: {
    presets: "Presets",
    search: "Search groups",
    output: ".gitignore",
    selectAll: "Select all",
    clear: "Clear",
    download: "Download",
    empty: "Pick at least one group",
    noMatch: "No matching groups",
    groupAll: "All",
    groupNone: "None",
    custom: "Extra rules",
    customPlaceholder: "One per line, e.g. public/uploads/ or *.psd",
    lines: "lines",
    note: "Patterns come from the official github/gitignore templates (CC0): one file per language, framework or project type, with editors, operating systems and tools under Global; a few rules are added locally where upstream has no template. Selected groups are merged and de-duplicated, `!` exceptions are kept and extra rules are appended verbatim.",
  },
};

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

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

  const sections = IGNORE_CATEGORIES.map((category) => ({
    category,
    groups: visible.filter((group) => group.category === category.id),
  })).filter((section) => section.groups.length > 0);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSection = (ids: string[], allSelected: boolean) =>
    setSelected((prev) =>
      allSelected
        ? prev.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev, ...ids]))
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-foreground-muted">{t.presets}</span>
            {IGNORE_PRESETS.map((preset) => {
              const active = sameSet(selected, preset.groups);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(preset.groups)}
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-1 text-[11px] transition-colors duration-base ease-out",
                    active
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-dashed border-border bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground"
                  )}
                >
                  {preset.label[locale]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

          {sections.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {sections.map(({ category, groups }) => {
                const ids = groups.map((group) => group.id);
                const allSelected = ids.every((id) => selected.includes(id));
                return (
                  <div key={category.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                        {categoryLabel(category, locale)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSection(ids, allSelected)}
                        className="text-[11px] text-foreground-faint transition-colors hover:text-foreground-muted"
                      >
                        {allSelected ? t.groupNone : t.groupAll}
                      </button>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {groups.map((group) => {
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
                  </div>
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
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]">
          <Pane
            label={t.output}
            className="h-full"
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
            footer={
              <span>
                {output
                  ? `${selected.length} / ${IGNORE_GROUPS.length} · ${output.trimEnd().split("\n").length} ${t.lines}`
                  : t.empty}
              </span>
            }
          >
            <OutputArea
              value={output}
              minHeight="min-h-[360px] lg:h-full"
              placeholder={t.empty}
            />
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
