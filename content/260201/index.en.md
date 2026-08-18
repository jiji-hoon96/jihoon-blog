---
emoji: 🧩
title: "Abstraction"
seoTitle: "Frontend Abstraction — Design Principles for Good Code"
date: "2026-02-01"
categories: 프론트엔드 설계 추상화
description: "What abstraction means in frontend development and how good abstractions differ from bad ones, covering levels of abstraction, intention-revealing names, and composition from parts through the lens of React component and function design."
keywords: "frontend abstraction, React component abstraction, Clean Code abstraction, level of abstraction, Level of Abstraction, writing good code, intention-revealing names, Composed Method, Law of Leaky Abstractions, component design, custom hook design, frontend architecture, Kent Beck, Robert C. Martin"
locale: en
translationOf: '260201'
sourceHash: 961247e1971eb4b679afa09b9c66891f16680b46208db88a15e5bb55f86e3e51
---

In this post, I want to talk about abstraction in programming and how to write good code from the perspective of abstraction.

As a frontend developer, I have wrestled countless times with questions like, “How much of this logic should I separate?” and “At what level should I break up this component?” At first, I thought abstraction simply meant extracting what different pieces had in common: turning repeated code into a function, or identifying the commonalities among similar components and combining them into one. But after watching code built this way turn into a monster that became harder to touch over time on several occasions, I began to rethink what abstraction really is.

In this article, I want to organize the thoughts I have developed about the essence of abstraction and how we can use it in frontend development to create good code.


## Abstract and Abstraction

Before getting into the main discussion, I want to clarify exactly what the words “abstract” and “abstraction” mean in programming. They may look similar, but they are quite different in nature.

**Abstract** is a state and a property. When we say, “This is abstract,” we mean that concrete details have been omitted, leaving **only the essential concept**. Classes or methods marked with the `abstract` keyword in Java or TypeScript carry precisely this meaning. They are incomplete blueprints that define only the essential form, before the concrete implementation has been filled in.

**Abstraction** is a process and an act. It is the process of simplifying something complex by retaining only its essential characteristics and removing unnecessary details. Crucially, abstraction is not about “roughly lumping things together”; it is **the act of defining roles precisely at each level**.

In everyday language, “abstract” often carries the nuance of “vague.” In programming, however, abstraction is the exact opposite. Its purpose is not to make things vague, but to create a new level of meaning that can be absolutely precise. The essence of abstraction is preserving information relevant to a given context and forgetting what is irrelevant.

Ultimately, the distinction between abstract and abstraction can be understood like this: **the abstract is “a state in which only the essence remains,” while abstraction is “the process of leaving only the essence.”** What we do when designing code is precisely this process of abstraction: retaining only the essential interface from a complex implementation and hiding the rest.

Then why do we need abstraction in programming?


## Why Do We Need Abstraction?

The fundamental reason abstraction is necessary in programming is surprisingly simple: **to build more complex things**. When we try to build something more complex, there are too many complex elements to remember and manage all at once. So we group those elements and turn them into simplified, abstract concepts.

Consider React, which frontend developers use every day. Rendering a single component internally involves complex processes such as creating the Virtual DOM, reconciliation, and manipulating the actual DOM. Yet we can write JSX without worrying about any of that, because React abstracts those complex processes away for us.

Look at the code below. When using the UserProfile component, we can build and work with the UI perfectly well without knowing about the complex processes happening internally, such as VDOM creation and diffing.

```tsx
<UserProfile name="jihoon" />
```

Configuring Webpack directly used to be part of a frontend developer’s daily life, but frameworks such as Next.js and Vite have since abstracted away bundler configuration. As a result, we can develop applications without knowing the bundler’s inner workings and use that time to **focus on higher-level problems such as business logic and user experience**. (This is why I believe the concept of abstraction is extremely important to the role of a frontend developer.)

This, ultimately, is the core value of abstraction: hiding complexity so that it appears simple and allowing each of us to focus only on our own domain. Thanks to it, we can build increasingly large and complex software without having to understand everything ourselves.

If abstraction is so beneficial, then is more abstraction always better? Let us consider what purpose abstraction should serve.


## Reducing Context

Many developers understand abstraction as “extracting the common parts.” That is not wrong, but it is only one technique for performing abstraction; it does not explain abstraction’s essence.

