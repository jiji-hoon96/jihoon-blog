---
emoji: 🙋🏻‍♂️
title: 'Hi zustand'
date: '2024-02-20'
categories: Front-end
---

![1.jpeg](1.jpeg)

&nbsp;

## 난 왜 zustand 공부를 시작했을까?

&nbsp;

### 회사에서

```typescript
const tabOneRef = React.useRef<ITabOneRef>(null);
const rmTimerRef = React.useRef<ITimerRef>(null);
const cmTimerRef = React.useRef<ITimerRef>(null);
const printRef = React.useRef<HTMLDivElement>(null);
const sessionOutAlertRef = useRef<IAlertRef>(null);
const isRMLogAdded = useRef<boolean>(false);
const timeLogId = useRef<string>(uuidv4());
const [memoList, setMemoList] = useState([] as any);
const [handleSave, setHandleSave] = useState<boolean>(false);
const [claim, setClaim] = useState([] as any);
const [pageStatus, setPageStatus] = useState(false);
const [rmTimeLogs, setRmTimeLogs] = useState<any>();
const [cmTimeLogs, setCmTimeLogs] = useState<any>();
const [totalRMTime, setTotalRMTime] = useState(0);
const [totalCMTime, setTotalCMTime] = useState(0);
const [nextURL, setNextURL] = useState([] as any);
const [measureList, setMeasureList] = useState([] as any);
const [rmInfo, setRmInfo] = useState<RpmInformation>();
```

위처럼 회사에서 useState, useEffect, useRef 등 Hook을 하나의 컴포넌트에서 남발해서 사용하고 있다는 것을 알게 되었다. **(위 사진은 극히 일부의 코드를 수정해서 보여준란걸..😂)**

그렇게 되니 컴포넌트 내부의 요소를 변경하거나, 렌더링이 일어날 때 state, ref의 동적인 값들이 초기화되거나 생각하지 못한 데로 작동하게 되어버리게 되었다.

거기에 새로운 기능 개발을 하게 되었을 때 많은 요소 영향력을 생각해야 되게 되고, useEffect의 의존성 배열이 무한히 추가되는 현실까지 직면하게 되었다. ㅠㅠ

이런 상황까지 되어버리니 회사 내부에서는 프로젝트에 상태관리를 도입해서 렌더링이 발생하는 시점, 변수의 선언, 전역 변수의 props 전달 등 많은 것들을 효율적으로 관리 할 수 있다고 판단해 상태를 중앙에서 변수를 관리하자는 이야기가 나왔다.

이런 회의를 거쳐서 여러 가지 상태관리 라이브러리가 후보군에 올라오게 되었다.

![3.png](3.png)

> recoil, redux, zustand, jotai 등등..

&nbsp;

### Top-Bottom vs Bottom-Top

![4.jpeg](4.jpeg)

> Top-bottom 방식 : 단일 중앙 스토어를 사용하여 모든 컴포넌트의 상태를 관리
>
> Bottom-top 방식 : 각 컴포넌트가 자체 상태를 관리하고 컴포넌트는 자식 컴포넌트에 상태를 전달하고 필요에 따라 상태를 업데이트

회사에서 추구하는 상태관리 방식은 **top-bottom** 이였다. 선택한 이유는 아래와 같다 👇

- 중앙 스토어를 통해 데이터 흐름을 추적을 용이
- 모든 컴포넌트는 중앙 스토어에 동일한 데이터에 접근하기 때문에 데이터 불일치 문제 해결 가능
- 여러 컴포넌트에서 재사용하기 쉬움
- 코드의 모듈화와 유지 관리를 용이
- 중앙 스토어를 이용해 확장, 병렬이 가능
- Redux 와 같은 라이브러리는 강력한 개발자 도구가 있어서 상태 변경 추적, 디버깅에 효율적

top-bottom을 선택하는데 반대의 의견도 있었다. 러닝 커브가 높고 구조가 상당히 복잡할 수도 있다. 또한 많은 양의 보일러 플레이트 코드를 작성해야 되고 유연성이 부족할 수 있다.

**하지만 이미 구조화된 프로젝트에 중앙 스토어적인 라이브를 선택하는 것이 더 효율적이라고 판단해 top-bottom 구조를 선택하게 되었다**

~~대부분 사람이 상태관리 라이브러리를 사용해봐서 러닝 커브는 문제가 되지않는다는 판단을..~~

