export function formatHomepageDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  })
    .format(new Date(date))
    .replaceAll("/", ". ");
}

export function getHomepagePosts<T>(
  posts: readonly T[],
  limit = 5,
): T[] {
  return posts.slice(0, limit);
}
