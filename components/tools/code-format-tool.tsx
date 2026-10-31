"use client";

import * as React from "react";
import { css as beautifyCss, html as beautifyHtml, js as beautifyJs } from "js-beautify";
import { useCopy, useLocale } from "@/components/locale-provider";
import { DualPane, OptionBar, OptionField, SampleButton, Segmented } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    lang: "语言",
    mode: "操作",
    format: "格式化",
    minify: "压缩",
    indent: "缩进",
    note: "压缩只做「去注释 + 合并空白」，不会重命名变量或删除死代码，所以是安全的；真正的最小化请用 terser / esbuild。HTML 会跳过 pre、textarea、script、style 里的内容。",
    sample: "示例",
    failed: "处理失败",
  },
  en: {
    lang: "Language",
    mode: "Action",
    format: "Format",
    minify: "Minify",
    indent: "Indent",
    note: "Minify only strips comments and collapses whitespace — no renaming or dead-code removal, so it is safe. Use terser or esbuild for real minification. HTML leaves pre, textarea, script and style contents alone.",
    sample: "Sample",
    failed: "Failed",
  },
};

type Lang = "js" | "css" | "html";

/** Samples follow the UI language so an English page never shows Chinese code */
const SAMPLES: Record<"zh" | "en", Record<Lang, string>> = {
  zh: {
    js: `// 计算订单总价
function total(items) {
  /* 过滤掉下架商品 */
  return items.filter(function (item) { return item.active; })
    .reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
}`,
    css: `/* 主按钮 */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  color: #fff;
}
.btn:hover { opacity: 0.9; }`,
    html: `<!-- 卡片 -->
<div class="card">
  <h2 class="title">  标题  </h2>
  <p>  正文内容  </p>
  <pre>  这里  的空白   要保留  </pre>
</div>`,
  },
  en: {
    js: `// Order total
function total(items) {
  /* Skip delisted products */
  return items.filter(function (item) { return item.active; })
    .reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
}`,
    css: `/* Primary button */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  color: #fff;
}
.btn:hover { opacity: 0.9; }`,
    html: `<!-- Card -->
<div class="card">
  <h2 class="title">  Heading  </h2>
  <p>  Body copy  </p>
  <pre>  Whitespace   here   is kept  </pre>
</div>`,
  },
};

const PLACEHOLDER: Record<Lang, string> = { js: "// JavaScript", css: "/* CSS */", html: "<!-- HTML -->" };

/** Collapse whitespace and drop comments, keeping string literals intact. */
function minifyCss(css: string): string {
  const strings: string[] = [];
  let work = css.replace(/(["'])(?:\\.|(?!\1)[\s\S])*?\1/g, (match) => {
    strings.push(match);
    return `\u0000${strings.length - 1}\u0000`;
  });
  work = work
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
  return work.replace(/\u0000(\d+)\u0000/g, (_, index: string) => strings[Number(index)]);
}

function minifyHtml(html: string): string {
  const blocks: string[] = [];
  let work = html.replace(/<(pre|textarea|script|style)\b[\s\S]*?<\/\1>/gi, (match) => {
    blocks.push(match);
    return `\u0000${blocks.length - 1}\u0000`;
  });
  work = work
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
  return work.replace(/\u0000(\d+)\u0000/g, (_, index: string) => blocks[Number(index)]);
}

function looksLikeRegexStart(previous: string): boolean {
  if (!previous) return true;
  return "(,=:[!&|?{};+-*%<>~^".includes(previous);
}

/** Remove JS comments without touching strings, template literals or regexes. */
function stripJsComments(code: string): string {
  let out = "";
  let previous = "";
  let i = 0;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (ch === "/" && next === "/") {
      while (i < code.length && code[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) i += 1;
      i += 2;
      out += " ";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < code.length) {
        const c = code[i];
        out += c;
        if (c === "\\") {
          out += code[i + 1] ?? "";
          i += 2;
          continue;
        }
        i += 1;
        if (c === quote) break;
      }
      previous = quote;
      continue;
    }
    if (ch === "/" && looksLikeRegexStart(previous)) {
      out += ch;
      i += 1;
      let inClass = false;
      while (i < code.length) {
        const c = code[i];
        out += c;
        if (c === "\\") {
          out += code[i + 1] ?? "";
          i += 2;
          continue;
        }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        i += 1;
        if (c === "/" && !inClass) break;
      }
      while (i < code.length && /[a-z]/i.test(code[i])) {
        out += code[i];
        i += 1;
      }
      previous = "/";
      continue;
    }

    out += ch;
    if (!/\s/.test(ch)) previous = ch;
    i += 1;
  }
  return out;
}

/** Comment-free, indentation-free JS — line breaks are kept so ASI stays safe. */
function minifyJs(code: string): string {
  return stripJsComments(code)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function CodeFormatTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const samples = SAMPLES[locale];
  const [lang, setLang] = React.useState<Lang>("js");
  const [mode, setMode] = React.useState<"format" | "minify">("format");
  const [indent, setIndent] = React.useState(2);
  const [input, setInput] = React.useState("");

  const switchLang = (next: Lang) => {
    setLang(next);
    // Only pull in the sample when the pane is still empty, so switching the
    // language never throws away code the user already typed
    setInput((current) => (current.trim() ? current : SAMPLES[locale][next]));
  };

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: "", error: null as string | null };
    try {
      if (mode === "minify") {
        const value =
          lang === "css" ? minifyCss(input) : lang === "html" ? minifyHtml(input) : minifyJs(input);
        return { value, error: null };
      }
      const options = { indent_size: indent, preserve_newlines: false, end_with_newline: false };
      const value =
        lang === "css" ? beautifyCss(input, options) : lang === "html" ? beautifyHtml(input, options) : beautifyJs(input, options);
      return { value, error: null };
    } catch (err) {
      return { value: "", error: err instanceof Error ? err.message : t.failed };
    }
  }, [input, lang, mode, indent, t.failed]);

  const saved = input.length - result.value.length;
  const outputLabel =
    mode === "minify"
      ? `${lang.toUpperCase()} · −${Math.max(0, Math.round((saved / Math.max(input.length, 1)) * 100))}%`
      : lang.toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.lang}>
          <Segmented
            ariaLabel={t.lang}
            value={lang}
            onChange={switchLang}
            options={[
              { value: "js", label: "JavaScript" },
              { value: "css", label: "CSS" },
              { value: "html", label: "HTML" },
            ]}
          />
        </OptionField>

        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={mode}
            onChange={setMode}
            options={[
              { value: "format", label: t.format },
              { value: "minify", label: t.minify },
            ]}
          />
        </OptionField>

        {mode === "format" && (
          <OptionField label={t.indent}>
            <Segmented
              ariaLabel={t.indent}
              value={String(indent)}
              onChange={(value) => setIndent(Number(value))}
              options={[
                { value: "2", label: "2" },
                { value: "4", label: "4" },
              ]}
            />
          </OptionField>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel={lang.toUpperCase()}
        outputLabel={outputLabel}
        inputPlaceholder={PLACEHOLDER[lang]}
        inputActions={<SampleButton onClick={() => setInput(samples[lang])} label={t.sample} />}
        onClear={() => setInput("")}
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
