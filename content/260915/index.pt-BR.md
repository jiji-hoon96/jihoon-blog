---
emoji: 🧮
title: 'CPU e memória do navegador'
seoTitle: 'Thread principal e memória do navegador: long tasks e LoAF'
date: '2026-09-15'
updatedAt: '2026-09-16'
categories: observabilidade frontend navegador
description: 'O que long tasks, TBT, LoAF, JS Self-Profiling, as APIs de memória e os crash reports mostram, conferido com Lighthouse e cabeçalhos deste blog.'
keywords: 'thread principal do navegador, long task 50ms, Long Animation Frames API, Total Blocking Time, JS Self-Profiling API, profiling de navegador no Sentry, measureUserAgentSpecificMemory, vazamento de memória no navegador'
locale: pt-BR
translationOf: '260915'
sourceHash: e3099827d3ce62d6111f68e8a70bca3c1d37a5f8550f952482939e5c286405ce
---

Neste post, quero falar sobre como observar a thread principal e a memória do navegador.

No [post anterior](/260914), acompanhei a rede, a renderização e as Web Vitals para ver os valores que o navegador deixa sobre carregamento e interação. Mas, quando você investiga por que essas métricas pioraram, quase sempre chega a um de dois lugares. Ou a thread principal estava ocupada com outra coisa e não conseguiu tratar a entrada e a renderização a tempo, ou a memória foi se acumulando até a página ficar lenta ou acabar morrendo.

Essas duas áreas são mais difíceis de observar do que as Web Vitals. A maioria das APIs é exclusiva do Chromium, algumas só são ativadas mudando um cabeçalho de resposta e certos sinais, pela própria estrutura, não conseguem chegar ao JavaScript. Na tabela de recursos do Sentry do [primeiro post da série](/260913), adiei para este artigo a decisão sobre profiling no navegador, e aqui também destrincho as condições dele.

O que conferi pessoalmente foram duas execuções do Lighthouse, os cabeçalhos de resposta de produção e os arquivos de build do `web-vitals` instalado. Adiantando a conclusão: este blog só enxerga o contorno da sua thread principal por medições de laboratório (lab) e não tem nenhum meio de ver a memória nem os crashes.

## O que significa a thread principal estar ocupada

A thread principal do navegador processa em uma única fila a execução de JavaScript, o cálculo de estilos, o layout e o tratamento da entrada do usuário. Enquanto uma tarefa roda, nada mais consegue entrar no meio, então se o usuário aperta um botão nesse intervalo, o evento de entrada espera até a tarefa terminar.

