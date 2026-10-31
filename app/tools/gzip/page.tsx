import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { GzipTool } from "@/components/tools/gzip-tool";

const meta = getTool("gzip")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="gzip">
      <GzipTool />
    </ToolFrame>
  );
}
