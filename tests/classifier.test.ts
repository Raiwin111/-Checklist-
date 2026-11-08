import { describe, expect, it } from 'vitest'
import {
  classifySource,
  sourceNameFromUrl,
} from '../supabase/functions/search/classifier'

describe('classifySource — host rules', () => {
  it('classifies a known academic host as academic', () => {
    expect(classifySource('https://arxiv.org/abs/2401.00001').sourceType).toBe(
      'academic',
    )
  })

  it('raises confidence when a path hint matches', () => {
    expect(
      classifySource('https://www.nature.com/articles/xyz').confidence,
    ).toBe('high')
  })

  it('classifies academic suffixes such as .ac.th', () => {
    const result = classifySource('https://www.chula.ac.th/news/1')
    expect(result.sourceType).toBe('academic')
    expect(result.confidence).toBe('medium')
  })

  it('classifies news hosts', () => {
    expect(classifySource('https://www.bbc.com/news/world').sourceType).toBe(
      'news',
    )
  })

  it('classifies government suffixes as official', () => {
    expect(classifySource('https://www.doe.go.th/page').sourceType).toBe(
      'official',
    )
  })

  it('classifies documentation hosts', () => {
    expect(
      classifySource('https://developer.mozilla.org/docs/Web/API').sourceType,
    ).toBe('documentation')
  })

  it('classifies blog platforms', () => {
    expect(classifySource('https://medium.com/@a/post').sourceType).toBe('blog')
  })

  it('classifies social/wiki hosts as other with low confidence', () => {
    const result = classifySource('https://en.wikipedia.org/wiki/Test')
    expect(result.sourceType).toBe('other')
    expect(result.confidence).toBe('low')
  })
})

describe('classifySource — fallbacks', () => {
  it('treats an unknown direct PDF as academic with low confidence', () => {
    const result = classifySource('https://example.com/files/paper.pdf')
    expect(result.sourceType).toBe('academic')
    expect(result.confidence).toBe('low')
  })

  it('uses generic path hints on unknown hosts', () => {
    expect(
      classifySource('https://example.com/docs/getting-started').sourceType,
    ).toBe('documentation')
  })

  it('returns unknown when nothing matches', () => {
    expect(classifySource('https://example.com/about').sourceType).toBe(
      'unknown',
    )
  })

  it('returns unknown for an invalid URL', () => {
    expect(classifySource('not a url').sourceType).toBe('unknown')
  })

  it('keeps a trimmed query as the topic', () => {
    expect(classifySource('https://arxiv.org/abs/1', '  deep learning  ').topic)
      .toBe('deep learning')
  })

  it('returns a null topic when the query is blank', () => {
    expect(classifySource('https://arxiv.org/abs/1', '   ').topic).toBeNull()
  })
})

describe('sourceNameFromUrl', () => {
  it('strips www and mobile prefixes', () => {
    expect(sourceNameFromUrl('https://www.example.com/a')).toBe('example.com')
    expect(sourceNameFromUrl('https://m.example.com/a')).toBe('example.com')
  })

  it('returns an empty string for invalid input', () => {
    expect(sourceNameFromUrl('nope')).toBe('')
  })
})
