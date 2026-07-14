# Sitemapper — Build Brief (สำหรับ Claude Code)

เครื่องมือออกแบบ sitemap แบบ Octopus.do สำหรับ SUFFIX. Staff สร้าง/แก้โครงสร้างเว็บ,
ลูกค้ารีวิวด้วยการ comment ผ่านลิงก์แชร์.

อ่าน `CLAUDE.md` (conventions + architecture) และ `schema.sql` (schema)
ประกอบบรีฟนี้. ทำ **ทีละเฟส** — จบเฟส ให้ `pnpm lint && pnpm build` ผ่าน แล้ว commit ก่อนไปต่อ.

---

## Roles (ล็อกแล้ว)
- **Staff** = login ด้วย Google `@suffix.works` → สร้าง/แก้ได้ทุก sitemap (team-shared),
  สร้างลิงก์แชร์ได้, resolve comment ได้
- **Client (guest)** = ไม่มีบัญชี, เปิดลิงก์ `/s/[token]` → ดูอย่างเดียว + comment ได้
  (กรอกชื่อ+อีเมลก่อนคอมเมนต์), แก้โครงสร้างไม่ได้

## Scope v1 (ล็อกแล้ว)
- โครงสร้าง+canvas ครบ (ตาม prototype): เพิ่มหน้าลูก/พี่น้อง, ลบทั้งกิ่ง, แก้ชื่อ+slug,
  สลับลำดับ, ยุบ/ขยาย, เปลี่ยนสี, auto-layout, pan/zoom/fit, shortcuts, undo/redo
- หลาย sitemap + dashboard (list/new/duplicate/rename/delete) + autosave (Neon)
- Staff auth (Google @suffix.works, domain gate) + team-shared (server-layer)
- **Share links** (staff สร้าง, revoke ได้): `view` = **ลิงก์ public อ่านอย่างเดียว
  เปิดดูได้ไม่ต้อง login** · `comment` = เปิดให้ลูกค้าคอมเมนต์
- **Comments**: ปักได้ทั้ง **รายกล่อง (node)** และ **ทั้ง sitemap**, มี **reply + resolve**
- Export PNG / JSON / Markdown, Import JSON
- **Responsive — ใช้งานบนมือถือได้** (ดูรายละเอียดหัวข้อถัดไป)

## Out of scope → v2
node kinds (Page/Section/External), notes ต่อหน้า, meta description (เชื่อม SEO),
comment แบบ realtime, การแจ้งเตือนอีเมล

---

## Access-control design (สำคัญ — อย่าทำพลาด)
ทุก DB access วิ่งผ่าน **server ของ Next.js เท่านั้น** (browser ไม่ต่อ Neon ตรง) — ไม่มี RLS,
บังคับสิทธิ์ที่ server layer:
1. **Auth.js signIn callback** — เช็ค `email.endsWith('@suffix.works')`; ถ้าไม่ใช่ block ตั้งแต่ login
   → นี่คือด่านกันโดเมนตัวจริง (แทน Supabase hook เดิม)
2. **Staff** — request ที่มี Auth.js session ที่ถูกต้อง = staff (โดเมนถูกกันตั้งแต่ login แล้ว)
   → team-shared: เข้าถึง/แก้ทุก sitemap ได้
3. **Google `hd=suffix.works` + OAuth "Internal"** — hint/ด่านเสริมระดับ Google
4. **Guest path** — ไม่มี session; ทุก action (โหลด sitemap, อ่าน/เขียน comment) วิ่งผ่าน
   **Route Handler** ที่ตรวจ share token (มีจริง/ไม่ revoke/ไม่หมดอายุ/permission) แล้ว query
   Neon ผ่าน Drizzle แทน guest. guest ไม่มีทางแตะ DB ตรง

---

## Responsive / mobile (cross-cutting — ทำทุกเฟส ไม่ใช่เฟสเดียว)
เป้า: **guest view + comments เป็น mobile-first** (ลูกค้าเปิดลิงก์รีวิวบนมือถือเป็นหลัก);
staff editor ใช้บนมือถือได้ (touch pan/zoom, แตะเพื่อ action) แต่ optimize สำหรับ desktop.
- React Flow: เปิด touch (pinch-zoom, drag-pan), ตั้ง tap target ของปุ่มบนกล่อง ≥ 40px,
  ปิด scroll ของ page ทับ canvas
