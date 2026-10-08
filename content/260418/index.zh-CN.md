---
emoji: 🧩
title: "领域模型"
seoTitle: "前端领域模型设计指南: DDD 实践"
date: "2026-04-18"
updatedAt: "2026-10-08"
categories: 前端 架构 DDD
description: "以综合所得税为例，讨论前端的领域逻辑应该放在哪里：把混在组件里的税额计算拆成纯函数，并梳理贫血领域模型、API 响应转换层、ViewModel 分离、类与函数式的内聚差异，以及拆分应在何处停止的标准。"
keywords: "前端领域模型, 领域驱动设计, DDD 前端, 前端 DDD, 领域逻辑分离, 贫血领域模型, Clean Architecture 前端, Martin Fowler, React 设计模式, 前端架构, ViewModel 分离, 限界上下文"
locale: zh-CN
translationOf: '260418'
sourceHash: a98c558911e190542a4e68cfccad3b2642f3bd14e02d2d66399bfc3520fadb14
---

这篇文章想聊聊**前端的领域逻辑应该放在哪里**。

本文写给这样的前端开发者：税额计算、申报状态判断这类业务规则散落在组件、Hook 和 utils 里，每改一条规则都要四处寻找并修改好几个文件。读完之后，你会知道如何把这些规则移到不依赖 React 的纯函数中，以及判断这种拆分应在何处停止的标准。

文中的例子全部使用综合所得税的计算，这是笔者一直关注的领域。

---


## 前端的领域逻辑应该放在哪里？

回答之前，先统一一个术语。本文所说的**领域模型**，是把业务概念和作用于其上的规则放在一起的东西。它不同于像 API 响应类型那样、只定义数据以什么形状传递的**数据模型**。组件一旦直接依赖响应结构，后端 schema 每次变化都会让整个前端跟着动摇，原因也正是这个区别。领域、领域模型与领域对象之间有什么不同，另外整理在[领域与领域模型](/261008)中。

