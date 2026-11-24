---
emoji: '🧭'
title: 'Biome 2년 사용 후기'
seoTitle: 'Biome과 ESLint 2년 사용 후기'
date: '2026-11-15'
categories: '프론트엔드 자바스크립트'
description: 'Biome을 2년 가까이 사용하며 설정 통합과 검사 속도를 측정했다. ESLint에서 빠진 검사, 타입 정보 규칙의 비용, Biome 2 마이그레이션에서 나온 차이를 실제 코드와 공식 문서로 정리한다.'
keywords: 'Biome, ESLint, Prettier, Biome 2, 마이그레이션, 프론트엔드, 정적 분석'
---

ESLint 와 Prettier 를 쓰고 있고 Biome 으로 옮기거나 Biome 1 에서 2 로 올릴지 고민하는 개발자에게, 필자의 코드에서 얻은 측정값과 마이그레이션 결과를 정리한다. 필자는 회사의 프론트엔드 서비스 두 곳에 2024년 11월과 2025년 1월 Biome 1.9.4 를 도입했다. [Biome 이 ESLint 와 Prettier 를 대체할 수 있을까?](/241201)는 도입 직후 쓴 소개 글이다.

먼저 결론을 말하면, 두 서비스에서 Biome 은 설정을 한곳으로 모았고 전체 검사는 파일 수가 거의 두 배가 된 뒤에도 0.2초대였다. 그 과정에서 ESLint 의 일부 검사를 잃었고, Biome 2 로 올릴 때는 import 정렬을 포함한 큰 diff 가 생겼다. 필자가 확인한 결과를 기준으로 Biome 이 맡는 일과 맡지 않는 일을 구분해 보겠다.

## 설정 통합과 검사 속도

옮기기 전 설정은 한곳에서 관리되지 않았다. ESLint 설정은 `.eslintrc.js` 와 `package.json` 의 `eslintConfig` 에 각각 있었는데, ESLint 8 은 같은 폴더의 설정 파일 하나만 읽었다. `package.json` 쪽 설정은 airbnb 상속을 포함했지만, airbnb 설정은 설치되어 있지도 않았다. 적용되지 않는 규칙이 적용되는 것처럼 적혀 있었다.

Prettier 옵션도 `.prettierrc` 와 ESLint 의 `prettier/prettier` 규칙에 나뉘어 있었고, import 정렬은 ESLint 설정에 따로 있었다. Biome 은 린트, 포맷, import 정렬을 `biome.json` 하나에서 정한다. 린트와 포맷 관련 개발 의존성은 두 서비스에서 각각 12종에서 1종, 10종에서 1종으로 줄었다. 설정의 판정 주체가 하나가 되면서 적힌 규칙과 실제 적용되는 규칙이 달라질 여지도 줄었다.

속도는 Apple M2 Max 12코어에서 도입 직전 코드의 `src` 751개 파일을 캐시 없이 검사해 비교했다. ESLint 8.57 스택은 10.34~10.93초였고, Biome 1.9.4 의 `check` 는 린트, 포맷, import 정렬을 포함해 0.21~0.22초였다. 각각 다섯 번 측정했다. 다만 두 쪽이 검사한 규칙 묶음은 같지 않다.

ESLint 에서 `prettier/prettier` 규칙을 끄면 5.31~5.35초로 절반가량 줄었다. Prettier 를 린트 규칙으로 실행하면서 파일마다 다시 파싱하는 몫이 시간의 절반이었다. ESLint 의 `--cache` 가 채워진 뒤에는 0.85~0.91초였다. Biome 을 스레드 하나로 묶었을 때는 1.26초였다.

필자는 이 결과에서 0.22초 가운데 병렬 처리가 약 6배, 나머지인 네이티브 바이너리와 한 번 파싱한 트리를 린트와 포맷이 함께 쓰는 구조가 약 8배를 차지한다고 거꾸로 추론했다. 이 값은 별도 요소를 각각 통제해 측정한 결과가 아니라, 위 측정값을 바탕으로 한 추론이다.

