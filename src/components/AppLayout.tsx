import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  Plus,
  Search,
  Settings,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { listAccounts } from '../features/auth/accountVault'
import { useI18n } from '../features/i18n/context'
import { useOnlineStatus } from '../lib/offline/network'
import { syncManager } from '../lib/offline/sync'
import { notifySyncComplete } from '../lib/offline/syncEvents'
import { SyncStatus } from '../components/SyncStatus'
import type { TranslationKey } from '../features/i18n/dictionary'

const navItems: Array<{
  to: string
  labelKey: TranslationKey
  icon: typeof LayoutDashboard
  end: boolean
}> = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', labelKey: 'nav.tasks', icon: ListChecks, end: true },
  { to: '/search', labelKey: 'nav.search', icon: Search, end: false },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, end: false },
]

const NAV_BASE =
  'relative flex min-h-11 items-center gap-3 py-3 pl-[44px] pr-4 text-[10px] font-medium uppercase tracking-[0.16em] transition'

function sectionKey(pathname: string): TranslationKey {
  if (pathname === '/') return 'nav.dashboard'
  if (pathname === '/tasks') return 'nav.tasks'
  if (pathname.startsWith('/tasks/')) return 'nav.addTask'
  if (pathname.startsWith('/search')) return 'nav.search'
  if (pathname.startsWith('/settings')) return 'nav.settings'
  return 'nav.dashboard'
}

export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()
  const online = useOnlineStatus()
  const { pathname } = useLocation()
  const accountCount = listAccounts().length
  const currentLabel = t(sectionKey(pathname))
  const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

  // Auto-sync when reconnecting
  useEffect(() => {
    if (!user || !online) return

    let active = true
    void syncManager.startSync(user.id).then((result) => {
      if (!active) return
      if (result.status === 'completed' && result.processed > 0) {
        notifySyncComplete()
      }
    })

    return () => {
      active = false
    }
  }, [user, online])

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ground">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-signal focus:bg-plate focus:px-3 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.14em] focus:text-ink"
        href="#main"
      >
        {t('nav.skip')}
      </a>

      {/* Desktop sidebar - visible on md+ (768px+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[200px] flex-col border-r border-rule bg-plate md:flex">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center border border-ink text-[11px] font-semibold tracking-[0.1em]">
            PT
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium leading-tight">
              {t('app.name')}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-dim">
              {t('app.tagline')}
            </p>
          </div>
        </div>

        <nav className="relative flex-1 border-t border-rule-soft pt-2">
          <span
            aria-hidden
            className="absolute bottom-0 left-[38px] top-0 w-px bg-rule-soft"
          />
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                isActive
                  ? `${NAV_BASE} pl-[56px] text-ink before:absolute before:left-[32px] before:top-1/2 before:h-[2px] before:w-[17px] before:-translate-y-1/2 before:bg-signal before:shadow-[0_0_8px_rgba(244,197,66,0.45)] before:content-[""]`
                  : `${NAV_BASE} text-dim before:absolute before:left-[32px] before:top-1/2 before:h-px before:w-[9px] before:-translate-y-1/2 before:bg-current before:content-[""] hover:text-muted`
              }
              end={item.end}
              to={item.to}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-rule px-5 py-4">
          <p className="truncate text-[12px] text-muted">{user?.email}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-dim">
            {t('nav.accountsOnDevice', { count: accountCount })}
          </p>
          <button
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-dim transition hover:text-ink"
            onClick={() => void handleSignOut()}
            type="button"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <div className="md:pl-[200px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-rule bg-ground/90 px-4 backdrop-blur md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 md:hidden">
            <span className="grid h-7 w-7 shrink-0 place-items-center border border-ink text-[9px] font-semibold tracking-[0.06em]">
              PT
            </span>
            <span className="truncate text-[11px] uppercase tracking-[0.16em] text-dim">
              {currentLabel}
            </span>
          </div>

          <p className="hidden items-baseline gap-2 text-[11px] uppercase tracking-[0.18em] text-dim md:flex">
            <span>{t('app.name')}</span>
            <span aria-hidden className="text-rule">
              /
            </span>
            <span className="text-ink">{currentLabel}</span>
          </p>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {!online ? (
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-warning">
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('offline.badge')}</span>
              </span>
            ) : null}
            {user ? <SyncStatus /> : null}
            <NavLink
              aria-label={t('nav.settings')}
              className="grid h-9 w-9 place-items-center border border-rule text-[12px] font-medium text-ink transition hover:border-ink"
              to="/settings"
            >
              {initial}
            </NavLink>
          </div>
        </header>

        <main
          className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-6 md:pb-10 md:pt-6"
          id="main"
        >
          {!online ? (
            <div className="mb-5 flex items-start gap-2 border-l border-warning bg-warning/10 px-3 py-2 text-[12px] text-warning">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              {t('offline.banner')}
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

      {/* Mobile FAB - visible below md */}
      <NavLink
        aria-label={t('nav.addTask')}
        className="fixed bottom-[72px] right-4 z-30 grid h-12 w-12 place-items-center bg-action text-action-ink transition active:scale-95 md:hidden"
        to="/tasks/new"
      >
        <Plus className="h-5 w-5" strokeWidth={1.8} />
      </NavLink>

      {/* Mobile bottom nav - visible below md */}
      <nav
        aria-label={t('app.name')}
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-rule bg-ground/95 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              [
                'relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium uppercase tracking-[0.1em] transition',
                isActive ? 'text-ink' : 'text-dim',
              ].join(' ')
            }
            end={item.end}
            to={item.to}
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                <span className="leading-none">{t(item.labelKey)}</span>
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 mx-auto h-px w-7 bg-signal"
                  />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
