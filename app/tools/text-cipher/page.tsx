import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextCipherTool } from "@/components/tools/text-cipher-tool";

const meta = getTool("text-cipher")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/text-cipher" },
};

export default function Page() {
  return (
    <ToolFrame slug="text-cipher">
      <TextCipherTool />
    </ToolFrame>
  );
}
