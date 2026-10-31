"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  SampleButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import {
  HEADER_PRESETS,
  headerPresetValue,
  parseHttpHeaders,
  serializeHeaders,
  toCurlHeaders,
  type HeaderGroup,
  type HeaderIssueReason,
  type HeaderPreset,
} from "@/lib/http-header";

const COPY = {
  zh: {
    mode: "模式",
    parse: "解析",
    build: "生成",
    headers: "HTTP Header",
    placeholder: "粘贴原始 Header，一行一条，例如 Content-Type: application/json",
    parsed: "解析结果",
    noEntries: "还没有可识别的 Header",
    empty: "粘贴一段 Header 后会逐条列出",
    name: "名称",
    value: "值",
    output: "标准写法",
    curl: "curl 命令",
    issues: "格式提醒",
    count: (n: number) => `${n} 条`,
    groups: {
      request: "请求头",
      response: "响应头",
      cors: "跨域 CORS",
      security: "安全响应头",
    } as Record<HeaderGroup, string>,
    note: "解析时按 CRLF / LF 分行，行首空格视为续行；生成时只用已勾选的项。",
    buildEmpty: "勾选任意一项即可生成",
    issue: {
      noColon: "缺少冒号，无法识别",
      emptyName: "冒号前没有名称",
      invalidName: "名称含非法字符（只允许字母、数字和 !#$%&'*+-.^_`|~）",
      spaceBeforeColon: "冒号前有空格，规范写法不应有",
      orphanContinuation: "续行前面没有 Header",
    } as Record<HeaderIssueReason, string>,
  },
  en: {
    mode: "Mode",
    parse: "Parse",
    build: "Build",
    headers: "HTTP headers",
    placeholder: "Paste raw headers, one per line, e.g. Content-Type: application/json",
    parsed: "Parsed headers",
    noEntries: "No headers recognised yet",
    empty: "Paste a header block and it will be listed line by line",
    name: "Name",
    value: "Value",
    output: "Normalised",
    curl: "curl command",
    issues: "Format warnings",
    count: (n: number) => `${n} header${n === 1 ? "" : "s"}`,
    groups: {
      request: "Request",
      response: "Response",
      cors: "CORS",
      security: "Security",
    } as Record<HeaderGroup, string>,
    note: "Parsing splits on CRLF or LF and treats a leading space as a folded line; building only uses the rows you tick.",
    buildEmpty: "Tick a row to start building",
    issue: {
      noColon: "No colon, cannot be parsed",
      emptyName: "Nothing before the colon",
      invalidName: "Name has invalid characters (letters, digits and !#$%&'*+-.^_`|~ only)",
      spaceBeforeColon: "Space before the colon, which the spec does not allow",
      orphanContinuation: "A continuation line with no header above it",
    } as Record<HeaderIssueReason, string>,
  },
};

const SAMPLE = `Content-Type: application/json; charset=utf-8
Cache-Control: no-store
X-Request-Id: 8f3a1c7e
Set-Cookie: session=abc123; Path=/; HttpOnly; SameSite=Lax`;

const GROUP_ORDER: HeaderGroup[] = ["request", "response", "cors", "security"];

