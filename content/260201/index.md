---
emoji: 🧩
title: "추상화"
date: "2026-02-01"
categories: 프론트엔드 설계 추상화
---

이번 포스팅에서는 프로그래밍에서의 추상화, 그리고 추상화 관점에서 좋은 코드를 작성하는 방법에 대한 이야기를 해보려고 한다.

필자는 프론트엔드 개발을 하면서 "이 로직을 어디까지 분리해야 하지?", "이 컴포넌트를 어떤 단위로 쪼개야 하지?"라는 고민을 수도 없이 해왔다. 처음에는 단순히 공통된 부분을 뽑아내면 그게 추상화라고 생각했다. 반복되는 코드를 함수로 만들고, 비슷한 컴포넌트의 공통점을 추출해서 하나로 합치는 것. 그런데 이렇게 만들어진 코드가 시간이 지나면서 오히려 손대기 어려운 괴물이 되어가는 경험을 몇 번 하고 나니, 추상화라는 것에 대해 다시 생각해보게 되었다.

이 글에서는 추상화의 본질이 무엇인지, 그리고 프론트엔드 개발에서 추상화를 어떻게 활용해야 좋은 코드를 만들 수 있는지에 대해 필자가 고민해온 내용들을 정리해보려 한다.

---

## 추상과 추상화, 이 단어가 의미하는 것

본격적인 이야기에 앞서, "추상"과 "추상화"라는 단어가 프로그래밍에서 정확히 무엇을 의미하는지 짚고 넘어가려 한다. 이 두 단어는 비슷해 보이지만 성격이 꽤 다르다.

**추상(Abstract)**은 상태이자 속성이다. "이것은 추상적이다"라고 말할 때, 그것은 구체적인 세부사항이 생략되어 있고 핵심적인 개념만 남아있는 상태를 뜻한다. Java나 TypeScript에서 `abstract` 키워드가 붙은 클래스나 메서드가 바로 이런 의미이다. 아직 구체적인 구현이 채워지지 않은, 본질적인 형태만 정의된 미완성의 설계도인 것이다.

**추상화(Abstraction)**는 과정이자 행위이다. 복잡한 대상에서 핵심적인 특징만 남기고 불필요한 세부사항을 제거하여 단순화하는 과정 자체를 말한다. 중요한 것은, 추상화는 "대충 뭉뚱그리는 것"이 아니라 **각 수준에서 정확하게 역할을 정의하는 행위**라는 점이다.

일상에서 "추상적"이라는 말은 흔히 "모호하다"는 뉘앙스로 쓰인다. 하지만 프로그래밍에서의 추상화는 정반대이다. Edsger Dijkstra는 이렇게 말한 적이 있다.

> "추상화의 목적은 모호해지는 것이 아니라, 절대적으로 정확할 수 있는 새로운 의미 수준을 만드는 것이다."

MIT의 John V. Guttag도 비슷한 맥락에서 이렇게 정의했다.

> "추상화의 본질은 주어진 맥락에서 관련 있는 정보를 보존하고, 관련 없는 정보를 잊는 것이다."

결국 추상과 추상화를 구분해서 이해하면 이렇다. 추상은 "핵심만 남은 상태"이고, 추상화는 "핵심만 남기는 과정"이다. 우리가 코드를 설계할 때 하는 일은 바로 이 추상화, 즉 복잡한 구현에서 핵심적인 인터페이스만 남기고 나머지를 감추는 과정인 것이다.

그렇다면 이런 추상화가 프로그래밍에서 왜 필요한 걸까?

---

## 추상화는 왜 필요한가

추상화가 프로그래밍에서 필요한 근본적인 이유는 의외로 단순하다. **더 복잡한 것을 만들기 위해서**이다.

우리가 매일 사용하는 React만 해도 그렇다. 컴포넌트 하나를 렌더링하기 위해 내부적으로는 Virtual DOM 생성, 재조정(Reconciliation), 실제 DOM 조작이라는 복잡한 과정이 일어난다. 하지만 우리는 그런 걸 신경 쓰지 않고 JSX를 작성하면 된다. React가 이 복잡한 과정을 추상화해주었기 때문이다.

```tsx
// 이 한 줄 뒤에는 VDOM 생성, diffing, DOM 패치라는 복잡한 과정이 숨어있다.
// 하지만 우리는 그걸 몰라도 UI를 만들 수 있다.
<UserProfile name="jihoon" />
```

예전에는 Webpack을 직접 설정하는 것이 프론트엔드 개발자의 일상이었지만, 지금은 Next.js나 Vite 같은 프레임워크가 번들링 설정을 추상화해버렸다. 덕분에 우리는 번들러의 내부 동작을 몰라도 애플리케이션을 개발할 수 있게 되었고, 그 시간에 비즈니스 로직이나 사용자 경험 같은 더 고차원적인 문제에 집중할 수 있게 되었다.

