---
emoji: 🔭
title: 'Sentry 다시 열어보기'
seoTitle: 'Sentry MCP로 다시 고른 Sentry 기능: Crons, Logs, Metrics는 어디에 쓸까'
date: '2026-09-13'
updatedAt: '2026-09-16'
categories: 관측 Sentry AI
description: '오래 써 온 Sentry에서 켜지 않았던 기능을 Sentry MCP로 이 블로그의 실데이터에 먼저 물어보고 다시 고른 기록이다. 200 응답 속 GA 실패, 5초 타임아웃 뒤 338초 재발, breadcrumb 공백, 기능별 판정까지 다룬다.'
keywords: 'Sentry MCP, Sentry 기능 활용, Sentry breadcrumb, Sentry Crons 모니터링, Sentry Logs, DEADLINE_EXCEEDED 타임아웃, 서버리스 에러 모니터링, gray failure'
---

이번 포스팅에서는 오래 써 온 Sentry를 다시 열어본 이야기를 해보려고 한다.

필자는 회사에서 Sentry 기반 에러 모니터링을 오래 다뤄왔다. 이슈가 올라오면 stack trace를 열고, release와 태그로 범위를 좁히고, 재현 조건을 찾는 일은 손에 익은 작업이다. 그런데 돌아보면 쓰는 기능은 늘 그 언저리였다. Logs, Crons, Uptime, custom span, profiling은 존재를 알면서도 켜지 않았다.

이유는 지식이 아니라 **탐색 비용**이었다. 기능 하나가 내 문제에 맞는지 확인하려면 흩어진 문서를 맞춰 읽고, 실험을 설계하고, config를 배선하고, 결과를 해석해야 한다. 이슈 대응이 급한 날에는 그 비용을 낼 이유가 없었다. 최근 Claude Code에 Sentry MCP를 붙여 쓰면서 이 비용의 상당 부분이 내려갔고, 필자의 순서도 바뀌었다. 이제는 기능을 켜기 전에 **이 계정의 실제 데이터에 먼저 물어본다.**

이 글은 네 편짜리 관측 시리즈의 첫 편이다. 이 블로그의 서버 계측이 잡은 장애 하나를 따라간 뒤, MCP로 그 데이터를 다시 열어 새로 보인 것을 적고, 기능별로 어디에 쓸지 판정한다. 시리즈는 서버에서 시작해 브라우저 안의 렌더링과 CPU, 메모리를 거쳐 검색 데이터까지 간다.

## 성공 응답 속 실패

이 블로그의 Sentry는 2026년 8월에 서버 전용으로 붙였다. 브라우저 SDK를 뺀 판단은 2편에서 다루고, 여기서는 서버에서 무엇을 잡으려 했는지만 본다. 목적은 하나였다. 서버에서 Google Analytics Data API를 불러 방문자 통계를 그리는데, 그 호출이 실패해도 알 방법이 없었다.

처음에는 통계 API 라우트의 `catch`에 보고를 넣으면 될 줄 알았다. 그런데 로컬 프로덕션 빌드에 잘못된 서비스 계정 키를 넣어 실패시켜 보니 에러가 라우트까지 올라오지 않았다. 한 층 아래 통계 모듈의 `catch`가 먼저 잡아 기본값을 돌려주고 있었고, 응답은 이랬다.

```
HTTP 200 OK
{ "slug": "/260610", "views": 0 }
```

방문자에게는 통계가 0으로 보이고 서버는 정상이라고 답한다. 라우트의 에러율로는 아무 일도 없다. Microsoft Research와 Microsoft Azure 연구진이 HotOS 2017에서 발표한 [Gray Failure 논문](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/06/paper-1.pdf)은 이런 상태의 핵심을 이렇게 규정한다.

::::quote
:::translation
우리는 또한 gray failure의 핵심 특징이 differential observability, 즉 시스템의 실패 감지기가 애플리케이션이 피해를 보고 있는데도 문제를 알아차리지 못할 수 있다는 점이라고 주장한다.
:::

