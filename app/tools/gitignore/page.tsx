import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { GitignoreTool } from "@/components/tools/gitignore-tool";

const meta = getTool("gitignore")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/gitignore" },
};

export default function Page() {
  return (
    <ToolFrame slug="gitignore">
      <GitignoreTool />
    </ToolFrame>
  );
}
