---
emoji: 🪟
title: 'overlay-kit'
seoTitle: 'overlay-kit, React 모달을 선언적으로 여는 인터페이스와 openAsync 코어 구조'
date: '2026-09-21'
categories: ignore 프론트엔드 React 라이브러리
description: '모달 열림 여부를 전역 상태로 들고 있던 코드를 await 한 줄로 바꾸며 얻은 것과 잃은 것. overlay-kit의 이벤트와 리듀서, openAsync 코어 로직을 소스로 따라가고, 재열기 동작을 직접 테스트해 문서와 어긋나는 지점까지 확인한다.'
keywords: 'overlay-kit, React 모달 상태 관리, 선언적 인터페이스, openAsync, useOverlay, Promise 모달, React 오버레이, nice-modal-react'
---

이번 포스팅에서는 오버레이를 선언적으로 다루는 인터페이스에 대한 이야기를 해보려고 한다.

필자는 선언적인 코드를 좋아한다. 오버레이를 띄우고, 닫고, 그 안에서 비동기 처리를 하는 일련의 행위는 그 오버레이가 스스로 관리하는 편이 낫다고 생각한다. 호출하는 쪽이 `isOpen`을 들고 있다가 켜고 끄는 방식은 상태를 다루는 코드와 그 상태가 그려지는 컴포넌트를 서로 다른 자리에 떨어뜨려 놓는다.

그런데 필자가 회사에서 맡은 화면의 모달은 정확히 그 반대였다. 열림 여부를 전역 스토어에 담아 두고, 호출부가 열고 호출부가 닫았다. 모달을 닫는 코드와 결과를 받는 콜백까지 호출부가 직접 쓰고 있었다. 그래서 이것을 선언적인 방향으로 어떻게 옮길지 한참 고민했고, 결국 직접 갈아엎었다.

