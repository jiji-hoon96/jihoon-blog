import { NextResponse } from "next/server";
import { allPosts } from "contentlayer/generated";
import { getSortedPublishedPosts } from "@/lib/filter-posts";
import { getPostsForLocale } from "@/lib/localized-posts";
import { isLocale } from "@/i18n/locales";

export async function GET(request: Request) {
  const requestedLocale = new URL(request.url).searchParams.get("locale") ?? "ko";

  if (!isLocale(requestedLocale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }

  const localePosts = getPostsForLocale(allPosts, requestedLocale);
  const posts = getSortedPublishedPosts(localePosts).map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || "",
    category: post.categories,
  }));

  return NextResponse.json({ posts });
}
