"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useAppTheme } from "@/components/theme-provider";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { CopyButton, ErrorNote, InputArea, Pane, Segmented } from "@/components/tools/tool-ui";
import { DARK_THEME, LIGHT_THEME } from "@/lib/chart";
import { downloadBlob } from "@/lib/files";
import { codedError, errorText } from "@/lib/errors";
import { rasterizeSvg, svgSize } from "@/lib/svg";

type Kind = "flowchart" | "sequence" | "gantt" | "class" | "state";

const COPY = {
  zh: {
    kind: "图表类型",
    flowchart: "流程图",
    sequence: "时序图",
    gantt: "甘特图",
    class: "类图",
    state: "状态图",
    code: "图表代码",
    preview: "预览",
    copyCode: "复制代码",
    copySvg: "复制 SVG",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    rendering: "渲染中…",
    ready: "已更新",
    hint: "输入 Mermaid 语法后自动渲染，支持流程图、时序图、甘特图、类图、状态图等。导出的 PNG 使用纯 SVG 文本标签，避免浏览器兼容问题。",
    exportFailed: "导出 PNG 失败，请重试",
  },
  en: {
    kind: "Diagram type",
    flowchart: "Flowchart",
    sequence: "Sequence",
    gantt: "Gantt",
    class: "Class",
    state: "State",
    code: "Diagram code",
    preview: "Preview",
    copyCode: "Copy code",
    copySvg: "Copy SVG",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    rendering: "Rendering…",
    ready: "Up to date",
    hint: "Type Mermaid syntax and the diagram renders automatically. Flowcharts, sequence diagrams, Gantt charts, class and state diagrams are supported.",
    exportFailed: "PNG export failed — try again",
  },
};

const TEMPLATES: Record<"zh" | "en", Record<Kind, string>> = {
  zh: {
    flowchart: `flowchart LR
  A[需求] --> B[设计]
  B --> C{评审}
  C -- 通过 --> D[开发]
  C -- 驳回 --> B
  D --> E[上线]`,
    sequence: `sequenceDiagram
  participant 用户
  participant 服务端
  participant 数据库
  用户->>服务端: 提交表单
  服务端->>数据库: 写入记录
  数据库-->>服务端: 返回 ID
  服务端-->>用户: 创建成功`,
    gantt: `gantt
  title 项目排期
  dateFormat YYYY-MM-DD
  axisFormat %m-%d
  section 设计
  需求梳理      :a1, 2026-02-01, 5d
  原型评审      :a2, after a1, 3d
  section 开发
  前端实现      :b1, after a2, 8d
  后端接口      :b2, after a2, 6d
  section 发布
  联调测试      :c1, after b1, 4d
  正式上线      :milestone, after c1, 0d`,
    class: `classDiagram
  class 订单 {
    +String id
    +Decimal total
    +submit()
    +cancel()
  }
  class 用户 {
    +String name
    +List~订单~ orders
  }
  用户 "1" --> "*" 订单`,
    state: `stateDiagram-v2
  [*] --> 待支付
  待支付 --> 已支付: 付款
  待支付 --> 已取消: 超时
  已支付 --> 已发货: 出库
  已发货 --> 已完成: 签收
  已取消 --> [*]`,
  },
  en: {
    flowchart: `flowchart LR
  A[Request] --> B[Design]
  B --> C{Review}
  C -- Approve --> D[Build]
  C -- Reject --> B
  D --> E[Release]`,
    sequence: `sequenceDiagram
  participant User
  participant API
  participant DB
  User->>API: Submit form
  API->>DB: Insert row
  DB-->>API: Row id
  API-->>User: Created`,
    gantt: `gantt
  title Project schedule
  dateFormat YYYY-MM-DD
  axisFormat %m-%d
  section Design
  Scoping       :a1, 2026-02-01, 5d
  Prototype     :a2, after a1, 3d
  section Build
  Frontend      :b1, after a2, 8d
  Backend       :b2, after a2, 6d
  section Release
  QA            :c1, after b1, 4d
  Launch        :milestone, after c1, 0d`,
    class: `classDiagram
  class Order {
    +String id
    +Decimal total
    +submit()
    +cancel()
  }
  class User {
    +String name
    +List~Order~ orders
  }
  User "1" --> "*" Order`,
    state: `stateDiagram-v2
  [*] --> Pending
  Pending --> Paid: pay
  Pending --> Cancelled: timeout
  Paid --> Shipped: ship
  Shipped --> Done: delivered
  Cancelled --> [*]`,
  },
};

