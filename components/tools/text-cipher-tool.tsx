"use client";

import * as React from "react";
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
    encrypt: "加密",
    decrypt: "解密",
    shift: "位移",
    plain: "原文",
    cipher: "结果",
    placeholder: "输入需要加密或解密的文本…",
    sampleText: "Hello, GongJu! 这是一段测试文本。",
    hint: "ROT13 / Atbash / 反转都是对称的，加密即解密",
  },
  en: {
    rot13: "ROT13",
    caesar: "Caesar",
    atbash: "Atbash",
    reverse: "Reverse",
    encrypt: "Encrypt",
    decrypt: "Decrypt",
    shift: "Shift",
    plain: "Plain text",
    cipher: "Result",
    placeholder: "Text to encrypt or decrypt…",
    sampleText: "Hello, GongJu! 这是一段测试文本。",
    hint: "ROT13, Atbash and reversal are symmetric — encrypting twice restores the text",
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
    </div>
  );
}
