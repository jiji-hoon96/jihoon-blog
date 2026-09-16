---
emoji: 🔭
title: '브라우저 관측'
seoTitle: '브라우저 관측: PerformanceObserver와 Web Vitals, soft navigation 실측'
date: '2026-09-14'
updatedAt: '2026-09-16'
categories: 관측 프론트엔드 브라우저 RUM
description: '브라우저 SDK 없이 페이지 안에서 볼 수 있는 신호를 정리한다. Performance Timeline, 네트워크 구간, LCP INP CLS 계산 규칙, web-vitals reportSoftNavs 실측과 이 블로그가 GA4로 보내는 값까지 담았다.'
keywords: '브라우저 성능 측정, PerformanceObserver, Web Vitals 계산 방식, INP 측정, CLS 세션 윈도우, Soft Navigations API, web-vitals reportSoftNavs, Resource Timing Timing-Allow-Origin'
---

이번 포스팅에서는 브라우저 관측에 대한 이야기를 해보려고 한다.

[앞 글](/260913)에서는 회사에서 오래 써 온 Sentry를 이 블로그에 붙이며 기능을 다시 훑어본 이야기를 했다. 그런데 그 글의 구성에는 눈에 띄는 빈자리가 하나 있다. 필자는 Sentry를 서버에만 붙였고, 브라우저 SDK는 켜지 않았다.

이유는 번들 크기였다. (근거가 된 실측은 첫 절에 적었다) 그렇다고 브라우저 안에서 벌어지는 일을 아예 보지 않겠다는 뜻은 아니었다. 브라우저는 SDK가 없어도 로딩과 렌더링에 대해 상당히 많은 것을 스스로 기록한다.

그래서 이 글의 질문은 이것이다. **외부 SDK 없이, 페이지 안에서 브라우저가 스스로 알려주는 로딩과 렌더링 신호로 무엇을 볼 수 있는가.** 네트워크 구간, Web Vitals의 계산 규칙, SPA에서 흐려지는 페이지 경계를 차례로 보고, 마지막에 이 블로그가 실제로 무엇을 보내고 무엇을 보내지 않는지 적는다. (CPU와 메모리는 다음 글, 수집한 값이 CrUX와 검색으로 이어지는 이야기는 마지막 글의 몫이다)

## 브라우저 SDK를 켜지 않은 이유

결정의 근거부터 적어둔다. 필자는 Sentry 구성을 바꿔가며 clean build 기준으로 `.next/static/chunks/*.js`의 gzip 총합을 비교했다.

| 구성 | client JS (gzip) | 증가분 |
|---|---|---|
| Sentry 미적용 | 181.6 KB | 기준 |
| **서버 전용 (현재)** | **182.3 KB** | **+0.7 KB** |
| 서버 전용 + 에러 폴백 UI에서 `captureException` 호출 | 186.0 KB | +4.4 KB |
| 클라이언트 + 서버 | 260.4 KB | +78.8 KB |

이 표는 2026-08-04, Next 16.1.4 기준 측정이다. 서버 계측은 사실상 공짜인데 브라우저 계측은 78.8KB를 요구했다. `bundleSizeOptimizations.excludeTracing`도 켜봤지만 수치는 그대로였고, 비용을 없애는 방법은 브라우저 초기화 파일(`src/instrumentation-client.ts`)을 두지 않는 것뿐이었다. 세 번째 행도 같은 구조다. 브라우저 SDK가 없으면 폴백 UI의 `captureException`은 아무 일도 하지 않는데 SDK 코드는 번들에 실린다. 그래서 호출 자체를 뺐다.

현재 상태도 다시 쟀다. 2026-09-16 같은 방법으로 재측정하니 206.1KB가 나왔다. 기준선보다 23.8KB 크지만, 그 사이 Next가 16.3.4로 올라갔고 뒤에서 다룰 soft navigation 보고가 들어왔다. Sentry 구성은 여전히 서버 전용이라 이 증가분은 Sentry 때문이 아니다. (둘 중 어느 쪽이 얼마를 차지하는지는 커밋별로 다시 빌드해 보지 않아 모른다)

이 블로그에서 로딩 성능은 곧 방문자 경험이고, 약 79KB를 내는 쪽은 필자가 아니라 방문자다. 개인 블로그의 브라우저 에러가 그 비용을 돌려주지 못한다고 판단했다. 다만 이렇게 정하고 나면 브라우저 쪽은 다른 방법으로 봐야 한다. 그 출발점이 브라우저가 이미 남기고 있는 기록이다.

