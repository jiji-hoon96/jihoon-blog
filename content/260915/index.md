---
emoji: 🧮
title: '브라우저의 CPU와 메모리'
seoTitle: '브라우저 메인 스레드와 메모리 관측: Long Task, LoAF, 프로파일링, 메모리 측정 API'
date: '2026-09-15'
updatedAt: '2026-09-16'
categories: 관측 프론트엔드 브라우저
description: '브라우저 메인 스레드와 메모리 관측을 정리한다. long task와 TBT, LoAF, JS Self-Profiling, 메모리 측정 API, crash report가 무엇을 보여주는지 이 블로그의 Lighthouse 실측과 응답 헤더로 확인했다.'
keywords: '브라우저 메인 스레드, long task 50ms, Long Animation Frames API, Total Blocking Time, JS Self-Profiling API, Sentry 브라우저 프로파일링, measureUserAgentSpecificMemory, 브라우저 메모리 누수'
---

이번 포스팅에서는 브라우저의 메인 스레드와 메모리를 관측하는 방법에 대한 이야기를 해보려고 한다.

[앞 글](/260914)에서는 네트워크와 렌더링, Web Vitals를 따라가며 브라우저가 로딩과 상호작용에 대해 남기는 값을 봤다. 그런데 그 지표가 나빠진 원인을 찾아 내려가면 대개 두 곳에 닿는다. 메인 스레드가 다른 일로 바빠 입력과 렌더링을 제때 처리하지 못했거나, 메모리가 쌓여 페이지가 느려지거나 끝내 죽은 경우다.

이 두 영역은 Web Vitals보다 관측이 까다롭다. API가 대부분 Chromium 전용이고, 어떤 API는 응답 헤더를 바꿔야 켜지고, 어떤 신호는 구조적으로 JavaScript가 받을 수 없다. [시리즈 첫 글](/260913)의 Sentry 기능 표에서 브라우저 profiling 판단을 이 글로 미뤘는데, 그 조건도 여기서 푼다.

필자가 직접 확인한 것은 Lighthouse 두 번의 실행, 프로덕션 응답 헤더, 설치된 `web-vitals` 빌드 파일이다. 결론부터 말하면 이 블로그는 메인 스레드를 lab 측정으로 윤곽만 보고 있고, 메모리와 crash는 볼 수단이 없다.

## 메인 스레드가 바쁘다는 것

브라우저의 메인 스레드는 JavaScript 실행, 스타일 계산, 레이아웃, 사용자 입력 처리를 한 줄로 처리한다. 한 태스크가 도는 동안에는 다른 일이 끼어들 수 없어서, 그 사이에 사용자가 버튼을 누르면 입력 이벤트는 태스크가 끝날 때까지 기다린다.

