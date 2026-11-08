# Architecture v1 (Approved)

วันที่อนุมัติ: 2026-11-05

## 1. หลักการ

- **Local-first (渐进):** อ่านจาก cache เมื่อออฟไลน์ (Phase 6A) และเขียน/ลบแบบออฟไลน์ได้ พร้อมคิวซิงก์เมื่อกลับมาออนไลน์ (Phase 6B)
- **Single source of truth ฝั่ง UI:** React อ่าน/เขียนผ่าน service layer และ IndexedDB ใน Phase 6
- **Cloud เป็นปลายทางของการซิงก์:** Supabase PostgreSQL + RLS + Storage
- **ไม่มีความลับฝั่ง Browser:** SerpAPI และ service_role อยู่ใน Edge Function เท่านั้น

## 2. การตัดสินใจที่ยืนยันแล้ว

| หัวข้อ | ข้อสรุป |
|---|---|
| ผู้ใช้ | Public signup, แยกข้อมูลตาม Email |
| Login | Email + Password, เปิด Email Confirmation |
| หลายบัญชี | สลับได้ในเครื่องเดียว (แบบ A: จำ session ไว้) |
| ลบบัญชี | ผ่าน Edge Function + service_role, ยืนยันด้วยอีเมลและรหัสผ่าน |
| Issue tracker | ไม่เกี่ยวข้องกับแอป (ใช้เฉพาะ skills) |
| Search | SerpAPI ผ่าน Edge Function |
| Classification | Rule-based, `is_ai_generated = false` |
| Offline MVP | อ่านจาก cache (6A) + เขียน/ลบออฟไลน์และซิงก์อัตโนมัติ (6B) |
| Conflict | Last-write-wins + แจ้งเตือน + เก็บสำเนาใน `sync_conflicts` |
| Category | เพิ่ม/แก้/ลบเองได้; 3 ประเภทระบบลบไม่ได้ |
| Status ↔ Progress | อัตโนมัติตามกฎในหัวข้อ 4 |
| รูปภาพ | ไม่จำกัดจำนวน, ≤ 20MB/รูป, บีบอัดก่อนอัปโหลด |
| Timeline | เก็บตลอด, ผู้ใช้ลบได้ทีละรายการหรือทั้ง Task |
| Search history | บันทึกลง Database |
| Export | มีปุ่ม Export ใน Phase 4 |
| Deploy | Vercel |

## 3. Data Flow

```
React UI
  │
  ├── Auth (Supabase Auth) ──► JWT ──► RLS (auth.uid())
  │
  ├── Read/Write (Phase 3) ──► Supabase JS ──► PostgreSQL
  │
  ├── Images ──► Supabase Storage (private bucket: task-images)
  │
  ├── Search ──► Edge Function ──► SerpAPI ──► rule-based classifier
  │
  └── Offline (Phase 6A/6B) ──► IndexedDB cache + localTasks
        └── syncQueue ──► conflict detection (revision) ──► sync_conflicts
```

## 4. กฎ Status ↔ Progress

| การกระทำ | ผลลัพธ์ |
|---|---|
| Status → Completed | Progress = 100 |
| Status → Not Started | Progress = 0 |
| Status → In Progress | Progress 0 → 1; Progress 100 → Completed |
| Status → On Hold | Progress คงเดิม |
| Progress → 100 | Status = Completed |
| Progress → 0 | Status = Not Started |
| Progress → 1–99 | Status = In Progress (ยกเว้น On Hold คงเดิม) |
| สร้าง Task | Status = Not Started, Progress = 0 |

## 5. Database Schema (สรุป)

- `profiles` — 1:1 กับ `auth.users`
- `categories` — ของผู้ใช้, 3 ประเภทระบบ + ประเภทที่เพิ่มเอง
- `tasks` — Soft delete, `revision`, `server_updated_at`
- `task_images` — metadata ของไฟล์ใน Storage
- `task_events` — Timeline / Audit log
- `search_sessions` + `search_results` — ประวัติค้นหา
- `sync_conflicts` — สำเนาข้อมูลที่ถูกทับ
- `devices` — ระบุอุปกรณ์ที่แก้ไข

รายละเอียดทั้งหมดอยู่ใน `supabase/migrations/20261105000100_init.sql`

## 6. Account Switching (แบบ A)

- Supabase เก็บ session ที่ active ทีละบัญชี
- `accountVault.ts` เก็บ refresh token ของแต่ละบัญชีใน `localStorage`
  ภายใต้ key `ptrs.auth.vault`
- การสลับบัญชี:
  1. `signOut({ scope: 'local' })` (ไม่ revoke token ฝั่ง Server)
  2. `refreshSession({ refresh_token })` ของบัญชีเป้าหมาย
  3. บันทึก session ใหม่กลับเข้า vault
- **ข้อควรระวัง:** refresh token ใน localStorage เสี่ยงต่อ XSS
  ต้องมี CSP เข้มงวดและไม่โหลดสคริปต์บุคคลที่สาม
- Dexie (Phase 6) ต้องแยกฐานข้อมูลต่อ `user_id`

## 7. การลบบัญชี

Edge Function `delete-account` (Phase 3):

1. ตรวจ JWT
2. ลบไฟล์ใน Storage ใต้ `{user_id}/`
3. ลบข้อมูลใน DB ตามลำดับ (หรือพึ่ง `ON DELETE CASCADE`)
4. ลบ `auth.users` ด้วย service_role
5. Client ล้าง Dexie และ vault ของบัญชีนั้น

## 8. ความเสี่ยงที่ยังติดตาม

| ความเสี่ยง | แนวทาง |
|---|---|
| Refresh token ใน localStorage | CSP, ไม่ใช้สคริปต์ภายนอก, พิจารณา PIN ภายหลัง |
| Offline CRUD (Phase 6B) | ทดสอบด้วย Vitest (local CRUD, merge, sync, conflict) และคู่มือ manual test ใน `docs/deploy.md` |
| รูป 20MB × ไม่จำกัดจำนวน | บีบอัดฝั่ง Client, เฝ้า Storage quota |
| Rule-based classification | แสดง Unknown/Unverified อย่างชัดเจน |
| RLS ตั้งผิด | เขียน test เคสข้ามผู้ใช้ก่อน deploy |
