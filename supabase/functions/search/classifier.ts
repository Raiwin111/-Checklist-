// ============================================================================
// Rule-based source classifier
// ----------------------------------------------------------------------------
// No AI is involved: every result is classified with deterministic host,
// suffix-level and path rules. `is_ai_generated` stays false on the client.
//
// This file is intentionally dependency-free so it can be unit-tested with
// plain TypeScript runners.
// ============================================================================

export type SourceType =
  | 'academic'
  | 'news'
  | 'official'
  | 'documentation'
  | 'blog'
  | 'other'
  | 'unknown'

export type Confidence = 'high' | 'medium' | 'low' | 'unknown'

export type Classification = {
  sourceType: SourceType
  confidence: Confidence
  /** Kept as the original query so the UI can group results by topic. */
  topic: string | null
}

type Rule = {
  type: SourceType
  /** Full hostnames, matched on the host and every subdomain. */
  hosts?: string[]
  /** Host suffixes such as `.edu` or `.ac.th`. */
  suffixes?: string[]
  /** Path fragments that strengthen a host match. */
  pathHints?: string[]
}

const RULES: Rule[] = [
  {
    type: 'academic',
    hosts: [
      'arxiv.org',
      'scholar.google.com',
      'pubmed.ncbi.nlm.nih.gov',
      'ncbi.nlm.nih.gov',
      'ieee.org',
      'acm.org',
      'springer.com',
      'sciencedirect.com',
      'nature.com',
      'science.org',
      'researchgate.net',
      'jstor.org',
      'ssrn.com',
      'doi.org',
      'semanticscholar.org',
      'tandfonline.com',
      'sagepub.com',
      'wiley.com',
      'frontiersin.org',
      'mdpi.com',
      'thaijo.org',
    ],
    suffixes: [
      '.edu',
      '.ac.th',
      '.ac.uk',
      '.edu.au',
      '.ac.jp',
      '.edu.sg',
      '.ac.kr',
    ],
    pathHints: ['/paper', '/article', '/abstract', '/publication', '.pdf'],
  },
  {
    type: 'news',
    hosts: [
      'bbc.com',
      'bbc.co.uk',
      'cnn.com',
      'reuters.com',
      'apnews.com',
      'nytimes.com',
      'theguardian.com',
      'washingtonpost.com',
      'bloomberg.com',
      'ft.com',
      'economist.com',
      'thairath.co.th',
      'matichon.co.th',
      'khaosod.co.th',
      'prachatai.com',
      'bangkokpost.com',
      'thestandard.co',
      'pptvhd36.com',
      'thaipbs.or.th',
      'voicetv.co.th',
      'nationthailand.com',
    ],
    pathHints: ['/news', '/article', '/story', '/world', '/politics'],
  },
  {
    type: 'official',
    hosts: [
      'who.int',
      'un.org',
      'unesco.org',
      'worldbank.org',
      'oecd.org',
      'imf.org',
      'wto.org',
      'europa.eu',
      'nasa.gov',
    ],
    suffixes: ['.gov', '.go.th', '.gov.uk', '.mil'],
  },
  {
    type: 'documentation',
    hosts: [
      'developer.mozilla.org',
      'docs.python.org',
      'nodejs.org',
      'react.dev',
      'vuejs.org',
      'angular.io',
      'nextjs.org',
      'typescriptlang.org',
      'supabase.com',
      'postgresql.org',
      'dev.mysql.com',
      'docs.docker.com',
      'kubernetes.io',
      'w3.org',
      'npmjs.com',
      'pypi.org',
      'stackoverflow.com',
      'github.com',
      'gitlab.com',
    ],
    suffixes: ['.readthedocs.io'],
    pathHints: ['/docs', '/documentation', '/api', '/reference', '/manual'],
  },
  {
    type: 'blog',
    hosts: [
      'medium.com',
      'dev.to',
      'substack.com',
      'wordpress.com',
      'blogspot.com',
      'hashnode.dev',
      'techtalkthai.com',
    ],
    pathHints: ['/blog', '/posts', '/post', '/article'],
  },
  {
    type: 'other',
    hosts: [
      'wikipedia.org',
      'youtube.com',
      'reddit.com',
      'quora.com',
      'facebook.com',
      'x.com',
      'twitter.com',
      'linkedin.com',
      'pinterest.com',
      'instagram.com',
      'tiktok.com',
    ],
  },
]

const HOST_PREFIXES = ['www.', 'm.', 'mobile.']

function normalizeHost(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return ''
  }
}

function stripPrefixes(host: string): string {
  let result = host
  for (const prefix of HOST_PREFIXES) {
    if (result.startsWith(prefix)) result = result.slice(prefix.length)
  }
  return result
}

function matchesHost(host: string, candidates: string[]): boolean {
  const bare = stripPrefixes(host)
  return candidates.some(
    (candidate) => bare === candidate || bare.endsWith(`.${candidate}`),
  )
}

function matchesSuffix(host: string, suffixes: string[]): boolean {
  const bare = stripPrefixes(host)
  return suffixes.some(
    (suffix) => bare.endsWith(suffix) || bare === suffix.slice(1),
  )
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase()
  } catch {
    return ''
  }
}

function hasPathHint(path: string, hints: string[]): boolean {
  return hints.some((hint) => path.includes(hint))
}

/**
 * Classify a single search result.
 *
 * Confidence:
 *   high    – host rule + at least one supporting path signal
 *   medium  – host or government/academic suffix matched
 *   low     – only a generic path or `.pdf` heuristic matched
 *   unknown – no rule matched
 */
export function classifySource(
  url: string,
  query?: string | null,
): Classification {
  const topic = query?.trim() ? query.trim() : null
  const host = normalizeHost(url)
  const path = pathOf(url)

  if (!host) {
    return { sourceType: 'unknown', confidence: 'unknown', topic }
  }

  for (const rule of RULES) {
    const hostMatch =
      (rule.hosts && matchesHost(host, rule.hosts)) ||
      (rule.suffixes && matchesSuffix(host, rule.suffixes))

    if (!hostMatch) continue

    const pathMatch = rule.pathHints
      ? hasPathHint(path, rule.pathHints)
      : false

    if (rule.type === 'other') {
      return { sourceType: 'other', confidence: 'low', topic }
    }

    return {
      sourceType: rule.type,
      confidence: pathMatch ? 'high' : 'medium',
      topic,
    }
  }

  // A direct PDF is usually a paper even when the host is unfamiliar.
  if (path.endsWith('.pdf')) {
    return { sourceType: 'academic', confidence: 'low', topic }
  }

  const genericHints: Array<[SourceType, string[]]> = [
    ['documentation', ['/docs', '/documentation', '/api-reference']],
    ['blog', ['/blog/', '/posts/']],
    ['news', ['/news/', '/article/']],
  ]

  for (const [type, hints] of genericHints) {
    if (hasPathHint(path, hints)) {
      return { sourceType: type, confidence: 'low', topic }
    }
  }

  return { sourceType: 'unknown', confidence: 'unknown', topic }
}

/** `https://www.example.com/a` → `example.com` */
export function sourceNameFromUrl(url: string): string {
  return stripPrefixes(normalizeHost(url))
}
