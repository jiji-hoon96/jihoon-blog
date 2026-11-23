---
emoji: 🔎
title: 'Network 패널로 따라간 42 MB'
seoTitle: 'DevTools Network 패널 실전, Initiator로 토스뱅크 42 MB 따라가기'
date: '2026-11-20'
categories: 프론트엔드 성능 DevTools
description: '토스뱅크 첫 화면은 42 MB 를 받는다. Network 패널의 하단 줄, Size, Initiator 를 따라가 27 MB 가 카드 배경색 한 점을 읽으려 받은 원본 PNG 임을 찾았다. lazy 가 막지 못한 요청과 Disable cache 가 부풀린 10 MB 도 잰다.'
keywords: 'Chrome DevTools Network 패널, 개발자 도구 Network 탭 사용법, Initiator 비동기 스택, Disable cache 첫 방문, loading lazy 이미지, Resource Timing transferSize, canvas getImageData CORS, 이미지 전송량 최적화'
---
이번 글에서는 Chrome DevTools 의 Network 패널로 한 페이지의 전송량을 끝까지 추적해 본다.

Network 탭을 열어 실패한 API 를 찾아본 적은 있지만, 페이지가 왜 무거운지는 어디부터 봐야 할지 모르는 프론트엔드 개발자를 위한 글이다. 하단 요약 줄, Size 열, Initiator 를 차례로 따라가 토스뱅크 첫 화면 42 MB 의 출처를 코드 한 줄까지 찾는다. 그 과정에서 `loading="lazy"` 가 막지 못하는 요청과, Disable cache 를 켜고 잰 숫자가 첫 방문과 달라지는 경우도 확인한다.

필자는 회사에서 화면 성능을 다룰 때 Network 패널을 매일 열지만, 열면 늘 보던 항목만 보게 된다. 그래서 DevTools 의 패널을 하나씩 실제 서비스에 적용해 끝까지 살펴보기로 했고, 첫 대상으로 로그인 없이 누구나 열 수 있는 토스뱅크 홈(`www.tossbank.com`)을 골랐다. 토스뱅크가 왜 이렇게 만들었는지는 필자가 알 수 없으므로 판단하지 않는다. 이 글이 다루는 것은 패널이 보여주는 숫자와 그 숫자가 생기는 원리다.

## 하단 요약 줄

측정은 2026년 11월 20일 18시대에 Chrome 157.0.8103.80 을 headless 로 띄워 진행했다. 매번 새 프로필로 창 크기를 1600x1000 으로 두고 열어, 네트워크 제한 없이 15초 동안 받은 것을 셌다. 세 번 반복해 열어 보니 MB 소수 둘째 자리까지 같은 값이 나왔다. 토스뱅크 홈은 배포와 피드에 따라 바뀌어서, 같은 날 오전에는 카드 하나가 달라 2 MB 가 더 컸다. 그래서 같은 구조를 재현한 데모를 [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/image-color-sampling) 에 만들었고 글 뒤쪽에서 함께 잰다.

