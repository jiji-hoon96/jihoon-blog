import { MetadataRoute } from 'next'
import { siteMetadata } from '@/lib/site-metadata'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteMetadata.siteUrl}/sitemap.xml`,
  }
}
