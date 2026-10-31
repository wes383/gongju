"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { applyCipher, type CipherMode } from "@/lib/text";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    rot13: "ROT13",
    caesar: "凯撒位移",
    atbash: "Atbash",
    reverse: "字符反转",
    encrypt: "正向",
    decrypt: "反向",
    shift: "位移",
    plain: "原文",
    cipher: "结果",
    placeholder: "输入需要加密或解密的文本…",
    sampleText: "Hello, GongJu! 这是一段测试文本。",
    hint: "ROT13 / Atbash / 反转都是对称的，做两次就还原",
    warning:
      "这些是字符替换与移位，任何人都能还原，不能用来保护密码或隐私数据。",
  },
  en: {
    rot13: "ROT13",
    caesar: "Caesar",
    atbash: "Atbash",
    reverse: "Reverse",
    encrypt: "Forward",
    decrypt: "Reverse",
    shift: "Shift",
    plain: "Plain text",
    cipher: "Result",
    placeholder: "Text to encrypt or decrypt…",
    sampleText: "Hello, GongJu! This is a test string.",
    hint: "ROT13, Atbash and reversal are symmetric — applying twice restores the text",
    warning:
      "These are substitution ciphers. Anyone can reverse them, so never use them to protect passwords or private data.",
  },
};

const MODES: { value: CipherMode; key: keyof (typeof COPY)["zh"] }[] = [
  { value: "rot13", key: "rot13" },
  { value: "caesar", key: "caesar" },
  { value: "atbash", key: "atbash" },
  { value: "reverse", key: "reverse" },
];

export function TextCipherTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<CipherMode>("rot13");
  const [decrypt, setDecrypt] = React.useState(false);
  const [shift, setShift] = React.useState(3);

  const output = React.useMemo(
    () => applyCipher(input, mode, decrypt ? -shift : shift),
    [input, mode, shift, decrypt]
  );

  const symmetric = mode !== "caesar";

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.cipher}
          value={mode}
          onChange={setMode}
          options={MODES.map((m) => ({ value: m.value, label: t[m.key] as string }))}
        />
        {mode === "caesar" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground-muted">{t.shift}</span>
              <Input
                type="number"
                min={1}
                max={25}
                value={shift}
                onChange={(e) =>
                  setShift(Math.min(Math.max(Number(e.target.value) || 1, 1), 25))
                }
                aria-label={t.shift}
                size="xs"
                className="w-16 text-center font-mono"
              />
            </div>
            <Toggle checked={decrypt} onChange={setDecrypt} label={t.decrypt} />
          </>
        )}
        {symmetric && (
          <span className="ml-auto text-xs text-foreground-subtle">{t.hint}</span>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={t.plain}
        outputLabel={t.cipher}
        inputPlaceholder={t.placeholder}
        inputActions={<SampleButton onClick={() => setInput(t.sampleText)} />}
        onClear={() => setInput("")}
        onSwap={() => setInput(output)}
        inputFooter={<span>{input.length}</span>}
        outputFooter={output ? <span>{output.length}</span> : null}
      />

      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground-subtle">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange" />
        {t.warning}
      </p>
    </div>
  );
}
