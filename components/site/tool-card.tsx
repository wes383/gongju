"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { toolDescription, toolName, type ToolMeta } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: ToolMeta;
  className?: string;
}

export function ToolCard({ tool, className }: ToolCardProps) {
  const locale = useLocale();
  const Icon = tool.icon;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-all duration-base ease-out",
        "hover:border-border-strong hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-hover-bg text-foreground-muted transition-colors group-hover:bg-accent-muted group-hover:text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-foreground-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-sm font-semibold leading-snug text-foreground">
          {toolName(tool, locale)}
        </h3>
        <p className="text-xs leading-relaxed text-foreground-muted">
          {toolDescription(tool, locale)}
        </p>
      </div>
    </Link>
  );
}
