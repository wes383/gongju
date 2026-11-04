"use client";

import * as React from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OptionField,
  Pane,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { errorText } from "@/lib/errors";
import { mathmlFrom, renderDocument, renderLatex } from "@/lib/latex";

type Mode = "formula" | "document";
type Display = "inline" | "block";
type Size = "s" | "m" | "l";

const COPY = {
  zh: {
    mode: "模式",
    formula: "单条公式",
    document: "文档混排",
    layout: "排版",
    inline: "行内",
    block: "独立",
    size: "字号",
    small: "小",
    medium: "中",
    large: "大",
    source: "LaTeX 源码",
    preview: "预览",
    snippets: "常用片段",
    copyLatex: "复制 LaTeX",
    copyMathml: "MathML",
    sample: "示例",
    clear: "清空",
    rendering: "渲染中…",
    ready: "已渲染",
    placeholder: "在这里输入 LaTeX，右侧实时预览",
    empty: "输入公式后这里显示渲染结果",
    hint: "单条公式模式直接写 \\frac{a}{b}；文档混排用 $…$ 表示行内公式、$$…$$ 表示独立公式，\\$ 是字面的美元符号。点击上方片段可插入到光标处。",
    mathmlHint: "MathML 可以直接粘进 Word、Notion 或论文里，公式仍然可编辑。",
    note: "渲染由 KaTeX 在本地完成，和 TeX 一样对语法严格：拼错的命令会标出行内位置。KaTeX 只支持数学排版，图表、TikZ 一类宏包需要完整的 LaTeX。",
    chars: (count: number) => `${count} 字符`,
  },
  en: {
    mode: "Mode",
    formula: "Single formula",
    document: "Mixed document",
    layout: "Layout",
    inline: "Inline",
    block: "Display",
    size: "Size",
    small: "S",
    medium: "M",
    large: "L",
    source: "LaTeX source",
    preview: "Preview",
    snippets: "Snippets",
    copyLatex: "Copy LaTeX",
    copyMathml: "MathML",
    sample: "Sample",
    clear: "Clear",
    rendering: "Rendering…",
    ready: "Rendered",
    placeholder: "Type LaTeX here and it renders on the right",
    empty: "Enter a formula to see it rendered here",
    hint: "In single-formula mode write \\frac{a}{b} straight in. In mixed mode $…$ is an inline formula, $$…$$ is a display formula and \\$ is a literal dollar sign. Click a snippet to insert it at the caret.",
    mathmlHint: "MathML pastes into Word, Notion or a paper with the formula still editable.",
    note: "KaTeX renders locally and is as strict as TeX: a misspelled command reports its position in the line. KaTeX covers math typesetting only — diagrams and TikZ need a full LaTeX installation.",
    chars: (count: number) => `${count} chars`,
  },
};

const SNIPPETS: { label: { zh: string; en: string }; latex: string }[] = [
  { label: { zh: "分式", en: "Fraction" }, latex: "\\frac{a}{b}" },
  { label: { zh: "根式", en: "Root" }, latex: "\\sqrt[n]{x}" },
  { label: { zh: "上下标", en: "Scripts" }, latex: "x_i^2" },
  { label: { zh: "求和", en: "Sum" }, latex: "\\sum_{i=1}^{n} a_i" },
  { label: { zh: "积分", en: "Integral" }, latex: "\\int_{0}^{\\infty} e^{-x}\\,dx" },
  { label: { zh: "极限", en: "Limit" }, latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x}" },
  {
    label: { zh: "矩阵", en: "Matrix" },
    latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
  },
  { label: { zh: "希腊字母", en: "Greek" }, latex: "\\alpha, \\beta, \\gamma, \\theta, \\lambda" },
];

const SAMPLES: Record<"zh" | "en", { formula: string; document: string }> = {
  zh: {
    formula: "\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}",
    document: `二次方程的求根公式是
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
判别式 $\\Delta = b^2 - 4ac$ 决定实根个数：
$\\Delta > 0$ 两个实根，$\\Delta = 0$ 一个重根，$\\Delta < 0$ 一对共轭复根。`,
  },
  en: {
    formula: "\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}",
    document: `The roots of a quadratic come from
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
The discriminant $\\Delta = b^2 - 4ac$ decides how many real roots exist:
$\\Delta > 0$ gives two, $\\Delta = 0$ gives one, $\\Delta < 0$ gives a conjugate pair.`,
  },
};

const PREVIEW_SIZE: Record<Size, number> = { s: 16, m: 22, l: 30 };

