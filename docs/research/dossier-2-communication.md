# 리서치 도시에 2: 요구사항·도메인·기획, 타직군과 잘 소통하는 법

작성 2026-08-11 / 2차 보강판
확정된 축(사용자 승인): **공유 언어(ubiquitous language)**

모든 인용은 명시된 URL을 직접 fetch 하거나 PDF 원문을 직접 추출해 확보함. 2차 매체 요약은 인용에 쓰지 않음.

---

## A. 발단이 된 글 (원문 직접 확인)

news.hada.io 는 요약의 요약이므로 원문을 직접 확인했다. **하다 요약과 원문의 섹션 이름이 다르다.**

| 항목 | 내용 |
|---|---|
| 저자 | James Samuel |
| 발행 | 2026-07-10, Software Leads (Substack) |
| URL | https://softwareleads.substack.com/p/engineering-leaders-day-to-day-activities |

**원문 섹션 제목 (등장 순서, 영어 원문)**

1. Information gathering
2. Information sharing
3. Decision Making
4. Influencing decisions
5. Leading and setting directions
6. Planning

> ⚠️ news.hada.io 요약은 5번째를 "Lead execution(실행)" 으로 옮겼다. **원문은 "Leading and setting directions" 이고 해당 절의 강조점은 실행이 아니라 비전 제시다.** 인용할 때는 원문 표기를 쓴다.

| # | 주장 | 원문 인용 | 확인 |
|---|---|---|---|
| A1 | 관리자의 일이 안 보이는 이유 | "This question arises because much of a manager's work is invisible." | ✅ |
| A2 | 모든 결정이 정보 이해에 의존 | "Every decision, proposed path, and action depends on having an accurate understanding of what is happening within the team, the organization, and the product." | ✅ |
| A3 | IC 시절의 방법이 통하지 않는다 | "When you are an IC, you have a complete picture of your work. Once you become responsible for people, you can't use the old methods anymore." | ✅ |
| A4 | 노이즈를 걸러 하나의 그림으로 종합하는 역량 | "No manager can process everything. You'll need to build capability to filter out the noise and synthesize information into a coherent picture of reality." | ✅ |
| A5 | 현재 상태를 모르면 좋은 결정이 어렵다 | "Without an accurate grasp of the current state, making great decisions is hard. You might solve the wrong problems, prioritize the wrong work, and miss emerging risks." | ✅ |
| A6 | 리더십은 권한보다 영향력 | "Leadership is less about authority and more about influence." | ✅ |
| A7 | 확실성을 기다리는 것도 결정이다 | "Waiting for certainty is often a decision in itself—one that can carry its own costs." | ✅ |

> A2~A5 가 가장 좋은 연결점이다. 저자가 여섯 활동 중 가장 먼저 다루는 것이 정보 수집이고, 실무자에게 그 대응물이 **요구사항 파악**이다. (원문에 순위·우선순위 표현은 없다. "1번으로 꼽았다"로 쓰지 말 것)

---

## B. ★ 축의 1차 출처: Evans 원서 직접 확인

2차 보강에서 Fowler 경유가 아닌 **Evans 원서 본문**을 확보했다. (Final Manuscript, April 15, 2003, 27면 부근. Chapter 2 "Communication and the Use of Language" 의 UBIQUITOUS LANGUAGE 패턴)

