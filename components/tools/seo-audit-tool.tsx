"use client";

import * as React from "react";
import { ScanSearch } from "lucide-react";
import { ClearButton, InputArea, SampleButton } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { auditHtml, type AuditIssue, type AuditLevel } from "@/lib/seo-audit";

const COPY = {
  zh: {
    input: "HTML 源码",
    result: "检查结果",
    error: "错误",
    warn: "警告",
    info: "提示",
    empty: "把页面的 HTML 粘进来，检查会在本地即时完成",
    clean: "没有发现明显问题",
    stats: {
      title: "标题字数",
      description: "描述字数",
      h1: "H1 数量",
      headings: "标题数量",
      images: "图片",
      missingAlt: "缺 alt",
      links: "链接",
      words: "正文字数",
    },
    sample: "示例",
    clear: "清空",
    note: "这是静态检查：只看标签与属性，不渲染页面、不执行脚本、也不访问网络，所以看不到 JS 注入的 meta 或运行时 DOM。它覆盖的是最常见的一批硬伤，不能替代 Google Search Console 与 Lighthouse 的实测结果。",
    messages: {
      htmlLang: "`<html>` 缺少 lang 属性，屏幕阅读器与搜索引擎都靠它判断语言",
      "title.missing": "缺少 `<title>`，搜索结果里会出现裸链接",
      "title.short": "标题只有 {0} 个字符，偏短（建议 10–60）",
      "title.long": "标题 {0} 个字符，搜索结果会被截断（建议 10–60）",
      "description.missing": "缺少 meta description，搜索引擎会自己截一段正文代替",
      "description.short": "描述 {0} 个字符，偏短（建议 50–160）",
      "description.long": "描述 {0} 个字符，超出部分会被截断（建议 50–160）",
      "h1.missing": "没有 `<h1>`，页面缺少唯一主标题",
      "h1.multiple": "有 {0} 个 `<h1>`，建议只保留一个",
      "heading.skip": "标题层级跳跃（{0}），会打乱文档结构",
      "canonical.missing": "没有 canonical，带参数的网址可能被当成重复页面",
      "robots.noindex": "页面声明了 noindex（{0}），不会被收录",
      "og.missing": "缺少分享标签：{0}",
      "twitter.missing": "没有 twitter:card，分享到 X 时可能只显示纯链接",
      "viewport.missing": "缺少 viewport，移动端会按桌面宽度渲染",
      "charset.missing": "没有声明字符编码，可能出现乱码",
      "jsonld.missing": "没有 JSON-LD 结构化数据，拿不到富媒体结果",
      "img.alt": "{0} 张图片没有 alt",
      "link.blank": "{0} 个 target=\"_blank\" 链接缺少 rel=\"noopener\"",
      "a11y.inputLabel": "{0} 个表单控件没有可访问名称（label / aria-label / placeholder）",
      "a11y.tabindex": "{0} 个元素用了大于 0 的 tabindex，会打乱 Tab 顺序",
      "a11y.iframeTitle": "{0} 个 iframe 没有 title",
      "a11y.duplicateId": "{0} 个重复的 id，锚点与 label 会指错",
    } as Record<string, string>,
  },
  en: {
    input: "HTML source",
    result: "Findings",
    error: "Errors",
    warn: "Warnings",
    info: "Notes",
    empty: "Paste a page's HTML and the checks run locally as you type",
    clean: "Nothing obvious to fix",
    stats: {
      title: "Title chars",
      description: "Description chars",
      h1: "H1 count",
      headings: "Headings",
      images: "Images",
      missingAlt: "Missing alt",
      links: "Links",
      words: "Words",
    },
    sample: "Sample",
    clear: "Clear",
    note: "This is a static pass: it reads tags and attributes without rendering, running scripts or touching the network, so meta tags injected by JavaScript stay invisible. It covers the most common hard mistakes, but it does not replace Search Console or Lighthouse.",
    messages: {
      htmlLang: "`<html>` has no lang attribute, which screen readers and search engines use to pick a language",
      "title.missing": "No `<title>`, so results show a bare URL",
      "title.short": "Title is only {0} characters, on the short side (aim for 10–60)",
      "title.long": "Title is {0} characters and will be truncated (aim for 10–60)",
      "description.missing": "No meta description, so search engines pick a snippet from the body",
      "description.short": "Description is {0} characters, on the short side (aim for 50–160)",
      "description.long": "Description is {0} characters and will be cut (aim for 50–160)",
      "h1.missing": "No `<h1>`, so the page has no single main heading",
      "h1.multiple": "{0} `<h1>` elements; keep just one",
      "heading.skip": "Heading level jumps ({0}), which scrambles the outline",
      "canonical.missing": "No canonical, so parameterised URLs can look like duplicates",
      "robots.noindex": "The page opts out of indexing with noindex ({0})",
      "og.missing": "Missing share tags: {0}",
      "twitter.missing": "No twitter:card, so shares on X may fall back to a plain link",
      "viewport.missing": "No viewport meta, so phones render at desktop width",
      "charset.missing": "No charset declaration, which risks mojibake",
      "jsonld.missing": "No JSON-LD, so no rich result eligibility",
      "img.alt": "{0} images without alt text",
      "link.blank": "{0} target=\"_blank\" links without rel=\"noopener\"",
      "a11y.inputLabel": "{0} form controls without an accessible name (label, aria-label or placeholder)",
      "a11y.tabindex": "{0} elements use a tabindex above 0, which breaks tab order",
      "a11y.iframeTitle": "{0} iframes without a title",
      "a11y.duplicateId": "{0} duplicate ids, so anchors and labels can point at the wrong node",
    } as Record<string, string>,
  },
};

