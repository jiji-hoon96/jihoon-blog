---
emoji: 🧱
title: 'React 앱의 layer'
seoTitle: 'React 앱 layer 분리, hook과 domain object와 Strategy로 결제 화면 리팩토링'
date: '2026-10-01'
categories: 프론트엔드 React 아키텍처
description: 'Juntao Qiu의 React 모듈화 글을 따라 결제 화면을 view, model, data로 나눈다. 예제 저장소를 직접 돌려 찾은 useMemo 무력화와 fetch 반복, 이 구조를 언제 쓸지에 대한 판단도 정리했다.'
keywords: 'React layer 분리, React 아키텍처, custom hook 분리, domain object, Strategy 패턴 React, Presentation Domain Data layering, React 리팩토링'
---

이번 포스팅에서는 React 앱의 코드를 화면, 업무 규칙, 데이터 접근으로 나누는 방법에 대한 이야기를 해보려고 한다. component 하나에 fetch와 계산과 render가 같이 들어 있어서 고칠 때마다 전부를 읽어야 하는 개발자를 위한 글이다. 끝까지 읽으면 hook, pure component, domain object, Strategy, network client를 어떤 신호를 보고 어떤 순서로 꺼내는지와, 그 구조를 그대로 옮길 때 어디서 깨지는지를 얻을 수 있다.

