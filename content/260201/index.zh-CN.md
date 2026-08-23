---
emoji: 🧩
title: "抽象"
seoTitle: "前端抽象——编写好代码的设计原则"
date: "2026-02-01"
categories: 前端 设计 抽象
description: "前端开发中的抽象是什么，好的抽象与坏的抽象有何不同。本文从 React 组件与函数设计的角度，梳理抽象层级、揭示意图的命名以及部件组合方式。"
keywords: "前端抽象, React 组件抽象, Clean Code 抽象, 抽象层级, 抽象层次, 编写好代码的方法, 揭示意图的命名, 组合方法模式, 抽象泄漏定律, 组件设计, 自定义 hook 设计, 前端架构, Kent Beck, Robert C. Martin"
locale: zh-CN
translationOf: '260201'
sourceHash: 961247e1971eb4b679afa09b9c66891f16680b46208db88a15e5bb55f86e3e51
---

这篇文章想谈谈编程中的抽象，以及如何从抽象的角度写出好代码。

在从事前端开发的过程中，我无数次纠结过：“这段逻辑到底该拆到什么程度？”“这个组件应该按什么粒度拆分？”起初，我以为只要把共同部分提取出来就是抽象：把重复代码写成函数，提取相似组件的共同点再合并到一起。但几次经历告诉我，这样写出的代码随着时间推移，反而可能变成难以下手的怪物。于是，我开始重新思考抽象究竟是什么。

本文将整理我对抽象本质的思考，以及在前端开发中如何运用抽象才能写出好代码。


## 抽象与抽象化

在进入正题之前，先来厘清“抽象”与“抽象化”在编程中究竟意味着什么。这两个词看起来相近，性质却颇为不同。

**抽象（Abstract）**既是一种状态，也是一种属性。当我们说“这是抽象的”时，意味着具体细节已被省略，处于一种**只保留核心概念的状态**。Java 或 TypeScript 中带有 `abstract` 关键字的类或方法就是这个含义：具体实现尚未填充，只定义了本质形态，是一张尚未完成的设计图。

**抽象化（Abstraction）**既是一个过程，也是一种行为。它指的是从复杂对象中只保留核心特征、去除不必要细节，使其简化的过程本身。重要的是，抽象化并非“笼统地归为一类”，而是**在每个层级上准确界定职责的行为**。

日常生活中，“抽象”常带有“模糊”的意味。但编程中的抽象恰恰相反。抽象的目的不是变得模糊，而是建立一个可以做到绝对准确的新语义层级。在给定上下文中保留相关信息、忘掉无关信息，正是抽象的本质。

因此，可以这样理解抽象与抽象化的区别：**抽象是“只剩核心的状态”，抽象化是“只留下核心的过程”**。我们设计代码时所做的，正是抽象化——从复杂实现中留下核心接口，并隐藏其余部分。

那么，编程为什么需要这样的抽象呢？


## 为什么需要抽象

编程需要抽象的根本原因出乎意料地简单：**为了构建更复杂的东西**。当复杂元素太多时，我们很难全部记住并处理它们。因此，我们把复杂元素分组，形成简化后的抽象概念。

前端开发者每天使用的 React 就是如此。渲染一个组件时，内部会经历创建 Virtual DOM、协调（Reconciliation）、操作真实 DOM 等复杂过程。但我们无需在意这些，只要编写 JSX 即可，因为 React 已经把复杂过程抽象掉了。

看看下面的代码。使用 UserProfile 组件时，即使不了解内部发生的 VDOM 创建、差异比较等复杂过程，我们也完全可以构建和操作 UI。

```tsx
<UserProfile name="jihoon" />
```

过去，亲自配置 Webpack 是前端开发者的日常；如今，Next.js、Vite 等框架已经把打包配置抽象掉了。于是，我们即使不了解打包器的内部工作方式，也能开发应用，并把这些时间用于**关注业务逻辑、用户体验等更高层次的问题**。（也正因如此，我认为抽象这一概念对前端开发者的职责非常重要。）

归根结底，抽象的核心价值在于：隐藏复杂性，使其看起来简单，并让每个人只专注于自己的领域。正因为如此，我们无需独自理解一切，也能构建日益庞大而复杂的软件。

既然抽象这么好，是不是做得越多越好？让我们思考一下，究竟应该抱着怎样的目的进行抽象。


## 减少上下文

