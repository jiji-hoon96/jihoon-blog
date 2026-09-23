# Jev 리서치 도시에

> TypeSafe AI 의 Jev 와 System One Model 에 대한 사전 조사. 초안을 쓰기 전에 검증한 것과 검증하지 못한 것을 갈라 둔다.
> 조사일 2026-09-22. 모든 1차 출처는 `curl` 로 원문을 받아 확인했다. WebFetch 요약에 붙은 따옴표는 이 문서에 넣지 않았다.

## 이 문서의 용도

초안이 아니다. 「어떤 주장을 어느 근거로 쓸 수 있는가」를 정하는 문서다.
표의 `글에 쓸 형태` 열이 그대로 본문 문장의 상한이다. 그보다 강하게 쓰면 근거를 넘는 것이다.

## 한 문장

Jev 가 새로운 것은 모델이 아니라 **출력 계약**이다. 텍스트 대신 타입이 정해진 값과 확률 분포를 돌려주고,
그 확률이 실제 적중률과 맞도록 학습됐다고 주장한다. 속도와 가격은 그 계약에서 따라 나오는 결과이지
그 자체가 발견은 아니다.

## 글의 후보 논지 세 개

세 개 다 쓰는 것이 아니라 하나를 고른다.

1. **probabilities 와 confidence 는 서로 다른 물건이다.** Jev 가 파는 「calibrated confidence」는
   사실 두 층이다. 학습으로 만든 확률 분포, 그리고 그 분포를 눌러 담은 산술 요약. 마케팅과 대부분의
   해설이 이 둘을 붙여 쓴다. 근거가 가장 단단하고 아직 아무도 제대로 안 짚었다. **권장.**
2. **RLHF 가 캘리브레이션을 망가뜨렸다는 것은 OpenAI 가 자기 논문에 써 둔 사실이다.**
   GPT-4 기술 보고서 Figure 8 의 ECE 0.007 대 0.074 를 척추로 놓고, 그 구멍을 노린 상품이
   왜 지금 나왔는지를 푼다. 역사적 서술에 강하고 1차 출처가 확실하다.
3. **「사람이 안 보는 판단」이라는 층이 실재하는가.** 영상의 3층 프레임을 검증하는 글.
   근거가 가장 약하고 필자의 1차 경험이 없으면 남의 프레임 요약이 된다. **비권장.**

---

## 1. 사실 검증 표

출처 종류는 넷이다. `V` 벤더 자신의 주장, `P` 1차 문헌(논문·명세), `T` 제3자 실측, `A` 유튜브 자동 전사(ASR).
ASR 은 그 자체로 근거가 되지 못한다. 다른 출처로 다시 잡지 못한 숫자와 이름은 글에 쓰지 않는다.

