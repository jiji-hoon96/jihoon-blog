---
emoji: ⚛️
title: 'Mastering React Fiber'
seoTitle: 'Mastering React Fiber — Analyzing Its Architecture and Concurrent Rendering'
date: '2025-05-20'
categories: frontend React
description: "An in-depth, React-source-based analysis of React Fiber architecture, from the Stack Reconciler to Lane priorities, double buffering, the MessageChannel scheduler, and Concurrent Features. A frequent frontend interview topic."
keywords: "React Fiber, React Fiber architecture, Stack Reconciler, Concurrent Mode, React 18 concurrency, useTransition, useDeferredValue, Suspense, React rendering, React source code analysis, Virtual DOM, Reconciliation, Lane priority, frontend interview"
locale: en
translationOf: '250520'
sourceHash: da152b27d26e4621cb1e554cd3d68e531f794e86f395ef9ee35e851f1f0aeff8
---

In this post, I want to talk about the **Fiber architecture**, which could be called the heart of React.

When I first encountered React, I thought of the word **"Fiber"** as little more than a common interview question. I memorized a one-line definition—"it divides rendering into units of work and processes them"—and assumed that was the whole story. But once I began looking through React's actual source code, I realized that Fiber is not merely a concept. It is the runtime architecture that governs **everything** about React rendering.

> I still cannot forget the shock of opening the React source code for the first time. I remember thinking, "What... is all of this?"

This article goes beyond answering "What is Fiber?" with "It divides work into units." We will dig deeply into **why** Fiber was created, **how** it was designed, and **how** that structure enables React's Concurrent Features.


## Why Was Fiber Introduced?

To answer this question, we first need to understand the problems in the world before Fiber: the **Stack Reconciler**, which React used through version 15.

As its name suggests, the Stack Reconciler was a reconciliation engine based on **recursive calls**. It traversed the component tree recursively from top to bottom, and once rendering began, it could not stop until it had processed the entire tree. It was like being unable to hang up a phone call until the other person had finished speaking. (Imagine that they start a three-hour counseling session about their life and you cannot interrupt. Terrifying.)

More specifically, the Stack Reconciler had the following limitations.

- **Rendering could not be interrupted**: Because the entire tree had to be processed at once, the main thread could be occupied for tens or hundreds of milliseconds in a complex UI
- **No concept of priority**: Whether a user clicked a button or background data was updated, every update was processed in the same way
- **Poor handling of animations and gestures**: Maintaining 60 fps requires all work to finish within roughly 16 ms per frame, something recursive rendering could not guarantee
- **One error could halt the entire app**: An error anywhere in the component tree could stop the whole application

To overcome these limitations, the React team considered a new execution model that could **split up** work, **assign priorities**, and **pause and resume** when necessary. The result was **React Fiber**.

Andrew Clark's [react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture) document captures the core ideas behind this design and is the most important reference for understanding Fiber. (It appears that he joined the React team not long after writing it.)


## Stack vs Fiber

So how do the Stack Reconciler and Fiber Reconciler differ at the code level?

### The Recursion-Based Stack Reconciler

```jsx
function renderComponent(component) {
  const element = component.render();
  element.props.children.forEach(child => renderComponent(child)); // 재귀 호출
}
```

With the Stack approach, encountering a child component leads **immediately into a recursive call**. The problem is that this approach depends directly on JavaScript's call stack. As recursive calls deepen, frames accumulate on the call stack, and the browser's main thread cannot do anything else until every one of those frames has been resolved.

Simply put, the browser is **completely unable to move** until the call stack is empty.

<video width="640" height="480" controls>
  <source src="/content/250520/stack.mov" type="video/mp4">
</video>

The video above shows the main thread being completely blocked while the Stack Reconciler renders.


### The Iteration-Based Fiber Reconciler

Fiber replaced recursion with an **iterative loop**. In place of the call stack, it implements its own **virtual stack** in memory. Each Fiber node is effectively a "stack frame," and because these nodes exist as JavaScript objects in heap memory, work can be paused at any point and resumed later.

```jsx
function performWork(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 5) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  requestIdleCallback(performWork); // 나눠서 실행
}
```

