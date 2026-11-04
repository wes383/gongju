"use client";

import * as React from "react";
import { Download, FileCode2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  InputArea,
  OptionBar,
  OptionField,
  OutputArea,
  Pane,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { downloadBlob } from "@/lib/files";
import {
  SITEMAP_ENTRY_LIMIT,
  buildRobots,
  buildSitemap,
  isAbsoluteUrl,
  parseSitemapLines,
} from "@/lib/robots-txt";

const COPY = {
  zh: {
    mode: "文件",
    robots: "robots.txt",
    sitemap: "sitemap.xml",
    agent: "User-agent",
    agentHint: "多个爬虫用逗号或换行分隔，* 表示全部",
    disallow: "禁止抓取",
    allow: "允许抓取",
    pathHint: "每行一条路径，会自动补上开头的 /",
    crawlDelay: "抓取间隔（秒）",
    sitemaps: "Sitemap 地址",
    host: "Host",
    hostHint: "可选，Yandex 使用",
    baseUrl: "站点地址",
    entries: "页面列表",
    entriesHint: "每行一条，可以写相对路径；也可以追加 | 更新时间 | 频率 | 优先级",
    output: "生成结果",
    download: "下载",
    sample: "示例",
    clear: "清空",
    count: (total: string, skipped: string) => `${total} 条，跳过 ${skipped} 条`,
    skipped: "这几行没生成条目",
    badBase: "先把站点地址填成完整的 https:// 地址，才会生成条目",
    tooMany: `单个 sitemap 最多 ${SITEMAP_ENTRY_LIMIT} 条，超出部分不会写入，请拆分并改用 sitemap index`,
    badSitemapUrl: "只有完整的 http(s) 地址会写进 Sitemap 行，其余的已忽略",
    empty: "填写左侧内容后，这里会实时生成",
    note: "robots.txt 只控制抓取，不控制收录：想彻底不收录，还要在页面上加 meta name=\"robots\" content=\"noindex\"。sitemap.xml 的 loc 必须是绝对地址，且同一个 sitemap 最多 5 万条、未压缩不超过 50MB。生成的文件建议放在站点根目录。",
  },
  en: {
    mode: "File",
    robots: "robots.txt",
    sitemap: "sitemap.xml",
    agent: "User-agent",
    agentHint: "Separate crawlers with commas or new lines; * means everyone",
    disallow: "Disallow",
    allow: "Allow",
    pathHint: "One path per line; a leading slash is added for you",
    crawlDelay: "Crawl delay (seconds)",
    sitemaps: "Sitemap URLs",
    host: "Host",
    hostHint: "Optional, used by Yandex",
    baseUrl: "Site URL",
    entries: "Pages",
    entriesHint: "One per line, relative paths are fine; append | lastmod | changefreq | priority",
    output: "Output",
    download: "Download",
    sample: "Sample",
    clear: "Clear",
    count: (total: string, skipped: string) => `${total} entries, ${skipped} skipped`,
    skipped: "These lines produced no entry",
    badBase: "Fill in a full https:// site URL first, otherwise no entry can be built",
    tooMany: `A single sitemap holds at most ${SITEMAP_ENTRY_LIMIT} URLs; split the rest into a sitemap index`,
    badSitemapUrl: "Only full http(s) URLs make it onto a Sitemap line; the rest were ignored",
    empty: "Fill the left side and the file appears here",
    note: "robots.txt governs crawling, not indexing: to keep a page out of results you still need meta name=\"robots\" content=\"noindex\". Sitemap locs must be absolute, and one sitemap caps at 50,000 URLs and 50MB uncompressed. Both files belong at the site root.",
  },
};

const ROBOTS_SAMPLE = {
  agent: "*",
  disallow: ["/admin", "/api/private", "/search"],
  allow: ["/api/public"],
  sitemaps: "https://example.com/sitemap.xml",
};

const SITEMAP_SAMPLE = {
  baseUrl: "https://example.com",
  entries:
    "/ | 2026-11-04 | daily | 1.0\n/tools/ | 2026-11-04 | weekly | 0.8\n/tools/token-counter | 2026-11-02 | monthly | 0.6",
};

export function RobotsSitemapTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<"robots" | "sitemap">("robots");

  const [agent, setAgent] = React.useState("*");
  const [disallow, setDisallow] = React.useState(ROBOTS_SAMPLE.disallow.join("\n"));
  const [allow, setAllow] = React.useState(ROBOTS_SAMPLE.allow.join("\n"));
  const [crawlDelay, setCrawlDelay] = React.useState("");
  const [sitemaps, setSitemaps] = React.useState(ROBOTS_SAMPLE.sitemaps);
  const [host, setHost] = React.useState("");

  const [baseUrl, setBaseUrl] = React.useState(SITEMAP_SAMPLE.baseUrl);
  const [entries, setEntries] = React.useState(SITEMAP_SAMPLE.entries);

  const robotsText = React.useMemo(
    () =>
      buildRobots({
        userAgent: agent,
        allow: allow.split("\n"),
        disallow: disallow.split("\n"),
        crawlDelay,
        sitemaps: sitemaps.split("\n"),
        host,
      }),
    [agent, allow, disallow, crawlDelay, sitemaps, host]
  );

  const sitemap = React.useMemo(
    () => parseSitemapLines(entries, baseUrl),
    [entries, baseUrl]
  );
  const sitemapXml = React.useMemo(() => buildSitemap(sitemap.entries), [sitemap.entries]);

  const ignoredSitemapLines = sitemaps
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !isAbsoluteUrl(line)).length;

  const output = mode === "robots" ? robotsText : sitemapXml;
  const format = (value: number) => value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");

  const download = () =>
    downloadBlob(
      new Blob([output], {
        type: mode === "robots" ? "text/plain;charset=utf-8" : "application/xml;charset=utf-8",
      }),
      mode === "robots" ? "robots.txt" : "sitemap.xml"
    );

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={mode}
            onChange={setMode}
            options={[
              { value: "robots" as const, label: t.robots },
              { value: "sitemap" as const, label: t.sitemap },
            ]}
          />
        </OptionField>
        <div className="ml-auto flex items-center gap-0.5">
          <SampleButton
            onClick={() => {
              if (mode === "robots") {
                setAgent(ROBOTS_SAMPLE.agent);
                setDisallow(ROBOTS_SAMPLE.disallow.join("\n"));
                setAllow(ROBOTS_SAMPLE.allow.join("\n"));
                setSitemaps(ROBOTS_SAMPLE.sitemaps);
              } else {
                setBaseUrl(SITEMAP_SAMPLE.baseUrl);
                setEntries(SITEMAP_SAMPLE.entries);
              }
            }}
            label={t.sample}
          />
          <ClearButton
            onClick={() => {
              if (mode === "robots") {
                setAgent("*");
                setDisallow("");
                setAllow("");
                setCrawlDelay("");
                setSitemaps("");
                setHost("");
              } else {
                setEntries("");
              }
            }}
            label={t.clear}
          />
        </div>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-2">
        {mode === "robots" ? (
          <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.agent}</span>
              <Input
                value={agent}
                onChange={(event) => setAgent(event.target.value)}
                aria-label={t.agent}
                spellCheck={false}
                size="xs"
              />
              <span className="text-[11px] text-foreground-faint">{t.agentHint}</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.disallow}</span>
              <InputArea
                value={disallow}
                onChange={(event) => setDisallow(event.target.value)}
                aria-label={t.disallow}
                spellCheck={false}
                className="min-h-[96px] text-xs"
              />
              <span className="text-[11px] text-foreground-faint">{t.pathHint}</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.allow}</span>
              <InputArea
                value={allow}
                onChange={(event) => setAllow(event.target.value)}
                aria-label={t.allow}
                spellCheck={false}
                className="min-h-[72px] text-xs"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] text-foreground-muted">{t.crawlDelay}</span>
                <Input
                  value={crawlDelay}
                  onChange={(event) => setCrawlDelay(event.target.value)}
                  inputMode="numeric"
                  aria-label={t.crawlDelay}
                  size="xs"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] text-foreground-muted">{t.host}</span>
                <Input
                  value={host}
                  onChange={(event) => setHost(event.target.value)}
                  placeholder={t.hostHint}
                  aria-label={t.host}
                  size="xs"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.sitemaps}</span>
              <InputArea
                value={sitemaps}
                onChange={(event) => setSitemaps(event.target.value)}
                aria-label={t.sitemaps}
                spellCheck={false}
                className="min-h-[72px] text-xs"
              />
            </label>

            {ignoredSitemapLines > 0 && (
              <p className="flex items-start gap-1.5 text-[11px] text-yellow-fg">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t.badSitemapUrl}
              </p>
            )}
          </section>
        ) : (
          <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.baseUrl}</span>
              <Input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://example.com"
                aria-label={t.baseUrl}
                spellCheck={false}
                size="xs"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] text-foreground-muted">{t.entries}</span>
              <InputArea
                value={entries}
                onChange={(event) => setEntries(event.target.value)}
                aria-label={t.entries}
                spellCheck={false}
                className="min-h-[260px] text-xs"
              />
              <span className="text-[11px] text-foreground-faint">{t.entriesHint}</span>
            </label>

            {sitemap.entries.length === 0 && entries.trim().length > 0 && (
              <p className="flex items-start gap-1.5 text-[11px] text-yellow-fg">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t.badBase}
              </p>
            )}
            {sitemap.entries.length > SITEMAP_ENTRY_LIMIT && (
              <p className="flex items-start gap-1.5 text-[11px] text-yellow-fg">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t.tooMany}
              </p>
            )}
            {sitemap.skipped.length > 0 && (
              <div className="flex flex-col gap-1 rounded-md border border-border bg-hover-bg px-3 py-2 text-[11px] text-foreground-muted">
                <span>{t.skipped}</span>
                {sitemap.skipped.slice(0, 5).map((line) => (
                  <code key={line} className="truncate font-mono text-[11px] text-foreground-faint">
                    {line}
                  </code>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={mode === "robots" ? t.robots : t.sitemap}
            className="h-full"
            footer={
              mode === "sitemap" ? (
                <span>{t.count(format(sitemap.entries.length), format(sitemap.skipped.length))}</span>
              ) : undefined
            }
            actions={
              <>
                <CopyButton value={output} />
                <Button type="button" size="xs" className="gap-1.5" onClick={download}>
                  <Download className="h-3.5 w-3.5" />
                  {t.download}
                </Button>
              </>
            }
          >
            <OutputArea value={output} placeholder={t.empty} minHeight="min-h-[420px] max-h-[70vh]" clamp />
          </Pane>
        </div>
      </div>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
