"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ClearButton, CopyButton, ErrorNote, SampleButton } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { parseUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    sample: "示例",
    placeholder: "粘贴或输入 URL，例如 https://example.com:8443/a/b?x=1&y=你好#top",
    url: "URL",
    parts: "组成部分",
    params: "查询参数",
    protocol: "协议",
    username: "账号",
    password: "密码",
    hostname: "域名",
    port: "端口",
    pathname: "路径",
    search: "查询串",
    hash: "锚点",
    origin: "来源",
    href: "规范化",
    noParams: "没有查询参数",
    noValue: "(无值)",
    decoded: "已解码",
    assumed: "未写协议，按 https:// 解析",
    defaultPort: "默认端口",
    chars: "字符",
    paramsCount: (n: number) => `${n} 个参数`,
    note: "查询参数按 URLSearchParams 解码（+ 视为空格），重复的键按出现顺序逐条保留。",
  },
  en: {
    sample: "Sample",
    placeholder: "Paste a URL, e.g. https://example.com:8443/a/b?x=1&y=hello#top",
    url: "URL",
    parts: "Components",
    params: "Query parameters",
    protocol: "Protocol",
    username: "Username",
    password: "Password",
    hostname: "Hostname",
    port: "Port",
    pathname: "Path",
    search: "Query",
    hash: "Fragment",
    origin: "Origin",
    href: "Normalised",
    noParams: "No query parameters",
    noValue: "(no value)",
    decoded: "decoded",
    assumed: "No scheme given, parsed as https://",
    defaultPort: "default",
    chars: "chars",
    paramsCount: (n: number) => `${n} parameter${n === 1 ? "" : "s"}`,
    note: "Parameters are decoded with URLSearchParams (a + counts as a space) and duplicate keys are kept in order.",
  },
};

const SAMPLE = "https://user:secret@example.com:8443/api/v1/search?q=hello+world&tag=a&tag=b&empty=#results";

function Part({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string;
  fallback?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <span className="w-20 shrink-0 font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 break-all font-mono text-xs",
          value ? "text-foreground" : "text-foreground-faint"
        )}
      >
        {value || fallback || "—"}
      </span>
    </div>
  );
}

export function UrlParserTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState("");

  const { value: data, error } = React.useMemo(
    () => safe(() => (input.trim() ? parseUrl(input) : null)),
    [input]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.url}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SampleButton onClick={() => setInput(SAMPLE)} />
            <ClearButton onClick={() => setInput("")} />
          </div>
        </header>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder={t.placeholder}
          aria-label={t.url}
          className="min-h-[92px] w-full resize-y break-all bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
        />
        <footer className="flex h-8 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
          <span>
            {input.trim().length} {t.chars}
          </span>
          {data && <span className="ml-auto">{t.paramsCount(data.params.length)}</span>}
          {data?.assumedScheme && <span className="text-orange-fg">{t.assumed}</span>}
        </footer>
      </div>

      {error && input.trim() !== "" && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.parts}
              </span>
              <div className="ml-auto">
                <CopyButton value={data.href} size="icon-xs" />
              </div>
            </header>
            <div className="divide-y divide-border">
              <Part label={t.protocol} value={data.protocol} />
              {data.username && <Part label={t.username} value={data.username} />}
              {data.password && <Part label={t.password} value={data.password} />}
              <Part label={t.hostname} value={data.hostname} />
              <Part label={t.port} value={data.port} fallback={t.defaultPort} />
              <Part label={t.pathname} value={data.pathname} />
              <Part label={t.search} value={data.search} />
              <Part label={t.hash} value={data.hash} />
              <Part label={t.origin} value={data.origin} />
              <Part label={t.href} value={data.href} />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.params}
              </span>
              {data.search && (
                <div className="ml-auto">
                  <CopyButton value={data.search.replace(/^\?/, "")} size="icon-xs" />
                </div>
              )}
            </header>
            {data.params.length === 0 ? (
              <p className="px-4 py-3 text-xs text-foreground-subtle">{t.noParams}</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.params.map((param, index) => (
                  <li
                    key={`${param.name}-${index}`}
                    className="flex items-start gap-3 px-4 py-2"
                  >
                    <span className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                      {param.name}
                    </span>
                    <span className="min-w-0 flex-[1.4] break-all font-mono text-xs text-foreground-muted">
                      {param.hasValue ? param.value || "—" : t.noValue}
                    </span>
                    {param.encoded && (
                      <Badge variant="info" size="xs">
                        {t.decoded}
                      </Badge>
                    )}
                    <CopyButton value={param.raw} size="icon-xs" />
                  </li>
                ))}
              </ul>
            )}
            <footer className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-foreground-subtle">
              {t.note}
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
