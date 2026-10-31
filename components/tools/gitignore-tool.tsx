"use client";

import * as React from "react";
import { Check, Download } from "lucide-react";
import { CopyButton, OutputArea, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
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
    output: ".gitignore",
    selectAll: "全选",
    clear: "清空",
    download: "下载",
    empty: "至少选择一个分类",
    popular: "常用",
    note: "选中的分类会按组拼接、去重，`!` 开头的例外规则会保留；生成的是标准 .gitignore 文本，可下载后放到项目根目录。",
  },
  en: {
    stacks: "Pick your stack",
    output: ".gitignore",
    selectAll: "Select all",
    clear: "Clear",
    download: "Download",
    empty: "Pick at least one group",
    popular: "Popular",
    note: "Selected groups are merged and de-duplicated while keeping `!` exceptions; the result is a plain .gitignore you can download into the project root.",
  },
};

export function GitignoreTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [selected, setSelected] = React.useState<string[]>(DEFAULT_IGNORE);

  const output = React.useMemo(() => buildGitignore(selected, locale), [selected, locale]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-foreground-muted">{t.stacks}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setSelected(IGNORE_GROUPS.map((group) => group.id))}
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

      <div className="flex flex-wrap gap-1.5">
        {IGNORE_GROUPS.map((group) => {
          const active = selected.includes(group.id);
          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(group.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-base ease-out",
                active
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-border bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground"
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {groupLabel(group, locale)}
              {group.popular && !active && (
                <span className="font-mono text-[10px] text-foreground-faint">{t.popular}</span>
              )}
            </button>
          );
        })}
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