결국 추상화의 핵심 가치는 이것이다. 복잡한 것을 감추어 단순하게 보이도록 만들고, 각자가 자신의 영역에만 집중할 수 있게 해주는 것. 이 덕분에 우리는 혼자서 모든 것을 이해하지 않아도 점점 더 거대하고 복잡한 소프트웨어를 만들어낼 수 있게 된 것이다.

그렇다면 추상화가 이렇게 좋은 것이라면, 무조건 많이 하면 좋은 걸까?

---

## 추상화의 본질은 맥락을 줄여주는 것이다

많은 개발자들이 추상화를 "공통된 부분을 추려내는 것"이라고 인식하고 있다. 틀린 말은 아니지만, 이것은 추상화를 수행하는 기법 중 하나일 뿐 추상화의 본질을 설명해주지는 못한다.

필자가 생각하는 추상화의 본질은 **"코드를 읽는 사람이 알아야 할 맥락을 적절한 수준으로 줄여주는 것"**이다.

간단한 예시를 보자.

```typescript
type Order = { id: string; status: "pending" | "completed"; amount: number };

const orders: Order[] = [
  { id: "a", status: "pending", amount: 10000 },
  { id: "b", status: "completed", amount: 5000 },
  { id: "c", status: "completed", amount: 8000 },
];

let total = 0;
for (let i = 0; i < orders.length; i++) {
  if (orders[i].status === "completed") {
    total += orders[i].amount;
  }
}
```

이 코드를 읽는 개발자는 반복문의 초기화·조건·증감을 파악하고, 인덱스로 원소에 접근하고, 조건을 확인해 분기하고, 외부의 누적 변수가 어떻게 갱신되는지까지 전부 머릿속에 담아야 한다. 정작 이 코드가 하려는 일은 **"완료된 주문들의 합계를 구한다"**는 한 문장인데, 그 한 문장을 이해하기 위해 네 가지 다른 맥락을 동시에 끌어안고 있는 셈이다.

```typescript
const total = orders
  .filter((order) => order.status === "completed")
  .reduce((sum, order) => sum + order.amount, 0);
```

`filter`와 `reduce`라는 추상화 덕분에 개발자는 "완료된 주문만 골라낸다"와 "금액을 누적한다"는 두 가지 의도만 따라가면 된다. 인덱스 관리, 누적 변수의 선언과 갱신이라는 맥락은 코드 표면에서 사라졌다.

여기서 한 걸음 더 나아갈 수도 있다.

```typescript
const total = sumCompletedOrders(orders);
```

이제 코드를 읽는 사람은 이 계산이 배열 순회를 통해 이루어진다는 사실조차 알 필요가 없다. "완료된 주문들의 총액을 구한다"는 비즈니스 의도만 남아있을 뿐이다. 코드가 **어떻게(How) 계산되는지**가 아니라 **무엇을(What) 계산하는지**에 집중할 수 있게 된 것이다.

이 관점에서 보면, 우리가 매일 작성하는 React 코드도 수많은 추상화의 조합이라는 사실을 알 수 있다.

```tsx
import { css } from "@emotion/css";
import { format } from "date-fns";

const TodayHeader = () => {
  const now = new Date(); // Date 객체 생성이라는 복잡한 과정을 추상화
  const formatted = format(now, "yyyy-MM-dd"); // 날짜 포맷팅 로직을 추상화

  return (
    <h1
      className={css`
        font-size: 1.8rem;
      `}
    >
      {" "}
      {/* CSS-in-JS 처리 과정을 추상화 */}
      Today is {formatted}
    </h1> // React.createElement를 추상화
  );
};

// 그리고 위 모든 것을 다시 추상화
<TodayHeader />;
```

만약 `emotion`, `date-fns`, `react`의 내부 코드가 전부 이 컴포넌트 파일에 펼쳐져 있다면 어떨까? 어디서부터 읽어야 할지, 어떤 부분이 비즈니스 로직이고 어떤 부분이 라이브러리 코드인지 구분하기 어려울 것이다. 추상화가 각 영역의 맥락을 적절히 감춰주었기 때문에 우리는 "오늘 날짜를 보여준다"는 본질에만 집중할 수 있는 것이다.

그렇다면 실제로 코드를 설계할 때, 추상화를 어떤 방향으로 접근해야 할까?

---

## 추상화 수준이 높다, 낮다는 것

추상화를 이야기할 때 빠질 수 없는 개념이 **추상화 수준(Level of Abstraction)**이다. 코드의 추상화 수준이 "높다" 혹은 "낮다"는 것은 도대체 무슨 뜻일까?

**추상화 수준이 낮은 코드**는 컴퓨터가 수행하는 구체적인 절차에 가까운 코드이다. 문자열을 직접 파싱하고, 인덱스로 배열을 순회하고, 바이트를 조작하는 것. **어떻게(How)** 동작하는지가 적나라하게 드러나 있다.

