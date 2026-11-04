import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { JsonTransformTool } from "@/components/tools/json-transform-tool";

const meta = getTool("json-transform")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/json-transform" },
};

export default function Page() {
  return (
    <ToolFrame slug="json-transform">
      <JsonTransformTool />
    </ToolFrame>
  );
}
