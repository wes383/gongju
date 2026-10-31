import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { CurlToCodeTool } from "@/components/tools/curl-to-code-tool";

const meta = getTool("curl-to-code")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="curl-to-code">
      <CurlToCodeTool />
    </ToolFrame>
  );
}
