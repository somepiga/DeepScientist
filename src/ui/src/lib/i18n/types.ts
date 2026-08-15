export type UILanguage = 'zh-CN'

export const UI_LANGUAGES: UILanguage[] = ['zh-CN']

export const UI_LANGUAGE_INTL_LOCALES: Record<UILanguage, string> = {
  'zh-CN': 'zh-CN',
}

export const UI_LANGUAGE_LABEL_KEYS: Record<UILanguage, string> = {
  'zh-CN': 'language_chinese',
}

export const UI_LANGUAGE_NATIVE_LABELS: Record<UILanguage, string> = {
  'zh-CN': '中文',
}

export const NATIONALITY_DEFAULT_LANGUAGE_MAP: Record<string, UILanguage> = {
  CN: 'zh-CN',
}

const LANGUAGE_ALIAS_MAP: Record<string, UILanguage> = {
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  chinese: 'zh-CN',
  'chinese-simplified': 'zh-CN',
  'simplified-chinese': 'zh-CN',
  '中文': 'zh-CN',
}

export function normalizeUILanguage(value: unknown, fallback: UILanguage = 'zh-CN'): UILanguage {
  if (typeof value !== 'string') return fallback
  const token = value.trim()
  if (!token) return fallback

  const normalized = token.toLowerCase().replace(/_/g, '-')
  return LANGUAGE_ALIAS_MAP[normalized] || fallback
}

export function getIntlLocaleForUILanguage(language: UILanguage): string {
  return UI_LANGUAGE_INTL_LOCALES[language] || UI_LANGUAGE_INTL_LOCALES['zh-CN']
}

export function getDefaultLanguageFromNationality(value: unknown): UILanguage {
  if (typeof value !== 'string') return 'zh-CN'
  const normalized = value.trim().toUpperCase()
  if (!normalized) return 'zh-CN'
  return NATIONALITY_DEFAULT_LANGUAGE_MAP[normalized] || 'zh-CN'
}
