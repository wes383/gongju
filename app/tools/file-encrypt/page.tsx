import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { FileEncryptTool } from "@/components/tools/file-encrypt-tool";

const meta = getTool("file-encrypt")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="file-encrypt">
      <FileEncryptTool />
    </ToolFrame>
  );
}