**추상화 수준이 높은 코드**는 비즈니스 도메인이나 문제 영역의 언어로 표현된 코드이다. `checkout(cart)`, `approveRequest(id)`, `publishArticle(draft)` 같은 것. **무엇을(What)** 하는지가 드러나 있고, 어떻게 하는지는 감춰져 있다.

Robert C. Martin은 *Clean Code*에서 이 개념을 **"함수당 하나의 추상화 수준(One Level of Abstraction per Function)"**이라는 원칙으로 정리했다. 하나의 함수 안에 높은 수준과 낮은 수준의 코드가 섞여 있으면, 읽는 사람은 "이게 핵심 로직인가, 아니면 세부 구현인가?"를 매 줄마다 판단해야 하기 때문이다.

실제 코드로 보면 이 문제가 명확해진다.

```typescript
// 추상화 수준이 뒤섞인 함수
async function registerUser(name: string, email: string, password: string) {
  // 높은 수준: 입력 검증
  if (!name || !email) throw new Error("Invalid input");

  // 낮은 수준: 이메일 정규식 직접 검사
  const emailRegex = /^[A-Za-z0-9+_.-]+@(.+)$/;
  if (!emailRegex.test(email)) throw new Error("Invalid email");

  // 낮은 수준: 비밀번호 해싱 직접 구현
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashedPassword = btoa(
    String.fromCharCode(...new Uint8Array(hashBuffer)),
  );

  // 높은 수준: 사용자 저장
  const user = { name, email, password: hashedPassword };
  await userRepository.save(user);

  // 높은 수준: 환영 이메일 발송
  await sendWelcomeEmail(user);
}
```

이 함수를 읽는 사람은 "사용자 등록 흐름"이라는 높은 수준의 맥락을 따라가다가, 갑자기 정규식 패턴과 해시 버퍼 조작이라는 낮은 수준의 맥락으로 끌려 내려간다. 그러다 다시 `userRepository.save`라는 높은 수준으로 점프한다. 이렇게 추상화 수준이 오르락내리락하면, 읽는 사람의 머릿속도 함께 오르락내리락하게 된다.

같은 함수를 추상화 수준을 맞춰서 다시 작성하면 이렇게 된다.

```typescript
// 추상화 수준이 일관된 함수
async function registerUser(name: string, email: string, password: string) {
  validateInput(name, email);
  const hashedPassword = await hashPassword(password);
  const user = createUser(name, email, hashedPassword);
  await userRepository.save(user);
  await notificationService.sendWelcomeEmail(user);
}
```

모든 문장이 같은 높이의 추상화 수준에서 이야기하고 있다. 이메일 검증이 어떤 정규식을 쓰는지, 비밀번호 해싱이 어떤 알고리즘을 쓰는지는 각각의 하위 함수가 책임진다. 이 함수를 읽는 사람은 오직 "사용자 등록의 전체 흐름"이라는 하나의 맥락에만 집중하면 된다.

Martin은 이것을 **"내리막 규칙(The Stepdown Rule)"**이라고도 부른다. 코드를 위에서 아래로 읽을 때, 마치 신문 기사처럼 위에는 큰 그림이, 아래로 내려갈수록 세부사항이 나와야 한다는 것이다.

Kent Beck도 *Smalltalk Best Practice Patterns*에서 동일한 원칙을 **Composed Method 패턴**으로 제시했다.

> "프로그램을 하나의 식별 가능한 작업을 수행하는 메서드들로 나누고, 하나의 메서드 안의 모든 연산은 같은 추상화 수준에 있어야 한다."

결국 이 모든 이야기가 하나로 귀결된다. **하나의 함수는 하나의 추상화 수준에서만 이야기해야 한다.** 이것만 지켜도 코드의 가독성은 눈에 띄게 달라진다.

그렇다면 추상화의 방향은 어떻게 잡아야 할까? 구체적인 것에서 시작해야 할까, 추상적인 것에서 시작해야 할까?

---

## 공통점 추출이 아닌, 부품의 조립으로 생각하기

OOP에서 흔히 말하는 "구체적인 것들의 공통점을 뽑아내어 추상적인 것을 정의하라"는 가이드라인이 있다. 이 접근법 자체가 틀린 것은 아니지만, 필자는 이 방식에 너무 얽매이면 현재의 요구사항에 갇힌 설계를 만들어낼 위험이 있다고 생각한다.

예를 들어보자. 요구사항에 A, B, C라는 버튼이 있고, 세 버튼 모두 파란색 둥근 모양이며 차이점은 라벨 텍스트뿐이라고 하자.

```tsx
// 공통점을 뽑아낸 설계
const BlueRoundButton = ({ label }: { label: string }) => {
  return <button className="blue round">{label}</button>;
};
```

현재 요구사항은 완벽하게 충족된다. 그런데 며칠 뒤 기획자가 말한다.

> "B 버튼의 색상을 변경할 수 있게 해주세요."

