import { notFound } from 'next/navigation'
import { ImageResponse } from 'next/og'
import { allPosts } from 'contentlayer/generated'
import { siteMetadata } from '@/lib/site-metadata'
import { loadNotoSansKR } from '@/lib/og-font'
import { findTranslation } from '@/lib/localized-posts'
import { isLocale } from '@/i18n/locales'

// generateImageMetadata 를 두면 Next 가 경로 끝에 id 세그먼트를 붙여
// 실제 라우트가 /opengraph-image/og 가 된다. 메타데이터는 /opengraph-image 를
// 가리키므로 og:image 와 twitter:image 가 전부 404 였다. 홈 OG 라우트와 같은
// 모양으로 맞춰 파일 규약 경로를 그대로 쓴다.
export const alt = '포스트 썸네일'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ lang: string; slug: string }> }

export default async function Image({ params }: Props) {
  const { lang, slug } = await params
  const post = isLocale(lang) ? findTranslation(allPosts, slug, lang) : undefined

  // 이 라우트는 페이지와 달리 정적 파라미터로 좁혀지지 않는다. 막지 않으면
  // 없는 slug 마다 Satori 렌더가 돌아 함수 실행 시간을 무한히 태울 수 있다.
  if (!post) notFound()

  const fonts = await loadNotoSansKR()

  const title = post.title
  const categories: string[] = post.categoryArray?.slice(0, 3) ?? []
  const dateLabel = new Date(post.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

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
