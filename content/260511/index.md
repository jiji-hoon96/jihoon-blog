---
emoji: 🪝
title: 'Custom Hook'
date: '2026-05-11'
categories: React 프론트엔드 설계 hooks
---

이번 포스팅에서는 React 커스텀 훅(Custom Hook)을 **언제 만들어야 하고, 어떻게 분리해야 하는가**에 대한 이야기를 해보려고 한다.

필자는 프론트엔드 개발을 하면서 커스텀 훅을 수도 없이 만들어왔다. `useAuth`, `useForm`, `useModal`, `useIntersectionObserver`... 이름만 봐도 낯익은 훅들이 프로젝트마다 쌓여간다. 그런데 이 훅들을 만들 때마다 반복되는 고민이 있다. "이 로직을 진짜 훅으로 분리해야 하나?", "이 훅이 너무 비대해진 건 아닌가?", "어디까지가 하나의 훅이 책임져야 하는 범위인가?"

처음에는 "반복되는 코드가 있으면 훅으로 빼면 되지"라고 단순하게 생각했다. 하지만 그렇게 만든 훅이 시간이 지나면서 온갖 로직을 품은 거대한 괴물이 되어가는 경험을 몇 번 하고 나니, 커스텀 훅을 만드는 것 자체보다 **언제, 어떤 기준으로 분리하는가**가 훨씬 중요하다는 것을 깨달았다. 

이 글에서는 커스텀 훅의 본질부터 시작해서, 분리의 판단 기준, 안티패턴, 그리고 폼 핸들링과 멀티스텝 페이지라는 실전 예시까지 다루며 필자가 고민해온 내용들을 정리해보려 한다.

---

## 커스텀 훅의 등장

커스텀 훅이 어떤 문제를 해결하기 위해 탄생했는지를 먼저 짚고 넘어가려 한다. 해결하려는 문제를 이해해야 올바르게 사용할 수 있기 때문이다.

