import type { Metadata } from 'next'
import {
  HREF_LANG,
  isLocale,
  toPublicPath,
  type Locale,
} from '../i18n/locales.ts'
import { getPostModifiedDate } from './post-dates.ts'

const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  ko: 'ko_KR',
  en: 'en_US',
  ja: 'ja_JP',
  es: 'es_ES',
  'pt-BR': 'pt_BR',
  'zh-CN': 'zh_CN',
}

export function truncateMetadataText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()

  if ([...normalized].length <= maxLength) return normalized

  const characters = [...normalized]
  const candidate = characters.slice(0, maxLength - 1).join('').trimEnd()
  const lastSpace = candidate.lastIndexOf(' ')
  const shortened = lastSpace >= Math.floor(maxLength * 0.6)
    ? candidate.slice(0, lastSpace).trimEnd()
    : candidate

  return `${shortened}…`
}

export function getOpenGraphLocale(locale: Locale): string {
  return OPEN_GRAPH_LOCALE[locale]
}

export function getLocalizedOpenGraphImageUrl(
  siteUrl: string,
  locale: Locale,
): string {
  const baseUrl = siteUrl.replace(/\/+$/, '')
  return `${baseUrl}${toPublicPath(locale, '/opengraph-image')}`
}

type MetadataPost = {
  contentLocale: string
  translationKey: string
  slug: string
  title: string
  seoTitle?: string
  description?: string
  excerpt: string
  keywords?: string
  categoryArray: string[]
  date: string
  updatedAt?: string
}

type SiteMetadataInput = {
  siteUrl: string
  siteName: string
  authorName: string
}

export function buildTranslationAlternates(
  translations: readonly MetadataPost[],
  siteUrl: string,
): Record<string, string> {
  const baseUrl = siteUrl.replace(/\/+$/, '')
  const languages = Object.fromEntries(
    translations.flatMap(translation =>
      isLocale(translation.contentLocale)
        ? [[HREF_LANG[translation.contentLocale], `${baseUrl}${translation.slug}`]]
        : [],
    ),
  )
  const korean = translations.find(translation => translation.contentLocale === 'ko')

  if (korean) {
    languages['x-default'] = `${baseUrl}${korean.slug}`
  }

  return languages
}

export function buildLocalizedPostMetadata(
  post: MetadataPost,
  translations: readonly MetadataPost[],
  site: SiteMetadataInput,
): Metadata {
  if (!isLocale(post.contentLocale)) {
    throw new Error(`Unsupported post locale: ${post.contentLocale}`)
  }

  const baseUrl = site.siteUrl.replace(/\/+$/, '')
  const languages = buildTranslationAlternates(translations, baseUrl)

  const url = `${baseUrl}${post.slug}`
  const title = truncateMetadataText(post.seoTitle || post.title, 60)
  const description = truncateMetadataText(post.description || post.excerpt, 155)
  const keywords = post.keywords
    ? post.keywords.split(',').map(keyword => keyword.trim())
    : post.categoryArray

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description,
      url,
      images: [`${url}/opengraph-image`],
      type: 'article',
      publishedTime: post.date,
      modifiedTime: getPostModifiedDate(post),
      authors: [site.authorName],
      tags: post.categoryArray,
      locale: getOpenGraphLocale(post.contentLocale),
      siteName: site.siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
