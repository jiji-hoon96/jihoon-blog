import Link from "next/link";
import { Suspense } from "react";
import { allPosts } from "contentlayer/generated";
import { siteMetadata } from "@/lib/site-metadata";
import { getSortedPublishedPosts } from "@/lib/filter-posts";
import { AnalyticsStats } from "@/components/AnalyticsStats";
import { PopularPosts } from "@/components/PopularPosts";

// ISR: 1시간마다 재검증
export const revalidate = 3600;

// 로딩 스켈레톤 컴포넌트들
function AnalyticsStatsSkeleton() {
  return (
    <div className="flex gap-4 text-sm text-light-gray60 dark:text-dark-gray60">
      <span className="animate-pulse">통계 로딩 중...</span>
    </div>
  );
}

function PopularPostsSkeleton() {
  return (
    <section className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">🔥 인기 글</h2>
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

export default function HomePage() {
  const sortedPosts = getSortedPublishedPosts(allPosts);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetadata.title,
    url: siteMetadata.siteUrl,
    description: siteMetadata.description,
    author: {
      "@type": "Person",
      name: siteMetadata.author.name,
      email: siteMetadata.author.bio.email,
      url: siteMetadata.siteUrl,
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
          .map((slug) => allPosts.find((post) => post.slug === slug))
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
        {new Date(post.date).toLocaleDateString("ko-KR")} · {post.readingTime}
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
            {`안녕하세요 ${siteMetadata.author.name}입니다`}
          </h1>
          <p className="mt-2 text-sm text-light-gray60 dark:text-dark-gray60">
            {siteMetadata.author.bio.email}
          </p>
          <div className="mt-3">
            <Suspense fallback={<AnalyticsStatsSkeleton />}>
              <AnalyticsStats />
            </Suspense>
          </div>
        </div>

        {/* 최근 작성한 글 */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="mr-3">🆕</span>
              최근 작성한 글
            </h2>
            <Link
              href="/posts"
              className="text-sm text-light-gray60 dark:text-dark-gray60 hover:text-light-black100 dark:hover:text-dark-black100"
            >
              전체보기 →
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
                아직 작성된 글이 없습니다.
              </p>
            </div>
          )}
        </section>

        {/* 조회수 높은 글 (GA 데이터 기반) */}
        <Suspense fallback={<PopularPostsSkeleton />}>
          <PopularPosts allPosts={postsForPopular} />
        </Suspense>

        {/* 고정 글 */}
        <section className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">
              <span className="mr-3">📌</span>
              고정 글
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
                고정된 글이 없습니다.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