React 팀의 Dan Abramov는 2018년 [Making Sense of React Hooks](https://medium.com/@dan_abramov/making-sense-of-react-hooks-fdbde8803889)라는 글에서 클래스 컴포넌트 시대의 세 가지 근본적인 문제를 제시했다.

1. **거대한 컴포넌트(Huge components)** : 상태 관련 로직이 `componentDidMount`, `componentDidUpdate`, `componentWillUnmount` 같은 생명주기 메서드에 흩어져 있어, 하나의 관심사를 이해하려면 여러 메서드를 오가며 읽어야 했다. 코드가 "언제 실행되느냐"를 기준으로 분리되어 있었지, "무엇을 하느냐"를 기준으로 분리되어 있지 않았던 것이다.
2. **중복된 로직(Duplicated logic)** : 서로 다른 컴포넌트에서 동일한 상태 로직이 필요한 경우, 이를 재사용할 마땅한 방법이 없었다. `componentDidMount`에서 이벤트 리스너를 등록하고 `componentWillUnmount`에서 해제하는 패턴이 여러 컴포넌트에 복사-붙여넣기 되는 상황이 반복되었다.
3. **복잡한 패턴(Complex patterns)** : 로직 재사용을 위해 HOC(Higher-Order Component)나 Render Props 패턴을 사용했지만, 이는 컴포넌트 트리에 불필요한 중첩(nesting)인 Wrapper hell을 만들어 냈다.

Hooks는 **"React의 철학(명시적 데이터 흐름과 합성)을 컴포넌트 사이를 넘어 컴포넌트 내부에까지 확장"** 함으로써, 앞서 살펴본 세 가지 문제를 한 번에 풀어냈다. 그리고 이 합성(composition)을 실제로 가능하게 하는 핵심 도구가 바로 커스텀 훅이다.

여기서 꼭 짚고 넘어갈 것이 하나 있다. **커스텀 훅은 상태 있는 로직을 공유하는 것이지, 상태 자체를 공유하는 것이 아니다.**

이것은 매우 중요한 구분이다. `useOnlineStatus`라는 훅을 `StatusBar` 컴포넌트와 `SaveButton` 컴포넌트에서 각각 호출하면, 두 컴포넌트는 **동일한 로직**을 공유하지만 **각자 독립적인 상태**를 갖는다. 마치 같은 레시피로 두 개의 케이크를 각각 굽는 것과 비슷하다. 레시피(로직)는 같지만, 케이크(상태)는 별개인 것이다.

그렇다면 이런 커스텀 훅을 **언제** 만들어야 할까? 무작정 로직을 분리하는 것이 항상 좋은 것일까?

---

## 훅의 분리 시점

커스텀 훅을 만들지 말지 결정하는 것은 생각보다 미묘한 판단이다.

React 공식 문서는 이에 대해 흥미로운 기준 하나를 제시한다. **훅에 명확한 이름을 지을 수 있는지**가 분리할 준비가 되었는지를 가늠하는 리트머스 시험지라는 것이다. 이름이 떠오르지 않는다는 것은 아직 그 로직이 하나의 관심사로 응집되지 않았다는 신호이기 때문이다. 필자는 이 원칙을 포함하여, 실무에서 체득한 판단 기준을 네 가지로 정리해보았다.

### 분리해야 하는 순간

**1. 동일한 로직이 2개 이상의 컴포넌트에서 반복될 때**

가장 전통적이고 직관적인 기준이다. `useState`와 `useEffect`의 동일한 조합이 여러 컴포넌트에 복사되어 있다면, 그것은 커스텀 훅으로 추출할 신호이다. React 공식 문서의 `useOnlineStatus` 예시가 바로 이 경우에 해당한다.

```tsx
function StatusBar() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <h1>{isOnline ? '온라인' : '오프라인'}</h1>;
}
```

추출은 두 단계로 진행된다. 먼저 반복되는 상태 로직을 `useOnlineStatus`라는 이름의 훅으로 옮긴다.

```tsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

그러면 컴포넌트에서는 구현 세부사항이 사라지고, **"온라인 상태를 사용한다"** 라는 의도만 남는다.

```tsx
function StatusBar() {
  const isOnline = useOnlineStatus();
  return <h1>{isOnline ? '온라인' : '오프라인'}</h1>;
}
```

**2. 컴포넌트의 의도를 읽기 어려울 정도로 구현 세부사항이 많을 때**

반복이 아니더라도, 하나의 컴포넌트 안에 구현 세부사항이 너무 많아 컴포넌트의 "무엇을 하는가"가 보이지 않는 경우가 있다. React 공식 문서의 표현을 빌리면, 커스텀 훅을 통해 **"외부 시스템이나 브라우저 API를 다루는 복잡한 세부사항을 숨기고, 컴포넌트 코드가 구현이 아닌 의도를 표현"** 하게 할 수 있다.

```tsx
function ChatRoom({ roomId, serverUrl }) {
  useEffect(() => {
    const connection = createConnection({ serverUrl, roomId });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, serverUrl]);

  useEffect(() => {
    post('/analytics/event', { eventName: 'visit_chat', roomId });
  }, [roomId]);

  return <div>...</div>;
}

function ChatRoom({ roomId, serverUrl }) {
  useChatConnection({ roomId, serverUrl });
  useVisitLog('visit_chat', { roomId });
  return <div>...</div>;
}
```

위 코드를 보면 `ChatRoom` 컴포넌트 내부의 난잡한 구현 세부사항이 컴포넌트의 가독성을 떨어뜨린다. 그래서 연결과 방문 로그 기록이라는 두 가지 책임을 각각 `useChatConnection`과 `useVisitLog`라는 커스텀 훅으로 분리하여 의도를 드러낼 수 있다.

**3. Effect를 작성할 때**

Effect는 본질적으로 "React 바깥의 외부 시스템과 동기화"하는 코드이다. 브라우저 API, 네트워크 요청, 서드파티 라이브러리 연동 등이 여기에 해당한다. 이런 코드는 대체로 구현 세부사항이 복잡하기 때문에, 커스텀 훅으로 감싸면 컴포넌트가 한결 읽기 좋아진다. 또한 React 공식 문서는 **"이상적으로는 Effect를 직접 작성하는 일이 드물어야 한다"** 고까지 이야기한다.

**4. 독립적인 테스트가 필요할 때**

Kent C. Dodds는 [How to Test Custom React Hooks](https://kentcdodds.com/blog/how-to-test-custom-react-hooks)에서 훅의 테스트 전략을 세 가지로 분류한다. 컴포넌트를 통한 통합 테스트, 미니 테스트 컴포넌트를 만드는 방식, 그리고 `renderHook`을 활용한 직접 테스트이다. 핵심은 **복잡한 로직일수록 독립적인 테스트가 필요하고, 독립적인 테스트가 필요한 로직은 훅으로 분리하면 테스트하기 좋다**는 것이다. 훅으로 분리하면 로직을 UI와 무관하게 검증할 수 있기 때문이다.

---

### 분리하지 말아야 하는 순간

분리의 기준만큼이나 **분리하지 않아야 하는 기준**도 중요하다. 

React 공식문서에서는 약간의 중복도 허용한다고 한다. 그럼 어떤 상황일 때 분리를 미뤄야할지 알아보자.

- 하나의 컴포넌트에서만 사용되거나, 코드가 몇줄 안될때 분리를 하게되면 오히려 코드를 읽는 사람에게 혼란을 줄 수 있다. 

- **로직이 아직 빠르게 변하는 탐색 단계**인 경우에 **"Avoid Hasty Abstractions(성급한 추상화를 피하라)"** 라고 표현한다. 패턴을 한 번 보고 바로 훅으로 추출하지 말고, 2-3번 반복을 확인한 후에 실제 공유되는 관심사가 무엇인지 이해한 다음 추상화하라는 것이다. 너무 이른 추상화는 잘못된 경계를 만들 위험이 있다.
- 분리한 훅에 명확한 이름을 지을 수 없는 경우에 `useStuff`나 `useMisc` 같은 이름이 떠오른다면, 분리를 서두르기보다 그 로직이 어떤 관심사를 다루는지 더 관찰하며 이름이 자연스럽게 떠오를 만큼 정보를 모으는 것이 먼저이다.

그렇다면 여기까지 읽으면 자연스럽게 떠오르는 질문이 있다. "훅으로 분리하지 않는다면, 일반 함수로 빼면 되는 것 아닌가?" 맞다. 그런데 이 둘의 경계가 생각보다 모호한 경우가 많다.

---

## 커스텀 훅인가, 일반 함수인가

커스텀 훅과 일반 유틸리티 함수의 경계는 명확한 규칙이 있다. **React의 Hook(useState, useEffect 등)을 내부에서 호출하는가**가 유일한 기준이다.

이 기준은 직관적으로는 "상태나 생명주기를 다루는가"와 다르게 들릴 수 있다. 그러나 실무에서는 두 기준이 거의 같은 함수들을 가리킨다. 상태를 가지려면 `useState`를, 생명주기에 반응하려면 `useEffect`를, Context를 읽으려면 `useContext`를 호출해야 하기 때문이다. 즉 **상태나 생명주기를 다루려는 순간 자연스럽게 Hook을 호출하게 되고, 그 결과로 그 함수는 커스텀 훅이 된다.** React의 규칙은 "Hook 호출 여부"로 엄격하게 정의되어 있지만, 그 규칙이 가리키는 실제 영역은 우리가 직관적으로 떠올리는 "상태와 생명주기를 다루는 로직"과 거의 정확히 일치한다.

`use` 접두사가 붙은 함수는 React의 Hook 규칙(Rules of Hooks)을 따라야 한다. 조건문 안에서 호출할 수 없고, 반복문 안에서도 호출할 수 없다. 반면 일반 함수는 어디서든 자유롭게 호출할 수 있다.

```tsx
function TodoList({ items, shouldSort }) {
  let displayedItems = items;
  if (shouldSort) {
    displayedItems = getSorted(items); // 일반 함수는 조건부 호출 가능
  }
  // ...
}
```

만약 `getSorted`가 `useSorted`라는 이름이었다면, 이 조건부 호출은 Hook 규칙 위반이 된다. React의 린터가 경고를 띄울 것이고, 실제로 예측 불가능한 버그의 원인이 될 수 있다.

정리하면 이렇다. **데이터를 변환하거나 포맷팅하는 순수한 연산**은 일반 함수로, **React의 상태나 생명주기와 연결된 로직**은 커스텀 훅으로 만들면 된다. 전화번호 포맷팅은 `formatPhoneNumber`이고, API 호출 후 상태를 관리하는 것은 `useFetch`인 것이다.

그런데 커스텀 훅으로 분리하는 것까지는 좋은데, 하나의 훅에 너무 많은 것을 넣으면 어떻게 될까?

---

## God Hook 안티패턴

소프트웨어 설계에서 "God Object"라는 안티패턴이 있다. 하나의 객체가 너무 많은 것을 알고, 너무 많은 일을 하는 것을 말한다. 커스텀 훅에도 동일한 안티패턴이 존재한다. 동일한 느낌으로 이를 **"God Hook"** 이라고 부르려 한다.

이 안티패턴을 피하기 위한 원칙은 의외로 단순하다. **하나의 훅은 하나의 관심사만 캡슐화해야 한다.** 객체지향 설계에서 익숙한 SRP(Single Responsibility Principle, 단일 책임 원칙)를 훅에 그대로 적용한 것이다. 관심사가 하나로 좁혀져 있을 때 훅은 비로소 자신의 이름값을 한다. 반대로 책임이 둘 이상으로 늘어나는 순간, 훅은 컴포넌트의 부담을 덜어주는 도구가 아니라 또 하나의 복잡도가 되어버린다.

말로만 들으면 추상적이니, God Hook이 실제로 어떻게 생기는지 코드로 살펴보자.

```tsx
function useProductPage(productId: string) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct(productId).then(data => {
      setProduct(data);
      setLoading(false);
    });
  }, [productId]);

  const [cartItems, setCartItems] = useState([]);
  const addToCart = (item) => setCartItems(prev => [...prev, item]);

  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);

  useEffect(() => {
    fetchReviews(productId, reviewPage).then(setReviews);
  }, [productId, reviewPage]);

  useEffect(() => {
    trackRecentlyViewed(productId);
  }, [productId]);

  return { product, loading, cartItems, addToCart, reviews, reviewPage, setReviewPage };
}
```

이 훅은 상품 페칭, 장바구니, 리뷰, 최근 본 상품 추적이라는 **네 가지 관심사**를 하나에 담고 있다. 처음에는 "이 페이지의 로직을 한곳에 모으자"라는 합리적인 의도에서 시작했을 것이다. 하지만 시간이 지나면서 문제가 드러난다.

- **테스트가 어렵다.** 장바구니 로직만 테스트하고 싶어도 상품 페칭과 리뷰 로직까지 함께 셋업해야 한다.
- **재사용이 불가능하다.** 다른 페이지에서 장바구니 로직만 필요해도, 상품 페칭까지 딸려온다.
- **변경의 영향 범위가 넓다.** 리뷰 페이지네이션을 수정했는데 장바구니 쪽에서 예상치 못한 리렌더링이 발생할 수 있다.

해결 방법은 관심사별로 훅을 분리하고, 필요한 곳에서 조합하는 것이다.

```tsx
function useProduct(productId: string) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct(productId).then(data => {
      setProduct(data);
      setLoading(false);
    });
  }, [productId]);

  return { product, loading };
}