2026년 11월 기준 같은 서비스는 `src` 파일이 1,457개로 늘었다. Biome 1.9.4 `check` 가 스스로 보고한 시간은 220~275ms, Biome 2.6.8 은 215~236ms 였다. 각각 세 번 측정했다. 파일이 두 배 가까이 늘었는데 보고된 검사 시간은 거의 그대로였다. 필자에게는 캐시를 따로 관리하지 않고도 전체 검사를 돌릴 수 있다는 점이 실무상 이점이었다.

## Biome 의 파싱과 실행 구조

Biome 의 파서는 구문 오류가 있어도 복구하도록 설계됐다. 공식 architecture 문서에 따르면 파싱 결과는 CST(concrete syntax tree)이며 rowan 라이브러리의 내부 포크를 사용해 green/red tree 패턴을 구현한다. CST 는 주석과 공백까지 보존한다.

잘못된 구문은 Bogus 노드로 표시한다. 규칙과 포매터가 그 부분을 정상 구문처럼 다루지 않게 하는 방식이다. 공식 문서는 Biome 파서가 Prettier 파서보다 일부러 더 엄격하고, 포매터는 Bogus 노드를 수정하지 않고 그대로 출력한다고 설명한다. 필자 팀 설정은 `formatWithErrors: true` 이므로 구문 오류가 있는 파일도 포맷한다.

Biome 은 서버와 클라이언트 구조도 갖는다. 백그라운드 데몬이 에디터와 CLI 요청을 처리하고, 에디터 확장은 `biome lsp-proxy` 로 LSP 메시지를 데몬에 전달한다. 공식 문서에는 포매터의 중간 표현(IR)을 살펴보는 `biome inspect` 명령도 소개되어 있다. 이 명령은 2.6 부터 제공된다.

scanner 는 기본 실행에 항상 붙지 않고 opt-in 이다. project 도메인 규칙이나 타입 정보 규칙을 켤 때 scanner 가 중첩된 `biome.json` 과 `.gitignore` 를 찾고, `package.json` 과 소스 파일을 색인한다. 공식 FAQ 는 약 2천 개 파일에서 scanner 없이 약 800ms, scanner 를 켜면 약 2초라고 안내한다. 필자는 기본 `check` 측정값과 타입 정보 규칙을 켠 측정값이 같은 실행 범위를 재는 값은 아니라고 본다.

## 규칙과 수정의 범위

Biome 의 린트 규칙은 Accessibility, Complexity, Correctness, Nursery, Performance, Security, Style, Suspicious 여덟 그룹으로 나뉜다. v2 부터 모든 규칙에는 기본 심각도가 있고, Style 그룹은 기본으로 경고를 낸다. Nursery 규칙은 안정 버전의 규칙과 달리 설정에서 직접 켜야 한다.

규칙은 진단만 내는 데 그치지 않고 코드를 고치는 경우도 있다. safe 수정은 코드의 의미를 바꾸지 않는다고 보장하며 `--write` 로 적용된다. unsafe 수정은 의미를 바꿀 수 있어 `--write --unsafe` 가 필요하다. `noFloatingPromises` 의 수정은 unsafe 다.

Biome 의 억제 주석에는 이유가 문법으로 포함된다. 예를 들어 `// biome-ignore lint/<그룹>/<규칙>: <이유>` 형식을 쓴다. 파일 전체 억제에는 파일 맨 위의 `biome-ignore-all` 을, 특정 범위 억제에는 `biome-ignore-start` 와 `biome-ignore-end` 를 쓴다. 사용되지 않는 억제 주석은 `suppression/unused` 진단으로 표시된다.

필자의 코드에서는 React 훅 의존성 배열을 검사하는 recommended 규칙 `useExhaustiveDependencies` 의 경고 326건이 남아 있다. 팀은 이를 오류가 아닌 경고로 두고 있다.

