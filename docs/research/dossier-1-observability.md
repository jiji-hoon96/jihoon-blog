# 리서치 도시에 1: AI를 활용한 측정·관측과 서비스 안정화

작성 2026-08-11 / 2차 보강판
확정된 논지 방향(사용자 승인): **AI를 통해 어렵던 부분을 더 쉽게 할 수 있게 됐다. 그리고 서비스 안정과 유저 파악 등 여러 관점의 개선을 위해서는 관측 정보를 잘 다루는 것이 좋다.**

모든 인용은 명시된 URL을 직접 fetch 하거나 PDF 원문을 직접 추출해 확보함. 2차 매체 요약은 인용에 쓰지 않음.

---

## A. 이 글의 1차 경험 자료 (이 리포 안에 이미 있음)

웹 자료보다 이쪽이 글의 척추다. 전부 `git log` / PR 본문 / 소스 코드에서 직접 확인했으므로 창작이 아니다.

| # | 사실 | 출처 (리포 내부) | 원문 | 확인 |
|---|---|---|---|---|
| A1 | 라우트 핸들러의 catch 만 계측하려던 최초 계획이 틀렸음. 하위 계층 catch 4곳이 먼저 잡아 fallback 을 반환하고 HTTP 200 + `views: 0` 을 내보내고 있었다 | PR #13 본문 | "라우트 핸들러의 catch 만 계측하려던 최초 계획은 **틀렸다.** ... catch 블록 4곳이 한 층 아래에서 먼저 잡아 fallback 을 반환하고 **HTTP 200 + `views: 0`** 을 내보내고 있었다" | ✅ |
| A2 | 번들 실측: 미적용 181.6 KB → 서버 전용 182.3 KB (+0.7 KB) → 클라이언트 포함 260.4 KB (+78.8 KB), gzip clean build | PR #13 표, `CLAUDE.md` | 동일 표가 두 곳에 존재 | ✅ |
| A3 | `bundleSizeOptimizations.excludeTracing: true` 를 켜도 260.4 KB 로 변화 없음 | PR #13, `CLAUDE.md` | "`excludeTracing: true` 도 시도했지만 260.4 KB 로 변화가 없었다" | ✅ |
| A4 | `global-error.tsx` 의 `captureException` 은 브라우저 SDK 가 없으면 no-op 인데 번들만 4.4 KB 늘린다 | PR #13, `CLAUDE.md` | 동일 | ✅ |
| A5 | 프로덕션 스택 트레이스가 `y([root-of-the-server]__468aa3ae._)` 로 난독화되어 있었고, 소스맵 업로드 후 `src/...` 경로 + 줄번호 + 주변 소스까지 해석됨 | PR #15, `CLAUDE.md` | "culprit 이 `y([root-of-the-server]__468aa3ae._)` 로 찍혔습니다" | ✅ |
| A6 | Turbopack 서버 소스맵이 57MB 로 서버 JS(15MB)보다 크다. 지우지 않으면 Netlify 함수 번들에 전부 실린다 | PR #15, `next.config.ts` 주석 | "서버 소스맵이 **57MB** 로 서버 JS(15MB) 보다 큰데" | ✅ |
| A7 | `deleteSourcemapsAfterUpload: true` 는 `.next/static` 만 지우고 `.next/server` 는 남긴다. 업로드 직후 잔존 측정치 135개 / 57MB | `CLAUDE.md` L127, `next.config.ts`, PR #17 | "실측으로 확인했다(업로드 직후에도 서버 `.map` 135개 / 57MB 잔존)" | ✅ |
| A8 | JIHOON-BLOG-2: 프로덕션에서 GA 호출이 **65.877초** 후 `DEADLINE_EXCEEDED`. catch fallback 때문에 응답은 200, 통계만 조용히 빔 | PR #18, `ga-request-options.ts` 주석 | "GA 호출이 **65.877초** 후 `DEADLINE_EXCEEDED` 로 실패합니다" | ✅ |
| A9 | 근본 원인: `beta_analytics_data_client_config.json` 의 `RunReport.timeout_millis: 60000`. 5개 호출 지점 어디에도 gax `CallOptions` 를 넘기지 않았음 | PR #18 | `"RunReport": { "timeout_millis": 60000, "retry_params_name": "default" }` | ✅ |
| A10 | 응답하지 않는 로컬 TCP 서버로 결정적 재현: 타임아웃 미지정 **60.04초** / `timeout: 5000` **5.00초** | PR #18 표 | 동일 | ✅ |
| A11 | 테스트를 먼저 실패시킨 뒤 구현. `runReport 5개 중 0개만 타임아웃을 넘긴다` 로 실패 확인 후 `ga-request-options.test.mjs` 3개 추가 | PR #18, 테스트 파일 | 동일 | ✅ |
| A12 | Deploy Preview 에 임시 검증 라우트를 올려 확인하고 머지하지 않고 닫는 방식 | `CLAUDE.md` | "Deploy Preview 에 임시 라우트를 올려 검증하고 머지하지 않고 닫는 방식을 썼다" | ✅ |
| A13 | throw 경로 이벤트가 약 2분 늦게 도착한 적 있음 | `CLAUDE.md` | 동일 | ✅ |
| A14 | `silent` 을 조건부로 둔 이유: 항상 켜두면 업로드가 실패해도 조용히 넘어가 다음에 읽을 수 없는 스택 트레이스를 볼 때까지 알 수 없다 | PR #15, `next.config.ts` | 동일 | ✅ |
| A15 | 이 작업이 AI 와 함께 수행됐다는 근거. 머지된 커밋 전부에 `Co-authored-by: Claude Opus 5 (1M context)` 트레일러 | `git log --format='%b' a30a76b~1..927c85b` | 트레일러 6건 확인 | ✅ |
| A16 | PR 구성: 머지 4건(#13 #15 #17 #18) + 머지하지 않고 닫은 `[DO NOT MERGE]` 검증 PR 2건(#14 Netlify runtime verification, #16 verify sourcemap symbolication). 전부 2026-08-04 | `gh pr list --state all` | #14, #16 모두 CLOSED | ✅ |
| A17 | 유저 관측 축이 이미 구현돼 있음. `WebVitalsReporter.tsx` 가 `web-vitals` 로 LCP/INP/CLS/FCP/TTFB 를 측정해 GA4 에 `web_vitals` 이벤트로 전송. CLS 는 1000배해서 정수로 보냄 | `src/components/WebVitalsReporter.tsx` | `gtag('event', 'web_vitals', { event_label: metric.name, value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), metric_rating: metric.rating, ... })` | ✅ 코드 직접 확인 |
| A18 | GA 실패 계측 지점이 정확히 4곳이고 각기 다른 `gaQuery` 태그를 단다: `stats`, `popular`, `page`, `pages` | `src/lib/google-analytics.ts` L106/169/215/262 | `Sentry.captureException(error, { tags: { gaQuery: "stats" } })` 등 | ✅ 코드 직접 확인 |
| A19 | GSC 수집 파이프라인이 별도로 존재. `pnpm gsc` 로 최근 28일 vs 직전 28일 비교, Quick Win/Cannibalization 자동 분류, GitHub Actions 주간 자동 수집 | `CLAUDE.md`, `.github/workflows/gsc-collect.yml` | 동일 | ✅ |
| A20 | 운영 데이터상 `description`/`keywords` 가 비면 검색 노출은 되어도 클릭이 0에 수렴한 사례가 확인됨 | `CLAUDE.md` | "노출은 되는데 클릭이 0에 수렴하는 사례가 확인됐다" | ✅ |

> **A15 가 이 글의 AI 프레이밍을 지탱하는 유일한 문서 증거다.** #13 17:32 → #18 20:48 타임라인은 *속도*를 보여줄 뿐 *AI 때문*이라는 근거가 아니다. AI 개입 서술은 A15 또는 필자 자신의 회고로만 쓰고 소요 시간에서 역산하지 않는다.
>
> **A16 은 논지를 강화한다.** 붙이는 데 4건, 확인하는 데 별도 2건을 썼다.
>
> **A17~A20 이 사용자가 확정한 "유저 파악" 축의 1차 자료다.** 이 블로그는 이미 세 층으로 관측하고 있다. (1) 에러: Sentry, (2) 사용자 체감 성능: web-vitals → GA4, (3) 유입/검색 행동: GSC. 글에서 "관측 정보를 잘 다루면 여러 관점의 개선이 가능하다"는 주장은 이 세 층으로 구체화하면 근거가 생긴다.

### A1 / A8 / A14 의 공통 구조

셋 다 **"실패했는데 성공으로 보고된"** 사례다. 실패 감지기와 실제 피해자의 인식이 어긋난 것이고, **이 구조에는 학술적 이름이 있다(§B).**

- A1: 에러가 있는데 응답은 200
- A8: 장애가 있는데 응답은 200 (다만 1분 이상 매달림)
- A14: 업로드가 실패했는데 빌드는 성공

> **A7 은 이 그룹에 넣지 않는다.** A7 은 `deleteSourcemapsAfterUpload` 라는 옵션 이름이 실제 동작 범위를 잘못 기술한 문제, 즉 명명과 기대의 문제다. 실패 감지의 문제가 아니다. 뭉치면 §B 의 정확성이 흐려지므로 **별개의 곁가지 사례**로 다룬다. (문서를 읽고 켠 옵션이 문서가 시사한 일을 하지 않았다는 이야기로, "측정해봐야 안다"는 논지에는 여전히 기여한다)

### 소스맵 개수 경고

**세 값이 서로 다르다. 같은 빌드가 아니다.**
- **131개**: PR #15 본문. Next 가 생성하는 서버 `.map` 개수
- **130개 남짓**: `CLAUDE.md` L123. 같은 대상의 다른 빌드
- **135개 / 57MB**: `CLAUDE.md` L127. 옵션을 켠 뒤 **잔존한** 개수

글에서는 용량(57MB vs 서버 JS 15MB)만 쓰고 개수는 생략하는 편이 안전하다.

---

## B. ★ 핵심 이론 축: Gray Failure 와 differential observability

**이 절이 2차 보강에서 가장 큰 수확이다.** A1/A8 이 겪은 일에는 정확한 학술 용어가 있고, 그 정의가 이 블로그의 사고를 거의 그대로 묘사한다.

출처: Peng Huang, Chuanxiong Guo, Lidong Zhou, Jacob R. Lorch, Yingnong Dang, Murali Chintalapati, Randolph Yao (Microsoft / Microsoft Azure), **"Gray Failure: The Achilles' Heel of Cloud-Scale Systems"**, Proceedings of HotOS '17, Whistler BC, 2017년 5월 8~10일, 6면. DOI [10.1145/3102980.3103005](https://dl.acm.org/doi/10.1145/3102980.3103005). [PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/06/paper-1.pdf)

| # | 주장 | 원문 인용 (논문 PDF 직접 추출) | 확인 |
|---|---|---|---|
| B1 | 클라우드의 주요 가용성 장애와 성능 이상은 fail-stop 이 아니라 gray failure 에서 온다 | "the major availability breakdowns and performance anomalies we see in cloud environments tend to be caused by subtle underlying faults, i.e., gray failure rather than fail-stop failure." | ✅ |
| B2 | gray failure 의 핵심 특징은 differential observability 다 | "we argue that a key feature of gray failure is differential observability: that the system's failure detectors may not notice problems even when applications are afflicted by them." | ✅ |
| B3 | 해법의 방향은 서로 다른 구성 요소의 '실패' 인식 차이를 메우는 것 | "This realization leads us to believe that, to best deal with them, we should focus on bridging the gap between different components' perceptions of what constitutes failure." | ✅ |
| B4 | differential observability 의 정식 정의 | "We find that a key feature that instances of gray failure possess is that they are perceived differently by different entities; we call this differential observability. Specifically, one entity is negatively affected by the failure and another entity does not perceive the failure; this is problematic because the latter entity is responsible for failure detection and recovery." | ✅ |
| B5 | 논문이 든 예시가 이 블로그의 사고와 구조가 같다 | "if a system's request-handling module is stuck but its heartbeat module is not, then an error-handling module relying on heartbeats will perceive the system as healthy while a client seeking service will perceive it as failed." | ✅ |
| B6 | 기존 내결함성 메커니즘이 오히려 상황을 악화시킬 수 있다 | "such mechanisms are inadequate to deal with gray failure, and in some cases even aggravate the situation. They often go wrong by assuming an overly simple failure model in which a component is either correct or stopped (i.e., fail-stop)" | ✅ |

> ⚠️ **중요한 검증 기록.** 이 논문을 WebFetch 로 처음 요청했을 때 돌아온 정의는 다음이었다.
> *"A gray failure is an error condition where a system is not completely down but continues to function in a degraded manner, producing incorrect or inconsistent results while appearing operational."*
> **이 문장은 논문에 없다.** PDF 압축 스트림을 직접 풀어 확인했다. 뜻은 크게 틀리지 않지만 인용으로 쓰면 허위 인용이 된다. 위 표의 B1~B6 만 사용한다.

**글에서의 활용**: A1(200 + views 0)과 A8(200인데 65초 매달림)은 B4/B5 의 정확한 사례다. 애플리케이션의 실패 감지기(라우트 catch, HTTP 상태 코드)는 정상이라고 판단했고, 서비스를 요청한 쪽(방문자)은 실패로 인식했다. 서로 다른 주체가 같은 상황을 다르게 관측한 것이다. **"내 catch 가 못 잡은 게 아니라, 내 실패 감지기와 사용자의 인식이 어긋난 것"** 이 이 글이 도달할 수 있는 가장 정확한 표현이다.

---

## C. observability 정의 (1차 출처 검증)

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| C1 | observability 는 "밖에서 질문을 던져 시스템 내부의 임의의 상태를 이해할 수 있는가" | [charity.wtf, 2020-03-03](https://charity.wtf/2020/03/03/observability-is-a-many-splendored-thing/) | "can you understand what is happening inside the system — can you understand ANY internal state the system may get itself into, simply by asking questions from the outside?" | ✅ |
| C2 | monitoring 은 미리 정의한 체크와 임계값 기반 | 위와 동일 | "you predefine some checks, then set thresholds that mean ERROR/WARN/OK" | ✅ |
| C3 | observability 는 unknown-unknowns 의 영역 | 위와 동일 | "observability is about these unknown-unknowns" / "if you *can't* predict all the questions you'll need to ask in advance ... then you're in o11y territory." | ✅ |
| C4 | 단위는 요청당 하나의 임의로 넓은 구조화된 이벤트 | 위와 동일 | "issue one single arbitrarily-wide event per service per request, and it must contain the *full context* of that request." | ✅ |
| C5 | cardinality / dimensionality 정의 | 위와 동일 | "cardinality refers to the number of unique items in a set, and dimensionality means how many adjectives can describe your event" | ✅ |
| C6 | observability = 새 코드 배포 없이 새 질문을 던질 수 있는 힘 | [Honeycomb, Observability: A Manifesto (Charity Majors, 2021-07-14 갱신)](https://www.honeycomb.io/blog/observability-a-manifesto) | "the power to ask new questions of your system, without having to ship new code or gather new data in order to ask those new questions." | ✅ |
| C7 | monitoring 은 known-unknowns, observability 는 unknown-unknowns | 위와 동일 | "Monitoring is about known-unknowns and actionable alerts, observability is about unknown-unknowns and empowering you to ask arbitrary new questions" | ✅ |
| C8 | OpenTelemetry 의 observability 정의 | [OpenTelemetry, Observability Primer](https://opentelemetry.io/docs/concepts/observability-primer/) | "Observability lets you understand a system from the outside by letting you ask questions about that system without knowing its inner workings." | ✅ |
| C9 | telemetry 정의와 signals | 위와 동일 | "Telemetry refers to data emitted from a system and its behavior. The data can come in the form of traces, metrics, and logs." | ✅ |
| C10 | reliability 정의 | 위와 동일 | "Reliability answers the question: 'Is the service doing what users expect it to be doing?'" | ✅ |

> ⚠️ "three pillars(로그·메트릭·트레이스)" 프레이밍은 Majors 본인이 비판적으로 다뤄왔다. "관측의 3대 축" 식으로 무비판적으로 쓰지 않는다. OpenTelemetry 는 "signals" 라는 표현을 쓴다(C9).
>
> **C10 을 눈여겨볼 것.** "사용자가 기대하는 일을 하고 있는가"라는 정의는 사용자가 확정한 "유저 파악" 축과 정확히 맞물린다. 신뢰성은 서버 지표가 아니라 사용자 기대를 기준으로 정의된다.

---

## D. 계측이 원래 어려웠다는 근거 (AI로 쉬워졌다는 주장의 대조군)

사용자 확정 논지의 "원래 어려웠다"를 뒷받침하려면, 어려움이 어디에 있었는지를 출처로 짚어야 한다.

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| D1 | zero-code instrumentation 은 에이전트 형태로 SDK 기능을 붙인다 | [OpenTelemetry, Zero-code instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/zero-code/) | "Zero-code instrumentation adds the OpenTelemetry API and SDK capabilities to your application typically as an agent or agent-like installation." | ✅ |
| D2 | 그러나 zero-code 는 라이브러리 경계만 계측한다. 내 애플리케이션 코드는 계측되지 않는다 | 위와 동일 | "Typically, zero-code instrumentation adds instrumentation for the libraries you're using. ... Your application's code, however, is not typically instrumented. To instrument your code, you'll need to use code-based instrumentation." | ✅ |

**D2 가 이 글의 결정적 대조점이다.** 자동 계측은 "GA 클라이언트가 호출됐다"까지는 공짜로 알려주지만, "이 블로그의 `getAnalyticsStats` 가 fallback 을 반환했다"는 알려주지 않는다. A1 에서 필요했던 계측이 바로 후자, 즉 손으로 넣어야 하는 code-based instrumentation 이었다. 그 지점이 원래 비싼 곳이고, AI 가 값을 깎아준 곳도 거기다.

---

## E. 측정 기준: SLI/SLO/error budget, 골든 시그널, 알림, 포스트모템

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| E1 | SLI 정의 | [Google SRE Book Ch.4 (Chris Jones, John Wilkes, Niall Murphy, Cody Smith)](https://sre.google/sre-book/service-level-objectives/) | "An SLI is a service level indicator—a carefully defined quantitative measure of some aspect of the level of service that is provided." | ✅ |
| E2 | SLO 정의 | 위와 동일 | "An SLO is a service level objective: a target value or range of values for a service level that is measured by an SLI." | ✅ |
| E3 | SLA 정의 | 위와 동일 | "SLAs are service level agreements: an explicit or implicit contract with your users that includes consequences of meeting (or missing) the SLOs they contain." | ✅ |
| E4 | SLO 는 딱 필요한 만큼만 | 위와 동일 | "Choose just enough SLOs to provide good coverage of your system's attributes." | ✅ |
| E5 | 현재 성능을 기준으로 목표를 잡지 말 것 | 위와 동일 | "Don't pick a target based on current performance" | ✅ |
| E6 | four golden signals | [Google SRE Book Ch.6 (Rob Ewaschuk)](https://sre.google/sre-book/monitoring-distributed-systems/) | "The four golden signals of monitoring are latency, traffic, errors, and saturation. If you can only measure four metrics of your user-facing system, focus on these four." | ✅ |
| E7 | white-box / black-box monitoring | 위와 동일 | white-box: "Monitoring based on metrics exposed by the internals of the system..." / black-box: "Testing externally visible behavior as a user would see it." | ✅ |
| E8 | 100% 는 옳은 신뢰성 목표가 아니다 | [Google SRE Book Ch.3 (Marc Alvidrez / error budget 절 Mark Roth)](https://sre.google/sre-book/embracing-risk/) | "100% is probably never the right reliability target: not only is it impossible to achieve, it's typically more reliability than a service's users want or notice." | ✅ |
| E9 | error budget 정의 | 위와 동일 | "The error budget provides a clear, objective metric that determines how unreliable the service is allowed to be within a single quarter." | ✅ |
| E10 | error budget 의 주된 효용은 공통 인센티브 | 위와 동일 | "The main benefit of an error budget is that it provides a common incentive that allows both product development and SRE to focus on finding the right balance between innovation and reliability." | ✅ |
| E11 | 호출(page)이 만족해야 하는 조건 | [Rob Ewaschuk, My Philosophy on Alerting (저자가 공개용으로 정리한 Google Docs 문서)](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic) | "Pages should be urgent, important, actionable, and real." | ✅ |
| E12 | 증상 기반 알림이 원인 기반보다 낫다 | 위와 동일 | "Symptoms are a better way to capture more problems more comprehensively and robustly with less effort." / "Alert on the symptom: the 500, the Oops!, the whitebox metric that indicates that not all servers were reached." | ✅ |
| E13 | 과잉 모니터링이 과소 모니터링보다 풀기 어려운 문제다 | 위와 동일 | "Err on the side of removing noisy alerts – over-monitoring is a harder problem to solve than under-monitoring." | ✅ |
| E14 | 포스트모템의 정의 | [Google SRE Book Ch.15 (John Lunney, Sue Lueder)](https://sre.google/sre-book/postmortem-culture/) | "A postmortem is a written record of an incident, its impact, the actions taken to mitigate or resolve it, the root cause(s), and the follow-up actions to prevent the incident from recurring." | ✅ |
| E15 | blameless postmortem 의 조건 | 위와 동일 | "Blameless postmortems are a tenet of SRE culture. For a postmortem to be truly blameless, it must focus on identifying the contributing causes of the incident without indicting any individual or team for bad or inappropriate behavior." | ✅ |
| E16 | 비난 문화가 있으면 문제가 수면 위로 올라오지 않는다 | 위와 동일 | "If a culture of finger pointing and shaming individuals or teams for doing the 'wrong' thing prevails, people will not bring issues to light for fear of punishment." | ✅ |
| E17 | 포스트모템 트리거에 **모니터링 실패**가 포함된다 | 위와 동일 | 트리거 목록에 "A monitoring failure" 포함 | ✅ |

**E12 와 A1 의 충돌이 글의 좋은 소재다.** Ewaschuk 은 증상(500 등)에 알림을 걸라고 했다. 그런데 이 블로그의 증상은 500 이 아니라 **200 + 빈 통계**였다. 증상 기반 알림의 전제(실패가 상태 코드로 드러난다)가 깨진 케이스이고, 이것이 §B 의 differential observability 다. 즉 원칙을 반박하는 게 아니라 **증상을 무엇으로 정의할지가 진짜 어려운 부분**이라는 얘기가 된다.

**E17 도 쓸 수 있다.** SRE 책은 모니터링 실패 자체를 포스트모템 대상으로 본다. A14(업로드 실패가 조용히 넘어가는 것)를 고친 결정이 이 원칙과 같은 방향이다.

**E1~E10 적용 시 솔직한 한계**: 개인 블로그에 error budget 을 도입했다고 쓰면 과장이다. 대신 E8 의 논리를 그대로 쓸 수 있다. "GA 수치는 부가 정보이므로 정확히 받는 것보다 빠르게 포기하는 편이 낫다"(`ga-request-options.ts` 주석)는 판단이 곧 신뢰성 목표를 100%로 두지 않은 결정이다.

---

## F. 타임아웃과 조용한 실패

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| F1 | deadline 을 설정하지 않으면 in-flight 요청이 자원을 붙들고 최대 타임아웃까지 갈 수 있다 | [gRPC Blog, Deadlines (Gráinne Sheerin, Google SRE, 2018-02-26)](https://grpc.io/blog/deadlines/) | "In general, when you don't set a deadline, resources will be held for all in-flight requests, and all requests can potentially reach the maximum timeout." | ✅ |
| F2 | 그 결과 메모리 고갈, 지연 증가, 최악의 경우 프로세스 크래시 | 위와 동일 | "This puts the service at risk of running out of resources, like memory, which would increase the latency of the service, or could crash the entire process in the worst case." | ✅ |
| F3 | 결론: 항상 deadline 을 설정하라 | 위와 동일 | "TL;DR: Always set a deadline" | ✅ |
| F4 | 원격 호출은 실패하거나 타임아웃까지 응답 없이 매달릴 수 있다 | [Martin Fowler, CircuitBreaker (2014-03-06)](https://martinfowler.com/bliki/CircuitBreaker.html) | "One of the big differences between in-memory calls and remote calls is that remote calls can fail, or hang without a response until some timeout limit is reached." | ✅ |
| F5 | Circuit Breaker 는 Nygard 의 Release It! 이 널리 퍼뜨렸다 | 위와 동일 | "In his excellent book Release It, Michael Nygard popularized the Circuit Breaker pattern to prevent this kind of catastrophic cascade." | ✅ |

> F1~F3 은 gRPC 문서이고 `@google-analytics/data` 는 gRPC 기반이므로 A8/A9 와 직접 연결된다. 다만 "gRPC 공식 문서가 이 사고를 예언했다" 식은 과장이다. **"같은 원리를 문서가 이미 경고했는데 호출 지점에서 지키지 않았다"** 가 정확하다.

---

## G. 유저 파악 축: field data 가 왜 우선인가

사용자가 확정한 논지의 후반부("유저 파악 등 다양한 관점의 개선")를 뒷받침하는 절이다. A17(WebVitalsReporter)과 짝이 된다.

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| G1 | Core Web Vitals 임계값 | [web.dev, Web Vitals (최종 수정 2024-10-31)](https://web.dev/articles/vitals) | "LCP should occur within 2.5 seconds" / "pages should have a INP of 200 milliseconds or less" / "pages should maintain a CLS of 0.1 or less" | ✅ |
| G2 | 75th percentile 기준, 모바일/데스크톱 분리 | 위와 동일 | "a good threshold to measure is the 75th percentile of page loads, segmented across mobile and desktop devices." | ✅ |
| G3 | INP 는 2024년에 정식 지표가 됨 | 위와 동일 | "INP became a stable Core Web Vital metric in 2024" | ✅ |
| G4 | lab data 의 정의 | [web.dev, Lab and field data differences](https://web.dev/articles/lab-and-field-data-differences) | "Lab data is determined by loading a web page in a controlled environment with a predefined set of network and device conditions." | ✅ |
| G5 | field data 의 정의 | 위와 동일 | "Field data is determined by monitoring all users who visit a page and measuring a given set of performance metrics for each one of those users' individual experiences." | ✅ |
| G6 | 둘이 다른 이유 | 위와 동일 | "Field data includes a wide variety of network and device conditions as well as a myriad of different types of user behavior" / "lab data intentionally limits the number of variables involved." | ✅ |
| G7 | **둘 다 있으면 field data 로 우선순위를 정하라** | 위와 동일 | "As a general rule, if you have both field data and lab data for a given page, field data is what you should use to prioritize your efforts. Since field data represents what real users are experiencing, it's the most accurate way to really understand what your users are struggling with." | ✅ |
| G8 | 크롬 도구의 field data 출처는 CrUX | 위와 동일 | "Chrome tools that report field data generally get that data from the Chrome User Experience Report (CrUX)." | ✅ |

**G7 이 이 글의 "유저 파악" 축에 가장 강한 근거다.** Lighthouse 점수(lab)가 좋아도 실제 사용자가 겪는 것은 다를 수 있고, 무엇을 고칠지는 field data 로 정해야 한다. 이 블로그가 `WebVitalsReporter`(A17)로 실사용자 값을 GA4 로 보내고 있다는 사실이 그 실천에 해당한다.

> ⚠️ "Core Web Vitals 가 검색 순위에 얼마나 영향을 주는가"는 정량화된 1차 출처를 확보하지 못했다. "성능이 곧 순위"라고 단정하지 말고, 이 블로그가 그 전제로 의사결정했다는 서술(A2 의 79KB 포기 근거)로만 쓴다.

---

## H. AI 가 개입한 지점

| # | 주장 | 1차 출처 | 원문 인용 | 확인 |
|---|---|---|---|---|
| H1 | 응답자 약 5,000명, 정성 데이터 100시간 이상. 2025-09-23 발표. 리드 Nathen Harvey, 리서처 Derek DeBellis | [Google Cloud Blog, Announcing the 2025 DORA Report](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report) | "Drawing on insights from over 100 hours of qualitative data and survey responses from nearly 5,000 technology professionals from around the world." | ✅ |
| H2 | 90% 가 업무에 AI 사용, 80% 이상이 생산성 향상 체감, 30% 는 AI 생성 코드를 거의/전혀 신뢰하지 않음 | 위와 동일 | "90% of survey respondents report using AI at work. More than 80% believe it has increased their productivity. However, skepticism remains as 30% report little or no trust in the code generated by AI." | ✅ |
| H3 | AI 도입이 throughput 과 product performance 에 긍정적 | 위와 동일 | "Unlike last year, we observe a positive relationship between AI adoption on both software delivery throughput and product performance." | ✅ |
| H4 | 그러나 delivery **stability** 와는 여전히 부정적 관계 | 위와 동일 | "However, AI adoption does continue to have a negative relationship with software delivery stability." | ✅ |
| H5 | AI 는 팀을 고치지 않고 증폭한다 | 위와 동일 | "AI doesn't fix a team; it amplifies what's already there. Strong teams use AI to become even better and more efficient. Struggling teams will find that AI only highlights and intensifies their existing problems." | ✅ |
| H6 | AI 도입이 높으면 throughput 과 instability 가 함께 오른다 | [DORA, Balancing AI tensions](https://dora.dev/insights/balancing-ai-tensions/) | "higher AI adoption is associated with an increase in both software delivery throughput and software delivery instability" | ✅ |
| H7 | 생성에서 절약한 시간이 검증 오버헤드로 재배치된다 | 위와 동일 | "the time saved during initial code or content generation is often re-allocated to verification overhead" | ✅ |
| H8 | 리뷰해야 할 코드의 생산 속도가 올라간다 | 위와 동일 | "AI tools are increasing the rate at which people can churn out code that needs to be reviewed" | ✅ |
| H9 | 숙련 OSS 개발자 16명 / 이슈 246건 RCT. AI 허용 시 완료 시간 19% 증가 | [METR, 2025-07-10](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) | "When developers are allowed to use AI tools, they take 19% longer to complete issues" | ✅ |
| H10 | 개발자 예측은 24% 단축, 체험 후에도 20% 단축이라 믿었다 | 위와 동일 | "developers expected AI to speed them up by 24%, and even after experiencing the slowdown, they still believed AI had sped them up by 20%" | ✅ |
| H11 | Seer 는 Sentry 의 AI 디버깅 에이전트로 issue/trace/log/profile 컨텍스트를 사용 | [Sentry Docs, Seer](https://docs.sentry.io/product/ai-in-sentry/seer/) | "Seer is Sentry's AI debugging agent. It uses Sentry's rich context (issue details, tracing data, logs, and profiles) to help you troubleshoot and fix errors and performance issues faster." | ✅ |
| H12 | Autofix 는 근본 원인을 찾고 트리아지를 자동화하며 PR 도 만든다 | 위와 동일 | "Automatically scan issues as they come into Sentry, finding root causes, and automating triage" / "Use Autofix to generate a code fix and create a PR" | ✅ |
| H13 | Sentry MCP 는 human-in-the-loop 코딩 에이전트를 위해 설계됐고 `https://mcp.sentry.dev` 로 호스팅된다 | [getsentry/sentry-mcp README](https://github.com/getsentry/sentry-mcp) | "Sentry's MCP service is primarily designed for human-in-the-loop coding agents." / self-hosted 에서는 "Some features (like Seer) may not be available on self-hosted instances." | ✅ |
| H14 | OpenTelemetry 가 GenAI 용 semantic conventions 를 별도 리포로 표준화 중이고, MCP 도 대상에 포함된다 | [open-telemetry/semantic-conventions-genai README](https://github.com/open-telemetry/semantic-conventions-genai) | "Semantic Conventions for Generative AI (GenAI), including spans, metrics, and events for GenAI clients, MCP (Model Context Protocol), and provider-specific conventions (OpenAI, etc.)." | ✅ |
| H15 | Seer 의 정확도/벤치마크 수치 | 공식 문서 | **문서에 수치 없음** | ❌ 인용 금지 |
| H16 | GenAI semconv 의 안정화 등급 | 리포 README | **명시 없음. Schema URL 이 TODO 상태** | ❌ 등급 단정 금지 |

**H9/H10 의 사용 주의**: 이미 [AI 프론트엔드 엔지니어(260302)](/260302)에서 METR 을 인용했다. 재인용은 괜찮지만 같은 얘기를 반복하면 안 된다. 이 글에서의 새로운 각도는 **H10 의 인식 괴리(체감 20% 단축 vs 실제 19% 지연)가 곧 측정이 필요한 이유**다. METR 을 AI 회의론의 근거로 쓰지 말고 자기 체감을 신뢰할 수 없다는 근거로 쓴다.

**H14 는 마무리에 쓸 수 있는 시의성 카드다.** 관측의 대상이 이제 애플리케이션에서 AI 호출과 MCP 로 넓어지고 있다. [AI 에이전트 도구(260529)](/260529)와 [Harness(Systems) Engineering(260622)](/260622)로 자연스럽게 연결된다.

---

## I. 확인하지 못한 것 / 글에 쓰면 안 되는 것

- Seer 의 근본 원인 분석 정확도 수치 (H15)
- GenAI semantic conventions 의 안정화 등급 단정 (H16)
- Core Web Vitals 와 검색 순위의 정량적 관계
- "AI 덕분에 관측 도구 도입 시간이 N% 줄었다" 류의 수치. 이 리포에는 소요 시간 기록이 없다
- DORA 2025 리포트 PDF 본문. `dora.dev/research/2025/dora-report/` 는 소개 페이지만 반환하므로 인용은 Google Cloud 공식 발표 글과 dora.dev 인사이트 페이지 기준
- Gray Failure 논문의 "A gray failure is an error condition where..." 문장 (§B 경고. 논문에 없는 문장)
- 소스맵 개수를 출처 구분 없이 쓰는 것 (§A 경고)
- **크레덴셜 관련 서술 일체.** `CLAUDE.md` 에는 토큰 접두사, 토큰 스코프, DSN 환경변수 이름이 적혀 있다. 공개 글에는 옮기지 않는다
- `git log` 타임스탬프로 AI 기여도를 역산하는 것 (A15)

**시의성 확인**: 2026-08-11 기준 DORA 2025(2025-09-23 발표)가 최신판이다. 2026년판 발표는 검색으로 확인되지 않았다.

---

## J. 제안하는 글 구조 (사용자 확정 논지 기준)

논지: **AI 로 계측의 진입 장벽이 낮아졌고, 그렇게 확보한 관측 정보를 잘 다루면 안정성과 유저 이해 양쪽에서 개선이 가능하다.**

1. **도입**: 원래 관측 도구는 붙이기 전에 지치는 종류의 일이었다. 어디에 무엇을 심을지 정하는 것부터가 설계였다. AI 와 함께 하루 만에 4개 PR 로 끝냈다(A15, A16).
2. **관측이란 무엇인가**: monitoring 과 observability 의 구분(C1~C7). OpenTelemetry 의 reliability 정의가 사용자 기대를 기준으로 한다는 점(C10)을 미리 심어둔다.
3. **원래 어려웠던 지점은 자동 계측이 못 하는 곳이었다**: zero-code 는 라이브러리 경계까지고 내 코드는 손으로 넣어야 한다(D1, D2). AI 가 값을 깎아준 곳이 정확히 거기다.
4. **그래서 무엇을 알게 됐는가, 안정성 축**: A1 → A8 → A14 순서로 "실패했는데 성공으로 보고된" 사례. 여기서 §B 의 differential observability 를 이름으로 붙여준다(B2, B4, B5). 타임아웃 원칙(F1~F3)과 JIHOON-BLOG-2 실측(A10)으로 마무리. A7 은 이 흐름에 섞지 않고 짧은 곁가지로 둔다(§A 경고).
5. **유저 축**: 에러만 관측 대상이 아니다. web-vitals → GA4(A17), GSC(A19). field data 로 우선순위를 정해야 하는 이유(G7), Core Web Vitals 임계값(G1, G2). 79KB 를 포기한 결정(A2)이 이 축의 판단이었다는 것.
   > ⚠️ **이 절이 근거는 확실하지만 서사가 가장 약하다.** A17/A19/A20 은 코드·설정 사실이고, 안정성 축(A1/A8)처럼 "측정해보니 예상과 달랐다"는 이야기가 없다. 실제 GA4 나 GSC 수치를 열어 하나라도 확인하면 이 절이 크게 강해진다. **확인할 수 없으면 web.dev 정의로 분량을 채우지 말고 짧게 끝내는 편이 낫다.** 사용자가 명시적으로 요청한 축이라 빼지는 않는다.
   > (참고: 필요하면 집필 단계에서 `pnpm gsc` 로 실제 쿼리 데이터를 뽑아 A20 을 수치로 뒷받침할 수 있다. 사용자 확인 후 실행 여부 결정)
6. **알림과 회고**: 증상 기반 알림 원칙(E11~E13)과, 이 블로그의 증상이 500 이 아니었다는 충돌. 모니터링 실패도 포스트모템 대상이라는 점(E17).
7. **AI 시대에 이게 왜 더 중요한가**: DORA 2025 의 throughput↑/stability↓(H3, H4), 검증 오버헤드로의 재배치(H7), 그리고 체감과 실제의 괴리(H10). AI 는 증폭기다(H5).
8. **결론**: 관측의 대상이 AI 호출과 MCP 로 넓어지고 있다(H14). 겸손한 불확실성으로 마무리.

**분량 배분 원칙**: A 항목(리포 실측)이 H 항목(DORA/METR)보다 많은 지면을 차지해야 한다. H 가 지배하면 260302·260622 의 재탕이 된다.

**내부 링크 후보**: [에러 핸들링(251117)](/251117) (catch 계층 이야기와 직접 연결), [AI 프론트엔드 엔지니어(260302)](/260302), [AI 에이전트 도구(260529)](/260529), [Harness(Systems) Engineering(260622)](/260622).

**분량이 넘칠 때 잘라낼 순서 (미리 정해둠)**: 8개 절에 인용이 3~5개씩 붙어 이대로 쓰면 매우 길어진다. 마감에 몰려 즉흥적으로 자르지 않도록 순서를 미리 정한다.
1. §6(알림 + 포스트모템) 전체. 가장 잘라내기 쉽고, 잘라도 논지가 상하지 않는다
2. §2 의 observability 정의를 C1 + C7 두 인용으로만 줄임
3. §7 의 DORA·METR 을 H4 + H10 두 개로만 줄임

**절대 자르지 않을 것**: §3(D2), §4(B2·B4·B5 + A1·A8·A10), §5 의 A17/G7. §4 가 이 글의 유일무이한 부분이고, §3 이 "원래 어려웠다"를 증명하고, §5 가 사용자가 요청한 축이다.
