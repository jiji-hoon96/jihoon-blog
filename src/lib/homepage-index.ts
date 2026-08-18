type IndexablePost = {
  translationKey: string;
};

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

export function buildHomepageIndex<T extends IndexablePost>(
  posts: readonly T[],
  featuredTranslationKey: string,
) {
  const featured =
    posts.find((post) => post.translationKey === featuredTranslationKey) ?? posts[0];
  const stream = posts
    .filter((post) => post.translationKey !== featured?.translationKey)
    .slice(0, 6);

  return {
    featured,
    expanded: stream.slice(0, 2),
    compact: stream.slice(2),
  };
}
