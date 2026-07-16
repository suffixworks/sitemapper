# Sitemapper — Accounts, Tech Stack & Infra (สรุปของจริงที่ใช้อยู่)

> เอกสารนี้คือ "สถานะจริงที่รันอยู่ตอนนี้" (ไม่ใช่แผน) สำหรับก็อปไปเก็บใน Notion กันลืม
> อัปเดตล่าสุด: 2026-07-16 · ⚠️ **ห้ามใส่ค่า secret จริงลงในเอกสารนี้** — ค่าจริงอยู่ใน `.env.local` และ Vercel env เท่านั้น

---

## 1) Accounts (ใครเป็นเจ้าของอะไร)

| บริการ | Account / ชื่อโปรเจกต์ | Plan | หมายเหตุ |
|---|---|---|---|
| **GitHub (source)** | `suffixworks/sitemapper` | — | repo หลักขององค์กร (remote ชื่อ `origin`) |
| **GitHub (deploy)** | `jatesaitthiti/sitemapper` | — | repo ที่ต่อกับ Vercel (remote ชื่อ `vercel`) |
| **Vercel** | account `jatesaitthiti` · team **hi_suffix** | Hobby (ฟรี) | ดึงโค้ดจาก `jatesaitthiti/sitemapper` |
| **Neon (Postgres)** | project region **Singapore (ap-southeast-1)** | Free | DB = `neondb`, user = `neondb_owner` |
| **Google Cloud OAuth** | project `sitemapper` · consent **Internal** | ฟรี | จำกัดล็อกอินเฉพาะ `@suffix.works` |

**Production URL:** https://suffix-sitemapper.vercel.app

---

## 2) เรื่อง Git account ที่ต้องเข้าใจ (จุดที่เคยงงมาแล้ว)

- เขียนโค้ด/commit บนเครื่อง = git user `suffixworks` (`hi@suffix.works`)
- แต่ **commit ที่จะ deploy ต้อง author เป็น `jatesaitthiti`** — เพราะ Vercel เป็นบัญชี `jatesaitthiti` และ **Hobby plan ไม่รับ commit จาก collaborator คนอื่นบน private repo** (จะขึ้น "Blocked")
- วิธี commit ให้ผ่าน:
  ```bash
  git commit --author="jatesaitthiti <29061505+jatesaitthiti@users.noreply.github.com>" -m "..."
  ```
- push ทั้งสองที่ให้ SHA ตรงกันเสมอ:
  ```bash
  git push vercel main   # → เจ้าที่ trigger deploy
  git push origin main   # → repo องค์กร (backup/source)
  ```
- 🔜 **แผนอนาคต:** รวม repo กลับมาที่ `suffixworks` ที่เดียว แล้วอัปเกรด Vercel เป็น Pro (commercial ควรใช้ Pro อยู่แล้ว) จะได้เลิกกฎ author งง ๆ นี้

---

## 3) Tech Stack

**Framework / ภาษา**
- Next.js **15** (App Router) · React **19** · TypeScript (strict)
- Tailwind CSS **v4** + shadcn/ui (base-ui) · lucide-react · sonner (toast)

**Canvas / state**
- React Flow (`@xyflow/react` v12) — การ์ด custom, เส้น smoothstep
- d3-hierarchy — จัด layout ต้นไม้ (tidy tree)
- Zustand 5 + zundo — state + undo/redo
- html-to-image — export PNG/JPG

**Data / Auth**
- Neon serverless Postgres (`@neondatabase/serverless`)
- Drizzle ORM + drizzle-kit (`db:push` / `db:studio`)
- Auth.js / NextAuth **v5** (`next-auth@beta`) + `@auth/drizzle-adapter`
  - Google sign-in, จำกัดโดเมน `@suffix.works` ใน `signIn` callback (+ `hd` hint)
  - session = JWT (ให้ middleware ที่ edge อ่านได้)
- `@upstash/ratelimit` — กัน spam คอมเมนต์ guest (ทำงานแบบ graceful ถ้ายังไม่ตั้ง env)

**หลักการสำคัญ**
- DB เข้าถึงจาก **server เท่านั้น** (Server Actions / route handlers) — browser ไม่ต่อ DB ตรง, ไม่มี RLS
- `middleware.ts` กันหน้า editor ต้อง login; หน้า guest `/s/[token]` เปิด public ผ่าน share token

**Tooling**
- pnpm 11 (ผ่าน corepack) · Vitest (unit test `lib/tree.ts`) · ESLint (flat config)

---

## 4) Environment variables (ชื่อตัวแปร — ค่าอยู่ที่อื่น)

ตั้งใน **Vercel → Settings → Environment Variables** (Production + Preview) และใน `.env.local` สำหรับ dev

| ตัวแปร | ที่ใช้ |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Auth.js (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client id |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_SITE_URL` | base ของ share link + auth callback |
| `UPSTASH_REDIS_REST_URL` | (option) rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | (option) rate limit |

> 🔒 ค่าจริงทั้งหมดเป็นความลับ — ไม่ commit, ไม่วางใน Notion. ให้เก็บใน password manager / Vercel เท่านั้น

**Google OAuth redirect URIs ที่ตั้งไว้:**
- `https://suffix-sitemapper.vercel.app/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google` (dev)

---

## 5) Deploy flow (สรุปสั้น)

```
แก้โค้ด → pnpm lint && pnpm build (ต้องผ่าน) → commit (author=jatesaitthiti)
       → git push vercel main  → Vercel auto-build → live ที่ suffix-sitemapper.vercel.app
       → git push origin main   → sync repo องค์กร
```

---

## 6) ยังไม่ได้ทำ / backlog (P1)
- Custom domain `sitemap.suffix.works` (ตอนนี้ใช้ URL `*.vercel.app`)
- Upstash Redis (rate limit) — env ยังไม่ตั้ง
- Backup รายวัน (GitHub Actions export `sitemaps` → off-site) + Healthchecks.io dead-man's-switch
- อัปเกรด Vercel Pro + รวม repo ที่ `suffixworks`
