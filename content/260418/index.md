---
emoji: 🧩
title: "도메인 모델"
date: "2026-04-18"
categories: 프론트엔드 아키텍처 DDD
---

이번 포스팅에서는 **도메인(Domain)**, **도메인 모델(Domain Model)**, **도메인 오브젝트 모델(Domain Object Model)**, **도메인 오브젝트(Domain Object)**에 대한 이야기를 해보려고 한다.

필자는 프론트엔드 개발을 하면서 "도메인"이라는 단어를 꽤 자주 접해왔다. 코드 리뷰에서 "이건 도메인 로직이니까 컴포넌트 밖으로 빼세요", 아키텍처 논의에서 "도메인 모델을 먼저 정의합시다" 같은 말들이 오간다. 그런데 막상 "도메인이 정확히 뭔데?"라고 물어보면 명쾌하게 대답하기가 쉽지 않다. (솔직히 필자도 한동안 그냥 분위기에 맞춰 끄덕였었다)

더 혼란스러운 것은 "도메인 모델"과 "도메인 오브젝트"와 "도메인 오브젝트 모델"이 서로 어떻게 다른지, 그리고 이 개념들이 백엔드가 아닌 **프론트엔드**에서는 어떤 의미를 갖는지에 대한 정리된 글이 많지 않다는 점이다. 이 글에서는 각 개념의 정확한 정의부터 시작해서, 프론트엔드에서 도메인 로직을 어떻게 분리하고 추상화하는 것이 적합한지까지 예시와 함께 정리해보려 한다.

---

## 도메인(Domain)이란 무엇인가?

가장 기초적인 질문부터 시작해보자. **도메인**이란 무엇인가?

Eric Evans는 그의 저서 *"Domain-Driven Design: Tackling Complexity in the Heart of Software"(2003)*에서 도메인을 다음과 같이 정의한다.

> "A sphere of knowledge, influence, or activity."
> (지식, 영향력, 또는 활동의 영역)

쉽게 말해, **프로그래밍으로 해결하고자 하는 문제 영역** 그 자체가 도메인이다. 세금 신고 서비스를 만든다면 "세금 신고"가 도메인이고, 보험 청구 플랫폼을 만든다면 "보험 청구"가 도메인인 것이다. 도메인은 코드가 아니다. 소프트웨어 이전에 존재하는 현실 세계의 문제 영역이다.

프론트엔드 개발자에게 이것은 어떤 의미일까? 우리가 만드는 UI는 결국 이 도메인을 사용자에게 보여주고 조작할 수 있게 해주는 **창(window)**이다. 토스인컴 같은 세금 환급 서비스를 개발한다면, 소득 유형, 경비율, 소득공제, 세액공제, 환급액이라는 도메인 개념을 UI로 표현하는 것이다. 따라서 프론트엔드 개발자도 자신이 다루는 도메인을 깊이 이해해야 한다. UI 컴포넌트를 잘 그리는 것 못지않게, **"이 서비스가 해결하는 문제가 무엇인지"**를 아는 것이 중요하다는 뜻이다.

그런데 "세금"이라는 도메인 하나만 해도, 들여다보면 내부에 수많은 하위 도메인이 존재한다. 종합소득세 계산 파이프라인만 봐도 이렇다.

```
총수입금액 → 필요경비 차감 → 종합소득금액
  → 소득공제 → 과세표준 → 세율 적용 → 산출세액
    → 세액공제 → 결정세액 → 기납부세액 차감
      → 납부 or 환급
```

이 파이프라인의 각 단계가 독자적인 규칙과 데이터를 가진 하위 도메인이다. "세금"이라는 하나의 큰 도메인 안에 소득(Income), 공제(Deduction), 세액(Tax), 신고(Filing)라는 세부 도메인들이 얽혀 있는 것이다. 이것을 코드로 어떻게 나눠야 하는지가 바로 도메인 모델링의 핵심 질문이다.

---

## 도메인 모델(Domain Model)이란?

그렇다면 도메인 모델은 무엇일까? 도메인 그 자체와 도메인 "모델"은 어떻게 다른 것일까?

Martin Fowler는 *"Patterns of Enterprise Application Architecture"(2002)*에서 도메인 모델을 이렇게 정의한다.

> "An object model of the domain that incorporates both behavior and data."
> (행위와 데이터를 모두 포함하는 도메인의 객체 모델)

Eric Evans의 정의도 살펴보자.

> "A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain."
> (도메인의 선택된 측면을 기술하는 추상화 체계로, 해당 도메인과 관련된 문제를 해결하는 데 사용될 수 있다.)

핵심은 **"선택적 추상화"**라는 점이다. 도메인 모델은 현실 세계의 모든 것을 담지 않는다. 영화감독이 현실의 모든 장면을 담지 않고 이야기에 필요한 장면만 선택하듯, 도메인 모델도 **해결하려는 문제에 필요한 측면만 골라서 구조화**한 것이다.

여기서 중요한 점이 하나 있다. 도메인 모델은 반드시 코드일 필요가 없다. 화이트보드에 그린 다이어그램일 수도 있고, 팀원들 머릿속에 공유된 멘탈 모델(Mental Model)일 수도 있다. 한국어로 정리된 Hudi의 블로그에서도 이를 명확히 짚고 있다 — "도메인 모델이라는 용어 자체는 엄밀하게는 소프트웨어와는 별개의 개념"이라고 말이다.

### 도메인 모델과 데이터 모델은 다르다

프론트엔드 개발자가 특히 혼동하기 쉬운 부분이 있다. API 응답의 JSON 구조를 보고 "이게 도메인 모델이군"이라고 생각하는 것이다. 하지만 이는 **데이터 모델(Data Model)**이지, 도메인 모델이 아니다.

| 구분            | 도메인 모델                                | 데이터 모델                                       |
| --------------- | ------------------------------------------ | ------------------------------------------------- |
| 목적            | 비즈니스 개념과 규칙을 표현                | 저장/전송 구조를 정의                             |
| 언어            | 비즈니스 용어 (과세표준, 세액공제, 환급액)  | 기술 용어 (string, number, array)                 |
| 포함 요소       | 데이터 + 행위(규칙)                        | 데이터 구조만                                     |
| 프론트엔드 예시 | "과세표준 1,400만원 이하 구간은 세율 6%"   | `{ taxableBase: number, taxRate: number }`        |

데이터 모델은 "어떤 형태로 데이터가 오가는가"를 정의하고, 도메인 모델은 "이 데이터가 비즈니스적으로 무엇을 의미하고 어떤 규칙을 따르는가"를 정의한다. 이 둘을 구분하지 못하면, 컴포넌트가 API 응답 구조에 직접 의존하게 되어 백엔드 스키마가 바뀔 때마다 프론트엔드 전체가 흔들리는 상황이 벌어진다.

---

## 도메인 오브젝트(Domain Object)란?

도메인 모델이 개념적 추상화라면, **도메인 오브젝트**는 그 개념이 코드로 구현된 실체이다.

