"use client";

import * as React from "react";
import { Lock, Unlock } from "lucide-react";
import { decryptText, encryptText } from "@/lib/crypto";
import { translateError } from "@/lib/i18n";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DualPane, ErrorNote, OptionBar, Segmented } from "@/components/tools/tool-ui";

type Mode = "encrypt" | "decrypt";

const COPY = {
  zh: {
    encrypt: "加密",
    decrypt: "解密",
    password: "密码",
    passwordPlaceholder: "输入用于加密或解密的密码",
    plain: "原文",
    cipher: "密文",
    plainPlaceholder: "输入需要加密的文本…",
    cipherPlaceholder: "粘贴 v1.… 格式的密文…",
    runEncrypt: "加密",
    runDecrypt: "解密",
    running: "处理中…",
    needPassword: "请先输入密码",
    needInput: "请先输入内容",
    note: "使用 AES-GCM 加密、PBKDF2 派生密钥（21 万次迭代），全部在浏览器本地完成，密码不会离开本机。忘记密码无法恢复。",
    format: "密文自带随机盐与 IV，同样的密码每次结果都不同。",
  },
  en: {
    encrypt: "Encrypt",
    decrypt: "Decrypt",
    password: "Password",
    passwordPlaceholder: "Password used to encrypt or decrypt",
    plain: "Plain text",
    cipher: "Ciphertext",
    plainPlaceholder: "Text to encrypt…",
    cipherPlaceholder: "Paste a v1.… ciphertext…",
    runEncrypt: "Encrypt",
    runDecrypt: "Decrypt",
    running: "Working…",
    needPassword: "Enter a password first",
    needInput: "Enter some content first",
    note: "AES-GCM with a PBKDF2-derived key (210k iterations). Everything runs locally and the password never leaves your browser. A lost password cannot be recovered.",
    format: "Salt and IV are random per call, so the same password produces a different string each time.",
  },
};

export function TextEncryptTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<Mode>("encrypt");
  const [password, setPassword] = React.useState("");
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setOutput("");
    setError(null);
  };

  const run = async () => {
    setError(null);

    if (!input.trim()) {
      setError(t.needInput);
      return;
    }
    if (!password) {
      setError(t.needPassword);
      return;
    }

    setRunning(true);
    try {
      const result =
        mode === "encrypt"
          ? await encryptText(input, password)
          : await decryptText(input, password);
      setOutput(result);
    } catch (e) {
      setOutput("");
      setError(translateError(e, locale));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.encrypt}
          value={mode}
          onChange={switchMode}
          options={[
            { value: "encrypt", label: t.encrypt },
            { value: "decrypt", label: t.decrypt },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.password}</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.passwordPlaceholder}
            aria-label={t.password}
            autoComplete="off"
            size="sm"
            className="w-56"
          />
        </div>
        <Button
          type="button"
          variant="default"
          size="xs"
          onClick={run}
          disabled={running}
          className="ml-auto gap-1.5"
        >
          {mode === "encrypt" ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <Unlock className="h-3.5 w-3.5" />
          )}
          {running ? t.running : mode === "encrypt" ? t.runEncrypt : t.runDecrypt}
        </Button>
      </OptionBar>

      {error && <ErrorNote>{error}</ErrorNote>}

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={mode === "encrypt" ? t.plain : t.cipher}
        outputLabel={mode === "encrypt" ? t.cipher : t.plain}
        inputPlaceholder={mode === "encrypt" ? t.plainPlaceholder : t.cipherPlaceholder}
        onClear={() => {
          setInput("");
          setOutput("");
          setError(null);
        }}
        onSwap={() => {
          setInput(output);
          setOutput("");
          setMode(mode === "encrypt" ? "decrypt" : "encrypt");
        }}
        inputFooter={<span>{input.length}</span>}
        outputFooter={output ? <span>{output.length}</span> : null}
      />

      <div className="flex flex-col gap-1 text-xs leading-relaxed text-foreground-subtle">
        <p>{t.note}</p>
        <p>{t.format}</p>
      </div>
    </div>
  );
}
