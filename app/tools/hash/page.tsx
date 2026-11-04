import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HashTool } from "@/components/tools/hash-tool";

const meta = getTool("hash")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/hash" },
};

export default function Page() {
  return (
    <ToolFrame slug="hash">
      <HashTool />
    </ToolFrame>
  );
}
