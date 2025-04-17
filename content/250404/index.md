---
emoji:  🛠️
title: 'Verdaccio와 Lerna를 활용한 사내 유틸리티 라이브러리 구축기'
date: '2025-04-04'
categories: 프론트엔드 인프라 아키텍처
---

회사 내에서 프론트엔드 공통 유틸리티 모듈을 통합 관리하는 작업을 맡으면서, 다음과 같은 요구사항이 생겼다.

- 여러 레포지토리에 중복된 로직을 하나로 추출해 관리하고 싶다.
- 패키지 단위로 분리해 모노레포 형태로 운영하되, 유연한 버전 관리가 필요하다.
- 외부 공개 없이 사내에서만 배포 및 사용 가능한 NPM 패키지 레지스트리를 갖추고 싶다.
- CI/CD 파이프라인에서도 안전하고 빠르게 배포되도록 자동화를 고려해야 한다.

이 문제를 해결하기 위해 선택한 조합이 바로 `Lerna`와 `Verdaccio`다.

Lerna는 모노레포에서 패키지를 효과적으로 분리하고, 빌드/배포 파이프라인을 정리하는 데 탁월하다. 

특히 **independent versioning 전략**을 활용하면 각 패키지의 변경사항만 추적하여 배포할 수 있어 유틸리티성 모듈 관리에 적합하다.

반면, Verdaccio는 사내 전용 NPM 레지스트리를 손쉽게 구축할 수 있는 도구로, 설정이 단순하며, Docker 기반으로 격리된 레지스트리를 운영할 수 있다. npmjs.org와의 proxy 연결도 가능해, 공용 패키지를 사내 캐싱하는 역할까지 수행할 수 있다.

이 글에서는 단순한 튜토리얼이 아닌, 실제 구축 경험을 바탕으로 **설계 의도, 구조 구성, 보안 전략, 자동화 배포 흐름**까지 기술적으로 깊게 다뤄볼 예정이다.

---

## 기술 선택의 이유

사내 유틸리티 라이브러리의 특성상, 아래와 같은 구조가 필요했다.

- 프로젝트 간 코드 중복 제거 (ex. date formatter, error handler, toast utils 등)
- 빌드 후 개별 패키지로 publish, 각 프로젝트에서 scoped import로 사용
- 사내 프라이빗 레지스트리로 퍼블리싱 (Verdaccio)
- 자동화 배포 스크립트 (Lerna + Git tag 기반 publish)

이를 고려했을 때 `Turborepo`, `Nx` 같은 최신 도구도 고려했지만,

- Nx는 workspace 내 모든 패키지가 동일한 버전 관리 체계를 요구하거나, monolithic CI 구조가 필요한 경우 더 적합하다고 생각
- Lerna는 더 유연한 버전 전략을 제공하고, 다양한 팀이 패키지를 독립적으로 운영할 수 있게 도와줌
- Verdaccio는 자체 인증과 스코프 제어를 통한 접근 제어가 가능

그렇기에 Lerna + Verdaccio가 현재 상황에서 가장 합리적인 선택이었다.


앞으로 실제 모노레포 구성 (`lerna.json`, `pnpm workspace`, `패키지 디렉토리 구조`), 그리고 Verdaccio 설정 (`config.yaml`, `docker-compose.yml`)을 기반으로, 어떻게 각각의 패키지가 개발-빌드-배포되는지 자세히 살펴보자.


---

## Lerna 기반 모노레포 아키텍처 구성

사내 유틸리티 라이브러리는 장기적으로 확장 가능하고 모듈화된 구조여야 했다. 

단순히 공통 함수들을 모아두는 수준을 넘어서, 각기 다른 목적의 기능들이 하나의 레포 안에서 독립적으로 유지보수 가능해야 했기 때문이다.

그래서 도입한 구조가 바로 `Lerna` 기반의 모노레포 아키텍처였다.

<br/>

### 패키지 구조 설계 이유

모노레포에는 현재 두 개의 주요 패키지가 존재한다.

- `@company/common-library`: 날짜 파싱, 타입 헬퍼, 유효성 검사 등 다양한 프론트엔드 프로젝트에서 재사용되는 범용 유틸리티 모듈
- `@company/napi`: 내부 시스템과 연동되는 네이티브 API wrapper 혹은 RPC 클라이언트 역할의 모듈

