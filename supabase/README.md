# Supabase Setup

## 1. Apply the migration

**ยังไม่ต้องรันจนกว่าจะตรวจไฟล์แล้ว**

ไฟล์: `supabase/migrations/20261105000100_init.sql`

วิธีที่แนะนำ (ไม่ต้องติดตั้ง CLI):

1. เปิด Supabase Dashboard → โปรเจกต์ของคุณ
2. ไปที่ **SQL Editor**
3. เปิดไฟล์ migration แล้วคัดลอกทั้งหมดไปวาง
4. กด **Run**
5. ตรวจสอบว่าไม่มี error

## 2. Apply the follow-up migrations

รันใน **SQL Editor** ตามลำดับ หลังจาก migration แรกผ่านแล้ว

### 2.1 `20261106000100_task_status_progress.sql`

**ทำไปเพื่ออะไร:** บังคับกฎ Status ↔ Progress ที่ฐานข้อมูล
เช่น ถ้าตั้ง Completed ต้องได้ 100%, ถ้าลากไป 0% ต้องเป็น Not Started
เป็น safety net เผื่อมีการเขียนข้อมูลตรงจาก API หรือ offline sync ในอนาคต
(ตัวเว็บปรับให้อยู่แล้ว แต่ฐานข้อมูลควรกันให้ด้วย)

### 2.2 `20261106000200_backfill_profiles.sql`

**ทำไปเพื่ออะไร:** ซ่อมบัญชีที่ยังไม่มีแถวใน `profiles`
ทำให้เกิด error `tasks_user_id_fkey` ตอนสร้าง Task
ไฟล์นี้จะสร้างโปรไฟล์ + ประเภทงานเริ่มต้น (เรียน / โปรเจกต์ / งานวิจัย)
ให้บัญชีที่มีอยู่แล้ว และติดตั้ง trigger สำหรับบัญชีใหม่ให้ถูกต้อง

หลังรันแล้ว ผลลัพธ์สุดท้ายควรได้ **0 rows** (แปลว่าไม่มีบัญชีที่ขาดโปรไฟล์)

## 3. ตั้งค่า Authentication

ไปที่ **Authentication → Providers → Email**:

- เปิด **Enable Email Provider**
- เปิด **Confirm email**
- ตั้ง **Site URL**: `http://localhost:5173`
- เพิ่ม **Redirect URLs**:
  - `http://localhost:5173/login`
  - `http://localhost:5173/reset-password`
  - `https://<your-vercel-domain>/login`
  - `https://<your-vercel-domain>/reset-password`

## 4. ตรวจสอบ Storage

หลังรัน migration ควรมี bucket ชื่อ `task-images`:

- Public: **false**
- File size limit: **20 MB**
- Allowed MIME: jpeg, png, webp, gif, avif
- Path convention: `{user_id}/{task_id}/{image_id}.{ext}`

## 5. Deploy the `delete-account` Edge Function (Phase 3)

ไฟล์: `supabase/functions/delete-account/index.ts`

ฟังก์ชันนี้ลบบัญชี + ข้อมูลทั้งหมดของผู้เรียก โดยตรวจ JWT ของผู้ใช้เอง
และใช้ `SUPABASE_SERVICE_ROLE_KEY` ที่ Supabase ใส่ให้อัตโนมัติใน Edge Function
(เบราว์เซอร์ลบ user ใน `auth.users` เองไม่ได้ จึงต้องใช้ฟังก์ชันนี้)

**วิธีที่ 1 — ใช้ Supabase CLI (แนะนำ ถ้าติดตั้งไว้แล้ว)**

```bash
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy delete-account
```

**วิธีที่ 2 — ใช้ Dashboard (ไม่ต้องติดตั้ง CLI)**

1. เปิด Supabase Dashboard → **Edge Functions**
2. กด **Deploy a new function**
3. ตั้งชื่อว่า `delete-account`
4. ลบโค้ดตัวอย่าง แล้ววางเนื้อหาไฟล์ `supabase/functions/delete-account/index.ts` ทั้งไฟล์
5. กด **Deploy**

ไม่ต้องตั้ง secret เพิ่ม: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
และ `SUPABASE_SERVICE_ROLE_KEY` มีให้ใน runtime อยู่แล้ว

หลัง deploy ให้ทดสอบด้วยบัญชีทดสอบ (ลบบัญชีถาวรในหน้า Settings)
เพราะไม่สามารถกู้คืนได้

## 6. Edge Function secrets (Phase 3 / 5)

ห้ามใส่ secret ใน `.env.local` ของ frontend

```bash
supabase secrets set SERPAPI_API_KEY=your-key
```

สำหรับ development ในเครื่อง:

```
supabase/functions/.env
```

ไฟล์นี้ถูก ignore โดย Git แล้ว

## 7. ตรวจ RLS

ทดสอบด้วยบัญชี 2 บัญชี:

1. สมัครบัญชี A และ B
2. สร้าง Task ในบัญชี A
3. Login บัญชี B แล้ว query `tasks` — ต้องไม่เห็นข้อมูลของ A
4. พยายาม update/delete แถวของ A — ต้องถูกปฏิเสธ

## 8. แก้ปัญหา

### `insert or update on table "tasks" violates foreign key constraint "tasks_user_id_fkey"`

สาเหตุ: บัญชีที่ล็อกอินอยู่ยังไม่มีแถวใน `public.profiles`
(มักเกิดกับบัญชีที่สมัครไว้ก่อนติดตั้ง trigger)

วิธีแก้: รัน `supabase/migrations/20261106000200_backfill_profiles.sql`
ใน SQL Editor แล้วลองสร้าง Task ใหม่ (ไม่ต้องสมัครใหม่)

ตรวจสอบด้วยคำสั่งนี้ — ต้องไม่มีแถวที่ `profile_id` เป็น null:

```sql
select u.id, u.email, p.id as profile_id
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;
```

## 9. คำสั่งที่มีประโยชน์

```bash
# ถ้าติดตั้ง Supabase CLI
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy delete-account
supabase functions deploy search
```
