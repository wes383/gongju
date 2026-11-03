import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { MetaTagsTool } from "@/components/tools/meta-tags-tool";

const meta = getTool("meta-tags")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="meta-tags">
      <MetaTagsTool />
    </ToolFrame>
  );
}
