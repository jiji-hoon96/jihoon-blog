---
emoji: 🧩
title: "Domain Models"
seoTitle: "A Guide to Frontend Domain Model Design — Applying DDD"
date: "2026-04-18"
categories: frontend Architecture DDD
description: "A frontend-focused guide to domains, domain models, and domain objects, covering Entities, Value Objects, the Anemic Domain Model, and separating ViewModels. Learn practical ways to separate domain logic in React through a comprehensive income tax example."
keywords: "frontend domain model, domain-driven design, frontend DDD, Frontend DDD, Domain Object, Entity Value Object, Anemic Domain Model, Clean Architecture frontend, Eric Evans, Martin Fowler, domain logic separation, React design patterns, frontend architecture, ViewModel separation, Bounded Context"
locale: en
translationOf: '260418'
sourceHash: a1d3e0f7ef15a579dbf42aa51384cdd5203c46ecd7905a9859da49208df8e961
---

In this post, I want to talk about the **domain**.

Throughout my career as a developer, I have encountered the word **"domain"** quite often. Yet when someone asks, "What exactly is a domain?" it is not easy to give a clear answer. (Honestly, when I first started programming, I thought domain meant the "www" kind.)

Looking up information about domains naturally leads to concepts such as **domain models**, **domain objects**, and **domain object models**. I have always found it unfortunate that there are not many articles that clearly explain how these concepts differ, or what they mean on the **frontend** rather than the backend. In this article, I will start with a definition of each concept and use examples to explore how domain logic can be appropriately separated and abstracted on the frontend.

Lately, I have been very interested in the tax domain. With the comprehensive income tax filing season coming up in May, I will use taxes for the examples in this article.

---


## Domain

Let us begin with the most fundamental question. What is a **domain**?

In his book **Domain-Driven Design: Tackling Complexity in the Heart of Software (2003)**, Eric Evans defines a domain as follows.

::::quote
:::translation
A sphere of knowledge, influence, or activity.
:::

:::original
"A sphere of knowledge, influence, or activity."
:::
::::

Put simply, the domain is the **problem space that we intend to solve through programming**. If we are building a tax filing service, "tax filing" is the domain; if we are building an insurance claims platform, "insurance claims" is the domain. A domain is not code. It is a real-world problem space that exists before the software does.

What does this mean for frontend developers? Ultimately, the UI we build is a **window** that lets users see and manipulate the domain. When developing tax-refund services such as Toss Income or 3o3, whose primary domain is tax, we are expressing domain concepts such as income types, expense rates, income deductions, tax credits, and refund amounts through the UI. Frontend developers therefore need a deep understanding of the domain they work with. In other words, knowing **"what problem this service solves"** is just as important as being good at rendering UI components.

But even a single domain called "tax" contains countless subdomains when examined closely. This is true even of the comprehensive income tax calculation pipeline I only understand at a high level.

![1.png](1.png)

Each stage of this pipeline is a subdomain with its own rules and data. Within the broad domain of "tax," the detailed domains of Income, Deduction, Tax, and Filing are intertwined. How these should be divided in code is the central question of domain modeling.


## Domain Model

Then what is a domain model? How is a domain different from a "domain model"?

Martin Fowler and Eric Evans define a domain model as follows.

::::quote
:::translation
An object model of the domain that incorporates both behavior and data. — Martin Fowler
:::

:::original
An object model of the domain that incorporates both behavior and data.
:::
::::

::::quote
:::translation
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain. — Eric Evans
:::

:::original
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain.
:::
::::

The key is **"selective abstraction."** A domain model does not contain everything in the real world. Just as a film director does not capture every scene in reality but selects only the scenes needed for the story, a domain model **selects and structures only the aspects needed to solve the problem**.

There is one important point here. A domain model does not necessarily have to be code. It might be a diagram on a whiteboard, or a shared mental model in the minds of team members. Ultimately, the term domain model itself can refer to a concept independent of software.

This is where frontend developers are particularly prone to confusion. They see the structure of an API response and think, "So this is the domain model." But that is a **data model**, not a domain model.

The distinction between a data model and a domain model is as follows.

