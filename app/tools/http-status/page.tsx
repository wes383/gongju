import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { HttpStatusTool } from "@/components/tools/http-status-tool";

const meta = getTool("http-status")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="http-status">
      <HttpStatusTool />
    </ToolFrame>
  );
}