The code above illustrates Fiber's early conceptual model. The key is that the `while` loop processes only one unit of work at a time and, when time runs short, exits the loop and returns control to the browser.

(The initial approach used `requestIdleCallback`, but React does not actually use it. We will examine why later.)

<video width="640" height="480" controls>
  <source src="/content/250520/fiber.mov" type="video/mp4">
</video>

With Fiber, React can respond immediately to user events such as button clicks and typing even during rendering. Breaking work into small pieces gives the browser room to breathe.

If you want to experience the difference firsthand, click **<a href="https://animated-lollipop-2b6cbb.netlify.app/" target="_blank" rel="noopener noreferrer">here</a>**. You can see how the Stack Reconciler and Fiber Reconciler behave differently.

These are precisely the core goals of Fiber that Andrew Clark emphasized in his document.

- **Pause work and return to it later**
- **Assign priority to different types of work**
- **Reuse previously completed work**
- **Abort work that is no longer needed**


## Inside a Fiber Node

At this point, one question naturally comes to mind: "So what does a Fiber node look like internally?"

The React team does not provide separate official documentation for Fiber's internal implementation. However, its structure can be understood through Andrew Clark's react-fiber-architecture document and React's actual source code (`ReactFiber.js`).

I like to compare a Fiber node to a **work order**. When a product is assembled in a factory, each work order specifies what kind of part it is, what materials it uses, which task comes next, and what its priority is. A Fiber node works in much the same way.


### ReactElement and FiberNode

To understand Fiber, you must first distinguish **ReactElement** from **FiberNode**. They are often confused, but they are completely different things.

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

A ReactElement is only a **blueprint** for the UI. It is a request saying, "Render this component with these props," and contains no actual rendering logic or state.

By contrast, a **FiberNode** is the **runtime unit of work** that React creates internally from that blueprint. It contains fields that do not exist on a ReactElement, including `tag`, `stateNode`, `child/sibling/return`, `memoizedState`, `updateQueue`, and `lanes`.

When React examines a ReactElement's `type` and creates a FiberNode, it determines the **tag** value.

- If `type` is a function with `prototype.isReactComponent` → `tag = ClassComponent(1)`
- If `type` is a function → `tag = FunctionComponent(0)`
- If `type` is a string (such as `"div"`) → `tag = HostComponent(5)`


**tag** is a numeric constant indicating the kind of FiberNode. It is defined in `ReactWorkTags.js`, and there are more than 25 tags, including `FunctionComponent(0)`, `ClassComponent(1)`, `HostRoot(3)`, `HostComponent(5)`, and `HostText(6)`. React uses this tag value in `beginWork` to decide which processing logic to run.


**type** plays a central role in reconciliation. When React compares a Fiber from the previous render with a new element, type is the **very first thing it checks**. (The value is passed directly from the ReactElement to the FiberNode.)

- If it was a `div` before and is still a `div`, React **reuses** that Fiber node and updates only its props
- If it was a `div` before but has changed to a `span`, React **discards** the old Fiber and creates a new one

**key** is also passed from the ReactElement to the FiberNode and is used primarily when rendering lists (arrays). Without a key, React cannot accurately determine where each item moved when the order of list items changes. This can cause unnecessary DOM operations or unintentionally preserve or lose a component's internal state.


### child, sibling, return

This is the secret that lets React Fiber use iteration instead of recursion.

```js
function 부모() {
  return [<자식1/>, <자식2/>];
}
```

**child** points to the **first** child element returned by the component's render. In the example above, that is `<자식1/>`. **sibling** means the **next sibling** with the same parent. The sibling of `<자식1/>` is `<자식2/>`. **return** points to the parent Fiber to **return to** once the current Fiber node has been processed. The return value of both `<자식1/>` and `<자식2/>` is `부모`.

The structure formed by these three fields is a **tree represented as a singly linked list**. In a conventional tree, keeping a child array (`children[]`) feels intuitive, but Fiber deliberately avoids doing so.

