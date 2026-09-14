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
    '/rss.xml',
    '/llms.txt',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
