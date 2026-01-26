import { siteMetadata } from '@/lib/site-metadata'

export default function Footer() {
  return (
    <footer className="border-t border-light-gray20 dark:border-dark-gray20 mt-12">
      <div className="mx-auto max-w-[720px] px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-sm text-light-gray60 dark:text-dark-gray60">
          <div className="flex gap-4">
            <a
              href={siteMetadata.author.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-light-black100 dark:hover:text-dark-black100 transition-colors"
            >
              GitHub
            </a>
            <a
              href={siteMetadata.author.social.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-light-black100 dark:hover:text-dark-black100 transition-colors"
            >
              LinkedIn
            </a>
            <a
              href={`mailto:${siteMetadata.author.bio.email}`}
              className="hover:text-light-black100 dark:hover:text-dark-black100 transition-colors"
            >
              Email
            </a>
          </div>
          <div>
            © {new Date().getFullYear()} {siteMetadata.author.name}. All rights reserved.
          </div>
          <div className="text-xs">
            Built with Next.js 15 · Migrated from Gatsby
          </div>
        </div>
      </div>
    </footer>
  )
}
