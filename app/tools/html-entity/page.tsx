import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HtmlEntityTool } from "@/components/tools/html-entity-tool";

const meta = getTool("html-entity")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/html-entity" },
};

export default function Page() {
  return (
    <ToolFrame slug="html-entity">
      <HtmlEntityTool />
    </ToolFrame>
  );
}
