# Sitemapper — Technical Information

เครื่องมือออกแบบ sitemap (Octopus.do-style) สำหรับ SUFFIX. Staff สร้าง/แก้โครงสร้างเว็บบน
canvas, ลูกค้ารีวิวผ่านลิงก์แชร์ด้วยการ comment.

- **Production:** https://suffix-sitemapper.vercel.app
- **Repo (source):** `github.com/suffixworks/sitemapper` · **Repo (Vercel deploy):** `github.com/jatesaitthiti/sitemapper`
- **Local:** `~/Documents/GitHub/sitemapper`

---

## Tech Stack

| ชั้น | ใช้อะไร | version |
|---|---|---|
| Framework | **Next.js** (App Router, React 19, TS strict) | 15.5.20 / React 19.2.4 |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (base-ui `@base-ui/react`) + `tw-animate-css` | 4 / 1.6 |
| Icons / Toast | `lucide-react` · `sonner` | 1.24 / 2.0 |
| Canvas | **React Flow** (`@xyflow/react`) | 12.11 |
| Layout engine | **d3-hierarchy** (tidy tree → RF nodes/edges) | 3.1 |
| State | **Zustand** + **zundo** (undo/redo) | 5.0 / 2.3 |
| Database | **Neon** (serverless Postgres, Singapore) via `@neondatabase/serverless` (neon-http) | 1.1 |
| ORM | **Drizzle ORM** + `drizzle-kit` | 0.45 / 0.31 |
| Auth | **Auth.js / NextAuth v5** (`next-auth@beta`) + `@auth/drizzle-adapter` (Google, JWT session) | 5.0.0-beta.31 |
| Export | `html-to-image` (PNG/JPG) | 1.11 |
| Rate limit | `@upstash/ratelimit` + `@upstash/redis` (guest comments, optional) | 2.0 / 1.38 |
| Test | **Vitest** (unit: `lib/tree.ts`) | 4.1 |
| Deploy | **Vercel** (git-connected, auto-deploy on push to main) | — |

---

## Architecture (หลักการสำคัญ)

1. **Tree = single source of truth** ใน Zustand `{ rootId, nodes: Record<id,node> }`.
   RF nodes/edges เป็น projection (คำนวณใหม่ทุกครั้งด้วย d3-hierarchy). Node ลากไม่ได้ —
   ตำแหน่ง derive จาก layout เสมอ.
2. **Autosave** — debounce ~800ms หลังแก้ → เรียก Server Action `saveSitemap` (browser
   ไม่ต่อ DB ตรง).
3. **ทุก DB access อยู่ฝั่ง server** — ไม่มี RLS, บังคับสิทธิ์ที่ server layer:
   - **Staff** = มี Auth.js session (โดเมนถูกกัน `@suffix.works` ตั้งแต่ signIn callback) →
     team-shared เข้าถึง/แก้ทุก sitemap.
   - **Guest** = ไม่มี session, ทุก action วิ่งผ่าน route ที่ validate **share token**.
4. **Auth.js JWT session strategy** — เพื่อให้ middleware ทำงานบน edge ได้; Drizzle adapter
   เก็บ users/accounts.
5. **Canvas เป็น client-only** (`dynamic(..., { ssr:false })`).

---

## File / Directory Map (ไฟล์อยู่ที่ไหน ทำอะไร)

### Core logic (pure, no React — `lib/`)
| ไฟล์ | หน้าที่ |
|---|---|
| `lib/tree.ts` | โครงสร้าง tree แบบ immutable: add/remove/rename/slug/reorder/color/collapse + `toOutline` + seed. **มี unit test** |
| `lib/tree.test.ts` | Vitest 18 เคส กันโครงสร้างพัง |
| `lib/layout.ts` | d3-hierarchy → RF nodes/edges (ใส่ขนาด node ตายตัวกัน RF ซ่อน) |
| `lib/colors.ts` | depth colors + swatches + edge colors |
| `lib/comments.ts` | types + `buildThreads` + validate body |
| `lib/export.ts` | PNG/JPG (html-to-image) / JSON / Markdown / `parseImportedDoc` |
| `lib/share.ts` | `validateShareToken` (exists/not-revoked/not-expired) via Drizzle |
| `lib/ratelimit.ts` | guest comment rate limit (graceful ถ้าไม่มี Upstash) |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) |

### Database (`lib/db/`)
| ไฟล์ | หน้าที่ |
|---|---|
| `lib/db/schema.ts` | **Drizzle schema** (canonical) — app tables + Auth.js adapter tables |
| `lib/db/schema.sql` | reference SQL (mirror ของ schema.ts) |
| `lib/db/index.ts` | Drizzle client (neon-http) — server-only |
| `drizzle.config.ts` | config ของ drizzle-kit (`db:push`/`db:generate`) |

### Auth
| ไฟล์ | หน้าที่ |
|---|---|
| `auth.config.ts` | edge-safe config: Google provider + `signIn` domain gate `@suffix.works` + callbacks |
| `auth.ts` | full config: `authConfig` + Drizzle adapter → export `handlers/auth/signIn/signOut` |
| `middleware.ts` | กัน `/` + `/editor/*` ด้วย Auth.js session (matcher) |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js endpoint |
| `types/next-auth.d.ts` | augment `session.user.id` |

