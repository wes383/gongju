import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { getCategory, allTools, type ToolMeta } from "@/lib/tools";
import { ToolCard } from "@/components/site/tool-card";

export function ToolFrame({
  tool,
  children,
}: {
  tool: ToolMeta;
  children: React.ReactNode;
}) {
  const category = getCategory(tool.category);
  const related = allTools
    .filter((t) => t.category === tool.category && t.slug !== tool.slug)
    .slice(0, 4);
  const Icon = tool.icon;

  return (
    <div className="flex flex-col gap-6 pb-16">
      <nav aria-label="面包屑" className="flex items-center gap-1 text-xs text-foreground-subtle">
        <Link href="/" className="transition-colors hover:text-foreground">
          首页
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{category?.name ?? "工具"}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground-muted">{tool.name}</span>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground-muted">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              {tool.name}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
              {tool.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-foreground-subtle">
          <ShieldCheck className="h-3.5 w-3.5 text-green" />
          纯本地计算，数据不会离开你的浏览器
        </div>
      </header>

      <div className="flex flex-col gap-4">{children}</div>

      {related.length > 0 && (
        <section className="mt-6 flex flex-col gap-3">
          <h2 className="font-display text-sm font-semibold text-foreground">同类工具</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
