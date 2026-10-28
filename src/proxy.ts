import { NextResponse, type NextRequest } from 'next/server.js'
import { classifyLocaleRequest } from './lib/locale-request.ts'

const INTERNAL_LOCALE_REWRITE_HEADER = 'x-internal-locale-rewrite'
const NEXT_ACTION_HEADER = 'next-action'

export function proxy(request: NextRequest) {
  // 이 사이트에는 Server Action 이 하나도 없다. 그런데도 `Next-Action` 헤더를 단
  // POST 가 들어오면 Next 가 액션을 찾다가 RSC 가 아닌 응답을 받고
  // `Invariant: Expected RSC response` 로 던진다. 프로덕션의 JIHOON-BLOG-A 가 이것이고,
  // 요청은 `Next-Action: cachefn` 과 `X-Middleware-Subrequest` 를 단 스캐너였다.
  // 처리할 액션이 없으므로 렌더까지 가기 전에 끊는다.
  if (request.headers.has(NEXT_ACTION_HEADER)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const decision = classifyLocaleRequest(request.nextUrl.pathname, {
    internalRewrite:
      request.headers.get(INTERNAL_LOCALE_REWRITE_HEADER) === '1',
  })

  if (decision.kind === 'next') {
    return NextResponse.next()
  }

  // 잘못된 percent-escape 는 라우팅 자체가 불가능하다. 통과시키면 500 이 되므로
  // 여기서 끊는다. 본문을 렌더하려면 다시 그 경로를 타야 해서 평문으로 답한다.
  if (decision.kind === 'not-found') {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const destination = request.nextUrl.clone()
  destination.pathname = decision.pathname

  if (decision.kind === 'rewrite') {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(INTERNAL_LOCALE_REWRITE_HEADER, '1')

    return NextResponse.rewrite(destination, {
      request: { headers: requestHeaders },
    })
  }

  // 내려간 글은 영구 이전이므로 308 로 보내 색인을 옮기게 한다. 로케일 접두사를
  // 떼는 정규화 리다이렉트는 기존대로 307 이다.
  return NextResponse.redirect(destination, decision.permanent ? 308 : undefined)
}

export const config = {
  matcher: [
    // 점이 든 경로는 아래 패턴이 통째로 제외하므로 하나씩 적어 준다.
    '/rss.xml',
    '/llms.txt',
    '/ko/rss.xml',
    '/ko/llms.txt',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
