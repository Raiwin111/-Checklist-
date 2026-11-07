// ============================================================================
// Edge Function: search
// ----------------------------------------------------------------------------
// Runs a Google search through SerpAPI and classifies every organic result
// with deterministic rules. The SerpAPI key lives only in function secrets.
//
// Security:
//   - The caller must send a valid Supabase JWT (verified server-side).
//   - The browser never sees SERPAPI_API_KEY.
//   - Search history is written by the client through RLS-protected tables.
//
// Deploy:
//   supabase secrets set SERPAPI_API_KEY=...
//   supabase functions deploy search
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  classifySource,
  sourceNameFromUrl,
  type Confidence,
  type SourceType,
} from './classifier.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RESULTS = 10
const MAX_QUERY_LENGTH = 200

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type SerpApiResult = {
  title?: string
  link?: string
  snippet?: string
  displayed_link?: string
}

type SerpApiResponse = {
  error?: string
  organic_results?: SerpApiResult[]
}

type SearchResult = {
  title: string
  url: string
  sourceName: string
  snippet: string
  sourceType: SourceType
  topic: string | null
  confidence: Confidence
  classificationMethod: 'rule_based'
  isAiGenerated: false
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serpApiKey = Deno.env.get('SERPAPI_API_KEY')

  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Server is misconfigured' }, 500)
  }

  if (!serpApiKey) {
    return json(
      { error: 'Search is not configured (missing SERPAPI_API_KEY)' },
      500,
    )
  }

  // 1. Identify the caller from their own JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return json({ error: 'Invalid or expired session' }, 401)
  }

  // 2. Validate the payload.
  let body: { query?: unknown; locale?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const rawQuery = typeof body.query === 'string' ? body.query.trim() : ''
  if (rawQuery.length < 2) {
    return json({ error: 'Query must be at least 2 characters' }, 400)
  }
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return json(
      { error: `Query must be at most ${MAX_QUERY_LENGTH} characters` },
      400,
    )
  }

  const locale = body.locale === 'en' ? 'en' : 'th'
  const hl = locale
  const gl = locale === 'th' ? 'th' : 'us'

  // 3. Call SerpAPI.
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google')
  url.searchParams.set('q', rawQuery)
  url.searchParams.set('api_key', serpApiKey)
  url.searchParams.set('num', String(MAX_RESULTS))
  url.searchParams.set('hl', hl)
  url.searchParams.set('gl', gl)
  url.searchParams.set('safe', 'active')

  let serpData: SerpApiResponse
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      console.error('SerpAPI HTTP error', response.status)
      return json({ error: 'Search provider is unavailable' }, 502)
    }

    serpData = (await response.json()) as SerpApiResponse
  } catch (fetchError) {
    console.error('SerpAPI request failed', fetchError)
    return json({ error: 'Search provider is unavailable' }, 502)
  }

  if (serpData.error) {
    console.error('SerpAPI returned an error', serpData.error)
    return json({ error: 'Search provider rejected the request' }, 502)
  }

  // 4. Normalise + classify.
  const results: SearchResult[] = (serpData.organic_results ?? [])
    .slice(0, MAX_RESULTS)
    .map((item) => {
      const link = typeof item.link === 'string' ? item.link : ''
      const title = typeof item.title === 'string' ? item.title : ''
      const snippet = typeof item.snippet === 'string' ? item.snippet : ''
      const classification = classifySource(link, rawQuery)

      return {
        title,
        url: link,
        sourceName: sourceNameFromUrl(link) || item.displayed_link || '',
        snippet,
        sourceType: classification.sourceType,
        topic: classification.topic,
        confidence: classification.confidence,
        classificationMethod: 'rule_based' as const,
        isAiGenerated: false as const,
      }
    })
    .filter((item) => item.url.length > 0)

  return json({
    query: rawQuery,
    results,
    provider: 'serpapi',
    fetchedAt: new Date().toISOString(),
  })
})
