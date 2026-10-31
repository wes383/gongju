"use client";

import * as React from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/tool-ui";

interface CheatItem {
  syntax: string;
  zh: string;
  en: string;
  example?: string;
}

interface CheatGroup {
  id: string;
  zh: string;
  en: string;
  items: CheatItem[];
}

const GROUP_TITLES = {
  classes: { zh: "字符类", en: "Character classes" },
  quantifiers: { zh: "量词", en: "Quantifiers" },
  anchors: { zh: "位置", en: "Anchors" },
  groups: { zh: "分组与引用", en: "Groups and backreferences" },
  lookaround: { zh: "断言", en: "Lookaround" },
  escapes: { zh: "转义", en: "Escapes" },
  flags: { zh: "标志", en: "Flags" },
};

const GROUPS: CheatGroup[] = [
  {
    ...GROUP_TITLES.classes,
    id: "classes",
    items: [
      { syntax: ".", zh: "除换行符外的任意字符", en: "Any character except a line break", example: "a.c → abc" },
      { syntax: "\\d", zh: "数字 0–9", en: "A digit 0–9", example: "\\d+ → 2026" },
      { syntax: "\\D", zh: "非数字字符", en: "Anything that is not a digit" },
      { syntax: "\\w", zh: "字母、数字或下划线", en: "Letter, digit or underscore", example: "\\w+" },
      { syntax: "\\W", zh: "非单词字符", en: "Anything that is not a word character" },
      { syntax: "\\s", zh: "空白字符（空格、制表、换行）", en: "Whitespace: space, tab, line break" },
      { syntax: "\\S", zh: "非空白字符", en: "Anything that is not whitespace" },
      { syntax: "[abc]", zh: "方括号中的任意一个字符", en: "One of the characters in the set", example: "[aeiou]" },
      { syntax: "[^abc]", zh: "不在方括号中的任意字符", en: "Any character not in the set" },
      { syntax: "[a-z]", zh: "字符范围", en: "A range of characters", example: "[A-Z0-9]" },
      { syntax: "\\p{L}", zh: "某个 Unicode 类别（需 u 标志）", en: "A Unicode property (needs the u flag)", example: "\\p{Script=Han}" },
    ],
  },
  {
    ...GROUP_TITLES.quantifiers,
    id: "quantifiers",
    items: [
      { syntax: "*", zh: "前一项出现 0 次或多次", en: "The previous item zero or more times" },
      { syntax: "+", zh: "前一项出现 1 次或多次", en: "The previous item one or more times" },
      { syntax: "?", zh: "前一项出现 0 次或 1 次", en: "The previous item zero or one time" },
      { syntax: "{n}", zh: "恰好出现 n 次", en: "Exactly n times", example: "\\d{4}" },
      { syntax: "{n,}", zh: "至少出现 n 次", en: "At least n times" },
      { syntax: "{n,m}", zh: "出现 n 到 m 次", en: "Between n and m times" },
      { syntax: "*?", zh: "懒惰匹配，尽可能少地匹配", en: "Lazy: match as little as possible", example: "<.+?>" },
    ],
  },
  {
    ...GROUP_TITLES.anchors,
    id: "anchors",
    items: [
      { syntax: "^", zh: "字符串开头（m 标志下为行首）", en: "Start of input (or of a line with the m flag)" },
      { syntax: "$", zh: "字符串结尾（m 标志下为行尾）", en: "End of input (or of a line with the m flag)" },
      { syntax: "\\b", zh: "单词边界", en: "A word boundary", example: "\\bcat\\b" },
      { syntax: "\\B", zh: "非单词边界", en: "Not a word boundary" },
    ],
  },
  {
    ...GROUP_TITLES.groups,
    id: "groups",
    items: [
      { syntax: "(abc)", zh: "捕获分组，可用 $1 或 \\1 引用", en: "Capturing group, usable as $1 or \\1", example: "(\\d{4})-(\\d{2})" },
      { syntax: "(?:abc)", zh: "非捕获分组，只做分组不保存", en: "Non-capturing group: groups without storing" },
      { syntax: "(?<name>abc)", zh: "具名捕获分组", en: "Named capturing group", example: "(?<year>\\d{4})" },
      { syntax: "a|b", zh: "或，匹配其中任意一个", en: "Alternation: match either side", example: "cat|dog" },
      { syntax: "\\1 \\2", zh: "反向引用前面的捕获分组", en: "Backreference to an earlier group", example: "(\\w)\\1" },
      { syntax: "\\k<name>", zh: "引用具名分组", en: "Backreference to a named group" },
    ],
  },
  {
    ...GROUP_TITLES.lookaround,
    id: "lookaround",
    items: [
      { syntax: "(?=abc)", zh: "正向肯定断言：后面必须跟着 abc", en: "Positive lookahead: what follows must match", example: "\\d+(?= 元)" },
      { syntax: "(?!abc)", zh: "正向否定断言：后面不能是 abc", en: "Negative lookahead: what follows must not match" },
      { syntax: "(?<=abc)", zh: "反向肯定断言：前面必须是 abc", en: "Positive lookbehind: what precedes must match", example: "(?<=\\$)\\d+" },
      { syntax: "(?<!abc)", zh: "反向否定断言：前面不能是 abc", en: "Negative lookbehind: what precedes must not match" },
    ],
  },
  {
    ...GROUP_TITLES.escapes,
    id: "escapes",
    items: [
      { syntax: "\\n", zh: "换行符", en: "Line feed" },
      { syntax: "\\t", zh: "制表符", en: "Tab" },
      { syntax: "\\r", zh: "回车符", en: "Carriage return" },
      { syntax: "\\\\", zh: "反斜杠本身", en: "A literal backslash" },
      { syntax: "\\.", zh: "转义元字符，匹配字面点号", en: "Escape a metacharacter, e.g. a literal dot" },
      { syntax: "\\u4E2D", zh: "按码点匹配一个字符", en: "Match one character by code point" },
      { syntax: "\\x41", zh: "按十六进制匹配一个字符", en: "Match one character by hex code" },
    ],
  },
  {
    ...GROUP_TITLES.flags,
    id: "flags",
    items: [
      { syntax: "g", zh: "全局匹配，找出所有结果", en: "Global: find every match" },
      { syntax: "i", zh: "忽略大小写", en: "Case-insensitive" },
      { syntax: "m", zh: "多行模式，^ 和 $ 匹配行首行尾", en: "Multiline: ^ and $ match line boundaries" },
      { syntax: "s", zh: "让 . 也能匹配换行符", en: "Dot matches line breaks too" },
      { syntax: "u", zh: "按 Unicode 码点处理", en: "Treat the pattern as Unicode" },
      { syntax: "y", zh: "粘性匹配，只从上次结束处继续", en: "Sticky: match only at the current position" },
      { syntax: "d", zh: "记录每个匹配的位置信息", en: "Record match indices" },
    ],
  },
];

