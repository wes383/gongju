/**
 * cURL → code: a shell-aware tokenizer, a small flag parser, and generators
 * for fetch, axios, Python requests and Go's net/http.
 */

export interface CurlHeader {
  name: string;
  value: string;
}

export interface CurlRequest {
  method: string;
  url: string;
  headers: CurlHeader[];
  body: string | null;
  basicAuth: { user: string; pass: string } | null;
  cookies: string | null;
  /** Flags we understood but do not translate, surfaced as a hint */
  ignored: string[];
}

export type CodeTarget = "fetch" | "axios" | "python" | "go";

export type ParseResult =
  | { ok: true; request: CurlRequest }
  | { ok: false; message: string };

/** Split a shell command into argv, honouring quotes and backslash-newline */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let started = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === "\\" && quote === '"' && i + 1 < input.length) {
        current += input[++i];
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }

    if (ch === "\\" && i + 1 < input.length) {
      const next = input[++i];
      if (next === "\n") continue; // line continuation
      if (next === "\r" && input[i + 1] === "\n") {
        i++;
        continue;
      }
      current += next;
      started = true;
      continue;
    }

    if (/\s/.test(ch)) {
      if (started) {
        tokens.push(current);
        current = "";
        started = false;
      }
      continue;
    }

    current += ch;
    started = true;
  }

  if (started) tokens.push(current);
  return tokens;
}

const IGNORED_FLAGS = new Set([
  "-s",
  "--silent",
  "-S",
  "--show-error",
  "-v",
  "--verbose",
  "-i",
  "--include",
  "-L",
  "--location",
  "-k",
  "--insecure",
  "--compressed",
  "-f",
  "--fail",
  "-g",
  "--globoff",
  "-#",
  "--progress-bar",
]);

const VALUE_FLAGS = new Set(["-o", "--output", "-w", "--write-out", "--connect-timeout", "--max-time"]);

