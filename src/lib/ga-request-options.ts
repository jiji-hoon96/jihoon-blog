/**
 * GA Data API 호출에 공통으로 적용하는 gax CallOptions.
 *
 * `@google-analytics/data` 의 runReport 는 라이브러리 기본 RPC 타임아웃이
 * 60초다. (beta_analytics_data_client_config.json 의 `timeout_millis: 60000`)
 * 호출 지점에서 타임아웃을 넘기지 않으면 GA 가 응답하지 않을 때 요청이
 * 60초 넘게 매달린다. 프로덕션에서 "Deadline exceeded after 65.877s" 로
 * 관측됐고, catch 의 fallback 때문에 응답은 200 이라 조용히 통계만 비었다.
 *
 * 이 블로그에서 GA 수치는 부가 정보다. 정확히 받는 것보다 빠르게 포기하고
 * fallback 을 렌더하는 편이 방문자 경험에 낫다.
 *
 * Next 에 의존하지 않는 별도 모듈로 둔 이유는 테스트다.
 * google-analytics.ts 는 `next/cache` 를 import 해서 `node --test` 로
 * 불러올 수 없다.
 */

/** GA 호출 하나가 기다릴 수 있는 최대 시간. */
export const GA_REQUEST_TIMEOUT_MS = 5_000;

export function gaCallOptions(): { timeout: number } {
  return { timeout: GA_REQUEST_TIMEOUT_MS };
}
