---
emoji: ⏱️
title: "React가 MessageChannel을 쓰는 이유"
seoTitle: "React Scheduler는 왜 requestIdleCallback 대신 MessageChannel을 쓸까"
date: "2025-05-15"
updatedAt: "2026-10-08"
categories: 프론트엔드 React
description: "React Scheduler가 requestIdleCallback, requestAnimationFrame, setTimeout 대신 MessageChannel로 작업을 예약하는 이유를 React PR 기록과 setTimeout 4ms 지연의 Chrome 실측으로 정리한다."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4ms, React 스케줄러 원리, shouldYieldToHost, requestAnimationFrame, React Fiber"
---

이번 포스팅에서는 **React가 requestIdleCallback 대신 MessageChannel로 작업을 예약하는 이유**에 대한 이야기를 해보려고 한다.

Fiber를 공부하다가 "브라우저가 한가할 때 조금씩 일한다"는 설명을 읽었는데, 정작 React 소스코드에서는 `MessageChannel`을 만나 헷갈렸던 프론트엔드 개발자를 위한 글이다. 답부터 적으면, `requestIdleCallback`은 React가 원하는 만큼 자주 불리지 않았고, `setTimeout`은 중첩되면 4ms 넘는 지연이 붙는다. 그래서 React의 Scheduler 패키지는 브라우저에서 인위적인 지연 없이 다음 매크로태스크를 예약할 수 있는 `MessageChannel`을 쓴다. 그 4ms가 실제로 얼마나 큰지는 headless Chrome에서 잰 숫자로 확인한다.


## 버려진 예약 방식들

Fiber의 개념을 설명할 때는 `requestIdleCallback`으로 작업을 나눠 실행하는 코드를 흔히 쓴다. 브라우저가 할 일이 없을 때마다 작업 단위를 하나씩 처리하는 모델이다. React도 처음에는 이 API를 실제로 썼고, 지금의 모양에 이르기까지 PR 몇 개를 거쳤다.

