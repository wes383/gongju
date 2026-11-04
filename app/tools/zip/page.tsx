import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ZipTool } from "@/components/tools/zip-tool";

const meta = getTool("zip")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/zip" },
};

export default function Page() {
  return (
    <ToolFrame slug="zip">
      <ZipTool />
    </ToolFrame>
  );
}