| # | 주장 | 출처 | 원문 확인 | 반대 증거 | 글에 쓸 형태 |
|---|---|---|---|---|---|
| 1 | Jev 는 텍스트를 생성하지 않고 타입이 정해진 값과 확률을 돌려준다 | V | 확인 (`docs.typesafe.ai/api.md`, `concepts/system-one.md`) | 없음 | 단정해도 된다 |
| 2 | 학습법 이름은 RLCD, Reinforcement Learning for Calibrated Decisions | V | 확인 (`introduction/machine-learning-primer.md`) | 논문·기술보고 없음 | 「그렇게 부른다」까지만 |
| 3 | RLCD 라는 약어는 이미 다른 방법이 쓰고 있다 | P | 확인 (arXiv 2307.12950, ICLR 2024, Reinforcement Learning from Contrastive Distillation, Yang·Klein 외) | 없음 | 충돌 사실만. 표절 함의 금지 |
| 4 | RLHF 이후 캘리브레이션이 무너진다 | P | 확인. GPT-4 Technical Report Figure 8, 사전학습 ECE **0.007**, PPO 이후 **0.074**. 캡션 원문 "The post-training hurts calibration significantly." | 없음 | 수치까지 인용 가능. 이 글의 가장 단단한 숫자 |
| 5 | Diogo Almeida 가 RLHF 를 공동 발명했다 | V | **반쪽만 확인.** InstructGPT(arXiv 2203.02155) 저자 20인 중 **4번째**. GPT-4 기술보고 기여자 명단(알파벳순)에도 있음 | Christiano 외 2017(1706.03741), Stiennon 외 2020(2009.01325) 저자 아님 | 「InstructGPT 공저자」로 쓴다. 「RLHF 공동 발명」은 team 페이지의 벤더 표현으로 귀속 |
| 6 | 응답 시간 70~500ms, 프론티어 대비 40~200배 | V | 확인 (블로그 비교표) | 6번 항목 참조 | 벤더 주장으로 귀속 |
| 7 | 193.6배 빠르고 444.6배 싸다 | V | 확인. 자사 workflow eval 기준. 원문이 "we expect that these are on the higher end of real world gains" 라고 스스로 적음 | **제3자 실측은 한 자릿수에서 열몇 배다.** 피싱 2.9배/12배, rerank 2배/5.6배 (7.3) | 자사 상단값과 실측 배수를 나란히 놓는다 |
| 8 | 입력 $0.042/Mtok, 출력 무료 | V | 확인 (`models.md`) | 보조금 여부 증명 불가를 본인들이 명시 | 단정 가능. 지속가능성은 미검증이라고 한 줄 |
| 9 | 타입 에러가 수학적으로 불가능하다 | V | 확인 | 이것은 구조화 출력의 성질이지 모델의 성질이 아니다. OpenAI structured outputs·JSON schema 로도 같은 보장을 얻는다 | 「차별점이 아니라 기본기」라는 영상의 판단이 맞다 |
| 10 | 환각하지 않는다 | V | **반박됨.** 0% 막대의 벤더 각주가 "Our number is not empirical" 이고 문서가 "Typed output guarantees the interface, not truth" 라고 적는다 | 피싱 벤치마크에서 형식이 올바르면서 틀린 답이 37.4%. 제약된 디코딩은 어느 모델에나 같은 보장을 준다 | 「형식은 보장되고 내용은 아니다」로 쓴다. 7.5 참조 |
| 11 | Jev 의 확률은 캘리브레이션돼 있다 | T | **규모 있는 측정에서 반박됨.** 피싱 2,000건 ECE 0.1701(잡음 바닥의 8.3배), 분포 밖 티켓 900건 ECE 0.107(4.4배). Archer Hume 의 MMLU 0.0313 은 1,200개 중 990개가 한 bin 에 몰려 있다 | 분포 안에서는 좋다(OpenBookQA 0.024, refit T 0.96) | 「분포에 따라 다르다」가 정확하다. 7.4 참조 |
| 12 | Jev 의 MMLU-Pro 84.6% | T | 확인 (Archer Hume) | 벤더는 공개 벤치마크를 의도적으로 안 낸다 | 제3자 측정으로 귀속 |
| 13 | `confidence` 는 학습된 값이 아니라 확률에서 계산한 산식이다 | V | **확인. 벤더가 배포한 소스 코드.** `typesafe-ai/system-one-adapter-python` 의 `_utils/confidence_metrics.py`. 문서 `confidence.md` 의 데모 코드와 대수적으로 같은 식 | 없음. 제3자 실측 확증은 아니다. Archer Hume 도 이 코드를 가리킨 것이고 Kev 는 "TypeSafe's formula, which isn't public" 이라고 적었다 | **단정 가능. 글의 척추 후보.** 「벤더 자신의 코드」로 귀속 |
| 14 | 학습 데이터는 전부 합성 데이터다 | V/A | **미확인.** 블로그 원문은 "We make all the data ourselves" 까지다. 「100% synthetic」은 Latent.Space 요약과 영상에만 있음 | 없음 | 「직접 만든다고만 밝혔다」로 낮춘다 |
| 15 | 공개 며칠 만에 오픈소스 복제본이 나왔다 | T | **확인. 날짜까지 잡았다.** Jev 공개 2026-09-15, `jaredpalmer/kev` 리포 생성 09-17, Hugging Face `kev-0.5b` 생성 09-18, Qwen3.5 기반 제품군 09-20. 09-22 기준 별 2,576개 | 영상의 「4일」은 대략 맞다 | 「이틀 뒤 리포, 사흘 뒤 가중치」로 정확히 쓴다 |
| 16 | Vercel 엔지니어가 5~18배 빨라졌다고 했다 | 언론 | **확인.** TechCrunch 2026-09-18 원문. Vercel 소프트웨어 엔지니어 Pranit Sharma 가 명령 안전성 분류기의 OpenAI Luna 5.6 을 Jev 로 바꾸니 "five to 18 times more quickly and with greater accuracy" | 자사 측정이 아니라 사용자 증언. 데이터 미공개 | 이름과 매체를 밝혀 인용 가능 |
| 16b | Bryo AI CTO 가 Gemini 와 비교했다 | 언론 | **확인.** 같은 기사. Nikhil Mudholkar. Gemini 가 근소하게 정확하지만 10~20배 비쌌고 "it is the only one that hands back a real probability" | 7.4 의 측정이 이 인상을 반박한다 | 인상과 측정을 나란히 놓는다. 「Brio」가 아니라 「Bryo」다 |
| 16c | 확률을 준다는 것은 판단을 사용자에게 넘긴다는 뜻이다 | 언론 | **확인.** 같은 기사. Armin Ronacher(Earendil CTO): "it delegates the hallucination problem a little bit to the user" | 없음 | 영상의 같은 지적보다 귀속이 분명하다. 이쪽을 인용한다 |
| 17 | 확률 90% 라고 하지만 실제 적중은 60% | A | **미확인.** 영상 작성자의 설명용 예시로 보인다 | 4번 항목이 이 자리를 대신한다 | **쓰지 않는다.** 측정치가 아니다 |
| 18 | $40M 시드, DCVC 리드, 2026-09-15 공개 | 언론 | Business Wire 배포 기준. Forbes 의 $2억 밸류는 회사 미확인 | 없음 | 밸류는 「보도, 회사 미확인」으로 |
| 19 | 영어가 주 학습 언어이고 CJK 는 동등하지 않다 | V | 확인 (`models.md`) | 없음 | 한국 독자에게 중요. 반드시 넣는다 |
| 20 | 선택지 상한 255개, 텍스트 전용, 컨텍스트 64k(state+최장 질문 32k) | V | 확인 (`models.md`, 블로그) | 없음 | 단정 가능 |
| 21 | Stagehand `act()` 에 Jev 를 붙인 PR. 40개 과제 중앙값 1.97초 → 0.46초, 147번 중 LLM fallback 4번, 수용 임계값 0.7 | P | 확인 (browserbase/stagehand PR #2953 본문 벤치마크, browserbase.com/blog/what-is-jev 의 "acceptance threshold of 0.7"). PR 은 2026-09-23 기준 **미머지** | Jev-only 모드는 act 27/40, breadth 26/40. 벤치마크는 PR 작성자 자기 보고 | 서두의 3자 사례로만. 「아직 머지되지 않았다」를 붙인다. 필자가 Playwright 에서 겪은 일처럼 쓰지 않는다 |

---

## 2. 개념 정리

### 2.1 RLHF

사전학습 모델은 다음 토큰을 잇는 법만 안다. 질문에 답하는 형태를 가르치는 것이 RLHF 다.
지도 미세조정, 보상 모델 학습, 정책 최적화의 3단계다.

계보를 정확히 잡아 둔다. 영상과 벤더 양쪽이 이 지점을 뭉갠다.

| 시점 | 논문 | 한 일 |
|---|---|---|
| 2017 | Christiano 외, Deep RL from Human Preferences (1706.03741) | 사람의 선호 비교로 보상 모델을 세우는 골격 |
| 2020 | Stiennon 외, Learning to Summarize from Human Feedback (2009.01325) | 언어 모델에 적용 |
| 2022 | Ouyang 외, InstructGPT (2203.02155) | 지시 따르기로 확장. ChatGPT 의 직계 조상 |

Almeida 는 세 번째 논문의 4저자다. 앞의 둘에는 없다.
본인 블로그의 표현("We learned this lesson at OpenAI when making InstructGPT/RLHF")은 조심스럽고,
team 페이지의 "co-invented RLHF" 가 앞서 나간 표현이다. 글에서는 이 차이를 지적하지 말고
그냥 확인되는 만큼만 쓴다. 인물 공격이 논지가 아니다.

### 2.2 RLVR

검증 가능한 보상. 보상 모델 자리에 결정론적 채점 함수를 넣는다. 수학 정답, 테스트 통과 여부처럼
기계가 맞다 틀리다를 판정할 수 있는 과제에서만 성립한다.
용어는 Tülu 3(Lambert 외, 2024, arXiv 2411.15124)가 명명했고, 기법 자체는 DeepSeekMath 가 먼저 썼다.

TypeSafe 의 RLVR 평가는 블로그 FAQ 에 있다.

> RLVR is great for tasks with simple programmatic verification, but most real-world judgement tasks don't fit into that shape. This tends to cause spikey / non-robust intelligence.

### 2.3 RLCD, 그런데 두 개다

**이름 충돌을 먼저 정리한다.**

| 약어 | 확장 | 누가 | 무엇 |
|---|---|---|---|
| RLCD | Reinforcement Learning from **Contrastive Distillation** | Yang·Klein 외, ICLR 2024, arXiv 2307.12950 | 긍정 프롬프트와 부정 프롬프트로 출력 쌍을 만들어 사람 라벨 없이 선호 데이터를 합성한다 |
| RLCD | Reinforcement Learning for **Calibrated Decisions** | TypeSafe, 2026 | 미공개. 「생성 텍스트 대신 결정과 캘리브레이션된 확률을 내도록」 학습한다고만 밝힘 |

둘은 목적도 방법도 다르다. 같은 약어를 다시 쓴 탓에 문헌 검색이 오염된다는 것까지만 주장한다.
그 이상은 근거가 없다.

TypeSafe 의 RLCD 에 대해 공개된 것은 문서 한 단락이 전부다.

> * The model does not generate text.
> * It returns decisions and probabilities.
> * Higher probability should correspond to a greater chance that the answer is correct.

Archer Hume 이 외부에서 도달한 지점도 여기까지다.
log loss 나 Brier loss 같은 proper scoring rule 이면 이런 결과가 나온다는 것은 설명이 되지만,
**관측만으로는 학습 목적함수와 사후 보정(post-hoc calibration)의 기여를 나눌 수 없다**고 못 박았다.

### 2.4 정확도와 캘리브레이션은 다른 축이다

정확도는 몇 퍼센트 맞히느냐이고, 캘리브레이션은 자기가 몇 퍼센트 맞힐지를 아느냐다.
60%만 맞히는 모델이 스스로 60%라고 말하면 캘리브레이션은 만점이다.
영상의 강수확률 비유가 정확하다.

소프트웨어 입장에서 중요한 이유는 하나다. **임계값을 그을 수 있게 된다.**
확실한 90%는 싸게 처리하고 애매한 10%만 비싼 경로로 올린다.
TypeSafe 문서가 이것을 0.9 / 중간 / 0.5 세 구간으로 제시한다.

---

## 3. Jev 가 실제로 무엇인가

### 3.1 인터페이스

엔드포인트 하나다. `POST https://api.typesafe.ai/v1/systemone`
요청은 `state`(평가 대상), `model`, `questions`(질문 맵) 셋이다.

질문 타입은 셋뿐이다.

| 타입 | 묻는 것 | 돌려주는 것 |
|---|---|---|
| `choice` | 이 중 어느 것인가 | 선택, `probabilities`, `confidence` |
| `score` | 어느 수준인가 | 점수, legend, `probabilities`, `confidence` |
| `noul` | 참인가 | 0~1 확률 하나. **`confidence` 없음** |

`noul` 에 confidence 가 없다는 사실이 6장의 근거 하나다.

### 3.2 아키텍처 (전부 외부 추론이다)

TypeSafe 는 아키텍처를 공개하지 않았다. 아래는 Archer Hume 이 API 약 10,000회 호출로 복원한 것이고,
본인이 "This is clearly all quite speculative" 라고 먼저 적었다. 인용할 때 이 단서를 떼면 안 된다.

- **state 를 한 번 읽고 질문 분기를 병렬로 붙인다.** 실측 근거가 좋다. 질문 100개까지는 서버 시간이
  거의 안 변하고, 1,500개에서 610ms 다. 질문마다 state 를 복사한다면 23k state + 5,000질문이
  1억 토큰을 넘어야 하는데 실제 한도는 65,536이다.
- **질문끼리는 서로 못 읽는다.** 비밀을 형제 질문에 두면 보고 확률이 0.00, 같은 내용을 state 에
  두면 0.90~0.92 로 올라갔다.
- **선택지는 목록으로 함께 읽힌다.** 관계없는 다섯 번째 선택지를 추가하자 남은 둘 사이의 log-odds 가
  +0.38 에서 +0.11 로 떨어졌다. 각 선택지가 독립 logit 을 갖고 softmax 만 다시 정규화한다면
  이 값은 변하지 않아야 한다.
- **디코딩이 없다.** 선택지 255개짜리 응답이 2개짜리와 같은 속도로 돌아온다.
- **sparse MoE 로 본다.** 30k 토큰을 약 160ms 에 처리하는 것이 dense 70B 로는 1초쯤 걸린다는 추정.
  저자 스스로 가장 불확실한 부분이라고 했고, dense 로 바꿔도 나머지 설명은 그대로라고 덧붙였다.
- **토크나이저가 공개 192종 어디와도 안 맞는다.** 자릿수를 개별로 쪼개고 o200k 와 가깝지만 같지는 않다.
  Qwen 과 415개 중 348개가 일치한다.

### 3.3 벤더가 스스로 공개한 실패 양상 아홉 가지

`docs.typesafe.ai/model-jaggedness/jev-1.13` 이 있다. 벤더가 자기 모델의 깨지는 지점을
문서로 내는 것은 드물고, 이 글에서 가장 정직한 자료다.

1. 문자 그대로 읽는다. 의도가 아니라 쓴 문장에 답한다
2. 셈을 못 한다. 계산은 코드로 하라고 명시
3. 날짜를 순서가 있는 양이 아니라 텍스트로 읽는다
4. 간접 지시가 겹치면 정확도가 떨어진다
5. 무관한 내용이 큰 state 에 섞이면 정확도가 떨어진다. 원문 표현이 "context rot"
6. 적대적 입력을 적대적으로 가정하지 않는다. 주입된 지시가 답을 움직일 수 있다
7. `instructions` 와 `criteria` 가 어긋나면 흔들린다
8. **구조적 항등식이 성립하지 않는다**
9. 생성을 못 한다

8번이 특히 중요하다. 벤더가 직접 실은 두 표다.

같은 질문을 Noul 과 Choice 로 물었을 때.

| Noul `noul` | Choice `yes` | Choice `no` | Choice `confidence` |
|---|---|---|---|
| 0.22 | 0.01 | 0.99 | 0.97 |

질문과 그 부정을 각각 Noul 로 물었을 때.

| `refund` | `not_refund` | 합 |
|---|---|---|
| 0.72 | 0.47 | 1.19 |

P(A) + P(¬A) 가 1.19 다. **여기서 나오는 확률은 하나의 결합된 확률 공간의 값이 아니다.**
질문 단위로 학습된 별개의 예측이고, 집계 수준에서 적중률과 맞는다는 의미의 캘리브레이션이다.
「calibrated probabilities」라는 말을 베이즈 확률처럼 읽으면 틀린다. 벤더가 직접 반례를 실어 준 셈이다.

---

## 4. 숫자가 출처마다 다르다

이것을 잡음으로 넘기지 않고 발견으로 쓴다.

| 출처 | 속도 | 배수 | 축 |
|---|---|---|---|
| 문서·런치 블로그 | 70~500ms | 40~200배 | 같은 지능 수준의 System One 질의 |
| 홈페이지 | 0.114초 대 8.566초 | 193.6배 / 444.6배 | 자사 workflow eval, 과제 단위 총비용 |
| 보도자료 | 100ms 미만 | up to 100배 | 미상 |
| Archer Hume 실측 | 360토큰 57ms, 29,835토큰 218ms, 질문 1,500개 610ms | 없음 | upstream service time 헤더 |

그리고 가격의 배수 두 개는 축이 다르다.
홈페이지의 `238x lower input price` 는 **토큰 단가** 비교이고, `444.6x cheaper` 는 **과제 단위 총비용**이다.
한 문장에 섞으면 틀린다. 어느 숫자를 쓰든 어느 축인지 같이 적는다.

벤치마크 기준선도 적어 둔다. 사이드바이사이드 데모의 비교 대상은 GPT-5.6 Terra 이고,
workflow eval 의 정답 기준은 GPT-6 Astra 와 Fable 5.1 의 평균이다.
후자를 회사 스스로 이렇게 적었다.

> We use the average of GPT-6 Astra and Fable 5.1 as the reference answer, which biases answers towards OpenAI and Anthropic's models.

그리고 워크플로를 만든 사람이 자사 capabilities 팀이라는 것도 본인들이 밝혔다.

---

## 5. 벤치마크에 대한 회사의 입장, 그리고 거기서 생기는 긴장

공개 4일 전(2026-09-11)에 낸 글 「Lies, Damned Lies, and Benchmarks」의 주장은 이렇다.
공개 eval 은 benchmaxxing 을 부르고, 신뢰는 리더보드에 외주 줄 것이 아니라 직접 정직해서 얻어야 한다.
그래서 표준 벤치마크 표를 내지 않고, eval 은 날짜 붙은 스냅숏으로 한 번만 내고 폐기하며,
자기들에게 불리한 증거도 같이 싣겠다고 했다.

FAQ 원문.

> We deliberately chose **not** to publish performance against **public** benchmarks.

실제로 `model-jaggedness` 페이지는 이 약속을 지킨 결과물로 보인다.

**긴장은 여기다.** 같은 주에 홈페이지 헤드라인은 자사 eval 로 뽑은 193.6배다.
공개 벤치마크를 안 내는 선택이 원칙에서 나왔는지 비교 불가능성에서 나왔는지는 밖에서 구분되지 않는다.
결과적으로 MMLU-Pro 84.6% 를 잰 것은 회사가 아니라 제3자였다.
이 관찰은 사실이고, 동기를 단정하지 않는 선에서 쓸 수 있다.

---

## 6. 척추 후보: probabilities 와 confidence 는 다른 물건이다

Jev 응답에는 두 가지가 들어 있다.

**`probabilities`.** 학습으로 만들어진 예측 분포. RLCD 가 손대는 것은 이쪽이다.

**`confidence`.** 그 분포를 숫자 하나로 접은 것. 학습된 값이 아니다. 산식이다.

근거는 추론이 아니다. TypeSafe 가 공개한 어댑터의 소스 코드다.
`typesafe-ai/system-one-adapter-python` 의 `_utils/confidence_metrics.py` 전문이 32줄이고,
그중 Choice 부분이 이것이다. (사본을 `typesafe-confidence_metrics.py` 로 같이 보관했다)

```python
def choice_confidence(probs: list[float]) -> float:
    """Scale peak choice probability from uniform to certainty."""
    if len(probs) == 1:
        return 1.0

    normalized_probs = _normalize(probs)
    uniform_probability = 1.0 / len(normalized_probs)
    return (max(normalized_probs) - uniform_probability) / (1.0 - uniform_probability)
```

모델 호출도 학습된 파라미터도 없다. `probabilities` 벡터 하나가 들어가고 실수 하나가 나온다.
`c = (p_max − 1/K) / (1 − 1/K)` 이고, 분자와 분모에 K 를 곱하면 `(K·p_max − 1) / (K − 1)` 이다.
문서 `confidence.md` 의 데모 코드 `(count * peak - 1) / (count - 1)` 와 글자까지 같다.
문서는 이것을 「세 선택지에 대한 근사」라고 낮춰 적었지만 실제로는 일반 K 에 대해 정확한 같은 식이다.

선택지가 셋이고 최대 확률이 0.8 이면 0.7 이다. 균등 분포에서 선두가 얼마나 솟았는지를 잴 뿐이고,
**「이 답이 맞을 확률」의 두 번째 추정치가 아니다.**

Score 는 아예 다른 식을 쓴다. 최빈 수준으로부터의 평균 절대 거리를 균등 분포의 그것으로 나눈다.
그러니까 `confidence` 라는 한 이름 아래 산식이 둘 있고, 타입이 다르면 같은 숫자가 다른 뜻이다.

문서도 이것을 숨기지 않는다. "a statistic computed from the probability distribution" 이라고 쓰고,
다른 계산을 쓰고 싶으면 `probabilities` 전체를 줄 테니 알아서 하라고까지 한다.
`noul` 에 `confidence` 가 없는 것도 같은 이유다. 접을 분포가 없다.
**그러니 이것은 폭로가 아니다.** 벤더가 문서와 코드 양쪽에 적어 둔 것을 아무도 읽지 않았을 뿐이다.

그런데 마케팅 문장은 둘을 붙여 쓴다.

> Always communicates confidence and uncertainty with every output. Calibrated: higher confidence means higher accuracy.

읽는 사람은 `confidence` 가 캘리브레이션된 값이라고 받는다. 실제로 캘리브레이션 주장이 걸려 있는 것은
`probabilities` 쪽이다. 3장의 1.19 표가 그 둘을 붙여 읽으면 안 되는 이유를 벤더 스스로 보여준다.

**실무에서 갈리는 지점이 있다.** 임계값을 `confidence` 에 걸면 선택지 개수 K 가 바뀔 때 같은 분포가
다른 값을 낸다. Archer Hume 이 지적한 대로 선택지 순서를 바꾸는 것만으로 0.9 근처의 임계값이
행동을 바꿀 수 있다. 문서가 권하는 0.9 / 0.5 구간을 그대로 쓰는 코드가 먼저 만나는 함정이다.

---

## 7. 독립 검증에서 나온 것

### 7.1 Archer Hume (2026-09-17)

API 외부 probing. 요청 약 10,000회. 측정에서 나온 것과 추론한 것을 본문에서 계속 구분한다.
가장 강한 관측은 질문 격리, 선택지 상호작용, 디코딩 부재. 가장 약한 것은 sparse MoE.
캘리브레이션은 MMLU 1,200문항 ECE 0.0313.

**주의할 비교 하나.** GPT-4 사전학습 모델의 ECE 가 0.007 이고 PPO 이후가 0.074 다.
Jev 의 0.0313 은 그 사이에 있다. **직접 비교가 아니다.** MMLU 부분집합도 bin 수도 시기도 다르고,
게다가 Jev 쪽 1,200문항 중 990개가 0.9~1.0 한 bin 에 몰려 있어 ECE 가 사실상 그 bin 하나에 지배된다.
세 숫자를 한 줄에 세워 순위처럼 읽히게 두면 안 된다. 쓴다면 이 두 단서를 같은 문단에 넣는다.

### 7.2 Jev 의 확신도는 과제가 바뀌어도 거의 안 움직인다

Kev 리포의 `runs/jev-*/` 에 **Jev 자체를 잰 원시 지표**가 들어 있다.
`usage.json` 이 `"model": "typesafe-ai/jev"` 이고 Vercel AI Gateway 경유 실호출이다.
`runs/jev-*/` 여섯 개의 `usage.json` 합계로 2026-09-18 과 09-20 에 5,364회, 입력 2,418,260 토큰, 출력 414,735 토큰, 추정 $0.1016. (`research-jev-v1`, `transfer-jev-v1` 등 glob 밖의 실행 셋을 더하면 6,912회 / 3,177,115 토큰. `jev-scienthoon-v1` 은 scienthoon 의 결과 파일을 변환한 것이라 API 실행이 아니다)
**호출당 $0.0000189 이고 출력 토큰은 과금되지 않았다.** 가격 주장은 이렇게 제3자 실측으로 확인된다.

| 스위트 | n | 정확도 | 평균 확신도 | 과신 | ECE | 잔차 |
|---|---|---|---|---|---|---|
| `jev-semif-v1` | 144 | 0.965 | 0.965 | -0.000 | 0.011 | +0.011 |
| `jev-transfer-v9` | 1,046 | 0.854 | 0.880 | +0.026 | 0.034 | +0.008 |
| `jev-transfer-v4` | 656 | 0.857 | 0.903 | +0.046 | 0.049 | +0.003 |
| `jev-transfer-v2` | 560 | 0.855 | 0.900 | +0.045 | 0.055 | +0.011 |
| `jev-decision-v4` | 1,264 | 0.845 | 0.906 | +0.061 | 0.067 | +0.006 |
| `jev-decision-v2` | 1,200 | 0.833 | 0.904 | +0.071 | 0.074 | +0.002 |
| `jev-scienthoon-v1` | 873 | 0.753 | 0.851 | +0.099 | 0.105 | +0.006 |

과신은 `평균 확신도 − 정확도`, 잔차는 `ECE − 과신` 이다.

**2026-09-23 수정.** 초판 표의 `transfer-v9` 행(1,156 / 0.815 / 0.854 / 0.043)은 `report.json` 의 `calibrated_clean` 블록이었다. 그 커밋(`757776a`)에서 그 블록은 판단 근거를 지운 「알 수 없는」 항목 110개를 정확도 채점에 넣고 있었고, 나머지 여섯 행은 `clean` 블록이라 정의가 섞여 있었다. `clean` 으로 통일했다. 총 n 은 5,853 이 아니라 5,743 이고, transfer-v9 의 5% 예산 자동화 비율도 0.618 이 아니라 0.695 다. 채점기의 `metric_policy` 는 이 값을 「표본 안에서 임계값을 고른 최댓값이고 배포 오차 보장이 아니다」라고 적는다.

**측정된 ECE 가 과신 하나로 거의 전부 설명된다.** 잔차가 일곱 개 전부 0.002 에서 0.011 사이다.
ECE 는 bin 별 격차의 가중 평균이라 전체 과신보다 작을 수 없고, 그 차이가 bin 사이에 흩어진 성분이다.
그게 거의 0이라는 것은 **miscalibration 이 구간마다 제각각인 잡음이 아니라 전 구간에 걸친
균일한 위쪽 이동**이라는 뜻이다.

세로로 읽으면 이유가 보인다. 평균 확신도는 0.851~0.906 사이에 여섯 개가 붙어 있다(semif 제외).
같은 구간에서 정확도는 0.753~0.857 로 두 배 넓게 움직인다.
**확신도는 분포가 바뀌어도 잘 안 움직이고 정확도만 움직인다. 남는 차이가 그대로 ECE 다.**

「어려워질수록 무너진다」고 쓰면 안 된다. 단조롭지 않다. `transfer-v9` 는 `transfer-v4` 보다
정확도가 낮은데(0.815 대 0.857) ECE 도 낮다(0.043 대 0.049). 움직이는 것은 난이도가 아니라
그 분포에서 모델의 확신도가 얼마나 어긋나 있는가다.

**이것이 척추와 만나는 지점이다.** 균일한 이동이면 온도 하나로 대부분 고쳐진다.
Kev 가 실제로 그렇게 한다(온도 2.1~2.4, ECE 0.106 에서 0.042). 그런데 온도를 맞추려면
**그 분포의 라벨이 필요하고, 프로덕션에서 없는 것이 정확히 그것이다.**
그러니 RLCD 가 사는 자리는 눈금이 아니라 **순서**다. 눈금은 분포마다 다시 맞춰야 한다.
7.3 의 자동화 비율 격차(온도 보정으로 메워지지 않는 부분)가 그 순서의 값이다.

그리고 README 가 내세운 자동화 비율 0.70 은 `jev-decision-v4` 한 스위트의 값이다.
같은 지표가 `jev-scienthoon-v1` 에서 0.486 이고 `jev-semif-v1` 에서 1.000 이다.
**모델의 스펙처럼 인용하면 안 된다.**

### 7.3 제3자 벤치마크가 이미 여럿이다

launch 주에 독립 벤치마크가 여러 개 나왔다. 전부 공개 코드와 원시 응답을 함께 낸다.

| 리포 | 과제 | n | Jev | 비교 대상 |
|---|---|---|---|---|
| `anisselbd/jev-phishing-bench` | 피싱 판정 | 2,000 | **62.6%** [60.5, 64.7] | Claude Haiku 4.5 **81.3%**, 링크 호스트 목록 규칙 하나 91.6% |
| `bitnovus/jev-spam-eval` | 스팸, 분포 안 | 18,514 | 98.3% | TF-IDF logreg 98.4% |
| `bitnovus/jev-spam-eval` | 스팸, 분포 밖 | 2,876 | **98.6%** | TF-IDF logreg **73.0%** |
| `anessbelbati/jev-rerank-bench` | rerank 14종 | 1,617 | nDCG@10 0.692 | Cohere Rerank 4 Pro 0.691 (동률) |
| `scienthoon/jev-ood-calibration` | 규칙 생성 티켓 | 900 | 75.1% | 없음 |
| `themsquared/jev-benchmark` | 도구 호출 위험 | 60 | 91.7% | 없음 |

**이 표가 「이 층은 무엇에 쓰는가」에 답한다.** 분포 안에서는 정규식이나 맞춰 놓은 분류기가 비기거나 이긴다
(스팸 98.3 대 98.4, 피싱에서 정규식 91.6 대 Jev 62.6). **라벨이 없고 분포가 새로울 때 격차가 벌어진다**
(분포 밖 스팸 98.6 대 73.0). 데이터를 모아 학습시킬 수 없는 자리가 이 모델의 자리다.

속도와 비용의 실제 배수도 헤드라인과 다르다.

| 출처 | 비교 대상 | 속도 | 비용 |
|---|---|---|---|
| `jev-phishing-bench` (n=2,000) | Claude Haiku 4.5 | 2.9배 (239ms 대 687ms) | 12배 ($0.038 대 $0.462 / 1k) |
| `jev-rerank-bench` (n=1,617) | Cohere Rerank 4 Pro | 2배 (422ms 대 844ms) | 5.6배 |

**193.6배와 444.6배는 자사 워크플로 eval 의 상단값이다.** 실측은 한 자릿수에서 열몇 배다.

### 7.4 캘리브레이션 주장은 규모 있는 측정에서 무너진다

`SamuelSacco/jev-exploration` 이 발표된 ECE 를 전부 각 연구의 커밋된 데이터로 재계산하고
**표본 수에 맞는 잡음 바닥(noise floor)** 과 비교했다. 이 방법이 중요하다.
작은 n 에서는 완벽히 캘리브레이션된 모델도 ECE 가 크게 나오기 때문이다.

| 연구 | n | 정확도 | ECE | 잡음 바닥 | 비 |
|---|---|---|---|---|---|
| `jev-spam-eval` | 19,528 | 98.3% | 0.0508 | 0.0039 | 13.0배 |
| `jev-phishing-bench` P(phishing) | 2,000 | 62.6% | 0.1701 | 0.0206 | 8.3배 |

**주의.** 0.1701 은 원장이 `is_phishing` noul 의 P(phishing) 을 [0,1] 10구간으로 다시 잰 값이다. 피싱 리포 자체가 보고하는 Jev 의 ECE 는 verdict choice 기준 **0.154**(10구간)이고 Haiku 4.5 는 0.097 이다. Haiku 는 원장이 다시 재지 않았다.
| **`jev-phishing-bench` `confidence`** | 2,000 | 62.6% | **0.1536** | 0.0209 | 7.3배 |
| `jev-benchmark` (latest) | 60 | 91.7% | 0.0712 | 0.0456 | 1.6배 |
| `jev-benchmark` (preview) | 60 | 91.7% | 0.0505 | 0.0452 | 1.1배 |

세 연구의 발표 수치가 그대로 재현됐다. **n=60 짜리 연구는 어느 방향으로도 캘리브레이션을 말할 수 없다.**
바닥이 0.045 인데 보고값이 그 위에 얹혀 있고, 60개 중 50개가 한 bin 에 몰려 있다.
(Archer Hume 의 MMLU 1,200문항 ECE 0.0313 도 990개가 0.9~1.0 bin 에 있었다. 같은 주의가 필요하다)

**피싱 벤치마크는 모든 bin 에서 과신이다.** 확신도 0.85~0.95 구간에서 0.90 을 말하고 실제로 60%를 맞힌다.
확신도 0.9 이상으로 자르면 커버리지 30.8%에 적중 73.9% 다.
원장의 표현은 이렇다. **"There is no threshold at which its confidence is safe to route on."**

**`confidence` 필드 자체의 캘리브레이션도 측정됐다.** `scienthoon/jev-ood-calibration` 이
이 값을 「맞을 확률」로 읽었을 때의 ECE 를 따로 냈다.

> TypeSafe also returns a separate `confidence` statistic. Read as a probability of being correct,
> its ECE is 0.035 on OpenBookQA, 0.078 on HellaSwag (worse than the max-probability), and 0.18 on the synthetic set.

**6장의 주장이 여기서 수치로 확인된다.** `confidence` 는 적중 확률이 아니다. 그렇게 읽으면
원본 확률보다 더 나쁘다.

그리고 같은 연구가 **오차의 부호가 질문 타입마다 뒤집힌다**는 것을 찾았다.
같은 입력에서 Choice 와 Score 는 과신(refit T 3.3~3.4), Noul 은 과소(refit T 0.66)다.
결론은 "Calibrate per question, not per model" 이다.
**내 실험에서 Noul 과 Choice 의 결론이 14~17% 갈린 것과 같은 자리다.**

가장 날카로운 항목은 분포 밖의 「알 수 없는」 질문이다. 정답 규칙이 본문에 없어 어떤 모델도 복원할 수 없는
질문에서 Jev 는 44.7%를 맞혔고(우연 25%), **고른 답에 평균 0.74 의 확률을 실었다.**
정직하게 만들려면 온도 3.40 이 필요하다.

> The question is whether Jev's probabilities *reflect* that it cannot know. They do not.

### 7.5 「환각하지 않는다」는 벤더 각주로 반박된다

0% 막대의 각주가 이렇다.

> Our number is not empirical. Schema matching is guaranteed, thus we can confidently add 0% into the plots.

그리고 TypeSafe 문서 자신이 이렇게 적는다.

> Typed output guarantees the interface, not truth.

형식은 보장되고 내용은 아니다. 피싱 벤치마크에서 **형식이 올바르면서 틀린 답이 37.4%** 였다.
제약된 디코딩은 어느 모델에나 같은 형식 보장을 준다.

### 7.6 Kev (Jared Palmer)

Jev 를 흉내 낸 오픈소스. Qwen 베이스 + rank-16 LoRA + pointer head. Apache-2.0.
README 가 Jev 와의 수치를 같이 싣는다. **Jev 출력으로 학습하지 않았다고 명시한다.**

속도가 이 이야기의 일부다. Jev 공개가 2026-09-15, 리포 생성이 09-17, 첫 가중치가 09-18,
Qwen3.5 기반 0.8B/4B/9B 제품군이 09-20 이다. 09-22 기준 별 2,576개.
아키텍처의 출처는 TypeSafe 가 아니라 Archer Hume 의 복원이다. README 가 그렇게 밝힌다.

| 항목 | Jev | Kev-9B |
|---|---|---|
| 새 출처 정확도 (dev) | 0.857 | 0.822 |
| Brier (새 출처) | 0.211 | 0.237 |
| 확률 0.9 이상으로 틀리는 비율 | 3.7% | 4.0% (보정 후) |
| 5% 오차 예산에서 자동화 가능 비율 | **0.70** | 0.45~0.57 |
| MMLU / MMLU-Pro | 0.90 / 0.84 | 0.74 / 0.52 |
| 판단 근거가 제거된 항목에 0.9 이상으로 답하는 비율 | **9%** | 5% |

읽는 법이 두 갈래다.

**먼저 원저자의 단서를 붙인다.** Palmer 가 표 바로 아래에 이렇게 적었다.

> We don't know which datasets Jev was trained on, so this isn't a controlled comparison of the two architectures.

아래 두 해석 모두 이 단서 안에서만 유효하다.

**Jev 쪽에 유리한 것.** Kev 는 온도 보정(temperature fitting)으로 ECE 를 0.106 에서 0.042 까지 내린다.
그런데 온도 보정은 확률의 **순서를 바꾸지 못한다.** 그래서 5% 오차 예산에서 자동화할 수 있는 비율이
0.70 대 0.45~0.57 로 여전히 크게 벌어진다. 이 차이는 사후 보정으로 설명되지 않는다.
학습 단계에서 무언가를 했다는 가장 구체적인 외부 단서다. 증거라고 부르기에는 통제가 없다.

**Jev 쪽에 불리한 것.** 근거가 제거된 「알 수 없는」 항목에 0.9 이상 확신으로 답하는 비율은
Jev 가 9%, Kev-9B 가 5% 다. 「모른다고 말할 줄 안다」는 주장의 반대 방향 데이터다.
그리고 scienthoon 의 지원 티켓 900건에서는 라우팅 정확도가 Kev-9B 0.952, Jev 0.897 로 뒤집힌다.

**그리고 이것이 영상의 핵심 지적을 뒷받침한다.** Jev 의 진짜 경쟁자는 프론티어 LLM 이 아니라
작은 전용 모델이다. 4일 만에 노트북에서 도는 복제본이 나왔고, 지금은 9B 까지 올라와 격차가
몇 점 단위다. 남는 차이는 지식 폭(MMLU-Pro 0.84 대 0.52)과 캘리브레이션의 순서 품질이다.

---

## 8. 한국 독자에게 직접 걸리는 것

`models.md` 원문이다.

> English is the primary training language and where accuracy is currently best. Other languages, including CJK scripts, are handled but not equally well; test on your own content before relying on Jev for a non-English workload.

한국어 워크로드에 그대로 쓰면 문서가 경고한 자리로 들어간다.
영상도 이 부분을 다루지 않았다. 글에 넣을 값어치가 있다.

---

## 9. 이름의 유래

- **System One.** Kahneman 의 『Thinking, Fast and Slow』. 회사도 FAQ 에서 밝힌다.
  **다만 긴장이 있다.** Kahneman 의 System 1 은 연상적이고 자동적이며 **캘리브레이션이 나쁜** 것으로
  유명하다. 「빠르게 고르고 정직한 확률을 준다」는 System 1 이 못 하는 일이다.
  회사도 이것을 알고 FAQ 에 한 줄 달아 두었다. "System 1 thinking has also implied error-prone.
  For reasons we will get into in the future, we believe System One Models can be made more reliable
  than its alternatives." 근거는 아직 안 냈다.
- **Jev.** William Stanley Jevons. 석탄 효율이 좋아지자 수요가 폭증한 Jevons 역설.
  지능의 단가가 한 자릿수 떨어질 때마다 쓰임이 그보다 더 늘어난다는 베팅이다.
- **Noul.** 어원을 어느 출처에서도 찾지 못했다. 글에서 설명을 시도하지 않는다.

---

## 10. 열린 질문

확인되지 않은 것을 추측으로 메우지 않는다.

1. RLCD 의 실제 목적함수. 강화학습이 맞는지조차 밖에서 확인되지 않는다.
2. 학습 목적함수와 사후 보정 중 어느 쪽이 관측된 캘리브레이션을 만들었는가. API 로는 못 나눈다.
3. 베이스 모델. 토크나이저가 공개 192종 어디와도 안 맞는다.
4. 가격의 지속 가능성. 회사가 증명할 수 없다고 스스로 적었다.
5. Vercel·Brio AI 증언의 원 게시물.
6. 한국어에서의 실제 정확도. 아무도 공개하지 않았다.

---

## 11. 정해진 것

**척추는 필자의 실측이다.** 2026-09-22 에 A 를 골랐다.

이 리포의 음차 판별 게이트를 결정 모델에 넘겨 봤다. 게이트는 지금 정규식 15개이고,
`write-post.md` 가 「기계가 막는 목록과 사람이 판단하는 목록이 다르다」고 적어 둔 그 나머지 절반이
정확히 System One 과제의 모양이다. 답이 둘뿐이고, 1초에 판단하고, 아무도 안 보는 자리에서 돈다.

절차와 집합 구성은 `experiment/README.md`, 결과는 `experiment/RESULTS.md` 에 있다.

**결과 한 줄.** 5% 오차 예산에서 자동 처리할 수 있는 결정이 한 건도 없었다(`coverage_at_5pct_error = 0.0`).
그런데 모델이 돌려준 평균 확신도는 0.79 였다. 규칙을 `state` 에 글로 넣어 주자 상수만 뒤집혔고
균형 집합 정확도는 0.500 에서 0.500 그대로였다. 예측이 문장마다 흩어졌으니 문장은 읽는다. 읽기는 하는데 구별을 못 한다.
같은 실행에서 구조적 항등식만 회복됐다(보류 집합의 합이 1.508 에서 0.963). 그리고 지금 쓰는 정규식 게이트가 1.000 대 0.422 로 이긴다.
Jev 에 early access 가 없어 공개 재현 구현인 Kev-9B 를 로컬에서 돌렸다. **Jev 자체가 아니다.**
그래서 글에서 이 수치를 Jev 의 수치로 쓰면 안 된다.

6장(probabilities 대 confidence)은 그대로 척추에 남는다. 실측이 그 주장을 시험한다.

## 12. jevable 의 194개 프로젝트 (2026-09-23 추가)

`jevable/README.md` 와 `jevable/projects.json`. Nikunj 의 독립 큐레이션이라 벤더 자료가 아니고,
각 항목의 수치는 게시자 자기 보고다. 본문에서는 「어디에 쓰이는가」의 표본으로만 쓰고,
성능 근거로는 쓰지 않는다. 194개 설명문 중 비용 30, 속도 53, 정확도·기준선 7 이라는 비율이
이 글의 논지(빠르고 싸다는 것은 첫날 알 수 있고 맞는지는 재야 안다)와 맞는 관찰이다.

## 13. 서두 교체 (2026-09-23)

원래 서두는 음차 게이트의 내부(`terminology.yml`, 15개, 9개, `멀티thread`)를 세 문단 먼저 놓았다.
독자가 Jev 가 무엇인지 모르는 상태라 「답이 둘뿐이고 1초에 판단」이라는 추상이 붙을 곳이 없었다.
Stagehand PR(표 21행)을 3자 사례로 앞에 놓고 게이트는 「필자가 재볼 자리」로 뒤에 두었다.
「아무도 안 보는 자리」는 뒤 절의 Almeida 구분을 앞당긴 표현이라 「빌드 스크립트 안에서 사람 확인 없이」로 풀었다.
결론 선언(「그대로는 안 된다」)은 서두에서 빼고 절 순서 안내로 바꿨다. 글의 성격이 판정문이 아니라 탐색이라는 원장의 판단이다.

## 14. 그림 (2026-09-23)

| 파일 | 자리 | 무엇 |
|---|---|---|
| `1.png` (`1.html`) | 서두, Stagehand 문단 뒤 | act() 파이프라인. 지시문 + 접근성 트리 → 후보 목록(30개 상한) → Jev 질문 둘(best/strict) → 해당 없음 확률로 분기 → 클릭 143 / LLM 4 |
| `2.png` | RLHF가 남긴 자리, 「캡션이 이렇다」 뒤 | GPT-4 Technical Report Figure 8 스크린샷(원장 제공). 그림 아래 출처 줄 |
| `3.png` (`3.html`) | confidence의 정체 첫 그림 | probabilities 와 confidence 의 관계 |
| `4.png` (`4.html`) | Score/Noul 문단 뒤 | p_max 눈금을 confidence 눈금으로 당기는 그림. 식은 적지 않는다 |
| `5.png` (`5.html`) | 「남는 차이가 그대로 ECE」 뒤 | 7 집합 덤벨, 흰 배경 손그림 |
| `6.png` (`6.html`) | 집합 목록 뒤 | 두 집합의 되돌릴 문장 / 그대로 둘 문장 비율과 정규식 커버리지 |
| `7.png` (`7.html`) | 규칙을 state에 넣은 결과, 「0.500에서 0.500」 문단 뒤 | 게이트에 없는 단어 60문장의 전후. 30/30+0/30 → 8/30+22/30, 합은 30 그대로 |

**Stagehand PR #2953 의 실제 판정 규칙(2026-09-23 PR 본문·#2952 확인).** 후보는 intent 별 view(pointer, input, select, …)에서
만들고 40개를 넘으면 지시문 단어와 겹치는 상위 30개로 줄인다. 질문은 요청마다 둘이다. `best`(반드시 하나 고른다)와
`strict`(「없음」 선택지 포함). 판정은 strict 의 「없음」 확률로 한다. **> 0.9 면 거부, best 채택이고 ≤ 0.5 면 즉시 수용,
≤ 0.7 이면 보류하고 다음 tier**. 블로그의 "acceptance threshold of 0.7" 은 이 중간 문턱이다. 임계값은 벤치마크 스위트에서
in-sample 로 튠했다고 PR 이 스스로 적었다. 그림 1 은 이 tier 를 「해당 없음 확률이 낮은가」 하나로 접었다.

**GPT-4 Figure 8 은 원장 결정으로 넣었다.** arXiv 2303.08774 는 CC BY 가 아니라 arXiv non-exclusive
distribution 라이선스라는 점을 알렸고, 원장이 그대로 넣기로 했다. 그림 아래 출처 줄로 표기한다.
X 게시물의 gif·영상(jevable 항목)은 내려받지 않았다.

**다크 테마 도표는 이 글에서 한 번 만들고 폐기했다.** 원장이 그 UI 를 더 만들지 않겠다고 했고, `write-post.md` 의
제작 방법 2 를 흰 배경 손그림으로 바꿨다. 그림 안에 해설 문단도 넣지 않는다.

**용어 정리.** 「게이트 집합 / 보류 집합」은 코드 파일명(`set_gate`, `set_heldout`)을 옮긴 조어였다.
본문에서는 「게이트에 있는 단어 / 게이트에 없는 단어」로 풀고 held-out 은 용어 해설로 한 번만 단다.
「양성 / 음성」은 「되돌릴 문장 / 그대로 둘 문장」, 「반사실 문장」은 「필자가 만든 문장」, 「구조적 항등식」은
「두 확률의 합이 1이 되는 관계」로 바꿨다. 번역본은 각 언어의 정착 용어(gate set, held-out, positives)를 그대로 둔다.

**용어 해설(`:term`) 10개.** calibration, ece, rlhf, prefill, lora, error-budget, data-leakage,
out-of-distribution, accessibility-tree, held-out-set. `content/glossary.json` 에 6개 로케일로 추가했다.

## 15. 제목 (2026-09-23)

`Jev` → `결정 모델, Jev와 Kev`. Kev 실측이 두 절이라 공동 주제로 올렸고, 범주를 앞에 둬 비교 글로 읽히지 않게 했다.
괄호 대신 쉼표는 제목·부제 규칙. 「결정 모델」은 TypeSafe 의 System One Model 을 옮긴 번역어라
첫 등장 문장 뒤에 「이 글에서는 결정 모델이라고 부른다」를 6개 로케일에 넣었다.
`seoTitle` 은 Jev, Kev, 결정 모델, confidence 임계값, 캘리브레이션을 담아 로케일별로 다시 썼다(ko 51자).

## 16. 후보 셋 삭제 (2026-09-23)

원장이 jevable 절 끝의 「그러면 무엇을 만들어 볼 만한가」 문단, 후보 셋 목록(harness 명령 게이트, browser agent action,
분기 UI), 2×2 그림(8.png), 「반대로 이메일과…」 문단을 한글 원문에서 지웠다. 의도한 삭제로 확인했고 번역 5개에서
같은 네 블록을 지웠다. 8.png 와 8.html 도 삭제. jevable 절은 이제 「빠르고 싸다는 것은 첫날 알 수 있고 맞는지는
재야 안다」 관찰과 jevcal 언급에서 끝나 바로 「선을 긋는 절차」로 넘어간다.

## 출처

### 1차 (원문 확인)

- TypeSafe 런치 포스트, `https://typesafe.ai/blog/introducing-system-one-models-and-jev` (2026-09-15)
- TypeSafe 「The Bitterest Lesson」, `https://typesafe.ai/blog/bitterest-lesson` (2026-09-10)
- TypeSafe 「Lies, Damned Lies, and Benchmarks」, `https://typesafe.ai/blog/antibenchmaxxing` (2026-09-11)
- TypeSafe 매니페스토 / 팀 페이지
- 문서 16개. `docs.typesafe.ai` 의 `.md` 원본
- GPT-4 Technical Report, arXiv 2303.08774. Figure 8 의 ECE 값은 PDF 스트림에서 직접 추출
- InstructGPT, arXiv 2203.02155
- Learning to Summarize from Human Feedback, arXiv 2009.01325
- Deep RL from Human Preferences, arXiv 1706.03741
- RLCD (Contrastive Distillation), arXiv 2307.12950
- Tülu 3, arXiv 2411.15124
- **TypeSafe 공식 어댑터 소스**, `github.com/typesafe-ai/system-one-adapter-python`,
  `src/system_one_adapter/_utils/confidence_metrics.py` (커밋 `fb52b10`). 사본 보관
- Kev README, `github.com/jaredpalmer/kev`

### 제3자 (전부 공개 코드와 원시 응답이 있다)

- Archer Hume, 「Jev's Architecture Unmasked」, `https://archerhume.com/posts/jevs-architecture-unmasked/` (2026-09-17). API 약 10,000회 probing
- `github.com/SamuelSacco/jev-exploration` 주장 감사 원장. `docs/claims-audit.md` 가 발표 ECE 를 전부 재계산하고 잡음 바닥과 비교한다
- `github.com/scienthoon/jev-ood-calibration` 분포 밖 캘리브레이션. `confidence` 자체의 ECE, 질문 타입별 오차 부호, refit 온도
- `github.com/anisselbd/jev-phishing-bench` 피싱 2,000건. Claude Haiku 4.5 대조, Wilson 구간과 McNemar 검정
- `github.com/bitnovus/jev-spam-eval` 스팸 18,514건. TF-IDF 대조
- `github.com/anessbelbati/jev-rerank-bench` rerank 1,617건. Cohere Rerank 4 Pro 대조
- `github.com/themsquared/jev-benchmark` 도구 호출 위험 60건. **n 이 작아 캘리브레이션은 말할 수 없다**
- `github.com/jaredpalmer/kev` 재현 구현. `runs/jev-*/` 에 Jev 실호출 기록
- Latent.Space, 「Here are 6 Clones of Jev in 2 days」

### 언론

- TechCrunch, 「A new kind of AI model from a ChatGPT inventor is thrilling developers」 (2026-09-18).
  Pranit Sharma(Vercel), Nikhil Mudholkar(Bryo AI), Armin Ronacher(Earendil) 증언의 원문
- XenoSpectrum 일본어 해설. 위 벤치마크들을 종합한다. **2차 출처이므로 수치는 원 리포에서 확인했다**

### 참고 (근거로 쓰지 않음)

- 유튜브 「ChatGPT 멤버가 만든 193배 빠르다는 AI, Jev 완전 분석 그리고 인사이트」,
  `https://www.youtube.com/watch?v=T7Kkjyd5igk`. 자동 생성 자막은 `youtube-transcript-ko.txt` 로 로컬에만 보관하고 리포에는 넣지 않았다.
  고유명사와 숫자가 여러 곳에서 깨져 있다. 프레임과 논점의 출처로만 쓰고 수치는 인용하지 않는다.
