"use client";

import * as React from "react";
import { Download, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, PaneButton, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { downloadBlob } from "@/lib/files";
import { skuCsv, skuMatrix, type SkuAxis, type SkuCodeMode } from "@/lib/sku";

const COPY = {
  zh: {
    axes: "规格属性",
    axisName: "属性名",
    axisValues: "属性值",
    valuesHint: "用逗号分隔，重复的会自动去掉",
    add: "添加属性",
    remove: "删除这个属性",
    options: "编码规则",
    prefix: "前缀",
    byValue: "属性拼接",
    byIndex: "流水号",
    result: "SKU 列表",
    empty: "填好属性后这里展开全部组合",
    count: (n: number) => `${n} 个 SKU`,
    summary: (parts: string, total: number) => `${parts} = ${total} 个 SKU`,
    code: "SKU 编码",
    priceCol: "售价",
    stockCol: "库存",
    download: "下载 CSV",
    truncated: (shown: number) => `仅显示前 ${shown} 个，导出 CSV 可以看到全部`,
    note: "组合数按各属性值的数量相乘，上限 5000 个。导出的是 UTF-8 BOM 的 CSV，Excel 直接打开中文不会乱码；列顺序为各属性、SKU 编码，再加两列空的售价与库存，填完就能导入后台。用「流水号」时编码只和顺序有关，改属性名不会影响已有编码。",
  },
  en: {
    axes: "Options",
    axisName: "Option",
    axisValues: "Values",
    valuesHint: "Comma separated; duplicates are dropped",
    add: "Add option",
    remove: "Remove this option",
    options: "Code rule",
    prefix: "Prefix",
    byValue: "Join values",
    byIndex: "Sequence",
    result: "SKU list",
    empty: "Fill in the options to expand every combination",
    count: (n: number) => `${n} SKUs`,
    summary: (parts: string, total: number) => `${parts} = ${total} SKUs`,
    code: "SKU",
    priceCol: "Price",
    stockCol: "Stock",
    download: "Download CSV",
    truncated: (shown: number) => `Showing the first ${shown}; the CSV has them all`,
    note: "The combination count is the product of the option values, capped at 5000. The CSV is UTF-8 with a BOM so Excel opens the Chinese headers cleanly: one column per option, the SKU code, then empty price and stock columns ready to fill. With sequence codes the code depends only on order, so renaming an option will not break existing SKUs.",
  },
};

/** Accept ASCII and full-width commas, plus newlines from a pasted list */
function splitValues(input: string): string[] {
  return input.split(/[,，\n]/);
}

const PREVIEW = 200;

interface AxisDraft {
  id: string;
  name: string;
  values: string;
}

let nextAxis = 3;

export function SkuMatrixTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [axes, setAxes] = React.useState<AxisDraft[]>([
    { id: "a1", name: "颜色", values: "红, 蓝, 白" },
    { id: "a2", name: "尺码", values: "S, M, L" },
  ]);
  const [prefix, setPrefix] = React.useState("SKU");
  const [mode, setMode] = React.useState<SkuCodeMode>("value");

  const update = (id: string, patch: Partial<AxisDraft>) =>
    setAxes((prev) => prev.map((axis) => (axis.id === id ? { ...axis, ...patch } : axis)));

  const remove = (id: string) => setAxes((prev) => prev.filter((axis) => axis.id !== id));

  const add = () =>
    setAxes((prev) => [...prev, { id: `a${nextAxis++}`, name: "", values: "" }]);

  const solved = React.useMemo(() => {
    const input: SkuAxis[] = axes.map((axis) => ({
      name: axis.name,
      values: splitValues(axis.values),
    }));
    return safe(() =>
      skuMatrix(input, { prefix, separator: "-", codeMode: mode, pad: 3 })
    );
  }, [axes, prefix, mode]);

  const matrix = solved.value;
  const preview = matrix ? matrix.items.slice(0, PREVIEW) : [];

  const downloadCsv = () => {
    if (!matrix) return;
    const csv = skuCsv(matrix, t.code, [t.priceCol, t.stockCol]);
    const name = (prefix.trim() || "sku").replace(/[\\/:*?"<>|]/g, "-");
    downloadBlob(
      // The BOM keeps Excel from reading the Chinese headers as mojibake.
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      `${name}-matrix.csv`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-col gap-2">
            {axes.map((axis, index) => (
              <div key={axis.id} className="grid gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.6fr)_auto]">
                <Input
                  value={axis.name}
                  onChange={(event) => update(axis.id, { name: event.target.value })}
                  placeholder={`${t.axisName} ${index + 1}`}
                  aria-label={`${t.axisName} ${index + 1}`}
                  className="w-full text-sm"
                  size="xs"
                />
                <Input
                  value={axis.values}
                  onChange={(event) => update(axis.id, { values: event.target.value })}
                  placeholder={t.valuesHint}
                  aria-label={`${t.axisValues} ${index + 1}`}
                  className="w-full text-sm"
                  size="xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => remove(axis.id)}
                  title={t.remove}
                  aria-label={t.remove}
                  disabled={axes.length <= 1}
                  className="text-foreground-faint hover:text-red-fg"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={add}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.add}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border pt-3">
            <label className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.prefix}</span>
              <Input
                value={prefix}
                onChange={(event) => setPrefix(event.target.value)}
                className="w-28 font-mono text-sm"
                size="xs"
              />
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.options}</span>
              <Segmented
                ariaLabel={t.options}
                value={mode}
                onChange={(value) => setMode(value)}
                options={[
                  { value: "value", label: t.byValue },
                  { value: "index", label: t.byIndex },
                ]}
              />
            </div>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            actions={
              <>
                <PaneButton onClick={downloadCsv} title={t.download}>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.download}</span>
                </PaneButton>
                {matrix && <CopyButton value={matrix.items.map((item) => item.code).join("\n")} size="icon-xs" />}
              </>
            }
            footer={
              <span>
                {matrix
                  ? t.summary(matrix.axes.map((axis) => axis.values.length).join(" × "), matrix.total)
                  : t.count(0)}
              </span>
            }
          >
            {!matrix ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full border-collapse text-[12px]">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="border-b border-border text-left text-[11px] text-foreground-subtle">
                        {matrix.axes.map((axis, index) => (
                          <th key={`${axis.name}-${index}`} className="px-3 py-2 font-medium">
                            {axis.name}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-mono font-medium">{t.code}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((item) => (
                        <tr key={item.code} className="border-b border-border last:border-b-0">
                          {item.values.map((value, index) => (
                            <td
                              key={`${item.code}-${index}`}
                              className="max-w-[120px] truncate px-3 py-1.5 text-foreground-muted"
                            >
                              {value}
                            </td>
                          ))}
                          <td className="px-3 py-1.5 font-mono text-foreground">{item.code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {matrix.total > PREVIEW && (
                  <p className="border-t border-border px-3 py-2 text-[11px] text-foreground-faint">
                    {t.truncated(PREVIEW)}
                  </p>
                )}
              </div>
            )}
          </Pane>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
