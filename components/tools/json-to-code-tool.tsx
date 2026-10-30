"use client";

import * as React from "react";

import {
  JSON_SAMPLE,
  parseJson,
  toGo,
  toJava,
  toPython,
  toTypeScript,
} from "@/lib/json";
import {
  useCopy,
  useT,
} from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  Segmented,
  SampleButton,
} from "@/components/tools/tool-ui";
import {
  Input,
} from "@/components/ui/input";

type Target = "typescript" | "go" | "python" | "java";

const COPY = {
  zh: {
    rootName: "根类型名",
    inputLabel: "JSON",
    outputLabel: "生成的类型",
    inputPlaceholder: "粘贴 JSON…",
    sample: "示例",
    inputHint: "对象会生成嵌套类型，数组元素会自动合并",
  },
  en: {
    rootName: "Root type",
    inputLabel: "JSON",
    outputLabel: "Generated types",
    inputPlaceholder: "Paste JSON…",
    sample: "Sample",
    inputHint: "Objects become nested types, array elements are merged",
  },
};

const GENERATORS: Record<Target, (value: unknown, name: string) => string> = {
  typescript: toTypeScript,
  go: toGo,
  python: toPython,
  java: toJava,
};

export function JsonToCodeTool() {
  const t = useCopy(COPY);
  const shared = useT();
  const [input, setInput] = React.useState("");
  const [target, setTarget] = React.useState<Target>("typescript");
  const [rootName, setRootName] = React.useState("Root");

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: "", error: null as string | null };
    const parsed = parseJson(input);
    if (!parsed.ok) {
      return {
        value: "",
        error: shared.syntaxError(parsed.line ?? null, parsed.column ?? null, parsed.message),
      };
    }
    try {
      return { value: GENERATORS[target](parsed.value, rootName || "Root"), error: null };
    } catch (e) {
      return { value: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, target, rootName, shared]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.outputLabel}
          value={target}
          onChange={setTarget}
          options={[
            { value: "typescript", label: "TypeScript" },
            { value: "go", label: "Go" },
            { value: "python", label: "Python" },
            { value: "java", label: "Java" },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.rootName}</span>
          <Input
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            spellCheck={false}
            aria-label={t.rootName}
            size="xs"
            className="w-32 font-mono"
          />
        </div>
        <span className="ml-auto text-xs text-foreground-subtle">{t.inputHint}</span>
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.inputPlaceholder}
        inputActions={
          <SampleButton onClick={() => setInput(JSON_SAMPLE)} />
        }
        onClear={() => setInput("")}
        inputFooter={<span>{input.length}</span>}
        outputFooter={result.value ? <span>{result.value.split("\n").length}</span> : null}
      />
    </div>
  );
}
