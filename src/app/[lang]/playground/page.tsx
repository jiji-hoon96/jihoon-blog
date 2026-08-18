import { siteMetadata } from '@/lib/site-metadata'
import ProjectCard from '@/components/ProjectCard'
import type { Metadata } from 'next'
import { getDictionary } from '@/i18n/dictionaries'
import { isLocale } from '@/i18n/locales'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) return {}
  const dictionary = getDictionary(lang)
  return { title: dictionary.playground.title, description: dictionary.playground.description }
}

export default async function PlaygroundPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()
  const dictionary = getDictionary(lang)
  return (
    <div className="py-12">
      {/* Page Title */}
      <h1 className="text-4xl font-bold mb-12">
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
        <div className="text-center py-12 text-light-gray60 dark:text-dark-gray60">
          {dictionary.playground.empty}
        </div>
      )}
    </div>
  )
}
