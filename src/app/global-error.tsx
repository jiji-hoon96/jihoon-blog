'use client'

/**
 * 루트 레이아웃까지 터진 렌더 에러를 받는 최후의 경계.
 *
 * 이 파일이 없으면 방문자는 빈 화면만 본다. global-error 는 layout 을 대체하므로
 * html/body 를 직접 렌더해야 한다.
 *
 * Sentry 로 직접 보고하지 않는다. 이 컴포넌트는 브라우저에서 도는데
 * 이 블로그는 서버 전용 구성이라 브라우저 Sentry 클라이언트가 없고,
 * captureException 을 불러도 no-op 이면서 번들만 4.4KB 늘린다.
 * 서버 컴포넌트 렌더 에러는 instrumentation.ts 의 onRequestError 가 잡는다.
 * 클라이언트 계측을 다시 켜려면 src/instrumentation-client.ts 를 만들고
 * 여기에 captureException 을 되살리면 된다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          background: '#ffffff',
          color: '#0f172a',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            문제가 발생했습니다
          </h1>
          <p style={{ lineHeight: 1.7, color: '#475569', marginBottom: '1.5rem' }}>
            페이지를 그리는 중 오류가 생겼습니다. 잠시 후 다시 시도해 주세요.
            {error.digest ? (
              <>
                <br />
                <code style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {error.digest}
                </code>
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  )
}