:::original
We also argue that a key feature of gray failure is differential observability: that the system's failure detectors may not notice problems even when applications are afflicted by them.
:::
::::

그래서 계측 지점을 라우트에서 통계 모듈의 `catch` 네 곳으로 내렸다. fallback 자체는 방문자 경험을 지키는 올바른 선택이므로 그대로 두고, fallback이 실행됐다는 사실만 따로 보고한 것이다. 당시에는 네 곳을 가르는 태그를 `gaQuery` 하나로 달았다.

```ts
// 2026-08 당시
Sentry.captureException(error, { tags: { gaQuery: 'stats' } })
```

지금 코드는 8월 17일 커밋 `f348d4c`에서 보고를 `captureServerException` 한 곳으로 모으고, :term[cardinality]{key="cardinality"}가 커지지 않게 태그 키를 `locale`, `routeKind`, `operation` 세 개로 제한한 모양이다.

```ts
// 현재 src/lib/google-analytics.ts
captureServerException(error, { routeKind: 'analytics', operation: 'stats' })
```

지금 통계 모듈의 보고 지점은 `catch` 세 곳과 자격증명 누락 경로 하나다. (`popular` 경로는 뒤에서 이야기할 이유로 9월에 지웠다) 자격증명 경로는 `catch`를 거치지 않고 곧장 fallback을 반환하는데, 오늘 방문자 수에 10~40의 기준값을 얹는 로직 때문에 화면에는 그럴듯한 숫자가 뜬다. 환경변수가 통째로 빠져도 사람 눈에 보이지 않는 경로라서 프로세스당 한 번만 보고하게 했다.

## 5초 타임아웃 뒤의 338초

