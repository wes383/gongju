"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { nanoid, randomString, ulid } from "@/lib/random";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { CopyButton, OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    type: "类型",
    random: "自定义字符集",
    nanoid: "NanoID",
    ulid: "ULID",
    length: "长度",
    alphabet: "字符集",
    count: "数量",
    generate: "重新生成",
    copyAll: "复制全部",
    noteRandom: "字符集里重复的字符会被忽略；生成使用 crypto.getRandomValues。",
    noteNanoid: "NanoID 默认 21 位，用 64 个 URL 安全字符，21 位约等于 126 bit 随机性。",
    noteUlid: "ULID 是 26 位 Crockford Base32：前 10 位时间戳 + 后 16 位随机，按字典序即按时间排序。",
    empty: "字符集不能为空",
  },
  en: {
    type: "Type",
    random: "Custom alphabet",
    nanoid: "NanoID",
    ulid: "ULID",
    length: "Length",
    alphabet: "Alphabet",
    count: "Count",
    generate: "Regenerate",
    copyAll: "Copy all",
    noteRandom: "Duplicate characters in the alphabet are ignored. Generation uses crypto.getRandomValues.",
    noteNanoid: "NanoID defaults to 21 characters from a 64-symbol URL-safe alphabet — about 126 bits.",
    noteUlid: "ULID is 26 Crockford Base32 characters: 10 of timestamp plus 16 random, so lexicographic order matches time.",
    empty: "The alphabet cannot be empty",
  },
};

type Kind = "random" | "nanoid" | "ulid";

const DEFAULT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function RandomStringTool() {
  const t = useCopy(COPY);
  const [kind, setKind] = React.useState<Kind>("random");
  const [length, setLength] = React.useState(16);
  const [alphabet, setAlphabet] = React.useState(DEFAULT_ALPHABET);
  const [count, setCount] = React.useState(5);
  const [nonce, setNonce] = React.useState(0);
  const [values, setValues] = React.useState<string[]>([]);

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const total = Math.min(Math.max(count, 1), 100);
      const size = Math.min(Math.max(length, 1), 128);
      const unique = [...new Set(alphabet)].join("");

      setValues(
        Array.from({ length: total }, () => {
          if (kind === "ulid") return ulid();
          if (kind === "nanoid") return nanoid(size);
          return randomString(size, unique);
        })
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, [kind, length, alphabet, count, nonce]);

  const note = kind === "ulid" ? t.noteUlid : kind === "nanoid" ? t.noteNanoid : t.noteRandom;
  const empty = kind === "random" && alphabet.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.type}
          value={kind}
          onChange={setKind}
          options={[
            { value: "random", label: t.random },
            { value: "nanoid", label: t.nanoid },
            { value: "ulid", label: t.ulid },
          ]}
        />
        {kind !== "ulid" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground-muted">{t.length}</span>
            <Input
              type="number"
              min={1}
              max={128}
              value={length}
              onChange={(e) => setLength(Math.min(Math.max(Number(e.target.value) || 1, 1), 128))}
              aria-label={t.length}
              size="xs"
              className="w-16 text-center font-mono"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.count}</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 100))}
            aria-label={t.count}
            size="xs"
            className="w-16 text-center font-mono"
          />
        </div>
        <Button
          type="button"
          variant="default"
          size="xs"
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t.generate}
        </Button>
        <CopyButton value={values.join("\n")} label={t.copyAll} />
      </OptionBar>

      {kind === "random" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <span className="text-xs font-medium text-foreground-muted">{t.alphabet}</span>
          <Input
            value={alphabet}
            onChange={(e) => setAlphabet(e.target.value)}
            aria-label={t.alphabet}
            spellCheck={false}
            className="font-mono text-sm"
            size="xs"
          />
        </div>
      )}

      {empty ? (
        <p className="py-10 text-center text-sm text-red-fg">{t.empty}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {values.map((value, i) => (
            <div
              key={`${value}-${i}`}
              className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0"
            >
              <span className="w-6 shrink-0 font-mono text-[11px] text-foreground-faint">{i + 1}</span>
              <code className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-foreground">
                {value}
              </code>
              <CopyButton value={value} size="icon-xs" />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{note}</p>
    </div>
  );
}
