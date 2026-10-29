import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { Base64Tool } from "@/components/tools/base64-tool";

const meta = getTool("base64")!;

export const metadata: Metadata = {
  title: meta.name,
  description: meta.description,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame tool={meta}>
      <Base64Tool />
    </ToolFrame>
  );
}
