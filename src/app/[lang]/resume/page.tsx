import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getDictionary } from '@/i18n/dictionaries'
import { getLanguageAlternates, isLocale, toPublicPath } from '@/i18n/locales'
import { getAuthorPersonNode } from '@/lib/author-identity'
import {
  getLocalizedOpenGraphImageUrl,
  getOpenGraphLocale,
} from '@/lib/localized-metadata'
import { RESUME_FILES } from '@/lib/resume-files'
import { siteMetadata } from '@/lib/site-metadata'

/**
 * 공개 이력서.
 *
 * **본문 문장은 볼트의 `career/career-resume-final.md` 에서 내려온다.** 그 파일도
 * Figma 제출본의 파생본이다. 여기서 문장을 직접 고치면 세 번째 사본이 생겨 갈라진다.
 * 제출본의 「머리 요약」 두 노드가 `resume.scale` 과 `resume.approach` 에 대응한다.
 *
 * PDF 를 iframe 으로 감싸지 않는다. 링크로 두면 브라우저 자체 뷰어가 전체 화면으로
 * 열려 인쇄·확대·검색이 붙고, 한국어본 1.9MB 를 누른 사람만 받는다. iOS Safari 는
 * iframe 안 PDF 를 제대로 그리지 못하고, iframe 안의 텍스트는 이 페이지의 내용으로도
 * 세어지지 않는다. PDF 를 독립 URL 로 두면 검색엔진이 그 자체를 색인한다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLocale(lang)) {
    return {
      metadataBase: new URL(siteMetadata.siteUrl),
      robots: { index: false, follow: false },
    }
  }

  const dictionary = getDictionary(lang)
  const title = `${dictionary.resume.title} · ${siteMetadata.author.name}`
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, '/resume')}`

  return {
    title: { absolute: title },
    description: dictionary.resume.description,
    alternates: {
      canonical: url,
      languages: getLanguageAlternates(siteMetadata.siteUrl, '/resume'),
    },
    openGraph: {
      title,
      description: dictionary.resume.description,
      url,
      images: [getLocalizedOpenGraphImageUrl(siteMetadata.siteUrl, lang)],
      type: 'profile',
      locale: getOpenGraphLocale(lang),
      siteName: siteMetadata.title,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: dictionary.resume.description,
    },
  }
}

export default async function ResumePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLocale(lang)) notFound()

  const dictionary = getDictionary(lang)
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, '/resume')}`

  // 모든 글의 JSON-LD 가 `#person` 을 가리키는데 그 엔티티를 설명하는 페이지가 없었다.
  // 이 페이지가 그 자리다. `mainEntityOfPage` 로 사람과 문서를 잇는다.
  const personLd = {
    '@context': 'https://schema.org',
    ...getAuthorPersonNode(siteMetadata.siteUrl),
    jobTitle: dictionary.resume.role,
    description: dictionary.resume.description,
    worksFor: {
      '@type': 'Organization',
      name: lang === 'ko' ? '하이케어넷' : 'HicareNet',
    },
    mainEntityOfPage: { '@type': 'ProfilePage', '@id': url },
    subjectOf: RESUME_FILES.map(file => ({
      '@type': 'DigitalDocument',
      name: file.locale === 'ko' ? dictionary.resume.downloadKo : dictionary.resume.downloadEn,
      url: `${siteMetadata.siteUrl}${file.path}`,
      encodingFormat: 'application/pdf',
      inLanguage: file.locale,
    })),
  }

  const linkClassName =
    'flex items-baseline justify-between gap-4 border border-mineral px-5 py-4 no-underline transition-colors hover:border-accent hover:text-accent'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />

      <div className="py-10 sm:py-16">
        <h1 className="text-[2rem] font-bold leading-[1.18] tracking-[-0.03em] sm:text-[2.5rem]">
          {siteMetadata.author.name}
        </h1>
        <p className="home-meta mt-2 text-stone">{dictionary.resume.role}</p>

        <div className="mt-8 max-w-[720px] space-y-6 text-[1.0625rem] leading-[1.9] tracking-[-0.01em]">
          <p>{dictionary.resume.scale}</p>
          <p>{dictionary.resume.approach}</p>
        </div>

        <ul className="mt-10 max-w-[560px] space-y-3">
          {RESUME_FILES.map(file => (
            <li key={file.path}>
              {/*
                `download` 를 붙이지 않는다. 그러면 브라우저가 파일을 저장만 하고
                열어 주지 않아서, 보려던 사람이 한 단계를 더 거친다. 링크로 두면
                브라우저 PDF 뷰어가 바로 뜬다.
              */}
              <a href={file.path} className={linkClassName}>
                <span className="font-bold">
                  {file.locale === 'ko'
                    ? dictionary.resume.downloadKo
                    : dictionary.resume.downloadEn}
                </span>
                <span className="home-meta shrink-0 text-stone">
                  {dictionary.resume.pdfNote.replace('{size}', file.size)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
