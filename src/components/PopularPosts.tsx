"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PopularPage {
  slug: string;
  views: number;
}

interface Post {
  slug: string;
  title: string;
  emoji: string;
  date: string;
  readingTime: string;
  excerpt: string;
}

interface PopularPostsProps {
  allPosts: Post[];
}

export function PopularPosts({ allPosts }: PopularPostsProps) {
  const [popularPages, setPopularPages] = useState<PopularPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPopularPages() {
      try {
        const response = await fetch("/api/analytics?type=popular&limit=20");
        if (response.ok) {
          const data = await response.json();
          setPopularPages(data.popularPages || []);
        }
      } catch (error) {
        console.error("Failed to fetch popular pages:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPopularPages();
  }, []);

  // 인기 페이지와 포스트 매칭
  const popularPosts = popularPages
    .map((page) => {
      const post = allPosts.find((p) => p.slug === page.slug);
      return post ? { ...post, views: page.views } : null;
    })
    .filter((post): post is Post & { views: number } => post !== null)
    .slice(0, 3);

  if (loading) {
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

  // 인기글이 없으면 섹션을 표시하지 않음
  if (popularPosts.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 sm:mb-12">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">🔥 인기 글</h2>
      </div>
      <div className="flex flex-col gap-4">
        {popularPosts.map((post) => (
          <Link
            key={post.slug}
            href={post.slug}
            className="block p-3 sm:p-4 border border-light-gray20 dark:border-dark-gray20 rounded-lg hover:border-light-gray40 dark:hover:border-dark-gray40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{post.emoji}</span>
              <h3 className="text-base font-bold line-clamp-2">{post.title}</h3>
            </div>
            <p className="text-xs text-light-gray60 dark:text-dark-gray60 mb-2">
              {new Date(post.date).toLocaleDateString("ko-KR")} · {post.readingTime}
              <span className="ml-2">👀 {post.views.toLocaleString()}</span>
            </p>
            <p className="text-sm text-light-gray80 dark:text-dark-gray80 line-clamp-2">
              {post.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
