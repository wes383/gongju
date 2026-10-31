"use client";

import * as React from "react";
import { format } from "sql-formatter";
import { useCopy } from "@/components/locale-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DualPane, OptionBar, OptionField, SampleButton, Segmented } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    dialect: "方言",
    mode: "操作",
    format: "格式化",
    minify: "压缩",
    keyword: "关键字",
    upper: "大写",
    lower: "小写",
    keep: "保持",
    indent: "缩进",
    note: "压缩会去掉注释并合并空白，字符串里的内容保持原样；格式化基于 sql-formatter，不同方言的关键字与函数识别略有差异。",
    failed: "SQL 解析失败",
    empty: "输入 SQL 后显示结果",
    sample: "示例",
  },
  en: {
    dialect: "Dialect",
    mode: "Action",
    format: "Format",
    minify: "Minify",
    keyword: "Keywords",
    upper: "UPPER",
    lower: "lower",
    keep: "Keep",
    indent: "Indent",
    note: "Minify strips comments and collapses whitespace while leaving string literals untouched; formatting uses sql-formatter, whose keyword sets vary per dialect.",
    failed: "Could not parse the SQL",
    empty: "Type SQL to see the result",
    sample: "Sample",
  },
};

const DIALECTS: { value: string; label: string }[] = [
  { value: "sql", label: "Standard SQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "transactsql", label: "SQL Server" },
  { value: "plsql", label: "Oracle" },
  { value: "bigquery", label: "BigQuery" },
  { value: "hive", label: "Hive" },
  { value: "spark", label: "Spark" },
  { value: "duckdb", label: "DuckDB" },
  { value: "clickhouse", label: "ClickHouse" },
];

const SAMPLE = `select u.id, u.name, count(o.id) as orders, sum(o.total) as spent
from users u
left join orders o on o.user_id = u.id
where u.created_at >= '2026-01-01' and u.status = 'active'
group by u.id, u.name
having count(o.id) > 3
order by spent desc
limit 20;`;

/**
 * Strip comments and collapse whitespace. String literals are copied verbatim,
 * so `'a -- b'` survives untouched.
 */
function minifySql(sql: string): string {
  let out = "";
  let quote: string | null = null;
  let pendingSpace = false;

  const flushSpace = () => {
    if (pendingSpace && out.length > 0) out += " ";
    pendingSpace = false;
  };

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];

    if (quote) {
      out += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          out += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (/\s/.test(ch)) {
      pendingSpace = true;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      pendingSpace = true;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i += 1;
      pendingSpace = true;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      flushSpace();
      quote = ch;
      out += ch;
      continue;
    }

    flushSpace();
    out += ch;
  }

  return out.trim();
}

export function SqlFormatTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState(SAMPLE);
  const [dialect, setDialect] = React.useState("mysql");
  const [mode, setMode] = React.useState<"format" | "minify">("format");
  const [keywordCase, setKeywordCase] = React.useState<"upper" | "lower" | "preserve">("upper");
  const [indent, setIndent] = React.useState(2);

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: "", error: null as string | null };
    if (mode === "minify") return { value: minifySql(input), error: null };
    try {
      const value = format(input, {
        language: dialect as never,
        keywordCase,
        tabWidth: indent,
        linesBetweenQueries: 1,
      });
      return { value, error: null };
    } catch (err) {
      return {
        value: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }, [input, dialect, mode, keywordCase, indent]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.dialect}>
          <Select value={dialect} onValueChange={setDialect}>
            <SelectTrigger size="xs" aria-label={t.dialect} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIALECTS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <>
            <OptionField label={t.keyword}>
              <Segmented
                ariaLabel={t.keyword}
                value={keywordCase}
                onChange={setKeywordCase}
                options={[
                  { value: "upper", label: t.upper },
                  { value: "lower", label: t.lower },
                  { value: "preserve", label: t.keep },
                ]}
              />
            </OptionField>

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
          </>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.value}
        error={result.error}
        inputLabel="SQL"
        outputLabel={mode === "format" ? "SQL" : "SQL · min"}
        inputPlaceholder="SELECT …"
        inputActions={<SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />}
        onClear={() => setInput("")}
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
