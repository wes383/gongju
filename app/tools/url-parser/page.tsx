import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UrlParserTool } from "@/components/tools/url-parser-tool";

const meta = getTool("url-parser")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="url-parser">
      <UrlParserTool />
    </ToolFrame>
  );
}
