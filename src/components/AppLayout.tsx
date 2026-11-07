import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  PlusCircle,
  Settings,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { listAccounts } from '../features/auth/accountVault'
import { useI18n } from '../features/i18n/context'
import type { TranslationKey } from '../features/i18n/dictionary'

const navItems: Array<{
  to: string
  labelKey: TranslationKey
  icon: typeof LayoutDashboard
  end: boolean
}> = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks/new', labelKey: 'nav.addTask', icon: PlusCircle, end: false },
  { to: '/tasks', labelKey: 'nav.tasks', icon: ListChecks, end: true },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, end: false },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900',
  ].join(' ')

export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()
  const accountCount = listAccounts().length

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            ✓
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{t('app.name')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('app.tagline')}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={navClass}
              end={item.end}
              to={item.to}
            >
              <item.icon className="h-5 w-5" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {user?.email}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {t('nav.accountsOnDevice', { count: accountCount })}
          </p>
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => void handleSignOut()}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              ✓
            </div>
            <span className="text-sm font-bold">{t('app.name')}</span>
          </div>
          <p className="hidden text-sm text-slate-500 dark:text-slate-400 lg:block">
            {t('nav.subtitle')}
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[14rem] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:block">
              {user?.email}
            </span>
            <NavLink
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
              to="/settings"
            >
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </NavLink>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400',
              ].join(' ')
            }
            end={item.end}
            to={item.to}
          >
            <item.icon className="h-5 w-5" />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