function useCart() {
  const [cartItems, setCartItems] = useState([]);
  const addToCart = (item) => setCartItems(prev => [...prev, item]);

  return { cartItems, addToCart };
}

function useReviews(productId: string) {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchReviews(productId, page).then(setReviews);
  }, [productId, page]);

  return { reviews, page, setPage };
}

function useRecentlyViewed(productId: string) {
  useEffect(() => {
    trackRecentlyViewed(productId);
  }, [productId]);
}

function ProductPage({ productId }) {
  const { product, loading } = useProduct(productId);
  const { cartItems, addToCart } = useCart();
  const { reviews, page, setPage } = useReviews(productId);
  useRecentlyViewed(productId);
  // ...
}
```

여기서 한 걸음 더 나아가 생각해볼 수 있다. useProduct와 useReviews가 "서버 데이터 페칭"이라는 관심사로 분리되어 있기 때문에, 나중에 내부 구현을 `TanStack-Query`나 `SWR` 같은 데이터 페칭 라이브러리로 컴포넌트 변경 없이 교체할 수 있다. 캐싱, 자동 재요청, 백그라운드 갱신, 낙관적 업데이트 같은 복잡한 메커니즘은 라이브러리에 맡기더라도 ProductPage의 코드는 한 줄도 바뀌지 않는다. 이것이 잘 분리된 커스텀 훅이 만들어내는 추상화 경계(abstraction boundary) 의 실용적인 가치이다.

분리 후의 컴포넌트를 보면, 이 페이지가 어떤 기능들로 구성되어 있는지가 한눈에 보인다. 각 훅은 독립적으로 테스트할 수 있고, 다른 페이지에서도 재사용할 수 있다.

다만 여기서 주의할 점이 있다. **분리의 기준은 "코드 줄 수"가 아니라 "관심사"** 라는 것이다. 하나의 관심사 안에서 코드가 많더라도, 그것은 하나의 훅에 있어야 할 수 있다. 이 미묘한 판단이 어떻게 작동하는지, 실전 예시를 통해 살펴보자.

그런데 그 전에, 훅을 분리하기 **이전에** 점검해야 할 것이 하나 있다.

---

## 훅으로 감싸기 전에 점검할 것 (여기서부터)

God Hook을 분리하든, 새로운 커스텀 훅을 만들든, 그 이전에 확인해야 하는 것이 있다. **내부의 Effect가 올바르게 작성되어 있는가**이다. 잘못된 Effect를 훅으로 감싸면 문제가 해결되는 것이 아니라, 문제가 추상화 뒤에 숨을 뿐이다.

React 공식 문서가 명시적으로 경고하는 대표적인 패턴이 **Effect 체인(Effect chains)** 이다.

```tsx
// 🔴 Effect 체인: Effect가 상태를 변경하고, 그 상태가 다른 Effect를 트리거
useEffect(() => { setA(computeA()); }, [dep1]);
useEffect(() => { setB(computeB(a)); }, [a]);
useEffect(() => { setC(computeC(b)); }, [b]);
```

이 패턴은 상태 변경이 연쇄적으로 리렌더링을 유발하여 성능 문제를 일으킨다. 이런 경우 하나의 이벤트 핸들러에서 모든 계산을 처리하거나, `useMemo`로 파생 상태를 계산하는 것이 올바른 접근이다.

또 하나 흔히 놓치는 것이 데이터 페칭에서의 **경쟁 상태(Race Condition)** 이다.

```tsx
// 🔴 경쟁 상태: url이 빠르게 바뀌면 이전 요청의 응답이 나중에 도착할 수 있다
function useData(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(url).then(r => r.json()).then(setData);
  }, [url]);
  return data;
}

