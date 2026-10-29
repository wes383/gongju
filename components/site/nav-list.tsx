"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { categories } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface NavListProps {
  /** 点击链接后的回调（移动端用于关闭面板） */
  onNavigate?: () => void;
}

/**
 * 路由变化时用 key 重新挂载列表，让「当前分类」自然展开，
 * 无需在 effect 里同步 state。
 */
export function NavList({ onNavigate }: NavListProps) {
  const pathname = usePathname();
  return <NavListInner key={pathname} pathname={pathname} onNavigate={onNavigate} />;
}

function NavListInner({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const activeCategory = categories.find((c) =>
    c.tools.some((t) => pathname === `/tools/${t.slug}`)
  );

  const [openIds, setOpenIds] = React.useState<string[]>(() =>
    activeCategory ? [activeCategory.id] : ["encoding"]
  );

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <nav className="flex flex-col gap-0.5" aria-label="工具分类导航">
      {categories.map((cat) => {
        const open = openIds.includes(cat.id);
        const Icon = cat.icon;
        const isActiveCategory = activeCategory?.id === cat.id;
        const hasTools = cat.tools.length > 0;

        return (
          <div key={cat.id}>
            <button
              type="button"
              onClick={() => toggle(cat.id)}
              aria-expanded={open}
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors duration-base ease-out",
                "hover:bg-hover-bg",
                isActiveCategory ? "text-foreground font-medium" : "text-foreground-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActiveCategory ? "text-foreground" : "text-foreground-subtle"
                )}
              />
              <span className="flex-1 text-left leading-tight">{cat.name}</span>
              {hasTools ? (
                <span className="rounded-full bg-hover-bg px-1.5 py-0.5 font-mono text-[10px] leading-none text-foreground-subtle">
                  {cat.tools.length}
                </span>
              ) : (
                <span className="text-[10px] leading-none text-foreground-faint">待上线</span>
              )}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-foreground-faint transition-transform duration-base",
                  open && "rotate-180"
                )}
              />
            </button>

            {open && hasTools && (
              <ul className="mb-1 ml-[1.15rem] flex flex-col gap-0.5 border-l border-border pl-2">
                {cat.tools.map((t) => {
                  const active = pathname === `/tools/${t.slug}`;
                  return (
                    <li key={t.slug}>
                      <Link
                        href={`/tools/${t.slug}`}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block truncate rounded-md px-2.5 py-1.5 text-[13px] leading-snug transition-colors duration-base ease-out",
                          active
                            ? "bg-accent-muted font-medium text-foreground"
                            : "text-foreground-muted hover:bg-hover-bg hover:text-foreground"
                        )}
                      >
                        {t.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {open && !hasTools && cat.planned.length > 0 && (
              <ul className="mb-1 ml-[1.15rem] flex flex-col gap-0.5 border-l border-border pl-2">
                {cat.planned.slice(0, 4).map((p) => (
                  <li
                    key={p}
                    className="truncate px-2.5 py-1.5 text-[13px] leading-snug text-foreground-faint"
                    title="规划中"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
