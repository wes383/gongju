"use client";

import * as React from "react";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { highlightJson } from "@/lib/encoding";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "xml2json" | "json2xml";

const COPY = {
  zh: {
    attributes: "保留属性",
    attributesHint: "属性以 @_ 前缀表示，例如 @_id",
    indent: "缩进",
    twoSpaces: "2 空格",
    fourSpaces: "4 空格",
    xmlPlaceholder: "粘贴 XML…",
    jsonPlaceholder: "粘贴 JSON…",
    sample: "示例",
    noteBefore: "使用 fast-xml-parser。约定：属性以 ",
    noteMiddle: " 为前缀，纯文本节点以 ",
    noteAfter: " 表示；数字与布尔值会自动推断类型。",
    sampleTitle: "工具站开发指南",
  },
  en: {
    attributes: "Keep attributes",
    attributesHint: "Attributes are prefixed with @_, e.g. @_id",
    indent: "Indent",
    twoSpaces: "2 spaces",
    fourSpaces: "4 spaces",
    xmlPlaceholder: "Paste XML…",
    jsonPlaceholder: "Paste JSON…",
    sample: "Sample",
    noteBefore: "Powered by fast-xml-parser. Convention: attributes are prefixed with ",
    noteMiddle: ", plain text nodes use ",
    noteAfter: "; numbers and booleans are inferred automatically.",
    sampleTitle: "Toolkit development guide",
  },
};

const SAMPLE_XML = (title: string) => `<catalog>
  <book id="bk101" available="true">
    <title>${title}</title>
    <price>39.9</price>
    <tags>
      <tag>nextjs</tag>
      <tag>typescript</tag>
    </tags>
  </book>
</catalog>`;

const SAMPLE_JSON = (title: string) =>
  JSON.stringify(
    { catalog: { book: { "@_id": "bk101", title, price: 39.9 } } },
    null,
    2
  );

export function XmlTool() {
  const t = useCopy(COPY);
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
          ariaLabel="XML"
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
          label={t.attributes}
          hint={t.attributesHint}
        />
        <Segmented
          ariaLabel={t.indent}
          value={String(indent)}
          onChange={(v) => setIndent(Number(v))}
          options={[
            { value: "2", label: t.twoSpaces },
            { value: "4", label: t.fourSpaces },
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
        inputPlaceholder={mode === "xml2json" ? t.xmlPlaceholder : t.jsonPlaceholder}
        inputActions={
          <PaneButton
            onClick={() =>
              setInput(
                mode === "xml2json"
                  ? SAMPLE_XML(t.sampleTitle)
                  : SAMPLE_JSON(t.sampleTitle)
              )
            }
            title={t.sample}
          >
            {t.sample}
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
        {t.noteBefore}
        <code className="font-mono">@_</code>
        {t.noteMiddle}
        <code className="font-mono">#text</code>
        {t.noteAfter}
      </p>
    </div>
  );
}
