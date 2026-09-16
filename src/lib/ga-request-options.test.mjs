import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

// gax 가 CallOptions 를 받는 GA Data API 메서드. 새 메서드를 쓰기 시작하면 여기에 더한다.
const GA_CLIENT_METHODS = [
  "runReport",
  "runRealtimeReport",
  "batchRunReports",
  "runPivotReport",
  "batchRunPivotReports",
  "getMetadata",
  "checkCompatibility",
];

const SRC_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

function collectSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\./.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

/** `(` 부터 짝이 맞는 `)` 까지를 돌려준다. 문자열 안의 괄호는 세지 않는다. */
function argumentList(source, openIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === "\\") i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(" || char === "{" || char === "[") depth += 1;
    else if (char === ")" || char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  throw new Error("괄호가 닫히지 않았다");
}

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

/**
 * 파일 하나만 보던 이전 버전은 새 파일에 GA 호출을 두면 그냥 통과했고,
 * runReport 개수와 gaCallOptions() 개수가 같기만 하면 되어서
 * 요청 객체 안에 스프레드로 섞어 넣어도 잡지 못했다.
 * 이제 src 전체를 훑고, 각 호출의 두 번째 인자가 gaCallOptions() 인지 본다.
 */
test("every GA Data API call in src passes gaCallOptions() as its own argument", () => {
  const offenders = [];
  let callSites = 0;

  for (const file of collectSourceFiles(SRC_DIRECTORY)) {
    const source = readFileSync(file, "utf8");
    for (const method of GA_CLIENT_METHODS) {
      const pattern = new RegExp(`\\.${method}\\s*\\(`, "g");
      for (const match of source.matchAll(pattern)) {
        callSites += 1;
        const openIndex = match.index + match[0].length - 1;
        const args = argumentList(source, openIndex);
        // gax 는 CallOptions 를 두 번째 인자로만 읽는다. 요청 객체에 섞으면 무시된다.
        if (!/,\s*gaCallOptions\(\)\s*,?\s*$/.test(args.trimEnd())) {
          const line = source.slice(0, match.index).split("\n").length;
          offenders.push(`${path.relative(SRC_DIRECTORY, file)}:${line} .${method}`);
        }
      }
    }
  }

  assert.ok(callSites > 0, "GA 호출을 하나도 찾지 못했다. 탐지 자체가 망가졌다");
  assert.deepEqual(
    offenders,
    [],
    `두 번째 인자로 gaCallOptions() 를 넘기지 않는 호출:\n${offenders.join("\n")}`,
  );
});
