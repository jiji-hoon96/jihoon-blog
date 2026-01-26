---
emoji: 🆚
title: 'Ecmascript에서 Modules랑 CommonJs를 비교해보자!'
date: '2023-09-28'
categories: 소박한궁금증 자바스크립트
---

모듈은 현대 소프트웨어 개발에서 코드의 재사용성과 유지보수를 높이기 위해 필수적인 요소다. 그리고 자바스크립트에는 CommonJS와 ES 모듈이 있다. 두개가 어떤 차이가 있는지 비교해보자!

<br>

### CommonJS

- Node.js의 기본 모듈 시스템으로 CommonJs를 사용한다.
- `require`를 사용하여 모듈을 로드하고 `module.exports`를 사용하여 변수와 함수를 내보낸다.

  ```javascript
  module.exports.add = function (a, b) {
    return a + b;
  };

  module.exports.subtract = function (a, b) {
    return a - b;
  };

  const { add, subtract } = require('./util');
  console.log(add(5, 5));
  console.log(subtract(10, 5));
  ```

- **동기적 로딩**: 모듈을 하나씩 순차적으로 로드하고 처리하므로 성능에 민감한 애플리케이션에서 블로킹이 발생할 수 있다.
- **유연성**: `require`는 코드의 어디서나 호출할 수 있어 조건부 또는 동적으로 모듈을 로드할 수 있다.

<br>

### ES 모듈

- **표준화된 포맷**: ES 모듈은 자바스크립트 코드 재사용을 위한 공식 표준
- **문법**: `import`와 `export` 문을 사용

  ```javascript
  export function add(a, b) {
    return a + b;
  }

  export function subtract(a, b) {
    return a - b;
  }

  import { add, subtract } from './util.mjs';
  console.log(add(5, 5));
  console.log(subtract(10, 5));
  ```

- **비동기적 로딩**: 모듈을 비동기적으로 로드하여 고성능 웹 애플리케이션의 성능을 향상시킬 수 있다.
- **네이티브 브라우저 지원**: 모든 최신 웹 브라우저에서 지원하여 서버와 클라이언트 환경 간에 코드를 쉽게 공유할 수 있다.
- **파일 확장자**: 일반적으로 `.mjs` 확장자를 사용하거나 `package.json` 파일에 `"type": "module"`을 설정하여 `.js` 파일을 ES 모듈로 취급

<br>

### 자바스크립트 모듈의 진화

1. **IIFE (즉시 실행 함수 표현)**: 전역 스코프 오염 방지와 코드 캡슐화를 위해 사용
2. **모듈 패턴**: 모듈의 공용 및 개인 구성 요소를 분리하여 더 명확한 구조를 제공했지만, 종속성 관리를 위한 표준 방법이 없다.
3. **CommonJS**: 서버 측 개발을 위해 동기적 로딩을 도입
4. **AMD (Asynchronous Module Definition)**: 브라우저 환경에서 비동기 로딩을 중점적으로 개선했
5. **UMD (Universal Module Definition)**: 서버와 브라우저 환경 모두에서 작동하도록 설계
6. **ES 모듈**: 클라이언트와 서버 환경 모두에서 네이티브 지원을 제공하며 명확한 문법과 비동기 로딩을 제공

<br>

### Node.js와 ES 모듈

- **지원 버전**: Node.js는 버전 13.2.0부터 ES 모듈을 안정적으로 지원
- **호환성**: 이전 버전의 Node.js(v9 이하)에서는 ES 모듈을 네이티브로 지원하지 않는다.
- **듀얼 모드 라이브러리**: `package.json`의 조건부 exports를 사용하여 CommonJS와 ES 모듈 모두를 지원하도록 할 수 있다.
  ```json
  {
    "name": "my-library",
    "exports": {
      ".": {
        "browser": {
          "default": "./lib/browser-module.js"
        }
      },
      "module-a": {
        "import": "./lib/module-a.mjs",
        "require": "./lib/module-a.js"
      }
    }
  }
  ```

<br>

### 정리

- **CommonJS**
  - **장점**: `require`의 유연성, 쉬운 동기적 코드 작성.
  - **단점**: 동기적 로딩으로 인해 성능 문제 발생 가능.
- **ES 모듈**
  - **장점**: 비동기적 로딩, 브라우저에서 네이티브 지원, 표준화된 문법.
  - **단점**: Node.js v13.2.0 이상에서만 지원, 기존 코드베이스와의 호환성 문제.

<br>
