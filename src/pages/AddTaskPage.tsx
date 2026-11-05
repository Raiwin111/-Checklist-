import { useState, type FormEvent } from 'react'
import { Save, Upload } from 'lucide-react'

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950'

export function AddTaskPage() {
  const [progress, setProgress] = useState(0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">เพิ่ม Task ใหม่</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ฟอร์มนี้เป็นโครง UI — การบันทึกลงฐานข้อมูลจะเปิดใช้งานใน Phase 3
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        ยังไม่เชื่อมต่อฐานข้อมูล: กดบันทึกจะไม่เกิดการเปลี่ยนแปลง
      </div>

      <form
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        onSubmit={handleSubmit}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="title">
            ชื่องาน
          </label>
          <input
            id="title"
            className={inputClass}
            placeholder="เช่น สรุปบทความวิจัย"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="description">
            รายละเอียด
          </label>
          <textarea
            id="description"
            className={`${inputClass} min-h-28 resize-y`}
            placeholder="รายละเอียดเพิ่มเติม"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="category">
              ประเภท
            </label>
            <select id="category" className={inputClass} defaultValue="study">
              <option value="study">เรียน (Study)</option>
              <option value="project">โปรเจกต์ (Project)</option>
              <option value="research">งานวิจัย (Research)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="status">
              สถานะ
            </label>
            <select id="status" className={inputClass} defaultValue="not_started">
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="progress">
              ความคืบหน้า
            </label>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {progress}%
            </span>
          </div>
          <input
            id="progress"
            className="w-full accent-indigo-600"
            type="range"
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="images">
            รูปภาพ
          </label>
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
            htmlFor="images"
          >
            <Upload className="h-5 w-5" />
            เลือกรูป (สูงสุด 20MB ต่อรูป)
          </label>
          <input
            id="images"
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
          />
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
          type="submit"
        >
          <Save className="h-4 w-4" />
          บันทึก Task
        </button>
      </form>
    </div>
  )
}