뼈대는 Thoughtworks의 Juntao Qiu가 2023년 2월 martinfowler.com에 연재한 [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html)다. 원문을 그대로 옮기지 않고 필자의 말로 다시 풀었고, 본문의 그림은 모두 이 원문에서 가져왔다. 그 위에 저자의 [예제 저장소](https://github.com/abruzzi/payment-round-up-refactoring)를 받아 타입 검사와 테스트를 돌린 결과와, 같은 문제를 다룬 다른 자료를 덧붙였다.

## React는 view library

React를 처음 배울 때 가장 매력적인 생각은 UI가 데이터를 DOM으로 바꾸는 순수 함수라는 것이다. 어느 정도는 맞다. 그런데 서버에 요청을 보내거나 페이지를 이동하는 순간 component는 더 이상 순수하지 않다. 여기에 전역 state와 지역 state가 얽히면 코드는 금방 복잡해진다.

저자의 답은 관점을 바꾸는 것이다. "React 애플리케이션"이라는 별종 소프트웨어는 없다. React는 UI를 그리는 library이고, 계산이나 업무 규칙을 어디에 둘지는 처음부터 관심사가 아니다. 그 위에 올라간 것은 평범한 JavaScript 앱이다. 그렇다면 데스크톱 GUI 시절부터 써 온 설계, 특히 코드를 presentation, domain, data 세 layer로 나누는 방식을 그대로 쓸 수 있다.

실제 프론트엔드 앱에는 view 말고도 router, local storage, 여러 수준의 캐시, 네트워크 요청, 외부 서비스 연동과 로그인, 보안, 로깅, 성능 조정이 있다. 이것을 전부 component와 hook에 밀어 넣으면 한 파일 안에서 주문 상태를 요청하는 줄 다음에 문자열 앞 공백을 자르는 줄이 오고, 그다음에 다른 화면으로 이동하는 줄이 온다. 읽는 사람은 추상화 수준을 계속 바꿔 가며 앞뒤로 오가야 한다.

나누는 이유는 두 가지로 정리된다. 화면은 업무 규칙보다 자주 바뀐다. 그리고 둘을 떼어 두면 한 번에 한 가지만 생각하면 된다. 두 번째 이유는 Martin Fowler가 [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html)에서 이 구분의 가장 큰 이점으로 든 것이다. 세 주제를 비교적 따로 생각할 수 있어서 주의를 기울일 범위가 줄어든다.

## 앱이 자라는 다섯 단계

저자는 리팩토링에 들어가기 전에 앱이 자라면서 구조가 어떻게 바뀌는지를 다섯 장의 그림으로 보여 준다. 중요한 것은 다음 단계로 넘어가는 계기다. 정해진 시점이 아니라 그 단계에서 생기는 불편이 다음 단계를 부른다. 그림의 색은 다섯 장 모두 같은 뜻이다. 연두는 state를 가진 container component, 진한 초록은 그리기만 하는 presentational component, 보라는 hook, 파랑은 domain object, 주황은 네트워크 같은 infrastructure다.

처음에는 component 하나가 네트워크 요청, state, 계산, render를 모두 갖는다. 작은 앱이나 일회성 프로젝트에서는 이것으로 충분하고, 코드가 HTML과 비슷해서 오히려 읽기 쉽다. 목록을 돌며 항목을 만드는 코드와 외부 component를 설정하는 코드가 섞여 무엇이 일어나는지 읽는 데 시간이 들기 시작하면 다음 단계로 간다.

![component 하나가 네트워크 요청, state 관리, domain logic, render를 모두 갖고 API를 직접 호출하는 구조](1.png?w=720)

화면이 커지면 결과 HTML의 모양을 따라 component를 나눈다. 그리기만 하는 component가 떨어져 나오지만, 맨 위 component에는 네트워크 요청, 응답을 화면용 모양으로 바꾸는 코드, 서버로 보낼 데이터를 모으는 코드가 그대로 남는다. 셋 다 UI가 아닌데 component 안에 있다.

![그리기만 하는 component가 분리됐지만 위쪽 component에 네트워크 요청과 domain logic이 남아 있는 구조](2.png?w=720)

그다음 state와 그 변화를 custom hook으로 뺀다. 그러자 hook 안에 side effect도 state도 아닌 순수 계산이 남는다.

![네트워크 요청과 domain logic이 hook으로 옮겨 갔지만 hook 안에서 둘이 섞여 있는 구조](3.png?w=720)

그 계산을 React와 무관한 객체로 빼면 domain object가 생긴다. 데이터 형식 변환, null 검사, 대체값이 여기로 온다. 객체가 늘어나면 상속이나 다형성이 필요해지기 시작한다.

![hook에는 state만 남고 domain logic은 Domain 객체로, 네트워크 요청은 Fetcher로 갈라진 구조](4.png?w=720)

마지막으로 UI에도 속하지 않고 데이터가 서버에서 오는지 local storage나 캐시에서 오는지도 상관하지 않는 객체들이 보이면, 그것을 따로 model layer로 묶는다.

![가운데 띠가 model layer이고 component와 hook은 위에, Fetcher와 Adaptor 같은 infrastructure는 아래에 놓인 구조](5.png?w=720)

그림만 보면 추상적이다. 이 다섯 단계를 실제 코드로 한 번 지나가 보자. 저자가 고른 예제는 온라인 주문의 결제 화면이다.

## 결제 화면 하나에서 출발

결제 수단은 서버 설정에서 오고 나라마다 다르다. 서버가 하나라도 돌려주면 그 끝에 현금 결제를 붙여 기본으로 선택해 두고, 하나도 없으면 아무것도 보여 주지 않는다.

![주문 상세 아래 결제 영역에 apple, google, 현금 결제 라디오가 있고 현금 결제가 선택된 화면](6.png?w=600)

처음 코드는 튜토리얼에서 흔히 보는 모양이다. `useEffect` 안에서 fetch하고, 응답을 화면용 모양으로 바꾸고, 현금 결제를 붙이고, 라디오 목록을 그린다. 아래는 필자가 줄여 옮긴 것이다.

```tsx
export const Payment = ({ amount }: { amount: number }) => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((methods: RemotePaymentMethod[]) => {
        if (methods.length === 0) return setPaymentMethods([]);
        const extended = methods.map((m) => ({ provider: m.name, label: `Pay with ${m.name}` }));
        extended.push({ provider: "cash", label: "Pay in cash" });
        setPaymentMethods(extended);
      });
  }, []);

  return (
    <div>
      {paymentMethods.map((method) => (
        <label key={method.provider}>
          <input type="radio" defaultChecked={method.provider === "cash"} />
          {method.label}
        </label>
      ))}
      <button>${amount}</button>
    </div>
  );
};
```

이 크기에서는 문제가 아니다. 그러나 이 component를 고치려면 네 가지를 함께 이해해야 한다. 네트워크 요청을 어떻게 시작하는지, 서버 데이터를 화면이 아는 모양으로 어떻게 바꾸는지, 결제 수단 하나를 어떻게 그리는지, 결제 영역 전체를 어떻게 그리는지다. 코드가 커지면 읽는 사람은 이 넷 사이를 계속 오가야 한다.

## hook과 pure component

첫 번째로 꺼내는 것은 state와 fetch다. 판단 신호는 단순하다. **render와 상관없는 코드가 component 본문의 절반을 넘으면** hook으로 뺀다. `usePaymentMethods`가 fetch와 변환을 맡고, component는 hook이 준 배열을 받아 그리기만 한다.

두 번째는 목록을 그리는 JSX다. **props만 받아서 그릴 수 있는 블록이 보이면** component로 뗀다. `PaymentMethods`는 결제 수단 배열 하나만 받는 pure component라서 테스트와 재사용이 쉽다. 나중에 선택을 알리는 `onSelect` callback이 붙어도 바깥 state를 건드리지 않으니 여전히 pure하다.

```tsx
const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);
  useEffect(() => { /* 위의 fetch와 변환 */ }, []);
  return { paymentMethods };
};

export const Payment = ({ amount }: { amount: number }) => {
  const { paymentMethods } = usePaymentMethods();
  return (
    <div>
      <PaymentMethods paymentMethods={paymentMethods} />
      <button>${amount}</button>
    </div>
  );
};
```

저자는 두 작업 모두 리팩토링 카탈로그의 [Extract Function](https://refactoring.com/catalog/extractFunction.html)이라고 부른다. React에서는 component도 함수이기 때문이다. 새 개념을 들여온 것이 아니라 함수 하나를 둘로 나눴을 뿐이라는 점이 중요하다.

이 정도면 끝난 것처럼 보이지만 아직 두 군데가 남아 있다. view 안에는 "현금이면 기본 선택"이라는 판정이 있고, hook 안에는 응답을 화면용 모양으로 바꾸는 익명 함수가 있다. 저자는 이렇게 업무 규칙이 view와 hook으로 새어 나온 것을 logic leak이라고 부른다.

## domain object로 모은 규칙

세 번째 신호는 **같은 데이터에 대한 판정이 view와 hook에 흩어져 있을 때**다. 새어 나온 판정과 변환을 `PaymentMethod` class 하나로 모은다. 이 블로그의 [도메인 모델](/260418)에서 다룬 것처럼, 규칙을 데이터 옆에 두는 것이다.

```ts
class PaymentMethod {
  constructor(private remote: RemotePaymentMethod) {}
  get provider() { return this.remote.name; }
  get label() { return this.provider === "cash" ? "Pay in cash" : `Pay with ${this.provider}`; }
  get isDefaultMethod() { return this.provider === "cash"; }
}

const convertPaymentMethods = (methods: RemotePaymentMethod[]) =>
  methods.length === 0
    ? []
    : [...methods.map((m) => new PaymentMethod(m)), new PaymentMethod({ name: "cash" })];
```

view의 라디오는 이제 `defaultChecked={method.isDefaultMethod}`로 객체에게 묻는다. 현금 결제 기본값도 같은 class의 인스턴스 하나로 표현된다. 서버가 준 것과 앱이 붙인 것이 같은 모양이 되니 view는 둘을 구분할 필요가 없다.

![Payment가 usePaymentMethods를 부르고, hook이 PaymentMethod를 만들고, PaymentMethods는 그리기만 하는 구조](7.png?w=720)

저자는 이 구조의 이점으로 테스트가 쉬워진다는 것을 든다. 원문은 그 말에서 멈추지만, 얼마나 쉬워지는지는 코드로 보는 편이 빠르다. 아래는 필자가 쓴 테스트다. React도, 렌더러도, fetch mock도 없다.

```ts
test("서버가 준 결제 수단 끝에 현금 결제를 기본값으로 붙인다", () => {
  const methods = convertPaymentMethods([{ name: "apple" }, { name: "google" }]);

  expect(methods.map((m) => m.label)).toEqual(["Pay with apple", "Pay with google", "Pay in cash"]);
  expect(methods.filter((m) => m.isDefaultMethod).map((m) => m.provider)).toEqual(["cash"]);
});

test("서버가 아무것도 주지 않으면 현금 결제도 보여 주지 않는다", () => {
  expect(convertPaymentMethods([])).toEqual([]);
});
```

같은 규칙을 처음 코드에서 확인하려면 component를 render하고, fetch를 가로채고, 라디오가 그려질 때까지 기다려야 했다. 규칙이 객체로 나온 순간 테스트는 함수 호출 한 줄이 된다.

또 하나의 이점은 새 요구가 왔을 때 갈 곳이 정해져 있다는 것이다. 이 시점의 파일 구조는 이렇다.

```text
src
├── components
│   ├── Payment.tsx
│   └── PaymentMethods.tsx
├── hooks
│   └── usePaymentMethods.ts
└── models
    └── PaymentMethod.ts
```

구조가 정말 버티는지는 새 요구가 와야 안다. 저자는 여기서 기능을 하나 더한다.

## 기부 기능과 state machine으로서의 hook

새 요구는 주문 금액을 올림해 그 차액을 자선단체에 기부하게 하는 것이다. 19.80달러 주문이면 0.20달러 기부를 묻고, 동의하면 버튼에 20달러를 보인다.

![결제 수단 아래에 0.2달러 기부 체크박스가 추가된 결제 화면](8.png?w=600)

저자는 일부러 처음에는 동의 여부 state와 계산을 결제 component 안에 넣는다. 체크박스 마크업, 문구 분기, 합계 계산이 한꺼번에 들어오면서 component가 다시 무거워진다. 정리하는 순서는 앞에서 본 그대로다. state와 계산은 `useRoundUp` hook으로, 문구 조립은 helper 함수로, 체크박스 마크업은 `DonationCheckbox` component로 간다.

```ts
export const useRoundUp = (amount: number) => {
  const [agreeToDonate, setAgreeToDonate] = useState(false);

  const { total, tip } = useMemo(() => ({
    total: agreeToDonate ? Math.floor(amount + 1) : amount,
    tip: parseFloat((Math.floor(amount + 1) - amount).toPrecision(10)),
  }), [amount, agreeToDonate]);

  const updateAgreeToDonate = () => setAgreeToDonate((v) => !v);
  return { total, tip, agreeToDonate, updateAgreeToDonate };
};
```

`toPrecision(10)`은 원문이 이유를 설명하지 않는 부분이다. 필자가 Node 24에서 돌려 보니 `20 - 19.8`은 `0.1999999999999993`이 나왔다. 부동소수 오차를 걷어 내는 장치다.

저자는 이런 hook을 "view 뒤의 state machine"으로 본다. UI에서 이벤트가 오면 새 state를 만들고, 새 state가 다시 render를 일으킨다. hook은 원래 여러 component가 logic을 나눠 쓰려고 만든 것이지만, 쓰는 곳이 하나여도 component를 render에 집중하게 해 주므로 뺄 가치가 있다는 것이 저자의 입장이다. 여기에 하나를 보태면, React 공식 문서의 [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)가 짚듯 custom hook이 나누는 것은 state를 다루는 logic이지 state 자체가 아니다. 이 state machine은 hook을 부르는 component마다 하나씩 따로 생긴다.

정리가 끝나면 결제 component는 hook 둘을 부르고 하위 component 둘과 버튼 하나를 늘어놓는 모양이 된다. 기능이 하나 늘었는데 결제 component의 역할은 그대로다.

![Payment 아래에 useRoundUp과 usePaymentMethods 두 hook, PaymentMethods와 DonationCheckbox 두 하위 component가 놓인 구조](9.png?w=720)

## 나라별 규칙과 shotgun surgery

다음 요구는 나라마다 올림 단위를 다르게 하라는 것이다. 일본은 100엔 단위, 덴마크는 10크로네 단위다. 저자는 "쉬운 고침 같다"며 나라 코드를 prop으로 받아 분기를 넣는 길을 일부러 먼저 보여 준다.

```tsx
// useRoundUp 안
total: agreeToDonate
  ? countryCode === "JP" ? Math.floor(amount / 100 + 1) * 100 : Math.floor(amount + 1)
  : amount,

// 체크박스 문구 helper 안
const currencySign = countryCode === "JP" ? "¥" : "$";

// 버튼 JSX 안
<button>{countryCode === "JP" ? "¥" : "$"}{total}</button>
```

같은 `countryCode === "JP"` 판정이 hook, helper, 버튼 세 자리에 하나씩 들어갔다. 덴마크를 더하면 세 자리를 모두 다시 고쳐야 하고, 삼항 연산자가 감당이 안 되면 나라 코드로 통화 기호를 찾는 표가 생긴다. 그 표도 결국 여러 곳에서 따로 참조된다. 변경 하나에 여러 모듈을 동시에 고쳐야 하는 이 냄새를 shotgun surgery라고 부른다.

![나라별 규칙을 뜻하는 색 막대가 여러 component와 hook, domain object에 흩어져 있는 그림](10.png?w=720)

이 단계가 앞의 세 단계와 다른 점은 판단 신호가 코드가 아니라 **변경 요청**에서 온다는 것이다. 지금 코드만 보면 분기 세 개는 읽기 어렵지 않다. 나라를 하나 더할 때 몇 군데를 고쳐야 하는지 세어 봐야 문제가 보인다. 그렇다면 흩어진 분기를 어디로 모아야 할까.

## Strategy로 모은 나라별 차이

저자의 답은 나라별 차이 자체를 객체로 만드는 것이다. 먼저 [Extract Class](https://refactoring.com/catalog/extractClass.html)와 [Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html)으로 interface 하나와 나라별 구현을 만든다.

```ts
interface PaymentStrategy {
  getRoundUpAmount(amount: number): number;
  getTip(amount: number): number;
}

class PaymentStrategyAU implements PaymentStrategy { /* 1달러 단위 */ }
class PaymentStrategyJP implements PaymentStrategy { /* 100엔 단위 */ }
```

만들고 보니 구현마다 다른 것은 통화 기호와 올림 함수 둘뿐이고, `getTip` 같은 나머지는 똑같다. 그래서 저자는 [Inline Class](https://refactoring.com/catalog/inlineClass.html)로 구현들을 class 하나에 합치고, 다른 부분만 생성자로 받는다. 나라마다 subclass를 만들지 않고 올림 알고리즘을 함수로 받을 수 있는 것은 JavaScript에서 함수가 값이기 때문이다. 아래는 그 결과를 필자가 줄여 쓴 것이다.

```ts
class CountryPayment {
  constructor(readonly currencySign: string, private roundUp: (n: number) => number) {}
  getRoundUpAmount(n: number) { return this.roundUp(n); }
  getTip(n: number) { return parseFloat((this.getRoundUpAmount(n) - n).toPrecision(10)); }
}

const japan = new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100);
japan.getRoundUpAmount(3312); // 3400
japan.getTip(3312);           // 88
```

hook과 component는 이제 나라를 모른다. 이 객체 하나를 받아 `strategy.getRoundUpAmount(amount)`와 `strategy.currencySign`을 쓸 뿐이다. 나라를 하나 더하면 객체를 하나 더 만들면 끝나고, 고칠 파일은 없다.

![component가 PaymentStrategy 하나만 바라보고 나라별 구현 셋이 그 뒤에 모인 구조](11.png?w=720)

interface를 거쳤다가 다시 합친 과정이 군더더기처럼 보일 수 있다. 필자는 이 부분이 원문에서 가장 배울 만한 대목이라고 본다. 다형성은 목적이 아니라 공통점과 차이점을 드러내는 도구였고, 차이가 함수 하나로 줄어든 것이 보이자 class 계층을 걷어 냈다. 패턴을 들여오는 것보다 그 패턴을 언제 다시 걷어 내는지가 더 어려운 판단이다.

## fetch를 hook 밖으로

마지막으로 꺼내는 것은 `usePaymentMethods` 안의 fetch와 변환이다. hook은 React 개념이라 view 쪽에 남는다. error handling과 retry를 넣으면 hook이 금방 부풀고, 다른 view library로 옮기면 hook은 쓸 수 없다. 반면 일반 함수는 어디서든 쓸 수 있다.

```ts
const fetchPaymentMethods = async () => {
  const response = await fetch(`${API}/payment-methods?countryCode=AU`);
  return convertPaymentMethods(await response.json());
};

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods);
  }, []);
  return { paymentMethods };
};
```

저자는 이 함수가 Anti-Corruption Layer 또는 Gateway처럼 동작한다고 쓴다. 서버 응답 구조가 바뀌어도 고칠 곳이 이 함수 하나에 머문다는 뜻이다. 다만 두 이름은 같은 것이 아니다. Fowler의 [Gateway](https://martinfowler.com/articles/gateway-pattern.html)는 외부 시스템 접근을 한곳에 감싸는 객체이고, Anti-Corruption Layer는 Eric Evans의 DDD에서 온 말로 의미 체계가 다른 외부 모델이 내 모델을 오염시키지 않게 번역하는 경계다. 이 예제의 서버 응답은 `{ name }` 하나라 번역할 의미 차이가 거의 없으므로, 필자는 Gateway가 더 정확한 이름이라고 본다. 서버가 다른 팀 소유의 레거시라 결제 수단의 의미 자체가 다를 때 같은 자리가 Anti-Corruption Layer가 된다.

최종 구조는 이렇다. render는 component에, state는 hook에, 규칙은 domain object에, 네트워크 요청은 함수에 있다.

![Payment와 하위 component, useRoundUp과 usePaymentMethods hook, PaymentStrategy와 PaymentMethod domain object, Fetcher가 각자의 칸에 놓인 최종 구조](12.png?w=720)

저자는 이렇게 나눈 결과로 다섯 가지 이점을 든다. 결함이 있는 자리를 찾기 쉬워진다. 코드를 재사용하고 조합하기 쉬워진다. 읽기 쉬워진다. 기능을 더해도 전체가 흔들리지 않는다. 그리고 domain logic이 view를 모르므로 view layer만 갈아 끼울 수 있다. 마지막 것에는 저자 스스로 대부분의 프로젝트에서는 매우 드문 일이라는 단서를 단다. 다섯 모두 측정치는 없다는 점도 같이 기억해 둘 만하다.

여기까지가 원문의 줄거리다. 그런데 이 코드를 실제로 돌려 보면 글에서는 보이지 않던 것이 나온다.

## 예제를 돌려 보면 보이는 것

필자는 저자의 예제 저장소(커밋 16개, 마지막 커밋 `de186c5`)를 받아 `tsc --noEmit`과 테스트 7개를 돌렸다. 둘 다 통과했고, 원문에 정의가 빠진 helper도 저장소의 `src/utils.ts`에 있었다. 그런데 구조를 들여다보니 옮겨 쓰기 전에 알아야 할 것이 셋 있었다.

### 매 render마다 새로 만드는 Strategy

결제 component는 Strategy를 prop으로 받고, 넘기지 않으면 기본값을 `new`로 만든다. 그리고 `useRoundUp`은 그 Strategy를 `useMemo`의 dependency에 넣는다.

```tsx
export const Payment = ({
  amount,
  strategy = new PaymentStrategy("$", roundUpToNearestInteger),
}: { amount: number; strategy?: PaymentStrategy }) => {
  const { total, tip } = useRoundUp(amount, strategy); // 안에서 [agreeToDonate, amount, strategy]
  // ...
};
```

JavaScript의 default parameter는 [호출할 때마다 평가된다](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters). 그리고 `useMemo`는 dependency를 `Object.is`로 비교한다. 둘이 만나면 render마다 새 인스턴스가 생기고 memo는 매번 다시 계산한다. React 18에서 같은 구조를 네 번 render했더니 기본값을 쓸 때 계산이 4번, 같은 인스턴스를 넘길 때 1번 돌았다. 저장소의 `App.tsx`는 `<Payment amount={19.9} />`로 Strategy를 넘기지 않으므로 앱의 실행 경로가 정확히 기본값 쪽이다.

이 예제의 계산은 덧셈 몇 번이라 비용은 없다. 문제는 구조다. Strategy를 누가 어디서 만들어 넘기는지가 글에도 저장소에도 정해져 있지 않고, 테스트만 일본과 덴마크 인스턴스를 만든다. 필자라면 인스턴스를 module 수준 상수로 두고 나라 코드로 꺼내 넘기겠다.

```ts
const strategies = {
  AU: new CountryPayment("$", (n) => Math.floor(n + 1)),
  JP: new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100),
} as const;

<Payment amount={amount} strategy={strategies[countryCode]} />
```

### 저장소의 fetch에는 dependency 배열이 없다

원문 코드의 `useEffect`에는 `[]`가 있지만, 저장소의 `usePaymentMethods`에는 첫 커밋부터 마지막 커밋까지 dependency 배열이 없다. 배열이 없는 effect는 render마다 다시 돈다. 응답이 오면 새 배열로 state를 바꾸고, 그것이 render를 일으키고, effect가 다시 fetch한다. `convertPaymentMethods`가 매번 새 배열을 돌려주므로 멈추지 않는다.

fetch를 바로 응답하는 mock으로 바꾸고 Jest에서 300ms 동안 호출 수를 세면 네 번 재서 152, 225, 231, 233번이 나왔다. `[]`를 넣으면 1번이다. 저장소의 테스트는 화면에 문구가 뜨는지만 보므로 이 반복을 잡지 못하고 전부 통과한다. 원문을 따라 친 독자에게는 이 문제가 없고, 저장소를 그대로 받아 쓸 때만 걸린다.

### 국가 코드를 prop으로 받는 순간 생기는 race

원문 코드의 fetch effect에도 cleanup이 없다. React 공식 문서의 [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)는 effect 안에서 fetch하면 늦게 도착한 이전 응답이 최신 응답을 덮을 수 있으므로 `ignore` 플래그로 이전 응답을 버리라고 한다. 원문은 mount 때 한 번만 fetch하므로 지금은 문제가 없다. 하지만 URL의 `countryCode=AU`를 prop으로 받는 순간 dependency가 생기고 race가 열린다. 필자는 이 구조를 옮길 때 처음부터 이렇게 쓰겠다.

```ts
useEffect(() => {
  let ignore = false;
  fetchPaymentMethods(countryCode).then((methods) => {
    if (!ignore) setPaymentMethods(methods);
  });
  return () => { ignore = true; };
}, [countryCode]);
```

하나 더 덧붙이면, 원문의 올림은 `Math.floor(amount + 1)`이라 금액이 이미 정수면 1을 더 올린다. 20달러 주문은 21달러가 된다. 원문은 19.80달러와 3312엔만 예로 들어 이것이 의도인지 알 수 없다. 실제 서비스에 옮긴다면 `Math.ceil`과 무엇이 다른지부터 정해야 한다.

## 이 구조는 언제 쓰는가

저자 스스로 나누는 것은 고정 규칙이 아니라고 말한다. 작고 응집된 component는 한 파일에 두는 편이 동작을 이해하기 쉽고, 경계할 것은 파일이 이해할 수 없을 만큼 커지는 것이다. Todo 앱이나 폼 하나짜리 앱은 전부 component에 넣어도 괜찮고, 예제는 패턴을 많이 보여 주려고 일부러 복잡하게 만들었다고 밝힌다. 다른 자료들도 같은 방향의 단서를 단다.

Fowler는 같은 layering 글에서 이 구분을 비교적 작은 단위에만 쓰라고 한다. view, model, data를 최상위 폴더로 두는 것은 작은 시스템에서는 괜찮지만, 어느 하나가 너무 커지면 최상위를 도메인 단위로 나누고 그 안을 layer로 나누라는 것이다. 앞에서 본 `components/`, `hooks/`, `models/` 폴더를 큰 앱의 최상위 구조로 그대로 옮기면 Fowler가 피하라고 한 모양이 된다.

Dan Abramov도 비슷한 이력을 가지고 있다. 2015년에 [presentational과 container component](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)로 나누자고 했다가, 2019년에 글머리에 이제는 그렇게 나누기를 권하지 않는다는 갱신문을 붙였다. Hooks가 같은 일을 임의의 구분 없이 해 준다는 이유였고, 필요도 없이 교조적으로 강제되는 것을 너무 많이 봤다고 덧붙였다. 원문의 hook 추출은 이 갱신문이 말하는 방식에 가깝다. container라는 이름의 component를 따로 두지 않고, hook을 부르는 `Payment`가 그 역할을 겸한다.

fetch에 대해서는 React 공식 문서가 한 걸음 더 간다. [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)는 fetch logic을 custom hook으로 빼 두면 나중에 더 나은 전략으로 옮기기 쉽다고 하면서도, 1순위로는 framework의 내장 fetching이나 TanStack Query 같은 client cache를 권한다. 원문의 마지막 단계처럼 fetch를 일반 함수로 빼 두면 그 함수를 그대로 TanStack Query의 `queryFn`에 넘길 수 있고, 앞 절의 race와 반복 호출은 library가 맡는다. 필자는 이 점이 원문이 한 문장으로만 언급한 가장 실용적인 이득이라고 본다. 키와 함수를 묶는 방식은 [queryKey](/260104)에서 따로 다뤘다.

정리하면 필자의 판단은 이렇다. 원문의 순서(hook, pure component, domain object, Strategy, network client)는 그대로 따를 만하다. 단계마다 그 단계의 불편이 다음 단계의 이유가 되기 때문이다. 다만 끝까지 가야 하는 것은 아니고, 지금 겪는 불편이 어느 단계의 것인지 보고 거기서 멈추면 된다. render와 무관한 코드가 많으면 hook까지, 같은 판정이 흩어져 있으면 domain object까지, 변경 하나에 여러 파일을 고치고 있으면 Strategy까지다. 그리고 Strategy를 쓴다면 인스턴스를 만드는 자리를 먼저 정하고, fetch를 effect에 둔다면 cleanup과 dependency부터 쓴다. 원문이 생략한 이 두 가지가 실제로 옮겨 쓸 때 가장 먼저 깨지는 곳이었다.

정답은 없지만, 이 글을 읽는 독자 분들도 자기 코드가 지금 몇 번째 단계의 불편을 겪고 있는지 한 번 짚어 보기를 바란다.

:::ref
[docs] [Microsoft Azure Architecture Center, Anti-corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
[article] [Juntao Qiu, Headless Component](https://martinfowler.com/articles/headless-component.html)
[article] [Juntao Qiu, Data Fetching Patterns in Single-Page Applications](https://martinfowler.com/articles/data-fetch-spa.html)
:::
