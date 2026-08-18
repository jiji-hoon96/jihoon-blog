import { siteMetadata } from '@/lib/site-metadata'
import ProjectCard from '@/components/ProjectCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Playground',
  description: '프로젝트 모음',
}

export default function PlaygroundPage() {
  return (
    <div className="py-12">
      {/* Page Title */}
      <h1 className="text-4xl font-bold mb-12">
        Enjoying making fun things
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
          아직 프로젝트가 없습니다.
        </div>
      )}
    </div>
  )
}
