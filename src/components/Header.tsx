import Link from 'next/link'
import { siteMetadata } from '@/lib/site-metadata'

export default function Header() {
  return (
    <header className="border-b border-light-gray20 dark:border-dark-gray20 mb-8">
      <nav className="mx-auto max-w-[720px] px-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold hover:opacity-70 transition-opacity"
          >
            {siteMetadata.title}
          </Link>

          <ul className="flex gap-6">
            <li>
              <Link
                href="/posts"
                className="hover:text-light-gray60 dark:hover:text-dark-gray60 transition-colors"
              >
                Posts
              </Link>
            </li>
            <li>
              <Link
                href="/guestbook"
                className="hover:text-light-gray60 dark:hover:text-dark-gray60 transition-colors"
              >
                Guestbook
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="hover:text-light-gray60 dark:hover:text-dark-gray60 transition-colors"
              >
                About
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}