| # | 주장 | 원문 인용 (원서 본문 직접 추출) | 확인 |
|---|---|---|---|
| B1 | UBIQUITOUS LANGUAGE 패턴의 처방문 | "Therefore, **Use the model as the backbone of a language. Commit the team to using that language relentlessly in all communication within the team and in the code.** Use the same language in diagrams, writing, and, especially speech." | ✅ |
| B2 | 표현이 어색하면 대안 표현을 실험하고, 코드까지 이름을 바꾼다 | "Iron out difficulties by experimenting with alternative expressions, which reflect alternative models. Then refactor the code, renaming classes, methods and modules to conform to the new model." | ✅ |
| B3 | ★ 역할 분담: 도메인 전문가는 이의를 제기하고, **개발자는 모호함과 비일관성을 감시한다** | "Domain experts object to terms or structures that are awkward or inadequate to convey domain understanding, while developers watch for ambiguity or inconsistency that will trip up design." | ✅ |
| B4 | ★ 대화에서 반복해서 쓰면 해석 차이가 드러난다 | "Repeated use in conversation exposes differences in interpretation of terms." | ✅ |
| B5 | 자연스럽게 흐를 때까지 만족하지 않는다 | "By using it pervasively and not being satisfied until it flows, we approach a model that is complete and comprehensible, made up of simple elements that combine to express complex ideas." | ✅ |
| B6 | 도메인 전문가는 범위 밖에서도 말하지만, 범위 안에서는 그 언어를 써야 한다 | "Of course, domain experts will speak outside the scope of the UBIQUITOUS LANGUAGE, to explain and give context. But within its scope, they should use it, and raise concerns when they find it awkward or incomplete... or wrong." | ✅ |
| B7 | 언어는 설계 산출물이 아니라 함께 하는 모든 일에 통합된다 | "With a UBIQUITOUS LANGUAGE, the model is not just a design artifact. It becomes integral to everything the developers and domain experts do together." | ✅ |

