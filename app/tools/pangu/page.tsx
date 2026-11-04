import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { PanguTool } from "@/components/tools/pangu-tool";

const meta = getTool("pangu")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/pangu" },
};

export default function Page() {
  return (
    <ToolFrame slug="pangu">
      <PanguTool />
    </ToolFrame>
  );
}