export function LatexPreviewTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [source, setSource] = React.useState(SAMPLES.zh.formula);
  const [mode, setMode] = React.useState<Mode>("formula");
  const [display, setDisplay] = React.useState<Display>("block");
  const [size, setSize] = React.useState<Size>("m");
  const [html, setHtml] = React.useState("");
  const [failure, setFailure] = React.useState<Error | null>(null);
  const [busy, setBusy] = React.useState(false);
  const sequence = React.useRef(0);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const current = ++sequence.current;
    const text = source;
    const timer = setTimeout(() => {
      if (!text.trim()) {
        setHtml("");
        setFailure(null);
        setBusy(false);
        return;
      }
      setBusy(true);
      void (async () => {
        try {
          const rendered =
            mode === "document"
              ? await renderDocument(text)
              : await renderLatex(text, { display: display === "block" });
          if (sequence.current !== current) return;
          setHtml(rendered);
          setFailure(null);
        } catch (error) {
          if (sequence.current !== current) return;
          setHtml("");
          setFailure(error instanceof Error ? error : new Error(String(error)));
        } finally {
          if (sequence.current === current) setBusy(false);
        }
      })();
    }, 140);
    return () => clearTimeout(timer);
  }, [source, mode, display]);

  /**
   * Keep the editor meaningful across a mode switch: a bare formula becomes a
   * display formula when entering mixed mode, and a single `$$…$$` block loses
   * its delimiters when going back (otherwise KaTeX chokes on the dollar sign).
   */
  const changeMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    const text = source.trim();
    if (!text) return;
    if (next === "document") {
      if (!/\$|\\\(|\\\[/.test(text)) setSource(`$$\n${text}\n$$`);
      return;
    }
    const wrapped = text.match(/^\$\$\s*([\s\S]*?)\s*\$\$$/);
    if (wrapped) setSource(wrapped[1]);
  };

  const insert = (latex: string) => {
    const snippet = mode === "document" ? `$${latex}$` : latex;
    const element = areaRef.current;
    if (!element) {
      setSource((previous) => previous + snippet);
      return;
    }
    const start = element.selectionStart;
    const end = element.selectionEnd;
    setSource(source.slice(0, start) + snippet + source.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      const caret = start + snippet.length;
      element.setSelectionRange(caret, caret);
    });
  };

  const mathml = mathmlFrom(html);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={mode}
            onChange={changeMode}
            options={[
              { value: "formula", label: t.formula },
              { value: "document", label: t.document },
            ]}
          />
        </OptionField>
        {mode === "formula" && (
          <OptionField label={t.layout}>
            <Segmented
              ariaLabel={t.layout}
              value={display}
              onChange={setDisplay}
              options={[
                { value: "inline", label: t.inline },
                { value: "block", label: t.block },
              ]}
            />
          </OptionField>
        )}
        <OptionField label={t.size}>
          <Segmented
            ariaLabel={t.size}
            value={size}
            onChange={setSize}
            options={[
              { value: "s", label: t.small },
              { value: "m", label: t.medium },
              { value: "l", label: t.large },
            ]}
          />
        </OptionField>
      </OptionBar>

      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-foreground-faint">
          {t.snippets}
        </span>
        {SNIPPETS.map((snippet) => (
          <Button
            key={snippet.label.en}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => insert(snippet.latex)}
            className="font-mono text-[11px]"
          >
            {snippet.label[locale]}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.source}
              className="h-full"
              actions={
                <>
                  <SampleButton
                    onClick={() => setSource(SAMPLES[locale][mode === "document" ? "document" : "formula"])}
                    label={t.sample}
                  />
                  <ClearButton onClick={() => setSource("")} label={t.clear} />
                </>
              }
              footer={<span>{t.chars(source.length)}</span>}
            >
              <InputArea
                ref={areaRef}
                value={source}
                onChange={(event) => setSource(event.target.value)}
                aria-label={t.source}
                placeholder={t.placeholder}
                spellCheck={false}
                className="min-h-[320px]"
              />
            </Pane>
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.preview}
            className="h-full"
            actions={
              <>
                <CopyButton value={source} label={t.copyLatex} disabled={!source.trim()} />
                <CopyButton value={mathml} label={t.copyMathml} disabled={!mathml} />
              </>
            }
            footer={<span>{busy ? t.rendering : t.ready}</span>}
          >
            {failure ? (
              <div className="p-3">
                <ErrorNote>{errorText(failure, locale)}</ErrorNote>
              </div>
            ) : html ? (
              <div
                className={
                  mode === "document"
                    ? "max-h-[60vh] min-h-[320px] flex-1 overflow-auto whitespace-pre-wrap px-5 py-4 leading-[1.9] text-foreground [&_.katex-display]:my-3"
                    : "flex max-h-[60vh] min-h-[320px] flex-1 items-center justify-center overflow-auto px-5 py-6 text-foreground [&_.katex-display]:my-0"
                }
                style={{ fontSize: PREVIEW_SIZE[size] }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">
        {t.note} {t.mathmlHint}
      </p>
    </div>
  );
}
