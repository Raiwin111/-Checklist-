import { Link } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
  PlusCircle,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'

const stats = [
  {
    label: 'งานทั้งหมด',
    value: 0,
    icon: ListChecks,
    tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  {
    label: 'เสร็จแล้ว',
    value: 0,
    icon: CheckCircle2,
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  {
    label: 'กำลังทำ',
    value: 0,
    icon: Clock3,
    tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  },
  {
    label: 'ยังไม่เริ่ม',
    value: 0,
    icon: Circle,
    tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  },
]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-8 text-white shadow-lg shadow-indigo-600/20">
        <p className="text-sm text-indigo-100">ยินดีต้อนรับกลับ</p>
        <h1 className="mt-1 text-2xl font-bold">
          {user?.email?.split('@')[0] ?? 'ผู้ใช้'}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-indigo-100">
          ภาพรวมงานของคุณจะแสดงที่นี่ เมื่อเริ่มเพิ่ม Task ใน Phase 3
        </p>
        <Link
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          to="/tasks/new"
        >
          <PlusCircle className="h-4 w-4" />
          เพิ่ม Task ใหม่
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Progress Overview</h2>
            <span className="text-xs text-slate-400">0%</span>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full w-0 rounded-full bg-indigo-600" />
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            ยังไม่มีข้อมูลความคืบหน้า
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold">Activity Timeline</h2>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
            กิจกรรมจะแสดงที่นี่เมื่อคุณสร้างหรือแก้ไข Task
          </div>
        </div>
      </section>
    </div>
  )
}
