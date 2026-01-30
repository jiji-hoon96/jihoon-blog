import { getAnalyticsStats } from "@/lib/google-analytics";

export async function AnalyticsStats() {
  const stats = await getAnalyticsStats();

  if (!stats || (stats.totalPageViews === 0 && stats.todayVisitors === 0)) {
    return null;
  }

  return (
    <div className="flex gap-4 text-sm text-light-gray60 dark:text-dark-gray60">
      <span>
        Total: {stats.totalPageViews.toLocaleString()} / Today:{" "}
        {stats.todayVisitors.toLocaleString()}
      </span>
    </div>
  );
}