이 순간 `BlueRoundButton`이라는 이름부터 어색해진다. 색상 prop을 추가하면 되긴 하지만, 애초에 "파란색 둥근 버튼"이라는 구체적인 공통점에서 출발한 설계가 변경에 취약했던 것이다. (이 정도는 양반이다. 현실에서는 "버튼을 둥글게 말고 네모로 바꿔주세요"가 날아온다)

이런 상황이 반복되다 보면 자연스럽게 깨닫게 되는 것이 있다. **구체적인 요구사항에서 공통점을 뽑아내는 방식은, 추상화된 결과물마저도 현재의 요구사항만을 반영하게 되기 쉽다**는 것이다.

그래서 필자가 선호하는 접근은 반대 방향이다. 구체적인 것에서 추상을 뽑아내는 것이 아니라, **추상적인 부품들을 먼저 생각하고 이것들을 조립하여 구체적인 것을 만드는 방식**이다.

토스트 알림 컴포넌트를 만든다고 생각해보자. 처음 요구사항은 단순하다. "저장이 완료되면 하단에 짧은 안내 메시지를 띄워주세요." 공통점 추출 방식으로 접근하면 이렇게 된다.

```tsx
// 현재 요구사항의 공통 특성에서 출발한 설계
type ToastProps = {
  message: string;
  hasAction?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

const Toast = ({ message, hasAction, actionLabel, onAction }: ToastProps) => (
  <div className="toast">
    <span>{message}</span>
    {hasAction && <button onClick={onAction}>{actionLabel}</button>}
  </div>
);
```

현재 요구는 완벽히 다뤄진다. 그런데 며칠 뒤 기획자가 "성공 / 경고에 따라 왼쪽에 아이콘을 넣어주세요"라고 말한다. `hasIcon`, `iconName`이 추가된다. 곧이어 "업로드 진행률 바가 붙은 토스트도 필요해요"라는 요구가 날아온다. `progress` prop이 또 하나 늘어난다. 이 과정을 몇 번 반복하고 나면 `Toast`는 열 개가 넘는 props를 가진 채, **이 조합은 되고 저 조합은 안 되는** 숨겨진 규칙까지 암기해야 하는 컴포넌트가 된다. (그리고 대개 그 규칙은 주석으로도 남지 않는다)

애초에 **"토스트는 이런 모양이어야 한다"는 현재 시점의 구체적 상(像)**에서 출발한 설계가 변경에 취약했던 것이다.

부품 조립 방식으로 접근하면 이야기가 달라진다.

```tsx
// 부품을 조립하는 설계
const Toast = ({ children }: PropsWithChildren) => (
  <div className="toast">{children}</div>
);

Toast.Icon = ({ name }: { name: "check" | "warn" | "info" }) => {
  /* ... */
};
Toast.Message = ({ children }: PropsWithChildren) => <span>{children}</span>;
Toast.Action = ({
  children,
  onClick,
}: PropsWithChildren<{ onClick: () => void }>) => (
  <button onClick={onClick}>{children}</button>
);
Toast.Progress = ({ value }: { value: number }) => {
  /* ... */
};

// 필요한 부품만 골라 조립한다
<Toast>
  <Toast.Message>저장되었습니다</Toast.Message>
</Toast>;

<Toast>
  <Toast.Icon name="check" />
  <Toast.Message>업로드 완료</Toast.Message>
  <Toast.Action onClick={undo}>실행 취소</Toast.Action>
</Toast>;

<Toast>
  <Toast.Progress value={0.4} />
  <Toast.Message>파일 전송 중...</Toast.Message>
</Toast>;
```

"토스트는 무언가를 담는 얕은 컨테이너"라는 변하지 않는 본질과, "그 안에 무엇이 담기는가"라는 변하기 쉬운 구체가 분리되었다. 이제 `Toast` 내부를 건드리지 않고도 새로운 부품을 얼마든지 추가하거나, 기존 부품을 새로운 조합으로 배치할 수 있다. prop 조합의 유효성 규칙도 사라진다. 단순히 **넣고 싶은 것을 넣으면 되는 것**이다.

물론 경험이 많은 개발자라면 "처음부터 IoC로 설계하면 되는 거 아니냐"고 할 수 있다. 맞는 말이다. 하지만 그런 판단이 가능한 이유는 과거에 수많은 삽질을 통해 "어디가 변경되기 쉬운 부분인지"에 대한 감각이 쌓였기 때문이다. (쉽게 말해 짬바다)

이런 감각이 아직 부족한 상황이라면, "이 기능은 어떤 부품들로 이루어져 있고, 각 부품은 어떻게 조립되어야 하는가"라는 질문에서 출발하는 것이 변경에 열린 설계를 만들어내기 훨씬 수월하다.

여기까지 읽으면 자연스럽게 떠오르는 질문이 하나 있다. 그렇다면 부품을 어떤 기준으로 나누고, 외부에 어떻게 표현해야 할까?

---

## 좋은 추상화를 위한 세 가지 원칙

### 1. 표현에 대해 고민하기

