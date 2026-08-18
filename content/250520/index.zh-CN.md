---
emoji: ⚛️
title: '彻底掌握 React Fiber'
seoTitle: '彻底掌握 React Fiber — 架构与并发渲染原理分析'
date: '2025-05-20'
categories: 프론트엔드 React
description: "基于 React 源码，深入分析 React Fiber 架构，从 Stack Reconciler、Lane 优先级、双缓冲、MessageChannel 调度器到 Concurrent Features。前端面试中的高频主题。"
keywords: "React Fiber, React Fiber 架构, Stack Reconciler, Concurrent Mode, React 18 并发, useTransition, useDeferredValue, Suspense, React 渲染原理, React 源码分析, Virtual DOM, Reconciliation, Lane 优先级, 前端面试"
locale: zh-CN
translationOf: '250520'
sourceHash: da152b27d26e4621cb1e554cd3d68e531f794e86f395ef9ee35e851f1f0aeff8
---

这篇文章想聊聊堪称 React 心脏的 **Fiber 架构**。

笔者刚接触 React 时，只把 **“Fiber”** 当作面试中的高频问题。背下“把 React 的渲染工作拆分成工作单元来处理”这一句话，就以为那是全部。但真正开始阅读 React 源码后，我才意识到 Fiber 并非一个简单概念，而是一套掌管 React 渲染**一切环节**的运行时架构。

> 至今仍忘不了第一次打开 React 源码时受到的冲击。当时脑海里只有一句：“这些……都是什么？”

本文不会停留在面对“Fiber 是什么？”时只回答“把工作拆成单元来处理”的层面，而会深入探究 Fiber **为什么**诞生、它是**如何**设计的，以及这种结构又**如何**让 React 的 Concurrent Features 成为可能。


## Fiber 为什么会出现？

要回答这个问题，首先需要理解 Fiber 之前的世界，也就是 React 15 及更早版本使用的 **Stack Reconciler** 存在哪些问题。

顾名思义，Stack Reconciler 是一种基于**递归（recursive）调用**的协调引擎。它从上到下递归遍历组件树，一旦开始渲染，就必须处理完整棵树后才能停下来。这就像打电话时，在对方说完之前绝对不能挂断一样。（试想对方开始了长达三小时的人生咨询，而你中途不能挂电话。太可怕了。）

具体来说，Stack Reconciler 存在以下局限。

- **渲染过程中无法中断**：必须一次处理完整棵树，因此在复杂 UI 中，主线程会被占用数十到数百毫秒
- **没有优先级概念**：无论用户点击按钮，还是后台数据更新，所有更新都以相同方式处理
- **难以应对动画/手势**：要保持 60fps，每帧内的全部工作需要在约 16ms 内完成，而递归渲染无法保证这一点
- **发生错误时整个应用中断**：组件树中任意位置发生错误，都可能导致整个应用停止运行

为了克服这些局限，React 团队开始探索一种新的执行模型：将工作**拆分**、为工作**设置优先级**，并能在必要时**中断和恢复**。最终的成果正是 **React Fiber**。

Andrew Clark 撰写的 [react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture) 文档凝聚了这一设计的核心思想，也是理解 Fiber 最重要的参考资料。（他似乎在写完这篇文档后不久便加入了 React 团队。）


## Stack vs Fiber

那么，Stack Reconciler 与 Fiber Reconciler 在代码层面究竟有何不同？

### 基于递归的 Stack Reconciler

```jsx
function renderComponent(component) {
  const element = component.render();
  element.props.children.forEach(child => renderComponent(child)); // 재귀 호출
}
```

Stack 方式在遇到子组件时，会像这样**立即进入递归调用**。这种方式的问题在于，它直接依赖 JavaScript 的调用栈（call stack）。随着递归调用变深，调用栈中会不断堆积栈帧；在所有栈帧都退出之前，浏览器主线程无法执行其他工作。

简单来说，在调用栈清空之前，浏览器会陷入**一动也不能动**的状态。

<video width="640" height="480" controls>
  <source src="/content/250520/stack.mov" type="video/mp4">
</video>

从上面的视频可以看到，Stack Reconciler 渲染期间，主线程会被完全阻塞。


### 基于迭代的 Fiber Reconciler

Fiber 用**迭代（iterative loop）**取代了递归。它没有使用调用栈，而是在内存中实现了自己的**虚拟栈**。每个 Fiber 节点就是一个“栈帧”；由于这些节点以 JavaScript 对象的形式存在于堆内存中，因此工作可以随时中断，并在之后继续。

```jsx
function performWork(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 5) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  requestIdleCallback(performWork); // 나눠서 실행
}
```

