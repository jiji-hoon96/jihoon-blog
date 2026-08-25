import { toPublicPath, type Locale } from '../i18n/locales.ts'

export type LlmsPost = {
  slug: string
  title: string
  seoTitle?: string
  description?: string
  excerpt: string
}

export type LlmsLabels = {
  intro: string
  rss: string
  sitemap: string
  posts: string
}

type LlmsTextInput = {
  locale: Locale
  siteUrl: string
  siteTitle: string
  siteDescription: string
  authorName: string
  authorNickname: string
  stack: readonly string[]
  labels: LlmsLabels
  posts: readonly LlmsPost[]
}

function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
}

export function buildLlmsText(input: LlmsTextInput): string {
  const siteUrl = input.siteUrl.replace(/\/+$/, '')
  const intro = fillTemplate(input.labels.intro, {
    authorName: input.authorName,
    authorNickname: input.authorNickname,
    stack: input.stack.join(', '),
  })
  const rssUrl = `${siteUrl}${toPublicPath(input.locale, '/rss.xml')}`

  const header = [
    `# ${input.siteTitle}`,
    '',
    `> ${input.siteDescription}`,
    '',
    intro,
    '',
    '## Resources',
    '',
    `- [RSS Feed](${rssUrl}): ${input.labels.rss}`,
    `- [Sitemap](${siteUrl}/sitemap.xml): ${input.labels.sitemap}`,
    '',
    `## ${input.labels.posts}`,
    '',
  ]

  const postLines = input.posts.map(post => {
    const title = post.seoTitle || post.title
    const summary = (post.description || post.excerpt)
      .replace(/\s+/g, ' ')
      .trim()
    return `- [${title}](${siteUrl}${post.slug}): ${summary}`
  })

  return [...header, ...postLines, ''].join('\n')
}
