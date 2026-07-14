# Sitemapper

Internal visual sitemap builder for SUFFIX (Octopus.do-style). Staff build/edit
tree-structured sitemaps on a canvas; clients review via a share link by commenting.

See [`CLAUDE.md`](./CLAUDE.md) for conventions/architecture, [`docs/BRIEF.md`](./docs/BRIEF.md)
for the phased build plan, and [`docs/INFRA.md`](./docs/INFRA.md) for the ($0) infra/ops route.

## Stack

Next.js 15 (App Router, React 19) · TypeScript (strict) · Tailwind v4 + shadcn/ui ·
React Flow (`@xyflow/react`) · d3-hierarchy · Zustand + zundo · Supabase (Postgres, Auth) ·
sonner · html-to-image. Deploy: **Cloudflare Workers** via `@opennextjs/cloudflare`.

## Develop

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in Supabase/Upstash values
pnpm dev                         # http://localhost:3000
pnpm lint && pnpm build
pnpm test                        # vitest (lib/tree.ts unit tests)
```

Cloudflare Workers runtime preview / deploy:

```bash
pnpm preview   # opennextjs-cloudflare build + preview (needs workerd)
pnpm deploy    # opennextjs-cloudflare build + wrangler deploy
```

## Status

Built phase by phase (see `docs/BRIEF.md`):

- [x] **Phase 0** — Scaffold
- [ ] Phase 1 — Core canvas (local)
- [ ] Phase 2 — UX polish
- [ ] Phase 3 — Supabase persistence + staff auth
- [ ] Phase 4 — Share links
- [ ] Phase 5 — Comments
- [ ] Phase 6 — Export & extras