이런 구조를 통해 **도메인 별 패키지 책임을 분리하면서도**, 공통 코드베이스 안에서 통합 관리가 가능하도록 구성했다.

```
packages/
├── company-common-library/
├── company-napi/
```

패키지들은 모두 `packages/` 디렉토리 하위에 존재하며, 각각 독립적인 `package.json`, 빌드, 테스트 환경을 가진다.

<br/>

### Lerna 설정 (`lerna.json`)과 버전 전략

```json
{
  "version": "independent",
  "packages": ["packages/*"],
  "npmClient": "pnpm"
}
```

Lerna는 `independent` 버전 전략을 채택해 각 패키지가 독립적으로 버전 관리되도록 했다.  
이는 다음과 같은 장점을 준다

- 변경 없는 패키지를 불필요하게 재배포하지 않음
- 핵심 유틸 패키지(`common-library`)와 도메인별 래퍼(`napi`) 간 버전 충돌 방지
- 명시적이고 의미 있는 커밋 기반의 publish (`lerna publish patch/minor/major`)

버전 배포는 `git tag` 기반으로 자동 관리되며, 이를 통해 CI/CD 흐름과도 쉽게 통합할 수 있다.

<br/>

### pnpm workspace와의 연동

`package.json` 루트에서는 `workspaces` 설정을 통해 pnpm과 Lerna의 패키지 인식 범위를 통일했다.

```json
"workspaces": [
  "packages/*"
]
```

pnpm은 Lerna와 달리 의존성을 루트에 hoist하지 않고 `.pnpm` 디렉토리에 격리해 설치한다.  
덕분에 패키지 간 충돌을 방지하고, **하드링크 기반 캐싱**을 통해 빌드 속도까지 개선된다.

또한 `root` 패키지를 `file:`로 의존성 선언해 내부 참조 관계를 명시적으로 설정하였다:

```json
"devDependencies": {
  "root": "file:../../"
}
```

<br/>

### 패키지별 빌드 전략과 타입 관리

각 패키지는 `vite` + `tsc` 조합으로 빌드된다.  
공통 모듈은 `vite`로 번들링된 ESM을 export하고, 동시에 `dts-bundle-generator`로 타입 정의도 번들링한다.

```json
"build": "del-cli build/**/* && tsc && vite build && dts-bundle-generator ..."
```

`exports` 필드는 타입, 브라우저, 기본 엔트리를 명시적으로 구분해 다양한 런타임에서도 타입 추론이 정확히 동작하도록 구성했다:

```json
"exports": {
  ".": {
    "types": "./dist/company-common-library.d.ts",
    "browser": "./dist/company-common-library.js",
    "default": "./dist/company-common-library.js"
  }
}
```

<br/>

### 테스트와 커버리지 전략

유닛 테스트는 `vitest`로 작성되며, 공통 유틸 함수의 안정성과 리팩토링을 보장하기 위한 커버리지를 기본으로 포함했다.

```json
"scripts": {
  "test": "vitest",
  "test:coverage": "vitest --coverage"
}
```

`__tests__/`와 `__bench__/` 디렉토리는 기능 테스트 외에도 퍼포먼스 비교 테스트를 병행하도록 설계되었다.  
이는 내부 util 함수들 간 병목 현상 탐지를 위한 구조이며, 런타임 성능 개선을 정량적으로 추적할 수 있게 한다.



--- 


## Verdaccio 기반 프라이빗 NPM 레지스트리 구축

앞선 글에서 Lerna 기반의 모노레포 아키텍처를 통해 공통 유틸리티 라이브러리를 패키지 단위로 관리하는 구조를 살펴보았다. 

하지만 이를 실제로 배포하고 사용할 수 있으려면 내부 전용 NPM 레지스트리가 필요하다.

<br/>

### 왜 내부 전용이어야 했을까?

우리가 관리하는 유틸리티 패키지에는 비즈니스 로직이 직접 담기지 않더라도, **사내 시스템 구조나 네이밍, 유효성 규칙** 등 외부에 노출되면 민감할 수 있는 내부 도메인 정보가 간접적으로 포함된다. 

또한, 사내 환경에 최적화된 설정 및 인터페이스를 포함하고 있기 때문에, 외부 레지스트리(NPM public registry)에서 공개적으로 운영하는 것이 적절하지 않다.