## 브라우저가 남기는 기록

페이지가 열리면 브라우저는 여러 종류의 :term[PerformanceEntry]{key="performance-entry"}를 만든다. W3C의 [Performance Timeline](https://www.w3.org/TR/performance-timeline/)은 이 항목들을 하나의 시간축에서 읽기 위한 공통 틀이다. 개발자가 스톱워치처럼 시작과 끝을 찍지 않아도, 브라우저는 문서 탐색, 리소스 요청, 페인트, 입력 같은 사건을 이미 알고 있다.

| 관측 대상 | entry type | 답할 수 있는 질문 |
|---|---|---|
| 문서 탐색 | `navigation` | DNS, 연결, 응답, DOM 처리 중 어디에서 시간이 걸렸는가 |
| 이미지·스크립트·CSS | `resource` | 어떤 리소스가 늦었고 전송 크기는 얼마였는가 |
| 화면 표시 | `paint`, `largest-contentful-paint` | 첫 화면과 주요 콘텐츠가 언제 보였는가 |
| 레이아웃 변화 | `layout-shift` | 보고 있던 화면이 언제 움직였는가 |
| 사용자 입력 | `event` | 입력 뒤 다음 화면이 그려지기까지 얼마나 걸렸는가 |
| 애플리케이션 구간 | `mark`, `measure` | 서비스가 직접 정의한 작업은 얼마나 걸렸는가 |

메인 스레드를 오래 붙잡은 프레임을 보는 `long-animation-frame`도 같은 틀에 속하지만, 그것은 CPU 이야기라 다음 글에서 다룬다.

이 기록을 받는 표준 인터페이스가 :term[PerformanceObserver]{key="performance-observer"}다.

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.startTime, entry.duration)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

코드는 짧지만 조건이 몇 개 숨어 있다. MDN의 [`observe()` 문서](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)에 따르면 `buffered`는 `type`과 함께 써야 하고, 여러 유형을 한 번에 받는 `entryTypes`와는 같이 쓸 수 없다. 수집 스크립트는 대개 페이지가 한참 진행된 뒤에 실행되므로, `buffered` 없이 등록하면 그 전에 생긴 LCP 후보나 리소스 기록을 받지 못한다.

또 브라우저가 지원하지 않는 type은 예외 없이 무시되고, 같은 문서에 따르면 콘솔 경고 정도만 남을 수 있다. `PerformanceObserver.supportedEntryTypes`로 확인하지 않으면 **entry가 없는 것**과 **entry가 생성되지 않는 브라우저였던 것**을 구분할 수 없다. 대시보드의 빈 구간이 성능 문제가 아니라 브라우저 구성의 차이일 수 있는 것이다.

## 네트워크 시간의 구성

페이지가 느리다는 말은 흔히 네트워크 문제로 번역된다. 하지만 `duration` 하나로는 원인을 가를 수 없다. `navigation` entry(`PerformanceNavigationTiming`)와 `resource` entry(`PerformanceResourceTiming`)는 한 요청을 여러 타임스탬프로 쪼개 준다.

| 구간 | 계산 | 크면 의심할 곳 |
|---|---|---|
| DNS | `domainLookupEnd - domainLookupStart` | DNS 계층 |
| 연결과 TLS | `connectEnd - connectStart` | 연결 재사용, TLS 협상 |
| 첫 바이트까지 | `responseStart - requestStart` | 서버 처리와 왕복 지연 |
| 본문 전송 | `responseEnd - responseStart` | 응답 크기와 전송 속도 |

