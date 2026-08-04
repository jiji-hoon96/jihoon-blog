import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * 임시 검증용 라우트. Netlify 함수 런타임에서 Sentry 캡처가 동작하는지 확인한다.
 *
 * Deploy Preview 에서만 사용하고 main 에 머지하지 않는다.
 * 프로덕션 크레덴셜을 건드리지 않고 검증하기 위한 목적이다.
 *
 * 세 경로를 구분해서 본다.
 * - explicit: captureException 만 호출하고 바로 응답한다. google-analytics.ts 의
 *   실제 코드 경로와 같다. 서버리스 함수가 응답 후 얼면 전송이 끊길 수 있어
 *   이 경로가 실제로 동작하는지가 핵심이다.
 * - flush:    captureException 후 flush 로 전송 완료를 기다린다.
 * - throw:    핸들링하지 않고 던진다. instrumentation.ts 의 onRequestError 경로.
 */
export async function GET(request: NextRequest) {
  const mode = new URL(request.url).searchParams.get("mode") ?? "explicit";
  const stamp = new URL(request.url).searchParams.get("stamp") ?? "no-stamp";

  if (mode === "throw") {
    throw new Error(`sentry-check throw path (${stamp})`);
  }

  const error = new Error(`sentry-check ${mode} path (${stamp})`);
  Sentry.captureException(error, {
    tags: { verification: "netlify", mode, stamp },
  });

  if (mode === "flush") {
    const delivered = await Sentry.flush(5000);
    return NextResponse.json({ mode, stamp, delivered });
  }

  return NextResponse.json({ mode, stamp });
}