계측을 내린 뒤 올라온 프로덕션 이슈 JIHOON-BLOG-2는 GA 호출이 **65.877초** 뒤 `DEADLINE_EXCEEDED`로 실패한 건이었다. 응답은 여전히 200이었다. 원인은 GA 클라이언트 라이브러리의 설정 파일에 있었다. `runReport`의 기본 RPC 타임아웃이 `timeout_millis: 60000`인데, 필자의 코드는 다섯 개 호출 지점 어디에도 타임아웃을 넘기지 않았다. Google SRE의 Gráinne Sheerin이 쓴 [gRPC 공식 블로그의 deadline 글](https://grpc.io/blog/deadlines/)이 첫 줄부터 "Always set a deadline"이라고 경고하는 바로 그 실수다.

수정 커밋 `927c85b`는 모든 호출에 5초를 넘기게 했다. 응답하지 않는 로컬 TCP 서버를 세워 재현한 결과는 설명대로였다.

| 조건 | 경과 시간 | 에러 메시지 |
|---|---|---|
| 타임아웃 미지정 | **60.04초** | `Deadline exceeded after 60.000s` |
| `timeout: 5000` | **5.00초** | `Deadline exceeded after 5.000s` |

(5라는 숫자에는 근거가 없다. GA의 정상 응답 분포를 재지 않았다. 다만 이 블로그에서 방문자 수는 부가 정보라, 오래 기다리기보다 빨리 포기하는 방향은 맞다고 봤다) 그 이슈는 지금 이슈 목록에 나오지 않는다. 65.877초라는 값은 커밋 메시지와 리포 문서에 남은 기록이다.

여기서 끝났어야 했는데, 수정이 배포된 릴리스에서 새 이슈 JIHOON-BLOG-8이 쌓이기 시작했다. 메시지는 `Deadline exceeded after 338.655s`였고, 스택에도 `google-gax`의 타임아웃 래퍼가 그대로 있었다. 설정은 코드에 닿아 있는데 보고된 시간이 설정의 70배에 가까웠던 것이다.

8월 18일 무렵 당시 가장 최근 100건을 뽑아 분포를 그렸다.

![타임아웃을 5초로 고정한 뒤에도 DEADLINE_EXCEEDED 100건의 보고 시간이 5초에서 504초까지 고르게 퍼져 있다](1.png?w=720)

하한은 5.16초로 설정에 붙어 있고, 중앙값은 61초, 최댓값은 504초다. 값은 어느 구간에도 몰리지 않았다. (이 그림은 지금 다시 그릴 수 없다. 이유는 다음 절에서 나온다) 태그는 `stats`와 `popular` 두 값뿐이었고, 대개 쌍으로 올라왔다. 두 경로의 공통점은 한 시간짜리 `unstable_cache` 뒤의 재검증 경로라는 것이다. 요청마다 GA를 부르는 `page`, `pages`는 한 번도 나오지 않았다.

그래서 필자는 가설 하나를 세웠다. 서버리스 함수는 응답을 보낸 뒤 다음 호출까지 실행 환경이 얼 수 있다. 그동안 타이머도 멈췄다가 깨어난 뒤에야 발화한다면, 실제로 기다린 시간이 아니라 얼어 있던 시간까지 포함한 wall-clock time(실제 경과 시간)이 찍힌다. 다만 분포가 가설과 어긋나지 않는다는 것과 가설을 지지한다는 것은 다르다. 이벤트 루프를 무거운 작업이 물고 있었어도 같은 모양이 나온다.

## MCP로 다시 열어본 데이터

이 글을 쓰면서 2026년 9월 16일에 Sentry MCP로 같은 데이터를 다시 조회했다. 고쳤다고 믿은 것이 지금도 그런지 확인하려는 것이었는데, 대시보드에서 이슈 화면을 오가며 찾던 것들이 대화 몇 번으로 나왔다. 아래는 조회로 확인한 사실과 거기서 끌어낸 추론을 나눠 적는다.

### 발생이 멈춘 이유

JIHOON-BLOG-8의 마지막 발생은 8월 18일 13:45 UTC이고, 그 뒤로 0건이다. 그래프만 보면 문제가 사라진 것 같지만, 필자는 가설을 검증하거나 고친 적이 없다. 같은 날 커밋 `417d3b4`가 다국어 개편을 하면서 홈에서 방문자 통계와 인기 글 영역을 뺐고, `stats`와 `popular`를 부르던 화면이 정확히 그 둘이다. 9월에 남은 인기 글 경로를 지운 커밋 `5752e09`의 메시지는 이것을 "5초 타임아웃이 아니라 호출 지점이 사라진 것이 이벤트가 멎은 직접적인 이유"라고 적었다. 그런데 시각을 맞춰 보면 그 커밋이 main에 푸시된 것은 22:07 UTC로, 마지막 이벤트보다 8시간 넘게 뒤다. 남은 이벤트가 하루에 10건 남짓이라 8시간의 공백 자체는 이상하지 않고, 배포 뒤로 발생이 없다는 사실과도 어긋나지 않는다. 다만 시각만으로 호출 지점 제거가 멈춘 이유라고 확정할 수는 없어서, 필자는 그 메시지를 가장 유력한 설명 정도로 읽는다.

이슈의 resolved는 원인 규명의 증명이 아니다. 발생이 0이 되는 길은 실제로 고쳐졌거나, 아무도 그 경로를 밟지 않게 됐거나, 계측이 사라졌거나 셋이다. 에러 신호만으로는 이 셋이 구분되지 않는다.

### breadcrumb에 남은 5분 39초

마지막 이벤트의 :term[breadcrumb]{key="breadcrumb"}를 MCP로 꺼내 봤다. breadcrumb는 흔히 브라우저의 클릭과 탐색 기록으로 떠올리지만, 이 블로그의 Node 서버 SDK도 http 요청과 console 출력을 자동으로 남기고 있었다.

![JIHOON-BLOG-8 마지막 이벤트의 breadcrumb 타임라인. 캐시 조회 뒤 에러까지 5분 39초 동안 기록이 없다](2.png?w=720)

사실은 이렇다. 함수는 13:40:02에 시작했고, 13:40:07에 Netlify Blobs 캐시 조회 6건이 있었다. 그다음 기록은 13:45:46의 console error 두 건이다. 보고된 338.66초를 거꾸로 빼면 GA 호출은 캐시 조회 0.5초 뒤, 콜드 스타트 약 6초 뒤에 출발했다.

여기서 끌어낼 수 있는 것은 제한적이다. 5초 뒤에 울려야 할 타이머가 5분 39초 뒤에 울렸고, 그 사이 이 요청은 아무 기록도 남기지 않았다. 동결 가설과 어긋나지는 않지만 이벤트 루프 점유 가설도 지우지 못한다. 그래도 전에 없던 정보가 하나 생겼다. 실패가 **콜드 스타트 직후 캐시 재검증에서 출발한 호출**이었다는 시작 시각이다.

### 보존 기간이 지운 이벤트

JIHOON-BLOG-8 이슈의 발생 카운터는 **144**다. 같은 이슈를 errors 데이터셋에서 90일로 집계하면 2026년 9월 16일 14:26 UTC 조회 기준 **10**건만 나온다. 남은 10건은 8월 17일 15:03부터 18일 13:45 UTC까지이고, 조회 시점에서 거의 정확히 30일 안쪽이다. 같은 날 08:45 UTC에 조회했을 때는 14건이었으니, 이 숫자는 조회할 때마다 줄어든다.

추론을 덧붙이면, 이벤트 보존 기간이 30일이라 오래된 이벤트는 지워지고 이슈 카운터만 남은 것으로 보인다. Sentry [요금제 페이지](https://sentry.io/pricing/)는 무료 플랜인 Developer의 조회 범위를 30일로 적는다. 다만 이 계정의 플랜 종류와 카운터가 유지되는 방식은 확인하지 않았다. 확실한 것은 결과다. 위의 100건 분포는 다시 뽑을 수 없고, 저장되지 않은 데이터는 어떤 도구로도 복원되지 않는다.

### span이 0개인 trace

같은 이벤트의 `trace_id`로 trace를 열면 span이 **0개**다. 이벤트에는 `client_sample_rate: 0.1`이 찍혀 있다. 10% :term[sampling]{key="sampling"}에서 빠졌을 수도, span 보존 기간을 넘겼을 수도 있는데 둘 중 무엇인지는 가를 수 없었다.

최근 30일 `http.client` span을 도메인별로 묶어도 GA API 도메인은 없었다. 대부분이 Netlify Blobs 조회다. 가장 유력한 설명은 그 기간에 GA 호출 자체가 거의 없었다는 것이다(홈의 통계 영역이 이미 빠졌다). gRPC 호출이 자동 계측에 span으로 잡히는지는 아직 확인하지 않았다. 참고로 이 집계의 `count()`는 [샘플링을 역가중한 외삽 값](https://docs.sentry.io/concepts/key-terms/extrapolation/)인데, MCP 응답에는 그 경고가 없었다. 숫자를 요청 수로 읽지 않는 것은 여전히 사람 몫이다.

### production에 섞인 로컬 검증

9월 16일에 열린 JIHOON-BLOG-B는 `Google Analytics credentials missing: GA_PROPERTY_ID`다. 이벤트를 열어 보니 URL이 `http://localhost:3117/api/analytics`, 브라우저가 `curl 8.7.1`, 서버 이름이 필자의 MacBook이었다. 그런데 `environment`는 `production`이다.

필자가 리포 문서의 로컬 검증 절차(`pnpm build` 뒤 `pnpm start`)를 따르다 생긴 이벤트다. `src/lib/sentry-options.ts`는 `SENTRY_ENVIRONMENT`가 없으면 Netlify의 `CONTEXT`로 환경을 정한다. Deploy Preview를 프로덕션에서 떼어 내려고 만든 장치인데, 둘 다 없는 로컬에서는 환경 값을 넘기지 않고, 이벤트에는 결국 `production`이 찍혔다. 프리뷰는 막았지만 로컬은 막지 못한 것이다. 이 상태로 production 기준 알림을 걸면 필자의 실험이 알림을 울린다. 

그래서 리포 문서의 검증 명령에 `SENTRY_ENVIRONMENT=local`을 넣었다. 코드에서 기본값을 바꾸지 않은 이유는, Netlify 함수 런타임에서 `CONTEXT`가 항상 보인다는 것을 아직 확인하지 않았기 때문이다. 확인 없이 기본값을 `local`로 두면 이번에는 프로덕션 이벤트가 `local`로 숨을 수 있다.

## 어디에 무엇을 쓸까

같은 방식으로 켜지 않은 기능도 데이터부터 확인했다. 최근 30일 기준 logs 0건, profiles 0건, replays 0건, cron monitor 0개, uptime monitor 0개였다. 설정 파일을 읽고 "안 켰다"고 쓰는 대신 "0이다"를 확인한 셈이다. 아래 표는 각 기능의 현재 상태를 2026년 9월 16일에 공식 문서와 changelog로 다시 확인해 정리한 것이다.

| 기능 | 답하는 질문 | 전제 | 비용 | 이 블로그 판정 |
|---|---|---|---|---|
| Issues와 grouping | 이 이벤트들이 한 사건인가 | SDK, 소스맵 | 에러 쿼터 | 쓰는 중 |
| Crons | 예약 작업이 제때 돌았나 | check-in 전송 | 1개 포함, 추가분은 유료 플랜 PAYG | **켤 것** |
| Uptime | 밖에서 URL이 2xx인가 | 없음 | 1개 포함, 추가분은 유료 플랜 PAYG | 보조로 고려 |
| Alerts | 사람을 언제 깨울까 | environment 분리 | 별도 요금 항목 없음 | 건수 임계치 대신 발생 여부 |
| Logs | fallback이 언제 얼마나 실행됐나 | SDK 설정 | 5GB 포함 | GA 호출 후보 |
| Application Metrics | 샘플링과 무관한 분포는 | JS SDK 지원 버전 | 5GB 포함 | GA 호출 후보 |
| custom span | 요청 안의 어느 구간이 느렸나 | tracing | span 쿼터, 10% 샘플링 | 후보 |
| Session Replay | 사용자가 무엇을 봤나 | 브라우저 SDK | 번들, replay 쿼터 | 안 켬 (2편) |
| User Feedback | 사용자가 무엇이 틀렸다고 말하나 | 브라우저 SDK | 번들 | 안 켬 |
| 브라우저 profiling | 어떤 JS 함수가 메인 스레드를 막았나 | beta, Chromium, 헤더 | UI profile 시간 | 3편에서 판단 |
| Seer | 이 이슈의 원인과 수정안은 | GitHub/GitLab 연동 | 활성 기여자당 $40/월 | 돌리지 않음 |
| Sentry MCP | 에디터에서 데이터를 조회하려면 | OAuth 연결 | 에이전트 토큰 | 쓰는 중 |
| Agent Tracing | LLM 호출과 tool 실행 추적 | AI SDK 연동 | span 쿼터 | 해당 없음 |

### 켤 것은 Crons

가장 먼저 켤 것은 Crons다. 이 블로그는 GitHub Actions로 매주 월요일 Search Console 데이터를 수집하는데, 어느 주에 그 작업이 조용히 돌지 않으면 에러조차 나지 않는다. 실패가 아니라 **기대한 사건의 부재**라서다. [Sentry CLI의 Crons 문서](https://docs.sentry.io/cli/crons/)대로 `sentry-cli monitors run --schedule "<expected schedule>" <monitor-slug> -- <command>` 형태로 기존 명령을 감싸면 시작과 끝이 check-in으로 가고, 인증은 프로젝트 DSN으로 한다. 요금제 문서상 모든 플랜에 cron monitor 1개가 포함되고 추가분은 유료 플랜의 PAYG 예산으로만 살 수 있는데, 이 용도에는 1개면 된다.

Uptime은 대비가 분명하다. 외부에서 URL을 주기적으로 찔러 보는 기능인데, 기본 판정은 2xx면 통과라서 **기본 설정으로는 200 응답 속 실패를 못 잡는다.** Early Adopter 대상인 Verification을 쓰면 JSON 본문까지 검사할 수 있지만, 이 블로그에서는 그래도 어렵다. 실패가 대부분 방문자 요청이 아니라 캐시 재검증 경로에서 났고, 통계 API 라우트는 이제 부르는 클라이언트도 없다. 사이트가 통째로 죽는 경우의 보조 수단으로는 의미가 있지만, 이 블로그가 실제로 겪은 장애와는 층이 다르다.

### GA 호출에는 Logs와 Metrics

GA 호출에는 에러 이벤트만으로 부족한 이유가 있다. `unstable_cache`가 실패 결과까지 한 시간 캐시하므로 캐시 뒤 경로의 에러 이벤트는 시간당 최대 1건이다. 이벤트 수를 영향 범위로 읽으면 체계적으로 과소평가하게 된다. 그리고 앞 절에서 봤듯 오래된 이벤트는 사라져 분포를 다시 그릴 수 없었다.

Sentry의 Next.js [breadcrumb 문서](https://docs.sentry.io/platforms/javascript/guides/nextjs/enriching-events/breadcrumbs/)는 첫머리부터 수동 breadcrumb 대신 Logs를 쓰라고 권한다. Logs는 [2025년 9월 GA](https://sentry.io/changelog/logs-are-generally-available/)됐고, fallback이 실행될 때마다 경과 시간과 함께 남기기에 맞다. 분포 자체가 목적이라면 [2026년 5월 GA된 Application Metrics](https://sentry.io/changelog/application-metrics-are-now-ga/)가 더 직접적이다. [span metrics 문서](https://docs.sentry.io/platforms/javascript/tracing/span-metrics/)도 trace 샘플링에 영향받지 않는 집계는 Application Metrics로 안내한다. custom span은 한 요청 안의 구간을 보는 데는 좋지만 10% 표본이라 드문 실패를 놓친다. 셋 다 아직 켜지 않았고, 켠다면 Metrics의 분포부터 보겠다.

알림도 같은 이유로 건수에 걸지 않는다. 시간당 최대 1건으로 눌린 이벤트에 "N건 이상" 임계치를 걸면 영향 범위를 과소평가한 채로 조용해진다. 그래서 이 블로그의 판정은 발생 여부다. Rob Ewaschuk의 [My Philosophy on Alerting](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/)은 원인보다 사용자가 겪는 증상에 알림을 걸라고 권하는데, 그 원칙은 증상이 어딘가에 드러난다는 전제 위에 있다. 이 블로그의 실패는 200 응답과 0이라는 숫자로 가려지므로, fallback이 실행됐다는 사실을 계측해야 비로소 알림을 걸 증상이 생긴다.

### 브라우저 SDK가 전제인 기능

Session Replay와 User Feedback은 브라우저 SDK를 전제로 한다. 이 블로그는 그 SDK를 두지 않기로 했으므로 지금 판정은 "안 켬"이고, 번들 비용의 근거는 2편에서 다룬다. 브라우저 profiling도 SDK가 필요한 데다 beta이고 조건이 여럿 붙는데, 그 조건이 실제로 무엇을 보여주는지는 3편에서 따진다.

### 돌리지 않은 기능

Seer는 [요금제 문서](https://docs.sentry.io/pricing/) 기준 구독에 더해 활성 기여자당 월 $40을 내는 유료 애드온이다. 이번에 9월 11일 열린 Next.js 내부 `InvariantError` 이슈(JIHOON-BLOG-A)에 돌려볼지 검토했지만, 구독이 필요한 기능이라 돌리지 않았다. 이 계정의 구독 여부는 확인하지 않았다. 그러니 이 글에는 Seer의 1차 경험이 없다. Agent Tracing은 [2026년 9월 11일에 GA](https://sentry.io/changelog/agent-tracing-is-now-ga/)가 됐다. 모델의 기억이나 옛 글에 기대면 beta라고 틀리게 쓰기 쉬운 항목이지만, 이 블로그에는 LLM 호출 경로가 없어 해당 사항이 없다.

## AI가 줄인 것과 줄이지 못한 것

이번 작업에서 AI가 줄여준 비용은 분명하다. 흩어진 문서에서 조건을 모으는 일(브라우저 profiling의 beta 여부, 헤더, 브라우저 제한), 쿼리 문법을 익혀 group by를 바꿔가던 일, breadcrumb 시각을 빼고 더하는 계산, 기능 표의 초안이 모두 대화 몇 번으로 끝났다. 예를 들어 breadcrumb 타임라인은 `get_issue_breadcrumbs` 한 번, 모니터가 0개라는 사실은 `find_monitors`와 `find_uptime_monitors` 두 번의 호출로 확인했다. 탐색의 문턱이 낮아지니 "켤까 말까"를 판단하기 전에 "지금 데이터가 무엇을 말하는가"를 먼저 묻는 순서가 가능해졌다.

줄이지 못한 것도 그만큼 분명하다.

- **저장되지 않은 데이터.** 144건 중 134건(9월 16일 14:26 UTC 기준)은 사라졌고, 표본에서 빠진 span은 처음부터 없다. 에이전트는 없는 데이터를 복원하지 못한다.
- **배포가 필요한 실험.** gRPC 호출이 span으로 잡히는지, 동결과 이벤트 루프 점유를 가르는지는 실제로 계측을 넣고 배포해야 안다.
- **해석의 조건.** 외삽 값 경고, 로컬 이벤트가 production으로 찍힌 사실은 응답에 표시되지 않았다. 알아본 것은 이벤트의 URL과 서버 이름을 직접 읽었기 때문이다.
- **날짜와 도구의 시차.** Agent Tracing처럼 닷새 전에 상태가 바뀐 기능은 changelog를 열어 확인해야 했다. MCP 도구도 제품을 뒤따라가는 중이다. 이슈 검색에 `OR`를 넣으면 400이 돌아왔고, 알림 규칙 조회 도구는 410 `This API no longer exists`를 돌려줬다.
- **무엇을 실패로 볼지.** 200 응답과 0이라는 통계를 실패로 정의하고 계측 지점을 아래로 내린 판단이 먼저 있었기에, 다시 열어볼 이벤트가 애초에 남아 있었다.

## 마치며

정리하면, 필자가 Sentry의 기능 대부분을 켜지 않았던 이유는 몰라서가 아니라 확인하는 데 드는 비용 때문이었다. AI는 그 비용을 크게 낮췄고, 그 덕분에 기능을 켜기 전에 이 계정의 데이터에 먼저 묻는 순서로 바뀌었다. 그렇게 다시 열어본 데이터는 새 기능보다 먼저 몇 가지 불편한 사실을 보여줬다. 고쳤다고 믿은 장애는 고친 적 없이 멈췄을 뿐이고, 당시의 분포는 보존 기간을 넘겨 다시 그릴 수 없으며, 필자의 로컬 검증은 production 이슈로 섞이고 있었다.

그래서 이 블로그의 다음 순서는 기능 목록이 아니라 빈칸에서 정해졌다. 주간 수집에는 Crons를 붙이고, GA 호출에는 보존과 샘플링에 덜 흔들리는 신호를 고르고, 로컬 환경 이름부터 바로잡는 것이다. 이 글을 읽는 독자 분들도 오래 써 온 도구의 켜지 않은 기능을 떠올려 보면 좋겠다. 그 기능이 정말 필요 없었는지, 아니면 확인하는 비용이 비쌌을 뿐인지를 이제는 데이터에 직접 물어볼 수 있다.

다음 편에서는 이 블로그가 두지 않기로 한 브라우저 SDK의 자리로 넘어가, [브라우저 관측](/260914)에서 방문자의 화면 안에서 일어나는 일을 어떻게 보는지 다룬다.

:::ref
- [docs] [Sentry, Issue Grouping](https://docs.sentry.io/concepts/data-management/event-grouping/)
- [docs] [Sentry, Uptime Monitoring](https://docs.sentry.io/product/monitors-and-alerts/monitors/uptime-monitoring/)
- [repo] [getsentry/sentry-mcp](https://github.com/getsentry/sentry-mcp)
:::
