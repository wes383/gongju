"use client";

import * as React from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSetPicker, useFileSet } from "@/components/tools/file-set-picker";
import {
  OptionBar,
  OptionField,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { downloadBlob, downloadZip } from "@/lib/files";
import {
  buildRenamePlan,
  DEFAULT_RENAME_OPTIONS,
  type ExtensionMode,
  type NumberPlace,
  type RenameOptions,
} from "@/lib/file-batch";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    rules: "命名规则",
    prefix: "前缀",
    suffix: "后缀",
    find: "查找",
    replace: "替换为",
    regex: "正则",
    caseSensitive: "区分大小写",
    sequence: "序号",
    start: "起始",
    step: "步长",
    digits: "位数",
    place: "位置",
    placePrefix: "放最前",
    placeSuffix: "放最后",
    extension: "扩展名",
    keep: "保持不变",
    lower: "改为小写",
    upper: "改为大写",
    custom: "自定义",
    customExt: "新扩展名",
    empty: "导入文件或文件夹后，这里会预览新的名称",
    preview: "重命名预览",
    original: "原路径",
    renamed: "新名称",
    status: "状态",
    changed: "改名",
    unchanged: "不变",
    duplicate: "重名",
    emptyName: "名称为空",
    badRegex: "正则表达式无效，本次没有执行查找替换",
    changedCount: (n: number) => `${n} 个文件会改名`,
    conflictCount: (n: number) => `${n} 个目标名称重名或为空，先调整规则再打包`,
    download: "打包下载",
    exportPlan: "导出台账",
    note: "浏览器不能直接改本地文件名，所以按新名称重新打包成 ZIP，解压后就是改名结果。文件不会上传，也不会读取与所选文件夹无关的内容。",
  },
  en: {
    rules: "Naming rule",
    prefix: "Prefix",
    suffix: "Suffix",
    find: "Find",
    replace: "Replace with",
    regex: "Regex",
    caseSensitive: "Case-sensitive",
    sequence: "Counter",
    start: "Start",
    step: "Step",
    digits: "Digits",
    place: "Position",
    placePrefix: "At the start",
    placeSuffix: "At the end",
    extension: "Extension",
    keep: "Keep as is",
    lower: "Lowercase",
    upper: "Uppercase",
    custom: "Custom",
    customExt: "New extension",
    empty: "Import files or a folder to preview the new names",
    preview: "Rename preview",
    original: "Original path",
    renamed: "New name",
    status: "Status",
    changed: "Renamed",
    unchanged: "Unchanged",
    duplicate: "Duplicate",
    emptyName: "Empty name",
    badRegex: "The regular expression is invalid, so no find and replace was applied",
    changedCount: (n: number) => `${n} file${n === 1 ? "" : "s"} will be renamed`,
    conflictCount: (n: number) =>
      `${n} target name${n === 1 ? "" : "s"} duplicate or end up empty — fix the rule before packing`,
    download: "Download zip",
    exportPlan: "Export plan",
    note: "Browsers cannot rename files on disk, so the files are repacked as a ZIP with the new names — unzip to get the renamed result. Nothing is uploaded and nothing outside the picked folder is read.",
  },
};

function quoteCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function BatchRenameTool() {
  const t = useCopy(COPY);
  const { entries, add, remove, clear } = useFileSet();
  const [options, setOptions] = React.useState<RenameOptions>(DEFAULT_RENAME_OPTIONS);
  const [busy, setBusy] = React.useState(false);

  const set = <K extends keyof RenameOptions>(key: K, value: RenameOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const plan = React.useMemo(
    () => buildRenamePlan(entries.map((entry) => entry.path), options),
    [entries, options]
  );

  const issues = plan.rows.filter((row) => row.issue).length;
  const changed = plan.rows.filter((row) => row.changed && !row.issue).length;
  const canDownload = plan.rows.length > 0 && issues === 0 && !plan.patternInvalid;

  const download = async () => {
    if (!canDownload) return;
    setBusy(true);
    try {
      const byPath = new Map(entries.map((entry) => [entry.path, entry.file]));
      const files = plan.rows
        .filter((row) => !row.issue)
        .map((row) => ({ name: `${row.dir}${row.newName}`, blob: byPath.get(row.path)! }));
      await downloadZip(files, "renamed.zip");
    } finally {
      setBusy(false);
    }
  };

  const exportPlan = () => {
    const lines = ["path,new_path"];
    for (const row of plan.rows) {
      lines.push(`${quoteCsv(row.path)},${quoteCsv(`${row.dir}${row.newName}`)}`);
    }
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "rename-plan.csv");
  };

  return (
    <div className="flex flex-col gap-4">
      <FileSetPicker
        entries={entries}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        hint={t.rules}
      />

      <OptionBar>
        <OptionField label={t.prefix}>
          <Input
            value={options.prefix}
            onChange={(event) => set("prefix", event.target.value)}
            placeholder="IMG_"
            aria-label={t.prefix}
            size="xs"
            className="w-28"
          />
        </OptionField>
        <OptionField label={t.suffix}>
          <Input
            value={options.suffix}
            onChange={(event) => set("suffix", event.target.value)}
            placeholder="_final"
            aria-label={t.suffix}
            size="xs"
            className="w-28"
          />
        </OptionField>
        <OptionField label={t.find}>
          <Input
            value={options.find}
            onChange={(event) => set("find", event.target.value)}
            placeholder="DSC"
            aria-label={t.find}
            size="xs"
            className="w-24"
          />
        </OptionField>
        <OptionField label={t.replace}>
          <Input
            value={options.replace}
            onChange={(event) => set("replace", event.target.value)}
            placeholder="photo"
            aria-label={t.replace}
            size="xs"
            className="w-24"
          />
        </OptionField>
        <div className="flex items-center gap-4">
          <Toggle checked={options.useRegex} onChange={(v) => set("useRegex", v)} label={t.regex} />
          <Toggle
            checked={options.caseSensitive}
            onChange={(v) => set("caseSensitive", v)}
            label={t.caseSensitive}
          />
        </div>
      </OptionBar>

      <OptionBar>
        <Toggle
          checked={options.numbered}
          onChange={(v) => set("numbered", v)}
          label={t.sequence}
        />
        {options.numbered && (
          <>
            <OptionField label={t.start}>
              <Input
                type="number"
                value={options.start}
                onChange={(event) => set("start", Math.trunc(Number(event.target.value) || 0))}
                aria-label={t.start}
                size="xs"
                className="w-16 text-center font-mono"
              />
            </OptionField>
            <OptionField label={t.step}>
              <Input
                type="number"
                value={options.step}
                onChange={(event) => set("step", Math.trunc(Number(event.target.value) || 0))}
                aria-label={t.step}
                size="xs"
                className="w-16 text-center font-mono"
              />
            </OptionField>
            <OptionField label={t.digits}>
              <Input
                type="number"
                min={1}
                max={12}
                value={options.digits}
                onChange={(event) =>
                  set("digits", Math.min(Math.max(Math.trunc(Number(event.target.value) || 1), 1), 12))
                }
                aria-label={t.digits}
                size="xs"
                className="w-16 text-center font-mono"
              />
            </OptionField>
            <OptionField label={t.place}>
              <Select
                value={options.numberPlace}
                onValueChange={(value) => set("numberPlace", value as NumberPlace)}
              >
                <SelectTrigger size="xs" aria-label={t.place} className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefix">{t.placePrefix}</SelectItem>
                  <SelectItem value="suffix">{t.placeSuffix}</SelectItem>
                </SelectContent>
              </Select>
            </OptionField>
          </>
        )}

        <OptionField label={t.extension} className="ml-auto">
          <Select
            value={options.extension}
            onValueChange={(value) => set("extension", value as ExtensionMode)}
          >
            <SelectTrigger size="xs" aria-label={t.extension} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keep">{t.keep}</SelectItem>
              <SelectItem value="lower">{t.lower}</SelectItem>
              <SelectItem value="upper">{t.upper}</SelectItem>
              <SelectItem value="custom">{t.custom}</SelectItem>
            </SelectContent>
          </Select>
        </OptionField>
        {options.extension === "custom" && (
          <OptionField label={t.customExt}>
            <Input
              value={options.customExtension}
              onChange={(event) => set("customExtension", event.target.value)}
              placeholder=".webp"
              aria-label={t.customExt}
              size="xs"
              className="w-24"
            />
          </OptionField>
        )}
      </OptionBar>

      {plan.patternInvalid && <WarningNote>{t.badRegex}</WarningNote>}
      {issues > 0 && <WarningNote>{t.conflictCount(issues)}</WarningNote>}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.preview}
          </span>
          {plan.rows.length > 0 && (
            <span className="text-[11px] text-foreground-subtle">{t.changedCount(changed)}</span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={exportPlan}
              disabled={plan.rows.length === 0}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {t.exportPlan}
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={download}
              disabled={!canDownload || busy}
              className="gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileArchive className="h-3.5 w-3.5" />
              )}
              {t.download}
            </Button>
          </div>
        </header>

        {plan.rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : (
          <div className="max-h-[440px] overflow-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-border text-left text-foreground-subtle">
                  <th className="w-[44%] px-3 py-2 font-medium">{t.original}</th>
                  <th className="w-[44%] px-3 py-2 font-medium">{t.renamed}</th>
                  <th className="w-24 px-3 py-2 text-right font-medium">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((row) => (
                  <tr key={row.path} className="border-b border-border last:border-b-0">
                    <td className="max-w-0 px-3 py-1.5 font-mono text-foreground-muted">
                      <p className="truncate" title={row.path}>
                        {row.path}
                      </p>
                    </td>
                    <td className="max-w-0 px-3 py-1.5 font-mono">
                      <p
                        className={cn(
                          "truncate",
                          row.issue ? "text-red-fg" : row.changed ? "text-foreground" : "text-foreground-faint"
                        )}
                        title={`${row.dir}${row.newName}`}
                      >
                        {row.dir}
                        {row.newName}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">
                      <span
                        className={cn(
                          "text-[11px]",
                          row.issue
                            ? "text-red-fg"
                            : row.changed
                              ? "text-green-fg"
                              : "text-foreground-faint"
                        )}
                      >
                        {row.issue === "duplicate"
                          ? t.duplicate
                          : row.issue === "empty"
                            ? t.emptyName
                            : row.changed
                              ? t.changed
                              : t.unchanged}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
