# CLAUDE.md — Sitemapper

Internal visual sitemap builder for SUFFIX (Octopus.do-style). Boxes = pages,
connected as a tree, auto-laid-out. Staff build/edit; clients review by commenting.

## Roles
- **Staff** — Google sign-in, gated to `@suffix.works` in the Auth.js `signIn` callback.
  Full create/edit on ALL sitemaps (team-shared). Generate share links, resolve comments.
- **Client (guest)** — no account. Opens a per-sitemap link `/s/[token]`. Read-only view +
  post comments/replies (enters name+email). Cannot edit.

## Stack
Next.js 15 (App Router, React 19) + TS (strict) · Tailwind + shadcn/ui + lucide-react ·
**React Flow** (`@xyflow/react`) canvas · **d3-hierarchy** layout · **Zustand** + **zundo** ·
**Neon** (serverless Postgres) + **Drizzle ORM** · **Auth.js (NextAuth v5)** Google sign-in ·
**sonner** toasts · **html-to-image** PNG/JPG export · Deploy: **Vercel**.

## Architecture principles (read before coding)
1. **Node positions are DERIVED, never user-set.** Recompute layout with d3-hierarchy on
   every structural change; write positions into RF nodes. Nodes `draggable={false}`.
   Reordering changes the tree array, then re-lays out.
2. **The tree is the single source of truth**, in Zustand as `{ rootId, nodes }`.
   RF nodes/edges are a pure projection (`lib/layout.ts`). Edges = `smoothstep`
   (geometric, rounded corners, `pathOptions.borderRadius` ~12).
3. **Canvas is client-only** (`'use client'`).
4. **Autosave, don't ask.** Debounce ~800ms → a Server Action updates the sitemap row.
5. **ALL database access is server-side.** The browser NEVER connects to Neon. Staff use
   Server Components / Server Actions / Route Handlers with the Drizzle client; guests use
   the same server routes gated by a share token. No client DB key, no RLS — access is
   enforced in the server layer:
     - staff = valid Auth.js session (domain already restricted at sign-in)
     - guest = valid, non-revoked, non-expired share token (`comment` permission to write)
6. **Never expose `DATABASE_URL` or `AUTH_SECRET`.** Server env only.
7. **Responsive by default.** Guest view (`/s/[token]`) + comments are mobile-first;
   React Flow touch pan/pinch-zoom; comment panel = bottom sheet on mobile, side panel on
   desktop; tap targets ≥ 40px; test at 375px. Editor optimized for desktop.

## Data model (schema.sql is canonical; mirror in Drizzle db/schema.ts)
```ts
interface SitemapNode {
  id: string; title: string; slug: string;
  parentId: string | null; children: string[];
  color?: string | null; collapsed?: boolean;
}
interface SitemapDoc { rootId: string | null; nodes: Record<string,SitemapNode>; }
interface Share  { id: string; sitemapId: string; token: string;
  permission: 'view' | 'comment'; expiresAt: string | null; revoked: boolean; }
interface Comment { id: string; sitemapId: string; nodeId: string | null;
  parentId: string | null; body: string; authorName: string; authorEmail: string | null;
  isStaff: boolean; resolved: boolean; createdAt: string; }
```
`owner_id` / `author_id` = Auth.js user id (text). `comments.node_id` references a node id
inside the JSONB tree (no FK — validate in app). Auth.js Drizzle adapter owns the
users/accounts/sessions tables.

## Environment & runtime (see INFRA.md)
Env vars (all server-only except `NEXT_PUBLIC_SITE_URL`):
`DATABASE_URL` (Neon pooled), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
`NEXT_PUBLIC_SITE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
Hosting Vercel; DB Neon (Singapore, scale-to-zero — no keep-alive cron needed).
Guest/DB route handlers: `export const runtime='nodejs'`, `preferredRegion='sin1'`.
Domain gate lives in the Auth.js `signIn` callback (`email.endsWith('@suffix.works')`),
plus Google `hd` hint + Google OAuth "Internal" user type.

## Directory
```
app/
  (dashboard)/page.tsx           # staff: list sitemaps
  editor/[id]/page.tsx           # staff editor
  s/[token]/page.tsx             # guest read-only view + comments
  api/share/[token]/route.ts             # GET sitemap doc (token-validated)
  api/share/[token]/comments/route.ts    # GET list / POST comment (guest)
  api/auth/[...nextauth]/route.ts        # Auth.js
auth.ts                          # Auth.js config: Google + @suffix.works signIn callback
components/editor/  components/comments/
lib/
  db/            # drizzle client + schema (mirrors schema.sql)
  tree.ts        # pure add/remove/reorder/slug (unit-tested)
  layout.ts      # d3-hierarchy -> RF nodes/edges (pure)
  share.ts       # token validation (server)
store/useSitemapStore.ts         # zustand + zundo
```

## Conventions
- Pure tree/layout logic has no React; unit-test `lib/tree.ts`.
- Use `@xyflow/react` v12 APIs. shadcn primitives for chrome; small components.
- Drizzle for all queries; schema mirrors schema.sql. `pnpm dev|build|lint|test`.
- Run lint+build and commit after each phase.

## Do / Don't
- ✅ Recompute layout after every structural change.
- ✅ Route ALL DB access through the server; gate guests by share token.
- ✅ Enforce staff domain in the Auth.js signIn callback.
- ❌ Don't free-drag nodes. ❌ Don't query Neon from the browser.
- ❌ Don't expose `DATABASE_URL`/`AUTH_SECRET`. ❌ Don't put canvas logic in Server Components.
