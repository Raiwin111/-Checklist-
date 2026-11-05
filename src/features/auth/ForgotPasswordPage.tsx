import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell, inputClass, primaryButtonClass } from './AuthShell'
import { useAuth } from './auth-context'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: resetError } = await resetPassword(email.trim())
    setSubmitting(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  return (
    <AuthShell
      title="ลืมรหัสผ่าน"
      subtitle="กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่"
    >
      {sent ? (
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            หากอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว
          </p>
          <Link
            className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
            to="/login"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              อีเมล
            </label>
            <input
              id="email"
              className={inputClass}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <button
            className={primaryButtonClass}
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'กำลังส่ง…' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link
          className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          to="/login"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </AuthShell>
  )
}