### State
| `store/useSitemapStore.ts` | Zustand + zundo (temporal). doc + selectedId + editing + actions |

### App routes (`app/`)
| ไฟล์ | หน้าที่ |
|---|---|
| `app/page.tsx` | **Dashboard** (staff) — list sitemaps (team-shared) + creator name |
| `app/editor/[id]/page.tsx` | โหลด sitemap จาก Neon → render `EditorShell` |
| `app/login/page.tsx` | หน้า login (server action `signIn('google')`) |
| `app/s/[token]/page.tsx` | **Guest view** — validate token → read-only / comment |
| `app/api/share/[token]/route.ts` | GET sitemap doc (guest, token-validated) |
| `app/api/share/[token]/comments/route.ts` | GET/POST comments (guest, permission=comment, rate-limited) |
| `app/actions.ts` | **Server Actions:** sitemap CRUD + `saveSitemap` (autosave) + shares + comments + signOut |
| `app/layout.tsx` | root layout (fonts Inter/IBM Plex Mono + Toaster) |

### Components
| ไฟล์ | หน้าที่ |
|---|---|
| `components/editor/EditorShell.tsx` | top bar (undo/redo + Comments + Export + Share) + autosave + provider |
| `components/editor/SitemapEditor.tsx` | React Flow canvas (staff) + keyboard shortcuts |
| `components/editor/SitemapNode.tsx` | node card (depth bar, slug, hover toolbar, inline edit, color, collapse) |
| `components/editor/ShareDialog.tsx` | สร้าง/copy/revoke share links |
| `components/editor/ExportMenu.tsx` | dropdown PNG/JPG/JSON/Markdown + Import |
| `components/dashboard/Dashboard.tsx` | การ์ด sitemap + new/duplicate/rename/delete + sign out |
| `components/comments/CommentsPanel.tsx` | comment threads (staff+guest), reply, resolve, filter, target selector |
| `components/guest/GuestView.tsx` | guest shell (read-only + comment layer) |
| `components/guest/ReadOnlyCanvas.tsx` / `ReadOnlyNode.tsx` | canvas อ่านอย่างเดียว (decoupled จาก store) |
| `components/ui/*` | shadcn/ui primitives (base-ui) |

> Stub/ไม่ได้ใช้: `components/editor/Toolbar.tsx`, `components/comments/CommentPin.tsx`,
> `components/comments/CommentThread.tsx` (thread inline ใน CommentsPanel แล้ว).

---

## Data Model (ตาราง Neon)

**App tables** (`sitemaps`, `sitemap_shares`, `comments`) + **Auth.js** (`user`, `account`,
`session`, `verificationToken`). ไม่มี RLS.

- `sitemaps` — 1 row = 1 sitemap. `data jsonb` เก็บทั้ง tree (`{rootId, nodes}`). `owner_id` = Auth.js user id.
- `sitemap_shares` — `token` (unique), `permission` `view|comment`, `revoked`, `expires_at`.
- `comments` — `node_id` (null = ทั้ง sitemap), `parent_id` (reply), `is_staff`, `resolved`, `author_name/email`.

---

## Environment Variables

โค้ดใช้จริง 4 ตัว (server-only). ตั้งใน `.env.local` (local) + Vercel (prod). ดู `.env.example`.

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `DATABASE_URL` | Neon pooled connection (Drizzle) |
| `AUTH_SECRET` | Auth.js JWT signing (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | (optional) rate limit — ไม่มีก็ทำงานได้ |

> `NEXT_PUBLIC_SITE_URL` มีใน example แต่โค้ดปัจจุบัน **ไม่ได้ใช้** (Auth.js ใช้ `trustHost`,
> share link copy ใช้ `window.location.origin`).

---

## Commands

```bash
pnpm dev            # dev server (localhost:3000)
pnpm build          # production build
pnpm lint           # eslint
pnpm test           # vitest (lib/tree.ts)
pnpm db:push        # push Drizzle schema → Neon
pnpm db:generate    # generate SQL migration
pnpm db:studio      # browse DB
```
> เครื่องนี้ pnpm อยู่ที่ `~/.local/bin/pnpm` (ผ่าน corepack).

## Deploy

- **Vercel** git-connected กับ `jatesaitthiti/sitemapper` → push `main` = auto-deploy prod, PR = preview.
- env 4 ตัวตั้งใน Vercel (Production + Preview).
- Google OAuth redirect ต้องมี domain ทั้ง dev + prod: `<origin>/api/auth/callback/google`.

## Access Control สรุป

- **Staff:** login Google `@suffix.works` (กันโดเมนที่ `signIn` callback) → team-shared ทุก sitemap.
- **Guest:** เปิด `/s/[token]` — `view` = อ่านอย่างเดียว (ไม่ login), `comment` = คอมเมนต์ได้ (กรอกชื่อ+อีเมล).
- secret ทั้งหมดอยู่ฝั่ง server เท่านั้น; browser ไม่เคยเห็น DB/AUTH_SECRET.
