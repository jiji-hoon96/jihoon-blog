---
emoji: 🎯
title: "LLM calibration과 overconfidence"
seoTitle: "LLM calibration과 ECE: RLHF가 모델의 overconfidence를 키우는 이유"
date: "2026-09-17"
categories: AI calibration
description: "calibration은 정확도가 아니라 자기가 몇 퍼센트 맞힐지 아는 능력이다. ECE가 그 어긋남을 어떻게 재는지, 사람의 선호를 최적화하는 RLHF가 왜 모델의 overconfidence를 키우는지 GPT-4 기술 보고서의 ECE 0.007과 0.074로 설명한다."
keywords: "모델 calibration, ECE, expected calibration error, RLHF overconfidence, LLM overconfidence, calibration 정확도 차이, GPT-4 calibration, mode dropping"
---

이번 포스팅에서는 모델의 calibration과 RLHF가 만드는 overconfidence에 대한 이야기를 해보려고 한다. 모델이 돌려주는 확률이나 확신도를 코드에서 판단 기준으로 쓰려는 개발자를 위한 글이다. 끝까지 읽으면 정확도와 calibration이 어떻게 다른지, ECE가 무엇을 재는지, 그리고 사람의 선호로 다듬은 모델이 왜 실제보다 자신 있게 말하는지 설명할 수 있다.

필자는 TypeSafe AI가 공개한 결정 모델 Jev를 검증하면서 이 개념부터 정리해야 했다. Jev는 문장 대신 선택지마다 확률을 돌려주고, calibration을 학습 목표로 내세운다. 그 주장을 따지려면 calibration이 무엇이고 기존 모델에서 왜 어긋나는지부터 알아야 했다.

## 정확도와 calibration

먼저 정확도와 :term[Calibration]{key="calibration"}을 구분해야 한다. 정확도는 몇 퍼센트 맞히느냐이고, calibration은 자기가 몇 퍼센트 맞힐지를 아느냐다. 강수 확률 70%라고 한 날들만 모았을 때 실제로 열 번 중 일곱 번 비가 왔다면 그 예보는 calibration이 잘 된 것이다. 정확도가 높다는 뜻이 아니다. 자기 한계를 안다는 뜻이다. **60%만 맞히는 모델도 스스로 60%라고 말하면 calibration은 만점이다.**

그 어긋남을 재는 지표가 :term[ECE]{key="ece"}(expected calibration error)다. 확률 구간마다 "말한 확률"과 "실제 적중률"의 차이를 그 구간의 표본 비율로 가중해 평균한 값이고, 0이 완벽이다.

## RLHF의 목표 함수

그렇다면 사람의 피드백으로 다듬은 모델은 왜 이 눈금이 어긋날까. :term[RLHF]{key="rlhf"}(reinforcement learning from human feedback)의 계보에 답이 있다. 사람의 선호 비교로 보상 모델을 세우는 골격은 [Deep reinforcement learning from human preferences](https://arxiv.org/abs/1706.03741)에서 나왔고, [Learning to summarize from human feedback](https://arxiv.org/abs/2009.01325)에 언어 모델에 적용했으며, InstructGPT가 지시 따르기로 확장했다. 세 논문이 공유하는 목표 함수는 하나다. **평가자인 사람이 더 선호하는 출력을 내는 것.**

챗봇에는 사람의 선호가 맞는 목표다. 문제는 사람이 우물쭈물하는 답보다 자신 있는 답을 선호한다는 데 있다. 그래서 모델은 애매할 때도 단정적으로 말하는 버릇을 들인다. TypeSafe 문서는 이것을 [mode dropping](https://docs.typesafe.ai/introduction/machine-learning-primer)이라고 부른다. 선호 최적화가 특정 스타일을 편애하도록 모델을 밀면서 다른 가능한 출력의 확률을 눌러 버린다는 것이다.

## GPT-4의 calibration 곡선

OpenAI도 같은 것을 보고서에 적었다. [GPT-4 기술 보고서](https://arxiv.org/abs/2303.08774)의 Figure 8은 사전학습 모델과 post-training 모델의 calibration 곡선을 나란히 놓는데, 캡션이 이렇다.

![GPT-4 기술 보고서 Figure 8. 왼쪽 사전학습 모델의 calibration 곡선은 대각선에 붙어 ECE 0.007 이고, 오른쪽 PPO 이후 모델은 대각선 아래로 크게 벌어져 ECE 0.074 다](1.png?w=720)

출처: OpenAI, GPT-4 Technical Report (arXiv:2303.08774), Figure 8.

> Right: Calibration plot of the post-trained GPT-4 model on the same subset of MMLU. The post-training hurts calibration significantly.

그림에 찍힌 숫자로는 사전학습 모델의 ECE가 **0.007**이고 PPO(보상 모델의 점수를 높이는 쪽으로 모델을 갱신하는 RLHF의 강화학습 알고리즘)를 거친 모델이 **0.074**다. 열 배 넘게 나빠졌다. 사람을 만족시키도록 다듬는 과정에서 자기가 몇 퍼센트 맞힐지 아는 능력이 깎인 것이다.

## 마무리

정리하면, calibration은 몇 퍼센트 맞히느냐가 아니라 자기가 몇 퍼센트 맞힐지 아느냐의 문제이고, ECE는 그 어긋남을 재는 숫자다. RLHF는 사람이 더 선호하는 출력을 목표로 삼는데, 사람은 자신 있는 답을 선호하므로 모델은 애매할 때도 단정적으로 말하게 된다. GPT-4에서는 그 대가가 ECE 0.007에서 0.074로 찍혔다.

Calibration을 학습 목표로 내세운 결정 모델 Jev의 확률이 실제로 정직한지는 [결정 모델, Jev와 Kev](/260922)에서 다룬다.

이 글을 읽는 독자 분들도 모델이 돌려준 확률을 코드에 임계값으로 박기 전에, 그 모델이 무엇을 목표로 학습됐고 자기 데이터에서 눈금이 맞는지 한 번쯤 재 보시길 바란다.
