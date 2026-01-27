---
title: 'Import (정적) vs Dynamic Import (동적)'
date: '2024-07-11'
categories: 소박한궁금증
---

![1.png](1.png)

<br>

React와 JavaScript를 사용하는 개발자에게 있어서 import와 dynamic import는 각각 고유한 용도와 특징을 가지고 있다. 그럼 이 두가지는 어떤 차이점이 있을까?

<br>

### Import

import는 JavaScript ES6에서 도입된 정적(Static) 모듈 가져오기 방식이다. 코드 작성 시, 모듈을 상단에 명시적으로 선언하고, 모듈을 로드한다.

```javascript
import React from 'react';
import MyComponent from './MyComponent';
```

```javascript
import React, { useState } from 'react';
import MyComponent from './MyComponent';

const App = () => {
  return (
    <div>
      <MyComponent />
    </div>
  );
};

export default App;
```

Import는 아래 3가지의 특징을 가진다.

- **정적 로드**: 컴파일 시점에 모든 의존성이 결정되고 로드되어, 빌드 도구가 전체 모듈 그래프를 미리 알 수 있게 해준다.
- **호이스팅(Hoisting)**: import 문은 파일의 최상단으로 끌어올려진다.
- **트리 쉐이킹(Tree Shaking)**: 불필요한 코드(사용되지 않는 모듈)를 제거하여 최종 번들 크기를 줄일 수 있다.

<br>

### Dynamic Import

dynamic import는 ES2020에서 도입된 동적(Dynamic) 모듈 가져오기 방식이다. 이는 함수처럼 호출하여 필요할 때 모듈을 가져오는 방식이다

```javascript
const loadMyComponent = async () => {
  const { default: MyComponent } = await import('./MyComponent');
};
```

```javascript
import React, { useState, useEffect } from 'react';

const App = () => {
  const [MyComponent, setMyComponent] = useState(null);

  useEffect(() => {
    const loadComponent = async () => {
      const { default: loadedComponent } = await import('./MyComponent');
      setMyComponent(() => loadedComponent);
    };

    loadComponent();
  }, []);

  return <div>{MyComponent ? <MyComponent /> : <div>Loading...</div>}</div>;
};

export default App;
```

Dynamic Import는 아래 3가지의 특징을 가진다.

- **동적 로드**: 모듈이 필요할 때 런타임에 로드되어, 특정 상황(ex : 사용자 인터랙션)에 따라 모듈을 로드할 수 있다.
- **비동기 처리**: import()는 프로미스를 반환하므로 async/await와 함께 사용하거나 .then을 사용하여 처리할 수 있다.
- **코드 스플리팅(Code Splitting)**: 초기 로딩 시간을 줄이기 위해 필요한 모듈을 나중에 로드하는 방식으로, 애플리케이션의 성능을 향상시킬 수 있다.

<br>

### 결론

**정적 import는** 빌드 시 모든 의존성을 미리 로드하고, 파일 크기를 최적화하는 특징을 가지고 있고, **동적 import는** 런타임에 모듈을 비동기로 로드하여 초기 로딩 시간을 줄이고, 필요할 때만 로드할 수 있다.

이 두 가지 방법을 적절히 사용하면 애플리케이션의 성능과 유지보수성을 향상시킬 수 있다!

사내에서는 Lazy Loading을 위해서 Dynamic Import를 적극 활용하고있다. 이로써 렌더링 시 불필요한 모듈을 로드하지 않기때문에 초기 로딩 시간이 감소한다. 또한 애플리케이션의 코드를 여러 번들로 나누어 필요한 시점에 로드하기 때문에 불필요한 리소스 로드 방지도 되었다.**(코드 스플리팅)**

```toc

```