## 타입 정보와 project 규칙

Biome 은 타입 검사기가 아니다. 공식 문서가 설명하는 범위는 `typescript` 패키지 없이도 타입 정보에 기반한 린트 규칙을 쓸 수 있다는 것이다. 필자의 두 서비스에서 CI 의 타입 검사는 빌드 명령 안의 `tsc` 가 계속 맡는다.

Biome 1 의 규칙은 파일 하나의 구문만 보므로, 호출한 함수가 Promise 를 돌려주는지 알아야 하는 검사를 할 수 없었다. Biome 2 는 TypeScript 컴파일러에 기대지 않는 타입 정보 린트 규칙을 도입했다. 첫 규칙인 `noFloatingPromises` 는 예비 테스트에서 typescript-eslint 가 잡는 경우의 약 75%를 잡았다고 밝혔다. v2.1에서는 타입 추론을 고쳐 그 비율을 약 85%로 올렸다고 했고, `noMisusedPromises` 를 포함해 규칙 일곱 개를 추가했다.

필자가 2.6.8 에서 현재 코드에 `noFloatingPromises` 를 켜자 22건이 나왔다. 그중 한 예는 Promise 를 돌려주는 확인 콜백을 `await`하지 않고 부른 뒤 바로 창을 닫는 코드였다. 이 규칙은 2.6.8에서도 Nursery 그룹에 속한다. 공식 문서는 Nursery 를 실험 단계로 설명하며 동작이 언제든 바뀔 수 있다고 적는다. 기본 심각도는 info 이고, 켜면 프로젝트 파일을 훑는 scanner 와 타입 추론 엔진이 돌아 검사 시간이 늘어난다.

project 도메인 규칙은 `package.json` 의 의존성을 보고 규칙 묶음을 자동으로 켠다. 예를 들어 React 16 이상, Next 14 이상, Vitest 같은 테스트 도구를 기준으로 관련 규칙을 활성화한다. 필자는 2.6.8 에서 현재 코드 `src` 1,438개 파일을 Apple M2 Max 에서 직접 측정했다. 현재 설정 그대로 린트만 돌리면 122~160ms였고, 여기에 타입 추론을 쓰는 `noFloatingPromises` 만 켜면 225~262ms 였다.

`noImportCycles` 는 Suspicious 그룹의 규칙이며 기본 심각도는 경고다. 공식 문서는 계산 비용이 크다고 설명한다. 필자의 코드에서 이 규칙을 켠 실행은 253~264ms였고 경고 88건이 나왔다.

`noUnresolvedImports` 는 import한 이름이 실제로 export되는지 확인하는 Correctness 그룹 규칙이며 기본 심각도는 오류다. 동적 `import()` 와 `require()` 는 검사하지 않는다. 실제 `node_modules` 를 연결한 상태에서 실행한 시간은 243~253ms였고, 오류가 553건 나왔다. 이 코드는 빌드와 테스트가 통과하지만, 553건은 모두 실제 오류가 아니었다.

그중 Vitest 에서 가져온 `describe`, `it`, `expect`, `vi` 같은 이름이 499건, React 의 `Fragment`, `Suspense` 가 28건, Vite 의 `?url`, `?worker` 접미사를 붙인 import 가 25건이었다. 나머지 한 건은 패키지 하나였다. React 패키지의 진입 파일은 CommonJS 의 `module.exports` 로 내보낸다. Biome 이 이런 export 를 정적으로 찾지 못한 것으로 보인다는 것은 필자의 추론이다.

`node_modules` 를 연결하지 않고 같은 규칙을 실행하면 약 700ms 에 4,136건이 나왔다. 이 결과를 바탕으로 필자는 현재 코드에서 project 규칙으로 ESLint 시절의 `import/no-unresolved` 검사를 되살리기 어렵다고 판단했다. 이 판단은 필자의 코드에서 나온 결과에 한정된다.

