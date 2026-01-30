---
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

Vite의 [`transformRequest`](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/transformRequest.ts) 함수의 실제 구현은 HMR, 소스맵 처리, 캐싱 전략 등 다양한 요소가 고려되어 상당히 어렵고 정교하다. 그렇기에 핵심적인 처리 흐름을 간략화하여 살펴보자.

핵심은 **"ID 해석 → 로드 → (플러그인 & esbuild) 변환 → 캐싱 및 반환"** 의 흐름으로 요약할 수 있다. 이 과정을 통해 Vite는 요청된 모듈을 효율적으로 처리하고 빠른 개발 서버 성능을 제공한다. 이 부분을 명심하고 아래 설명을 따라가보자.


```ts

// 실제 transformRequest 함수의 시그니처 및 초기 캐시 확인 로직 (간략화)
export async function transformRequest(
  environment: DevEnvironment, 
  url: string,                
  options: TransformOptions = {} 
): Promise<TransformResult | null> { 

  // (옵션 기본값 설정, 서버 닫힘 상태 확인 등의 전처리 로직이 여기에 위치합니다.)

  //    동일한 URL과 옵션에 대한 요청이 이미 처리 중인지 확인합니다.
  const cacheKey = `${options.html ? 'html:' : ''}${url}`;
  const pending = environment._pendingRequests.get(cacheKey);

  if (pending) {
    // 이미 진행 중인 요청이 있고, 해당 요청이 현재 시점에서도 유효하다면
    return pending.request;
  }

  // 새로운 변환 작업 시작
  return result;
}
```

---

### 1단계 : 초기화 및 캐시 확인

요청 URL과 컨텍스트를 기반으로 캐시 키를 생성한다. 이미 동일한 요청이 진행 중인지 확인하고, 있다면 그 결과를 기다린다. 모듈이 마지막으로 무효화된 시간을 기준으로 최신 상태인지 확인한다.

실제 Vite 소스코드에서는 doTransform, loadAndTransform 등의 내부 함수로 분리되어 처리한다. 그리고 에러 처리, HMR을 위한 소프트 무효화(soft invalidation) 처리, 의존성 최적화 연동 등 훨씬 더 많은 세부 로직이 포함되어 있다.

--- 

### 2단계 : URL 정규화 및 모듈 ID 해석

URL에서 불필요한 쿼리(예: 타임스탬프)를 제거한다. 그리고 `pluginContainer.resolveId(url)`를 호출하여 플러그인을 통해 URL을 실제 파일 시스템 경로 또는 고유 ID로 변환한다.  (예: '/src/main.ts' -> '/Users/username/my-project/src/main.ts')

이렇게 변환된 ID를 기준으로 모듈 그래프에서 기존 모듈 정보를 조회하고, 유효한 캐시가 있다면 반환한다.

---

### 3단계 : 코드 로드 (Load)

`pluginContainer.load(id)`를 호출하여 등록된 플러그인들의 `load` 훅을 실행한다. 플러그인이 모듈 코드를 반환하면 그 코드를 사용하고, 그렇지 않으면 파일 시스템에서 직접 파일을 읽어온다. 로드된 코드에서 인라인 소스맵이 있다면 추출한다.

---

### 4단계 : 코드 변환 (Transform)

`pluginContainer.transform(code, id, { inMap: map })`을 호출하여 등록된 모든 플러그인의 `transform` 훅이 순차적으로 실행되어 코드를 변환한다.  (예: Vue SFC 처리, PostCSS 변환, 사용자 정의 변환 등)

TypeScript, JSX, TSX와 같은 파일은 Vite에 내장된 esbuild 플러그인 또는 관련 플러그인에 의해 JavaScript로 매우 빠르게 트랜스파일된다. 각 플러그인은 코드와 소스맵을 입력받아, 수정된 코드와 소스맵을 다음 플러그인으로 전달하거나 최종 결과로 반환한다.

---


### 5단계 : 소스맵 후처리

변환 과정에서 생성되거나 수정된 소스맵을 정규화한다. 원본 소스 내용을 소스맵에 포함시키거나(`injectSourcesContent`), 특정 소스 파일을 무시하는(`sourcemapIgnoreList`) 등의 후처리를 적용한다.

이 다음 단계에서 SSR 환경을 위한 추가 변환을 할 수 있다.


---

### 6단계 : 결과 생성 및 캐싱

최종적으로 변환된 코드, 소스맵, ETag(캐싱용) 등을 포함하는 결과 객체를 생성한다. 만약 모듈 처리 중에 해당 모듈이 무효화되지 않았다면, 이 결과를 모듈 그래프에 캐싱하여 다음 요청 시 빠르게 재사용할 수 있도록 한다.


---

## transformRequest이 왜 중요한가?

`transformRequest` 함수는 Vite의 핵심 기능인 모듈 핫 리로딩(HMR)을 가능하게 하는 중추적인 역할을 한다. 개발 중 코드가 변경되면, `transformRequest`는 해당 모듈만 신속하게 다시 읽어 변환하고 브라우저에 전달하여 즉각적인 화면 업데이트를 제공한다. 

또한, 개발자가 특정 플러그인을 개발하거나 기존 플러그인의 동작을 디버깅할 때 매우 유용하다. 예를 들어, custom transform 훅이 예상대로 작동하는지 테스트하거나, TypeScript, JSX, Vue SFC와 같은 파일이 JavaScript로 어떻게 변환되는지 그 결과를 직접 추적하고 확인할 수 있다. 

이처럼 `transformRequest`는 Vite의 빠른 개발 경험을 제공하고, 플러그인 생태계를 확장하며, 코드 변환 과정을 투명하게 만들어 개발자에게 강력한 분석 도구를 제공한다는 점에서 매우 중요하다.

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

 다음엔 Vite의 `ssrLoadModule()`이나 `transformWithEsbuild()`도 함께 분석해보면 재미있을 것 같다.

---

```toc
```
