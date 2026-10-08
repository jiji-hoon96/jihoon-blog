---
emoji: 🎯
title: "Calibração e o excesso de confiança do RLHF"
seoTitle: "Calibração, ECE e o excesso de confiança criado pelo RLHF"
date: "2026-09-17"
categories: IA Calibração
description: "Calibração é saber quantos por cento você vai acertar. Como o ECE mede isso e por que o RLHF gera excesso de confiança, com o ECE 0.007 e 0.074 do GPT-4."
keywords: "calibração de modelos, ECE, expected calibration error, excesso de confiança do RLHF, LLM confiantes demais, calibração vs acurácia, calibração do GPT-4, mode dropping"
locale: pt-BR
translationOf: '260917'
sourceHash: eb59e41f5cd98a6e2a1858a2dc53c9c860e30f9c25e4c4f59557f184b05b26d1
---

Neste post quero falar sobre a calibração de modelos e o excesso de confiança que o RLHF cria. É para desenvolvedores que querem usar no código, como critério de decisão, a probabilidade ou a confiança que um modelo devolve. Ao final, você vai conseguir explicar como acurácia e calibração diferem, o que o ECE mede e por que um modelo lapidado com preferência humana fala com mais segurança do que deveria.

Precisei organizar esses conceitos primeiro enquanto testava o Jev, um modelo de decisão lançado pela TypeSafe AI. Em vez de frases, o Jev devolve uma probabilidade para cada opção e apresenta a calibração como objetivo de treino. Para avaliar essa afirmação, eu precisava saber antes o que é calibração e por que ela sai do lugar nos modelos existentes.

## Acurácia e calibração

Primeiro é preciso separar acurácia de :term[calibração]{key="calibration"}. Acurácia é quantos por cento você acerta; calibração é saber quantos por cento você vai acertar. Se, juntando só os dias em que a previsão disse 70% de chance de chuva, choveu de fato em sete de cada dez, aquela previsão está bem calibrada. Isso não quer dizer que a acurácia seja alta. Quer dizer que ela conhece o próprio limite. **Um modelo que acerta só 60%, se disser de si mesmo que acerta 60%, tira nota máxima em calibração.**

O indicador que mede esse descompasso é o :term[ECE]{key="ece"} (expected calibration error). É a média, ponderada pela fração de amostras de cada faixa, da diferença entre “a probabilidade declarada” e “a taxa real de acerto” em cada faixa de probabilidade, e 0 é o valor perfeito.

## A função objetivo do RLHF

Então por que a escala de um modelo lapidado com feedback humano sai do lugar? A resposta está na linhagem do :term[RLHF]{key="rlhf"} (reinforcement learning from human feedback). O esqueleto de montar um modelo de recompensa a partir de comparações de preferência humana veio do [artigo de Christiano et al., de 2017](https://arxiv.org/abs/1706.03741); [Stiennon et al., em 2020](https://arxiv.org/abs/2009.01325), aplicaram isso a modelos de linguagem; e o InstructGPT estendeu para seguir instruções. Os três artigos compartilham uma única função objetivo: **produzir a saída que o avaliador humano prefere.**

Para um chatbot, a preferência humana é o alvo certo. O problema é que as pessoas preferem respostas confiantes a respostas hesitantes. Então o modelo adquire o hábito de falar em tom categórico mesmo quando a situação é ambígua. A documentação da TypeSafe chama isso de [mode dropping](https://docs.typesafe.ai/introduction/machine-learning-primer): a otimização por preferência empurra o modelo a favorecer um estilo específico e achata a probabilidade das outras saídas possíveis.

## As curvas de calibração do GPT-4

A OpenAI também escreveu a mesma coisa no próprio relatório. A Figure 8 do [relatório técnico do GPT-4](https://arxiv.org/abs/2303.08774) põe lado a lado as curvas de calibração do modelo pré-treinado e do modelo pós-treinado, e a legenda diz o seguinte.

![Figura 8 do relatório técnico do GPT-4. O modelo pré-treinado à esquerda acompanha a diagonal com ECE 0,007; o modelo após PPO à direita cai bem abaixo dela com ECE 0,074](1.png?w=720)

Fonte: OpenAI, GPT-4 Technical Report (arXiv:2303.08774), Figure 8.

> Right: Calibration plot of the post-trained GPT-4 model on the same subset of MMLU. The post-training hurts calibration significantly.

Pelos números impressos no gráfico, o ECE do modelo pré-treinado é **0.007** e o do modelo que passou por PPO (o algoritmo de aprendizado por reforço com que o RLHF atualiza o modelo na direção de notas mais altas do modelo de recompensa) é **0.074**. Piorou mais de dez vezes. No processo de ser lapidado para agradar pessoas, a capacidade de saber quantos por cento ia acertar foi aparada.

## Para fechar

Resumindo, calibração não é sobre quantos por cento você acerta, e sim sobre saber quantos por cento vai acertar, e o ECE é o número que mede esse descompasso. O RLHF mira a saída que as pessoas preferem, e como as pessoas preferem respostas confiantes, o modelo passa a falar em tom categórico mesmo quando a situação é ambígua. No GPT-4, esse custo ficou registrado como um ECE que foi de 0.007 para 0.074.

Se as probabilidades do Jev, um modelo de decisão que apresenta a calibração como objetivo de treino, são de fato honestas, eu verifiquei com medições públicas e com meus próprios dados em [Modelos de decisão, Jev e Kev](/260922).

Espero que você também, antes de cravar no código como limiar a probabilidade que um modelo devolve, verifique ao menos uma vez com que objetivo esse modelo foi treinado e se a escala dele se sustenta nos seus próprios dados.