许多开发者把抽象理解为“提取共同部分”。这并没有错，但它只是进行抽象的一种手法，并不能说明抽象的本质。

在我看来，抽象的本质是**“把代码阅读者需要掌握的上下文减少到适当层级”**。

来看一个简单的例子。

```typescript
interface Order {
  id: string;
  status: "pending" | "completed";
  amount: number;
}

let total = 0;

const orders: Order[] = [
  { id: "a", status: "pending", amount: 10000 },
  { id: "b", status: "completed", amount: 5000 },
  { id: "c", status: "completed", amount: 8000 },
];

for (let i = 0; i < orders.length; i++) {
  if (orders[i].status === "completed") {
    total += orders[i].amount;
  }
}
```

阅读这段代码的开发者，必须理解循环的初始化、条件和递增方式，通过索引访问元素，检查条件并进行分支，还要把外部累加变量如何更新全部记在脑中。可这段代码真正想做的，不过是**“计算已完成订单的总额”**这一句话。为了理解这句话，读者却不得不同时承载四种不同的上下文。

```typescript
const total = orders
  .filter((order) => order.status === "completed")
  .reduce((sum, order) => sum + order.amount, 0);
```

借助 `filter` 和 `reduce` 这两层抽象，开发者只需跟随“只筛选已完成订单”和“累加金额”这两个意图。索引管理，以及累加变量的声明与更新，都从代码表面消失了。

还可以再进一步。

```typescript
const total = sumCompletedOrders(orders);
```

现在，阅读代码的人甚至不必知道这项计算是通过遍历数组完成的。留下的只有“计算已完成订单总额”这一业务意图。读者可以关注代码计算的**是什么（What）**，而不是**如何（How）计算**。

从这个角度看，我们每天编写的 React 代码其实也是无数抽象的组合。

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
      {/* CSS-in-JS 처리 과정을 추상화 */}
      Today is {formatted}
    </h1> // React.createElement를 추상화
  );
};

// 그리고 위 모든 것을 다시 추상화
<TodayHeader />;
```

试想，如果 `emotion`、`date-fns`、`react` 的内部代码全都铺开在这个组件文件里，会怎么样？我们将难以判断该从哪里读起，也难以分辨哪部分是业务逻辑，哪部分是库代码。正因为抽象适当地隐藏了各个领域的上下文，我们才能只关注“显示今天的日期”这一实质。

那么，在实际设计代码时，应该从什么方向着手抽象呢？


## 抽象层级的高与低

谈到抽象，就绕不开**抽象层级（Level of Abstraction）**这个概念。代码的抽象层级“高”或“低”，究竟是什么意思？

**抽象层级低的代码**更接近计算机执行的具体步骤，例如直接解析字符串、通过索引遍历数组、操作字节。它赤裸裸地展现了**如何（How）**运行。

```tsx
// 추상화 수준이 낮은 코드
const response = await fetch('/api/users');
const users = await response.json();
const filteredUsers = users.filter(user => user.status === 'active');