Why? An array-based child structure requires an index for traversal, and after pausing and resuming, React would need to track separately how far it had progressed. With a linked list structure, remembering only the current node reference is enough to resume traversal at any time. This is the structural foundation that allows Fiber to support **pausing and resuming** naturally.

React traverses nodes in depth-first search (DFS) order using this structure. It descends along `child` (beginWork); once it reaches a leaf node, it checks `sibling`; and when there is no sibling, it ascends along `return` (completeWork).


### pendingProps and memoizedProps

**pendingProps** means the **new props** passed to a Fiber when its processing begins, while **memoizedProps** represents the **previous props** whose processing was completed in the prior render.

If these two values are identical, React can conclude that "nothing changed in this component" and reuse the previous rendering result. This is the core mechanism behind the **bailout optimization**.

Similarly, **memoizedState** stores the Fiber's hook state, while **updateQueue** manages pending state updates (calls to setState) as a linked list.


### stateNode

**stateNode** references the **actual instance** represented by a Fiber node.

- For a **HostComponent** (div, span, and so on): the actual DOM node
- For a **ClassComponent**: the class instance
- For a **HostRoot**: the FiberRoot object

This field serves as the bridge between Fiber's virtual world and the browser's actual DOM.


## Double Buffering: The current and workInProgress Trees

One essential concept that cannot be left out when discussing Fiber is **double buffering**.

Think about game graphics. If a game draws pixels directly onto the current screen, users may see a partially drawn frame, a visual artifact known as **tearing**. To prevent this, game engines use **two buffers**. They draw the next frame completely in one buffer and, once it is ready, swap the buffer displayed on screen all at once.

React Fiber uses exactly the same strategy.

```js
currentFiber.alternate === workInProgressFiber;
workInProgressFiber.alternate === currentFiber;
```

The **current tree** is the Fiber tree currently reflected on screen. It represents the UI state the user is seeing, while the **workInProgress tree** is the Fiber tree being prepared in the background for the next render.

The two trees reference each other through the `alternate` property. All changes are made in the workInProgress tree, and when the work is complete, the trees are swapped with a single line: `root.current = finishedWork`. The previous workInProgress becomes the new current, and the previous current is recycled as workInProgress for the next render.

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

Here is the key point: `stateNode` (the actual DOM node) is **shared** between current and workInProgress. Rather than creating new Fiber objects on every render, React reuses the existing alternate and updates only the fields that changed. This allows it to construct the tree efficiently without adding garbage collection (GC) pressure on every render.

What if neither props nor state has changed? React can skip the entire subtree through the **bailout optimization**. If double buffering in games is a frame-level optimization, Fiber's double buffering enables optimization down to the **component level**.


## pendingWorkPriority => Lanes

How, then, does Fiber decide that one piece of work is more important than another?

### The Limits of expirationTime

Early Fiber used a numeric priority called `pendingWorkPriority`, which later evolved into a single number called `expirationTime`. A nearer expiration time meant higher priority, but this approach had a fundamental limitation.

A single number could not provide **flexible grouping** of the form "this update belongs to group A, while that update belongs to group B." For example, when user input and a Transition update occurred at the same time, the expirationTime-based approach could classify them only through range comparisons, limiting React's ability to selectively process particular updates.

### Lane

