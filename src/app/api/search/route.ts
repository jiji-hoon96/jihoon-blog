import { NextResponse } from "next/server";
import { allPosts } from "contentlayer/generated";
import { getSortedPublishedPosts } from "@/lib/filter-posts";

export async function GET() {
  const posts = getSortedPublishedPosts(allPosts).map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || "",
    category: post.categories,
  }));

  return NextResponse.json({ posts });
}