// ✅ cleanup으로 경쟁 상태 방지
function useData(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let ignore = false;
    fetch(url).then(r => r.json()).then(json => {
      if (!ignore) setData(json);
    });
    return () => { ignore = true; };
  }, [url]);
  return data;
}
```

`url`이 빠르게 바뀌면, 이전 요청의 응답이 나중에 도착하여 **오래된 데이터가 최신 데이터를 덮어쓰는** 상황이 벌어진다. cleanup 함수에서 `ignore` 플래그를 설정하면 이 문제를 방지할 수 있다. 이런 세부사항이야말로 커스텀 훅 안에 올바르게 캡슐화되어야 하는 것이다. 한 번 제대로 만들어두면 사용하는 쪽에서는 경쟁 상태를 신경 쓸 필요가 없어지기 때문이다.

이제 관심사를 기준으로 훅을 분리하는 것이 실전에서 어떻게 작동하는지 살펴보자.

---

## 실전 예시: 폼 핸들링

폼(Form)은 프론트엔드에서 가장 빈번하게 커스텀 훅의 필요성이 대두되는 영역이다. 입력 상태 관리, 유효성 검증, 에러 표시, 제출 처리가 하나의 폼 안에 얽혀 있기 때문이다.

먼저 커스텀 훅 없이 회원가입 폼을 작성하면 어떻게 되는지 보자.

```tsx
function SignupForm() {
  const [values, setValues] = useState({ email: '', password: '', name: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (fieldValues) => {
    const newErrors = {};
    if (!fieldValues.email) newErrors.email = '이메일을 입력해주세요';
    else if (!/\S+@\S+\.\S+/.test(fieldValues.email)) newErrors.email = '유효한 이메일이 아닙니다';
    if (!fieldValues.password) newErrors.password = '비밀번호를 입력해주세요';
    else if (fieldValues.password.length < 8) newErrors.password = '8자 이상 입력해주세요';
    if (!fieldValues.name) newErrors.name = '이름을 입력해주세요';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setTouched({ email: true, password: true, name: true });

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await signupAPI(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={values.email} onChange={handleChange} onBlur={handleBlur} />
      {touched.email && errors.email && <span>{errors.email}</span>}
      {/* ...나머지 필드들 */}
      <button type="submit" disabled={isSubmitting}>가입하기</button>
    </form>
  );
}
```

이 컴포넌트에서 JSX(렌더링)를 찾으려면 스크롤을 한참 내려야 한다. 폼의 "모양"보다 "동작"이 컴포넌트를 지배하고 있는 것이다. 이런 패턴이 로그인 폼, 프로필 수정 폼, 문의하기 폼 등에서 반복된다면 커스텀 훅 추출의 명확한 신호이다.

### useForm으로 분리하기

```tsx
function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);

    const allTouched = Object.keys(initialValues).reduce(
      (acc, key) => ({ ...acc, [key]: true }), {}
    );
    setTouched(allTouched);

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit };
}
```

분리 후 컴포넌트는 이렇게 변한다.

```tsx
function SignupForm() {
  const { values, errors, touched, isSubmitting, handleChange, handleBlur, handleSubmit } = useForm({
    initialValues: { email: '', password: '', name: '' },
    validate: signupValidation,
    onSubmit: signupAPI,
  });

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={values.email} onChange={handleChange} onBlur={handleBlur} />
      {touched.email && errors.email && <span>{errors.email}</span>}
      {/* ...나머지 필드들 */}
      <button type="submit" disabled={isSubmitting}>가입하기</button>
    </form>
  );
}
```

컴포넌트의 관심사가 폼의 동작 메커니즘에서 **"어떤 폼을 보여주는가"** 로 전환되었다.

### 그런데 이 useForm을 더 쪼개야 할까?

여기서 흔히 하는 고민이 있다. `useForm`을 `useFormState`, `useFormValidation`, `useFormSubmission`으로 더 세분화해야 하지 않을까?

필자의 답은 **"대부분의 경우 아니다"** 이다. 그 이유는 **응집도(Cohesion)** 에 있다.

폼의 상태 관리, 유효성 검증, 제출 처리는 서로 밀접하게 연관되어 있다. 제출 시점에 유효성 검증을 실행하고, 검증 결과에 따라 에러 상태를 업데이트하고, 에러가 없으면 제출을 진행한다. 이 흐름은 하나의 관심사 안에서 일어나는 연속적인 과정이다. 억지로 분리하면 세 개의 훅이 서로의 상태를 참조해야 하는 상황이 벌어지고, 오히려 결합도(Coupling)만 높아진다.

[React Hook Form](https://react-hook-form.com)의 설계를 살펴보면 이 판단이 더 명확해진다. React Hook Form의 `useForm`은 `register`, `handleSubmit`, `formState`, `watch`, `setValue` 등을 **하나의 훅에서 모두 반환**한다. 폼이라는 하나의 관심사 안에서 필요한 모든 도구를 응집시킨 것이다. 만약 이것을 `useFormRegister`, `useFormSubmit`, `useFormWatch`로 쪼갰다면, 사용하는 쪽에서 세 개의 훅을 동기화해야 하는 복잡성이 오히려 늘어났을 것이다.

물론 예외는 있다. 폼의 유효성 검증 로직이 여러 폼에서 공통으로 사용되면서도 폼 상태와 무관하게 동작할 수 있다면(예: 이메일 형식 검증, 비밀번호 강도 체크), 그 부분만 별도의 훅이나 유틸리티 함수로 분리하는 것은 합리적이다. 핵심은 **"이 로직들이 함께 변경되는가?"** 라는 질문이다. 함께 변경된다면 함께 있어야 한다.

그렇다면 폼보다 더 복잡한 경우는 어떨까? 단계가 있는 페이지, 이른바 퍼널(Funnel) 패턴은 어떻게 훅으로 다뤄야 할까?

---

## 실전 예시: 멀티스텝 페이지

회원가입, 결제 플로우, 보험 신청처럼 여러 단계를 거치는 UI는 프론트엔드에서 매우 흔하면서도 상태 관리가 까다로운 영역이다. 각 단계마다 수집하는 데이터가 다르고, 이전 단계의 데이터에 의존하며, 뒤로가기와 앞으로가기까지 고려해야 한다.

가장 단순하게 접근하면 이런 코드가 나온다.

```tsx
function SignupFlow() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    agreeTerms: false,
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  switch (step) {
    case 1:
      return <EmailStep data={formData} updateField={updateField} onNext={handleNext} />;
    case 2:
      return <ProfileStep data={formData} updateField={updateField} onNext={handleNext} onPrev={handlePrev} />;
    case 3:
      return <TermsStep data={formData} updateField={updateField} onSubmit={submitSignup} onPrev={handlePrev} />;
    default:
      return null;
  }
}
```

얼핏 보면 깔끔해 보인다. 하지만 실무에서 이 코드가 성장하면 여러 문제가 드러난다.

**첫째, 타입 안전성이 없다.** 1단계에서는 `email`과 `password`만 필요하고, 2단계에서는 `name`과 `phone`이 필요한데, `formData`라는 하나의 거대한 객체가 모든 단계의 모든 필드를 알고 있다. 3단계에 도달했을 때 `email`이 실제로 채워져 있는지를 타입 시스템으로 보장할 수 없다.

**둘째, step이라는 숫자와 각 단계의 데이터 사이에 암묵적인 관계가 있다.** `step === 2`일 때 `formData.email`이 반드시 존재한다는 것은 개발자의 머릿속에만 있는 규칙이지, 코드에 표현되어 있지 않다.

**셋째, 뒤로가기/앞으로가기 시 상태 관리가 복잡해진다.** 브라우저의 뒤로가기 버튼을 눌렀을 때, `step`은 바뀌지만 `formData`는 어떻게 해야 하는가? 이 동기화 문제가 버그의 온상이 된다.

### Toss의 @use-funnel이 제시하는 접근

한국의 핀테크 기업 Toss의 프론트엔드 팀은 이 문제를 깊이 고민한 끝에 [@use-funnel](https://github.com/toss/use-funnel)이라는 라이브러리를 만들었다. [Toss Tech Blog](https://toss.tech/article/use-funnel-1)에 따르면, 주택담보대출 서비스 개발 중 복잡한 퍼널 관리의 어려움을 경험한 것이 계기였다.

기존 접근 방식의 핵심 문제는 **"퍼널의 단계와 상태가 분리되어 관리된다"** 는 점이었다. step은 라우터에, 폼 데이터는 전역 상태에, 유효성 검증은 각 컴포넌트에 흩어져 있으면 전체 흐름을 한눈에 파악하기 어렵다.

`@use-funnel`의 핵심 아이디어는 이렇다. **각 단계를 페이지가 아닌 컴포넌트로 분리하고, 단계와 상태를 하나의 훅으로 응집시키는 것이다.**

```tsx
const funnel = useFunnel<{
  EmailStep: { email?: string };
  ProfileStep: { email: string; name?: string; phone?: string };
  TermsStep: { email: string; name: string; phone: string; agreeTerms?: boolean };
  Complete: { email: string; name: string; phone: string; agreeTerms: true };
}>({
  id: 'signup',
  initial: { step: 'EmailStep', context: {} },
});
```

이 선언만 보면 퍼널의 전체 흐름이 보인다. 어떤 단계들이 있고, 각 단계에서 어떤 데이터가 필요하며, 단계가 진행될수록 데이터가 어떻게 누적되는지가 **타입으로 표현**된다. `ProfileStep`에 도달했을 때 `email`이 `string`(optional이 아닌)이라는 것은 이전 단계에서 반드시 입력되었음을 타입 시스템이 보장하는 것이다.

렌더링 코드를 보면 이 응집의 효과가 더 명확하게 드러난다.

```tsx
<funnel.Render
  EmailStep={({ context, history }) => (
    <EmailInput
      onNext={(email) => history.push('ProfileStep', { email })}
    />
  )}
  ProfileStep={({ context, history }) => (
    <ProfileInput
      email={context.email}  // string 타입 — undefined가 아님을 보장
      onNext={(name, phone) => history.push('TermsStep', { name, phone })}
    />
  )}
  TermsStep={({ context, history }) => (
    <TermsAgreement
      onSubmit={() => history.push('Complete', { agreeTerms: true })}
    />
  )}
  Complete={({ context }) => (
    <SignupComplete data={context} />  // 모든 필드가 채워진 상태
  )}
