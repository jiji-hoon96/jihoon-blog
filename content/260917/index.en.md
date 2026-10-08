---
emoji: 🎯
title: "Calibration and RLHF Overconfidence"
seoTitle: "Model Calibration and ECE: Why RLHF Makes LLMs Overconfident"
date: "2026-09-17"
categories: AI Calibration
description: "Calibration means knowing how often you will be right. How ECE measures it, and why RLHF makes models overconfident, via GPT-4's ECE 0.007 vs 0.074."
keywords: "model calibration, ECE, expected calibration error, RLHF overconfidence, LLM overconfidence, calibration vs accuracy, GPT-4 calibration, mode dropping"
locale: en
translationOf: '260917'
sourceHash: eb59e41f5cd98a6e2a1858a2dc53c9c860e30f9c25e4c4f59557f184b05b26d1
---

In this post, I want to talk about model calibration and the overconfidence RLHF creates. This is for developers who want to use the probability or confidence a model returns as a decision criterion in code. By the end, you will be able to explain how accuracy and calibration differ, what ECE measures, and why a model polished on human preference speaks more confidently than it should.

I had to sort out these concepts first while testing Jev, a decision model released by TypeSafe AI. Instead of sentences, Jev returns a probability for each option, and it puts calibration forward as its training objective. To weigh that claim, I first needed to know what calibration is and why it drifts in existing models.

## Accuracy and calibration

First you have to separate accuracy from :term[calibration]{key="calibration"}. Accuracy is what percentage you get right; calibration is whether you know what percentage you will get right. If you gather only the days a forecast said a 70% chance of rain and it actually rained seven times out of ten, that forecast is well calibrated. That does not mean it is accurate. It means it knows its own limits. **A model that gets only 60% right scores full marks on calibration if it says 60% about itself.**

The metric for that gap is :term[ECE]{key="ece"} (expected calibration error). For each probability bin it takes the difference between the "stated probability" and the "actual hit rate," weights it by that bin's share of the samples, and averages; 0 is perfect.

## The RLHF objective

Then why does a model polished with human feedback drift off this scale? The answer is in the lineage of :term[RLHF]{key="rlhf"} (reinforcement learning from human feedback). The skeleton of building a reward model out of human preference comparisons came from [Christiano et al.'s 2017 paper](https://arxiv.org/abs/1706.03741), [Stiennon et al. applied it to language models in 2020](https://arxiv.org/abs/2009.01325), and InstructGPT extended it to instruction following. The three papers share a single objective function. **Produce the output a human rater prefers.**

For a chatbot, human preference is the right objective. The trouble is that people prefer a confident answer to a hedging one. So the model picks up the habit of speaking decisively even when things are ambiguous. The TypeSafe documentation calls this [mode dropping](https://docs.typesafe.ai/introduction/machine-learning-primer): preference optimization pushes the model toward favoring a particular style and suppresses the probability of the other possible outputs.

## GPT-4's calibration curves

OpenAI wrote the same thing in its own report. Figure 8 of the [GPT-4 technical report](https://arxiv.org/abs/2303.08774) places the calibration curves of the pre-trained model and the post-trained model side by side, and the caption reads:

![Figure 8 of the GPT-4 Technical Report. The pre-trained model on the left hugs the diagonal with ECE 0.007; the post-PPO model on the right falls well below it with ECE 0.074](1.png?w=720)

Source: OpenAI, GPT-4 Technical Report (arXiv:2303.08774), Figure 8.

> Right: Calibration plot of the post-trained GPT-4 model on the same subset of MMLU. The post-training hurts calibration significantly.

By the numbers printed on the figure, the pre-trained model's ECE is **0.007** and that of the model tuned with PPO (the reinforcement learning algorithm RLHF uses to update the model toward higher reward-model scores) is **0.074**. More than ten times worse. The ability to know what percentage it would get right was shaved off in the course of being polished to satisfy people.

## Wrapping up

To sum up, calibration is not about what percentage you get right but whether you know what percentage you will get right, and ECE is the number that measures the gap. RLHF aims at the output people prefer, and because people prefer confident answers, the model ends up speaking decisively even when things are ambiguous. In GPT-4, the cost showed up as ECE going from 0.007 to 0.074.

Whether the probabilities of Jev, a decision model that puts calibration forward as its training objective, are actually honest is something I checked with published measurements and my own data in [Decision Models, Jev and Kev](/260922).

Before you hard-code a model's probability as a threshold, I hope you will check at least once what that model was trained to aim for, and measure whether its scale holds on your own data.
