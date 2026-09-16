import { getDictionary } from '@/i18n/dictionaries'
import { toPublicPath } from '@/i18n/locales'
import { siteMetadata } from '@/lib/site-metadata'
import './globals.css'

/**
 * 이 파일이 없으면 Next 의 기본 404 가 그대로 나간다. 헤더도 푸터도 스타일도 없는
 * 화면에 "404 This page could not be found." 한 줄이라, 죽은 링크를 타고 들어온
 * 방문자에게 사이트로 돌아갈 길이 하나도 없다. (프로덕션에서 확인)
 *
 * `[lang]` 아래가 아니라 루트에 두는 이유가 있다. 글 라우트가
 * `dynamicParams = false` 라서 없는 슬러그는 세그먼트에 매칭조차 되지 않고
 * 전역 404 로 떨어진다. `[lang]/not-found.tsx` 는 그 요청에 닿지 않는다. (실측 확인)
 *
 * 링크는 `next/link` 가 아니라 일반 앵커다. 404 는 막다른 길이라 클라이언트 라우팅이
 * 이득이 없는데, `next/link` 를 쓰면 이 라우트에만 클라이언트 청크가 붙어
 * 번들이 11KB(gzip) 늘어난다. (실측 217.2 KB 대 206.2 KB)
 *
 * 그래서 `[lang]/layout.tsx` 의 ThemeProvider 도 헤더도 여기서는 쓸 수 없다.
 * 테마 토큰만 직접 얹어 자기 완결적으로 그린다. 로케일은 한국어로 고정한다.
 * 프록시가 접두사 없는 경로를 전부 `/ko` 로 rewrite 하므로 기본값이 그쪽이다.
 */
const FALLBACK_LOCALE = 'ko'

const linkClassName =
  'border border-[var(--qa-mineral)] px-4 py-2 text-sm text-[var(--qa-ink)] no-underline'

export default function NotFound() {
  const dictionary = getDictionary(FALLBACK_LOCALE)

  return (
    <>
      {/*
        globals.css 의 다크 토큰은 next-themes 가 붙이는 .dark 클래스에 걸려 있는데,
        이 페이지에는 ThemeProvider 가 없다. 그대로 두면 다크 모드 방문자도 흰 화면을 받는다.
        그래서 이 라우트에서만 시스템 설정으로 토큰을 덮는다.
      */}
      <style>{`
        @media (prefers-color-scheme: dark) {
          :root {
            --qa-canvas: #16181c;
            --qa-ink: #f2f3f4;
            --qa-stone: #9ea3a8;
            --qa-mineral: #2c2f34;
          }
        }
      `}</style>
      <main
      lang={FALLBACK_LOCALE}
      className="mx-auto w-full max-w-[var(--width-content)] px-4 py-24 sm:py-32"
      style={{
        background: 'var(--qa-canvas)',
        color: 'var(--qa-ink)',
        minHeight: '100vh',
      }}
    >
      <p className="text-sm text-[var(--qa-stone)]">404</p>
      <h1 className="mt-3 text-[2rem] font-bold leading-[1.18] tracking-[-0.03em] sm:text-[2.5rem]">
        {dictionary.notFound.title}
      </h1>
      <p className="mt-4 max-w-[560px] text-[1.0625rem] leading-[1.9]">
        {dictionary.notFound.description}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <a href={toPublicPath(FALLBACK_LOCALE, '/')} className={linkClassName}>
          {dictionary.notFound.backHome}
        </a>
        <a href={toPublicPath(FALLBACK_LOCALE, '/posts')} className={linkClassName}>
          {dictionary.notFound.browsePosts}
        </a>
      </div>

      <p className="mt-12 text-sm text-[var(--qa-stone)]">{siteMetadata.title}</p>
      </main>
    </>
  )
}