무엇보다도 외부 패키지와의 **네이밍 충돌이나 dependency confusion** 같은 공격 벡터를 차단하기 위해, 스코프가 명확히 정의된 사설 레지스트리를 통해 관리하는 것이 더 안전하고 예측 가능하다.

외부에 공개되지 않고, CI/CD와 연계되며, 접근 제어가 가능한 프라이빗 레지스트리를 구축하는 데 가장 적합한 도구는 바로 **Verdaccio**였다.

Verdaccio는 경량화된 Node.js 기반 NPM registry로, 손쉽게 설치하고 구성할 수 있으며, Docker 환경과도 잘 통합된다.

<br/>

### Docker 기반 레지스트리 인프라 구성

사내 인프라에는 다음과 같은 형태로 `verdaccio` 인스턴스를 구성하였다:

```yaml
# docker-compose.yml
version: '3.7'

services:
  verdaccio:
    image: hub.docker.company.net/verdaccio
    container_name: verdaccio
    restart: always
    environment:
      - VERDACCIO_PORT=COMPANY_PORT
    ports:
      - COMPANY_PORT=PORT
    volumes:
      - storage:/verdaccio/storage
    networks:
      - verdaccio_bridge

volumes:
  storage:

networks:
  verdaccio_bridge:
    driver: bridge
```

- `COMPANY_PORT`를 통해 외부 접근을 제공
- `storage` 볼륨을 분리해 캐시 및 패키지 데이터를 지속성하게 저장
- `verdaccio_bridge`를 통해 다른 사내 서비스와 연동 가능하도록 네트워크 분리

---

### 설정 파일 구조 및 접근 제어

핵심 설정은 `config.yaml`로 관리된다. 주요 설정 포인트는 다음과 같다

```yaml
storage: /verdaccio/storage
url_prefix: /npm/

auth:
  htpasswd:
    file: /verdaccio/conf/htpasswd

packages:
  '@company/*':
    access: $authenticated
    publish: $authenticated

  '**':
    access: $all
    publish: $authenticated
    proxy: npmjs
```

#### 주요 포인트

- `@company/*` 스코프 패키지에 대해서는 인증된 사용자만 publish/read 가능하도록 설정
- `proxy: npmjs` 설정으로, 사내 캐싱 기능과 fallback 지원
- `url_prefix` 를 `/npm/`으로 설정해 nginx 리버스 프록시 또는 CI 내부에서 명확한 경로 관리 가능
- 인증은 `htpasswd` 기반으로 구성하며, 사용자 수 제한 및 bcrypt 암호화도 설정 가능

---

### 보안을 고려한 운영 전략

프라이빗 레지스트리는 종종 **dependency confusion**과 같은 공격에 노출될 수 있다. 이를 방지하기 위해 다음과 같은 정책을 적용했다

| 설정 항목 | 목적 |
|----------|------|
| `proxy` 제거 (특정 스코프에 대해) | 외부 npmjs로 fallback 막기 |
| `publish` 제한 | 인증된 사용자만 업로드 가능 |
| `unpublish` 제한 | 과거 버전 삭제 불가하도록 설정 |
| `middlewares.audit.enabled: true` | 감사 로그 기록 활성화 |
| Docker 내부 포트 비공개 | 외부 접근은 특정 게이트웨이에서만 허용 |

<br/>

### 퍼블리시 및 연동 흐름

패키지 publish는 다음과 같은 명령어 흐름으로 구성된다:

```bash
pnpm build
npm set registry http://verdaccio.company.net:COMPANY_PORT/npm/
npm login
lerna publish patch --yes
```

- `lerna publish`는 각 변경된 패키지에 대해 독립적으로 버전 증가 및 배포
- `registry` 설정을 통해 verdaccio에 publish가 가능하도록 한다
- CI/CD에서는 `NPM_TOKEN`을 활용해 자동 로그인 처리

---


Verdaccio를 통해 빠르고 간편하게 프라이빗 레지스트리를 구축할 수 있었다. 추가로 보안 설정과 proxy 전략을 적절히 조합하여, dependency confusion을 효과적으로 방지할 수 있었다.

향후에는 OAuth 기반 인증, Web UI 비활성화, nginx 리버스 프록시 연동 등으로 보안 강화를 고민해봐도 좋을것 같다.


---

## semantic-release 도입 배경


