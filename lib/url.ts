/**
 * URL decomposition built on the native `URL` / `URLSearchParams` parser.
 *
 * The point is not to re-implement parsing but to shape the result into
 * something a table can render: a fixed list of components plus query pairs
 * with both the raw and the decoded value.
 */
import { codedError } from "./errors";

export interface UrlParam {
  /** Decoded key */
  name: string;
  /** Decoded value */
  value: string;
  /** The original `key=value` slice, still percent-encoded */
  raw: string;
  /** True when decoding actually changed something */
  encoded: boolean;
  /** False for bare flags such as `?debug` */
  hasValue: boolean;
}

export interface ParsedUrl {
  /** Normalised absolute URL */
  href: string;
  /** e.g. "https:" */
  protocol: string;
  /** e.g. "https" */
  scheme: string;
  username: string;
  password: string;
  hostname: string;
  /** hostname plus port when the port is non-default */
  host: string;
  /** Empty when the scheme's default port was used */
  port: string;
  pathname: string;
  /** Includes the leading "?" */
  search: string;
  /** Includes the leading "#" */
  hash: string;
  /** "null" is dropped, e.g. for mailto: links */
  origin: string;
  params: UrlParam[];
  /** Input had no scheme, so https:// was prepended before parsing */
  assumedScheme: boolean;
  /** Host is an IPv4 literal or a bracketed IPv6 literal */
  isIpHost: boolean;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const IPV4_HOST = /^\d{1,3}(\.\d{1,3}){3}$/;

function decodeComponent(text: string): string {
  try {
    return decodeURIComponent(text.replace(/\+/g, " "));
  } catch {
    // Malformed escapes: keep the raw text rather than failing the whole parse
    return text;
  }
}

/** Split a query string into raw/decoded pairs, keeping order and duplicates */
export function parseQuery(search: string): UrlParam[] {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return [];
  return raw
    .split("&")
    .filter((pair) => pair !== "")
    .map((pair) => {
      const eq = pair.indexOf("=");
      const rawName = eq === -1 ? pair : pair.slice(0, eq);
      const rawValue = eq === -1 ? "" : pair.slice(eq + 1);
      const name = decodeComponent(rawName);
      const value = decodeComponent(rawValue);
      return {
        name,
        value,
        raw: pair,
        encoded: name !== rawName || value !== rawValue,
        hasValue: eq !== -1,
      };
    });
}

/**
 * Parse a URL into its components.
 *
 * A bare `example.com/path` is accepted and parsed as `https://example.com/path`;
 * the `assumedScheme` flag lets the UI say so instead of pretending the input
 * had a scheme.
 */
export function parseUrl(input: string): ParsedUrl {
  const text = input.trim();
  if (!text) throw codedError("url.empty");

  const protocolRelative = text.startsWith("//");
  const assumedScheme = !HAS_SCHEME.test(text) && !protocolRelative;
  let url: URL;
  try {
    // A protocol-relative URL needs a base to resolve against; keep the flag
    // off so the UI does not claim the input was rewritten
    url = new URL(protocolRelative ? `https:${text}` : assumedScheme ? `https://${text}` : text);
  } catch {
    throw codedError("url.invalid");
  }

  return {
    href: url.href,
    protocol: url.protocol,
    scheme: url.protocol.replace(/:$/, ""),
    username: url.username,
    password: url.password,
    hostname: url.hostname,
    host: url.host,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    origin: url.origin === "null" ? "" : url.origin,
    params: parseQuery(url.search),
    assumedScheme,
    isIpHost: IPV4_HOST.test(url.hostname) || url.hostname.includes(":"),
  };
}
