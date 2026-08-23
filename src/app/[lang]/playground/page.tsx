import { siteMetadata } from '@/lib/site-metadata'
import ProjectCard from '@/components/ProjectCard'
import type { Metadata } from 'next'
import { getDictionary } from '@/i18n/dictionaries'
import { getLanguageAlternates, isLocale, toPublicPath } from '@/i18n/locales'
import {
  getLocalizedOpenGraphImageUrl,
  getOpenGraphLocale,
} from '@/lib/localized-metadata'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const dictionary = getDictionary(lang)
  const title = `${dictionary.playground.title} · ${siteMetadata.title}`
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, '/playground')}`

  return {
    title: { absolute: title },
    description: dictionary.playground.description,
    alternates: {
      canonical: url,
      languages: getLanguageAlternates(siteMetadata.siteUrl, '/playground'),
    },
    openGraph: {
      title,
      description: dictionary.playground.description,
      url,
      images: [getLocalizedOpenGraphImageUrl(siteMetadata.siteUrl, lang)],
      type: 'website',
      locale: getOpenGraphLocale(lang),
      siteName: siteMetadata.title,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: dictionary.playground.description,
    },
    robots: { index: false, follow: true },
  }
}

export default async function PlaygroundPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dictionary = getDictionary(lang)
  return (
    <div className="py-10 sm:py-16">
      {/* Page Title */}
      <h1 className="text-[2rem] sm:text-[2.5rem] font-bold leading-[1.18] tracking-[-0.03em] mb-10">
        {dictionary.playground.title}
      </h1>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {siteMetadata.projects.map((project, index) => (
          <ProjectCard key={index} project={project} />
        ))}
      </div>

      {/* Empty State */}
      {siteMetadata.projects.length === 0 && (
        <div className="home-meta py-16 text-center text-stone">
          {dictionary.playground.empty}
        </div>
      )}
    </div>
  )
}