| Category  | Domain Model                                      | Data Model                                 |
| --------- | ------------------------------------------------- | ------------------------------------------ |
| Purpose   | Express business concepts and rules               | Define storage/transfer structures         |
| Language  | Business terms (tax base, tax credit, refund)     | Technical terms (string, number, array)    |
| Contains  | Data + behavior (rules)                           | Data structure only                        |
| Example   | "The rate is 6% for a tax base up to KRW 14M"    | `{ taxableBase: number, taxRate: number }` |

A data model defines "the shape in which data is exchanged," while **a domain model defines "what that data means to the business and what rules it follows."** If we fail to distinguish the two, components become directly dependent on the API response structure, and the entire frontend is thrown into disarray whenever the backend schema changes.


## Domain Object

If a domain model is a system of concepts, a **domain object** is a concrete implementation of one of those concepts in code.

In [an article by Jason Swett](https://www.codewithjason.com/difference-domains-domain-models-object-models-domain-objects/), who runs Code with Jason, he defines a domain object as follows.

::::quote
:::translation
Any object in my object model that also exists as a concept in my domain model, I would call a domain object.
:::

:::original
Any object in my object model that also exist as a concept in my domain model I would call a domain object.
:::
::::

In other words, if the domain model contains a concept called "comprehensive income" and the code contains a type called `Income`, that `Income` is a domain object. But not every object in code is a domain object. Things such as `HttpClient`, `LocalStorageAdapter`, and `useDebounce` are technical tools, not domain concepts.


### Entity and Value Object

Evans classifies domain objects into three categories: **Entity**, **Value Object**, and **Service**. (Martin Fowler calls this the "Evans Classification.") A Service is a separate concept that represents "a domain operation that does not naturally belong to a particular object." Because the focus of this article is how data is identified, we will concentrate on Entities and Value Objects.

An **Entity** is an object with a unique identity that persists across time and different representations. A tax filing (TaxFiling), taxpayer (Taxpayer), or income record (IncomeRecord) is identified by a unique ID; even if its properties change, it remains the same Entity as long as its ID is the same. Even when the deductions on a filing are edited, it is still the same filing unless the filing ID changes.

A **Value Object** is an object whose meaning comes solely from the combination of its properties, and two Value Objects are considered equal when all their property values are equal. Money, a tax rate (TaxRate), and a tax bracket (TaxBracket) are objects whose values themselves carry the meaning. A "6% tax rate" is simply a "6% tax rate" wherever it is used.

Why does this distinction matter on the frontend? Let us look at the code below.

```typescript
interface TaxFiling {
  id: string;
  taxpayerName: string;
  taxYear: number;
  status: FilingStatus;
}

const isSameFiling = (a: TaxFiling, b: TaxFiling) => a.id === b.id;

interface Money {
  amount: number;
  currency: "KRW" | "USD";
}

const isSameMoney = (a: Money, b: Money) =>
  a.amount === b.amount && a.currency === b.currency;
```

TaxFiling is an Entity because it uses its id as the basis of identity. (Merely having an id field does not make something an Entity; the key is that "the id determines whether two objects are the same or different.") Money has no id and is identified only by the combination of amount and currency; it is considered the same value when all properties are equal.

Entities use ID-based comparison; Value Objects use property-based comparison. Making this distinction explicit naturally clarifies the state-management logic for determining whether data is the same or different. When updating an item in a list, for example, an Entity can be found and replaced by ID, while a Value Object can be replaced immutably.


## Domain Object Model

We now understand the "domain model" and the "domain object," but what is a **domain object model**?

Surprisingly, I could not find a commonly agreed-upon definition. A substantial body of literature treats "domain model," "domain object model," "conceptual model," and "analysis object model" as **effectively synonymous**—different names for the conceptual model created during object-oriented analysis.

Another perspective, however, sees it as a more distinct layer. A representative explanation is that the **object model is the point where a domain model is translated into actual code**.

Under this second view, an **object model** is the structure of **every object in the system's code**. This includes technical tools such as `HttpClient` and `useDebounce`. Within it, the **subset of objects that represent domain concepts, together with the relationships among them**, is the **domain object model**. This also aligns with the object-oriented modeling tradition, which has defined an "object model" as the static structure of a system—its classes, properties, operations, and relationships.

I find this perspective more practical for frontend developers because the code we actually write always mixes domain objects with technical objects.

Ultimately, **domain → domain model → domain object model → domain object** is a progression from the abstract to the concrete. The domain is the broadest, and the domain object is the most concrete. Thus, the area we actually wrestle with when writing frontend code is **how to structure the domain object model—the types that express domain concepts and the relationships among them**.


## Where Should Domain Logic Live on the Frontend?

That covers the definitions. Now let us turn to practice. **Where** should domain logic live on the frontend?

[Khalil Stemmler](https://khalilstemmler.com/about/), who has a deep interest in software design, initially argued that "business logic does not belong on the frontend." He later revised his position, saying, "Almost everything we do architecturally on the backend can and should also be done on the frontend."

I agree with this position. Of course, the frontend must not become the **Single Source of Truth** for business logic. That is the backend's role. But the frontend clearly has **domain logic of its own**.

Consider a case where "the estimated refund must update in real time based on the information the user enters." If this calculation logic exists only on the backend, an API call must be made every time the user changes a single digit in their income. The UI pauses for a network round trip, and a fast typist can trigger a flood of unnecessary requests. Even with debounce, a delay of a few hundred milliseconds is enough to undermine the experience of a "real-time preview." **Ultimately, calculations that require immediate feedback have to be performed directly on the frontend, which means some logic can only be performed there.**


### When Domain Logic Is Mixed into a Component

Consider a comprehensive income tax preview screen. It shows the estimated tax in real time as the user enters income information. The code below is a common example in which domain logic and UI logic are intertwined.

```tsx
function TaxPreviewPage() {
  const [총수입, set총수입] = useState(0);
  const [경비율, set경비율] = useState(0.641); 
  const [인적공제대상인원, set인적공제대상인원] = useState(1); 

  const 종합소득금액 = 총수입 - 총수입 * 경비율;

  const 소득공제합계 = 인적공제대상인원 * 1_500_000;
  const 과세표준 = Math.max(0, 종합소득금액 - 소득공제합계);

  let calculatedTax = 0;
  if (과세표준 <= 14_000_000) {
    calculatedTax = 과세표준 * 0.06;
  } else if (과세표준 <= 50_000_000) {
    calculatedTax = 과세표준 * 0.15 - 1_260_000;
  } else if (과세표준 <= 88_000_000) {
    calculatedTax = 과세표준 * 0.24 - 5_760_000;
  } else if (과세표준 <= 150_000_000) {
    calculatedTax = 과세표준 * 0.35 - 15_440_000;
  } else {
    calculatedTax = 과세표준 * 0.38 - 19_940_000;
  }

  const 기납부세액 = 총수입 * 0.033;
  const refundOrPayment = 기납부세액 - calculatedTax;

  return <div>...</div>;
}
```

Can you see the problem? **Business rules established by tax law**—"KRW 1.5 million in personal deductions per person," "eight progressive tax brackets," and "3.3% withholding"—are embedded directly in a React component. Tax law changes every year. When such rules are scattered across components, each revision sends us hunting for every place that needs to change. And if the QA team maintains E2E scenarios, the testing cost will be substantial as well.

Eventually it becomes difficult to distinguish view logic from business logic, and the code turns into a tangle of conditionals and custom hooks.


### Let Us Separate the Domain Logic

Let us borrow the central principle from Alex Bespoyasov's Clean Architecture approach: separate domain logic into **pure functions that do not depend on a framework**.

::::quote
:::translation
The domain is the core that distinguishes one application from another. You can think of the domain as something that will not change if we move from React to Angular.
:::

:::original
The domain is the core that distinguishes one application from another. You can think of the domain as something that won't change if we move from React to Angular.
:::
::::

Let us refactor the tax calculation example above.

First, we define the domain types and rules, keeping related information together.

```typescript
export interface Income {
  grossAmount: number;
  expenseRate: number;
}

export interface Deductions {
  personalCount: number;
  pensionPaid: number;
  additionalDeductions: number;
}

const PERSONAL_DEDUCTION_PER_PERSON = 1_500_000;
const WITHHOLDING_RATE = 0.033;
const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, progressiveDeduction: 0 },
  /** ...구간들... **/
] as const;
```

Then we separate the domain logic into pure functions.

The logic for income calculation, deductions, tax base, tax, and refunds discussed above is extracted into a `computeFullTax` function. Each stage is then broken down into smaller pure functions. If the result type is inferred with `ReturnType<typeof computeFullTax>`, there is no need to declare a separate interface.

The component then does nothing but "use" the domain logic.

```tsx
import { computeFullTax } from "../domain/tax";

function TaxPreviewPage() {
  const [income, setIncome] = useState<Income>({
    grossAmount: 0,
    expenseRate: 0.641,
  });
  const [deductions, setDeductions] = useState<Deductions>({
    personalCount: 1,
    pensionPaid: 0,
    additionalDeductions: 0,
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

What has changed?

- The **table of eight progressive tax brackets** (`TAX_BRACKETS`) is gathered in one place, so when tax law changes, only `domain/tax.ts` needs to be updated.
- The **calculation pipeline** is cohesive within a single `computeFullTax` function, making the entire flow visible at a glance. (It is grouped into one function to keep the example simple, but in a real project it would be appropriate to divide it further by purpose, such as income calculation, deduction calculation, and tax calculation.)
- The **component focuses only on "how to present it."** A change in tax rates does not require modifying the component.
- Even if we migrate from React to another framework, `domain/tax.ts` **does not change**.

Once domain logic is separated, testing becomes surprisingly simple. This is especially important in the tax domain, where **calculation accuracy directly affects the user's money**.

Pure functions containing tax calculation logic need neither React Testing Library nor `render` nor `screen.getByText`. Supply an input and check the output—that is all. Cases such as "a 6% rate up to KRW 14 million," "zero tax when the tax base is zero," and "the refund on KRW 30 million of freelance income" can each be expressed as a one-line `it`. Domain unit tests naturally establish boundaries for component separation, while the test code also serves as documentation.


## Anemic Domain Model

In the previous section, we separated **calculation logic**. But domain logic also includes **state-transition rules** and **authorization decisions**. Questions such as "Can this filing be edited right now?", "Can it be submitted?", and "Can the claim method be changed?" fall into these categories. Separating these rules presents an easy trap: the **Anemic Domain Model**, a term coined by Martin Fowler.

An Anemic Domain Model is a state in which **types are well defined in the domain language, but the rules that operate on them have been scattered outside the domain**. Consider the tax filing domain. The type is tidy.

```typescript
// types/filing.ts
export interface TaxFiling {
  id: string;
  status: "draft" | "submitted" | "reviewing" | "completed" | "amended";
  taxYear: number;
  filingType: "regular" | "late" | "amendment";
  determinedTax: number;
}
```

But the rules for decisions and transitions concerning this type are buried elsewhere.

```typescript
// utils/filingHelpers.ts
export function canAmendFiling(filing: TaxFiling) {
  return filing.status === "completed" && filing.filingType !== "amendment";
}

// components/FilingDetail.tsx
function FilingDetail({ filing }: { filing: TaxFiling }) {
  // 같은 도메인 규칙을 컴포넌트 안에 다시 작성한다
  const canEdit = filing.status === "draft" || filing.status === "reviewing";
  // ...
}

// hooks/useSubmitFiling.ts
export function handleSubmitFiling(filing: TaxFiling) {
  if (filing.status !== "draft") return;
  // ...
}
```

The same domain rule exists in three different forms across utils, a component, and a hook. If a requirement comes in saying, "The eligibility conditions for claims are changing," we must hunt down every place that needs updating, while any one we miss will make an incorrect decision somewhere on the site. Fowler criticized such code as **"little more than procedural code wearing the skin of an object-oriented model."**

The solution is the same one we applied to calculation logic in the previous section: **put the rules next to the type**.

```typescript
export interface TaxFiling {
  id: string;
  status: FilingStatus;
  taxYear: number;
  filingType: FilingType;
  determinedTax: number;
}

export type FilingStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "completed"
  | "amended";

export type FilingType = "regular" | "late" | "amendment";

// 도메인 규칙은 도메인 옆에 둔다
export function canEdit(filing: TaxFiling): boolean {
  return filing.status === "draft";
}

export function canSubmit(filing: TaxFiling): boolean {
  return filing.status === "draft" && filing.determinedTax >= 0;
}

export function canAmend(filing: TaxFiling): boolean {
  return filing.status === "completed" && filing.filingType !== "amendment";
}
```

Now every filing-related rule is managed in a single place: `domain/filing.ts`. Any component can call `canAmend(filing)`, and when a rule changes, only this one file needs to be updated. The key is to **treat the type and the rules that operate on it as one unit**. A partial separation that puts only the type in the domain folder while moving its rules to utils may look clean, but it is still anemic.


## The Translation Layer Between API Responses and the Domain Model

There is one more factor to consider in practice: the backend API response structure and the frontend domain model do not always match. This is even more true for a tax service integrated with government systems. Data from Korea's National Tax Service Hometax system is full of abbreviations and coded values, so it is unlikely to arrive in the same shape as the frontend domain model.

What we need here is a **transformation layer (Mapper)**. Rather than passing the API response type all the way into components, we first refine it into a domain type. A single pure function is enough.

```typescript
import type { Income } from "../domain/tax";

interface HometaxIncomeResponse {
  총수입금액: number;
  경비율: number;
  소득유형코드: string;
  // ... 나머지 약어 필드들
}

export function toIncome(response: HometaxIncomeResponse): Income {
  return {
    총수입_금액: response.총수입금액,
    경비_비율: response.경비율,
  };
}
```

This converts abbreviated fields such as `총수입금액` and `경비율`, as well as code-based classifications in the API response, to suit the frontend domain **in one place**. Values such as the income-type code that need to be expanded into an enum can be handled with a small lookup table inside the mapper. Even if the field names in the Hometax API change, only the mapper needs to be updated.


## Utility Functions and Domain Logic

When separating domain logic, one question inevitably arises: **"Isn't this just a utility function?"**

Consider the following two functions.

```typescript
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find((bracket) => taxableBase <= bracket.limit);
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}
```

`formatCurrency` is pure **presentation logic** that converts a number to a string. Adding the unit "won" and thousands separators is not a business rule; it concerns how a value is shown to the user. By contrast, `calculateTax` contains a **business rule grounded in tax law**: applying eight progressive tax brackets. It is a domain rule that must apply in exactly the same way even if there is no UI.

Here is the criterion I use in practice.

> **If this logic disappears, does the business break, or only the screen?**

If the business breaks, it is domain logic. If only the screen breaks, it is presentation logic. This one question can identify most boundaries.

| Criterion                     | Domain Logic                              | Utility/Presentation Logic       |
| ----------------------------- | ----------------------------------------- | -------------------------------- |
| What breaks without it?       | Tax calculation                           | The screen (UI) looks wrong      |
| What if the framework changes?| Remains unchanged                         | May change                       |
| Is it in the product spec?    | "Tax base × rate - progressive deduction"| "Separate amounts with commas"  |
| Same logic on the backend?    | Exists or should exist                    | No (frontend-only concern)       |

Reality, however, is not this tidy. The hardest cases are those that **look like domain logic but are actually presentation logic**.

Consider the code below. It was classified as domain logic because it takes the domain concept FilingStatus as an argument. But is it really domain logic?

```typescript
// domain/filing.ts
function getStatusBadgeColor(status: FilingStatus): string {
  const colors: Record<FilingStatus, string> = {
    draft: "gray",
    submitted: "blue",
    reviewing: "yellow",
    completed: "green",
    amended: "purple",
  };
  return colors[status];
}

function getStatusDisplayText(status: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    draft: "작성 중",
    submitted: "제출 완료",
    reviewing: "검토 중",
    completed: "신고 완료",
    amended: "경정청구",
  };
  return labels[status];
}
```

Although `getStatusBadgeColor` and `getStatusDisplayText` use the domain concept `FilingStatus`, what they do is **screen presentation**. Changing a badge color does not break the business at all. Putting such functions in `domain/filing.ts` makes the domain module increasingly bloated and mixes genuine domain logic with presentation logic.


### Separating the Domain Model and ViewModel

There is a practical way to solve this problem: **separate the ViewModel into its own file within the same domain folder**. Rather than `.ui.ts`, using the name `.viewModel.ts` connects naturally to the ViewModel concept in the MVVM pattern. The name immediately communicates its role as "a layer that transforms domain data for the screen."

```
domains/
└── filing/
    ├── filing.ts              # 순수 도메인 모델 + 도메인 로직
    ├── filing.viewModel.ts    # ViewModel (표현 변환 계층)
    ├── filing.test.ts         # 도메인 로직 테스트
    └── filingMapper.ts        # API ↔ 도메인 변환
