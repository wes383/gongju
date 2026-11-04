import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { YamlTool } from "@/components/tools/yaml-tool";

const meta = getTool("yaml")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/yaml" },
};

export default function Page() {
  return (
    <ToolFrame slug="yaml">
      <YamlTool />
    </ToolFrame>
  );
}