const SAMPLE = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>把 159 个工具放进一个页面</title>
    <meta name="description" content="纯浏览器端运行的工具箱：编码、格式化、加密、PDF 与 Office 解析，处理过程不上传任何数据。" />
    <link rel="canonical" href="https://example.com/" />
    <meta property="og:title" content="把 159 个工具放进一个页面" />
    <meta property="og:description" content="纯浏览器端运行的工具箱" />
    <meta property="og:image" content="https://example.com/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <h1>把 159 个工具放进一个页面</h1>
    <img src="/cover.png" alt="工具首页截图" />
    <a href="https://example.com/more" target="_blank">更多</a>
  </body>
</html>`;

const LEVEL_STYLE: Record<AuditLevel, string> = {
  error: "text-red-fg",
  warn: "text-yellow-fg",
  info: "text-foreground-subtle",
};

const LEVEL_DOT: Record<AuditLevel, string> = {
  error: "bg-red-fg",
  warn: "bg-yellow-fg",
  info: "bg-foreground-faint",
};

export function SeoAuditTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [html, setHtml] = React.useState("");

  const report = React.useMemo(() => auditHtml(html), [html]);
  const hasInput = html.trim().length > 0;
  const format = (value: number) => value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");

  const message = (issue: AuditIssue) => {
    const template = t.messages[issue.id] ?? issue.id;
    return issue.detail ? template.replace(/\{0\}/g, issue.detail) : template.replace(/\{0\}/g, "");
  };

  const stats = [
    { label: t.stats.title, value: report.stats.titleChars },
    { label: t.stats.description, value: report.stats.descriptionChars },
    { label: t.stats.h1, value: report.stats.h1 },
    { label: t.stats.headings, value: report.stats.headings },
    { label: t.stats.images, value: report.stats.images },
    { label: t.stats.missingAlt, value: report.stats.imagesMissingAlt },
    { label: t.stats.links, value: report.stats.links },
    { label: t.stats.words, value: report.stats.words },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.input}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <SampleButton onClick={() => setHtml(SAMPLE)} label={t.sample} />
              <ClearButton onClick={() => setHtml("")} label={t.clear} />
            </div>
          </header>
          <InputArea
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            placeholder={t.empty}
            aria-label={t.input}
            spellCheck={false}
            className="min-h-[520px] text-xs"
          />
        </section>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.result}
            </span>
            <div className="ml-auto flex items-center gap-3 font-mono text-[11px]">
              <span className="text-red-fg">
                {t.error} {report.counts.error}
              </span>
              <span className="text-yellow-fg">
                {t.warn} {report.counts.warn}
              </span>
              <span className="text-foreground-faint">
                {t.info} {report.counts.info}
              </span>
            </div>
          </header>

          {!hasInput ? (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-xs text-foreground-faint">
              {t.empty}
            </div>
          ) : (
            <>
              <ul className="max-h-[46vh] flex-1 divide-y divide-border overflow-auto">
                {report.issues.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-green-fg">{t.clean}</li>
                ) : (
                  report.issues.map((issue) => (
                    <li key={issue.id} className="flex items-start gap-2 px-4 py-2.5">
                      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", LEVEL_DOT[issue.level])} />
                      <span className="min-w-0 flex-1 text-xs leading-relaxed text-foreground-muted">
                        {message(issue)}
                      </span>
                      <span className={cn("shrink-0 font-mono text-[10px] uppercase", LEVEL_STYLE[issue.level])}>
                        {issue.level === "error" ? t.error : issue.level === "warn" ? t.warn : t.info}
                      </span>
                    </li>
                  ))
                )}
              </ul>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border px-4 py-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <span className="text-[10px] text-foreground-faint">{stat.label}</span>
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {format(stat.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <ScanSearch className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