추상화된 모듈의 가장 중요한 덕목은, 소스코드를 까보지 않아도 동작을 유추할 수 있어야 한다는 것이다. Kent Beck은 이것을 **"의도를 드러내는 이름(Intention-Revealing Name)"** 패턴이라고 불렀고, 이름을 간결하게 지을 수 없다면 추상화 자체를 다시 고민해봐야 한다고 말했다.

우리가 이를 위해 사용할 수 있는 도구는 크게 두 가지다. **이름**과 **타입**이다.

```typescript
// 이름과 타입만으로 동작을 유추할 수 있는 함수
function addDays(date: Date, amount: number): Date;

// 도대체 뭘 하는 건지 알 수 없는 함수
function add(a: any, b: any): any;
```

`addDays`는 이름만 봐도 날짜에 일수를 더한다는 것을 알 수 있고, `Date`를 받아서 `Date`를 반환한다는 타입 정보가 이를 뒷받침한다. 내부에서 `Date.prototype.getDate`를 어떻게 다루는지 같은 구현 세부사항은 몰라도 된다.

반면 `add(a: any, b: any): any`는? 뭘 더하는 건지, 결과가 뭔지 전혀 감을 잡을 수 없다. 결국 소스코드를 까봐야만 사용할 수 있게 되고, 추상화의 장점을 잃어버리는 것이다.

이때 이름을 짓는 방식 자체가 추상화 수준을 반영한다는 점에 주목할 필요가 있다. 프로그래밍에서 함수 이름은 대체로 **동사 + 명사** 조합으로 이루어지는데, 어떤 동사를 선택하느냐에 따라 그 함수가 어느 수준의 추상화에서 동작하는지가 드러난다.

추상화 수준이 **낮은** 쪽에서 자주 쓰이는 동사들이 있다. `parse`, `encode`, `decode`, `serialize`, `read`, `write`, `push`, `pop` 같은 것들이다. 이 단어들은 데이터의 물리적인 변환이나 자료구조의 직접적인 조작을 암시한다.

중간 수준에서는 `fetch`, `save`, `load`, `validate`, `convert`, `transform` 같은 동사들이 등장한다. 기술적인 동작이지만, 그 동작의 의도가 어느 정도 드러나는 수준이다.

추상화 수준이 **높은** 쪽에서는 `register`, `checkout`, `approve`, `publish`, `submit` 같은 동사들이 쓰인다. 이 단어들은 비즈니스 도메인의 언어이다. 내부에서 어떤 기술적 절차가 일어나는지는 전혀 드러나지 않고, **사용자의 행위나 비즈니스 프로세스**만이 표현된다.

```typescript
// 낮은 수준: 기술적 동작이 드러남
function parseJSON(text: string): object;
function encodeBase64(data: Uint8Array): string;

// 중간 수준: 의도가 드러나되 기술적 맥락이 남아있음
function fetchUserById(id: string): Promise<User>;
function validateEmail(email: string): boolean;

// 높은 수준: 비즈니스 의도만 드러남
function registerUser(form: RegistrationForm): Promise<User>;
function approveLeaveRequest(requestId: string): Promise<void>;
```

Robert C. Martin은 *Clean Code*에서 이에 대해 **"짧고 수수께끼 같은 이름보다 길고 서술적인 이름이 낫다"**고 말했다. 또한 **"하나의 개념에는 하나의 단어를 사용하라"**는 원칙도 제시했는데, 같은 맥락의 동작에 `fetch`, `retrieve`, `get`을 혼용하면 읽는 사람이 "이 셋이 다른 동작인가?"라고 혼란을 겪게 되기 때문이다.

이 원칙은 React 컴포넌트와 훅의 네이밍에도 그대로 적용된다.

```tsx
// 컴포넌트: 추상화 수준에 따라 이름의 구체성이 달라진다
<Button />                // 낮은 수준: 범용 UI 프리미티브
<SearchInput />           // 중간 수준: UI + 맥락이 결합
<SubmitOrderButton />     // 높은 수준: 비즈니스 의도가 이름에 담김

// 이벤트 핸들러: on*은 선언적 인터페이스, handle*은 구현
<Form onSubmit={handleSubmit} />           // on = 외부에 노출하는 이름
const handleSubmit = (data: FormData) => { // handle = 내부 구현의 이름
  await registerUser(data);
};

// 훅: use + 목적을 나타내는 이름
const user = useAuth();                    // 인증 상태를 관리하는 훅
const [items, setItems] = useCartItems();  // 장바구니 항목을 관리하는 훅
const { isOpen, toggle } = useModal();     // 모달 상태를 관리하는 훅
```

Jeff Atwood는 *Coding Horror*에서 `Manager`라는 접미사의 문제를 지적한 적이 있다. `UrlManager`라는 이름은 URL을 풀링하는 건지, 검증하는 건지, 생성하는 건지 전혀 알 수 없다. `UrlBuilder`, `UrlValidator`, `UrlPool`처럼 구체적인 역할을 드러내는 이름이 훨씬 낫다. 이름이 모호하다는 것은, 그 모듈의 책임 자체가 모호하다는 신호일 수 있는 것이다.

