import { siteMetadata } from '@/lib/site-metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: `${siteMetadata.author.name}에 대해`,
}

export default function AboutPage() {
  return (
    <div className="py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">About</h1>
        <p className="text-lg text-light-gray80 dark:text-dark-gray80">
          안녕하세요! {siteMetadata.author.nickname}입니다.
        </p>
      </div>

      {/* Bio */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">👋 소개</h2>
        <div className="space-y-4">
          <div>
            <strong>이름:</strong> {siteMetadata.author.name} ({siteMetadata.author.nickname})
          </div>
          <div>
            <strong>이메일:</strong>{' '}
            <a
              href={`mailto:${siteMetadata.author.bio.email}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {siteMetadata.author.bio.email}
            </a>
          </div>
          <div>
            <strong>위치:</strong> {siteMetadata.author.bio.residence}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">🛠 기술 스택</h2>
        <div className="flex flex-wrap gap-2">
          {siteMetadata.author.stack.map(tech => (
            <span
              key={tech}
              className="px-3 py-1 rounded-full bg-light-gray10 dark:bg-dark-gray10"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">📅 타임라인</h2>
        <div className="space-y-4">
          {siteMetadata.timestamps.map((item, index) => (
            <div
              key={index}
              className="p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs rounded bg-light-black100 dark:bg-dark-black100 text-light-white100 dark:text-dark-white100">
                  {item.category}
                </span>
                <span className="text-sm text-light-gray60 dark:text-dark-gray60">
                  {item.date}
                </span>
              </div>
              <div className="font-bold">{item.kr} ({item.en})</div>
              <div className="text-sm text-light-gray80 dark:text-dark-gray80">
                {item.info}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <section>
        <h2 className="text-2xl font-bold mb-4">🔗 링크</h2>
        <div className="flex flex-col gap-3">
          <a
            href={siteMetadata.author.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            GitHub →
          </a>
          <a
            href={siteMetadata.author.social.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            LinkedIn →
          </a>
          <a
            href={siteMetadata.author.social.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Resume →
          </a>
        </div>
      </section>
    </div>
  )
}