filteredUsers.forEach(user => {
  const element = document.getElementById(`user-${user.id}`);
  if (element) element.style.display = 'block';
});
```

**抽象层级高的代码**则使用业务领域或问题域的语言来表达，例如 `processPayment(order)`、`sendNotification(user, message)`、`validateUserInput(formData)`。高抽象层级的代码展现的是**做什么（What）**，而隐藏了具体做法。

Robert C. Martin 在 *Clean Code* 中把这一概念总结为**“每个函数只处于一个抽象层级（One Level of Abstraction per Function）”**原则。因为当高层级与低层级代码混在同一个函数中时，读者每读一行都要判断：“这是核心逻辑，还是实现细节？”

放到实际代码里，这个问题会更加清楚。

```typescript
// 추상화 수준이 뒤섞인 함수
async function registerUser(name: string, email: string, password: string) {
  // ✅ 높은 수준: 비즈니스 규칙 검증
  validateUserInput({ name, email, password });
  await ensureEmailNotDuplicated(email);

  // ❌ 낮은 수준: 비밀번호 해싱 직접 구현
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashedPassword = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // ✅ 높은 수준: 사용자 저장
  const user = await userRepository.save({ name, email, password: hashedPassword });

  // ❌ 낮은 수준: 이메일 전송 직접 구현
  const verifyToken = crypto.randomBytes(32).toString("hex");
  await db.execute(
    "INSERT INTO email_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.id, verifyToken, new Date(Date.now() + 86_400_000)]
  );
  await transporter.sendMail({
    from: "noreply@example.com",
    to: user.email,
    subject: "Welcome! Please verify your email",
    html: `<a href="/verify?token=${verifyToken}">Verify your account</a>`,
  });

  // ✅ 높은 수준: 환영 이메일 발송
  await sendWelcomeEmail(user);
}
```

阅读这个函数的人，本来正沿着“用户注册流程”这一基于业务规则的高层上下文前进，却突然被拽到哈希缓冲区操作、SQL 查询和邮件模板字符串这些底层上下文中，随后又跳回 `sendWelcomeEmail` 这一高层抽象。抽象层级这样忽高忽低，读者的思路也会随之上下跳跃。

将同一个函数改写为统一抽象层级后，会是这样。

```typescript
// 추상화 수준이 일관된 함수
async function registerUser(name: string, email: string, password: string) {
  validateUserInput({ name, email, password });
  await ensureEmailNotDuplicated(email);

  const hashedPassword = await hashPassword(password);
  const user = await userRepository.save({ name, email, password: hashedPassword });

  await sendVerificationEmail(user);
  await sendWelcomeEmail(user);
}
```

每条语句都处于相同的抽象高度。邮件发送如何实现、密码哈希采用什么算法，分别由下层函数负责。阅读这个函数的人只需关注“用户注册的完整流程”这一种上下文。

Martin 也把它称为**“降层规则（The Stepdown Rule）”**。从上到下阅读代码时，应当像读新闻报道一样：顶部呈现全貌，越往下细节越多。

Kent Beck 也在 *Smalltalk Best Practice Patterns* 中以**组合方法（Composed Method）模式**提出了相同原则：一个方法只能由处于同一抽象层级的操作组成，每个步骤都应表示为一行方法调用。

这些讨论最终都指向同一个结论：**一个函数只能在一个抽象层级上叙事。**仅仅遵守这一点，代码可读性就会发生显著变化。

那么，抽象的方向应该如何确定？该从具体事物开始，还是从抽象事物开始？


## 不要提取共同点，而要思考部件的组合

OOP 中有一条常见指导：“提取具体事物的共同点，以定义抽象事物。”这种做法本身没有错，但我认为，如果过度拘泥于此，就有可能设计出被当前需求束缚的结构。

举个例子。假设需求中有 A、B、C 三个按钮，它们都是蓝色圆角样式，唯一差别只是标签文字。只提取共同点来设计，可以写成下面这样。

```tsx
const BlueRoundButton = ({ label }: { label: string }) => {
  return <button className="blue round">{label}</button>;
};
```

当前需求得到了完美满足。然而几天后，产品经理说：

> “请让 B 按钮的颜色可以修改。”

这一刻，`BlueRoundButton` 这个名字就开始显得别扭。确实可以添加颜色 prop，但从“蓝色圆角按钮”这一具体共同点出发的设计，本来就很容易受需求变更影响。（这还算好的。现实里还会不断冒出按钮形状、按钮尺寸等无数需求。）

这类情况反复发生后，我们自然会意识到：**从具体需求中提取共同点的方式，往往会让抽象后的产物也只反映当前需求**。

所以我更偏好相反的方向：不是从具体事物中提取抽象，而是**先思考抽象部件，再把它们组装成具体事物**。

假设要制作一个 Toast 通知组件。最初的需求很简单：“保存完成后，请在底部显示一条简短提示。”如果按照提取共同点的方式处理，会变成这样。

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

当前需求被完美覆盖。可几天后，产品经理提出：“请根据成功或警告状态，在左侧放置图标。”于是增加了 `hasIcon`、`iconName`。紧接着又来了“还需要带上传进度条的 Toast”。于是再加一个 `progress` prop。这个过程重复几次后，`Toast` 会拥有十多个 props，开发者还必须记住**这种组合可用、那种组合不可用**之类的隐藏规则。（而且这些规则通常连注释都不会留下。）

归根结底，从**“Toast 就应该长这样”这一当下的具体形象**出发的设计，很难应对变化。

如果改用部件组合的方式，情况就不同了。

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

“Toast 是一个用来容纳内容的轻量容器”这一不变本质，与“里面装什么”这一容易变化的具体内容被分离开来。现在，无需触碰 `Toast` 内部，就可以任意添加新部件，或把现有部件排列成新的组合。prop 组合的有效性规则也消失了，只需**放入想放的内容**即可。

当然，经验丰富的开发者可能会说：“一开始就用 IoC（控制反转）来设计不就行了吗？”确实如此。但之所以能够做出这样的判断，是因为过去经历了无数次踩坑，逐渐形成了对“哪里容易发生变化”的直觉。

如果这份直觉尚不充分，从“这个功能由哪些部件组成，各个部件应该如何组合”这个问题出发，会更容易做出对变化开放的设计。

读到这里，自然会产生一个问题：那么，该依据什么标准划分部件，又该如何对外表达它们呢？


## 做好抽象的三个要点

### 思考如何表达

抽象模块最重要的品质，是无需查看源代码也能推断其行为。Kent Beck 把它称为**“揭示意图的命名（Intention-Revealing Name）”模式**，并指出，如果无法取出简洁的名字，就应该重新审视抽象本身。

我们为此可以使用的工具主要有两个：**名称**与**类型**。

```typescript
// 도대체 뭘 하는 건지 알 수 없는 함수
function calculate(price: number, rate: number): number;

