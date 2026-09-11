import { NextRequest, NextResponse } from "next/server";
import { captureServerException } from "@/lib/sentry-server";
import {
  getAnalyticsStats,
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