규칙별 시간은 v2.4 부터 제공되는 `--profile-rules` 로 확인했다. 전처리 시간은 빼고 스레드마다 규칙 실행 시간을 더하는 방식이다. 필자의 측정에서는 `useExhaustiveDependencies` 가 54.6ms 로 가장 길었고 24,086번 실행됐다. 다음은 `noFallthroughSwitchClause` 13.0ms, `noUnusedVariables` 9.3ms, `useImportType` 8.7ms 였다. 전체 `check` 는 포맷과 import 정렬을 포함해 215~236ms 였다. 린트만 돌린 122~160ms와의 차이가 포맷과 assist 의 몫이라는 것은 필자의 추론이다. oxlint 도 같은 코드에서 재려 했지만 이번에는 측정하지 못했으므로 속도 비교에는 포함하지 않는다.

## 2년 동안 늘어난 기능

필자가 도입한 1.9.4 는 npm 기준 2024년 10월 17일에 나왔다. v2.0.0 은 2025년 6월 17일, v2.6.8 은 2026년 11월 15일에 나왔다. 그 사이 Biome 은 타입 정보 린트 외에도 지원 범위와 실행 도구를 넓혔다.

v2 는 GritQL 플러그인과 여러 설정 파일을 두는 monorepo 지원을 추가했다.

v2.3 은 Vue, Svelte, Astro 지원을 실험 단계로 추가했고, `!` 로 제외하는 새 무시 문법과 Tailwind v4 지시어 파싱을 포함했다. v2.4 는 JavaScript 안의 CSS 와 GraphQL 조각을 검사하고 HTML 접근성 규칙 15개를 추가했다. 규칙별 시간을 재는 `--profile-rules` 도 이 버전에 들어갔다.

v2.5에서는 린트 규칙이 500개를 넘었고 `--watch` 모드가 추가됐다. GritQL 플러그인은 코드를 고치는 제안도 할 수 있게 됐다. v2.6 은 Markdown, SCSS, YAML 을 지원하고 JavaScript 플러그인을 developer preview 로 내놓았다.

ESLint 플러그인 생태계를 그대로 가져올 수는 없다. GritQL 플러그인은 Biome 의 Rust 규칙이 사용하는 semantic model 에 접근하지 못한다. JavaScript 플러그인은 developer preview라 패치 릴리스에서도 바뀔 수 있다. 따라서 기존 ESLint 플러그인을 그대로 가져올 수 있다고 볼 근거는 없다.

2026년 11월 15일 공식 홈페이지 기준으로 Biome 은 Prettier 와 97% 호환되고 린트 규칙은 816개다. 97% 를 어떻게 쟀는지는 공식 문서에 적혀 있지 않다.

Biome 의 다운로드도 늘었다. npm 주간 다운로드를 2024년 11월 11일부터 17일까지와 2026년 11월 9일부터 15일까지 비교하면 Biome 은 124만에서 2,739만으로 증가했다. 같은 기간 ESLint 는 4,806만에서 2억 705만, Prettier 는 4,379만에서 1억 8,472만, oxlint 는 9만에서 4,828만이었다.

Prettier 와 포맷 결과가 달라지는 구체적인 경우도 있다. 객체와 클래스 속성의 따옴표를 뗄 때 Prettier 는 ES5 식별자까지만 대상으로 하고, Biome 은 ES2015 이후 식별자까지 뗀다. 계산된 키 안의 대입식에서는 Biome 이 괄호를 뺀다.

## ESLint 에서 빠진 검사

Biome 으로 옮길 때 일부 검사는 실제로 빠졌다. `import/no-unresolved` 와 `import/named` 는 Biome 1.9 에 없어 import 경로와 이름 검사를 맡지 못했고, 필자의 서비스에서는 `tsc` 가 대신 확인한다. 다만 앞 절의 `noUnresolvedImports` 실측에서 나온 실제 오류가 아닌 진단 때문에 project 규칙으로 이를 대체하기 어렵다고 판단했다.