```

Move the `getStatusBadgeColor` and `getStatusDisplayText` functions we saw earlier directly into `filing.viewModel.ts`. Transformations that expand filing types into Korean labels, such as `getFilingTypeLabel(type: FilingType): string`, are gathered there as well. `filing.ts` is responsible only for business rules, while `filing.viewModel.ts` is responsible only for screen presentation.

The key is the **direction of dependency**. `filing.viewModel.ts` imports `filing.ts`, but `filing.ts` never imports `filing.viewModel.ts`. The domain knows nothing about presentation; presentation knows about the domain. This can be seen as a miniature version of Robert C. Martin's Dependency Rule.

I placed the files in the same folder because I believe files that change together should live in the same directory. If the `FilingStatus` type gains a new value (such as `'rejected'`), both `filing.ts` and `filing.viewModel.ts` must be updated. Since they are in the same folder, the scope of the change is visible at a glance.


## Boundaries and Cohesion

Just as important as separating domain logic is deciding **where to draw the boundaries**. Here are several boundary decisions I often encounter in practice.

The data handled by a frontend comes from roughly four sources.

- **Server data**: received in an API response
- **Derived data**: calculated from server data
- **UI state**: used to control the screen and reflect user interactions
- **User input**: values currently being entered in a form

Combining all four in one type pollutes the domain model.

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

This type puts domain concepts, UI state, and temporary data in one basket. Every change to `activeStep` effectively updates the Filing domain. (Changing a form step is not a business event.)

The improvement is to divide the types along their boundaries. The **domain model** contains only business concepts such as `id`, `status`, and `determinedTax`; **UI state** (`FilingFormViewState`) contains only screen controls such as `isExpanded` and `activeStep`; and **form state** (`DeductionEditForm`) contains only temporary data being entered.

This gives each type **a single reason to change**. A domain type changes only when tax law changes, UI state only when the screen design changes, and form state only when the input UX changes.


### Keep Things That Change Together Together

Eric Evans's DDD includes the concept of an **Aggregate**: "a cluster of related objects treated as a single unit." We do not need to apply this concept wholesale on the frontend, but its central principle—**keep data and rules that change together together**—is worth borrowing.

In a tax service, for example, `Income` and `ExpenseRate` always change together. When the income type changes, the applicable expense rate changes, and the comprehensive income calculation is affected as well. These should therefore be kept together in one file, `domain/tax.ts`.

By contrast, `TaxFiling` can change independently of tax calculation. A change to the filing's state-transition rules does not affect tax-rate calculation logic. It is therefore appropriate to separate it into `domain/filing.ts`.

```
이렇게 묻자: "A가 변할 때 B도 반드시 변해야 하는가?"
  → Yes: 같은 모듈에 둔다 (Income + ExpenseRate + TaxBracket)
  → No: 분리한다 (Tax 계산 ↔ Filing 상태관리)
