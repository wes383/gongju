"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { decodeUrl, encodeUrl, safe, type UrlEncodeMode } from "@/lib/encoding";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const COPY = {
  zh: {
    encode: "编码",
    decode: "解码",
    component: "参数值",
    componentHint: "encodeURIComponent：& = ? / 也会被编码",
    uri: "整条 URL",
    uriHint: "encodeURI：保留 :/?#[]@ 等结构字符",
    form: "表单",
    formHint: "application/x-www-form-urlencoded：空格转 +",
    plain: "原文",
    encoded: "已编码",
    inputPlaceholder: "输入需要编码的文本或 URL…",
    decodePlaceholder: "粘贴含 %XX 的字符串…",
    sample: "示例",
    sampleText: "https://example.com/搜索?q=你好 世界&tag=编码 解码",
    noteTitle: "怎么选：",
    note: "只编码查询参数的值用「参数值」；整条链接要放进另一个 URL 里用「整条 URL」；对接表单提交或后端按 + 解析空格的场景用「表单」。",
  },
  en: {
    encode: "Encode",
    decode: "Decode",
    component: "Component",
    componentHint: "encodeURIComponent: & = ? / are escaped too",
    uri: "Full URL",
    uriHint: "encodeURI: keeps structural characters such as :/?#[]@",
    form: "Form",
    formHint: "application/x-www-form-urlencoded: spaces become +",
    plain: "Text",
    encoded: "Encoded",
    inputPlaceholder: "Text or URL to encode…",
    decodePlaceholder: "Paste a string containing %XX…",
    sample: "Sample",
    sampleText: "https://example.com/search?q=hello world&tag=url encode",
    noteTitle: "Which one:",
    note: "Use Component for a single query value, Full URL when the link is embedded in another URL, and Form for form posts or backends that read + as a space.",
  },
};

export function UrlEncodeTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("encode");
  const [scope, setScope] = React.useState<UrlEncodeMode>("component");

  const { value: output, error } = React.useMemo(
    () =>
      safe(() => {
        if (!input) return "";
        return mode === "encode" ? encodeUrl(input, scope) : decodeUrl(input, scope);
      }),
    [input, mode, scope]
  );

  const swap = () => {
    if (output) setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.encode}
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: t.encode },
            { value: "decode", label: t.decode },
          ]}
        />
        <Segmented
          ariaLabel={t.component}
          value={scope}
          onChange={setScope}
          options={[
            { value: "component", label: t.component, hint: t.componentHint },
            { value: "uri", label: t.uri, hint: t.uriHint },
            { value: "form", label: t.form, hint: t.formHint },
          ]}
        />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "encode" ? t.plain : t.encoded}
        outputLabel={mode === "encode" ? t.encoded : t.plain}
        inputPlaceholder={mode === "encode" ? t.inputPlaceholder : t.decodePlaceholder}
        inputActions={
          <PaneButton onClick={() => setInput(t.sampleText)} title={t.sample}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.sample}</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
      />

      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-foreground-muted">
        <span className="font-medium text-foreground">{t.noteTitle}</span>
        {t.note}
      </div>
    </div>
  );
}