To me, the essence of abstraction is **“reducing the context a reader needs to know to an appropriate level.”**

Let us look at a simple example.

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

A developer reading this code has to understand the loop’s initialization, condition, and increment; follow element access by index; inspect the conditional branch; and keep track of how the external accumulator is updated. What the code is actually trying to do can be expressed in one sentence—**“calculate the total of the completed orders”**—yet understanding that sentence requires holding four different contexts in mind at once.

```typescript
const total = orders
  .filter((order) => order.status === "completed")
  .reduce((sum, order) => sum + order.amount, 0);
```

Thanks to the abstractions `filter` and `reduce`, the developer only needs to follow two intentions: “select only completed orders” and “accumulate their amounts.” The context of index management and the declaration and updating of an accumulator disappears from the surface of the code.

We can take this one step further.

```typescript
const total = sumCompletedOrders(orders);
```

Now the reader does not even need to know that the calculation is performed by traversing an array. All that remains is the business intent: “calculate the total amount of completed orders.” The code lets us focus not on **how** the calculation is performed, but on **what** is being calculated.

From this perspective, we can see that the React code we write every day is itself a composition of countless abstractions.

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

What if all the internal code of `emotion`, `date-fns`, and `react` were expanded directly inside this component file? It would be difficult to know where to begin reading or distinguish the business logic from the library code. Because abstraction hides the context of each domain at an appropriate level, we can focus solely on the essential purpose: “show today’s date.”

Then how should we approach abstraction when designing actual code?


## What It Means for a Level of Abstraction to Be High or Low

Any discussion of abstraction must include the concept of the **Level of Abstraction**. What exactly does it mean for code’s level of abstraction to be “high” or “low”?

**Code at a low level of abstraction** is close to the concrete procedures performed by the computer: parsing strings directly, iterating through arrays by index, manipulating bytes. It openly exposes **how** it works.

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

**Code at a high level of abstraction** is expressed in the language of the business domain or problem space. Examples include `processPayment(order)`, `sendNotification(user, message)`, and `validateUserInput(formData)`. High-level code reveals **what** it does while hiding how it does it.

In *Clean Code*, Robert C. Martin summarized this idea as the principle of **“One Level of Abstraction per Function.”** When high-level and low-level code are mixed within one function, the reader must decide at every line, “Is this core logic, or is it an implementation detail?”

The problem becomes clear in actual code.

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

The reader of this function begins by following the high-level, business-rule context of the “user registration flow,” only to be abruptly dragged down into the low-level contexts of hash buffer manipulation, SQL queries, and email template strings. Then the code jumps back up to the high-level `sendWelcomeEmail`. When the level of abstraction keeps rising and falling like this, the reader’s mind has to rise and fall with it.

If we rewrite the same function so that its level of abstraction is consistent, it looks like this.

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

Every statement speaks at the same level of abstraction. How email delivery is implemented and which algorithm password hashing uses are the responsibilities of their respective lower-level functions. The reader of this function only needs to focus on a single context: the overall user registration flow.

Martin also called this **“The Stepdown Rule.”** When code is read from top to bottom, it should resemble a newspaper article: the big picture appears at the top, and the details emerge as the reader moves downward.

Kent Beck presented the same principle as the **Composed Method pattern** in *Smalltalk Best Practice Patterns*. A method should consist only of operations at the same level of abstraction, and each step should be expressed as a one-line method call.

All of this ultimately leads to one conclusion: **a function should speak at only one level of abstraction.** Following this principle alone makes a noticeable difference in readability.

Then which direction should abstraction take? Should we begin with the concrete or with the abstract?


## Think in Terms of Assembling Parts, Not Extracting Commonalities

OOP commonly offers the guideline, “Extract the commonalities among concrete things to define something abstract.” The approach itself is not wrong, but I believe adhering to it too rigidly risks producing a design trapped by the current requirements.

Consider an example. Suppose the requirements call for buttons A, B, and C. All three are blue and rounded; the only difference is their label text. A design based solely on extracting their commonalities might look like this.

```tsx
const BlueRoundButton = ({ label }: { label: string }) => {
  return <button className="blue round">{label}</button>;
};
```

This perfectly satisfies the current requirements. But a few days later, the product manager says:

> “Please make it possible to change the color of button B.”

