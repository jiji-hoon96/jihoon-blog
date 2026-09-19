import { getDictionary } from '@/i18n/dictionaries'
import { toPublicPath } from '@/i18n/locales'
import { siteMetadata } from '@/lib/site-metadata'

/**
 * 404 본문. `not-found.tsx` 와 `global-not-found.tsx` 가 같이 쓴다.
 *
 * 링크는 `next/link` 가 아니라 일반 앵커다. 404 는 막다른 길이라 클라이언트
 * 라우팅이 이득이 없는데, `next/link` 를 쓰면 이 라우트에만 클라이언트 청크가
 * 붙어 번들이 11KB(gzip) 늘어난다. (실측 217.2 KB 대 206.2 KB)
 *
 * 로케일은 한국어로 고정한다. 프록시가 접두사 없는 경로를 전부 `/ko` 로
 * rewrite 하므로 기본값이 그쪽이다.
 */
export const FALLBACK_LOCALE = 'ko'

const linkClassName =
  'border border-[var(--qa-mineral)] px-4 py-2 text-sm text-[var(--qa-ink)] no-underline'

export default function NotFoundScreen() {
  const dictionary = getDictionary(FALLBACK_LOCALE)

  return (
    <main
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
  )
}

/**
 * globals.css 의 다크 토큰은 next-themes 가 붙이는 `.dark` 클래스에 걸려 있는데,
 * 404 에는 ThemeProvider 가 없다. 그대로 두면 다크 모드 방문자도 흰 화면을 받는다.
 * 그래서 이 라우트에서만 시스템 설정으로 토큰을 덮는다.
 */
export const notFoundThemeCss = `
  @media (prefers-color-scheme: dark) {
    :root {
      --qa-canvas: #16181c;
      --qa-ink: #f2f3f4;
      --qa-stone: #9ea3a8;
      --qa-mineral: #2c2f34;
    }
  }
`
