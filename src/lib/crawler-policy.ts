export type CrawlerRule = {
  userAgent: string | string[]
  allow: string
}

export function getCrawlerRules(): CrawlerRule[] {
  return [
    { userAgent: 'Googlebot', allow: '/' },
    { userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot'], allow: '/' },
    {
      userAgent: ['Claude-SearchBot', 'Claude-User', 'ClaudeBot'],
      allow: '/',
    },
    { userAgent: ['PerplexityBot', 'Perplexity-User'], allow: '/' },
    { userAgent: '*', allow: '/' },
  ]
}
