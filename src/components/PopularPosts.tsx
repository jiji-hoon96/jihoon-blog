import Link from "next/link";
import { getPopularPages } from "@/lib/google-analytics";

interface Post {
  slug: string;
  title: string;
  date: string;
  readingTime: string;
  excerpt: string;
}

interface PopularPostsProps {
  allPosts: Post[];
}

export async function PopularPosts({ allPosts }: PopularPostsProps) {
  const popularPages = await getPopularPages(20);

  // 인기 페이지와 포스트 매칭
  const popularPosts = popularPages
    .map((page) => {
      const post = allPosts.find((p) => p.slug === page.slug);
      return post ? { ...post, views: page.views } : null;
    })
    .filter((post): post is Post & { views: number } => post !== null)
    .slice(0, 3);

  return (
    <section className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">🔥 인기 글</h2>
      </div>
      {popularPosts.length > 0 ? (
      <div className="flex flex-col gap-4">
        {popularPosts.map((post) => (
          <Link
            key={post.slug}
            href={post.slug}
            className="block p-3 sm:p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
          >
            <h3 className="text-base font-bold line-clamp-2 mb-2">
              {post.title}
            </h3>
            <p className="text-xs text-light-gray60 dark:text-dark-gray60 mb-2">
              {new Date(post.date).toLocaleDateString("ko-KR")} ·{" "}
              {post.readingTime}
              <span className="ml-2">
                · {post.views.toLocaleString()} views
              </span>
            </p>
            <p className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-2">
              {post.excerpt}
            </p>
          </Link>
        ))}
      </div>
      ) : (
        <div className="p-6 border border-light-gray20 dark:border-dark-gray20 rounded-lg text-center">
          <p className="text-sm text-light-gray60 dark:text-dark-gray60">
            아직 인기 글이 없습니다.
          </p>
        </div>
      )}
    </section>
  );
}
