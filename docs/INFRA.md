# Sitemapper — Infrastructure & Ops (FREE / $0 route)

Route ที่เลือก: **$0 ทั้งหมด** — Cloudflare Workers + Supabase Free + Upstash Free.
Cloudflare ไม่มีข้อห้าม commercial แบบ Vercel และ Supabase Free ก็อนุญาต commercial.
🖐 = ตั้งค่าเองใน console · 🧑‍💻 = Claude Code ทำ

## ภาพรวม
```
Browser / Mobile
   │  staff → Supabase client + JWT (RLS)
   │  guest → เรียก /api/share/* เท่านั้น
   ▼
Cloudflare Workers (Next.js 15 ผ่าน OpenNext adapter)  ── edge (ใกล้ไทย = สิงคโปร์)
   • staff app + editor + guest server routes (ใช้ SERVICE_ROLE_KEY)
   • Upstash rate limit บน endpoint คอมเมนต์ guest
   • Cron Triggers: keep-alive ping + daily backup → R2
   ▼
Supabase Free  ── region: Southeast Asia (Singapore)
   • Postgres (sitemaps/shares/comments) + RLS + Auth + Before-User-Created hook
```
ไม่ใช้ Supabase Storage (PNG export ทำฝั่ง client).

## ⚠️ สำคัญ: ใช้ Next.js 15 (ไม่ใช่ 14)
OpenNext Cloudflare จะเลิกซัพพอร์ต Next.js 14 ใน Q1 2026 และ Next.js team ก็เลิกแล้ว
→ scaffold ด้วย **Next.js 15** (App Router, React 19). shadcn/ui + React Flow รองรับอยู่แล้ว.

## Components & free limits ที่ต้องรู้
- **Cloudflare Workers Free** — 100,000 requests/วัน (พอเหลือสำหรับ tool ภายใน),
  Worker ขนาด ≤ 3 MiB (compressed) — แอปนี้เล็กพอ แต่ให้จับตา bundle
- **Supabase Free** — 500MB DB, 50k MAU, 2 projects, **ไม่มี backup**, **pause หลังไม่มี activity 7 วัน**
- **Upstash Free** — REST-based rate limit, ทำงานบน edge ได้ (เหมาะกับ Workers)
- **Cloudflare R2 Free** — เก็บ backup (มี free tier)
- **Healthchecks.io Free** — dead-man's-switch เฝ้า cron (แบบเดียวกับ egp-tor-finder)
- **Google OAuth** — ฟรี; ตั้ง user type **Internal** ถ้า suffix.works เป็น Workspace = กันโดเมนอีกด่าน

## Deploy: OpenNext + Wrangler
🧑‍💻 ติดตั้ง: `pnpm add @opennextjs/cloudflare` + `pnpm add -D wrangler`
ใช้ **Node.js runtime** (default ของ route handlers — อย่า set edge) พร้อม `nodejs_compat`.

`wrangler.toml`
```toml
name = "sitemapper"
main = ".open-next/worker.js"
compatibility_date = "2024-09-23"   # หรือใหม่กว่า
compatibility_flags = ["nodejs_compat"]
[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```
`open-next.config.ts`
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```
คำสั่ง: `pnpm dev` (dev ปกติ) · `npx opennextjs-cloudflare preview` (ลองบน Workers runtime) ·
`npx opennextjs-cloudflare build && npx wrangler deploy` (deploy).
CI/CD: 🧑‍💻 GitHub Actions รัน build+deploy ตอน push main; PR = preview deployment.

## Env & secrets (โมเดล Cloudflare)
- **Public** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`)
  → baked ตอน build (ใส่ใน build env ของ GitHub Actions / `.dev.vars` ตอน local)
- **Server secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
  → 🖐 `wrangler secret put ...` หรือใส่ใน Cloudflare dashboard (ห้ามขึ้นต้น NEXT_PUBLIC เด็ดขาด)
- Local dev ใส่ทั้งหมดใน `.dev.vars` (อย่า commit)
- Google client id/secret → ใส่ใน **Supabase dashboard** (ไม่ใช่ env แอป)

## แก้ caveat ของ Supabase Free (ฟรี ทำในสแตกเดียว)
- 🧑‍💻 **กัน pause** — Cloudflare **Cron Trigger** รายวัน ยิง query เบาๆ ไปที่ Supabase REST
  (เช่น select 1 แถว) เพื่อ reset timer 7 วัน
- 🧑‍💻 **Backup** — Cron Trigger รายวัน export ตาราง `sitemaps` เป็น JSON → เก็บใน **R2**
  (หรือ GitHub Actions ก็ได้). sitemap เป็น JSONB export ง่าย