/>
```

각 단계의 `context`는 해당 시점에 보장되는 데이터만 타입으로 노출한다. `ProfileStep`에서 `context.email`은 `string`이지, `string | undefined`가 아니다. 이것이 앞서 본 `useState`로 관리하는 방식과의 결정적인 차이이다.

여기서 배울 수 있는 커스텀 훅 설계의 인사이트는 명확하다. **흩어진 상태를 한곳에 모아 흐름 전체를 한눈에 파악할 수 있게 하는 것**, 이것이 커스텀 훅이 줄 수 있는 가장 큰 가치 중 하나이다. God Hook과의 차이가 바로 여기에 있다. God Hook은 관련 없는 관심사를 억지로 한곳에 모은 것이고, `useFunnel`은 **하나의 흐름이라는 관심사에 속하는 것들을 응집**시킨 것이다.

물론 `@use-funnel`이 모든 상황에 적합한 것은 아니다. 단순한 2-3단계 플로우에는 오히려 과도한 추상화일 수 있고, 직접 `useState`로 관리하는 것이 더 명확할 수 있다. 라이브러리가 아닌 패턴을 배워야 하는 이유가 여기에 있다. 도구가 아니라 **"단계와 상태를 응집시킨다"는 사고방식**이 핵심인 것이다.

그렇다면 지금까지 살펴본 판단 기준, 안티패턴, 실전 예시를 종합하여 커스텀 훅 설계의 원칙을 정리해보자.

---

## 커스텀 훅 설계 원칙

### 이름은 의도를 표현하라

React 공식 문서는 커스텀 훅의 이름에 대해 강한 입장을 취한다. **메커니즘이 아니라 의도를 표현**해야 한다는 것이다.

```
✅ useChatRoom     → "채팅방을 사용한다"는 의도가 드러남
✅ useOnlineStatus → "온라인 상태를 사용한다"는 의도가 드러남
✅ useImpressionLog → "노출 로그를 기록한다"는 의도가 드러남

