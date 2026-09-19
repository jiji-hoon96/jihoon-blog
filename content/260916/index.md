---
emoji: 🧩
title: '관측에서 판단으로'
seoTitle: 'Core Web Vitals는 SEO에 얼마나 쓰일까, CrUX와 Search Console로 확인하기'
date: '2026-09-16'
updatedAt: '2026-09-19'
categories: 관측 프론트엔드 GA4 Search-Console
description: '브라우저에서 잰 Web Vitals가 CrUX, PageSpeed Insights, Search Console을 거치며 어떻게 걸러지는지, Google의 랭킹 문장이 어디까지 말하는지 정리한다. 순위가 내려갔는데 클릭이 늘어난 실제 사례와 재조회 결과도 담았다.'
keywords: 'CrUX field data, PageSpeed Insights field data, Search Console Core Web Vitals 보고서, Core Web Vitals 랭킹 영향, Search Console 쿼리 클릭 차이, 평균 게재순위 하락 클릭 증가, 크롤링 속도 5xx 429'
---

이번 포스팅에서는 브라우저에서 잰 성능 데이터가 검색과 판단으로 이어지는 경로에 대한 이야기를 해보려고 한다.

이 시리즈의 앞 세 편은 필자가 직접 가진 신호를 다뤘다. [Sentry 다시 열어보기](/260913)에서는 서버에서 조용히 실패하는 호출을, [브라우저 관측](/260914)에서는 네트워크와 렌더링을, [브라우저의 CPU와 메모리](/260915)에서는 메인 스레드와 메모리를 봤다. 셋 다 필자가 계측 코드를 심고 필자의 저장소에서 읽는 데이터다.

이 편의 데이터는 성격이 다르다. 방문자의 브라우저에서 만들어진 값이 Chrome의 통계 파이프라인으로 넘어가고, 그 결과가 PageSpeed Insights와 :term[Search Console]{key="search-console"} 에 다시 나타난다. 누구의 경험을 셀지, 얼마나 모여야 보여줄지, 어떤 단위로 묶을지는 전부 Google이 정한다.

그래서 이 글이 답하려는 질문은 하나다. **브라우저 밖으로 나간 숫자를 판단에 쓰려면 무엇을 확인해야 하는가.** 필자의 답은 숫자마다 표본과 집계 규칙을 먼저 적고, 공식 문장이 말하지 않은 것을 덧붙이지 않으며, 한 번 내린 결론을 다른 기간으로 다시 재보는 것이다.

## 필자가 모으는 web_vitals

출발점은 필자가 직접 모으는 :term[RUM]{key="rum"} 이다. 브라우저 관측 편에서 본 대로 이 블로그는 `web-vitals`로 LCP, INP, CLS, FCP, TTFB를 재서 GA4에 `web_vitals` 이벤트로 보낸다. 여기서 다시 볼 것은 어떤 파라미터를 보내는가가 아니라 **누구의 경험이 표본에 들어오는가**다.

이 수집의 표본은 **gtag.js가 실제로 실행된 브라우저**다. 이벤트는 `dataLayer`에 먼저 쌓이고 gtag.js가 로드되면서 그 큐를 소비하는 구조라, 스크립트 요청이 막힌 환경에서는 측정값이 만들어져도 밖으로 나가지 않는다. 반대로 Chrome이 아닌 브라우저라도 gtag.js가 돌고 해당 지표를 지원하면 표본에 들어온다. 그리고 `reportSoftNavs: true` 때문에 클라이언트 라우팅으로 바뀐 화면도 별도의 페이지 경험으로 센다. 뒤에서 보겠지만 CrUX는 같은 방문을 다르게 센다.

솔직하게 적어두면 이 글을 쓰면서 GA4에 쌓인 `web_vitals` 수치는 다시 조회하지 않았다. 앞 편에서 미뤄 둔 질문, 즉 `metric_navigation_type`을 GA4 custom dimension으로 등록해 실제로 나눠 볼 수 있는지도 확인하지 못했다. 서비스 계정으로 조회하려 했지만 그 프로젝트에 Analytics Admin API가 켜져 있지 않았다.

**보내는 것과 읽을 수 있는 것은 다르고, 이 블로그는 아직 앞쪽만 확인된 상태다.**

## CrUX가 세는 사용자

