---
emoji: 🧱
title: 'React 应用的分层'
seoTitle: 'React 应用分层：用 hook、domain object 和 Strategy 模式重构支付页面'
date: '2026-10-01'
categories: 前端 React 架构
description: '跟着 Juntao Qiu 关于 React 模块化的文章，把支付页面拆成 view、model、data 三层。还整理了亲自运行示例仓库时发现的 useMemo 失效和 fetch 反复调用，以及什么时候该用这种结构的判断。'
keywords: 'React 分层架构, React 架构设计, 自定义 hook 拆分, domain object, React 策略模式, Presentation Domain Data 分层, React 重构, React 关注点分离'
locale: zh-CN
translationOf: '261001'
sourceHash: 04386dc525603086b1a6518b3fc3658aa52bda3e4f74955bd48e7683dad0f199
---

这篇文章想聊聊如何把 React 应用的代码拆成界面、业务规则和数据访问三部分。它写给这样的开发者：一个 component 里同时塞着 fetch、计算和 render，每次修改都得从头读到尾。读完之后，你会知道 hook、pure component、domain object、Strategy、network client 分别该看到什么信号、按什么顺序抽出来，以及把这套结构原样搬过去时会在哪里出问题。

骨架是 Thoughtworks 的 Juntao Qiu 于 2023 年 2 月在 martinfowler.com 上连载的 [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html)。笔者没有照搬原文，而是用自己的话重新讲了一遍，正文中的图全部取自原文。在此之上，笔者还拉下作者的[示例仓库](https://github.com/abruzzi/payment-round-up-refactoring)跑了类型检查和测试，并补充了讨论同一问题的其他资料。

## React 是 view library

初学 React 时，最有吸引力的想法是：UI 是把数据变成 DOM 的纯函数。这在一定程度上没错。但一旦向服务器发请求或者跳转页面，component 就不再纯粹了。再加上全局 state 和局部 state 交织在一起，代码很快就会变得复杂。

作者的回答是换个视角。并不存在"React 应用"这种特殊的软件。React 是绘制 UI 的 library，计算和业务规则放在哪里，从一开始就不是它关心的事。架在它上面的，是一个普通的 JavaScript 应用。既然如此，就可以直接沿用从桌面 GUI 时代起一直在用的设计，尤其是把代码分成 presentation、domain、data 三层的做法。

真实的前端应用里，除了 view 还有 router、local storage、多层缓存、网络请求、第三方服务集成与登录、安全、日志、性能调优。如果把这些全都塞进 component 和 hook，同一个文件里就会出现这样的情形：请求订单状态的那一行后面，紧跟着一行去掉字符串开头空格的代码，再后面又是一行跳转到别的页面的代码。读代码的人只能不断切换抽象层次，来回翻看。

拆分的理由可以归结为两点。界面比业务规则变得更频繁。而且把两者分开后，一次只需要思考一件事。第二个理由正是 Martin Fowler 在 [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) 中列为这种划分最大好处的一点：三个主题可以相对独立地思考，需要关注的范围因此缩小。

## 应用成长的五个阶段

在进入重构之前，作者用五张图展示了应用在成长过程中结构如何变化。重要的是进入下一阶段的契机。推动下一阶段的不是某个固定的时间点，而是当前阶段产生的不便。五张图里颜色的含义都一样：浅绿是持有 state 的 container component，深绿是只负责绘制的 presentational component，紫色是 hook，蓝色是 domain object，橙色是网络之类的 infrastructure。

最开始，一个 component 包揽网络请求、state、计算和 render。对小应用或一次性项目来说这就够了，而且代码长得像 HTML，反而更好读。当遍历列表生成条目的代码和配置外部 component 的代码混在一起，读懂到底发生了什么开始变得费时，就该进入下一阶段了。

![一个 component 同时包含网络请求、state 管理、domain logic 和 render，并直接调用 API 的结构](1.png?w=720)

界面变大之后，就按照最终 HTML 的形状拆分 component。只负责绘制的 component 被分离出来，但最上层的 component 里仍然留着网络请求、把响应转换成界面所需形状的代码，以及收集要发给服务器的数据的代码。这三样都不是 UI，却待在 component 里。

![只负责绘制的 component 已经分离，但上层 component 里仍留有网络请求和 domain logic 的结构](2.png?w=720)

接着把 state 及其变化抽到 custom hook 里。这时 hook 中就剩下了既不是 side effect 也不是 state 的纯计算。

![网络请求和 domain logic 移进了 hook，但两者在 hook 内部混在一起的结构](3.png?w=720)

把这段计算抽到与 React 无关的对象里，就得到了 domain object。数据格式转换、null 检查、默认值都搬到这里。对象多起来之后，就开始需要继承或多态。

![hook 里只剩 state，domain logic 分到 Domain 对象，网络请求分到 Fetcher 的结构](4.png?w=720)

最后，当你看到一些既不属于 UI、也不在乎数据来自服务器还是 local storage 或缓存的对象时，就把它们单独归成 model layer。

![中间的横带是 model layer，component 和 hook 在上方，Fetcher、Adaptor 等 infrastructure 在下方的结构](5.png?w=720)

光看图比较抽象。我们用实际代码把这五个阶段走一遍。作者选的例子是在线订单的支付页面。

## 从一个支付页面出发

支付方式来自服务器配置，每个国家都不一样。只要服务器返回了至少一种，就在末尾追加现金支付并默认选中；一种都没有的话，就什么也不显示。

![订单详情下方的支付区域有 apple、google、现金支付三个单选按钮，且选中了现金支付的页面](6.png?w=600)

最初的代码就是教程里常见的样子。在 `useEffect` 里 fetch，把响应转换成界面所需的形状，追加现金支付，再绘制单选列表。下面是笔者精简后的版本。

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

在这个规模下不成问题。但要修改这个 component，就得同时理解四件事：如何发起网络请求，如何把服务器数据转换成界面认识的形状，如何绘制单个支付方式，以及如何绘制整个支付区域。代码一旦变大，读代码的人就得在这四者之间不停切换。

## hook 与 pure component

第一个抽出来的是 state 和 fetch。判断信号很简单。**与 render 无关的代码超过 component 主体的一半时**，就抽成 hook。`usePaymentMethods` 负责 fetch 和转换，component 只接收 hook 给的数组并负责绘制。

第二个是绘制列表的 JSX。**看到只靠 props 就能绘制的代码块时**，就拆成 component。`PaymentMethods` 是只接收一个支付方式数组的 pure component，因此易于测试和复用。以后即使加上通知选择结果的 `onSelect` callback，它也不碰外部 state，所以依然是 pure 的。

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

作者把这两步都称为重构目录中的 [Extract Function](https://refactoring.com/catalog/extractFunction.html)，因为在 React 里 component 也是函数。重要的是，这里并没有引入新概念，只是把一个函数拆成了两个。

到这里看起来像是完成了，但还剩两处。view 里有"现金就默认选中"这个判断，hook 里有把响应转换成界面形状的匿名函数。作者把这种业务规则渗漏到 view 和 hook 里的现象称为 logic leak。

## 收拢到 domain object 的规则

第三个信号是**对同一份数据的判断散落在 view 和 hook 中的时候**。把渗漏出来的判断和转换收拢到一个 `PaymentMethod` class 里。就像本博客[领域模型](/260418)一文讲过的那样，把规则放在数据旁边。

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

view 里的单选按钮现在通过 `defaultChecked={method.isDefaultMethod}` 去问对象。默认的现金支付也用同一个 class 的一个实例来表示。服务器给的和应用追加的变成了同一种形状，view 就不需要区分两者。

![Payment 调用 usePaymentMethods，hook 生成 PaymentMethod，PaymentMethods 只负责绘制的结构](7.png?w=720)

作者把测试变容易列为这种结构的好处。原文说到这里就停了，但到底容易了多少，看代码更快。下面是笔者写的测试。没有 React，没有渲染器，也没有 fetch mock。

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

要在最初的代码里验证同样的规则，得先 render component，拦截 fetch，再等单选按钮画出来。规则一旦变成对象，测试就成了一行函数调用。

另一个好处是，新需求来了以后该去哪里是确定的。此时的文件结构是这样的。

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

结构是否真的扛得住，要等新需求来了才知道。作者在这里又加了一个功能。

## 捐赠功能与作为 state machine 的 hook

新需求是把订单金额向上取整，把差额捐给慈善机构。订单是 19.80 美元的话，就询问是否捐 0.20 美元，同意后按钮上显示 20 美元。

![支付方式下方新增了 0.2 美元捐赠复选框的支付页面](8.png?w=600)

作者故意一开始把是否同意的 state 和计算放进支付 component 里。复选框标记、文案分支、合计计算一股脑涌进来，component 又变重了。整理的顺序和前面一样：state 和计算放进 `useRoundUp` hook，文案拼接放进 helper 函数，复选框标记放进 `DonationCheckbox` component。

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

`toPrecision(10)` 是原文没有解释原因的地方。笔者在 Node 24 上试了一下，`20 - 19.8` 得到的是 `0.1999999999999993`。这是用来消除浮点误差的手段。

作者把这样的 hook 看作"view 背后的 state machine"。UI 传来事件就生成新的 state，新的 state 又触发 render。hook 原本是为了让多个 component 共享 logic 而设计的，但作者的立场是，即使只有一处在用，它也能让 component 专注于 render，所以值得抽出来。在此补充一点：正如 React 官方文档的 [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) 指出的，custom hook 共享的是处理 state 的 logic，而不是 state 本身。每个调用 hook 的 component 都会各自生成一个这样的 state machine。

整理完之后，支付 component 变成调用两个 hook、并排摆出两个子 component 和一个按钮的样子。功能多了一个，支付 component 的职责却没变。

![Payment 下方是 useRoundUp 和 usePaymentMethods 两个 hook，以及 PaymentMethods 和 DonationCheckbox 两个子 component 的结构](9.png?w=720)

## 各国规则与 shotgun surgery

下一个需求是让各国使用不同的取整单位。日本以 100 日元为单位，丹麦以 10 克朗为单位。作者说"看起来是个简单的修改"，故意先展示了把国家代码作为 prop 传入、再加上分支的做法。

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

同样的 `countryCode === "JP"` 判断在 hook、helper、按钮三个地方各出现了一次。加上丹麦，这三处都得重新改；三元运算符撑不住的时候，就会冒出一张按国家代码查货币符号的表。那张表最终也会在多处被分别引用。一处变更需要同时修改多个模块，这种坏味道叫作 shotgun surgery。

![代表各国规则的彩色条散落在多个 component、hook 和 domain object 中的图](10.png?w=720)

这个阶段和前三个阶段的不同之处在于，判断信号不是来自代码，而是来自**变更请求**。只看现在的代码，三个分支并不难读。要数一数每加一个国家得改几处，问题才会显现。那么，散落的分支该收拢到哪里呢？

## 用 Strategy 收拢各国差异

作者的回答是把各国的差异本身做成对象。先用 [Extract Class](https://refactoring.com/catalog/extractClass.html) 和 [Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html) 做出一个 interface 和各国的实现。

```ts
interface PaymentStrategy {
  getRoundUpAmount(amount: number): number;
  getTip(amount: number): number;
}

class PaymentStrategyAU implements PaymentStrategy { /* 1달러 단위 */ }
class PaymentStrategyJP implements PaymentStrategy { /* 100엔 단위 */ }
```

做完一看，各个实现之间不同的只有货币符号和取整函数两样，`getTip` 之类的其余部分完全一样。于是作者用 [Inline Class](https://refactoring.com/catalog/inlineClass.html) 把这些实现合并成一个 class，只把不同的部分通过构造函数传入。之所以不必为每个国家建 subclass，而能把取整算法作为函数传进去，是因为在 JavaScript 里函数是值。下面是笔者把结果精简后的版本。

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

hook 和 component 现在不再知道国家。它们只是接收这一个对象，使用 `strategy.getRoundUpAmount(amount)` 和 `strategy.currencySign`。加一个国家只要多建一个对象就行，不需要改任何文件。

![component 只面向一个 PaymentStrategy，三个国家的实现都聚在它背后的结构](11.png?w=720)

先经过 interface 再合并回去，这个过程看起来可能有些多余。笔者认为这是原文最值得学习的部分。多态不是目的，而是揭示共同点与差异的工具；一旦看到差异缩小到一个函数，就把 class 层级拆掉了。比起引入模式，判断什么时候再把模式拆掉更难。

## 把 fetch 移出 hook

最后抽出来的是 `usePaymentMethods` 里的 fetch 和转换。hook 是 React 的概念，所以留在 view 一侧。加上 error handling 和 retry，hook 很快就会膨胀；换到别的 view library，hook 就用不了。而普通函数在哪里都能用。

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

作者写道，这个函数的作用类似 Anti-Corruption Layer 或 Gateway。意思是即使服务器响应的结构变了，要改的地方也只限于这一个函数。不过这两个名字并不是一回事。Fowler 的 [Gateway](https://martinfowler.com/articles/gateway-pattern.html) 是把对外部系统的访问封装到一处的对象；Anti-Corruption Layer 则出自 Eric Evans 的 DDD，是一道边界，负责翻译语义体系不同的外部模型，防止它污染自己的模型。这个例子里的服务器响应只有 `{ name }` 一个字段，几乎没有需要翻译的语义差异，所以笔者认为 Gateway 是更准确的名字。当服务器是其他团队拥有的遗留系统、连支付方式的含义本身都不同时，同一个位置才会成为 Anti-Corruption Layer。

最终结构是这样的。render 在 component 里，state 在 hook 里，规则在 domain object 里，网络请求在函数里。

![Payment 及其子 component、useRoundUp 和 usePaymentMethods 两个 hook、PaymentStrategy 和 PaymentMethod 两个 domain object、Fetcher 各就各位的最终结构](12.png?w=720)

作者列出了这样拆分带来的五个好处。更容易找到缺陷所在的位置。代码更容易复用和组合。更容易阅读。增加功能时整体不会动摇。还有，domain logic 不知道 view，所以可以只替换 view layer。对最后一点，作者自己也附加了一个前提：在大多数项目中这种情况非常罕见。另外值得一并记住的是，这五点都没有测量数据。

原文的主线到此为止。但真正把这段代码跑起来，会冒出文章里看不到的东西。

## 运行示例后看到的东西

笔者拉下作者的示例仓库（16 个提交，最后一个提交 `de186c5`），跑了 `tsc --noEmit` 和 7 个测试。两者都通过了，原文中缺少定义的 helper 也在仓库的 `src/utils.ts` 里。但仔细看了结构之后，发现有三件事是在照搬之前需要知道的。

### 每次 render 都新建的 Strategy

支付 component 通过 prop 接收 Strategy，没有传的话就用 `new` 创建默认值。而 `useRoundUp` 把这个 Strategy 放进了 `useMemo` 的 dependency 里。

```tsx
export const Payment = ({
  amount,
  strategy = new PaymentStrategy("$", roundUpToNearestInteger),
}: { amount: number; strategy?: PaymentStrategy }) => {
  const { total, tip } = useRoundUp(amount, strategy); // 안에서 [agreeToDonate, amount, strategy]
  // ...
};
```

JavaScript 的 default parameter [在每次调用时都会求值](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)。而 `useMemo` 用 `Object.is` 比较 dependency。两者一碰上，每次 render 都会生成新实例，memo 每次都重新计算。笔者在 React 18 下把同样的结构 render 了四次，使用默认值时计算跑了 4 次，传入同一个实例时只跑了 1 次。仓库里的 `App.tsx` 写的是 `<Payment amount={19.9} />`，没有传 Strategy，所以应用的执行路径恰好走的就是默认值这一侧。

这个例子的计算只是几次加法，没有什么开销。问题在于结构。由谁在哪里创建并传入 Strategy，文章和仓库里都没有定下来，只有测试创建了日本和丹麦的实例。换作笔者，会把实例放成 module 级常量，再按国家代码取出来传进去。

```ts
const strategies = {
  AU: new CountryPayment("$", (n) => Math.floor(n + 1)),
  JP: new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100),
} as const;

<Payment amount={amount} strategy={strategies[countryCode]} />
```

### 仓库里的 fetch 没有 dependency 数组

原文代码的 `useEffect` 里有 `[]`，但仓库中的 `usePaymentMethods` 从第一个提交到最后一个提交都没有 dependency 数组。没有数组的 effect 每次 render 都会重新执行。响应回来后用新数组更新 state，这又触发 render，effect 再次 fetch。由于 `convertPaymentMethods` 每次都返回新数组，这个循环停不下来。

把 fetch 换成立即响应的 mock，在 Jest 里统计 300ms 内的调用次数，测了四次，分别是 152、225、231、233 次。加上 `[]` 就是 1 次。仓库的测试只检查文案有没有出现在页面上，所以抓不到这种反复调用，全部通过。照着原文敲代码的读者不会遇到这个问题，只有直接拿仓库来用时才会踩到。

### 把国家代码作为 prop 传入时出现的 race

原文代码的 fetch effect 也没有 cleanup。React 官方文档的 [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) 指出，在 effect 里 fetch 时，晚到的旧响应可能覆盖最新的响应，所以要用 `ignore` 标志丢弃旧响应。原文只在 mount 时 fetch 一次，所以目前没有问题。但一旦把 URL 里的 `countryCode=AU` 改成通过 prop 传入，就有了 dependency，race 也随之出现。笔者在移植这套结构时，会从一开始就这样写。

```ts
useEffect(() => {
  let ignore = false;
  fetchPaymentMethods(countryCode).then((methods) => {
    if (!ignore) setPaymentMethods(methods);
  });
  return () => { ignore = true; };
}, [countryCode]);
```

再补充一点，原文的取整是 `Math.floor(amount + 1)`，所以金额已经是整数时还会再加 1。20 美元的订单会变成 21 美元。原文只举了 19.80 美元和 3312 日元的例子，看不出这是不是有意为之。如果要搬到实际服务中，首先得确定它和 `Math.ceil` 有什么不同。

## 这种结构什么时候用

作者自己也说，拆分不是固定规则。小而内聚的 component 放在一个文件里反而更容易理解其行为，需要警惕的是文件大到无法理解。他明确表示，Todo 应用或只有一个表单的应用全部放进 component 里也没关系，而示例是为了展示更多模式才故意做得复杂。其他资料也给出了同一方向的前提。

Fowler 在同一篇 layering 文章中说，这种划分只适用于相对较小的单元。把 view、model、data 作为顶层文件夹，在小系统里没问题，但一旦其中某一个变得太大，就应该按领域划分顶层，再在其内部分层。如果把前面看到的 `components/`、`hooks/`、`models/` 文件夹原样搬成大型应用的顶层结构，就会变成 Fowler 叫人避免的样子。

Dan Abramov 也有类似的经历。他在 2015 年提出把 component 分成 [presentational 和 container component](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)，到了 2019 年又在文章开头加了一段更新，说现在不再推荐这样拆分。理由是 Hooks 不需要任意的划分就能做到同样的事；他还补充说，见过太多在没有必要的情况下被教条式强制推行的例子。原文的 hook 抽取更接近这段更新所说的方式。不单独设一个叫 container 的 component，由调用 hook 的 `Payment` 兼任这个角色。

关于 fetch，React 官方文档又往前走了一步。[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) 一方面说把 fetch logic 抽到 custom hook 里，日后更容易迁移到更好的策略；另一方面首推的是 framework 内置的数据获取，或 TanStack Query 这样的 client cache。像原文最后一步那样把 fetch 抽成普通函数，就可以把这个函数直接传给 TanStack Query 的 `queryFn`，前一节的 race 和反复调用都交给 library 处理。笔者认为，这是原文只用一句话带过、却最实用的收益。key 和函数如何组合，另在 [queryKey](/260104) 一文中讨论过。

总结一下笔者的判断。原文的顺序（hook、pure component、domain object、Strategy、network client）值得照着走，因为每个阶段的不便都会成为进入下一阶段的理由。但并不是非走到底不可，看清自己眼下遇到的不便属于哪个阶段，在那里停下就好。与 render 无关的代码多，就做到 hook；同样的判断四处散落，就做到 domain object；一处变更要改好几个文件，就做到 Strategy。另外，如果要用 Strategy，先定好创建实例的位置；如果要把 fetch 放在 effect 里，先写好 cleanup 和 dependency。原文省略的这两点，正是实际移植时最先出问题的地方。

没有标准答案，但希望读到这篇文章的各位也能想一想，自己的代码眼下正遭遇的是第几个阶段的不便。

:::ref
[docs] [Microsoft Azure Architecture Center，Anti-corruption Layer 模式](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
[article] [Juntao Qiu，Headless Component](https://martinfowler.com/articles/headless-component.html)
[article] [Juntao Qiu，Data Fetching Patterns in Single-Page Applications](https://martinfowler.com/articles/data-fetch-spa.html)
:::
