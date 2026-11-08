import { describe, expect, it } from 'vitest'
import { dictionaries } from '../src/features/i18n/dictionary'

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{[^}]+\}/g)].map((match) => match[0]).sort()
}

describe('i18n dictionaries', () => {
  it('Thai and English expose the same keys', () => {
    const thKeys = Object.keys(dictionaries.th).sort()
    const enKeys = Object.keys(dictionaries.en).sort()
    expect(enKeys).toEqual(thKeys)
  })

  it('every translation uses the same placeholders across locales', () => {
    for (const key of Object.keys(dictionaries.th) as Array<
      keyof typeof dictionaries.th
    >) {
      expect(
        placeholders(dictionaries.en[key]),
        `placeholder mismatch for ${key}`,
      ).toEqual(placeholders(dictionaries.th[key]))
    }
  })

  it('has no empty translations', () => {
    for (const locale of ['th', 'en'] as const) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value.trim(), `${locale}:${key}`).not.toBe('')
      }
    }
  })
})