결국 좋은 이름이란 **그 코드가 어떤 추상화 수준에서 동작하는지를 읽는 사람에게 즉시 알려주는 이름**이다.

### 2. 입력의 자유도를 의도적으로 설계하기

추상화된 모듈을 설계할 때 자주 마주치는 고민이 있다. "기능을 어디까지 열어줄 것인가?"이다. 이 결정에 따라 모듈을 사용하는 개발자의 경험이 크게 달라진다.

```tsx
// 기능이 닫힌 컴포넌트
const Button = ({ children }: PropsWithChildren) => {
  return <button>{children}</button>;
};

// 기능이 완전히 열린 컴포넌트
const Button = (props: ComponentProps<"button">) => {
  return <button {...props} />;
};
```

첫 번째 버튼은 `children`만 받을 수 있다. `onClick`도, `type`도, `disabled`도 설정할 수 없다. 대신 사용하는 사람은 고민할 것이 없다.

두 번째 버튼은 `button` 엘리먼트의 모든 속성을 받을 수 있다. 자유도가 높지만, 사용하는 입장에서는 수십 개의 prop 중 뭘 써야 할지 고민하게 된다. 필자는 이런 상황을 **"컴포넌트가 개발자에게 고민을 강요한다"**고 표현한다.

정답은 없다. 다만 모듈의 목적과 사용자에 따라 적절한 수준을 찾아야 한다. 디자인 시스템의 기본 버튼이라면 제한된 Props로 일관성을 지키는 것이 나을 수 있고, 범용 유틸리티 컴포넌트라면 유연하게 열어주는 것이 나을 수 있다.

비유하자면 신디사이저와 디지털 피아노의 차이와 같다. 오디오 전문가에게는 파형을 직접 다룰 수 있는 신디사이저가 적합하지만, 단순히 피아노를 치고 싶은 사람에게는 기능이 제한된 디지털 피아노가 더 좋은 경험을 제공한다. **사용자가 원리를 알 필요가 없는 상황에서 넓은 입력을 제공하면 혼란만 가중되고, 반대로 다양한 상황에 대응해야 하는데 입력을 제한하면 사용처가 막혀버린다.**

### 3. 추상화의 단위를 적절하게 유지하기

추상화의 단위, 즉 "어디까지를 하나의 모듈로 묶을 것인가"도 중요한 고민이다.

프론트엔드에서 흔히 보는 안티패턴 중 하나는 Custom Hook의 과도한 추출이다.

```tsx
// 이 훅은 단 하나의 컴포넌트에서만 사용된다
const useUserProfileData = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
};
```

하나의 컴포넌트에서만 사용되는 로직을 굳이 훅으로 분리하면, 오히려 코드를 읽는 사람이 두 개의 파일을 오가며 맥락을 파악해야 한다. 추상화가 맥락을 줄여주기는커녕 늘려버린 것이다.

반대로, 하나의 훅에 너무 많은 것을 담는 것도 문제다.

```tsx
// 관련 없는 관심사가 하나의 훅에 뒤섞여 있다
const useEverything = () => {
  const auth = useAuth();
  const theme = useTheme();
  const analytics = useAnalytics();
  const toast = useToast();
  // ...20줄 더
  return { auth, theme, analytics, toast /* ... */ };
};
```

이런 "God Hook"은 테스트하기 어렵고, 한 가지를 수정하면 관련 없는 부분까지 영향을 받을 수 있다.

React 공식 문서에서도 이런 말을 하고 있다.

> "처음부터 Hook으로 분리해야 한다는 압박을 느낄 필요는 없다."

추상화의 적절한 단위를 판단하는 기준은 **"이 분리가 코드를 읽는 사람의 맥락을 실제로 줄여주는가?"**이다. 만약 분리한 결과 오히려 맥락이 분산되어 파악이 어려워진다면, 그 추상화는 아직 때가 아닌 것이다.

---

## 가능하면 추상화를 하지 말자

여기까지 읽으면 "그래서 추상화를 언제 해야 하는 건데?"라는 질문이 남을 수 있다. 필자의 생각은 이렇다. **기본 전제는 추상화를 하지 않는 것이어야 한다.**

이것은 필자만의 생각이 아니다. Sandi Metz는 이렇게 말했다.

> "중복은 잘못된 추상화보다 훨씬 비용이 싸다. (Duplication is far cheaper than the wrong abstraction.)"

명확한 추상화 신호가 보이지 않는 한, 코드를 있는 그대로 두는 것이 잘못된 추상화를 만들어놓고 나중에 풀어헤치는 것보다 저점이 높다. 잘못된 추상화가 만들어지는 과정은 대략 이렇다.

