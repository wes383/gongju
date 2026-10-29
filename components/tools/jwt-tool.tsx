"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CopyButton, ErrorNote, PaneButton } from "@/components/tools/tool-ui";
import { decodeJwt, formatJwtTime, highlightJson, safe } from "@/lib/encoding";
import { cn } from "@/lib/utils";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW8oOS4iSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.dQw4w9WgXcQ7ExampleSignature";

function JsonBlock({ title, data }: { title: string; data: unknown }) {
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
          {title}
        </span>
        <div className="ml-auto">
          <CopyButton value={json} size="icon-xs" />
        </div>
      </header>
      <pre
        className="max-h-[360px] overflow-auto p-3 font-mono text-[12.5px] leading-relaxed text-foreground"
        dangerouslySetInnerHTML={{ __html: highlightJson(json) }}
      />
    </div>
  );
}

function ClaimRow({
  label,
  seconds,
  note,
}: {
  label: string;
  seconds: number;
  note?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
      <span className="w-14 shrink-0 font-mono text-[11px] uppercase text-foreground-subtle">
        {label}
      </span>
      <span className="font-mono text-xs text-foreground">{formatJwtTime(seconds)}</span>
      <span className="font-mono text-[11px] text-foreground-faint">({seconds})</span>
      {note && <span className="ml-auto">{note}</span>}
    </div>
  );
}

export function JwtTool() {
  const [token, setToken] = React.useState("");
  // Read the clock on the client only: Date.now() during prerender is unstable
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    const timer = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const { value: data, error } = React.useMemo(
    () => safe(() => (token.trim() ? decodeJwt(token) : null)),
    [token]
  );

  const payload = (data?.payload ?? {}) as Record<string, unknown>;
  const header = (data?.header ?? {}) as Record<string, unknown>;

  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const iat = typeof payload.iat === "number" ? payload.iat : null;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : null;
  const expired = now !== null && exp !== null && exp < now;
  const notYetValid = now !== null && nbf !== null && nbf > now;
  const expNote =
    now === null || exp === null
      ? null
      : expired
        ? `已过期 ${Math.ceil((now - exp) / 86400)} 天`
        : `剩余 ${Math.ceil((exp - now) / 86400)} 天`;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            JWT
          </span>
          <div className="ml-auto flex items-center gap-1">
            <PaneButton onClick={() => setToken(SAMPLE)} title="填入示例 Token">
              示例
            </PaneButton>
            <PaneButton onClick={() => setToken("")} title="清空">
              清空
            </PaneButton>
          </div>
        </header>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          spellCheck={false}
          placeholder="粘贴 JWT，例如 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.xxxxx"
          aria-label="JWT Token"
          className="min-h-[110px] w-full resize-y break-all bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
        />
        <footer className="flex h-8 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
          <span>{token.trim().length} 字符</span>
          <span>{token.trim() ? token.trim().split(".").length : 0} 段</span>
          {data && (
            <span className="ml-auto text-foreground-subtle">
              签名未校验，仅解码展示
            </span>
          )}
        </footer>
      </div>

      {error && token.trim() !== "" && <ErrorNote>{error}</ErrorNote>}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {typeof header.alg === "string" && (
              <Badge variant="info" size="sm">
                alg: {header.alg}
              </Badge>
            )}
            {typeof header.typ === "string" && (
              <Badge variant="secondary" size="sm">
                typ: {header.typ}
              </Badge>
            )}
            {typeof header.kid === "string" && (
              <Badge variant="outline" size="sm">
                kid: {header.kid}
              </Badge>
            )}
            {exp !== null && (
              <Badge variant={expired ? "danger" : "success"} size="sm" dot>
                {expired ? "已过期" : "未过期"}
              </Badge>
            )}
            {notYetValid && (
              <Badge variant="warning" size="sm" dot>
                尚未生效
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <JsonBlock title="Header" data={data.header} />
            <JsonBlock title="Payload" data={data.payload} />
          </div>

          {(exp !== null || iat !== null || nbf !== null) && (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex h-10 items-center border-b border-border px-3">
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                  时间声明
                </span>
              </header>
              <div className="divide-y divide-border">
                {iat !== null && <ClaimRow label="iat" seconds={iat} note={<span className="text-[11px] text-foreground-subtle">签发时间</span>} />}
                {nbf !== null && (
                  <ClaimRow
                    label="nbf"
                    seconds={nbf}
                    note={
                      <span className={cn("text-[11px]", notYetValid ? "text-orange-fg" : "text-foreground-subtle")}>
                        {notYetValid ? "尚未生效" : "生效时间"}
                      </span>
                    }
                  />
                )}
                {exp !== null && (
                  <ClaimRow
                    label="exp"
                    seconds={exp}
                    note={
                      <span className={cn("text-[11px]", expired ? "text-red-fg" : "text-green-fg")}>
                        {expNote}
                      </span>
                    }
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              Signature
            </span>
            <code className="break-all font-mono text-xs text-foreground-muted">
              {data.signature || "（无签名段）"}
            </code>
            <p className="text-xs leading-relaxed text-foreground-subtle">
              本工具只做 Base64URL 解码，不验证签名。请勿把生产环境的 Token 粘贴到不受信任的网站。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
