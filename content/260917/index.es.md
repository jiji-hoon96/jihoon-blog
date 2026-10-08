---
emoji: 🎯
title: "Calibración y exceso de confianza de RLHF"
seoTitle: "Calibración, ECE y el exceso de confianza que crea RLHF"
date: "2026-09-17"
categories: IA Calibración
description: "La calibración es saber qué porcentaje vas a acertar. Cómo la mide el ECE y por qué RLHF crea exceso de confianza, con el ECE 0.007 y 0.074 de GPT-4."
keywords: "calibración de modelos, ECE, expected calibration error, exceso de confianza en RLHF, LLM sobreconfiados, calibración vs exactitud, calibración de GPT-4, mode dropping"
locale: es
translationOf: '260917'
sourceHash: eb59e41f5cd98a6e2a1858a2dc53c9c860e30f9c25e4c4f59557f184b05b26d1
---

En este artículo quiero hablar de la calibración de los modelos y del exceso de confianza que genera RLHF. Está pensado para desarrolladores que quieren usar en su código, como criterio de decisión, la probabilidad o la confianza que devuelve un modelo. Al terminar podrás explicar en qué se diferencian la exactitud y la calibración, qué mide el ECE y por qué un modelo pulido con preferencias humanas habla con más seguridad de la que le corresponde.

Tuve que ordenar primero estos conceptos mientras ponía a prueba Jev, un modelo de decisión presentado por TypeSafe AI. En lugar de frases, Jev devuelve una probabilidad para cada opción y presenta la calibración como su objetivo de entrenamiento. Para examinar esa afirmación, primero necesitaba saber qué es la calibración y por qué se desajusta en los modelos existentes.

## Exactitud y calibración

Primero hay que separar exactitud y :term[calibración]{key="calibration"}. La exactitud es qué porcentaje aciertas; la calibración es si sabes qué porcentaje vas a acertar. Si reúnes solo los días en los que se anunció un 70% de probabilidad de lluvia y resulta que de cada diez llovió siete veces, esa previsión está bien calibrada. No significa que su exactitud sea alta. Significa que conoce sus propios límites. **Un modelo que solo acierta el 60% saca la nota máxima en calibración si dice de sí mismo que acierta el 60%.**

La métrica que mide ese desajuste es el :term[ECE]{key="ece"} (expected calibration error). Es la media, ponderada por la proporción de muestras de cada tramo, de la diferencia entre «la probabilidad declarada» y «la tasa real de acierto» en cada tramo de probabilidad, y 0 es la perfección.

## La función objetivo de RLHF

Entonces, ¿por qué se desajusta esta escala en un modelo pulido con retroalimentación humana? La respuesta está en la genealogía de :term[RLHF]{key="rlhf"} (reinforcement learning from human feedback). El esqueleto de levantar un modelo de recompensa a partir de comparaciones de preferencia humana salió del [artículo de Christiano et al. de 2017](https://arxiv.org/abs/1706.03741); [Stiennon et al. lo aplicaron en 2020](https://arxiv.org/abs/2009.01325) a los modelos de lenguaje, e InstructGPT lo extendió al seguimiento de instrucciones. Los tres artículos comparten una única función objetivo: **producir la salida que el evaluador humano prefiere más.**

Para un chatbot, la preferencia humana es el objetivo correcto. El problema es que las personas prefieren una respuesta segura antes que una que titubea. Así el modelo adquiere la costumbre de hablar de forma tajante incluso cuando la cosa es ambigua. La documentación de TypeSafe llama a esto [mode dropping](https://docs.typesafe.ai/introduction/machine-learning-primer): optimizar la preferencia empuja al modelo a favorecer un estilo concreto y aplasta la probabilidad de las demás salidas posibles.

## Las curvas de calibración de GPT-4

OpenAI también dejó escrito lo mismo en su propio informe. La Figure 8 del [informe técnico de GPT-4](https://arxiv.org/abs/2303.08774) pone una al lado de otra las curvas de calibración del modelo preentrenado y del modelo tras el post-training, y su pie dice así.

![Figura 8 del informe técnico de GPT-4. El modelo preentrenado de la izquierda sigue la diagonal con ECE 0,007; el modelo tras PPO de la derecha cae muy por debajo con ECE 0,074](1.png?w=720)

Fuente: OpenAI, GPT-4 Technical Report (arXiv:2303.08774), Figure 8.

> Right: Calibration plot of the post-trained GPT-4 model on the same subset of MMLU. The post-training hurts calibration significantly.

Según las cifras impresas en la figura, el ECE del modelo preentrenado es **0.007** y el del modelo que pasó por PPO (el algoritmo de aprendizaje por refuerzo con el que RLHF actualiza el modelo hacia puntuaciones más altas del modelo de recompensa) es **0.074**. Empeoró más de diez veces. En el proceso de pulirlo para que satisficiera a las personas se recortó su capacidad de saber qué porcentaje iba a acertar.

## Para cerrar

En resumen, la calibración no trata de qué porcentaje aciertas, sino de si sabes qué porcentaje vas a acertar, y el ECE es la cifra que mide ese desajuste. RLHF apunta a la salida que las personas prefieren, y como las personas prefieren respuestas seguras, el modelo acaba hablando de forma tajante incluso cuando la cosa es ambigua. En GPT-4, ese precio quedó registrado como un ECE que pasó de 0.007 a 0.074.

Si las probabilidades de Jev, un modelo de decisión que presenta la calibración como objetivo de entrenamiento, son de verdad honestas, lo comprobé con mediciones públicas y con mis propios datos en [Modelos de decisión, Jev y Kev](/260922).

Ojalá que tú también, antes de fijar en el código como umbral la probabilidad que devuelve un modelo, compruebes al menos una vez para qué se entrenó ese modelo y si su escala se sostiene con tus propios datos.
