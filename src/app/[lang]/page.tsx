import Link from "next/link";
import { allPosts } from "contentlayer/generated";
import SearchModal from "@/components/SearchModal";
import { siteMetadata } from "@/lib/site-metadata";
import { getSortedPublishedPosts } from "@/lib/filter-posts";
import { getAllCategories } from "@/lib/categories";
import { buildHomepageIndex, formatHomepageDate } from "@/lib/homepage-index";
import { findTranslation, getPostsForLocale } from "@/lib/localized-posts";
import { isLocale, toPublicPath } from "@/i18n/locales";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { getAuthorEntityId } from "@/lib/author-identity";

export const dynamic = "force-dynamic";

const FEATURED_POST_KEY = "250520";
const STREAM_POST_KEYS = [
  "260723",
  "260703",
  "260622",
  "260302",
  "251117",
  "241201",
];

function PostMeta({
  post,
  lang,
}: {
  post: (typeof allPosts)[number];
  lang: string;
}) {
  return (
    <div className="home-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.08em] text-stone">
      <span className="text-olive">{post.categoryArray[0] ?? "Writing"}</span>
      <time dateTime={post.date}>{formatHomepageDate(post.date, lang)}</time>
      <span>{post.readingTime}</span>
    </div>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isLocale(lang)) notFound();

  const dictionary = getDictionary(lang);
  const localePosts = getPostsForLocale(allPosts, lang);
  const sortedPosts = getSortedPublishedPosts(localePosts);
  const featuredCategories = getAllCategories(localePosts)
    .filter((category) => category !== "All")
    .slice(0, 3);
  const featured = findTranslation(allPosts, FEATURED_POST_KEY, lang);
  const curatedStream = STREAM_POST_KEYS.map((key) =>
    findTranslation(allPosts, key, lang),
  ).filter((post): post is (typeof allPosts)[number] => post !== undefined);
  const reservedKeys = new Set([FEATURED_POST_KEY, ...STREAM_POST_KEYS]);
  const fallbacks = sortedPosts.filter(
    (post) => !reservedKeys.has(post.translationKey),
  );
  const homepagePosts = [
    ...(featured ? [featured] : []),
    ...curatedStream,
    ...fallbacks,
  ];
  const index = buildHomepageIndex(homepagePosts, FEATURED_POST_KEY);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetadata.title,
    url: `${siteMetadata.siteUrl}${toPublicPath(lang, "/")}`,
    description: dictionary.siteDescription,
    inLanguage: lang,
    author: {
      "@type": "Person",
      "@id": getAuthorEntityId(siteMetadata.siteUrl),
      name: siteMetadata.author.name,
      alternateName: siteMetadata.author.nickname,
      email: siteMetadata.author.bio.email,
      url: `${siteMetadata.siteUrl}${toPublicPath(lang, "/about")}`,
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
      <div className="home-breakout mx-auto w-[min(960px,calc(100vw-2rem))] pb-20 sm:pb-28">
        {index.featured && (
          <section className="border-b border-mineral pb-14 pt-14 sm:pb-20 sm:pt-24">
            <p className="home-meta mb-6 text-[11px] uppercase tracking-[0.12em] text-stone">
              Featured writing
            </p>
            <PostMeta post={index.featured} lang={lang} />
            <Link href={index.featured.slug} className="group mt-5 block">
              <h1 className="max-w-[850px] text-[2.4rem] font-semibold leading-[1.14] tracking-[-0.035em] text-ink transition-colors group-hover:text-tide sm:text-5xl">
                {index.featured.title}
              </h1>
              <p className="mt-6 max-w-[760px] text-base leading-7 text-stone sm:text-lg sm:leading-8">
                {index.featured.description || index.featured.excerpt}
              </p>
            </Link>
          </section>
        )}

        <section id="writing" className="scroll-mt-24 pt-14 sm:pt-20">
          <div className="flex flex-col justify-between gap-7 border-b border-ink pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="home-meta mb-3 text-[11px] uppercase tracking-[0.12em] text-stone">
                Archive · {sortedPosts.length} notes
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-ink sm:text-[2rem]">
                Writing Index
              </h2>
            </div>
            <nav
              aria-label="Writing categories"
              className="home-meta flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] uppercase tracking-[0.06em] text-stone"
            >
              <Link href={toPublicPath(lang, "/posts")} className="text-ink hover:text-tide">
                All
              </Link>
              {featuredCategories.map((category) => (
                <Link
                  key={category}
                  href={toPublicPath(lang, `/posts/${encodeURIComponent(category)}`)}
                  className="hover:text-tide"
                >
                  {category}
                </Link>
              ))}
              <SearchModal locale={lang} trigger="text" />
            </nav>
          </div>

          <div>
            {index.expanded.map((post) => (
              <Link
                key={post.slug}
                href={post.slug}
                className="group grid gap-4 border-b border-mineral py-8 sm:grid-cols-[128px_1fr] sm:gap-8 sm:py-10"
              >
                <div className="home-meta text-[11px] uppercase tracking-[0.06em] text-stone">
                  <time dateTime={post.date}>{formatHomepageDate(post.date, lang)}</time>
                  <p className="mt-2 text-olive">{post.categoryArray[0] ?? "Writing"}</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold leading-snug tracking-[-0.02em] text-ink transition-colors group-hover:text-tide sm:text-2xl">
                    {post.title}
                  </h3>
                  <p className="mt-3 max-w-[700px] text-[15px] leading-7 text-stone">
                    {post.description || post.excerpt}
                  </p>
                  <p className="home-meta mt-4 text-[11px] uppercase tracking-[0.06em] text-stone">
                    {post.readingTime}
                  </p>
                </div>
              </Link>
            ))}

            {index.compact.map((post) => (
              <Link
                key={post.slug}
                href={post.slug}
                className="group grid gap-3 border-b border-mineral py-6 sm:grid-cols-[128px_1fr_auto] sm:items-center sm:gap-8 sm:py-7"
              >
                <time
                  dateTime={post.date}
                  className="home-meta text-[11px] uppercase tracking-[0.06em] text-stone"
                >
                  {formatHomepageDate(post.date, lang)}
                </time>
                <div>
                  <p className="home-meta mb-2 text-[10px] uppercase tracking-[0.07em] text-olive">
                    {post.categoryArray[0] ?? "Writing"}
                  </p>
                  <h3 className="text-lg font-medium leading-snug tracking-[-0.015em] text-ink transition-colors group-hover:text-tide sm:text-xl">
                    {post.title}
                  </h3>
                </div>
                <span className="home-meta text-[10px] uppercase tracking-[0.06em] text-stone">
                  {post.readingTime}
                </span>
              </Link>
            ))}
          </div>

          <div className="pt-8 text-right">
            <Link
              href={toPublicPath(lang, "/posts")}
              className="home-meta inline-flex items-center gap-3 text-xs uppercase tracking-[0.06em] text-ink hover:text-tide"
            >
              View all writing <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
