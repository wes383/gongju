"use client";

import { useLocale, useT } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TALLY_FORMS: Record<Locale, string> = {
  zh: "https://tally.so/r/Kp5xAK",
  en: "https://tally.so/r/Ar2py0",
};

export function FeedbackLink({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();

  return (
    <a
      href={TALLY_FORMS[locale]}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 transition-colors duration-base ease-out hover:bg-hover-bg hover:text-foreground",
        className
      )}
    >
      {t.feedback}
    </a>
  );
}