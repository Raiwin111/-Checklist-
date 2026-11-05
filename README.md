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

## สถานะการพัฒนา

- [x] Phase 1 — Requirement & Architecture (อนุมัติแล้ว)
- [x] Phase 2 — Project setup, Auth UI, Supabase client, Migration draft
- [ ] Phase 3 — Core Task System
- [ ] Phase 4 — UI & Settings (i18n, theme, export)
- [ ] Phase 5 — Search + Rule-based classification
- [ ] Phase 6A — PWA + offline read cache
- [ ] Phase 6B — Offline CRUD + sync (ต้องอนุมัติแยก)
- [ ] Phase 7 — Testing & Deploy

## ความปลอดภัย

- RLS เปิดทุกตาราง และกรองด้วย `auth.uid()`
- Storage bucket เป็น private
- `service_role` ใช้เฉพาะ Edge Function (ลบบัญชี / SerpAPI)
- `.env.local` ถูก ignore โดย Git
