const fs = require("fs");
const db = require("mime-db");

const rows = Object.keys(db)
  .sort()
  .map((type) => {
    const entry = db[type];
    const ext = (entry.extensions || []).join(", ");
    const iana = entry.source === "iana";
    return `  ["${type}", "${ext}", ${iana ? 1 : 0}],`;
  });

const header = `/**
 * Generated from mime-db (${rows.length} entries) — do not edit by hand.
 * Regenerate with: node scripts/generate-mime-full.js
 *
 * Tuple: [mime type, comma-separated extensions, 1 = IANA registered]
 */
export const MIME_FULL: [string, string, number][] = [
`;

fs.writeFileSync("lib/mime-full.ts", header + rows.join("\n") + "\n];\n");
console.log("wrote lib/mime-full.ts", rows.length, "entries");
