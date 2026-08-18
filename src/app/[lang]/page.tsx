import Link from "next/link";
import { Suspense } from "react";
import { allPosts } from "contentlayer/generated";
import { siteMetadata } from "@/lib/site-metadata";
import { getSortedPublishedPosts } from "@/lib/filter-posts";
import { AnalyticsStats } from "@/components/AnalyticsStats";
import { PopularPosts } from "@/components/PopularPosts";
import { findTranslation, getPostsForLocale } from "@/lib/localized-posts";
import { isLocale, toPublicPath } from "@/i18n/locales";
import { notFound } from "next/navigation";
import { getDictionary, interpolate } from "@/i18n/dictionaries";
import { getAuthorEntityId } from "@/lib/author-identity";

export const dynamic = "force-dynamic";

// 로딩 스켈레톤 컴포넌트들
function AnalyticsStatsSkeleton({ label }: { label: string }) {
  return (
    <div className="flex gap-4 text-sm text-light-gray60 dark:text-dark-gray60">
      <span className="animate-pulse">{label}</span>
    </div>
  );
}

function PopularPostsSkeleton({ title }: { title: string }) {
  return (
    <section className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">🔥 {title}</h2>
      </div>
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3 sm:p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg animate-pulse"
          >
            <div className="h-6 bg-light-gray20 dark:bg-dark-gray20 rounded mb-2"></div>
            <div className="h-4 bg-light-gray20 dark:bg-dark-gray20 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-light-gray20 dark:bg-dark-gray20 rounded"></div>
          </div>
        ))}
      </div>
    </section>
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
      jobTitle: "Frontend Developer",
      knowsAbout: siteMetadata.author.stack,
      sameAs: [
        siteMetadata.author.social.github,
        siteMetadata.author.social.linkedIn,
      ],
    },
  };

  // 최근 작성한 글 3개
  const recentPosts = sortedPosts.slice(0, 3);

  // PopularPosts 컴포넌트에 전달할 포스트 데이터
  const postsForPopular = sortedPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    readingTime: post.readingTime,
    excerpt: post.excerpt,
  }));

  // 고정 글 3개
  // site-metadata.pinnedPosts에서 slug로 찾거나, 없으면 임시로 특정 글 선택
  const pinnedPosts =
    siteMetadata.pinnedPosts.length > 0
      ? siteMetadata.pinnedPosts
          .map((slug) => findTranslation(allPosts, slug.replace(/^\//, ""), lang))
          .filter((post) => post !== undefined)
          .slice(0, 3)
      : sortedPosts.slice(5, 8);

  const PostCard = ({ post }: { post: (typeof allPosts)[0] }) => (
    <Link
      href={post.slug}
      className="block p-3 sm:p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
    >
      <h3 className="text-base font-bold line-clamp-2 mb-2">{post.title}</h3>
      <p className="text-xs text-light-gray60 dark:text-dark-gray60 mb-2">
        {new Date(post.date).toLocaleDateString(lang)} · {post.readingTime}
      </p>
      <p className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-2">
        {post.excerpt}
      </p>
    </Link>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">
            {interpolate(dictionary.home.greeting, { name: siteMetadata.author.name })}
          </h1>
          <p className="mt-2 text-sm text-light-gray60 dark:text-dark-gray60">
            {siteMetadata.author.bio.email}
          </p>
          <div className="mt-3">
            <Suspense fallback={<AnalyticsStatsSkeleton label={dictionary.home.statsLoading} />}>
              <AnalyticsStats />
            </Suspense>
          </div>
        </div>

        {/* 고정 글 */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="mr-3">📌</span>
              {dictionary.home.pinnedPosts}
            </h2>
          </div>
          {pinnedPosts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {pinnedPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="p-6 border border-light-gray20 dark:border-dark-gray20 rounded-lg text-center">
              <p className="text-sm text-light-gray60 dark:text-dark-gray60">
                {dictionary.home.noPinnedPosts}
              </p>
            </div>
          )}
        </section>

        {/* 조회수 높은 글 (GA 데이터 기반) */}
        <Suspense fallback={<PopularPostsSkeleton title={dictionary.home.popularPosts} />}>
          <PopularPosts
            allPosts={postsForPopular}
            locale={lang}
            title={dictionary.home.popularPosts}
            emptyLabel={dictionary.home.noPopularPosts}
          />
        </Suspense>

        {/* 최근 작성한 글 */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="mr-3">🆕</span>
              {dictionary.home.recentPosts}
            </h2>
            <Link
              href={toPublicPath(lang, "/posts")}
              className="text-sm text-light-gray60 dark:text-dark-gray60 hover:text-light-black100 dark:hover:text-dark-black100"
            >
              {dictionary.home.viewAll} →
            </Link>
          </div>
          {recentPosts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {recentPosts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="p-6 border border-light-gray20 dark:border-dark-gray20 rounded-lg text-center">
              <p className="text-sm text-light-gray60 dark:text-dark-gray60">
                {dictionary.home.noPosts}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
