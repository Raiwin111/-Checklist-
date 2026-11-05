import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthShell, inputClass, primaryButtonClass } from './AuthShell'
import { useAuth } from './auth-context'

export function SignupPage() {
  const { session, loading, signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setSubmitting(true)
    const { error: signUpError, needsConfirmation } = await signUp(
      email.trim(),
      password,
    )
    setSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (needsConfirmation) {
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
      })
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <AuthShell
      title="สมัครสมาชิก"
      subtitle="สร้างบัญชีเพื่อเริ่มจัดการงานของคุณ"
    >
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">
            รหัสผ่าน
          </label>
          <input
            id="password"
            className={inputClass}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="confirm-password">
            ยืนยันรหัสผ่าน
          </label>
          <input
            id="confirm-password"
            className={inputClass}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button className={primaryButtonClass} type="submit" disabled={submitting}>
          {submitting ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        มีบัญชีอยู่แล้ว?{' '}
        <Link
          className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          to="/login"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthShell>
  )
}
