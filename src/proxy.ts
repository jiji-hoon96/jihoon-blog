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

  return NextResponse.redirect(destination)
}

export const config = {
  matcher: [
    '/rss.xml',
    '/llms.txt',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