热衷于软件设计的 [Khalil Stemmler](https://khalilstemmler.com/about/) 起初主张“业务逻辑不属于前端”，后来又调整了立场，表示“后端在架构层面所做的几乎一切，前端也能做，而且应该做。”

我也认同这一观点。当然，前端不应成为业务逻辑的**唯一事实来源（Single Source of Truth）**，那是后端的职责。但前端确实存在**前端独有的领域逻辑**。

设想这样一种情况：“需要根据用户输入的信息，实时展示预计退税额。”如果这类计算逻辑只存在于后端，用户每修改一个收入金额的字符，就要调用一次 API。用户界面会在网络往返期间停顿；如果用户输入很快，还会产生爆炸式增长的无用请求。即使加入防抖，数百毫秒的延迟也足以破坏“实时预览”的体验。**最终，需要即时反馈的计算只能由前端自行完成，于是也就出现了只能在前端执行的逻辑。**


### 领域逻辑混入组件的情况

以综合所得税预览页面为例。用户输入收入信息后，页面会实时展示预计税额。下面是一段常见的代码，其中领域逻辑和用户界面逻辑混在了一起。

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

看出这段代码的问题了吗？“每人 150 万韩元的人身扣除”“8 级累进税率”“3.3% 预扣税”等**由税法规定的业务规则**被直接写死在 React 组件中。税法每年都会修订，如果这些规则散落在各个组件里，修订时就必须四处寻找需要修改的位置。如果质量保证团队还有端到端测试场景需要维护，测试成本也不会低。

最终，视图逻辑与业务逻辑变得难以区分，代码也会被大量条件语句和自定义钩子缠成一团。


### 分离领域逻辑

借用 Alex Bespoyasov 的 Clean Architecture 方法中的一项核心原则：把领域逻辑分离为**不依赖框架的纯函数**。

::::quote
:::translation
领域是区分一个应用与另一个应用的核心。可以把领域理解为，即使从 React 迁移到 Angular，也不会发生变化的部分。
:::

:::original
The domain is the core that distinguishes one application from another. You can think of the domain as something that won't change if we move from React to Angular.
:::
::::

来重构上面的税额计算示例。

首先定义领域类型和规则，将相关信息聚合起来。

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

然后，将领域逻辑分离为纯函数。

把前面计算收入、扣除、计税依据、税额、退税额等逻辑分离到 `computeFullTax` 函数中，再把每个阶段拆成更小的纯函数。结果类型可以通过 `ReturnType<typeof computeFullTax>` 推断，无需单独声明接口。

之后，组件只需“使用”领域逻辑。

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

发生了哪些变化？

- **8 级累进税率表**（`TAX_BRACKETS`）集中在一处，税法修订时只需修改 `domain/tax.ts`
- **计算流水线**聚合在 `computeFullTax` 这一个函数中，整体流程一目了然。（为了让示例保持简单，这里将它合并成了一个函数；在实际项目中，更适合按收入计算、扣除计算、税额计算等目的进一步细分。）
- **组件只专注于“如何展示”**。即使税率变化，也无需修改组件
- 即使从 React 迁移到其他框架，`domain/tax.ts` 也**无需变化**

分离领域逻辑后，测试会变得出奇简单。在税务领域，**计算是否准确直接关系到用户的钱**，所以这一点尤其重要。

包含税务计算逻辑的纯函数不需要 React Testing Library，也不需要 `render` 或 `screen.getByText`。传入输入、检查输出即可。“1,400 万韩元及以下适用 6% 税率”“计税依据为 0 韩元时税额也为 0 韩元”“自由职业者收入 3,000 万韩元时的退税额”等用例，都可以用一行 `it` 来表达。领域单元测试会自然地帮助确定组件的拆分边界，测试代码本身也能充当文档。


## 贫血领域模型（Anemic Domain Model）

上一节分离了**计算逻辑**。但领域逻辑除了计算，还包括**状态转换规则**和**权限判断**。例如：“现在可以修改这份申报单吗？”“可以提交吗？”“可以切换申请方式吗？”在分离这些规则时，很容易落入一个陷阱，也就是 Martin Fowler 命名的**贫血领域模型（Anemic Domain Model）**。

贫血领域模型是指：**类型虽然用领域语言定义得很好，但作用于类型之上的规则却散落到了领域之外**。以报税申报（Filing）领域为例，类型本身很整洁。

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

但针对这个类型的判断和转换规则，却写死在其他地方。

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

同一条领域规则分别以不同形式存在于工具函数、组件和钩子这三个地方。此时，如果收到“申请条件将发生变化”的需求，就必须四处寻找要修改的位置；任何一个被遗漏的地方，都会在网站的某处作出错误判断。Fowler 批评这类代码，称其**“与只披了一层面向对象外衣的过程式代码别无二致”**。

解决办法与上一节处理计算逻辑的方法相同：**把规则放在类型旁边。**

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

现在，申报相关规则都在 `domain/filing.ts` 中统一管理。任何组件只需调用 `canAmend(filing)`；规则发生变化时，也只需修改这一个文件。关键在于，**应该把类型及其上的规则视为一个整体。**如果只把类型放进领域文件夹，却把规则抽到工具函数中，这种局部分离即使外表整洁，仍然处于贫血状态。


## API 响应与领域模型之间的转换层

在实际工作中，还要考虑另一件事：后端 API 的响应结构不一定总与前端领域模型一致。如果是与国家机关对接的税务服务，就更是如此。韩国国税厅 Hometax 的对接数据充斥着缩写和代码值，几乎不可能以与前端领域模型相同的形式返回。

此时就需要**转换层（Mapper）**。不要让 API 响应类型原封不动地一路流入组件，而应先将其整理成领域类型，再交给组件使用。一个纯函数就足够了。

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

这样一来，就能在**一个地方**把 API 响应中的 `총수입금액`、`경비율` 等缩写，以及基于代码值的分类，转换为适合前端领域的形式。像收入类型代码这样需要展开为枚举的值，可以在转换器中放一张小型查找表。即使 Hometax API 的字段名发生变化，也只需修改一个转换器。


## 工具函数与领域逻辑

分离领域逻辑时，必然会遇到一个问题：**“这不就是工具函数吗？”**

来看下面两个函数。

```typescript
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find((bracket) => taxableBase <= bracket.limit);
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}
```

`formatCurrency` 是把数字转换成字符串的纯**表现层逻辑（Presentation）**。加上“韩元”单位和千位分隔符并不是业务规则，而是如何把内容展示给用户的问题。相反，`calculateTax` 包含“应用 8 级累进税率”这一**基于税法的业务规则**。即使没有用户界面，这条领域规则也必须同样适用。

我在实际工作中使用的判断标准是：

> **如果这段逻辑消失，受损的是业务，还是只有页面？**

如果业务受损，它就是领域逻辑；如果只有页面受损，它就是表现层逻辑。仅凭这个问题，就能划清大多数边界。

| 判断标准                | 领域逻辑                         | 工具/表现层逻辑              |
| ----------------------- | -------------------------------- | ---------------------------- |
| 缺少它会导致什么问题？  | 税额计算错误                     | 页面（用户界面）显示异常     |
| 框架变化时呢？          | 保持不变                         | 可能变化                     |
| 需求文档中有明确规定吗？| “计税依据 × 税率 - 累进扣除额”   | “金额使用千位分隔符”         |
| 后端也有同样的逻辑吗？  | 已经有，或应该有                 | 没有（仅属于前端的关注点）   |

但现实并没有这么清晰。最棘手的是，**有些逻辑看起来像领域逻辑，其实却是表现层逻辑**。

来看下面的代码。因为它以 FilingStatus 这一领域概念作为参数，所以被归类为领域逻辑。但它真的是领域逻辑吗？

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

`getStatusBadgeColor` 和 `getStatusDisplayText` 虽然使用了 `FilingStatus` 这一领域概念，但它们做的事情是**页面呈现**。徽章颜色变化并不会对业务造成任何影响。把这类函数放进 `domain/filing.ts`，会让领域模块越来越臃肿，真正的领域逻辑和表现层逻辑也会混在一起。


### 分离领域模型与 ViewModel

有一种实用的方法可以解决这个问题：**在同一个领域文件夹中，把 ViewModel 分离到单独的文件里**。与 `.ui.ts` 相比，采用 `.viewModel.ts` 这一命名能自然地与 MVVM 模式中的 ViewModel 概念衔接，因为“把领域数据转换成适合页面呈现的形式”这一职责能够直接从名称中体现出来。

```
domains/
└── filing/
    ├── filing.ts              # 순수 도메인 모델 + 도메인 로직
    ├── filing.viewModel.ts    # ViewModel (표현 변환 계층)
    ├── filing.test.ts         # 도메인 로직 테스트
    └── filingMapper.ts        # API ↔ 도메인 변환
```

把前面看到的 `getStatusBadgeColor`、`getStatusDisplayText` 原样移到 `filing.viewModel.ts`。此外，像 `getFilingTypeLabel(type: FilingType): string` 这样把申报类型转换成韩文标签的逻辑，也集中放在这里。`filing.ts` 只负责业务规则，`filing.viewModel.ts` 只负责页面呈现。

关键在于**依赖方向**。`filing.viewModel.ts` 会导入 `filing.ts`，但 `filing.ts` 绝不能导入 `filing.viewModel.ts`。领域不了解表现层，而表现层了解领域。可以把它看作 Robert C. Martin 所说的依赖规则（Dependency Rule）的缩小版。

我认为共同变化的文件应该放在同一目录，因此把它们放在了同一个文件夹。给 `FilingStatus` 类型添加新值（例如 `'rejected'`）时，`filing.ts` 和 `filing.viewModel.ts` 都需要修改。由于位于同一个文件夹，修改范围一目了然。


## 边界与内聚

与分离领域逻辑同样重要的是：**边界应该画在哪里**。下面整理几种我在实际工作中经常遇到的边界判断问题。

前端处理的数据大致来自四种来源。

- **服务端数据**：通过 API 响应获得的数据
- **派生数据**：由服务端数据计算得到的数据
- **用户界面状态**：用于控制页面的状态，以及用户交互
- **用户输入**：正在表单中输入的数据

如果把这四类数据混进同一个类型，领域模型就会受到污染。

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

这个类型把领域概念、用户界面状态和临时数据都塞进了同一个篮子。每次 `activeStep` 变化，就等于更新了一次申报领域。（表单步骤变化并不是业务事件。）

改进方法是按照边界拆分类型。**领域模型**只包含 `id`、`status`、`determinedTax` 等业务概念；**用户界面状态**（`FilingFormViewState`）只包含 `isExpanded`、`activeStep` 等页面控制信息；**表单状态**（`DeductionEditForm`）只保存正在输入的临时数据。

这样一来，每种类型都只有**一个变化原因**。领域类型只在税法变化时修改，用户界面状态只在页面设计变化时修改，表单状态只在输入体验变化时修改。


### 把共同变化的内容放在一起

Eric Evans 的 DDD 中有一个**聚合（Aggregate）**概念，指的是“把一组相关对象作为一个单元来处理”。前端无需照搬这一概念，但其中的核心原则值得借鉴：**把共同变化的数据和规则放在一起。**

以税务服务为例，`Income`（收入）和 `ExpenseRate`（费用率）总是共同变化。收入类型变化时，适用的费用率也会变化，综合所得金额的计算也会受到影响。因此，应把这些内容聚合到同一个文件 `domain/tax.ts` 中。

相反，`TaxFiling`（申报单）可以独立于税额计算而变化。即使申报单的状态转换规则发生变化，税率计算逻辑也不会受到影响。因此，把它分离到 `domain/filing.ts` 才是合适的做法。

```
이렇게 묻자: "A가 변할 때 B도 반드시 변해야 하는가?"
  → Yes: 같은 모듈에 둔다 (Income + ExpenseRate + TaxBracket)
  → No: 분리한다 (Tax 계산 ↔ Filing 상태관리)
```


## 类与函数式风格

读到这里，可能会产生一个根本问题：前面的示例都是 `interface` + 纯函数的组合，如果用类来表达领域，内聚不是会更自然吗？

确实如此。使用类来表达领域，会把数据与行为封装在同一个对象中，因此内聚性能够直接体现在代码结构里。

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

使用类时，行为归属于数据，而且调用处的主语非常明确。`filing.canAmend()` 读起来像自然语言一样直观，主语（filing）和动词（canAmend）清楚地结合在一起。就像写下 `jihoon.eat('감자탕')`，马上就能读出“Jihoon 吃脊骨土豆汤”。

而函数式风格是这样的。

```typescript
canAmend(filing);
eat("jihoon", "감자탕");
```

在函数式风格中，数据存在于函数之外。上面第一段代码接收 `filing` 数据作为参数并执行某种行为；`eat` 函数则接收 `jihoon` 和 `감자탕` 两项数据作为参数来执行行为。

这样一来，主语和动词的结合会变得松散。只有打开文件或查看类型签名，才能知道 `canAmend` 函数与 `TaxFiling` 有关。如果同一文件中混杂着 `canAmend(filing)`、`canEdit(filing)`、`calculateTax(taxableBase)` 等函数，就可能很难一眼看出每个函数分别属于哪个领域。


### 那么，应该使用类吗？

坦率地说，答案是**“视情况而定”**。但根据我的经验，在 React + TypeScript 环境中，类并非万能，这背后有一些现实原因。

**1. 与 React 状态管理之间的摩擦**

React 的状态管理与**普通对象（Plain Object）**配合得最自然。`useState` 和 `useReducer` 在技术上可以保存任何值，Redux DevTools 本身也不会移除类实例的原型。但如果 Redux/Zustand 持久化中间件以 JSON 保存并恢复状态，类实例就会在 `JSON.stringify` → `JSON.parse` 循环中丢失方法和原型，退化为普通对象。从 React Server Component 向 Client Component 传递 props 的边界则有另一种限制：它只接受受支持的可序列化（serializable）值，因此任意类实例从一开始就无法通过该边界。

来看下面的代码。

```typescript
const [filing, setFiling] = useState(
  new TaxFilingModel("F-001", "draft", 2025, "regular", 0),
);
```

仅仅更新 React 状态并不会让 `filing` 失去 `TaxFilingModel` 实例的身份。但如果 Redux/Zustand 持久化以 JSON 保存并恢复它，恢复后的值可能变成没有方法的普通对象，此时无意间调用 `filing.canAmend()` 就可能触发运行时错误。从 React Server Component 传递到 Client Component 时，失败会更早发生，因为类实例不是受支持的可序列化 props 值。

**2. 难以保证不可变性**

React 基于**引用相等性（referential equality）**检测状态变化。如果类实例的方法执行 `this.items.push(...)` 之类的内部修改，引用保持不变，React 就不会触发重新渲染。因此，最终只能让 `addDeduction(item)` 像 `return new DeductionList([...this.items, item])` 一样，每次都返回一个新实例。这样一来，类的优势——“封装后的状态变更”——也就失去了意义，代码与函数式更新并没有太大区别。


### 在函数式风格中获得内聚的策略

那么，在函数式风格中，如何改善 `eat('jihoon', '감자탕')` 这种内聚松散的问题？下面介绍三种我认为有效的方法。

**1. 通过模块命名空间实现内聚**

这是最直观的方法。把文件（模块）本身按领域组织，并在导入时使用命名空间。直接使用前面定义的 `domain/filing.ts` 即可。

```typescript
import * as FilingModel from "../domain/filing";

FilingModel.canEdit(filing);
FilingModel.canAmend(filing);
FilingModel.canSubmit(filing);
```

`FilingModel.canAmend(filing)` 虽然不如 `filing.canAmend()` 简洁，但至少能直接从代码中看出这个函数属于申报领域，也不会再出现函数跨多个领域混杂的风险。

**2. 统一把第一个参数作为领域主体**

函数式风格还有另一种表达内聚的约定：**始终把第一个参数设为“行为主体”。**将签名统一为 `canAmend(filing)`、`calculateTotalIncome(income)` 这样的形式后，`canAmend(filing)` 就可以理解为“询问 filing 是否可以修改”。这也与 Unix 的流水线思维（`data |> transform`）一脉相承。事实上，Go 语言的方法接收者正是这种模式，Rust 的 `impl` 块把 `self` 作为第一个参数也是同样的思路。

**3. 用领域对象工厂函数聚合行为**

想念类的内聚性时，可以使用这种模式。工厂函数一次性返回领域对象及其行为。

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

这种模式能够同时获得类的表现力（`filing.canAmend()`）和通过对象字面量组合行为的实用性。不过，返回的对象包含函数属性，因此它本身并不是可 JSON 序列化的数据。它每次还会创建新的函数对象，但对于前端处理的数据规模来说，几乎不会构成性能问题。


## 应该分离到什么程度？

阅读 Clean Architecture 时，会看到一种理想结构：划分 3～4 个层，并定义端口与适配器。但在现实中，把这套结构应用于所有项目，可能会造成过度设计（over-engineering）。

我认为实用的判断标准如下。

- **将领域类型与 API 响应类型分离。**无论使用 `interface` 还是 `type`，都应在单独的文件中定义前端使用的领域概念。
- **把包含业务规则的逻辑移出组件。**不放在 `domain/` 文件夹也没关系，重要的是把它写成不依赖 React 的纯函数。
- **集中完成 API 响应 → 领域模型的转换。**无论使用转换器函数还是 Zod schema，都要建立一种结构：只需修改这一处，变化就不会继续传播。

如果项目变得更加复杂，还可以进一步考虑以下做法。

- **按限界上下文划分文件夹。**[Toss 前端团队](https://frontend-fundamentals.com/)也强调“把共同变化的文件放在同一目录”这一原则。按领域划分文件夹后，导入路径会自然地显露领域边界。
- **引入用例层。**当领域逻辑的组合变得复杂时，就需要一个应用层，将“查询收入信息 → 应用费用率 → 计算扣除项目 → 计算税额 → 确定退税额”这一场景封装成一个函数。

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

即使同属税务这一领域，**税额计算（tax）**、**申报管理（filing）**、**扣除项目（deduction）**也会被分成彼此独立的子领域。即使税率发生变化，申报状态转换逻辑也不会受到影响；即使新增扣除项目，申报单的提交流程也保持不变。这就是限界上下文在实践中的应用。


## 结语

总而言之，前端也有前端自己的领域逻辑，这些规则不应放在组件里，而应放在类型旁边的纯函数中。API 响应在一个 mapper 中转换为领域类型，界面表现拆分到 ViewModel，一起变化的东西放在一起。

在前端实践这一点，并不只是划分文件夹，更是要**有意识地判断多层边界**。“这是业务规则，还是表现层逻辑？”“这些数据属于领域状态，还是用户界面状态？”“这个函数的内聚性足够吗？”只要养成反复提出这些问题的习惯，代码结构自然会逐渐改善。

当然，并非所有项目都需要完整搭建 Clean Architecture 的各个层。为简单的增删改查应用划分四个层，并给每个领域都应用工厂模式，未免本末倒置。在类的优雅内聚与函数式风格的实用灵活之间，答案取决于项目复杂度和团队语境。

没有唯一正确答案。但至少，**“不知道领域是什么就开始写代码”**与**“识别领域、判断边界并有意识地分离代码”**之间有着明确差异。希望读者也能在自己的项目中问一次：“这里的领域是什么？这段代码又应该放在哪里？”


### 参考资料

:::ref
- [article] [Eric Evans，《领域驱动设计》（书籍）](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [article] [Robert C. Martin，Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [article] [Khalil Stemmler，DDD 属于前端吗？](https://khalilstemmler.com/articles/typescript-domain-driven-design/ddd-frontend/)
- [article] [Alex Bespoyasov，前端 Clean Architecture](https://bespoyasov.me/blog/clean-architecture-on-frontend/)
- [article] [Toss，端到端自动化之旅](https://toss.tech/article/income-qa-e2e-automation)
:::
