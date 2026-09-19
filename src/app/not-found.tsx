import NotFoundScreen, {
  FALLBACK_LOCALE,
  notFoundThemeCss,
} from '@/components/NotFoundScreen'
import './globals.css'

/**
 * 세그먼트 안에서 `notFound()` 가 던져졌을 때의 404 다. 매칭되지 않은 URL 은
 * `src/app/global-not-found.tsx` 가 받는다. 그쪽은 `<html lang>` 과 `<title>` 을
 * 직접 낼 수 있고 이쪽은 낼 수 없다. 루트 레이아웃이 `[lang]` 이라는 최상위
 * 동적 세그먼트라서, 이 파일은 Next 가 자동 생성한 레이아웃 안에서 그려진다.
 *
 * `[lang]` 아래가 아니라 루트에 두는 이유가 있다. 글 라우트가
 * `dynamicParams = false` 라서 없는 슬러그는 세그먼트에 매칭조차 되지 않고
 * 전역 404 로 떨어진다. `[lang]/not-found.tsx` 는 그 요청에 닿지 않는다. (실측 확인)
 */
export default function NotFound() {
  return (
    <>
      <style>{notFoundThemeCss}</style>
      <div lang={FALLBACK_LOCALE}>
        <NotFoundScreen />
      </div>
    </>
  )
}
