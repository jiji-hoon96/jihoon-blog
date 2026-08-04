import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  getAnalyticsStats,
  getPopularPages,
  getPageViews,
  getMultiplePageViews,
} from "@/lib/google-analytics";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    switch (type) {
      case "stats": {
        const stats = await getAnalyticsStats();
        return NextResponse.json(stats);
      }

      case "popular": {
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const popularPages = await getPopularPages(limit);
        return NextResponse.json({ popularPages });
      }

      case "page": {
        const slug = searchParams.get("slug");
        if (!slug) {
          return NextResponse.json(
            { error: "slug parameter is required" },
            { status: 400 }
          );
        }
        const views = await getPageViews(slug);
        return NextResponse.json({ slug, views });
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
        const viewsMap = await getMultiplePageViews(pathList);
        return NextResponse.json({ views: viewsMap });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter. Use: stats, popular, page, or pages" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Analytics API error:", error);
    // 서비스 계정 키 만료, GA4 쿼터 초과, GA 측 5xx 는 로그만 남으면 알 방법이 없다.
    // type 을 태그로 붙여 어떤 쿼리에서 터졌는지 Sentry 에서 바로 구분한다.
    Sentry.captureException(error, {
      tags: { route: "api/analytics", analyticsType: type ?? "none" },
    });
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
