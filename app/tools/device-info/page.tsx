import type { Metadata } from "next";
import { getTool } from "@/lib/tools";
import { ToolFrame } from "@/components/tools/tool-frame";
import { DeviceInfoTool } from "@/components/tools/device-info-tool";

const meta = getTool("device-info")!;

export const metadata: Metadata = {
  title: meta.name.zh,
  description: meta.description.zh,
  keywords: meta.keywords,
};

export default function Page() {
  return (
    <ToolFrame slug="device-info">
      <DeviceInfoTool />
    </ToolFrame>
  );
}