그러므로 Bottom-Top 구조인 recoil 이랑 jotai는 탈락

&nbsp;

### redux 와 zustand 중 선택 과정

redux 와 zustand 를 가지고 아래와 같이 토론하게 되었다. Top-Bottom 라이브러리에서는 어떤 것을 고르면 좋을까?

먼저 기준표를 작성하고 그것에 대해 점수를 부여하게 되었는데 대략 아래와 같다 👇

- 러닝 커브가 있어도 되지만 도입이 시급하다 => redux의 러닝 커브는 높은 편이라서 **zustand 선택**
- 보일러 플레이트 성향이 낮아야 된다. => redux에서 보일러 플레이트 성향이 높은 편이라서 유연성 떨어진다고 판단해서 **zustand 선택**
- 구조적으로 컴포넌트에서 상태를 관리하는 성향의 라이브러리 찾아야 된다. => **zustand 선택**
- 사용자가 많고 github release가 잘 이루어져야 된다. => 사용자의 수와 Npm trends에서 높은 점수를 받는 Redux 이지만 선점효과라 판단해서 **zustand 선택**
- 렌더링을 관리하고 줄일 수 있어야 한다. => 판단 기준에 미흡, 별 차이 없음

결과는 **zustand** 을 선택하기로 결정

&nbsp;

## zustand 그래서 넌 누군데??

[공식 홈페이지](https://zustand-demo.pmnd.rs/) / [Github](https://github.com/pmndrs/zustand?tab=readme-ov-file) / [Npm](https://www.npmjs.com/package/zustand)

- 간결한 플럭스(Flux) 원칙을 바탕으로 작고 빠르게 확장 가능한 상태 관리 라이브러리
- 특정 라이브러리에 종속되어 만들어진 도구가 아니여서 Vanilla Javascript 에서도 사용 가능
- zustand는 발행/구독 모델을 기반으로 만들어졌다. 스토어의 상태 변경이 일어날 때 실행할 리스너 함수를 모아 두었다가, 상태가 변경되었을 때 등록된 리스너에게 상태가 변경되었다고 알려준다.
- 스토어를 생성하는 함수 호출 시 클로저를 사용해서 상태를 변경, 구독, 조회하는 인터페이스를 통해서만 상태를 다루고, 실제 상태는 생명 주기에 따라 처음부터 끝까지 의도하지 않는 변경에 대해 막을 수 있다.
- 보일러 플레이트가 최소화된 상태관리 solution. 스토어 형태임에도 굉장히 간단하게 상태관리 구성이 가능하다.
- 익히기가 굉장히 쉽고 그만큼 공식문서 정리도 잘 되어 있다.

<hr/>

> <h3>💡 더 알아보자!</h3>  
> <h4>Provider로 감쌀 필요가 없는 이유</h4 >
>
> 각 컴포넌트가 자체 상태를 캡슐화하도록 설계되어있음.
>
> 트리 구조를 기반으로 상태를 관리하기 때문
>
> useSelector hook을 제공하여 컴포넌트가 필요한 상태만 선택적으로 구독할 수 있도록 하기 때문
>
> <h4 >zustand가 context 보다 리렌더링이 줄어드는 이유</h4 >
>
> zustand는 컴포넌트가 구독한 상태가 변경되었는지 자동으로 감지
>
> memoization을 사용해 컴포넌트가 리렌더링될 때마다 컴포넌트 재실행을 방지
>
> shallowEqual 비교를 사용해 상태 변경이 실제로 발생했는지 여부를 확인
>
> 결과적으로 50%이상의 리렌더링을 줄이게 되었고, 페이지 로딩 속도 20% 향상, 사용자 인터페이스 반응 속도 향상에 10%를 기여하게 될 수 있다.

&nbsp;

## 어떻게 쓰는지 알아보자!!

## 그래서 6개월 정도 써본 소감은??

좋다! 왜좋냐? 했을때 새로 FE가 왔다. recoil을 사용한사람이 러닝커브 짧다.
중앙 집중적이여서 관리하기 좋다.
유연하다 우리가 원하는데로 state 를 변경할 수 있다.
각 상태끼리 접근하기도 쉽다.

&nbsp;

> <h4>출처</h4>
>
> https://github.com/pmndrs/zustand

```toc

```