🔴 useMount        → "마운트 시 실행한다"는 메커니즘만 설명
🔴 useEffectOnce   → "이펙트를 한 번 실행한다"는 메커니즘만 설명
🔴 useUpdateEffect → "업데이트 시 실행한다"는 메커니즘만 설명
```

React 공식 문서는 `useMount`나 `useEffectOnce` 같은 생명주기 래퍼 훅을 만드는 것을 명시적으로 **안티패턴**으로 규정한다. 이런 훅들은 React의 반응형 패러다임과 맞지 않고, 린터가 의존성 문제를 감지하지 못하게 만들어 버그를 숨길 수 있기 때문이다.

### 합성을 염두에 두고 설계하라

Kent C. Dodds는 [The State Reducer Pattern with React Hooks](https://kentcdodds.com/blog/the-state-reducer-pattern-with-react-hooks)에서 **제어의 역전(Inversion of Control)** 을 커스텀 훅에 적용하는 패턴을 제시한다.

```tsx
function useToggle({ reducer = toggleReducer } = {}) {
  const [{ on }, dispatch] = useReducer(reducer, { on: false });

  const toggle = () => dispatch({ type: 'toggle' });
  const setOn = () => dispatch({ type: 'on' });
  const setOff = () => dispatch({ type: 'off' });

  return { on, toggle, setOn, setOff };
}

