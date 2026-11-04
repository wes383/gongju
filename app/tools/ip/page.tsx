import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { IpTool } from "@/components/tools/ip-tool";

const meta = getTool("ip")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/ip" },
};

export default function Page() {
  return (
    <ToolFrame slug="ip">
      <IpTool />
    </ToolFrame>
  );
}