Code with Jason의 정리가 가장 직관적이다.

> "Any object in my object model that also exist as a concept in my domain model I would call a domain object."
> (내 객체 모델에 있는 객체 중 내 도메인 모델에도 개념으로 존재하는 것을 도메인 오브젝트라고 부른다.)

즉, 도메인 모델에서 "종합소득"이라는 개념이 있고, 코드에서 `Income`이라는 타입이 있다면, 이 `Income`이 바로 도메인 오브젝트인 것이다. 모든 코드 객체가 도메인 오브젝트인 것은 아니다. `HttpClient`, `LocalStorageAdapter`, `useDebounce` 같은 것들은 기술적 도구이지 도메인 개념이 아니다.

### Entity와 Value Object

Evans는 도메인 오브젝트를 크게 두 가지로 분류한다. Fowler는 이를 "Evans Classification"이라고 부른다.

**Entity(엔티티):**

> "Objects that have a distinct identity that runs through time and different representations."
> (시간과 다양한 표현을 관통하는 고유한 정체성을 가진 객체)

세금 신고서(TaxFiling), 납세자(Taxpayer), 보험 계약(Policy)처럼 고유한 ID로 식별되는 객체이다. 속성이 바뀌더라도 같은 ID면 같은 엔티티이다. 신고서의 공제 항목이 수정되어도 같은 신고서인 것처럼.

**Value Object(값 객체):**

> "Objects that matter only as the combination of their attributes. Two value objects with the same values for all their attributes are considered equal."
> (속성의 조합으로만 의미를 가지는 객체. 모든 속성 값이 같으면 동일한 것으로 간주한다.)

금액(Money), 세율(TaxRate), 과세 구간(TaxBracket)처럼 값 자체가 의미인 객체이다. "세율 6%"는 어디에서 쓰이든 "세율 6%"일 뿐이다.

프론트엔드에서 이 구분이 왜 중요할까? TypeScript로 예시를 들어보자.

```typescript
// Entity - ID로 식별된다
interface TaxFiling {
  id: string;
  taxpayerName: string;
  taxYear: number;
  status: FilingStatus;
}

// 같은 ID면 같은 신고서
const isSameFiling = (a: TaxFiling, b: TaxFiling) => a.id === b.id;

// Value Object - 값의 조합으로 식별된다
interface Money {
  amount: number;
  currency: "KRW" | "USD";
}

// 모든 속성이 같으면 같은 값
const isSameMoney = (a: Money, b: Money) =>
  a.amount === b.amount && a.currency === b.currency;
```

Entity는 ID 기반 비교, Value Object는 속성 기반 비교. 이 구분을 명확히 하면 상태 관리에서 "이 데이터가 같은 건지 다른 건지"를 판단하는 로직이 자연스럽게 정리된다. 리스트에서 아이템을 갱신할 때 Entity라면 ID로 찾아서 교체하고, Value Object라면 불변 교체(immutable replace)를 하는 식이다.

---

## 도메인 오브젝트 모델(Domain Object Model)이란?

자, 여기까지 읽으면 자연스럽게 떠오르는 질문이 하나 있다. "도메인 모델"과 "도메인 오브젝트"는 알겠는데, **도메인 오브젝트 모델**은 또 뭔가?

이 용어는 앞의 세 개념을 연결하는 다리 역할을 한다.

> "The place where my domain model turns into actual code is in the object model."
> (내 도메인 모델이 실제 코드로 전환되는 곳이 바로 객체 모델이다.)
> — Code with Jason

**도메인 오브젝트 모델 = 도메인 모델의 코드 구현체**이다. 개념적 추상화(도메인 모델)를 프로그래밍 언어의 타입, 클래스, 함수로 표현한 것이 도메인 오브젝트 모델이고, 그 안의 개별 타입이나 인스턴스가 도메인 오브젝트인 것이다.

(참고로, 웹 개발에서 흔히 접하는 DOM(Document Object Model)과는 완전히 다른 개념이다. Wikipedia에서도 이 둘이 별개임을 명시하고 있다.)

네 가지 개념의 관계를 세금 도메인으로 정리하면 다음과 같다.

```
도메인 (Domain)
  → 문제 영역 그 자체. "종합소득세 신고"

도메인 모델 (Domain Model)
  → 문제 영역의 선택적 추상화. "소득-경비-공제-세액-환급" 계산 파이프라인

도메인 오브젝트 모델 (Domain Object Model)
  → 도메인 모델의 코드 구현 전체. Income, Deduction, TaxCalculation, Filing 타입들과 그 관계

도메인 오브젝트 (Domain Object)
  → 구현된 개별 객체. 특정 납세자의 TaxCalculation 인스턴스 하나
```

이것은 추상에서 구체로 내려가는 계층이다. 도메인이 가장 넓고, 도메인 오브젝트가 가장 구체적이다.

---

## 프론트엔드에서 도메인 로직은 어디에 있어야 하는가?

개념 정의는 여기까지로 하고, 이제 실전 이야기를 해보자. 프론트엔드에서 도메인 로직은 **어디에** 있어야 하는 걸까?

Khalil Stemmler는 처음에 "비즈니스 로직은 프론트엔드에 속하지 않는다"고 주장했다가, 이후 입장을 수정하며 이렇게 말했다.

> "Pretty much everything we're doing architecturally on the backend, we could and should be doing on the frontend."
> (백엔드에서 아키텍처적으로 하고 있는 거의 모든 것을, 프론트엔드에서도 할 수 있고 해야 한다.)

필자도 이 입장에 동의한다. 물론 프론트엔드가 비즈니스 로직의 **단일 진실 공급원(Single Source of Truth)**이 되어서는 안 된다. 그것은 백엔드의 역할이다. 하지만 프론트엔드에도 **프론트엔드만의 도메인 로직**이 분명히 존재한다. 세금 서비스처럼 "사용자가 입력한 정보에 따라 실시간으로 예상 환급액을 보여줘야 하는" 경우에는 더욱 그렇다.

### 흔히 발생하는 안티패턴: 도메인 로직이 컴포넌트에 섞인 경우

종합소득세 미리보기 화면을 예로 들어보자. 사용자가 소득 정보를 입력하면 예상 세액을 실시간으로 보여주는 기능이다. 아래는 흔히 볼 수 있는, 도메인 로직과 UI 로직이 뒤섞인 코드이다.

