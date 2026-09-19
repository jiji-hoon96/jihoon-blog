import { NextResponse, type NextRequest } from 'next/server.js'
import { classifyLocaleRequest } from './lib/locale-request.ts'

const INTERNAL_LOCALE_REWRITE_HEADER = 'x-internal-locale-rewrite'

export function proxy(request: NextRequest) {
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
