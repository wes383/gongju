"use client";

import { ChevronDown } from "lucide-react";
import { useLocale, useT } from "@/components/locale-provider";
import type { ToolFaq } from "@/lib/tools";

/** Native details/summary so the answers ship in the SSR HTML without JS */
export function ToolFaq({ items }: { items: ToolFaq[] }) {
  const locale = useLocale();
  const t = useT();

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 className="font-display text-sm font-semibold text-foreground">{t.faq}</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <details
            key={item.q.zh}
            className="group rounded-lg border border-border bg-surface px-4 transition-colors duration-base ease-out hover:border-border-strong"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{item.q[locale]}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-foreground-faint transition-transform duration-base ease-out group-open:rotate-180" />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-foreground-muted">{item.a[locale]}</p>
          </details>
        ))}
      </div>
    </section>
  );
}