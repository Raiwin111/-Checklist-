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

## 2. ตั้งค่า Authentication

ไปที่ **Authentication → Providers → Email**:

- เปิด **Enable Email Provider**
- เปิด **Confirm email**
- ตั้ง **Site URL**: `http://localhost:5173`
- เพิ่ม **Redirect URLs**:
  - `http://localhost:5173/login`
  - `http://localhost:5173/reset-password`
  - `https://<your-vercel-domain>/login`
  - `https://<your-vercel-domain>/reset-password`

## 3. ตรวจสอบ Storage

หลังรัน migration ควรมี bucket ชื่อ `task-images`:

- Public: **false**
- File size limit: **20 MB**
- Allowed MIME: jpeg, png, webp, gif, avif
- Path convention: `{user_id}/{task_id}/{image_id}.{ext}`

## 4. Edge Function secrets (Phase 3 / 5)

ห้ามใส่ secret ใน `.env.local` ของ frontend

```bash
supabase secrets set SERPAPI_API_KEY=your-key
```

สำหรับ development ในเครื่อง:

```
supabase/functions/.env
```

ไฟล์นี้ถูก ignore โดย Git แล้ว

## 5. ตรวจ RLS

ทดสอบด้วยบัญชี 2 บัญชี:

1. สมัครบัญชี A และ B
2. สร้าง Task ในบัญชี A
3. Login บัญชี B แล้ว query `tasks` — ต้องไม่เห็นข้อมูลของ A
4. พยายาม update/delete แถวของ A — ต้องถูกปฏิเสธ

## 6. คำสั่งที่มีประโยชน์

```bash
# ถ้าติดตั้ง Supabase CLI
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy delete-account
supabase functions deploy search
```