```tsx
function TaxPreviewPage() {
  const [grossIncome, setGrossIncome] = useState(0);
  const [expenseRate, setExpenseRate] = useState(0.646); // 단순경비율
  const [personalDeductions, setPersonalDeductions] = useState(1); // 본인 1명

  // 비즈니스 규칙: 종합소득금액 = 총수입 - 필요경비
  const totalIncome = grossIncome - grossIncome * expenseRate;

  // 비즈니스 규칙: 인적공제 1인당 150만원
  const deductionAmount = personalDeductions * 1_500_000;
  const taxableBase = Math.max(0, totalIncome - deductionAmount);

  // 비즈니스 규칙: 8단계 누진세율
  let calculatedTax = 0;
  if (taxableBase <= 14_000_000) {
    calculatedTax = taxableBase * 0.06;
  } else if (taxableBase <= 50_000_000) {
    calculatedTax = taxableBase * 0.15 - 1_260_000;
  } else if (taxableBase <= 88_000_000) {
    calculatedTax = taxableBase * 0.24 - 5_760_000;
  } else if (taxableBase <= 150_000_000) {
    calculatedTax = taxableBase * 0.35 - 15_440_000;
  } else {
    calculatedTax = taxableBase * 0.38 - 19_940_000;
  }

  // 비즈니스 규칙: 기납부세액 (3.3% 원천징수)
  const prepaidTax = grossIncome * 0.033;
  const refundOrPayment = prepaidTax - calculatedTax;

  return (
    <div>
      <input value={grossIncome} onChange={e => setGrossIncome(Number(e.target.value))} />
      <p>종합소득금액: {totalIncome.toLocaleString()}원</p>
      <p>과세표준: {taxableBase.toLocaleString()}원</p>
      <p>산출세액: {Math.floor(calculatedTax).toLocaleString()}원</p>
      <p>기납부세액: {Math.floor(prepaidTax).toLocaleString()}원</p>
      <p>{refundOrPayment > 0 ? '환급 예상액' : '납부 예상액'}: {Math.abs(Math.floor(refundOrPayment)).toLocaleString()}원</p>
    </div>
  );
}
```

이 코드의 문제가 보이는가? "인적공제 1인당 150만원", "8단계 누진세율", "3.3% 원천징수"라는 **세법에 의해 정해진 비즈니스 규칙**이 React 컴포넌트 안에 직접 박혀 있다. 세법이 매년 개정되는데, 이런 규칙이 컴포넌트에 흩어져 있으면 개정 시 수정해야 할 곳을 찾아 헤매게 된다. (토스인컴의 QA팀이 환급 플로우만으로 35개 이상의 E2E 시나리오를 운영한다는 사실을 떠올려보면, 이런 규칙이 컴포넌트에 박혀 있을 때의 테스트 비용을 짐작할 수 있다) emewjin의 블로그에서도 이 상황을 정확히 지적한다 — "이게 뷰 로직인지 비즈니스 로직인지 구분하기 어려울 정도로 엉킨다."

### 도메인 로직 분리: 순수 함수로 추출하기

Alex Bespoyasov의 Clean Architecture 접근법에서 핵심 원칙을 빌려오자. 도메인 로직은 **프레임워크에 의존하지 않는 순수 함수**로 분리하는 것이다.

> "The domain is the core that distinguishes one application from another. You can think of the domain as something that won't change if we move from React to Angular."
> (도메인은 하나의 애플리케이션을 다른 것과 구별하는 핵심이다. React에서 Angular로 옮기더라도 변하지 않는 것이라고 생각하면 된다.)

위의 세금 계산 예시를 리팩토링해보자.

**1단계: 도메인 타입 정의**

```typescript
// domain/tax.ts

export interface Income {
  grossAmount: number;       // 총수입금액
  expenseRate: number;       // 경비율 (단순/기준)
}

export interface Deductions {
  personalCount: number;     // 인적공제 대상 인원
  pensionPaid: number;       // 연금보험료
  additionalDeductions: number; // 기타 소득공제
}

export interface TaxCalculation {
  totalIncome: number;       // 종합소득금액
  deductionAmount: number;   // 소득공제 합계
  taxableBase: number;       // 과세표준
  calculatedTax: number;     // 산출세액
  prepaidTax: number;        // 기납부세액
  refundOrPayment: number;   // 환급(+) 또는 납부(-)
}
```

**2단계: 도메인 로직을 순수 함수로 분리**

```typescript
// domain/tax.ts (이어서)

const PERSONAL_DEDUCTION_PER_PERSON = 1_500_000;
const WITHHOLDING_RATE = 0.033;

const TAX_BRACKETS = [
  { limit: 14_000_000,  rate: 0.06, progressiveDeduction: 0 },
  { limit: 50_000_000,  rate: 0.15, progressiveDeduction: 1_260_000 },
  { limit: 88_000_000,  rate: 0.24, progressiveDeduction: 5_760_000 },
  { limit: 150_000_000, rate: 0.35, progressiveDeduction: 15_440_000 },
  { limit: 300_000_000, rate: 0.38, progressiveDeduction: 19_940_000 },
  { limit: 500_000_000, rate: 0.40, progressiveDeduction: 25_940_000 },
  { limit: 1_000_000_000, rate: 0.42, progressiveDeduction: 35_940_000 },
  { limit: Infinity,    rate: 0.45, progressiveDeduction: 65_940_000 },
] as const;

export function calculateTotalIncome(income: Income): number {
  return income.grossAmount - income.grossAmount * income.expenseRate;
}

export function calculateDeductions(deductions: Deductions): number {
  return (
    deductions.personalCount * PERSONAL_DEDUCTION_PER_PERSON +
    deductions.pensionPaid +
    deductions.additionalDeductions
  );
}

export function calculateTaxableBase(totalIncome: number, deductionAmount: number): number {
  return Math.max(0, totalIncome - deductionAmount);
}

export function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find(b => taxableBase <= b.limit)!;
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}

export function calculatePrepaidTax(grossIncome: number): number {
  return Math.floor(grossIncome * WITHHOLDING_RATE);
}

export function calculateRefund(prepaidTax: number, calculatedTax: number): number {
  return prepaidTax - calculatedTax;
}

export function computeFullTax(income: Income, deductions: Deductions): TaxCalculation {
  const totalIncome = calculateTotalIncome(income);
  const deductionAmount = calculateDeductions(deductions);
  const taxableBase = calculateTaxableBase(totalIncome, deductionAmount);
  const calculatedTax = calculateTax(taxableBase);
  const prepaidTax = calculatePrepaidTax(income.grossAmount);
  const refundOrPayment = calculateRefund(prepaidTax, calculatedTax);

  return { totalIncome, deductionAmount, taxableBase, calculatedTax, prepaidTax, refundOrPayment };
}
```

**3단계: 컴포넌트는 도메인 로직을 "사용"만 한다**

```tsx
// ui/TaxPreviewPage.tsx

import { computeFullTax } from '../domain/tax';

function TaxPreviewPage() {
  const [income, setIncome] = useState<Income>({ grossAmount: 0, expenseRate: 0.646 });
  const [deductions, setDeductions] = useState<Deductions>({
    personalCount: 1, pensionPaid: 0, additionalDeductions: 0,
  });

  const result = computeFullTax(income, deductions);

  return (
    <div>
      <IncomeForm value={income} onChange={setIncome} />
      <DeductionForm value={deductions} onChange={setDeductions} />
      <TaxResultSummary result={result} />
    </div>
  );
}
```

무엇이 달라졌는가?

