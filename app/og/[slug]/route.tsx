import { ImageResponse } from "next/og";
import { OgArtwork, OG_SIZE } from "@/components/site/og-artwork";
import { SITE_COPY } from "@/lib/site";
import { getTool } from "@/lib/tools";

/** Stable public share-card URL referenced by every page's openGraph.images */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tool = getTool(slug);

  return new ImageResponse(
    <OgArtwork
      title={tool ? tool.name.en : SITE_COPY.en.title}
      subtitle={tool ? tool.description.en : SITE_COPY.en.description}
    />,
    OG_SIZE
  );
}