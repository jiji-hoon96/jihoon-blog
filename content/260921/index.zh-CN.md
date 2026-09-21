---
emoji: 🪟
title: 'overlay-kit'
seoTitle: 'overlay-kit：以声明式接口打开 React 模态框与 openAsync 核心结构'
date: '2026-09-21'
categories: ignore 前端 React 库
description: '把用全局状态保存模态框开关的代码换成一行 await，我得到了什么又失去了什么。顺着源码追踪 overlay-kit 的事件、reducer 与 openAsync 核心逻辑，并亲手测试重新打开的行为，直到发现它与文档不符之处。'
keywords: 'overlay-kit, React 模态框状态管理, 声明式接口, openAsync, useOverlay, Promise 模态框, React overlay, nice-modal-react'
locale: zh-CN
translationOf: '260921'
sourceHash: aee64a559fb8a6b52010dd747b1aae985c694053425332601b135523a67ada12
---

这篇文章想聊聊以声明式方式处理 overlay 的接口。

笔者喜欢声明式的代码。打开 overlay、关闭它、在其中做异步处理，这一连串行为笔者认为应该由 overlay 自己管理。调用方持有 `isOpen` 并来回切换的做法，会把处理状态的代码和渲染该状态的组件放到两个不同的地方。

然而笔者在公司负责的页面，模态框恰恰相反。是否打开被放在全局 store 里，调用方打开，调用方关闭。连关闭模态框的代码和接收结果的回调,都是调用方直接写的。所以笔者花了很长时间琢磨如何把它挪向声明式的方向，最后干脆重写了一遍。

