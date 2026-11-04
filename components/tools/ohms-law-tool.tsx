"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { solveOhms, type OhmKey, type OhmValues } from "@/lib/circuit";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    inputs: "已知量",
    hint: "填两个就能算出另外两个：电压、电流、电阻、功率任选两个",
    result: "计算结果",
    empty: "至少填两个已知量",
    voltage: "电压",
    current: "电流",
    resistance: "电阻",
    power: "功率",
    unitVolt: "V",
    unitMilliAmp: "mA",
    unitOhm: "Ω",
    unitWatt: "W",
    formulas: "关系式",
    note: "欧姆定律 V = I × R，功率 P = V × I。电流按 mA 输入，内部换算成 A 再计算；填了三个以上的量时会互相校验，对不上会提示单位是否填错。",
  },
  en: {
    inputs: "Known values",
    hint: "Fill in any two of voltage, current, resistance and power",
    result: "Result",
    empty: "Fill in at least two values",
    voltage: "Voltage",
    current: "Current",
    resistance: "Resistance",
    power: "Power",
    unitVolt: "V",
    unitMilliAmp: "mA",
    unitOhm: "Ω",
    unitWatt: "W",
    formulas: "Relations",
    note: "Ohm's law gives V = I × R and P = V × I. Current is entered in mA and converted to A internally; supplying more than two values cross-checks them, so a unit slip shows up as a mismatch.",
  },
};

const FIELDS: { key: OhmKey; labelKey: "voltage" | "current" | "resistance" | "power"; unit: "unitVolt" | "unitMilliAmp" | "unitOhm" | "unitWatt" }[] = [
  { key: "voltage", labelKey: "voltage", unit: "unitVolt" },
  { key: "current", labelKey: "current", unit: "unitMilliAmp" },
  { key: "resistance", labelKey: "resistance", unit: "unitOhm" },
  { key: "power", labelKey: "power", unit: "unitWatt" },
];

function formatCurrent(amps: number): string {
  if (!Number.isFinite(amps)) return "—";
  if (amps !== 0 && Math.abs(amps) < 1) return `${formatNumber(amps * 1000, 4)} mA`;
  return `${formatNumber(amps, 4)} A`;
}

function formatPower(watts: number): string {
  if (!Number.isFinite(watts)) return "—";
  if (watts !== 0 && Math.abs(watts) < 1) return `${formatNumber(watts * 1000, 4)} mW`;
  return `${formatNumber(watts, 4)} W`;
}

export function OhmsLawTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [values, setValues] = React.useState<Record<OhmKey, string>>({
    voltage: "5",
    current: "",
    resistance: "220",
    power: "",
  });

  const filled = FIELDS.filter((field) => values[field.key].trim() !== "").length;

  const solved = React.useMemo(() => {
    const input: Partial<Record<OhmKey, number | null>> = {};
    for (const field of FIELDS) {
      const raw = values[field.key].trim();
      if (raw === "") continue;
      const parsed = Number(raw);
      input[field.key] = field.key === "current" ? parsed / 1000 : parsed;
    }
    return safe(() => solveOhms(input));
  }, [values]);

  const result: OhmValues | null = solved.value;
  const error = solved.error;
  const showError = Boolean(error) && filled >= 2;

  const rows: { key: OhmKey; label: string; display: string }[] = result
    ? [
        { key: "voltage", label: t.voltage, display: `${formatNumber(result.voltage, 6)} V` },
        { key: "current", label: t.current, display: formatCurrent(result.current) },
        { key: "resistance", label: t.resistance, display: `${formatNumber(result.resistance, 6)} Ω` },
        { key: "power", label: t.power, display: formatPower(result.power) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <header className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.inputs}
            </span>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">
                  {t[field.labelKey]}
                </span>
                <span className="flex items-center gap-1.5">
                  <Input
                    value={values[field.key]}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    inputMode="decimal"
                    placeholder="—"
                    className="w-full font-mono text-sm"
                    size="xs"
                  />
                  <span className="w-8 shrink-0 font-mono text-[11px] text-foreground-faint">
                    {t[field.unit]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
          {showError && <ErrorNote>{errorText(error, locale)}</ErrorNote>}
        </section>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>
                {result ? `V = ${formatNumber(result.voltage, 4)} V · I = ${formatCurrent(result.current)}` : "—"}
              </span>
            }
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((row) => (
                  <li key={row.key} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="w-16 shrink-0 text-[12px] text-foreground-subtle">
                      {row.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                      {row.display}
                    </span>
                    <CopyButton value={row.display.split(" ")[0]} size="icon-xs" />
                  </li>
                ))}
              </ul>
            )}
          </Pane>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.formulas}
          </span>
        </header>
        <div className="grid gap-2 px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground-muted sm:grid-cols-2">
          <span>V = I × R</span>
          <span>I = V / R</span>
          <span>R = V / I</span>
          <span>P = V × I = I² × R = V² / R</span>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
