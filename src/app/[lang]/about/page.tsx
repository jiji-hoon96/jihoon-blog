import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { ReactNode } from 'react'
import { FaGithub, FaLinkedin, FaRegEnvelope, FaRegFilePdf } from 'react-icons/fa6'

import { getDictionary, interpolate } from '@/i18n/dictionaries'
import { getLanguageAlternates, isLocale, toPublicPath } from '@/i18n/locales'
import { getAuthorPersonNode } from '@/lib/author-identity'
import {
  getLocalizedOpenGraphImageUrl,
  getOpenGraphLocale,
} from '@/lib/localized-metadata'
import {
  getOpenSourceRepos,
  openSourcePullCount,
  openSourceSearchUrl,
} from '@/lib/open-source'
import { RESUME_FILES } from '@/lib/resume-files'
import { siteMetadata } from '@/lib/site-metadata'

/**
 * About. 공개 이력서와 오픈소스 기여를 한 페이지에 둔다. 2026-10-09 까지는
 * `/resume` 이었고 그 주소는 여기로 308 을 낸다.
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
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, '/about')}`

  return {
    title: { absolute: title },
    description: dictionary.resume.description,
    alternates: {
      canonical: url,
      languages: getLanguageAlternates(siteMetadata.siteUrl, '/about'),
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
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, '/about')}`

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

  const repos = getOpenSourceRepos()
  const { bio: { email }, social } = siteMetadata.author

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

        {/*
          PDF 에 `download` 를 붙이지 않는다. 그러면 브라우저가 저장만 하고 열어 주지
          않는다. 링크로 두면 브라우저 PDF 뷰어가 바로 뜬다. 파일 크기는 툴팁과
          접근 가능한 이름에 넣는다. 한국어본이 1.9MB 라 누르기 전에 알 수 있어야 한다.
        */}
        <ul className="mt-8 flex flex-wrap items-center gap-2">
          {RESUME_FILES.map(file => {
            const label = `${
              file.locale === 'ko' ? dictionary.resume.downloadKo : dictionary.resume.downloadEn
            } · ${dictionary.resume.pdfNote.replace('{size}', file.size)}`
            return (
              <li key={file.path}>
                <IconLink href={file.path} label={label} text={file.locale.toUpperCase()}>
                  <FaRegFilePdf aria-hidden="true" />
                </IconLink>
              </li>
            )
          })}
          <li aria-hidden="true" className="mx-1 h-5 w-px bg-mineral" />
          <li>
            <IconLink href={social.github} label="GitHub" external>
              <FaGithub aria-hidden="true" />
            </IconLink>
          </li>
          <li>
            <IconLink href={social.linkedIn} label="LinkedIn" external>
              <FaLinkedin aria-hidden="true" />
            </IconLink>
          </li>
          <li>
            <IconLink href={`mailto:${email}`} label={`${dictionary.resume.email} · ${email}`}>
              <FaRegEnvelope aria-hidden="true" />
            </IconLink>
          </li>
        </ul>

        <section className="mt-16 max-w-[720px]">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-bold tracking-[-0.01em] text-stone">
              {dictionary.resume.openSource.title}
            </h2>
            <a
              href={openSourceSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={dictionary.resume.openSource.viewAll}
              className="home-meta text-stone transition-colors hover:text-accent"
            >
              {interpolate(dictionary.resume.openSource.merged, { count: openSourcePullCount })}{' '}
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/*
            위의 링크 버튼과 같은 알약 모양이다. 조직은 로고가 말해 주므로 글자는
            저장소 이름만 둔다. 전체 이름과 머지 수는 접근 가능한 이름과 툴팁에 넣는다.
          */}
          <ul className="flex flex-wrap gap-2">
            {repos.map(({ repo, owner, name, count, url }) => {
              const label = `${repo} · ${interpolate(dictionary.resume.openSource.merged, { count })}`
              return (
                <li key={repo}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-mineral pl-2 pr-3.5 text-stone transition-colors hover:border-accent hover:text-accent"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/oss/${owner}.png`}
                      alt=""
                      width={22}
                      height={22}
                      loading="lazy"
                      decoding="async"
                      className="h-[22px] w-[22px] shrink-0 rounded-full"
                    />
                    <span className="text-xs font-bold tracking-[0.02em]">{name}</span>
                    <span aria-hidden="true" className="text-xs tabular-nums opacity-70">
                      {count}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}

/**
 * 아이콘 링크. 글자가 없는 버튼은 `label` 을 접근 가능한 이름과 툴팁으로 쓴다.
 * `text` 가 있으면(PDF 의 KO, EN) 아이콘 옆에 짧게 붙인다.
 */
function IconLink({
  href,
  label,
  text,
  external,
  children,
}: {
  href: string
  label: string
  text?: string
  external?: boolean
  children: ReactNode
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-mineral text-[1.125rem] text-stone transition-colors hover:border-accent hover:text-accent ${
        text ? 'px-3.5' : 'w-10'
      }`}
    >
      {children}
      {text && <span className="text-xs font-bold tracking-[0.02em]">{text}</span>}
    </a>
  )
}