At that point, even the name `BlueRoundButton` becomes awkward. We could add a color prop, but the design was vulnerable to change from the outset because it began with the concrete commonality of “a blue rounded button.” (And this is a mild example. In reality, countless requests arrive about the button’s shape, size, and everything else.)

After this happens repeatedly, one thing becomes clear: **when we extract commonalities from concrete requirements, even the resulting abstraction tends to reflect only the requirements that exist right now**.

That is why I prefer the opposite direction. Instead of extracting abstractions from concrete things, I prefer to **think of abstract parts first and assemble them into concrete things**.

Imagine building a toast notification component. The initial requirement is simple: “When saving is complete, display a short message at the bottom.” An approach based on extracting commonalities would look like this.

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

The current requirement is handled perfectly. But a few days later, the product manager says, “Add an icon on the left depending on whether it is a success or a warning.” `hasIcon` and `iconName` are added. Soon another request arrives: “We also need a toast with an upload progress bar.” Another `progress` prop is added. After repeating this a few times, `Toast` ends up with more than ten props and hidden rules about **which combinations are valid and which are not** that developers must memorize. (And those rules are usually not documented even in comments.)

The design was vulnerable to change because it began with a **concrete, present-day image of “what a toast should look like.”**

The story changes when we approach it as an assembly of parts.

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

The stable essence—“a toast is a shallow container that holds something”—is now separated from the changeable concrete detail of “what it contains.” We can add as many new parts as we like, or arrange existing parts in new combinations, without touching `Toast` itself. The validity rules for prop combinations also disappear. We simply **put in what we want to put in**.

Of course, an experienced developer might say, “Couldn’t we just design it with IoC (Inversion of Control) from the beginning?” That is true. But such judgment is possible because countless past mistakes have cultivated an intuition for which parts are likely to change.

When that intuition is not yet well developed, beginning with the question, “What parts make up this feature, and how should those parts be assembled?” makes it much easier to create a design that is open to change.

At this point, a natural question arises: by what criteria should we divide the parts, and how should we present them externally?


## Three Principles for Good Abstraction

### Think Carefully About Expression

The most important virtue of an abstracted module is that its behavior should be inferable without opening its source code. Kent Beck called this the **“Intention-Revealing Name”** pattern and argued that if an abstraction cannot be given a concise name, the abstraction itself should be reconsidered.

Broadly speaking, we have two tools for achieving this: **names** and **types**.

```typescript
// 도대체 뭘 하는 건지 알 수 없는 함수
function calculate(price: number, rate: number): number;

// 이름과 타입만으로 동작을 유추할 수 있는 함수
function calculateDiscountedPrice(originalPrice: number, discountRate: number): number;
```

From the name alone, `calculateDiscountedPrice` tells us that it takes an original price and a discount rate and calculates the discounted price, while the type information supports this by showing that it accepts `number` values and returns a `number`. We do not need to know which calculation logic is applied internally.

By contrast, `calculate(price: number, rate: number): number` gives us no information about what is being calculated, so we cannot anticipate the result. We can only use it after opening the source code, which forfeits the benefit of abstraction.

It is worth noting that naming itself reflects the level of abstraction. Function names in programming generally take the form **verb + noun**, and the verb we choose reveals the level of abstraction at which the function operates.

> A verb alone does not determine the level of abstraction. The noun that accompanies it—the domain context—determines the final level.

Certain verbs often appear at a **low** level of abstraction: `parse`, `encode`, `decode`, `serialize`, `read`, `write`, `push`, `pop`, `convert`, and `transform`. These words imply physical transformations of data or direct manipulation of data structures.

At the middle level, verbs such as `get`, `save`, `load`, and `validate` appear. They describe technical operations while revealing their intent to some degree.

At a **high** level of abstraction, verbs such as `register`, `refund`, `confirm`, `cancel`, and `submit` are used. These words belong to the language of the business domain. They reveal nothing about the technical procedures happening internally and express only **a user action or business process**.

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

In *Clean Code*, Robert C. Martin wrote that **“a long descriptive name is better than a short enigmatic name.”** He also proposed the principle **“pick one word per concept.”** If `fetch`, `retrieve`, and `get` are mixed for operations in the same context, the reader is left wondering, “Do these three do different things?”

The same principle applies directly to naming React components and hooks.

```tsx
<Button />           
<SearchInput />      
<SubmitOrderButton />
```