// 사용하는 쪽에서 상태 변경 로직을 커스터마이즈할 수 있다
const { on, toggle } = useToggle({
  reducer(currentState, action) {
    const changes = toggleReducer(currentState, action);
    if (tooManyClicks && action.type === 'toggle') {
      return { ...changes, on: currentState.on }; // 토글을 무시
    }
    return changes;
  },
});
```

이 패턴의 핵심은 훅의 기본 동작을 제공하면서도, **사용하는 쪽에서 동작을 재정의할 수 있는 여지**를 두는 것이다. 물론 이 수준의 유연성이 필요한 경우는 복잡한 라이브러리 훅에 한정되며, 애플리케이션 레벨의 훅에서 이런 패턴을 남용하면 오히려 과도한 설계가 된다. 어디까지나 "가능하다"는 것을 알아두고, 필요할 때 꺼내 쓰면 되는 도구인 것이다.

### 도메인별로 배치하라

[Bulletproof React](https://github.com/alan2207/bulletproof-react)는 React 프로젝트의 구조에 대한 의견이 있는(opinionated) 가이드인데, 훅의 배치에 대해 명확한 기준을 제시한다.

- **글로벌 훅** (`src/hooks/`): 여러 feature에서 공유되는 범용 훅. `useMediaQuery`, `useDebounce` 같은 것들.
- **피쳐 훅** (`src/features/checkout/hooks/`): 특정 feature 안에서만 사용되는 훅. `useCart`, `useCheckoutFlow` 같은 것들.

핵심은 **훅을 타입별(hooks 폴더에 다 모아놓기)이 아니라 도메인별(해당 feature 폴더 안에)로 배치**하라는 것이다. `useCart`와 `useCheckoutFlow`는 같은 체크아웃 feature에 속하므로 함께 있어야 하고, `useMediaQuery`는 어디서든 쓰이므로 글로벌 위치에 있어야 한다.

### 테스트 전략을 고려하라

Kent C. Dodds는 훅의 복잡도에 따라 테스트 방식을 달리할 것을 제안한다.

- **단순한 훅**: 해당 훅을 사용하는 컴포넌트를 통해 통합 테스트. "사용자가 소프트웨어를 사용하는 방식대로 테스트하라"는 원칙.
- **복잡한 훅**: `renderHook`을 활용한 직접 테스트. 여러 사용 사례를 하나의 예제 컴포넌트로 커버하기 어려울 때 유용.

중요한 것은 "React의 내장 Hook을 모킹하지 말라"는 것이다. `useState`나 `useEffect`를 모킹하면 실제 동작과 테스트 동작 사이의 괴리가 생겨 신뢰할 수 없는 테스트가 된다. 훅이 올바르게 분리되어 있다면, 훅의 입력과 출력만으로 충분히 테스트할 수 있다. 테스트하기 어렵다는 것은 훅의 설계를 다시 살펴보라는 신호일 수 있다.

---

## 추상화의 관점에서 본 커스텀 훅

이전에 [추상화에 대한 글](/260201)에서 필자는 **"추상화의 목적은 모호해지는 것이 아니라, 절대적으로 정확할 수 있는 새로운 의미 수준을 만드는 것"** 이라고 정리한 바 있다. 커스텀 훅은 이 원칙의 살아있는 예시이다.

`useOnlineStatus()`라는 한 줄은 내부의 `addEventListener`, `removeEventListener`, `useState`, `useEffect`를 모호하게 만드는 것이 아니다. 오히려 **"온라인 상태를 사용한다"는 새로운 의미 수준을 정확하게 만든 것**이다. 컴포넌트를 읽는 사람은 브라우저 이벤트의 세부사항 대신 비즈니스 의도에 집중할 수 있게 된다.

React 공식 문서의 표현이 이를 가장 잘 요약한다.

> "When you extract logic into custom Hooks, you can hide the gnarly details of how you deal with some external system or a browser API. The code of your components expresses your intent, not the implementation."
> (커스텀 훅으로 로직을 추출하면, 외부 시스템이나 브라우저 API를 다루는 복잡한 세부사항을 숨길 수 있다. 컴포넌트의 코드는 구현이 아닌 의도를 표현하게 된다.)

그리고 이 추상화에는 또 하나의 실용적인 장점이 있다. React 공식 문서에서 소개한 `useOnlineStatus`의 사례를 보면, 처음에는 `useState`와 `useEffect`로 구현했던 것을 나중에 `useSyncExternalStore`라는 더 나은 API로 **컴포넌트 변경 없이** 교체할 수 있었다. 좋은 추상화는 내부 구현을 변경할 자유를 준다. 커스텀 훅이 바로 이런 종류의 추상화 경계(abstraction boundary) 역할을 하는 것이다.

---

## 마무리하며

커스텀 훅을 만드는 것은 쉽다. `use`로 시작하는 함수를 만들고 그 안에서 다른 Hook을 호출하면 된다. 어려운 것은 **"언제 만들 것인가"** 와 **"어디까지를 하나의 훅으로 볼 것인가"** 라는 판단이다.

이 글에서 다룬 내용을 압축하면 이렇다.

- 커스텀 훅은 **상태 있는 로직**을 공유하는 도구이다. 상태 자체를 공유하는 것이 아니다.
- 분리의 신호는 **반복, 복잡한 세부사항, Effect 작성, 테스트 필요성**이다.
- 분리의 기준은 **코드 줄 수가 아니라 관심사**이다. 응집도 높은 로직은 하나의 훅에 있어야 한다.
- **이름을 지을 수 없다면** 아직 분리할 때가 아니다.
- React의 Hook을 사용하지 않는 로직은 **일반 함수**로 만들어라.
- 의도를 표현하는 이름을 짓고, 메커니즘을 감싸는 생명주기 래퍼는 피하라.

결국 커스텀 훅은 "분리를 위한 분리"가 아니라, **컴포넌트가 "무엇을 하는지"를 드러내고 "어떻게 하는지"를 감추기 위한 추상화 도구**이다. 정답이 되는 단 하나의 규칙은 없지만, "이 훅의 이름으로 의도가 전달되는가?", "이 훅의 관심사는 하나인가?", "이 훅 없이 컴포넌트를 읽을 수 있는가?"라는 질문을 스스로에게 던져보면 대부분의 경우 합리적인 판단에 도달할 수 있을 것이다.

이 글을 읽는 독자분들도 각자의 코드베이스에서 이 질문들을 던져보시길 바란다. 그리고 혹시 `useEverything`이라는 이름을 지으려는 순간이 온다면, 그때가 바로 이 글을 다시 펼쳐볼 때일 것이다. (필자처럼 그 유혹에 빠지지 않기를)
