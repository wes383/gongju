<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tool implementation guidelines

- Before adding a new tool or utility, check whether an existing dependency or a native platform API already covers it. Prefer a maintained library over a hand-rolled implementation unless bundle size, license, offline behavior, or API fit clearly argues against it.
- Reuse existing project helpers under `lib/` and shared components before writing new ones.
- When a new dependency is justified, mention the reason in the commit body.

