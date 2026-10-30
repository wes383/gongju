"use client";

import * as React from "react";
import { useCopy } from "@/components/locale-provider";
import { DualPane, OptionBar, SampleButton, Segmented } from "@/components/tools/tool-ui";

type Direction = "tw" | "hk" | "toCn";

const COPY = {
  zh: {
    tw: "简 → 繁（台湾）",
    hk: "简 → 繁（香港）",
    toCn: "繁 → 简",
    inputLabel: "原文",
    outputLabel: "转换结果",
    placeholder: "输入需要转换的中文…",
    sampleText: "这个软件里面有头发和面条，后台数据库已经准备好了。",
    loading: "正在加载转换词典…",
  },
  en: {
    tw: "Simplified → Traditional (Taiwan)",
    hk: "Simplified → Traditional (Hong Kong)",
    toCn: "Traditional → Simplified",
    inputLabel: "Input",
    outputLabel: "Result",
    placeholder: "Type or paste Chinese text…",
    sampleText: "这个软件里面有头发和面条，后台数据库已经准备好了。",
    loading: "Loading conversion dictionaries…",
  },
};

type ConverterModule = typeof import("opencc-js");

export function ZhConvertTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [direction, setDirection] = React.useState<Direction>("tw");
  const [opencc, setOpencc] = React.useState<ConverterModule | null>(null);

  // The dictionaries are ~1MB, so load them only when this page is opened
  React.useEffect(() => {
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
  }, []);

  const converter = React.useMemo(() => {
    if (!opencc) return null;
    if (direction === "toCn") return opencc.Converter({ from: "tw", to: "cn" });
    return opencc.Converter({ from: "cn", to: direction === "hk" ? "hk" : "tw" });
  }, [opencc, direction]);

  const output = React.useMemo(() => {
    if (!input.trim() || !converter) return "";
    try {
      return converter(input);
    } catch {
      return "";
    }
  }, [input, converter]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.outputLabel}
          value={direction}
          onChange={setDirection}
          options={[
            { value: "tw", label: t.tw },
            { value: "hk", label: t.hk },
            { value: "toCn", label: t.toCn },
          ]}
        />
        {!opencc && (
          <span className="ml-auto text-xs text-foreground-subtle">{t.loading}</span>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.placeholder}
        inputActions={<SampleButton onClick={() => setInput(t.sampleText)} />}
        onClear={() => setInput("")}
        onSwap={() => setInput(output)}
        inputFooter={<span>{input.length}</span>}
        outputFooter={output ? <span>{output.length}</span> : null}
      />
    </div>
  );
}