const subscribeNoop = () => () => {};

export function MermaidEditorTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { resolvedTheme } = useAppTheme();
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const theme = mounted && resolvedTheme === "dark" ? DARK_THEME : LIGHT_THEME;
  const dark = mounted && resolvedTheme === "dark";

  const [kind, setKind] = React.useState<Kind>("flowchart");
  // Only edited diagrams are stored, so the untouched ones keep following the
  // UI language instead of being frozen at the locale used during first render.
  const [codes, setCodes] = React.useState<Partial<Record<Kind, string>>>({});
  const [svg, setSvg] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  const [rendering, setRendering] = React.useState(false);
  const [exportError, setExportError] = React.useState<unknown>(null);
  const sequence = React.useRef(0);

  const code = codes[kind] ?? TEMPLATES[locale][kind];

  React.useEffect(() => {
    if (!mounted) return;
    const current = ++sequence.current;
    const timer = setTimeout(() => {
      setRendering(true);
      void (async () => {
        try {
          const mermaid = (await import("mermaid")).default;
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: dark ? "dark" : "default",
            htmlLabels: false,
            fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif",
          });
          const parsed = await mermaid.parse(code, { suppressErrors: true });
          if (!parsed) throw new Error("invalid");
          const result = await mermaid.render(`mermaid-preview-${current}`, code);
          if (sequence.current !== current) return;
          setSvg(result.svg);
          setError(null);
        } catch {
          if (sequence.current !== current) return;
          setSvg("");
          setError(codedError("mermaid.failed"));
        } finally {
          if (sequence.current === current) setRendering(false);
        }
      })();
    }, 450);
    return () => clearTimeout(timer);
  }, [code, dark, mounted]);

  const downloadSvg = () => {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "diagram.svg");
  };

  const downloadPng = async () => {
    const size = svg ? svgSize(svg) : null;
    if (!svg || !size) return;
    try {
      const scale = Math.min(2, 4000 / Math.max(size.width, size.height));
      const blob = await rasterizeSvg(svg, {
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale),
        background: theme.background,
      });
      downloadBlob(blob, "diagram.png");
      setExportError(null);
    } catch {
      setExportError(codedError("chart.exportFailed"));
    }
  };

  const message = error ?? exportError;

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        ariaLabel={t.kind}
        value={kind}
        onChange={setKind}
        options={[
          { value: "flowchart", label: t.flowchart },
          { value: "sequence", label: t.sequence },
          { value: "gantt", label: t.gantt },
          { value: "class", label: t.class },
          { value: "state", label: t.state },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.code}
            actions={<CopyButton value={`\`\`\`mermaid\n${code}\n\`\`\``} label={t.copyCode} />}
            footer={<span>{rendering ? t.rendering : t.ready}</span>}
          >
            <InputArea
              value={code}
              onChange={(event) => setCodes((prev) => ({ ...prev, [kind]: event.target.value }))}
              spellCheck={false}
              className="min-h-[420px] font-mono"
              placeholder={t.hint}
              aria-label={t.code}
            />
          </Pane>
        </div>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.preview}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <CopyButton value={svg} label={t.copySvg} />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="gap-1.5 text-foreground-muted"
                onClick={downloadSvg}
                disabled={!svg}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.downloadSvg}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="gap-1.5 text-foreground-muted"
                onClick={downloadPng}
                disabled={!svg}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.downloadPng}</span>
              </Button>
            </div>
          </header>
          <div className="min-h-[420px] flex-1 space-y-3 overflow-auto p-4">
            {message ? <ErrorNote>{errorText(message, locale)}</ErrorNote> : null}
            {svg && (
              <div
                className="transition-opacity [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
                style={{ opacity: rendering ? 0.55 : 1 }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>
          <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
            {rendering ? t.rendering : t.ready}
          </footer>
        </section>
      </div>

      {!message && (
        <p className="text-xs leading-relaxed text-foreground-muted">{t.hint}</p>
      )}
    </div>
  );
}
