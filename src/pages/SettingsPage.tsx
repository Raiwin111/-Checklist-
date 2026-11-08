import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download,
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
import { CacheNotice } from '../components/CacheNotice'
import { CategoryManager } from '../features/categories/CategoryManager'
import { Modal } from '../components/Modal'
import { deleteAccount } from '../lib/api/account'
import { exportUserData } from '../lib/api/export'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useI18n } from '../features/i18n/context'
import type { Locale } from '../features/i18n/dictionary'
import {
  btnDanger,
  btnSecondary,
  errorBox,
  fieldLine,
  label,
  pageLead,
  pageTitle,
  successBox,
} from '../lib/ui'

const themeButton =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 border px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] transition'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t, locale, setLocale } = useI18n()
  const [accounts, setAccounts] = useState<VaultAccount[]>(() => listAccounts())
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    data: dashboard,
    loading: dashboardLoading,
    fromCache,
    cachedAt,
  } = useDashboard(user?.id)
  const stats = dashboard?.stats

  const [exporting, setExporting] = useState(false)
  const [exportNote, setExportNote] = useState<string | null>(null)

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

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale)
    if (user) {
      void supabase
        .from('profiles')
        .update({ locale: nextLocale })
        .eq('id', user.id)
        .then(({ error: updateError }) => {
          if (updateError) {
            console.error('Failed to save locale', updateError)
          }
        })
    }
  }

  async function handleExport() {
    if (!user) return

    setExporting(true)
    setError(null)
    setExportNote(null)

    try {
      await exportUserData(user.id)
      setExportNote(t('settings.exportDone'))
    } catch (exportError) {
      setError(getErrorMessage(exportError))
    } finally {
      setExporting(false)
    }
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
    [t('dashboard.total'), stats?.total ?? 0],
    [t('dashboard.completed'), stats?.completed ?? 0],
    [t('dashboard.inProgress'), stats?.inProgress ?? 0],
    [t('dashboard.notStarted'), stats?.notStarted ?? 0],
  ] as const

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {fromCache ? <CacheNotice cachedAt={cachedAt} /> : null}

      <header className="border-b border-rule pb-6">
        <h1 className={pageTitle}>{t('settings.title')}</h1>
        <p className={pageLead}>{t('settings.subtitle')}</p>
      </header>

      {error ? <p className={errorBox}>{error}</p> : null}
      {exportNote ? <p className={successBox}>{exportNote}</p> : null}

      <section className="border-t border-rule pt-5">
        <h2 className={`${label} flex items-center gap-2`}>
          <UserRound className="h-3.5 w-3.5" />
          {t('settings.deviceAccounts')}
        </h2>

        <div className="mt-2">
          {accounts.length === 0 ? (
            <p className="py-3 text-[12px] text-muted">
              {t('settings.noAccounts')}
            </p>
          ) : (
            accounts.map((account) => {
              const isCurrent = account.userId === user?.id
              return (
                <div
                  key={account.userId}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {account.email}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-dim">
                      {isCurrent ? t('settings.active') : t('settings.saved')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-status-done">
                        <span className="h-1.5 w-1.5 bg-status-done" />
                        {t('settings.activeBadge')}
                      </span>
                    ) : (
                      <button
                        className="inline-flex min-h-11 items-center border border-rule px-3 text-[9px] font-medium uppercase tracking-[0.12em] text-muted transition hover:border-ink hover:text-ink disabled:opacity-60"
                        disabled={busyUserId !== null}
                        onClick={() => void handleSwitch(account)}
                        type="button"
                      >
                        {busyUserId === account.userId
                          ? t('settings.switching')
                          : t('settings.switch')}
                      </button>
                    )}
                    <button
                      className="inline-flex min-h-11 items-center border border-danger/60 px-3 text-[9px] font-medium uppercase tracking-[0.12em] text-danger transition hover:bg-danger hover:text-ground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-danger"
                      disabled={isCurrent}
                      onClick={() => handleRemove(account.userId)}
                      title={
                        isCurrent ? t('settings.removeCurrentHint') : undefined
                      }
                      type="button"
                    >
                      {t('settings.removeFromDevice')}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <button
          className={`${btnSecondary} mt-4`}
          onClick={() => void handleSignOut()}
          type="button"
        >
          <LogOut className="h-4 w-4" />
          {t('nav.signOut')}
        </button>
      </section>

      <section className="border-t border-rule pt-5">
        {user ? <CategoryManager userId={user.id} /> : null}
      </section>

      <section className="border-t border-rule pt-5">
        <h2 className={label}>{t('settings.general')}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label
              className={`${label} flex items-center gap-2`}
              htmlFor="language"
            >
              <Languages className="h-3.5 w-3.5" />
              {t('settings.language')}
            </label>
            <select
              id="language"
              className={fieldLine}
              value={locale}
              onChange={(event) =>
                handleLocaleChange(event.target.value as Locale)
              }
            >
              <option value="th">ไทย (Thai)</option>
              <option value="en">English</option>
            </select>
            <p className="mt-1 text-[11px] text-dim">
              {t('settings.languageHint')}
            </p>
          </div>

          <div>
            <p className={label}>{t('settings.theme')}</p>
            <div className="mt-2 flex gap-2">
              <button
                className={[
                  themeButton,
                  theme === 'light'
                    ? 'border-signal bg-signal/10 text-ink'
                    : 'border-rule text-muted hover:border-muted hover:text-ink',
                ].join(' ')}
                onClick={() => setTheme('light')}
                type="button"
              >
                <Sun className="h-4 w-4" />
                {t('settings.light')}
              </button>
              <button
                className={[
                  themeButton,
                  theme === 'dark'
                    ? 'border-signal bg-signal/10 text-ink'
                    : 'border-rule text-muted hover:border-muted hover:text-ink',
                ].join(' ')}
                onClick={() => setTheme('dark')}
                type="button"
              >
                <Moon className="h-4 w-4" />
                {t('settings.dark')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-rule pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={label}>{t('settings.systemInfo')}</h2>
          {dashboardLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-dim" />
          ) : null}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
          {statCards.map(([statLabel, value]) => (
            <div key={statLabel} className="bg-ground px-3 py-3">
              <dt className="text-[9px] uppercase tracking-[0.12em] text-dim">
                {statLabel}
              </dt>
              <dd className="mt-1 text-[22px] font-medium tabular-nums leading-none">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-dim">
          {t('settings.avgProgress', {
            value: stats?.averageProgress ?? 0,
            count: stats?.onHold ?? 0,
          })}
        </p>
      </section>

      <section className="border-t border-rule pt-5">
        <h2 className={label}>{t('settings.dataManagement')}</h2>
        <div className="mt-4 space-y-3">
          <button
            className={btnSecondary}
            disabled={exporting}
            onClick={() => void handleExport()}
            type="button"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? t('settings.exporting') : t('settings.export')}
          </button>
          <p className="text-[11px] text-dim">{t('settings.exportHint')}</p>

          <div className="border border-danger/50 p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-danger">
              <ShieldAlert className="h-4 w-4" />
              {t('settings.dangerZone')}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              {t('settings.deleteAccountDescription')}
            </p>
            <button
              className={`${btnDanger} mt-3`}
              onClick={openDelete}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              {t('settings.deleteAccount')}
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        title={t('settings.deleteModalTitle')}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
        }}
        footer={
          <>
            <button
              className={btnSecondary}
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
              type="button"
            >
              {t('common.cancel')}
            </button>
            <button
              className={btnDanger}
              disabled={!canDelete || deleting}
              onClick={() => void handleDeleteAccount()}
              type="button"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleting ? t('settings.deleting') : t('settings.deleteAccount')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-muted">
            {t('settings.deleteConfirmText', { email: user?.email ?? '' })}
          </p>
          <div>
            <label className={label} htmlFor="delete-confirm">
              {t('settings.deleteConfirmLabel')}
            </label>
            <input
              id="delete-confirm"
              autoComplete="off"
              className={`${fieldLine} focus:border-danger`}
              placeholder={user?.email ?? ''}
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
            />
          </div>
          {deleteError ? (
            <p className="text-[12px] text-danger">{deleteError}</p>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