- 🧑‍💻 **Dead-man's-switch (แนะนำ — แบบเดียวกับ egp-tor-finder)** — cron ทั้ง 2 ตัว ping
  **Healthchecks.io** (ฟรี) ทุกครั้งที่สำเร็จ + ยิง `/fail` เมื่อ error. แยกเป็น **2 check**
  (keep-alive, backup) จะได้รู้ว่าตัวไหนตาย. เตือนเข้า **hi@suffix.works**.
  Period ~26 ชม. / Grace ~6-12 ชม. (cron รายวัน). เก็บ ping URL เป็น Worker secret.
  ⭐ สำคัญกว่าใน e-GP เพราะที่นี่ cron ปกป้อง **ข้อมูล+backup** — backup เงียบไปต้องรู้ทันที
  ไม่ใช่มารู้ตอนต้องกู้ข้อมูล
- (ถ้าอยากได้ backup อัตโนมัติ + ไม่มี pause แบบสบายใจ → อัป Supabase Pro ทีหลัง)

## Guest endpoint hardening (พื้นผิวเสี่ยงสุด)
`POST /api/share/[token]/comments` เปิด public:
- 🧑‍💻 **Rate limit** `@upstash/ratelimit` key = `ip + token` (เช่น 5/นาที, 30/ชม.) — รันบน Workers edge ได้เลย
- 🧑‍💻 Validate: `body` 1–4000 ตัว, ต้องมี `author_name`/`author_email`, permission ต้อง `comment`
- 🧑‍💻 ตรวจ token: มีจริง / ไม่ revoked / ไม่เกิน expires_at
- 🔜 (v2) เพิ่ม Cloudflare Turnstile ถ้าเจอ spam

## Setup checklist (ตามลำดับ)
1. 🖐 Supabase project (region Singapore, Free)
2. 🧑‍💻 `supabase init` + `supabase link` + วาง `0001_schema_and_access.sql` ใน `supabase/migrations/`
3. 🖐 รัน migration (`supabase db push` หรือ paste ใน SQL Editor)
4. 🖐 Google Cloud OAuth (user type Internal), redirect = `https://<ref>.supabase.co/auth/v1/callback`
5. 🖐 Supabase → Auth → Providers → Google: เปิด + ใส่ client id/secret
6. 🖐 Supabase → Auth → Hooks → Before User Created → Postgres → `restrict_signup_to_suffix`
7. 🖐 Supabase → Auth → URL config: Site URL + redirect ของ preview (`*.pages.dev` / โดเมนจริง)
8. 🖐 Upstash Redis DB → เก็บ REST URL/TOKEN
9. 🖐 Cloudflare: สร้าง Worker/Pages project เชื่อม repo, ใส่ secrets
10. 🖐 ผูก custom domain (เช่น `sitemap.suffix.works`) → อัปเดต SITE_URL / Supabase Site URL / Google redirect
11. 🖐 Healthchecks.io: สร้าง 2 check (keep-alive, backup) → เก็บ ping URL เป็น Worker secret, เตือนเข้า hi@suffix.works
12. 🧑‍💻 ตั้ง Cron Triggers (keep-alive + backup) พร้อม ping Healthchecks (สำเร็จ + `/fail`) + deploy + ทดสอบ login/แชร์/คอมเมนต์บนมือถือ

## จุดที่ต้องจับตา (free tier)
- Worker 3 MiB: ถ้า bundle โต (React Flow + d3) ใกล้ลิมิต ให้ code-split / dynamic import
- 100k req/วัน: tool ภายในไม่น่าถึง แต่ถ้าลูกค้าเปิดลิงก์เยอะๆ ให้เฝ้าดู
- Supabase pause/backup: จัดการด้วย Cron แล้ว แต่ยังไม่เท่า Pro

## Upgrade path (เมื่อโตขึ้น)
- **Supabase Pro ($25/เดือน)** — เมื่อต้องการ backup อัตโนมัติ + ไม่มี pause จริงจัง (แนะนำอัปตัวแรก)
- **Vercel Pro ($20/seat)** — ถ้าอยากได้ DX/preview ที่ลื่นกว่าและเลิกดูแล OpenNext config
- ราคาเปลี่ยนบ่อย เช็ค pricing ล่าสุดก่อนตัดสินใจ

## v2 infra backlog
staging แยก (Cloudflare Access gate ฟรีได้), Sentry, Turnstile, Supabase Realtime,
email แจ้งเตือนผ่าน Resend (SUFFIX ใช้อยู่) เวลามีคอมเมนต์ใหม่.
