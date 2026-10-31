"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/components/locale-provider";
import { useDocumentTitle } from "@/components/use-document-title";

export function NotFoundContent() {
  const t = useT();

  useDocumentTitle("404 · GongJu");

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[1080px] flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-foreground-subtle">404</p>
      <h1 className="font-display text-xl font-semibold text-foreground">{t.notFound.title}</h1>
      <p className="max-w-[380px] text-sm text-foreground-muted">{t.notFound.description}</p>
      <Link
        href="/"
        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-base ease-out hover:bg-hover-bg"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.notFound.back}
      </Link>
    </div>
  );
}