The specificity of a component’s name varies with its level of abstraction. Button is a general-purpose UI primitive at a lower level, whereas SubmitOrderButton clearly expresses business intent at a higher level.

```tsx
const handleSubmit = async(data: FormData) => { 
  await registerUser(data);
};

<Form onSubmit={handleSubmit} />           
```

`on*` is the name of the prop a component exposes externally. It lets the component’s consumer declare which event to respond to. `handle*` is the name of the implementation function actually passed to that prop.

```tsx
const user = useAuth();                  
const [items, setItems] = useCartItems();
const { isOpen, toggle } = useModal();   
```

Custom hooks use the `use` prefix to follow React’s rules and make the state or behavior they provide available to components.

> Jeff Atwood, who runs [Coding Horror](https://blog.codinghorror.com/), once pointed out the problem with the `Manager` suffix. A name like `UrlManager` tells us nothing about whether it pools, validates, or creates URLs. Names that reveal a specific role—such as `UrlBuilder`, `UrlValidator`, or `UrlPool`—are far better. An ambiguous name can be a sign that the module’s responsibility itself is ambiguous.

Ultimately, a good name is one that **immediately tells the reader the level of abstraction at which the code operates**.


### Deliberately Design the Degree of Input Freedom

One question arises frequently when designing an abstracted module: “How much functionality should we expose?” This decision has a major impact on the experience of developers who use the module.

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

The first button can accept only `children`. It cannot be given `onClick`, `type`, or `disabled`. In return, its users have nothing to deliberate over.

The second button can accept every attribute of the `button` element. It offers a high degree of freedom, but its users must decide which of dozens of props they should use. I describe this situation as **“the component forcing developers to deliberate.”**

There is no single correct answer. The appropriate level depends on the module’s purpose and its users. For a design system’s base button, restricting Props may be better for maintaining consistency. For a general-purpose utility component, keeping the interface flexible may be preferable.

```tsx
// 지나치게 닫힌 인터페이스 — 다양한 상황에 대응 불가
<Button onClick={handleSubmit}>제출</Button>
// onClick 외의 이벤트, className, disabled 등을 전달할 방법이 없다

// 지나치게 열린 인터페이스 — 의도가 사라짐
<Button {...anyProps} />
// 무엇을 전달해야 하는지 사용자가 직접 파악해야 한다
```

The breadth of an abstraction should be determined by who its users are. A low-level interface is appropriate for users who need to understand and finely control the internal implementation. On the other hand, giving an overly open interface to users who should not need to know the details only adds confusion. Conversely, restricting inputs too heavily for users who must handle varied situations can make the module unusable in the first place.


### Keep the Unit of Abstraction Appropriate

The unit of abstraction—how much to group into a single module—is another important consideration.

One common frontend antipattern is the over-extraction of Custom Hooks.

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

If logic used by only one component is separated into a hook unnecessarily, the reader has to move back and forth between two files to understand the context. Instead of reducing context, the abstraction has increased it.

The reverse is also a problem: putting too much into a single hook.

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

This kind of “God Hook” is difficult to test, and changing one thing can affect unrelated parts.

The criterion for choosing the right unit of abstraction is **“Does this separation actually reduce the context required by the reader?”** If separating the code instead scatters the context and makes it harder to understand, the time for that abstraction has not yet come.


## Beware of Premature Abstraction

After reading this far, one question may remain: “So when should we abstract?” My view is this: **our default premise should be not to abstract prematurely.**

Unless there is a clear signal for abstraction, leaving code as it is gives us a better worst-case outcome than creating the wrong abstraction and later having to unravel it. The process by which a bad abstraction emerges tends to look like this.

1. A similar pattern appears in code A and code B.
2. We think, “The DRY principle says I should extract this into a shared function!” and abstract it.
3. A similar pattern appears in code C, so we use the same function but add one parameter to accommodate slightly different behavior.
4. As code D and E begin using it as well, conditionals and parameters continue to accumulate.
5. The function is now used everywhere, yet everyone is afraid to touch it.

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

If we find ourselves in this situation, the solution is clear. Inline the abstracted code back into each call site, remove the unnecessary code from each one, and then, from that clean state, abstract again only if a genuine commonality becomes visible. **“The fastest way forward is to go back.”**

Then when should we abstract? In my experience, the **signals for abstraction** look roughly like these.

- **Consistency is breaking down.** The same logic is inline in one component and separated into its own function in another. The same calculation is scattered throughout the codebase.
- **The internal structure is being exposed externally without need.** The caller is forced to manage implementation details it has no reason to know.
- **A module keeps exposing its own procedure.** It fails to hide its internal steps, forcing consumers to follow those steps themselves.

The problem is that while detecting these signals is generally straightforward, **in practice, it is easy to ignore them and focus on satisfying more “important” requirements**. Under deadline pressure or absorbed in implementing a feature, we tell ourselves, “It works for now; I’ll clean it up later,” and later rarely comes.

Another crucial point is to **maintain consistent criteria for abstraction**. If the same kind of logic is inline in one part of the codebase, extracted into a function in another, and separated into a custom hook somewhere else, a new reader will wonder, “Is there an intentional reason for these differences?” Whether a team chooses to abstract or not, its criteria must be consistent.

Joel Spolsky’s **“Law of Leaky Abstractions,”** proposed in 2002, is also worth remembering in this context. The law says that abstractions attempt to hide complex implementations, but the details of those implementations eventually leak out. In other words, even when an abstraction is designed so that its users should not need to know the internal implementation, situations arise in which they must understand it to use the abstraction correctly.

TCP abstracts an unreliable network so that it appears to be a reliable connection, but when a cable is disconnected, the abstraction breaks. React abstracts UI updates declaratively, but optimizing rerenders ultimately requires understanding its internal behavior. Because no abstraction is perfect, we must ask when creating one: **“Can users respond when this abstraction breaks?”**

Ultimately, **“Abstractions save us time working; they do not save us time learning.”**


## Abstraction Is Something We Internalize

I once discussed abstraction with a colleague, and something from that conversation stayed with me: detecting the signals for abstraction and separating code at the right time and at the right level are ultimately matters of **intuition**.

The principles discussed earlier—keeping levels of abstraction consistent, choosing good names, and designing the degree of input freedom—are certainly important. But trying to recall each principle and consciously weigh “Should I separate this or not?” at the very moment we write code can instead disrupt our flow. Just as consciously thinking about the angle of your elbow while throwing a jab during a match can make you miss the timing, abstraction while coding should emerge from natural intuition rather than conscious judgment.

There are moments while writing code when a feeling of resistance begins to surface: “This logic does not seem like it belongs here,” or “This component seems to know too much.” That feeling is the signal for abstraction, and internalization means being able to detect and respond to it naturally.

This intuition, however, is not built overnight. Only after studying countless patterns, reading a wide variety of code, and making plenty of mistakes yourself does the feeling that **“this seems like something I should separate”** begin to arise naturally. When a colleague later asks, “Why did you separate this?” and you can naturally answer, “I separated it because of X,” then the principle has become internalized.

I think the same is true in any field. Trying to become good by memorizing rules can make judgment harder. Ultimately, we need to hold on to the broad direction while letting the details fill themselves in naturally. And that naturalness comes from the variety of patterns and experiences we have accumulated over time.


## Closing Thoughts

Abstraction in programming is the act of hiding complexity so that it appears simple and allowing readers of the code to focus only on the context they need.

To revisit what is worth remembering in order to create good abstractions:

- As a default premise, do not abstract prematurely; separate code only when a clear signal appears.
- Let each function speak at **one level of abstraction** only.
- **Express** behavior fully through names and types so that the code can be used without opening its source.
- **Deliberately design** the degree of input freedom to suit the module’s purpose and users.
- Rather than piling more onto a bad abstraction, have the **courage to unravel it and start again**.
- And **internalize a variety of patterns** until all of this comes naturally without conscious effort.

Of course, what I have presented in this article is not the one correct answer. The appropriate level of abstraction inevitably varies with the business situation, the composition of the team, and the nature of the project. But if one thing remains constant, it is that the ultimate purpose of abstraction is **to create code that people can understand easily**.

I hope readers will ask this question of their own codebases: “Is this abstraction actually reducing context?” I believe that question alone can shift, at least slightly, the way we look at code.


## References

This article drew substantial inspiration from several official documents and earlier articles. Below are the sources of passages quoted directly, along with writings that helped shape the framework for my thinking.

:::ref
- [article] [Evan Moon, Abstract and Abstraction](https://evan-moon.github.io/2023/01/15/what-is-abstract/)
- [docs] [React, Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
:::
