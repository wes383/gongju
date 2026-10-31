import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FaviconTool } from "@/components/tools/favicon-tool";

const meta = getTool("favicon")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="favicon">
      <FaviconTool />
    </ToolFrame>
  );
}
