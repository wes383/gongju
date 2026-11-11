<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tool implementation guidelines

- Before adding a new tool or utility, check whether an existing dependency or a native platform API already covers it. Prefer a maintained library over a hand-rolled implementation unless bundle size, license, offline behavior, or API fit clearly argues against it.
- Reuse existing project helpers under `lib/` and shared components before writing new ones.
- When a new dependency is justified, mention the reason in the commit body.

## Architecture

- Next.js 16.4.3 App Router (`cacheComponents`, Turbopack) + React 19 + Tailwind v4. Tool pages are statically generated.
- `lib/tools.ts` is the single source of truth for tools and categories (nav, home, search). A new tool means: register it there, add `app/(en)/tools/<slug>/page.tsx` (metadata + assembly only), a client component in `components/tools/`, then run `node scripts/gen-tool-loader.mjs` so the `/zh` catch-all can load it.
- When adding a new category, re-check tools already filed under other categories and move the ones that fit the new category better (nav, home and search derive from the registry).
- Shared shell is `ToolFrame`; it takes `slug` and resolves metadata on the client.
- `lib/*` must stay React-free and unit-testable. Per-tool copy lives in the component's `COPY = { zh, en }` read through `useCopy`.
- `orkest-ui/` is a design reference (separate repo, gitignored, excluded from lint/tsc). UI primitives live in `components/ui/`.
- `app/globals.css` keeps Orkest CSS variables and bridges them with `@theme inline`. Never map a `@theme` token to a same-named `:root` variable (self-reference).
- `features.md` and `TOOL-ROADMAP.md` are local-only/gitignored; their library suggestions are reference, not spec. Explain any deviation instead of following blindly.
- `.gitignore` is user-maintained: read it before appending, never overwrite.

## i18n

- URL-level locales: English is the default at root URLs, Chinese lives under `/zh`. Two root layouts (`app/(en)/`, `app/(zh)/`) share `components/site/site-shell.tsx`, which hands the locale to `LocaleProvider`; `useLocale / useT / useCopy` read it from context. The URL is the source of truth — no localStorage preference.
- Internal links go through `localePath(locale, path)`; the language switcher navigates with `switchLocalePath(pathname, next)`. Crossing the two root layouts is a full page load by design.
- `/zh/tools/[slug]` is a static catch-all (`generateStaticParams`, unknown slugs hit `notFound()`; `instant = false` because a catch-all cannot promise an instant shell, and `dynamicParams` is incompatible with `cacheComponents`) rendering tools through `components/tools/tool-loader.tsx`, a generated slug → lazy component map.
- Metadata and JSON-LD are per locale: `toolMetadata(tool, locale)`, `siteMetadata(locale)`, `toolJsonLd(tool, locale)`. Every page declares its own canonical plus hreflang alternates (`x-default` = English); never put canonicals or alternates in a layout.
- Generic UI copy goes in `lib/i18n.ts`; tool-specific copy stays in the tool component.
- Errors: throw `codedError(code, ...params)` from `lib/errors.ts`, render with `errorText(error, locale)`. Never surface raw `error.message`.
- English UI must contain no Chinese: render `item[locale]`, never both `zh` and `en`; sample data must be locale-aware.
- Chinese is intentional only where the content is Chinese itself (pinyin/zh-convert samples, unicode escapes, Chinese lorem, lunar names).

## React / Next pitfalls

- `react-hooks/set-state-in-effect` is enforced; do not disable it. Use render-time derivation (`{ id, value }` pairs compared by id), `key={id}` remount, or work inside an effect timer.
- Anything reading the current time must use `useSyncExternalStore` with a constant `getServerSnapshot`. Never `useState(() => Date.now())`, `new Date()` in render, or `Intl.DateTimeFormat().resolvedOptions()` in render. References: `countdown-tool.tsx`, `theme-toggle.tsx`, `totp` tool.
- Never call `Math.random()` during render (Lorem generation, random previews).
- Functions (for example icon components) must not be passed from server to client components.
- Next rewrites `<title>` during hydration; use `components/use-document-title.ts` instead of setting `document.title` directly.
- `ImageResponse` (OG images) only has a Latin font: no CJK text.
- After editing `lib/tools.ts`, a route may 500 in dev due to Turbopack module cache; restart the dev server.
- If `tsc` reports errors in `.next/dev/types/validator.ts` or `.next/types/validator.ts` (stale route references after moving pages), delete the file and let dev regenerate it.

## Libraries in use

- Parsing/data: `marked` + `turndown` + `dompurify`, `js-yaml`, `fast-xml-parser`, `papaparse`, `jsonpath-plus`, `ipaddr.js`, `ua-parser-js`, `sql-formatter`, `js-beautify`, `mathjs/number`, `cron-parser` + `cronstrue`.
- Media/documents: `pdf-lib` + `pdfjs-dist`, `fflate`, `write-excel-file/browser`, `gifenc`, `qrcode` + `jsqr` + `jsbarcode`.
- Text/hash: `opencc-js`, `pinyin-pro`, `hash-wasm`.
- Do not use `xlsx` (known CVEs; repaired builds are CDN-only). Prefer `write-excel-file`.
- Watch ESM shapes: `he` v2 has no default export; use named imports.
- Large payloads (opencc dictionaries, full MIME table, pdf.js) must load through dynamic `import()` on demand, not in the initial chunk.
- Long-running or user-supplied workloads (regex) run in a Web Worker with a timeout.

## Testing and verification

- Vitest 3 (`npm test` = `vitest run`); `@` alias is configured in `vitest.config.ts`. Pure logic belongs in `lib/__tests__/`.
- Before finishing: `npx tsc --noEmit`, `npx eslint <changed files>`, `npx vitest run`; run `npm run build` when routes, metadata or client/server boundaries changed.
- If build is blocked by the safe-delete shim because `.next` is locked, move `.next` away first.
- Headless Chromium uses overlay scrollbars, so `offsetWidth - clientWidth` is always 0 and 10px classic-scrollbar issues cannot be reproduced; use a headed browser for layout checks.

## UI conventions

- Copy feedback is inline (icon + text, 1.2–1.6s), not a global toast. Use lucide icons, not `✓` characters. Missing icon imports silently resolve to DOM globals.
- `html { scrollbar-gutter: stable }` plus Radix `react-remove-scroll` double-compensates; keep `html body[data-scroll-locked] { margin-right: 0 !important; }` outside `@layer`.
- Fullscreen containers: set `overflow: hidden; scrollbar-gutter: auto` on `html` and give `::backdrop` the theme background.
- Radix `Select`: `value` must be derived from current state; a constant `""` never reflects a selection.
- `Segmented` inside a `flex-col` needs `w-fit max-w-full` to avoid stretching.
- Long CSS/text output needs `whitespace-pre-wrap break-all`.
- Do not use `offsetWidth - clientWidth` to detect custom scrollbars on this machine.

## Committing

- Commit after every change. Use Conventional Commits, one line: `type(scope): lowercase English imperative` (`feat/fix/refactor/style/test/docs/chore`), scope = module.
- PowerShell 5: `&&`, `||` and heredocs are unavailable; separate commands with `;` and pass commit bodies with `-m`.
- Some files are checked out with CRLF; scripted multiline replacement must detect the EOL first.