1. **8단계 누진세율 테이블**(`TAX_BRACKETS`)이 한 곳에 모여 있어 세법 개정 시 이 파일만 수정하면 된다
2. **계산 파이프라인**이 `computeFullTax` 한 함수로 응집되어, 전체 흐름이 한눈에 보인다
3. **컴포넌트는 "어떻게 보여줄까"에만 집중**한다. 세율이 바뀌어도 컴포넌트를 수정할 필요가 없다
4. React에서 Vue로 마이그레이션한다 해도, `domain/tax.ts`는 **한 글자도 바꿀 필요 없다**

### 테스트가 쉬워진다

도메인 로직이 분리되면 테스트는 놀랍도록 단순해진다. 세금 도메인에서는 **계산의 정확성이 곧 사용자의 돈**이기 때문에 이 점이 특히 중요하다.

```typescript
// domain/tax.test.ts

describe('calculateTax', () => {
  it('1,400만원 이하는 6% 세율', () => {
    expect(calculateTax(10_000_000)).toBe(600_000);
  });

  it('5,000만원 이하는 15% 세율 - 누진공제 126만원', () => {
    expect(calculateTax(40_000_000)).toBe(4_740_000); // 40M * 0.15 - 1,260,000
  });

  it('과세표준 0원이면 세액도 0원', () => {
    expect(calculateTax(0)).toBe(0);
  });
});

describe('computeFullTax', () => {
  it('프리랜서 3,000만원 소득, 단순경비율 64.6%의 환급액을 정확히 계산한다', () => {
    const income = { grossAmount: 30_000_000, expenseRate: 0.646 };
    const deductions = { personalCount: 1, pensionPaid: 0, additionalDeductions: 0 };
    const result = computeFullTax(income, deductions);

    // 종합소득금액: 30M - 30M * 0.646 = 10,620,000
    expect(result.totalIncome).toBe(10_620_000);
    // 과세표준: 10,620,000 - 1,500,000 = 9,120,000
    expect(result.taxableBase).toBe(9_120_000);
    // 산출세액: 9,120,000 * 0.06 = 547,200
    expect(result.calculatedTax).toBe(547_200);
    // 기납부세액: 30M * 0.033 = 990,000
    expect(result.prepaidTax).toBe(990_000);
    // 환급액: 990,000 - 547,200 = 442,800
    expect(result.refundOrPayment).toBe(442_800);
  });
});
```

React Testing Library도, `render`도, `screen.getByText`도 필요 없다. 순수 함수에 입력을 넣고 출력을 확인하면 된다. 우아한형제들 기술블로그에서도 SCM 플랫폼 프론트엔드 개발 사례를 통해, 도메인 단위 테스트가 컴포넌트 분리 기준을 자연스럽게 잡아주고, 테스트 코드가 문서 역할까지 한다는 점을 보여주고 있다.

---

## 빈약한 도메인 모델(Anemic Domain Model)을 경계하라

여기서 한 가지 주의할 점이 있다. Martin Fowler는 **빈약한 도메인 모델(Anemic Domain Model)**을 안티패턴으로 강하게 비판했다.

> "The fundamental horror of this anti-pattern is that it's so contrary to the basic idea of object-oriented design; which is to combine data and process together."
> (이 안티패턴의 근본적인 공포는, 데이터와 프로세스를 결합하라는 객체지향 설계의 기본 사상에 정면으로 반한다는 것이다.)

> "In essence the problem with anemic domain models is that they incur all of the costs of a domain model, without yielding any of the benefits."
> (본질적으로 빈약한 도메인 모델의 문제는, 도메인 모델의 비용은 모두 지불하면서 이점은 하나도 얻지 못한다는 것이다.)

프론트엔드에서 빈약한 도메인 모델은 이런 모습이다. 세금 신고(Filing) 도메인을 예로 들어보자.

```typescript
// 빈약한 도메인 모델의 예
// 타입은 있지만, 행위(규칙)가 없다
interface TaxFiling {
  id: string;
  status: 'draft' | 'submitted' | 'reviewing' | 'completed' | 'amended';
  taxYear: number;
  filingType: 'regular' | 'late' | 'amendment';
  determinedTax: number;
}

// 비즈니스 규칙이 여기저기 흩어져 있다
// utils/filingHelpers.ts
function canAmendFiling(filing: TaxFiling): boolean { /* ... */ }

// hooks/useFilingActions.ts
function useFilingActions() { /* canAmendFiling를 또 구현하거나 import... */ }

// components/FilingDetail.tsx
function FilingDetail({ filing }: { filing: TaxFiling }) {
  // 또 다른 곳에서 수정 가능 여부를 직접 판단...
  const isEditable = filing.status === 'draft';
  // ...
}
```

타입은 정의했지만 규칙이 타입과 분리되어 여러 파일에 흩어져 있다. 이러면 "경정청구 가능 조건이 변경됩니다"라는 요구사항이 들어왔을 때, 수정해야 할 곳이 어딘지 찾아다녀야 한다. (속된 말로 지뢰 찾기다)

**개선된 방향은 행위를 도메인과 함께 두는 것이다.**

```typescript
// domain/filing.ts

export interface TaxFiling {
  id: string;
  status: FilingStatus;
  taxYear: number;
  filingType: FilingType;
  determinedTax: number;
}

export type FilingStatus = 'draft' | 'submitted' | 'reviewing' | 'completed' | 'amended';
export type FilingType = 'regular' | 'late' | 'amendment';

// 도메인 규칙은 도메인 옆에 둔다
export function canEdit(filing: TaxFiling): boolean {
  return filing.status === 'draft';
}

export function canSubmit(filing: TaxFiling): boolean {
  return filing.status === 'draft' && filing.determinedTax >= 0;
}

export function canAmend(filing: TaxFiling): boolean {
  return filing.status === 'completed' && filing.filingType !== 'amendment';
}

export function getNextAvailableStatuses(filing: TaxFiling): FilingStatus[] {
  const transitions: Record<FilingStatus, FilingStatus[]> = {
    draft: ['submitted'],
    submitted: ['reviewing'],
    reviewing: ['completed'],
    completed: ['amended'],
    amended: [],
  };
  return transitions[filing.status];
}
```

이제 신고 관련 비즈니스 규칙은 `domain/filing.ts` 한 곳에서 관리된다. 어떤 컴포넌트에서든 `canAmend(filing)`를 호출하면 되고, 규칙이 바뀌면 이 파일 하나만 수정하면 된다.

---

## API 응답과 도메인 모델 사이의 변환 계층

실무에서 한 가지 더 고려해야 할 것이 있다. 백엔드 API 응답 구조와 프론트엔드의 도메인 모델이 **항상 일치하지는 않는다**는 점이다. 세금 서비스에서는 특히 그렇다. 국세청 홈택스 연동 데이터는 약어와 코드값으로 가득 차 있다.

emewjin의 블로그에서는 class를 활용해 서버 데이터를 모델로 관리하면서 이런 이점을 발견했다고 기록한다 — "서버로부터 받아온 값과 각 필드에 대한, 뷰 로직과는 독립적인 로직을 한 곳에서 관리"할 수 있게 되었다고. 동시에 "백엔드에서 `name`이 `realName`으로 바뀌어도, 모델만 수정하면 된다"는 실용적 장점도 있었다.

