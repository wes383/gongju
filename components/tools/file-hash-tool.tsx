"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { FilePicker, fileKey } from "@/components/tools/file-picker";
import { CopyButton, ErrorNote, OptionBar } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { HASH_ALGORITHMS, hashFile, type HashAlgorithm } from "@/lib/hash";
import { formatBytes } from "@/lib/files";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    algorithms: "算法",
    pickFirst: "选择一个文件后自动计算",
    empty: "结果会显示在这里",
    legacy: "已不安全",
    computing: "正在计算",
    copyAll: "复制全部",
    elapsed: "耗时",
    note: "文件按 4 MB 分片流式读取，几个 GB 的文件也不会占满内存；MD5 与 SHA-1 存在已知碰撞攻击，只适合校验完整性。",
    hint: "文件不会上传，全部在本地计算",
  },
  en: {
    algorithms: "Algorithms",
    pickFirst: "Pick a file to hash it",
    empty: "Digests appear here",
    legacy: "Broken",
    computing: "Hashing",
    copyAll: "Copy all",
    elapsed: "Took",
    note: "Files are streamed in 4 MB slices, so even a multi-gigabyte file stays out of memory. MD5 and SHA-1 have known collisions — fine for checksums, not for signatures.",
    hint: "Nothing is uploaded, all hashing happens locally",
  },
};

const DEFAULT: HashAlgorithm[] = ["md5", "sha1", "sha256"];

export function FileHashTool() {
  const t = useCopy(COPY);
  const [file, setFile] = React.useState<File | null>(null);
  const [selected, setSelected] = React.useState<HashAlgorithm[]>(DEFAULT);
  const [digests, setDigests] = React.useState<Partial<Record<HashAlgorithm, string>>>({});
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [elapsed, setElapsed] = React.useState<number | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const runId = React.useRef(0);

  const compute = React.useCallback(async (target: File, algorithms: HashAlgorithm[]) => {
    const id = ++runId.current;
    setBusy(true);
    setError(null);
    setProgress(0);
    setDigests({});
    setElapsed(null);
    const started = performance.now();
    try {
      const result = await hashFile(target, algorithms, (ratio) => {
        if (id === runId.current) setProgress(ratio);
      });
      if (id !== runId.current) return;
      setDigests(result);
      setElapsed(performance.now() - started);
    } catch (err) {
      if (id === runId.current) setError(err);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  }, []);

  const toggleAlgorithm = (algorithm: HashAlgorithm) => {
    const next = selected.includes(algorithm)
      ? selected.filter((a) => a !== algorithm)
      : [...selected, algorithm];
    if (next.length === 0) return;
    setSelected(next);
    if (file) void compute(file, next);
  };

  const composite = HASH_ALGORITHMS.filter((a) => digests[a.value])
    .map((a) => `${a.label.toLowerCase()}: ${digests[a.value]}`)
    .join("\n");

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={file ? [file] : []}
        hint={t.hint}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          setFile(picked);
          void compute(picked, selected);
        }}
        onRemove={(key) => {
          if (file && fileKey(file) === key) {
            setFile(null);
            setDigests({});
            setElapsed(null);
            setError(null);
            runId.current += 1;
            setBusy(false);
          }
        }}
        onClear={() => {
          setFile(null);
          setDigests({});
          setElapsed(null);
          setError(null);
          runId.current += 1;
          setBusy(false);
        }}
      />

      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.algorithms}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {HASH_ALGORITHMS.map((algorithm) => {
            const active = selected.includes(algorithm.value);
            return (
              <button
                key={algorithm.value}
                type="button"
                onClick={() => toggleAlgorithm(algorithm.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors duration-base ease-out",
                  active
                    ? "border-transparent bg-accent text-accent-fg"
                    : "border-border bg-surface text-foreground-muted hover:bg-hover-bg hover:text-foreground"
                )}
              >
                {algorithm.label}
                {algorithm.legacy && (
                  <span className={active ? "text-accent-fg/70" : "text-foreground-faint"}>
                    · {t.legacy}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </OptionBar>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-2.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {file ? file.name : t.empty}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {elapsed !== null && (
              <span className="font-mono text-[11px] text-foreground-faint">
                {t.elapsed} {(elapsed / 1000).toFixed(2)} s
              </span>
            )}
            <CopyButton value={composite} label={t.copyAll} />
          </div>
        </header>

        {busy && (
          <div className="flex items-center gap-3 border-b border-border px-4 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-subtle" />
            <span className="font-mono text-[11px] text-foreground-subtle">
              {t.computing} {Math.round(progress * 100)}%
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-hover-bg">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {error != null ? (
          <div className="p-3">
            <ErrorNote>{String((error as Error)?.message ?? error)}</ErrorNote>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {HASH_ALGORITHMS.filter((a) => selected.includes(a.value)).map((algorithm) => (
              <li key={algorithm.value} className="flex items-start gap-3 px-4 py-3">
                <span className="w-20 shrink-0 pt-0.5 font-mono text-[11px] uppercase text-foreground-subtle">
                  {algorithm.label}
                </span>
                <span className="min-w-0 flex-1 break-all font-mono text-[12px] leading-relaxed text-foreground">
                  {digests[algorithm.value] ?? (
                    <span className="text-foreground-faint">{file ? t.computing : t.pickFirst}</span>
                  )}
                </span>
                <CopyButton
                  value={digests[algorithm.value] ?? ""}
                  size="icon-xs"
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        )}

        {file && (
          <footer className="flex h-9 items-center gap-2 border-t border-border px-4 font-mono text-[11px] text-foreground-faint">
            <span>{formatBytes(file.size)}</span>
            <span>·</span>
            <span>{file.type || "application/octet-stream"}</span>
          </footer>
        )}
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
