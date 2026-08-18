import { siteMetadata } from "@/lib/site-metadata";
import { getDictionary } from "@/i18n/dictionaries";
import { toPublicPath, type Locale } from "@/i18n/locales";

export default function Footer({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);

  return (
    <footer className="border-t border-light-gray20 dark:border-dark-gray20 mt-12">
      <div className="mx-auto max-w-[var(--width-content)] px-4 py-8">
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
            <a
              href={toPublicPath(locale, "/rss.xml")}
              type="application/rss+xml"
              className="inline-flex items-center gap-1.5 hover:text-light-black100 dark:hover:text-dark-black100 transition-colors"
              aria-label={dictionary.actions.subscribeRss}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
              >
                <circle cx="5" cy="19" r="2" />
                <path d="M3 11a10 10 0 0 1 10 10h3A13 13 0 0 0 3 8v3Z" />
                <path d="M3 5a16 16 0 0 1 16 16h3A19 19 0 0 0 3 2v3Z" />
              </svg>
              {dictionary.actions.subscribeRss}
            </a>
          </div>
          <div>
            © {new Date().getFullYear()} {siteMetadata.author.name}. All rights
            reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
