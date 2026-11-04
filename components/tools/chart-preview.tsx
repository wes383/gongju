"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatChartNumber,
  textWidth,
  type ChartData,
  type ChartKind,
  type ChartTheme,
} from "@/lib/chart";

const ROW_HEIGHT = 20;

export interface ChartPreviewProps {
  data: ChartData;
  kind: ChartKind;
  title: string;
  showLegend: boolean;
  showValues: boolean;
  theme: ChartTheme;
  width: number;
  height: number;
  /** Resolved series colours for the selected palette */
  colors: readonly string[];
  lineWidth: number;
  curve: "monotone" | "linear";
  /** Dot radius in px; 0 hides the data points */
  dotSize: number;
  barRadius: number;
  showGrid: boolean;
}

interface LegendEntry {
  name: string;
  color: string;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function layoutLegend(entries: LegendEntry[], maxWidth: number): LegendEntry[][] {
  const rows: LegendEntry[][] = [];
  let row: LegendEntry[] = [];
  let cursor = 0;
  for (const entry of entries) {
    const width = textWidth(entry.name, 12) + 30;
    if (cursor + width > maxWidth && row.length > 0) {
      rows.push(row);
      row = [];
      cursor = 0;
    }
    row.push(entry);
    cursor += width;
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

function SvgLegend({
  rows,
  x,
  y,
  theme,
}: {
  rows: LegendEntry[][];
  x: number;
  y: number;
  theme: ChartTheme;
}) {
  return (
    <g>
      {rows.map((row, rowIndex) => {
        let offset = 0;
        return row.map((entry) => {
          const left = offset;
          offset += textWidth(entry.name, 12) + 30;
          return (
            <g
              key={`${rowIndex}-${left}`}
              transform={`translate(${x + left},${y + rowIndex * ROW_HEIGHT})`}
            >
              <circle cx={4} cy={0} r={4} fill={entry.color} />
              <text x={15} y={4} fontSize={12} fill={theme.muted}>
                {entry.name}
              </text>
            </g>
          );
        });
      })}
    </g>
  );
}

function SvgTitle({ title, theme }: { title: string; theme: ChartTheme }) {
  if (!title) return null;
  return (
    <text x={24} y={27} fontSize={17} fontWeight={600} fill={theme.text}>
      {title}
    </text>
  );
}

function seriesRows(data: ChartData): Record<string, string | number | null>[] {
  return data.labels.map((label, index) => {
    const row: Record<string, string | number | null> = { label };
    data.series.forEach((series, seriesIndex) => {
      row[`s${seriesIndex}`] = series.values[index] ?? null;
    });
    return row;
  });
}

function numericLabel(value: string): number | null {
  const cleaned = value.replace(/[,\s%]/g, "");
  return cleaned !== "" && Number.isFinite(Number(cleaned)) ? Number(cleaned) : null;
}

function ChartCanvas({
  data,
  kind,
  title,
  showLegend,
  showValues,
  theme,
  width,
  height,
  colors: palette,
  lineWidth,
  curve,
  dotSize,
  barRadius,
  showGrid,
}: ChartPreviewProps) {
  const keys = data.series.map((_, index) => `s${index}`);
  const colors = data.series.map((_, index) => palette[index % palette.length]);
  const dots =
    dotSize > 0 && data.labels.length <= 40
      ? (seriesIndex: number) => ({
          r: dotSize,
          fill: colors[seriesIndex],
          stroke: theme.background,
          strokeWidth: Math.max(1, dotSize * 0.4),
        })
      : () => false;
  const activeDot = (seriesIndex: number) => ({
    r: dotSize > 0 ? dotSize + 2 : 5,
    fill: colors[seriesIndex],
    stroke: theme.background,
    strokeWidth: Math.max(1.4, (dotSize > 0 ? dotSize : 5) * 0.35),
  });
  const entries: LegendEntry[] = data.series.map((series, index) => ({
    name: series.name,
    color: colors[index],
  }));

  const titleHeight = title ? 28 : 0;
  const legendRows = showLegend ? layoutLegend(entries, width - 48) : [];
  const legendTop = titleHeight + 12;
  const plotTop = legendRows.length
    ? legendTop + (legendRows.length - 1) * ROW_HEIGHT + 22
    : titleHeight + 14;

  const tooltip = {
    contentStyle: {
      background: theme.background,
      border: `1px solid ${theme.grid}`,
      borderRadius: 8,
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)",
      fontSize: 12,
      color: theme.text,
      padding: "8px 10px",
    },
    labelStyle: { color: theme.muted, marginBottom: 4 },
    itemStyle: { color: theme.text, padding: 0 },
    formatter: (value: unknown) => formatChartNumber(Number(value)),
  };

  if (kind === "pie") {
    const values = (data.series[0]?.values ?? []).map((value) =>
      value === null ? 0 : Math.max(0, value)
    );
    const total = values.reduce((sum, value) => sum + value, 0);
    const top = titleHeight;
    const available = height - top - 20;
    const radius = Math.max(52, Math.min(width * 0.22, available * 0.4));
    const cx = showLegend ? 32 + radius : width / 2;
    const cy = top + available / 2;
    const pieData = data.labels.map((label, index) => ({
      name: label,
      value: values[index],
      percent: total > 0 ? Math.round((values[index] / total) * 10000) / 100 : 0,
    }));
    const legendEntries = pieData.map((slice, index) => ({
      ...slice,
      color: palette[index % palette.length],
    }));
    const legendHeight = legendEntries.length * 22;
    const legendY = cy - legendHeight / 2 + 11;

    return (
      <PieChart width={width} height={height}>
        <SvgTitle title={title} theme={theme} />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx={cx}
          cy={cy}
          innerRadius={radius * 0.5}
          outerRadius={radius}
          paddingAngle={1}
          stroke={theme.background}
          strokeWidth={2}
          isAnimationActive={false}
        >
          {pieData.map((slice, index) => (
            <Cell key={index} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltip} />
        {showLegend && (
          <g transform={`translate(${cx + radius + 34},${legendY})`}>
            {legendEntries.map((entry, index) => (
              <g key={index} transform={`translate(0,${index * 22})`}>
                <circle cx={4} cy={0} r={4} fill={entry.color} />
                <text x={16} y={4} fontSize={12} fill={theme.text}>
                  {truncate(entry.name, 18)}
                </text>
                <text x={24 + textWidth(truncate(entry.name, 18), 12)} y={4} fontSize={12} fill={theme.muted}>
                  {entry.percent}%
                </text>
              </g>
            ))}
          </g>
        )}
      </PieChart>
    );
  }

  const rows = seriesRows(data);
  const commonAxes = (
    <>
      {showGrid && <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.grid} />}
      <XAxis
        dataKey="label"
        tick={{ fill: theme.muted, fontSize: 11 }}
        axisLine={{ stroke: theme.axis }}
        tickLine={false}
        tickMargin={8}
        interval="preserveStartEnd"
        minTickGap={16}
      />
      <YAxis
        width={56}
        tick={{ fill: theme.muted, fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        tickMargin={6}
        tickFormatter={(value: number) => formatChartNumber(value)}
        domain={[
          (dataMin: number) => Math.min(0, dataMin),
          (dataMax: number) => Math.max(0, dataMax),
        ]}
      />
      <Tooltip {...tooltip} cursor={{ fill: theme.grid, fillOpacity: 0.28 }} />
      <ReferenceLine y={0} stroke={theme.axis} strokeWidth={1.2} />
    </>
  );

  const legend = showLegend ? (
    <SvgLegend rows={legendRows} x={24} y={legendTop} theme={theme} />
  ) : null;

  if (kind === "scatter") {
    const xValues = data.labels.map((label) => numericLabel(label));
    const xNumeric = xValues.every((value) => value !== null);
    return (
      <ScatterChart width={width} height={height} margin={{ top: plotTop, right: 24, bottom: 8, left: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="4 4" stroke={theme.grid} />}
        <XAxis
          type="number"
          dataKey="x"
          tick={{ fill: theme.muted, fontSize: 11 }}
          axisLine={{ stroke: theme.axis }}
          tickLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: number) =>
            xNumeric ? formatChartNumber(value) : truncate(data.labels[Math.round(value)] ?? "", 10)
          }
        />
        <YAxis
          type="number"
          dataKey="y"
          width={56}
          tick={{ fill: theme.muted, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={6}
          tickFormatter={(value: number) => formatChartNumber(value)}
        />
        <Tooltip {...tooltip} cursor={{ strokeDasharray: "4 4", stroke: theme.grid }} />
        <ReferenceLine y={0} stroke={theme.axis} strokeWidth={1.2} />
        {data.series.map((series, seriesIndex) => (
          <Scatter
            key={seriesIndex}
            name={series.name}
            fill={colors[seriesIndex]}
            fillOpacity={0.9}
            isAnimationActive={false}
            data={data.labels
              .map((_, index) => ({
                x: xNumeric ? (xValues[index] as number) : index,
                y: series.values[index],
              }))
              .filter((point) => point.y !== null && point.y !== undefined)}
          />
        ))}
        <SvgTitle title={title} theme={theme} />
        {legend}
      </ScatterChart>
    );
  }

  if (kind === "bar") {
    return (
      <BarChart
        width={width}
        height={height}
        data={rows}
        margin={{ top: plotTop, right: 24, bottom: 8, left: 0 }}
        barCategoryGap="20%"
      >
        {commonAxes}
        {data.series.map((series, seriesIndex) => (
          <Bar
            key={seriesIndex}
            dataKey={keys[seriesIndex]}
            name={series.name}
            fill={colors[seriesIndex]}
            radius={[barRadius, barRadius, 0, 0]}
            maxBarSize={56}
            isAnimationActive={false}
          >
            {showValues && (
              <LabelList
                dataKey={keys[seriesIndex]}
                position="top"
                offset={6}
                fill={theme.muted}
                fontSize={10}
                formatter={(value: unknown) => formatChartNumber(Number(value))}
              />
            )}
          </Bar>
        ))}
        <SvgTitle title={title} theme={theme} />
        {legend}
      </BarChart>
    );
  }

  if (kind === "area") {
    return (
      <AreaChart width={width} height={height} data={rows} margin={{ top: plotTop, right: 24, bottom: 8, left: 0 }}>
        {commonAxes}
        {data.series.map((series, seriesIndex) => (
          <Area
            key={seriesIndex}
            type={curve}
            dataKey={keys[seriesIndex]}
            name={series.name}
            stroke={colors[seriesIndex]}
            fill={colors[seriesIndex]}
            fillOpacity={0.16}
            strokeWidth={lineWidth}
            dot={dots(seriesIndex)}
            activeDot={activeDot(seriesIndex)}
            isAnimationActive={false}
          />
        ))}
        <SvgTitle title={title} theme={theme} />
        {legend}
      </AreaChart>
    );
  }

  return (
    <LineChart width={width} height={height} data={rows} margin={{ top: plotTop, right: 24, bottom: 8, left: 0 }}>
      {commonAxes}
      {data.series.map((series, seriesIndex) => (
        <Line
          key={seriesIndex}
          type={curve}
          dataKey={keys[seriesIndex]}
          name={series.name}
          stroke={colors[seriesIndex]}
          strokeWidth={lineWidth}
          dot={dots(seriesIndex)}
          activeDot={activeDot(seriesIndex)}
          connectNulls={false}
          isAnimationActive={false}
        />
      ))}
      <SvgTitle title={title} theme={theme} />
      {legend}
    </LineChart>
  );
}

/**
 * Measures the pane so the chart layout (legend rows, pie radius) matches the
 * rendered width, while the parent still knows the fixed export dimensions.
 */
export function ChartPreview(props: ChartPreviewProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [renderWidth, setRenderWidth] = React.useState(0);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setRenderWidth(next);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const renderHeight =
    renderWidth > 0 ? Math.round((renderWidth * props.height) / props.width) : 0;

  return (
    <div
      ref={hostRef}
      className="w-full"
      style={{ aspectRatio: `${props.width} / ${props.height}` }}
    >
      {renderWidth > 0 ? (
        <ChartCanvas {...props} width={renderWidth} height={renderHeight} />
      ) : null}
    </div>
  );
}

