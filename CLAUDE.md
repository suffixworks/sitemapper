# CLAUDE.md — Sitemapper

Internal visual sitemap builder for SUFFIX (Octopus.do-style). Boxes = pages,
connected as a tree, auto-laid-out. Staff build/edit; clients review by commenting.

## Roles
- **Staff** — signed in with a `@suffix.works` Google account. Full create/edit
  on ALL sitemaps (team-shared). Can generate share links and resolve comments.
- **Client (guest)** — no account. Opens a per-sitemap share link `/s/[token]`.
  Read-only view + can post comments/replies (enters name+email). Cannot edit.

## Stack
Next.js 15 (App Router, React 19) + TS (strict) · Tailwind + shadcn/ui + lucide-react ·
**React Flow** (`@xyflow/react`) canvas · **d3-hierarchy** layout · **Zustand**
state + **zundo** undo/redo · **Supabase** (Postgres JSONB, Auth) · **sonner**
toasts · **html-to-image** PNG export · Deploy: **Cloudflare Workers** (OpenNext adapter).

## Architecture principles (read before coding)
1. **Node positions are DERIVED, never user-set.** Recompute layout with
   d3-hierarchy on every structural change; write positions into RF nodes.
   Nodes are `draggable={false}`. Reordering changes the tree array, then re-lays out.
2. **The tree is the single source of truth**, kept in Zustand as
   `{ rootId, nodes: Record<id,SitemapNode> }`. RF nodes/edges are a pure
   projection computed each render (`lib/layout.ts`).
3. **Canvas is client-only** (`'use client'`; dynamic import with `ssr:false` if needed).
4. **Autosave, don't ask.** Debounce ~800ms after any mutation → update the
   sitemap's JSONB row. Show a subtle saved/saving state.
5. **Two data paths — do not mix them:**
   - **Staff** talk to Supabase directly with their JWT; RLS (`is_suffix()`) guards everything.
   - **Guests** never hit Supabase directly. Every guest action goes through a
     Next.js Route Handler that validates the share token, then uses the
     **service-role key** (server-only) to read the sitemap / read+write comments.
6. **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.** Server routes only.
7. **Responsive by default.** Guest view (`/s/[token]`) + comments are mobile-first —
   clients review on phones. React Flow uses touch pan/pinch-zoom; comment panel is a
   bottom sheet on mobile, side panel on desktop; tap targets ≥ 40px. Test at 375px.
   Staff editor stays usable on mobile but is optimized for desktop.

## Data model (see 0001_schema_and_access.sql for the truth)
```ts
type NodeKind = 'page' | 'section' | 'external'; // kind/notes/meta are v2
interface SitemapNode {
  id: string; title: string; slug: string;
  parentId: string | null; children: string[];
  color?: string | null; collapsed?: boolean;
}
interface SitemapDoc { rootId: string | null; nodes: Record<string,SitemapNode>; }

interface Share {   // sitemap_shares
  id: string; sitemap_id: string; token: string;
  permission: 'view' | 'comment'; expires_at: string | null; revoked: boolean;
}
interface Comment { // comments — node_id null = whole-sitemap comment
  id: string; sitemap_id: string; node_id: string | null; parent_id: string | null;
  body: string; author_name: string; author_email: string | null;
  is_staff: boolean; resolved: boolean; created_at: string;
}
```
`comments.node_id` references a node id inside the JSONB tree (no FK — validate in app).

## Directory
```
app/
  (dashboard)/page.tsx           # staff: list sitemaps
  editor/[id]/page.tsx           # staff editor (SitemapEditor + CommentsPanel)
  s/[token]/page.tsx             # guest read-only view + comments
  api/share/[token]/route.ts             # GET sitemap doc (validated by token)
  api/share/[token]/comments/route.ts    # GET list / POST comment (guest)
  auth/callback/route.ts
components/
  editor/SitemapEditor.tsx  SitemapNode.tsx  Toolbar.tsx
  comments/CommentsPanel.tsx  CommentThread.tsx  CommentPin.tsx
lib/
  tree.ts        # pure add/remove/reorder/slug (unit-tested)
  layout.ts      # d3-hierarchy -> RF nodes/edges (pure)
  supabase/      # browser client, server client, service-role (server-only)
  share.ts       # token validation helper (server)
store/useSitemapStore.ts   # zustand + zundo
```

## Environment & runtime (see INFRA.md)
Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (server-only), `NEXT_PUBLIC_SITE_URL`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (server-only).
Hosting: **Cloudflare Workers via `@opennextjs/cloudflare`** (DB/Auth: Supabase, Singapore).
Route handlers keep the default **Node.js runtime** (do NOT set `runtime='edge'`);
`wrangler.toml` needs `nodejs_compat`. Public `NEXT_PUBLIC_*` are baked at build;
server secrets are Cloudflare Worker secrets (`wrangler secret put`), never public.
Migrations live in `supabase/migrations/` (Supabase CLI). Supabase Free keep-alive +
backup run as Cloudflare Cron Triggers.

## Conventions
- Pure tree/layout logic has no React; unit-test `lib/tree.ts`.
- Use `@xyflow/react` v12 APIs (NOT the old `reactflow` package).
- shadcn primitives for chrome; keep components small.
- `pnpm dev|build|lint|test`. Run lint+build and commit after each phase.

## Do / Don't
- ✅ Recompute layout after every structural change.
- ✅ Route ALL guest reads/writes through validated server routes.
- ❌ Don't free-drag nodes. ❌ Don't store nodes as separate DB rows.
- ❌ Don't put canvas logic in Server Components.
- ❌ Don't let guests touch Supabase directly or expose the service-role key.
