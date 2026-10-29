"use client";

import * as React from "react";
import { Check, Languages } from "lucide-react";
import { useLocale, useSetLocale, useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeLabels, type Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["zh", "en"];

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          aria-label={t.language.label}
          title={t.language.label}
          className={className ?? "shrink-0"}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[140px]">
        <DropdownMenuLabel>{t.language.menu}</DropdownMenuLabel>
        {LOCALES.map((code) => (
          <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
            <span>{localeLabels[code]}</span>
            {locale === code && (
              <Check className="ml-auto h-3.5 w-3.5 text-foreground-muted" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
