"use client";

import * as React from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { CopyButton, Toggle } from "@/components/tools/tool-ui";
import { asciiEntries, htmlEntity } from "@/lib/ascii";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    search: "搜索",
    searchPlaceholder: "输入字符、十进制、十六进制或名称",
    latin1: "包含 128–255",
    code: "十进制",
    hex: "十六",
    octal: "八进制",
    binary: "二进制",
    char: "字符",
    name: "名称",
    html: "HTML",
    empty: "没有匹配的字符",
    count: (n: number) => `${n} 个字符`,
    note: "0–31 与 127 是控制字符，没有可显示的字符；128–255 属于 Latin-1 补充区，按字节解码显示。",
  },
  en: {
    search: "Search",
    searchPlaceholder: "Character, decimal, hex or name",
    latin1: "Include 128–255",
    code: "Dec",
    hex: "Hex",
    octal: "Octal",
    binary: "Binary",
    char: "Char",
    name: "Name",
    html: "HTML",
    empty: "No matching character",
    count: (n: number) => `${n} characters`,
    note: "0–31 and 127 are control characters with no glyph; 128–255 are the Latin-1 supplement, decoded byte by byte.",
  },
};

export function AsciiTableTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [query, setQuery] = React.useState("");
  const [latin1, setLatin1] = React.useState(false);

  const entries = React.useMemo(() => asciiEntries(latin1), [latin1]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    const hex = /^(0x)?([0-9a-f]{1,2})$/i.exec(q);
    return entries.filter((entry) => {
      if (String(entry.code) === q) return true;
      if (hex && Number.parseInt(hex[2], 16) === entry.code) return true;
      if (entry.char && entry.char.toLowerCase() === q) return true;
      return entry.name.toLowerCase().includes(q) || entry.zh.includes(q);
    });
  }, [entries, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.search}</span>
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
        <Toggle checked={latin1} onChange={setLatin1} label={t.latin1} />
        <span className="font-mono text-[11px] text-foreground-faint">{t.count(rows.length)}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[620px] border-collapse font-mono text-[11.5px]">
          <thead>
            <tr className="border-b border-border text-left text-foreground-subtle">
              <th className="w-14 px-3 py-2 font-medium">{t.code}</th>
              <th className="w-14 px-3 py-2 font-medium">{t.hex}</th>
              <th className="w-16 px-3 py-2 font-medium">{t.octal}</th>
              <th className="w-24 px-3 py-2 font-medium">{t.binary}</th>
              <th className="w-16 px-3 py-2 font-medium">{t.char}</th>
              <th className="px-3 py-2 font-medium">{t.name}</th>
              <th className="w-20 px-3 py-2 font-medium">{t.html}</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr
                key={entry.code}
                className="group border-b border-border last:border-b-0 hover:bg-hover-bg"
              >
                <td className="px-3 py-1.5 text-foreground">{entry.code}</td>
                <td className="px-3 py-1.5 text-foreground-muted">
                  {entry.code.toString(16).toUpperCase().padStart(2, "0")}
                </td>
                <td className="px-3 py-1.5 text-foreground-muted">{entry.code.toString(8)}</td>
                <td className="px-3 py-1.5 text-foreground-faint">
                  {entry.code.toString(2).padStart(8, "0")}
                </td>
                <td
                  className={cn(
                    "px-3 py-1.5 text-base",
                    entry.control ? "text-foreground-faint" : "text-foreground"
                  )}
                >
                  {entry.control ? "·" : entry.char}
                </td>
                <td className="px-3 py-1.5 text-foreground-muted">
                  {locale === "zh" ? entry.zh : entry.name}
                  {locale === "zh" && entry.name !== entry.zh && (
                    <span className="ml-2 text-foreground-faint">{entry.name}</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-foreground-faint">{htmlEntity(entry.code)}</td>
                <td className="px-2 py-1">
                  <CopyButton
                    value={entry.control ? htmlEntity(entry.code) : entry.char}
                    size="icon-xs"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-foreground-subtle">{t.empty}</p>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