훅 호출 위치 검사도 빠졌다. ESLint에서는 오류였지만, 도입 당시 Biome 의 `useHookAtTopLevel` 은 꺼 두었다. 파일과 폴더 이름 규칙도 빠졌다. 당시 ESLint 의 `check-file`에는 336건이 걸렸지만 Biome에는 파일 이름용 `useFilenamingConvention` 만 있고 폴더 이름 규칙은 없다.

처리되지 않은 Promise 검사도 Biome 1에는 없었다. 함수의 반환값이 Promise인지 알려면 타입 정보가 필요한데, Biome 1 의 규칙은 파일 하나의 구문만 봤다. 브라우저의 `unhandledrejection` 을 받는 에러 모니터링은 일부만 잡는 안전망이었다. Biome 2 의 `noFloatingPromises` 가 생겼지만 이 규칙은 Nursery 그룹이고 켜면 실행 시간이 늘어난다.

## Biome 2 마이그레이션

두 서비스는 아직 Biome 1.9.4 를 사용한다. 필자는 현재 코드 복사본에 `biome migrate --write` 를 실행해 설정 변경과 진단 차이를 확인했다. `files.include` 와 `ignore` 는 `includes` 하나로 합쳐지고, 제외 패턴은 `!` 로 시작한다. `organizeImports` 는 `assist.actions.source.organizeImports` 로 이동했다. 일부 규칙은 이름이나 그룹도 바뀌었다. 예를 들어 `noMultipleSpacesInRegularExpressionLiterals` 는 `noAdjacentSpacesInRegex` 가 되고, `noWith` 와 `noVar` 는 Suspicious 그룹으로 옮겨졌다.

공식 업그레이드 안내에 따르면 import 정렬 방식이 바뀌어 1.x 와 똑같은 순서를 만들 수 없다. glob 앞에 `**/` 를 붙이지 않는 변경도 있다. `biome migrate --write` 로 설정을 옮긴 뒤 검사하자 import 정렬이 다르다는 진단이 322개 파일에서 나왔고 포맷 차이는 15개 파일에서 나왔다. Biome 2 로 올리려면 이 차이를 한 번에 고치는 커밋이 필요하다.

`biome migrate eslint --write` 는 ESLint 규칙, globals, overrides, ignore 패턴을 옮긴다. 옛 eslintrc 와 flat config 를 모두 읽고 extends 를 따라간다. 규칙 preset 은 none 으로 두고 옮긴 규칙만 켠다. 기본 설정은 같은 규칙만 옮기며, `--include-inspired` 를 주면 비슷한 규칙까지 옮긴다. 공식 안내도 결과를 검토한 뒤 사용하라고 한다.

`biome migrate prettier --write` 는 현재 출력이 유지되도록 Prettier 옵션을 모두 명시적으로 적는다.

## CI에서의 판정

필자의 개발 흐름에서는 에디터 저장과 커밋 직전에 Biome 이 고치면서 검사한다. pull request 와 배포 파이프라인의 CI에서는 `biome ci` 를 실행해 파일을 고치지 않고 포맷, 린트, assist 를 판정한다. 커밋 훅은 건너뛸 수 있으므로 통과 여부는 CI 가 결정한다.

`biome ci --changed` 는 기본 브랜치 또는 `--since` 로 지정한 기준과 비교해 커밋된 변경 파일만 검사하며 CI 용도다. `--staged` 는 스테이지된 파일만 검사하며 로컬 용도다. 리포터는 github, gitlab, junit, checkstyle, sarif, rdjson, summary 중에서 고를 수 있고 json 은 실험 단계다.

## 자주 받는 질문과 답

