---
emoji: 🪝
title: "Custom Hook"
date: "2026-05-11"
categories: React 프론트엔드 설계 hooks
---

이번 포스팅에서는 React 커스텀 훅(Custom Hook)을 **언제 만들어야 하고, 어떻게 분리해야 하는가**에 대한 이야기를 해보려고 한다.

필자는 프론트엔드 개발을 하면서 커스텀 훅을 수도 없이 만들어왔다. `useAuth`, `useForm`, `useModal`, `useIntersectionObserver`... 이름만 봐도 낯익은 훅들이 프로젝트마다 쌓여간다. 그런데 이 훅들을 만들 때마다 반복되는 고민이 있다. "이 로직을 진짜 훅으로 분리해야 하나?", "이 훅이 너무 비대해진 건 아닌가?", "어디까지가 하나의 훅이 책임져야 하는 범위인가?"

처음에는 "반복되는 코드가 있으면 훅으로 빼면 되지"라고 단순하게 생각했다. 하지만 그렇게 만든 훅이 시간이 지나면서 온갖 로직을 품은 거대한 괴물이 되어가는 경험을 몇 번 하고 나니, 커스텀 훅을 만드는 것 자체보다 **언제, 어떤 기준으로 분리하는가**가 훨씬 중요하다는 것을 깨달았다.

이 글에서는 커스텀 훅의 본질부터 시작해서, 분리의 판단 기준, 안티패턴 등을 정리해보려고 한다.

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
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return <h1>{isOnline ? "온라인" : "오프라인"}</h1>;
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
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
```

그러면 컴포넌트에서는 구현 세부사항이 사라지고, **"온라인 상태를 사용한다"** 라는 의도만 남는다.

```tsx
function StatusBar() {
  const isOnline = useOnlineStatus();
  return <h1>{isOnline ? "온라인" : "오프라인"}</h1>;
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
    post("/analytics/event", { eventName: "visit_chat", roomId });
  }, [roomId]);

  return <div>...</div>;
}

function ChatRoom({ roomId, serverUrl }) {
  useChatConnection({ roomId, serverUrl });
  useVisitLog("visit_chat", { roomId });
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

## 커스텀 훅, 일반 함수

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
    fetchProduct(productId).then((data) => {
      setProduct(data);
      setLoading(false);
    });
  }, [productId]);

  const [cartItems, setCartItems] = useState([]);
  const addToCart = (item) => setCartItems((prev) => [...prev, item]);

  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);

  useEffect(() => {
    fetchReviews(productId, reviewPage).then(setReviews);
  }, [productId, reviewPage]);

  useEffect(() => {
    trackRecentlyViewed(productId);
  }, [productId]);

  return {
    product,
    loading,
    cartItems,
    addToCart,
    reviews,
    reviewPage,
    setReviewPage,
  };
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
    fetchProduct(productId).then((data) => {
      setProduct(data);
      setLoading(false);
    });
  }, [productId]);

  return { product, loading };
}

