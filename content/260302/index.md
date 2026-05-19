---
emoji: 🤖
title: 'AI 시대의 프론트엔드 엔지니어'
seoTitle: 'AI 시대, 프론트엔드 엔지니어로 살아남는 법 — 검증·명세·판단력 새 역량'
date: '2026-03-02'
categories: 프론트엔드 커리어 AI
description: 'AI가 코드를 대신 짜는 시대, 프론트엔드 엔지니어는 어떻게 성장하고 살아남을 수 있을까? Karpathy의 agentic engineering, Vercel v0, Stack Overflow Survey, METR 연구 등 검증된 자료를 바탕으로 검증·명세·판단력 중심의 새로운 역량과 학습 전략을 정리한다.'
keywords: 'AI 시대 프론트엔드, AI 시대 개발자, vibe coding, agentic engineering, AI 코딩 도구, Product Engineer, 프론트엔드 커리어 로드맵'
draft: true
---

이번 포스팅에서는 **AI 시대에 프론트엔드 엔지니어가 어떻게 성장하고 살아남을 수 있을까**에 대한 이야기를 해보려고 한다.

[이전 글](/posts/250520)에서 필자는 프론트엔드 엔지니어의 커리어를 _웹 특화_, _제품 특화_, _운영 특화_ 라는 세 가지 트랙으로 나누어 정리한 적이 있다. 그 때만 해도 트랙별로 어떤 역량을 쌓을지 고민하는 게 가장 큰 화두였다. 그런데 그 글을 쓴 지 채 1년도 지나지 않아 화두 자체가 완전히 바뀌어버렸다. (한 해 사이에 이렇게 풍경이 바뀐 적이 있나 싶다)

요즘 주니어 프론트엔드 엔지니어들과 이야기를 나누다 보면, 작년에 듣던 고민과는 결이 좀 다르다는 걸 느낀다.

- "회사에서 Cursor 도입했는데, 디자인 시안 던지면 거의 다 만들어줍니다. 그러면 저는 이제 뭘 하면 되는 거죠?"
- "주니어 채용이 확 줄었다는데, 저는 어떻게 살아남나요?"
- "AI가 짜준 코드를 그냥 머지하기는 무섭고, 일일이 검토하자니 차라리 제가 짜는 게 빠른 것 같습니다."

필자도 비슷한 시기를 겪었고 지금도 겪고 있다. 1년 전 글을 쓸 때만 해도 ‘AI는 좋은 보조 도구’ 정도로 생각했는데, 지금은 _AI 없이 개발하는 모습 자체가 상상이 안 가는_ 환경이 되어버렸다(필자도 이 글을 쓰면서 Claude한테 리서치를 부탁하고 있다). 이번 글은 작년 글의 후속편 격으로, 그 사이에 풍경이 어떻게 바뀌었는지, 그리고 그 바뀐 풍경 위에서 프론트엔드 엔지니어로서 어떤 역량을 더 쌓아야 하는지를 정리해보려 한다.

이번에도 자료를 가능한 한 많이 찾아 검증해보려 노력했지만, 워낙 빠르게 변하는 분야인 만큼 이 글이 나간 시점에 이미 일부 내용이 낡아 있을 수 있음을 미리 양해 바란다. 반박이나 토론할 거리가 있다면 언제든 댓글로 알려주시길.

---

## "이제 AI가 다 해주는 거 아니에요?"

먼저 짚고 가야 할 게 있다. _"AI가 다 해준다"_ 라는 문장은 사실인가? 어디까지 사실이고, 어디서부터는 환상인가?

### Vibe Coding에서 Agentic Engineering으로

2025년 2월, OpenAI 공동창업자이자 테슬라 AI 디렉터를 지낸 [Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383)는 자신의 트위터에 이런 문장을 남겼다.

> "There's a new kind of coding I call 'vibe coding', where you fully give in to the vibes, embrace exponentials, and forget that the code even exists."
> ("바이브 코딩이라는 새로운 방식이 있다. 바이브에 완전히 몸을 맡기고, 지수적 성장을 받아들이며, 코드 자체가 존재한다는 것을 잊는 것이다.")

**바이브 코딩(Vibe Coding)** 이란 한마디로 _"AI에게 키보드를 넘기고 원하는 걸 자연어로 묘사하기만 하는 코딩 방식"_ 이다. 아키텍처 문서도, 보일러플레이트도, 세미콜론 검색도 없다. 그저 바이브로 코드가 굴러간다. 이 용어는 1년도 안 되어 영어권 개발자 커뮤니티 표준 어휘로 자리잡았다.