TypeScript에서 class 없이도 이런 변환 계층을 만들 수 있다.

```typescript
// infrastructure/mappers/incomeMapper.ts

// API 응답 타입 (홈택스 연동 데이터 구조)
interface HometaxIncomeResponse {
  tot_amt: number;          // 총수입금액
  inc_tp_cd: string;        // 소득유형코드
  biz_cd: string;           // 업종코드
  exp_rt: number;           // 경비율
  wh_tax_amt: number;       // 원천징수세액
  pyr_nm: string;           // 지급자명
  tx_yr: string;            // 귀속연도
}

// 도메인 타입 (프론트엔드가 정의한 구조)
import type { Income } from '../domain/tax';

export function toIncome(response: HometaxIncomeResponse): Income {
  return {
    grossAmount: response.tot_amt,
    expenseRate: response.exp_rt,
  };
}

function mapIncomeType(code: string): IncomeType {
  const typeMap: Record<string, IncomeType> = {
    '40': 'business',       // 사업소득
    '60': 'employment',     // 근로소득
    '61': 'pension',        // 연금소득
    '80': 'other',          // 기타소득
  };
  return typeMap[code] ?? 'other';
}
```

이렇게 하면 API 응답의 `tot_amt`, `inc_tp_cd` 같은 약어, 코드값 기반 분류 등을 프론트엔드 도메인에 맞게 **한 곳에서** 변환한다. 홈택스 API의 필드명이 바뀌어도 mapper 함수 하나만 수정하면 된다. Roseline의 블로그에서도 이 접근을 "API와 UI의 연결을 효과적으로 설계"하는 방법으로 소개하고 있다.

---

## 유틸 함수와 도메인 로직, 그 애매한 경계

도메인 로직을 분리하다 보면 반드시 부딪히는 질문이 있다. **"이거 유틸 함수 아닌가?"**

예를 들어 아래 두 함수를 보자.

```typescript
// 이건 유틸인가, 도메인 로직인가?
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

// 이건?
function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find(b => taxableBase <= b.limit)!;
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}
```

`formatCurrency`는 숫자를 문자열로 바꾸는 순수한 **표현(Presentation) 로직**이다. "원"이라는 단위를 붙이고 천 단위 콤마를 찍는 것은 비즈니스 규칙이 아니라, 사용자에게 어떻게 보여줄지에 관한 것이다. 반면 `calculateTax`는 "8단계 누진세율 적용"이라는 **세법에 근거한 비즈니스 규칙**을 담고 있다. 이것은 UI가 없어도 동일하게 적용되어야 하는 도메인의 규칙이다.

필자가 실무에서 사용하는 판단 기준은 이것이다.

> **"이 로직이 사라지면 비즈니스가 깨지는가, 화면만 깨지는가?"**

비즈니스가 깨진다면 도메인 로직이고, 화면만 깨진다면 표현 로직이다. 이 질문 하나로 대부분의 경계는 구분할 수 있다.

| 판단 기준               | 도메인 로직                | 유틸/표현 로직           |
| ----------------------- | -------------------------- | ------------------------ |
| 없으면 뭐가 깨지나?     | 세금 계산 오류             | 화면이 이상해짐          |
| 프레임워크가 바뀌면?    | 그대로 유지                | 바뀔 수 있음             |
| 기획서에 명시되어 있나? | "과세표준 × 세율 - 누진공제" | "금액은 콤마 구분"       |
| 백엔드에도 같은 로직이? | 있거나 있어야 함           | 없음 (프론트만의 관심사) |

하지만 현실은 이렇게 깔끔하지 않다. 가장 까다로운 것은 **도메인 로직처럼 생겼는데 실은 표현 로직인 경우**이다.

```typescript
// domain/filing.ts 에 넣었는데... 이게 정말 도메인인가?
function getStatusBadgeColor(status: FilingStatus): string {
  const colors: Record<FilingStatus, string> = {
    draft: 'gray',
    submitted: 'blue',
    reviewing: 'yellow',
    completed: 'green',
    amended: 'purple',
  };
  return colors[status];
}

function getStatusDisplayText(status: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    draft: '작성 중',
    submitted: '제출 완료',
    reviewing: '검토 중',
    completed: '신고 완료',
    amended: '경정청구',
  };
  return labels[status];
}
```

`getStatusBadgeColor`와 `getStatusDisplayText`는 `FilingStatus`라는 도메인 개념을 사용하지만, 하는 일은 **화면 표현**이다. 배지 색상이 바뀌어도 비즈니스는 전혀 깨지지 않는다. 이런 함수를 `domain/filing.ts`에 넣으면 도메인 모듈이 점점 비대해지고, 진짜 도메인 로직(`canAmend`, `canSubmit`)과 표현 로직이 뒤섞이게 된다.

### 도메인 모델과 ViewModel의 분리

이 문제를 해결하는 실용적인 방법이 있다. **같은 도메인 폴더 안에 ViewModel을 별도 파일로 분리**하는 것이다. `.ui.ts`보다 `.viewModel.ts`라는 네이밍을 쓰면, MVVM 패턴의 ViewModel 개념과 자연스럽게 연결된다 — "도메인 데이터를 화면에 맞게 변환하는 계층"이라는 역할이 이름에서 바로 드러나기 때문이다.

```
domains/
└── filing/
    ├── filing.ts              # 도메인 모델 + 도메인 로직
    ├── filing.viewModel.ts    # ViewModel (표현 변환 계층)
    ├── filing.test.ts         # 도메인 로직 테스트
    └── filingMapper.ts        # API ↔ 도메인 변환
```

```typescript
// domains/filing/filing.ts — 순수 도메인
export interface TaxFiling {
  id: string;
  status: FilingStatus;
  taxYear: number;
  filingType: FilingType;
  determinedTax: number;
}

export type FilingStatus = 'draft' | 'submitted' | 'reviewing' | 'completed' | 'amended';
export type FilingType = 'regular' | 'late' | 'amendment';

export function canEdit(filing: TaxFiling): boolean {
  return filing.status === 'draft';
}

export function canAmend(filing: TaxFiling): boolean {
  return filing.status === 'completed' && filing.filingType !== 'amendment';
}
```

```typescript
// domains/filing/filing.viewModel.ts — 표현 관심사
import type { FilingStatus, FilingType } from './filing';

export function getStatusBadgeColor(status: FilingStatus): string {
  const colors: Record<FilingStatus, string> = {
    draft: 'gray',
    submitted: 'blue',
    reviewing: 'yellow',
    completed: 'green',
    amended: 'purple',
  };
  return colors[status];
}

export function getStatusDisplayText(status: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    draft: '작성 중',
    submitted: '제출 완료',
    reviewing: '검토 중',
    completed: '신고 완료',
    amended: '경정청구',
  };
  return labels[status];
}

export function getFilingTypeLabel(type: FilingType): string {
  const labels: Record<FilingType, string> = {
    regular: '정기 신고',
    late: '기한 후 신고',
    amendment: '경정청구',
  };
  return labels[type];
}
```

