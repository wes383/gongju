"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  LayoutGrid,
  List,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { LanguageToggle } from "@/components/site/language-toggle";
import { FeedbackLink } from "@/components/site/feedback-link";
import { ToolCard } from "@/components/site/tool-card";
import { useLocale, useT } from "@/components/locale-provider";
import { useDocumentTitle } from "@/components/use-document-title";
import { useScrollRestoration } from "@/components/use-scroll-restoration";
import { SITE_NAME } from "@/lib/site";
import {
  categories,
  categoryMatches,
  toolDescription,
  toolMatches,
  toolName,
  type ToolMeta,
} from "@/lib/tools";
import { cn } from "@/lib/utils";

const HOME_TITLE = {
  zh: "GongJu · 在线工具箱",
  en: "GongJu · Online Toolbox",
};

const VIEW_STORAGE_KEY = "gongju-view";

type ViewMode = "grid" | "list";

const useIsoLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

function ToolRow({ tool }: { tool: ToolMeta }) {
  const locale = useLocale();
  const Icon = tool.icon;
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-base ease-out hover:bg-hover-bg"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-hover-bg text-foreground-muted transition-colors group-hover:text-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="truncate text-sm font-medium text-foreground">
        {toolName(tool, locale)}
      </span>
      <span className="ml-auto hidden max-w-[45%] truncate text-xs text-foreground-muted md:block">
        {toolDescription(tool, locale)}
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-foreground-faint opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function ToolDirectory() {
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<ViewMode>("grid");
  const [collapsed, setCollapsed] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const t = useT();

  useDocumentTitle(HOME_TITLE[locale]);
  useScrollRestoration();

  // Apply the stored view mode before paint so there is no flash of the other layout
  useIsoLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

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

  const searching = query.trim() !== "";

  // Entering a search unfolds everything once so matches are visible, then the
  // user is free to fold again while the query is still active.
  const changeQuery = (next: string) => {
    if (!searching && next.trim() !== "") setCollapsed([]);
    setQuery(next);
  };

  const groups = React.useMemo(() => {
    const q = query.trim();
    if (!q) return categories;
    // A title hit keeps the whole category, so searching "图片" lists every image tool
    return categories
      .map((c) =>
        categoryMatches(c, q) ? c : { ...c, tools: c.tools.filter((tool) => toolMatches(tool, q)) }
      )
      .filter((c) => c.tools.length > 0);
  }, [query]);

  const toggleCategory = (id: string) =>
    setCollapsed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Only the categories currently on screen count: something hidden by the
  // search filter should not keep the button stuck on "expand all".
  const allExpanded = groups.every((cat) => !collapsed.includes(cat.id));

  const toggleAll = () => setCollapsed(allExpanded ? groups.map((cat) => cat.id) : []);

  const viewOptions = [
    { mode: "grid" as ViewMode, icon: LayoutGrid, label: t.view.grid },
    { mode: "list" as ViewMode, icon: List, label: t.view.list },
  ];

  // One button, two states: expand while anything is folded, collapse once all are open
  const bulkToggleLabel = allExpanded ? t.view.collapseAll : t.view.expandAll;
  const bulkToggle = (
    <button
      type="button"
      onClick={toggleAll}
      aria-label={bulkToggleLabel}
      className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-[11px] font-medium text-foreground-muted transition-colors duration-base ease-out hover:bg-hover-bg hover:text-foreground"
    >
      {allExpanded ? (
        <ChevronsDownUp className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5" />
      )}
      <span className="whitespace-nowrap">{bulkToggleLabel}</span>
    </button>
  );

  // Sits at the right edge of the first category row
  const viewToggle = (
    <div className="flex shrink-0 items-center rounded-full border border-border bg-surface p-0.5">
      {viewOptions.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => changeView(mode)}
          aria-label={label}
          aria-pressed={view === mode}
          className={cn(
            "flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium transition-colors duration-base ease-out",
            view === mode
              ? "bg-accent text-accent-fg"
              : "text-foreground-muted hover:bg-hover-bg hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:py-14">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg">
          <Wrench className="h-5 w-5" />
        </span>
        <h1 className="shrink-0 font-display text-lg font-bold leading-normal text-foreground">
          {SITE_NAME}
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageToggle size="icon" className="h-10 w-10" />
          <ThemeToggle size="icon" className="h-10 w-10" />
        </div>
      </header>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
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
              aria-label={t.clearSearch}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-foreground-subtle transition-colors hover:bg-hover-bg hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {groups.map((cat, index) => {
          const Icon = cat.icon;
          const isCollapsed = collapsed.includes(cat.id);

          return (
            <section key={cat.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={!isCollapsed}
                  className="group flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left"
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-foreground-faint transition-transform duration-base",
                      !isCollapsed && "rotate-90"
                    )}
                  />
                  <Icon className="h-4 w-4 shrink-0 text-foreground-subtle" />
                  <h2 className="min-w-0 truncate font-display text-sm font-semibold text-foreground">
                    {cat.name[locale]}
                  </h2>
                  <span className="shrink-0 font-mono text-[11px] text-foreground-faint">
                    {cat.tools.length}
                  </span>
                </button>
                {index === 0 && (
                  <div className="flex shrink-0 -translate-y-0.5 items-center gap-2">
                    {bulkToggle}
                    {viewToggle}
                  </div>
                )}
              </div>

              {!isCollapsed &&
                (view === "grid" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.tools.map((tool) => (
                      <ToolCard key={tool.slug} tool={tool} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {cat.tools.map((tool) => (
                      <ToolRow key={tool.slug} tool={tool} />
                    ))}
                  </div>
                ))}
            </section>
          );
        })}

        {groups.length === 0 && (
          <p className="py-20 text-center text-sm text-foreground-subtle">{t.searchEmpty}</p>
        )}
      </div>

      <footer className="mt-14 flex flex-col items-center gap-3 border-t border-border pt-6 text-xs text-foreground-subtle sm:flex-row sm:justify-between">
        <p>{t.footerTagline}</p>
        <div className="flex items-center gap-1">
          <FeedbackLink />
          <Link
            href="/privacy"
            className="inline-flex items-center rounded-full px-2 py-1 transition-colors duration-base ease-out hover:bg-hover-bg hover:text-foreground"
          >
            {t.privacy}
          </Link>
        </div>
      </footer>
    </div>
  );
}