W3C의 [Navigation Timing](https://www.w3.org/TR/navigation-timing-2/) 명세에는 이 타임스탬프들이 어떤 순서로 찍히는지 보여주는 도식이 있다. 구간 이름이 낯설다면 그 도식을 한 번 보는 편이 표보다 빠르다.

한 가지 함정은 cross-origin 리소스다. W3C의 [Resource Timing 명세](https://www.w3.org/TR/resource-timing/)에서 다른 origin의 리소스는 제공 서버가 `Timing-Allow-Origin` 응답 헤더로 허용하지 않는 한 DNS, 연결, 요청과 응답 시작 같은 상세 타임스탬프가 0으로 가려진다. 외부 CDN 이미지가 느린 것 같아 열어봤는데 DNS도 연결도 전부 0이라면, 빨랐던 것이 아니라 볼 권한이 없었던 것이다. **이 영역에서 0은 빠르다는 뜻이 아닐 수 있다.** 반대로 부푸는 값도 있다. 가려지지 않는 `responseEnd`에서 0이 된 `responseStart`를 빼면, 본문 전송 시간이 아니라 페이지 시작부터 응답이 끝날 때까지의 시각이 나온다. 크기 필드도 같은 명세에서 조건이 따로 있다. `encodedBodySize`와 `decodedBodySize`는 응답이 CORS를 통과하지 않은 cross-origin이면 0이고, `transferSize`는 `Timing-Allow-Origin`과 CORS 양쪽의 영향을 받는다.

이 블로그의 첫 바이트 시간도 가볍지 않다. 2026-09-16 한국의 한 지점에서 `curl`로 글 두 편과 홈을 한 번씩 요청했을 때 `time_starttransfer`가 0.95초에서 2.43초 사이였고(DNS, 연결, TLS 시간이 포함된 값이다), 응답 헤더는 Netlify Durable 캐시 hit, 엣지 캐시 miss였다. 표본이 셋뿐이라 일반화하지는 않지만, 뒤에서 볼 실측의 TTFB 798ms와 같은 규모다. 이런 구간 분해가 있어야 LCP가 늦을 때 이미지를 줄일지 문서 도착을 당길지 고를 수 있다.

## Web Vitals의 계산

네트워크 구간이 원재료라면 :term[Web Vitals]{key="web-vitals"}는 그 위에 계산 규칙을 얹은 지표다. Google의 Web Vitals 문서가 정한 Core Web Vitals는 LCP, INP, CLS 세 개이고, 좋음 기준은 LCP 2.5초, INP 200ms, CLS 0.1 이하다.

![LCP, INP, CLS 세 지표의 좋음, 개선 필요, 나쁨 구간. LCP는 2.5초와 4.0초, INP는 200ms와 500ms, CLS는 0.1과 0.25가 경계다](1.png?w=720)

(그림 출처: [web.dev, Web Vitals](https://web.dev/articles/vitals)의 임계값 그림 세 장을 가로로 이어 붙임, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))

세 지표 모두 브라우저가 한 번 찍은 타임스탬프가 아니다. entry 여러 개와 페이지 수명 주기를 해석해야 값이 나온다. 이 차이를 모르면 직접 만든 수집 코드의 값이 라이브러리나 도구의 값과 어긋날 때 어느 쪽이 맞는지 판단할 수 없다.

### LCP는 후보가 계속 바뀐다

[LCP 문서](https://web.dev/articles/lcp)에 따르면 브라우저는 더 큰 콘텐츠 요소가 그려질 때마다 `largest-contentful-paint` entry를 새로 보낸다. 텍스트가 먼저 그려지면 `<p>`가 후보가 되고, 나중에 큰 이미지가 로드되면 `<img>`로 바뀐다. 그리고 사용자가 탭, 스크롤, 키 입력을 하는 순간 새 entry 보고를 멈춘다. 그러니 LCP는 첫 entry가 아니라 입력 전까지 보고된 마지막 유효 후보이고, 이 확정 시점을 정하는 것이 수집 코드의 몫이 된다.

### INP는 입력의 세 구간을 더한다

web.dev의 INP 문서는 상호작용 하나를 세 구간으로 나눈다. 입력이 들어온 뒤 이벤트 핸들러가 시작되기까지의 input delay, 핸들러가 실행되는 processing duration, 그리고 다음 프레임이 화면에 표시되기까지의 presentation delay다.

![메인 스레드에서 입력 하나가 처리되는 과정. blocking task 때문에 input delay가 생기고, pointerup, mouseup, click 핸들러가 processing duration을 이루며, render와 paint를 거쳐 프레임이 표시되기까지가 presentation delay다. paint 아래에는 compositing, GPU, raster 작업이 이어진다](2.png?w=720)

(그림 출처: [web.dev, Interaction to Next Paint (INP)](https://web.dev/articles/inp), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 흰 배경의 PNG로 변환)

이 그림에서 눈여겨볼 것은 사용자가 누른 시점에 이미 회색 blocking task가 돌고 있다는 점이다. 핸들러 코드가 아무리 빨라도 입력 직전에 다른 작업이 메인 스레드를 잡고 있으면 INP는 나빠진다. (그 다른 작업이 무엇인지 찾는 일이 다음 글의 주제다)

페이지의 INP는 한 번의 방문 동안 관찰한 상호작용 중 가장 느린 값에 가깝다. 같은 문서는 상호작용 50회마다 가장 큰 값 하나를 무시한다고 설명한다. 그러니 상호작용이 50회 미만인 방문에서는 가장 느렸던 상호작용 하나가 곧 INP다.

### CLS는 이동을 묶어서 센다

[CLS 문서](https://web.dev/articles/cls)는 CLS를 페이지 수명 동안의 이동을 모두 더한 값이 아니라 가장 큰 묶음(burst)의 점수로 정의한다. 이동 사이 간격이 1초 미만이면 같은 session window로 묶고, 한 window는 최대 5초까지다. 그 window들 중 점수 합이 가장 큰 것이 CLS가 된다. 오래 열어 둔 탭에서 조금씩 생긴 이동이 끝없이 누적되지 않도록 만든 규칙이다.

세 지표의 규칙을 직접 구현할 수는 있다. 하지만 탭이 숨겨지는 시점, 페이지가 복원되는 시점까지 경계 조건을 맞추기는 어렵다. Google의 [`web-vitals`](https://github.com/GoogleChrome/web-vitals) 라이브러리는 entry를 그대로 넘기는 도구가 아니라, 표준 API 위에 이 수명 주기 규칙을 적용한 구현체다. 이 블로그도 이것을 쓴다.

그런데 이 규칙들은 모두 "페이지 하나"라는 단위를 전제한다. 그 단위가 흐려지면 어떻게 될까?

## 흐려진 페이지 경계

전통적인 navigation에서는 브라우저가 문서의 시작을 안다. SPA의 client-side navigation은 URL과 화면이 바뀌어도 문서가 새로 만들어지지 않는다. 브라우저 입장에서는 첫 로드 하나가 길게 이어지는 셈이라, 목록에서 글로 넘어간 두 번째 화면에는 자기 LCP가 없다.

지금까지는 RUM 도구와 프레임워크가 각자의 휴리스틱으로 "새 화면"을 정의해 왔다. Chrome 팀은 [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations)로 이 판단을 브라우저에 가져왔다. 사용자 입력, URL 변경, 화면 페인트가 함께 일어나면 브라우저가 `soft-navigation` entry를 만든다. 이 기능은 Chrome 151부터 기본으로 켜졌고, Chrome 151의 stable 배포일은 [2026-07-28](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=151)이다. `web-vitals`도 6.0부터 `reportSoftNavs` 옵션으로 soft navigation 단위의 지표를 보고한다. README 기준으로 이 보고는 Chromium 151 이상에서만 동작하고, 다른 브라우저에서는 옵션을 켜도 보고 방식이 바뀌지 않는다.

### reportSoftNavs를 켜고 잰 값

이 블로그도 Next.js의 `Link`로 글 목록에서 글로 들어간다. 2026-09-14 `web-vitals`를 6.2.1로 올리고 `reportSoftNavs`를 켠 뒤(`cc21a0d`), 프로덕션 페이지를 연 헤드리스 Chrome에 CDP로 붙어 GA4로 나가는 요청을 그대로 열어봤다. 한 세션에서 나간 값은 이랬다. (표에 없는 지표는 이 세션의 요청에 없었던 것이다. 특히 목록 페이지의 CLS는 첫 soft navigation 순간 값이 0이어도 한 번 보고되어야 한다. `web-vitals`의 보고 함수는 첫 보고라면 0도 보내기 때문이다. 캡처가 GA4의 배치 전송보다 먼저 끝났을 가능성이 크다고 보지만, 추측이고 확인하지는 않았다)

| 지표 | 값 | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

목록에서 글로 들어간 전환이 의도대로 별도 경험으로 잡혔다. 그런데 이 표는 옵션 하나로 끝나지 않는 이유도 보여준다. **soft navigation의 TTFB는 0이다.** 서버에 문서를 요청한 적이 없으니 README에 적힌 그대로의 값인데, 이 0이 첫 로드의 798ms와 같은 이벤트에 쌓이면 TTFB 평균은 코드를 고치지 않아도 조용히 내려간다. 그래서 지표마다 오는 `navigationType`을 GA4 파라미터로 같이 보내도록 고쳤다. 관측 단위를 하나 늘리면 그것을 구분할 차원도 같이 늘어나는 것이다.

재보면서 알게 된 것이 두 개 더 있다. 하나는 soft navigation에 **실제 사용자 입력이 필요하다**는 점이다. 페이지 안에서 스크립트로 `click()`을 호출했을 때는 URL이 바뀌고 화면이 갱신됐는데도 `soft-navigation` entry가 생기지 않았고, CDP의 `Input.dispatchMouseEvent`로 좌표 클릭을 보내고 나서야 잡혔다. 테스트 자동화로 이 기능을 확인하려면 DOM의 `click()`이 아니라 브라우저 수준의 입력 이벤트를 보내야 한다.

다른 하나는 이 블로그에서 soft navigation이 일어나는 자리가 생각보다 좁다는 것이다. 목록과 헤더의 링크는 `Link`라 client-side navigation이지만, **글 본문 안의 내부 링크는 마크다운이 만든 평범한 `a` 태그라 전체 페이지 로드**다. 같은 사이트 안에서도 어떤 이동은 soft navigation이고 어떤 이동은 아니다.

### 첫 페이지의 지표가 잘리는 시점

실측 뒤에 README를 다시 읽다가 놓친 문장을 발견했다.

> Note that this will change the way the first page loads are measured as the metrics for the initial URL will be finalized once the first soft nav occurs.

옵션을 켜면 첫 페이지의 지표가 첫 soft navigation 순간에 확정된다는 뜻이다. INP와 CLS는 원래 페이지를 떠날 때까지 관찰하는 지표인데, 이제는 사용자가 목록에서 글 링크를 누르는 순간 목록 페이지의 관찰이 끝나고 새 화면의 INP와 CLS가 0부터 다시 시작한다. 같은 README는 LCP와 FCP도 soft navigation 이후에 새로 그려진 요소만 센다고 적는다. 화면 사이에 그대로 남은 헤더 같은 요소는 새 화면의 후보가 되지 못한다.

그러니 옵션을 켠 전후로 첫 로드 지표의 분포가 달라질 수 있다. 같은 사이트를 측정했는데 배포 시점을 기준으로 INP가 좋아졌다면, 코드가 좋아진 것이 아니라 관찰 창이 짧아진 것일 수 있다. Chromium 151 이상에서만 이렇게 동작하므로 브라우저별 차이도 생긴다. (필자는 이 차이를 실측 전에 알았어야 했다. 표의 값보다 이 한 문장이 해석에 더 큰 영향을 준다)

### bfcache 복원도 새 경험이다

페이지 경계를 흐리는 경로가 하나 더 있다. :term[bfcache]{key="bfcache"}는 뒤로/앞으로 이동할 때 페이지를 메모리에서 통째로 되살린다. web.dev의 [bfcache 문서](https://web.dev/articles/bfcache)는 Chrome 사용 데이터에서 데스크톱 이동 10건 중 1건, 모바일 5건 중 1건이 뒤로/앞으로 이동이라고 적는다. 복원은 새 로드가 아니라서, 복원을 따로 세지 않는 수집기에서는 원래 가장 빨랐을 재방문이 로드 분포에서 빠지고 실제 경험은 좋아졌는데 수집된 분포는 느린 쪽으로 기울 수 있다. 같은 문서는 TTFB 같은 지표를 navigation type으로 나눠 보라고 권한다. `web-vitals` 6.2.1은 반대로 복원을 빼지 않는다. 설치된 코드를 열어 보면 복원 때 TTFB를 0으로 새로 보고하고, FCP, LCP, CLS, INP도 새 지표로 다시 시작하며, 이때 `navigationType`은 `back-forward-cache`다. 그러니 이 블로그의 TTFB에는 soft navigation의 0뿐 아니라 bfcache 복원의 0도 섞인다. 다행히 soft navigation 때문에 넣은 파라미터가 둘을 함께 구분해 준다.

## 이 블로그가 실제로 보내는 것

여기까지를 이 블로그의 코드로 옮기면 `src/components/WebVitalsReporter.tsx` 하나다. 클라이언트 컴포넌트가 `web-vitals`를 동적으로 불러와 LCP, INP, CLS, FCP, TTFB를 등록하고, GA4에 `web_vitals`라는 이벤트 하나로 보낸다. 설치 버전은 lockfile 기준 6.2.1이다.

| 파라미터 | 내용 |
|---|---|
| `event_label` | 지표 이름 (`LCP`, `INP` 등) |
| `value` | 지표 값을 반올림한 정수. CLS만 1000을 곱한다. GA4는 소수 value도 받으므로 필수는 아니고, Universal Analytics 시절 예제의 정수 관례와 같은 형태다 |
| `metric_id` | 한 페이지 수명의 지표 하나를 식별하는 id. 같은 지표가 다시 보고되면 이 값으로 묶는다 |
| `metric_rating` | 라이브러리가 판정한 good, needs-improvement, poor |
| `metric_navigation_type` | `navigate`, `soft-navigation`, `back-forward-cache` 등 |
| `page_location` | 값이 측정한 화면의 URL (`navigationURL`이 있을 때만 덮는다) |

`page_location` 행은 2026-09-16에 추가했다(`597ca5b`). 앞 절에서 본 것처럼 soft navigation이 일어나면 목록 페이지의 CLS와 INP는 URL이 바뀐 뒤에야 확정돼 보고된다. `web-vitals` 코드도 `soft-navigation` entry를 받는 순간 이전 화면의 CLS를 강제로 보고하고 새 지표를 시작한다. gtag는 이벤트에 보내는 시점의 URL을 붙이므로, 덮지 않으면 목록 페이지의 값이 글 URL로 잡힌다. README의 GA4 예시가 `page_location: navigationURL`을 넣는 이유도 이것이다. 이 블로그는 처음에 `navigationType`만 보냈으니, 그 전에 쌓인 GA4 데이터에는 목록 페이지의 CLS와 INP가 글 URL에 붙어 있을 수 있다.

별도 수집 서버 없이 이미 운영하던 GA4에 얹은 :term[RUM]{key="rum"} 구성이다. 모듈 로드 자체가 실패하면 `web_vitals_unavailable` 이벤트를 하나 남긴다. 배포 직후 옛 HTML이 사라진 청크를 부를 때 생기는 실패인데, 브라우저 Sentry가 없으니 이것이 없으면 수집이 통째로 멈춰도 흔적이 남지 않는다.

보내지 않는 것도 분명하다. `web-vitals`의 attribution 빌드가 아니라 기본 빌드라서, LCP 요소가 무엇이었는지, INP의 세 구간이 각각 얼마였는지, 어떤 요소가 레이아웃을 밀었는지는 수집하지 않는다. 앞 절의 INP 그림을 떠올리면, 이 블로그는 세 구간의 합만 알고 어느 구간이 길었는지는 모른다. 그리고 브라우저에서만 나는 JS 에러도 어디에도 기록되지 않는다. 약 79KB를 아낀 대가다.

이 값을 GA4에서 실제로 나눠 읽을 수 있는지는 마지막 글에서 다룬다. 보내는 것과 나눠 읽을 수 있는 것은 다른 문제다.

## 브라우저는 이미 기록하고 있다

정리하면 브라우저 SDK를 켜지 않아도 브라우저는 네트워크 구간, 페인트, 레이아웃 이동, 입력 지연을 이미 기록하고 있다. `PerformanceObserver`는 그 기록을 읽는 입구이고, Web Vitals는 거기에 후보 갱신, 세 구간의 합, session window 같은 계산 규칙을 얹은 지표다.

그리고 이 계산 규칙은 페이지라는 단위를 전제한다. soft navigation을 켜면 새 화면의 지표가 생기는 대신 첫 페이지의 관찰 창이 짧아지고, TTFB에는 0이 섞인다. bfcache 복원도 TTFB 0으로 섞인다(수집기에 따라서는 아예 빠진다). 필자가 이번에 새로 이해한 것은 옵션 하나가 값뿐 아니라 **무엇을 한 번의 경험으로 셀지**를 바꾼다는 점이다. 그래서 숫자를 비교하기 전에 그 숫자가 어떤 경계로 잘렸는지를 먼저 봐야 한다.

다만 이 글은 세 구간의 합까지만 봤다. 입력이 들어왔을 때 메인 스레드를 잡고 있던 작업이 무엇이었는지, 그리고 오래 열린 페이지가 메모리를 얼마나 쓰는지는 다른 API가 필요하다. 다음 글인 [브라우저의 CPU와 메모리](/260915)에서 그 이야기를 이어가려고 한다.

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [web.dev, Debug performance in the field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [WICG, Soft Navigations explainer](https://github.com/WICG/soft-navigations)
:::