Google이 검색 쪽에서 보는 field data는 필자의 GA4가 아니라 Chrome User Experience Report(CrUX)에서 온다. [CrUX 방법론 문서](https://developer.chrome.com/docs/crux/methodology)를 읽으면 표본이 세 겹의 조건으로 줄어든다.

첫째는 사용자 조건이다. 사용 통계 보고를 켜고, 방문 기록을 동기화하며, 동기화 암호를 설정하지 않은 사용자만 들어간다. 플랫폼은 데스크톱 Chrome과 Android Chrome이고, **iOS의 Chrome, Android WebView, Edge 같은 다른 Chromium 브라우저는 빠진다.** 이 조건을 만족하는 사용자가 전체의 몇 퍼센트인지는 공개하지 않는다.

둘째는 페이지 조건이다. 페이지는 검색엔진과 같은 기준으로 공개적으로 발견 가능해야 한다. 리다이렉트 뒤 200이 아니거나 `noindex`가 붙은 페이지는 자격이 없다. 그리고 최소 방문자 수를 넘어야 하는데, 그 수치는 공개되지 않고 페이지와 origin에 같은 값이 적용된다.

셋째는 집계 방식이다. 쿼리스트링과 fragment는 지우고 같은 페이지로 합친다. 그리고 SPA의 JavaScript 라우트 전환은 사용자에게 새 페이지처럼 보여도 **처음 로드한 페이지 한 건의 경험으로 귀속된다**고 문서가 명시한다. 필자의 RUM이 soft navigation을 따로 세는 것과 정반대다. [Chrome 팀의 soft navigation 문서](https://developer.chrome.com/docs/web-platform/soft-navigations)도 soft navigation이 CrUX에 어떻게 보고될지는 아직 정해지지 않았다고 적고 있다.

이 조건들을 필자의 블로그에 대어 보면 구체적인 결과가 나온다. 2026년 9월 11일에 글이 하나뿐인 카테고리 페이지 126개를 `noindex, follow`로 돌렸다. 이 페이지들은 이제 페이지 단위 CrUX에 들어갈 자격이 없다. 그러면 origin 단위에는 남을까. 문서의 답이 한 페이지 안에서 갈린다. Origin 절은 origin이 발견 가능하면 개별 페이지의 발견 가능성과 관계없이 모든 페이지의 경험을 origin 단위로 합친다고 쓰는데, 같은 문서의 Eligibility 절 첫머리는 Page 조건을 채우지 못한 경험은 origin 단위 데이터에도 들어가지 않는다고 쓴다. 필자는 어느 쪽이 실제 동작인지 확인할 방법을 찾지 못했다.

**그래서 noindex로 돌린 카테고리 방문이 origin 값에 남는지는 모른다고 적는다.**

여기까지가 문서로 확인한 규칙이다. 정작 **hooninedev.com이 최소 방문자 수를 넘는지는 모른다.** 그 문턱이 공개되지 않으니 직접 조회해 보는 수밖에 없는데, 그 시도는 다음 절에서 막혔다.

## PageSpeed Insights의 두 숫자

PageSpeed Insights는 한 화면에 성격이 다른 숫자 두 종류를 보여준다. [공식 설명](https://developers.google.com/speed/docs/insights/v5/about)에 따르면 lab 데이터는 Lighthouse가 시뮬레이션한 한 번의 로드이고, field 데이터는 CrUX의 직전 28일이다. lab은 고정된 기기와 네트워크 조건 하나의 결과이고 field는 다양한 환경의 실제 사용자 기록이라, 문서도 lab 점수가 좋다고 실제 경험이 좋다는 보장은 없다고 적는다.

field 쪽에는 폴백 규칙이 있다. 페이지 단위 데이터가 부족하면 origin 단위로 내려가고, origin도 부족하면 field 데이터를 아예 보여주지 못한다.

필자는 이 블로그의 field 데이터를 PSI API로 받아 보려 했다. 2026-09-16T08:45:51Z에 `/260914`를 모바일로 요청했을 때 HTTP 429가 돌아왔고, 2026-09-16T09:11:17Z에 홈(`/`)으로 한 번 더 요청했을 때도 같은 429였다. 응답 본문은 둘 다 `Quota exceeded for quota metric 'Queries' and limit 'Queries per day'`였다. API 키 없이 호출해서 공용 쿼터에 걸린 것으로 보인다. **그래서 이 글에는 이 블로그의 CrUX field 값이 없다.** CrUX API는 API 키가 필요한데 필자의 환경에는 Search Console용 서비스 계정만 있어서 호출하지 않았다.

같은 시각에 로컬 Lighthouse로 `/260914`를 재는 것은 문제없이 됐다.

**lab 값은 언제든 만들 수 있지만 field 값은 방문자 수와 자격 조건이 채워져야 존재한다.** 필자의 RUM에 수치가 쌓여 있어도 CrUX에 값이 있다는 뜻은 아니다.

## Search Console의 URL 그룹

마지막 단계는 Search Console의 Core Web Vitals 보고서다. [보고서 도움말](https://support.google.com/webmasters/answer/9205520)은 데이터가 CrUX에서 온다고 밝히고, 그 위에 규칙을 몇 겹 더 얹는다.

- 비슷한 페이지를 **URL group**으로 묶고, 그룹의 상태는 가장 나쁜 지표를 따른다.
- LCP와 CLS **둘 다** 기준량을 채워야 그룹이 보고서에 나온다. 그룹 데이터가 모자라면 상위의 origin 그룹으로 묶어 보여주고, origin 그룹도 모자라면 빠진다.
- **색인된 URL만** 나오고, 전체 목록이 아니라 표본이다.
- "No data available"은 속성이 새로 생겼거나 해당 기기 유형의 CrUX 데이터가 부족하다는 뜻이다.

네 단계를 이으면 표본이 줄어드는 순서가 보인다. RUM은 gtag.js가 돈 방문을 세고, CrUX는 그중 자격 있는 Chrome 사용자와 발견 가능하고 충분히 인기 있는 페이지만 남기고, PSI는 그것을 페이지나 origin 단위로 보여주며, Search Console은 색인된 URL을 그룹으로 묶어 기준량을 넘은 것만 남긴다. 단계마다 걸러내는 규칙이 다르므로, **같은 페이지의 LCP가 네 곳에서 다른 값으로 보이는 것은 오류가 아니라 정상이다.**

필자의 수집 스크립트(`scripts/fetch-gsc.js`)는 Search Analytics만 받는다. 그래서 이 블로그의 Core Web Vitals 보고서가 지금 어떤 상태인지는 이 글에서 확인하지 않았다. origin 그룹이라는 폴백이 있으니 트래픽이 작다는 이유만으로 "No data available"이라고 단정할 수도 없다. 보고서를 열어보기 전까지는 모른다.

## 랭킹 문장의 경계

field 데이터가 이렇게 걸러진다면, 그 데이터가 검색 순위에 얼마나 쓰이는지가 다음 질문이다. 이 주제는 과장이 가장 쉽게 붙는 곳이라 Google Search Central의 [page experience 문서](https://developers.google.com/search/docs/appearance/page-experience) 원문을 그대로 옮긴다. 문서는 FAQ 형식이고, 먼저 page experience라는 단일 신호가 랭킹에 쓰이느냐는 질문에 이렇게 답한다.

> There is no single signal. Our core ranking systems look at a variety of signals that align with overall page experience.

page experience 점수 같은 하나의 신호는 없다는 뜻이다. 바로 다음 질문은 page experience의 어떤 요소가 랭킹에 쓰이느냐이고, 답은 이렇다.

> Core Web Vitals are used by our ranking systems. We recommend site owners achieve good Core Web Vitals for success with Search and to ensure a great user experience generally. Keep in mind that getting good results in reports like Search Console's Core Web Vitals report or third-party tools doesn't guarantee that your pages will rank at the top of Google Search results; there's more to great page experience than Core Web Vitals scores alone.

원문이 확정하는 것은 Core Web Vitals가 랭킹 시스템에 쓰인다는 사실이고, 곧바로 좋은 보고서 결과가 상위 노출을 보장하지 않는다고 선을 긋는다. 같은 답은 SEO만을 위해 완벽한 점수를 노리는 것이 시간을 잘 쓰는 방법은 아닐 수 있다고 이어가고, Core Web Vitals 외의 page experience 요소는 순위를 직접 올려주지 않는다고 적는다.

필자가 더 중요하게 보는 것은 **이 문서가 말하지 않는 것**이다. 가중치가 얼마인지, 임계값을 넘는 순간 효과가 생기는지, needs improvement에서 good으로 옮기면 순위가 얼마나 움직이는지는 어디에도 없다. 그러니 "Core Web Vitals를 개선해서 순위가 올랐다"는 문장은 공식 문서로 뒷받침할 수 없고, 이 블로그에서는 더더욱 그렇다.

앞 절에서 봤듯 이 블로그는 field 값 자체를 확인하지 못했기 때문이다.

## 크롤링이 보는 서버 응답

성능과 검색이 공식 문서에서 분명하게 이어지는 곳은 오히려 크롤링이다. 다만 이것도 랭킹이 아니라 크롤링 속도와 색인에 대한 이야기다.

Google의 [crawl budget 가이드](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)는 대상부터 좁힌다. 고유 페이지가 100만 개 이상이면서 주 1회쯤 바뀌거나, 1만 개 이상이면서 매일 바뀌거나, Search Console이 "발견됨 - 현재 색인이 생성되지 않음"으로 분류한 URL이 많은 사이트다. 빠르게 바뀌는 페이지가 많지 않거나 발행 당일 크롤링되는 사이트라면 이 가이드를 읽을 필요가 없다고 원문이 직접 적는다. 2026년 9월 16일 기준 sitemap에 URL이 186개인 이 블로그는 대상이 아니다.

그래도 가이드의 크롤링 용량 규칙은 알아둘 만하다. 응답 시간이 안정되거나 좋아지면 한도가 올라가고, 느려지거나 5xx나 429를 보내면 내려간다. [HTTP 상태 코드 문서](https://developers.google.com/search/docs/crawling-indexing/http-network-errors)는 그 결과를 더 구체적으로 적는다. 5xx와 429는 크롤러를 일시적으로 늦춘다. 이미 색인된 URL은 유지되지만 계속되면 결국 색인에서 빠진다. 429를 제외한 4xx는 크롤링 속도에 영향이 없다. 여기서 경로를 정확히 구분해야 한다. 
오래 이어진 5xx는 **색인 탈락**으로 가는 경로이지, 순위를 깎는 신호라는 공식 문장은 필자가 찾지 못했다.

이 블로그의 가장 큰 서버 사건은 GA Data API 호출이 65초 넘게 매달린 JIHOON-BLOG-2였다. 응답은 200이었다. 지금 `src/lib/google-analytics.ts`를 부르는 곳은 `/api/analytics` 라우트뿐이지만 8월에는 사정이 달랐다. 그때 GA 호출이 다시 멈춘 JIHOON-BLOG-8은 마지막 이벤트의 transaction이 홈(`GET /`)이었고, 지금 조회되는 이벤트 10건 중 2건이 `GET /`, 8건은 transaction이 비어 있다. 크롤링 대상인 홈 요청에서도 GA 호출이 멈췄던 것이다. 하지만 그것이 크롤링에 영향을 줬는지는 모른다. Crawl Stats 보고서를 이 글을 쓰며 열어보지 않았기 때문이다.

**확인하지 않은 연결은 연결하지 않는다.**

## page와 query의 클릭 차이

이제 방향을 돌려 Search Console이 돌려주는 검색 데이터를 본다. 필자가 매주 CSV로 받아 제목과 설명을 고치는 데 실제로 쓰는 데이터다.

![Search Console API로 수집한 두 28일 구간에서 page 차원 클릭 합계는 47회인데 query 차원 클릭 합계는 8회와 9회에 그친다](1.png?w=720)

2026년 9월 11일에 받은 CSV를 차원별로 더하면 숫자가 맞지 않는다. 최근 28일(8월 12일부터 9월 8일)에 page 차원 클릭 합계는 47회인데 query 차원 클릭 합계는 8회다. 직전 28일(7월 15일부터 8월 11일)도 47회와 9회다.

두 구간에서 같은 폭으로 벌어지니 한 번의 우연이 아니라 구조다.

처음 의심한 것은 행 수 제한이었다. [Search Analytics API 문서](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)는 모든 행을 보장하지 않고 상위 행을 반환한다고 적는다. 그런데 필자의 스크립트는 `rowLimit: 1000`으로 요청하고, 돌아온 query 행은 128개와 66개다. **한도에 닿지 않았으니 잘림은 원인이 아니다.**

남는 설명은 두 가지이고 둘 다 [Search Console 도움말](https://support.google.com/webmasters/answer/17010575)에 있다. 하나는 익명화다. 아주 드물게 검색된 쿼리는 개인정보 보호를 위해 쿼리 표에서 빠지고 전체 합계에만 포함된다. 다른 하나는 [집계 단위](https://support.google.com/webmasters/answer/7576553)다. query 차원은 property 단위로 센다. [property 집계 설명](https://support.google.com/webmasters/answer/17011364)의 예대로, 한 사용자가 같은 사이트의 링크 두 개를 차례로 눌러도 클릭 1회다. page 차원은 URL 단위라 같은 행동이 클릭 2회가 된다.

그러니 이 두 합계는 애초에 같은 규칙으로 만든 숫자가 아니다. 한 가지 유혹을 적어두면, 최근 28일에 클릭이 잡힌 쿼리는 여섯 개이고 그중 다섯 개가 "eslint vs biome", "biome vs prettier" 같은 Biome 비교형 쿼리다. 그 다섯 쿼리의 클릭을 더하면 6회이고, 마침 Biome 글 한국어 URL의 page 클릭도 6회다. 딱 맞아떨어져 보이지만 **집계 규칙이 다른 두 숫자가 같다는 사실로 둘을 이을 수는 없다.**

query 데이터는 유입의 분해가 아니라 검색 의도를 엿보는 표본으로 읽어야 한다.

## 순위가 내려갔는데 클릭이 늘었다

이 검색 데이터로 필자가 실제로 판단을 내렸던 사례가 있다. [Biome이 ESLint와 Prettier를 대체할 수 있을까?](/241201)는 2024년 12월에 쓴 글인데, 노출에 비해 클릭이 눈에 띄게 적었다. 그래서 2026년 6월 11일에 실제 검색 쿼리 형태에 맞춰 "Biome vs ESLint vs Prettier"로 시작하는 `seoTitle`을 붙였다.

제목을 바꾼 뒤 수집한 28일 비교에서 이 글의 숫자는 이렇게 움직였다. 노출은 230회에서 204회로 11% 줄었고 평균 게재순위는 8.9위에서 11.6위로 밀렸다. 두 지표만 보면 나빠진 글이다. 그런데 클릭은 2회에서 13회로 늘었고 CTR은 0.87%에서 6.37%가 됐다.

이 네 숫자는 당시 조회한 값이다. `.gsc-data/`는 수집할 때마다 덮어쓰여서 그때의 CSV는 지금 레포에 없고 정확한 수집일도 남기지 않았다. 확인되는 것은 8월 18일 커밋에 담긴 8월 16일자 원고 스냅샷에 이 숫자가 이미 있다는 것까지다.

![Search Console 기준 Biome 글의 28일 비교에서 노출과 평균 순위는 나빠졌지만 클릭과 클릭률은 크게 올랐다](2.png?w=720)

먼저 김을 빼두는 것이 정직하겠다. 이 숫자는 제목 수정의 효과를 입증하지 않는다. page 차원의 평균 게재순위는 노출마다 기록된 그 페이지의 최상위 위치를 평균한 값이라, 위쪽에 뜨지만 아무도 누르지 않던 노출이 빠지기만 해도 순위는 나빠지고 CTR은 올라간다. 쿼리 구성과 계절성도 기간마다 다르다. 늘어난 클릭의 절대량은 28일 동안 11회다. 배수로 보면 크고 절대량으로 보면 작다.

그래도 남는 것이 있다. 순위를 성과로 보면 손봐야 할 글이고, 실제 유입을 성과로 보면 나아진 글이다.

**무엇을 결과 지표로 고르느냐가 같은 데이터의 결론을 바꾼다.** 필자가 순위 하락만 봤다면 막 나아지기 시작한 글을 다시 뜯어고쳤을 것이다.

### 9월에 다시 조회한 숫자

이 글을 쓰면서 같은 글의 지금 상태를 다시 확인했다. 2026년 9월 11일에 수집한 CSV에서 한국어 URL `/241201`은 이렇다.

| 구간 | 노출 | 클릭 | CTR | 평균 게재순위 |
|---|---|---|---|---|
| 직전 28일 (7월 15일 ~ 8월 11일) | 211 | 11 | 5.21% | 14.5 |
| 최근 28일 (8월 12일 ~ 9월 8일) | 185 | 6 | 3.24% | 20.8 |

앞의 두 값(8.9, 11.6)과 이 CSV의 두 값(14.5, 20.8)을 수집 순서대로 놓으면 평균 게재순위는 여름 내내 밀렸다. 클릭은 13회 뒤로 11회, 6회다. 앞 비교의 최근 구간과 9월 수집의 직전 구간은 기간이 겹칠 수 있어 13회에서 11회를 하락으로 읽기는 어렵지만, 최근 구간의 6회는 분명히 내려온 숫자다. "순위는 내려갔지만 클릭이 늘었다"는 이야기는 첫 비교에서 가장 선명했고 다음 구간이 그것을 흔들었다.

그래도 앞 절의 결론이 뒤집히지는 않는다. 클릭 6회와 CTR 3.24%는 첫 비교의 직전 구간(2회, 0.87%)보다 여전히 높다. 다만 교훈이 하나 늘었다. 지표의 선택만이 아니라 **비교 기간의 선택도 결론을 바꾼다.**

28일 비교 하나로 이야기를 완성하면 다음 28일이 그 이야기를 부순다.

그리고 최근 구간에는 8월 17일에 커밋한 이 글의 번역본 다섯 개가 새로 들어와 있다. 영어판 `/en/241201`은 노출 84회에 클릭 0, 중국어판은 노출 12회에 클릭 1회다. 번역본이 한국어 URL의 노출을 나눠 가졌는지, 평균 게재순위가 왜 계속 밀리는지는 아직 모른다.

확인하기 전까지는 미해결로 둔다.

## 한 구간에 겹친 변경

Biome 글에 인과를 붙이지 않은 것은 조심성 때문만이 아니다. 이 블로그에는 인과를 분리할 수 없는 조건이 실제로 있다.

2026년 9월 11일 하루에만 hreflang 복구, 제목 48개 재작성, OG 이미지 수정, 카테고리 126개 noindex를 포함해 검색 관련 변경이 여섯 가지 들어갔고, 16일까지 hreflang 추가 수정, IndexNow 도입, 잘린 제목과 설명 재작성, 새 글 발행이 이어졌다. 이 글의 재작성도 같은 구간에 들어간다.

필자는 9월 11일에 기준선 문서를 남겼다. 그 시점 최근 28일에 영어 글 페이지는 노출 892회에 클릭 0이었고, 10월 초에 이 숫자가 움직이는지 보기로 했다. 그런데 10월에 영어 클릭이 늘어도 원인을 하나로 고를 수 없다. hreflang 수정일 수도, 9월 11일의 제목 재작성일 수도, 9월 16일의 잘림 수정일 수도 있다. 게다가 기준선 데이터에는 이미 반례가 하나 있다. 제목 잘림을 원인으로 보기에는 잘린 제목이 1개뿐인 zh-CN이 클릭 7회로 비한국어 locale 중 가장 많았다. **그래서 10월 비교에서는 방향만 읽고 개별 기여는 주장하지 않기로 했다.**

## 숫자마다 표본과 규칙을 먼저 적는다

앞 세 편이 서버의 조용한 실패, 방문자가 기다린 시간, 그 기다림이 생긴 자리를 보여줬다면, 이 편의 데이터는 그 경험이 브라우저 밖으로 나가 다른 사람의 규칙으로 걸러진 결과다. 그래서 결론도 조금 더 방어적이다. field 데이터는 RUM, CrUX, PSI, Search Console을 거치며 단계마다 다른 규칙으로 줄어들고, 이 블로그처럼 작은 사이트에서는 끝까지 남지 않을 수도 있다. Google의 랭킹 문장은 Core Web Vitals가 쓰인다는 데서 멈추고, 크롤링 문서는 느린 응답과 5xx가 크롤링과 색인에 영향을 준다는 데서 멈춘다. Search Console의 page와 query 합계는 서로 다른 규칙으로 센 숫자라 합쳐지지 않는다. **숫자마다 누구를 어떤 규칙으로 셌는지 먼저 적고, 공식 문장이 멈춘 곳에서 같이 멈추는 것.** 관측을 판단으로 바꾸는 일은 대부분 그 두 가지였다.

필자도 10월에 기준선과 새 CSV를 비교하면서 방향만 읽을 생각이다. 이 시리즈를 따라온 독자분들이 다음에 dashboard의 숫자 하나를 근거로 결정을 내릴 일이 생긴다면, 그 숫자를 누가 어떤 규칙으로 셌는지 한 줄만 먼저 적어 두기를 권한다. 그리고 그 결론을 한 달 뒤에 다른 기간으로 다시 조회해 보자.

:::ref
- [docs] [web.dev, Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- [docs] [Google Search Central, Understanding Core Web Vitals and Google search results](https://developers.google.com/search/docs/appearance/core-web-vitals)
:::