export function HttpHeaderTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<"parse" | "build">("parse");
  const [raw, setRaw] = React.useState("");

  // Builder state: which presets are on, plus any value the user edited.
  // Untouched rows fall back to the preset default for the active locale, so
  // switching language also switches locale-specific examples.
  const [rows, setRows] = React.useState<Record<string, { on: boolean; value?: string }>>({});

  const rowOf = (preset: HeaderPreset) => ({
    on: rows[preset.id]?.on ?? false,
    value: rows[preset.id]?.value ?? headerPresetValue(preset, locale),
  });

  const { value: parsed, error } = React.useMemo(
    () => safe(() => (raw.trim() ? parseHttpHeaders(raw) : null)),
    [raw]
  );

  const selected = HEADER_PRESETS.filter((preset) => rowOf(preset).on).map((preset) => ({
    name: preset.name,
    value: rowOf(preset).value,
  }));
  const built = serializeHeaders(selected);

  const setRow = (id: string, patch: Partial<{ on: boolean; value: string }>) =>
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { on: false }), ...patch } }));

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        ariaLabel={t.mode}
        value={mode}
        onChange={setMode}
        options={[
          { value: "parse", label: t.parse },
          { value: "build", label: t.build },
        ]}
      />

      {mode === "parse" ? (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-11 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.headers}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <SampleButton onClick={() => setRaw(SAMPLE)} />
                <ClearButton onClick={() => setRaw("")} />
              </div>
            </header>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              placeholder={t.placeholder}
              aria-label={t.headers}
              className="min-h-[180px] w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
            />
            <footer className="flex h-8 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
              {parsed && <span>{t.count(parsed.entries.length)}</span>}
              {parsed && parsed.issues.length > 0 && (
                <span className="ml-auto text-orange-fg">
                  {parsed.issues.length} {t.issues}
                </span>
              )}
            </footer>
          </div>

          {error && raw.trim() !== "" && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

          {parsed && parsed.issues.length > 0 && (
            <div className="rounded-md border border-orange-border bg-orange-soft px-3 py-2 text-xs leading-relaxed text-orange-fg">
              <p className="font-medium">{t.issues}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {parsed.issues.map((issue, index) => (
                  <li key={index} className="break-all">
                    <span className="font-mono text-[11px]">L{issue.line}</span>{" "}
                    {t.issue[issue.reason]} — <code className="font-mono">{issue.text}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.parsed}
              </span>
              {parsed && parsed.entries.length > 0 && (
                <div className="ml-auto flex items-center gap-1">
                  <CopyButton value={serializeHeaders(parsed.entries)} size="icon-xs" />
                </div>
              )}
            </header>
            {!parsed || parsed.entries.length === 0 ? (
              <p className="px-4 py-3 text-xs text-foreground-subtle">
                {raw.trim() ? t.noEntries : t.empty}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {parsed.entries.map((entry, index) => (
                  <li key={`${entry.name}-${index}`} className="flex items-start gap-3 px-4 py-2">
                    <span className="w-[38%] shrink-0 break-all font-mono text-xs text-foreground">
                      {entry.name}
                    </span>
                    <span className="min-w-0 flex-1 break-all font-mono text-xs text-foreground-muted">
                      {entry.value || "—"}
                    </span>
                    <CopyButton value={`${entry.name}: ${entry.value}`} size="icon-xs" />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {parsed && parsed.entries.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <OutputBlock title={t.output} value={serializeHeaders(parsed.entries)} />
              <OutputBlock title={t.curl} value={toCurlHeaders(parsed.entries)} />
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {GROUP_ORDER.map((group) => (
              <React.Fragment key={group}>
                <header className="flex h-9 items-center border-b border-border bg-hover-bg px-3">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                    {t.groups[group]}
                  </span>
                </header>
                <ul className="divide-y divide-border">
                  {HEADER_PRESETS.filter((preset) => preset.group === group).map((preset) => {
                    const row = rowOf(preset);
                    return (
                      <li key={preset.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-col gap-0.5 sm:w-[42%]">
                          <Toggle
                            checked={row.on}
                            onChange={(on) => setRow(preset.id, { on })}
                            label={preset.name}
                          />
                          <span className="pl-11 text-[11px] text-foreground-subtle">
                            {locale === "zh" ? preset.zh : preset.en}
                          </span>
                        </div>
                        <Input
                          value={row.value}
                          onChange={(e) => setRow(preset.id, { value: e.target.value })}
                          disabled={!row.on}
                          size="xs"
                          spellCheck={false}
                          aria-label={preset.name}
                          className="font-mono sm:ml-auto"
                        />
                      </li>
                    );
                  })}
                </ul>
              </React.Fragment>
            ))}
          </div>

          {selected.length === 0 ? (
            <p className="text-xs text-foreground-subtle">{t.buildEmpty}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <OutputBlock title={t.output} value={built} />
              <OutputBlock title={t.curl} value={toCurlHeaders(selected)} />
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

function OutputBlock({ title, value }: { title: string; value: string }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex h-10 items-center gap-2 border-b border-border px-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
          {title}
        </span>
        <div className="ml-auto">
          <CopyButton value={value} size="icon-xs" />
        </div>
      </header>
      <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-foreground">
        {value}
      </pre>
    </section>
  );
}
