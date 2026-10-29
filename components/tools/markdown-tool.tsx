"use client";

import * as React from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import TurndownService from "turndown";
import { safe } from "@/lib/encoding";
import {
  CopyButton,
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "md2html" | "html2md";

const SAMPLE_MD = `# 标题

这是一段 **加粗**、*斜体* 和 \`行内代码\`。

- 列表项一
- 列表项二

> 引用文本

\`\`\`js
console.log("hello");
\`\`\`
`;

function createTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
  return td;
}

export function MarkdownTool() {
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("md2html");
  const [breaks, setBreaks] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(true);

  const { value: output, error } = React.useMemo(
    () =>
      safe(() => {
        if (!input.trim()) return "";
        if (mode === "md2html") {
          const html = marked.parse(input, { async: false, gfm: true, breaks }) as string;
          return html.trim();
        }
        return createTurndown().turndown(input).trim();
      }),
    [input, mode, breaks]
  );

  const swap = () => {
    if (output) setInput(output);
    setMode((m) => (m === "md2html" ? "html2md" : "md2html"));
  };

  // 预览内容必须净化：Markdown 里可以塞入任意 HTML
  const previewHtml = React.useMemo(() => {
    if (!output || typeof window === "undefined") return "";
    return DOMPurify.sanitize(output, { USE_PROFILES: { html: true } });
  }, [output]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "md2html", label: "Markdown → HTML" },
            { value: "html2md", label: "HTML → Markdown" },
          ]}
        />
        {mode === "md2html" && (
          <>
            <Toggle
              checked={breaks}
              onChange={setBreaks}
              label="单个换行即换行"
              hint="GFM 的 breaks 选项，常用于聊天 / 评论场景"
            />
            <Toggle checked={showPreview} onChange={setShowPreview} label="显示预览" />
          </>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "md2html" ? "Markdown" : "HTML"}
        outputLabel={mode === "md2html" ? "HTML" : "Markdown"}
        inputPlaceholder={mode === "md2html" ? "输入 Markdown…" : "粘贴 HTML 片段…"}
        inputActions={
          <PaneButton
            onClick={() =>
              setInput(
                mode === "md2html"
                  ? SAMPLE_MD
                  : '<h1>标题</h1><p>这是 <strong>加粗</strong> 与 <a href="#">链接</a>。</p><ul><li>项目一</li><li>项目二</li></ul>'
              )
            }
          >
            示例
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
      />

      {mode === "md2html" && showPreview && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 items-center border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              预览
            </span>
            <div className="ml-auto">
              <CopyButton value={output ?? ""} label="复制 HTML" />
            </div>
          </header>
          {output ? (
            <div
              className="md-preview max-h-[560px] overflow-auto px-5 py-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="px-5 py-8 text-center text-sm text-foreground-subtle">
              输入 Markdown 后在这里查看渲染效果
            </p>
          )}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">
        渲染使用 marked（GFM 语法），反向转换使用 turndown。预览区经过 DOMPurify 净化，
        内联脚本与事件属性会被移除。
      </p>
    </div>
  );
}
