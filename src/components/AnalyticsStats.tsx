"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalPageViews: number;
  todayVisitors: number;
}

export function AnalyticsStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/analytics?type=stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 text-sm text-light-gray60 dark:text-dark-gray60">
        <span className="animate-pulse">통계 로딩 중...</span>
      </div>
    );
  }

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
