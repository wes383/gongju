# GongJu · Online Toolbox

A developer toolbox that runs entirely in the browser: 197 tools across 28 categories. All computation happens locally — your data never leaves your machine.

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Vitest

## Features

- 28 categories: encoding, JSON, text, hashing, images, PDF, date & time, network, office, and more
- Chinese / English UI, light / dark theme
- Statically generated tool pages; no backend, no data uploads
- 1,100+ unit tests covering the pure logic

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Commands

- `npm run dev` — dev server
- `npm test` — run unit tests (`npm run test:watch` for watch mode)
- `npm run lint` — ESLint
- `npm run build` — production build

## Project structure

- `lib/tools.ts` — tool registry; single source of truth for nav, home, and search
- `app/tools/<slug>/page.tsx` — tool pages (metadata + assembly)
- `components/tools/` — tool client components; bilingual copy lives in the component
- `lib/` — React-free pure logic; tests in `lib/__tests__/`

## Adding a tool

Register it in `lib/tools.ts`, then add `app/tools/<slug>/page.tsx` and a client component.