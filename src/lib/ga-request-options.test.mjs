import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GA_REQUEST_TIMEOUT_MS, gaCallOptions } from "./ga-request-options.ts";

/**
 * JIHOON-BLOG-2 회귀 방지.
 *
 * GA Data API 의 runReport 는 라이브러리 기본 RPC 타임아웃이 60초다.
 * (@google-analytics/data 의 beta_analytics_data_client_config.json)
 * 호출 지점에서 타임아웃을 넘기지 않으면 GA 가 응답하지 않을 때 요청이
 * 60초 넘게 매달리고, catch 의 fallback 때문에 응답은 200 으로 나간다.
 * 프로덕션에서 "Deadline exceeded after 65.877s" 로 관측됐다.
 */

test("bounds GA calls well below the library's 60 second default", () => {
  assert.equal(typeof GA_REQUEST_TIMEOUT_MS, "number");
  assert.ok(
    GA_REQUEST_TIMEOUT_MS > 0,
    "타임아웃이 0 이하면 호출이 즉시 실패한다",
  );
  assert.ok(
    GA_REQUEST_TIMEOUT_MS <= 10_000,
    `방문자를 기다리게 하지 않으려면 10초 이하여야 한다 (현재 ${GA_REQUEST_TIMEOUT_MS}ms)`,
  );
});

test("passes the timeout as gax CallOptions", () => {
  assert.deepEqual(gaCallOptions(), { timeout: GA_REQUEST_TIMEOUT_MS });
});

test("every runReport call in google-analytics.ts uses the shared options", () => {
  const source = readFileSync(
    new URL("./google-analytics.ts", import.meta.url),
    "utf8",
  );

  const callCount = source.match(/\.runReport\(/g)?.length ?? 0;
  const optionCount = source.match(/gaCallOptions\(\)/g)?.length ?? 0;

  assert.ok(callCount > 0, "runReport 호출을 찾지 못했다");
  assert.equal(
    optionCount,
    callCount,
    `runReport ${callCount}개 중 ${optionCount}개만 타임아웃을 넘긴다`,
  );
});
