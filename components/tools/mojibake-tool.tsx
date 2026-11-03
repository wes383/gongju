"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DualPane, SampleButton, Stats, WarningNote } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import {
  analyseMojibake,
  fixCp1252,
  fixLatin1,
  fixMojibake,
  fixRepeated,
  toMojibake,
  type MojibakeKind,
} from "@/lib/mojibake";

type Mode = "auto" | "latin1" | "cp1252" | "repeat" | "encode";

const COPY = {
  zh: {
    mode: "处理方式",
    auto: "自动修复",
    latin1: "按 Latin-1 还原",
    cp1252: "按 Windows-1252 还原",
    repeat: "递归还原",
    encode: "反向生成乱码",
    input: "乱码文本",
    output: "还原结果",
    inputPlaceholder: "粘贴出现乱码的文字，例如 ä½ å¥½",
    sample: "示例",
    failed: "按这个编码无法还原：其中有字符不属于单字节字符集，换另一种试试",
    kinds: {
      none: "未检测到乱码",
      latin1: "疑似 UTF-8 被当作 Latin-1",
      cp1252: "疑似 UTF-8 被当作 Windows-1252",
      double: "疑似被重复解码",
      lossy: "已出现替换字符",
    } as Record<MojibakeKind, string>,
    lossy: (count: number) =>
      `文本里有 ${count} 个 U+FFFD 替换字符，原始字节在解码时就已经丢失，这部分无法还原`,
    note: "浏览器只能还原「UTF-8 被当成单字节字符集」这一类乱码。UTF-8 被当成 GBK 显示（如浣犲ソ）需要 GBK 编码表，前端没有，无法逆向。",
  },
  en: {
    mode: "Mode",
    auto: "Auto repair",
    latin1: "As Latin-1",
    cp1252: "As Windows-1252",
    repeat: "Repeatedly",
    encode: "Make mojibake",
    input: "Mojibake",
    output: "Recovered",
    inputPlaceholder: "Paste the garbled text, e.g. ä½ å¥½",
    sample: "Sample",
    failed: "This encoding cannot recover the text: some characters are outside the single-byte range. Try another mode.",
    kinds: {
      none: "No mojibake detected",
      latin1: "Looks like UTF-8 read as Latin-1",
      cp1252: "Looks like UTF-8 read as Windows-1252",
      double: "Looks like double-decoded text",
      lossy: "Replacement characters present",
    } as Record<MojibakeKind, string>,
    lossy: (count: number) =>
      `${count} U+FFFD replacement character${count > 1 ? "s" : ""} present — those bytes were lost when the text was decoded and cannot be recovered`,
    note: "Browsers can only reverse “UTF-8 shown in a single-byte charset”. UTF-8 displayed as GBK (e.g. 浣犲ソ) needs a GBK encoder, which browsers do not ship, so this tool does not claim to fix it.",
  },
};

const SAMPLE = toMojibake("这是一段被按 Latin-1 显示的中文，原本是 UTF-8。Hello, 世界!");

export function MojibakeTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("auto");

  const report = React.useMemo(() => analyseMojibake(input), [input]);

  const { output, failed } = React.useMemo(() => {
    if (!input) return { output: "", failed: false };
    if (mode === "auto") return { output: fixMojibake(input).text, failed: false };
    if (mode === "encode") return { output: toMojibake(input), failed: false };
    if (mode === "repeat") return { output: fixRepeated(input), failed: false };
    const fixed = mode === "latin1" ? fixLatin1(input) : fixCp1252(input);
    return { output: fixed ?? "", failed: fixed === null };
  }, [input, mode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground-muted">{t.mode}</span>
        {(
          [
            ["auto", t.auto],
            ["latin1", t.latin1],
            ["cp1252", t.cp1252],
            ["repeat", t.repeat],
            ["encode", t.encode],
          ] as [Mode, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={
              value === mode
                ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg"
                : "rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:bg-hover-bg hover:text-foreground"
            }
          >
            {label}
          </button>
        ))}
        <span className="ml-auto">
          <SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />
        </span>
      </div>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={t.input}
        outputLabel={t.output}
        inputPlaceholder={t.inputPlaceholder}
        inputActions={<SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />}
        onClear={() => setInput("")}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
      />

      {input.trim() !== "" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={report.kind === "none" ? "secondary" : report.kind === "lossy" ? "danger" : "info"}
              size="sm"
              dot
            >
              {t.kinds[report.kind]}
            </Badge>
            {mode === "auto" && report.candidates.length > 0 && (
              <span className="text-[11px] text-foreground-faint">
                {report.candidates.map((candidate) => `${candidate.id} ${candidate.score.toFixed(2)}`).join(" · ")}
              </span>
            )}
          </div>
          {report.replacementChars > 0 && <WarningNote>{t.lossy(report.replacementChars)}</WarningNote>}
          {failed && <WarningNote>{t.failed}</WarningNote>}
        </div>
      )}

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-faint">
        <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
