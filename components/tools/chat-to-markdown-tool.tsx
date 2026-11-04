"use client";

import * as React from "react";
import { Download, FileUp, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OutputArea,
  SampleButton,
  Toggle,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { downloadBlob } from "@/lib/files";
import { chatsToMarkdown, countMessages, parseChats } from "@/lib/chat-export";
import { DEFAULT_TOKENIZER, estimateTokens } from "@/lib/tokens";

const COPY = {
  zh: {
    input: "粘贴对话导出内容",
    output: "Markdown",
    includeSystem: "包含系统提示词",
    site: "对话",
    messages: "消息",
    chars: "字符",
    tokens: "tokens",
    pick: "读取文件",
    sample: "示例",
    clear: "清空",
    download: "下载 .md",
    copy: "复制",
    empty: "支持 ChatGPT 的 conversations.json、Claude 导出，以及带「User: / Assistant:」的纯文本",
    roleUser: "用户",
    roleAssistant: "助手",
    roleSystem: "系统",
    roleTool: "工具",
    note: "ChatGPT 导出是树状结构，这里顺着 current_node 往上还原出你最后看到的对话，被编辑掉的旧分支不会混进来。纯文本模式按「You said / ChatGPT said / User / Assistant / 用户 / 助手」这些行来切换说话人。文件只在本机解析，不上传。",
    sampleText: `用户：
我们把重试逻辑从客户端搬到了网关，客户端只负责透传请求 ID。

助手：
这个改动把重试策略集中到了一处，好处是客户端不必再理解退避算法，坏处是网关成了单点。

用户：
那超时时间应该配在哪一层？

助手：
配在网关，客户端只保留一个略大的总超时兜底。`,
  },
  en: {
    input: "Paste an exported conversation",
    output: "Markdown",
    includeSystem: "Include system prompts",
    site: "chats",
    messages: "messages",
    chars: "characters",
    tokens: "tokens",
    pick: "Load a file",
    sample: "Sample",
    clear: "Clear",
    download: "Download .md",
    copy: "Copy",
    empty: "Works with ChatGPT's conversations.json, Claude exports, and plain text using “User: / Assistant:”",
    roleUser: "User",
    roleAssistant: "Assistant",
    roleSystem: "System",
    roleTool: "Tool",
    note: "The ChatGPT export is a tree, so this walks current_node back to the root and returns the conversation as you last saw it — edited-away branches stay out. Plain text switches speakers on lines like “You said” or “Assistant:”. Everything is parsed on your device.",
    sampleText: `You said:
We moved the retry logic out of the client and into the gateway.

ChatGPT said:
That centralises the retry policy. The client no longer needs to understand backoff, but the gateway becomes a single point of failure.

You said:
Where should the timeout live then?

ChatGPT said:
In the gateway, with a slightly larger overall timeout on the client as a fallback.`,
  },
};

export function ChatToMarkdownTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [text, setText] = React.useState("");
  const [includeSystem, setIncludeSystem] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const parsed = React.useMemo(() => {
    if (!text.trim()) return { value: null, error: null };
    return safe(() => parseChats(text));
  }, [text]);

  const markdown = parsed.value
    ? chatsToMarkdown(parsed.value, {
        includeSystem,
        labels: {
          user: t.roleUser,
          assistant: t.roleAssistant,
          system: t.roleSystem,
          tool: t.roleTool,
        },
      })
    : "";

  const chats = parsed.value?.length ?? 0;
  const messages = parsed.value
    ? parsed.value.reduce((sum, thread) => sum + countMessages(thread, { includeSystem }), 0)
    : 0;

  const loadFile = async (file: File) => {
    const content = await file.text();
    setText(content);
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Toggle checked={includeSystem} onChange={setIncludeSystem} label={t.includeSystem} />
        {parsed.value && (
          <span className="font-mono text-[11px] text-foreground-subtle">
            {chats} {t.site} · {messages} {t.messages} · {markdown.length} {t.chars} · ≈{" "}
            {estimateTokens(markdown, DEFAULT_TOKENIZER).total} {t.tokens}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".json,.txt,.md,application/json,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void loadFile(file);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="gap-1.5"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="h-3.5 w-3.5" />
            {t.pick}
          </Button>
        </div>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.input}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <SampleButton onClick={() => setText(t.sampleText)} label={t.sample} />
              <ClearButton onClick={() => setText("")} label={t.clear} />
            </div>
          </header>
          <InputArea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t.empty}
            className="min-h-[360px] text-xs"
          />
        </section>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.output}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <CopyButton value={markdown} label={t.copy} disabled={!markdown} />
              <Button
                type="button"
                size="xs"
                className="gap-1.5"
                disabled={!markdown}
                onClick={() =>
                  downloadBlob(
                    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
                    "chat.md"
                  )
                }
              >
                <Download className="h-3.5 w-3.5" />
                {t.download}
              </Button>
            </div>
          </header>

          {parsed.error ? (
            <div className="p-3">
              <ErrorNote>{errorText(parsed.error, locale)}</ErrorNote>
            </div>
          ) : (
            <OutputArea value={markdown} minHeight="min-h-[360px] max-h-[60vh]" />
          )}
        </section>
      </div>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <MessagesSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