- Guest `/s/[token]`: layout mobile-first, ปุ่ม comment เข้าถึงง่ายด้วยนิ้ว
- CommentsPanel / thread: บน desktop เป็น side panel, บนมือถือเป็น **bottom sheet**
- Dashboard: การ์ด sitemap เป็น grid ที่ยุบเป็น 1 คอลัมน์บนจอเล็ก
- Top toolbar: ยุบปุ่มรองเข้า overflow menu บนจอแคบ
- ทดสอบที่ ~375px (มือถือ), 768px (แท็บเล็ต), desktop
**DoD ของ mobile (ตรวจทุกเฟสที่มี UI):** ใช้งานลื่นที่ 375px ไม่มี layout ล้น/ทับกัน

---

## Phases + kickoff prompts

### Phase 0 — Scaffold
Next.js 15 + TS + Tailwind, init shadcn/ui, ติดตั้ง deps ทั้งหมด, วาง CLAUDE.md,
สร้างโครงโฟลเดอร์ตาม CLAUDE.md, `.env.local.example`, `vercel.json` (ไว้ใส่ cron ภายหลัง).
**DoD:** `pnpm dev` ขึ้นหน้าเปล่า, `pnpm build` ผ่าน, deploy preview บน Vercel ได้.
> "Scaffold the project per CLAUDE.md. Install all deps, init shadcn/ui, create the
> directory structure with stub files. No features yet. Make `pnpm build` pass."

### Phase 1 — Core canvas (local, ยังไม่ต่อ DB) ← หัวใจ
`lib/tree.ts` (pure fns), `store/useSitemapStore.ts` (zustand), `lib/layout.ts`
(d3-hierarchy → RF nodes/edges), `SitemapNode` การ์ด custom (title, slug mono, แถบสี
ตาม depth, Handle บน/ล่าง), `SitemapEditor` (`<ReactFlow>` nodes non-draggable, edges =
**`smoothstep`** (geometric มุมฉากขอบมน, `pathOptions.borderRadius` ~12),
Background+Controls+fitView), ปุ่มเพิ่มหน้าลูก/พี่น้อง/ลบ, แก้ชื่อ inline, seed demo.
**DoD:** เพิ่ม/ลบ/แก้ชื่อได้, layout จัดเองสวย, pan/zoom/fit ทำงาน.
> "Implement Phase 1 per CLAUDE.md. Tree is source of truth in zustand; RF nodes/edges
> projected via lib/layout.ts (d3-hierarchy); nodes non-draggable. Add child/sibling,
> delete subtree, inline rename, depth-colored node card. Seed a demo sitemap. Stop for review."

### Phase 2 — UX polish
Shortcuts (`Tab`/`Enter`/`F2`/`Del`/`Esc`), collapse/expand + hidden-count badge,
per-node color, sibling reorder (◀▶), undo/redo (zundo), sonner toasts, แก้ slug inline.
**DoD:** ทุก shortcut + undo/redo ครบทุก mutation.
> "Add Phase 2: keyboard shortcuts, collapse/expand with count badge, per-node color,
> sibling reorder, undo/redo via zundo, toasts. Every structural mutation must be undoable."

### Phase 3 — Neon persistence + staff auth (Auth.js)
ตั้ง Drizzle + schema (mirror `schema.sql`) บน Neon; Auth.js (NextAuth v5) Google sign-in
พร้อม `signIn` callback กันโดเมน `@suffix.works` (+ `hd` hint); Auth.js Drizzle adapter
(users/accounts/sessions); middleware กันหน้าที่ต้อง login; โหลด doc เข้า store ผ่าน Server
Component; autosave debounce 800ms ด้วย Server Action; dashboard list/new/duplicate/rename/delete.
**DoD:** login @suffix.works ได้, คนนอกโดเมน login ไม่ผ่าน, สร้าง sitemap, refresh แล้วข้อมูลอยู่.
> "Add Neon+Drizzle persistence and staff auth with Auth.js (NextAuth v5) Google sign-in
> restricted to @suffix.works in the signIn callback (+ hd hint). Use the Drizzle adapter for
> Auth.js tables. All DB access is server-side (Server Actions/Route Handlers) — no client DB
> access, no RLS. One JSONB row per sitemap, autosave debounced 800ms via a Server Action, plus
> a dashboard to list/create/duplicate/rename/delete."

