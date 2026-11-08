# Deploy Guide — Vercel + Supabase

คู่มือ deploy production สำหรับ Personal Task & Research System
ทุกขั้นตอนที่ทำได้จาก repo นี้ทำเสร็จแล้ว ส่วนที่ต้องใช้บัญชีของคุณจะระบุว่า **(ต้องทำเอง)**

---

## 0. Pre-deploy checks (ทำทุกครั้งก่อน deploy)

```bash
npm ci
npm run lint
npm run test
npm run build
```

ต้องผ่านทั้ง 4 คำสั่ง โดย `npm run build` จะสร้าง `dist/` พร้อม service worker (`dist/sw.js`)

---

## 1. Supabase — ตรวจ schema ให้ครบ

### 1.1 รัน migration ตามลำดับ (ถ้ายังไม่ได้รัน)

Supabase Dashboard → **SQL Editor** → วางทีละไฟล์แล้ว Run

| ลำดับ | ไฟล์ | ต้องได้ผลลัพธ์ |
|---|---|---|
| 1 | `supabase/migrations/20261105000100_init.sql` | สร้างตาราง/RLS/storage bucket |
| 2 | `supabase/migrations/20261106000100_task_status_progress.sql` | trigger บังคับ Status ↔ Progress |
| 3 | `supabase/migrations/20261106000200_backfill_profiles.sql` | 0 rows (ไม่มีโปรไฟล์ขาด) |

ตรวจว่าตารางครบ:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

ต้องเห็น: `categories`, `devices`, `profiles`, `search_results`,
`search_sessions`, `sync_conflicts`, `task_events`, `task_images`, `tasks`

### 1.2 ตรวจ Storage

**Storage → task-images** ต้องเป็น:

- Public: **false**
- File size limit: **20 MB**
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`

### 1.3 Authentication URLs

**Authentication → URL Configuration**:

- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs** (เพิ่มทั้งหมด):
  - `https://<your-app>.vercel.app/login`
  - `https://<your-app>.vercel.app/reset-password`
  - `http://localhost:5173/login` (สำหรับ dev)
  - `http://localhost:5173/reset-password`

> ถ้าโดเมน Vercel ยังไม่มี ให้ deploy ข้อ 3 ก่อนแล้วกลับมาตั้งค่านี้
> มิฉะนั้นลิงก์ยืนยันอีเมลและรีเซ็ตรหัสผ่านจะพาไปผิดโดเมน

**Authentication → Providers → Email**: เปิด Enable Email Provider + Confirm email

### 1.4 Edge Functions

| ฟังก์ชัน | ไฟล์ | Secret |
|---|---|---|
| `delete-account` | `supabase/functions/delete-account/index.ts` | ไม่ต้องตั้ง (ใช้ service role ของ runtime) |
| `search` | `supabase/functions/search/index.ts` + `classifier.ts` | `SERPAPI_API_KEY` |

ถ้ายังไม่ deploy ดูขั้นตอนละเอียดใน `supabase/README.md` หัวข้อ 5–6

---

## 2. Environment variables

### Local (`.env.local` — gitignored แล้ว)

