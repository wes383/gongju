import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ToolMeta } from "@/lib/tools";

export function ToolFrame({
  tool,
  children,
}: {
  tool: ToolMeta;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-base ease-out hover:bg-hover-bg"
        >
          <ArrowLeft className="h-4 w-4" />
          返回主页
        </Link>
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
        <h1 className="truncate font-display text-sm font-semibold text-foreground">
          {tool.name}
        </h1>
      </div>

      {children}
    </div>
  );
}