To solve this problem, Andrew Clark introduced the **Lane system** in [PR #18796](https://github.com/facebook/react/pull/18796).

To understand Lanes, picture a **highway**. A highway has multiple lanes, each serving a different purpose. The first lane is for passing (urgent), the second for normal travel, and the shoulder for emergencies. Each vehicle (update) is assigned to the lane appropriate to its nature, and the highway management system (scheduler) decides which lane's vehicles should pass first.

React's Lanes work the same way. Each update is assigned **one bit (a lane)**, and bitwise operations are used to create and compare groups.

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

The system is designed so that 31 lanes fit into a 31-bit integer, taking advantage of the V8 engine's **SMI (Small Integer)** optimization. Integers of 31 bits or fewer are handled with pointer tagging in V8 and can be operated on directly on the stack without heap allocation. Among the major lanes, a **lower bit means a higher priority**.

Thanks to this structure, React can decide which work to process first with a single bitwise operation. The `getNextLanes()` function selects the highest-priority lane group from `pendingLanes`, skips suspended lanes, and gives priority to retrying pinged lanes whose data has arrived, enabling sophisticated scheduling.

Each lane is also assigned an expiration time to prevent **starvation**. Sync/InputContinuous is added to `expiredLanes` after 250 ms, and Transition after 5,000 ms, forcing synchronous processing. In other words, no matter how low its priority, work is never ignored forever. (If low-priority work were ignored forever, that would not be a priority system; it would be a discrimination system.)


## Fiber's output

Now that we have examined Fiber's structure, another question arises: how do these Fiber nodes turn into the **actual DOM**?

The output represents concrete DOM node information that can be applied to the actual DOM. There is an important distinction here.

```jsx
// 사용자 정의 컴포넌트 — output 없음
function 아바타() {
  return <img src="profile.jpg" />;
}

// 호스트 컴포넌트 — output 생성
<img src="profile.jpg" />
<div className="프로필" />
```

Only **host components** (div, span, img, and so on) create actual DOM nodes. The browser has no idea what `<아바타/>` is. A user-defined component is an abstraction, so it must ultimately be broken down into host components before the browser can understand it.

Let us examine this process in more detail.

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

The relationship between the Fiber tree produced by these components and their output is as follows.

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

output is collected **from the bottom up**. DOM nodes are created first at the leaf (host) nodes.

```js
// 호스트 컴포넌트들이 실제 DOM 정보 생성
img_fiber.output = createDOMElement('img', {
  src: 'profile.jpg',
  alt: '프로필'
});

h2_fiber.output = createDOMElement('h2', {}, '홍길동');
p_fiber.output = createDOMElement('p', {}, '개발자');
```

Next, the parent host component collects the output of its children.

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

Finally, user-defined components pass their child's output through unchanged.

```js
// 사용자 정의 컴포넌트는 자식의 출력을 위로 전달
아바타_fiber.output = img_fiber.output;
유저정보_fiber.output = 유저정보_div_fiber.output;
프로필_fiber.output = 프로필_div_fiber.output;
```


## Fiber Scheduling

If Fiber's core value is that it can "divide work," where does that division actually happen? In the **Work Loop**.

### Work Loop: The Heart of Fiber Traversal

React rendering begins in the Work Loop defined in `ReactFiberWorkLoop.js`. React uses one of two Work Loops depending on the situation.

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

Notice the difference between the two functions. `workLoopSync` runs **unconditionally** until `workInProgress` becomes `null`. By contrast, `workLoopConcurrent` imposes a **time limit** and exits the loop when that limit is exceeded.

The difference between their yield intervals is interesting. **Non-idle work (updates perceptible to the user)**, such as Transition or Retry, yields every **25 ms**, while **idle work (low-priority work that can wait until the user is doing nothing)** yields every **5 ms**. Non-idle work receives 25 ms to intentionally limit animations to roughly 30 fps, preventing transition rendering from starving other work.


### performUnitOfWork

`performUnitOfWork` processes a single Fiber node. The core of Fiber traversal is contained in this function.

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

`beginWork` processes the current node and returns its first child. It then finalizes `pendingProps` as `memoizedProps`; if there is a child, processing moves to that child, and otherwise it calls `completeUnitOfWork`.


### beginWork

`beginWork` traverses Fiber nodes from top to bottom and performs the required computation at each node. It is defined in `ReactFiberBeginWork.js` and internally branches through a huge **switch statement** based on the Fiber's `tag`.

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

The key is the **bailout check** at the top. If props and context are the same as before, `bailoutOnAlreadyFinishedWork` skips the entire subtree. This is one of the most important paths in React's performance optimization.

The return value of `beginWork` is the **first child Fiber**. If a child exists, it becomes the next `workInProgress`; if not (`null`), execution enters `completeUnitOfWork`.


### completeWork

`completeWork` starts at a leaf node and finishes work while moving upward toward the parent.

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

The main work performed in `completeWork` is as follows.

- **For a HostComponent**: It creates the actual DOM node (`createInstance`) and appends the child DOM nodes. If the DOM already exists, it collects the changed props and stores them in `updateQueue`.
- **`bubbleProperties()`**: It aggregates the children's flags into `subtreeFlags`. This information is used to optimize subtree skipping during the Commit Phase.

To summarize the traversal: **descend along child (beginWork) -> after completing a leaf, move to sibling -> if there is no sibling, ascend along return (completeWork)**. This is Fiber's depth-first traversal order.


### Why React Abandoned requestIdleCallback

Earlier, the Fiber conceptual model showed code using `requestIdleCallback`, but React does not actually use it. The reasons are clear.

- **It is called too infrequently**: It runs only during truly "idle time" when the browser has nothing else to do, so React work could be delayed indefinitely on a busy page. Dan Abramov has also said, "requestIdleCallback is called too infrequently to be useful for scheduling React work."
- **Browser compatibility issues**: Safari did not implement it for a long time, and behavior varied between browsers.
- **A 20 ms cap**: The idle deadline has an upper bound, preventing the predictable degree of timing control React needs.

React next tried `requestAnimationFrame` plus frame-budget estimation, but abandoned that approach as well after deciding that React's work did not need to align with the vsync cycle (the technology that synchronizes frame output to the point at which a monitor completes its vertical refresh).

### MessageChannel

React ultimately chose **MessageChannel**.

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

Why not `setTimeout`, but `MessageChannel`? Under the HTML specification, `setTimeout` is forced to wait at least **4 ms** after five or more nested calls. `MessageChannel`, on the other hand, runs immediately as a macrotask on the next event-loop tick without that restriction. For Fiber, which divides work into 5 ms slices, an artificial 4 ms delay would be devastating.

(If 4 ms out of 5 ms is spent waiting, there is only 1 ms left for actual work. That is not work-life balance; it is just life.)

React's Scheduler package internally manages **two min-heaps**.

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

**taskQueue** is the queue of tasks that "can run right now." The smaller the `expirationTime` (= startTime + timeout)—that is, the closer expiration is—the sooner the task runs. **timerQueue** is the waiting room for tasks whose execution time has not yet arrived. The moment the current time passes startTime, a task moves into taskQueue.

So how is the timeout that determines expirationTime chosen? Each update receives a distinct timeout based on its Priority Level.

```
우선순위          timeout        만료까지         예시
─────────────────────────────────────────────────────────
Immediate        -1ms          즉시 만료         flushSync
UserBlocking     250ms         0.25초           클릭, 입력
Normal           5,000ms       5초              일반 setState
Low              10,000ms      10초             startTransition
Idle             ~1,073,741,823ms  ~12.4일      오프스크린 렌더링
```

**Immediate** expires as soon as it is created. It receives top priority the instant it enters taskQueue. (Being born already expired is a rather melancholy fate.) **UserBlocking** uses 250 ms to match the threshold at which people perceive a response as slow (100–300 ms). If nothing happens within a quarter of a second after a click, users become frustrated. **Normal**'s five seconds may seem generous, but it is a guarantee that the task will be processed even in the worst case. In practice, it runs as soon as preceding work finishes. **Idle**'s roughly 12.4 days is effectively infinite. It runs only after all other work is complete. (People rarely leave a browser open for 12 days, so treating it as infinite is reasonable.)

These timeout values also serve as a mechanism for preventing **starvation**. No matter how low the priority, once the timeout passes, the task expires and is forced to run. A constant stream of high-priority work therefore cannot cause low-priority work to be ignored forever.

The Scheduler's `shouldYieldToHost()` checks whether the time elapsed since work began exceeds `frameInterval` (by default **5 ms**, defined in `SchedulerFeatureFlags.js`) and decides whether to return control to the main thread.


## Render Phase and Commit Phase

We have now examined Fiber's structure and scheduling. Let us put the full flow together and see how all these pieces combine to update the actual UI.

Fiber internally passes through two stages: the **Render Phase** and the **Commit Phase**. This separation is the core design that makes React's concurrency model possible. Click the image below to see Fiber's execution flow for yourself.

[![2.png](/content/250520/2.png)](https://storied-centaur-55230f.netlify.app/)



### Render Phase

The Render Phase is the stage that **calculates which UI changes are needed**. It has no actual effect on the DOM. Its most important characteristic is that it can be **paused and resumed asynchronously**.

This stage operates primarily through `beginWork` and `completeWork`, which we examined earlier.

In **beginWork(fiber)**, React executes the appropriate logic for each Fiber type (FunctionComponent, ClassComponent, HostComponent, and so on). It then creates and connects child Fiber nodes. If props are the same as before, memoization can be used to skip the work (bailout).

In **completeWork(fiber)**, React prepares DOM creation work or effect information. Through `bubbleProperties()`, it aggregates the children's flags into `subtreeFlags` and fills in information while moving upward toward the parent.

Because this phase does not modify the DOM directly, work can be stopped at any time and resumed later without exposing an incomplete UI to the user. This is the foundation of Concurrent Mode.


### subtreeFlags

During the Render Phase, each Fiber records required side effects as **bit flags**. Let us examine the major flags defined in `ReactFiberFlags.js`.

- `Placement`: Insert a new node into the DOM
- `Update`: A DOM property update is required
- `ChildDeletion`: A child node must be deleted
- `Ref`: A ref must be attached or detached
- `Passive`: A useEffect callback must run
- `Snapshot`: Run getSnapshotBeforeUpdate
- `Callback`: Run a lifecycle callback

Earlier versions of React (through approximately version 16) collected only Fibers with side effects using a linked list connected through `firstEffect` -> `nextEffect` -> `lastEffect`. However, this approach could retain references to unmounted Fibers, causing **memory leaks**, and made it difficult to process new patterns such as Suspense efficiently.

Starting with React 17, this effect list was removed in favor of the **subtreeFlags approach** ([PR #19381](https://github.com/facebook/react/pull/19381)). During `completeWork`, `bubbleProperties()` aggregates child flags into the parent.

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

The greatest advantage of this structure is that the Commit Phase can **skip an entire subtree**. If a Fiber satisfies `subtreeFlags & MutationMask === NoFlags`, there are no nodes anywhere in that subtree requiring a DOM change, so the whole subtree can be skipped. This optimization was impossible with the former linked-list approach.


### Commit Phase

The Commit Phase is the stage that **applies the changes calculated during the Render Phase to the actual DOM**. This phase is **always synchronous**; once it begins, it runs to completion without interruption. This prevents users from seeing a partially updated UI.

Internally, the Commit Phase proceeds in the following detailed order.

1. **Before Mutation Phase**: `commitBeforeMutationEffects()`
   - Reads the current DOM state before changing the DOM. The `getSnapshotBeforeUpdate` lifecycle runs here. At this point, the `current` tree still represents the state on screen, so information such as DOM scroll position and dimensions can be captured safely.
2. **Mutation Phase**: `commitMutationEffects()`
   - This is where **actual DOM manipulation** happens. New nodes are inserted, existing nodes are modified, and unnecessary nodes are removed. `componentWillUnmount` also runs here because `current` still points to the previous tree, allowing the previous state to be read.
3. **Tree swap**: `root.current = finishedWork`
   - This is the essence of double buffering. The workInProgress tree is promoted to the current tree. The reason the swap happens after Mutation but before Layout is important. `componentWillUnmount` must read the **previous tree**, so it must run during Mutation, while `componentDidMount`/`componentDidUpdate` must read the **new tree**, so they must run during Layout.
4. **Layout Phase**: `commitLayoutEffects()`
   - After DOM changes are complete, tasks based on the new DOM state run.
      - Run `componentDidMount` and `componentDidUpdate`
      - Run `useLayoutEffect` callbacks
      - At this point, `current` already points to the new tree, so reading the DOM returns updated values
5. **Passive Effects** (asynchronous)
   - `useEffect` cleanup and setup are scheduled separately and run **asynchronously**. Because they handle side effects that do not depend on DOM changes (such as data fetching and event subscriptions), they do not need to run synchronously. Running them asynchronously yields so the browser can paint the screen first.


## Concurrent Features and Fiber

Now let us use the Concurrent Features introduced in React 18 to see what kind of user experience Fiber's entire design—double buffering, Lane-based priority, and an interruptible Work Loop—actually enables.

### useTransition

When `startTransition(() => setState(...))` is called, the update receives a `TransitionLane`. Fourteen TransitionLanes are assigned in round-robin fashion (one after another in sequence) to prevent collisions.

Because TransitionLane has lower priority than SyncLane or DefaultLane, incoming urgent updates such as user input can **interrupt** transition rendering and be processed first. During that time, the `current` tree (the previous state) remains on screen while the transition proceeds in the workInProgress tree in the background.

This is where the value of double buffering shines. Interrupted transition rendering affects only the workInProgress tree, leaving the screen the user sees (the current tree) entirely intact.

The `isPending` flag indicates that the transition is not yet complete, making it possible to display a loading indicator or perform similar handling.


### useDeferredValue

On the initial render, `useDeferredValue(value)` returns the supplied `value` unchanged. On subsequent renders, if the current render is urgent, it returns the previous memoized value and schedules a new render with a TransitionLane. Like a Transition, the deferred render can be interrupted.

Conceptually, it is similar to `startTransition`, but the difference is that it is applied on the **receiving side of a value**, rather than where an update is dispatched. A typical use case is updating the text in a search field immediately while deferring the rendering of the search results list.


### Suspense

When a component throws a Promise inside `<Suspense>`, `throwException` catches it and marks that Fiber as `Incomplete`. It then follows the `return` chain upward to find the nearest Suspense boundary and switches that boundary to display its fallback UI. When the Promise resolves, `markRootPinged` pings the relevant lane, and React renders the suspended subtree again.

In Concurrent Mode, React can continue rendering the suspended component's **sibling nodes**, so a single data request does not block rendering of the entire tree. This is possible because Fiber's linked-list structure allows free movement to a sibling.


### Streaming SSR and Selective Hydration

React 18's `renderToPipeableStream` uses Suspense boundaries.

- **Server**: When a Suspense boundary suspends, the server sends fallback HTML first and later streams the actual content in a `<script>` tag once the data is ready
- **Client (Selective Hydration)**: Each Suspense boundary can be hydrated **independently**. If the user clicks an area that has not yet been hydrated, React uses `SelectiveHydrationLane` to hydrate that boundary **first** and then dispatches the event

All of this is possible because each Suspense boundary is a Fiber node that can be scheduled independently. Ultimately, the central design of the Fiber architecture—"divide work, assign priorities, and pause/resume"—forms the foundation of these features.


## Conclusion

To summarize this article in one sentence, **React Fiber is an architecture that replaces recursion with iteration and moves the call stack into the heap, making rendering interruptible and resumable**.

It combines many sophisticated designs to accomplish this, including a linked-list-based tree structure, double buffering, a Lane-based priority system, and a MessageChannel-based scheduler. All of these ultimately serve one goal: **maximizing the responsiveness of the UI as experienced by the user**.

Of course, Fiber's internal implementation continues to change with each React release, and what this article covers is only a snapshot from a particular point in time. Still, I believe Fiber's core philosophy—"divide work, assign priorities, pause, and resume"—will remain unchanged.

I hope this article has conveyed that React Fiber is not merely an interview keyword but the runtime architecture supporting every React feature. There may be no single correct interpretation, but I also hope readers will inspect the source code themselves and build their own understanding.


## Sources

:::ref
- [repo] [React source code, ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [repo] [React source code, ReactFiberBeginWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [repo] [React source code, ReactFiberCompleteWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCompleteWork.js)
- [repo] [React source code, ReactFiberLane.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberLane.js)
- [repo] [React source code, ReactFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)
- [repo] [React source code, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [repo] [Issue #7942, Fiber Principles](https://github.com/facebook/react/issues/7942)
- [docs] [React 18 WG, New Suspense SSR Architecture](https://github.com/reactwg/react-18/discussions/37)
- [docs] [React 18 WG, Concurrent Scheduling](https://github.com/reactwg/react-18/discussions/27)
- [docs] [React v18.0 Blog Post](https://react.dev/blog/2022/03/29/react-v18)
:::