// 이름과 타입만으로 동작을 유추할 수 있는 함수
function calculateDiscountedPrice(originalPrice: number, discountRate: number): number;
```

只看 `calculateDiscountedPrice` 这个名字，就能知道它接收原价与折扣率，并计算折后价格；接收 `number` 并返回 `number` 的类型信息进一步支撑了这种理解。至于内部采用了什么计算逻辑，我们不必知道。

相反，`calculate(price: number, rate: number): number` 没有说明计算对象，因此无法预期结果。最终只能查看源代码后才能使用，抽象的优势也就丧失了。

这里值得注意的是，命名方式本身就反映了抽象层级。编程中的函数名大多采用**动词 + 名词**的组合，而选择什么动词，会显露出函数处于哪个抽象层级。

> 不过，抽象层级并非由动词单独决定。与它搭配的名词（领域上下文）才决定最终层级。

在抽象层级**较低**的一侧，常用的动词包括 `parse`、`encode`、`decode`、`serialize`、`read`、`write`、`push`、`pop`、`convert`、`transform`。这些词暗示数据的物理转换或对数据结构的直接操作。

中间层级常出现 `get`、`save`、`load`、`validate` 等动词。它们仍属于技术操作，但已经在一定程度上揭示了行为意图。

在抽象层级**较高**的一侧，则会使用 `register`、`refund`、`confirm`、`cancel`、`submit` 等动词。这些词属于业务领域语言，完全不体现内部发生了什么技术步骤，只表达**用户行为或业务流程**。

```typescript
// 낮은 수준: 기술적 동작이 드러남
function parseJSON(text: string): object;
function encodeBase64(data: Uint8Array): string;

// 중간 수준: 의도가 드러나되 기술적 맥락이 남아있음
function getUserById(id: string): Promise<User>;
function validateEmail(email: string): boolean;

// 높은 수준: 비즈니스 의도만 드러남
function registerUser(form: RegistrationForm): Promise<User>;
function refundPayment(orderId: OrderId, amount: Money): Promise<Refund>;
```

Robert C. Martin 在 *Clean Code* 中对此说过：**“长而具有描述性的名字，胜过短而晦涩的名字。”**他还提出了**“每个概念只使用一个词”**的原则。假如在同一上下文的操作中混用 `fetch`、`retrieve`、`get`，读者就会困惑：“这三者是不同操作吗？”

这一原则同样适用于 React 组件与 hook 的命名。

```tsx
<Button />           
<SearchInput />      
<SubmitOrderButton />
```

组件名称的具体程度会随抽象层级而变化。Button 在较低层级作为通用 UI 基础组件使用，而 SubmitOrderButton 则在较高层级清楚揭示了业务意图。

```tsx
const handleSubmit = async(data: FormData) => { 
  await registerUser(data);
};

