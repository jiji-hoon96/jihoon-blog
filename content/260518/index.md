---
emoji: 🧠
title: "상태 관리"
seoTitle: "프론트엔드 상태 관리의 안목 — 지역·전역·서버·폼·URL 7가지 범주와 React 설계 기준"
date: "2026-05-18"
categories: 프론트엔드 상태관리 React 아키텍처
description: "프론트엔드에서 가장 까다로운 작업으로 꼽히는 상태 관리. 지역·전역·서버·폼·URL·외부·가드 7가지 범주로 상태를 분류하고, 단일 진실 공급원·불가능한 상태 제거·State Colocation 등 4가지 안목으로 도구 선택과 모델링 기준을 정리한다."
keywords: "프론트엔드 상태관리, React 상태관리, Zustand Jotai 비교, TanStack Query, 서버 상태 클라이언트 상태, State Colocation, 단일 진실 공급원, React 19 useOptimistic"
draft: true
---

이번 포스팅에서는 **상태 관리(State Management)** 에 대한 이야기를 해보려고 한다. 라이브러리 비교 글은 아니다. 어떤 도구가 더 좋은지를 가리는 것보다, 상태라는 것을 **어떻게 바라보고**, 어디에 **경계를 그어야 하는지**에 대한 감각을 정리하는 글이다.

요즘 AI 도구들(Claude, ChatGPT, Cursor, Gemini, Copilot)이 우리 옆에 깊숙이 자리잡았다. 개발 속도는 기하급수적으로 빨라졌는데, 솔직히 말하면 서비스의 완성도는 그만큼 따라오지 못하고 있다는 인상을 받는다. 늘어난 기능만큼 늘어난 버그를 마주하는 일이 잦아졌고, "이거 왜 이렇게 됐는지 모르겠어요"라는 말도 자주 듣게 된다.

빠르게 개발하는 만큼 코드 한 줄 한 줄을 세밀하게 들여다보지는 않게 된다. 그렇기에 더더욱 **AI에게 옳은 방향을 가이드할 수 있는 기본 실력**이 필요하다고 필자는 생각한다. AI가 짜준 코드의 문제를 알아채고, 원하는 방향으로 다시 가이드할 수 있어야 결과물의 품질이 유지된다. 그 기본 실력에는 도메인 관점의 개발, 추상화, TDD(Test-Driven Development, 테스트 주도 개발), 라이브러리 활용, 성능 우위 확보 등 여러 가지가 있을 것이다.

그런데 필자가 프론트엔드 동료들에게, 그리고 다른 IT 직군의 동료들에게 "프론트엔드 개발에서 제일 까다로운 작업이 뭐예요?"라고 물어볼 때마다 가장 많이 듣는 대답은 한결같았다. **"상태 흐름 관리요."**

이 글에서는 왜 상태 흐름 관리가 그렇게 까다로운지, 그리고 그것을 잘 다루기 위해 어떤 안목과 느낌을 키워야 하는지를 정리해보려 한다.

---

## 상태(State)란 무엇인가

본격적인 이야기에 들어가기 전에, 가장 기초적인 질문부터 짚고 가자. 우리가 말하는 "상태"란 정확히 무엇일까?

