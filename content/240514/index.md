---
emoji: 🤙
title: '자바스크립트 Promise를 퀴즈로 쉽게 익히기 with 예제 코드'
date: '2024-05-14'
categories: 소박한궁금증 자바스크립트
---

![1.jpeg](1.jpeg)

<br>

## Promise에 대해서 공부해보자

나는 개인적으로 프론트엔드의 꽃은 Promise와 비동기라고 생각한다. 백엔드를 공부하는 친구들이 가장 어려워하는 부분이기도 하고, 나의 러닝 커브가 가장 길었기 때문이다!

어차피 해당하는 내용은 공부를 미리 진행한 적 있어서 블로그 링크를 첨부하고 퀴즈를 통해 작동에 방법을 익히고, 활용해볼 예정이다!!

> Promise를 이해하기 위한 선행학습자료는 **[여기에](https://hooninedev.com/230816/)** 첨부하니 확인해보시길 권장드립니다.

<br>

### Promise.all()

```javascript
(async () => {
  await Promise.all([]).then(
    (value) => {
      console.log(value);
    },
    (error) => {
      console.log(error);
    },
  );

  await Promise.all([1, 2, Promise.resolve(3), Promise.resolve(4)]).then(
    (value) => {
      console.log(value);
    },
    (error) => {
      console.log(error);
    },
  );

  await Promise.all([1, 2, Promise.resolve(3), Promise.reject('error')]).then(
    (value) => {
      console.log(value);
    },
    (error) => {
      console.log(error);
    },
  );
})();

// 결과값

// []
// [1,2,3,4]
// "error"
```

위 코드의 결과값에서 3번째 Promise.all()에서 1,2,3이 출력되지 않고 error만 출력된 이유는 **Promise.all()에서 입력 값으로 들어온 프로미스 중 하나라도 거부당하면 즉시 거부하기 때문이다.**

Promise.all()의 개념이 더 궁금하면 **[MDN 자료를](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)** 확인해보시면 됩니다. ✔️

<br>

### Promise Order

```javascript
console.log(1);

setTimeout(() => {
  console.log(2);
}, 10);

setTimeout(() => {
  console.log(3);
}, 0);

new Promise((_, reject) => {
  console.log(4);
  reject(5);
  console.log(6);
})
  .then(() => console.log(7))
  .catch(() => console.log(8))
  .then(() => console.log(9))
  .catch(() => console.log(10))
  .then(() => console.log(11))
  .then(console.log)
  .finally(() => console.log(12));

console.log(13);

// 결과값

// 1
// 4
// 6
// 13
// 8
// 9
// 11
// undefined
// 12
// 3
// 2
```

위 코드는 어떤 순서로 값이 출력될까?

우선 동기식 코드(synchronous code) 1이 출력되고나서 3,2가 태크로테스크 대기열에 들어가는데 3이 2보다 지연값이 적기 때문에 먼저 들어간다.

4,6은 Promise 내부에서 출력되고, Promise는 마이크로테스크 대기열에 들어가고 13이 동기식 코드로 출력된다.

이렇게 되면 콜 스택은 비어있다. **우선순위가 먼저인 마이크로테스크 대기열의 프로미스가 먼저 실행되고,** reject 상태이기 떄문에 catch로 넘어가게 되고 8이 출력된다.

오류가 발생하지 않기 때문에 프로미스 체인으로 인해 9, 11 그리고 undefined가 실행되고 12가 출력이 된다.

마지막으로 큐에 대기 중인 setTimeouts이 실행되어 3과 2가 출력된다.

위 코드를 실행해보니 우선순위는 **동기식 코드(synchronous code) > 마이크로 테스크 => 매크로 테스크** 순서대로 실행되는 것을 확인해 볼 수 있다.

<br>

### Promise.prototype.finally()

```javascript
Promise.resolve(1)
  .finally((data) => {
    console.log(data);
    return Promise.reject('error');
  })
  .catch((error) => {
    console.log(error);
    throw 'error2';
  })
  .finally((data) => {
    console.log(data);
    return Promise.resolve(2).then(console.log);
  })
  .then(console.log)
  .catch(console.log);

// 결과값

// undefined;
// error;
// undefined;
// 2;
// error2;
```

우선 Promise의 finally에 대해서 알아보면, **finally의 특징에는 fulfilled 또는 rejected 되든 상관없이 항상 실행되는 콜백 함수를 지정할 수** 있게 해준다. 그리고 **인자를 받지 않고 이전 상태를 유지해준다.**

위 내용을 알고 코드의 실행 과정을 살펴보자

처음에 Promise.resolve(1)이 호출되면서 즉시 이행된 Promise가 생성된다. 그리고 **finally 블록이 Promise의 최종 상태와 관계없이 실행된다.** 하지만 finally는 인자를 받지 않기 때문에 data는 undefined가 출력된다.

finally 블록에서 Promise.reject('error')를 반환하여, 체인은 거부된 상태가 된다.

catch 블록은 거부된 Promise를 처리하는데, 여기서 error는 'error'가 되어 출력되고, catch 블록에서 'error2'를 던지는데, 이로 인해 이후의 체인은 다시 거부된 상태가 된다.

그리고 finally 블록도 실행되지만, 인자를 받지 않기 때문에 data는 undefined가 출력된다. 그 이후 finally 블록에서 Promise.resolve(2).then(console.log)를 반환하여 2라는 값을 가지게 된다.

Promise.resolve(2)는 이행된 Promise를 반환하며, then 블록에서 console.log를 호출하여 2를 출력한다. 두 번째 finally 블록은 여전히 'error2'로 인해 거부된 상태로 catch가 실행되어 'error2' 인자를 받아 error2가 출력된다.

<br>

### Promise then callbacks

```javascript
Promise.resolve(1)
  .then(() => 2)
  .then(3)
  .then((value) => value * 3)
  .then(Promise.resolve(4))
  .then(console.log);

// 결과값

// 6
```

위 코드는 어떻게 작동하는지 알아보기 전에 **then 메서드에 전달되는 인자는 함수여야 한다.** 함수가 아닌 값은 무시가 되고 이전 값이 그대로 전달된다. 그리고 **Promise.resolve로** 생성된 Promise를 then에 전달하면 **체인에 영향을 주지 않고 무시**된다는 것을 알고 코드를 실행해보자!

Promise.resolve(1)은 즉시 이행된 Promise를 생성하며, 그 값은 1이 된다.

.then(()=>2)에서 이전 값 1을 사용하지 않고, 대신 2를 반환한다.

.then(3)에서 then은 함수여야 하는데, 3은 함수가 아니므로 이 단계는 무시되어 이전 값 2가 그대로 전달된다.

then((value) => value _ 3)에서 이전 값 2를 받아서 2 _ 3 = 6을 반환하여 6이 된다.

then(Promise.resolve(4))에서 then은 함수여야 하는데, Promise.resolve(4)는 함수가 아니므로 즉시 이행된 Promise가 반환되어 이전 값 6만 전달되고 6이 출력된다.

<br>

## 여러분들은 어떻게 쓰고 계신가요!?

우선 저는 사내에서 Promise를 직접적으로 구현해서 쓰지 않습니다. 왜? 라는 생각을 해보았는데 한줄로 설명하면 **더 높은 수준에서 추상화한 라이브러리나 기능들을 사용하고 있기 때문이라** 생각합니다.

Client에서 데이터 페칭을 위해서 React-Query를 사용하고, 비동기 코드 작성할 때 복잡성과 가독성을 위해 Promise 대신 async/await 문법을 더 많이 사용합니다.

전역에서 상태관리 할 때에는 Context API를 사용하거나 상태관리 라이브러리를 사용하고 있습니다. 이런 이유 때문에 직접적으로 Promise를 다루지는 않네요.

올해 1월에 아이슬란드 여행 가기 전에 신입분들이 입사할 것 같다는 말을 듣고, Promise 관련한 재사용 코드를 만들어서 전달해야겠다고 생각했습니다. 여러가지 조건들을 찾아본 결과 아래와 같이 네트워크 오류가 발생하여 데이터를 제대로 호출하지 않았을 때 자동 재 호출하는 **FetchAutoRetry 코드를 작성해서** Promise의 개념을 설명해주곤 합니다.

```typescript
async function fetchAutoRetry<T>(
  fetcher: () => Promise<T>,
  maximumRetryCount: number,
  delay: number = 1000,
): Promise<T> {
  try {
    return await fetcher();
  } catch (e) {
    if (maximumRetryCount <= 0) {
      throw e;
    } else {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchAutoRetry(fetcher, maximumRetryCount - 1, delay);
    }
  }
}
```

> 현재에는 React-Query를 사용하기에 위 코드를 사용하지는 않지만, 좋은 예시가 된다고 생각합니다!

이번에 Promise를 공부하면서, Promise가 어떻게 어떠한 원리로 만들어졌는지 궁금해서 MDN 사이트를 참조했습니다. 만들어진 Promise에 대해 구경을 할 수 있지만 구현 방법에 대해서 많이 궁금해졌습니다.

그러다가 Promise 동작을 하나하나 구현해보면서 실습할 예시 코드를 확인하게 되어서 주말에 진행해보려 합니다. 해당하는 작업은 Class 내부에 Promise를 구현하는 방법인데 최대한으로 작업해보고 공유하도록 하겠습니다.

다른 분들도 해보실 수 있도록 **[링크 전달해드리니](https://youtu.be/1l4wHWQCCIc)** 시간 되실 때 해보시면 좋을 것 같습니다!

<br>

```toc

```