<Form onSubmit={handleSubmit} />           
```

`on*` 是组件对外暴露的 prop 名称，使用组件的一方通过它声明“要响应哪种事件”。`handle*` 则是实际传递给该 prop 的实现函数名。

```tsx
const user = useAuth();                  
const [items, setItems] = useCartItems();
const { isOpen, toggle } = useModal();   
```

自定义 hook 使用 `use` 前缀，以遵循 React 的规则，并让组件可以使用 hook 提供的状态或行为。

> 运营 [Coding Horror](https://blog.codinghorror.com/) 的 Jeff Atwood 曾指出 `Manager` 这一后缀的问题。`UrlManager` 这个名字完全看不出它是在池化、验证还是生成 URL。`UrlBuilder`、`UrlValidator`、`UrlPool` 这类揭示具体职责的名称要好得多。名称模糊，可能正说明模块本身的职责就很模糊。

归根结底，好的名称应当**让读者立刻知道这段代码处于哪个抽象层级**。


### 有意识地设计输入自由度

设计抽象模块时，经常会遇到一个问题：“功能要开放到什么程度？”这个决定会极大影响使用模块的开发者体验。

```tsx
// 기능이 닫힌 컴포넌트
const Button = ({ children }: {children?: React.ReactNode}) => {
  return <button>{children}</button>;
};

// 기능이 완전히 열린 컴포넌트
const Button = (props: ComponentProps<"button">) => {
  return <button {...props} />;
};
```

第一个按钮只能接收 `children`，无法设置 `onClick`、`type` 或 `disabled`。但使用者不必做任何选择。

第二个按钮可以接收 `button` 元素的所有属性，自由度很高，但使用者必须从几十个 prop 中思考该用哪一个。我把这种情况称为**“组件强迫开发者思考”**。

这没有标准答案，只需根据模块的目的与用户找到适当程度。若是设计系统的基础按钮，限制 Props 以保持一致性也许更好；若是通用工具组件，灵活开放或许更合适。

```tsx
// 지나치게 닫힌 인터페이스 — 다양한 상황에 대응 불가
<Button onClick={handleSubmit}>제출</Button>
// onClick 외의 이벤트, className, disabled 등을 전달할 방법이 없다

