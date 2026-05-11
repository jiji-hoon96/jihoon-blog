---
emoji: 🔀
title: '관심사의 분리, 프론트엔드에서 어떻게 실천할 것인가'
date: '2025-10-10'
categories: 프론트엔드 설계 아키텍처
---

이번 포스팅에서는 **관심사의 분리(Separation of Concerns)** 에 대한 이야기를 해보려고 한다.

필자는 프론트엔드 개발을 하면서 "관심사를 분리하라"는 말을 셀 수 없이 들어왔다. 코드 리뷰에서 "이 컴포넌트는 너무 많은 관심사를 가지고 있어요", 아키텍처 논의에서 "비즈니스 로직과 UI 로직을 분리해야 합니다" 같은 이야기들이 오간다. 그런데 막상 "관심사가 정확히 뭔데? 어떤 기준으로 분리하는 건데?"라고 물으면, 명쾌하게 답하기가 쉽지 않다. (솔직히 필자도 한동안 "HTML/CSS/JS를 나누는 것"이 관심사 분리인 줄 알았다)

이전에 [추상화](/260201)와 [도메인 모델](/260418), [커스텀 훅](/260511)에 대한 글을 썼는데, 돌이켜보면 그 글들이 공통적으로 다루고 있던 핵심 원리가 바로 관심사의 분리였다. 추상화는 "핵심만 남기고 나머지를 감추는 것"이고, 도메인 모델 분리는 "비즈니스 로직을 UI에서 떼어내는 것"이며, 커스텀 훅 설계는 "하나의 훅이 하나의 관심사만 책임지는 것"이었다. 결국 같은 원리를 서로 다른 각도에서 바라본 것이다.

이 글에서는 관심사의 분리라는 원리의 본질부터 시작해서, 프론트엔드에서 이 원리가 어떻게 변해왔고, 실무에서 어떤 기준으로 적용해야 하는지를 정리해보려 한다.

---

## 관심사의 분리란 무엇인가

### 다익스트라의 원래 정의

