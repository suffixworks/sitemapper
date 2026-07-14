# Sitemapper

Internal visual sitemap builder for SUFFIX (Octopus.do-style). Staff build/edit
tree-structured sitemaps on a canvas; clients review via a share link by commenting.

See [`CLAUDE.md`](./CLAUDE.md) for conventions/architecture, [`docs/BRIEF.md`](./docs/BRIEF.md)
for the phased build plan, and [`docs/INFRA.md`](./docs/INFRA.md) for infra/ops.

## Stack

Next.js 15 (App Router, React 19) · TypeScript (strict) · Tailwind v4 + shadcn/ui ·
React Flow (`@xyflow/react`) · d3-hierarchy · Zustand + zundo · **Neon** (Postgres) +
**Drizzle ORM** · **Auth.js (NextAuth v5)** Google sign-in · sonner · html-to-image.
Deploy: **Vercel**. All DB access is server-side (Server Actions / Route Handlers) — the
browser never connects to the DB; there is no RLS.

## Develop

```bash
pnpm install
cp .env.example .env.local        # fill in Neon / Auth.js / Google values
pnpm db:push                      # push the Drizzle schema to Neon
pnpm dev                          # http://localhost:3000
pnpm lint && pnpm build
pnpm test                         # vitest (lib/tree.ts unit tests)
```

Database (Drizzle + Neon):

```bash
pnpm db:generate   # generate SQL migrations from lib/db/schema.ts
pnpm db:push       # apply the schema to the database (DATABASE_URL)
pnpm db:studio     # browse the DB
```

## Env

Server-only except `NEXT_PUBLIC_SITE_URL` (see `.env.example`):
`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`NEXT_PUBLIC_SITE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Status

Built phase by phase (see `docs/BRIEF.md`):

- [x] **Phase 0** — Scaffold
- [x] Phase 1 — Core canvas (local)
- [x] Phase 2 — UX polish
- [x] Phase 3 — Neon persistence + staff auth (Auth.js)
- [x] Phase 4 — Share links
- [x] Phase 5 — Comments
- [ ] Phase 6 — Export & extras