> ⚠️ **Fowler 판본과 원서의 미세한 차이를 발견했다.**
> Fowler 의 [UbiquitousLanguage](https://martinfowler.com/bliki/UbiquitousLanguage.html) 는 이 문장을 "Domain experts **should** object ...; developers **should** watch ..." 로 옮겼다. **원서는 조동사 없이 "Domain experts object ...; while developers watch ..." 다.** 뜻은 같지만 원서 쪽이 더 단정적이다(당위가 아니라 그렇게 하는 것이 이 패턴의 정의라는 어조).
> 글에서 인용할 때는 원서(B3)를 쓴다. Fowler 는 개념 소개용으로만 참조한다.

**B3 와 B4 가 이 글의 두 축이다.**
- B3: 개발자의 몫은 요구사항을 받아쓰는 것이 아니라 **모호함을 감시하고 되돌려주는 것**이다.
- B4: 모호함은 문서를 정독해서 찾는 게 아니라 **같은 말을 반복해서 쓰는 대화에서 드러난다.**

**보조 출처 (개념 소개용)**

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| B8 | Ubiquitous Language 라는 용어의 소개 | [Martin Fowler, UbiquitousLanguage (2006-10-31)](https://martinfowler.com/bliki/UbiquitousLanguage.html) | "Ubiquitous Language is the term Eric Evans uses in Domain Driven Design for the practice of building up a common, rigorous language between developers and users." | ✅ |
| B9 | Bounded Context 는 DDD 전략 설계의 중심 패턴 | [Martin Fowler, BoundedContext (2014-01-15)](https://martinfowler.com/bliki/BoundedContext.html) | "Bounded Context is a central pattern in Domain-Driven Design. It is the focus of DDD's strategic design section which is all about dealing with large models and teams." | ✅ |
| B10 | ★ 같은 단어가 부서마다 다른 것을 뜻한다 (전기 회사 'meter' 사례) | 위와 동일 | "here the word 'meter' meant subtly different things to different parts of the organization: was it the connection between the grid and a location, the grid and a customer, the physical meter itself" | ✅ |
| B11 | Customer, Product 같은 다의어에서 이 혼란이 반복된다 | 위와 동일 | "Time and time again I see this confusion recur with polysemes like 'Customer' and 'Product'." | ✅ |

**B10/B11 은 실무에서 가장 자주 겪는 사고의 정확한 이름이다.** 기획자의 "회원", 마케터의 "회원", DB 의 `users` 가 다른 것을 가리키는데 아무도 그 차이를 말하지 않는 상황.

내부 링크 후보: [도메인 모델(260418)](/260418), [추상화(260201)](/260201).

---

## C. ★ 왜 공유 언어가 어려운가: grounding 이론 (인지과학 1차 출처)

2차 보강의 가장 큰 수확이다. "말이 안 통한다"는 현상에 40년 된 이론적 뼈대가 있고, 그 이론이 **슬랙·문서·대면의 차이까지 예측한다.**

출처: Herbert H. Clark & Susan E. Brennan, **"Grounding in Communication"**, Chapter 7 in L. B. Resnick, J. M. Levine & S. D. Teasley (eds.), *Perspectives on Socially Shared Cognition*, APA Books, 1991. [Stanford 호스팅 PDF](https://web.stanford.edu/~clark/1990s/Clark,%20H.H.%20_%20Brennan,%20S.E.%20_Grounding%20in%20communication_%201991.pdf) 본문 직접 추출.

| # | 주장 | 원문 인용 | 확인 |
|---|---|---|---|
| C1 | 공동 작업은 내용의 조율과 과정의 조율 둘 다를 요구한다 | "To succeed, the two of them have to coordinate both the content and process of what they are doing." | ✅ |
| C2 | ★ common ground 의 정의 | "They cannot even begin to coordinate on content without assuming a vast amount of shared information or common ground—that is, mutual knowledge, mutual beliefs, and mutual assumptions." | ✅ |
| C3 | ★ 모든 집단 행동은 common ground 와 그 축적 위에 세워진다 | "All collective actions are built on common ground and its accumulation." | ✅ |
| C4 | ★ grounding 의 정의 | "In communication, common ground cannot be properly updated without a process we shall call grounding." / "they try to ground what has been said—that is, make it part of their common ground." | ✅ |
| C5 | ★ grounding criterion | "The contributor and his or her partners mutually believe that the partners have understood what the contributor meant to a criterion sufficient for current purposes. This is called the grounding criterion." | ✅ |
| C6 | grounding 은 그 상호 믿음에 도달하려는 집단적 과정이다 | "Technically, then, grounding is the collective process by which the participants try to reach this mutual belief." | ✅ |
| C7 | 이해는 완벽할 수 없다 | "Of course, understanding can never be perfect." | ✅ |
| C8 | ★ 최소 협력 노력의 원리 | "The principle of least collaborative effort is essential for a full account of face-to-face conversation." / "People apparently don't like to work any harder than they have to" | ✅ |
| C9 | ★ grounding 은 매체에 따라 극적으로 달라진다 | "By the principle of least collaborative effort, people should try to ground with as little combined effort as needed. But what takes effort changes dramatically with the communication medium. The techniques available in one medium may not be available in another, and even when a technique is available, it may cost more in one medium than in the other." | ✅ |
| C10 | 매체가 비동기면 상대가 오해를 고쳐주는 비용이 매우 커진다 | "not cotemporal, repairs initiated or made by others become very costly indeed, so speakers will try hard to avoid relying on others to repair misunderstandings." | ✅ |
| C11 | grounding 은 목적에 따라 달라진다 | "Grounding should change with these purposes. If addressees are to understand what the speaker meant 'to a criterion sufficient for current purposes,' then the criterion should change as their collective purposes change." | ✅ |

**이 절이 글에 주는 것 세 가지.**

1. **C5(grounding criterion)** 는 "어디까지 확인해야 충분한가"라는 실무 질문에 답을 준다. 완벽한 이해가 아니라 **현재 목적에 충분한 수준의 상호 믿음**이 기준이다. C11 과 합치면, 요구사항의 종류에 따라 확인 강도를 달리해야 한다는 결론이 나온다.
2. **C8 + C9 + C10** 은 매체가 바뀌면 오해의 양이 달라지는 이유를 설명하는 틀을 준다. 사람은 grounding 노력을 최소화하려 하고(C8), 상대가 고쳐주기를 기대하는 비용이 큰 매체에서는(C10) 각자 자기 해석으로 넘어가버린다.
   > ⚠️ **이 논문은 슬랙이나 노션을 다루지 않는다.** 1991년 논문이고, 저자들이 비교한 매체는 대면·전화·편지·자동응답기 같은 것들이다. **매체에 따라 grounding 비용이 달라진다는 틀은 저자들의 것이고, 그것을 슬랙·기획서 같은 비동기 업무 채널에 적용하는 것은 필자의 적용이다.** 글에서 "Clark 과 Brennan 이 슬랙에 대해 밝혔다" 식으로 쓰면 안 된다. "이 틀로 보면 기획서만 읽고 시작할 때 왜 어긋나는지 설명이 된다" 정도가 정확하다.
3. **C2 + C3** 는 공유 언어(§B)가 취향이 아니라 **협업의 전제**라는 것을 인지과학 쪽에서 받쳐준다. Evans 의 ubiquitous language 는 소프트웨어 도메인에서의 common ground 축적 장치로 읽을 수 있다.

> 이 연결(Evans ↔ Clark & Brennan)은 두 문헌 어느 쪽도 명시하지 않은 **필자의 해석**이다. 글에서 "Evans 가 Clark 을 인용했다" 식으로 쓰면 안 된다. "서로 다른 분야에서 같은 문제를 다르게 부른 것으로 읽힌다" 정도가 정확하다.

---

## D. 소통 실패가 구조 문제라는 배경: Conway

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| D1 | 이른바 Conway's Law | [Mel Conway, How Do Committees Invent? (Datamation, April 1968)](https://melconway.com/Home/Committees_Paper.html) | "Any organization which designs a system will inevitably produce a design whose structure is a copy of the organization's communication structure." | ✅ 단, **저자가 훗날 붙인 노트의 정식화** |
| D2 | 시스템 구조와 조직 구조의 밀접한 관계 | 위와 동일 | "There is a very close relationship between the structure of a system and the structure of the organization which designed it." | ✅ 1968년 본문 |
| D3 | 조직은 자기 이미지를 설계물에 찍어낸다 | 위와 동일 | "To the extent that an organization is not completely flexible in its communication structure, that organization will stamp out an image of itself in every design it produces." | ✅ 1968년 본문 |
| D4 | 설계 조직은 커뮤니케이션 필요에 따라 구성되어야 한다 | 위와 동일 | "A design effort should be organized according to the need for communication." | ✅ 1968년 본문 |
| D5 | Inverse Conway Maneuver 는 2014년 7월 Thoughtworks 레이더에 Trial 로 등재 | [Thoughtworks Technology Radar](https://www.thoughtworks.com/radar/techniques/inverse-conway-maneuver) | 레이더 페이지가 인용하는 Conway's Law: "Conway's Law asserts that organizations are constrained to produce application designs which are copies of their communication structures." | ⚠️ 등재 시점/링만 확인. **maneuver 자체의 정의 문장은 확보 못 함** |

> **D1 주의.** 이 유명한 한 문장은 1968년 본문이 아니라 저자가 나중에 붙인 노트의 표현이다. "1968년 논문에 이렇게 적혀 있다"고 쓰면 부정확하다. "Conway 가 훗날 스스로 이렇게 정식화했다" 로 쓴다. 1968년 본문 표현은 D2~D4 다.
>
> **D5 는 링/시점만 쓰고 정의는 인용하지 않는다.**

**글에서의 위치**: 조연이다. D3 를 §B 문제 제기의 배경으로 한 문단 정도. 주인공으로 올리면 조직론 글이 되고 실무자 시점을 잃는다.

---

## E. 인지 부하와 대화 모드: Team Topologies

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| E1 | 팀은 감당할 수 있는 복잡도가 정해져 있고, 새 도구·책임·도메인마다 인지 대역폭에 세금이 붙는다 | [Team Topologies, Key Concepts](https://teamtopologies.com/key-concepts) | "Teams can only handle so much complexity before breaking down. Each new tool, responsibility or domain your team is given taxes their mental bandwidth." | ✅ |
| E2 | 네 가지 팀 유형 | 위와 동일 | Stream-aligned: "aligned to a flow of work from (usually) a segment of the business domain" / Enabling: "helps a Stream-aligned team to overcome obstacles. Also detects missing capabilities." / Complicated Subsystem: "where significant mathematics/calculation/technical expertise is needed." / Platform: "a grouping of other team types that provide a compelling internal product to accelerate delivery by Stream-aligned teams" | ✅ |
| E3 | 세 가지 상호작용 모드 | 위와 동일 | Collaboration: "working together for a defined period of time to discover new things (APIs, practices, technologies, etc.)" / X-as-a-Service: "one team provides and one team consumes something 'as a Service'" / Facilitation: "one team helps and mentors another team" | ✅ |

**글에서의 활용**: E3 을 조직 개편이 아니라 **하나의 대화가 어떤 모드인지 먼저 합의하라**는 실무 도구로 축소해서 쓴다. 기획자와의 대화가 collaboration(같이 새로 발견하는 중)인지 X-as-a-Service(이미 정해진 것을 전달받는 중)인지 서로 다르게 알고 있으면 회의가 어긋난다. **C11(목적에 따라 grounding 이 달라진다)과 붙이면 이 조언이 이론적 근거를 얻는다.**

---

## F. 요구사항을 다루는 구체적 기법

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| F1 | Example Mapping 고안자와 시점 | [Matt Wynne, Cucumber Blog, Introducing Example Mapping (2015-12-08)](https://cucumber.io/blog/bdd/example-mapping-introduction/) | "I call it Example Mapping" | ✅ |
| F2 | 네 색 카드 | 위와 동일 | Yellow = story, Blue = rules, Green = examples, **Red = questions** | ✅ |
| F3 | 요구사항 논의가 어려운 이유 | 위와 동일 | "many teams find it hard; it's unstructured, it takes too long and gets boring. The result is they don't do it regularly or consistently" | ✅ |
| F4 | 큰 스토리가 스프린트에 들어와 막판에 터지는 것을 막는 필터 | 위와 동일 | "big fat stories from getting into your sprint and exploding with last-minute surprises" | ✅ |
| F5 | Three Amigos 의 정의 | [Agile Alliance Glossary, Three Amigos](https://www.agilealliance.org/glossary/three-amigos/) | "Three amigos refer to the primary perspectives to examine an increment of work before, during, and after development." | ✅ |
| F6 | 세 관점과 각자의 질문 | 위와 동일 | Business: "What problem are we trying to solve?" / Development: "How might we build a solution to solve that problem?" / Testing: "What about this, what could possibly happen?" | ✅ |
| F7 | 결과물은 예시 형태의 공유된 이해 | 위와 동일 | "a clearer description of an increment of work often in the form of examples, leading to a shared understanding for the team." | ✅ |
| F8 | 전원 참여와 무협업 사이의 균형을 노린다 | 위와 동일 | "balance between no collaboration between people with different perspectives and involving an entire team in discussing all the details of every increment of work." | ✅ |
| F9 | breadboarding 의 출처와 목적 | [Basecamp, Shape Up Ch.4 (Ryan Singer)](https://basecamp.com/shapeup/1.3-chapter-04) | "We borrow a concept from electrical engineering to help us design at the right level of abstraction. A breadboard is an electrical engineering prototype that has all the components and wiring of a real device but no industrial design." | ✅ |
| F10 | breadboard 의 세 요소 | 위와 동일 | "There are three basic things we'll draw: 1. Places ... 2. Affordances ... 3. Connection lines: These show how the affordances take the user from place to place." | ✅ |
| F11 | ★ 와이어프레임부터 시작하면 불필요한 디테일에 갇힌다 | 위와 동일 | "If we start with wireframes or specific visual layouts, we'll get stuck on unnecessary details and we won't be able to explore as broadly as we need to." | ✅ |
| F12 | fat marker sketch 의 정의와 이유 | 위와 동일 | "A fat marker sketch is a sketch made with such broad strokes that adding detail is difficult or impossible." / "we too easily skip ahead to the wrong level of fidelity" | ✅ |
| F13 | 추상화 수준의 정의 | [Basecamp, Shape Up Ch.3](https://basecamp.com/shapeup/1.2-chapter-03) | "Level of abstraction: The amount of detail we leave in or out when describing a problem or solution." | ✅ |
| F14 | Domain Storytelling 의 출발점 | [domainstorytelling.org](https://domainstorytelling.org/) | "Storytelling is at the heart of human communication—why not use it to overcome costly misunderstandings when designing software?" | ✅ |
| F15 | Domain Storytelling 이 돕는 것 목록 | 위와 동일 | 도메인 이해, 도메인 전문가와 IT 전문가 간 **공유 언어 구축**, 이해관계자 정렬, 도메인 경계 설정, 요구사항으로의 전환 | ✅ |
| F16 | Bounded Context Canvas 의 정의 | [ddd-crew/bounded-context-canvas](https://github.com/ddd-crew/bounded-context-canvas) | "The Bounded Context Canvas is a collaborative tool for designing and documenting the design of a single bounded context." | ✅ |
| F17 | 캔버스 섹션에 **Ubiquitous Language 와 Assumptions, Open Questions 가 명시적 칸으로 들어간다** | 위와 동일 | 섹션: Name / Purpose / Strategic Classification / Domain Roles / Inbound Communication / Outbound Communication / **Ubiquitous Language** / Business Decisions / **Assumptions** / Verification Metrics / **Open Questions** | ✅ |
| F18 | 목적을 적는 행위가 흐릿한 생각을 명확하게 만든다 | 위와 동일 | "Writing down the purpose forces you to clearly articulate fuzzy thoughts and ensure everybody in the team is on the same page." | ✅ |
| F19 | EventStorming 의 자기 정의 | [eventstorming.com/book](https://www.eventstorming.com/book/) | "An act of deliberate collective learning" / "It started as a tool to model complex business processes quickly in a Domain-Driven Design fashion." | ✅ |
| F20 | Specification by Example 의 목표 | [gojko.net, Specification by Example](https://gojko.net/books/specification-by-example/) | "how successful teams implement specification by example, agile acceptance testing and behaviour driven development to bridge the communication gap between stakeholders and implementation teams" | ✅ |
| F21 | Brandolini 의 "the deadly combination of software development" 인용 | 공식 사이트 | **확인 실패** | ❌ 인용 금지 |
| F22 | Shape Up 의 "Words are too abstract" 원문 문장 | Shape Up | 섹션 존재는 확인, **본문 문장 확보 실패** | ❌ 인용 금지. F11 만 인용하고 "말은 너무 추상적이다"는 필자 서술로 처리 |

**F17 이 이 글에 아주 좋은 착지점을 준다.** DDD 커뮤니티가 만든 실무 캔버스에 **Ubiquitous Language / Assumptions / Open Questions 가 각각 별도 칸으로 존재한다.** 즉 "용어를 적는 칸"과 "아직 모르는 것을 적는 칸"을 문서 양식 차원에서 강제한 것이다. F2 의 빨간 카드(질문)와 같은 발상이고, §G 의 심리적 안전감을 절차로 구현한 사례로 읽을 수 있다.

**F11 + F13 이 실용적 핵심이다.** 소통 실패의 큰 몫은 상대가 나쁜 게 아니라 **대화의 해상도가 잘못 맞춰진 것**이다. 기획자가 문장으로 준 요구사항은 너무 추상적이고, 디자이너가 준 시안은 너무 구체적이다. 그 사이에 개발자가 놓을 수 있는 표현이 breadboard 다.

---

## G. 왜 실제로는 안 하게 되는가: 심리적 안전감과 조직 문화

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| G1 | ★ team psychological safety 의 원 정의 | Edmondson (1999), *Administrative Science Quarterly* 44(2): 350-383. [논문 PDF](https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Group_Performance/Edmondson%20Psychological%20safety.pdf) **본문 직접 추출** | "Team psychological safety is defined as a shared belief that the team is safe for interpersonal risk taking." | ✅ |
| G2 | ★ 이 믿음은 대개 암묵적이고 직접 주의를 받지 못한다 | 위와 동일 | "For the most part, this belief tends to be tacit—taken for granted and not given direct attention either by individuals or by the team as a whole." | ✅ |
| G3 | 연구 규모와 결과 | 위와 동일 (초록) | "Results of a study of 51 work teams in a manufacturing company ... show that team psychological safety is associated with learning behavior, but team efficacy is not, when controlling for team psychological safety. As predicted, learning behavior mediates between team psychological safety and team performance." | ✅ |
| G4 | Project Aristotle 규모 | [Google re:Work, Understand team effectiveness](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness) | "180 teams to study (115 project teams in engineering and 65 pods in sales)" / "hundreds of double-blind interviews" / "over 35 different statistical models on hundreds of variables" | ✅ |
| G5 | 5가지 요인의 존재와 각 정의 | 위와 동일 | Psychological safety: "teammates feel safe to take risks around their team members" / Dependability: "members reliably complete quality work on time" / Structure and clarity: "An individual's understanding of job expectations, the process for fulfilling these expectations" / Meaning: "Finding a sense of purpose in either the work itself or the output" / Impact: "your work is making a difference, is important for teams" | ✅ |
| G6 | ★ 핵심 결론 | 위와 동일 | "what really mattered was less about who is on the team, and more about how the team worked together" | ✅ |
| G7 | 5가지에 **중요도 순서가 있다**는 주장 | re:Work 공식 페이지 | **순위 명시 문장 확보 실패.** "by far", "most important" 류는 2차 매체에만 존재 | ❌ **순위 서술 금지** |
| G8 | Westrum 3분류 | [DORA, Generative organizational culture](https://dora.dev/capabilities/generative-organizational-culture/) | Pathological (power oriented) / Bureaucratic (rule oriented) / Generative (performance oriented) | ✅ |
| G9 | 고신뢰 generative 문화가 성과를 예측한다 | 위와 동일 | "a high-trust, generative culture predicts software delivery and organizational performance in technology" | ✅ |
| G10 | ★ 정보 흐름을 중시하는 문화가 delivery 성과를 예측한다 | 위와 동일 | "organizational culture that is high-trust and emphasizes information flow is predictive of software delivery performance" | ✅ |
| G11 | Westrum 이 말한 좋은 정보의 세 가지 성질 | 위와 동일 | 수신자가 필요한 질문에 답을 준다 / 시기가 적절하다 / 수신자가 효과적으로 쓸 수 있는 방식으로 제시된다 | ✅ |

> ⚠️ 자주 왜곡되는 두 자료가 정확히 G1~G7 이다. **중요도 순위를 글에 쓰지 않는다.** 검증된 것은 (a) 5개 요인의 목록과 정의(G5), (b) 결론 문장(G6) 둘뿐이다. 심리적 안전감을 강조하려면 순위가 아니라 **Edmondson 원 논문의 G1/G2/G3** 에 기대는 것이 정확하고 더 강하다.
>
> 2차 매체에 흔한 "200 interviews / 250+ attributes" 도 쓰지 않는다. 공식 표현은 "hundreds of ..." 다(G4).

**G2 가 §F 의 도구들과 연결되는 지점이다.** 심리적 안전감은 암묵적이다. 암묵적인 것은 선언으로 바뀌지 않는다. 그래서 **F2 의 빨간 카드, F17 의 Open Questions 칸처럼 "모르겠다"를 산출물 양식으로 만드는 것**이 실질적인 방법이 된다.

**G10 + G11 이 결론의 근거다.** 소통을 잘하는 일은 인성 문제가 아니라 성과 변수다. 그리고 G11 은 "정보를 많이 공유하라"가 아니라 **수신자 기준으로 답이 되고, 때가 맞고, 쓸 수 있는 형태여야 한다**고 말한다. A4(노이즈를 걸러 하나의 그림으로)와 정확히 같은 얘기다.

---

## H. 확인하지 못한 것 / 글에 쓰면 안 되는 것

- Project Aristotle 의 요인 **중요도 순위**, "by far" 표현, "200 interviews / 250+ attributes" 수치 (G7, G4)
- Brandolini 의 "the deadly combination of software development" (F21)
- Shape Up 의 "Words are too abstract" 원문 문장 (F22)
- Inverse Conway Maneuver 의 정의 문장 (D5)
- Peter Naur, "Programming as Theory Building"(1985). 공개된 PDF 3종(chriskrycho, UW-Madison, gwern) 전부 스캔 이미지이거나 403 이라 **본문 인용을 확보하지 못했다.** 개념이 이 글의 축과 잘 맞지만 인용 없이는 쓰지 않는다
- Marty Cagan 의 product trio / product discovery 3인 협업. `svpg.com/product-manager-vs-product-owner/` 에는 없었다. 이 글에 불필요하므로 뺀다
- Evans ↔ Clark & Brennan 연결을 두 문헌이 서로 인용한 것처럼 쓰는 것 (§C 말미 경고)
- 하다 요약본 표현("Lead execution" 등) (§A 경고)
- Fowler 판본의 "should object / should watch" 를 Evans 원문으로 제시하는 것 (§B 경고)

---

## I. 제안하는 글 구조 (공유 언어 축 확정)

논지: **타직군과의 소통 실패는 대개 태도 문제가 아니라 공유 언어의 문제다. 그리고 공유 언어는 선언이 아니라 절차로만 만들어진다.**

1. **도입**: 같은 단어를 쓰는데 다른 것을 말하고 있었던 경험. 기획자의 "회원", 마케터의 "회원", 코드의 `users`. B10/B11 로 이 현상에 이름을 붙인다.
2. **왜 이게 구조적인가**: 조직은 자기 커뮤니케이션 구조를 설계물에 찍어낸다(D3). 그리고 인지과학 쪽에서 보면 협업은 애초에 common ground 축적 위에 서 있다(C2, C3).
3. **★ 개발자의 몫은 무엇인가**: Evans 는 개발자의 역할을 "모호함과 비일관성을 감시하는 것"으로 못 박았다(B3). 요구사항을 받아쓰는 사람이 아니다. 그리고 모호함은 문서 정독이 아니라 **반복해서 같은 말을 쓰는 대화**에서 드러난다(B4).
4. **그런데 왜 대화가 잘 안 되는가**: grounding 은 노력이 드는 일이고 사람은 그 노력을 최소화한다(C8). 그리고 그 노력의 크기는 매체마다 다르다(C9, C10). 이 틀로 보면 기획서만 읽고 시작할 때 어긋나는 이유가 설명된다. (매체 목록 자체는 1991년 기준이므로 슬랙·노션에 대한 적용은 필자 해석임을 본문에서 밝힌다. §C 경고 참조)
5. **어디까지 확인해야 충분한가**: grounding criterion(C5). 완벽한 이해가 아니라 현재 목적에 충분한 상호 믿음. 목적이 바뀌면 기준도 바뀐다(C11). 여기서 Team Topologies 의 상호작용 모드(E3)를 "이 대화가 어떤 모드인지 먼저 합의하라"로 축소해 붙인다.
6. **해상도를 맞추는 도구**: 말은 너무 추상적이고 시안은 너무 구체적이다(F11, F13). 그 사이의 breadboard(F9, F10). 규칙·예시·질문을 분리하는 Example Mapping(F2). 세 관점의 질문이 서로 다르다는 Three Amigos(F6).
7. **모르는 것을 적는 칸을 만들어라**: 심리적 안전감은 암묵적이라(G2) 선언으로 바뀌지 않는다. 그래서 빨간 카드(F2)와 Bounded Context Canvas 의 Open Questions·Assumptions 칸(F17)처럼 양식으로 강제하는 방식이 실효가 있다.
8. **이게 취향이 아닌 이유**: 정보 흐름을 중시하는 고신뢰 문화가 delivery 성과를 예측한다(G10). 좋은 정보의 기준은 발신자가 아니라 수신자다(G11).
9. **리더십으로의 확장 (결론)**: James Samuel 이 가장 먼저 다루는 것이 정보 수집이고(A2, A5), 실무자에게 그 대응물이 요구사항 파악이다. A4 의 "노이즈를 걸러 하나의 그림으로 종합하는 역량"은 G11 과 같은 얘기다. **지금 요구사항을 다루는 방식이 곧 나중에 조직의 정보를 다루는 방식이 된다.** 겸손한 불확실성으로 마무리.

**내부 링크 후보**: [도메인 모델(260418)](/260418) (§1, §3에서), [추상화(260201)](/260201) (§6 해상도 이야기에서), [Toss Frontend Fundamentals 리팩토링 후기(260328)](/260328) (요구사항 가독성 관점).

**조연으로 둘 것**: Conway(D), Team Topologies(E), EventStorming(F19), Domain Storytelling(F14), Specification by Example(F20). 각각 한 문단 이내. 주인공으로 올리면 도구 소개 나열이 된다.

**분량이 넘칠 때 잘라낼 순서 (미리 정해둠)**: 9개 절에 인용이 3~5개씩 붙어 이대로 쓰면 매우 길어진다. 마감에 몰려 즉흥적으로 자르지 않도록 순서를 미리 정한다.
1. §2(Conway)를 §1 안의 한 문장으로 압축
2. §6 의 도구 셋 중 Three Amigos(F6) 를 빼고 breadboard + Example Mapping 둘만 남김
3. §8(DORA 문화)을 §9 결론의 한 문단으로 흡수

**절대 자르지 않을 것**: §3(B3, B4), §4~5(C5, C8~C11), §7(G2 + F17). 이 셋이 이 글을 리스티클과 구분하는 부분이다.
