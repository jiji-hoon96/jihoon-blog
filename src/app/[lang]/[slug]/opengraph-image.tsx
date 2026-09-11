import { notFound } from 'next/navigation'
import { ImageResponse } from 'next/og'
import { allPosts } from 'contentlayer/generated'
import { loadNotoSansKR } from '@/lib/og-font'
import { OgCard, OG_CARD_SIZE } from '@/lib/og-card'
import { findTranslation } from '@/lib/localized-posts'
import { isLocale, type Locale } from '@/i18n/locales'
import { getDictionary, interpolate } from '@/i18n/dictionaries'

// generateImageMetadata 를 두면 Next 가 경로 끝에 id 세그먼트를 붙여
// 실제 라우트가 /opengraph-image/og 가 된다. 메타데이터는 /opengraph-image 를
// 가리키므로 og:image 와 twitter:image 가 전부 404 였다. 홈 OG 라우트와 같은
// 모양으로 맞춰 파일 규약 경로를 그대로 쓴다.
export const alt = '포스트 썸네일'
export const size = OG_CARD_SIZE
export const contentType = 'image/png'

type Props = { params: Promise<{ lang: string; slug: string }> }

const DATE_LOCALE: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  'zh-CN': 'zh-CN',
}

export default async function Image({ params }: Props) {
  const { lang, slug } = await params
  const post = isLocale(lang) ? findTranslation(allPosts, slug, lang) : undefined

  // 이 라우트는 페이지와 달리 정적 파라미터로 좁혀지지 않는다. 막지 않으면
  // 없는 slug 마다 Satori 렌더가 돌아 함수 실행 시간을 무한히 태울 수 있다.
  if (!post || !isLocale(lang)) notFound()

  const fonts = await loadNotoSansKR()

  // 짧은 title 은 피드에서 정보가 되지 않는다. '관측' 두 글자만 뜨던 자리에
  // 검색용 긴 제목을 쓴다. seoTitle 은 60자 이하로 관리된다.
  const title = post.seoTitle || post.title
  const dateLabel = new Date(post.date).toLocaleDateString(DATE_LOCALE[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const categories = post.categoryArray?.slice(0, 3) ?? []
  const meta = [dateLabel, ...categories].join('   ·   ')
  const readingLabel = interpolate(getDictionary(lang).post.readingTime, {
    minutes: post.readingMinutes,
  })

  return new ImageResponse(
    <OgCard title={title} meta={meta} footnote={readingLabel} />,
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
