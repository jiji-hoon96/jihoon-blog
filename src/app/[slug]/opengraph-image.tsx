import { ImageResponse } from 'next/og'
import { allPosts } from 'contentlayer/generated'
import { siteMetadata } from '@/lib/site-metadata'
import { loadNotoSansKR } from '@/lib/og-font'

export const alt = '포스트 썸네일'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ slug: string }> }

export async function generateImageMetadata({ params }: Props) {
  const { slug } = await params
  const post = allPosts.find(p => p.slug === `/${slug}`)
  return [{ alt: post?.title ?? alt, contentType, size, id: 'og' }]
}

export default async function Image({ params }: Props) {
  const { slug } = await params
  const post = allPosts.find(p => p.slug === `/${slug}`)
  const fonts = await loadNotoSansKR()

  const title = post?.title ?? siteMetadata.title
  const categories: string[] = post?.categoryArray?.slice(0, 3) ?? []
  const dateLabel = post
    ? new Date(post.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #334155 100%)',
          color: '#f8fafc',
          fontFamily: '"Noto Sans KR"',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, opacity: 0.85 }}>
          <div style={{ display: 'flex' }}>{siteMetadata.title}</div>
          <div style={{ display: 'flex', opacity: 0.6 }}>{dateLabel}</div>
        </div>

        <div
          style={{
            fontSize: title.length > 30 ? 64 : 80,
            fontWeight: 700,
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  padding: '8px 20px',
                  border: '1px solid rgba(248, 250, 252, 0.35)',
                  borderRadius: 999,
                  fontSize: 22,
                  opacity: 0.85,
                }}
              >
                {`#${cat}`}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 24, opacity: 0.75 }}>
            {siteMetadata.author.name}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(fonts[400]
          ? [{ name: 'Noto Sans KR', data: fonts[400], weight: 400 as const, style: 'normal' as const }]
          : []),
        ...(fonts[700]
          ? [{ name: 'Noto Sans KR', data: fonts[700], weight: 700 as const, style: 'normal' as const }]
          : []),
      ],
    }
  )
}