```env
VITE_SUPABASE_URL=https://vuzhtnjgwpwptcvkcnms.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

### Vercel (Project → Settings → Environment Variables)

ใส่ **Production**, **Preview** และ **Development** ให้ครบทั้งสองค่า:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://vuzhtnjgwpwptcvkcnms.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable / anon key |

> ใช้ได้เฉพาะค่า public ที่ขึ้นต้นด้วย `VITE_`
> **ห้าม**ใส่ `SERPAPI_API_KEY`, `service_role` หรือ `sb_secret_...` ใน Vercel

---

## 3. Deploy ขึ้น Vercel **(ต้องทำเอง)**

### วิธี A — Dashboard (แนะนำถ้าไม่เคยใช้ CLI)

1. push repo นี้ขึ้น GitHub
2. เปิด https://vercel.com/new → **Import Git Repository**
3. Framework Preset: **Vite** (ตรวจอัตโนมัติ)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. เพิ่ม Environment Variables ตามข้อ 2
7. กด **Deploy**
8. คัดลอก Production URL แล้วกลับไปตั้งค่า Supabase ข้อ 1.3

### วิธี B — Vercel CLI

```bash
npx vercel login
npx vercel link
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod
```

`vercel.json` ตั้งค่า SPA rewrite และ security headers ไว้แล้ว:

- ทุก path ที่ไม่ใช่ไฟล์จริง → `index.html` (React Router ทำงานถูก)
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- hashed assets แคช 1 ปีแบบ immutable, `sw.js` / manifest ไม่แคช

---

## 4. Post-deploy verification **(ต้องทำเองบน production URL)**

### Auth
- [ ] สมัครบัญชีใหม่ → ได้อีเมลยืนยัน → คลิกลิงก์กลับเข้าแอปได้
- [ ] Login / Logout ได้
- [ ] ลืมรหัสผ่าน → อีเมลรีเซ็ต → ตั้งรหัสใหม่ → login ได้
- [ ] สลับบัญชี (2 บัญชีในเครื่องเดียว) ได้

### ข้อมูลหลัก
- [ ] สร้าง Task พร้อมรูป 2–3 รูป → รูปถูกบีบอัดและแสดงได้
- [ ] แก้ Task: เปลี่ยน status/progress → กฎ Status ↔ Progress ถูกต้อง
- [ ] ลบ Task → หายจาก Dashboard/Tasks และ timeline มี event `deleted`
- [ ] Export JSON ใน Settings ได้ไฟล์ครบ (tasks/categories/images metadata/timeline)

### Search
- [ ] ค้นหาคำศัพท์ → ได้ผลลัพธ์พร้อมป้ายประเภทแหล่งข้อมูล
- [ ] ประวัติค้นหาบันทึกและเปิด/ลบได้

### PWA
- [ ] เปิดproduction URL บน Chrome → ติดตั้งแอปได้ (ไอคอนขึ้นถูก)
- [ ] DevTools → Application → Manifest ไม่มี error, Service Worker activated
- [ ] ปิดเน็ต → เห็น offline badge, เปิด Dashboard/Tasks ที่เคยเปิดแล้วได้

### Offline CRUD + sync (Phase 6B)
- [ ] ปิดเน็ต → สร้าง Task ใหม่ → Task แสดงทันทีพร้อม badge รอซิงก์
- [ ] ปิดเน็ต → แก้ Task เดิม (title/status/progress) → เห็นค่าใหม่ทันที
- [ ] ปิดเน็ต → ลบ Task → หายจากรายการ
- [ ] เปิดเน็ตกลับ → SyncStatus เปลี่ยนเป็น "ซิงก์เรียบร้อย" ภายในไม่กี่วินาที
- [ ] รีเฟรชหน้า → Task ที่สร้าง/แก้/ลบออฟไลน์สะท้อนบนเซิร์ฟเวอร์แล้ว

### RLS (สำคัญ)
- [ ] สมัครบัญชี B → ต้องไม่เห็น Task ของบัญชี A
- [ ] ใช้ DevTools/console พยายาม query ข้าม user → ถูก RLS ปฏิเสธ
- [ ] ลบบัญชีทดสอบใน Settings → ข้อมูลและรูปหายทั้งหมด

---

## 5. Rollback

- Vercel → Deployments → เลือก deployment ก่อนหน้า → **Promote to Production**
- Frontend เป็น static + Supabase จริง: การ rollback ไม่ย้อนข้อมูลใน DB
  จึงควรหลีกเลี่ยง migration ที่ทำลายข้อมูล (ทุกไฟล์ใน repo นี้เป็น `if not exists` / idempotent)

## 6. หลัง deploy ทุกครั้ง

1. อัปเดต **Site URL** และ Redirect URLs ใน Supabase ถ้าโดเมนเปลี่ยน
2. ตรวจ Vercel Environment Variables ว่าครบทั้ง Production/Preview
3. ตรวจ Edge Function secrets ยังอยู่ (`SERPAPI_API_KEY`)
4. เปิด production URL แบบ incognito แล้วรัน checklist ข้อ 4 ซ้ำอย่างน้อย Auth + สร้าง Task + Offline