- **Biome 은 타입 검사를 대신하는가**: 아니다. 타입 정보 린트 규칙은 쓸 수 있지만 필자의 두 서비스에서는 CI 의 `tsc` 가 타입 검사를 맡는다.
- **Biome 2 의 `noFloatingPromises` 는 안정 규칙인가**: 아니다. 2.6.8에서도 Nursery 그룹이며 공식 문서는 실험 단계라 동작이 바뀔 수 있다고 설명한다.
- **`noFloatingPromises` 를 켜면 검사 시간이 얼마나 늘었는가**: 필자의 현재 코드에서는 린트만 돌릴 때 122~160ms였고, 이 규칙을 추가하자 225~262ms 였다.
- **Biome 의 `noUnresolvedImports` 로 ESLint 검사를 대체할 수 있는가**: 필자의 코드에서는 어렵다고 판단했다. `node_modules` 를 연결해도 553건 모두 실제 오류가 아닌 진단으로 나왔고, 연결하지 않으면 약 700ms 에 4,136건이 나왔다.
- **Biome 2 로 올릴 때 큰 코드 변경이 생기는가**: 필자의 코드에서는 import 정렬 진단이 322개 파일, 포맷 차이가 15개 파일에서 나왔다.
- **Biome 의 자동 수정은 모두 의미를 보존하는가**: 아니다. safe 수정은 의미를 바꾸지 않는다고 보장하지만 unsafe 수정은 의미를 바꿀 수 있고 `--write --unsafe` 가 필요하다.
- **`biome ci` 는 코드를 고치는가**: 아니다. 포맷, 린트, assist 를 검사하고 파일은 고치지 않는다.
- **기존 ESLint 플러그인을 그대로 사용할 수 있는가**: GritQL 플러그인은 Biome 의 Rust 규칙이 쓰는 semantic model 에 접근하지 못하고, JavaScript 플러그인은 developer preview 다. 기존 ESLint 플러그인 생태계를 그대로 가져올 수는 없다.

## 결론

필자의 두 서비스에서 Biome 은 설정이 실제 적용되는 상태를 한곳에 모았고, 파일 수가 거의 두 배가 된 뒤에도 전체 검사가 0.2초대였다. 그 결과는 규칙 묶음이 ESLint 와 같다는 뜻이 아니다. import 검사, 훅 호출 위치, 폴더 이름 규칙처럼 옮기며 빠진 검사와 Biome 2 의 project 규칙에서 확인한 실제 오류가 아닌 진단을 함께 고려해야 한다.

Biome 2 는 타입 정보 규칙과 지원 범위를 넓혔지만, 필자의 코드에서 마이그레이션은 322개 파일의 import 정렬 변경과 15개 파일의 포맷 차이를 만들었다. 옮길지 고민한다면 속도와 설정 통합만 보지 말고, 현재 적용 중인 규칙과 빠질 검사, 실제 변환 diff 를 함께 확인해 보길 바란다.

:::ref
- [docs] [Biome, Biome v2](https://biomejs.dev/blog/biome-v2/)
- [docs] [Biome, Migrate to Biome v2](https://biomejs.dev/guides/upgrade-to-biome-v2/)
- [docs] [Biome, Migrate from ESLint and Prettier](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [docs] [Biome, Architecture](https://biomejs.dev/internals/architecture/)
- [docs] [Biome, Linter](https://biomejs.dev/linter/)
- [docs] [Biome, Linter domains](https://biomejs.dev/linter/domains/)
- [docs] [Biome, noFloatingPromises](https://biomejs.dev/linter/rules/no-floating-promises/)
- [docs] [Biome, noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/)
- [docs] [Biome, Suppressions](https://biomejs.dev/analyzer/suppressions/)
- [docs] [Biome, CLI](https://biomejs.dev/reference/cli/)
- [docs] [Biome, Differences with Prettier](https://biomejs.dev/formatter/differences-with-prettier/)
:::