앞선 챕터에서는 `Lerna` 기반 모노레포와 `Verdaccio` 프라이빗 레지스트리 인프라 구성을 다루었다. 이제 이 구조가 실질적으로 작동하기 위해서는 **버전 관리 및 배포 흐름의 자동화**가 필요하다.


특히 사내 라이브러리의 특성상 배포가 자주 발생하고, 사람이 직접 `lerna publish`에 버전 인자를 입력해 버전 번호를 관리하는 것은 실수의 여지가 크다. 또한 변경 없는 패키지까지 함께 publish 되는 경우 발생하기도 하고, 버전 증가 정책이 일관되지 않음으로써 버전 관리가 어려운 상황이 발생하기도한다.

그래서 **semantic-release**를 활용해 커밋 메시지를 기반으로 자동으로 버전이 관리되도록 구성했다.


---

### 커밋 메시지를 기반으로 버전 관리

semantic-release는 Conventional Commit 규칙을 기반으로 커밋 메시지를 분석해 다음과 같은 방식으로 버전을 관리한다

- `fix:` → patch version 증가
- `feat:` → minor version 증가
- `BREAKING CHANGE:` → major version 증가

```json
feat(button): add loading state
fix(modal): resolve z-index issue
refactor: remove unused props
```

이 방식은 `git history` 자체를 릴리즈 히스토리로 활용하기 때문에, **릴리즈 노트 자동 생성, 일관된 배포 기록 관리**에도 도움이 된다.

---

### CI에서 semantic-release 자동 실행

semantic-release는 보통 GitHub Action 또는 GitLab CI와 함께 사용되지만, 우리는 사내 인프라를 위해 Bitbucket Pipelines를 기반으로 구성하였다.

아래 예시와 같이 pipeline을 구성했다

```yaml
pipelines:
  branches:
    main:
      - step:
          name: release
          caches:
            - node
          script:
            - pnpm install
            - pnpm build
            - pnpm semantic-release
```

- main 브랜치에 머지되면 자동으로 `semantic-release`가 실행되고
- 커밋 메시지에 따라 버전이 증가하며, git tag가 생성되고
- 지정된 레지스트리 (Verdaccio)로 패키지가 publish된다

---

### Lerna와의 통합

Lerna 8 버전 이후에는 자체적인 conventional commits 기반 릴리즈 지원이 강화되었으나, 우리 구성에서는 `semantic-release` 단독 사용이 아닌, 다음과 같은 역할 분담 구조를 가졌다

- Lerna → 모노레포 패키지 실행 관리, build 스크립트 일괄 실행
- semantic-release → 버전 계산 및 git tag, changelog 생성
- pnpm → workspace 및 의존성 관리

이 구조로 인해 각자의 역할이 명확하게 나뉘며, 중복 설정 없이 유지보수가 용이해졌다.

---

semantic-release를 통해 다음과 같은 효과를 얻을 수 있었다

- 사람이 직접 버전 관리를 하지 않아도 되어 실수 방지
- 릴리즈 로그, git tag, changelog 자동 생성으로 배포 이력 관리 용이
- CI 환경에서 자동 publish 흐름 구성 → 완전한 GitOps 실현

이는 특히 사내 공통 라이브러리처럼 빠르게 변화하고, 여러 프로젝트에서 재사용되는 컴포넌트를 관리할 때 큰 장점을 가진다.

---



## Scoped 패키지란?

Scoped 패키지는 `@scope/name` 형태의 네이밍을 가진 NPM 패키지다.

```bash
@company/company-common-library
@company/company-napi
```

이를 통해 다음과 같은 효과를 얻을 수 있다:

- **패키지 네이밍의 네임스페이스화** → 사내 도메인 명확화
- **프라이빗 레지스트리 내 권한 제어** (config.yaml에서 `@company/*` 스코프 제한)
- **모듈 간 관계 파악 용이** → 범용 vs 도메인 특화 모듈 구분

Verdaccio의 설정에서도 `@company/*` 에 대해 별도의 접근 및 publish 정책을 구성할 수 있어 보안/정책 관리에 적합하다.

---

### 서비스 프로젝트에서 설치 및 사용

패키지를 사용하려는 서비스 프로젝트에서는 다음과 같이 설정한다

#### `.npmrc` 구성

