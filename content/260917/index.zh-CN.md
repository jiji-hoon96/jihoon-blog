---
emoji: 🎯
title: "校准与 RLHF 带来的过度自信"
seoTitle: "模型校准与 ECE：RLHF 为什么让 LLM 过度自信"
date: "2026-09-17"
categories: AI 校准
description: "校准不是准确率，而是知道自己能答对百分之几的能力。本文说明 ECE 如何衡量这种偏离，以及优化人类偏好的 RLHF 为什么让模型过度自信，并以 GPT-4 技术报告中 ECE 0.007 与 0.074 为例。"
keywords: "模型校准, ECE, expected calibration error, RLHF 过度自信, LLM 过度自信, 校准 准确率 区别, GPT-4 校准, mode dropping"
locale: zh-CN
translationOf: '260917'
sourceHash: eb59e41f5cd98a6e2a1858a2dc53c9c860e30f9c25e4c4f59557f184b05b26d1
---

这篇文章想聊聊模型的校准，以及 RLHF 带来的过度自信。本文写给想把模型返回的概率或确信度当作代码中判断标准的开发者。读完之后，你可以说明准确率和校准有什么不同、ECE 衡量的是什么，以及用人类偏好打磨过的模型为什么说话比实际更有自信。

笔者在验证 TypeSafe AI 公开的决策模型 Jev 时，必须先把这个概念理清楚。Jev 不返回句子，而是为每个选项返回概率，并把校准作为训练目标。要检验这个说法，得先知道校准是什么，以及它在现有模型中为什么会偏。

## 准确率与校准

首先必须区分准确率和:term[校准]{key="calibration"}。准确率是能答对百分之几，校准是知不知道自己能答对百分之几。把说过降水概率 70% 的那些天汇总起来，如果实际十次里下了七次雨，那这个预报就是校准良好的。它不代表准确率高。它代表预报知道自己的极限。**只有 60% 正确率的模型，只要自己说 60%，校准就是满分。**

衡量这种偏离的指标是 :term[ECE]{key="ece"}（expected calibration error）。它把每个概率区间里“说出口的概率”与“实际命中率”的差值，按该区间的样本比例加权平均，0 为完美。

## RLHF 的目标函数

那么，用人的反馈打磨过的模型，为什么这个刻度会偏呢。答案在 :term[RLHF]{key="rlhf"}（reinforcement learning from human feedback）的谱系里。用人的偏好比较来建立奖励模型这一骨架出自 [Christiano 等人 2017 年的论文](https://arxiv.org/abs/1706.03741)，[Stiennon 等人在 2020 年](https://arxiv.org/abs/2009.01325)把它用到了语言模型上，InstructGPT 又扩展到指令跟随。三篇论文共享的目标函数只有一个。**给出人类评估者更偏好的输出。**

对聊天机器人来说，人的偏好是对的目标。问题在于，比起吞吞吐吐的回答，人更偏好有自信的回答。于是模型养成了含糊时也把话说死的习惯。TypeSafe 的文档把这叫作 [mode dropping](https://docs.typesafe.ai/introduction/machine-learning-primer)。意思是偏好优化把模型推向偏爱特定风格，同时压掉了其他可能输出的概率。

## GPT-4 的校准曲线

OpenAI 也把同样的事写进了自己的报告。[GPT-4 技术报告](https://arxiv.org/abs/2303.08774)的 Figure 8 把预训练模型和 post-training 模型的校准曲线并排放在一起，图注是这样的。

![GPT-4 技术报告的 Figure 8。左侧预训练模型的校准曲线贴着对角线，ECE 0.007；右侧 PPO 之后的模型大幅落在对角线下方，ECE 0.074](1.png?w=720)

来源: OpenAI, GPT-4 Technical Report (arXiv:2303.08774), Figure 8.

> Right: Calibration plot of the post-trained GPT-4 model on the same subset of MMLU. The post-training hurts calibration significantly.

按图上标出的数字，预训练模型的 ECE 是 **0.007**，经过 PPO（RLHF 中朝着提高奖励模型分数的方向更新模型的强化学习算法）的模型是 **0.074**。差了十倍以上。在被打磨得讨人满意的过程中，知道自己能答对百分之几的能力被削掉了。

## 结语

总结一下，校准不是能答对百分之几的问题，而是知不知道自己能答对百分之几的问题，ECE 就是衡量这种偏离的数字。RLHF 以人更偏好的输出为目标，而人偏好有自信的回答，所以模型在含糊时也会把话说死。在 GPT-4 上，这个代价体现为 ECE 从 0.007 变成 0.074。

把校准作为训练目标的决策模型 Jev 的概率是否真的诚实，笔者在[决策模型，Jev 与 Kev](/260922)中用公开的实测和自己的数据做了确认。

也希望读到这里的各位，在把模型返回的概率作为阈值写进代码之前，至少测一次：这个模型是以什么为目标训练的，在自己的数据上刻度准不准。
