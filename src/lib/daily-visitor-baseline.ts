const SEOUL_TIME_ZONE = "Asia/Seoul";
const MIN_DAILY_VISITORS = 10;
const DAILY_VISITOR_RANGE = 31;

export function getSeoulDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function getDailyVisitorBaseline(date: Date = new Date()): number {
  let hash = 2166136261;

  for (const character of getSeoulDateKey(date)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return MIN_DAILY_VISITORS + ((hash >>> 0) % DAILY_VISITOR_RANGE);
}

export function addDailyVisitorBaseline(
  activeUsers: number,
  date: Date = new Date(),
): number {
  return activeUsers + getDailyVisitorBaseline(date);
}
