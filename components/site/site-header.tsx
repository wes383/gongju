"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Menu, Search, Terminal, X } from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { NavList } from "@/components/site/nav-list";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { searchTools } from "@/lib/tools";

export function SiteHeader() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [navOpen, setNavOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results = React.useMemo(() => searchTools(query).slice(0, 8), [query]);

  // 点击外部收起结果
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // ⌘K / Ctrl+K 聚焦搜索
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(`/tools/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) go(target.slug);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-fg">
            <Terminal className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold leading-none tracking-tight">
            Toolkit
            <span className="ml-1.5 hidden text-xs font-medium text-foreground-subtle sm:inline">
              工具站
            </span>
          </span>
        </Link>

        {/* 搜索 */}
        <div ref={containerRef} className="relative ml-auto w-full max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-subtle" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="搜索工具…"
              aria-label="搜索工具"
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-14 text-sm text-foreground placeholder:text-foreground-subtle focus:border-border-strong focus:outline-none"
            />
            <div className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
              <Kbd className="text-[10px]">⌘</Kbd>
              <Kbd className="text-[10px]">K</Kbd>
            </div>
          </div>

          {open && query.trim() !== "" && (
            <div className="absolute left-0 right-0 top-full z-dropdown mt-2 overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-pop animate-fade-slide-in">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-foreground-subtle">
                  没有匹配的工具
                </p>
              ) : (
                <ul role="listbox">
                  {results.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <li key={t.slug}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={i === activeIndex}
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => go(t.slug)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                            i === activeIndex ? "bg-hover-bg" : "hover:bg-hover-bg"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-foreground-subtle" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-foreground">
                              {t.name}
                            </span>
                            <span className="block truncate text-xs text-foreground-subtle">
                              {t.description}
                            </span>
                          </span>
                          {i === activeIndex && (
                            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-foreground-faint" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? "关闭导航" : "打开导航"}
            aria-expanded={navOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-hover-bg lg:hidden"
          >
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 移动端导航面板 */}
      {navOpen && (
        <div className="border-t border-border bg-surface lg:hidden">
          <div className="mx-auto max-h-[70vh] max-w-[1440px] overflow-y-auto px-3 py-3">
            <NavList onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