上面的代码展示了 Fiber 早期的概念模型。关键在于，`while` 循环每次只处理一个工作单元（unit of work）；时间不足时就退出循环，把控制权交还给浏览器。

（早期采用过 `requestIdleCallback`，但实际的 React 并不使用它。原因会在后文详细说明。）

<video width="640" height="480" controls>
  <source src="/content/250520/fiber.mov" type="video/mp4">
</video>

采用 Fiber 后，即使在渲染过程中，也能立即响应用户事件（按钮点击、输入等）。因为工作被拆成小块执行，浏览器终于有了喘息的空间。

如果想亲自体验两者的区别，可以点击**<a href="https://animated-lollipop-2b6cbb.netlify.app/" target="_blank" rel="noopener noreferrer">这里</a>**。你可以直观看到 Stack Reconciler 和 Fiber Reconciler 的行为差异。

这正是 Andrew Clark 在文档中强调的 Fiber 核心目标。

- **可以暂停工作，并在之后回到该工作继续执行**
- **可以为不同类型的工作设置优先级**
- **可以复用之前已完成的工作**
- **可以中止已经不再需要的工作**


## Fiber Node 的内部结构

读到这里，很自然会产生一个问题：“那么 Fiber 节点内部究竟长什么样？”

React 团队并未另外提供介绍 Fiber 内部实现的官方文档。不过，通过 Andrew Clark 的 react-fiber-architecture 文档和实际 React 源码（`ReactFiber.js`），我们仍然可以理解它的结构。

笔者想把 Fiber 节点比作一张**工作指令单（Work Order）**。在工厂组装产品时，每张工作指令单上都会写明“这个部件是什么类型”“使用什么材料”“下一步需要执行什么工作”“优先级如何”。Fiber 节点也是如此。


### ReactElement 与 FiberNode

要理解 Fiber，首先需要区分 **ReactElement** 和 **FiberNode**。两者经常被混淆，但实际上完全不同。

```ts
// ReactElement — React.createElement()가 반환하는 가벼운 객체
export interface ReactElement {
  type: string | Function; // 문자열(HTML 태그) 또는 함수(컴포넌트)
  props: {
    [key: string]: any;
    children: ReactElement[];
  };
  key: string | null;
  ref: any;
  _owner: FiberNode | null;
}
```

ReactElement 只是一张 UI 的**设计图**。它只是一个“请使用这些 props 渲染这样的组件”的请求，并不包含实际的渲染逻辑或状态。

相较之下，**FiberNode** 是 React 根据这张设计图在内部创建的**运行时工作单元**。ReactElement 中没有的 `tag`、`stateNode`、`child/sibling/return`、`memoizedState`、`updateQueue`、`lanes` 等字段，都存在于 FiberNode 中。

React 根据 ReactElement 的 `type` 创建 FiberNode 时，会确定 **tag** 的值。

- 如果 `type` 是函数，且存在 `prototype.isReactComponent` → `tag = ClassComponent(1)`
- 如果 `type` 是函数 → `tag = FunctionComponent(0)`
- 如果 `type` 是字符串（如 `"div"`）→ `tag = HostComponent(5)`


**tag** 是表示 FiberNode 类型的数字常量。它定义在 `ReactWorkTags.js` 中，包含 `FunctionComponent(0)`、`ClassComponent(1)`、`HostRoot(3)`、`HostComponent(5)`、`HostText(6)` 等 25 种以上的 tag。React 会根据这个 tag 值，决定在 `beginWork` 中执行哪一种处理逻辑。


**type** 在协调（reconciliation）过程中起着关键作用。当 React 比较上一次渲染的 Fiber 和新元素时，**最先检查的**就是 type。（这个值会从 ReactElement 原样传递到 FiberNode。）

- 如果上一次是 `div`，这一次仍是 `div`，React 会**复用**对应的 Fiber 节点，只更新 props
- 如果上一次是 `div`，这一次变成了 `span`，React 会**丢弃**原有 Fiber，并创建新的 Fiber

**key** 同样是从 ReactElement 传递到 FiberNode 的值，主要用于渲染列表（数组）。没有 key 时，如果列表项的顺序发生变化，React 无法准确判断某一项移动到了哪里。这可能导致不必要的 DOM 操作，也可能让组件内部状态在非预期的情况下被保留或丢失。


### child、sibling、return

React Fiber 能够以迭代取代递归的秘密，就藏在这里。

```js
function 부모() {
  return [<자식1/>, <자식2/>];
}
```

**child** 指向组件 render 返回的**第一个**子元素。在上面的示例中就是 `<자식1/>`。**sibling** 表示拥有相同父节点的**下一个兄弟**元素。`<자식1/>` 的 sibling 是 `<자식2/>`。**return** 则指向当前 Fiber 节点处理完成后要**返回的父级** Fiber。`<자식1/>` 和 `<자식2/>` 的 return 都是 `부모`。

