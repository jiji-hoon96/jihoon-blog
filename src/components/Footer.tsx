import { siteMetadata } from "@/lib/site-metadata";
import { toPublicPath, type Locale } from "@/i18n/locales";

export default function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="mt-auto border-t border-mineral">
      <div className="home-meta mx-auto flex max-w-[var(--width-shell)] flex-col gap-5 px-4 py-8 text-[10px] uppercase tracking-[0.06em] text-stone sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} {siteMetadata.author.name}</p>
        <nav className="flex flex-wrap gap-5" aria-label="External links">
          <a href={siteMetadata.author.social.github} target="_blank" rel="noopener noreferrer" className="hover:text-tide">GitHub</a>
          <a href={siteMetadata.author.social.linkedIn} target="_blank" rel="noopener noreferrer" className="hover:text-tide">LinkedIn</a>
          <a href={`mailto:${siteMetadata.author.bio.email}`} className="hover:text-tide">Email</a>
          <a href={toPublicPath(locale, "/rss.xml")} type="application/rss+xml" className="hover:text-tide">RSS</a>
        </nav>
      </div>
    </footer>
  );
}
