import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { ExternalLink, History, Loader2, Search, Trash2 } from 'lucide-react'
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
import type { ConfidenceLevel, SourceType } from '../types/database'
import {
  btnPrimary,
  errorBox,
  fieldLine,
  label,
  pageLead,
  pageTitle,
  warningBox,
} from '../lib/ui'

const sourceTypeTone: Record<SourceType, string> = {
  academic: 'text-status-todo',
  news: 'text-status-hold',
  official: 'text-status-done',
  documentation: 'text-signal',
  blog: 'text-muted',
  other: 'text-dim',
  unknown: 'text-dim',
}

const confidenceTone: Record<ConfidenceLevel, string> = {
  high: 'text-status-done',
  medium: 'text-signal',
  low: 'text-muted',
  unknown: 'text-dim',
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
    <div className="space-y-7">
      <header className="border-b border-rule pb-6">
        <h1 className={pageTitle}>{t('search.title')}</h1>
        <p className={pageLead}>{t('search.subtitle')}</p>
      </header>

      {error ? <p className={errorBox}>{error}</p> : null}
      {warning ? <p className={warningBox}>{warning}</p> : null}

      <form
        className="flex flex-col gap-3 border-b border-rule pb-5 sm:flex-row sm:items-end"
        onSubmit={handleSearch}
      >
        <div className="min-w-0 flex-1">
          <label className={label} htmlFor="research-query">
            {t('search.placeholder')}
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
            />
            <input
              id="research-query"
              className={`${fieldLine} pl-6 text-[15px]`}
              maxLength={200}
              minLength={2}
              placeholder={t('search.placeholder')}
              required
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <button className={btnPrimary} disabled={searching} type="submit">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {searching ? t('search.searching') : t('search.button')}
        </button>
      </form>

      {active ? (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
            <h2 className={label}>
              {t('search.resultsFor', { query: active.query })}
            </h2>
            <span className="text-[10px] tabular-nums text-dim">
              {t('search.resultCount', { count: active.results.length })}
            </span>
          </div>

          {active.results.length === 0 ? (
            <div className="border-b border-rule py-12 text-center">
              <p className="text-[13px] font-medium">{t('search.noResults')}</p>
              <p className="mt-1 text-[11px] text-dim">
                {t('search.noResultsHint')}
              </p>
            </div>
          ) : (
            <ul>
              {active.results.map((result) => (
                <li
                  key={`${result.url}-${result.title}`}
                  className="border-b border-rule-soft py-4"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.12em]">
                    <span className={sourceTypeTone[result.sourceType]}>
                      {t(`search.sourceType.${result.sourceType}`)}
                    </span>
                    <span className={confidenceTone[result.confidence]}>
                      {t(`search.confidence.${result.confidence}`)}
                    </span>
                    <span className="truncate normal-case tracking-normal text-dim">
                      {result.sourceName || domainOf(result.url)}
                    </span>
                  </div>

                  <a
                    className="mt-2 inline-flex items-start gap-1.5 text-[15px] font-medium text-ink transition hover:text-signal"
                    href={result.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {result.title || result.url}
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0" />
                  </a>

                  {result.snippet ? (
                    <p className="mt-1 text-[12px] leading-relaxed text-muted">
                      {result.snippet}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="border-y border-rule py-14 text-center">
          <div
            aria-hidden
            className="mx-auto flex h-10 w-10 items-center justify-center border border-rule text-dim"
          >
            <Search className="h-4 w-4" />
          </div>
          <h2 className="mt-4 text-[15px] font-medium">{t('search.empty')}</h2>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-muted">
            {t('search.emptyHint')}
          </p>
        </div>
      )}

      <section className="border-t border-rule pt-5">
        <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
          <h2 className={`${label} flex items-center gap-2`}>
            <History className="h-3.5 w-3.5" />
            {t('search.history')}
          </h2>
          <span className="text-[10px] tabular-nums text-dim">
            {history.length}
          </span>
        </div>

        {historyLoading ? (
          <p className="mt-4 flex items-center gap-2 text-[12px] text-dim">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('common.loading')}
          </p>
        ) : history.length === 0 ? (
          <div className="border-b border-rule-soft py-8 text-center">
            <p className="text-[13px] text-muted">{t('search.historyEmpty')}</p>
            <p className="mt-1 text-[11px] text-dim">{t('search.historyHint')}</p>
          </div>
        ) : (
          <ul>
            {history.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">
                    {session.query}
                  </p>
                  <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-dim">
                    {formatDateTime(session.created_at)} ·{' '}
                    {t('search.historyResultCount', {
                      count: session.results.length,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    className="inline-flex min-h-11 items-center border border-rule px-3 text-[9px] font-medium uppercase tracking-[0.12em] text-muted transition hover:border-ink hover:text-ink"
                    onClick={() => openSession(session)}
                    type="button"
                  >
                    {t('search.historyOpen')}
                  </button>
                  <button
                    aria-label={t('search.historyDeleteAria')}
                    className="inline-flex h-11 w-11 items-center justify-center text-dim transition hover:text-danger"
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