핵심은 **의존 방향**이다. `filing.viewModel.ts`는 `filing.ts`를 import하지만, `filing.ts`는 `filing.viewModel.ts`를 절대 import하지 않는다. 도메인은 표현을 모르고, 표현이 도메인을 알고 있는 구조이다. 이것이 Robert C. Martin이 말한 의존성 규칙(Dependency Rule)의 축소판이라고 볼 수 있다.

같은 폴더에 두는 이유가 있다. 토스 프론트엔드 챕터에서 강조하는 원칙 — "함께 변경되는 파일을 같은 디렉토리에 배치하라"를 따른 것이다. `FilingStatus` 타입에 새로운 값(예: `'rejected'`)이 추가되면 `filing.ts`와 `filing.viewModel.ts` 모두 수정해야 한다. 같은 폴더에 있으니 수정 범위가 한눈에 보인다.

---

## 도메인 모델의 경계와 응집

도메인 로직을 분리하는 것만큼 중요한 것이 **경계를 어디에 그을 것인가**이다. 필자가 실무에서 자주 마주치는 경계 판단 문제를 몇 가지 정리해보겠다.

### 데이터의 경계: 이 필드는 누구의 것인가?

프론트엔드에서 다루는 데이터는 대략 네 가지 출처에서 온다.

1. **서버 데이터**: API 응답으로 받은 것 (`filing.status`, `income.grossAmount`)
2. **파생 데이터**: 서버 데이터로부터 계산된 것 (`taxableBase`, `refundAmount`)
3. **UI 상태**: 화면 제어를 위한 것 (`isModalOpen`, `selectedTab`)
4. **사용자 입력**: 폼에서 입력 중인 것 (`inputAmount`, `selectedDeductions`)

이 네 가지를 하나의 타입에 섞으면 도메인 모델이 오염된다.

```typescript
// 안티패턴: 모든 것이 섞인 타입
interface TaxFiling {
  // 서버 데이터 (도메인)
  id: string;
  status: FilingStatus;
  determinedTax: number;

  // 파생 데이터 (도메인)
  refundAmount: number;
  canAmend: boolean;

  // UI 상태 (표현)
  isExpanded: boolean;
  activeStep: number;

  // 임시 상태
  editingDeductions: Deduction[];
}
```

이 타입은 도메인 개념과 UI 상태와 임시 데이터가 한 바구니에 담겨 있다. `activeStep`이 바뀔 때마다 신고 도메인이 갱신되는 셈이다. (폼 단계가 바뀌는 것은 비즈니스 이벤트가 아니다)

개선 방향은 경계에 따라 타입을 분리하는 것이다.

```typescript
// 도메인 모델 — 비즈니스 개념만
interface TaxFiling {
  id: string;
  status: FilingStatus;
  taxYear: number;
  filingType: FilingType;
  determinedTax: number;
}

// UI 상태 — 화면 제어만
interface FilingFormViewState {
  activeStep: number;
  expandedSections: Set<string>;
}

// 사용자 입력 — 폼 상태만
interface DeductionEditForm {
  personalCount: number;
  selectedDeductionIds: string[];
  customExpenseAmount: number;
}
```

이렇게 하면 각 타입이 **하나의 변경 이유**만 가진다. 도메인 타입은 세법이 바뀔 때만, UI 상태는 화면 설계가 바뀔 때만, 폼 상태는 입력 UX가 바뀔 때만 수정된다.

### 응집의 기준: "함께 변하는 것을 함께 두어라"

Evans의 DDD에서 **Aggregate(집합체)**라는 개념이 있다. "관련된 객체들의 클러스터를 하나의 단위로 다루는 것"이다. 프론트엔드에서 이 개념을 그대로 적용할 필요는 없지만, 핵심 원칙은 빌려올 만하다 — **함께 변하는 데이터와 규칙은 함께 둔다.**

세금 서비스를 예로 들면, `Income`(소득)과 `ExpenseRate`(경비율)는 항상 함께 변한다. 소득 유형이 바뀌면 적용 경비율도 바뀌고, 종합소득금액 계산도 영향을 받는다. 따라서 이것들은 하나의 파일 `domain/tax.ts`에 응집시킨다.

반면, `TaxFiling`(신고서)은 세액 계산과 별개로 변할 수 있다. 신고서의 상태 전이 규칙이 바뀌어도 세율 계산 로직은 영향을 받지 않는다. 따라서 `domain/filing.ts`로 분리하는 것이 맞다.

```
이렇게 묻자: "A가 변할 때 B도 반드시 변해야 하는가?"
  → Yes: 같은 모듈에 둔다 (Income + ExpenseRate + TaxBracket)
  → No: 분리한다 (Tax 계산 ↔ Filing 상태관리)
```

---

## Class vs 함수형: 도메인 응집의 두 가지 표현

여기까지 읽으면 한 가지 근본적인 질문이 떠오를 수 있다. 지금까지의 예시는 모두 `interface` + 순수 함수 조합이었는데, **Class로 도메인을 표현하면 응집이 더 자연스럽지 않은가?**

맞는 말이다. Class 기반으로 도메인을 표현하면 데이터와 행위가 하나의 객체에 묶이기 때문에, 응집이 코드 구조에서 바로 드러난다.

```typescript
// Class 기반: 행위가 데이터에 귀속된다
class TaxFilingModel {
  constructor(
    public readonly id: string,
    public readonly status: FilingStatus,
    public readonly taxYear: number,
    public readonly filingType: FilingType,
    public readonly determinedTax: number,
  ) {}

  canEdit(): boolean {
    return this.status === 'draft';
  }

  canAmend(): boolean {
    return this.status === 'completed' && this.filingType !== 'amendment';
  }

  canSubmit(): boolean {
    return this.status === 'draft' && this.determinedTax >= 0;
  }
}

// 사용: 주어가 명확하다
const filing = new TaxFilingModel('F-001', 'completed', 2025, 'regular', 547200);
filing.canAmend();  // "이 신고서가 경정청구 가능한가?" — 자연어에 가깝다
```

`filing.canAmend()`는 마치 자연어를 읽는 것처럼 직관적이다. 주어(filing)와 동사(canAmend)가 명확하게 결합되어 있다. 마치 `jihoon.eat('감자탕')`이라고 쓰면 "지훈이가 감자탕을 먹는다"가 바로 읽히는 것과 같다.

반면 함수형 스타일에서는 이렇게 된다.

```typescript
// 함수형: 행위가 데이터 밖에 있다
canAmend(filing);           // "경정청구가능한가(신고서를)"
eat('jihoon', '감자탕');     // "먹는다(지훈을, 감자탕을)"
```

