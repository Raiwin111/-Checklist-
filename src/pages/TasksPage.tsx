import { Link } from 'react-router-dom'
import { ListChecks, PlusCircle, Search } from 'lucide-react'

const selectClass =
  'rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950'

export function TasksPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">จัดการ Task</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ค้นหา กรอง และแก้ไขงานทั้งหมดของคุณ
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          to="/tasks/new"
        >
          <PlusCircle className="h-4 w-4" />
          เพิ่ม Task
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            placeholder="ค้นหาชื่องาน…"
            type="search"
          />
        </div>
        <select className={selectClass} defaultValue="">
          <option value="">ทุกประเภท</option>
          <option value="study">เรียน</option>
          <option value="project">โปรเจกต์</option>
          <option value="research">งานวิจัย</option>
        </select>
        <select className={selectClass} defaultValue="">
          <option value="">ทุกสถานะ</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
          <ListChecks className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-base font-semibold">ยังไม่มี Task</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          เริ่มสร้างงานแรกของคุณได้เลย
        </p>
        <Link
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          to="/tasks/new"
        >
          <PlusCircle className="h-4 w-4" />
          เพิ่ม Task ใหม่
        </Link>
      </div>
    </div>
  )
}