1. 코드 A와 코드 B에서 비슷한 패턴이 보인다.
2. "DRY 원칙이니까 공통 함수로 뽑아야지!" 하고 추상화한다.
3. 코드 C에서도 비슷한 패턴이 보여서 같은 함수를 쓰되, 약간 다른 동작을 위해 매개변수를 하나 추가한다.
4. 코드 D, E에서도 사용하게 되면서 조건문과 매개변수가 계속 늘어난다.
5. 이제 이 함수는 모든 곳에서 사용되지만, 아무도 건드리기 두려워하는 코드가 된다.

```typescript
// 처음에는 단순했던 함수가...
const formatUserName = (user: User) => `${user.firstName} ${user.lastName}`;

// 요구사항이 추가될 때마다 매개변수가 늘어나고...
const formatUserName = (
  user: User,
  includeMiddleName?: boolean,
  format?: "full" | "short" | "initials",
  locale?: string,
  honorific?: boolean,
) => {
  if (format === "initials") {
    /* ... */
  }
  if (includeMiddleName && user.middleName) {
    /* ... */
  }
  if (honorific && locale === "ko") {
    /* ... */
  }
  // ...끝없는 분기
};
```

이런 상황에 빠졌다면, Sandi Metz가 제안하는 해법은 명확하다. 추상화된 코드를 각 사용처에 다시 인라인하고, 각 사용처에서 불필요한 코드를 제거한 뒤, 깨끗해진 상태에서 진짜 공통점이 보이면 그때 다시 추상화한다. **"가장 빠른 전진은 뒤로 돌아가는 것이다."**

그렇다면 추상화를 해야 할 때는 언제인가? 필자가 느끼는 **추상화 신호**는 대략 이런 것들이다.

- **일관성이 깨지고 있다.** 똑같은 로직인데 어떤 컴포넌트에서는 인라인으로, 어떤 컴포넌트에서는 별도 함수로 분리되어 있다. 같은 계산 로직이 사방에 흩어져 있다.
- **내부 구조가 외부에 불필요하게 노출되고 있다.** 외부에서 알 필요 없는 구현 세부사항을 호출자가 일일이 다루고 있다.
- **자신의 행위가 계속 노출되고 있다.** 모듈이 자기 내부의 절차를 숨기지 못하고, 사용하는 쪽에서 그 절차를 그대로 따라가야 한다.

문제는, 이런 신호를 감지하는 것 자체는 대체로 단순한데, **실제로는 이 신호를 무시하고 더 "중요한" 요구사항을 충족하는 데 집중하게 되기 쉽다**는 것이다. 일정에 쫓기거나 기능 구현에 몰두하다 보면, "일단 동작하니까 나중에 정리하자"가 되고, 그 나중은 좀처럼 오지 않는다.

여기서 한 가지 더 중요한 것은 **일관된 추상화 기준을 유지하는 것**이다. 코드베이스 안에서 같은 종류의 로직이 어떤 곳에서는 인라인으로, 어떤 곳에서는 함수로, 또 어떤 곳에서는 커스텀 훅으로 분리되어 있다면, 새로 코드를 읽는 사람은 "이 차이에 의도가 있는 건가?"라고 혼란스러워한다. 추상화를 하든 안 하든, 팀 안에서 기준이 일관되어야 한다.

Joel Spolsky가 2002년에 제시한 **"새는 추상화의 법칙(The Law of Leaky Abstractions)"**도 이 맥락에서 기억해둘 만하다.

> "모든 비자명한 추상화는 어느 정도 새는 법이다."

TCP는 불안정한 네트워크를 안정적인 연결처럼 보이게 추상화하지만, 케이블이 끊기면 그 추상화는 깨진다. React는 UI 업데이트를 선언적으로 추상화하지만, 리렌더링 최적화를 위해서는 결국 내부 동작을 이해해야 한다. 완벽한 추상화는 존재하지 않기에, 추상화를 할 때는 **"이 추상화가 깨졌을 때 사용자가 대응할 수 있는가?"**까지 고민해야 한다.

Spolsky의 말처럼 **"추상화는 우리의 작업 시간을 절약해주지만, 학습 시간을 절약해주지는 않는다."**

---

## 추상화는 체화의 영역이다

필자가 동료와 추상화에 대해 이야기를 나눈 적이 있는데, 그때 나온 이야기가 인상 깊었다. 추상화 신호를 감지하고, 적절한 시점에 적절한 수준으로 분리하는 것은 결국 **감각의 영역**이라는 것이다.

물론 앞서 이야기한 원칙들, 추상화 수준을 맞추고, 이름을 잘 짓고, 입력 자유도를 설계하는 것은 분명히 중요하다. 하지만 실제로 코드를 작성하는 순간에 이런 원칙들을 하나하나 떠올리면서 "이걸 분리할까 말까?"를 따지는 접근은 오히려 흐름을 깨뜨릴 수 있다. 마치 시합 중에 잽을 던질 때 팔꿈치 각도를 의식하면 오히려 타이밍을 놓치는 것처럼, 코드를 짤 때도 추상화는 의식적 판단이 아닌 자연스러운 감각에서 나와야 하는 것이다.

