"use client";

import * as React from "react";
import { ArrowRightLeft, Sparkles } from "lucide-react";
import { decodeBase64, encodeBase64 } from "@/lib/encoding";
import { safe } from "@/lib/errors";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const COPY = {
  zh: {
    encode: "编码",
    decode: "解码",
    urlSafe: "URL 安全字符集",
    urlSafeHint: "把 + / 替换为 - _，并去掉尾部等号，可直接放进 URL",
    lineBreaks: "76 字符换行",
    lineBreaksHint: "MIME 风格的折行，便于邮件与长文本阅读",
    encodeHint: "支持 UTF-8 中文与 emoji",
    decodeHint: "自动忽略空白与换行",
    plain: "原文",
    base64: "Base64",
    inputPlaceholder: "输入要编码的文本…",
    base64Placeholder: "粘贴 Base64 字符串，例如 SGVsbG8=",
    sample: "示例",
    sampleText: "GongJu — Base64 编解码 🚀",
    note: "编码在 UTF-8 字节层面进行，因此中文、emoji 都能正确往返。",
  },
  en: {
    encode: "Encode",
    decode: "Decode",
    urlSafe: "URL-safe alphabet",
    urlSafeHint: "Use - and _ instead of + and /, and drop the trailing padding",
    lineBreaks: "Wrap at 76 chars",
    lineBreaksHint: "MIME-style folding, easier to read in mail and long text",
    encodeHint: "Handles UTF-8 text and emoji",
    decodeHint: "Whitespace and line breaks are ignored",
    plain: "Text",
    base64: "Base64",
    inputPlaceholder: "Text to encode…",
    base64Placeholder: "Paste a Base64 string, e.g. SGVsbG8=",
    sample: "Sample",
    sampleText: "GongJu — Base64 encode 🚀",
    note: "Encoding works on UTF-8 bytes, so Chinese text and emoji round-trip correctly.",
  },
};

export function Base64Tool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("encode");
  const [urlSafe, setUrlSafe] = React.useState(false);
  const [lineBreaks, setLineBreaks] = React.useState(false);

  const { value: output, error } = React.useMemo(
    () =>
      safe(() => {
        if (!input) return "";
        return mode === "encode"
          ? encodeBase64(input, { urlSafe, lineBreaks })
          : decodeBase64(input);
      }),
    [input, mode, urlSafe, lineBreaks]
  );

  const sample = t.sampleText;

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
        {mode === "encode" && (
          <>
            <Toggle
              checked={urlSafe}
              onChange={setUrlSafe}
              label={t.urlSafe}
              hint={t.urlSafeHint}
            />
            <Toggle
              checked={lineBreaks}
              onChange={setLineBreaks}
              label={t.lineBreaks}
              hint={t.lineBreaksHint}
            />
          </>
        )}
        <span className="ml-auto text-xs text-foreground-subtle">
          {mode === "encode" ? t.encodeHint : t.decodeHint}
        </span>
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "encode" ? t.plain : t.base64}
        outputLabel={mode === "encode" ? t.base64 : t.plain}
        inputPlaceholder={mode === "encode" ? t.inputPlaceholder : t.base64Placeholder}
        inputActions={
          <PaneButton
            onClick={() => setInput(mode === "encode" ? sample : encodeBase64(sample))}
            title={t.sample}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.sample}</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
      />

      <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        {t.note}
      </p>
    </div>
  );
}