Network 패널을 열고 페이지를 새로 고치면 가장 먼저 볼 곳은 맨 아래 한 줄이다. 토스뱅크 홈에서는 요청 156개, `42,202 kB transferred`, `55,603 kB resources` 가 찍혔다. [Network 패널 레퍼런스](https://developer.chrome.com/docs/devtools/network/reference)는 이 줄이 전송된 크기와 압축을 푼 크기의 합계라고 설명한다. transferred 는 응답 헤더와 압축된 본문이 실제로 네트워크를 지난 양이다. resources 는 압축을 푼 크기이고, 캐시에서 꺼내 네트워크로는 0 바이트였던 응답도 여기에 크기 그대로 더해진다. 그래서 resources 가 더 크다.

필터를 걸면 이 줄이 "필터 결과 / 전체" 두 값으로 바뀐다. 타입 필터에서 Img 를 누르면 `57 / 156 requests`, `40,450 kB / 42,202 kB transferred` 가 된다. 요청 수로는 37%인 이미지가 전송량의 96%를 차지한다. 그래서 이미지부터 본다. 같은 필터에서 resources 는 50,862 kB 로 transferred 보다 10 MB 남짓 크다. PNG 는 압축되어 오지 않으므로 이 차이는 거의 전부 캐시에서 꺼낸 이미지 때문이다. 이 숫자는 Disable cache 를 다룰 때 다시 나온다.

![토스뱅크 홈의 Network 화면에서 Img 필터를 켜고 Size 를 내림차순으로 정렬하면, 맨 위 배너는 Parser 가, 그 아래 카드 썸네일은 Script 가 요청한 것으로 나온다. 1 은 Img 필터, 2 는 내림차순으로 정렬한 Size 열 머리, 3 은 첫 행 tossbank-banner-web-Financial-sector.png 의 Size 두 줄로 5,590 kB 와 5,587 kB 다. 4 는 같은 행의 Initiator 로 (index):5 와 Parser, 5 는 둘째 행 bankfeed-gold-decline-cover.png 의 Initiator 로 index-8989962b29fa3f03.js:1 과 Script 다. 6 은 logo-bank-mono-white.svg 의 Size 두 줄로 1,616 kB 와 2,140 kB 다. 7 은 하단 줄의 40,450 kB / 42,202 kB transferred, 8 은 50,862 kB / 55,603 kB resources 다](1.png?w=720)

## Size 열의 두 줄

필터를 건 채로 Size 열 머리를 눌러 큰 것부터 정렬한다. Size 열은 기본으로 한 줄이다. 필터 줄 위, Network 패널 툴바 오른쪽 끝의 톱니바퀴 아이콘을 눌러 Big request rows 를 켜면 두 줄이 된다. 레퍼런스에 따르면 위는 서버가 보낸 헤더와 본문을 합친 크기이고, 아래는 압축을 푼 크기다.

맨 위 상단 배너 `tossbank-banner-web-Financial-sector.png` 는 위가 5,590 kB, 아래가 5,587 kB 로 거의 같다. PNG 는 이미 압축된 형식이라 서버가 응답을 다시 압축하지 않았고, 응답 헤더에 `content-encoding` 이 없었다. 남는 3.7 kB 는 응답 헤더만으로는 설명되지 않는다. 이 응답은 HTTP/2 로 왔고, HTTP/2 는 본문을 프레임(기본 최대 16 KB)으로 나눠 프레임마다 9바이트 헤더를 붙인다. Chromium 은 이 프레임 헤더도 받은 바이트로 센다([`spdy_session.cc`](https://github.com/chromium/chromium/blob/main/net/spdy/spdy_session.cc)). 5.6 MB 를 16 KB 프레임으로 나누면 340개 남짓이라 프레임 헤더만 3 kB 쯤이고, 여기에 응답 헤더를 더하면 계산이 맞는다. 반대로 로고 `logo-bank-mono-white.svg` 는 위가 1,616 kB, 아래가 2,140 kB 로 차이가 벌어진다. SVG 는 텍스트라 gzip 으로 압축되어 전송됐다. 로고가 2 MB 인 것은 파일 안에 PNG 두 장이 base64 로 들어 있어서다.

정렬한 목록의 위쪽은 상단 배너와 피드 카드 썸네일이다. 큰 배너 셋은 원본이 5120x2800 이고 화면에는 1600x1000 으로 그려진다. `bankfeed-` 로 시작하는 카드 썸네일은 원본이 3200x2160 이고 화면에는 302x170 으로 그려진다. 레티나 화면처럼 CSS 픽셀 하나를 물리 픽셀 둘로 그리는 환경(기기 픽셀 비율 2)을 기준으로 잡아도, 배너는 필요한 폭 3,200 px 에 5,120 px 를, 카드는 604 px 에 3,200 px 를 받는 셈이다. 원본 크기는 페이지에서 `naturalWidth` 를 읽어 확인했다.

Size 의 위 값을 다른 도구로 재도 같다. 이 글의 전송량은 Chrome DevTools Protocol(CDP)이 요청마다 주는 `encodedDataLength` 를 더한 값이고, 하단 줄과 바이트 단위로 일치했다. 페이지 안의 자바스크립트로도 읽을 수 있다. `performance.getEntriesByType('resource')` 로 가장 큰 카드 썸네일을 보면 `transferSize` 가 `encodedBodySize` 보다 300 크다. [Resource Timing 명세](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-transfersize)는 실제 헤더 크기를 드러내지 않으려고 본문 크기에 상수 300 을 더하도록 정한다. 이 값이 다른 origin 의 이미지에서 보인 것은 요청이 CORS 로 나갔고 서버가 `access-control-allow-origin` 과 `timing-allow-origin` 을 둘 다 `*` 로 열어 두었기 때문이다.

크기만 보면 흔한 이미지 최적화 이야기다. 그런데 Initiator 열을 같이 보면 카드 썸네일은 화면의 `<img>` 가 아니라 스크립트가 요청했다.

## Initiator 와 비동기 스택

Initiator 열은 누가 이 요청을 만들었는지 보여준다. 레퍼런스에 나오는 값은 Parser, Redirect, Script, Early Hints, Other 다. 그림 1 에서 배너의 Initiator 는 `(index):5` 와 Parser 다. HTML 을 읽던 파서가 `<img>` 를 만나 요청했다. 카드 썸네일 `bankfeed-gold-decline-cover.png` 는 `index-8989962b29fa3f03.js:1` 과 Script 다. 스크립트 실행 중에 요청이 나갔다.

화면에 보이는 카드는 `<img>` 인데 왜 Script 일까. 행을 눌러 상세 화면의 Initiator 탭을 열면 요청을 만든 호출 스택이 나온다.

![같은 요청의 Initiator 탭에 Image, setTimeout, await in fetch 세 비동기 경계로 나뉜 호출 스택이 나온다. 1 은 Initiator 탭, 2 는 첫 묶음 Image 로 T.o, T, (anonymous) 두 개가 모두 index-8989962b29fa3f03.js 에 있다. 3 은 setTimeout 묶음으로 main 과 _app 번들의 batch, setData, fetch 가 있고, 4 는 await in fetch 묶음으로 H, onSubscribe, subscribe 가 있다](2.png?w=720)

굵은 글씨 `Image`, `setTimeout`, `await in fetch` 는 비동기 경계다. 각 경계 아래의 프레임은 그 비동기 작업을 예약한 순간의 스택이다. 그래서 아래에서 위로 읽으면 시간 순서가 된다.

1. `fetch` 라는 이름의 함수가 `await` 로 데이터를 기다렸다가 재개된다(4). 이 이름은 브라우저의 `window.fetch` 가 아니라 번들 안 함수의 이름이다. 아래의 `onSubscribe`, `subscribe` 는 그 함수를 부른 쪽이다
2. 그 함수가 `setData` 로 상태를 바꾸고, `batch` 를 거쳐 `setTimeout` 을 예약한다(3)
3. 타이머가 돌고 React 내부로 보이는 `framework-*.js` 프레임들을 지나, 함수 `T` 가 이미지의 `src` 를 넣는다(2)

맨 위 경계 `Image` 는 스크립트가 이미지 요소에 `src` 를 넣은 순간이다. 실제 요청은 그 직후 브라우저가 따로 내보내므로 Initiator 는 그 순간의 스택을 보여준다. 이 이름만으로는 DOM 의 `<img>` 인지 `new Image()` 인지 구분되지 않는다. 그것은 코드를 열어 봐야 안다.

스택의 `index-8989962b29fa3f03.js:1` 을 누르면 Sources 패널이 그 위치를 연다. Sources 는 압축된 파일을 기본으로 펼쳐서(pretty print) 보여주므로 한 줄짜리 번들이라도 읽을 수 있다. 번들 해시는 배포마다 바뀌지만 Initiator 의 링크를 따라가면 그때의 파일로 간다. 필자는 같은 파일을 받아 읽었고, 카드 컴포넌트의 effect 로 보이는 콜백이 썸네일 주소로 `T` 를 부르고 있었다. `T` 가 하는 일은 네 가지다.

1. `new Image()` 를 만들고 `crossOrigin` 을 `"anonymous"` 로 둔 뒤 카드 썸네일의 원본 주소를 넣는다
2. 로드가 끝나면 이미지와 같은 크기의 canvas 를 만든다
3. 이미지를 canvas 에 그린다
4. `getImageData` 로 오른쪽 끝에서 20 px, 위에서 20 px 지점의 픽셀 하나를 읽고, 그 색을 카드 배경색으로 쓴다

`T` 는 썸네일 가장자리의 색으로 카드 배경을 채운다. 그 픽셀 하나를 읽으려고 원본 PNG 를 통째로 받는다. 첫 화면에서 이 경로로 받은 카드 썸네일이 24장, 27.14 MB 다. 이미지 전송량 40.45 MB 의 3분의 2다.

이 과정을 한 그림에 정리하면 이렇다. 같은 원본을 두 곳에서 요청한다.

![같은 원본 PNG 를 요청하는 두 경로. 카드의 img loading lazy 는 화면에 가까워지면 Initiator Parser 로 요청한다. 스크립트의 new Image() 는 피드 데이터가 오면 24장 전부를 Initiator Script 로 요청하고, 받은 원본을 같은 크기의 canvas 에 그린 뒤 getImageData 로 픽셀 1개를 읽는다. 3200x2160 원본이면 canvas 는 약 27.6 MB 다. 두 번째 요청은 캐시가 켜져 있으면 0 B 이고 Disable cache 면 다시 받는다](3.png?w=720)

이 구분을 볼 수 있는 곳은 DevTools 의 Initiator 다. 페이지 안의 Resource Timing 으로는 구분되지 않는다. `new Image()` 로 받은 썸네일도 `initiatorType` 이 `"img"` 로 찍혔다. 명세가 img 요소의 `src` 를 처리하며 생긴 요청을 `img` 로 분류하고, `new Image()` 도 img 요소이기 때문이다.

### 원본 크기 canvas 와 CORS

`T` 는 canvas 의 `width` 와 `height` 를 이미지 원본 크기로 둔다. [HTML 명세](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)에서 canvas 비트맵의 크기는 이 두 속성이 정하므로, 3200x2160 이미지라면 픽셀 691만 개짜리 비트맵이 생긴다. 픽셀당 RGBA 4바이트로 치면 약 27.6 MB 다. `drawImage` 를 하려면 원본 PNG 도 풀어야 하므로 같은 크기의 디코드된 비트맵이 하나 더 있고, 이 일을 썸네일마다 반복한다. canvas 는 함수 안의 지역 변수라 GC 가 치울 때까지 잠깐 있는 값이다. 이 수치들은 계산으로 구한 값이다. 필자는 프로세스 메모리로 재 보려 했지만 렌더러와 GPU 프로세스로 흩어진 값이 실행마다 달라져 변형 사이의 차이를 가려내지 못했다.

`crossOrigin="anonymous"` 는 `getImageData` 때문에 필요하다. 이미지는 페이지와 다른 origin 인 `static.toss.im` 에서 온다. [HTML 명세](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements)는 다른 origin 의 이미지를 허락 없이 그린 canvas 를 읽지 못하게 막고, 그 상태에서 `getImageData` 를 부르면 `SecurityError` 를 던지도록 정한다. `crossOrigin` 을 주면 요청이 CORS 로 나가고, 서버가 허락하면 canvas 를 읽을 수 있다. 그 허락은 Headers 탭의 응답 헤더 `access-control-allow-origin: *` 에서 확인할 수 있다.

## lazy 밖의 스크립트 요청

카드의 `<img>` 에는 `loading="lazy"` 가 붙어 있다. 그런데도 24장을 첫 화면에서 받는 것은 lazy 가 그 `<img>` 자신의 요청만 미루기 때문이다. [HTML 명세](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes)는 lazy 를 조건이 맞을 때까지 받기를 미루는 상태로 정의한다. 같은 주소를 스크립트가 따로 요청하면 그 요청은 lazy 와 상관이 없다.

얼마나 앞당겨졌는지 세어 보면 이렇다. lazy 가 붙은 카드 `<img>` 24개는 문서 위치 760 px 에서 3,411 px 사이에 있다. 15초 뒤에 로드된 것은 1,896 px 까지의 12개였고, 2,275 px 부터 아래 12개는 로드되지 않았다. [web.dev 의 지연 로딩 문서](https://web.dev/articles/browser-level-image-lazy-loading)에 따르면 Chrome 은 연결 상태를 4G 로 추정하면 뷰포트에서 1,250 px 안에 들어온 lazy 이미지를 미리 받는다. 창 높이 1,000 px 에 1,250 px 를 더하면 2,250 px 이므로, 관찰한 경계가 이 기준과 맞는다. 그 아래 12장은 `<img>` 로는 아직 받을 때가 아니었는데, 스크립트가 17.20 MB 를 먼저 받았다. 가장 큰 썸네일 5,376 kB 도 문서 위치 2,654 px 로 여기에 속한다.

모바일 화면에서는 이 비중이 더 커진다. 같은 페이지를 iPhone 의 사용자 에이전트와 390x844 화면으로 열자 전송량은 42.17 MB 로 거의 같았다. 카드가 한 줄에 하나씩 놓이면서, 창 높이 844 px 에 1,250 px 를 더한 경계 밖으로 밀려난 카드가 19장, 23.88 MB 로 늘었다.

상단 배너는 lazy 와는 다른 이유로 화면에 보이지 않는 이미지를 받는다. 모바일 화면에서 데스크톱용 배너 네 장 10.27 MB 를 받았고, 데스크톱에서는 모바일용 배너 네 장 1.42 MB 를 받았다. 두 묶음 모두 `display: none` 인 영역 안의 `<img>` 이고 `loading` 이 없다. HTML 명세는 이미지를 기본으로 즉시 받도록 정하므로 감춰 둔 `<img>` 도 받는다.

## Disable cache 와 중복 요청

여기까지 Disable cache 는 끈 채로 쟀다. Network 패널 레퍼런스는 이 체크박스를 설명하는 절의 제목을 "첫 방문자 흉내 내기(Emulate a first-time visitor)"로 달았다. Chrome 157 의 Performance 패널도 이 설정 옆에 첫 방문과 비슷한 네트워크 경험을 흉내 낸다고 적는다. 그래서 첫 방문을 잴 때 이 체크박스부터 켜는 경우가 많다. 토스뱅크 홈에서 켜고 다시 쟀다.

![Disable cache 를 켜면 같은 썸네일이 Parser 와 Script 로 두 번 받아지고 전송량이 52 MB 로 늘어난다. 1 은 체크된 Disable cache, 2 는 bankfeed-ipo-reorganization-cover.png 가 두 줄로 나온 것으로 위 줄은 Initiator (index):5 Parser, 아래 줄은 index-8989962b29fa3f03.js:1 Script 이고 둘 다 1,625 kB 다. 3 은 하단 줄의 50,391 kB / 52,148 kB transferred 다](4.png?w=720)

전송량이 42.20 MB 에서 52.15 MB 로 9.95 MB 늘었다. 그중 9.94 MB 는 화면 가까이 있어 로드된 카드 `<img>` 12개다. 나머지 요청 일곱 개는 이미지가 아닌 작은 preflight 요청이었다. 캐시를 켠 첫 방문에서 이 12개는 0 바이트였다. 스크립트가 같은 파일을 먼저 받아 두었고, 뒤에 온 `<img>` 요청이 그것을 재사용했다. Disable cache 를 켜면 같은 파일을 한 번 더 받는다. 그림 4 에서 같은 파일명이 Parser 와 Script 로 두 번 나오는 행이 이 경우다. 하단 요약 줄에서 resources 가 transferred 보다 10 MB 남짓 컸던 것도 이 12개 때문이다.

어느 캐시가 그 파일을 다시 썼는지는 이 측정으로 확인하지 못했다. 12개 중 1개는 응답 정보에 디스크 캐시로 표시됐고, 나머지 11개는 캐시 표시 없이 0 바이트였다. 응답은 `cache-control: max-age=86400` 이고 `Vary` 헤더가 없었다. CORS 요청(`crossOrigin`)과 일반 `<img>` 요청은 credentials 모드가 다르다. Blink 의 메모리 캐시를 다루는 [`resource.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/loader/fetch/resource.cc)는 credentials 모드가 앞 요청과 다르면 다시 받는다고 적고, 그 예로 서버가 `Access-Control-Allow-Origin: *` 를 주는데 CORS 요청과 아닌 요청이 섞이는 경우를 든다. 반면 HTTP 캐시를 credentials 로 나누는 기능(`kSplitCacheByIncludeCredentials`)은 [`net/base/features.cc`](https://github.com/chromium/chromium/blob/main/net/base/features.cc)에서 기본으로 꺼져 있다. 그래서 HTTP 캐시 쪽에서 다시 쓴 것으로 보지만, 측정으로 확인한 것은 아니다.

첫 방문자는 캐시가 비어 있는 사람이지, 캐시가 없는 사람이 아니다. 처음 받은 파일은 같은 페이지 안에서 바로 다시 쓰인다. Disable cache 는 그 재사용까지 막으므로, 한 페이지가 같은 파일을 두 번 요청하는 구조라면 이 체크박스를 켜고 잰 값은 첫 방문보다 크게 나온다. 그런 페이지에서 첫 방문을 재려면 캐시를 비운 뒤 체크박스를 끈 채 새로 고친다. Network 패널의 요청 목록을 우클릭하면 Clear browser cache 가 있다. 같은 일을 하는 CDP 명령으로 확인해 보니, 한 번 연 뒤 캐시를 비우고 다시 열자 42.20 MB 로 처음 열 때와 같았다. 비우지 않고 다시 열면 0.16 MB 였다.

## 같은 구조를 데모로 재기

토스뱅크 홈은 이 글이 나간 뒤에도 바뀐다. 그래서 같은 구조를 공개 자료로 다시 만들었다. 3200x2160 PNG 카드 24장을 다른 origin 에서 받고, 카드마다 `<img loading="lazy">` 를 둔다. 카드 배경색을 정하는 방법만 세 가지로 바꿨다. 색 읽기 코드는 이렇다.

```js
async function sampleColor(src, x, y) {
  const img = await new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const [r, g, b] = ctx.getImageData(img.width - x, y, 1, 1).data;
  return { r, g, b };
}
```

- **원본에서 읽기**: 토스뱅크와 같은 구조다. 카드 원본으로 `sampleColor` 를 부른다
- **썸네일에서 읽기**: 같은 함수를 64x43 썸네일로 부른다
- **미리 계산한 색**: 색을 JSON 으로 받아 쓴다

같은 조건(창 1600x1000, 새 프로필, 3회)에서 세 변형의 전송량은 16.80 MB, 8.03 MB, 7.94 MB 였다. 원본에서 읽으면 화면에서 먼 카드 12장까지 받아 두 배가 된다. 썸네일에서 읽으면 64x43 썸네일 24장의 전송량 98 kB 만 더해진다. Disable cache 를 켜면 원본에서 읽는 변형만 24.73 MB 로 늘었다. 미리 계산한 색 변형은 같은 파일을 두 번 요청하지 않으므로 7.94 MB 그대로였다. Network 패널의 Initiator 도 토스뱅크와 같게 색 읽기 요청 24개가 Script, 카드 `<img>` 요청이 Parser 로 나온다.

## 하단 줄에서 코드 한 줄까지

토스뱅크 첫 화면 42.20 MB 중 40.45 MB 가 이미지였고, 그중 27.14 MB 는 스크립트가 카드 배경색 한 점을 읽으려고 받은 원본 PNG 24장이었다. `loading="lazy"` 는 카드 `<img>` 의 요청만 미뤘기 때문에, 화면에서 먼 카드 12장 17.20 MB 도 첫 화면에서 받았다. Disable cache 를 켜고 재면 같은 파일을 두 번 받아 52.15 MB 가 된다.

이 결론을 내리는 데 쓴 기능은 많지 않다. 하단 요약 줄로 전체 전송량을 확인하고, 타입 필터로 어느 종류가 무거운지 가르고, Size 를 정렬해 큰 것부터 살핀 뒤, Initiator 열로 요청 주체를 나누고, Initiator 탭의 비동기 스택으로 코드까지 내려갔다. 이미지가 크다는 것은 Size 열만으로 보인다. 왜 그 이미지를 받는지는 Initiator 까지 가야 보인다.

여러분의 서비스에서도 Img 필터를 켜고 Size 로 정렬하거나, 필터 상자에 `larger-than:500k` 를 넣어 큰 응답만 남긴 뒤, 위쪽 행의 Initiator 가 Parser 인지 Script 인지 한번 보기를 권한다. Script 라면 그 요청에는 `loading="lazy"` 도 `srcset` 도 걸리지 않는다. 이미지에서 색을 읽어야 한다면, 데모에서 잰 것처럼 색을 미리 계산해 데이터로 내려주거나 작은 썸네일에서 읽는 것만으로 받는 양이 절반이 된다. 그리고 첫 방문을 잴 때는 그 페이지가 같은 파일을 두 번 요청하는지부터 확인하자. 그렇다면 Disable cache 대신 캐시를 비운 브라우저로 연다.

이 글은 DevTools 의 패널을 하나씩 실제 서비스에 적용해 살펴보는 시리즈의 첫 편이다. 다음 편에서는 같은 Network 패널의 Waterfall 과 Timing 탭으로 요청 하나의 시간이 어디에 쓰이는지 본다.

:::ref
- [docs] [MDN, Allowing cross-origin use of images and canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [docs] [Chrome DevTools, Inspect network activity](https://developer.chrome.com/docs/devtools/network)
:::
