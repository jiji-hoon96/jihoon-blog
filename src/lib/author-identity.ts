export function getAuthorEntityId(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/#person`
}
