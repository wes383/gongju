"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale, useT } from "@/components/locale-provider";
import { useDocumentTitle } from "@/components/use-document-title";
import { ToolFaq } from "@/components/tools/tool-faq";
import { getTool, toolDescription, toolName } from "@/lib/tools";

export function ToolFrame({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const t = useT();
  const tool = getTool(slug);
  const name = tool ? toolName(tool, locale) : slug;

  useDocumentTitle(`${name} · GongJu`);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-base ease-out hover:bg-hover-bg"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backHome}
          </Link>
          <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
          <h1 className="truncate font-display text-sm font-semibold text-foreground">{name}</h1>
        </div>
        {tool && (
          <p className="text-sm leading-relaxed text-foreground-muted">
            {toolDescription(tool, locale)}
          </p>
        )}
      </div>

      {children}

      {tool?.faq?.length ? <ToolFaq items={tool.faq} /> : null}
    </div>
  );
}
