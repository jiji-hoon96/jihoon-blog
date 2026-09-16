import { NextRequest, NextResponse } from "next/server";
import { captureServerException } from "@/lib/sentry-server";
import {
  getAnalyticsStats,
  getPageViews,
  getMultiplePageViews,
} from "@/lib/google-analytics";

// 한 페이지가 실제로 요청하는 글 수보다 넉넉하다. 글 목록 한 화면이 상한이다.
const MAX_SLUGS_PER_REQUEST = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    switch (type) {
      case "stats": {
        const stats = await getAnalyticsStats();
        return NextResponse.json(stats);
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
        // 상한이 없으면 slugs=a,a,a... 하나로 GA 에 거대한 orGroup 이 나간다.
        // 인증이 없고 이 경로는 unstable_cache 를 타지 않으므로 요청마다
        // 실제 호출이 발생한다. GA 쿼터와 Sentry 무료 티어 쿼터를 밖에서 태울 수 있다.
        const pathList = slugs.split(",").filter(Boolean);
        if (pathList.length > MAX_SLUGS_PER_REQUEST) {
          return NextResponse.json(
            { error: `slugs is limited to ${MAX_SLUGS_PER_REQUEST} entries` },
            { status: 400 }
          );
        }
        const viewsMap = await getMultiplePageViews(pathList);
        return NextResponse.json({ views: viewsMap });
      }

      default:
        return NextResponse.json(
          { error: "Invalid type parameter. Use: stats, page, or pages" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Analytics API error:", error);
    const operation = ["stats", "page", "pages"].includes(type ?? "")
      ? `route-${type}`
      : "route-invalid";
    captureServerException(error, { routeKind: "analytics", operation });
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
