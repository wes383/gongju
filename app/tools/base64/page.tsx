import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { Base64Tool } from "@/components/tools/base64-tool";

const meta = getTool("base64")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="base64">
      <Base64Tool />
    </ToolFrame>
  );
}
