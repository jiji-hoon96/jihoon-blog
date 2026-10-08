---
emoji: ⏱️
title: "Por que o React usa MessageChannel"
seoTitle: "Por que o React usa MessageChannel e não requestIdleCallback"
date: "2025-05-15"
updatedAt: "2026-10-08"
categories: frontend React
description: "Por que o Scheduler do React usa MessageChannel e não requestIdleCallback, rAF ou setTimeout: os PRs do React e o atraso de 4 ms medido no Chrome."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4 ms, como funciona o scheduler do React, shouldYieldToHost, requestAnimationFrame, React Fiber"
locale: pt-BR
translationOf: '250515'
sourceHash: 2b9882e6b7b4a6ad16bcb679ac72102e95b7c50101ea3ffda6bbc08e3c63f7ca
---

Neste post, quero falar sobre **por que o React agenda seu trabalho com MessageChannel em vez de requestIdleCallback**.

É para desenvolvedores frontend que, estudando Fiber, leram que o React "trabalha um pouco sempre que o navegador está ocioso" e depois ficaram confusos ao encontrar `MessageChannel` no código-fonte real do React. Adiantando a resposta: `requestIdleCallback` não era chamado com a frequência de que o React precisava, e `setTimeout` adiciona um atraso de mais de 4 ms quando as chamadas são aninhadas. Por isso, o pacote Scheduler do React usa `MessageChannel`, que no navegador consegue agendar a próxima macrotask sem nenhum atraso artificial. O quanto esses 4 ms pesam de verdade, eu confiro com números medidos no Chrome headless.


## Métodos de agendamento abandonados

Ao explicar o conceito de Fiber, é comum usar código que divide o trabalho com `requestIdleCallback`. É um modelo em que uma unidade de trabalho é processada cada vez que o navegador não tem nada para fazer. O React também usou essa API no início, e passou por vários PRs até chegar à forma atual.