```


## Class vs. Functional Style

At this point, a fundamental question may come to mind. Every example so far has used a combination of `interface` and pure functions. Would cohesion be more natural if we represented the domain with a class?

That is a fair point. A class-based representation of the domain binds data and behavior into a single object, making cohesion immediately visible in the code structure.

```typescript
class TaxFilingModel {
  constructor(
    public readonly id: string,
    public readonly status: FilingStatus,
    public readonly taxYear: number,
    public readonly filingType: FilingType,
    public readonly determinedTax: number,
  ) {}

  canEdit(): boolean {
    return this.status === "draft";
  }

  canAmend(): boolean {
    return this.status === "completed" && this.filingType !== "amendment";
  }

  canSubmit(): boolean {
    return this.status === "draft" && this.determinedTax >= 0;
  }
}

const filing = new TaxFilingModel(
  "F-001",
  "completed",
  2025,
  "regular",
  547200,
);

filing.canAmend();
```

With a class-based approach, behavior belongs to the data. The subject is also explicit at the call site. `filing.canAmend()` is as intuitive as reading natural language: the subject (filing) and verb (canAmend) are clearly bound together. It is like writing `jihoon.eat('감자탕')` and immediately reading, "Jihoon eats gamjatang."

By contrast, the functional style looks like this.

```typescript
canAmend(filing);
eat("jihoon", "감자탕");
```

In the functional style, the data exists outside the function. The first call takes `filing` as an argument and performs an action, while `eat` takes `jihoon` and `감자탕` as its arguments.

As a result, the bond between subject and verb is looser. To know that the `canAmend` function concerns `TaxFiling`, we have to open the file or inspect its type signature. If functions such as `canAmend(filing)`, `canEdit(filing)`, and `calculateTax(taxableBase)` are mixed in the same file, it may be difficult to see at a glance which domain each function belongs to.


### So Should We Use Classes?

Honestly, the answer is **"it depends."** In my experience, however, there are practical reasons classes are not a silver bullet in a React + TypeScript environment.

**1. Friction with React State Management**

React state management fits most naturally with **plain objects**. `useState` and `useReducer` can technically hold any value, and Redux DevTools does not itself remove a class instance's prototype. If Redux/Zustand persistence middleware stores and restores state as JSON, however, a class instance loses its methods and prototype in the `JSON.stringify` → `JSON.parse` cycle and becomes a plain object. The props boundary from a React Server Component to a Client Component has a different constraint: it accepts only supported serializable values, so an arbitrary class instance cannot be passed through it in the first place.

Consider the code below.

```typescript
const [filing, setFiling] = useState(
  new TaxFilingModel("F-001", "draft", 2025, "regular", 0),
);
```

Updating React state alone does not stop `filing` from being an instance of `TaxFilingModel`. If Redux/Zustand persistence saves and restores it as JSON, however, the restored value may be a plain object without methods, so an innocent call to `filing.canAmend()` can produce a runtime error. Passing it from a React Server Component to a Client Component fails earlier because a class instance is not a supported serializable prop value.

**2. The Difficulty of Guaranteeing Immutability**

React detects state changes based on **referential equality**. If a method on a class instance mutates internal state with something like `this.items.push(...)`, the reference stays the same and React does not trigger a rerender. In the end, `addDeduction(item)` has to return a new instance every time—something like `return new DeductionList([...this.items, item])`. That undermines the class advantage of "encapsulated state mutation" and leaves code that is not very different from functional updates.


### Strategies for Achieving Cohesion in a Functional Style

Then how can we improve the loose cohesion of code such as `eat('jihoon', '감자탕')` in a functional style? Here are three approaches I have found effective.

**1. Create Cohesion with a Module Namespace**

This is the most straightforward approach. Make the file (module) itself correspond to a domain, and use a namespace when importing it. We can use the `domain/filing.ts` defined earlier as-is.

```typescript
import * as FilingModel from "../domain/filing";

