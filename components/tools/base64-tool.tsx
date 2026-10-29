"use client";

import * as React from "react";
import { ArrowRightLeft, Sparkles } from "lucide-react";
import { decodeBase64, encodeBase64, safe } from "@/lib/encoding";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const SAMPLE = "GongJu — Base64 编解码 🚀";

export function Base64Tool() {
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

  const swap = () => {
    if (output) setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: "编码" },
            { value: "decode", label: "解码" },
          ]}
        />
        {mode === "encode" && (
          <>
            <Toggle
              checked={urlSafe}
              onChange={setUrlSafe}
              label="URL 安全字符集"
              hint="把 + / 替换为 - _，并去掉尾部等号，可直接放进 URL"
            />
            <Toggle
              checked={lineBreaks}
              onChange={setLineBreaks}
              label="76 字符换行"
              hint="MIME 风格的折行，便于邮件与长文本阅读"
            />
          </>
        )}
        <span className="ml-auto text-xs text-foreground-subtle">
          {mode === "encode" ? "支持 UTF-8 中文与 emoji" : "自动忽略空白与换行"}
        </span>
      </OptionBar>
      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "encode" ? "原文" : "Base64"}
        outputLabel={mode === "encode" ? "Base64" : "原文"}
        inputPlaceholder={
          mode === "encode" ? "输入要编码的文本…" : "粘贴 Base64 字符串，例如 SGVsbG8="
        }
        inputActions={
          <PaneButton
            onClick={() => setInput(mode === "encode" ? SAMPLE : encodeBase64(SAMPLE))}
            title="填入示例"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>示例</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
      />

      <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        编码在 UTF-8 字节层面进行，因此中文、emoji 都能正确往返。
      </p>
    </div>
  );
}
