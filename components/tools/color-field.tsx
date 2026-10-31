"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { parseColor, rgbToHex } from "@/lib/color";
import { cn } from "@/lib/utils";

/**
 * Colour swatch + hex text field. Typing is free-form; only values that parse
 * are pushed up, so you can type "#ff" on the way to "#ff8800".
 */
export function ColorField({
  value,
  onChange,
  label,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
      />
      <Input
        value={draft ?? value.toUpperCase()}
        onChange={(event) => {
          setDraft(event.target.value);
          const rgb = parseColor(event.target.value);
          if (rgb) onChange(rgbToHex(rgb));
        }}
        onBlur={() => setDraft(null)}
        aria-label={`${label} HEX`}
        size="xs"
        spellCheck={false}
        className="w-24 font-mono text-xs"
      />
    </div>
  );
}

/** A flat colour chip, optionally clickable. */
export function Swatch({
  color,
  className,
  onClick,
  title,
}: {
  color: string;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const style = { background: color };
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title ?? color}
        aria-label={title ?? color}
        className={cn("rounded border border-border", className)}
        style={style}
      />
    );
  }
  return <span className={cn("rounded border border-border", className)} style={style} />;
}
