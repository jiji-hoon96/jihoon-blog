import { ImageResponse } from 'next/og'
import { siteMetadata } from '@/lib/site-metadata'
import { loadNotoSansKR } from '@/lib/og-font'

export const alt = `${siteMetadata.title} - ${siteMetadata.author.name} 기술 블로그`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const fonts = await loadNotoSansKR()
  const tags = siteMetadata.author.stack.slice(0, 4)

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
            'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          color: '#f8fafc',
          fontFamily: '"Noto Sans KR"',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 32, opacity: 0.85 }}>
          {siteMetadata.title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.15, display: 'flex' }}>
            {`${siteMetadata.author.name}의 기술 블로그`}
          </div>
          <div style={{ fontSize: 30, opacity: 0.7 }}>
            프론트엔드 개발 기록과 생각을 남깁니다
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <div
              key={tag}
              style={{
                display: 'flex',
                padding: '10px 22px',
                border: '1px solid rgba(248, 250, 252, 0.35)',
                borderRadius: 999,
                fontSize: 22,
                opacity: 0.85,
              }}
            >
              {tag}
            </div>
          ))}
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
