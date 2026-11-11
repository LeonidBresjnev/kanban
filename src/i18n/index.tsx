/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, type ReactNode } from 'react'
import da from './da'
import en from './en'

export const translations = {
  da,
  en,
} as const

export type LanguageCode = keyof typeof translations
type TranslationValue = string | { readonly [key: string]: TranslationValue }
export type TranslationParams = Record<string, string | number>
export type TranslationKey = string

interface LanguageOption {
  code: LanguageCode
  label: string
  flag: string
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
] as const

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

export interface I18nContextValue {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
  supportedLanguages: readonly LanguageOption[]
}

export const I18nContext = createContext<I18nContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, params = {}) => getTranslation(DEFAULT_LANGUAGE, key, params),
  supportedLanguages: SUPPORTED_LANGUAGES,
})

export function getTranslation(lang: LanguageCode, keyPath: TranslationKey, params: TranslationParams = {}): string {
  const dict = translations[lang] || translations[DEFAULT_LANGUAGE]
  const keys = keyPath.split('.')
  let current: TranslationValue | undefined = dict

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k]
    } else {
      let fallback: TranslationValue | null = translations[DEFAULT_LANGUAGE]
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk]
        } else {
          fallback = null
          break
        }
      }
      current = fallback || keyPath
      break
    }
  }

  if (typeof current !== 'string') {
    return keyPath
  }

  let result = current
  Object.keys(params).forEach((paramKey) => {
    result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params[paramKey]))
  })

  return result
}

interface I18nProviderProps {
  children: ReactNode
  initialLanguage?: LanguageCode
}

export function I18nProvider({ children, initialLanguage }: I18nProviderProps) {
  const [language, setLanguageState] = useState(() => {
    if (initialLanguage && translations[initialLanguage]) {
      return initialLanguage
    }
    try {
      const saved = localStorage.getItem('app_language')
      if (saved && saved in translations) {
        return saved as LanguageCode
      }
    } catch {
      // Ignore localStorage access errors
    }
    return DEFAULT_LANGUAGE
  })

  const setLanguage = (newLang: LanguageCode) => {
    if (translations[newLang]) {
      setLanguageState(newLang)
      try {
        localStorage.setItem('app_language', newLang)
      } catch {
        // Ignore localStorage access errors
      }
    }
  }

  const t = (keyPath: TranslationKey, params: TranslationParams = {}) => {
    return getTranslation(language, keyPath, params)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}
