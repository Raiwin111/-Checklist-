import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import {
  ExternalLink,
  History,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useI18n } from '../features/i18n/context'
import {
  deleteSearchSession,
  fetchSearchHistory,
  runSearch,
  saveSearchSession,
  type SearchHistorySession,
  type SearchResponse,
} from '../lib/api/search'
import { getErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/format'
import type {
  ConfidenceLevel,
  SourceType,
} from '../types/database'

const sourceTypeClasses: Record<SourceType, string> = {
  academic:
    'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  news: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  official:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  documentation:
    'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  blog: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  other:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  unknown:
    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

const confidenceClasses: Record<ConfidenceLevel, string> = {
  high: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  low: 'text-slate-500 dark:text-slate-400',
  unknown: 'text-slate-400 dark:text-slate-500',
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function SearchPage() {
  const { user } = useAuth()
  const { t, locale } = useI18n()

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [active, setActive] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const [history, setHistory] = useState<SearchHistorySession[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const [sessionToDelete, setSessionToDelete] =
    useState<SearchHistorySession | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!user) return

    try {
      const sessions = await fetchSearchHistory(user.id)
      setHistory(sessions)
    } catch (historyError) {
      console.error('Failed to load search history', historyError)
    } finally {
      setHistoryLoading(false)
    }
  }, [user])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setError(t('search.queryTooShort'))
      return
    }

    setSearching(true)
    setError(null)
    setWarning(null)

    try {
      const response = await runSearch(trimmed, locale)
      setActive(response)

      if (user) {
        try {
          await saveSearchSession(user.id, response)
          await loadHistory()
        } catch (saveError) {
          console.error('Failed to save search history', saveError)
          setWarning(t('search.historySaveFailed'))
        }
      }
    } catch (searchError) {
      setError(getErrorMessage(searchError))
    } finally {
      setSearching(false)
    }
  }

  function openSession(session: SearchHistorySession) {
    setActive({
      query: session.query,
      fetchedAt: session.created_at,
      results: session.results.map((result) => ({
        title: result.source_name,
        url: result.source_url,
        sourceName: domainOf(result.source_url),
        snippet: result.summary ?? '',
        sourceType: result.source_type,
        topic: result.topic,
        confidence: result.confidence,
      })),
    })
    setQuery(session.query)
    setError(null)
    setWarning(null)
  }

  async function handleDeleteSession() {
    if (!sessionToDelete) return

    setDeleting(true)
    setError(null)

    try {
      await deleteSearchSession(sessionToDelete.id)
      setSessionToDelete(null)
      await loadHistory()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setSessionToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('search.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('search.subtitle')}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {warning ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {warning}
        </div>
      ) : null}

      <form
        className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row"
        onSubmit={handleSearch}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={t('search.placeholder')}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            maxLength={200}
            minLength={2}
            placeholder={t('search.placeholder')}
            required
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={searching}
          type="submit"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {searching ? t('search.searching') : t('search.button')}
        </button>
      </form>

      {active ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {t('search.resultsFor', { query: active.query })}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t('search.resultCount', { count: active.results.length })}
            </span>
          </div>

          {active.results.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
              <p className="text-sm font-medium">{t('search.noResults')}</p>
              <p className="mt-1 text-xs text-slate-400">
                {t('search.noResultsHint')}
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {active.results.map((result) => (
                <li
                  key={`${result.url}-${result.title}`}
                  className="rounded-xl border border-slate-100 px-4 py-3 transition hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-500/30"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${sourceTypeClasses[result.sourceType]}`}
                    >
                      {t(`search.sourceType.${result.sourceType}`)}
                    </span>
                    <span
                      className={`font-medium ${confidenceClasses[result.confidence]}`}
                    >
                      {t(`search.confidence.${result.confidence}`)}
                    </span>
                    <span className="truncate text-slate-400">
                      {result.sourceName || domainOf(result.url)}
                    </span>
                  </div>

                  <a
                    className="mt-2 inline-flex items-start gap-1.5 text-sm font-semibold text-indigo-700 transition hover:underline dark:text-indigo-300"
                    href={result.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {result.title || result.url}
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  </a>

                  {result.snippet ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {result.snippet}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Search className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-base font-semibold">{t('search.empty')}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {t('search.emptyHint')}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold">{t('search.history')}</h2>
        </div>

        {historyLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : history.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('search.historyEmpty')}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {t('search.historyHint')}
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {session.query}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDateTime(session.created_at)} ·{' '}
                    {t('search.historyResultCount', {
                      count: session.results.length,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    onClick={() => openSession(session)}
                    type="button"
                  >
                    {t('search.historyOpen')}
                  </button>
                  <button
                    aria-label={t('search.historyDeleteAria')}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    onClick={() => setSessionToDelete(session)}
                    title={t('search.historyDeleteAria')}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        busy={deleting}
        danger
        confirmLabel={t('search.deleteConfirm')}
        description={
          sessionToDelete
            ? t('search.deleteDescription', { query: sessionToDelete.query })
            : ''
        }
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => void handleDeleteSession()}
        open={sessionToDelete !== null}
        title={t('search.deleteTitle')}
      />
    </div>
  )
}
