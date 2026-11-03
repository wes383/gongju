"use client";

import * as React from "react";
import { CircleCheck, Download, Search, Tags, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton, ErrorNote } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import {
  auditMeta,
  buildMetaTags,
  DEFAULT_META,
  displayUrl,
  estimateWidth,
  LIMITS,
  META_SAMPLE,
  parseMetaTags,
  truncateToWidth,
  type MetaFields,
  type MetaIssueCode,
} from "@/lib/meta";
import { downloadBlob } from "@/lib/files";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    basics: "基础信息",
    title: "标题 title",
    description: "描述 description",
    canonical: "规范链接 canonical",
    image: "分享图 og:image",
    siteName: "站点名",
    type: "内容类型",
    locale: "语言",
    twitterCard: "卡片样式",
    keywords: "关键词",
    author: "作者",
    robots: "robots",
    themeColor: "主题色",
    favicon: "图标 favicon",
    more: "更多标签",
    import: "从现有页面导入",
    importHint: "粘贴一段 HTML（或整个页面源码），自动识别 head 里的标签",
    importButton: "解析并填入",
    importFailed: "没有识别到可用的标签，检查一下粘贴的内容",
    sample: "示例",
    output: "生成的标签",
    copy: "复制",
    download: "下载 .html",
    previews: "预览",
    google: "Google 搜索结果",
    twitter: "X / Twitter 卡片",
    facebook: "Facebook / LinkedIn",
    noImage: "未设置分享图",
    audit: "检查结果",
    allGood: "这些标签看起来没问题",
    chars: (n: number, max: number) => `${n} / ${max}`,
    widths: (pixels: number, max: number) => `约 ${pixels}px / ${max}px`,
    issues: {
      "title-missing": () => "缺少标题，搜索结果会自己编一个",
      "title-long": (length, limit) => `标题 ${length} 字，超过 ${limit} 字的部分会被截断`,
      "title-short": (length, limit) => `标题只有 ${length} 字，建议至少 ${limit} 字`,
      "description-missing": () => "缺少描述，搜索引擎会抓取页面正文片段",
      "description-long": (length, limit) => `描述 ${length} 字，超过 ${limit} 字的部分会被截断`,
      "description-short": (length, limit) => `描述只有 ${length} 字，建议至少 ${limit} 字`,
      "canonical-missing": () => "缺少 canonical，重复内容可能分散权重",
      "canonical-relative": () => "canonical 需要完整地址（https:// 开头）",
      "image-missing": () => "缺少分享图，社交平台会退化成纯文字卡片",
      "image-relative": () => "分享图需要完整地址，社交平台抓不到相对路径",
      "site-name-missing": () => "缺少 og:site_name，卡片上不会显示站点名",
    } as Record<MetaIssueCode, (length?: number, limit?: number) => string>,
    note: "长度按字符估算，像素宽度用字符类型粗略换算；Google 实际截断还受字体与容器影响，这里只是近似。",
  },
  en: {
    basics: "Basics",
    title: "Title",
    description: "Description",
    canonical: "Canonical URL",
    image: "Share image (og:image)",
    siteName: "Site name",
    type: "Content type",
    locale: "Locale",
    twitterCard: "Card type",
    keywords: "Keywords",
    author: "Author",
    robots: "Robots",
    themeColor: "Theme colour",
    favicon: "Favicon",
    more: "More tags",
    import: "Import from a page",
    importHint: "Paste some HTML (or a whole page) and the head tags are recognised automatically",
    importButton: "Parse and fill",
    importFailed: "No usable tags found — check what you pasted",
    sample: "Sample",
    output: "Generated tags",
    copy: "Copy",
    download: "Download .html",
    previews: "Previews",
    google: "Google result",
    twitter: "X / Twitter card",
    facebook: "Facebook / LinkedIn",
    noImage: "No share image",
    audit: "Checks",
    allGood: "These tags look good",
    chars: (n: number, max: number) => `${n} / ${max}`,
    widths: (pixels: number, max: number) => `~${pixels}px / ${max}px`,
    issues: {
      "title-missing": () => "No title — search engines will invent one",
      "title-long": (length, limit) => `Title is ${length} chars; anything past ${limit} is truncated`,
      "title-short": (length, limit) => `Title is only ${length} chars; aim for at least ${limit}`,
      "description-missing": () => "No description — engines will scrape body text instead",
      "description-long": (length, limit) => `Description is ${length} chars; past ${limit} it is truncated`,
      "description-short": (length, limit) => `Description is only ${length} chars; aim for at least ${limit}`,
      "canonical-missing": () => "No canonical — duplicate URLs may split ranking signals",
      "canonical-relative": () => "Canonical must be an absolute URL (https://…)",
      "image-missing": () => "No share image — social cards fall back to text",
      "image-relative": () => "Share image must be absolute; crawlers cannot fetch a relative path",
      "site-name-missing": () => "No og:site_name, so the card will not show the site name",
    } as Record<MetaIssueCode, (length?: number, limit?: number) => string>,
    note: "Lengths are counted in characters and pixel widths are estimated from character classes; Google's real truncation also depends on its font and layout.",
  },
};

