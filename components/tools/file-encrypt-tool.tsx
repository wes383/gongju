"use client";

import * as React from "react";
import { Download, Eye, EyeOff, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilePicker } from "@/components/tools/file-picker";
import { ErrorNote, OptionBar, OptionField, Segmented, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { baseName, downloadBlob, formatBytes } from "@/lib/files";
import { decryptFile, encryptFile, FILE_CRYPTO_MAX_BYTES } from "@/lib/file-crypto";

type Mode = "encrypt" | "decrypt";

const MIN_PASSWORD = 8;

const COPY = {
  zh: {
    mode: "加密或解密",
    encrypt: "加密",
    decrypt: "解密",
    password: "密码",
    passwordPlaceholder: "至少 8 位，建议用长密码",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    runEncrypt: "加密并下载",
    runDecrypt: "解密并下载",
    running: "处理中…",
    needFile: "先选择一个文件",
    needPassword: "请输入密码",
    passwordTooShort: (n: number) => `密码至少 ${n} 位，文件加密没有找回通道，请用更长的密码`,
    pickHint: `任意类型的文件，最大 ${formatBytes(FILE_CRYPTO_MAX_BYTES)}；文件只在本机处理`,
    done: "完成",
    again: "重新选择",
    warning: "密码遗失后无法恢复：本工具不上传、不保存任何内容，也没有任何后门可以解开这个文件。",
    note: "AES-256-GCM 加密，密钥由 PBKDF2-HMAC-SHA256 派生（21 万次迭代），每个文件都使用随机盐与 IV。密文头部记录原文件名与类型，并作为附加认证数据保护，改动一个字节就会解密失败。",
    original: "原始文件",
    output: "输出文件",
  },
  en: {
    mode: "Encrypt or decrypt",
    encrypt: "Encrypt",
    decrypt: "Decrypt",
    password: "Password",
    passwordPlaceholder: "8 characters minimum, longer is better",
    showPassword: "Show password",
    hidePassword: "Hide password",
    runEncrypt: "Encrypt & download",
    runDecrypt: "Decrypt & download",
    running: "Working…",
    needFile: "Pick a file first",
    needPassword: "Enter a password",
    passwordTooShort: (n: number) =>
      `Use at least ${n} characters — there is no recovery path for an encrypted file`,
    pickHint: `Any file type up to ${formatBytes(FILE_CRYPTO_MAX_BYTES)}, processed on your device`,
    done: "Done",
    again: "Pick another",
    warning: "A lost password cannot be recovered: nothing is uploaded or stored, and there is no backdoor to open the file again.",
    note: "AES-256-GCM with a PBKDF2-HMAC-SHA256 key (210k iterations) and a random salt and IV per file. The header carries the original name and type and is authenticated as additional data, so changing a single byte breaks decryption.",
    original: "Original",
    output: "Output",
  },
};

export function FileEncryptTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<Mode>("encrypt");
  const [files, setFiles] = React.useState<File[]>([]);
  const [password, setPassword] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ blob: Blob; name: string; original: number } | null>(
    null
  );

  const file = files[0] ?? null;

  const switchMode = (next: Mode) => {
    setMode(next);
    setResult(null);
    setError(null);
  };

  const run = async () => {
    setError(null);
    if (!file) {
      setError(t.needFile);
      return;
    }
    if (!password) {
      setError(t.needPassword);
      return;
    }
    if (mode === "encrypt" && password.length < MIN_PASSWORD) {
      setError(t.passwordTooShort(MIN_PASSWORD));
      return;
    }

    setBusy(true);
    try {
      if (mode === "encrypt") {
        const blob = await encryptFile(file, password);
        setResult({ blob, name: `${baseName(file.name, "file")}.enc`, original: file.size });
      } else {
        const opened = await decryptFile(file, password);
        setResult({ blob: opened.blob, name: opened.name, original: file.size });
      }
    } catch (err) {
      setResult(null);
      setError(errorText(err, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={switchMode}
          options={[
            { value: "encrypt", label: t.encrypt },
            { value: "decrypt", label: t.decrypt },
          ]}
        />
        <OptionField label={t.password}>
          <div className="relative">
            <Input
              type={visible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t.passwordPlaceholder}
              aria-label={t.password}
              autoComplete="new-password"
              size="xs"
              className="w-64 pr-9 font-mono"
            />
            <button
              type="button"
              onClick={() => setVisible((prev) => !prev)}
              aria-label={visible ? t.hidePassword : t.showPassword}
              title={visible ? t.hidePassword : t.showPassword}
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-foreground-faint transition-colors hover:bg-hover-bg hover:text-foreground"
            >
              {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </OptionField>
        <div className="ml-auto">
          <Button
            type="button"
            size="xs"
            onClick={run}
            disabled={busy || !file}
            className="gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : mode === "encrypt" ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
            {busy ? t.running : mode === "encrypt" ? t.runEncrypt : t.runDecrypt}
          </Button>
        </div>
      </OptionBar>

      <FilePicker
        files={files}
        hint={t.pickHint}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          setFiles([picked]);
          setResult(null);
          setError(null);
        }}
        onRemove={() => {
          setFiles([]);
          setResult(null);
        }}
        onClear={() => {
          setFiles([]);
          setResult(null);
          setError(null);
        }}
      />

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {result && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {mode === "encrypt" ? (
              <Lock className="h-4 w-4 text-green-fg" />
            ) : (
              <Unlock className="h-4 w-4 text-green-fg" />
            )}
            <span className="text-sm font-medium text-foreground">{t.done}</span>
            <span className="ml-auto">
              <Button
                type="button"
                size="xs"
                className="gap-1.5"
                onClick={() => downloadBlob(result.blob, result.name)}
              >
                <Download className="h-3.5 w-3.5" />
                {result.name}
              </Button>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[11px] text-foreground-subtle">{t.original}</p>
              <p className="font-mono text-foreground">{formatBytes(result.original)}</p>
            </div>
            <div>
              <p className="text-[11px] text-foreground-subtle">{t.output}</p>
              <p className="font-mono text-foreground">
                {result.name} · {formatBytes(result.blob.size)}
              </p>
            </div>
          </div>
        </section>
      )}

      {mode === "encrypt" && <WarningNote>{t.warning}</WarningNote>}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
