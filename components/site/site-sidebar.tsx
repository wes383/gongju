import { NavList } from "@/components/site/nav-list";

export function SiteSidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 lg:block">
      <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-6 pr-2">
        <p className="px-2.5 pb-2 font-mono text-[10px] uppercase tracking-wide text-foreground-faint">
          All tools
        </p>
        <NavList />
      </div>
    </aside>
  );
}
