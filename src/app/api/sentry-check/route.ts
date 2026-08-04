import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * 임시 검증용 라우트. 소스맵 업로드 후 스택 트레이스가 읽히는지 확인한다.
 *
 * Deploy Preview 에서만 사용하고 main 에 머지하지 않는다.
 *
 * 판정 기준은 빌드 로그의 "업로드 완료" 가 아니라 Sentry 이벤트의 프레임이다.
 * 업로드 전에는 culprit 이 y([root-of-the-server]__468aa3ae._) 처럼 찍혔다.
 * 이 파일 경로와 줄번호로 바뀌어야 통과다.
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "explicit";
  const stamp = params.get("stamp") ?? "no-stamp";

  if (mode === "throw") {
    throw new Error(`sourcemap-check throw path (${stamp})`);
  }

  const error = new Error(`sourcemap-check explicit path (${stamp})`);
  Sentry.captureException(error, {
    tags: { verification: "sourcemaps", mode, stamp },
  });
  await Sentry.flush(5000);

  return NextResponse.json({ mode, stamp });
}
