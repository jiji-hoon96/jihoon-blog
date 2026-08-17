# 이중 언어 인용문 설계

## 목표

영문 자료를 인용할 때 한국어 번역을 주된 내용으로 먼저 보여주고, 검증 가능한 영어 원문을 보조 정보로 아래에 함께 제공한다. 기존 일반 인용문은 그대로 유지한다.

## 작성 문법

글 작성자는 번역과 원문을 모두 직접 입력한다.

```md
::::quote
:::translation
제로 코드 계측은 일반적으로 사용 중인 라이브러리를 계측한다.
:::

:::original
Typically, zero-code instrumentation adds instrumentation for the libraries you're using.
:::
::::
```

`quote` directive에는 비어 있지 않은 `translation`과 `original` directive가 각각 정확히 하나씩 있어야 한다. 조건을 만족하지 않으면 콘텐츠 빌드를 실패시켜 불완전한 이중 언어 인용문이 배포되지 않게 한다.

## 변환 구조

새 remark 플러그인이 directive AST를 다음 HTML 구조로 변환한다.

```html
<blockquote class="bilingual-quote">
  <div class="quote-translation" lang="ko">한국어 번역</div>
  <div class="quote-original" lang="en">English original</div>
</blockquote>
```

플러그인은 이중 언어 인용문만 담당한다. 기존 `>` blockquote와 `:::ref`, `:::details`, 위젯 directive의 동작은 변경하지 않는다.

## 표현

- 한국어 번역은 위에 배치하고 기본 본문에 가까운 크기와 색상으로 표시한다.
- 영어 원문은 아래에 배치하고 `0.8125rem` 크기와 옅은 회색으로 표시한다.
- 두 영역은 구분선 없이 여백으로만 나눈다.
- 다크 모드에서도 한국어가 영어보다 높은 대비를 갖도록 기존 색상 토큰을 사용한다.
- 한국어와 영어 모두 접근성 트리에 남기며 각 영역에 `lang`을 지정한다.

## 기존 글 마이그레이션

모든 `content/*/index.md`의 blockquote를 확인하되 다음 기준으로만 변환한다.

- 외부 영문 출처에서 가져온 영어 인용문에는 직접 작성한 한국어 번역을 추가한다.
- 이미 영어와 괄호 속 한국어 번역이 함께 있으면 새 directive 구조로 옮긴다.
- 한국어 번역만 있는 외부 영문 인용은 연결된 출처에서 정확한 영어 원문을 확인한 뒤 추가한다.
- 필자의 강조문, 동료나 기획자의 한국어 발화, 한국어 자료의 원문은 일반 blockquote로 유지한다.
- 영어 원문은 추측하거나 역번역하지 않고 글에 연결된 1차 출처에서 확인한다.

현재 조사에서 우선 확인할 글은 `251117`, `260104`, `260302`, `260418`, `260529`, `260703`, `260723`이다. 전체 blockquote 목록도 다시 검사해 누락을 방지한다.

## 테스트와 검증

TDD로 다음 동작을 먼저 실패하는 테스트로 작성한다.

1. 정상 directive가 클래스와 언어 속성을 가진 이중 언어 blockquote로 변환된다.
2. `translation` 또는 `original`이 없거나 비어 있으면 변환이 실패한다.
3. 일반 blockquote는 변경되지 않는다.

구현 후 단위 테스트, TypeScript 검사, 변경 파일 린트, 전체 콘텐츠 빌드를 실행한다. 빌드 산출물에서 대표 인용문의 한국어가 영어보다 먼저 나오고 영어 원문에 `lang="en"`이 적용됐는지 확인한다.
