"use client";

import * as React from "react";
import { Check, Copy, Eraser, Repeat, TriangleAlert } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/components/locale-provider";
import { translateError } from "@/lib/i18n";

/** Copy to clipboard with a 1.5s "copied" state */
export function CopyButton({
  value,
  label,
  size = "xs",
  className,
  disabled,
}: {
  value: string;
  label?: string;
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
  className?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = label ?? t.copy;

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t.copySuccess);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t.copyError);
    }
  };

  const iconOnly = size.startsWith("icon");

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handleCopy}
      disabled={disabled || !value}
      className={cn("gap-1.5", className)}
      aria-label={text}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {!iconOnly && <span>{copied ? t.copied : text}</span>}
    </Button>
  );
}

/** Small ghost button used inside pane headers */
export function PaneButton({
  children,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClick}
      title={title}
      className={cn("gap-1.5 text-foreground-muted", className)}
    >
      {children}
    </Button>
  );
}

export function ClearButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const t = useT();
  const text = label ?? t.clear;
  return (
    <PaneButton onClick={onClick} title={text}>
      <Eraser className="h-3.5 w-3.5" />
      <span>{text}</span>
    </PaneButton>
  );
}

export function SwapButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <PaneButton onClick={onClick} title={t.swapHint}>
      <Repeat className="h-3.5 w-3.5" />
      <span>{t.swap}</span>
    </PaneButton>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-border bg-red-soft px-3 py-2 text-xs leading-relaxed text-red-fg">
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="break-words">{children}</span>
    </div>
  );
}

export function Pane({
  label,
  actions,
  footer,
  children,
  className,
}: {
  label: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col", className)}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
          {label}
        </span>
        <div className="ml-auto flex items-center gap-0.5">{actions}</div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
      {footer && (
        <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
          {footer}
        </footer>
      )}
    </section>
  );
}

const areaBase =
  "w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none";

export const InputArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    spellCheck={false}
    className={cn(areaBase, "min-h-[300px]", className)}
    {...props}
  />
));
InputArea.displayName = "InputArea";

export function OutputArea({
  value,
  placeholder,
  minHeight = "min-h-[300px]",
  wrap = true,
  highlight,
}: {
  value: string;
  placeholder?: string;
  minHeight?: string;
  wrap?: boolean;
  /** Pre-highlighted, already-escaped HTML used to colour JSON output */
  highlight?: string;
}) {
  const t = useT();
  const hint = placeholder ?? t.outputPlaceholder;
  if (highlight) {
    return (
      <pre
        className={cn(
          "w-full overflow-auto px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground",
          minHeight,
          wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
        )}
        dangerouslySetInnerHTML={{ __html: highlight }}
      />
    );
  }
  return (
    <pre
      className={cn(
        "w-full overflow-auto px-3.5 py-3 font-mono text-[13px] leading-relaxed text-foreground",
        minHeight,
        wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
      )}
    >
      {value || <span className="text-foreground-faint">{hint}</span>}
    </pre>
  );
}

export function DualPane({
  input,
  onInputChange,
  output,
  error,
  inputLabel,
  outputLabel,
  inputPlaceholder,
  inputActions,
  outputActions,
  inputFooter,
  outputFooter,
  onSwap,
  onClear,
  inputMinHeight,
  outputHighlight,
}: {
  input: string;
  onInputChange: (v: string) => void;
  output: string;
  error?: unknown;
  inputLabel?: string;
  outputLabel?: string;
  inputPlaceholder?: string;
  inputActions?: React.ReactNode;
  outputActions?: React.ReactNode;
  inputFooter?: React.ReactNode;
  outputFooter?: React.ReactNode;
  onSwap?: () => void;
  onClear?: () => void;
  inputMinHeight?: string;
  /** Pre-highlighted HTML for JSON output */
  outputHighlight?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const inputText = inputLabel ?? t.input;
  const outputText = outputLabel ?? t.output;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <Pane
          label={inputText}
          className="border-b border-border lg:border-b-0 lg:border-r"
          actions={
            <>
              {inputActions}
              {onClear && <ClearButton onClick={onClear} />}
              {onSwap && <SwapButton onClick={onSwap} />}
            </>
          }
          footer={inputFooter}
        >
          <InputArea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            className={inputMinHeight}
            aria-label={inputText}
          />
        </Pane>

        <Pane
          label={outputText}
          actions={
            <>
              {outputActions}
              <CopyButton value={output} />
            </>
          }
          footer={outputFooter}
        >
          {error ? (
            <div className="p-3">
              <ErrorNote>{translateError(error, locale)}</ErrorNote>
            </div>
          ) : (
            <OutputArea value={output} minHeight={inputMinHeight} highlight={outputHighlight} />
          )}
        </Pane>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-base ease-out",
              active
                ? "bg-accent text-accent-fg"
                : "text-foreground-muted hover:bg-hover-bg hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function OptionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-border bg-surface px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function OptionField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-foreground-muted" title={hint}>
        {label}
      </span>
      {children}
    </div>
  );
}

/** Hand-rolled switch: avoids pulling in Radix Switch */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground-muted">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-base ease-out",
          checked
            ? "border-transparent bg-accent"
            : "border-border bg-hover-bg-strong hover:bg-border-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-surface shadow-sm transition-all duration-base ease-out",
            checked ? "left-[19px] border border-transparent" : "left-[3px] border border-border-strong"
          )}
        />
      </button>
      <span title={hint}>{label}</span>
    </label>
  );
}

export function textStats(text: string) {
  const chars = [...text].length;
  const bytes = new TextEncoder().encode(text).length;
  const lines = text === "" ? 0 : text.split("\n").length;
  return { chars, bytes, lines };
}

export function Stats({ text }: { text: string }) {
  const t = useT();
  const { chars, bytes, lines } = textStats(text);
  return (
    <>
      <span>
        {chars} {t.chars}
      </span>
      <span>
        {bytes} {t.bytes}
      </span>
      <span>
        {lines} {t.lines}
      </span>
    </>
  );
}