function useCart() {
  const [cartItems, setCartItems] = useState([]);
  const addToCart = (item) => setCartItems((prev) => [...prev, item]);

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

## 위험한 커스텀 훅 패턴

God Hook을 분리하든, 새로운 커스텀 훅을 만들든, 그 이전에 확인해야 하는 것이 있다. **내부의 Effect가 올바르게 작성되어 있는가**이다. 잘못된 Effect를 훅으로 감싸면 문제가 해결되는 것이 아니라, 문제가 추상화 뒤에 숨을 뿐이다.

React 공식 문서가 명시적으로 경고하는 대표적인 패턴이 **Effect 체인(Effect chains)** 이다. 한 Effect가 상태를 바꾸고, 그 상태 변경이 다음 Effect를 트리거하고, 또 그 Effect가 또 다른 상태를 바꾸는 도미노 구조이다.

```tsx
function Game() {
  const [card, setCard] = useState(null);
  const [goldCardCount, setGoldCardCount] = useState(0);
  const [round, setRound] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    if (card !== null && card.gold) {
      setGoldCardCount((c) => c + 1);
    }
  }, [card]);

  useEffect(() => {
    if (goldCardCount > 3) {
      setRound((r) => r + 1);
      setGoldCardCount(0);
    }
  }, [goldCardCount]);

  useEffect(() => {
    if (round > 5) {
      setIsGameOver(true);
    }
  }, [round]);
}
```

이 코드의 진짜 문제는 성능이 아니라 **추적 불가능성**이다. `isGameOver`가 왜 `true`가 되었는지 이해하려면 `round`를 보고, `round`가 왜 늘었는지 알려면 `goldCardCount`를 보고, 다시 `card`까지 거슬러 올라가야 한다. 각 Effect는 한 번 실행되는 것이 아니라 매번 리렌더링마다 조건을 재평가하므로, 어느 시점에 어떤 분기가 발동했는지 머릿속으로 시뮬레이션하기가 매우 어렵다. 더구나 매 단계가 별도의 리렌더링이기 때문에, 상태 변화가 순서대로 일어나지 않을 수 있다.

올바른 접근은 이 모든 도미노를 **이벤트가 발생한 자리에서 한 번에 처리**하는 것이다. 카드를 뽑는 이벤트 핸들러에서 "골드 카드인지 확인하고, 카운트를 증가시키고, 라운드 종료 조건을 검사한다"는 일련의 로직을 일괄 계산하면, 상태 흐름이 한 함수 안에서 위에서 아래로 읽힌다.

여기서 이 글의 출발점으로 돌아와보자. 만약 이 Effect 체인을 그대로 둔 채 `useGameState()`라는 커스텀 훅으로 감싸면 어떻게 될까. 컴포넌트는 깔끔해 보이겠지만, 도미노 자체는 훅 안쪽에 그대로 살아있다. 오히려 추상화 경계가 생기면서 외부에서는 "왜 `isGameOver`가 갑자기 `true`가 되었는지"를 더 이상 추적할 수 없게 된다. **잘못된 Effect를 훅으로 감싸는 것은 문제를 해결하는 것이 아니라, 문제를 추상화 뒤에 숨기는 것**이라는 말은 이런 맥락이다.

Effect 체인이 훅으로 숨겨서는 안 되는 안티패턴이었다면, 반대로 **훅 안에 반드시 봉인해두어야 할** 세부사항도 있다. 데이터 페칭에서의 **경쟁 상태(Race Condition)** 가 대표적이다.

```tsx
function useData(url) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setData);
  }, [url]);

  return data;
}

function useData(url) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let ignore = false;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!ignore) setData(json);
      });

    return () => {
      ignore = true;
    };
  }, [url]);

  return data;
}
```

`url`이 빠르게 바뀌면, 이전 요청의 응답이 나중에 도착하여 **오래된 데이터가 최신 데이터를 덮어쓰는** 상황이 벌어진다. cleanup 함수에서 `ignore` 플래그를 설정하면 이 문제를 방지할 수 있다. 이는 React 공식 문서가 제시하는 기본형 해법이기도 하다.

다만 한 가지 짚어둘 점이 있다. `ignore` 플래그는 **"응답이 도착해도 무시한다"** 일 뿐, 네트워크 요청 자체는 끝까지 진행된다. 이미 떠난 요청의 대역폭과 서버 자원은 그대로 소비되는 것이다. 한 단계 더 들어간 해법은 `AbortController`로 요청 자체를 취소하는 것이다.

```tsx
function useData(url) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then(setData)
      .catch((err) => {
        if (err.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [url]);

  return data;
}
```

`ignore` 플래그가 "UI 일관성"을 지키는 방어선이라면, `AbortController`는 "리소스 정리"까지 포함하는 더 강한 방어선이다. 두 방식 모두 React 공식 문서가 인정하는 접근이라, 상황에 맞게 골라 쓰면 된다.

이런 세부사항이야말로 커스텀 훅 안에 올바르게 캡슐화되어야 하는 것이다. 한 번 제대로 만들어두면 사용하는 쪽에서는 경쟁 상태를 신경 쓸 필요가 없어진다. 물론 프로덕션에서는 이 모든 세부사항을 직접 다루기보다 [TanStack Query](https://tanstack.com/query)나 [SWR](https://swr.vercel.app/) 같은 라이브러리에 위임하는 것이 일반적이다. 캐싱, 자동 재요청, 중복 제거, 경쟁 상태 처리까지 모두 검증된 형태로 제공되기 때문이다. 다만 그런 라이브러리가 내부에서 무엇을 해주고 있는지 이해하는 것은, 결국 자신의 커스텀 훅을 잘 만들기 위한 토대가 된다.

---

## 추상화의 관점에서 본 커스텀 훅

이전에 [추상화에 대한 글](/260201)에서 필자는 **"추상화의 목적은 모호해지는 것이 아니라, 절대적으로 정확할 수 있는 새로운 의미 수준을 만드는 것"** 이라고 정리한 바 있다. 커스텀 훅은 이 원칙의 대표적인 예시이다.

`useOnlineStatus()`라는 한 줄은 내부의 `addEventListener`, `removeEventListener`, `useState`, `useEffect`를 모호하게 만드는 것이 아니다. 오히려 **"온라인 상태를 사용한다"는 새로운 의미 수준을 정확하게 만든 것**이다. 컴포넌트를 읽는 사람은 브라우저 이벤트의 세부사항 대신 비즈니스 의도에 집중할 수 있게 된다.

그리고 이 추상화에는 또 하나의 실용적인 장점이 있다. React 공식 문서에서 소개한 `useOnlineStatus`의 사례를 보면, 처음에는 `useState`와 `useEffect`로 구현했던 것을 나중에 `useSyncExternalStore`라는 더 나은 API로 **컴포넌트 변경 없이** 교체할 수 있었다. 좋은 추상화는 내부 구현을 변경할 자유를 준다. 커스텀 훅이 바로 이런 종류의 추상화 경계(abstraction boundary) 역할을 하는 것이다.

---

## 마무리하며

커스텀 훅을 만드는 것은 쉽다. `use`로 시작하는 함수를 만들고 그 안에서 다른 Hook을 호출하면 된다. 어려운 것은 **"언제 만들 것인가"** 와 **"어디까지를 하나의 훅으로 볼 것인가"** 라는 판단이다.

결국 커스텀 훅은 "분리를 위한 분리"가 아니라, **컴포넌트가 "무엇을 하는지"를 드러내고 "어떻게 하는지"를 감추기 위한 추상화 도구**이다. 정답이 되는 단 하나의 규칙은 없지만, "이 훅의 이름으로 의도가 전달되는가?", "이 훅의 관심사는 하나인가?", "이 훅 없이 컴포넌트를 읽을 수 있는가?"라는 질문을 스스로에게 던져보면 대부분의 경우 합리적인 판단에 도달할 수 있을 것이다.

이 글을 읽는 독자분들도 각자의 코드베이스에서 이 질문들을 던져보시길 바란다. 그리고 혹시 `useEverything`이라는 이름을 지으려는 순간이 온다면, 그때가 바로 이 글을 다시 펼쳐볼 때일 것이다.
