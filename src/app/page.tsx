import Link from "next/link";
import { allPosts } from "contentlayer/generated";
import { siteMetadata } from "@/lib/site-metadata";
import { getSortedPublishedPosts } from "@/lib/filter-posts";

export default function HomePage() {
  const sortedPosts = getSortedPublishedPosts(allPosts);

  // 최근 작성한 글 3개
  const recentPosts = sortedPosts.slice(0, 3);

  // 조회수 높은 글 3개 (임시: 중간에서 3개 선택)
  // TODO: 실제 조회수 데이터 연동 시 수정 필요
  const popularPosts = sortedPosts.slice(10, 13);

  // 고정 글 3개
  // site-metadata.pinnedPosts에서 slug로 찾거나, 없으면 임시로 특정 글 선택
  const pinnedPosts =
    siteMetadata.pinnedPosts.length > 0
      ? siteMetadata.pinnedPosts
          .map((slug) => allPosts.find((post) => post.slug === slug))
          .filter((post) => post !== undefined)
          .slice(0, 3)
      : sortedPosts.slice(5, 8);

  const PostCard = ({ post }: { post: typeof allPosts[0] }) => (
    <Link
      href={post.slug}
      className="block p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{post.emoji}</span>
        <h3 className="text-base font-bold line-clamp-2">{post.title}</h3>
      </div>
      <p className="text-xs text-light-gray60 dark:text-dark-gray60 mb-2">
        {new Date(post.date).toLocaleDateString("ko-KR")} · {post.readingTime}
      </p>
      <p className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-2">
        {post.excerpt}
      </p>
    </Link>
  );

  return (
    <div className="py-12">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">{siteMetadata.title}</h1>
        <p className="text-lg text-light-gray80 dark:text-dark-gray80">
          {siteMetadata.description}
        </p>
        <p className="mt-2 text-sm text-light-gray60 dark:text-dark-gray60">
          {siteMetadata.author.name} - {siteMetadata.author.bio.email}
        </p>
      </div>

      {/* 고정 글 */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">📌 고정 글</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pinnedPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      {/* 최근 작성한 글 */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">🆕 최근 작성한 글</h2>
          <Link
            href="/posts"
            className="text-sm text-light-gray60 dark:text-dark-gray60 hover:text-light-black100 dark:hover:text-dark-black100"
          >
            전체보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      {/* 조회수 높은 글 */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">🔥 인기 글</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {popularPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
