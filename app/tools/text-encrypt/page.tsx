import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { TextEncryptTool } from "@/components/tools/text-encrypt-tool";

const meta = getTool("text-encrypt")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
  alternates: { canonical: "/tools/text-encrypt" },
};

export default function Page() {
  return (
    <ToolFrame slug="text-encrypt">
      <TextEncryptTool />
    </ToolFrame>
  );
}
