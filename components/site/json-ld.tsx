import { serializeJsonLd } from "@/lib/structured-data";

/**
 * Renders a JSON-LD block. Kept as a component so pages can compose graphs
 * without repeating the script tag or the escaping rules.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
