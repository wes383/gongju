import type { Metadata } from "next";
import Link from "next/link";
import { categories } from "@/lib/tools";
import { ToolCard } from "@/components/site/tool-card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "全部工具",
  description: "按分类浏览全部在线工具，首批上线编码 / 解码类。",
};

export default function ToolsIndexPage() {
  return (
    <div className="flex flex-col gap-10 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          全部工具
        </h1>
        <p className="text-sm text-foreground-muted">
          当前共 {categories.length} 个分类，已上线编码 / 解码类 12 个工具，其余分类正在陆续补齐。
        </p>
      </header>

      {categories.map((cat) => {
        const Icon = cat.icon;
        return (
          <section key={cat.id} id={cat.id} className="flex flex-col gap-4 scroll-mt-24">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground-muted">
                <Icon className="h-4 w-4" />
              </span>
              <h2 className="font-display text-base font-semibold text-foreground">{cat.name}</h2>
              {cat.tools.length > 0 ? (
                <Badge variant="success" size="xs">
                  {cat.tools.length} 个已上线
                </Badge>
              ) : (
                <Badge variant="secondary" size="xs">
                  待上线
                </Badge>
              )}
            </div>

            {cat.tools.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cat.tools.map((t) => (
                  <ToolCard key={t.slug} tool={t} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-dashed border-border p-4">
                {cat.planned.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-foreground-faint"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <p className="text-xs text-foreground-subtle">
        有想要的功能？
        <Link href="/" className="ml-1 underline underline-offset-2 hover:text-foreground">
          返回首页
        </Link>
      </p>
    </div>
  );
}
