import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download,
  FolderKanban,
  Languages,
  Loader2,
  LogOut,
  Moon,
  ShieldAlert,
  Sun,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import {
  listAccounts,
  removeAccountFromVault,
  switchToAccount,
  type VaultAccount,
} from '../features/auth/accountVault'
import { useDashboard } from '../features/tasks/useDashboard'
import { CategoryManager } from '../features/categories/CategoryManager'
import { Modal } from '../components/Modal'
import { deleteAccount } from '../lib/api/account'
import { getErrorMessage } from '../lib/errors'

const cardClass =
  'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<VaultAccount[]>(() => listAccounts())
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: dashboard, loading: dashboardLoading } = useDashboard(user?.id)
  const stats = dashboard?.stats

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('ptrs.theme', theme)
  }, [theme])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleSwitch(account: VaultAccount) {
    setError(null)
    setBusyUserId(account.userId)
    try {
      await switchToAccount(account.userId)
      window.location.assign('/')
    } catch (switchError) {
      setError(getErrorMessage(switchError))
      setBusyUserId(null)
    }
  }

  function handleRemove(userId: string) {
    removeAccountFromVault(userId)
    setAccounts(listAccounts())
  }

  function openDelete() {
    setDeleteConfirmText('')
    setDeleteError(null)
    setDeleteOpen(true)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteAccount()
      navigate('/login', { replace: true })
    } catch (deleteFailure) {
      setDeleteError(getErrorMessage(deleteFailure))
      setDeleting(false)
    }
  }

  const canDelete =
    deleteConfirmText.trim().toLowerCase() === (user?.email ?? '').toLowerCase()

  const statCards = [
    ['งานทั้งหมด', stats?.total ?? 0],
    ['เสร็จแล้ว', stats?.completed ?? 0],
    ['กำลังทำ', stats?.inProgress ?? 0],
    ['ยังไม่เริ่ม', stats?.notStarted ?? 0],
  ] as const

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          จัดการบัญชี ธีม ภาษา และข้อมูลของคุณ
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold">บัญชีในเครื่องนี้</h2>
        </div>
        <div className="space-y-2">
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ยังไม่มีบัญชีที่บันทึกไว้
            </p>
          ) : (
            accounts.map((account) => {
              const isCurrent = account.userId === user?.id
              return (
                <div
                  key={account.userId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {account.email}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isCurrent ? 'กำลังใช้งาน' : 'บันทึกไว้ในเครื่อง'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrent ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        Active
                      </span>
                    ) : (
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        disabled={busyUserId !== null}
                        onClick={() => void handleSwitch(account)}
                        type="button"
                      >
                        {busyUserId === account.userId ? 'กำลังสลับ…' : 'สลับบัญชี'}
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                      disabled={isCurrent}
                      onClick={() => handleRemove(account.userId)}
                      title={isCurrent ? 'ออกจากระบบก่อนจึงจะลบบัญชีออกจากเครื่องได้' : undefined}
                      type="button"
                    >
                      ลบออกจากเครื่อง
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={() => void handleSignOut()}
          type="button"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </button>
      </section>

      <section className={cardClass}>
        {user ? <CategoryManager userId={user.id} /> : null}
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-semibold">General Settings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium" htmlFor="language">
              <Languages className="h-4 w-4" />
              ภาษา
            </label>
            <select
              id="language"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              defaultValue="th"
              disabled
            >
              <option value="th">ไทย (Thai)</option>
              <option value="en">English</option>
            </select>
            <p className="text-xs text-slate-400">
              การสลับภาษาจะเปิดใช้งานใน Phase 4
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">ธีม</span>
            <div className="flex gap-2">
              <button
                className={[
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                  theme === 'light'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                ].join(' ')}
                onClick={() => setTheme('light')}
                type="button"
              >
                <Sun className="h-4 w-4" />
                สว่าง
              </button>
              <button
                className={[
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                  theme === 'dark'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                ].join(' ')}
                onClick={() => setTheme('dark')}
                type="button"
              >
                <Moon className="h-4 w-4" />
                มืด
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FolderKanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            System Information
          </h2>
          {dashboardLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950"
            >
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {label}
              </dt>
              <dd className="mt-1 text-lg font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-400">
          ความคืบหน้าเฉลี่ย {stats?.averageProgress ?? 0}% · พักไว้{' '}
          {stats?.onHold ?? 0} งาน
        </p>
      </section>

      <section className={cardClass}>
        <h2 className="text-sm font-semibold">Data Management</h2>
        <div className="mt-4 space-y-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            disabled
            type="button"
          >
            <Download className="h-4 w-4" />
            ส่งออกข้อมูล (Phase 4)
          </button>

          <div className="rounded-xl border border-red-200 p-4 dark:border-red-500/30">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
              <ShieldAlert className="h-4 w-4" />
              Danger Zone
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              การลบบัญชีจะลบ Task รูปภาพ ประวัติ และข้อมูลทั้งหมดอย่างถาวร
              ไม่สามารถกู้คืนได้
            </p>
            <button
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              onClick={openDelete}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              ลบบัญชีถาวร
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        title="ลบบัญชีถาวร"
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
        }}
        footer={
          <>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
              type="button"
            >
              ยกเลิก
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canDelete || deleting}
              onClick={() => void handleDeleteAccount()}
              type="button"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleting ? 'กำลังลบ…' : 'ลบบัญชีถาวร'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            ข้อมูลทั้งหมดของคุณจะถูกลบอย่างถาวร พิมพ์อีเมล{' '}
            <span className="font-semibold">{user?.email}</span>{' '}
            เพื่อยืนยันการลบบัญชี
          </p>
          <input
            aria-label="ยืนยันอีเมล"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-700 dark:bg-slate-950"
            placeholder={user?.email ?? ''}
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
          />
          {deleteError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