这三个字段共同形成了一棵**单向链表（Singly Linked List）形式的树**。普通树结构通常会使用子节点数组（`children[]`），这种做法更直观，但 Fiber 有意避开了它。

为什么？使用基于数组的子节点结构时，遍历需要管理索引；在中途暂停并恢复时，还必须额外追踪“已经处理到哪里”。而在 linked list 结构中，只要记住当前节点的引用，就可以随时继续遍历。这正是 Fiber 能够自然支持**中断与恢复**的结构基础。

React 基于这一结构，以深度优先搜索（DFS）的顺序遍历节点。它沿 `child` 向下（beginWork），到达叶节点后检查 `sibling`；如果没有兄弟节点，就沿 `return` 向上（completeWork）。


### pendingProps 与 memoizedProps

**pendingProps** 是该 Fiber 即将开始处理时收到的**新 props**，而 **memoizedProps** 是上一次渲染中已经处理完成的**旧 props**。

如果两者相同，React 就可以判断“这个组件没有变化”，并直接复用上一次的渲染结果。这正是 **bailout 优化**的核心机制。

同样，**memoizedState** 保存该 Fiber 的 hooks 状态，**updateQueue** 则通过链表管理尚未处理的状态更新（setState 调用）。


### stateNode

**stateNode** 引用 Fiber 节点所指向的**实际实例**。

- 对于 **HostComponent**（div、span 等）：实际 DOM 节点
- 对于 **ClassComponent**：类实例
- 对于 **HostRoot**：FiberRoot 对象

这个字段充当连接 Fiber 虚拟世界与浏览器实际 DOM 的桥梁。


## 双缓冲：current 树与 workInProgress 树

理解 Fiber 时不能遗漏的核心概念，正是**双缓冲（Double Buffering）**。

为了理解这个概念，可以想象游戏图形的绘制过程。如果游戏直接在当前画面上绘制像素，用户就可能看到只画了一半的帧，出现**画面撕裂（tearing）**。为了避免这种情况，游戏引擎会使用**两个缓冲区**：先在一个缓冲区中完整绘制下一帧，绘制完成后，再一次性切换屏幕正在显示的缓冲区。

React Fiber 使用的正是同一种策略。

```js
currentFiber.alternate === workInProgressFiber;
workInProgressFiber.alternate === currentFiber;
```

**current 树**是当前已经反映到屏幕上的 Fiber 树，代表用户正在看到的 UI 状态；**workInProgress 树**则是为了下一次渲染而在后台准备的 Fiber 树。

两棵树通过 `alternate` 属性相互引用。所有变更都在 workInProgress 树上执行；工作完成后，只需一行 `root.current = finishedWork` 就能完成树的切换。之前的 workInProgress 成为新的 current，之前的 current 则会在下一次渲染中被回收为 workInProgress。

```js
function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // 최초 렌더: 새 Fiber를 생성하고 alternate를 연결
    workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
    workInProgress.stateNode = current.stateNode; // DOM 노드는 공유!
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // 재렌더: 기존 alternate를 재사용, effect만 초기화
    workInProgress.pendingProps = pendingProps;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }
  // lanes, child, memoizedState 등을 복사
  workInProgress.childLanes = current.childLanes;
  workInProgress.child = current.child;
  // ...
}
```

这里需要抓住一个关键点：`stateNode`（实际 DOM 节点）在 current 与 workInProgress 之间是**共享**的。React 并非每次都创建新的 Fiber 对象，而是复用原有的 alternate，只更新发生变化的字段。因此，每次渲染时都无需承受垃圾回收（GC）压力，就能高效构建树。

如果 props 或 state 没有变化呢？React 就可以通过 **bailout 优化**跳过整个子树。如果说游戏中的双缓冲是以帧为单位进行优化，那么 Fiber 的双缓冲甚至可以实现**组件级别的优化**。


## pendingWorkPriority => Lanes

那么，Fiber 如何判断“这项工作更重要”？

### expirationTime 的局限

早期 Fiber 使用基于数字的 `pendingWorkPriority` 表示优先级，之后又演变为单一数值 `expirationTime`。过期时间越近，优先级越高，但这种方式存在根本局限。

因为单个数字无法实现“这个更新属于 A 组，那个更新属于 B 组”这样的**灵活分类**。例如，当用户输入与 Transition 更新同时发生时，基于 expirationTime 的机制只能通过范围（range）比较进行分类，因此难以只选择并处理特定更新。

### Lane