```bash
@company:registry=http://verdaccio.company.net:COMPANY_PORT/npm/
//verdaccio.company.net:COMPANY_PORT/npm/:_authToken=xxxxx
```

- 특정 스코프(`@company`)만 내부 레지스트리로 리다이렉트
- 나머지는 public npm registry를 그대로 사용

이를 통해 내부 패키지는 Verdaccio에서, 외부 라이브러리는 기존 npm에서 가져오도록 이원화된 설정이 가능하다.

<br/>

#### 설치

라이브러리는 비공개이기떄문에, 설치 예시만 보여주겠다.

```bash
pnpm install @company/company-common-library
```

---

### import 방식

scoped 패키지로 배포된 유틸리티는 다음과 같이 프로젝트 내에서 import 가능하다:

```ts
import { formatDate, safeParse } from '@company/company-common-library/utils/date';
import { buildQueryString } from '@company/company-common-library/utils/url';
```

- 경량 ESM 번들로 export되기 때문에 트리 쉐이킹에 최적화
- 타입 정의도 함께 제공되므로 TS 프로젝트에서 타입 추론이 즉시 가능
- IDE 자동완성 및 문서화에서 큰 이점

---

### 호환성과 배포 주기 전략

공통 유틸리티의 경우 **주기적인 배포보다는 필요 기반의 배포 전략**을 채택했다.  
semantic-release가 자동으로 버전을 관리해주기 때문에, 사용처에서는 아래 전략을 따라간다

- patch 업데이트는 바로 반영
- minor 이상 업데이트는 PR에 release note 링크 포함 후 수동 반영
- major 업데이트는 코드베이스 검토 및 팀 공유 후 채택

또한 scoped 패키지는 **사내 Monorepo가 아닌 외부 레포**에서도 문제 없이 사용할 수 있다는 점이 큰 장점이다.

---

## 결론
이번 유틸리티 라이브러리 구축 프로젝트는 단순히 패키지를 나누고 배포하는 수준을 넘어, 사내 개발 생산성, 코드 품질, 협업 효율성을 구조적으로 끌어올리기 위한 인프라 작업이었다.

✅ 도입을 통해 얻게 된 주요 장점

- semantic-release를 통해 사람이 직접 버전 숫자를 관리하지 않아도 됨
- Lerna + pnpm을 통해 패키지를 독립적으로 유지보수 가능
- Verdaccio + scoped registry를 통해 외부 노출 없이 안전하게 운영
- 단일 install로 사용 가능하며 타입 정의 및 import 구조까지 통일
- publish → install → 반영까지 모든 흐름이 자동화되어 안정적

가장 큰 장점은 **유지보수가 쉬운 아키텍처가 되었다**는 점이다. 

사람에 의존한 규칙이 아니라, 구조와 도구 자체가 품질과 일관성을 유지해주기 때문이다.

**이러한 인프라가 갖춰졌을 때, 개발자는 더 이상 공통 로직을 복사하거나 컨벤션을 따로 전달하지 않아도 된다. 이제는 그냥 install 하면 되고, 자동으로 type도 따라온다.**

--- 

## 앞으로의 개선 포인트
- 전환 고려 여러 패키지에 영향을 주는 경우에는 Changesets의 PR 단위 버전 제안이 더 유리할 수도 있다고 생각해, semantic-release → Changesets 전환도 고려해볼 것 같다.

- Verdaccio 인증 방식 개선 : 현재는 htpasswd 기반이지만, 사내 SSO 또는 OAuth2 연동 등 중앙 인증과 통합 가능성 검토..

- 컴포넌트 단위 모듈 분리 : 현재는 유틸리티 중심이지만, 디자인 시스템이나 React 컴포넌트도 동일한 방식으로 확장 가능

- 릴리즈 노트 시각화 자동화 : Slack 연동 및 Github Actions 기반 release summary 자동 게시 등 운영 효율화를 추가 검토 중.. (공수가 너무 크다)

--- 

인프라는 결국 **개발 문화와 협업 체계의 중심**을 구성하는 것이다.

처음엔 번거롭고 복잡해 보이지만, 한 번 체계를 만들어두면 이후의 유지 비용은 급격히 줄어든다.

힘든 일 뒤에 보람이 온다고 했던가. 지금 와서 돌아보면, 꽤 괜찮은 경험이었다.

--- 

![1.jpg](1.jpg)


---


```toc

```