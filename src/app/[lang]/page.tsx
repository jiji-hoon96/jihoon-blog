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
    <div className="home-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-stone">
      <time dateTime={post.date}>{formatHomepageDate(post.date, lang)}</time>
      <span aria-hidden="true" className="opacity-50">·</span>
      <span>{post.categoryArray[0] ?? "Writing"}</span>
      <span aria-hidden="true" className="opacity-50">·</span>
      <span>{post.readingTime}</span>
    </div>
  );
}

/** 목록 행. expanded / compact 가 설명 유무만 다르고 메타 배치는 동일하다. */
function PostRow({
  post,
  lang,
  withDescription,
}: {
  post: (typeof allPosts)[number];
  lang: string;
  withDescription: boolean;
}) {
  return (
    <Link
      href={post.slug}
      className="group block border-t border-mineral py-7 sm:py-8"
    >
      <PostMeta post={post} lang={lang} />
      <h3 className="mt-2 text-lg font-semibold leading-[1.45] tracking-[-0.02em] text-ink transition-colors group-hover:text-accent sm:text-xl">
        {post.title}
      </h3>
      {withDescription && (
        <p className="mt-2 text-[15px] leading-[1.7] text-stone">
          {post.description || post.excerpt}
        </p>
      )}
    </Link>
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
      <div className="pb-20 sm:pb-28">
        {index.featured && (
          <section className="border-b border-mineral pb-14 pt-16 sm:pb-16 sm:pt-24">
            <PostMeta post={index.featured} lang={lang} />
            <Link href={index.featured.slug} className="group mt-4 block">
              <h1 className="text-[2.15rem] font-bold leading-[1.18] tracking-[-0.03em] text-ink transition-colors group-hover:text-accent sm:text-[2.75rem]">
                {index.featured.title}
              </h1>
              <p className="mt-5 text-[17px] leading-[1.75] text-stone">
                {index.featured.description || index.featured.excerpt}
              </p>
            </Link>
          </section>
        )}

        <section id="writing" className="scroll-mt-24 pt-14 sm:pt-16">
          <div className="flex flex-col justify-between gap-4 pb-4 sm:flex-row sm:items-baseline">
            {/* 총 개수는 넣지 않는다. 여기 보이는 건 최근 몇 편이고, 전체는 아래 "전체보기" 다. */}
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">
              {dictionary.home.recentPosts}
            </h2>
            <nav
              aria-label="Writing categories"
              className="home-meta flex flex-wrap items-center gap-x-4 gap-y-2 text-stone"
            >
              <Link
                href={toPublicPath(lang, "/posts")}
                className="text-ink transition-colors hover:text-accent"
              >
                {dictionary.posts.allPosts}
              </Link>
              {featuredCategories.map((category) => (
                <Link
                  key={category}
                  href={toPublicPath(lang, `/posts/${encodeURIComponent(category)}`)}
                  className="transition-colors hover:text-accent"
                >
                  {category}
                </Link>
              ))}
              <SearchModal locale={lang} trigger="text" />
            </nav>
          </div>

          <div>
            {index.expanded.map((post) => (
              <PostRow key={post.slug} post={post} lang={lang} withDescription />
            ))}
            {index.compact.map((post) => (
              <PostRow
                key={post.slug}
                post={post}
                lang={lang}
                withDescription={false}
              />
            ))}
          </div>

          <div className="border-t border-mineral pt-6">
            <Link
              href={toPublicPath(lang, "/posts")}
              className="home-meta inline-flex items-center gap-1.5 text-stone transition-colors hover:text-accent"
            >
              {dictionary.home.viewAll} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
