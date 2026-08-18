import { MetadataRoute } from 'next'
import { siteMetadata } from '@/lib/site-metadata'
import { getCrawlerRules } from '@/lib/crawler-policy'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: getCrawlerRules(),
    sitemap: `${siteMetadata.siteUrl}/sitemap.xml`,
  }
}
