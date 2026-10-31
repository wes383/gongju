"use client";

import * as React from "react";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
  WarningNote,
} from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { parseCurl, toCode, CURL_SAMPLE, type CodeTarget } from "@/lib/curl";

const COPY = {
  zh: {
    target: "输出",
    inputLabel: "cURL 命令",
    outputLabel: "代码",
    inputPlaceholder: "粘贴 curl 命令，支持多行与反斜杠续行",
    sample: "示例",
    notCurl: "这看起来不是 curl 命令，请以 curl 开头",
    noUrl: "命令里没有找到 URL",
    empty: "命令是空的",
    ignored: (flags: string[]) => `已忽略这些选项：${flags.join(" ")}`,
    note: "解析在浏览器内完成，命令不会发出去；支持 -X / -H / -d / -F / -u / -b / -A / -e，以及引号与反斜杠续行。生成的是可直接粘贴运行的代码骨架。",
  },
  en: {
    target: "Output",
    inputLabel: "cURL command",
    outputLabel: "Code",
    inputPlaceholder: "Paste a curl command; multi-line and backslash continuations work",
    sample: "Sample",
    notCurl: "This does not look like a curl command — it should start with curl",
    noUrl: "No URL found in the command",
    empty: "The command is empty",
    ignored: (flags: string[]) => `Ignored options: ${flags.join(" ")}`,
    note: "Parsed in your browser and never sent anywhere; handles -X / -H / -d / -F / -u / -b / -A / -e plus quoting and line continuations. The result is a runnable code skeleton.",
  },
};

export function CurlToCodeTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState(CURL_SAMPLE);
  const [target, setTarget] = React.useState<CodeTarget>("fetch");

  const parsed = React.useMemo(() => parseCurl(input), [input]);

  const error = React.useMemo(() => {
    if (parsed.ok) return null;
    const map: Record<string, string> = {
      empty: t.empty,
      notCurl: t.notCurl,
      noUrl: t.noUrl,
    };
    return new Error(map[parsed.message] ?? parsed.message);
  }, [parsed, t.empty, t.notCurl, t.noUrl]);

  const output = React.useMemo(
    () => (parsed.ok ? toCode(parsed.request, target) : ""),
    [parsed, target]
  );

  const ignored = parsed.ok ? parsed.request.ignored : [];

  return (
    <div className="flex flex-col gap-3">
      <OptionBar>
        <Segmented
          ariaLabel={t.target}
          value={target}
          onChange={setTarget}
          options={[
            { value: "fetch", label: "fetch" },
            { value: "axios", label: "axios" },
            { value: "python", label: "Python" },
            { value: "go", label: "Go" },
          ]}
        />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        error={error}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.inputPlaceholder}
        inputActions={<SampleButton onClick={() => setInput(CURL_SAMPLE)} label={t.sample} />}
        onClear={() => setInput("")}
        inputFooter={
          <span>
            {parsed.ok ? `${parsed.request.method} ${parsed.request.url}` : ""}
          </span>
        }
        outputFooter={<span>{output.split("\n").length} lines</span>}
      />

      {ignored.length > 0 && (
        <WarningNote>{t.ignored(ignored)}</WarningNote>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
