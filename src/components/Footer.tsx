import { siteMetadata } from "@/lib/site-metadata";
import { toPublicPath, type Locale } from "@/i18n/locales";

export default function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="mt-auto border-t border-mineral">
      <div className="home-meta mx-auto max-w-[var(--width-shell)] px-4 py-8 text-stone">
        <nav className="flex flex-wrap gap-5" aria-label="External links">
          <a href={siteMetadata.author.social.github} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">GitHub</a>
          <a href={siteMetadata.author.social.linkedIn} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent">LinkedIn</a>
          <a href={toPublicPath(locale, "/rss.xml")} type="application/rss+xml" className="transition-colors hover:text-accent">RSS</a>
        </nav>
      </div>
    </footer>
  );
}
