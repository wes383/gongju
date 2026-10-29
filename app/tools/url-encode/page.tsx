import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { UrlEncodeTool } from "@/components/tools/url-encode-tool";

const meta = getTool("url-encode")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="url-encode">
      <UrlEncodeTool />
    </ToolFrame>
  );
}
