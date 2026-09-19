import type { Metadata } from 'next'

import NotFoundScreen, {
  FALLBACK_LOCALE,
  notFoundThemeCss,
} from '@/components/NotFoundScreen'
import { getDictionary } from '@/i18n/dictionaries'
import './globals.css'

/**
 * 어느 라우트에도 매칭되지 않은 URL 의 404 다.
 *
 * 이 파일이 없을 때 프로덕션이 내주던 응답은 `<html id="__next_error__">` 한 겹에
 * 본문이 0바이트였고, `og:image` 가 `http://localhost:3000/...` 을 가리켰다.
 * 렌더가 `[lang]/[slug]` 를 거치면서 그 라우트의 메타를 먼저 만들었기 때문이다.
 * `global-not-found` 는 라우팅 단계에서 바로 이 문서를 돌려주므로 그 경로를 타지 않는다.
 *
 * 루트 레이아웃이 `[lang]` 이라는 최상위 동적 세그먼트라, `<html lang>` 과
 * `<title>` 을 낼 수 있는 자리가 여기뿐이다. Next 문서가 드는 두 경우 중
 * 두 번째에 해당한다. 레이아웃을 건너뛰므로 전역 스타일을 직접 import 한다.
 */
export const metadata: Metadata = {
  title: getDictionary(FALLBACK_LOCALE).notFound.title,
  description: getDictionary(FALLBACK_LOCALE).notFound.description,
}

export default function GlobalNotFound() {
  return (
    <html lang={FALLBACK_LOCALE}>
      <head>
        <style>{notFoundThemeCss}</style>
      </head>
      <body>
        <NotFoundScreen />
      </body>
    </html>
  )
}