const TYPES = ["website", "article", "product", "profile"];
const LOCALES = ["zh_CN", "en_US", "ja_JP", "zh_TW"];

function Field({
  label,
  hint,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  counter?: { text: string; over: boolean };
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-[11px] font-medium text-foreground-subtle">
        {label}
        {counter && (
          <span className={cn("ml-auto font-mono", counter.over ? "text-orange-fg" : "text-foreground-faint")}>
            {counter.text}
          </span>
        )}
        {hint && <span className="ml-auto truncate text-[10px] text-foreground-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function MetaTagsTool() {
  const t = useCopy(COPY);
  const [fields, setFields] = React.useState<MetaFields>({ ...DEFAULT_META, locale: "zh_CN" });
  const [rawHtml, setRawHtml] = React.useState("");
  const [importError, setImportError] = React.useState(false);

  const set = (key: keyof MetaFields) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const titleLength = [...fields.title].length;
  const descriptionLength = [...fields.description].length;
  const titlePixels = estimateWidth(fields.title, 18);
  const descriptionPixels = estimateWidth(fields.description, 13);

  const html = React.useMemo(() => buildMetaTags(fields), [fields]);
  const issues = React.useMemo(() => auditMeta(fields), [fields]);

  const importHtml = () => {
    const parsed = parseMetaTags(rawHtml);
    if (Object.keys(parsed).length === 0) {
      setImportError(true);
      return;
    }
    setImportError(false);
    setFields((prev) => ({ ...prev, ...parsed }));
  };

  const previewTitle = truncateToWidth(fields.title || "页面标题", LIMITS.title.pixels, 18);
  const previewDescription = truncateToWidth(
    fields.description || "页面描述会显示在这里。",
    LIMITS.description.pixels,
    13
  );
  const host = displayUrl(fields.canonical || "https://example.com/page");

  return (
    <div className="flex flex-col gap-4">
      <details className="rounded-lg border border-border bg-surface">
        <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-medium text-foreground-muted marker:content-none [&::-webkit-details-marker]:hidden">
          {t.import}
        </summary>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <Textarea
            value={rawHtml}
            onChange={(event) => {
              setRawHtml(event.target.value);
              setImportError(false);
            }}
            placeholder={'<title>…</title><meta name="description" content="…" />'}
            size="xs"
            className="min-h-[120px] font-mono"
            aria-label={t.import}
          />
          <div className="flex items-center gap-2">
            <Button type="button" size="xs" variant="outline" onClick={importHtml}>
              {t.importButton}
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setRawHtml(META_SAMPLE)}>
              {t.sample}
            </Button>
            <span className="text-[11px] text-foreground-faint">{t.importHint}</span>
          </div>
          {importError && <ErrorNote>{t.importFailed}</ErrorNote>}
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <Field
            label={t.title}
            counter={{
              text: `${t.chars(titleLength, LIMITS.title.max)} · ${t.widths(titlePixels, LIMITS.title.pixels)}`,
              over: titleLength > LIMITS.title.max || titlePixels > LIMITS.title.pixels,
            }}
          >
            <Input
              value={fields.title}
              onChange={(event) => set("title")(event.target.value)}
              placeholder="JSON 格式化工具 - 在线校验与美化"
              size="xs"
            />
          </Field>

          <Field
            label={t.description}
            counter={{
              text: `${t.chars(descriptionLength, LIMITS.description.max)} · ${t.widths(descriptionPixels, LIMITS.description.pixels)}`,
              over:
                descriptionLength > LIMITS.description.max ||
                descriptionPixels > LIMITS.description.pixels,
            }}
          >
            <Textarea
              value={fields.description}
              onChange={(event) => set("description")(event.target.value)}
              placeholder="一句话说清楚这个页面能做什么、给谁用"
              size="xs"
              className="min-h-[72px]"
              aria-label={t.description}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.canonical}>
              <Input
                value={fields.canonical}
                onChange={(event) => set("canonical")(event.target.value)}
                placeholder="https://example.com/page"
                className="font-mono text-xs"
                size="xs"
              />
            </Field>
            <Field label={t.image}>
              <Input
                value={fields.image}
                onChange={(event) => set("image")(event.target.value)}
                placeholder="https://example.com/og.png"
                className="font-mono text-xs"
                size="xs"
              />
            </Field>
            <Field label={t.siteName}>
              <Input
                value={fields.siteName}
                onChange={(event) => set("siteName")(event.target.value)}
                placeholder="GongJu"
                size="xs"
              />
            </Field>
            <Field label={t.type}>
              <Select value={fields.type} onValueChange={set("type")}>
                <SelectTrigger size="xs" aria-label={t.type}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.locale}>
              <Select value={fields.locale} onValueChange={set("locale")}>
                <SelectTrigger size="xs" aria-label={t.locale}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.twitterCard}>
              <Select value={fields.twitterCard} onValueChange={set("twitterCard")}>
                <SelectTrigger size="xs" aria-label={t.twitterCard}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary_large_image">summary_large_image</SelectItem>
                  <SelectItem value="summary">summary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <details className="rounded-md border border-border">
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-foreground-muted marker:content-none [&::-webkit-details-marker]:hidden">
              {t.more}
            </summary>
            <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
              <Field label={t.keywords}>
                <Input
                  value={fields.keywords}
                  onChange={(event) => set("keywords")(event.target.value)}
                  placeholder="json, formatter, 格式化"
                  className="text-xs"
                  size="xs"
                />
              </Field>
              <Field label={t.author}>
                <Input
                  value={fields.author}
                  onChange={(event) => set("author")(event.target.value)}
                  className="text-xs"
                  size="xs"
                />
              </Field>
              <Field label={t.robots}>
                <Input
                  value={fields.robots}
                  onChange={(event) => set("robots")(event.target.value)}
                  className="font-mono text-xs"
                  size="xs"
                />
              </Field>
              <Field label={t.themeColor}>
                <Input
                  value={fields.themeColor}
                  onChange={(event) => set("themeColor")(event.target.value)}
                  placeholder="#0f172a"
                  className="font-mono text-xs"
                  size="xs"
                />
              </Field>
              <Field label={t.favicon}>
                <Input
                  value={fields.favicon}
                  onChange={(event) => set("favicon")(event.target.value)}
                  placeholder="/favicon.ico"
                  className="font-mono text-xs"
                  size="xs"
                />
              </Field>
            </div>
          </details>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              {t.google}
            </p>
            <div className="rounded-md border border-border bg-background p-3">
              <p className="truncate font-mono text-[11px] text-foreground-muted">{host}</p>
              <p className="mt-0.5 text-[17px] leading-snug text-blue-fg">{previewTitle}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-foreground-muted">
                {previewDescription}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              {t.twitter}
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              {fields.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fields.image} alt="" className="aspect-[1.91/1] w-full object-cover" />
              ) : (
                <div className="grid aspect-[1.91/1] w-full place-items-center bg-hover-bg text-[11px] text-foreground-faint">
                  {t.noImage}
                </div>
              )}
              <div className="flex flex-col gap-0.5 px-3 py-2">
                <span className="truncate text-[11px] text-foreground-subtle">{host}</span>
                <span className="truncate text-xs font-medium text-foreground">
                  {fields.title || t.title}
                </span>
                <span className="line-clamp-2 text-[11px] text-foreground-muted">
                  {fields.description}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              {t.facebook}
            </p>
            <div className="overflow-hidden rounded-md border border-border bg-background">
              {fields.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fields.image} alt="" className="aspect-[1.91/1] w-full object-cover" />
              ) : (
                <div className="grid aspect-[1.91/1] w-full place-items-center bg-hover-bg text-[11px] text-foreground-faint">
                  {t.noImage}
                </div>
              )}
              <div className="px-3 py-2">
                <p className="truncate text-[10px] uppercase tracking-wide text-foreground-subtle">
                  {fields.siteName || host}
                </p>
                <p className="truncate text-xs font-medium text-foreground">
                  {fields.title || t.title}
                </p>
                <p className="line-clamp-2 text-[11px] text-foreground-muted">{fields.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <Tags className="h-4 w-4 text-foreground-faint" />
          <span className="text-xs font-medium text-foreground">{t.output}</span>
          <div className="ml-auto flex items-center gap-1">
            <CopyButton value={html} />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() =>
                downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "meta-tags.html")
              }
            >
              <Download className="h-3.5 w-3.5" />
              {t.download}
            </Button>
          </div>
        </header>
        <pre className="max-h-[320px] overflow-auto px-3.5 py-3 font-mono text-[12px] leading-relaxed text-foreground">
          {html}
        </pre>
      </section>

      <section className="rounded-lg border border-border bg-surface px-4 py-3">
        <p className="mb-2 text-xs font-medium text-foreground">{t.audit}</p>
        {issues.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-green-fg">
            <CircleCheck className="h-3.5 w-3.5" />
            {t.allGood}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.code}`} className="flex items-start gap-2 text-xs">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-fg" />
                <span className="text-foreground-muted">
                  {t.issues[issue.code](issue.length, issue.limit)}
                </span>
                <Badge variant="outline" size="xs" className="ml-auto shrink-0">
                  {issue.field}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-faint">
        <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
