"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { ToolCard } from "@/components/site/tool-card";
import { categories, toolMatches } from "@/lib/tools";

export function ToolDirectory() {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus the search box on ⌘K / Ctrl+K
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

  const groups = React.useMemo(() => {
    const q = query.trim();
    return categories
      .map((c) => ({
        ...c,
        tools: q ? c.tools.filter((t) => toolMatches(t, q)) : c.tools,
      }))
      .filter((c) => c.tools.length > 0);
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:py-14">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索工具…"
            aria-label="搜索工具"
            spellCheck={false}
            className="h-12 w-full rounded-full border border-border bg-surface pl-11 pr-11 text-base text-foreground placeholder:text-foreground-subtle focus:border-border-strong focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="清空搜索"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground-subtle transition-colors hover:bg-hover-bg hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <ThemeToggle size="icon" className="h-12 w-12 shrink-0" />
      </div>

      <div className="mt-10 flex flex-col gap-10">
        {groups.map((cat) => {
          const Icon = cat.icon;
          return (
            <section key={cat.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-foreground-subtle" />
                <h2 className="font-display text-sm font-semibold text-foreground">
                  {cat.name}
                </h2>
                <span className="font-mono text-[11px] text-foreground-faint">
                  {cat.tools.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.tools.map((t) => (
                  <ToolCard key={t.slug} tool={t} />
                ))}
              </div>
            </section>
          );
        })}

        {groups.length === 0 && (
          <p className="py-20 text-center text-sm text-foreground-subtle">
            没有找到匹配的工具
          </p>
        )}
      </div>
    </div>
  );
}