그런데 정확히 1년 후인 2026년 2월, 같은 Karpathy가 [한 발 물러섰다](https://thenewstack.io/vibe-coding-is-passe/). 그는 vibe coding이라는 단어를 **"agentic engineering"** 으로 대체하자고 제안한다. 둘의 차이는 분명하다.

- **Vibe coding**: 원하는 걸 묘사하고 결과물을 받아들이는 것
- **Agentic engineering**: _시스템을 설계하고, 제약을 명세하고, 이미 머릿속에서 추론을 마친 구현을 AI로 가속화하는 것_

1년 전엔 "그냥 시키면 다 만들어줍니다"가 멋이었다면, 지금은 _"AI에게 무엇을 어떻게 시킬지를 설계하는 능력"_ 자체가 엔지니어링 역량으로 자리잡고 있다. 이 흐름은 단순히 한 사람의 트윗이 아니다. 같은 시기 구글의 엔지니어 [Addy Osmani](https://addyosmani.com/)는 [_Beyond Vibe Coding: From Coder to AI-Era Developer_](https://www.amazon.com/Beyond-Vibe-Coding-AI-Era-Developer/dp/B0F6S5425Y)라는 책을 출간하며 _"AI는 비서일 뿐 자율적으로 신뢰할 수 있는 코더가 아니다. 당신이 시니어 개발자고, LLM은 당신의 판단을 가속화하기 위해 존재한다"_ 라고 못박았다.

### 도구는 폭주하고 있다

도구 진영도 이 흐름에 맞춰 빠르게 진화 중이다. 2026년 5월 기준 현장에서 가장 많이 언급되는 코딩 도구는 대략 이 정도다.

- **[Cursor](https://cursor.com/)** — IDE 자체가 AI 네이티브로 설계된 에디터. Anysphere가 만들었으며 Lee Robinson이 [Vercel을 떠나 합류한 곳](https://leerob.substack.com/p/a-new-chapter)이기도 하다.
- **[Claude Code](https://www.anthropic.com/claude-code)** — Anthropic이 만든 CLI 기반 코딩 에이전트. 백엔드 로직과 스크립트 작성에 특히 강하다.
- **[GitHub Copilot](https://github.com/features/copilot)** — 시장을 처음 열어젖힌 도구. 이제는 채팅, 에이전트 모드, IDE 통합까지 전부 지원.
- **[v0 by Vercel](https://v0.dev/)** — UI 컴포넌트 및 풀스택 앱 생성에 특화. 이미 400만 명 이상이 사용했고, 2026년 2월 [재출시되며 Git 통합과 VS Code 스타일 에디터를 갖춰 프로토타입을 넘어 프로덕션 영역으로](https://venturebeat.com/infrastructure/vercel-rebuilt-v0-to-tackle-the-90-problem-connecting-ai-generated-code-to) 들어왔다.
- **[Windsurf](https://codeium.com/windsurf)** — Codeium에서 만든 에이전트 IDE.
- **[Bolt.new](https://bolt.new/)**, **[Lovable](https://lovable.dev/)**, **[Replit Agent](https://replit.com/)** — 자연어 프롬프트만으로 전체 앱을 만들어주는 '제로 코드' 진영.
- **[Devin](https://devin.ai/)** — Cognition이 만든 자율 에이전트로, "AI 소프트웨어 엔지니어"를 표방.

특히 v0의 변화가 상징적이다. Vercel은 [_"90% problem"_](https://venturebeat.com/infrastructure/vercel-rebuilt-v0-to-tackle-the-90-problem-connecting-ai-generated-code-to)이라는 표현을 쓰는데, 현실 개발의 90%는 _기존 코드베이스와 기존 인프라 안에서 일어난다_ 는 뜻이다. 처음엔 그린필드 프로토타입만 잘 만들면 됐던 v0가, 이제는 GitHub 저장소를 직접 가져와 작업하고, 디자인 시스템을 강제하며, 배포 환경 변수를 자동으로 끌어다 쓴다. _"AI는 장난감 같은 데모만 잘 만들지 않냐"_ 라는 시니어들의 반론에 도구 진영이 직접 답하고 있는 셈이다.

빅테크의 코드베이스가 이 변화를 가장 잘 보여준다.

- **Google**: Sundar Pichai가 [2024년 10월 Q3 어닝콜에서 _"새로운 코드의 25% 이상이 AI 생성 후 엔지니어가 리뷰·승인한 것"_ 이라고 발표](https://fortune.com/2024/10/30/googles-code-ai-sundar-pichai/)했고, 2025년 4월에는 _30%+_ 로 늘었다고 했다.
- **Microsoft**: Satya Nadella가 [2025년 4월 LlamaCon에서 _"우리 코드의 최대 30%가 AI가 짠 코드"_ 라고 공개](https://www.cnbc.com/2025/04/29/satya-nadella-says-as-much-as-30percent-of-microsoft-code-is-written-by-ai.html)했다(_"Python은 fantastic, C++는 not that great"_ 라며 언어별 편차도 인정했다).
- **Meta**: 사내 목표가 _"2026년 상반기까지 65%의 엔지니어가 커밋의 75% 이상을 AI로 생성"_ 한다는 수준까지 올라왔다.
- **Salesforce**: 마크 베니오프가 _"2025년에는 소프트웨어 엔지니어 채용이 없다"_ 라고 [선언](https://sfstandard.com/2025/02/27/salesforce-marcbenioff-layoffs-tech-agents/)할 정도. 사내 엔지니어링 속도가 30% 상승했다는 것이 이유다.

국내에서도 흐름은 다르지 않다. [토스](https://toss.tech/article/toss-frontend-ai-docs)는 _"개발자가 더 이상 문서를 찾지 않게"_ 만들기 위해 AI 기반 문서 시스템을 구축했고, 한 발 더 나가 [_"AI 시대, 디자이너를 없앴더니 생긴 일"_](https://toss.tech/article/removing_designers_in_ai_era) 같은 도발적 글까지 공개했다. 당근은 매주 화요일 [AI Show & Tell](https://medium.com/daangn)로 팀별 실험을 공유하고, _"엔지니어를 넘어 빌더로"_ 라는 [채용 슬로건](https://about.daangn.com/blog/archive/%EB%8B%B9%EA%B7%BC-%ED%95%B4%EC%BB%A4%ED%86%A4-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%B1%84%EC%9A%A9/)을 내걸기 시작했다. 우아한형제들은 [_"AI가 코드 짜는 시대, 그래도 개발자가 되시겠습니까?"_](https://techblog.woowahan.com/22828/) 같은 글을 통해 _"개발자의 본질은 코드가 아니라 문제를 정의하고 해결하는 능력에 있다"_ 라는 메시지를 내놓고 있다.

### 그런데 숫자는 좀 다른 이야기를 한다

여기까지만 보면 _"이제 그냥 시키면 다 되는구나"_ 라는 결론으로 향하기 쉽다. 그런데 실제 데이터를 들여다보면 이야기가 조금 다르다.

[**2025 Stack Overflow Developer Survey**](https://survey.stackoverflow.co/2025/ai)의 숫자를 먼저 보자.

- 84%의 개발자가 AI 도구를 사용하거나 사용 예정이라고 답했다 (2024년 76% 대비 상승).
- 전문 개발자 중 51%가 _매일_ AI 도구를 쓴다.
- 그런데 **AI 도구에 대한 호감도(positive sentiment)는 오히려 떨어졌다**. 2023, 2024년 70% 이상이었던 호감도가 2025년에는 60%까지 내려왔다.
- 10년 이상 경력 시니어 개발자들이 AI 출력물에 대한 신뢰도가 _가장 낮다_.

요약하면 _"쓰긴 다 쓰는데, 시간이 갈수록 더 못 미덥다"_ 는 거다. (속된 말로 "신혼은 끝났다" 정도 되겠다)

[**METR**](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)이라는 비영리 연구소에서 2025년에 진행한 실험은 이 인식과 현실의 간극을 더 극적으로 보여준다. 평균 5년 경력 + 평균 1,500커밋의 숙련된 오픈소스 개발자 16명에게 246개 작업을 시키고, 무작위로 AI 사용 여부를 배정한 통제 실험이었다. 결과는 다음과 같다.

- 시작 전 개발자들은 _"AI를 쓰면 24% 빨라질 것"_ 이라고 예측했다.
- 작업을 마친 직후에도 _"20% 정도 빨라진 것 같다"_ 고 자평했다.
- 그런데 실제 측정값은 **19% 더 느려졌다**.

연구진이 짚은 원인은 흥미롭다. AI가 생성한 코드의 _수용률이 44% 이하_ 였고, 거절된 코드도 검토와 테스트엔 시간이 들었으며, 수용된 코드조차 _리뷰와 수정에 상당한 시간_ 이 들었다는 것이다. _느려졌는데 빨라진 것 같은 착각_, 이 간극이 시니어 개발자들이 AI를 점점 더 회의적으로 보는 이유 중 하나다.

여기에 _"AI가 짜는 코드의 품질"_ 자체도 매끈하지 않다. [**Veracode**](https://www.veracode.com/blog/genai-code-security-report/)가 100개 이상의 AI 모델에게 코드를 짜게 시킨 실험을 보자.

- AI 생성 코드의 **45%가 OWASP Top 10 보안 취약점**을 포함했다.
- **XSS(크로스 사이트 스크립팅) 방어에 실패한 비율은 86%**.
- 로그 인젝션(Log Injection) 방어 실패율은 88%.
- 다른 연구에서는 AI 코드의 취약점 밀도가 인간 코드 대비 **2.7배 높다**고 보고됐다.

특히 프론트엔드와 직결된 XSS 86% 실패는 좀 더 무겁게 받아들일 만하다. _AI가 짜준 form input을 그대로 머지하는 행위_ 가 어떤 의미인지, 이 숫자가 잘 보여준다. (`dangerouslySetInnerHTML`을 본인이 직접 쓸 때도 발작버튼이 눌리는데, AI가 슬쩍 끼워넣은 건 더 무섭다)

품질 면에서도 신호는 비슷하다. [**GitClear**](https://www.gitclear.com/ai_assistant_code_quality_2025_research)가 2020~2024년 사이 2억 1,100만 줄의 코드 변경을 분석한 결과는 이렇다.

- _작성 후 2주 안에 되돌려진(reverted) 코드 비율(Code Churn)_: 2020년 5.5% → 2024년 **7.9%**
- _리팩토링이 차지하는 비율_: 2021년 25% → 2024년 **10% 미만**
- _복사·붙여넣기(클론) 비율_: 2021년 8.3% → 2024년 **12.3%** (2025년에는 무려 4배 증가)

해석은 그리 어렵지 않다. _코드를 빠르게 찍어내는 능력은 늘었는데, 다시 손볼 만한 코드를 짜는 능력은 줄었다_ 는 뜻이다. Fortune 50 기업들을 분석한 [Apiiro의 데이터](https://www.softwareseni.com/ai-generated-code-security-risks-why-vulnerabilities-increase-2-74x-and-how-to-prevent-them/)는 더 강하게 나온다. AI 보조 개발자들은 동료 대비 _커밋은 3~4배_ 찍어내지만, _보안 finding은 10배_ 더 만든다. _권한 상승 경로(privilege escalation)는 +322%, 아키텍처 설계 결함은 +153%_ 로 폭증했다.

---

## AI는 무엇을 대체했고, 무엇은 대체하지 못했는가

도구는 폭주하지만 숫자는 미묘하다. 그렇다면 _AI는 정확히 무엇을 대체했고, 무엇은 아직 대체하지 못했는가_? 이 구분이 명확해야 우리가 어디에 시간을 투자해야 할지가 보인다.

### 대체된 것 — "타이핑"의 비중

- **보일러플레이트와 반복 코드**: form 컴포넌트, CRUD 화면, 단순 컴포넌트 분리, 타입 정의는 사실상 AI 영역이다.
- **첫 번째 작동하는 버전**: 디자인 시안만 던지면 80% 수준의 화면은 1분 안에 나온다.
- **문법과 API 검색**: _"이 메서드 시그니처가 뭐였더라"_ 를 위해 MDN을 뒤지던 시간은 사라졌다.
- **러닝 커브의 첫 절벽**: 익숙하지 않은 라이브러리를 사용할 때 AI에게 예시 코드를 물어보는 게 가장 빠르다.

요컨대 AI는 **'생산의 속도'를 평탄화**했다. 1년차나 10년차나, 첫 버전을 찍어내는 속도는 거의 비슷해졌다고 봐도 무방하다.

### 대체되지 못한 것 — "판단"의 영역

반면 AI가 잘 못하거나, 아예 손을 못 대는 영역이 있다.

- **요구사항을 명세로 번역하는 일**: 모호한 비즈니스 요구를 정확한 엣지 케이스와 상태 머신으로 옮기는 작업
- **시스템 차원의 영향 파악**: 이 컴포넌트가 번들에 미치는 영향, 의존성이 트리쉐이킹 가능한지, 데이터 페칭 패턴이 [Core Web Vitals](https://web.dev/articles/vitals)의 [INP(Interaction to Next Paint)](https://web.dev/articles/inp)에 미치는 영향 등
- **보안과 위험 평가**: 위에서 본 45% OWASP 취약점 문제
- **디자인 시스템과 일관성 유지**: 새 컴포넌트가 기존 시스템의 토큰, 접근성 규칙, 인터랙션 패턴과 정렬되는지
- **고객/시장 맥락 이해**: 왜 이 기능이 필요한지, 어떤 유저 플로우에 끼워넣어야 하는지
- **인지 부채(Cognitive Debt) 관리**: [yceffort 님의 글](https://yceffort.kr/2026/02/frontend-engineering-in-ai-era)에서 인용하자면, _"시스템의 복잡도와 팀이 그 시스템을 이해하는 정도 사이의 격차"_

[yceffort 님](https://yceffort.kr/2026/02/frontend-engineering-in-ai-era)의 표현을 한 번 더 빌리면 이렇게 정리할 수 있다.

> "없어지는 건 개발자가 아니라, 개발자가 하던 일의 형태다."
> "병목이 '만드는 속도'에서 '결정하는 속도'로 옮겨갔다."

같은 맥락에서, 토스의 [_"개발자는 AI에게 대체될 것인가"_](https://toss.tech/article/will-ai-replace-developers)는 좀 더 묵직한 진단을 내놓는다. 글의 요지는 이렇다. _AI는 모든 인력을 대체하는 게 아니라 견습 사다리(apprenticeship ladder)를 제거하고 있다. 지금 시니어들이 은퇴할 10~20년 후에는 복잡한 시스템을 설계할 차세대 인력이 부족해질 것이다._ 이건 _"우리 회사 내년 채용 어떡할까"_ 차원이 아니라 _업계 전체의 시간차 폭탄_ 같은 문제다. (필자도 이 문장을 처음 봤을 때 한참 멍해졌다)

[Addy Osmani](https://addyo.substack.com/p/beyond-the-70-maximizing-the-human)는 이걸 더 깔끔하게 표현한다. **70% problem** 이다.

> "AI는 문제의 70%까지 데려가 준다. 그러나 마지막 30%가 데모와 프로덕션을 가른다. 그게 진짜 엔지니어링이다."

AI가 만들어주는 _"동작은 하는 첫 버전"_ 은 70%다. _"실제 사용자에게 서비스해도 되는 버전"_ 까지 가는 30%가 사람의 영역이다. 그리고 그 30%를 채우는 능력은 _하루아침에 생기지 않는다_. 이게 견습 사다리 문제의 본질이다. 보일러플레이트와 단순 컴포넌트를 짜며 _"손을 더럽히는 시간"_ 이 사라지면, 그 30%를 채울 사람도 같이 사라진다.

이전 글에서 필자는 _'탁월한 엔지니어의 5가지 역량'_ 중 하나로 [_"꾸준히 학습한다"_](https://digital.lib.washington.edu/researchworks/bitstream/handle/1773/37160/Li_washington_0250E_16239.pdf)를 꼽았다. 이건 여전히 유효하다. 다만 _학습의 대상이 바뀌었다_. 예전엔 _"이 API를 어떻게 쓰지"_ 를 배웠다면, 이제는 _"이 시스템 전체가 어떻게 굴러가는지"_ 를 배우는 데 시간을 써야 한다. 더 무서운 건 [Evan Moon 님이 짚은](https://evan-moon.github.io/2026/04/18/developers-who-stopped-growing-in-ai-era/) _"AI가 코드 작성을 대신하는 순간 뇌의 인지적 부하가 급격히 줄어드는 문제"_ 다. 인지적 부하가 줄어든다는 건 듣기엔 좋지만, _그 부하가 곧 학습의 재료_ 였다는 점에서 위험하다. 편해질수록 안 자란다.

---

## 작년의 3가지 트랙은 어떻게 진화하는가

여기서 자연스럽게 떠오르는 질문이 하나 있다. _그러면 작년에 정리했던 세 가지 트랙(웹 특화/제품 특화/운영 특화)은 이제 의미가 없는 걸까?_

필자의 생각은 다르다. 트랙 자체는 여전히 유효하다. 다만 각 트랙이 _AI 시대에 맞춰 한 단계씩 진화_ 했다고 보는 게 맞다. 트랙별로 어떻게 풍경이 바뀌었는지 정리해보자.

### 웹 특화 트랙: 생산자에서 '검증자'로

웹 특화 엔지니어는 원래 _"브라우저와 HTML/CSS/JS의 동작 원리를 깊이 파는 사람들"_ 이었다. 작년까지 이들의 가장 큰 무기는 _"그 누구보다 정확하게 코드를 짤 수 있다"_ 였다.

AI 시대에 이들의 가치는 어떻게 바뀌었을까? _코드 짜는 속도_ 만 놓고 보면 AI가 따라잡았다. 그러나 **'AI가 짜준 코드를 정확히 평가할 수 있는 능력'** 은 오히려 이들이 거의 독점하다시피 한다.

```text
주니어 (AI 활용):   "동작하니까 됐다"
웹 전문가 (AI 활용): "동작은 하지만 이 의존성은 트리쉐이킹이 안 되고,
                  이 페치 패턴은 INP 점수를 깎아먹는다. 다시 짜자."
```

위 Veracode 연구에서 XSS 86%, 로그 인젝션 88% 실패라는 숫자가 있었다. _이 숫자를 발견하고 잡아낼 수 있는 사람_ 이 바로 웹 전문가다. 이들은 _AI 생산물의 품질 관리(QA) 시니어_ 역할로 자연스럽게 진화한다.

또 한 가지, 웹 전문가들의 영역에 _완전히 새로운 토픽_ 이 추가됐다. **생성형 UI(Generative UI)** 와 **AI 인터페이스 디자인** 이다. LLM 응답을 스트리밍으로 그려주는 채팅 UI, 도중에 멈출 수 있는 abort 컨트롤, 마크다운/코드 블록 점진적 렌더링, 도구 호출 결과를 inline으로 표시하는 UX, [Vercel AI SDK](https://sdk.vercel.ai/)나 [MCP(Model Context Protocol)](https://modelcontextprotocol.io/)를 활용한 어시스턴트 통합 등이 그 예다. 이 영역에서 _"웹의 동작 원리를 정확히 알면서 동시에 LLM 동작 특성도 이해하는 사람"_ 의 수요가 폭발하고 있다.

### 제품 특화 트랙: 'Product Engineer'로의 자연스러운 진화

제품 특화 트랙은 가장 큰 수혜를 받은 트랙이다. _"적은 양의 코딩으로 여러 도구를 조합해 초기 성과를 만든다"_ 는 작년의 정의는, AI를 끼얹은 순간 _훨씬 강력한 무기_ 가 됐다.

흥미로운 변화는 이 트랙에 새 이름이 붙기 시작했다는 것이다. **Product Engineer**. 작년에 필자는 이 표현을 _"제품 특화 프론트엔드 엔지니어의 또 다른 이름"_ 정도로 가볍게 짚었었는데, 1년이 지난 지금은 [Vercel이 직무 기술서의 'Fullstack Engineer'를 'Product Engineer'로 일괄 변경하는 수준](https://leerob.com/product-engineers)이 됐다.

[Lee Robinson](https://leerob.com/product-engineers)이 정의하는 Product Engineer는 이렇다.

> "Product Engineers work backwards from the desired product experience to the set of technologies that enable it."
> ("Product Engineer는 원하는 제품 경험에서 역으로, 그것을 가능하게 하는 기술들을 찾아낸다.")

핵심 자질로 그는 세 가지를 꼽는다.

1. **반복(Iteration) 주의**: 배포 → 피드백 → 조정의 사이클을 빠르게 돈다.
2. **고객 중심성**: 고객과 직접 대화하며 제품을 개선한다.
3. **실용성**: _"기술 선택은 모두 수단일 뿐"_ 이다. 제품 목표에 기여하지 않는 도구는 과감히 버린다.

여기서 한 가지 함정. 작년 글에서도 짚었지만, 제품 특화 엔지니어는 _"빠르게 만드는 사람"_ 으로만 인식되면 위험하다. AI가 등장한 지금은 그 위험이 더 커졌다. _"기능 빠르게 박는 일"_ 은 이제 다른 어떤 직군이라도 v0와 Cursor로 할 수 있기 때문이다. Product Engineer의 차별점은 _"고객 문제를 정확히 정의하고, 가장 작은 솔루션으로 빠르게 검증하는 능력"_ 에 있지, _"손이 빠른 것"_ 에 있지 않다.

흥미로운 곁가지 하나. 이 흐름에서 **Design Engineer** 라는 직군이 정식 포지션으로 격상되기 시작했다. Vercel은 [디자인 엔지니어를 연봉 $200K+의 정식 트랙](https://cjroth.com/blog/2026-02-18-building-an-elite-engineering-culture)으로 채용 중이고, Linear, Stripe도 비슷한 방향으로 움직인다. _프론트엔드와 디자인 사이의 핸드오프 자체를 없애는_ 직군이다. AI가 그림은 빠르게 그려주니, _"무엇을 그릴지 + 그려진 결과가 일관된 디자인 시스템에 맞는지"_ 를 동시에 다루는 역량이 더 희소해진 결과다.

### 운영 특화 트랙: 'AI 오케스트레이터'로

운영 특화 트랙은 가장 극적으로 변하고 있는 트랙이다. 작년에는 _"빈틈을 메우고 자동화로 조직을 굴리는 사람"_ 정도였다면, 이제는 **AI 에이전트 자체를 운영하는 역할** 까지 포함하게 됐다.

[Addy Osmani](https://beyond.addy.ie/2026-trends/)는 2026년 트렌드를 정리하면서 _"오케스트레이팅 코딩 에이전트(Orchestrating Coding Agents)"_ 라는 개념을 핵심으로 꼽았다. 이는 _하나의 AI에게 시키는 것_ 을 넘어 _여러 AI 에이전트를 동시에 협업시키는 시스템_ 을 설계하고 운영한다는 의미다. 같은 맥락에서 그는 [_"agent-skills"_](https://github.com/addyosmani/agent-skills)라는 프레임워크를 제안하며, 프로페셔널 워크플로우와 품질 게이트, 산업 베스트 프랙티스를 _에이전트의 동작 로직에 직접 인코딩하자_ 고 주장한다.

운영 트랙 엔지니어가 새로 다뤄야 할 키워드를 나열해보면 이렇다.

- **MCP(Model Context Protocol)** — Anthropic이 제안한 LLM과 외부 도구 연결 표준
- **AI 거버넌스** — 누가 어떤 컨텍스트로 AI를 쓸 수 있는지, 시크릿이 새지 않는지 관리
- **에이전트 평가(Evaluation)** — 에이전트가 만들어낸 결과물을 자동으로 채점하는 파이프라인
- **AI 게이트** — PR 머지 전 자동 보안/품질 검증, AI 코드 라벨링
- **개발 환경의 표준화** — Devcontainer, Docker, agent-friendly한 모노레포 구조

작년 글에서 운영 트랙의 끝에는 _CTO, VP of Engineering_ 같은 커리어가 있다고 적었다. 그건 지금도 유효하지만, 거기에 **'AI 개발 인프라 리드'**, **'개발자 생산성(DevProd) 엔지니어'** 같은 새 자리가 추가됐다고 보면 된다.

---

## 세 트랙을 관통하는 5가지 새 역량

세 트랙이 각자 진화하는 한편, **모든 트랙에서 공통으로 더 중요해진 역량** 이 있다. 필자가 보기엔 다섯 가지다.

### 1. 명세(Specification) 작성 능력

AI 시대의 _"코딩의 시작점"_ 은 키보드가 아니라 **명세** 다. _AI에게 무엇을 시킬지_ 를 정확히 적어내는 능력이 코드 그 자체보다 중요해졌다.

여기서 명세란 거창한 RFC 문서가 아니다.

- **테스트**: 비즈니스 로직의 기대 동작을 코드로 적은 것
- **스토리북(Storybook) 스토리**: UI 컴포넌트의 시나리오와 시각적 명세
- **타입 정의**: 데이터 흐름의 계약

[yceffort 님](https://yceffort.kr/2026/02/frontend-engineering-in-ai-era)의 표현으로는 _"'테스트를 먼저 쓴다'를 '명세를 먼저 정의한다'로 확장해서 생각"_ 하면 된다. 결국 _AI가 만든 결과물을 자동으로 검증할 수 있는 기준_ 을 미리 깔아두는 작업이다. 이게 빠진 상태에서 vibe coding을 돌리면, 위에서 본 19% 느려짐과 45% 보안 취약점이 정확히 누적된다.

### 2. 검증과 판단력

AI는 _그럴듯하지만 틀린 코드_ 를 자신있게 만들어낸다. 그래서 _"AI 코드를 빠르고 정확히 검토하는 능력"_ 자체가 시니어성의 핵심으로 떠올랐다.

검증할 때 시니어가 보는 체크포인트는 대략 이런 것들이다.

- 의존성을 새로 끌어왔는가, 트리쉐이킹은 되는가
- 같은 일을 하는 기존 유틸이 있는데 중복으로 만들지는 않았는가
- 보안 헤더, 인풋 sanitization, CSRF 토큰 등을 빠뜨리진 않았는가
- 접근성(ARIA, 키보드 내비게이션, 포커스 트랩)을 처리했는가
- 성능 영향(렌더 비용, 메모리, 번들 사이즈)을 고려했는가
- 에러 바운더리와 로딩/실패 상태가 사용자 입장에서 합리적인가

[Simon Willison](https://simonwillison.net/2025/Dec/18/code-proven-to-work/)이 더 단호한 표현을 쓴다. _"검토 없이 AI slop을 PR에 던지는 것은 엔지니어로서의 직무유기(dereliction of duty)"_ 라고. 머지 버튼을 누르는 사람은 여전히 사람이고, 그 책임은 _AI에게 떠넘길 수 없다_ 는 이야기다. 이 흐름은 그저 슬로건이 아니다. Stack Overflow 설문에서 시니어들의 AI 신뢰도가 가장 낮은 이유도 _이런 디테일을 잡아내는 눈을 가지고 있기 때문_ 일 가능성이 높다.

### 3. 시스템 이해와 아키텍처 사고

AI는 한 번에 한 파일을 잘 다룬다. 그러나 _시스템 전체의 흐름_ — 데이터가 어떤 경로로 흘러가는지, 어떤 컴포넌트가 어떤 컨텍스트를 들고 있는지, 어떤 모듈이 어떤 사이드 이펙트를 만드는지 — 은 사람이 더 잘 본다(아직은).

작년 글에서 시니어의 조건 중 하나로 _"버그가 났을 때 다각적으로 문제를 해결하는 사람"_ 을 꼽았었다. AI 시대에는 이게 더 중요해진다. _AI는 증상을 빠르게 고친다. 시니어는 근본 원인을 찾는다._

이 역량을 키우는 방법은 결국 _"매주 아키텍처 회고(Architecture Retrospective)"_ 같은 의식적 활동이다. 코드의 변화 속도가 빨라진 만큼, _팀의 시스템 이해도_ 도 의식적으로 끌어올리지 않으면 빠르게 인지 부채가 누적된다.

### 4. AI 오케스트레이션 능력

_AI 자체를 다루는 역량_ 도 별도의 스킬셋으로 분리되고 있다. 단순히 _프롬프트를 잘 쓴다_ 의 차원이 아니다.

- 작업을 작은 티켓으로 잘게 쪼개는 능력 (Osmani가 강조하는 _"하나씩 시켜라"_)
- 같은 작업에 어떤 모델을 쓸지 고르는 능력 (Opus냐 Sonnet이냐, 추론형이냐 빠른형이냐)
- 에이전트 평가/검증 파이프라인 설계 능력
- 에이전트 실패 시 회복(rollback) 전략

[Steve Yegge](https://sourcegraph.com/blog/revenge-of-the-junior-developer)는 이 흐름을 6개의 wave로 정리한다. _traditional(~2022) → completions(2023) → chat(2024) → coding agents(2025 상반기) → agent clusters(2025 하반기) → agent fleets(2026)_. 단일 AI에게 시키던 시대에서 _여러 에이전트를 함대처럼 운영하는 시대_ 로 이미 진입했다는 게 그의 주장이다(과장이 좀 있어 보이지만, 큰 흐름은 부정하기 어렵다).

이 영역은 _아예 새로 생긴 시장_ 이라 책이나 강의가 따라오지 못하고 있다. 그래서 _실제로 도구를 깊이 써본 경험_ 이 가장 큰 자산이 된다.

### 5. Context Engineering — AI에게 무엇을 보여줄지 설계하는 능력

마지막으로, 2025년 중반부터 [Karpathy와 Shopify CEO Tobi Lütke가 함께 밀기 시작한](https://www.faros.ai/blog/context-engineering-for-developers) 새 개념이 있다. **Context Engineering**. _"AI에게 어떤 컨텍스트를 어떤 형태로, 얼마나 보여줄지를 설계하는 능력"_ 이다.

좋은 컨텍스트 엔지니어링은 다음과 같은 모양을 띤다.

- **CLAUDE.md / rules 파일**: 프로젝트 컨벤션, 아키텍처 원칙, 금기 사항을 _AI 손이 닿는 곳_ 에 정리해두기
- **컨텍스트의 의도적 축소**: 모든 파일을 컨텍스트에 넣는 대신, 관련 모듈만 선별해서 보여주기 (모델은 컨텍스트가 길수록 _중간 부분을 잊는다_)
- **명시적 단계 분리**: _계획 → 구현 → 검증_ 을 별도 세션으로 운영하여 컨텍스트 오염 방지
- **MCP를 통한 외부 컨텍스트**: 디자인 시스템, API 스키마, 모니터링 데이터 등을 표준 인터페이스로 AI에 연결

[Anthropic의 공식 문서](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)는 이를 _"the new prompt engineering"_ 이라 부르며, 단일 프롬프트로는 시스템의 아키텍처 지식·패턴·tribal wisdom을 절대 담을 수 없다고 못박았다. 다시 말해, _"한 번에 좋은 프롬프트를 짜는 것"_ 보다 _"AI가 항상 좋은 컨텍스트를 받게 환경을 설계하는 것"_ 이 훨씬 더 중요해졌다는 뜻이다.

---

## AI 시대 프론트엔드 엔지니어의 학습 전략

여기까지 읽었다면 자연스러운 질문이 나온다. _그러면 구체적으로 어떻게 공부하면 되는데?_ 필자가 요즘 주변 엔지니어들에게 권하는 방법은 대략 네 가지다.

### 1) AI를 '비서'가 아니라 '페어 프로그래머'로 다뤄라

비서는 시킨 일을 한다. 페어 프로그래머는 _내가 짠 코드도 같이 본다_. 단순히 _"이 함수 짜줘"_ 가 아니라 _"이 함수의 테스트를 먼저 짜고, 내가 짠 본문이 그 테스트를 통과하는지 봐줘"_, _"내가 짠 이 코드의 약점이 뭐 있어 보여? 보안, 성능, 가독성 순으로"_ 같은 방식으로 쓰는 게 좋다.

이렇게 하면 두 가지 효과가 있다. **첫째**, AI에게 '검증자' 역할을 시키면서 본인의 역량은 _'설계자'_ 쪽으로 키울 수 있다. **둘째**, AI가 미처 못 본 _도메인 맥락과 시스템 사이드 이펙트_ 를 본인이 다뤄야 하기 때문에 시스템 이해도가 자연스럽게 자란다.

### 2) AI에게 '빼앗긴' 영역에서 다른 영역으로 시간을 이동시켜라

작년 글의 _"꾸준히 학습한다"_ 항목은 여전히 유효하지만, _학습 시간의 배분_ 이 달라져야 한다.

- _전엔 시간을 많이 썼지만 이제 줄여도 되는 영역_: 보일러플레이트 작성, 익숙한 라이브러리 사용법 암기, 단순 컴포넌트 분리 패턴 외우기
- _전엔 안 했지만 이제 시간을 늘려야 하는 영역_: 명세 작성(테스트/스토리/타입), 디자인 시스템 설계, 성능 측정 도구 사용([Lighthouse](https://developer.chrome.com/docs/lighthouse), [WebPageTest](https://www.webpagetest.org/), Chrome DevTools Performance), 접근성([WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)), 보안(특히 [OWASP Top 10](https://owasp.org/www-project-top-ten/))
- _완전히 새롭게 익혀야 하는 영역_: Vercel AI SDK, LangChain.js, MCP, 스트리밍 UI 패턴, 에이전트 평가 파이프라인

### 3) 작은 PR과 잦은 검증 사이클을 강제로 만들어라

AI가 만들어내는 코드는 _크기가 커지기 쉽다_. 1분에 200줄을 뽑아낸다. 그래서 _PR 사이즈와 머지 주기를 의식적으로 관리_ 하지 않으면 코드 리뷰 자체가 무너진다. [Qodo의 분석](https://www.qodo.ai/blog/5-ai-code-review-pattern-predictions-in-2026/)을 보면 AI 도입 이후 _PR 크기 +18%, PR당 인시던트 +24%, 변경 실패율 +30%_ 가 보고됐다. 위에서 본 GitClear의 churn 데이터와 함께 보면 메시지는 분명하다. _크게 짜고 한 번에 머지하면 망한다_.

### 4) "AI를 끄는" 시간을 의식적으로 확보하라

Evan Moon 님이 짚은 인지적 부하 감소 문제와 직결되는 이야기다. _하루에 한두 시간은 AI 없이 코드를 짜는 시간_ 을 따로 확보하는 게 좋다. 아키텍처를 손으로 그려보거나, 익숙하지 않은 영역의 코드를 직접 한 줄씩 읽어보는 활동이 그 예다. (필자도 매주 일요일 오전은 _AI 없이 사이드 프로젝트 보는 시간_ 으로 비워둔다)

이게 단순히 _"옛 방식을 잊지 않기 위해"_ 가 아니다. 토스의 _"견습 사다리 소멸"_ 진단처럼, _AI가 대신 해주는 시간만큼 본인의 깊이도 자라지 않기_ 때문이다. 검증과 판단력, 시스템 이해 같은 역량은 _직접 부딪쳐 본 시간의 함수_ 다.

---

## 그래서 우리는 무엇을 할 것인가

여기까지 길게 적었지만, 사실 _AI 시대에 살아남는 프론트엔드 엔지니어_ 의 모습은 작년 글의 결론과 그렇게 다르지 않다.

작년에 필자가 꼽았던 _좋은 시니어 엔지니어의 세 가지 포인트_ 는 이랬다.

1. 기본에 충실하고자 노력한다.
2. 명시적 리더가 아니더라도 리더처럼 행동한다.
3. 어떤 상황에서든 큰 임팩트를 낸다.

이걸 AI 시대 버전으로 번역하면 이렇게 된다.

1. AI가 만들어주는 코드 너머의 **기본기**(웹, 시스템, 도메인)에 충실하다.
2. AI가 아니라 자신이 _방향을 정한다_. 명시적 책임자가 아닐 때조차 _"어디로 가야 하는지"_ 를 결정한다.
3. AI를 _개인 생산성 도구로만 쓰지 않고, 팀과 시스템의 병목을 푸는 데 쓴다_.

[Karpathy](https://thenewstack.io/vibe-coding-is-passe/)의 표현을 한 번 더 빌리면, 그가 지금 강조하는 _"agentic engineering"_ 의 핵심도 결국 같다. _시스템을 설계하고, 제약을 명세하고, 이미 머릿속에서 추론을 마친 구현을 AI로 가속화하는 것_. 도구가 바뀌어도, _방향키는 여전히 사람 손에 있다_ 는 이야기다.

필자는 1년 전 글의 끝에서 _"작은 일을 맡아도 큰 임팩트를 만드는 사람이 더 큰 일을 맡는다"_ 라고 적었다. AI 시대에는 _"작은 임팩트"_ 의 정의가 달라졌을 뿐이다. AI가 1시간 만에 만들어낸 화면 하나를 _"동작하니까 됐다"_ 로 머지하는 사람과, 그 화면이 _접근성·보안·성능·시스템 정합성_ 면에서 어디까지 합리적인지를 30분 더 살피는 사람이 있다. 1년 뒤 시니어로 인정받는 건 후자다. Addy Osmani가 말한 _70%와 30%의 경계_ 위에서, _30% 쪽에 서 있는 사람_ 이 살아남는다.

이 글을 읽는 프론트엔드 엔지니어 분들도 _"이제 뭘 더 공부해야 하지?"_ 라는 질문에 본인만의 답을 가지고 가셨으면 한다. 정답은 아무도 모르지만, _AI가 코드를 짜는 시대일수록 더_ "코드 너머의 것" _을 보는 사람_ 이 살아남으리라는 점만큼은 필자는 꽤 확신하는 편이다. 1년 뒤 또 한 번 이 풍경이 어떻게 바뀌었을지, 그때 다시 글로 정리해볼 수 있길 바라며 마친다.

(_혹시 이 글이 1년 뒤에는 너무 뻔하거나 낡은 이야기로 보인다면, 그만큼 우리가 잘 적응했다는 뜻이리라_)

---

## 참고 자료

### 핵심 개념과 담론

- [Andrej Karpathy — "vibe coding" 원 트윗](https://x.com/karpathy/status/1886192184808149383)
- [Karpathy의 'agentic engineering' 제안 (The New Stack, 2026)](https://thenewstack.io/vibe-coding-is-passe/)
- [Addy Osmani — Beyond Vibe Coding (책)](https://www.amazon.com/Beyond-Vibe-Coding-AI-Era-Developer/dp/B0F6S5425Y)
- [Addy Osmani — Beyond the 70%: 인간의 30%를 극대화하기](https://addyo.substack.com/p/beyond-the-70-maximizing-the-human)
- [Addy Osmani — 2026 AI Coding Trends](https://beyond.addy.ie/2026-trends/)
- [Addy Osmani — My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/)
- [Simon Willison — Your job is to deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work/)
- [Steve Yegge — Revenge of the junior developer (6 waves)](https://sourcegraph.com/blog/revenge-of-the-junior-developer)
- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Martin Fowler — Context Engineering for Coding Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)
- [Lee Robinson — Product Engineers](https://leerob.com/product-engineers)
- [Lee Robinson — Coding Agents & Complexity Budgets](https://leerob.com/agents)
- [Josh W. Comeau — The End of Front-End Development](https://www.joshwcomeau.com/blog/the-end-of-frontend-development/)

### 통계와 연구

- [2025 Stack Overflow Developer Survey — AI](https://survey.stackoverflow.co/2025/ai)
- [JetBrains — State of Developer Ecosystem 2025](https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/)
- [METR — AI가 숙련 개발자를 19% 느리게 만들었다는 연구](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [DORA Report 2025 — AI는 증폭기](https://services.google.com/fh/files/misc/2025_state_of_ai_assisted_software_development.pdf)
- [GitClear — 2025 AI Assistant Code Quality Research](https://www.gitclear.com/ai_assistant_code_quality_2025_research)
- [Veracode — GenAI Code Security Report (45% OWASP 취약점)](https://www.veracode.com/blog/genai-code-security-report/)
- [SoftwareSeni — AI 코드 취약점 2.74배 증가](https://www.softwareseni.com/ai-generated-code-security-risks-why-vulnerabilities-increase-2-74x-and-how-to-prevent-them/)
- [Stanford Perry et al. — Do Users Write More Insecure Code with AI Assistants?](https://arxiv.org/abs/2211.03622)
- [GitHub Octoverse 2025](https://octoverse.github.com/)
- [Stack Overflow — AI vs Gen Z (주니어 채용 감소 분석)](https://stackoverflow.blog/2025/12/26/ai-vs-gen-z/)

### 도구와 플랫폼

- [Vercel rebuilt v0 — 90% problem (VentureBeat, 2026.02)](https://venturebeat.com/infrastructure/vercel-rebuilt-v0-to-tackle-the-90-problem-connecting-ai-generated-code-to)
- [Cursor changelog & 3 release](https://cursor.com/changelog)
- [Claude Code | Anthropic](https://www.anthropic.com/product/claude-code)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Vercel — Introducing AI SDK 3.0 with Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui)

### 빅테크 사례

- [Sundar Pichai: Google 코드의 25%+가 AI 작성 (Fortune)](https://fortune.com/2024/10/30/googles-code-ai-sundar-pichai/)
- [Satya Nadella: Microsoft 코드의 최대 30%가 AI 작성 (CNBC)](https://www.cnbc.com/2025/04/29/satya-nadella-says-as-much-as-30percent-of-microsoft-code-is-written-by-ai.html)
- [Marc Benioff: Salesforce 2025년 SWE 채용 없음 (SF Standard)](https://sfstandard.com/2025/02/27/salesforce-marcbenioff-layoffs-tech-agents/)
- [Building An Elite AI Engineering Culture In 2026 — Vercel/Stripe 사례](https://cjroth.com/blog/2026-02-18-building-an-elite-engineering-culture)

### 국내 사례와 한국어 자료

- [토스 — 개발자는 AI에게 대체될 것인가](https://toss.tech/article/will-ai-replace-developers)
- [토스 — 프론트엔드 개발자들이 더 이상 문서를 찾지 않는 이유](https://toss.tech/article/toss-frontend-ai-docs)
- [토스 — AI 시대, 디자이너를 없앴더니 생긴 일](https://toss.tech/article/removing_designers_in_ai_era)
- [우아한형제들 — AI가 코드 짜는 시대, 그래도 개발자가 되시겠습니까?](https://techblog.woowahan.com/22828/)
- [당근 — AI Show & Tell #1](https://medium.com/daangn)
- [당근 — Builder's Camp 해커톤 / "엔지니어 → 빌더"](https://about.daangn.com/blog/archive/%EB%8B%B9%EA%B7%BC-%ED%95%B4%EC%BB%A4%ED%86%A4-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%B1%84%EC%9A%A9/)
- [카카오 — AI 시대를 살아갈 개발자들에게](https://tech.kakao.com/posts/735)
- [yceffort — AI가 코드를 짜는 시대, 프론트엔드 엔지니어링은 어디로 가는가](https://yceffort.kr/2026/02/frontend-engineering-in-ai-era)
- [Evan Moon — AI 코딩 시대, 더이상 성장하지 않는 개발자들](https://evan-moon.github.io/2026/04/18/developers-who-stopped-growing-in-ai-era/)
- [컬리 기술 블로그 — Claude Code를 활용한 예측 가능한 바이브 코딩 전략](https://helloworld.kurly.com/blog/vibe-coding-with-claude-code/)

### 웹 표준과 기본기

- [Web Vitals — INP (Interaction to Next Paint)](https://web.dev/articles/inp)
- [Core Web Vitals — Google Search Central](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [WCAG (Web Content Accessibility Guidelines)](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [CodeA11y — AI 코딩 어시스턴트와 접근성 연구 (CHI 2025)](https://arxiv.org/abs/2502.10884)
