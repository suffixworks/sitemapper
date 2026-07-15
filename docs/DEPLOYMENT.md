# Sitemapper — Deployment / Infra (ของจริงที่ใช้อยู่)

บันทึกว่า production ตอนนี้ใช้ service/บัญชีอะไรบ้าง อยู่ตรงไหน.
(ดู `INFRA.md` สำหรับแผน/ตัวเลือกทั่วไป, `TECH-STACK.md` สำหรับ stack + โครงไฟล์.)

> 🔒 ไฟล์นี้ **ไม่มี secret** — ค่า connection string / keys อยู่ใน `.env.local` (local) และ
> Vercel Environment Variables (prod) เท่านั้น.

---

## Production
- **URL:** https://suffix-sitemapper.vercel.app
  (alias เดิม `sitemapper-kappa.vercel.app` → 307 redirect มาที่นี่)

## Git / GitHub  ⚠️ มี 2 repo (แยกกัน)
| repo | ใช้ทำอะไร |
|---|---|
| `github.com/suffixworks/sitemapper` | **source of truth** — local (`~/Documents/GitHub/sitemapper`) ตั้ง remote `origin` ชี้ที่นี่ |
| `github.com/jatesaitthiti/sitemapper` | **repo ที่ Vercel deploy** (Vercel clone ตอน import) — push ที่นี่ = auto-deploy |

> เหตุที่แยก: ตอน import Vercel login ด้วยบัญชี `jatesaitthiti` แต่ repo อยู่ใต้ `suffixworks` →
> Vercel เลย clone ไปสร้าง repo ใหม่ใต้ jatesaitthiti. **ถ้าจะรวมให้เหลือ repo เดียว** → ให้ Vercel
> ผูกกับ `suffixworks/sitemapper` ตรงๆ (ต้องเชื่อม Vercel team เข้ากับ GitHub suffixworks).

## Hosting — Vercel
- **Team:** `hi_suffix's projects` — **plan: Hobby (ฟรี)**
  ⚠️ commercial ควรอัป **Pro** (ตาม Vercel ToS + INFRA.md)
- **Project:** `sitemapper`
- **Deploy:** git-connected กับ `jatesaitthiti/sitemapper` → push `main` = production, PR = preview
- **Env Vars:** ตั้งใน Vercel (Production + Preview) — 4 ตัว: `DATABASE_URL`, `AUTH_SECRET`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`

## Database — Neon
- **Provider:** Neon (serverless Postgres), **region: Singapore (ap-southeast-1)**
- **Plan:** Free (scale-to-zero, ไม่ pause, ไม่ต้อง keep-alive)
- ต่อผ่าน `DATABASE_URL` (pooled) — เก็บใน `.env.local` + Vercel env
- schema push ด้วย `pnpm db:push` (Drizzle) — 7 ตาราง (app 3 + Auth.js 4)

## Auth — Google OAuth
- **Google Cloud project:** `sitemapper` (org `suffix.works`)
- **OAuth client:** Web application (`sitemapper-web`), **consent screen: Internal**
  (จำกัดเฉพาะ Workspace `suffix.works`)
- **Authorized redirect URIs:**
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://suffix-sitemapper.vercel.app/api/auth/callback/google` (prod)
- client id/secret เก็บใน env (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`)
- โดเมนถูกกันซ้ำใน `auth.config.ts` (`signIn` callback เช็ค `@suffix.works`)

## Secrets อยู่ที่ไหน
- **Local:** `~/Documents/GitHub/sitemapper/.env.local` (gitignored — ไม่ขึ้น repo)
- **Prod:** Vercel → Project `sitemapper` → Settings → Environment Variables
- **ไม่มี secret ใน git** (ตรวจแล้ว — files + history สะอาด)

---

## ยังไม่ได้ตั้ง (deferred — ตาม INFRA.md)
- **Upstash Redis** — rate limit guest comments (`UPSTASH_REDIS_REST_URL/TOKEN`); ตอนนี้ code
  ทำงานแบบ graceful (ไม่มีก็ปล่อยผ่าน)
- **Backup** — GitHub Actions daily export `sitemaps` → off-site + Healthchecks dead-man's-switch
- **Custom domain** — เช่น `sitemap.suffix.works` (Vercel → Domains)
- **Vercel Pro** — สำหรับ commercial

## Runbook สั้นๆ
- **แก้โค้ด → deploy:** push ไป `jatesaitthiti/sitemapper` main (auto-deploy) · หรือ `npx vercel --prod`
- **แก้ schema DB:** แก้ `lib/db/schema.ts` → `pnpm db:push`
- **เปลี่ยน domain:** Vercel → Domains → เพิ่ม + set Production → อัป Google redirect URI ให้ตรง
- **rotate secret:** เปลี่ยนที่ provider → อัป `.env.local` + Vercel env (อย่าเปลี่ยน `AUTH_SECRET`
  ถ้าไม่จำเป็น — session หลุด)