주어와 동사의 결합이 느슨해진다. `canAmend`라는 함수가 `TaxFiling`과 관련된다는 것은 파일을 열어보거나 타입 시그니처를 확인해야 알 수 있다. 같은 파일에 `canAmend(filing)`, `canEdit(filing)`, `calculateTax(taxableBase)` 같은 함수들이 섞여 있으면, 어떤 함수가 어떤 도메인에 속하는지 한눈에 파악하기 어려워질 수 있다.

### 그렇다면 프론트엔드에서는 Class를 써야 하는가?

솔직히 말하면, 답은 **"상황에 따라 다르다"**이다. 하지만 필자의 경험상 React + TypeScript 환경에서는 Class가 만능이 아닌 현실적 이유들이 있다.

**1. React 상태 관리와의 마찰**

emewjin의 블로그에서도 정확히 이 문제를 지적하고 있다 — "리덕스 스토어에 저장시 인스턴스는 저장할 수 없다. 때문에 매번 `classToPlain`으로 풀어서 넣어주고, 다시 class로 만들어주어야 했다."

React의 상태 관리는 기본적으로 **Plain Object**를 전제로 설계되어 있다. `useState`, `useReducer`, Redux, Zustand 모두 직렬화 가능한(serializable) 객체를 다룬다. Class 인스턴스를 상태에 넣으면 직렬화/역직렬화 과정에서 메서드가 소실되고, `JSON.stringify` → `JSON.parse` 사이클에서 일반 객체로 퇴화한다.

```typescript
// 이런 상황이 발생한다
const [filing, setFiling] = useState(
  new TaxFilingModel('F-001', 'draft', 2025, 'regular', 0)
);

// 상태 업데이트 후 filing은 여전히 TaxFilingModel 인스턴스인가?
// Redux DevTools에서 직렬화할 때는?
// React Server Component에서 전달할 때는?
```

**2. 불변성 보장의 어려움**

React는 상태 변경을 **참조 비교(referential equality)**로 감지한다. Class 인스턴스의 프로퍼티를 직접 수정하면 React가 변경을 감지하지 못한다. 매번 새 인스턴스를 생성해야 하는데, 그러면 Class의 이점인 "캡슐화된 상태 변경"이 무색해진다.

```typescript
// Class의 캡슐화 철학과 React의 불변성 철학이 충돌한다
class DeductionList {
  // Class 철학: 내부 상태를 직접 변경
  addDeduction(item: Deduction) {
    this.items.push(/* ... */);  // React가 변경을 감지 못함!
  }

  // React에 맞추려면: 매번 새 인스턴스를 반환
  addDeduction(item: Deduction): DeductionList {
    return new DeductionList([...this.items, /* ... */]);  // 그럼 Class의 의미가...?
  }
}
```

### 함수형에서 응집을 확보하는 전략

그렇다면 함수형 스타일에서 `eat('jihoon', '감자탕')` 같은 느슨한 응집 문제를 어떻게 개선할 수 있을까? 필자가 효과적이라고 느낀 방법 세 가지를 소개한다.

**전략 1: 모듈 네임스페이스로 응집하기**

가장 직관적인 방법이다. 파일(모듈) 자체를 도메인 단위로 만들고, import 시 네임스페이스를 활용한다.

```typescript
// domain/filing.ts
export interface TaxFiling { /* ... */ }
export function canEdit(filing: TaxFiling): boolean { /* ... */ }
export function canAmend(filing: TaxFiling): boolean { /* ... */ }
export function canSubmit(filing: TaxFiling): boolean { /* ... */ }
```

```typescript
// 사용하는 쪽
import * as FilingModel from '../domain/filing';

FilingModel.canEdit(filing);      // "FilingModel의 canEdit" — 소속이 명확
FilingModel.canAmend(filing);
FilingModel.canSubmit(filing);
```

`FilingModel.canAmend(filing)`은 `filing.canAmend()`만큼은 아니지만, 최소한 이 함수가 Filing 도메인에 속한다는 것이 코드에서 바로 드러난다. 함수가 여러 도메인에 걸쳐 섞일 위험도 없어진다.

**전략 2: 첫 번째 인자를 도메인 주체로 통일하기**

함수형에서 응집을 표현하는 또 다른 컨벤션이 있다. **첫 번째 인자를 항상 "행위의 주체"로 둔다.**

```typescript
// 일관된 규칙: 첫 번째 인자 = 행위의 주체
export function canEdit(filing: TaxFiling): boolean { /* ... */ }
export function canAmend(filing: TaxFiling): boolean { /* ... */ }
export function calculateTotalIncome(income: Income): number { /* ... */ }
export function calculateTax(taxableBase: number): number { /* ... */ }
```

이 컨벤션을 따르면 `canAmend(filing)`은 "filing에 대해 canAmend를 물어본다"로 읽힌다. Unix의 파이프라인 사고방식(`data |> transform`)과도 일맥상통한다. 사실 Go 언어의 메서드 리시버가 정확히 이 패턴이고, Rust의 `impl` 블록에서 `self`를 첫 인자로 받는 것도 같은 발상이다.

**전략 3: 도메인 객체 생성 함수(Factory)로 행위를 묶기**

Class의 응집력이 그리울 때 사용할 수 있는 패턴이다. 팩토리 함수가 도메인 객체와 그 행위를 한 번에 반환한다.

```typescript
// domain/filing.ts
export function createFilingModel(data: TaxFiling) {
  return {
    ...data,
    canEdit: () => data.status === 'draft',
    canSubmit: () => data.status === 'draft' && data.determinedTax >= 0,
    canAmend: () => data.status === 'completed' && data.filingType !== 'amendment',
  } as const;
}

// 사용
const filing = createFilingModel(rawFiling);
filing.canAmend();    // Class처럼 읽히면서도 Plain Object다
filing.canEdit();

// JSON.stringify도 되고, 스프레드도 되고, React 상태에도 들어간다
```

이 패턴은 Class의 표현력(`filing.canAmend()`)과 함수형의 실용성(Plain Object, 직렬화 가능)을 동시에 얻는다. 물론 매번 함수 객체를 새로 만드는 비용이 있지만, 프론트엔드에서 다루는 데이터 규모에서는 성능 문제가 되는 경우가 거의 없다.

### 어떤 전략을 선택할까?

정리하면 이렇다.

| 전략                       | 응집 표현                      | 적합한 상황                                        |
| -------------------------- | ------------------------------ | -------------------------------------------------- |
| `import * as FilingModel`  | `FilingModel.canAmend(filing)` | 도메인 함수가 많고, 여러 곳에서 import할 때        |
| 첫 인자 = 주체 컨벤션      | `canAmend(filing)`             | 팀 전체가 컨벤션에 합의할 수 있을 때               |
| Factory 함수               | `filing.canAmend()`            | Class의 표현력이 필요하지만 React 호환이 중요할 때 |

필자의 경험상, **전략 1과 2를 기본으로 가져가고, 특별히 응집이 중요한 핵심 도메인에만 전략 3을 적용**하는 것이 균형 잡힌 접근이다. 완벽한 응집을 위해 모든 곳에 Factory를 도입하는 것은 또 다른 과잉 설계가 될 수 있다.

---

