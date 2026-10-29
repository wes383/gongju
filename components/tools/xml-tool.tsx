"use client";

import * as React from "react";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { highlightJson } from "@/lib/encoding";
import { DualPane, OptionBar, PaneButton, Segmented, Stats, Toggle } from "@/components/tools/tool-ui";

type Mode = "xml2json" | "json2xml";

const SAMPLE = `<catalog>
  <book id="bk101" available="true">
    <title>工具站开发指南</title>
    <price>39.9</price>
    <tags>
      <tag>nextjs</tag>
      <tag>typescript</tag>
    </tags>
  </book>
</catalog>`;

export function XmlTool() {
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("xml2json");
  const [attributes, setAttributes] = React.useState(true);
  const [indent, setIndent] = React.useState(2);

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: "", error: null as string | null };
    try {
      if (mode === "xml2json") {
        const parser = new XMLParser({
          ignoreAttributes: !attributes,
          attributeNamePrefix: "@_",
          textNodeName: "#text",
          trimValues: true,
          parseTagValue: true,
          parseAttributeValue: true,
          ignoreDeclaration: false,
          processEntities: true,
        });
        const data = parser.parse(input);
        return { value: JSON.stringify(data, null, indent), error: null };
      }

      const parsed = JSON.parse(input);
      const builder = new XMLBuilder({
        ignoreAttributes: !attributes,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
        format: true,
        indentBy: " ".repeat(indent),
        suppressEmptyNode: true,
      });
      return { value: builder.build(parsed), error: null };
    } catch (e) {
      return { value: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, mode, attributes, indent]);

  const swap = () => {
    if (result.value) setInput(result.value);
    setMode((m) => (m === "xml2json" ? "json2xml" : "xml2json"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "xml2json", label: "XML → JSON" },
            { value: "json2xml", label: "JSON → XML" },
          ]}
        />
        <Toggle
          checked={attributes}
          onChange={setAttributes}
          label="保留属性"
          hint="属性以 @_ 前缀表示，例如 @_id"
        />
        <Segmented
          ariaLabel="缩进"
          value={String(indent)}
          onChange={(v) => setIndent(Number(v))}
          options={[
            { value: "2", label: "2 空格" },
            { value: "4", label: "4 空格" },
          ]}
        />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={mode === "xml2json" ? "XML" : "JSON"}
        outputLabel={mode === "xml2json" ? "JSON" : "XML"}
        inputPlaceholder={mode === "xml2json" ? "粘贴 XML…" : "粘贴 JSON…"}
        inputActions={
          <PaneButton
            onClick={() =>
              setInput(
                mode === "xml2json"
                  ? SAMPLE
                  : JSON.stringify(
                      { catalog: { book: { "@_id": "bk101", title: "工具站开发指南", price: 39.9 } } },
                      null,
                      2
                    )
              )
            }
          >
            示例
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={result.value ? <Stats text={result.value} /> : null}
        outputHighlight={
          mode === "xml2json" && result.value ? highlightJson(result.value) : undefined
        }
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">
        使用 fast-xml-parser。约定：属性以 <code className="font-mono">@_</code> 为前缀，
        纯文本节点以 <code className="font-mono">#text</code> 表示；数字与布尔值会自动推断类型。
      </p>
    </div>
  );
}
