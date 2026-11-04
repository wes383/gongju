import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { ZhConvertTool } from "@/components/tools/zh-convert-tool";

const meta = getTool("zh-convert")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/zh-convert" },
};

export default function Page() {
  return (
    <ToolFrame slug="zh-convert">
      <ZhConvertTool />
    </ToolFrame>
  );
}
