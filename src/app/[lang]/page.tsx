import Link from "next/link";
import { notFound } from "next/navigation";
import { allPosts } from "contentlayer/generated";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, toPublicPath } from "@/i18n/locales";
import { getAuthorEntityId } from "@/lib/author-identity";
import { getSortedPublishedPosts } from "@/lib/filter-posts";
import { formatHomepageDate, getHomepagePosts } from "@/lib/homepage-index";
import { getPostsForLocale } from "@/lib/localized-posts";
import { siteMetadata } from "@/lib/site-metadata";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isLocale(lang)) notFound();

  const dictionary = getDictionary(lang);
  const latestPosts = getHomepagePosts(
    getSortedPublishedPosts(getPostsForLocale(allPosts, lang)),
  );
  const homePath = toPublicPath(lang, "/");
  const homeUrl = `${siteMetadata.siteUrl}${homePath}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetadata.title,
    url: homeUrl,
    description: dictionary.siteDescription,
    inLanguage: lang,
    author: {
      "@type": "Person",
      "@id": getAuthorEntityId(siteMetadata.siteUrl),
      name: siteMetadata.author.name,
      alternateName: siteMetadata.brand,
      email: siteMetadata.author.bio.email,
      url: homeUrl,
      image: `${siteMetadata.siteUrl}/images/jihoon.jpeg`,
      jobTitle: "Frontend Engineer",
      knowsAbout: siteMetadata.author.stack,
      sameAs: [
        siteMetadata.author.social.github,
        siteMetadata.author.social.linkedIn,
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pb-20 sm:pb-28">
        <section
          aria-label={siteMetadata.brand}
          className="border-b border-mineral pb-14 pt-16 sm:pb-20 sm:pt-24"
        >
          <h1 className="max-w-[760px] text-[1.75rem] font-bold leading-[1.42] tracking-[-0.035em] text-ink sm:text-[2.2rem]">
            {dictionary.home.values[0]}
          </h1>
          <div className="mt-10 max-w-[720px] space-y-7 text-[1.0625rem] leading-[1.9] tracking-[-0.01em] text-stone sm:mt-12">
            {dictionary.home.values.slice(1).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section id="writing" className="scroll-mt-24 pt-14 sm:pt-16">
          <h2 className="mb-5 text-sm font-bold tracking-[-0.01em] text-stone">
            {dictionary.home.recentPosts}
          </h2>

          <div className="border-b border-mineral">
            {latestPosts.map((post) => (
              <Link
                key={post.slug}
                href={post.slug}
                className="group flex flex-col gap-2 border-t border-mineral py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:py-7"
              >
                <h3 className="text-lg font-bold leading-[1.5] tracking-[-0.02em] text-ink transition-colors group-hover:text-accent sm:text-xl">
                  {post.title}
                </h3>
                <time
                  dateTime={post.date}
                  className="home-meta shrink-0 text-stone"
                >
                  {formatHomepageDate(post.date, lang)}
                </time>
              </Link>
            ))}
          </div>

          <Link
            href={toPublicPath(lang, "/posts")}
            className="home-meta mt-6 inline-flex items-center gap-1.5 text-stone transition-colors hover:text-accent"
          >
            {dictionary.home.viewAll} <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </>
  );
}
