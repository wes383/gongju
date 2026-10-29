import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { ToolCard } from "@/components/site/tool-card";
import { Badge } from "@/components/ui/badge";
import {
  allTools,
  categories,
  featuredSlugs,
  getTool,
  totalPlannedCount,
  totalToolCount,
} from "@/lib/tools";

export default function HomePage() {
  const featured = featuredSlugs.map((s) => getTool(s)).filter((t) => t !== undefined);
  const onlineCategories = categories.filter((c) => c.tools.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 lg:px-8">
        {/* Hero */}
        <section className="grid gap-10 pb-14 pt-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col items-start gap-5">
            <Badge variant="success" size="sm" dot>
              纯前端运行 · 数据不出浏览器
            </Badge>
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
              开发者在线工具箱
              <span className="mt-2 block text-xl font-semibold text-foreground-muted sm:text-2xl">
                编码、转换、格式化，打开就能用
              </span>
            </h1>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-foreground-muted sm:text-base">
              首批上线编码 / 解码类 {totalToolCount} 个工具，全部在本地完成计算，不上传任何数据。
              另有 {totalPlannedCount} 个工具正在规划中。
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={`/tools/${featured[0]?.slug ?? "base64"}`}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg transition-all duration-base ease-out hover:bg-accent-hover active:scale-[0.97]"
              >
                开始使用
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tools"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-medium text-foreground transition-all duration-base ease-out hover:bg-hover-bg active:scale-[0.97]"
              >
                浏览全部工具
              </Link>
            </div>

            <dl className="mt-4 grid w-full max-w-xl grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                { label: "已上线", value: `${totalToolCount} 个` },
                { label: "规划中", value: `${totalPlannedCount} 个` },
                { label: "上传数据", value: "0 字节" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <dt className="text-xs text-foreground-subtle">{item.label}</dt>
                  <dd className="font-display text-lg font-semibold text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 装饰性的终端窗口 */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-md lg:block">
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-green/50" />
              <span className="ml-2 font-mono text-[11px] text-foreground-faint">
                toolkit — zsh
              </span>
            </div>
            <div className="flex flex-col gap-3 p-4 font-mono text-[12.5px] leading-relaxed">
              <div className="text-foreground-muted">
                <span className="mr-2 text-foreground-faint">$</span>
                echo &quot;Toolkit 工具站&quot; | base64
              </div>
              <div className="break-all text-blue-fg">VG9vbGtpdCDlt6Xlhbfnq5k=</div>
              <div className="text-foreground-muted">
                <span className="mr-2 text-foreground-faint">$</span>
                echo &quot;5L2g5aW9&quot; | base64 -d
              </div>
              <div className="text-green-fg">你好</div>
              <div className="text-foreground-muted">
                <span className="mr-2 text-foreground-faint">$</span>
                <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse-soft bg-foreground-muted" />
              </div>
            </div>
          </div>
        </section>

        {/* 热门工具 */}
        <section className="flex flex-col gap-4 pb-16">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                常用工具
              </h2>
              <p className="text-xs text-foreground-subtle">打开即用，无需登录</p>
            </div>
            <Link
              href="/tools"
              className="inline-flex items-center gap-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              全部
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </section>

        {/* 分类 */}
        <section className="flex flex-col gap-4 pb-20">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              工具分类
            </h2>
            <p className="text-xs text-foreground-subtle">
              共 {categories.length} 类，{onlineCategories.length} 类已上线
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const online = cat.tools.length > 0;
              return (
                <div
                  key={cat.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 transition-colors duration-base hover:border-border-strong"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-hover-bg text-foreground-muted">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm font-semibold text-foreground">
                          {cat.name}
                        </h3>
                        {online ? (
                          <Badge variant="success" size="xs">
                            {cat.tools.length}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" size="xs">
                            待上线
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {online ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cat.tools.slice(0, 4).map((t) => (
                        <Link
                          key={t.slug}
                          href={`/tools/${t.slug}`}
                          className="rounded-full border border-border px-2.5 py-1 text-[11px] text-foreground-muted transition-colors hover:border-border-strong hover:bg-hover-bg hover:text-foreground"
                        >
                          {t.name.replace(/（.*）/, "")}
                        </Link>
                      ))}
                      {cat.tools.length > 4 && (
                        <Link
                          href="/tools"
                          className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-foreground-faint transition-colors hover:text-foreground"
                        >
                          +{cat.tools.length - 4}
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-foreground-faint">
                      计划：{cat.planned.slice(0, 3).join("、")}
                      {cat.planned.length > 3 ? " 等" : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex flex-col gap-1">
            <span className="font-display text-sm font-semibold text-foreground">Toolkit</span>
            <span className="text-xs text-foreground-subtle">
              共 {allTools.length} 个工具 · 全部在浏览器本地运行
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-subtle">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-green" />
              无服务端上传
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-orange" />
              实时转换
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue" />
              支持深色模式
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
