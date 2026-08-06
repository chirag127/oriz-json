# oriz-json

**Live: https://json.oriz.in**

JSON power tool that runs entirely in your browser. Format, minify, validate, explore as a tree, query with JSONPath, convert JSON ↔ CSV, diff two JSONs, and sort keys.

**100% client-side — no upload, no signup, no server.** Your JSON never leaves the tab.

## Features

- **Format / minify / validate** — beautify with 2/4/tab indent, minify, live validity with line:col error location + byte/node/key/depth stats.
- **Tree viewer** — collapsible tree with organic branch connectors, expand/collapse-all, syntax-colored values.
- **JSONPath query** — run `jsonpath-plus` expressions (`$..author`, `$.items[*]`), lazy-loaded on first use.
- **JSON ↔ CSV** — array-of-objects → CSV (union columns, RFC-quoting) and CSV → JSON (typed coercion).
- **Diff** — deep structural diff of two JSONs with add/remove/change summary and per-path detail.
- **Sort keys** — recursive A→Z / Z→A key sort.
- **AI (optional)** — explain a structure, infer a JSON Schema, or generate sample JSON via [`@chirag127/oz-ai`](https://github.com/chirag127/design-system) (g4f, no key). Degrades gracefully; core tools work offline.

## Privacy

All parsing, diffing, querying, and conversion use the browser's native `JSON` engine and local JS. Nothing is transmitted. The only network call is the optional AI feature, which you trigger explicitly.

## Stack

Astro (static) · React 19 islands · Tailwind v4 · shared `@chirag127/oz-*` packages. Heavy libs are dynamically imported only when their feature is used, keeping first paint instant.

## Develop

```bash
npm install --legacy-peer-deps
npm run dev
npm test        # vitest — pure-logic unit tests
npm run build   # static output → dist/
```

## License

MIT © 2026 Chirag Singhal