// 지나치게 열린 인터페이스 — 의도가 사라짐
<Button {...anyProps} />
// 무엇을 전달해야 하는지 사용자가 직접 파악해야 한다
```

抽象的开放范围应由用户是谁来决定。对于需要理解内部实现并精细控制的用户，低层级接口更合适。反之，如果向不需要了解细节的用户提供过度开放的接口，只会增加困惑；而如果过度限制需要应对多种场景的用户输入，则会直接堵死使用方式。


### 将抽象维持在适当粒度

抽象的粒度，也就是“应该把多大范围捆绑成一个模块”，同样是一个重要问题。

前端中常见的反模式之一，是过度提取 Custom Hook。

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

如果把只在一个组件中使用的逻辑硬拆成 hook，阅读代码的人反而要在两个文件之间来回切换才能掌握上下文。抽象非但没有减少上下文，反而增加了它。

反过来，在一个 hook 中塞入太多内容也有问题。

```tsx
// 관련 없는 관심사가 하나의 훅에 뒤섞여 있다
const useEverything = () => {
  const auth = useAuth();
  const theme = useTheme();
  const analytics = useAnalytics();
  const toast = useToast();

  return { auth, theme, analytics, toast };
};
```

这种“God Hook”很难测试，修改其中一项，还可能影响不相关的部分。

判断抽象粒度是否合适的标准是：**“这次拆分真的减少了代码阅读者的上下文吗？”**如果拆分后上下文反而变得分散、更难把握，就说明还没到进行这次抽象的时候。


## 警惕过早抽象

读到这里，也许还会留下一个问题：“那到底什么时候该抽象？”我的看法是：**基本前提应该是，不要贸然抽象。**

只要还没出现明确的抽象信号，保持代码原样的下限，就高于先做出错误抽象、日后再把它拆开的下限。错误抽象的形成过程大致如下。

1. 在代码 A 和代码 B 中发现相似模式。
2. 想着“既然有 DRY 原则，就提成公共函数吧！”于是进行抽象。
3. 在代码 C 中也发现相似模式，于是使用同一个函数，并为稍有不同的行为添加一个参数。
4. 随着代码 D、E 也开始使用它，条件语句与参数不断增加。
5. 现在这个函数到处都在使用，却变成了谁也不敢修改的代码。

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

如果陷入这种局面，解决办法很明确：把抽象后的代码重新内联到各个使用处，删除每个使用处不需要的代码，然后在清理后的状态下，等真正的共同点显现时再重新抽象。**“最快的前进方式，是先退回去。”**

那么，什么时候该进行抽象？我感受到的**抽象信号**大致有以下几种。

- **一致性正在被破坏。**明明是同一段逻辑，却在某些组件中内联，在另一些组件中拆成单独函数；相同的计算逻辑散落各处。
- **内部结构被不必要地暴露给外部。**调用者不得不逐一处理它根本不需要知道的实现细节。
- **自身行为不断暴露。**模块无法隐藏内部步骤，使用方必须原样跟随这些步骤。

问题在于，发现这些信号通常并不困难，但在实践中，人们很容易忽略它们，转而专注于满足更“重要”的需求。被进度追赶或埋头实现功能时，我们会觉得“反正先跑起来，以后再整理”，但那个“以后”很少真正到来。

还有一点同样重要，那就是**保持一致的抽象标准**。如果代码库中的同类逻辑，有些地方内联，有些地方写成函数，还有些地方拆成自定义 hook，新来的代码阅读者就会困惑：“这些差异是刻意设计的吗？”无论抽象与否，团队内部的标准都应保持一致。

Joel Spolsky 在 2002 年提出的**“抽象泄漏定律（The Law of Leaky Abstractions）”**也值得结合这一上下文记住。抽象试图隐藏复杂实现，但实现细节最终仍会泄漏（leak）到外部。也就是说，设计原本声称使用者无需了解内部实现，实际使用时却可能只有了解它才能正确操作。

TCP 把不稳定的网络抽象成稳定连接，但网线断开时，这层抽象就会破裂。React 以声明式方式抽象 UI 更新，但为了优化重新渲染，最终还是需要理解内部行为。完美的抽象并不存在，因此做抽象时，还必须思考：**“当这层抽象破裂时，用户能否应对？”**

归根结底，**“抽象会节省我们的工作时间，却不会节省学习时间。”**


## 抽象是一种内化的能力

我曾和同事讨论过抽象，当时有一个观点令我印象深刻：发现抽象信号，并在恰当时机以恰当层级进行拆分，归根结底**靠的是直觉**。

当然，前面提到的原则——统一抽象层级、起好名字、设计输入自由度——无疑都很重要。但真正开始写代码时，如果逐条想起这些原则，再逐一斟酌“要不要把这个拆出去”，反而可能打断节奏。就像比赛中出刺拳时，如果刻意想着肘部角度，反而会错过时机；写代码时，抽象也应该源于自然直觉，而非每次都有意识地判断。

一路写代码时，有时会突然产生排斥感：“这段逻辑好像不该放在这里。”“这个组件好像知道得太多了。”这种感觉就是抽象信号。能够自然地发现并回应它，就是所谓的内化。

不过，这份直觉并非一朝一夕就能形成。只有学习大量模式、阅读各种代码，并亲自踩过坑，才会自然涌现**“这个似乎应该拆分”**的感觉。日后同事问“为什么把它拆开？”时，如果能够自然回答“因为它属于 X，所以才拆分”，就说明它已经内化了。

任何领域似乎都一样。试图靠背诵来做好一件事，反而会让判断变得困难。最终应该只把握大方向，让细节自然补足。而这种自然，终究来自平时积累的各种模式与经验。


## 结语

编程中的抽象，是隐藏复杂事物、让其看起来简单，并让代码阅读者只关注必要上下文的行为。

最后，再回顾一下做好抽象需要记住的要点。

- 基本前提是不要过早抽象，等明确的信号出现后再拆分。
- 一个函数只在**一个抽象层级**上叙事。
- 通过名称与类型充分**表达**行为，让人无需查看源代码即可使用。
- 根据模块目的与用户，**有意识地设计**输入自由度。
- 与其在错误抽象上继续叠加，不如拥有**拆开并重新开始的勇气**。
- 还要**内化各种模式**，让这一切无需刻意思考也能自然发生。

当然，我在本文中的观点并非标准答案。适当的抽象层级会因业务情况、团队构成与项目性质而异。但有一点始终不变：抽象的最终目的，是**写出便于人理解的代码**。

也希望读到这篇文章的各位，能在自己的代码库中问一句：“这层抽象真的减少了上下文吗？”仅仅这一个问题，或许就会稍微改变你看待代码的方式。


## 参考资料

本文从多份官方文档与既有文章中获得了许多启发。下面一并列出直接引用内容的出处，以及帮助我建立思考框架的文章。

:::ref
- [article] [Evan Moon, 抽象，以及抽象化](https://evan-moon.github.io/2023/01/15/what-is-abstract/)
- [docs] [React, 使用自定义 Hook 复用逻辑](https://react.dev/learn/reusing-logic-with-custom-hooks)
:::