O limite que recorta essa espera é 50ms. A [especificação da Long Tasks API](https://w3c.github.io/longtasks/) do W3C define como long task uma tarefa que ocupa a thread principal por mais de 50ms (a introdução diz "50ms or more", então a forma de expressar o limite varia um pouco), e também explica o motivo. Para responder a uma entrada em até 100ms, a tarefa em execução no momento da entrada precisa terminar em até 50ms, e a tarefa que processa essa entrada também precisa terminar em até 50ms.

### O TBT soma o excesso das long tasks

Se você só contar, uma tarefa de 60ms e uma de 600ms ficam iguais, por isso as ferramentas de lab usam o Total Blocking Time (TBT). Segundo o artigo do web.dev sobre TBT, o blocking time de uma long task é a parte que passa de 50ms, e o TBT é a soma dos blocking times das long tasks após o FCP. Por padrão, o Lighthouse só conta até o TTI (Time to Interactive).

![Figura com cinco tarefas na linha do tempo da thread principal, em que as três que passam de 50ms mostram excessos de 200, 40 e 105ms](1.png?w=720)

(Fonte da figura: [web.dev, Total Blocking Time (TBT)](https://web.dev/articles/tbt), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), SVG convertido em PNG com fundo branco)

A parte amarela são os primeiros 50ms de cada tarefa, e a parte vermelha é o blocking time. No exemplo do mesmo artigo, as tarefas somam 560ms de execução, mas o TBT é 345ms. Tarefas com menos de 50ms não contribuem em nada para o TBT, por mais frequentes que sejam.

### O TBT não substitui o INP

O TBT é uma métrica de lab, e a métrica de responsividade das Core Web Vitals é o INP. O [artigo do web.dev sobre INP](https://web.dev/articles/inp) traça a linha: em ferramentas de lab que olham só o carregamento, sem interação, o TBT pode ser um proxy razoável, mas não é um substituto.

Isso porque o TBT não sabe quando o usuário apertou o quê. Mesmo que a thread principal esteja muito bloqueada, o INP pode ser baixo se o usuário apertar depois que os scripts terminarem. Uma long task pode aumentar o INP por vários caminhos (processing duration se o próprio handler for longo, presentation delay se a renderização seguinte for longa), mas o caminho mais diretamente ligado ao TBT é alongar o input delay que vimos no post anterior pelo tempo que ainda resta à tarefa que estava rodando no momento do clique. Por isso um TBT baixo só diz "a thread principal não ficou muito bloqueada durante o carregamento". Para saber o que bloqueou uma entrada real, é preciso olhar tarefas e frames em field.

## Long Tasks e Long Animation Frames

Existem duas APIs do navegador para ver a thread principal em field: a Long Tasks API (`PerformanceLongTaskTiming`), disponível desde o Chrome 58, e a Long Animation Frames API (`PerformanceLongAnimationFrameTiming`, LoAF para abreviar), lançada no Chrome 123. As duas são assinadas via :term[PerformanceObserver]{key="performance-observer"}.

### A LoAF é uma alternativa, não uma substituição

O artigo do time do Chrome sobre LoAF (fonte da figura mais abaixo) apresenta a LoAF como um "update" e uma "alternative" à Long Tasks API, e, no FAQ, responde que "at this time, there are no plans to deprecate the Long Tasks API". Nos dados de compatibilidade do MDN, `PerformanceLongTaskTiming` também não tem marca de deprecated; as duas APIs são experimental, e nem Firefox nem Safari dão suporte.

O motivo de uma API nova ter sido necessária é a atribuição (attribution). Segundo o mesmo artigo, a atribuição da Long Tasks API "at best only tells you the container", isto é, chega a dizer se foi o documento de nível superior ou algum iframe, mas não diz qual script gastou o tempo.

A LoAF não reporta como entry uma tarefa individual, e sim **um frame cuja atualização de renderização atrasou mais de 50ms**. Ela também pega os casos em que várias tarefas curtas mais a renderização somadas passam do limite.

### blockingDuration e atribuição de scripts

O campo da LoAF que se liga diretamente ao INP é `blockingDuration`. Ele soma o excesso acima de 50ms das tarefas do frame, mas, para a tarefa mais longa, inclui também o tempo da renderização final. No exemplo do artigo, quando uma renderização de 20ms vem depois de tarefas de 55ms e 65ms, `duration` fica em cerca de 140ms e `blockingDuration` em (55 - 50) + (65 + 20 - 50) = 40ms. É como levar a ideia do TBT do trecho de carregamento para os frames da página inteira.

![Figura com vários long frames na linha do tempo de uma página, em que o frame que se sobrepõe à interação escolhida como INP aparece destacado com linha pontilhada](2.png?w=720)

(Fonte da figura: [Chrome for Developers, Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), redimensionada)

Uma página gera muitos long frames, mas o que explica o valor do INP é o frame sobreposto à interação do INP. O array `scripts` desse frame traz, para cada script que rodou por mais de 5ms, o ponto de invocação, a URL de origem e o tempo de execução. É aqui que aparece o "quem" que faltava na Long Tasks API.

Porém, a atribuição de scripts só vale para a thread principal e para iframes same-origin. Iframes cross-origin, workers e código de extensões não têm nome, mesmo quando deixam um frame longo. O trabalho dentro do iframe de comentários do utteranc.es nas páginas de post deste blog não é atribuído nem pela LoAF.

### Este blog não coleta LoAF

Também há um jeito de usar a LoAF sem assiná-la diretamente. O `web-vitals` incluiu "Add INP breakdown timings and LoAF attribution" no [changelog da v4.0.0 (2024-05-13)](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md) e, depois, acrescentou o script mais longo (`longestScript`) e os totais de tempo de script, layout e paint. Mas isso só vem no build de atribuição (`web-vitals/attribution`).

Como vimos no post anterior, o `src/components/WebVitalsReporter.tsx` deste blog usa o build padrão via `import('web-vitals')`. **Ele coleta o valor do INP, mas não qual script bloqueou esse INP.** No `web-vitals@6.2.1` instalado, a string `long-animation-frame` aparece 0 vezes em `dist/web-vitals.js` e 1 vez em `dist/web-vitals.attribution.js`. O build padrão nem sequer registra um observer de LoAF. (Esse fato volta a ser importante na seção sobre memória)

Pelo [README](https://github.com/GoogleChrome/web-vitals#attribution-build), o build de atribuição fica cerca de 1,5K maior em brotli, mas o que me fez hesitar foi mais o destino do que o tamanho. Não conferi se, com o tráfego deste blog, sairia no GA4 uma distribuição por script que fizesse sentido, então decidi olhar o lab primeiro antes de ampliar a coleta.

## As long tasks que apareceram neste blog

Então rodei uma página de post no lab. Lighthouse 12.8.2 (`npx lighthouse@12`), Chrome headless local, form factor mobile padrão, simulated throttling (RTT 150ms, 1638,4kbps, CPU 4 vezes mais lenta), alvo `https://hooninedev.com/260914`, duas execuções com 25 minutos de intervalo em 2026-09-16.

| Item | 1ª execução (08:46:15Z) | 2ª execução (09:11:01Z) |
|---|---|---|
| Performance score | 0,92 | 0,93 |
| FCP, LCP | 2501ms | 2415ms |
| TBT | 40ms | 47ms |
| TTI | 5489ms | 5375ms |
| Trabalho total da thread principal | 916ms | 1035ms |
| Desse total, Style & Layout | 343ms | 344ms |
| Desse total, Script Evaluation | 254ms | 292ms |

Nas duas execuções, o elemento de LCP não foi uma imagem e sim o primeiro parágrafo (`div#post-content > p`), por isso FCP e LCP foram iguais, e o maior item da thread principal não foi script, e sim Style & Layout.

![Gráfico de linha do tempo em que quatro long tasks (o documento, um chunk do Next e duas do gtag) aparecem na mesma ordem nas duas execuções do Lighthouse](3.png?w=720)

As duas execuções tiveram quatro long tasks, na mesma ordem: a tarefa do documento (104ms, 122ms), um chunk do Next.js (68ms, 69ms) e duas tarefas de `googletagmanager.com/gtag/js` (66ms e 56ms na 1ª, 69ms e 59ms na 2ª). Os instantes estão numa linha do tempo que o Lighthouse calculou supondo uma CPU 4 vezes mais lenta, então não devem ser lidos como tempos absolutos em um dispositivo real.

O TBT bate exatamente com o excesso das três tarefas após o FCP. A 1ª dá (68 - 50) + (66 - 50) + (56 - 50) = 40ms, e a 2ª, (69 - 50) + (69 - 50) + (59 - 50) = 47ms. Um TBT baixo não significa "não há long tasks", e sim "o excesso após o FCP é pequeno".

Em seguida, a posição do gtag. O layout raiz (`src/app/[lang]/layout.tsx`) carrega o gtag com `next/script` usando `strategy="afterInteractive"`. Por isso as duas tarefas do gtag rodam em sequência pouco mais de 2,8 segundos depois do LCP, e o ponto em que a última termina fica registrado como TTI. Mais do que com as métricas de carregamento, é um ponto que pode se sobrepor ao **input delay de uma entrada feita logo depois que a página aparece**. Ainda assim, é uma inferência sobre uma linha do tempo de lab, e este blog não coleta o que usuários reais apertaram naquele momento.

E esta é uma medição de lab com n=2. Reproduzir o mesmo formato é só uma evidência fraca de que essa estrutura não é coincidência, e não substitui a distribuição de dispositivos e redes dos usuários reais.

Então, como descobrir qual função gastou o tempo dentro daquela tarefa de 66ms do gtag?

## Profilers de amostragem

A resposta no nível de função vem de um profiler. A JS Self-Profiling API quer fazer o trabalho do painel Performance do DevTools dentro do navegador dos usuários reais.

### JS Self-Profiling API

A [especificação JS Self-Profiling](https://wicg.github.io/js-self-profiling/) do WICG define uma API para que aplicações web controlem o profiler de amostragem do navegador. O exemplo é `new Profiler({ sampleInterval: 10, maxBufferSize: 10000 })`, que significa capturar a pilha de chamadas a cada 10ms e juntar até 10 mil amostras. Como faz :term[amostragem]{key="sampling"} em vez de instrumentar cada chamada, o overhead é pequeno, mas chamadas mais curtas que o intervalo podem escapar. A especificação remove dos resultados os stack frames de scripts cross-origin não liberados por CORS. Ou seja, o interior de um script de outro origin, como o gtag, pode continuar invisível mesmo com essa API.

A especificação não está no standards track: é um WICG Community Group Draft, e, segundo os dados de compatibilidade do MDN, `Profiler` só funciona em navegadores baseados em Chromium a partir do Chrome 94. E, como o [MDN](https://developer.mozilla.org/en-US/docs/Web/API/JS_Self-Profiling_API) registra, o documento precisa ser servido com uma Document Policy que inclua `js-profiling`. Isso quer dizer que a resposta HTML precisa do cabeçalho `Document-Policy: js-profiling`.

### Ligar o cabeçalho também tem custo

Durante a pesquisa, encontrei um ponto em que os documentos divergiam. Uma mudança que entrou no repositório da especificação em janeiro de 2026 tornou `js-profiling` **deprecated** e definiu `js-profiling-mode` (`eager`, `lazy`) no lugar. As implementações devem manter suporte a `js-profiling` por compatibilidade (SHOULD), mas podem removê-lo (MAY).

Segundo a especificação, `eager` (equivalente ao antigo `js-profiling`) prepara a infraestrutura de profiling durante o carregamento, então pode afetar FCP e LCP mesmo que o profiler nunca seja usado. `lazy` adia essa preparação até o primeiro `Profiler` ser criado, mas, se essa inicialização acontecer enquanto uma interação está sendo processada, pode afetar o INP. A especificação está admitindo que **um cabeçalho ligado para medir pode impor custo às próprias métricas medidas**. A documentação do Sentry, por outro lado, ainda só orientava `Document-Policy: js-profiling` na consulta de 2026-09-16. No ChromeStatus, o item `js-profiling-mode` está como Proposed e sem marco de lançamento, mas não conferi diretamente se o Chrome o implementa, então não posso dizer qual cabeçalho usar hoje.

### Condições do profiling de navegador no Sentry

A [documentação de JavaScript profiling](https://docs.sentry.io/platforms/javascript/profiling/) do Sentry deixa as condições claras. O profiling de navegador está em beta, usa a JS Self-Profiling API e por isso só funciona em navegadores baseados em Chromium, como Chrome e Edge, e o servidor precisa enviar `Document-Policy: js-profiling`. Ela diz explicitamente que não dá para usar em hospedagens onde não se pode mudar cabeçalhos. O SDK exige `@sentry/browser` 10.27.0 ou superior e usa `browserProfilingIntegration()` com a taxa por sessão `profileSessionSampleRate`. O FAQ responde que é normal os profiles chegarem só de usuários do Chrome. Portanto, os profiles coletados não devem ser lidos como representativos de todos os usuários.

A cobrança é por [UI Profile Hours](https://docs.sentry.io/pricing/quotas/manage-ui-profile-hours/) e, quanto ao bundle, pelos limites gzip do repositório `sentry-javascript`, arquivo `.size-limit.js` (branch develop, consultado em 2026-09-16), somar Profiling à combinação de Tracing de 56 KB dá 59 KB.

### Neste blog ele está desligado em duas camadas

Primeiro, não há SDK de navegador. O Sentry deste blog é só de servidor, e não existe `src/instrumentation-client.ts`. É uma decisão tomada a partir de uma medição de 2026-08-04 mostrando que o SDK de cliente aumenta o client JS em 78,8 KB gzip (tratado no post anterior).

Segundo, não há cabeçalho. A resposta que conferi com `curl -sI https://hooninedev.com/260914` em 2026-09-16T09:10:42Z não tem `document-policy`. Os cabeçalhos que este repositório adiciona ao HTML são os quatro da função `next.config.ts` `headers()`: `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`, e esses quatro também aparecem na resposta. (Eu já tinha medido neste repositório que `public/_headers` só se aplica a assets estáticos e não chega ao HTML)

Então ligar o profiling de navegador neste blog não é questão de uma opção. Significa reverter a decisão dos 78,8KB, adicionar um cabeçalho a todo HTML e medir de novo o custo que esse cabeçalho impõe a FCP, LCP e INP. Ainda não há evidência de que as duas tarefas do gtag vistas antes sejam um problema que justifique esse custo.

## O que significa medir memória

Se a CPU é sobre "o que está bloqueando agora", a memória é sobre "o que se acumula com o tempo", então é preciso observar a mudança dentro de uma sessão. Só que o caminho para trazer esse valor de field é mais estreito do que no caso da CPU.

### performance.memory não é padrão

`performance.memory` é uma propriedade "non-standard and legacy" no [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory), e os dados de compatibilidade a marcam como deprecated e exclusiva do Chromium. Nem o que exatamente é "o heap" foi padronizado.

### measureUserAgentSpecificMemory exige isolamento

A alternativa é `performance.measureUserAgentSpecificMemory()`. O [artigo do web.dev sobre medir a memória da página](https://web.dev/articles/monitor-total-page-memory-usage) explica que a medição acontece durante a coleta de lixo, então o resultado chega atrasado, e recomenda chamá-la em intervalos aleatórios com média de 5 minutos. Só é suportada em navegadores baseados em Chromium a partir do Chrome 89.

A condição decisiva está em outro lugar. O [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory) determina que o documento precisa ser um secure context e também estar **cross-origin isolated**. Ou seja, precisa estar isolado pelos cabeçalhos `Cross-Origin-Opener-Policy` e `Cross-Origin-Embedder-Policy` para que `window.crossOriginIsolated` seja `true`.

A resposta do `curl` de antes não tem nenhum dos dois cabeçalhos, então neste blog essa API não pode ser chamada. Também avalio que ligá-la custaria mais do que o cabeçalho de profiling. Com COEP ligado, os recursos cross-origin que a página carrega precisam seguir essa política, e este blog carrega o script do gtag e o iframe do utteranc.es. Não ativei os cabeçalhos para conferir se esses dois de fato quebram.

Quando field está fechado, o que sobra é reproduzir localmente com o painel Memory do DevTools. É o método de procurar, com heap snapshots, as árvores DOM detached que a [documentação do time do Chrome sobre problemas de memória](https://developer.chrome.com/docs/devtools/memory-problems) aponta como causa comum de vazamentos, mas não é algo que eu tenha feito neste blog.

### Um vazamento criado por código de observabilidade

O caso que achei mais interessante no assunto memória veio de uma biblioteca de observabilidade. A primeira linha do changelog do `web-vitals` v6.2.2 (2026-09-14) é "Cap pending LoAFs to avoid memory leak".

Segundo a descrição da [issue #795](https://github.com/GoogleChrome/web-vitals/issues/795), o `onINP` do build de atribuição junta entries de LoAF em `pendingLoAFs` para encontrar as LoAFs que se sobrepõem ao INP. O critério de limpeza, o instante do "evento processado mais recentemente", só avança quando há entrada do usuário, então em páginas assistidas por muito tempo sem interação, como na reprodução de vídeo, as LoAFs só se acumulavam. O [PR de correção #796](https://github.com/GoogleChrome/web-vitals/pull/796) aplicou também à lista de LoAFs o limite `MAX_PENDING_FRAMES` (10), que já era usado na lista de grupos de eventos, de modo que, a não ser os frames sobrepostos a um candidato a INP, só os 10 mais recentes são mantidos.

Este blog está na 6.2.1. Ele carrega esse vazamento? Não. O único arquivo-fonte que o PR alterou é `src/attribution/onINP.ts` (o resto são arquivos de teste) e, como vimos, o build padrão deste blog não tem observer de LoAF. **A mesma decisão de não coletar a atribuição de LoAF também fechava o caminho para esse vazamento.** Isso não leva à conclusão "então não vamos coletar". O ponto é que o custo do código de observabilidade às vezes só aparece num changelog, e que trocar para o build de atribuição pressupõe 6.2.2 ou superior.

## Quando o navegador morre

Se a memória se esgota por completo, a página morre. O sinal que sobra nesse momento é o crash report da Reporting API.

### O formato de um crash report

A [especificação Crash Reporting](https://wicg.github.io/crash-reporting/) do WICG define o report type `"crash"` e declara sobre si mesma que não é um padrão do W3C nem está no standards track. O `reason` do body inclui `oom`, quando a página esgotou a memória, e `unresponsive`, quando foi encerrada por não responder. A entrega vai, se o cabeçalho `Reporting-Endpoints` tiver um endpoint `crash-reporting`, para esse endpoint; caso contrário, para `default`; e, se nenhum dos dois existir, nada é enviado.

### O JavaScript não consegue recebê-lo

A propriedade central desse sinal está numa frase da especificação.

> Crash reports are not observable to JavaScript, as the page which would receive them is, by definition, not able to.

A página que deveria receber o relatório já morreu por causa desse mesmo crash, então, por definição, o JavaScript não tem como observá-lo. O navegador apenas faz um POST para um endpoint do servidor, de fora da página.

O que isso significa para os SDKs de navegador dá para ver no código. No `sentry-javascript`, o [código-fonte de `reportingObserverIntegration`](https://github.com/getsentry/sentry-javascript/blob/develop/packages/browser/src/integrations/reportingobserver.ts) inclui `'crash'`, `'deprecation'` e `'intervention'` nos tipos assinados por padrão e tem até um ramo `report.type === 'crash'`. Mas essa integração usa um `ReportingObserver` dentro da página, então, se a especificação vale, não há caminho para esse ramo ser executado num crash OOM real. (É uma inferência minha a partir da especificação, e não provoquei um crash para confirmar)

Do lado do servidor, o Sentry poderia ser o destino do `Reporting-Endpoints`? A [getsentry/sentry#38940](https://github.com/getsentry/sentry/issues/38940), que pediu esse recurso, foi aberta em 2022-09-15 e continuava open na consulta de 2026-09-16. O que dá para fazer hoje vai só até manter um endpoint próprio e repassar para o Sentry.

### Os crashes deste blog não são registrados

A resposta do `curl` de antes também não tem o cabeçalho `reporting-endpoints`. Pelas regras de entrega da especificação, sem endpoint o relatório não é enviado. Mesmo que a aba de alguém tenha morrido por falta de memória enquanto lia este blog, esse fato não fica registrado em lugar nenhum. Independentemente de o Sentry dar suporte ou não, é porque eu não declarei onde recebê-lo.

Como são páginas para ler posts estáticos longos, não pretendo mudar isso agora. Ainda assim, deixo anotado que "não há crashes" e "não há meios de ver crashes" aparecem como a mesma tela vazia num dashboard.

## Uma observação que só se abre sob condições

Observar a CPU e a memória do navegador, na maior parte, **só se abre quando certas condições são atendidas**. Long tasks e LoAF só vêm do Chromium, e a atribuição de scripts da LoAF não enxerga iframes cross-origin. Profilers de amostragem exigem o cabeçalho `Document-Policy`, cujo nome está mudando na especificação, e o próprio cabeçalho pode impor custo às métricas. A API de medição de memória exige cross-origin isolation, e os crash reports, um endpoint de servidor fora do JavaScript.

Este blog não ligou nenhuma dessas condições. Esse estado não é abandono, e sim o resultado acumulado da decisão dos 78,8KB, do build padrão e da escolha de não adicionar cabeçalhos, e, entre eles, o build padrão ainda acabou evitando o vazamento de LoAF do web-vitals. O fato de que ampliar a observabilidade também é colocar na página um código que tem custo fica especialmente claro nessa área.

Todos os números deste post vieram do lab ou de verificações locais minhas. O que a field data coletada de usuários reais significa depois que sai do navegador, no CrUX, no Search Console e na busca, é o que pretendo continuar no [próximo post](/260916).

:::ref
- [docs] [MDN, PerformanceLongAnimationFrameTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming)
- [docs] [web.dev, Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
:::
