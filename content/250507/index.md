---
emoji: 🧪
title: 'Vite의 transformRequest()'
date: '2025-05-07'
categories: 프론트엔드
---

Vite를 사용하다 보면, 개발 서버에서 모듈이 실시간으로 빠르게 갱신되는 경험을 하게 된다.  
이 과정의 핵심에 있는 함수가 바로 `transformRequest()`다.

이번 글에서는 Vite 개발 서버 내부에서 이 함수가 어떤 역할을 하는지, 어떤 순서로 동작하는지, 그리고 실제 사용하면서 주의할 점은 무엇인지까지 정리해본다.

---

## TransformRequest란?

Vite의 개발 서버는 브라우저로부터의 HTTP 요청을 인터셉트하여, 요청된 모듈을 즉석에서 변환(transform) 후 제공한다. 이 핵심 과정을 담당하는 내부 함수가 바로 `transformRequest(url, serverContext)`이다. 이 함수는 Vite의 플러그인 시스템과 깊이 연관되어 있으며, 다음과 같은 정교한 파이프라인을 통해 동작한다.

---

### 1. 모듈 식별 및 로딩 (Module Identification & Loading)
- 요청된 url을 기준으로 Vite의 모듈 해석 로직 (Module Resolution)을 통해 실제 파일 시스템 경로 또는 가상 모듈 ID를 확정한다.
- 확정된 ID를 사용하여 load 훅을 호출하는 플러그인을 통해 모듈의 원본 코드를 로드한다. 기본적으로는 파일 시스템에서 직접 파일을 읽어오지만, 플러그인을 통해 커스텀 로딩 로직을 구현할 수 있다.

---

### 2. 플러그인 기반 코드 변환 (Plugin-driven Code Transformation)
- 로드된 코드는 Vite에 등록된 플러그인들의 transform 훅 체인을 통과한다. 각 플러그인은 transform(code, id, options) 훅을 통해 코드를 분석하고 수정할 기회를 갖는다.
- 이 과정에서 Babel, PostCSS, SASS/LESS 전처리기 등 다양한 변환 작업이 순차적으로 적용될 수 있다. 플러그인은 코드 문자열뿐만 아니라 AST(Abstract Syntax Tree) 레벨에서의 조작도 수행할 수 있으며, 소스맵(source map) 생성 및 관리를 지원한다.
- Vite는 이 과정에서 모듈 간의 의존성을 파악하여 모듈 그래프(Module Graph)를 구축하고, HMR(Hot Module Replacement)을 위한 데이터를 수집한다.

---

### 3. 내장 변환기 적용 (Built-in Transformers Application)
- 플러그인 변환 이후, 필요한 경우 Vite의 내장 변환기가 동작한다. 대표적으로 esbuild가 사용되어 TypeScript, JSX, TSX 파일을 매우 빠른 속도로 순수 JavaScript로 트랜스파일한다.
- .css 파일의 경우, PostCSS 처리 및 CSS Modules, HMR을 위한 래핑(wrapping) 등이 이루어진다.
- .vue 또는 .svelte 같은 SFC(Single File Component)는 해당 플러그인의 transform 훅에서 이미 처리되었을 가능성이 높지만, 이 단계에서 추가적인 Vite 내부 처리가 적용될 수 있다.

---

### 4. 결과 집계 및 반환 (Result Aggregation & Return)
- 모든 변환 과정을 거친 최종 코드(result.code)와 함께, 디버깅을 위한 소스맵(result.map), 그리고 플러그인들이 전달한 추가 메타데이터(result.meta)를 포함하는 객체를 반환한다.
- 이 결과는 HTTP 응답으로 브라우저에 전달되거나, 서버 사이드 렌더링(SSR) 시에는 서버 측 실행 환경에서 사용된다.


그러면 아래 예시 코드를 활용해 Vite 개발 서버 환경에서 특정 모듈의 변환 결과를 확인해보자.

```ts
const result = await server.transformRequest('/src/main.ts', {
  html: server.config.root + '/index.html'
});

if (result) {
  console.log(result.code);
}
```

