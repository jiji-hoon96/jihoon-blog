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

## `transformRequest()`란?

Vite의 개발 서버는 브라우저 요청을 가로채어, 모듈을 실시간으로 변환하고 전달한다.  
이때 호출되는 내부 함수가 `transformRequest(url)`이며, 다음의 흐름으로 동작한다:

1. **모듈 로드**  
   - 파일 시스템에서 요청된 URL에 해당하는 파일을 읽어들인다.
2. **플러그인 적용 (`transform` 훅)**  
   - Vite에 등록된 각종 플러그인들의 `transform(code, id)` 훅을 순차적으로 실행한다.
3. **esbuild 변환 (필요 시)**  
   - TypeScript, JSX, Vue SFC 등은 esbuild를 사용해 JS로 변환한다.
4. **결과 반환**  
   - 최종 코드와 소스맵, 메타데이터 등을 포함한 결과 객체를 반환한다.

```ts
const result = await server.transformRequest('/src/main.ts');
console.log(result.code); // 변환된 코드 확인
```

---

## 내부 구조를 코드와 함께 보기

Vite의 [`transformRequest`](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/transformRequest.ts) 구현을 간략히 보면 다음과 같다:

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

- 🔄 **모듈 핫 리로딩(HMR)**: 변경된 모듈만 다시 읽고 변환하여 브라우저에 전달
- 🧩 **플러그인 디버깅**: custom transform 훅이 잘 작동하는지 테스트할 때
- 🔍 **변환 결과 추적**: TypeScript가 어떻게 JS로 변환되는지 확인할 때

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