- **2017년 1월**: 네이티브 `requestIdleCallback`을 쓰되, 없는 브라우저에서는 `requestAnimationFrame`과 `postMessage`로 흉내 낸 polyfill을 쓰게 했다([PR #8833](https://github.com/facebook/react/pull/8833)). Safari처럼 이 API가 없는 브라우저는 처음부터 polyfill이 맡았다. Safari 정식판에는 [2026년 10월 현재도 이 API가 없다](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility).
- **2018년 3월과 4월**: 네이티브 API가 있어도 polyfill을 쓰는 플래그를 넣었다. Andrew Clark는 PR 본문에서 그동안 겪어 온 starvation(작업이 실행 기회를 얻지 못하고 계속 밀리는 현상) 문제를 polyfill이 줄이는지 시험하려는 것이라고 적었고, 재현이 어려워 확신하기는 어렵다고 덧붙였다([PR #12385](https://github.com/facebook/react/pull/12385)). 한 달 뒤 내부에서 네이티브보다 낫다고 판단해 플래그를 지우고 polyfill로 굳혔다([PR #12648](https://github.com/facebook/react/pull/12648)).
- **2018년 11월**: polyfill이 `window`에 보내던 message 이벤트를 `MessageChannel`로 옮겼다. `window`에 보내면 페이지의 다른 message 핸들러까지 매 프레임 불리기 때문이다([PR #14234](https://github.com/facebook/react/pull/14234)).
- **2019년 7월**: 다음 vsync를 추측해 프레임 끝에서 양보하던 방식 대신, message 이벤트 안에서 5ms 일하고 양보하는 루프를 실험 플래그로 넣었다([PR #16214](https://github.com/facebook/react/pull/16214)). 이 루프는 `requestAnimationFrame`을 아예 쓰지 않는다.
- **2019년 8월과 11월**: 8월에 성능 테스트에서 message 루프 쪽 CPU 활용이 더 낫게 나왔다는 보고([PR #16271](https://github.com/facebook/react/pull/16271), 머지되지 않음)를 거쳐, 11월에 rAF 구현을 지웠다([PR #17252](https://github.com/facebook/react/pull/17252)).

starvation이 왜 생기는지는 `requestIdleCallback`의 정의에서 짐작할 수 있다. [W3C 명세](https://w3c.github.io/requestidlecallback/)는 유휴 기간(idle period)을 브라우저가 정한다고 두고, 프레임과 프레임 사이의 남는 시간을 그 예 가운데 하나로 든다. 애니메이션 중에는 이 기간이 자주 오지만 60Hz 화면에서는 대개 16ms보다 짧다. 메인 스레드가 긴 작업으로 바쁘면 이마저 줄어들고, React 작업은 그만큼 밀린다고 필자는 본다. Dan Abramov도 2018년 8월 이슈 댓글에서 React가 이 API를 그만 쓴 이유를 "it's not as aggressive as we need"라고 적었다([facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)).

그 뒤의 `requestAnimationFrame` 방식을 버린 이유는 PR #16214 본문에 있다. 이 방식은 다음 vsync(디스플레이가 화면을 갱신하는 주기에 맞춘 신호) 시점을 추측해야 했다. 처음에는 30fps를 가정해 프레임 길이를 33.33ms로 잡고, 연속한 두 프레임의 간격이 모두 그보다 짧으면 둘 중 긴 쪽으로 프레임 길이를 줄였다. 이번 프레임의 마감은 프레임이 시작된 시각에 이 길이를 더한 값이었다([PR #17252 직전의 SchedulerHostConfig.default.js](https://github.com/facebook/react/blob/6dc2734b41aef944e457eaa23ae218952fce0a54/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L123-L336)). 프레임 길이를 줄이는 규칙만 있었으므로, PR 본문의 말대로 페이지가 열린 뒤 주사율이 올라가는 것은 감지해도 내려가는 것은 감지하지 못했다.

message 루프는 vsync 주기 어디에 있든 5ms마다 양보한다. PR 본문은 이렇게 하면 주사율이 아주 높은 화면에서도 메인 스레드가 반응성을 유지할 것이라고 기대했다("should keep the main thread responsive"). 같은 PR은 더 자주 양보하면 다른 브라우저 작업과의 경합이 커질 수 있다는 위험과, 백그라운드 탭에서 message 이벤트가 얼마나 throttling되는지 모른다는 점도 함께 적었다. 지금의 Scheduler 소스 주석은 대부분의 작업은 프레임 경계에 맞출 필요가 없다고 적는다.

## MessageChannel

rAF를 걷어낸 뒤 남은 예약 수단이 **MessageChannel**이다. 아래는 React v19.3.0의 [Scheduler.js 530~561행](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L561)이고, 주석은 줄였다.

```js
let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE.
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}
```

분기는 셋이다. 지금의 브라우저에는 `setImmediate`가 없으므로 두 번째 분기의 `MessageChannel`이 잡힌다. 소스 주석에 따르면 첫 분기는 Node.js와 옛 IE를 위한 것이고, `MessageChannel`은 Node.js 프로세스가 끝나지 않게 붙잡지만 `setImmediate`는 그러지 않는다([facebook/react#20756](https://github.com/facebook/react/issues/20756)). 그래서 Jest의 node 환경은 `setImmediate` 경로를 탄다. Jest 27부터의 jsdom 환경은 전역에서 `setImmediate`가 빠졌고([jestjs/jest#11222](https://github.com/jestjs/jest/pull/11222)) `MessageChannel`도 없어서 `setTimeout` 경로를 탄다.

Scheduler가 이렇게 다음 차례를 예약하는 목적은 메인 스레드를 브라우저에 돌려주는 것이다. 자바스크립트가 메인 스레드를 쥐고 있는 동안 브라우저는 입력을 처리하지도, 화면을 그리지도 못한다. 다만 중간에 양보하는 것은 Transition과 Retry처럼 시간을 쪼개는 렌더뿐이다. React v19.3.0의 Reconciler는 Sync, InputContinuous, Default 같은 blocking lane이 들어 있거나, 오래 밀려 만료된 lane이 있거나, `forceSync`로 불린 렌더라면 양보 없이 끝까지 렌더한다([ReactFiberWorkLoop.js 1168행](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1168)).

이런 렌더에서 Reconciler는 Fiber 하나를 처리할 때마다 `shouldYield()`를 묻는다([ReactFiberWorkLoop.js 3073~3078행](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)). 이 함수는 Scheduler가 내보낸 것이고, 실제 판단은 Scheduler 안의 `shouldYieldToHost()`가 한다. 기준은 이번 메시지 태스크가 시작된 뒤 흐른 시간이다. 그 시간이 `frameInterval` 이상이면 양보하고, 커밋 뒤에 `requestPaint()`가 불렸다면 시간과 관계없이 양보한다. `frameInterval`의 초깃값은 `SchedulerFeatureFlags.js`에 정의된 `frameYieldMs`, 즉 **5ms**다([11행](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)). 5ms는 작업 조각의 크기가 아니라 양보를 검사하는 시간 기준이다. 컴포넌트 하나를 렌더링하는 데 20ms가 걸리면 그 20ms는 쪼개지지 않는다. 여기까지는 stable 빌드의 동작이다. experimental 빌드에서는 같은 파일의 `enableAlwaysYieldScheduler`가 켜져 있어, Scheduler가 5ms를 채우지 않고 태스크 하나를 마치면 다음 태스크가 이미 만료되지 않은 한 바로 브라우저에 양보하고 `requestPaint()` 신호도 보지 않는다.

## setTimeout의 4ms 지연

양보한 뒤 다음 조각을 예약하는 데 왜 `setTimeout`이 아닌 `MessageChannel`을 쓸까? HTML 명세의 [타이머 초기화 단계](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps)는 중첩 깊이가 5를 넘은 `setTimeout`의 지연이 4ms보다 짧으면 4ms로 올린다. headless Chrome에서 `setTimeout(fn, 0)`을 스스로 다시 거는 체인을 재 보면 1~6번째 호출의 간격은 0~0.1ms였고, 7번째부터 4~5ms(대개 5ms 안팎)가 붙었다. `MessageChannel`의 메시지에는 이런 최소 지연이 없다. 메시지는 태스크 큐에 들어갈 뿐이라 그 사이에 브라우저가 입력 처리나 렌더링을 끼워 넣을 수 있고, Scheduler는 바로 그 틈을 노린다.

4ms는 작아 보이지만 5ms마다 양보하는 루프에서는 이야기가 다르다. 200ms 분량의 일을 5ms 조각 40개로 나누고, 다음 조각을 `MessageChannel`과 `setTimeout(work, 0)`으로 각각 예약해 봤다. 개발자 도구 콘솔에 붙여 넣으면 그대로 돈다.

```js
function busy(ms) { const s = performance.now(); while (performance.now() - s < ms) {} }
const ch = new MessageChannel();
let done = 0, frames = 0;
const raf = () => { frames++; if (done < 200) requestAnimationFrame(raf); };
const start = performance.now();
const work = () => {
  busy(5); done += 5;
  if (done < 200) schedule();
  else console.log(Math.round(performance.now() - start), 'ms,', frames, 'frames');
};
ch.port1.onmessage = work;
const schedule = () => ch.port2.postMessage(null); // setTimeout(work, 0) 로 바꿔 비교
requestAnimationFrame(raf);
schedule();
```

2026-10-08에 macOS의 Chrome 154.0.8037.98(headless)에서 세 가지를 여덟 번씩 돌린 결과다. Safari와 Firefox에서는 재지 않았다. 표의 세 번째 줄은 `busy(5); done += 5;`를 `busy(200); done += 200;`으로 바꿔 일을 쪼개지 않은 것이다.

| 다음 조각 예약 | 끝날 때까지 | 그동안 그린 프레임 |
|---|---|---|
| `MessageChannel` | 201ms | 12~13 |
| `setTimeout(work, 0)` | 약 365~371ms | 21~22 |
| 쪼개지 않음 | 200ms | 0 |

`setTimeout` 쪽은 앞의 여섯 번 뒤로 조각마다 4~5ms의 빈 시간이 붙어, 같은 일에 약 1.8배의 시간이 걸렸다. 숫자는 기기와 부하에 따라 흔들리지만 약 1.8배라는 비율은 반복해도 유지됐다. 프레임 수가 더 많은 것은 일이 늦게 끝나 재는 구간이 길어졌기 때문이고, 반응성이 더 좋다는 뜻은 아니다. 쪼개지 않으면 일은 200ms에 끝나지만 그동안 프레임이 하나도 그려지지 않는다. `MessageChannel`은 같은 200ms 안에 일을 끝내면서 대개 약 60fps로 프레임을 계속 내보냈다.


## 마치며

정리하면, React에 필요했던 것은 브라우저가 한가해질 때까지 기다리는 API가 아니라 짧게 일하고 곧바로 다음 차례를 예약할 수 있는 API였다. `requestIdleCallback`은 React가 원하는 만큼 적극적으로 불리지 않았고, `requestAnimationFrame` 방식은 vsync 시점을 추측해야 했으며, `setTimeout`은 중첩되면 조각마다 4ms 넘게 쉬게 만들었다. 그 조건을 만족한 것이 `MessageChannel`이다.

이 Scheduler가 나눠 실행하는 작업 단위인 Fiber 노드가 어떻게 생겼고 Work Loop가 그것을 어떻게 순회하는지는 [React Fiber 완전 정복](/250520)에서 다룬다. 이 글을 읽는 독자 분들도 React 소스코드에서 `MessageChannel`을 다시 만나면, 그 자리에 왜 그것이 있는지 한 번쯤 떠올려 보기를 바란다.


:::ref
- [repo] [React 16.0.0의 ReactDOMFrameScheduling.js](https://github.com/facebook/react/blob/v16.0.0/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
