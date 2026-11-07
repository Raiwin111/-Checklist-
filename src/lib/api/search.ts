import { supabase } from '../supabase'
import { tr } from '../messages'
import type {
  ConfidenceLevel,
  SearchResult,
  SearchSession,
  SourceType,
} from '../../types/database'

export type SearchHit = {
  title: string
  url: string
  sourceName: string
  snippet: string
  sourceType: SourceType
  topic: string | null
  confidence: ConfidenceLevel
}

export type SearchResponse = {
  query: string
  results: SearchHit[]
  fetchedAt: string
}

export type SearchHistorySession = SearchSession & {
  results: SearchResult[]
}

type SearchFunctionResponse = SearchResponse & {
  error?: string
  provider?: string
}

function mapServerError(raw: string): string {
  const value = raw.toLowerCase()

  if (value.includes('not configured') || value.includes('serpapi_api_key')) {
    return tr('search.notConfigured')
  }
  if (value.includes('provider')) {
    return tr('search.providerUnavailable')
  }
  if (value.includes('query')) {
    return tr('search.queryTooShort')
  }
  if (value.includes('session')) {
    return tr('search.sessionExpired')
  }
  return raw
}

/** Runs a SerpAPI-backed search through the `search` Edge Function. */
export async function runSearch(
  query: string,
  locale: 'th' | 'en',
): Promise<SearchResponse> {
  const trimmed = query.trim()
  if (trimmed.length < 2) throw new Error(tr('search.queryTooShort'))

  const { data, error } = await supabase.functions.invoke<SearchFunctionResponse>(
    'search',
    { method: 'POST', body: { query: trimmed, locale } },
  )

  if (error) {
    let message = error.message || tr('search.failed')
    const context = (error as { context?: Response }).context
    const status = context?.status

    if (status === 404 || error.name === 'FunctionsFetchError') {
      message = tr('search.notDeployed')
    }

    if (context && status !== 404) {
      try {
        const body = (await context.clone().json()) as { error?: string }
        if (body?.error) message = mapServerError(body.error)
      } catch {
        // Keep the original message when the body is not JSON.
      }
    }

    throw new Error(message)
  }

  if (!data) throw new Error(tr('search.failed'))
  if (data.error) throw new Error(mapServerError(data.error))

  return {
    query: data.query,
    results: Array.isArray(data.results) ? data.results : [],
    fetchedAt: data.fetchedAt ?? new Date().toISOString(),
  }
}

/**
 * Persists a search and its classified results.
 *
 * `search_results` has no title column, so the page title is stored in
 * `source_name`; the domain is derived from `source_url` in the UI.
 */
export async function saveSearchSession(
  userId: string,
  response: SearchResponse,
): Promise<void> {
  const { data: session, error: sessionError } = await supabase
    .from('search_sessions')
    .insert({ user_id: userId, query: response.query })
    .select('id')
    .single()

  if (sessionError) throw sessionError
  if (response.results.length === 0) return

  const rows = response.results.map((result) => ({
    session_id: session.id,
    user_id: userId,
    source_name: result.title || result.sourceName || result.url,
    source_url: result.url,
    source_type: result.sourceType,
    topic: result.topic,
    summary: result.snippet || null,
    classification_method: 'rule_based' as const,
    is_ai_generated: false,
    confidence: result.confidence,
  }))

  const { error: resultsError } = await supabase
    .from('search_results')
    .insert(rows)

  if (resultsError) throw resultsError
}

/** Latest search sessions with their results, newest first. */
export async function fetchSearchHistory(
  userId: string,
  limit = 20,
): Promise<SearchHistorySession[]> {
  const { data, error } = await supabase
    .from('search_sessions')
    .select(
      'id, user_id, query, created_at, results:search_results(id, session_id, user_id, source_name, source_url, source_type, topic, summary, classification_method, is_ai_generated, confidence, created_at)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as SearchHistorySession[]
}

export async function deleteSearchSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('search_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}
