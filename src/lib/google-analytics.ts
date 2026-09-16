import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { unstable_cache } from "next/cache";
import { captureServerException } from "@/lib/sentry-server";

import { addDailyVisitorBaseline } from "@/lib/daily-visitor-baseline";
import { gaCallOptions } from "@/lib/ga-request-options";

const propertyId = process.env.GA_PROPERTY_ID;
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const totalCalibration = parseInt(process.env.ANALYTICS_TOTAL_CALIBRATION || "0", 10);

let analyticsDataClient: BetaAnalyticsDataClient | null = null;

let missingCredentialsReported = false;

function getClient(): BetaAnalyticsDataClient | null {
  if (!propertyId || !clientEmail || !privateKey) {
    console.warn("Google Analytics credentials not configured");
    // 이 경로는 catch 를 거치지 않는다. 호출부가 곧장 fallback 을 반환하고
    // daily-visitor-baseline 이 0 위에 10~40 을 얹으므로 화면도 정상으로 보인다.
    // 보고하지 않으면 자격증명이 통째로 빠져도 알 방법이 없다.
    // 요청마다 같은 이벤트를 보내면 쿼터만 태우므로 프로세스당 한 번만 보낸다.
    if (!missingCredentialsReported) {
      missingCredentialsReported = true;
      const missing = [
        !propertyId && "GA_PROPERTY_ID",
        !clientEmail && "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        !privateKey && "GOOGLE_PRIVATE_KEY",
      ].filter(Boolean);
      captureServerException(
        new Error(
          `Google Analytics credentials missing: ${missing.join(", ")}`,
        ),
        { routeKind: "analytics", operation: "get-client" },
      );
    }
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
        dimensionFilter: {
          filter: {
            fieldName: "hostName",
            stringFilter: {
              matchType: "EXACT",
              value: "hooninedev.com",
            },
          },
        },
      }, gaCallOptions()),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "hostName",
            stringFilter: {
              matchType: "EXACT",
              value: "hooninedev.com",
            },
          },
        },
      }, gaCallOptions()),
    ]);

    const totalPageViews = parseInt(
      totalResponse[0].rows?.[0]?.metricValues?.[0]?.value || "0",
      10
    );

    const todayVisitors = parseInt(
      todayResponse[0].rows?.[0]?.metricValues?.[0]?.value || "0",
      10
    );

    return {
      totalPageViews: totalPageViews + totalCalibration,
      todayVisitors,
    };
  } catch (error) {
    console.error("Error fetching analytics stats:", error);
    // 여기서 삼키면 방문자에겐 통계가 0 으로 보이고 응답은 200 이라, 로그를 안 보면 장애를 알 수 없다.
    captureServerException(error, { routeKind: "analytics", operation: "stats" });
    return { totalPageViews: 0, todayVisitors: 0 };
  }
}

/**
 * 전체 조회수와 오늘 방문자 수 조회 (캐시 적용)
 */
const getCachedAnalyticsStats = unstable_cache(
  fetchAnalyticsStats,
  ["analytics-stats"],
  { revalidate: REVALIDATE_TIME }
);

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  const stats = await getCachedAnalyticsStats();

  return {
    totalPageViews: stats.totalPageViews,
    todayVisitors: addDailyVisitorBaseline(stats.todayVisitors),
  };
}

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
    }, gaCallOptions());

    return parseInt(
      response.rows?.[0]?.metricValues?.[0]?.value || "0",
      10
    );
  } catch (error) {
    console.error("Error fetching page views:", error);
    captureServerException(error, { routeKind: "analytics", operation: "page" });
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
    }, gaCallOptions());

    const result: Record<string, number> = {};
    response.rows?.forEach((row) => {
      const path = row.dimensionValues?.[0]?.value || "";
      const views = parseInt(row.metricValues?.[0]?.value || "0", 10);
      result[path] = views;
    });

    return result;
  } catch (error) {
    console.error("Error fetching multiple page views:", error);
    captureServerException(error, { routeKind: "analytics", operation: "pages" });
    return {};
  }
}