### Phase 4 — Share links
ในeditor: ปุ่ม "Share" → สร้างแถว `sitemap_shares` (permission view/comment) → copy ลิงก์;
รายการลิงก์ + revoke. หน้า guest `app/s/[token]/page.tsx` + route `GET /api/share/[token]`
(validate token ฝั่ง server แล้ว query Neon ผ่าน Drizzle) → render sitemap **read-only** (ใช้ SitemapEditor โหมด
ล็อก: ไม่มีปุ่มแก้). `view` = ลิงก์ public อ่านอย่างเดียว, `comment` = เปิดให้คอมเมนต์ (Phase 5).
หน้า guest ต้อง **mobile-first** (ลูกค้าเปิดบนมือถือ).
**DoD:** เปิดลิงก์ view ใน incognito/มือถือเห็น sitemap read-only ได้, revoke แล้วเข้าไม่ได้.
> "Add share links: staff generate a tokened link (view|comment) with revoke. `view` is a
> public read-only link (no login). Build the guest route /s/[token] backed by
> GET /api/share/[token] that validates the token server-side and queries Neon via Drizzle,
> rendering the sitemap read-only, mobile-first. The browser never queries the DB directly."

### Phase 5 — Comments (node + sitemap, reply + resolve)
`comments` table พร้อมแล้ว. `CommentsPanel` (list, filter open/resolved), `CommentThread`
(reply), `CommentPin` (badge จำนวนคอมเมนต์บน node, คลิกเปิด thread). Sitemap-level = node_id null.
- Staff: อ่าน/ตอบ/resolve ผ่าน Server Actions + Drizzle (`author_id`, `is_staff=true`).
- Guest: `GET/POST /api/share/[token]/comments` ผ่าน server route (permission ต้อง 'comment'),
  บันทึก `author_name`+`author_email`, `is_staff=false`. ตรวจ body ไม่ว่าง + throttle เบื้องต้น.
- prefill ชื่อ/อีเมล guest ด้วย localStorage.
- **Mobile:** CommentsPanel เป็น bottom sheet บนมือถือ, thread/ปุ่ม reply แตะง่าย.
**DoD:** guest คอมเมนต์บนกล่องและทั้ง sitemap ได้ (รวมบนมือถือ), staff เห็น+ตอบ+resolve ได้,
resolve เป็น staff-only.
> "Add comments on nodes and on the whole sitemap, with replies and resolve. Staff use
> Server Actions + Drizzle; guests post via POST /api/share/[token]/comments (server route,
> permission must be 'comment', capture name+email, is_staff=false, basic throttle). Show
> comment pins on nodes and a side panel with open/resolved filter. Resolve is staff-only."

### Phase 6 — Export & extras
PNG + **JPG สำหรับ presentation** (คุณภาพสูง: scale 2–2.5x, พื้นหลังขาวทึบ) ด้วย
`html-to-image` (`toPng`/`toJpeg`) บน RF viewport คำนวณ bounds เต็มผัง, JSON export/import,
Markdown outline (`- Title \`/slug\`` ตาม indent).
**DoD:** ได้ PNG/JPG/JSON/Markdown + import JSON กลับมาถูก. JPG เปิดในสไลด์แล้วคมชัด.
> "Add PNG and presentation-quality JPG export (2–2.5x scale, solid white background) via
> html-to-image on the full-graph bounds, plus JSON export/import and a Markdown outline."

---

## Kickoff (ข้อความแรกใน Claude Code)
```
Read CLAUDE.md, BRIEF.md, and schema.sql. We build "Sitemapper" in the
phases defined in BRIEF.md. Start with Phase 0 (scaffold only). Confirm the directory
structure with me, implement Phase 0, make `pnpm build` pass, then stop for review.
After each phase: run lint + build and stop.
```

## เกร็ดคุมงาน
- ให้ agent **หยุดรีวิวหลังจบทุกเฟส** — เห็น regression เร็ว
- ถ้ามี prototype HTML เดิม แนบเป็น reference: "match the visual style of this file"
- อัปเดต CLAUDE.md เมื่อ decision เปลี่ยน (agent อ่านทุกครั้ง)
- เปิด TS strict; `lib/tree.ts` มี unit test กันโครงสร้างพัง
- ย้ำเรื่อง security: guest ผ่าน server route เท่านั้น, DATABASE_URL/AUTH_SECRET อยู่ฝั่ง server เท่านั้น