const COPY = {
  zh: {
    search: "搜索",
    searchPlaceholder: "搜索语法或说明，例如 分组、\\d、lookahead",
    empty: "没有匹配的条目",
    count: (n: number) => `${n} 条`,
    note: "语法按 JavaScript（ECMAScript）正则整理。断言与 \\p{...} 需要较新的浏览器；点击右侧按钮可复制语法。",
  },
  en: {
    search: "Search",
    searchPlaceholder: "Search syntax or meaning, e.g. group, \\d, lookahead",
    empty: "No matching entry",
    count: (n: number) => `${n} entries`,
    note: "Based on JavaScript (ECMAScript) regular expressions. Lookbehind and \\p{...} need a reasonably recent browser. Use the copy button to grab a snippet.",
  },
};

export function RegexCheatsheetTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [query, setQuery] = React.useState("");

  const groups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.syntax.toLowerCase().includes(q) ||
          item.zh.includes(q) ||
          item.en.toLowerCase().includes(q) ||
          (item.example?.toLowerCase().includes(q) ?? false)
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2">
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
        <span className="font-mono text-[11px] text-foreground-faint">{t.count(total)}</span>
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.id}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <header className="border-b border-border px-4 py-2 text-xs font-medium text-foreground-muted">
                {locale === "zh" ? group.zh : group.en}
                {locale === "zh" && (
                  <span className="ml-2 font-mono text-[10px] text-foreground-faint">
                    {group.en}
                  </span>
                )}
              </header>
              {group.items.map((item) => (
                <div
                  key={item.syntax}
                  className="group flex items-start gap-3 border-b border-border px-4 py-2 last:border-b-0"
                >
                  <code className="w-24 shrink-0 break-all font-mono text-[12px] text-foreground">
                    {item.syntax}
                  </code>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-foreground-muted">
                      {locale === "zh" ? item.zh : item.en}
                    </p>
                    {item.example && (
                      <p className="mt-0.5 break-all font-mono text-[11px] text-foreground-faint">
                        {item.example}
                      </p>
                    )}
                  </div>
                  <CopyButton
                    value={item.syntax}
                    size="icon-xs"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
