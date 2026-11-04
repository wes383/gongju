"use client";

import * as React from "react";
import { CopyButton, ErrorNote, InputArea, Pane, SampleButton, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { checksumAll, parseHexBytes, textBytes, type ChecksumEntry } from "@/lib/checksum";

const SAMPLE = "01 03 00 00 00 0A";

const COPY = {
  zh: {
    input: "帧数据",
    hex: "十六进制",
    ascii: "ASCII 文本",
    sample: "示例",
    placeholder: "01 03 00 00 00 0A",
    asciiPlaceholder: "AT+CSQ",
    results: "校验值",
    empty: "输入一帧数据，这里列出常用的校验方式",
    labels: {
      sum8: "累加和 SUM8",
      xor8: "异或 XOR8（NMEA）",
      lrc: "LRC（Modbus ASCII）",
      crc8: "CRC-8/MAXIM",
      crc16modbus: "CRC-16/MODBUS",
      crc16ccitt: "CRC-16/CCITT-FALSE",
      crc16xmodem: "CRC-16/XMODEM",
    } as Record<string, string>,
    wire: "低字节在前",
    bytes: (n: number) => `${n} 字节`,
    note: "SUM8 按字节累加取低 8 位；XOR8 用于 NMEA-0183；LRC 是累加和的二进制补码，用于 Modbus ASCII；CRC-16/MODBUS 在线上低字节先发。全部在本机计算，数据不会外传。",
  },
  en: {
    input: "Frame",
    hex: "Hex bytes",
    ascii: "ASCII text",
    sample: "Sample",
    placeholder: "01 03 00 00 00 0A",
    asciiPlaceholder: "AT+CSQ",
    results: "Checksums",
    empty: "Enter a frame to see the common checksums",
    labels: {
      sum8: "Sum-8",
      xor8: "XOR-8 (NMEA)",
      lrc: "LRC (Modbus ASCII)",
      crc8: "CRC-8/MAXIM",
      crc16modbus: "CRC-16/MODBUS",
      crc16ccitt: "CRC-16/CCITT-FALSE",
      crc16xmodem: "CRC-16/XMODEM",
    } as Record<string, string>,
    wire: "low byte first",
    bytes: (n: number) => `${n} bytes`,
    note: "Sum-8 adds the bytes and keeps the low 8 bits; XOR-8 is what NMEA-0183 uses; LRC is the two's complement of that sum for Modbus ASCII; CRC-16/MODBUS goes on the wire low byte first. Everything runs locally.",
  },
};

export function SerialChecksumTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<"hex" | "ascii">("hex");
  const [input, setInput] = React.useState(SAMPLE);

  const parsed = React.useMemo(
    () => safe(() => (mode === "hex" ? parseHexBytes(input) : textBytes(input))),
    [input, mode]
  );

  const entries: ChecksumEntry[] =
    parsed.value && parsed.value.length > 0 ? checksumAll(parsed.value) : [];
  const byteCount = parsed.value?.length ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
        <Pane
          label={t.input}
          actions={
            <SampleButton
              label={t.sample}
              onClick={() => {
                setMode("hex");
                setInput(SAMPLE);
              }}
            />
          }
          footer={<span>{byteCount > 0 ? t.bytes(byteCount) : "—"}</span>}
          className="h-full"
        >
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
            <Segmented
              ariaLabel={t.input}
              value={mode}
              onChange={setMode}
              options={[
                { value: "hex", label: t.hex },
                { value: "ascii", label: t.ascii },
              ]}
            />
          </div>
          <InputArea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={mode === "hex" ? t.placeholder : t.asciiPlaceholder}
            spellCheck={false}
            className="min-h-[260px]"
          />
          {parsed.error && <ErrorNote>{errorText(parsed.error, locale)}</ErrorNote>}
        </Pane>
      </div>

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
        <Pane label={t.results} footer={<span>{t.bytes(byteCount)}</span>}>
          {entries.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-foreground-muted">
                      {t.labels[entry.id]}
                    </div>
                    {entry.wire && (
                      <div className="font-mono text-[10px] text-foreground-faint">
                        {t.wire}: {entry.wire}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[13px] text-foreground">
                    0x{entry.hex}
                  </span>
                  <CopyButton value={entry.hex} size="icon-xs" />
                </li>
              ))}
            </ul>
          )}
        </Pane>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle lg:col-span-2">{t.note}</p>
    </div>
  );
}