做这项工作时笔者看了 [overlay-kit](https://github.com/toss/overlay-kit)。它和笔者想要的接口很接近。本文记录 overlay-kit 的声明式接口，以及笔者如何设计公司内部的模态框系统。

## 曾经用状态持有的模态框

笔者在关于[状态管理](/260518)的文章里，把模态框的开关标志当作最简单的局部状态的例子。笔者写道，那是只在一个组件内部使用、外部既无需也无权知道的状态。这个看法现在依然成立。只是一旦模态框有了几十种、彼此层叠出现、还必须把结果值返回给调用方，这个状态就不会再留在组件内部了。

笔者接手的代码把打开的模态框列表放在全局 store 里。由于是公司代码，下面的例子只保留结构、替换了标识符。

```tsx
const [openPopup, closePopup] = useModalStore(
  useShallow((state) => [state.openPopup, state.closePopup]),
);

const handleAddNote = useCallback(() => {
  openPopup(PopupType.ADD_NOTE, {
    itemId,
    onClose: () => closePopup(PopupType.ADD_NOTE),
    onSubmit: (note) => {
      closePopup(PopupType.ADD_NOTE);
      saveNote(note);
    },
  });
}, [closePopup, openPopup, itemId]);
```

这段代码让笔者别扭的地方有三处。

**第一，打开用的函数必须从 hook 里取出来。** `openPopup` 和 `closePopup` 是要从 store 中选取的值，因此只能在组件内部拿到。这意味着打开模态框的代码走不出组件。想在用不了 hook 的地方打开模态框，比如拦截 API 响应的位置或路由守卫，就只能把那个函数当作参数一路传下去。

**第二，结果通过回调返回。** 笔记是否保存了、用户是否直接关掉了，要通过 `onSubmit` 和 `onClose` 两条分支来接收。打开模态框之后要做的事都得写进回调里。如果需要接连打开两个模态框，回调里就会再套一层回调。

**第三，关闭的责任在调用方。** `closePopup(PopupType.ADD_NOTE)` 是调用方来调的。模态框并不关闭自己，而是打开它的那一方记着它是哪一种模态框，然后去关。所以同一个常量会在一个函数里出现三次。

这三点的共同之处在于，打开一个模态框，调用方要写三种代码：打开的代码、接收结果的回调，以及关闭的代码。

如果说决定显示什么才是调用方的职责，那么这里调用方连之后的事情也一并扛下了。尤其是 `closePopup(PopupType.ADD_NOTE)` 用字符串常量指名要关闭的对象。写成别的模态框的常量也照样能通过类型检查，因为它们属于同一个枚举，结果关掉的是别的模态框。

## 等待结果的接口

那么这三点中可以减掉哪一个呢。笔者得到的答案是，把打开模态框变成一次函数调用，并让这个函数返回一个携带结束结果的 Promise。

```tsx
const result = await openModalAsync('ADD_NOTE', { itemId });
if (result.reason !== 'confirmed') return;

await saveNote(result.value);
```

变化有三点。打开用的函数从 hook 变成模块函数，因此可以在组件外调用。结果从回调参数变成返回值，因此后续处理留在了调用函数自身的流程里。而关闭这件事交给了模态框组件自己。

由于返回类型是 `Promise<ModalResult<V>>`，模态框的结束被收拢成了一个值。

Promise 只会结束一次。对已经结束的 Promise 再次 resolve 不会发生任何事，所以结束的原因必须全部塞进这一个值里。于是笔者把 `reason` 分成了五种：用户确认了、用户明确取消了、没有值就关闭了、被同类型的新模态框替换了，或者因整体清理被强制结束了。若只用一个布尔值，"取消"和"整个页面被清理掉"就成了同一个值，而在需要善后的流程里必须区分这两者。

反过来，如果不结束它，调用方就会永远等下去。回调不调用也不会发生什么，但 `await` 会一直不返回。因此每当新增一条把模态框从画面上移除的路径，笔者都得确认那条路径是否也结束了 Promise。替换和强制结束各自拥有一个 `reason`，正是出于这个原因。

## overlay-kit 的调用处

toss 的 overlay-kit，调用处长这样。

```tsx
const confirmed = await overlay.openAsync<boolean>(({ isOpen, close }) => (
  <ConfirmDialog
    open={isOpen}
    onConfirm={() => close(true)}
    onCancel={() => close(false)}
  />
));
```

笔者认为是好接口的地方有三处。

**打开的是什么，就写在调用处。** 笔者做的那一版传的是 `'ADD_NOTE'` 这样的字符串 key。这个 key 对应哪个组件，由 registry 文件知道。那是一个只装着一个对象的文件，把字符串 key 和加载该模态框的 `import()` 函数配成一对。

```tsx
export const modalImporters = {
  ADD_NOTE: () => import('.../add-note-modal'),
  CONFIRM: () => import('.../confirm-modal'),
  // 모달 종류만큼 이어진다
} as const;
```

overlay-kit 把 JSX 直接写在那里。读代码的人不必跳到那个文件，就知道会弹出什么。

**结果的类型在调用处确定。** `openAsync<boolean>` 的类型参数既是 `close` 的参数类型，也是 `await` 的结果类型。不需要为每个模态框单独声明结果类型再登记到表里。

**关闭和移除是分开的。** controller 接收的 props 有四个：`overlayId`、`isOpen`、`close`、`unmount`。`close` 把 `isOpen` 设为 `false`，组件原样保留。真正移除它的是 `unmount`。[官方文档关于打开和关闭 overlay 的说明](https://overlay-kit.slash.page/ko/docs/guides/introduction)是这样解释的。

> 之所以会有这样的差别，是因为使用 `close` 时，为了展示 overlay 关闭的动画，会把它继续保留在内存中。

笔者做的那一版没有这个区分。一关闭就立刻从列表里移除。这也就意味着笔者把关闭动画交给了组件库，并且只处理了能这样做的页面。

## 从 overlay.open 到渲染

接口合意之后，接下来好奇的就是内部。一个模块函数要在 React 树里画出组件，中间必须有什么东西把两边连起来。

### 事件与 reducer

`overlay.open` 不改变状态。它只发出一个事件。

```ts
// packages/src/event.ts
const open = (controller: OverlayControllerComponent, options?: OpenOverlayOptions) => {
  const overlayId = options?.overlayId ?? randomId();
  const componentKey = randomId();
  const dispatchOpenEvent = createEvent('open');

  dispatchOpenEvent({ controller, overlayId, componentKey });
  return overlayId;
};
```

接收方是 `OverlayProvider`。Provider 持有一个 `useReducer`，订阅事件并把 `ADD` 送进 reducer。这里要留意的是 `isOpen` 是以 `false` 进入的。

```tsx
// packages/src/context/provider/index.tsx
const [overlayState, overlayDispatch] = useReducer(overlayReducer, {
  current: null,
  overlayOrderList: [],
  overlayData: {},
});

const open: OverlayEvent['open'] = useCallback(({ controller, overlayId, componentKey }) => {
  overlayDispatch({
    type: 'ADD',
    overlay: { id: overlayId, componentKey, isOpen: false, isMounted: false, controller },
  });
}, []);
```

然后在 controller 挂载后的下一帧送入 `OPEN`，把 `isOpen` 变成 `true`。

```tsx
// packages/src/context/provider/content-overlay-controller.tsx
useEffect(() => {
  requestAnimationFrame(() => {
    overlayDispatch({ type: 'OPEN', overlayId });
  });
}, [overlayDispatch, overlayId]);
```

这里有一处和笔者预想的不一样。

**状态并不在 React 之外。** 因为是用模块函数打开的 API，笔者以为 store 也会在模块层级，实际上却是 Provider 内部的 `useReducer`。在 React 之外的只有事件总线，而它并不持有状态。overlay 被渲染为 Provider 的 `children` 旁边的兄弟节点。它不使用 `createPortal`，也不 import `react-dom`。

还有一处值得注意。从调用处看是 `overlay.open()` 一行，而其内部是一套顺序固定的流程：发出事件、把 `ADD` 送进 reducer、等一帧、再送入 `OPEN`。声明式的接口并没有消灭命令式的代码，而是把它挪到了边界的另一侧。

### 打开的一侧与关闭的一侧

前面看到的 `requestAnimationFrame`，和上一节看到的 `close` 与 `unmount` 的分离，乍看是两回事。实际上它们是堵住同一个约束两端的两个装置。

这个约束就是：CSS 过渡只有在**起始状态和结束状态都被真正渲染出来**时才会执行。[MDN 的 CSS 过渡文档](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions)针对刚添加到 DOM 的元素给出了这样的警告。

> This is treated as if the initial state had never occurred and the element was always in its final state.

失败在这里表现为两种形态。打开时因为没有起始状态而不执行，关闭时因为结束状态还没画出来元素就消失了而不执行。

| | 打开的一侧 | 关闭的一侧 |
|---|---|---|
| 问题 | 没有起始状态 | 在画出结束状态之前就消失 |
| 解法 | 先以关闭状态挂载，下一帧再打开 | 保持挂载，只关掉 `isOpen`，之后再移除 |
| 装置 | `ADD(isOpen: false)`、rAF、`OPEN` | `CLOSE`、动画、`REMOVE` |
| 知道时机的一方 | 库 | 使用者 |

关闭的一侧之所以归使用者负责，原因就在最后一行。打开的一侧，库知道"一帧就够"这个常量。关闭的一侧，库无从知道动画是 200 毫秒还是 400 毫秒。

**所以一侧是自动的，另一侧则以 `unmount` 这个函数交了出去。**

关闭的一侧能够成立，依据在 reducer 里。`CLOSE` 只翻转 `overlayData` 中的 `isOpen`，不碰 `overlayOrderList`。Provider 遍历那个列表来渲染，因此只要还留在列表里，组件就活着。只有 `REMOVE` 把它从列表中移除，才会真正卸载。

**不过 rAF 并非总是必要。** react-transition-group [默认不会在首次挂载时执行 enter 过渡](https://reactcommunity.org/react-transition-group/transition)。即使 `in` 已经是 `true` 也会跳过，必须开启 `appear`。overlay-kit 的 rAF 会在挂载之后把 `isOpen` 从 `false` 改为 `true`，正好覆盖了这种情况。

### 用 Promise 包起来的二十行

`openAsync` 并不是另一套实现，而是包住 `open` 的一层薄封装。

```ts
// packages/src/event.ts
const openAsync = async <T>(controller: OverlayAsyncControllerComponent<T>, options?: OpenOverlayOptions) => {
  return new Promise<T>((_resolve, _reject) => {
    open((overlayProps, ...deprecatedLegacyContext) => {
      const close = (param: T) => {
        _resolve(param);
        overlayProps.close();
      };
      const reject = (reason?: unknown) => {
        _reject(reason);
        overlayProps.close();
      };
      const props: OverlayAsyncControllerProps<T> = { ...overlayProps, close, reject };
      return controller(props, ...deprecatedLegacyContext);
    }, options);
  });
};
```

它所做的全部事情，就是把传给 controller 的 `close` 换掉。原本的 `close` 不接收参数，这里则接收参数，用它 resolve Promise，然后再调用原来的 `close`。结果类型之所以在调用处确定，原因也在这里。`T` 既是 `close` 的参数类型，也是 Promise 的类型。

不过这个结构有一个漏洞。resolve 只在 `close` 被调用时发生。因此如果只用 `unmount` 移除 overlay，Promise 就会永远停留在 pending。这一点记录在 [issue #169](https://github.com/toss/overlay-kit/issues/169) 里，笔者认为需要解决，但该 issue 目前仍然是打开状态。

resolve 发生在 `close` 这一点还有另一层含义。那是关闭开始的时刻，而不是关闭动画结束的时刻。如果流程是拿到确认后调用 API 就没问题，但如果是拿到确认后打开下一个模态框，那么前一个还在消失的过程中，后一个就已经升起来了。

### 设计绕了一圈的地方

为了探究设计的过程，笔者顺着提交记录看了一遍，发现这个结构并非一开始就是如此。1.0 用的是和现在相同的事件加 reducer 的组合。1.2.0 把状态挪到模块层级的外部 store，改用 `useSyncExternalStore` 读取，而 1.8.0 又退回了 reducer。

退回的理由写在 [issue #148](https://github.com/toss/overlay-kit/issues/148) 里。

> `useSyncExternalStore` resolves tearing issues, but it doesn't work well with suspense.

在 overlay 内部取数据导致 suspend 时，React 会警告说组件在响应同步输入的过程中 suspend 了。挪到外部 store 的本意是让人不用 hook 也能读到 overlay 的状态，而当时的 PR 正文里写明了这个目标并没有按预期达成。最终目标是靠 hook 解决的，只有存储方式回到了原处。

笔者从这段记录里得到的不是结论，而是一条判断标准。把状态放到 React 之外，调用位置会变自由，代价是留出了与 React 调度错位的余地。overlay-kit 只把调用位置放到了外面，状态留在了里面。

## 用同一个 id 再次打开时

读 reducer 的时候有一处卡住了笔者。`ADD` 的最前面有这样一个分支。

```ts
// packages/src/context/reducer.ts
case 'ADD': {
  if (state.overlayData[action.overlay.id] != null && state.overlayData[action.overlay.id].isOpen === false) {
    const overlay = state.overlayData[action.overlay.id];
    if (overlay == null || overlay.isOpen) {
      return state;
    }
    return {
      ...state,
      current: action.overlay.id,
      overlayData: { ...state.overlayData, [action.overlay.id]: { ...overlay, isOpen: true } },
    };
  }
  // ...
```

指定 `overlayId` 打开一个 overlay，`close` 之后再用同一个 id 打开，就会走进这个分支。但返回值原样沿用了**既有的 `overlay` 对象**。

新传进来的 `action.overlay` 的 `controller` 哪里都没有被用到。

只靠阅读还不能确信，于是笔者把库的仓库拉下来，自己加了测试。准备两个渲染不同内容的组件，用同一个 id 依次打开。

```tsx
const ControllerA = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">AAA</div> : null);
const ControllerB = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">BBB</div> : null);

overlay.open(ControllerA, { overlayId: 'id-close' });
overlay.close('id-close');
overlay.open(ControllerB, { overlayId: 'id-close' });
```

结果如下。在 overlay-kit 1.9.0 时点的 main 分支上用 vitest 执行。

| 步骤 | 渲染出来的内容 |
|---|---|
| 打开 A、`close`、再用 B 打开 | `AAA`。B 被丢弃 |
| 打开 A、`unmount`、再用 B 打开 | `BBB`。正常替换 |
| 把计数器加到 1、`close`、再打开 | `1`。组件状态被保留 |

第三行是文档作为功能来说明的行为，所以和预期一致。问题在第一行。

**只做 `close` 然后用同一个 id 再次打开，携带新内容的 JSX 会被忽略，之前的画面原样出现。**

笔者在这里又确认了一件事。同一个 reducer 的后半部分有这样一段注释。

```ts
/**
 * @description Brings the overlay to the front when reopened after closing without unmounting.
 */
overlayOrderList: [...state.overlayOrderList.filter((item) => item !== action.overlay.id), action.overlay.id],
```

意思是关闭之后再次打开会把 overlay 带到最前面。可是因为前面的分支会先 `return`，这一行在那种情况下根本不会执行。笔者把两个 overlay 叠着打开，对压在下面的那个执行 `close` 再重新打开，DOM 顺序并没有变化。

**注释描述的行为和实际情况不一致。**

不过笔者没有确认这在画面上是否会立刻表现为问题。测试只看到 DOM 顺序为止，而大多数对话框库都使用自己的 z-index 或 portal，所以 DOM 顺序并不等同于视觉顺序。

笔者做的那一版把同样的情况作为选项暴露出来。再次打开同一种模态框时，由调用方选择是保留既有的还是用新的 props 替换。选择替换的话，既有的 Promise 会以 `replaced` 结束。前面把结果类型分成五种的原因之一就是这个。

**两种设计的差异在这里显现出来。** 笔者的做法把模态框当作数据。字符串 key 和 props 都在 store 里，所以之后可以替换、可以更新。overlay-kit 把模态框当作函数。controller 是一个闭包，一旦存下来，就没有办法从外部改变它的内容。

## 在调用处写 JSX 的代价

那么，在调用处写 JSX 的方式是不是总比字符串 key 的方式更好呢。笔者认为并非如此。要付出的代价有三个。

**代码分割从默认值里掉了出去。** 调用处写 JSX，意味着调用处 import 了那个组件。如果模态框是一个沉重的编辑页面，而按下那个按钮的用户只是少数，那份重量就会进到列表页面的 bundle 里。

`React.lazy` 在 controller 内部是可以工作的。笔者用和前面测试相同的方式量了一下：`open` 之前模块没有被加载，打开时 `Suspense` 的 fallback 先出现，然后主体才渲染出来。

```tsx
const Heavy = React.lazy(() => import('./HeavyModal'));

overlay.open(({ isOpen, close }) => isOpen ? (
  <Suspense fallback={<Spinner />}><Heavy onClose={close} /></Suspense>
) : null);
```

所以差别不在能不能，而在默认值是什么。

笔者做的那一版，registry 文件里的值全都是 `import()` 函数，因此代码分割在结构上是被强制的。overlay-kit 则需要在每个调用处手写。

**调用 `unmount` 的位置要由使用者决定。** 只调用 `close` 就收手的话，overlay 的信息会留在内存里。官方文档也警告了这一点，并针对每个设计系统分别说明该把 `unmount` 挂在哪里。MUI 和 Mantine 有过渡结束的回调，挂在那里即可，而对于没有这类回调的库，文档建议按动画时长设置一个定时器。指引文档要按库分开写，这件事本身就是这个决定的成本。

**overlay 在 Provider 所在的位置渲染。** 因为不使用 portal，同一份代码也能在 React Native 上运行，这是优点。反过来说，在 `OverlayProvider` 之下提供的 context，在 overlay 内部是看不到的。打开依赖路由或表单 context 的模态框时，需要先确认这一点。

## 声明式这个词的范围

写到这里，有一件事让笔者在意。笔者是以"声明式"来称呼这个接口开篇的，可 `overlay.openAsync(...)` 怎么看都是一次函数调用。

先从定义说起。[React 官方文档](https://react.dev/learn/reacting-to-input-with-state)是这样划分两者的。

> In React, you don't directly manipulate the UI--meaning you don't enable, disable, show, or hide components directly. Instead, you **declare what you want to show,** and React figures out how to update the UI.

同一份文档举的比喻更鲜明。命令式是给开车的人一个路口一个路口地报路，声明式则是坐上出租车只说目的地。

**声明式的接口并不是消灭命令式的流程，而是把它挪到边界的另一侧，并给那条边界起个名字。** 前面看到的 overlay-kit 内部正是如此。调用处只有一行，而内部跑着发出事件、两次 dispatch 的流程。

那么来看各个项目把这个词用在哪里。overlay-kit 的文档把以往的方式称为命令式。它所指的是用 `useState` 持有开关标志、在事件处理器里翻转那个值的代码。相反，它称为声明式的，是把 overlay 当作行为而非状态来处理的那一侧。toss 技术博客的[关于声明式代码的文章](https://toss.tech/article/frontend-declarative-code)把这个词定义得更宽：声明式的代码就是抽象层级更高的代码，而把显示 overlay 这一行为抽象出来的 hook 就是一个例子。

于是笔者决定把这个词收窄成这样。**调用方不写关闭的代码。** 什么时候关、关闭过程中留下什么，由 overlay 一侧决定；调用方只写显示什么，以及期望拿回什么结果。

按这个标准来看，用 `useState` 持有 `isOpen` 的代码，和把打开的列表放在全局 store、由调用方来关闭的代码，站在同一边。只是存放位置不同，关闭的语句由调用方来写这一点是一样的。

## 结语

笔者在公司代码里改掉的，归根结底并不是存放位置。而是关闭的代码由谁来写。

即便在使用全局 store 的时期，状态也已经在组件之外了，但打开和关闭的语句依然留在调用处。换成一行 `await` 之后，那些语句才进到模态框内部。

overlay-kit 抵达了同一个位置之后又往前走了一步：把显示什么也写在调用处。笔者认为那个接口读起来很好。而在写这篇文章的过程中，笔者也弄明白了这一步的代价是什么。

**那是把模态框当作函数还是当作数据的差别。** 在调用处写 JSX，controller 就成了闭包，而闭包一旦被存下来，其内容就无法从外部改变。用同一个 id 再次打开时新的 JSX 被忽略，正是从这个结构里来的。用字符串 key 来处理，模态框就变成了装在 store 里的值，可以替换、可以更新、可以代码分割，但调用方只会知道一个名字。

笔者认为，在挑选库的时候，"喜欢这个接口"的感觉是个相当可靠的信号。只是那种感觉究竟指向什么，至少该用语言表述一次。不表述出来，就分不清自己喜欢的是接口本身，还是使用这个库的人们的口碑。也想建议读到这里的各位，针对现在正在用的库做一次这样的梳理。

:::ref
[docs] [overlay-kit 官方文档](https://overlay-kit.slash.page/)
[repo] [desko27/react-call](https://github.com/desko27/react-call)
:::
