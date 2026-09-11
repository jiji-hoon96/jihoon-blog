import { notFound } from 'next/navigation'
import { ImageResponse } from 'next/og'
import { siteMetadata } from '@/lib/site-metadata'
import { loadNotoSansKR } from '@/lib/og-font'
import { OgCard, OG_CARD_SIZE } from '@/lib/og-card'
import { isLocale } from '@/i18n/locales'
import { getDictionary } from '@/i18n/dictionaries'

export const alt = `${siteMetadata.title} - ${siteMetadata.author.name} 기술 블로그`
export const size = OG_CARD_SIZE
export const contentType = 'image/png'

type Props = { params: Promise<{ lang: string }> }

export default async function Image({ params }: Props) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  const fonts = await loadNotoSansKR()
  const dictionary = getDictionary(lang)

  return new ImageResponse(
    <OgCard
      title={dictionary.siteTitle}
      meta={dictionary.siteDescription}
      footnote={siteMetadata.author.stack.slice(0, 3).join('   ·   ')}
    />,
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
