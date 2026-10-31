/** Browser download helpers shared by every tool that produces files. */

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Strip the extension from a file name. */
export function baseName(name: string, fallback = "file"): string {
  return name.replace(/\.[^.]+$/, "") || fallback;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari needs a tick before the URL can be released.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Bundle several blobs into one zip so browsers only prompt once. */
export async function downloadZip(files: { name: string; blob: Blob }[], zipName: string) {
  const { zipSync } = await import("fflate");
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    entries[uniqueName(entries, file.name)] = new Uint8Array(await file.blob.arrayBuffer());
  }
  const zipped = zipSync(entries, { level: 0 });
  downloadBlob(new Blob([zipped as BlobPart], { type: "application/zip" }), zipName);
}

function uniqueName(existing: Record<string, unknown>, name: string): string {
  if (!(name in existing)) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (`${stem}-${i}${ext}` in existing) i += 1;
  return `${stem}-${i}${ext}`;
}