FilingModel.canEdit(filing);
FilingModel.canAmend(filing);
FilingModel.canSubmit(filing);
```

`FilingModel.canAmend(filing)` is not quite as compact as `filing.canAmend()`, but the code makes it immediately clear that this function belongs to the Filing domain. It also eliminates the risk of functions from several domains being mixed together.

**2. Always Make the Domain Subject the First Argument**

Another convention expresses cohesion in a functional style: **always make the first argument the "subject of the behavior."** Consistent signatures such as `canAmend(filing)` and `calculateTotalIncome(income)` allow `canAmend(filing)` to read as "ask canAmend about filing." This also resonates with the Unix pipeline mindset (`data |> transform`). In fact, Go's method receiver follows precisely this pattern, and Rust's `impl` blocks accept `self` as the first argument from the same underlying idea.

**3. Bundle Behavior with a Domain Object Factory**

This pattern is useful when we miss the cohesion of a class. A factory function returns a domain object and its behavior together.

```typescript
export function createFilingModel(data: TaxFiling) {
  return {
    ...data,
    canEdit: () => data.status === "draft",
    canSubmit: () => data.status === "draft" && data.determinedTax >= 0,
    canAmend: () =>
      data.status === "completed" && data.filingType !== "amendment",
  } as const;
}

const filing = createFilingModel(rawFiling);
filing.canAmend();
filing.canEdit();
```

This pattern combines the expressiveness of a class (`filing.canAmend()`) with the practicality of composing behavior through an object literal. Because the returned object has function properties, it is not itself JSON-serializable data. It also creates new function objects each time, but at the scale of data handled on the frontend, this is rarely a performance problem.


## How Far Should We Separate Things?

Clean Architecture describes an ideal structure with three or four layers and defined Ports/Adapters. Applying this structure to every project in the real world, however, can become over-engineering.

Here are the practical guidelines I use.

- **Separate domain types from API response types.** Whether using an `interface` or a `type`, define the domain concepts used by the frontend in separate files.
- **Move logic containing business rules out of components.** It does not have to live in a `domain/` folder. What matters is making it a pure function that does not depend on React.
- **Transform API responses into the domain model in one place.** Whether that is a mapper function or a Zod schema, create a structure where changing that one place prevents the change from propagating.

As a project grows more complex, the following may also be worth considering.

- **Divide folders by Bounded Context.** The [Toss Frontend Chapter](https://frontend-fundamentals.com/) also emphasizes the principle, "Place files that change together in the same directory." Dividing folders by domain naturally reveals domain boundaries through import paths.
- **Introduce a Use Case layer.** When combinations of domain logic become complex, an Application layer is needed to wrap a scenario such as "retrieve income information → apply expense rate → calculate deductions → calculate tax → finalize refund" into a single function.

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

Even within the single domain of tax, **tax calculation (tax)**, **filing management (filing)**, and **deductions (deduction)** are separated into independent subdomains. A change in tax rates does not affect filing state-transition logic, and adding a deduction does not alter the filing-submission flow. This is a practical application of Bounded Context.


## Conclusion

To summarize, a **domain** is the problem space we are trying to solve; a **domain model** is a conceptual system that selectively abstracts that problem; a **domain object model** is the implementation of that conceptual system in code; and a **domain object** is an individual object within that implementation.

Putting these concepts into practice on the frontend is not merely a matter of splitting folders. It means **deliberately reasoning about several layers of boundaries**. "Is this a business rule or presentation logic?" "Is this data domain state or UI state?" "Is this function sufficiently cohesive?" Simply making a habit of asking these questions will naturally improve the structure of the code.

Of course, not every project needs every layer of Clean Architecture. Splitting a simple CRUD app into four layers and applying the factory pattern to every domain would be a case where the cure is worse than the disease. Between the elegant cohesion of classes and the practical flexibility of functions, the right answer is determined by the project's complexity and the team's context.

There is no single right answer. But there is a clear difference between **"writing code without knowing what the domain is"** and **"recognizing the domain, reasoning about boundaries, and separating things deliberately."** I hope readers will take a moment to ask themselves, "What is the domain here, and where should this code live?" in their own projects.


### References

:::ref
- [article] [Eric Evans, Domain-Driven Design (Book)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [article] [Robert C. Martin, Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [article] [Khalil Stemmler, Does DDD Belong on the Frontend?](https://khalilstemmler.com/articles/typescript-domain-driven-design/ddd-frontend/)
- [article] [Alex Bespoyasov, Clean Architecture on Frontend](https://bespoyasov.me/blog/clean-architecture-on-frontend/)
- [article] [Toss, The Journey to E2E Automation](https://toss.tech/article/income-qa-e2e-automation)
:::
