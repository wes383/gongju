"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  detectFormat,
  FORMAT_EXTENSIONS,
  parseSubtitle,
  serialize,
  type SubtitleFormat,
} from "@/lib/subtitle";
import { baseName, downloadBlob } from "@/lib/files";
import { useCopy } from "@/components/locale-provider";
import { UploadFileButton } from "@/components/tools/file-drop";
import {
  DualPane,
  OptionBar,
  PaneButton,
  SampleButton,
  Segmented,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    target: "输出格式",
    detected: "识别为",
    crlf: "CRLF 换行",
    keepHeader: "保留 ASS 样式",
    inputLabel: "字幕原文",
    outputLabel: "转换结果",
    placeholder: "粘贴内容，或把字幕文件拖进来…",
    noCues: "没有识别到字幕条目，检查时间轴行是否完整（SRT 需要 `-->` 分隔的开始与结束时间）。",
    plainNote: "纯文本没有时间轴，导出带时间的格式时会按每行长度生成占位时间码。",
    assNote: "ASS 的内联覆盖标签（{\\...}）会在解析时去掉，样式头原样保留。",
    cues: "条",
    download: "下载",
    sample: `1
00:00:01,000 --> 00:00:03,200
夜色落在这座城市上

2
00:00:03,400 --> 00:00:06,000
没有人记得它原来的样子。`,
  },
  en: {
    target: "Target format",
    detected: "Detected",
    crlf: "CRLF line endings",
    keepHeader: "Keep ASS styles",
    inputLabel: "Subtitle source",
    outputLabel: "Converted",
    placeholder: "Paste content, or drop a subtitle file here…",
    noCues: "No cues found. Check the timing lines — SRT needs `-->` between start and end.",
    plainNote:
      "Plain text has no timing; exporting to a timed format generates placeholder timecodes from each line's length.",
    assNote: "ASS inline override tags ({\\...}) are dropped on parse; the style header is kept verbatim.",
    cues: "cues",
    download: "Download",
    sample: `1
00:00:01,000 --> 00:00:03,200
Night falls over the city

2
00:00:03,400 --> 00:00:06,000
and no one remembers how it used to look.`,
  },
};

const TARGETS: SubtitleFormat[] = ["srt", "vtt", "ass", "sbv", "lrc", "txt"];

export function SubtitleConvertTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [target, setTarget] = React.useState<SubtitleFormat>("vtt");
  const [crlf, setCrlf] = React.useState(false);
  const [keepStyles, setKeepStyles] = React.useState(true);

  const loadText = (text: string, name = "") => {
    setInput(text);
    setFileName(name);
  };

  const doc = React.useMemo(
    () => (input.trim() ? parseSubtitle(input) : null),
    [input]
  );
  const detected = React.useMemo(
    () => (input.trim() ? detectFormat(input) : null),
    [input]
  );

  const output = React.useMemo(() => {
    if (!doc || doc.cues.length === 0) return "";
    return serialize(doc.cues, target, {
      header: keepStyles ? doc.header : undefined,
      crlf,
    });
  }, [doc, target, keepStyles, crlf]);

  const download = () => {
    if (!output) return;
    downloadBlob(
      new Blob([output], { type: "text/plain;charset=utf-8" }),
      `${baseName(fileName, "subtitle")}.${FORMAT_EXTENSIONS[target]}`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.target}
          value={target}
          onChange={setTarget}
          options={TARGETS.map((format) => ({ value: format, label: format.toUpperCase() }))}
        />
        <Toggle checked={crlf} onChange={setCrlf} label={t.crlf} />
        {doc?.format === "ass" && (
          <Toggle checked={keepStyles} onChange={setKeepStyles} label={t.keepHeader} />
        )}
        {detected && (
          <span className="ml-auto text-xs text-foreground-faint">
            {t.detected} <span className="font-mono text-foreground-muted">{detected.toUpperCase()}</span>
          </span>
        )}
      </OptionBar>

      {input.trim() !== "" && doc?.cues.length === 0 && <WarningNote>{t.noCues}</WarningNote>}

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.placeholder}
        inputActions={
          <>
            <UploadFileButton onText={loadText} />
            <SampleButton onClick={() => loadText(t.sample)} />
          </>
        }
        inputDrop={{ onText: loadText }}
        outputActions={
          <PaneButton onClick={download} title={t.download}>
            <Download className="h-3.5 w-3.5" />
            <span>{t.download}</span>
          </PaneButton>
        }
        onClear={() => loadText("")}
        inputFooter={
          doc ? (
            <>
              {fileName && (
                <span className="truncate" title={fileName}>
                  {fileName}
                </span>
              )}
              <span>
                {doc.cues.length} {t.cues}
              </span>
            </>
          ) : null
        }
        outputFooter={
          output ? (
            <span>
              {doc?.cues.length} {t.cues} · {target.toUpperCase()}
            </span>
          ) : null
        }
      />

      {doc?.format === "txt" && (
        <p className="text-xs leading-relaxed text-foreground-subtle">{t.plainNote}</p>
      )}
      {doc?.format === "ass" && (
        <p className="text-xs leading-relaxed text-foreground-subtle">{t.assNote}</p>
      )}
    </div>
  );
}
