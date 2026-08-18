import { NextResponse, type NextRequest } from 'next/server'
import { classifyLocaleRequest } from './lib/locale-request.ts'

export function proxy(request: NextRequest) {
  const decision = classifyLocaleRequest(request.nextUrl.pathname)

  if (decision.kind === 'next') {
    return NextResponse.next()
  }

  const destination = request.nextUrl.clone()
  destination.pathname = decision.pathname

  return decision.kind === 'rewrite'
    ? NextResponse.rewrite(destination)
    : NextResponse.redirect(destination)
}

export const config = {
  matcher: [
    '/rss.xml',
    '/llms.txt',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
