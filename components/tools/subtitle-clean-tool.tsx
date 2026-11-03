"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  FORMAT_EXTENSIONS,
  parseSubtitle,
  serialize,
  type SubtitleFormat,
} from "@/lib/subtitle";
import {
  cleanCues,
  cueStats,
  DEFAULT_CLEAN,
  type BreakMode,
  type CleanOptions,
  type PunctuationMode,
} from "@/lib/subtitle-text";
import { baseName, downloadBlob } from "@/lib/files";
import { Input } from "@/components/ui/input";
import { useCopy } from "@/components/locale-provider";
import { UploadFileButton } from "@/components/tools/file-drop";
import {
  DualPane,
  OptionBar,
  OptionField,
  PaneButton,
  SampleButton,
  Segmented,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";

type ZhDirection = "none" | "tw" | "hk" | "cn";

const COPY = {
  zh: {
    lineChars: "每行",
    chars: "字符",
    breakMode: "断行",
    byChar: "按字",
    byWord: "按词",
    byWidth: "按显示宽度",
    lines: "行数",
    mergeShort: "合并过短",
    ms: "毫秒",
    collapseSpaces: "清理空格",
    stripTags: "去标记",
    stripSdh: "去音效",
    punctuation: "标点",
    keepPunctuation: "不改",
    cjkPunctuation: "中文全角",
    latinPunctuation: "英文半角",
    zh: "简繁",
    keepZh: "不转换",
    toTw: "简 → 繁（台）",
    toHk: "简 → 繁（港）",
    toCn: "繁 → 简",
    loading: "正在加载简繁词典…",
    inputLabel: "字幕原文",
    outputLabel: "整理结果",
    placeholder: "粘贴内容，或把字幕文件拖进来…",
    noCues: "没有识别到字幕条目，检查时间轴行是否完整。",
    cues: "条",
    averageCps: "平均 CPS",
    tooFast: "超速",
    longest: "最长行",
    download: "下载",
    sample: `1
00:00:01,000 --> 00:00:04,000
[音乐] <i>夜色落在这座城市上</i>   还没有人记得它原来的样子

2
00:00:04,200 --> 00:00:06,000
♪ 街道很安静 ♪

3
00:00:06,200 --> 00:00:09,500
这个软件里面有很多头发，后台数据库已经准备好了，剩下的交给时间。`,
  },
  en: {
    lineChars: "Line",
    chars: "chars",
    breakMode: "Break",
    byChar: "By char",
    byWord: "By word",
    byWidth: "By width",
    lines: "Lines",
    mergeShort: "Merge under",
    ms: "ms",
    collapseSpaces: "Collapse spaces",
    stripTags: "Strip tags",
    stripSdh: "Strip sound cues",
    punctuation: "Punctuation",
    keepPunctuation: "Keep",
    cjkPunctuation: "CJK full-width",
    latinPunctuation: "Latin half-width",
    zh: "Chinese",
    keepZh: "Keep",
    toTw: "Simplified → Traditional (TW)",
    toHk: "Simplified → Traditional (HK)",
    toCn: "Traditional → Simplified",
    loading: "Loading conversion dictionaries…",
    inputLabel: "Subtitle source",
    outputLabel: "Cleaned",
    placeholder: "Paste content, or drop a subtitle file here…",
    noCues: "No cues found. Check the timing lines.",
    cues: "cues",
    averageCps: "Average CPS",
    tooFast: "too fast",
    longest: "Longest line",
    download: "Download",
    sample: `1
00:00:01,000 --> 00:00:04,000
[music] <i>Night falls over the city</i>   and nobody remembers how it used to look

2
00:00:04,200 --> 00:00:06,000
♪ the streets are quiet ♪

3
00:00:06,200 --> 00:00:09,500
The rendering pipeline keeps dropping frames at the end of every long scene.`,
  },
};

type ConverterModule = typeof import("opencc-js");

export function SubtitleCleanTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [maxChars, setMaxChars] = React.useState(String(DEFAULT_CLEAN.maxChars));
  const [maxLines, setMaxLines] = React.useState("2");
  const [breakMode, setBreakMode] = React.useState<BreakMode>("char");
  const [mergeMs, setMergeMs] = React.useState("0");
  const [collapseSpaces, setCollapseSpaces] = React.useState(true);
  const [stripTags, setStripTags] = React.useState(true);
  const [stripSdh, setStripSdh] = React.useState(true);
  const [punctuation, setPunctuation] = React.useState<PunctuationMode>("cjk");
  const [zh, setZh] = React.useState<ZhDirection>("none");
  const [opencc, setOpencc] = React.useState<ConverterModule | null>(null);

  const loadText = (text: string, name = "") => {
    setInput(text);
    setFileName(name);
  };

  // The dictionaries are ~1MB, so they load only when a conversion is chosen
  React.useEffect(() => {
    if (zh === "none" || opencc) return;
    let cancelled = false;
    import("opencc-js")
      .then((mod) => {
        if (!cancelled) setOpencc(mod);
      })
      .catch(() => {
        if (!cancelled) setOpencc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [zh, opencc]);

  const converter = React.useMemo(() => {
    if (!opencc || zh === "none") return undefined;
    const convert =
      zh === "cn"
        ? opencc.Converter({ from: "tw", to: "cn" })
        : opencc.Converter({ from: "cn", to: zh });
    return (text: string) => convert(text);
  }, [opencc, zh]);

  const options = React.useMemo<CleanOptions>(
    () => ({
      maxChars: Math.max(0, Number(maxChars) || 0),
      maxLines: Number(maxLines) || 1,
      breakMode,
      mergeShortMs: Math.max(0, Number(mergeMs) || 0),
      collapseSpaces,
      stripTags,
      stripSdh,
      punctuation,
    }),
    [maxChars, maxLines, breakMode, mergeMs, collapseSpaces, stripTags, stripSdh, punctuation]
  );

  const doc = React.useMemo(() => (input.trim() ? parseSubtitle(input) : null), [input]);
  const cues = React.useMemo(
    () => (doc ? cleanCues(doc.cues, options, converter) : []),
    [doc, options, converter]
  );

  const format: SubtitleFormat = doc && doc.format !== "txt" ? doc.format : "srt";
  const output = React.useMemo(
    () => (cues.length ? serialize(cues, format, { header: doc?.header }) : ""),
    [cues, format, doc]
  );

  const stats = React.useMemo(() => cueStats(cues, 20, options.maxChars), [cues, options.maxChars]);

  const download = () => {
    if (!output) return;
    downloadBlob(
      new Blob([output], { type: "text/plain;charset=utf-8" }),
      `${baseName(fileName, "subtitle-clean")}.${FORMAT_EXTENSIONS[format]}`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.lineChars}>
          <span className="flex items-center gap-1.5">
            <Input
              value={maxChars}
              onChange={(event) => setMaxChars(event.target.value)}
              inputMode="numeric"
              spellCheck={false}
              size="xs"
              aria-label={t.lineChars}
              className="w-16 font-mono text-xs"
            />
            <span className="text-[11px] text-foreground-faint">{t.chars}</span>
          </span>
        </OptionField>
        <OptionField label={t.breakMode}>
          <Segmented
            ariaLabel={t.breakMode}
            value={breakMode}
            onChange={setBreakMode}
            options={[
              { value: "char", label: t.byChar },
              { value: "word", label: t.byWord },
              { value: "width", label: t.byWidth },
            ]}
          />
        </OptionField>
        <OptionField label={t.lines}>
          <Segmented
            ariaLabel={t.lines}
            value={maxLines}
            onChange={setMaxLines}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
            ]}
          />
        </OptionField>
        <OptionField label={t.mergeShort}>
          <span className="flex items-center gap-1.5">
            <Input
              value={mergeMs}
              onChange={(event) => setMergeMs(event.target.value)}
              inputMode="numeric"
              spellCheck={false}
              size="xs"
              aria-label={t.mergeShort}
              className="w-16 font-mono text-xs"
            />
            <span className="text-[11px] text-foreground-faint">{t.ms}</span>
          </span>
        </OptionField>
      </OptionBar>

      <OptionBar>
        <Toggle checked={collapseSpaces} onChange={setCollapseSpaces} label={t.collapseSpaces} />
        <Toggle checked={stripTags} onChange={setStripTags} label={t.stripTags} />
        <Toggle checked={stripSdh} onChange={setStripSdh} label={t.stripSdh} />
        <OptionField label={t.punctuation}>
          <Segmented
            ariaLabel={t.punctuation}
            value={punctuation}
            onChange={setPunctuation}
            options={[
              { value: "none", label: t.keepPunctuation },
              { value: "cjk", label: t.cjkPunctuation },
              { value: "latin", label: t.latinPunctuation },
            ]}
          />
        </OptionField>
        <OptionField label={t.zh}>
          <Segmented
            ariaLabel={t.zh}
            value={zh}
            onChange={setZh}
            options={[
              { value: "none", label: t.keepZh },
              { value: "tw", label: t.toTw },
              { value: "hk", label: t.toHk },
              { value: "cn", label: t.toCn },
            ]}
          />
        </OptionField>
        {zh !== "none" && !opencc && (
          <span className="text-xs text-foreground-subtle">{t.loading}</span>
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
        scrollOutput
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
            <>
              <span>
                {stats.cues} {t.cues}
              </span>
              <span>
                {t.averageCps} {stats.averageCps.toFixed(1)}
              </span>
              {stats.tooFast > 0 && (
                <span className="text-orange-fg">
                  {stats.tooFast} {t.tooFast}
                </span>
              )}
              <span>
                {t.longest} {stats.longestLine}
              </span>
            </>
          ) : null
        }
      />
    </div>
  );
}
