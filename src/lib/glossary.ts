import { isLocale, type Locale } from '../i18n/locales.ts'

export type GlossaryEntry = {
  name: string
  definition: string
}

export type GlossarySource = Record<
  string,
  Partial<Record<Locale, GlossaryEntry>>
>

export type GlossaryLocale = Record<string, GlossaryEntry>

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateGlossarySource(value: unknown): string[] {
  if (!isRecord(value)) return ['glossary: expected an object']

  const errors: string[] = []
  for (const [key, locales] of Object.entries(value)) {
    if (!KEY_PATTERN.test(key)) errors.push(`${key}: invalid glossary key`)
    if (!isRecord(locales)) {
      errors.push(`${key}: expected a locale object`)
      continue
    }
    if (Object.keys(locales).length === 0) {
      errors.push(`${key}: expected at least one locale`)
    }

    for (const [locale, entry] of Object.entries(locales)) {
      if (!isLocale(locale)) {
        errors.push(`${key}.${locale}: unsupported locale`)
        continue
      }
      if (!isRecord(entry)) {
        errors.push(`${key}.${locale}: expected an entry object`)
        continue
      }

      for (const field of Object.keys(entry)) {
        if (field !== 'name' && field !== 'definition') {
          errors.push(`${key}.${locale}.${field}: unsupported field`)
        }
      }

      for (const field of ['name', 'definition'] as const) {
        if (typeof entry[field] !== 'string' || !entry[field].trim()) {
          errors.push(`${key}.${locale}.${field}: expected a non-empty string`)
        }
      }
    }
  }

  return errors
}

export function assertGlossarySource(
  value: unknown,
): asserts value is GlossarySource {
  const errors = validateGlossarySource(value)
  if (errors.length > 0) {
    throw new Error(`Invalid glossary:\n${errors.join('\n')}`)
  }
}

export function getGlossaryForLocale(
  source: GlossarySource,
  locale: Locale,
): GlossaryLocale {
  return Object.fromEntries(
    Object.entries(source).flatMap(([key, entries]) => {
      const entry = entries[locale]
      return entry ? [[key, entry]] : []
    }),
  )
}
