import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CodeFormatTool } from "@/components/tools/code-format-tool";

const meta = getTool("code-format")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/code-format" },
};

export default function Page() {
  return (
    <ToolFrame slug="code-format">
      <CodeFormatTool />
    </ToolFrame>
  );
}