이 기다림을 자르는 기준이 50ms다. W3C의 [Long Tasks API 명세](https://w3c.github.io/longtasks/)는 50ms 이상 메인 스레드를 점유한 태스크를 long task로 정의하고 근거도 적는다. 입력에 100ms 안에 반응하려면 입력 순간 실행 중이던 태스크가 50ms 안에 끝나고, 그 입력을 처리하는 태스크도 50ms 안에 끝나야 한다는 것이다. 50ms는 100ms 반응 목표를 둘로 나눈 값인 것이다.

### TBT는 long task의 초과분을 더한다

개수만 세면 60ms와 600ms가 같아지므로 lab 도구는 Total Blocking Time(TBT)을 쓴다. web.dev의 TBT 문서에 따르면 long task 하나의 blocking time은 50ms를 넘은 부분이고, TBT는 FCP 이후 long task들의 blocking time을 더한 값이다. Lighthouse는 기본적으로 TTI(Time to Interactive)까지만 센다.

![메인 스레드 타임라인의 태스크 다섯 개 중 50ms를 넘은 세 개의 초과분이 각각 200, 40, 105ms로 표시된 그림](1.png?w=720)

(그림 출처: [web.dev, Total Blocking Time (TBT)](https://web.dev/articles/tbt), CC BY 4.0)

노란 부분이 각 태스크의 처음 50ms, 붉은 부분이 blocking time이다. 같은 문서의 예시에서 태스크 실행 시간 합은 560ms지만 TBT는 345ms다. 50ms보다 짧은 태스크는 아무리 자주 와도 TBT에 기여하지 않는다.

### TBT는 INP를 대신하지 못한다

TBT는 lab 지표이고, Core Web Vitals의 반응성 지표는 INP다. web.dev의 [INP 문서](https://web.dev/articles/inp)는 상호작용 없이 로딩만 보는 lab 도구에서 TBT가 합리적인 대리 지표일 수는 있어도 대체물은 아니라고 선을 긋는다.

TBT는 사용자가 언제 무엇을 눌렀는지 모르기 때문이다. 메인 스레드가 많이 막혀도 사용자가 스크립트가 끝난 뒤에 누르면 INP는 낮을 수 있다. long task가 INP에 닿는 경로는 누른 순간 실행 중이던 태스크의 남은 시간만큼 앞 글에서 본 input delay를 늘리는 것이다. 그러니 낮은 TBT는 "로딩 중 메인 스레드가 크게 막히지 않았다"까지만 말해 준다. 실제 입력이 무엇에 막혔는지는 field에서 태스크와 프레임을 봐야 안다.

## Long Tasks와 Long Animation Frames

field에서 메인 스레드를 보는 브라우저 API는 두 개다. Chrome 58부터 있던 Long Tasks API(`PerformanceLongTaskTiming`)와 Chrome 123에 출시된 Long Animation Frames API(`PerformanceLongAnimationFrameTiming`, 줄여서 LoAF)다. 둘 다 :term[PerformanceObserver]{key="performance-observer"}로 구독한다.

### LoAF는 대체가 아니라 대안이다

Chrome 팀의 LoAF 문서(아래 그림 출처)는 LoAF를 Long Tasks API의 "update"이자 "alternative"로 소개하고, replacement라는 말은 쓰지 않는다. MDN 호환성 데이터에서도 `PerformanceLongTaskTiming`에 deprecated 표시는 없고, 두 API 모두 experimental이며 Firefox와 Safari는 지원하지 않는다.

새 API가 필요했던 이유는 귀속(attribution)이다. 같은 문서에 따르면 Long Tasks API의 귀속은 "at best only tells you the container", 곧 최상위 문서인지 어떤 iframe인지까지이고 어떤 스크립트가 시간을 썼는지는 알려주지 않는다.

LoAF는 개별 태스크가 아니라 **렌더링 업데이트가 50ms 넘게 지연된 프레임**을 entry로 보고한다. 짧은 태스크 여러 개와 렌더링이 모여 기준을 넘어도 잡힌다.

### blockingDuration과 스크립트 귀속

LoAF에서 INP와 직접 이어지는 필드는 `blockingDuration`이다. 프레임 안에서 50ms를 넘은 태스크의 초과분을 더하되, 가장 긴 태스크에는 마지막 렌더링 시간까지 포함한다. 문서의 예시에서 55ms, 65ms 태스크 뒤에 20ms 렌더링이 붙으면 `duration`은 약 140ms, `blockingDuration`은 (55 - 50) + (65 + 20 - 50) = 40ms다. TBT의 발상을 로딩 구간이 아니라 페이지 전체의 프레임으로 옮긴 셈이다.

![페이지 타임라인에 여러 long frame이 있고, 그중 INP로 선택된 상호작용과 겹치는 프레임이 점선으로 강조된 그림](2.png?w=720)

(그림 출처: [Chrome for Developers, Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames), CC BY 4.0)

페이지에는 long frame이 여러 개 생기지만 INP 값을 설명하는 것은 INP 상호작용과 겹친 프레임이다. 그 프레임의 `scripts` 배열에는 5ms를 넘게 실행된 스크립트마다 호출 지점, 소스 URL, 실행 시간이 들어 있다. Long Tasks API에 없던 "누가"가 여기서 생긴다.

다만 스크립트 귀속은 메인 스레드와 same-origin iframe에만 붙는다. cross-origin iframe, worker, 확장 프로그램 코드는 프레임을 길게 만들어도 이름이 없다. 이 블로그의 글 페이지에 있는 utteranc.es 댓글 iframe 안의 일은 LoAF로도 귀속되지 않는 것이다.

### 이 블로그는 LoAF를 수집하지 않는다

LoAF를 직접 구독하지 않고 쓰는 방법도 있다. `web-vitals`는 [v4.0.0(2024-05-13) 체인지로그](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md)에서 "Add INP breakdown timings and LoAF attribution"을 넣었고, 이후 가장 긴 스크립트(`longestScript`)와 스크립트, 레이아웃, 페인트 시간 합계를 더했다. 단 이것은 attribution 빌드(`web-vitals/attribution`)에서만 온다.

앞 글에서 봤듯 이 블로그의 `src/components/WebVitalsReporter.tsx`는 `import('web-vitals')`로 standard 빌드를 쓴다. **INP 값은 수집하지만 그 INP가 어떤 스크립트에 막혔는지는 수집하지 않는다.** 설치된 `web-vitals@6.2.1`에서 `long-animation-frame` 문자열은 `dist/web-vitals.js`에 0번, `dist/web-vitals.attribution.js`에 1번 나온다. standard 빌드는 LoAF observer를 아예 등록하지 않는 것이다. (이 사실은 메모리 절에서 다시 중요해진다)

attribution 빌드는 [README](https://github.com/GoogleChrome/web-vitals#attribution-build) 기준 brotli 약 1.5K 더 크지만, 필자가 망설인 이유는 크기보다 목적지다. 이 블로그 트래픽으로 GA4에서 스크립트별 분포가 의미 있게 나올지 확인하지 않았으므로, 수집을 늘리기 전에 lab부터 보기로 했다.

## 이 블로그에서 잡힌 long task

그래서 글 페이지 하나를 lab에서 돌려 봤다. Lighthouse 12.8.2(`npx lighthouse@12`), 로컬 Chrome headless, 기본 mobile 폼팩터, simulated throttling(RTT 150ms, 1638.4kbps, CPU 4배 감속), 대상은 `https://hooninedev.com/260914`이고, 2026-09-16에 25분 간격으로 두 번 실행했다.

| 항목 | 1회차 (08:46:15Z) | 2회차 (09:11:01Z) |
|---|---|---|
| Performance score | 0.92 | 0.93 |
| FCP, LCP | 2501ms | 2415ms |
| TBT | 40ms | 47ms |
| TTI | 5489ms | 5375ms |
| 메인 스레드 작업 합계 | 916ms | 1035ms |
| 그중 Style & Layout | 343ms | 344ms |
| 그중 Script Evaluation | 254ms | 292ms |

두 번 모두 LCP 요소가 이미지가 아니라 첫 문단(`div#post-content > p`)이라 FCP와 LCP가 같았고, 메인 스레드에서 가장 큰 항목은 스크립트가 아니라 Style & Layout이었다.

![Lighthouse 두 번의 실행에서 문서, Next 청크, gtag 두 개의 long task가 같은 순서로 나타난 타임라인 도표](3.png?w=720)

long task는 두 번 모두 네 개, 순서도 같았다. 문서 태스크(104ms, 122ms), Next.js 청크 하나(68ms, 69ms), 그리고 `googletagmanager.com/gtag/js`의 태스크 두 개(1회차 66ms와 56ms, 2회차 69ms와 59ms)다. 시각은 Lighthouse가 4배 CPU 감속을 가정해 계산한 시간축이라 실제 기기의 절대 시간으로 읽으면 안 된다.

TBT는 FCP 이후 세 태스크의 초과분으로 정확히 맞아떨어진다. 1회차는 (68 - 50) + (66 - 50) + (56 - 50) = 40ms, 2회차는 (69 - 50) + (69 - 50) + (59 - 50) = 47ms다. 낮은 TBT는 "long task가 없다"가 아니라 "FCP 이후 초과분이 작다"는 뜻이다.

다음은 gtag의 위치다. layout에서 gtag는 `next/script`의 `strategy="afterInteractive"`로 로드되고, LCP보다 2.8초 남짓 뒤에 연달아 실행되고, 이 마지막 long task가 끝나는 지점이 곧 TTI로 잡힌다. 로딩 지표보다 **페이지가 뜬 직후 누른 입력의 input delay**와 겹칠 수 있는 자리다. 다만 lab 시간축 위의 추론이고, 실제 사용자가 그때 무엇을 눌렀는지는 이 블로그가 수집하지 않는다.

그리고 이것은 n=2 lab 측정이다. 같은 모양의 재현은 이 구조가 우연이 아니라는 약한 근거일 뿐, 실제 사용자의 기기와 네트워크 분포를 대신하지 못한다.

그렇다면 gtag 태스크 66ms 안에서 어떤 함수가 시간을 썼는지는 어떻게 알 수 있을까?

## 샘플링 프로파일러

함수 단위의 답은 프로파일러가 준다. DevTools Performance 패널의 일을 실제 사용자 브라우저에서 하려는 것이 JS Self-Profiling API다.

### JS Self-Profiling API

WICG의 [JS Self-Profiling 명세](https://wicg.github.io/js-self-profiling/)는 웹 앱이 브라우저의 샘플링 프로파일러를 제어하는 API를 정의한다. 예시는 `new Profiler({ sampleInterval: 10, maxBufferSize: 10000 })`로, 10ms마다 콜 스택을 찍어 최대 1만 개를 모은다는 뜻이다. 모든 호출을 계측하지 않고 :term[샘플링]{key="sampling"}하므로 오버헤드가 작은 대신 간격보다 짧은 호출은 놓칠 수 있다. 명세는 CORS로 허용되지 않은 cross-origin 스크립트의 스택 프레임을 결과에서 뺀다. gtag처럼 다른 origin의 스크립트 내부는 이 API로도 보이지 않을 수 있는 것이다.

명세 상태는 표준 트랙이 아닌 WICG Community Group Draft이고, MDN 호환성 데이터 기준 `Profiler`는 Chrome 94부터 Chromium 계열에서만 동작한다. 그리고 [MDN](https://developer.mozilla.org/en-US/docs/Web/API/JS_Self-Profiling_API)이 적은 대로 문서가 `js-profiling`을 포함한 Document Policy와 함께 응답되어야 한다. HTML 응답에 `Document-Policy: js-profiling` 헤더가 있어야 한다는 뜻이다.

### 헤더를 켜는 것도 비용이다

조사 중 문서끼리 어긋난 지점이 있었다. 2026년 1월 명세 리포에 들어간 변경으로 `js-profiling`은 **deprecated**가 되었고, 대신 `js-profiling-mode`(`eager`, `lazy`)가 정의되었다. 구현은 하위 호환을 위해 `js-profiling`을 지원해야 하지만(SHOULD) 제거할 수도 있다(MAY).

명세에 따르면 `eager`(기존 `js-profiling`과 같은 의미)는 로드 중 프로파일링 인프라를 미리 준비하므로 프로파일러를 쓰지 않아도 FCP와 LCP에 영향을 줄 수 있다. `lazy`는 첫 `Profiler` 생성까지 준비를 미루지만, 그 초기화가 상호작용 처리 중에 일어나면 INP에 영향을 줄 수 있다. **측정하려고 켠 헤더가 측정 대상 지표에 비용을 줄 수 있다**는 것을 명세가 인정한 것이다. 반면 Sentry 문서는 2026-09-16 조회 기준 여전히 `Document-Policy: js-profiling`만 안내한다. Chrome이 `js-profiling-mode`를 구현했는지는 확인하지 않았으므로, 지금 어느 헤더를 써야 하는지까지는 말할 수 없다.

### Sentry 브라우저 profiling의 조건

Sentry의 [JavaScript profiling 문서](https://docs.sentry.io/platforms/javascript/profiling/)는 조건을 분명히 적는다. 브라우저 profiling은 beta이고, JS Self-Profiling API를 쓰므로 Chrome과 Edge 같은 Chromium 계열에서만 동작하며, 서버가 `Document-Policy: js-profiling`을 보내야 한다. 헤더를 못 바꾸는 호스팅이면 쓸 수 없다고 명시한다. SDK는 `@sentry/browser` 10.27.0 이상에 `browserProfilingIntegration()`과 세션 단위 비율 `profileSessionSampleRate`를 쓴다. FAQ는 Chrome 사용자에게서만 프로파일이 오는 것이 정상이라고 답한다. 모인 프로파일을 전체 사용자의 대표로 읽으면 안 되는 것이다.

과금은 [UI Profile Hours](https://docs.sentry.io/pricing/quotas/manage-ui-profile-hours/) 단위이고, 번들은 `sentry-javascript` 리포 `.size-limit.js`(develop 브랜치, 2026-09-16 조회)의 gzip 상한값 기준으로 Tracing 조합 56 KB에 Profiling을 더하면 59 KB다.

### 이 블로그에서는 두 겹으로 꺼져 있다

첫째, 브라우저 SDK가 없다. 이 블로그의 Sentry는 서버 전용이고 `src/instrumentation-client.ts`가 없다. 클라이언트 SDK가 client JS를 gzip 기준 78.8 KB 늘린다는 2026-08-04 실측으로 내린 결정이다(앞 글에서 다뤘다).

둘째, 헤더가 없다. 2026-09-16T09:10:42Z에 `curl -sI https://hooninedev.com/260914`로 확인한 응답에 `document-policy`가 없다. 이 리포가 HTML에 붙이는 헤더는 `next.config.ts`의 `headers()`에 있는 `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` 네 개이고, 응답에서도 그 네 개가 확인된다. (`public/_headers`는 정적 자산에만 적용되고 HTML에는 닿지 않는다는 것을 이 리포에서 실측해 두었다)

그러니 이 블로그에서 브라우저 profiling을 켜는 일은 옵션 하나가 아니다. 79KB 결정을 되돌리고, 모든 HTML에 헤더를 붙이고, 그 헤더가 FCP, LCP, INP에 주는 비용을 새로 재는 일이다. 앞에서 본 gtag 태스크 두 개가 그 비용을 정당화할 문제라는 근거는 아직 없다.

## 메모리를 측정한다는 것

CPU가 "지금 무엇이 막고 있는가"라면 메모리는 "시간이 지나며 무엇이 쌓이는가"의 문제라 세션 안의 변화를 봐야 한다. 그런데 이 값을 field로 가져오는 길은 CPU보다 좁다.

### performance.memory는 비표준이다

`performance.memory`는 [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)에서 "non-standard and legacy" 속성이고 호환성 데이터에는 deprecated, Chromium 전용으로 표시된다. "힙"이 정확히 무엇인지부터 표준화되지 않았다.

### measureUserAgentSpecificMemory는 격리를 요구한다

대안은 `performance.measureUserAgentSpecificMemory()`다. web.dev의 [페이지 메모리 측정 글](https://web.dev/articles/monitor-total-page-memory-usage)은 가비지 컬렉션 중에 측정하므로 결과가 늦게 오고, 평균 5분의 무작위 간격으로 호출하라고 한다. Chrome 89부터 Chromium 계열에서만 지원된다.

결정적인 조건은 따로 있다. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory)은 문서가 secure context이면서 **cross-origin isolated**여야 한다고 명시한다. `Cross-Origin-Opener-Policy`와 `Cross-Origin-Embedder-Policy` 헤더로 격리되어 `window.crossOriginIsolated`가 `true`여야 한다는 뜻이다.

앞의 `curl` 응답에는 두 헤더가 없으므로 이 블로그에서 이 API는 호출할 수 없다. 켜는 비용도 profiling 헤더보다 클 것으로 본다. COEP를 켜면 페이지가 불러오는 cross-origin 리소스가 그 정책을 따라야 하는데, 이 블로그는 gtag 스크립트와 utteranc.es iframe을 불러온다. 이 둘이 실제로 깨지는지는 켜서 확인하지 않았다.

field가 막혀 있으면 남는 것은 DevTools Memory 패널로 하는 로컬 재현이다. Chrome 팀의 [메모리 문제 해결 문서](https://developer.chrome.com/docs/devtools/memory-problems)가 누수의 흔한 원인으로 드는 detached DOM 트리를 Heap snapshot으로 찾는 방식인데, 필자가 이 블로그에서 해 본 것은 아니다.

### 관측 코드가 만든 누수

메모리 이야기에서 필자가 가장 흥미롭게 본 사례는 관측 라이브러리에서 나왔다. `web-vitals` v6.2.2(2026-09-14) 체인지로그의 첫 줄이 "Cap pending LoAFs to avoid memory leak"이다.

[이슈 #795](https://github.com/GoogleChrome/web-vitals/issues/795) 설명에 따르면 attribution 빌드의 `onINP`는 INP와 겹치는 LoAF를 찾으려고 LoAF entry를 `pendingLoAFs`에 모은다. 정리 기준인 "가장 최근 처리된 이벤트" 시각은 사용자 입력이 있어야만 앞으로 가서, 영상 재생처럼 오래 입력 없이 보는 페이지에서는 LoAF가 쌓이기만 했다. [수정 PR #796](https://github.com/GoogleChrome/web-vitals/pull/796)은 이벤트 그룹 목록에 이미 쓰던 상한 `MAX_PENDING_FRAMES`(10)를 LoAF 목록에도 적용해, INP 후보와 겹치는 프레임이 아니면 최근 10개까지만 남기게 했다.

이 블로그는 6.2.1인데, 이 누수를 안고 있을까? 그렇지 않다. PR이 고친 소스 파일은 `src/attribution/onINP.ts` 하나(나머지는 테스트 파일)이고, 앞에서 봤듯 이 블로그의 standard 빌드에는 LoAF observer가 없다. **LoAF attribution을 수집하지 않기로 한 같은 결정이 이 누수의 경로도 막고 있었던 것이다.** 그렇다고 "수집하지 말자"는 결론은 아니다. 관측 코드의 비용도 체인지로그에서야 드러날 때가 있고, attribution 빌드로 바꾼다면 6.2.2 이상이 전제라는 것이다.

## 브라우저가 죽었을 때

메모리를 끝까지 쓰면 페이지는 죽는다. 이때 남는 신호가 Reporting API의 crash report다.

### crash report의 형태

WICG의 [Crash Reporting 명세](https://wicg.github.io/crash-reporting/)는 report type `"crash"`를 정의하고, W3C 표준도 표준 트랙도 아니라고 스스로 밝힌다. body의 `reason`에는 페이지가 메모리를 다 썼다는 `oom`과 응답하지 않아 종료됐다는 `unresponsive`가 있다. 전달은 `Reporting-Endpoints` 헤더에 `crash-reporting` 엔드포인트가 있으면 그곳, 없으면 `default`이고, 둘 다 없으면 보내지 않는다.

### JavaScript로는 받을 수 없다

이 신호의 핵심 성질은 명세의 한 문장에 있다.

> Crash reports are not observable to JavaScript, as the page which would receive them is, by definition, not able to.

보고를 받아야 할 페이지는 바로 그 crash로 이미 죽었으므로, JavaScript가 이 보고를 관찰할 방법이 정의상 없다는 것이다. 브라우저가 페이지 밖에서 서버 엔드포인트로 POST할 뿐이다.

이것이 브라우저 SDK에 주는 의미는 코드로 볼 수 있다. `sentry-javascript`의 [`reportingObserverIntegration` 소스](https://github.com/getsentry/sentry-javascript/blob/develop/packages/browser/src/integrations/reportingobserver.ts)는 기본 구독 타입에 `'crash'`, `'deprecation'`, `'intervention'`을 두고 `report.type === 'crash'` 분기도 있다. 그러나 이 통합은 페이지 안의 `ReportingObserver`를 쓰므로, 명세대로라면 실제 OOM crash에서 그 분기가 실행될 경로는 없다. (명세에서 끌어낸 필자의 추론이고, crash를 일으켜 확인하지는 않았다)

서버 쪽에서 Sentry가 `Reporting-Endpoints`의 목적지가 될 수는 있을까? 이 기능을 요청한 [getsentry/sentry#38940](https://github.com/getsentry/sentry/issues/38940)은 2022-09-15에 열려 2026-09-16 조회 시점에도 open이다. 지금 쓸 수 있는 방법은 엔드포인트를 직접 두고 Sentry로 중계하는 것까지다.

### 이 블로그의 crash는 기록되지 않는다

앞의 `curl` 응답에는 `reporting-endpoints` 헤더도 없다. 명세의 전달 규칙상 엔드포인트가 없으면 보고는 전송되지 않는다. 이 블로그를 읽던 누군가의 탭이 메모리 부족으로 죽었더라도 그 사실은 어디에도 남지 않는다. Sentry의 지원 여부와 무관하게, 받을 곳을 선언하지 않았기 때문이다.

긴 정적 글을 읽는 페이지라 당장 바꿀 생각은 없다. 다만 "crash가 없다"와 "crash를 볼 수단이 없다"는 대시보드에서 똑같이 빈 화면이라는 점은 적어 둔다.

## 결론

브라우저의 CPU와 메모리 관측은 대부분 **조건부로 열리는 관측**이다. long task와 LoAF는 Chromium에서만 오고, LoAF의 스크립트 귀속은 cross-origin iframe을 보지 못한다. 샘플링 프로파일러는 `Document-Policy` 헤더를 요구하는데, 그 헤더 이름은 명세에서 바뀌는 중이고 헤더 자체가 지표에 비용을 줄 수 있다. 메모리 측정 API는 cross-origin isolation을, crash report는 JavaScript 밖의 서버 엔드포인트를 요구한다.

이 블로그는 그 조건 중 어느 것도 켜지 않았다. 그 상태는 방치가 아니라 79KB 결정, standard 빌드, 헤더를 늘리지 않은 선택이 쌓인 결과이고, 그중 standard 빌드는 web-vitals의 LoAF 누수를 피하는 결과로도 이어졌다. 관측을 늘리는 일도 비용이 드는 코드를 페이지에 싣는 일이라는 점이 이 영역에서 특히 선명하다.

이 글의 수치는 전부 lab이거나 필자의 로컬 확인이었다. 실제 사용자에게서 모인 field data가 브라우저 밖으로 나가 CrUX와 Search Console, 검색에서 어떤 의미를 갖는지는 [다음 글](/260916)에서 이어가려고 한다. 이 글을 읽는 독자 분들도 자신의 서비스에서 켜 두지 않은 관측이 무엇이고, 그것이 결정의 결과인지 그냥 지나친 것인지 한 번 나눠 보기를 바란다.

:::ref
- [docs] [MDN, PerformanceLongAnimationFrameTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming)
- [docs] [web.dev, Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
:::
