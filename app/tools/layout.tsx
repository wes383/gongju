import { SiteHeader } from "@/components/site/site-header";
import { SiteSidebar } from "@/components/site/site-sidebar";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-8 px-4 lg:px-8">
        <SiteSidebar />
        <main className="min-w-0 flex-1 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