为了解决这一问题，Andrew Clark 在 [PR #18796](https://github.com/facebook/react/pull/18796) 中引入了 **Lane 系统**。

理解 Lane 时，可以想象一条**高速公路**。高速公路有多条车道（lane），每条车道用途不同：第一车道是超车道（紧急），第二车道是行车道（普通），路肩用于紧急情况。每辆车（更新）都会按自身性质被分配到相应车道，高速公路管理系统（调度器）则决定先放行哪条车道上的车辆。

React 的 Lane 也是如此。它为每个更新分配**一个 bit（lane）**，并通过位运算创建和比较分组。

```js
// 각 업데이트는 하나의 lane(단일 비트)을 가진다
const SyncLane =             /*  */ 0b0000000000000000000000000000010;
const InputContinuousLane =  /*  */ 0b0000000000000000000000000001000;
const DefaultLane =          /*  */ 0b0000000000000000000000000100000;
const TransitionLane1 =      /*  */ 0b0000000000000000000000100000000;
const IdleLane =             /*  */ 0b0001000000000000000000000000000;

// 배치(batch)는 여러 비트의 OR 조합이다
const SyncUpdateLanes = SyncLane | InputContinuousLane | DefaultLane;

// 특정 lane이 batch에 포함되는지 확인은 단순 비트 연산
const isIncluded = (lane & lanes) !== 0;
```

这一系统被设计为将 31 个 lane 放进一个 31 位整数中，目的是利用 V8 引擎的 **SMI（Small Integer）**优化。在 V8 中，不超过 31 位的整数会通过指针标记处理，无需在堆上分配，可以直接在栈上运算。主要 lane 的优先级是**bit 越低，优先级越高**。

得益于这一结构，React 只需一次位运算，就能决定应该先处理哪项工作。`getNextLanes()` 函数可以从 `pendingLanes` 中挑选优先级最高的 lane 组，跳过已中断（suspended）的 lane，优先重试已收到数据（pinged）的 lane，从而实现精细调度。

此外，为了**防止饥饿（starvation）**，每个 lane 都有过期时间。Sync/InputContinuous 经过 250ms、Transition 经过 5000ms 后，会被加入 `expiredLanes`，并被强制同步处理。也就是说，无论优先级多低，都不会永远遭到忽略。（如果因为优先级低就永远被忽略，那就不是优先级系统，而是歧视系统了。）


## Fiber 的 output

了解 Fiber 的结构后，接下来很自然会好奇：这些 Fiber 节点如何转换为**实际 DOM**？

output 指的是能够应用到实际 DOM 上的具体 DOM 节点信息。这里有一个重要区别。

```jsx
// 사용자 정의 컴포넌트 — output 없음
function 아바타() {
  return <img src="profile.jpg" />;
}

// 호스트 컴포넌트 — output 생성
<img src="profile.jpg" />
<div className="프로필" />
```

只有**宿主组件**（div、span、img 等）会创建实际 DOM 节点。浏览器并不知道 `<아바타/>` 是什么。自定义组件是一种抽象概念，最终必须分解成宿主组件，浏览器才能理解。

让我们更具体地观察这一过程。

```jsx
function 프로필() {
  return (
    <div className="프로필">
      <아바타 />
      <유저정보 />
    </div>
  );
}

function 아바타() {
  return <img src="profile.jpg" alt="프로필" />;
}

function 유저정보() {
  return (
    <div>
      <h2>홍길동</h2>
      <p>개발자</p>
    </div>
  );
}
```

这些组件生成的 Fiber 树与 output 之间的关系如下。

```
프로필 (출력: 없음, 컴포넌트 함수)
  │
  └─► div.프로필 (출력: <div class="프로필">...</div>)
       │
       ├─► 아바타 (출력: 없음, 컴포넌트 함수)
       │    │
       │    └─► img (출력: <img src="profile.jpg" alt="프로필">)
       │
       └─► 유저정보 (출력: 없음, 컴포넌트 함수)
            │
            └─► div (출력: <div>...</div>)
                 │
                 ├─► h2 (출력: <h2>홍길동</h2>)
                 │
                 └─► p (출력: <p>개발자</p>)
```

output 的收集过程是**自下而上**的。首先在叶子（宿主）节点创建 DOM。

```js
// 호스트 컴포넌트들이 실제 DOM 정보 생성
img_fiber.output = createDOMElement('img', {
  src: 'profile.jpg',
  alt: '프로필'
});

h2_fiber.output = createDOMElement('h2', {}, '홍길동');
p_fiber.output = createDOMElement('p', {}, '개발자');
```

接着，父级宿主组件收集子节点的 output。

```js
// div 노드가 자식들의 출력을 수집
유저정보_div_fiber.output = createDOMElement('div', {}, [
  h2_fiber.output,  // <h2>홍길동</h2>
  p_fiber.output    // <p>개발자</p>
]);

// 최상위 div가 모든 자식 출력을 수집
프로필_div_fiber.output = createDOMElement('div', {className: '프로필'}, [
  img_fiber.output,           // <img src="profile.jpg" alt="프로필">
  유저정보_div_fiber.output   // <div><h2>홍길동</h2><p>개발자</p></div>
]);
```

最后，自定义组件将子节点的 output 原样向上传递。

```js
// 사용자 정의 컴포넌트는 자식의 출력을 위로 전달
아바타_fiber.output = img_fiber.output;
유저정보_fiber.output = 유저정보_div_fiber.output;
프로필_fiber.output = 프로필_div_fiber.output;
```


## Fiber 的调度

如果 Fiber 的核心价值是“可以拆分工作”，那么实际执行“拆分”的地方在哪里？答案就是 **Work Loop**。

### Work Loop：Fiber 遍历的心脏

React 的渲染始于 `ReactFiberWorkLoop.js` 中定义的 Work Loop。React 会根据具体情况使用两种 Work Loop。

```js
// 동기 렌더링: 중단 없이 모든 Fiber를 처리
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// 동시성 렌더링: 시간 제한 내에서 작업을 나누어 처리
function workLoopConcurrent(nonIdle) {
  if (workInProgress !== null) {
    const yieldAfter = now() + (nonIdle ? 25 : 5);
    do {
      performUnitOfWork(workInProgress);
    } while (workInProgress !== null && now() < yieldAfter);
  }
}
```

请注意两个函数的差异。`workLoopSync` 会**无条件**运行，直到 `workInProgress` 变为 `null`。而 `workLoopConcurrent` 设有**时间限制**，一旦超时就会退出循环。

这里有趣的是 yield 间隔的差异。Transition、Retry 等 **non-idle 工作（用户能够感知的更新）**每 **25ms** 让出一次控制权，而 **idle 工作（可以等到用户没有任何操作时再处理的低优先级工作）**每 **5ms** 让出一次。为 non-idle 工作分配 25ms，是为了有意将动画限制在约 30fps 的水平，防止 transition 渲染让其他工作陷入饥饿状态。


### performUnitOfWork

`performUnitOfWork` 是处理单个 Fiber 节点的函数，Fiber 遍历的核心就包含在这个函数中。

```js
function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;
  const next = beginWork(current, unitOfWork, renderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next !== null) {
    workInProgress = next;
  } else {
    completeUnitOfWork(unitOfWork);
  }
}
```

`beginWork` 处理当前节点并返回第一个子节点。之后把 `pendingProps` 确定为 `memoizedProps`；如果存在子节点，就前往子节点，否则调用 `completeUnitOfWork`


### beginWork

`beginWork` 从上到下遍历 Fiber 节点，并在每个节点上执行必要的计算。它定义在 `ReactFiberBeginWork.js` 中，内部根据 Fiber 的 `tag` 通过一个巨大的 **switch 语句**进行分支。

```js
function beginWork(current, workInProgress, renderLanes) {
  // bailout 체크: props와 context가 변경되지 않았다면 스킵
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    if (oldProps === newProps && !hasContextChanged()) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }

  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, ...);
    case ClassComponent:
      return updateClassComponent(current, workInProgress, ...);
    case HostComponent:
      return updateHostComponent(current, workInProgress, ...);
    case SuspenseComponent:
      return updateSuspenseComponent(current, workInProgress, ...);
    // ... 약 25가지 이상의 케이스
  }
}
```

关键在于最上方的 **bailout 检查**。如果 props 与 context 和上一次相同，就会通过 `bailoutOnAlreadyFinishedWork` 跳过整个子树。这是 React 性能优化中最重要的路径之一。

`beginWork` 的返回值是**第一个子 Fiber**。如果存在子节点，它就会成为下一个 `workInProgress`；如果不存在（`null`），则进入 `completeUnitOfWork`。


### completeWork

`completeWork` 从叶节点开始，沿父节点方向向上完成工作。

```js
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    // 1. completeWork로 현재 노드의 작업 마무리 (DOM 생성 등)
    completeWork(current, completedWork, renderLanes);

    // 2. 형제가 있으면 형제로 이동 (다시 beginWork 시작)
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }

    // 3. 형제가 없으면 부모로 올라감
    completedWork = completedWork.return;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```

`completeWork` 执行的主要工作如下。

- **对于 HostComponent**：创建实际 DOM 节点（`createInstance`），并 append 子 DOM。如果 DOM 已经存在，就收集发生变化的 props，并保存到 `updateQueue` 中。
- **`bubbleProperties()`**：把子节点的 flags 汇总到 `subtreeFlags` 中。这些信息会在 Commit Phase 用于跳过子树的优化。

遍历过程可以总结为：**沿 child 向下（beginWork）-> 在叶节点完成后移向 sibling -> 没有兄弟节点时沿 return 向上（completeWork）**。这就是 Fiber 的深度优先搜索顺序。


### 放弃 requestIdleCallback 的原因

前面展示 Fiber 概念模型时使用了 `requestIdleCallback`，但实际的 React 并不使用它，原因很明确。

- **调用频率太低**：只会在真正的“空闲时间（浏览器无事可做的时间）”被调用，因此在繁忙页面上，React 工作可能被无限期推迟。Dan Abramov 也曾提到，“requestIdleCallback is called too infrequently to be useful for scheduling React work”。
- **浏览器兼容性问题**：Safari 长期没有实现它，而且不同浏览器的行为并不一致。
- **20ms 上限**：idle deadline 存在上限，React 无法按自身需求对时间进行可预测的控制。

之后，React 又尝试过 `requestAnimationFrame` + 帧预算估算的方式，但由于 React 的工作并不需要与 vsync（让帧输出与显示器完成垂直扫描的时点同步的技术）周期对齐，这种方案最终也被弃用。

### MessageChannel

最终，React 选择了 **MessageChannel**。

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

为什么不使用 `setTimeout`，而要使用 `MessageChannel`？根据 HTML 规范，`setTimeout` 嵌套 5 次以上时，会被强制施加**至少 4ms 的延迟**。而 `MessageChannel` 没有这一限制，可以在下一个事件循环 tick 中立即作为 macrotask 执行。对于以 5ms 为单位拆分工作的 Fiber 来说，人为增加 4ms 延迟是致命的。

（5ms 中有 4ms 都在等待，真正工作的时间就只剩 1ms。这已经不是 work-life balance，只剩 life 了。）

React 的 Scheduler 包在内部维护**两个 min-heap（最小堆）**。

```
timerQueue (대기실)                    taskQueue (실행 대기열)
┌──────────────────┐                  ┌──────────────────┐
│ 아직 시작 시간이     │   startTime      │ 지금 실행 가능한     │
│ 안 된 태스크들       │ ──경과 시──→      │ 태스크들           │
│                  │                  │                  │
│ 정렬: startTime   │                  │ 정렬: expiration  │
│ (빠른 순)          │                  │ Time (임박한 순)   │
└──────────────────┘                  └──────────────────┘
```

**taskQueue** 是“现在就可以执行”的任务队列。`expirationTime`（= startTime + timeout）越小，也就是越接近过期，就越先执行。**timerQueue** 则是“尚未到执行时间”的任务等候区。当当前时间超过 startTime 时，任务就会移动到 taskQueue。

那么，决定 expirationTime 的 timeout 是如何确定的？每种更新优先级（Priority Level）都有各自的 timeout。

```
우선순위          timeout        만료까지         예시
─────────────────────────────────────────────────────────
Immediate        -1ms          즉시 만료         flushSync
UserBlocking     250ms         0.25초           클릭, 입력
Normal           5,000ms       5초              일반 setState
Low              10,000ms      10초             startTransition
Idle             ~1,073,741,823ms  ~12.4일      오프스크린 렌더링
```

**Immediate** 一经创建便立即过期，因此刚进入 taskQueue 就会以最高优先级执行。（一出生就过期，命运多少有点悲凉。）**UserBlocking** 的 250ms 对应人们开始觉得“响应很慢”的阈值（100～300ms）。点击后 0.25 秒内没有响应，用户就会感到不快。**Normal** 的 5 秒看起来很宽裕，但它保证的是“即使在最坏情况下也一定会处理”。实际上，前面的工作一结束，它就会立刻执行。**Idle** 的约 12.4 天实际上等同于无限长：只有其他所有工作结束后才会执行。（几乎没人会连续 12 天不关闭浏览器，所以把它视为无限也无妨。）

这些 timeout 值同时也是**防止饥饿（starvation）**的机制。无论优先级多低，只要超过 timeout，任务就会进入过期状态并被强制执行。即使高优先级工作不断进入，低优先级工作也不会永远遭到忽略。

Scheduler 的 `shouldYieldToHost()` 会检查工作开始后的经过时间是否超过 `frameInterval`（默认 **5ms**，定义在 `SchedulerFeatureFlags.js` 中），并据此决定是否将控制权交还给主线程。


## Render Phase 与 Commit Phase

到目前为止，我们已经了解了 Fiber 的结构与调度。现在来梳理一下这些部分如何组合起来，完成实际的 UI 更新。

Fiber 在内部会经历 **Render Phase** 和 **Commit Phase** 两个阶段。这种分离正是让 React 并发模型成为可能的核心设计。如果想亲自查看 Fiber 的工作流程，可以点击下面的图片。

[![2.png](/content/250520/2.png)](https://storied-centaur-55230f.netlify.app/)



### Render Phase

Render Phase 用于**计算 UI 需要哪些变更**。这一阶段完全不会对 DOM 产生实际影响。它最重要的特性是**可以异步中断并恢复**。

这一阶段以前面介绍的 `beginWork` 和 `completeWork` 为中心运行。

在 **beginWork(fiber)** 中，会根据每个 Fiber 的类型（FunctionComponent、ClassComponent、HostComponent 等）执行相应逻辑，并创建、连接子 Fiber 节点。如果 props 与上一次相同，就可以利用 memoization 跳过（bailout）

在 **completeWork(fiber)** 中，会准备 DOM 创建工作或 effect 信息。之后，通过 `bubbleProperties()` 将子节点的 flags 汇总到 `subtreeFlags`，并在沿父节点方向向上时补全信息

因为这一阶段不直接修改 DOM，所以即使随时中断并在之后重新开始，也不会向用户暴露不完整的 UI。这就是 Concurrent 模式的基础。


### subtreeFlags

在 Render Phase 中，每个 Fiber 都会通过**位标志**记录需要哪些副作用（side effect）。下面看看 `ReactFiberFlags.js` 中定义的主要 flag。

- `Placement`：向 DOM 插入新节点
- `Update`：需要更新 DOM 属性
- `ChildDeletion`：需要删除子节点
- `Ref`：需要连接/解除 ref
- `Passive`：需要执行 useEffect 回调
- `Snapshot`：执行 getSnapshotBeforeUpdate
- `Callback`：执行生命周期回调

早期 React（～16）使用以 `firstEffect` -> `nextEffect` -> `lastEffect` 相连的 linked list，只收集存在副作用的 Fiber。但这种方式会残留对已卸载 Fiber 的引用，造成**内存泄漏**，也难以高效处理 Suspense 等新模式。

从 React 17 开始，React 移除了这个 effect list，转而采用 **subtreeFlags 方式**（[PR #19381](https://github.com/facebook/react/pull/19381)）。在 `completeWork` 阶段，`bubbleProperties()` 会把子节点的 flags 汇总到父节点。

```js
function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags;
  let child = completedWork.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child = child.sibling;
  }
  completedWork.subtreeFlags |= subtreeFlags;
}
```

这种结构最大的优点，是可以在 Commit Phase **跳过整个子树**。如果某个 Fiber 的 `subtreeFlags & MutationMask === NoFlags`，就意味着该子树中没有任何需要更改 DOM 的节点，因此可以整体跳过。这是之前的 linked list 方式无法实现的优化。


### Commit Phase

Commit Phase 负责把 Render Phase 计算出的变更**应用到实际 DOM**。这一阶段**始终同步**执行，一旦开始就会不间断地运行到结束，以防用户看到只更新了一半的 UI。

Commit Phase 在内部按以下细致顺序运行。

1. **Before Mutation Phase**：`commitBeforeMutationEffects()`
   - 在 DOM 变更前读取当前 DOM 状态。`getSnapshotBeforeUpdate` 生命周期会在这里执行。此时 `current` 树仍然代表屏幕上的状态，因此可以安全捕获 DOM 的滚动位置、尺寸等信息。
2. **Mutation Phase**：`commitMutationEffects()`
   - 这一阶段执行**实际 DOM 操作**。插入新节点、修改现有节点、删除无用节点都在这里发生。`componentWillUnmount` 也在此时执行，因为 `current` 仍指向旧树，所以可以读取旧状态。
3. **树切换**：`root.current = finishedWork`
   - 这是双缓冲的核心。workInProgress 树会被提升为 current 树。为何必须在 Mutation 之后、Layout 之前切换？原因很重要：`componentWillUnmount` 需要读取**旧树**，所以必须在 Mutation 阶段执行；而 `componentDidMount`/`componentDidUpdate` 需要读取**新树**，所以必须在 Layout 阶段执行。
4. **Layout Phase**：`commitLayoutEffects()`
   - DOM 变更完成后，执行基于新 DOM 状态的工作。
      - 执行 `componentDidMount`、`componentDidUpdate`
      - 执行 `useLayoutEffect` 回调
      - 此时 `current` 已经指向新树，因此读取 DOM 时会得到更新后的值
5. **Passive Effects**（异步）
   - `useEffect` 的 cleanup 与 setup 会被单独调度并**异步**执行。它们用于处理不依赖 DOM 变更的副作用（数据获取、事件订阅等），因此无需同步执行。采用异步方式，可以把控制权让给浏览器，使其先绘制画面。


## Concurrent Features 与 Fiber

前面介绍的 Fiber 设计（双缓冲、基于 Lane 的优先级、可中断的 Work Loop）究竟带来了怎样的用户体验？让我们通过 React 18 之后的 Concurrent Features 来看看。

### useTransition

调用 `startTransition(() => setState(...))` 后，对应更新会被分配 `TransitionLane`。14 个 TransitionLane 通过 round-robin（依次轮流分配工作的方式）进行分配，以避免冲突。

TransitionLane 的优先级低于 SyncLane 和 DefaultLane，因此当用户输入等紧急更新到来时，可以**中断** transition 渲染，先处理紧急更新。在此期间，屏幕会保持 `current` 树（旧状态），transition 则在 workInProgress 树上于后台继续进行。

此时，双缓冲的价值便体现出来。被中断的 transition 渲染只会影响 workInProgress 树，用户看到的画面（current 树）完全不会受损。

`isPending` flag 表示该 transition 尚未完成，因此可以据此显示加载指示器等内容。


### useDeferredValue

`useDeferredValue(value)` 在首次渲染时会原样返回传入的 `value`。之后的渲染中，如果当前渲染比较紧急，它会返回之前 memoized 的值，并使用 TransitionLane 调度新的渲染。与 Transition 相同，延迟渲染也可以被中断

从概念上看，它与 `startTransition` 类似，但区别在于，它不是应用在派发更新的一方，而是应用在**接收值的一方**。典型用例是立即更新搜索输入框中的文本，同时延迟渲染搜索结果列表。


### Suspense

当组件在 `<Suspense>` 内部 throw Promise 时，`throwException` 会捕获它，并将对应 Fiber 标记为 `Incomplete`。随后，它沿 `return` 链向上寻找最近的 Suspense 边界，并切换 Suspense 边界以显示 fallback UI。Promise resolve 后，通过 `markRootPinged` ping 对应 lane，React 再次渲染 suspended 子树

在 Concurrent 模式下，React 可以继续渲染 suspended 组件的**兄弟（sibling）节点**，因此一个数据请求不会阻塞整棵树的渲染。之所以能做到这一点，是因为 Fiber 的 linked list 结构允许自由移动到 sibling。


### Streaming SSR 与 Selective Hydration

React 18 的 `renderToPipeableStream` 会利用 Suspense 边界。

- **服务器**：Suspense 边界 suspend 时，先发送 fallback HTML；数据准备完成后，再通过 `<script>` tag 流式传输实际内容
- **客户端（Selective Hydration）**：每个 Suspense 边界都可以**独立** hydration。如果用户点击尚未 hydration 的区域，React 会通过 `SelectiveHydrationLane` **优先**处理对应边界的 hydration，然后再派发事件

这一切之所以成为可能，是因为每个 Suspense 边界都是可以独立调度的 Fiber 节点。归根结底，Fiber 架构“拆分工作、设置优先级、可以中断/恢复”的核心设计，构成了这些功能的基础。


## 结语

如果用一句话概括本文，**React Fiber 是一种把递归改为迭代、把调用栈移到堆上，从而让渲染可以中断和恢复的架构**。

为了实现这一点，React 组合了基于 linked list 的树结构、双缓冲、基于 Lane 的优先级系统、基于 MessageChannel 的调度器等众多精巧设计。而这一切最终都指向同一个目标：**最大限度提升用户感受到的 UI 响应性**。

当然，Fiber 的内部实现会随 React 版本升级而持续变化，本文介绍的内容也只是特定时间点的快照。但 Fiber“拆分工作、设置优先级、可以中断和恢复”的核心理念，今后应该也不会改变。

希望本文能让读者理解：React Fiber 并不只是一个面试关键词，而是支撑 React 全部功能的运行时架构。虽然不存在唯一正确的答案，但也希望各位读者亲自阅读源码，建立属于自己的理解。


## 来源

:::ref
- [repo] [React 源码，ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [repo] [React 源码，ReactFiberBeginWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [repo] [React 源码，ReactFiberCompleteWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCompleteWork.js)
- [repo] [React 源码，ReactFiberLane.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberLane.js)
- [repo] [React 源码，ReactFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)
- [repo] [React 源码，Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [repo] [Issue #7942，Fiber Principles](https://github.com/facebook/react/issues/7942)
- [docs] [React 18 WG，New Suspense SSR Architecture](https://github.com/reactwg/react-18/discussions/37)
- [docs] [React 18 WG，Concurrent Scheduling](https://github.com/reactwg/react-18/discussions/27)
- [docs] [React v18.0 Blog Post](https://react.dev/blog/2022/03/29/react-v18)
:::