"관심사의 분리"라는 용어는 1974년 컴퓨터 과학자 Edsger W. Dijkstra가 [On the Role of Scientific Thought(EWD447)](https://www.cs.utexas.edu/~EWD/transcriptions/EWD04xx/EWD447.html)이라는 글에서 처음 사용했다.

> "Let me try to explain to you, what to my taste is characteristic for all intelligent thinking. It is, that one is willing to study in depth an aspect of one's subject matter in isolation for the sake of its own consistency, all the time knowing that one is occupying oneself only with one of the aspects."
> (내가 생각하기에 모든 지적 사고의 특징은 이것이다. 자신이 다루는 주제의 한 측면을, 그것의 일관성을 위해, 기꺼이 깊이 있게 **독립적으로** 연구하려는 의지이다. 동시에 자신이 오직 하나의 측면만을 다루고 있다는 것을 항상 인식하면서.)

그리고 이어서 이렇게 말한다.

> "It is what I sometimes have called 'the separation of concerns', which, even if not perfectly possible, is yet the only available technique for effective ordering of one's thoughts."
> (이것이 내가 때때로 '관심사의 분리'라고 부르는 것으로, 완벽하게 가능하지는 않더라도, 자신의 생각을 효과적으로 정리하기 위한 유일하게 알려진 기법이다.)

여기서 주목할 점이 두 가지 있다.

**첫째, 관심사의 분리는 코드 기법이 아니라 사고 기법이다.** Dijkstra는 "프로그램의 정확성과 효율성을 동시에 다루지 말고, 각각 별도의 날에 따로 연구하라"는 맥락에서 이 용어를 사용했다. 코드를 어떻게 나눌 것인가가 아니라, **문제를 어떻게 생각할 것인가**에 대한 원리인 것이다.

**둘째, "완벽하게 가능하지는 않더라도"라는 단서가 붙어 있다.** 관심사는 현실에서 완전히 분리되지 않는다. 어딘가에서 반드시 만나야 한다. 관심사의 분리는 "절대 섞이지 않게 하라"가 아니라, **"각 관심사를 독립적으로 사고할 수 있는 구조를 만들라"** 는 뜻이다.

### 그렇다면 "관심사"란 무엇인가

"관심사(Concern)"라는 단어가 꽤 추상적이다. 구체적으로 말하면 **"코드가 다루는 하나의 목적 또는 책임"** 이라고 할 수 있다. 데이터를 서버에서 가져오는 것, 사용자 입력을 검증하는 것, 화면에 UI를 렌더링하는 것, 세율을 계산하는 것 — 이것들이 각각 하나의 관심사이다.

관심사의 분리란, 이 서로 다른 목적들이 코드에서 뒤섞이지 않도록 **각각을 독립적으로 다룰 수 있는 단위로 나누는 것**이다. Carlo Ghezzi는 이를 "소프트웨어 생산에서 내재된 복잡성을 다루기 위한 근본적인 방법"이라고 표현했다.

그렇다면 이 원리가 프론트엔드에서는 어떻게 적용되어왔을까? 흥미롭게도, 프론트엔드에서 관심사의 분리에 대한 이해는 시간이 지나면서 크게 변해왔다.

---

## 프론트엔드에서 관심사 분리의 변천

### 기술 기반 분리: HTML, CSS, JavaScript

웹 개발 초기, 관심사의 분리는 **기술(Technology) 기반**으로 이해되었다.

```
src/
├── index.html     ← 구조
├── styles.css     ← 표현
└── script.js      ← 동작
```

HTML은 구조를, CSS는 표현을, JavaScript는 동작을 담당한다. 파일을 기술별로 나누면 관심사가 분리된다는 논리였다. 이 접근은 오랫동안 "웹 표준"의 모범 사례로 여겨졌고, 인라인 스타일이나 `onclick` 속성을 쓰면 "관심사가 섞였다"며 지양되었다.

하지만 웹 애플리케이션이 복잡해지면서 이 분리의 한계가 드러났다. 하나의 기능을 수정하려면 HTML, CSS, JS 세 파일을 모두 열어야 했다. "로그인 버튼의 동작을 바꾸려면" `login.html`에서 마크업을, `styles.css`에서 스타일을, `app.js`에서 이벤트 핸들러를 찾아 수정해야 한다. **기술을 기준으로 나눴지만, 실제 변경은 기능을 기준으로 일어나는** 불일치가 발생한 것이다.

### 컴포넌트 기반 분리: React의 등장

2013년 React가 등장하면서, 프론트엔드의 관심사 분리 패러다임은 근본적으로 바뀌었다. React의 JSX는 HTML과 JavaScript를 하나의 파일에 섞었고, 이후 CSS-in-JS 라이브러리들은 CSS마저 JavaScript 안으로 가져왔다. 전통적 관점에서는 "관심사의 분리를 위반"한 것처럼 보였다.

하지만 React 팀은 다른 시각을 제시했다. **분리의 단위가 "기술"에서 "컴포넌트"로 바뀌어야 한다**는 것이다. 로그인 버튼의 구조, 스타일, 동작은 모두 "로그인 버튼"이라는 하나의 관심사에 속한다. 이것들을 기술별로 찢어놓는 것이 오히려 관심사를 분산시키는 것이고, 하나의 컴포넌트에 응집시키는 것이 진정한 관심사의 분리라는 논리이다.

```tsx
// 하나의 관심사(로그인 버튼)가 하나의 컴포넌트에 응집
function LoginButton({ onLogin }) {
  return (
    <button
      css={css`
        background: #0066ff;
        color: white;
        border-radius: 8px;
      `}
      onClick={onLogin}
    >
      로그인
    </button>
  );
}
```

Kent C. Dodds는 이 원리를 [Colocation](https://kentcdodds.com/blog/colocation)이라는 개념으로 정리했다. **"함께 변하는 것들은 가능한 한 가까이 두라(Place code as close to where it's relevant as possible)."** 컴포넌트의 마크업과 스타일과 로직은 함께 변한다. 그러니 함께 있어야 한다.

이것은 Dijkstra의 원래 정의와도 정확히 맞닿아 있다. 관심사의 분리는 "기술별로 파일을 나누라"가 아니라, **"각 관심사를 독립적으로 사고하고 다룰 수 있게 하라"** 이다. 컴포넌트는 하나의 UI 관심사를 독립적으로 개발하고 테스트하고 수정할 수 있는 단위이다.

### 그렇다면 컴포넌트 안에서는?

여기까지 읽으면 "컴포넌트 안에 다 넣으면 되는 거 아니냐"라고 생각할 수 있다. 하지만 그것은 반만 맞는 이야기이다.

컴포넌트 안에도 여전히 **서로 다른 관심사**가 존재한다. 데이터를 어떻게 가져올 것인가(데이터 접근), 비즈니스 규칙에 따라 어떻게 처리할 것인가(도메인 로직), 사용자에게 어떻게 보여줄 것인가(표현). 이것들은 서로 다른 이유로, 서로 다른 시점에 변경된다.

[도메인 모델 글](/260418)에서 다뤘던 예시를 다시 떠올려보자. 세금 계산 페이지에서 8단계 누진세율 테이블, 인적공제 금액, 원천징수율 같은 비즈니스 규칙이 React 컴포넌트 안에 직접 박혀 있으면, 세법이 개정될 때 UI 코드를 뒤져야 한다. **기술 기반 분리에서 벗어났지만, 관심사 기반 분리는 아직 덜 된 상태**인 것이다.

그렇다면 컴포넌트 내부에서, 그리고 컴포넌트 바깥에서, 관심사를 어떤 기준으로 나눠야 할까?

---

## 관심사를 나누는 세 가지 축

Martin Fowler는 [Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html)에서 프로그램을 세 가지 계층으로 나누는 것이 정보 시스템 설계의 가장 기본적인 분리라고 말한다. **표현(Presentation)**, **도메인(Domain)**, **데이터 접근(Data Access)** 이다.

그의 핵심 주장은 명확하다.

> "It allows me to think about the three topics relatively independently."
> (이것은 세 가지 주제를 상대적으로 독립적으로 사고할 수 있게 해준다.)

이것이 바로 Dijkstra가 말한 "자신의 생각을 효과적으로 정리하기 위한 기법"의 실전 적용이다. 각 계층을 독립적으로 사고할 수 있을 때, 복잡한 시스템을 다루는 인지적 부담이 줄어든다.

프론트엔드에 이 세 축을 적용하면 이렇다.

### 1. 표현(Presentation): 사용자에게 어떻게 보여줄 것인가

컴포넌트의 렌더링, 스타일링, 인터랙션 피드백, 레이아웃 배치를 담당한다. "이 버튼은 파란색이다", "이 목록은 카드 형태로 보여준다", "로딩 중에는 스피너를 표시한다" 같은 것들이다.

```tsx
// 표현 관심사: 세금 계산 결과를 어떻게 보여줄 것인가
function TaxResultCard({ result }: { result: TaxCalculation }) {
  return (
    <div className={styles.card}>
      <h3>예상 세액</h3>
      <p className={styles.amount}>
        {formatCurrency(result.calculatedTax)}
      </p>
      <p className={result.refundOrPayment > 0 ? styles.refund : styles.payment}>
        {result.refundOrPayment > 0 ? '환급 예정' : '납부 예정'}:
        {formatCurrency(Math.abs(result.refundOrPayment))}
      </p>
    </div>
  );
}
```

이 컴포넌트는 **어떻게 보여줄 것인가**만 알고 있다. 세액이 어떻게 계산되었는지는 모른다.

### 2. 도메인(Domain): 비즈니스 규칙에 따라 어떻게 처리할 것인가

프레임워크와 무관한 비즈니스 로직이다. "과세표준 1,400만원 이하 구간은 세율 6%", "인적공제 1인당 150만원" 같은 세법에 근거한 규칙들이 여기에 속한다.

```typescript
// 도메인 관심사: 세법에 따른 세액 계산
export function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find(b => taxableBase <= b.limit)!;
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}
```

이 함수는 **어떤 규칙을 적용할 것인가**만 알고 있다. React도, DOM도, API도 모른다. [도메인 모델 글](/260418)에서 Alex Bespoyasov의 말을 빌려 강조했던 "React에서 Angular로 옮기더라도 변하지 않는 것"이 바로 이 계층이다.

### 3. 데이터 접근(Data Access): 데이터를 어디서 어떻게 가져올 것인가

API 호출, 로컬 스토리지 접근, WebSocket 연결 같은 외부 시스템과의 통신을 담당한다.

```typescript
// 데이터 접근 관심사: 홈택스 API에서 소득 데이터를 가져오는 것
export async function fetchIncomeData(taxpayerId: string): Promise<Income[]> {
  const response = await apiClient.get(`/api/income/${taxpayerId}`);
  return response.data.map(toIncome); // API 응답을 도메인 타입으로 변환
}
```

이 함수는 **데이터를 어디서 가져올 것인가**만 알고 있다. 그 데이터로 무엇을 계산할지, 화면에 어떻게 보여줄지는 모른다.

### 왜 이렇게 나누는가

Fowler가 이 분리를 강조하는 이유는 실용적이다.

**대체 가능성(Substitutability).** 같은 도메인 로직 위에 웹 UI, 모바일 앱, CLI 등 서로 다른 표현을 올릴 수 있다. 같은 표현과 도메인 로직 아래에 실제 API 대신 목 데이터를 연결할 수 있다.

**테스트 용이성(Testability).** 도메인 로직은 React Testing Library 없이 순수 함수 테스트로 검증할 수 있다. 표현은 도메인 로직을 모킹하고 렌더링만 확인하면 된다. 데이터 접근은 네트워크를 모킹하여 독립적으로 테스트할 수 있다.

**변경의 격리(Change Isolation).** 세법이 바뀌면 도메인 계층만, API 스펙이 바뀌면 데이터 접근 계층만, 디자인이 바뀌면 표현 계층만 수정하면 된다. 변경이 다른 계층으로 전파되지 않는다.

그렇다면 이 세 축을 프론트엔드 프로젝트에서 실제로 어떻게 구조화할 수 있을까?

---

## 실전: 컴포넌트 내부의 관심사 분리

가장 일상적인 수준에서의 관심사 분리는 **하나의 컴포넌트 안에서** 일어난다. [커스텀 훅 글](/260511)에서 다뤘던 내용과 직접 연결된다.

### Before: 관심사가 뒤섞인 컴포넌트

```tsx
function TaxPreviewPage() {
  // 데이터 접근 관심사
  const [incomeData, setIncomeData] = useState(null);
  useEffect(() => {
    fetch('/api/income').then(r => r.json()).then(setIncomeData);
  }, []);

  // 도메인 관심사 (세금 계산)
  const taxableBase = incomeData
    ? Math.max(0, incomeData.gross - incomeData.gross * incomeData.expenseRate - 1_500_000)
    : 0;
  let calculatedTax = 0;
  if (taxableBase <= 14_000_000) calculatedTax = taxableBase * 0.06;
  else if (taxableBase <= 50_000_000) calculatedTax = taxableBase * 0.15 - 1_260_000;
  // ...더 많은 분기

  // 표현 관심사
  return (
    <div>
      {!incomeData ? (
        <Spinner />
      ) : (
        <div>
          <h2>예상 세액: {calculatedTax.toLocaleString()}원</h2>
          <p className={taxableBase > 50_000_000 ? 'text-red' : 'text-green'}>
            과세표준: {taxableBase.toLocaleString()}원
          </p>
        </div>
      )}
    </div>
  );
}
```

이 컴포넌트는 데이터를 가져오고, 세금을 계산하고, 화면을 그리는 **세 가지 관심사**를 동시에 수행한다. 세법이 바뀌면 이 컴포넌트를 수정해야 하고, API가 바뀌어도 이 컴포넌트를 수정해야 하고, 디자인이 바뀌어도 이 컴포넌트를 수정해야 한다. 모든 변경 이유가 한곳에 모여 있는 것이다.

### After: 관심사별로 분리된 구조

```typescript
// domain/tax.ts — 도메인 관심사
export function computeFullTax(income: Income, deductions: Deductions): TaxCalculation {
  // 세법에 근거한 계산 로직 (React와 무관)
}
```

```typescript
// api/income.ts — 데이터 접근 관심사
export async function fetchIncome(): Promise<Income> {
  const response = await apiClient.get('/api/income');
  return toIncome(response.data);
}
```

```tsx
// hooks/useTaxPreview.ts — 관심사들의 조합
export function useTaxPreview() {
  const { data: income, isLoading } = useQuery(['income'], fetchIncome);
  const result = income ? computeFullTax(income, defaultDeductions) : null;
  return { result, isLoading };
}
```

```tsx
// components/TaxPreviewPage.tsx — 표현 관심사
function TaxPreviewPage() {
  const { result, isLoading } = useTaxPreview();

  if (isLoading) return <Spinner />;
  return <TaxResultCard result={result} />;
}
```

분리 후 각 파일은 **하나의 변경 이유**만 갖는다. 세법이 바뀌면 `domain/tax.ts`만, API가 바뀌면 `api/income.ts`만, 디자인이 바뀌면 `TaxResultCard`만 수정하면 된다. 각 계층을 독립적으로 사고하고 테스트할 수 있게 된 것이다.

여기서 주목할 것은 `useTaxPreview`라는 커스텀 훅의 역할이다. 이 훅은 데이터 접근과 도메인 로직을 **조합(orchestrate)** 하여 표현 계층에 필요한 데이터를 제공한다. [커스텀 훅 글](/260511)에서 "컴포넌트가 무엇을 하는지를 드러내고 어떻게 하는지를 감추는 추상화 도구"라고 했던 것이 바로 이 역할이다.

---

## 실전: 프로젝트 수준의 관심사 분리

컴포넌트 내부의 분리를 넘어, 프로젝트 전체 구조에서도 관심사의 분리가 작동한다.

### 기술 기반 구조 vs 도메인 기반 구조

많은 프론트엔드 프로젝트가 여전히 **기술 기반**으로 폴더를 나눈다.

```
src/
├── components/    ← 모든 컴포넌트
├── hooks/         ← 모든 훅
├── utils/         ← 모든 유틸
├── api/           ← 모든 API 호출
└── types/         ← 모든 타입
```

이 구조에서 "세금 계산 관련 코드를 수정해야 한다"면 `components/`, `hooks/`, `utils/`, `api/`, `types/` 다섯 폴더를 모두 뒤져야 한다. 파일이 기술별로 흩어져 있기 때문이다. 이것은 HTML/CSS/JS를 파일로 나누던 시절과 동일한 문제 — **기술 기반 분리와 실제 변경 단위의 불일치** — 가 폴더 구조에서 반복되는 것이다.

[도메인 모델 글](/260418)에서 제시했던 **도메인 기반 구조**는 이 문제를 해결한다.

```
src/
├── domains/
│   ├── tax/
│   │   ├── tax.ts                # 도메인 로직
│   │   ├── tax.viewModel.ts      # 표현 변환
│   │   ├── tax.test.ts           # 테스트
│   │   └── incomeMapper.ts       # API 변환
│   └── filing/
│       ├── filing.ts
│       ├── filing.viewModel.ts
│       └── filingMapper.ts
├── components/                    # 공통 UI 컴포넌트
├── hooks/                         # 공통 훅
└── api/                           # API 클라이언트
```

"세금 계산 관련 코드를 수정한다"면 `domains/tax/` 폴더 하나만 보면 된다. 관련된 도메인 로직, 표현 변환, API 매핑, 테스트가 모두 같은 곳에 있다. Kent C. Dodds의 Colocation 원리가 도메인 수준에서 적용된 것이다.

[Feature-Sliced Design](https://feature-sliced.design)이나 [Bulletproof React](https://github.com/alan2207/bulletproof-react) 같은 가이드도 이와 같은 방향을 제시한다. 핵심은 동일하다. **함께 변하는 코드를 함께 두라.**

### 의존성 방향이 곧 관심사의 경계

폴더를 나누는 것만으로는 관심사가 분리되지 않는다. Feature-Sliced Design의 표현을 빌리면, **"계층화는 폴더가 아니라 의존성 규율이다(Layering is not folders, it's dependency discipline)".**

[도메인 모델 글](/260418)에서 "filing.viewModel.ts는 filing.ts를 import하지만, filing.ts는 filing.viewModel.ts를 절대 import하지 않는다"고 했던 것이 바로 이 원칙이다.

```
표현(Presentation) → 도메인(Domain) → 데이터 접근(Data Access)
     ✅ import           ✅ import
     ❌ 역방향 import 금지
```

도메인 계층은 표현을 모르고, 데이터 접근 계층은 도메인을 모른다. 이 단방향 의존성이 지켜질 때, 각 계층을 진정으로 독립적으로 사고하고 수정할 수 있다. 이것이 Robert C. Martin이 Clean Architecture에서 말한 **의존성 규칙(Dependency Rule)** 의 핵심이다.

---

## 관심사 분리와 인접 원리들의 관계

관심사의 분리를 이야기할 때 자주 혼동되는 개념들이 있다. 이것들의 관계를 정리해두면 실무에서 판단이 더 명확해진다.

### 관심사의 분리 vs 단일 책임 원칙(SRP)

SRP(Single Responsibility Principle)는 Robert C. Martin이 제시한 원칙으로, **"하나의 모듈은 하나의 액터(변경을 요청하는 주체)에 대해서만 책임져야 한다"** 는 것이다. 흔히 "하나의 함수는 하나의 일만 해야 한다"고 오해되지만, Martin이 실제로 강조하는 것은 **"같은 이유로 변경되는 것들을 모으고, 다른 이유로 변경되는 것들을 분리하라"** 이다.

관심사의 분리는 SRP보다 상위 개념이다. SRP는 관심사의 분리를 모듈/클래스 수준에서 구체화한 것이라고 볼 수 있다. [커스텀 훅 글](/260511)에서 다뤘던 "God Hook 안티패턴" — 하나의 훅이 상품 페칭, 장바구니, 리뷰, 추적이라는 네 가지 관심사를 담고 있던 것 — 은 SRP 위반이자 관심사의 분리 위반이었다.

### 관심사의 분리 vs 추상화

[추상화 글](/260201)에서 "추상화의 본질은 코드를 읽는 사람이 알아야 할 맥락을 적절한 수준으로 줄여주는 것"이라고 정리했었다. 관심사의 분리는 추상화와 어떻게 다른가?

**관심사의 분리는 "무엇을 나눌 것인가"에 대한 원리**이고, **추상화는 "나눈 것을 어떻게 감출 것인가"에 대한 기법**이다.

세금 계산 로직을 컴포넌트에서 분리하기로 결정하는 것은 관심사의 분리이다. 분리한 로직을 `computeFullTax(income, deductions)`라는 이름의 함수로 캡슐화하여 내부의 누진세율 테이블을 감추는 것은 추상화이다. 관심사의 분리가 **경계를 긋는 행위**라면, 추상화는 **경계 뒤편을 감추는 행위**이다. 둘은 함께 작동한다.

### 관심사의 분리 vs 응집도/결합도

관심사의 분리를 실천하면, 자연스럽게 **높은 응집도(High Cohesion)** 와 **낮은 결합도(Low Coupling)** 가 따라온다.

- **응집도**: 하나의 모듈 안에 관련된 것들이 얼마나 모여 있는가. `domain/tax.ts`에 세금 관련 타입, 상수, 계산 함수가 모두 모여 있으면 응집도가 높다.
- **결합도**: 서로 다른 모듈이 얼마나 강하게 연결되어 있는가. `TaxPreviewPage`가 `computeFullTax`의 내부 구현(세율 테이블)에 직접 접근하면 결합도가 높다.

관심사의 분리는 응집도를 높이고 결합도를 낮추는 **전략**이라고 할 수 있다. [커스텀 훅 글](/260511)에서 "폼의 상태 관리, 유효성 검증, 제출 처리는 하나의 관심사 안에서 일어나는 연속적인 과정이므로 하나의 훅에 있어야 한다"고 했던 것이 바로 응집도를 기준으로 관심사의 경계를 판단한 것이다.

---

## 관심사 분리의 함정들

원리를 이해하는 것 못지않게, **흔히 빠지는 함정**을 아는 것도 중요하다.

### 함정 1: 기술 기반으로 나누고 있으면서 관심사를 나눴다고 착각하기

```
src/
├── components/TaxPreview.tsx
├── hooks/useTaxPreview.ts
├── utils/taxCalculation.ts
├── api/taxApi.ts
└── types/tax.ts
```

이 구조는 기술별(컴포넌트, 훅, 유틸, API, 타입)로 나뉘어 있다. 하지만 관심사의 관점에서 보면, 이 다섯 파일은 모두 **"세금 미리보기"** 라는 하나의 관심사에 속한다. 진정한 관심사 분리는 이것들을 함께 두고, **다른 관심사(예: 신고서 관리)와 분리**하는 것이다.

### 함정 2: 너무 이른 분리

[추상화 글](/260201)에서 "섣부른 추상화를 경계하라"고 했듯이, 관심사의 분리도 너무 이르면 해롭다. 프로젝트 초기에 도메인 계층, 데이터 접근 계층, 표현 계층, 유스케이스 계층을 모두 갖추려고 하면, 실제 코드는 100줄인데 폴더 구조만 복잡한 상황이 벌어진다.

Dan Abramov의 [Goodbye, Clean Code](https://overreacted.io/goodbye-clean-code/)에서도 비슷한 경고를 한다. 그는 코드를 "깔끔하게" 만들겠다는 욕구로 중복을 제거하고 구조를 추출했다가, 오히려 동료의 작업 맥락을 파괴한 경험을 이야기한다. 코드의 맥락을 충분히 이해하기 전에 구조적 분리를 서두르면, 나중에 실제 변경 패턴이 드러났을 때 잘못된 경계를 되돌리는 비용이 더 크다.

필자가 실무에서 따르는 순서는 이렇다.

1. **처음에는 한 컴포넌트에 다 넣는다.** 동작하게 만드는 것이 먼저다.
2. **컴포넌트가 커지면, 관심사가 보이기 시작한다.** "이 부분은 세법이 바뀌면 바뀌고, 이 부분은 디자인이 바뀌면 바뀌는구나."
3. **변경의 패턴이 반복되면, 그때 분리한다.** 분리의 경계가 추측이 아니라 경험에 기반하게 된다.

### 함정 3: 관심사를 분리했지만 결합도는 높은 경우

파일은 나눴는데 서로의 내부에 깊이 의존하고 있는 경우이다.

```typescript
// 파일은 분리되었지만, 표현 계층이 도메인의 내부 구조에 의존
import { TAX_BRACKETS } from '../domain/tax';

function TaxBracketIndicator({ taxableBase }) {
  const bracket = TAX_BRACKETS.find(b => taxableBase <= b.limit)!;
  return <span>적용 세율: {bracket.rate * 100}%</span>;
}
```

이 컴포넌트는 `TAX_BRACKETS`라는 도메인 내부의 구현 세부사항에 직접 접근하고 있다. 파일은 분리되었지만, 세율 테이블의 구조가 바뀌면 이 컴포넌트도 함께 깨진다. [도메인 모델 글](/260418)에서 제시했던 ViewModel 패턴이 이 문제를 해결한다. 도메인의 **공개 인터페이스**만 사용하고, 표현에 필요한 변환은 별도의 ViewModel 계층에서 처리하는 것이다.

```typescript
// domain/tax.ts — 공개 인터페이스만 노출
export function getAppliedTaxRate(taxableBase: number): number { /* ... */ }

// domain/tax.viewModel.ts — 표현 변환
export function formatTaxRate(taxableBase: number): string {
  return `${getAppliedTaxRate(taxableBase) * 100}%`;
}
```

---

## 관심사 분리의 판단 기준

실무에서 "이걸 분리해야 하나?"라는 질문에 직면했을 때, 필자가 사용하는 판단 기준들을 정리해본다.

### "이것이 변할 때, 저것도 변해야 하는가?"

가장 핵심적인 판단 기준이다.

- **Yes → 같은 관심사이다.** 함께 둔다. 폼의 상태 관리와 유효성 검증과 제출 처리는 함께 변한다.
- **No → 다른 관심사이다.** 분리한다. 세율 계산과 세금 신고서 상태 전이는 독립적으로 변한다. (`domain/tax.ts`와 `domain/filing.ts`의 분리)

### "이 관심사를, 나머지를 모르는 사람에게 설명할 수 있는가?"

Dijkstra의 원래 정의로 돌아가보자. 관심사의 분리의 핵심은 **"하나의 측면을 독립적으로 사고할 수 있는가"** 이다. 이것을 실용적인 테스트로 바꾸면 이렇다. "이 모듈이 하는 일을 설명할 때, 다른 모듈의 내부 동작을 언급해야 하는가?"

`computeFullTax`를 설명할 때 "소득과 공제 정보를 받아서 세법에 따라 세액을 계산한다"고 말할 수 있다. React가 어떻게 렌더링하는지, API가 어떤 형태로 데이터를 내려주는지를 언급할 필요가 없다. 이것이 관심사가 잘 분리된 상태이다.

반면 "이 함수는 API에서 받은 `tot_amt` 필드를 파싱해서 세율을 계산하고, 결과를 `setState`로 업데이트한다"라고 설명해야 한다면, 세 가지 관심사가 한곳에 뒤섞여 있다는 뜻이다.

### "이 코드를 다른 프로젝트에 가져갈 때, 얼마나 따라오는가?"

관심사가 잘 분리되어 있으면 **하나의 관심사만 들어올린(lift) 수 있다.** `domain/tax.ts`를 다른 프로젝트에 가져갈 때 React, API 클라이언트, 스타일 라이브러리가 딸려온다면, 도메인 관심사가 다른 관심사와 결합되어 있다는 신호이다.

물론 모든 코드를 재사용 가능하게 만들어야 한다는 뜻은 아니다. 하지만 "이 모듈을 떼어내려면 얼마나 많은 것이 따라오는가?"라는 사고 실험은 결합도를 가늠하는 좋은 도구이다.

### "이 로직이 사라지면, 비즈니스가 깨지는가? 화면만 깨지는가?"

도메인 관심사와 표현 관심사를 구분하는 실용적인 기준이다. 비즈니스가 깨지면 도메인 관심사이고, 화면만 깨지면 표현 관심사이다. 이 둘을 같은 모듈에 넣으면, 세법 개정이라는 변경과 디자인 리뉴얼이라는 변경이 같은 파일에서 충돌하게 된다.

### "이 코드를 독립적으로 테스트할 수 있는가?"

테스트 가능성은 관심사가 잘 분리되었는지를 확인하는 리트머스 시험지이다. 세금 계산 로직을 테스트하는데 React를 임포트해야 한다면, 도메인 관심사와 표현 관심사가 섞여 있다는 신호이다.

### "이 이름으로 관심사가 전달되는가?"

`utils/helpers.ts`라는 이름은 어떤 관심사인지 알 수 없다. `domain/tax.ts`는 분명하다. 이름을 지을 수 없다면, 그것은 하나의 관심사로 응집되지 않았거나, 아직 관심사의 경계가 불명확한 것이다.

---

## 마무리하며

관심사의 분리는 1974년 Dijkstra가 처음 명명한 이래 반세기가 넘도록 소프트웨어 설계의 근본 원리로 남아있다. 그런데 필자가 이 글을 쓰면서 가장 인상 깊었던 것은, 이 원리가 **코드를 나누는 기법이 아니라 사고를 정리하는 기법**이라는 Dijkstra의 원래 정의이다.

프론트엔드에서 관심사의 분리는 시대에 따라 형태가 변해왔다. HTML/CSS/JS로 기술을 나누던 시대에서, React가 컴포넌트라는 새로운 분리 단위를 제시했고, 이제는 컴포넌트 내부에서도 표현·도메인·데이터 접근이라는 관심사를 나누는 시대에 이르렀다. 하지만 형태가 변해도 본질은 동일하다. **"각 관심사를 독립적으로 사고할 수 있는 구조를 만들라."**

이 글을 포함하여 [추상화](/260201), [도메인 모델](/260418), [커스텀 훅](/260511)까지 네 편의 글이 결국 하나의 질문을 서로 다른 각도에서 다뤄온 셈이다. "어떻게 하면 복잡한 코드를 사람이 이해할 수 있는 단위로 나눌 수 있는가?" 추상화는 그 단위의 **깊이**를, 도메인 모델은 **경계**를, 커스텀 훅은 **도구**를, 관심사의 분리는 **원리**를 제공한다.

정답이 되는 보편적인 구조는 없다. 하지만 "이 코드가 변할 때 저 코드도 변해야 하는가?", "이 관심사를 독립적으로 사고할 수 있는가?"라는 질문을 습관적으로 던져보면, 대부분의 경우 합리적인 경계에 도달할 수 있을 것이다.

이 글을 읽는 독자분들의 코드베이스에도 "왜 이 파일을 수정하는데 저 파일까지 건드려야 하지?"라는 순간이 있을 것이다. 그 불편함이 바로 관심사가 제대로 분리되지 않았다는 신호이다. 그 신호를 무시하지 않는 것에서부터 좋은 구조가 시작된다.
