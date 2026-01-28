import { NextRequest, NextResponse } from "next/server";
import {
  getAnalyticsStats,
  getPopularPages,
  getPageViews,
  getMultiplePageViews,
} from "@/lib/google-analytics";

// 캐시 저장소
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

// TTL 설정 (밀리초)
const CACHE_TTL = {
  stats: 5 * 60 * 1000,      // 5분
  popular: 10 * 60 * 1000,   // 10분
  page: 5 * 60 * 1000,       // 5분
  pages: 5 * 60 * 1000,      // 5분
};

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    switch (type) {
      case "stats": {
        const cacheKey = "analytics:stats";
        const cached = getCached<Awaited<ReturnType<typeof getAnalyticsStats>>>(cacheKey);

        if (cached) {
          return NextResponse.json({ ...cached, cached: true });
        }

        const stats = await getAnalyticsStats();
        setCache(cacheKey, stats, CACHE_TTL.stats);
        return NextResponse.json(stats);
      }

      case "popular": {
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const cacheKey = `analytics:popular:${limit}`;
        const cached = getCached<{ popularPages: Awaited<ReturnType<typeof getPopularPages>> }>(cacheKey);

        if (cached) {
          return NextResponse.json({ ...cached, cached: true });
        }

        const popularPages = await getPopularPages(limit);
        const result = { popularPages };
        setCache(cacheKey, result, CACHE_TTL.popular);
        return NextResponse.json(result);
      }

      case "page": {
        const slug = searchParams.get("slug");
        if (!slug) {
          return NextResponse.json(
            { error: "slug parameter is required" },
            { status: 400 }
          );
        }

        const cacheKey = `analytics:page:${slug}`;
        const cached = getCached<{ slug: string; views: number }>(cacheKey);

        if (cached) {
          return NextResponse.json({ ...cached, cached: true });
        }

        const views = await getPageViews(slug);
        const result = { slug, views };
        setCache(cacheKey, result, CACHE_TTL.page);
        return NextResponse.json(result);
      }

      case "pages": {
        const slugs = searchParams.get("slugs");
        if (!slugs) {
          return NextResponse.json(
            { error: "slugs parameter is required" },
            { status: 400 }
          );
        }

        const pathList = slugs.split(",");
        const cacheKey = `analytics:pages:${pathList.sort().join(",")}`;
        const cached = getCached<{ views: Record<string, number> }>(cacheKey);

        if (cached) {
          return NextResponse.json({ ...cached, cached: true });
        }

        const viewsMap = await getMultiplePageViews(pathList);
        const result = { views: viewsMap };
        setCache(cacheKey, result, CACHE_TTL.pages);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter. Use: stats, popular, page, or pages" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