**server**는 현재 실행 중인 ViteDevServer의 인스턴스를 가리킨다. 이 객체는 Vite 개발 서버의 다양한 기능과 설정에 접근할 수 있는 진입점 역할을 한다.

**server.transformRequest(url, options)** 에서 url은 변환을 요청할 모듈의 URL 경로로, 예시에서는 `'/src/main.ts'`로, 프로젝트 소스 디렉토리 내의 main.ts 파일이다. 이 URL은 웹 브라우저가 요청하는 경로와 유사한 형태를 가진다.

options은 변환 과정에 영향을 줄 수 있는 추가적인 컨텍스트 정보를 제공하는 객체이다. 예시코드에서 `html: server.config.root + '/index.html'`로, 현재 변환 요청이 어떤 HTML 파일을 기준으로 이루어지는지를 명시한다. `server.config.root`는 Vite 프로젝트의 루트 디렉토리를 나타내며, 여기에 /index.html을 더해 일반적으로 프로젝트의 메인 HTML 파일 경로를 지정한다. 

이 정보는 특정 플러그인이 HTML 컨텍스트에 따라 다르게 동작하거나, CSS `@import` 경로 해석, 혹은 SSR(Server-Side Rendering) 시 에셋 번들링 등에서 활용될 수 있다.

---

## 내부 구조를 코드와 함께 보기

Vite의 [`transformRequest`](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/transformRequest.ts) 구현을 간략히 보면 다음과 같다

```ts
async function transformRequest(url, serverContext) {
  // 1. URL → 파일 시스템 경로 변환
  // 2. 파일 읽기
  // 3. 플러그인 transform 훅 적용
  // 4. esbuild 적용 여부 판단 및 변환
  // 5. 캐시 저장 및 반환
}
```

실제 구현에서는 HMR, sourcemap, preload context 등 다양한 고려사항이 함께 들어가며 꽤 복잡하다.  
하지만 핵심은 **"플러그인 → esbuild → 반환"** 흐름이다.

---

## 왜 중요한가?

`transformRequest()`는 다음과 같은 상황에서 중요하게 작동한다:

- **모듈 핫 리로딩(HMR)**: 변경된 모듈만 다시 읽고 변환하여 브라우저에 전달
- **플러그인 디버깅**: custom transform 훅이 잘 작동하는지 테스트할 때
- **변환 결과 추적**: TypeScript가 어떻게 JS로 변환되는지 확인할 때

---

## 실사용 예시: Vite 내부 분석 도구처럼 활용하기

```ts
import { createServer } from 'vite';

(async () => {
  const server = await createServer();
  await server.listen();

  const result = await server.transformRequest('/src/main.ts');
  console.log(result.code);      // 변환된 코드
  console.log(result.map);       // source map 정보
})();
```

이 방식은 다음과 같은 디버깅 또는 테스트에 유용하다:

- 특정 플러그인이 적용되었는지 확인
- `.vue`, `.ts`, `.jsx` 등 변환 후 코드를 직접 확인
- 서버에서 변환 오류 발생 시 문제 위치 추적

---

## 연관 이슈 및 참고자료

- [Nuxt에서 transformRequest 관련 이슈](https://github.com/vitejs/vite/issues/4898)  
  → SSR 환경에서 transform이 누락되는 버그 사례
- [Vite JavaScript API 문서](https://vite.dev/guide/api-javascript)  
  → createServer, transformRequest, ssrLoadModule 등의 공식 API 가이드
- [esbuild transform API](https://esbuild.github.io/api/#transform)  
  → TypeScript → JavaScript로 변환되는 과정 이해에 필수

---

## 마치며

`transformRequest()`는 Vite 개발 서버에서 가장 중요한 처리 로직 중 하나다.  
단순히 내부용 API로 보기보다는, **플러그인 개발, 변환 디버깅, 성능 분석** 시 활용할 수 있는 강력한 도구로 이해하면 좋다.

그리고 이러한 내부 API를 탐색하고 실험하는 과정은 번들러에 대한 이해도를 한층 높여준다.

👉 다음엔 Vite의 `ssrLoadModule()`이나 `transformWithEsbuild()`도 함께 분석해보면 재미있을 것 같다.

---

```toc
```
