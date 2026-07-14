# Sitemapper — Infrastructure & Ops (Vercel + Neon)

Stack: **Vercel** (Next.js) + **Neon** (Postgres) + **Auth.js** + Upstash + Healthchecks.
ต้นทุนหลัก ≈ Vercel Pro ~$20/เดือน (tool บริษัท = commercial → ต้อง Pro). ที่เหลือ free tier.
🖐 = ตั้งค่าเองใน console · 🧑‍💻 = Claude Code ทำ

## ภาพรวม
```
Browser / Mobile
   │  staff → เรียก Server Actions/Routes (Auth.js session)
   │  guest → เรียก /api/share/* (share token)
   ▼            *** browser ไม่เคยต่อ DB ตรง ***
Vercel (Next.js 15)  ── functions region: Singapore (sin1)
   • staff app + editor + guest routes → Drizzle → Neon
   • Auth.js (Google, กันโดเมน @suffix.works ใน signIn callback)
   • Upstash rate limit บน endpoint คอมเมนต์ guest
   • GitHub Actions: daily backup (off-site) + Healthchecks dead-man's-switch
   ▼
Neon Free (Postgres)  ── region: Singapore
   • sitemaps / sitemap_shares / comments  (+ Auth.js: users/accounts/sessions)
```

## Components & tiers
- **Vercel Pro (~$20/seat)** — hosting + serverless + preview deploy ต่อ PR
- **Neon Free** — commercial ได้, ไม่ต้องใช้บัตร, ไม่หมดอายุ; 0.5 GB/project, scale-to-zero
  (ตื่น ~500ms — **ไม่ pause แบบ Supabase เลยไม่ต้องมี keep-alive cron**)
- **Auth.js (NextAuth v5)** — ฟรี, รันในแอป, Google sign-in + กันโดเมนใน callback
- **Upstash Free** — rate limit กัน spam คอมเมนต์
- **Healthchecks.io Free** — dead-man's-switch เฝ้า backup (แบบเดียวกับ egp-tor-finder)
- **Google OAuth** — ฟรี; user type **Internal** ถ้า suffix.works เป็น Workspace = กันโดเมนอีกด่าน

## Next.js version
**Next.js 15** (App Router, React 19) — รองรับเต็มบน Vercel.

## Deploy
🧑‍💻 เชื่อม repo กับ Vercel → push `main` = production, PR = preview. ไม่ต้องมี adapter พิเศษ.
route ที่แตะ DB ตั้ง:
```ts
export const runtime = 'nodejs';
export const preferredRegion = 'sin1'; // Singapore
```

## Env & secrets (ตั้งใน Vercel: Production / Preview)
| ตัวแปร | scope | หมายเหตุ |
|---|---|---|
| `DATABASE_URL` | **server only** | Neon pooled connection string |
| `AUTH_SECRET` | **server only** | Auth.js (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | server only | Google OAuth client id |
| `AUTH_GOOGLE_SECRET` | server only | Google OAuth client secret |
| `NEXT_PUBLIC_SITE_URL` | client+server | base ของ share link + auth callback |
| `UPSTASH_REDIS_REST_URL` | server only | rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | server only | rate limit |

local ใส่ทั้งหมดใน `.env.local` (อย่า commit).

## Backup + monitoring
- 🧑‍💻 **Backup** — GitHub Actions scheduled รายวัน export ตาราง `sitemaps` เป็น JSON เก็บ off-site
  (artifact/commit). Neon Free มี PITR แค่ 6 ชม. เลยควรมี backup ของเราเอง
- 🧑‍💻 **Dead-man's-switch (เหมือน egp-tor-finder)** — backup job ping **Healthchecks.io**
  ตอนสำเร็จ + `/fail` เมื่อ error, เตือนเข้า **hi@suffix.works**. Period ~26 ชม. / Grace ~6-12 ชม.
  ⭐ backup เงียบไปต้องรู้ทันที ไม่ใช่มารู้ตอนต้องกู้ข้อมูล
- keep-alive **ไม่ต้องทำ** — Neon ตื่นเองเมื่อมี query

## Guest endpoint hardening (พื้นผิวเสี่ยงสุด)
`POST /api/share/[token]/comments` เปิด public:
- 🧑‍💻 **Rate limit** `@upstash/ratelimit` key = `ip + token` (เช่น 5/นาที, 30/ชม.)
- 🧑‍💻 Validate: `body` 1–4000 ตัว, ต้องมี `author_name`/`author_email`, permission ต้อง `comment`
- 🧑‍💻 ตรวจ token: มีจริง / ไม่ revoked / ไม่เกิน expires_at
- 🔜 (v2) captcha (Turnstile) ถ้าเจอ spam

## Setup checklist (ตามลำดับ)
1. 🖐 Neon project (region Singapore, Free) → เก็บ **DATABASE_URL** (pooled)
2. 🧑‍💻 ตั้ง Drizzle + schema (mirror `schema.sql`) → `drizzle-kit push`; ติดตั้ง Auth.js Drizzle adapter
3. 🖐 Google Cloud OAuth (user type Internal) → redirect = `https://<domain>/api/auth/callback/google`
   (+ `http://localhost:3000/api/auth/callback/google` สำหรับ dev) → เก็บ client id/secret
4. 🖐 Upstash Redis DB → เก็บ REST URL/TOKEN
5. 🖐 Vercel: import repo (Pro), ใส่ env vars ทั้งหมด (Production + Preview)
6. 🖐 Vercel → Domains: เพิ่ม `sitemap.suffix.works` → อัปเดต `NEXT_PUBLIC_SITE_URL` + Google redirect
7. 🖐 Healthchecks.io: สร้าง 1 check (backup) → เตือนเข้า hi@suffix.works
8. 🧑‍💻 GitHub Actions backup workflow + ping Healthchecks + deploy + ทดสอบ login/แชร์/คอมเมนต์บนมือถือ

## จุดที่ต้องจับตา
- Vercel Pro ~$20/seat (commercial). ราคาเปลี่ยนบ่อย เช็ค pricing ล่าสุด
- Neon Free: 0.5 GB + 100 CU-hours/เดือน (เกินแล้ว suspend ถึงรอบถัดไป) — งานนี้ใช้น้อยมาก เหลือเฟือ
- Vercel Hobby (ฟรี) ใช้ไม่ได้ — commercial ต้อง Pro

## Upgrade path
- **Neon Launch** (usage-based, ไม่มี minimum) — ถ้าอยากปิด scale-to-zero ให้ always-on
- เพิ่ม seat Vercel เมื่อมีคน deploy หลายคน

## v2 infra backlog
staging แยก, Sentry, Turnstile, email แจ้งเตือนผ่าน Resend (SUFFIX ใช้อยู่) เวลามีคอมเมนต์ใหม่.
