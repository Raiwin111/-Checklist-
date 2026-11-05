import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from './AuthShell'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')

  return (
    <AuthShell
      title="ตรวจสอบอีเมลของคุณ"
      subtitle="เราได้ส่งลิงก์ยืนยันไปยังอีเมลที่คุณสมัคร"
    >
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {email ? (
          <p>
            ส่งไปที่{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {email}
            </span>
          </p>
        ) : null}
        <p>
          กรุณาคลิกลิงก์ในอีเมลเพื่อยืนยันบัญชี จากนั้นกลับมาเข้าสู่ระบบอีกครั้ง
        </p>
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          ไม่พบอีเมล? ตรวจสอบโฟลเดอร์ Spam หรือ Junk ด้วย
        </p>
        <Link
          className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
          to="/login"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </AuthShell>
  )
}