export function parseCurl(command: string): ParseResult {
  const tokens = tokenize(command.trim().replace(/\\\r?\n/g, " "));
  if (tokens.length === 0) return { ok: false, message: "empty" };

  let index = 0;
  if (tokens[0] === "curl" || tokens[0].endsWith("/curl") || tokens[0] === "curl.exe") {
    index = 1;
  } else {
    return { ok: false, message: "notCurl" };
  }

  let method: string | null = null;
  let url: string | null = null;
  const headers: CurlHeader[] = [];
  const dataParts: string[] = [];
  let formLike = false;
  let basicAuth: { user: string; pass: string } | null = null;
  let cookies: string | null = null;
  const ignored: string[] = [];

  const takeValue = (flag: string): string | null => {
    const next = tokens[index + 1];
    if (next === undefined) {
      ignored.push(flag);
      return null;
    }
    index += 1;
    return next;
  };

  for (; index < tokens.length; index++) {
    const token = tokens[index];

    if (token === "-X" || token === "--request") {
      method = takeValue(token)?.toUpperCase() ?? method;
      continue;
    }
    if (token === "-H" || token === "--header") {
      const raw = takeValue(token);
      if (raw) {
        const colon = raw.indexOf(":");
        if (colon > 0) {
          headers.push({ name: raw.slice(0, colon).trim(), value: raw.slice(colon + 1).trim() });
        }
      }
      continue;
    }
    if (
      token === "-d" ||
      token === "--data" ||
      token === "--data-raw" ||
      token === "--data-binary" ||
      token === "--data-ascii" ||
      token === "--data-urlencode"
    ) {
      const value = takeValue(token);
      if (value !== null) dataParts.push(value);
      continue;
    }
    if (token === "-F" || token === "--form") {
      const value = takeValue(token);
      if (value) {
        formLike = true;
        dataParts.push(value);
      }
      continue;
    }
    if (token === "-u" || token === "--user") {
      const value = takeValue(token);
      if (value) {
        const colon = value.indexOf(":");
        basicAuth =
          colon === -1
            ? { user: value, pass: "" }
            : { user: value.slice(0, colon), pass: value.slice(colon + 1) };
      }
      continue;
    }
    if (token === "-b" || token === "--cookie") {
      cookies = takeValue(token);
      continue;
    }
    if (token === "-A" || token === "--user-agent" || token === "-e" || token === "--referer") {
      const value = takeValue(token);
      if (value) {
        headers.push({
          name: token === "-e" || token === "--referer" ? "Referer" : "User-Agent",
          value,
        });
      }
      continue;
    }
    if (IGNORED_FLAGS.has(token)) {
      ignored.push(token);
      continue;
    }
    if (VALUE_FLAGS.has(token)) {
      takeValue(token);
      ignored.push(token);
      continue;
    }
    if (token.startsWith("-")) {
      ignored.push(token);
      continue;
    }

    if (!url) url = token;
  }

  if (!url) return { ok: false, message: "noUrl" };

  const body = dataParts.length > 0 ? dataParts.join("&") : null;
  const inferred = body !== null ? "POST" : "GET";
  if (formLike && body !== null && !headers.some((h) => h.name.toLowerCase() === "content-type")) {
    headers.push({ name: "Content-Type", value: "application/x-www-form-urlencoded" });
  }

  return {
    ok: true,
    request: {
      method: method ?? inferred,
      url,
      headers,
      body,
      basicAuth,
      cookies,
      ignored,
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   Code generation
   ══════════════════════════════════════════════════════════════ */

function indentBlock(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}

function jsonOrNull(body: string | null): unknown | null {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function headerObjectLines(headers: CurlHeader[], indent: number): string {
  const pad = " ".repeat(indent);
  return headers
    .map((header) => `${pad}${JSON.stringify(header.name)}: ${JSON.stringify(header.value)},`)
    .join("\n");
}

function basicAuthHeader(request: CurlRequest): CurlHeader | null {
  if (!request.basicAuth) return null;
  const raw = `${request.basicAuth.user}:${request.basicAuth.pass}`;
  // btoa handles latin-1 only; non-ASCII falls back to a UTF-8 safe value
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { name: "Authorization", value: `Basic ${btoa(binary)}` };
}

function allHeaders(request: CurlRequest): CurlHeader[] {
  const list = [...request.headers];
  const auth = basicAuthHeader(request);
  if (auth && !list.some((h) => h.name.toLowerCase() === "authorization")) list.push(auth);
  if (request.cookies && !list.some((h) => h.name.toLowerCase() === "cookie")) {
    list.push({ name: "Cookie", value: request.cookies });
  }
  return list;
}

function jsString(value: string): string {
  return JSON.stringify(value);
}

export function toFetch(request: CurlRequest): string {
  const headers = allHeaders(request);
  const parsed = jsonOrNull(request.body);
  const lines: string[] = [];

  if (headers.length > 0 || request.body !== null) {
    lines.push("const res = await fetch(" + jsString(request.url) + ", {");
    lines.push(`  method: ${jsString(request.method)},`);
    if (headers.length > 0) {
      lines.push("  headers: {");
      lines.push(headerObjectLines(headers, 4));
      lines.push("  },");
    }
    if (request.body !== null) {
      if (parsed !== null) {
        lines.push("  body: JSON.stringify(");
        lines.push(indentBlock(JSON.stringify(parsed, null, 2), 4) + ",");
        lines.push("  ),");
      } else {
        lines.push(`  body: ${jsString(request.body)},`);
      }
    }
    lines.push("});");
  } else {
    lines.push(`const res = await fetch(${jsString(request.url)}, { method: ${jsString(
      request.method
    )} });`);
  }

  lines.push("");
  lines.push("if (!res.ok) throw new Error(`HTTP ${res.status}`);");
  lines.push("const data = await res.json();");
  lines.push("console.log(data);");
  return lines.join("\n");
}

export function toAxios(request: CurlRequest): string {
  const headers = allHeaders(request);
  const parsed = jsonOrNull(request.body);
  const name = request.method.toLowerCase();
  const lines: string[] = ['import axios from "axios";', ""];

  if (parsed !== null) {
    lines.push(`const payload = ${JSON.stringify(parsed, null, 2)};`);
    lines.push("");
  }

  const call = `axios.${name}`;
  const args: string[] = [jsString(request.url)];
  if (parsed !== null) args.push("payload");
  else if (request.body !== null) args.push(jsString(request.body));

  if (headers.length > 0) {
    const config = ["{", "  headers: {", headerObjectLines(headers, 4), "  },", "}"];
    args.push(config.join("\n"));
  }

  if (args.length === 1) {
    lines.push(`const res = await ${call}(${args[0]});`);
  } else {
    lines.push(`const res = await ${call}(${args[0]},`);
    lines.push(indentBlock(args.slice(1).join(",\n"), 2) + ");");
  }
  lines.push("console.log(res.data);");
  return lines.join("\n");
}

function pythonString(value: string): string {
  return `"""${value.replace(/"""/g, '\\"\\"\\"')}"""`;
}

export function toPython(request: CurlRequest): string {
  const headers = allHeaders(request);
  const method = request.method.toLowerCase();
  const lines: string[] = ["import requests", ""];
  lines.push(`url = ${JSON.stringify(request.url)}`);

  if (headers.length > 0) {
    lines.push("headers = {");
    for (const header of headers) {
      lines.push(`    ${JSON.stringify(header.name)}: ${JSON.stringify(header.value)},`);
    }
    lines.push("}");
  }

  if (request.body !== null) {
    lines.push(`payload = ${pythonString(request.body)}`);
  }

  const args: string[] = ["url"];
  if (headers.length > 0) args.push("headers=headers");
  if (request.body !== null) args.push("data=payload");
  args.push("timeout=30");

  lines.push("");
  lines.push(`response = requests.${method}(${args.join(", ")})`);
  lines.push("print(response.status_code)");
  lines.push("print(response.text)");
  return lines.join("\n");
}

export function toGo(request: CurlRequest): string {
  const headers = allHeaders(request);
  const hasBody = request.body !== null;
  const imports = ["fmt", "io", "net/http"];
  if (hasBody) imports.push("strings");

  const lines: string[] = ["package main", "", "import ("];
  for (const name of imports.sort()) lines.push(`\t"${name}"`);
  lines.push(")", "", "func main() {");

  if (request.body !== null) {
    const body = request.body.includes("`")
      ? JSON.stringify(request.body)
      : `\`${request.body}\``;
    lines.push(`\tbody := strings.NewReader(${body})`);
    lines.push(`\treq, err := http.NewRequest(${JSON.stringify(request.method)}, ${JSON.stringify(
      request.url
    )}, body)`);
  } else {
    lines.push(
      `\treq, err := http.NewRequest(${JSON.stringify(request.method)}, ${JSON.stringify(
        request.url
      )}, nil)`
    );
  }

  lines.push("\tif err != nil {");
  lines.push("\t\tpanic(err)");
  lines.push("\t}");
  for (const header of headers) {
    lines.push(
      `\treq.Header.Set(${JSON.stringify(header.name)}, ${JSON.stringify(header.value)})`
    );
  }
  lines.push("");
  lines.push("\tres, err := http.DefaultClient.Do(req)");
  lines.push("\tif err != nil {");
  lines.push("\t\tpanic(err)");
  lines.push("\t}");
  lines.push("\tdefer res.Body.Close()");
  lines.push("");
  lines.push("\tbodyBytes, err := io.ReadAll(res.Body)");
  lines.push("\tif err != nil {");
  lines.push("\t\tpanic(err)");
  lines.push("\t}");
  lines.push('\tfmt.Println(res.Status, string(bodyBytes))');
  lines.push("}");
  return lines.join("\n");
}

export function toCode(request: CurlRequest, target: CodeTarget): string {
  switch (target) {
    case "fetch":
      return toFetch(request);
    case "axios":
      return toAxios(request);
    case "python":
      return toPython(request);
    case "go":
      return toGo(request);
  }
}

export const CURL_SAMPLE = `curl -X POST "https://api.example.com/v1/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-demo-token" \\
  -d '{"name":"Alice","email":"alice@example.com","age":29}'`;