프론트엔드 개발 공부하며 [hoseung.me](https://blog.hoseung.me/2021-12-05-state-management)님의 글을 종종 읽었다. 여기서는 상태를 **"UI에 영향을 줄 수 있는 모든 데이터"** 라고 이야기한다. 좋아요 수, 장바구니 목록, 모달의 열림 여부, 입력값, 로그인된 사용자 정보, 현재 선택된 탭, 검색 결과, 로딩 여부. 이 모든 것이 상태이다.

React 공식 문서는 좀 더 형식적으로 정의한다. 페이지 제목이 그대로 ["State: A Component's Memory"](https://react.dev/learn/state-a-components-memory)인데, 풀어보면 **"컴포넌트가 렌더 사이에 데이터를 기억하고(retain), 갱신될 때 React에게 리렌더링을 트리거하는 메커니즘"** 정도이다. 즉 시간이 지나도 사라지지 않고, 어떤 이벤트에 의해 갱신되며, 갱신될 때 UI를 다시 그리게 만드는 데이터이다. 한 가지 더 짚자면 상태는 **컴포넌트 인스턴스마다 고립된다.** 같은 컴포넌트가 페이지에 열 개 있어도 각자 독립된 상태를 갖는다. 이 사실은 뒤에 다룰 "상태를 어디에 둘 것인가" 논의와 직접 연결된다.

두 정의 모두 한 곳을 가리킨다. **"렌더에 영향을 주면서 시간에 따라 변하는 값"** 이 상태이다. 변하지 않는 상수(constant)는 상태가 아니다. 빌드 타임에 박혀버린 원시 디자인 토큰은 상태가 아니지만, 사용자가 토글하는 다크 모드는 상태이다. (엄밀히 말하면 값 자체가 다크/라이트 테마라는 상태에 따라 resolve되는 것이라, "테마 선택"이 상태이고 토큰은 그 상태가 비추는 거울이라고 보는 게 정확하다)

여기서 한 가지 짚고 갈 점이 있다. **모든 상태가 컴포넌트에 사는 것은 아니다.** 쿠키에 사는 상태도 있고, localStorage·sessionStorage·IndexedDB에 사는 상태도 있고, URL에 사는 상태도 있다. 서버에 사는 데이터를 클라이언트로 들고 와서 캐시하면 그것도 일종의 상태가 된다. 브라우저 자체가 들고 있는 스크롤 위치나 히스토리 스택도, 우리 앱의 행동을 결정한다는 점에서 상태처럼 다뤄야 할 때가 있다.

---

## 왜 그렇게 까다로운가

상태를 다루는 게 왜 어려운지를 일단 단순하게 생각해보자. 필요한 상태를 만들고, 필요한 곳까지 전달하고, 갱신과 초기화만 잘 핸들링하면 되는 거 아닐까?

이 질문을 머릿속에 띄워둔 채로, 지금 일하고 있는 서비스의 한 페이지를 열어보자.

그 페이지에 컴포넌트가 몇 개나 있을까? 단순한 페이지라도 적게는 수십 개, 많게는 수백 개의 컴포넌트가 트리를 이루고 있을 것이다. 각 컴포넌트는 자기만의 상태를 들고 있을 수도 있고, 형제 컴포넌트와 상태를 공유할 수도 있으며, 부모로부터 상태를 내려받기도 한다. 페이지 간에도 상태가 전이되고, 새로고침을 해도 살아남아야 하는 상태가 있고, 탭을 닫으면 사라져야 하는 상태가 있다.

상태가 관리하기 어려운 진짜 이유는 이것이다. **수많은 상태들이 어디서 선언되고, 어떻게 갱신되고, 언제 소멸되는지를 우리는 한눈에 파악할 수 없다.** 비슷한 역할의 컴포넌트가 늘어날수록 상태의 이름을 짓는 것도, 상태를 변경하는 코드를 추적하는 것도 까다로워진다.

그래서 보이지 않는 거미줄이 생긴다. A 컴포넌트의 어떤 클릭이 B의 데이터를 무효화시키고, B의 무효화가 C의 UI를 닫히게 만들고, C가 닫히면서 폼 입력이 사라진다. 이런 연쇄가 코드 어디에도 명시되어 있지 않으면, 버그를 디버깅할 때 우리는 머릿속에서 이 거미줄을 다시 그려야 한다.

그렇다면 우리는 이 거미줄을 어떻게 정돈해야 할까? 필자가 생각하는 첫 단추는 **"상태에는 종류가 있다"** 는 것을 인지하는 것이다.

---

## 모든 상태가 똑같은 상태가 아니다

[Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react)는 상태를 **Server Cache** (서버에 존재하는 정보를 클라이언트가 빠른 접근을 위해 들고 있는 것)와 **UI State** (인터페이스 동작을 제어하기 위해 UI에만 존재하는 것)로 나눈다. 우리는 종종 이 둘을 한데 묶을 때 실수를 한다.

[TanStack Query 공식 문서](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state)는 서버-상태(server-state) 라이브러리로, 서버와 클라이언트 사이의 비동기 작업을 관리하고, Redux, MobX, Zustand 같은 도구들은 클라이언트-상태(client-state) 라이브러리라고 정의한다. (비동기 데이터를 저장할 수는 있지만, 그것은 비효율적이다)

핵심은 분명하다. **서버 상태와 클라이언트 상태는 다른 문제이다.** 서버 상태는 비동기적이고, 다른 사용자가 바꿀 수 있으며, 시간이 지나면 stale(오래된) 상태가 된다. 클라이언트 상태는 동기적이고, 우리가 통제할 수 있으며, 새로고침하면 사라진다.(정확히는 페이지가 unload되면서 **JavaScript 런타임이 재시작되고, heap 메모리에 올라가 있던 컴포넌트 트리와 그 안의 상태가 함께 회수된다.**  그래서 새로 마운트될 때는 `useState`의 초기값부터 다시 시작한다) 이 둘을 같은 도구로 묶으려고 하면 캐시 무효화, 백그라운드 갱신, 낙관적 업데이트 같은 패턴을 다 직접 짜야 한다.

필자는 여기서 한 발 더 나아가, 프론트엔드의 상태를 **일곱 가지 범주**로 구분해서 본다. 미리 짚어두자면, 이 일곱 가지는 단일 축으로 깔끔하게 나뉘지 않는다. 저장 위치·출처·생애주기·역할이 섞여 있어 한 상태가 여러 범주에 동시에 속할 수도 있다. 완벽한 분류표가 아니라 **상태를 어떻게 관리할지 결정할 때 던지는 질문들**이라고 봐주면 좋겠다.

```
1. 지역 상태 (Local State)       — 한 컴포넌트, 또는 좁은 트리 안에서만 쓰는 상태
2. 전역 상태 (Global State)      — 앱 전체가 공유해야 하는 상태
3. 서버 상태 (Server State)      — 서버가 진실의 출처이고, 클라이언트는 캐시인 상태
4. 폼 상태 (Form State)          — 사용자 입력 중 일시적으로 존재하는 상태
5. URL 상태 (URL State)          — 주소창에 사는, 공유 가능하고 새로고침에도 살아남는 상태
6. 외부 상태 (External State)    — 쿠키, localStorage, sessionStorage, IndexedDB 등 React 외부에 사는 상태
7. 상태 가드 (State Guard)       — 상태 자체가 아닌, 상태의 조합으로 접근/실행을 막거나 검증하는 로직

+ 상태머신으로 정교화해야 하는 워크플로우 상태, WebSocket·CRDT 기반의 실시간 협업 상태도 있다.
```

각각이 왜 다른 도구를 필요로 하는지, 그리고 어떤 안목으로 접근해야 하는지를 하나씩 풀어보자.

---

## 지역 상태(Local State)

가장 단순한 상태이다. 한 컴포넌트 안에서만 사용하고, 외부에서는 알 필요도 알 권리도 없는 상태. 모달의 열림 여부, 토글 버튼의 on/off, 호버 상태, 입력 중인 검색어 같은 것이다.

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

이 정도는 익숙할 것이다. 그런데 지역 상태에서 진짜로 까다로운 건 **"이 상태를 어디에 두어야 하는가"** 라는 위치 결정의 문제이다.

[Kent C. Dodds의 State Colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) 글에서 **사람들은 상태를 "끌어올리는(lift up)" 것에는 익숙하지만, 코드가 바뀌었을 때 상태를 다시 "가까이 두는(colocate)" 것은 잘 하지 않는다.** 라고 이야기를 한다.

상태를 끌어올리는 것은 형제 컴포넌트들이 같은 상태를 공유해야 할 때 우리가 자연스럽게 하는 행동이다. 두 형제가 같은 데이터를 봐야 하니, 공통 부모로 상태를 올려서 props로 내려준다.

문제는 그 상태가 더 이상 형제들에게 필요 없게 되었을 때이다. 우리는 그 상태를 다시 자식 쪽으로 **끌어내리는** 일을 잘 하지 않는다. 그 결과 부모 컴포넌트에는 사실 자기와 무관한 상태가 잔뜩 쌓이고, 부모가 리렌더링될 때마다 자식 트리 전체가 함께 리렌더링되는 일이 벌어진다.

그렇기에 지역 상태의 첫 번째 안목은 **더 빠르고 ,단순해지는 것을 위해 상태를 그 상태를 쓰는 코드에 최대한 가까이 둬라** 이다. 한 컴포넌트의 자식 하나에서만 쓰이는 상태라면, 부모가 들고 있을 이유가 없다. 그 자식 내부로 옮기자. 부모는 그만큼 가벼워진다.

---

## 전역 상태(Global State)

전역 상태는 앱 어디서나 접근 가능해야 하는 상태이다. 로그인 정보, 테마, 언어, 알림(토스트) 같은 것들이 후보가 된다.

지역 상태와 전역 상태의 차이는 단순히 "어디에 사느냐"가 아니다. **참조의 약속**이 다르다. 지역 상태는 **"이 컴포넌트 내부에서만 의미가 있다"** 는 약속을, 전역 상태는 **"앱 어디서든 이 이름으로 이 값을 참조할 수 있다"** 는 약속을 코드 전체에 발행한다. 그 약속이 비싸다는 것이 전역 상태의 본질이다.

전역 상태를 하나 만든다는 것은, 사실 **앱 전역에 걸친 암묵적 의존성**을 하나 추가하는 일이다.

---

## 서버 상태(Server State)

API로 받아온 데이터를 클라이언트 상태에 넣고, 직접 로딩과 에러를 boolean으로 관리하다가, **"왜 이렇게 매번 똑같은 보일러플레이트를 짜고 있지?"** 라는 의문에 도달한다.

Tanstack 메인 관리자인 [Tanner Linsley](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state)는 **"클라이언트 상태는 동기적이고 예측 가능하다. 서버 상태는 비동기적이고, 여러 컴포넌트에 걸쳐 공유되며, 캐싱·백그라운드 갱신·에러 상태를 신중히 다루어야 한다."** 라고 한다. 즉 서버 상태는 클라이언트 상태와 **본질적으로 다른 종(種)** 이다. 같은 도구로 다루면 안 된다.

서버 상태가 까다로운 것은 도구의 문제가 아니라 **데이터의 본질** 때문이다.

클라이언트가 보고 있는 데이터는 서버의 것이다. 클라이언트가 가진 데이터는 **어느 시점의 스냅샷** 일 뿐이다. 이 데이터는 시간이 지날수록 staleness가 발생한다. 또한 비동기적이고 실패할 수 있으며 pending, error, success 등의 상태를 가진다.

제일 중요한 본질은 **응답이 보낸 순서대로 돌아온다는 보장이 없다**는 점이다. 검색창에서 "react"를 빠르게 타이핑한다고 해보자. r → re → rea → reac → react 요청이 순서대로 나가지만, "react"의 응답이 먼저 도착하고 그 뒤에 "rea"의 응답이 도착하면, 화면에는 "rea"의 결과가 표시된다. 이런 문제를 막으려면 AbortController나 요청 ID 추적을 매번 손으로 짜야 하는 **동시성 위험 (race conditions)** 을 신경써야한다.

--- 

## 폼 상태(Form State)

폼은 묘한 상태이다. 사용자가 입력하는 동안에는 격렬하게 변하지만, 제출되고 나면 보통 사라진다. 다른 어디에도 공유되지 않고, 저장될 곳도 (대부분은) 없다.

문제는 이 "격렬한 변화"가 비싸다는 점이다. 모든 키 입력이 React의 리렌더링을 일으키면, 큰 폼에서는 입력 지연이 눈에 띌 정도가 된다. 그리고 폼은 단순히 "값을 들고 있는" 것이 아니다. **검증, dirty check, 제출 상태, 에러 메시지, 다단계 흐름**까지 한 폼 안에서 여러 종류의 상태가 동시에 살아 움직인다.

3단계 결제 플로우 같은 다단계 폼은 **"중간에 새로고침해도 진행 상태가 살아남기를 기대"** 받는다. 이때 폼 값을 useState로만 들고 있으면 새로고침에 모두 날아간다. **sessionStorage**(탭 단위 임시 보관)나 **URL**(공유 가능한 단계)에 보관하는 것이 자연스럽다. 즉 폼 상태는 라이프사이클 요구에 따라 **외부 상태**나 **URL 상태**와 결합한다.

---

## URL 상태(URL State)

여기서 잠깐, 우리가 React 컴포넌트나 스토어가 아닌 곳에 사는 상태에 대해 이야기해보자.

검색 페이지에서 카테고리·정렬·페이지 번호를 필터링하고 있다고 해보자. 이 상태들을 useState로 들고 있으면 세 가지 문제가 동시에 생긴다.

- 새로고침하면 모든 필터가 초기화된다
- URL을 친구에게 공유해도 친구는 필터가 적용되지 않은 페이지를 본다
- 뒤로 가기를 눌러도 이전 필터로 돌아가지 않는다

이런 상태는 사실 **URL에 사는 것이 자연스럽다.** URL은 그 자체로 새로고침·공유·히스토리에 대응되는 *공짜로 얻는 영구 저장소*이다.

```
/products?category=shoes&sort=price-desc&page=2
```

이 URL 한 줄에 *"신발 카테고리를 가격 내림차순으로 정렬한 2페이지"* 라는 완전한 상태가 들어 있다. useState로 따로 들고 있을 필요가 없다.

### URL 상태의 본질 — 공유 가능한 상태의 표준 형식

URL을 상태 저장소로 보면, 그 본질은 *"한 시점의 앱 상태를 텍스트로 직렬화한 결과"* 이다. 그래서 URL 상태는 다른 어떤 상태보다 강력한 속성을 갖는다.

- **공유 가능(shareable)** — 텍스트로 직렬화되어 있으니 그대로 전달 가능
- **북마크 가능(bookmarkable)** — 사용자가 임의의 상태를 저장할 수 있음
- **이력 가능(history-aware)** — 브라우저의 뒤로/앞으로 가기와 자동 통합
- **SSR 친화적** — 서버에서도 URL을 읽을 수 있으니 초기 렌더에 그대로 반영 가능

이게 다른 상태 저장소들에 없는 **URL만의 비대칭적 우월점**이다.

### URL 상태를 다루는 규칙들

**① 공유되어야 의미 있는 상태만 URL에 두라**

URL은 *공개 인터페이스*이다. 비밀번호, 인증 토큰, 사용자가 누군가에게 보여주기 싫을 일시 메모 같은 것은 URL에 들어가면 안 된다. 또한 *너무 자주 바뀌는 값*(예: 키 입력마다 갱신되는 검색어)을 그대로 URL에 박으면 히스토리 스택이 쓰레기로 가득 찬다. 이런 경우엔 debounce 후 반영하거나, `push` 대신 `replace`로 히스토리를 더럽히지 않게 해야 한다.

**② 직렬화와 인코딩을 의식하라**

URL의 값은 **항상 문자열**이다. 숫자, boolean, 배열, 객체는 직렬화·역직렬화 단계를 거쳐야 한다. 게다가 URL은 [퍼센트 인코딩(percent-encoding)](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) 규칙을 따라야 해서 `&`, `=`, 한글, 공백 등이 특수 처리된다. 이걸 매번 손으로 짜면 곧 버그의 온상이 된다.

```tsx
// 직접 만지는 방식 — 타입도 인코딩도 매번 신경 써야 한다
const params = new URLSearchParams(location.search);
const page = Number(params.get("page") ?? "1");
params.set("page", String(page + 1));
navigate(`?${params.toString()}`);

// nuqs — 파서가 타입과 인코딩을 책임진다
const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
```

[nuqs](https://nuqs.dev/) 같은 라이브러리는 *파서(parser)* 개념으로 이 두 가지를 해결한다. `parseAsInteger`, `parseAsBoolean`, `parseAsJson` 같은 파서가 직렬화·역직렬화·타입을 한 번에 책임진다. Next.js (App/Pages Router 모두), React Router v6/v7, TanStack Router, Remix 등 대부분의 환경을 지원한다.

**③ URL 길이 한계를 의식하라**

[RFC 7230](https://datatracker.ietf.org/doc/html/rfc7230)은 정확한 한계를 정하지 않지만 *서버가 최소 8,000 옥텟은 지원해야 한다*고 권장한다. 브라우저별로도 다르다 — 모던 브라우저는 대체로 8KB~수만 자까지 허용하지만, **검색엔진·소셜 미디어의 OG/공유 처리, 일부 게이트웨이는 2KB 근처에서 잘리기도** 한다. 그래서 URL에 무한정 박아 넣지는 말자. *공유 가능한 핵심 필터*만 두고, 나머지는 sessionStorage나 서버 측 저장에 맡기는 것이 안전하다.

**④ 히스토리 정책 — push vs replace**

URL을 갱신할 때마다 히스토리에 항목을 쌓을지(`push`) 현재 항목을 덮을지(`replace`) 결정해야 한다. *"뒤로 가기로 되돌아갈 가치가 있는 상태 변화"* 만 push이다. 그렇지 않은 빈번한 갱신(스크롤에 따른 페이지 번호 갱신, 필터 미세 조정 등)은 replace로 다루는 게 사용자 경험에 친절하다.

**⑤ URL 상태를 적극 활용하면 클라이언트 상태가 줄어든다**

필터, 정렬, 페이지네이션, 탭 선택, *공유 가능해야 하는 모달의 열림 여부* 까지 URL로 끌어올릴 수 있다. 그러면 전역 스토어·지역 상태에서 그만큼이 빠진다. **URL은 전역 상태의 강력한 대안**이라는 점을 기억하자.

---

## 6. 외부 상태(External State) — React 바깥의 세계

React는 자기 안의 상태만 안다. 그런데 우리 앱은 React 바깥의 세계와도 끊임없이 대화한다. 그 세계에 사는 상태들은 React의 생명주기와 무관하게 살아남고, 또 변한다.

| 저장소               | 수명                  | 용량       | 동기성   | 특징                                          |
| -------------------- | --------------------- | ---------- | -------- | --------------------------------------------- |
| **Cookie**           | 만료 시간까지         | ~4KB       | 동기     | 매 요청마다 서버로 자동 전송. HttpOnly 가능   |
| **localStorage**     | 명시적 삭제 전까지    | ~5–10MB    | 동기     | 문자열만 저장. JS에서 접근 가능 (XSS 노출)    |
| **sessionStorage**   | 탭 종료 시            | ~5–10MB    | 동기     | 탭별로 격리                                   |
| **IndexedDB**        | 명시적 삭제 전까지    | 수백 MB~   | 비동기   | 구조화된 데이터·파일/Blob 저장 가능           |

### 외부 상태를 다루는 규칙들

**① 저장소 선택은 *수명·용량·동기성·보안* 네 축으로**

각 저장소가 적합한 상태가 다르다. 한 축만 보고 결정하면 다른 축에서 사고가 난다.

- **인증 토큰**: [OWASP 권고](https://owasp.org/www-community/HttpOnly)는 분명하다. **HttpOnly + Secure 쿠키**가 1순위. localStorage는 JavaScript에서 접근 가능하므로 *XSS에 노출되는 순간 토큰이 그대로 털린다*. 일부 보안 가이드는 *액세스 토큰은 메모리에, 리프레시 토큰은 HttpOnly 쿠키에* 두는 하이브리드 패턴을 권장한다
- **사용자 설정 (테마, 언어)**: localStorage — 영속적이고 자주 안 바뀌고 민감하지 않다
- **다단계 폼의 임시 진행 상태**: sessionStorage — 탭 닫으면 사라지길 원할 것이다
- **오프라인 캐시·대용량 데이터·파일**: IndexedDB — 다른 저장소들의 용량과 타입 제약이 모두 풀린다

**② 직렬화 함정을 의식하라**

Cookie와 Web Storage(local/session)는 **문자열만 저장**한다. 그래서 객체를 넣으려면 `JSON.stringify`/`JSON.parse`를 거쳐야 한다. 그런데 JSON에는 한계가 있다.

```ts
JSON.stringify({ when: new Date() });
// → { "when": "2026-05-19T..." } — Date가 문자열로 박제됨

JSON.stringify({ map: new Map([["a", 1]]) });
// → { "map": {} } — Map은 통째로 사라짐

JSON.stringify({ value: undefined });
// → "{}" — undefined 필드는 생략됨
```

`Date`, `Map`, `Set`, `BigInt`, `undefined`는 모두 JSON으로 왕복할 때 형태가 변한다. 외부 저장소에 객체를 넣을 때는 *어떤 타입이 사라지거나 변할 수 있는지*를 항상 의식하고, 필요하면 직렬화 어댑터를 둬야 한다.

**③ 스키마 마이그레이션을 처음부터 설계하라**

외부 저장소에 저장된 데이터는 **앱 버전보다 오래 산다.** 사용자가 6개월 전에 저장한 설정이 새 코드에서 깨질 수 있다. 그래서 외부 저장소에 객체를 저장할 때는 **버전 필드를 함께 저장**하는 것이 안전하다.

```ts
localStorage.setItem("preferences", JSON.stringify({
  __version: 2,
  theme: "dark",
  // ...
}));
```

읽을 때 버전을 확인하고, 옛 버전이면 마이그레이션 함수를 거치게 한다. Zustand의 `persist` 미들웨어는 `version`과 `migrate` 옵션을 1급으로 제공하는데, 같은 발상이다.

**④ 다중 탭 동기화를 고려하라**

사용자가 두 개의 탭을 열어 두고 한쪽에서 로그아웃하면 다른 탭은 어떻게 될까? localStorage에는 다행히 [`storage` 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)가 있다. **다른 탭에서 같은 키를 갱신할 때 발화**되는 이벤트이다. 단 한 가지 함정 — *자기 자신이 갱신한 변화에는 발화되지 않는다*. 같은 탭 안에서 동기화하려면 setter에서 별도로 이벤트를 디스패치해야 한다.

```ts
const setItem = (key: string, value: string) => {
  localStorage.setItem(key, value);
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
};
```

**⑤ React와의 다리는 `useSyncExternalStore`로**

외부 상태의 진짜 어려움은 **React가 그 변화를 자동으로 감지하지 못한다**는 점이다. localStorage에 값을 써도 React 컴포넌트는 리렌더링되지 않는다. 이걸 해결하는 패턴은 보통 세 가지이다.

1. **커스텀 훅으로 한 겹 감싼다** — `useLocalStorage(key)` 같은 훅이 외부 상태를 React state로 동기화한다. 가볍지만 직접 짜면 다중 탭·SSR·tearing 같은 모서리들을 다 다뤄야 한다
2. **`useSyncExternalStore`를 쓴다** — React 18에서 도입된 훅으로, *"React 외부 상태와 동기화하기"* 가 명시적 목적이다. **동시성 렌더링에서 tearing이 일어나지 않도록 보장**한다. localStorage·브라우저 API·외부 스토어를 잇는 표준 도구이다
3. **이미 만들어진 라이브러리를 쓴다** — Zustand의 `persist` 미들웨어, Jotai의 `atomWithStorage`처럼 상태 라이브러리들이 외부 저장소 연동을 1급 기능으로 제공한다

여기서 한 가지 안목을 더하자. **외부 상태를 React로 가져오는 순간, 동기화의 책임은 우리에게 떨어진다.** 다른 탭에서 갱신되면? 서버에서 쿠키를 바꾸면? 사용자가 브라우저 개발자 도구로 localStorage를 직접 만지면? 이런 *경계 사건*들이 종종 가장 큰 버그의 온상이 된다.

---

## 7. 상태 가드(State Guard) — 상태가 흐름을 통제할 때

마지막 범주는 결이 조금 다르다. 상태 자체가 아니라, **상태의 조합으로 어떤 흐름을 막거나 허용하는 로직**이다.

가장 흔한 예가 **인증 가드(Auth Guard)** 이다.

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
```

`isAuthenticated`라는 상태가 라우팅 흐름을 통제한다. 이런 것이 바로 가드 로직이다.

가드의 종류는 다양하다.

- **인증 가드** — 로그인된 사용자만 접근 가능
- **권한 가드** — 특정 역할(role)이나 권한(permission)을 가진 사용자만
- **플로우 가드** — "결제 정보 입력"은 *장바구니에 상품이 있을 때*만 진입 가능
- **검증 가드** — "다음 단계로" 버튼은 *현재 단계의 필수 입력이 모두 채워졌을 때*만 활성

### 가드를 다루는 규칙들

**① 가드는 얇고, 명시적이고, 단일 책임이어야 한다**

가드 로직은 한 곳에 몰리기 쉽다. 한 컴포넌트에 *"로그인 안 했으면 로그인 페이지, 권한 없으면 403, 장바구니 비었으면 상품 페이지, 사용자 정지면 정지 안내"* 가 다 들어가는 일이 흔하다. 가드가 비대해질수록 *어떤 조건이 어디서 막혔는지*를 디버깅하기 어려워진다.

좋은 가드는 **한 가지만 검사한다.** 결합은 컴포지션으로 한다.

```tsx
<AuthGuard>
  <RoleGuard role="admin">
    <FlowGuard require={["cartHasItems"]}>
      <CheckoutPage />
    </FlowGuard>
  </RoleGuard>
</AuthGuard>
```

각 가드는 *한 가지 결정*만 내리고, 합성은 트리 구조가 책임진다. 새 가드를 추가할 때 기존 가드를 건드릴 필요가 없다.

**② 가드는 세 가지 레이어 어디에나 들어갈 수 있다 — 어디에 두느냐가 안목이다**

같은 가드라도 *어느 레이어에 둘 것인지*에 따라 의미가 다르다.

| 레이어 | 의미 | 어울리는 경우 |
|---|---|---|
| **라우터 레벨** | "이 경로 자체에 진입 불가" | 인증, 페이지 단위 권한 |
| **컴포넌트 레벨** | "들어왔지만 이 영역은 못 본다" | 페이지 안의 부분 권한 (관리자만 보이는 버튼 등) |
| **액션 레벨** | "버튼은 보이지만 누르면 막힌다" | mutation 직전의 최종 확인, 동시성 검증 |

세 레이어가 모두 필요한 경우도 흔하다. 관리자 페이지는 *라우터에서 막고*, 일반 사용자에게는 *컴포넌트 레벨에서 액션 버튼 자체를 안 보여주고*, 혹시 보이더라도 *액션 레벨에서 한 번 더 검증*. 깊이 있는 방어선이다.

**③ 가드 실패의 *폴백 경로*까지 함께 설계하라**

가드의 진짜 가치는 *막는 것*이 아니라 *어디로 보낼지를 결정하는 것*이다. 막기만 하고 폴백이 없는 가드는 흰 화면이나 무한 스피너로 끝난다.

- 인증 실패 → 로그인 페이지로 보내되, *원래 가려던 URL을 query로 들고 가서 로그인 후 복귀*
- 권한 실패 → 403 페이지 또는 안내 메시지. *권한 신청 동선*을 함께 제공할 수 있으면 더 좋다
- 플로우 실패 → 흐름의 직전 단계로 부드럽게 되돌리기

**④ 비동기 가드의 로딩 상태를 1급으로 다뤄라**

가장 흔한 버그가 *"가드의 비동기 검사가 끝나기 전에 보호된 콘텐츠가 잠깐 깜빡이는"* 것이다. 인증 토큰 검증, 권한 조회는 대부분 비동기이고, 그 사이 `isAuthenticated`가 `undefined`나 `false`로 잠시 잡혀 있는 시점이 있다. **로딩 상태를 명시적으로 다루지 않으면 그 틈에 보호된 화면이 노출되거나, 로그인 페이지로 잘못 리다이렉트되거나 한다.**

```tsx
// 안티패턴 — 로딩 상태를 무시
if (!user) return <Navigate to="/login" />;

// 옳은 방향 — 로딩을 1급으로
if (isLoading) return <Spinner />;
if (!user) return <Navigate to="/login" replace />;
return children;
```

3절에서 짚은 *"로딩과 에러는 1급 시민"* 이 그대로 가드에도 적용된다.

**⑤ 권한 모델은 데이터로 표현 가능해야 한다 — RBAC vs ABAC**

권한 가드를 짤 때 두 가지 모델이 흔히 쓰인다.

- **RBAC(Role-Based Access Control)** — *역할 단위*로 권한을 부여한다. *"admin은 모든 사용자 정보를 볼 수 있다"* 처럼. 단순하고 빠르지만, *역할이 세분화될수록* 역할의 수가 폭발한다
- **ABAC(Attribute-Based Access Control)** — *속성 조합*으로 권한을 결정한다. *"사용자가 그 게시글의 작성자이거나, 같은 팀이거나, admin인 경우"* 처럼. 표현력이 크지만 구현·디버깅이 어렵다

[TanStack Router의 RBAC 가이드](https://tanstack.com/router/v1/docs/framework/react/how-to/setup-rbac)처럼 라우터 레벨에서 `beforeLoad`에 가드를 박는 패턴이 권장된다. 핵심은 **권한 검사를 코드에 흩뿌리지 않고 데이터(역할/권한 목록)로 표현 가능해야** 한다는 것이다. 그래야 권한 정책 변경이 *데이터 변경*으로 끝난다.

**⑥ 클라이언트 가드는 UX, 서버 가드는 보안**

마지막으로 한 가지 중요한 사실. [Robin Wieruch의 React Router Private Routes 가이드](https://www.robinwieruch.de/react-router-private-routes/)에서도 강조하듯, **클라이언트 사이드 가드는 UX를 위한 것이지 보안 장치가 아니다.** 진짜 권한 검사는 반드시 서버에서 해야 한다. 클라이언트는 *깨진 화면을 보지 않도록 막아주는 친절함*의 영역이고, 보안의 마지막 방어선은 항상 서버이다. 클라이언트만 믿는 가드는 *DevTools 한 번이면 우회*된다.

---

## 그래서, 상태 관리를 잘하기 위한 안목이란

여기까지 일곱 가지 범주를 살펴봤다. 그런데 범주를 안다고 해서 상태 관리를 잘하는 것은 아니다. 진짜 안목은 그 위에서 작동한다. 필자가 실무에서 늘 의식하려고 노력하는 네 가지 원칙을 정리해본다.

### 안목 ① 단일 진실 공급원(Single Source of Truth)

[React 공식 문서](https://react.dev/learn/choosing-the-state-structure)는 이렇게 단언한다.

> 변화하는 데이터에 대해서는 단 하나의 "진실의 출처(source of truth)"가 있어야 한다.

같은 데이터를 두 곳에 들고 있는 순간, 그 둘을 동기화하는 코드가 필요해지고, 그 동기화는 반드시 어딘가에서 어긋난다. 사용자 정보를 Redux에도 넣고 Context에도 넣고 useState에도 들고 있으면, 그 셋이 일치한다는 보장은 시간이 지날수록 깨진다.

특히 **서버에서 받아온 데이터를 클라이언트 상태로 복사해 두는 것**이 위험하다. 서버가 갱신되어도 그 복사본은 그대로다. TanStack Query를 쓰면 이 문제가 자연스럽게 해결된다. 서버 데이터는 캐시 한 곳에 있고, 모든 컴포넌트는 같은 캐시를 본다.

### 안목 ② 파생 상태는 상태가 아니다

가장 흔한 안티패턴 중 하나이다.

```tsx
// 안티패턴
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [fullName, setFullName] = useState(""); // ← 이건 상태가 아니다
```

`fullName`은 `firstName`과 `lastName`으로부터 **계산할 수 있는 값**이다. 이걸 별도의 상태로 들고 있으면 `firstName`을 갱신할 때 `fullName`도 따로 갱신해주어야 하고, 어딘가에서 한 번이라도 그걸 잊으면 화면이 어긋난다.

[React 공식 블로그의 "You Probably Don't Need Derived State"](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)는 이 문제를 정면으로 다룬다. 결론은 단순하다.

```tsx
// 그냥 계산해서 쓰면 된다
const fullName = `${firstName} ${lastName}`;
```

비싼 계산이라면 `useMemo`로 감싸면 된다. 어쨌든 **상태로 저장하지 않는 것이 첫 번째 선택지**이다.

### 안목 ③ 불가능한 상태를 표현 불가능하게 만들기

이건 함수형 프로그래밍 진영에서 자주 인용되는 격언이다. **"Make impossible states impossible."**

흔한 예이다.

```tsx
// 불가능한 상태가 표현 가능한 코드
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState(null);
```

이 세 boolean의 조합은 `2 × 2 × 2 = 8`가지인데, 실제로 의미 있는 조합은 4개뿐이다. "로딩 중이면서 에러"라는 상태도, "에러인데 데이터가 있는" 상태도 의미가 없다. 그런데 코드 상으로는 표현 가능하니 언젠가 그 상태로 빠지는 버그가 생긴다.

[React 공식 문서](https://react.dev/learn/choosing-the-state-structure)의 권장은 명확하다. **하나의 status 변수로 합쳐라.**

```tsx
type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; data: Data }
  | { type: "error"; error: Error };

const [status, setStatus] = useState<Status>({ type: "idle" });
```

이게 바로 작은 상태 머신이다. 더 복잡한 흐름이 되면 [XState](https://xstate.js.org/) 같은 본격적인 상태 머신 라이브러리를 꺼낼 수 있다. XState는 "각 상태에서 일어날 수 있는 전이"를 명시적으로 선언하기 때문에, **불가능한 전이를 컴파일 타임에 막아준다.**

상태 머신을 도입할지 말지의 안목은 이렇다. 흐름이 정형화되어 있고(체크아웃, 결제, 인증 같은 것), 잘못된 전이가 비싼 비용을 만드는 영역이라면 XState가 유효한 투자이다. 단순한 토글이나 모달에는 과하다.

### 안목 ④ 가장 가까이, 가장 좁게

다시 [Kent C. Dodds의 State Colocation 글](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)로 돌아오자.

> 상태를 그것을 쓰는 코드에 최대한 가까이 둬라.

상태는 자라기 마련이다. 어제 한 컴포넌트에서만 쓰던 상태가 오늘은 형제도 봐야 하고, 내일은 페이지 전체가 봐야 한다. 우리는 그때마다 자연스럽게 상태를 **위로 끌어올린다**.

문제는 그 반대의 흐름이 자연스럽지 않다는 점이다. 어제는 페이지 전체가 보던 상태가 오늘은 한 컴포넌트만 쓰게 되었다고 해서, 그 상태를 다시 아래로 내리는 일은 거의 일어나지 않는다.

그래서 상태는 시간이 지나면 자연스럽게 위로 모이고, 전역화되고, 모든 컴포넌트의 의존성이 한 곳에 쏠리게 된다. 이걸 의식적으로 거꾸로 되돌리는 작업이 필요하다.

> **이 상태가 정말로 이 위치에 있어야 하는가?**

이 질문을 정기적으로 던지는 것이 안목이다.

---

## 도구 선택의 의사결정 흐름

지금까지의 이야기를 한 장의 결정 트리로 정리해보자. 정답은 아니다. 필자가 새 화면을 설계할 때 머릿속에서 굴리는 질문의 순서이다.

```
┌─ 이 데이터는 서버에서 오는가?
│   └─ Yes → TanStack Query / SWR / RTK Query
│            (캐시, 무효화, 백그라운드 갱신은 라이브러리에 맡긴다)
│
├─ 새로고침/공유 시에도 살아남아야 하는가?
│   └─ Yes → URL 상태 (nuqs 혹은 라우터 API)
│
├─ 탭/세션을 넘어 살아남아야 하는가?
│   └─ Yes → Cookie / localStorage / IndexedDB
│            (인증=쿠키, 사용자 설정=localStorage, 대용량/오프라인=IndexedDB)
│
├─ 사용자가 입력 중인 일시 데이터인가?
│   └─ Yes → React Hook Form
│            (큰 폼이라면 비제어 방식의 리렌더링 절감이 결정적)
│
├─ 한 컴포넌트, 또는 좁은 트리 안에서만 쓰이는가?
│   └─ Yes → useState / useReducer
│
├─ 한 페이지·기능 안에서만 공유되는가?
│   └─ Yes → Context (자주 안 바뀌는 값) 또는 그 페이지 한정 Jotai/Zustand
│
└─ 앱 전체에서 공유되는가?
    └─ Yes → Zustand (단일 스토어가 자연스럽다면)
             Jotai (atom 단위로 잘게 쪼개야 한다면)

그리고 모든 단계의 결과 위에:
  → 상태 가드는 라우터/컴포넌트/액션 레이어로 얇게 나누어 배치
  → 흐름이 복잡하면 상태 머신(XState)으로 명시화
```

[2026년의 React 생태계 분석들](https://www.syncfusion.com/blogs/post/react-state-management-libraries)이 공통적으로 가리키는 풍경도 이와 비슷하다.

> 대부분의 React 앱은 TanStack Query + Zustand + React Hook Form 조합이면 충분하다. 그 이상은 거의 필요하지 않다.

이 조합이 다루는 것은 결국 **서버 상태, 클라이언트 상태, 폼 상태**의 세 축이다. 나머지는 React 기본 훅과 URL, 외부 저장소로 흡수된다.

---

## 폴더 구조에 안목을 새기기

상태의 종류를 의식한다는 것은 자연스럽게 폴더 구조에도 드러난다. 정답은 없지만, 필자가 자주 쓰는 구조 하나를 예시로 적어둔다.

```
src/
├── domains/
│   └── checkout/
│       ├── checkout.ts              # 도메인 모델·로직 (순수 함수)
│       ├── checkout.machine.ts      # XState 머신 (복잡한 흐름이라면)
│       └── checkout.viewModel.ts    # 표현 변환
├── stores/
│   ├── authStore.ts                 # 전역 클라이언트 상태 (Zustand)
│   └── toastStore.ts
├── queries/
│   ├── userQueries.ts               # TanStack Query 키와 fetcher
│   └── postQueries.ts
├── hooks/
│   ├── useLocalStorageState.ts      # 외부 상태 동기화
│   └── useAuthGuard.ts              # 가드 훅
├── guards/
│   ├── AuthGuard.tsx                # 라우터/컴포넌트 레벨 가드
│   └── RoleGuard.tsx
└── components/
    └── forms/
        └── CheckoutForm.tsx          # React Hook Form 기반
```

핵심은 **상태의 종류와 책임이 디렉토리 이름에 드러난다**는 점이다. `stores/`에 들어 있는 건 클라이언트 전역 상태, `queries/`에 들어 있는 건 서버 상태, `guards/`에 들어 있는 건 가드 로직. 새로운 동료가 들어와서 "결제 흐름의 권한 검사가 어디 있어요?"라고 물으면, 우리는 `guards/`를 가리킬 수 있다.

폴더 구조는 그 자체가 약한 문서이다. 그리고 좋은 약한 문서는 **상태에 대한 우리 팀의 안목을 코드로 박제하는 일**이다.

---

## 마무리

정리해보자. 상태 관리가 어려운 이유는 라이브러리가 어려워서가 아니다. **상태에 종류가 있다는 사실을 자주 잊기 때문**이고, 종류마다 다른 도구와 다른 사고방식이 필요하다는 점을 놓치기 쉽기 때문이다.

지역 상태는 가장 가까이, 전역 상태는 정말 전역인지 한 번 더 의심하고, 서버 상태는 캐시로 다루고, 폼은 도메인과 분리하고, URL은 더 적극적으로 활용하고, 외부 저장소는 책임을 의식하고, 가드는 얇게 나누어 합성하는 것. 이것이 일곱 가지 범주를 다루는 기본기이다.

그리고 그 위에서 작동하는 안목은 결국 네 가지 질문으로 압축된다.

- 이 데이터의 진실의 출처는 어디인가?
- 이건 계산할 수 있는 값인가, 정말로 저장해야 하는 값인가?
- 이 상태의 조합 중 불가능한 조합이 있는가?
- 이 상태는 정말로 이 위치에 있어야 하는가?

이 질문들을 새 화면을 짤 때마다, PR을 리뷰할 때마다, AI가 만들어준 코드를 받아볼 때마다 한 번씩 던지는 것. 그것이 안목과 느낌을 키우는 가장 확실한 길이라고 필자는 믿는다.

서두에서 말했듯, AI는 우리 옆에 오랫동안 머무를 것이다. 우리가 한 줄 한 줄 들여다보는 시간은 점점 줄어들 것이다. 그러나 그럴수록 **"이 상태는 어디에 있어야 할까?"** 같은 작은 질문에 답할 수 있는 감각은 더 비싸진다. AI에게 "여기에 useState 하나 더 만들어줘"라고 시키는 것은 쉽다. 그런데 그 한 줄이 우리 앱의 거미줄에 어떤 가닥을 더하는지를 아는 것은, 오직 그 코드를 읽는 사람의 안목에 달려 있다.

정답은 없다. 하지만 적어도 **"상태가 뭔지 모르고 상태를 만드는 것"** 과 **"상태의 종류와 위치를 의식하면서 만드는 것"** 사이에는 명백한 차이가 있다. 이 글을 읽는 독자 분들도 다음에 `useState`를 한 줄 적기 전에 한 번쯤 멈추고, "이건 어느 범주의 상태일까?"라고 물어봐 주시기를 바란다.

---

### 참고 자료

- [React 공식 문서 — Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React 공식 블로그 — You Probably Don't Need Derived State (2018)](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)
- [React v19 Release Notes](https://react.dev/blog/2024/12/05/react-19) — `useTransition`, `useOptimistic`, `useActionState`
- Kent C. Dodds — [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react), [State Colocation will make your React app faster](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
- TanStack Query — [Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state)
- [Jotai vs Zustand 비교 문서](https://jotai.org/docs/basics/comparison)
- [Recoil Archive 공지 (2025)](https://github.com/facebookexperimental/Recoil/discussions/2171)
- [nuqs — Type-safe search params state manager for React](https://nuqs.dev/)
- [XState — JavaScript State Machines and Statecharts](https://xstate.js.org/)
- Robin Wieruch — [React Router Private Routes (Protected Routes)](https://www.robinwieruch.de/react-router-private-routes/)
- hoseung.me — [프론트엔드 상태 관리에 대한 생각](https://blog.hoseung.me/2021-12-05-state-management)
- Syncfusion — [Top 5 React State Management Tools Developers Actually Use in 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
