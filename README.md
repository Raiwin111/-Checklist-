# Personal Task & Research System

ระบบจัดการ Task ส่วนตัวสำหรับงานเรียน โปรเจกต์ และงานวิจัย รองรับเว็บ, PWA, หลายภาษา และการใช้งานออฟไลน์ (อ่านจากแคชใน MVP)

## Stack

- **Frontend:** React 19 + TypeScript + Vite 6
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Local cache (Phase 6):** Dexie.js / IndexedDB
- **PWA:** vite-plugin-pwa
- **Deploy:** Vercel

## โครงสร้างโปรเจกต์

```
.
├── src/
│   ├── components/          # Layout, route guards
│   ├── features/auth/       # Auth context, pages, account vault
│   ├── lib/                 # Supabase client
│   ├── pages/               # Dashboard, Add Task, Tasks, Settings
│   ├── types/               # Database types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── migrations/          # SQL migration (review before running)
│   └── README.md
├── docs/
│   └── architecture.md      # Approved architecture decisions
├── public/
└── .env.example
```

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment

```bash
cp .env.example .env.local
```

แก้ไข `.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

> ตัวแปร `VITE_*` ถูกฝังไปใน Browser — ใส่ได้เฉพาะค่า public เท่านั้น
> **ห้ามใส่ SerpAPI key หรือ service_role key ที่นี่**

### 3. ตั้งค่า Supabase

1. เปิด **Authentication → Providers → Email** และเปิด Email Confirmation
2. ตั้ง **Site URL** เป็น `http://localhost:5173` (ตอนพัฒนา) และโดเมน Vercel (ตอน production)
3. เพิ่ม Redirect URL: `http://localhost:5173/login`, `http://localhost:5173/reset-password`
4. รัน Migration ใน `supabase/migrations/20261105000100_init.sql` ผ่าน SQL Editor
   — **อ่านและตรวจสอบก่อนรัน**

### 4. รันโปรเจกต์

```bash
npm run dev
```

## Scripts

| Command | คำอธิบาย |
|---|---|
| `npm run dev` | เปิด dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | เปิด preview ของ build |
| `npm run lint` | ตรวจ ESLint |
| `npm test` | รันชุดทดสอบทั้งหมด (Vitest) |
| `npm run test:watch` | รันทดสอบแบบ watch |

## สถานะการพัฒนา

- [x] Phase 1 — Requirement & Architecture (อนุมัติแล้ว)
- [x] Phase 2 — Project setup, Auth UI, Supabase client, Migration draft
- [x] Phase 3 — Core Task System
- [x] Phase 4 — UI & Settings (i18n, theme, export)
- [x] Phase 5 — Search + Rule-based classification (โค้ดเสร็จ, Edge Function `search` deploy แล้ว)
- [x] Phase 6A — PWA + offline read cache
- [x] Phase 6B — Offline CRUD + sync (เขียนได้ตอนออฟไลน์, ซิงก์อัตโนมัติเมื่อกลับออนไลน์, last-write-wins + sync_conflicts)
- [x] Phase 7 — Testing (Vitest 58 tests) + Deploy config (Vercel)
  - ดูขั้นตอน deploy ทั้งหมดใน [`docs/deploy.md`](docs/deploy.md)

## Deploy

Production ใช้ **Vercel** (static build + SPA rewrite) และ **Supabase** เป็น backend

1. ตั้งค่า environment variables บน Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
2. ตั้ง Site URL + Redirect URLs ใน Supabase Auth เป็นโดเมน production
3. Deploy แล้วทำตาม checklist ใน [`docs/deploy.md`](docs/deploy.md)

## ความปลอดภัย

- RLS เปิดทุกตาราง และกรองด้วย `auth.uid()`
- Storage bucket เป็น private
- `service_role` ใช้เฉพาะ Edge Function (ลบบัญชี / SerpAPI)
- `.env.local` ถูก ignore โดย Git