- **Janeiro de 2017**: o React usava o `requestIdleCallback` nativo e, nos navegadores sem ele, um polyfill que o imitava com `requestAnimationFrame` e `postMessage` ([PR #8833](https://github.com/facebook/react/pull/8833)). Navegadores sem essa API, como o Safari, ficaram a cargo do polyfill desde o início. A versão estável do Safari [continua sem essa API em outubro de 2026](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility).
- **Março e abril de 2018**: foi adicionada uma flag para usar o polyfill mesmo quando a API nativa existia. Andrew Clark escreveu na descrição do PR que a ideia era testar se o polyfill reduzia os problemas de starvation (trabalho que não consegue vez para rodar e é adiado repetidamente) que vinham observando, e acrescentou que era difícil ter certeza porque esses problemas eram difíceis de reproduzir ([PR #12385](https://github.com/facebook/react/pull/12385)). Um mês depois, após concluírem internamente que ele funcionava melhor que a implementação nativa, a flag foi removida e o polyfill se tornou definitivo ([PR #12648](https://github.com/facebook/react/pull/12648)).
- **Novembro de 2018**: o evento message que o polyfill enviava para `window` passou a ser enviado por um `MessageChannel`. Enviar para `window` faz todos os outros handlers de message da página também rodarem a cada frame ([PR #14234](https://github.com/facebook/react/pull/14234)).
- **Julho de 2019**: em vez de adivinhar o próximo vsync e ceder no fim do frame, uma flag experimental introduziu um loop que trabalha 5 ms dentro de um evento message e depois cede ([PR #16214](https://github.com/facebook/react/pull/16214)). Esse loop não usa `requestAnimationFrame` de forma alguma.
- **Agosto e novembro de 2019**: em agosto veio um relato de que os testes de desempenho mostravam melhor uso de CPU com o loop de mensagens ([PR #16271](https://github.com/facebook/react/pull/16271), não mesclado), e em novembro a implementação com rAF foi removida ([PR #17252](https://github.com/facebook/react/pull/17252)).

Por que a starvation acontece dá para deduzir da própria definição de `requestIdleCallback`. A [especificação do W3C](https://w3c.github.io/requestidlecallback/) deixa para o navegador decidir o que é um período ocioso (idle period) e cita como um dos exemplos o tempo que sobra entre um frame e o seguinte. Durante uma animação esses períodos chegam com frequência, mas numa tela de 60 Hz costumam durar menos de 16 ms. Se a thread principal está ocupada com tarefas longas, até esses diminuem, e, a meu ver, o trabalho do React é adiado na mesma medida. Dan Abramov também escreveu num comentário de agosto de 2018 que o React parou de usar essa API porque "it's not as aggressive as we need" ([facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)).

Os motivos para abandonar depois a abordagem com `requestAnimationFrame` estão na descrição do PR #16214. Essa abordagem precisava adivinhar quando viria o próximo vsync (o sinal ligado ao ciclo de atualização da tela). Ela começava supondo 30 fps, com duração de frame de 33,33 ms, e sempre que dois intervalos consecutivos entre frames eram ambos mais curtos que isso, reduzia a duração do frame para o maior dos dois. O prazo do frame atual era o horário de início do frame somado a essa duração ([SchedulerHostConfig.default.js logo antes do PR #17252](https://github.com/facebook/react/blob/6dc2734b41aef944e457eaa23ae218952fce0a54/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L123-L336)). Como sua única regra reduzia a duração, ela detectava a taxa de atualização subindo depois do carregamento da página, mas não descendo, como diz a descrição do PR.

O loop de mensagens cede a cada 5 ms onde quer que esteja no ciclo de vsync. A descrição do PR esperava que assim a thread principal continuasse responsiva mesmo em telas com taxa de atualização muito alta ("should keep the main thread responsive"). O mesmo PR também registrou o risco de que ceder com mais frequência aumentasse a disputa com outras tarefas do navegador, e que não se sabia o quanto os eventos message são limitados numa aba em segundo plano. O comentário atual no código do Scheduler diz que a maioria das tarefas não precisa se alinhar aos limites de frame.

## MessageChannel

O mecanismo de agendamento que restou depois que o rAF foi removido é o **MessageChannel**. Abaixo estão as [linhas 530 a 561 de Scheduler.js](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L561) no React v19.3.0, com os comentários reduzidos.

```js
let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE.
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}
```

São três ramos. Os navegadores atuais não têm `setImmediate`, então o segundo ramo, `MessageChannel`, é o escolhido. Segundo o comentário do código, o primeiro ramo existe para Node.js e o antigo IE, e `MessageChannel` impede que um processo Node.js termine, enquanto `setImmediate` não ([facebook/react#20756](https://github.com/facebook/react/issues/20756)). Por isso o ambiente node do Jest vai pelo caminho de `setImmediate`. Desde o Jest 27, o ambiente jsdom teve `setImmediate` removido dos globais ([jestjs/jest#11222](https://github.com/jestjs/jest/pull/11222)) e também não tem `MessageChannel`, então vai pelo caminho de `setTimeout`.

O objetivo de agendar assim a próxima vez é devolver a thread principal ao navegador. Enquanto o JavaScript segura a thread principal, o navegador não consegue tratar entradas nem pintar a tela. Mas só cedem no meio do caminho os renders fatiados no tempo, como os de Transition e Retry. O Reconciler do React v19.3.0 renderiza até o fim sem ceder se o render inclui uma blocking lane como Sync, InputContinuous ou Default, inclui uma lane que esperou tanto que expirou, ou foi chamado com `forceSync` ([linha 1168 de ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1168)).

Nesses renders, o Reconciler pergunta `shouldYield()` a cada Fiber processado ([linhas 3073 a 3078 de ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)). Essa função é exportada pelo Scheduler, e a decisão real fica com o `shouldYieldToHost()` dentro do Scheduler. O critério é o tempo desde o início da tarefa de mensagem atual. Quando esse tempo chega a `frameInterval`, ele cede, e se `requestPaint()` foi chamado depois de um commit, cede independentemente do tempo. O valor inicial de `frameInterval` é a constante de `SchedulerFeatureFlags.js` chamada `frameYieldMs`, ou seja, **5 ms** ([linha 11](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)). Os 5 ms não são o tamanho de uma fatia de trabalho, e sim o limite de tempo para verificar se é hora de ceder. Se renderizar um único componente leva 20 ms, esses 20 ms não são divididos. Tudo isso descreve o build stable. Nos builds experimental, `enableAlwaysYieldScheduler` do mesmo arquivo está ativado, então o Scheduler cede ao navegador assim que termina uma tarefa, a menos que a próxima já tenha expirado, em vez de esgotar os 5 ms, e não considera o sinal de `requestPaint()`.

## O atraso de 4 ms do setTimeout

Por que não `setTimeout`, e sim `MessageChannel`, para agendar a próxima fatia depois de ceder? Os [passos de inicialização de timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps) da especificação HTML elevam para 4 ms o atraso de um `setTimeout` cujo nível de aninhamento passa de 5, se ele for menor que isso. Medindo no Chrome headless uma cadeia em que `setTimeout(fn, 0)` se reagenda, os intervalos da 1ª à 6ª chamada foram de 0 a 0,1 ms, e a partir da 7ª foram somados de 4 a 5 ms (em geral cerca de 5 ms). As mensagens de um `MessageChannel` não têm esse atraso mínimo. Uma mensagem apenas entra na fila de tarefas, então o navegador pode encaixar o tratamento de entradas ou a renderização no meio, e é exatamente essa brecha que o Scheduler busca.

4 ms parecem pouco, mas num loop que cede a cada 5 ms a história muda. Dividi 200 ms de trabalho em 40 fatias de 5 ms e agendei a próxima fatia com `MessageChannel` e com `setTimeout(work, 0)`. Basta colar no console do DevTools para rodar como está.

```js
function busy(ms) { const s = performance.now(); while (performance.now() - s < ms) {} }
const ch = new MessageChannel();
let done = 0, frames = 0;
const raf = () => { frames++; if (done < 200) requestAnimationFrame(raf); };
const start = performance.now();
const work = () => {
  busy(5); done += 5;
  if (done < 200) schedule();
  else console.log(Math.round(performance.now() - start), 'ms,', frames, 'frames');
};
ch.port1.onmessage = work;
const schedule = () => ch.port2.postMessage(null); // setTimeout(work, 0) 로 바꿔 비교
requestAnimationFrame(raf);
schedule();
```

Estes são os resultados de rodar três variantes oito vezes cada em 2026-10-08, no Chrome 154.0.8037.98 (headless) em macOS. Safari e Firefox não foram medidos. A terceira linha da tabela troca `busy(5); done += 5;` por `busy(200); done += 200;` para não dividir o trabalho.

| Como a próxima fatia é agendada | Tempo até terminar | Frames desenhados nesse meio-tempo |
|---|---|---|
| `MessageChannel` | 201 ms | 12 a 13 |
| `setTimeout(work, 0)` | cerca de 365 a 371 ms | 21 a 22 |
| Sem dividir | 200 ms | 0 |

Com `setTimeout`, depois das seis primeiras chamadas cada fatia ganhou de 4 a 5 ms de tempo ocioso, e o mesmo trabalho levou cerca de 1,8 vez mais tempo. Os números oscilam conforme a máquina e a carga, mas a proporção de cerca de 1,8 vez se manteve nas repetições. O número maior de frames é porque o trabalho terminou tarde e o intervalo medido ficou mais longo. Não significa responsividade melhor. Sem dividir, o trabalho termina em 200 ms, mas nenhum frame é desenhado nesse tempo. O `MessageChannel` terminou o trabalho nos mesmos 200 ms e continuou produzindo frames, em geral a cerca de 60 fps.


## Conclusão

Em resumo, o que o React precisava não era uma API que esperasse o navegador ficar ocioso, mas uma que permitisse trabalhar por pouco tempo e agendar imediatamente a próxima vez. `requestIdleCallback` não era chamado com a insistência de que o React precisava; a abordagem com `requestAnimationFrame` precisava adivinhar quando viria o vsync; e `setTimeout`, quando aninhado, fazia cada fatia descansar mais de 4 ms. `MessageChannel` foi o que atendeu a essas condições.

Como são os nós Fiber, as unidades de trabalho que esse Scheduler divide, e como o Work Loop os percorre é o tema de [Dominando o React Fiber por completo](/250520). Espero que, da próxima vez que você encontrar `MessageChannel` no código-fonte do React, lembre por um momento por que ele está ali.


:::ref
- [repo] [ReactDOMFrameScheduling.js do React 16.0.0](https://github.com/facebook/react/blob/v16.0.0/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
