"use client";

import * as React from "react";
import { FileUp } from "lucide-react";
import {
  CopyButton,
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseCsv, type CsvTable } from "@/lib/csv";
import { codedError } from "@/lib/errors";
import { buildSql, SQL_SAMPLE, type SqlDialect } from "@/lib/sql";

const COPY = {
  zh: {
    table: "表名",
    dialect: "方言",
    create: "包含 CREATE TABLE",
    batch: "每批行数",
    import: "导入 CSV",
    inputLabel: "表格数据",
    outputLabel: "SQL",
    inputPlaceholder: "粘贴 CSV / TSV，第一行作为列名",
    tableName: "表名",
    note: "列名来自第一行，类型按整列内容推断（整数 / 小数 / 日期 / 布尔 / 文本）；空单元格写成 NULL，单引号自动转义。只生成 SQL 文本，不会连接任何数据库。",
  },
  en: {
    table: "Table",
    dialect: "Dialect",
    create: "Include CREATE TABLE",
    batch: "Rows per batch",
    import: "Import CSV",
    inputLabel: "Table data",
    outputLabel: "SQL",
    inputPlaceholder: "Paste CSV / TSV; the first row becomes the columns",
    tableName: "Table name",
    note: "Column names come from the first row and types are inferred from each column (integer / decimal / date / boolean / text); empty cells become NULL and quotes are escaped. This only writes SQL text and never connects to a database.",
  },
};

export function SqlGenerateTool() {
  const t = useCopy(COPY);
  const locale = useLocale();

  const [input, setInput] = React.useState(SQL_SAMPLE);
  const [tableName, setTableName] = React.useState("users");
  const [dialect, setDialect] = React.useState<SqlDialect>("mysql");
  const [includeCreate, setIncludeCreate] = React.useState(true);
  const [batch, setBatch] = React.useState("1");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const table: CsvTable | null = React.useMemo(() => {
    if (!input.trim()) return null;
    try {
      return parseCsv(input);
    } catch {
      return null;
    }
  }, [input]);

  const error = React.useMemo(() => {
    if (!input.trim()) return null;
    return table ? null : codedError("csv.empty");
  }, [input, table]);

  const output = React.useMemo(() => {
    if (!table) return "";
    return buildSql(table, {
      table: tableName || "table_name",
      dialect,
      includeCreate,
      batchSize: Number(batch),
    });
  }, [table, tableName, dialect, includeCreate, batch]);

  return (
    <div className="flex flex-col gap-3">
      <OptionBar>
        <label className="flex items-center gap-2 text-xs text-foreground-muted">
          {t.table}
          <Input
            size="xs"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder={t.tableName}
            aria-label={t.table}
            className="w-36 font-mono"
          />
        </label>
        <Segmented
          ariaLabel={t.dialect}
          value={dialect}
          onChange={setDialect}
          options={[
            { value: "mysql", label: "MySQL" },
            { value: "postgres", label: "Postgres" },
            { value: "sqlite", label: "SQLite" },
          ]}
        />
        <Toggle checked={includeCreate} onChange={setIncludeCreate} label={t.create} />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-foreground-muted">{t.batch}</span>
          <Segmented
            ariaLabel={t.batch}
            value={batch}
            onChange={setBatch}
            options={[
              { value: "1", label: "1" },
              { value: "10", label: "10" },
              { value: "50", label: "50" },
            ]}
          />
        </div>
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        error={error}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.inputPlaceholder}
        inputActions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => fileRef.current?.click()}
              className="gap-1.5 text-foreground-muted"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>{t.import}</span>
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setInput(await file.text());
              }}
            />
            <SampleButton onClick={() => setInput(SQL_SAMPLE)} />
          </>
        }
        outputActions={<CopyButton value={output} />}
        onClear={() => setInput("")}
        inputFooter={<span>{table ? `${table.rows.length} × ${table.header.length}` : ""}</span>}
        outputFooter={
          <span>
            {table ? `${table.rows.length} ${locale === "zh" ? "行" : "rows"}` : ""}
          </span>
        }
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
