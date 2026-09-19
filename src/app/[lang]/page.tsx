import Link from "next/link";
import { notFound } from "next/navigation";
import { allPosts } from "contentlayer/generated";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, toPublicPath } from "@/i18n/locales";
import { getAuthorPersonNode, getSiteEntityId } from "@/lib/author-identity";
import { getSortedPublishedPosts } from "@/lib/filter-posts";
import { formatHomepageDate, getHomepagePosts } from "@/lib/homepage-index";
import { getPostsForLocale } from "@/lib/localized-posts";
import { siteMetadata } from "@/lib/site-metadata";
import VisitCounter from "@/components/VisitCounter";

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
  const valueParagraphClassName =
    "max-w-[720px] text-[1.0625rem] font-normal leading-[1.9] tracking-[-0.01em] text-ink";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    // 글의 `isPartOf` 가 이 `@id` 를 가리킨다. 프래그먼트를 붙여 홈 URL 자체와
    // 구분하지 않으면 한 URL 에 WebSite 와 Blog 두 타입이 따로 뜬다.
    "@id": getSiteEntityId(siteMetadata.siteUrl),
    name: siteMetadata.title,
    url: homeUrl,
    description: dictionary.siteDescription,
    inLanguage: lang,
    author: getAuthorPersonNode(siteMetadata.siteUrl),
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
          className="pb-14 pt-16 sm:pb-20 sm:pt-24"
        >
          <h1 className={valueParagraphClassName}>
            {dictionary.home.values[0]}
          </h1>
          <div className={`mt-7 space-y-7 ${valueParagraphClassName}`}>
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

          <VisitCounter locale={lang} />
        </section>
      </div>
    </>
  );
}
