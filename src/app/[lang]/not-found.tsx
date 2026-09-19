import NotFoundScreen from '@/components/NotFoundScreen'
import { isLocale } from '@/i18n/locales'

/**
 * 로케일 트리 안에서 `notFound()` 가 던져졌을 때의 404 다.
 *
 * 루트 `not-found.tsx` 만 두고 이 파일을 두지 않았을 때, 프로덕션은 없는 글
 * 슬러그에 `<html id="__next_error__">` 한 겹에 본문 0바이트를 내줬다. 로컬
 * `next start` 는 프리렌더된 404 를 내주므로 거기서는 드러나지 않는다.
 * Netlify 런타임이 `[lang]/[slug]` 를 실제로 렌더하기 때문인데, 그때 이 세그먼트에
 * 404 경계가 없으면 에러 경계로 떨어진다. 그래서 여기에 둔다.
 *
 * 레이아웃이 이미 `<main>` 을 갖고 있으므로 본문은 `div` 로 감싼다.
 */
export default async function LocaleNotFound({
  params,
}: {
  params?: Promise<{ lang: string }>
}) {
  const resolved = await params
  const lang = resolved && isLocale(resolved.lang) ? resolved.lang : undefined

  return <NotFoundScreen wrapper="div" locale={lang} />
}
