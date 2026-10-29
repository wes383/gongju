"use client";

import * as React from "react";
import { useLocale, useSetLocale, useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { localeLabels, localeShort } from "@/lib/i18n";

export function LanguageToggle({
  size = "icon-sm",
  className,
}: {
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  const next = locale === "zh" ? "en" : "zh";

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={() => setLocale(next)}
      aria-label={t.language.label}
      title={localeLabels[next]}
      className={className ?? "shrink-0"}
    >
      <span className="font-mono text-xs leading-none">{localeShort[locale]}</span>
    </Button>
  );
}
