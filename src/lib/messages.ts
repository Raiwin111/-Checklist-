import {
  dictionaries,
  type Locale,
  type TranslationKey,
} from '../features/i18n/dictionary'

let messageLocale: Locale = 'th'

export function setMessageLocale(locale: Locale) {
  messageLocale = locale
}

/** Translate outside React (service layer, error mapping, etc.). */
export function tr(
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let text = dictionaries[messageLocale][key] ?? dictionaries.th[key] ?? key
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(replacement))
    }
  }
  return text
}