작업을 하면서 [overlay-kit](https://github.com/toss/overlay-kit)을 살펴보았다. 필자가 지향하는 인터페이스와 비슷했다. 이 글은 overlay-kit의 인터페이스의 선언적 인터페이스를 살펴보고, 어떻게 사내 modal 시스템을 설계했는지에 대해 기록해보겠다.

## 상태로 들고 있던 모달

필자는 [상태 관리](/260518)에 대한 글에서 모달의 열림 여부를 가장 단순한 로컬 상태의 예로 들었다. 한 컴포넌트 안에서만 쓰고 외부에서는 알 필요도 알 권리도 없는 상태라고 썼다. 그 말은 지금도 맞다고 생각한다. 다만 모달이 수십 종류가 되고, 서로 겹쳐 뜨고, 결과값을 호출부로 돌려줘야 하는 순간부터는 그 상태가 컴포넌트 안에 머물러 있지 않는다.

필자가 만난 코드는 열린 모달의 목록을 전역 스토어에 두고 있었다. 사내 코드라 아래 예시는 식별자를 바꿔 구조만 옮긴 것이다.

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

이 코드가 불편했던 자리는 셋이다.

**첫째, 여는 함수를 훅으로 꺼내야 한다.** `openPopup`과 `closePopup`은 스토어에서 선택해 와야 하는 값이라 컴포넌트 안에서만 얻을 수 있다. 그래서 모달을 여는 코드가 컴포넌트 밖으로 나가지 못한다. API 응답을 가로채는 자리나 라우터 가드처럼 훅을 쓸 수 없는 곳에서 모달을 띄우려면 그 함수를 인자로 받아 내려보내야 한다.

**둘째, 결과가 콜백으로 돌아온다.** 노트를 저장했는지, 사용자가 그냥 닫았는지를 `onSubmit`과 `onClose` 두 갈래로 받는다. 모달을 띄운 뒤에 할 일이 있으면 그 일이 콜백 안으로 들어간다. 모달을 두 개 연달아 띄워야 하면 콜백 안에 콜백이 생긴다.

**셋째, 닫는 책임이 호출부에 있다.** `closePopup(PopupType.ADD_NOTE)`를 호출부가 부른다. 모달이 자기 자신을 닫는 것이 아니라, 모달을 연 쪽이 그 모달의 종류를 기억하고 있다가 닫는다. 그래서 같은 상수가 한 함수 안에 세 번 나온다.

셋의 공통점은 모달 하나를 띄우는 데 호출부가 세 가지 코드를 써야 한다는 것이다. 여는 코드, 결과를 받는 콜백, 그리고 닫는 코드다.

무엇을 띄울지 정하는 데까지가 호출부의 몫이라고 보면, 그 뒤의 일까지 호출부가 떠안고 있었다. 특히 `closePopup(PopupType.ADD_NOTE)`는 닫을 대상을 문자열 상수로 지목한다. 다른 모달의 상수를 적어도 같은 열거형이라 타입 검사를 통과하고, 엉뚱한 모달이 닫힌다.

## 결과를 기다리는 인터페이스

그러면 이 셋 중 무엇을 덜어낼 수 있을까. 필자가 도달한 답은 모달을 여는 것을 함수 호출로 두고, 그 함수가 종료 결과를 담은 Promise를 돌려주게 하는 것이었다.

```tsx
const result = await openModalAsync('ADD_NOTE', { itemId });
if (result.reason !== 'confirmed') return;

await saveNote(result.value);
```

바뀐 것은 세 가지다. 여는 함수가 훅이 아니라 모듈 함수가 되면서 컴포넌트 밖에서도 부를 수 있게 됐다. 결과가 콜백의 인자가 아니라 반환값이 되면서 후속 작업이 호출 함수의 흐름 안에 남았다. 그리고 닫는 일은 모달 컴포넌트가 직접 하게 됐다.

반환 타입이 `Promise<ModalResult<V>>`가 되면서 모달의 종료가 값 하나로 모였다.

Promise는 한 번만 끝난다. 이미 끝난 Promise를 다시 resolve해도 아무 일이 일어나지 않으므로, 종료 사유를 그 값 하나에 전부 담아야 한다. 그래서 `reason`을 다섯 가지로 나눴다. 사용자가 확정했는지, 명시적으로 취소했는지, 값 없이 닫혔는지, 같은 종류의 새 모달로 교체됐는지, 전체 정리로 강제 종료됐는지다. 불리언 하나로 두면 "취소"와 "화면이 통째로 정리됨"이 같은 값이 되는데, 뒤처리가 필요한 흐름에서는 그 둘을 구분해야 했다.

반대로 끝내지 않으면 호출부는 영원히 기다린다. 콜백은 부르지 않아도 아무 일이 없지만 `await`는 반환되지 않은 채로 남는다. 그래서 모달을 화면에서 걷어내는 경로가 늘어날 때마다 그 경로도 Promise를 끝내는지 확인해야 했다. 교체와 강제 종료가 각자 `reason`을 하나씩 가진 것이다.

## overlay-kit의 호출부

toss overlay-kit 호출부는 이렇게 생겼다.

```tsx
const confirmed = await overlay.openAsync<boolean>(({ isOpen, close }) => (
  <ConfirmDialog
    open={isOpen}
    onConfirm={() => close(true)}
    onCancel={() => close(false)}
  />
));
```

필자가 좋은 인터페이스라고 생각한 지점은 셋이다.

**무엇이 열리는지가 호출부에 있다.** 필자가 만든 쪽은 `'ADD_NOTE'`라는 문자열 key를 넘긴다. 그 key가 어느 컴포넌트인지는 registry 파일이 알고 있다. 문자열 key와 그 모달을 가져오는 `import()` 함수를 짝지어 둔 객체 하나가 들어 있는 파일이다.

```tsx
export const modalImporters = {
  ADD_NOTE: () => import('.../add-note-modal'),
  CONFIRM: () => import('.../confirm-modal'),
  // 모달 종류만큼 이어진다
} as const;
```

overlay-kit은 JSX를 그 자리에 쓴다. 코드를 읽는 사람이 이 파일로 이동하지 않아도 무엇이 뜨는지 안다.

**결과의 타입이 호출부에서 정해진다.** `openAsync<boolean>`의 타입 인자가 곧 `close`의 인자 타입이고 `await`의 결과 타입이다. 모달마다 결과 타입을 따로 선언하고 표에 등록할 필요가 없다.

**닫는 것과 지우는 것이 나뉘어 있다.** 컨트롤러가 받는 props는 `overlayId`, `isOpen`, `close`, `unmount` 넷이다. `close`는 `isOpen`을 `false`로 만들고 컴포넌트는 그대로 둔다. `unmount`가 실제로 제거한다. [공식 문서의 오버레이 열고 닫기 안내](https://overlay-kit.slash.page/ko/docs/guides/introduction)는 이렇게 설명한다.

> 이러한 차이가 발생하는 이유는 `close`를 사용할 때 오버레이가 닫히는 애니메이션을 보여주기 위해서 메모리에 계속 남겨두기 때문이에요.

필자가 만든 쪽에는 이 구분이 없다. 닫으면 목록에서 바로 빠진다. 그래서 닫기 애니메이션을 라이브러리의 컴포넌트에 맡기고 있고, 그것이 가능한 화면만 다루고 있었다는 뜻이기도 하다.


## overlay.open에서 렌더까지

인터페이스가 마음에 들면 그다음 궁금한 것은 안이다. 모듈 함수 하나가 React 트리 안에 컴포넌트를 그리려면 그 사이를 잇는 무언가가 있어야 한다.

### 이벤트와 리듀서

`overlay.open`은 상태를 바꾸지 않는다. 이벤트를 하나 쏜다.

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

받는 쪽은 `OverlayProvider`다. Provider는 `useReducer`를 들고 있고, 이벤트를 구독해서 리듀서에 `ADD`를 넣는다. 여기서 주의해서 볼 것은 `isOpen`이 `false`로 들어간다는 점이다.

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

그리고 컨트롤러가 마운트된 다음 프레임에 `OPEN`을 넣어 `isOpen`을 `true`로 만든다.

```tsx
// packages/src/context/provider/content-overlay-controller.tsx
useEffect(() => {
  requestAnimationFrame(() => {
    overlayDispatch({ type: 'OPEN', overlayId });
  });
}, [overlayDispatch, overlayId]);
```

여기서 필자가 예상과 달랐던 부분이 있다.

**상태가 React 밖에 있지 않다.** 모듈 함수로 여는 API라서 스토어도 모듈 수준에 있을 줄 알았는데, 실제로는 Provider 안의 `useReducer`다. React 밖에 있는 것은 이벤트 버스뿐이고, 그것은 상태를 들지 않는다. 오버레이는 Provider의 `children` 옆에 형제로 렌더된다. `createPortal`을 쓰지 않고, `react-dom`을 import하지도 않는다.

한 가지 더 눈에 띄는 것이 있다. 호출부에서 보면 `overlay.open()` 한 줄인데, 그 안은 이벤트를 쏘고, 리듀서에 `ADD`를 넣고, 한 프레임 기다렸다가 `OPEN`을 다시 넣는 순서가 정해진 절차다. 선언적인 인터페이스가 명령형 코드를 없앤 것이 아니라 경계 안쪽으로 옮긴 것이다.

### 여는 쪽과 닫는 쪽

앞에서 본 `requestAnimationFrame`과, 그 앞 절에서 본 `close`와 `unmount`의 분리는 얼핏 별개로 보인다. 실제로는 같은 제약의 양쪽 끝을 각각 막는 장치다.

그 제약은 CSS 트랜지션이 **시작 상태와 끝 상태를 둘 다 실제로 렌더해야 돈다**는 것이다. [MDN의 CSS 트랜지션 문서](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions)가 DOM에 막 추가한 요소에 대해 이렇게 경고한다.

> This is treated as if the initial state had never occurred and the element was always in its final state.

여기서 실패가 두 모양으로 나온다. 열 때는 시작 상태가 없어서 안 돌고, 닫을 때는 끝 상태가 그려지기 전에 요소가 사라져서 안 돈다.

| | 여는 쪽 | 닫는 쪽 |
|---|---|---|
| 문제 | 시작 상태가 없다 | 끝 상태를 그리기 전에 사라진다 |
| 해법 | 닫힌 채로 먼저 마운트하고 다음 프레임에 연다 | 열린 채로 두고 `isOpen`만 끄고, 나중에 제거한다 |
| 장치 | `ADD(isOpen: false)`, rAF, `OPEN` | `CLOSE`, 애니메이션, `REMOVE` |
| 타이밍을 아는 쪽 | 라이브러리 | 사용자 |

닫는 쪽이 사용자 몫인 이유가 마지막 줄에 있다. 여는 쪽은 한 프레임이면 된다는 상수를 라이브러리가 안다. 닫는 쪽은 애니메이션이 200밀리초인지 400밀리초인지 라이브러리가 알 수 없다.

**그래서 한쪽은 자동이고 한쪽은 `unmount`라는 함수로 넘긴다.**

닫는 쪽이 성립하는 근거는 리듀서에 있다. `CLOSE`는 `overlayData`의 `isOpen`만 뒤집고 `overlayOrderList`는 건드리지 않는다. Provider가 그 목록을 순회해 렌더하므로, 목록에 남아 있는 동안 컴포넌트는 살아 있다. `REMOVE`가 목록에서 빼야 비로소 언마운트된다.

**다만 rAF가 항상 필요한 것은 아니다.** react-transition-group은 [기본적으로 첫 마운트에서 enter 트랜지션을 실행하지 않는다](https://reactcommunity.org/react-transition-group/transition). `in`이 이미 `true`여도 건너뛰고, `appear`를 켜야 한다. overlay-kit의 rAF는 `isOpen`을 마운트 이후에 `false`에서 `true`로 바꿔 주므로 이 경우를 덮는다.

### Promise로 감싸는 20줄

`openAsync`는 별도의 구현이 아니라 `open`을 감싼 얇은 층이다.

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

컨트롤러에 넘어가는 `close`를 바꿔치기하는 것이 전부다. 원래 `close`는 인자를 받지 않는데, 여기서는 인자를 받아 Promise를 resolve한 뒤에 원래 `close`를 부른다. 결과 타입이 호출부에서 정해지는 이유도 여기에 있다. `T`가 `close`의 인자 타입이자 Promise의 타입이다.

다만 이 구조에는 구멍이 하나 있다. resolve는 `close`가 불릴 때만 일어난다. 그래서 오버레이를 `unmount`로만 제거하면 Promise는 영원히 pending으로 남는다. [이슈 #169](https://github.com/toss/overlay-kit/issues/169)에 올라와 있고 해결이 필요하다고 생각하지만 아직 이슈가 오픈되어있다.

resolve 시점이 `close`라는 점은 또 다른 의미도 갖는다. 닫기 애니메이션이 끝난 시점이 아니라 닫기 시작하는 시점이다. 확인을 받고 API를 호출하는 흐름이라면 문제가 없지만, 확인을 받고 다음 모달을 여는 흐름이라면 앞 모달이 사라지는 동안 뒤 모달이 올라온다.

### 설계가 한 바퀴 돈 자리

설계 과정을 탐색해보기 위해 커밋 기록을 따라가 보았다. 그리고 이 구조가 처음부터 이랬던 것은 아니라는 것을 알게 되었다. 1.0은 지금과 같은 이벤트와 리듀서 조합이었다. 1.2.0에서 상태를 모듈 수준 외부 스토어로 옮기고 `useSyncExternalStore`로 읽게 바꿨다가, 1.8.0에서 다시 리듀서로 되돌렸다.

되돌린 이유는 [이슈 #148](https://github.com/toss/overlay-kit/issues/148)에 적혀 있다.

> `useSyncExternalStore` resolves tearing issues, but it doesn't work well with suspense.

오버레이 안에서 데이터를 가져오다 suspend하면 동기 입력에 응답하는 중에 컴포넌트가 suspend했다는 React 경고가 떴다. 외부 스토어로 옮긴 원래 목적은 훅 없이도 오버레이 상태를 읽게 하는 것이었는데, 의도대로 해결하지 못했다는 것이 당시 PR 본문에 적혀 있다. 결국 목적은 훅으로 해결됐고 저장 방식만 제자리로 왔다.

필자가 이 기록에서 얻은 것은 결론이 아니라 기준이다. 상태를 React 밖에 두면 호출 지점이 자유로워지는 대신 React의 스케줄링과 어긋날 여지가 생긴다. overlay-kit은 호출 지점만 밖에 두고 상태는 안에 뒀다.

## 같은 id로 다시 열었을 때

리듀서를 읽다가 걸린 부분이 있었다. `ADD`의 맨 앞에 이런 분기가 있다.

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

`overlayId`를 지정해 연 오버레이를 `close`한 뒤 같은 id로 다시 열면 이 분기를 탄다. 그런데 반환값이 **기존 `overlay` 객체**를 그대로 쓴다.

새로 들어온 `action.overlay`의 `controller`는 어디에도 쓰이지 않는다.

읽은 것만으로는 확신이 서지 않아 라이브러리 저장소를 받아 테스트를 직접 붙여 봤다. 서로 다른 내용을 그리는 컴포넌트 둘을 준비하고 같은 id로 순서대로 열었다.

```tsx
const ControllerA = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">AAA</div> : null);
const ControllerB = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">BBB</div> : null);

overlay.open(ControllerA, { overlayId: 'id-close' });
overlay.close('id-close');
overlay.open(ControllerB, { overlayId: 'id-close' });
```

결과는 이랬다. overlay-kit 1.9.0 시점의 main 브랜치에서 vitest로 돌렸다.

| 절차 | 렌더된 것 |
|---|---|
| A를 열고 `close` 후 B로 다시 열기 | `AAA`. B가 버려진다 |
| A를 열고 `unmount` 후 B로 다시 열기 | `BBB`. 정상 교체 |
| 카운터를 1 올리고 `close` 후 다시 열기 | `1`. 컴포넌트 상태가 유지된다 |

세 번째 줄은 문서가 기능으로 설명하는 동작이라 예상한 대로다. 문제는 첫 줄이다.

**`close`만 하고 같은 id로 다시 열면, 바뀐 내용을 담은 새 JSX가 무시되고 이전 화면이 그대로 뜬다.**

여기서 하나를 더 확인했다. 같은 리듀서의 뒷부분에는 이런 주석이 달려 있다.

```ts
/**
 * @description Brings the overlay to the front when reopened after closing without unmounting.
 */
overlayOrderList: [...state.overlayOrderList.filter((item) => item !== action.overlay.id), action.overlay.id],
```

닫았다가 다시 열면 맨 앞으로 가져온다는 설명이다. 그런데 앞의 분기가 먼저 `return`하기 때문에 이 줄은 그 상황에서 실행되지 않는다. 오버레이 둘을 겹쳐 열고 뒤에 깔린 쪽을 `close`한 뒤 다시 열어 봤더니, DOM 순서가 바뀌지 않고 그대로였다.

**주석이 설명하는 동작과 실제가 다르다.**

다만 이것이 화면에서 곧바로 문제로 보이는지는 확인하지 않았다. 테스트는 DOM 순서까지만 봤고, 대부분의 다이얼로그 라이브러리가 자체 z-index나 포털을 쓰므로 DOM 순서가 곧 시각적 순서는 아니다.

필자가 만든 쪽은 같은 상황을 옵션으로 노출한다. 같은 종류의 모달을 다시 열 때 기존 것을 유지할지 새 props로 교체할지 호출부가 고른다. 교체를 고르면 기존 Promise는 `replaced`로 종료된다. 앞에서 결과 타입을 다섯 갈래로 나눈 이유 중 하나가 이것이다.

**여기서 두 설계의 차이가 드러난다.** 필자의 방식은 모달을 데이터로 다룬다. 문자열 key와 props가 스토어에 있으니 나중에 교체하거나 갱신할 수 있다. overlay-kit은 모달을 함수로 다룬다. 컨트롤러가 클로저라 한 번 저장되면 바깥에서 그 내용을 바꿀 방법이 없다.

## 호출부 JSX의 대가

그러면 호출부에 JSX를 쓰는 방식은 문자열 key 방식보다 언제나 나은가. 필자는 그렇지 않다고 생각한다. 치르는 값이 셋 있다.

**코드 분할이 기본값에서 빠진다.** 호출부가 JSX를 쓴다는 것은 호출부가 그 컴포넌트를 import한다는 뜻이다. 모달이 무거운 편집 화면이고 그 버튼을 누르는 사용자가 소수라면, 그 무게가 목록 화면의 번들에 들어간다.

컨트롤러 안에서 `React.lazy`가 동작한다. 앞의 테스트와 같은 방식으로 재 봤더니 `open` 전에는 모듈이 로드되지 않았고, 열었을 때 `Suspense` fallback이 먼저 뜬 뒤 본문이 렌더됐다.

```tsx
const Heavy = React.lazy(() => import('./HeavyModal'));

overlay.open(({ isOpen, close }) => isOpen ? (
  <Suspense fallback={<Spinner />}><Heavy onClose={close} /></Suspense>
) : null);
```

그러니 차이는 가능 여부가 아니라 기본값이다.

필자가 만든 쪽은 registry 파일의 값이 전부 `import()` 함수라 코드 분할이 구조상 강제된다. overlay-kit은 호출부마다 손으로 써야한다.

**`unmount`를 부르는 자리를 사용자가 정해야 한다.** `close`만 부르고 끝내면 오버레이 정보가 메모리에 남는다. 공식 문서도 이 점을 경고하면서, 디자인 시스템마다 어디에 `unmount`를 걸어야 하는지를 따로 안내한다. MUI와 Mantine은 전환이 끝나는 콜백이 있어서 거기에 걸면 되지만, 그런 콜백이 없는 라이브러리에서는 애니메이션 길이만큼 타이머를 두라고 안내한다. 안내 문서가 라이브러리별로 나뉘어 있다는 사실 자체가 이 결정의 비용이다.

**오버레이가 Provider 자리에서 렌더된다.** 포털을 쓰지 않기 때문에 React Native에서도 같은 코드가 도는 이점이 있다. 반대로 `OverlayProvider` 아래에서 제공한 컨텍스트는 오버레이 안에서 보이지 않는다. 라우터나 폼 컨텍스트에 기대는 모달을 열 때 이 지점을 먼저 확인해야 한다.

## 선언적이라는 말의 범위

여기까지 쓰고 나니 한 가지가 걸린다. 필자는 이 인터페이스를 선언적이라고 부르며 글을 시작했는데, `overlay.openAsync(...)`는 어느 모로 보나 함수 호출이다.

정의부터 놓고 보자. [React 공식 문서](https://react.dev/learn/reacting-to-input-with-state)는 두 가지를 이렇게 가른다.

> In React, you don't directly manipulate the UI--meaning you don't enable, disable, show, or hide components directly. Instead, you **declare what you want to show,** and React figures out how to update the UI.

같은 문서가 드는 비유가 더 선명하다. 명령형은 차에 탄 사람에게 길을 하나하나 불러 주는 것이고, 선언적인 쪽은 택시에 타서 목적지만 말하는 것이다.

**선언적인 인터페이스는 명령형 절차를 없애는 것이 아니라 경계 반대편으로 옮기고 그 경계에 이름을 붙이는 것이다.** 앞에서 본 overlay-kit의 내부가 정확히 그렇다. 호출부는 한 줄인데 안에서는 이벤트를 쏘고 두 번 dispatch하는 절차가 돈다.

그러면 각 프로젝트가 이 단어를 어디에 쓰는지 보자. overlay-kit의 문서는 기존 방식을 명령형이라고 부른다. 그때 가리키는 것은 `useState`로 열림 여부를 들고 이벤트 핸들러에서 그 값을 뒤집는 코드다. 반대로 선언적이라고 부르는 것은 오버레이를 상태가 아니라 동작으로 다루는 쪽이다. 토스 기술 블로그의 [선언적인 코드에 대한 글](https://toss.tech/article/frontend-declarative-code)은 이 단어를 더 넓게 정의한다. 선언적인 코드란 추상화 레벨이 높아진 코드이고, 오버레이를 띄우는 동작을 추상화한 훅이 그 예라는 것이다.


그래서 필자는 이 단어를 이렇게 좁혀 쓰기로 했다. **호출부가 닫는 코드를 쓰지 않는 것.** 언제 닫을지, 닫히는 동안 무엇이 남아 있을지는 오버레이 쪽이 정하고, 호출부는 무엇을 띄울지와 결과로 무엇을 받을지만 적는다.

이 기준으로 보면 `useState`로 `isOpen`을 들고 있는 코드와 전역 스토어에 열린 목록을 두고 호출부가 닫는 코드는 같은 편에 있다. 저장 위치만 다를 뿐 닫는 문장을 호출부가 쓴다는 점은 같기 때문이다.

## 마치며

필자가 회사 코드에서 고친 것은 결국 저장 위치가 아니었다. 닫는 코드를 누가 쓰는가였다.

전역 스토어를 쓰던 시절에도 상태는 이미 컴포넌트 밖에 있었지만, 열고 닫는 문장은 여전히 호출부에 있었다. `await` 한 줄로 바꾼 뒤에야 그 문장이 모달 안으로 들어갔다.

overlay-kit은 같은 자리에 도달한 뒤 한 걸음을 더 갔다. 무엇을 띄울지까지 호출부에 적게 한 것이다. 필자는 그 인터페이스가 읽기에 좋다고 생각한다. 그리고 쓰는 동안 그 한 걸음의 값이 무엇인지도 알게 됐다.

**모달을 함수로 다룰지 데이터로 다룰지의 차이였다.** 호출부에 JSX를 쓰면 컨트롤러가 클로저가 되고, 클로저는 한 번 저장되면 바깥에서 내용을 바꿀 수 없다. 같은 id로 다시 열었을 때 새 JSX가 무시되는 것이 그 구조에서 나온다. 문자열 key로 다루면 모달이 스토어에 담긴 값이 되어 교체하고 갱신하고 코드 분할할 수 있지만, 호출부는 이름만 알게 된다.

라이브러리를 고를 때 인터페이스가 마음에 든다는 감각은 꽤 믿을 만한 신호라고 생각한다. 다만 그 감각이 정확히 무엇을 가리키는지 한 번은 말로 옮겨 봐야 한다. 옮겨 보지 않으면 마음에 든 것이 인터페이스인지 그 라이브러리를 쓰는 사람들의 평판인지 구분되지 않는다. 이 글을 읽는 독자 분들도 지금 쓰고 있는 라이브러리에 대해 한 번쯤 그 작업을 해보기를 권한다.

:::ref
[docs] [overlay-kit 공식 문서](https://overlay-kit.slash.page/)
[repo] [desko27/react-call](https://github.com/desko27/react-call)
:::