## 어디까지 분리할 것인가? — 실용적 기준

Clean Architecture 글을 읽다 보면 3~4개 레이어를 나누고 Port/Adapter를 정의하는 이상적인 구조가 나온다. 하지만 현실에서 모든 프로젝트에 이 구조를 적용하는 것은 과잉 설계(over-engineering)가 될 수 있다. Bespoyasov 본인도 이 비용을 인정한다 — "시간 소모, 과도한 코드량, 온보딩 어려움"이 있다고.

필자가 생각하는 실용적 기준은 다음과 같다.

### 최소한 이것만은 하자

1. **도메인 타입을 API 응답 타입과 분리**한다. `interface`든 `type`이든, 프론트엔드가 사용하는 도메인 개념을 별도 파일로 정의한다.
2. **비즈니스 규칙이 포함된 로직은 컴포넌트 밖으로 뺀다.** `domain/` 폴더가 아니어도 좋다. 중요한 것은 React에 의존하지 않는 순수 함수로 만드는 것이다.
3. **API 응답 → 도메인 모델 변환을 한 곳에서 한다.** Mapper 함수든, Zod 스키마든, 그 한 곳만 수정하면 변경이 전파되지 않는 구조를 만든다.

### 프로젝트가 복잡해지면 추가로

4. **Bounded Context 단위로 폴더를 나눈다.** 토스 프론트엔드 챕터에서도 "함께 변경되는 파일을 같은 디렉토리에 배치하라"는 원칙을 강조한다. 도메인 단위로 폴더를 나누면 import 경로가 도메인 경계를 자연스럽게 드러낸다.
5. **Use Case 계층을 도입한다.** 도메인 로직의 조합이 복잡해지면, "소득 정보 조회 → 경비율 적용 → 공제 항목 계산 → 세액 산출 → 환급액 확정"이라는 시나리오를 하나의 함수로 묶는 Application 계층이 필요해진다.

```
src/
├── domains/
│   ├── tax/
│   │   ├── tax.ts                  # 세액 계산 도메인 (세율, 공제, 계산 파이프라인)
│   │   ├── tax.viewModel.ts        # 세액 표현 (금액 포맷, 구간 라벨)
│   │   ├── tax.test.ts             # 세액 계산 테스트
│   │   └── incomeMapper.ts         # 홈택스 API ↔ 도메인 변환
│   ├── filing/
│   │   ├── filing.ts               # 신고 상태 도메인 (상태 전이, 권한)
│   │   ├── filing.viewModel.ts     # 신고 표현 (상태 배지, 라벨)
│   │   ├── filing.test.ts
│   │   └── filingMapper.ts
│   └── deduction/
│       ├── deduction.ts            # 공제 항목 도메인 (자격 조건, 한도)
│       └── deduction.viewModel.ts
├── hooks/                           # React 의존 로직
├── components/                      # UI 컴포넌트
└── api/                             # API 호출
```

세금이라는 하나의 도메인 안에서도 **세액 계산(tax)**, **신고 관리(filing)**, **공제 항목(deduction)**이 각각 독립된 하위 도메인으로 분리된다. 세율이 바뀌어도 신고 상태 전이 로직은 영향을 받지 않고, 공제 항목이 추가되어도 신고서 제출 플로우는 그대로이다. 이것이 Bounded Context의 실전적 적용이다.

---

## 마무리

정리하면, **도메인**은 우리가 해결하려는 문제 영역이고, **도메인 모델**은 그 문제를 선택적으로 추상화한 개념 체계이며, **도메인 오브젝트 모델**은 그 개념 체계를 코드로 구현한 것이고, **도메인 오브젝트**는 그 구현 안의 개별 객체이다.

그리고 이 개념들을 프론트엔드에서 실천한다는 것은, 단순히 폴더를 나누는 것이 아니라 **여러 겹의 경계를 의식적으로 판단하는 것**이다. "이건 비즈니스 규칙인가, 표현 로직인가?" "이 데이터는 도메인 상태인가, UI 상태인가?" "이 함수의 응집은 충분한가?" — 이런 질문을 습관적으로 던지는 것만으로도 코드의 구조는 자연스럽게 좋아진다.

물론 모든 프로젝트에 Clean Architecture의 레이어를 다 갖출 필요는 없다. 단순한 CRUD 앱에 4개 레이어를 나누고 모든 도메인에 Factory 패턴을 적용하는 것은 배보다 배꼽이 더 큰 격이다. Class의 우아한 응집과 함수형의 실용적 유연함 사이에서 정답은 프로젝트의 복잡도와 팀의 컨텍스트가 결정한다.

정답은 없다. 하지만 적어도 **"도메인이 무엇인지 모르고 코드를 짜는 것"**과 **"도메인을 인식하고, 경계를 판단하고, 의식적으로 분리하는 것"** 사이에는 분명한 차이가 있다. 이 글을 읽는 독자 분들도 자신의 프로젝트에서 "여기서 도메인은 뭘까, 그리고 이 코드는 어디에 있어야 할까?"라는 질문을 한 번쯤 던져보시길 바란다.

---

### 참고 자료

- Eric Evans, *Domain-Driven Design: Tackling Complexity in the Heart of Software* (2003) — 도메인, 도메인 모델, Entity, Value Object 정의
- Martin Fowler, *Patterns of Enterprise Application Architecture* (2002) — [Domain Model 패턴](https://martinfowler.com/eaaCatalog/domainModel.html), [Anemic Domain Model](https://martinfowler.com/bliki/AnemicDomainModel.html), [Evans Classification](https://martinfowler.com/bliki/EvansClassification.html)
- Robert C. Martin, *Clean Architecture* (2017) — [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Code with Jason — [Domains, Domain Models, Object Models, Domain Objects](https://www.codewithjason.com/difference-domains-domain-models-object-models-domain-objects/)
- Khalil Stemmler — [Does DDD Belong on the Frontend?](https://khalilstemmler.com/articles/typescript-domain-driven-design/ddd-frontend/)
- Alex Bespoyasov — [Clean Architecture on Frontend](https://bespoyasov.me/blog/clean-architecture-on-frontend/)
- Hudi — [혼란스러운 도메인, 도메인 모델, 도메인 객체 용어 정리](https://hudi.blog/domain-domain-model-domain-object/)
- Roseline — [프론트엔드 아키텍처: UI 개발을 위한 도메인 모델링 전략](https://roseline.oopy.io/dev/frontend-architecture-domain-modeling-strategy-for-ui-development)
- emewjin — [프론트엔드 개발에서 서버 데이터를 모델로 관리한다는 것](https://emewjin.github.io/model/)
- 우아한형제들 기술블로그 — [단위 테스트로 복잡한 도메인의 프론트 프로젝트 정복하기](https://techblog.woowahan.com/8942/)
- 토스 — [Frontend Fundamentals](https://frontend-fundamentals.com/)
- 토스인컴 — [빠른 속도에서 품질을 지키기 위한 E2E 자동화 여정](https://toss.tech/article/income-qa-e2e-automation)
