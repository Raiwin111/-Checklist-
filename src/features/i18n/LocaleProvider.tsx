import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, type Locale } from './dictionary'
import { I18nContext, type I18nContextValue } from './context'
import { setFormatLocale } from '../../lib/format'
import { setMessageLocale } from '../../lib/messages'

const STORAGE_KEY = 'ptrs.locale'

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'th') return stored
  } catch {
    // localStorage may be unavailable in private contexts.
  }
  return 'th'
}

const initialLocale = readStoredLocale()
setFormatLocale(initialLocale)
setMessageLocale(initialLocale)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    setFormatLocale(locale)
    setMessageLocale(locale)
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Ignore storage failures; the session still works in memory.
    }
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = dictionaries[locale]

    return {
      locale,
      setLocale,
      t(key, vars) {
        let text = dictionary[key] ?? dictionaries.th[key] ?? key
        if (vars) {
          for (const [name, replacement] of Object.entries(vars)) {
            text = text.replaceAll(`{${name}}`, String(replacement))
          }
        }
        return text
      },
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
