import type { Locale } from '@/lib/domain/types'
import { ko, type Dict, type DictKey } from './ko'
import { en } from './en'
import { ja } from './ja'

export type { DictKey }
export const dictionaries: Record<Locale, Dict> = { ko, en, ja }
export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

export type Vars = Record<string, string | number>

export function translate(locale: Locale, key: DictKey, vars?: Vars): string {
  let text = dictionaries[locale][key] ?? ko[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
  return text
}

export function exerciseName(ex: { name: string }, locale: Locale): string {
  if (!ex.name.startsWith('@')) return ex.name
  const key = `ex.${ex.name.slice(1)}` as DictKey
  return dictionaries[locale][key] ?? ex.name.slice(1)
}

export function detectLocale(languages: readonly string[]): Locale {
  for (const lang of languages) {
    const base = lang.toLowerCase().split('-')[0]
    if (base === 'ko' || base === 'en' || base === 'ja') return base
  }
  return 'ko'
}
