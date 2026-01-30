import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { unstable_cache } from "next/cache";

const propertyId = process.env.GA_PROPERTY_ID;
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

let analyticsDataClient: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient | null {
  if (!propertyId || !clientEmail || !privateKey) {
    console.warn("Google Analytics credentials not configured");
    return null;
  }

  if (!analyticsDataClient) {
    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
  }

  return analyticsDataClient;
}

// 캐시 재검증 시간 (초)
const REVALIDATE_TIME = 3600; // 1시간

export interface AnalyticsStats {
  totalPageViews: number;
  todayVisitors: number;
}

export interface PopularPage {
  slug: string;
  views: number;
}

/**
 * 전체 조회수와 오늘 방문자 수 조회 (내부 함수)
 */
async function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  const client = getClient();
  if (!client) {
    return { totalPageViews: 0, todayVisitors: 0 };
  }

  try {
    // 병렬로 두 API 호출
    const [totalResponse, todayResponse] = await Promise.all([
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
        metrics: [{ name: "screenPageViews" }],
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
      }),
    ]);

    const totalPageViews = parseInt(
      totalResponse[0].rows?.[0]?.metricValues?.[0]?.value || "0",
      10
    );

    const todayVisitors = parseInt(
      todayResponse[0].rows?.[0]?.metricValues?.[0]?.value || "0",
      10
    );

    return { totalPageViews, todayVisitors };
  } catch (error) {
    console.error("Error fetching analytics stats:", error);
    return { totalPageViews: 0, todayVisitors: 0 };
  }
}

/**
 * 전체 조회수와 오늘 방문자 수 조회 (캐시 적용)
 */
export const getAnalyticsStats = unstable_cache(
  fetchAnalyticsStats,
  ["analytics-stats"],
  { revalidate: REVALIDATE_TIME }
);

/**
 * 인기 페이지 목록 조회 (내부 함수)
 */
async function fetchPopularPages(limit: number = 10): Promise<PopularPage[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit,
    });

    if (!response.rows) {
      return [];
    }

    return response.rows
      .map((row) => ({
        slug: row.dimensionValues?.[0]?.value || "",
        views: parseInt(row.metricValues?.[0]?.value || "0", 10),
      }))
      .filter((page) => {
        // 블로그 글 경로만 필터링 (6자리 날짜 형식: /YYMMDD/ 또는 /YYMMDD)
        const slugMatch = page.slug.match(/^\/(\d{6})\/?$/);
        return slugMatch !== null;
      })
      .map((page) => ({
        ...page,
        // 끝 슬래시 제거하여 일관된 형식으로 반환
        slug: page.slug.replace(/\/$/, ""),
      }));
  } catch (error) {
    console.error("Error fetching popular pages:", error);
    return [];
  }
}

/**
 * 인기 페이지 목록 조회 (캐시 적용)
 */
export const getPopularPages = unstable_cache(
  fetchPopularPages,
  ["analytics-popular"],
  { revalidate: REVALIDATE_TIME }
);

/**
 * 특정 페이지의 조회수 조회
 */
export async function getPageViews(pagePath: string): Promise<number> {
  const client = getClient();
  if (!client) {
    return 0;
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      dimensionFilter: {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "EXACT",
            value: pagePath,
          },
        },
      },
    });

    return parseInt(
      response.rows?.[0]?.metricValues?.[0]?.value || "0",
      10
    );
  } catch (error) {
    console.error("Error fetching page views:", error);
    return 0;
  }
}

/**
 * 여러 페이지의 조회수를 한 번에 조회
 */
export async function getMultiplePageViews(
  pagePaths: string[]
): Promise<Record<string, number>> {
  const client = getClient();
  if (!client || pagePaths.length === 0) {
    return {};
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      dimensionFilter: {
        orGroup: {
          expressions: pagePaths.map((path) => ({
            filter: {
              fieldName: "pagePath",
              stringFilter: {
                matchType: "EXACT",
                value: path,
              },
            },
          })),
        },
      },
    });

    const result: Record<string, number> = {};
    response.rows?.forEach((row) => {
      const path = row.dimensionValues?.[0]?.value || "";
      const views = parseInt(row.metricValues?.[0]?.value || "0", 10);
      result[path] = views;
    });

    return result;
  } catch (error) {
    console.error("Error fetching multiple page views:", error);
    return {};
  }
}
