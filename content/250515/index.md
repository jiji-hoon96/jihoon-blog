---
emoji: ⏱️
title: "React가 MessageChannel을 쓰는 이유"
seoTitle: "React Scheduler는 왜 requestIdleCallback 대신 MessageChannel을 쓸까"
date: "2025-05-15"
categories: 프론트엔드 React
description: "React Scheduler가 requestIdleCallback, requestAnimationFrame, setTimeout 대신 MessageChannel로 작업을 예약하는 이유를 호출 빈도, 브라우저 호환성, setTimeout의 4ms 지연으로 정리한다."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms, React 스케줄러 원리, shouldYieldToHost, requestAnimationFrame, React Fiber"
---

이번 포스팅에서는 **React가 requestIdleCallback 대신 MessageChannel로 작업을 예약하는 이유**에 대한 이야기를 해보려고 한다.

Fiber를 공부하다가 "브라우저가 한가할 때 조금씩 일한다"는 설명을 읽었는데, 정작 React 소스코드에서는 `MessageChannel`을 만나 헷갈렸던 프론트엔드 개발자를 위한 글이다. 답부터 적으면, `requestIdleCallback`은 너무 드물게 호출되고 브라우저마다 동작이 달랐으며, `setTimeout`은 중첩되면 4ms 지연이 붙는다. 그래서 React의 Scheduler 패키지는 지연 없이 다음 매크로태스크를 예약할 수 있는 `MessageChannel`을 쓴다.


## requestIdleCallback을 버린 이유

Fiber의 개념을 설명할 때는 `requestIdleCallback`으로 작업을 나눠 실행하는 코드를 흔히 쓴다. 브라우저가 할 일이 없을 때마다 작업 단위를 하나씩 처리하는 모델이다. 하지만 실제 React는 이를 사용하지 않는다. 이유는 세 가지다.

- **호출 빈도가 너무 낮다** : 진정한 "유휴 시간(브라우저가 할 일이 없는 시간)"에만 호출되어, 바쁜 페이지에서는 React 작업이 무한정 지연될 수 있다. Dan Abramov도 "requestIdleCallback is called too infrequently to be useful for scheduling React work"라고 언급한 바 있다.
- **브라우저 호환성 문제** : Safari는 오랫동안 이를 구현하지 않았고, 브라우저마다 동작이 달랐다.
- **20ms 상한** : idle deadline의 상한이 있어 React가 원하는 수준의 예측 가능한 타이밍 제어가 불가능했다.

그 다음으로 `requestAnimationFrame` + 프레임 예산 추정 방식을 시도했지만, React의 작업이 vsync(모니터가 수직 귀선을 완료한 시점에 맞춰 프레임 출력을 동기화하는 기술) 주기에 맞출 필요가 없다는 판단하에 이 역시 폐기되었다.

## MessageChannel

최종적으로 React는 **MessageChannel**을 선택했다.

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

왜 `setTimeout`이 아닌 `MessageChannel`일까? `setTimeout`은 HTML 스펙에 따라 5회 이상 중첩되면 **최소 4ms의 지연**이 강제된다. 반면 `MessageChannel`은 이런 제한 없이 다음 이벤트 루프 틱에서 즉시 매크로태스크로 실행된다. 5ms 단위로 작업을 쪼개는 Fiber에게 4ms의 인위적 지연은 치명적이기 때문이다.

Scheduler의 `shouldYieldToHost()`는 작업 시작 이후 경과 시간이 `frameInterval`(기본 **5ms**, `SchedulerFeatureFlags.js`에서 정의)을 초과했는지를 확인하여 메인 스레드에 제어권을 돌려줄지 결정한다.


## 마치며

정리하면, React에 필요했던 것은 브라우저가 한가해질 때까지 기다리는 API가 아니라 짧게 일하고 곧바로 다음 차례를 예약할 수 있는 API였다. `requestIdleCallback`은 너무 드물게 불렸고, `requestAnimationFrame`은 React 작업이 맞출 필요가 없는 vsync 주기에 묶였으며, `setTimeout`은 4ms 지연을 붙였다. 그 조건을 만족한 것이 `MessageChannel`이다.

이 Scheduler가 나눠 실행하는 작업 단위인 Fiber 노드가 어떻게 생겼고 Work Loop가 그것을 어떻게 순회하는지는 [React Fiber 완전 정복](/250520)에서 다룬다. 이 글을 읽는 독자 분들도 React 소스코드에서 `MessageChannel`을 다시 만나면, 그 자리에 왜 그것이 있는지 한 번쯤 떠올려 보기를 바란다.


## 출처

:::ref
- [repo] [React 소스코드, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [docs] [WHATWG, HTML Standard, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
:::
