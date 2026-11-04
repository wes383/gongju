import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { SeoAuditTool } from "@/components/tools/seo-audit-tool";

const meta = getTool("seo-audit")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/seo-audit" },
};

export default function Page() {
  return (
    <ToolFrame slug="seo-audit">
      <SeoAuditTool />
    </ToolFrame>
  );
}
