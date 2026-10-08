---
emoji: ⏱️
title: "Por que o React usa MessageChannel"
seoTitle: "Por que o React usa MessageChannel e não requestIdleCallback"
date: "2025-05-15"
categories: frontend React
description: "Por que o Scheduler do React passou de requestIdleCallback, requestAnimationFrame e setTimeout para MessageChannel: frequência, suporte e o atraso de 4 ms."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4 ms, como funciona o scheduler do React, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: pt-BR
translationOf: '250515'
sourceHash: bfaa67abcb8f66de08aab49d2098ef5c87175fada85358ac546691c7c36a2619
---

Neste post, quero falar sobre **por que o React agenda seu trabalho com MessageChannel em vez de requestIdleCallback**.

É para desenvolvedores frontend que, estudando Fiber, leram que o React "trabalha um pouco sempre que o navegador está ocioso" e depois ficaram confusos ao encontrar `MessageChannel` no código-fonte real do React. Adiantando a resposta: `requestIdleCallback` é chamado com frequência baixa demais e se comportava de forma diferente em cada navegador, e `setTimeout` adiciona um atraso de 4 ms quando as chamadas são aninhadas. Por isso, o pacote Scheduler do React usa `MessageChannel`, que consegue agendar a próxima macrotask sem esse atraso.


## Por que requestIdleCallback foi abandonado

Ao explicar o conceito do Fiber, é comum usar um código que divide o trabalho com `requestIdleCallback`. É um modelo em que uma unidade de trabalho é processada a cada vez que o navegador não tem nada para fazer. Mas o React real não usa essa API. São três motivos.

- **Frequência de chamada muito baixa**: ela só é chamada em verdadeiro "tempo ocioso", quando o navegador não tem nada a fazer; por isso, em uma página movimentada, o trabalho do React poderia ser adiado indefinidamente. Dan Abramov também afirmou que "requestIdleCallback is called too infrequently to be useful for scheduling React work".
- **Problemas de compatibilidade entre navegadores**: durante muito tempo, o Safari não a implementou, e o comportamento variava entre navegadores.
- **Limite superior de 20 ms**: como o idle deadline tinha um teto, não era possível controlar o timing de maneira tão previsível quanto o React precisava.

Depois disso, a equipe tentou usar `requestAnimationFrame` com uma estimativa do orçamento do frame, mas essa abordagem também foi abandonada ao concluir que o trabalho do React não precisava acompanhar o ciclo de vsync (tecnologia que sincroniza a exibição de frames com o momento em que o monitor conclui a varredura vertical).

## MessageChannel

Por fim, o React escolheu **MessageChannel**.

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

O `shouldYieldToHost()` do Scheduler verifica se o tempo decorrido desde o início do trabalho excedeu `frameInterval` (por padrão, **5 ms**, definido em `SchedulerFeatureFlags.js`) e decide se deve devolver o controle à main thread.

Por que não `setTimeout`, mas sim `MessageChannel`? Segundo a especificação HTML, quando `setTimeout` é aninhado cinco vezes ou mais, um **atraso mínimo de 4 ms** é imposto. Já `MessageChannel` roda imediatamente como uma macrotask no próximo tick do event loop, sem essa restrição. Para Fiber, que divide o trabalho em unidades de 5 ms, um atraso artificial de 4 ms seria fatal.


## Conclusão

Em resumo, o que o React precisava não era uma API que esperasse o navegador ficar ocioso, mas uma que permitisse trabalhar por pouco tempo e agendar imediatamente a próxima vez. `requestIdleCallback` era chamado raramente demais, `requestAnimationFrame` ficava preso a um ciclo de vsync que o trabalho do React não precisava acompanhar e `setTimeout` adicionava um atraso de 4 ms. `MessageChannel` foi o que atendeu a essas condições.

Como são os nós Fiber, as unidades de trabalho que esse Scheduler divide, e como o Work Loop os percorre é o tema de [Dominando o React Fiber por completo](/250520). Espero que, da próxima vez que você encontrar `MessageChannel` no código-fonte do React, lembre por um momento por que ele está ali.


## Fontes

:::ref
- [repo] [Código-fonte do React, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [docs] [WHATWG, HTML Standard, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
:::