코드를 쭉 짜다가 뭔가 거부반응이 올라오는 순간이 있다. "이 로직이 여기 있으면 안 되는 것 같은데", "이 컴포넌트가 너무 많은 것을 알고 있는 것 같은데"라는 느낌. 그 느낌이 바로 추상화 신호이고, 이것을 자연스럽게 감지하고 반응할 수 있는 것이 체화인 것이다.

다만 이 감각은 하루아침에 만들어지지 않는다. 수많은 패턴을 학습하고, 다양한 코드를 읽고, 직접 삽질을 겪어봐야 비로소 **"이건 분리해야 할 것 같은데"**라는 감이 자연스럽게 올라오기 시작한다. 나중에 동료가 "왜 이걸 분리했어?"라고 물었을 때, "이건 OO이기 때문에 분리했어"라고 자연스럽게 설명할 수 있다면 그것이 체화된 것이다.

어떤 분야든 마찬가지인 것 같다. 외워서 잘하려고 하면 오히려 판단이 어려워지고, 결국은 큰 흐름만 가져가되 디테일은 자연스럽게 채워져야 한다. 그리고 그 자연스러움은 결국 평소에 쌓아놓은 다양한 패턴과 경험에서 나오는 것이다.

---

## 마치며

정리하면, 프로그래밍에서 추상화란 복잡한 것을 감추어 단순해 보이게 만들고, 코드를 읽는 사람이 필요한 맥락에만 집중할 수 있게 해주는 행위이다.

좋은 추상화를 위해 기억해둘 것들을 다시 한번 짚어보자면 이렇다.

- **기본 전제는 추상화를 하지 않는 것이다.** 명확한 신호가 보일 때 비로소 분리하자.
- 하나의 함수는 **하나의 추상화 수준**에서만 이야기하자.
- 이름과 타입으로 동작을 충분히 **표현**하여, 소스코드를 까보지 않아도 사용할 수 있게 만들자.
- 입력의 자유도를 모듈의 목적과 사용자에 맞게 **의도적으로 설계**하자.
- 잘못된 추상화 위에 덧붙이기보다, **풀어헤치고 다시 시작하는 용기**를 갖자.
- 그리고 이 모든 것을 의식하지 않아도 자연스럽게 나올 수 있도록 **다양한 패턴을 체화**하자.

물론 이 글에서 필자가 이야기한 것이 정답은 아니다. 추상화의 적절한 수준은 비즈니스 상황, 팀의 구성, 프로젝트의 성격에 따라 달라질 수 밖에 없다. 다만 한 가지 변하지 않는 것이 있다면, 추상화의 궁극적인 목적은 **사람이 이해하기 좋은 코드를 만드는 것**이라는 점이다.

이 글을 읽는 분들도 각자의 코드베이스에서 "이 추상화가 정말 맥락을 줄여주고 있는가?"라는 질문을 한번 던져보시길 바란다. 그 질문 하나만으로도 코드를 바라보는 시각이 조금은 달라질 것이라 생각한다.

---

## 참고한 자료

이 글은 여러 원전과 선행 아티클에서 많은 영감을 받았다. 직접 인용한 구절의 출처와, 사고의 틀을 잡는 데 도움이 된 글들을 함께 남긴다.

- Evan Moon, [「추상, 그리고 추상화」](https://evan-moon.github.io/2023/01/15/what-is-abstract/) — 이 글의 전체적인 구성과 **"추상화는 맥락을 줄이는 것"**이라는 관점은 이 아티클에서 가장 큰 영향을 받았다.
- 박서진, 「좋은 코드를 위한 나의 선택, 신중하게 코드 작성하기」 (Toss SLASH 23 발표) — "공통점 추출"이 아닌 **"부품의 조립"**으로 접근하라는 관점은 이 발표에서 출발했다.
- Robert C. Martin, *Clean Code* — "함수당 하나의 추상화 수준", Stepdown Rule, 의도를 드러내는 네이밍 규칙(2장, 3장).
- Kent Beck, *Smalltalk Best Practice Patterns* — Composed Method / Intention-Revealing Name 패턴.
- Sandi Metz, [“The Wrong Abstraction”](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) — 잘못된 추상화가 쌓여가는 과정과, 풀어헤치고 다시 시작하는 용기에 대한 논의.
- Joel Spolsky, [“The Law of Leaky Abstractions”](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/) — 완벽한 추상화는 존재하지 않는다는 관점.
- Edsger W. Dijkstra, "The Humble Programmer" (1972 ACM Turing Award Lecture) — 추상화의 목적에 대한 고전적 정의.
- John V. Guttag, *Introduction to Computation and Programming Using Python* — 추상화의 본질에 대한 정의.
- React 공식 문서, [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) — Hook 분리의 압박에 대한 가이드.
- Jeff Atwood, [“i-shall-call-it-somethingmanager”](https://blog.codinghorror.com/i-shall-call-it-somethingmanager/) (Coding Horror) — `Manager` 접미사의 모호함에 대한 지적.
