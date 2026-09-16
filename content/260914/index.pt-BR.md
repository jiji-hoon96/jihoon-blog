---
emoji: 🔭
title: 'Observabilidade do navegador'
seoTitle: 'Desempenho web: PerformanceObserver, Web Vitals e soft navs'
date: '2026-09-14'
updatedAt: '2026-09-16'
categories: observabilidade frontend navegador RUM
description: 'O que se vê no navegador sem SDK: Performance Timeline, fases de rede, como LCP, INP e CLS são calculados e o reportSoftNavs do web-vitals na prática.'
keywords: 'medir desempenho web, PerformanceObserver exemplo, como as Web Vitals são calculadas, medir INP, CLS session window, Soft Navigations API, web-vitals reportSoftNavs, Resource Timing Timing-Allow-Origin'
locale: pt-BR
translationOf: '260914'
sourceHash: 3976b490db6bef1a28388bab84a42d789e23e2df6fc503abd0ac827c7b892867
---

Neste post, quero falar sobre observabilidade do navegador.

No [post anterior](/260913), contei como adicionei a este blog o Sentry, que uso há anos no trabalho, e revisei de novo seus recursos. Mas essa configuração tem uma lacuna evidente. Conectei o Sentry só ao servidor e nunca ativei o SDK do navegador.

O motivo foi o tamanho do bundle. (As medições que embasam isso estão na primeira seção) Isso não queria dizer que eu desistiria de olhar o que acontece dentro do navegador. Mesmo sem SDK, o navegador registra por conta própria bastante coisa sobre carregamento e renderização.

Então a pergunta deste post é esta. **Sem um SDK externo, o que dá para ver com os sinais de carregamento e renderização que o próprio navegador informa dentro da página?** Vou passar pelas fases de rede, pelas regras de cálculo das Web Vitals e pela fronteira da página que fica borrada numa SPA, e no final vou registrar o que este blog realmente envia e o que não envia. (CPU e memória ficam para o próximo post, e a ligação dos valores coletados com o CrUX e a busca fica para o último)

## Por que não ativei o SDK do navegador

Primeiro registro a base da decisão. Fui mudando a configuração do Sentry e comparei o total em gzip de `.next/static/chunks/*.js` em builds limpos.

| Configuração | client JS (gzip) | Aumento |
|---|---|---|
| Sem Sentry | 181.6 KB | Referência |
| **Só servidor (atual)** | **182.3 KB** | **+0.7 KB** |
| Só servidor + chamada a `captureException` na UI de fallback de erro | 186.0 KB | +4.4 KB |
| Cliente + servidor | 260.4 KB | +78.8 KB |

Esta tabela foi medida em 2026-08-04, com Next 16.1.4. A instrumentação do servidor saía praticamente de graça, enquanto a do navegador exigia 78.8KB. Também tentei ativar `bundleSizeOptimizations.excludeTracing`, mas o número não mudou, e a única forma de eliminar o custo era não ter o arquivo de inicialização do navegador (`src/instrumentation-client.ts`). A terceira linha segue a mesma lógica. Sem o SDK do navegador, `captureException` na UI de fallback não faz nada, mas o código do SDK vai junto no bundle. Por isso tirei a chamada.

Também medi de novo o estado atual. Pelo mesmo método, em 2026-09-16 deu 206.1KB. São 23.8KB acima da referência, mas nesse meio-tempo o Next subiu para 16.3.4 e entrou o reporte de soft navigations que abordo mais adiante. A configuração do Sentry continua só no servidor, então esse aumento não vem do Sentry. (Não sei quanto cada um dos dois representa, porque não refiz o build commit a commit)

Neste blog, desempenho de carregamento é a própria experiência do visitante, e quem paga os 78.8KB não sou eu, é o visitante. Julguei que os erros de navegador de um blog pessoal não compensariam esse custo. Só que, uma vez decidido isso, é preciso observar o lado do navegador de outra forma. O ponto de partida é o registro que o navegador já está deixando.

## O registro que o navegador deixa

Quando uma página abre, o navegador cria vários tipos de :term[PerformanceEntry]{key="performance-entry"}. O [Performance Timeline](https://www.w3.org/TR/performance-timeline/) do W3C é o quadro comum para ler essas entradas numa única linha do tempo. Mesmo que o desenvolvedor não marque início e fim como num cronômetro, o navegador já sabe de eventos como a navegação do documento, as requisições de recursos, as pinturas e a entrada do usuário.

| O que é observado | entry type | Pergunta que pode responder |
|---|---|---|
| Navegação do documento | `navigation` | Onde o tempo foi gasto entre DNS, conexão, resposta e processamento do DOM? |
| Imagens, scripts, CSS | `resource` | Qual recurso atrasou e qual foi o tamanho da transferência? |
| Exibição | `paint`, `largest-contentful-paint` | Quando a primeira tela e o conteúdo principal ficaram visíveis? |
| Mudanças de layout | `layout-shift` | Quando a tela que estava sendo vista se mexeu? |
| Entrada do usuário | `event` | Quanto tempo levou, depois da entrada, até o próximo frame ser pintado? |
| Trechos da aplicação | `mark`, `measure` | Quanto tempo levou o trabalho definido pelo próprio serviço? |

`long-animation-frame`, que mostra os frames que seguraram a main thread por muito tempo, também pertence a esse quadro, mas é assunto de CPU, então fica para o próximo post.

A interface padrão que recebe esses registros é o :term[PerformanceObserver]{key="performance-observer"}.

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.startTime, entry.duration)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

O código é curto, mas esconde algumas condições. Segundo a [documentação de `observe()`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe) do MDN, `buffered` precisa ser usado junto com `type` e não pode ser combinado com `entryTypes`, que recebe vários tipos de uma vez. Scripts de coleta costumam rodar quando a página já avançou bastante, então, se o registro for feito sem `buffered`, os candidatos a LCP e os registros de recursos criados antes disso não chegam.

Além disso, um type que o navegador não suporta é ignorado sem exceção, e segundo o mesmo documento no máximo pode ficar um aviso no console. Sem verificar com `PerformanceObserver.supportedEntryTypes`, não dá para distinguir **não haver entries** de **ser um navegador que não gera essas entries**. Um trecho vazio num dashboard pode ser diferença na composição de navegadores, e não um problema de desempenho.

## A composição do tempo de rede

Dizer que uma página está lenta costuma ser traduzido como problema de rede. Mas um único `duration` não separa as causas. A entry `navigation` (`PerformanceNavigationTiming`) e a entry `resource` (`PerformanceResourceTiming`) dividem uma requisição em vários timestamps.

| Fase | Cálculo | Onde suspeitar se for grande |
|---|---|---|
| DNS | `domainLookupEnd - domainLookupStart` | A camada de DNS |
| Conexão e TLS | `connectEnd - connectStart` | Reutilização de conexão, negociação TLS |
| Até o primeiro byte | `responseStart - requestStart` | Processamento no servidor e latência de ida e volta |
| Transferência do corpo | `responseEnd - responseStart` | Tamanho da resposta e velocidade de transferência |

A especificação [Navigation Timing](https://www.w3.org/TR/navigation-timing-2/) do W3C tem um diagrama que mostra em que ordem esses timestamps são registrados. Se os nomes das fases não forem familiares, olhar esse diagrama uma vez é mais rápido do que a tabela.

Uma armadilha são os recursos cross-origin. Pela [especificação Resource Timing](https://www.w3.org/TR/resource-timing/) do W3C, num recurso de outra origin os timestamps detalhados, como DNS, conexão e início de requisição e resposta, ficam ocultos como 0, a menos que o servidor que o entrega os libere com o cabeçalho de resposta `Timing-Allow-Origin`. Se uma imagem de CDN externa parecia lenta e, ao abrir, DNS e conexão estavam todos em 0, ela não foi rápida: você só não tinha permissão para ver. **Nesta área, 0 pode não significar rápido.**

O tempo até o primeiro byte deste blog também não é leve. Em 2026-09-16, ao requisitar com `curl` dois posts e a home uma vez cada a partir de um ponto na Coreia, `time_starttransfer` ficou entre 0.95 e 2.43 segundos (um valor que inclui o tempo de DNS, conexão e TLS), e os cabeçalhos de resposta indicavam hit no cache Durable da Netlify e miss no cache de edge. Com só três amostras não vou generalizar, mas está na mesma escala do TTFB de 798ms da medição que aparece mais adiante. Só com esse tipo de decomposição por fases dá para escolher, quando o LCP atrasa, entre diminuir a imagem ou antecipar a chegada do documento.

## Como as Web Vitals são calculadas

Se as fases de rede são a matéria-prima, as :term[Web Vitals]{key="web-vitals"} são métricas que colocam regras de cálculo por cima. As Core Web Vitals definidas pela documentação de Web Vitals do Google são três, LCP, INP e CLS, e os limites de bom são LCP de 2.5 segundos, INP de 200ms e CLS de 0.1 ou menos.

![Faixas bom, precisa melhorar e ruim das três métricas LCP, INP e CLS. Os limites são 2.5 e 4.0 segundos para LCP, 200ms e 500ms para INP, e 0.1 e 0.25 para CLS](1.png?w=720)

(Fonte da figura: as três figuras de limites de [web.dev, Web Vitals](https://web.dev/articles/vitals) unidas lado a lado, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))

Nenhuma das três métricas é um timestamp que o navegador registra uma única vez. O valor só aparece depois de interpretar várias entries e o ciclo de vida da página. Sem conhecer essa diferença, quando os valores de um código de coleta próprio não batem com os de uma biblioteca ou ferramenta, não dá para julgar qual está certo.

### O candidato a LCP muda o tempo todo

Segundo a [documentação de LCP](https://web.dev/articles/lcp), o navegador envia uma nova entry `largest-contentful-paint` toda vez que um elemento de conteúdo maior é pintado. Se o texto for pintado primeiro, um `<p>` vira o candidato, e se depois uma imagem grande carregar, passa a ser `<img>`. E, no momento em que o usuário toca, rola ou pressiona uma tecla, o navegador para de reportar novas entries. Por isso o LCP não é a primeira entry, e sim o último candidato válido reportado antes da entrada, e decidir esse momento de fechamento passa a ser papel do código de coleta.

### O INP soma três fases de uma entrada

A documentação de INP do web.dev divide uma interação em três fases. O input delay, desde a chegada da entrada até o handler de evento começar; o processing duration, enquanto o handler executa; e o presentation delay, até o próximo frame aparecer na tela.

![Como uma entrada é processada na main thread. Uma blocking task gera input delay, os handlers pointerup, mouseup e click formam o processing duration, e o trecho que passa por render e paint até o frame ser apresentado é o presentation delay. Abaixo de paint seguem os trabalhos de compositing, GPU e raster](2.png?w=720)

(Fonte da figura: [web.dev, Interaction to Next Paint (INP)](https://web.dev/articles/inp), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), convertida para PNG com fundo branco)

O que vale notar nesta figura é que, no momento em que o usuário clica, uma blocking task cinza já está rodando. Por mais rápido que seja o código do handler, se outro trabalho estiver segurando a main thread logo antes da entrada, o INP piora. (Descobrir que outro trabalho é esse é o tema do próximo post)

O INP de uma página se aproxima do valor mais lento entre as interações observadas durante uma visita. O mesmo documento explica que, a cada 50 interações, o maior valor é ignorado. Assim, numa visita com menos de 50 interações, a interação mais lenta é o próprio INP.

### O CLS conta os deslocamentos em grupos

A [documentação de CLS](https://web.dev/articles/cls) define o CLS não como a soma de todos os deslocamentos ao longo da vida da página, e sim como a pontuação da maior rajada (burst). Se o intervalo entre deslocamentos for menor que 1 segundo, eles entram na mesma session window, e uma window dura no máximo 5 segundos. Dessas windows, a de maior pontuação total vira o CLS. É uma regra feita para que pequenos deslocamentos numa aba aberta por muito tempo não se acumulem sem fim.

Dá para implementar por conta própria as regras das três métricas. Mas acertar as condições de contorno, até o momento em que a aba é ocultada ou a página é restaurada, é difícil. A biblioteca [`web-vitals`](https://github.com/GoogleChrome/web-vitals) do Google não é uma ferramenta que repassa as entries do jeito que vêm, e sim uma implementação que aplica essas regras de ciclo de vida sobre as APIs padrão. Este blog também a usa.

Só que todas essas regras pressupõem uma unidade chamada "uma página". O que acontece quando essa unidade fica borrada?

## A fronteira borrada da página

Numa navigation tradicional, o navegador sabe onde um documento começa. Na client-side navigation de uma SPA, a URL e a tela mudam, mas nenhum documento novo é criado. Para o navegador é como um único primeiro carregamento que se estende, então a segunda tela, alcançada ao passar da lista para um post, não tem LCP próprio.

Até agora, ferramentas de RUM e frameworks definiam cada um uma "tela nova" com suas próprias heurísticas. A equipe do Chrome trouxe esse julgamento para o navegador com a [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations). Quando entrada do usuário, mudança de URL e pintura da tela acontecem juntas, o navegador cria uma entry `soft-navigation`. O recurso está ativado por padrão desde o Chrome 151, e a data de lançamento estável do Chrome 151 é [2026-07-28](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=151). O `web-vitals` também reporta métricas por soft navigation com a opção `reportSoftNavs` desde a 6.0. Segundo o README, esse reporte só funciona no Chromium 151 ou superior, e nos outros navegadores ativar a opção não muda a forma de reportar.

### Valores medidos com reportSoftNavs ativado

Este blog também vai da lista de posts para um post com o `Link` do Next.js. Em 2026-09-14, depois de atualizar o `web-vitals` para 6.2.1 e ativar `reportSoftNavs` (`cc21a0d`), conectei via CDP a um Chrome headless que tinha aberto a página de produção e abri do jeito que estavam as requisições que saíam para o GA4. Estes foram os valores enviados numa sessão. (As métricas que não estão na tabela não apareciam nas requisições dessa sessão, e não verifiquei o motivo)

| Métrica | Valor | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

A transição da lista para um post foi capturada como uma experiência separada, como pretendido. Mas esta tabela também mostra por que não basta uma opção. **O TTFB de uma soft navigation é 0.** Nenhum documento foi requisitado ao servidor, então é exatamente o valor descrito no README, mas se esse 0 se acumular no mesmo evento que os 798ms do primeiro carregamento, a média de TTFB cai em silêncio sem que o código mude. Por isso alterei o código para enviar também, como parâmetro do GA4, o `navigationType` que acompanha cada métrica. Ao acrescentar uma unidade de observação, crescem junto as dimensões necessárias para distingui-la.

Medindo, aprendi mais duas coisas. Uma é que a soft navigation **exige entrada real do usuário**. Quando chamei `click()` por script dentro da página, nenhuma entry `soft-navigation` foi criada, embora a URL tenha mudado e a tela tenha sido atualizada, e ela só foi capturada depois que enviei um clique por coordenadas com o `Input.dispatchMouseEvent` do CDP. Para verificar esse recurso com automação de testes, é preciso enviar eventos de entrada no nível do navegador, e não o `click()` do DOM.

A outra é que os lugares deste blog onde soft navigations acontecem são mais restritos do que eu imaginava. Os links da lista e do cabeçalho são `Link`, então são client-side navigations, mas **os links internos dentro do corpo de um post são tags `a` comuns geradas a partir do Markdown, então são carregamentos completos de página**. Mesmo dentro do mesmo site, algumas navegações são soft navigations e outras não.

### Quando as métricas da primeira página são fechadas

Depois de medir, reli o README e encontrei uma frase que tinha deixado passar.

> Note that this will change the way the first page loads are measured as the metrics for the initial URL will be finalized once the first soft nav occurs.

Isso quer dizer que, com a opção ativada, as métricas da primeira página são fechadas no momento da primeira soft navigation. INP e CLS são métricas que normalmente se observam até o usuário sair da página, mas agora a observação da página de lista termina assim que o usuário clica no link de um post, e o INP e o CLS da nova tela recomeçam do 0. O mesmo README diz que LCP e FCP também contam só os elementos pintados de novo depois da soft navigation. Elementos que permanecem entre telas, como o cabeçalho, não podem ser candidatos da nova tela.

Por isso a distribuição das métricas do primeiro carregamento pode mudar antes e depois de ativar a opção. Se, medindo o mesmo site, o INP melhorou a partir de um deploy, pode ser que não tenha sido o código que melhorou, e sim a janela de observação que encurtou. Como só se comporta assim no Chromium 151 ou superior, também surgem diferenças entre navegadores. (Eu deveria ter conhecido essa diferença antes de medir. Essa única frase pesa mais na interpretação do que os valores da tabela)

### A restauração do bfcache também é uma experiência nova

Há mais um caminho que borra a fronteira da página. O :term[bfcache]{key="bfcache"} restaura a página inteira da memória nas navegações de voltar e avançar. O [artigo sobre bfcache](https://web.dev/articles/bfcache) do web.dev diz que, nos dados de uso do Chrome, 1 em cada 10 navegações no desktop e 1 em cada 5 no mobile são de voltar ou avançar. A restauração não é um carregamento novo, então as revisitas, que teriam sido as mais rápidas, saem da distribuição de carregamentos, e a distribuição coletada pode pender para o lado lento mesmo que a experiência real tenha melhorado. O mesmo artigo recomenda olhar métricas como o TTFB separadas por navigation type. Nesse caso o `web-vitals` reporta `navigationType` como `back-forward-cache`, então o parâmetro que este blog adicionou por causa das soft navigations também distingue as restaurações do bfcache.

## O que este blog realmente envia

Levando tudo isso para o código deste blog, é um único `src/components/WebVitalsReporter.tsx`. Um client component carrega `web-vitals` dinamicamente, registra LCP, INP, CLS, FCP e TTFB e os envia ao GA4 como um único evento chamado `web_vitals`. A versão instalada é a 6.2.1, segundo o lockfile.

| Parâmetro | Conteúdo |
|---|---|
| `event_label` | Nome da métrica (`LCP`, `INP` etc.) |
| `value` | Valor da métrica. O value do GA4 é inteiro, então o CLS é multiplicado por 1000 e arredondado |
| `metric_id` | Id que identifica uma métrica dentro da vida de uma página. Se a mesma métrica for reportada de novo, é agrupada por esse valor |
| `metric_rating` | good, needs-improvement ou poor, conforme o julgamento da biblioteca |
| `metric_navigation_type` | `navigate`, `soft-navigation`, `back-forward-cache` etc. |

É uma configuração de :term[RUM]{key="rum"} montada sobre o GA4 que eu já operava, sem servidor de coleta separado. Se o próprio carregamento do módulo falhar, fica registrado um evento `web_vitals_unavailable`. É a falha que acontece logo após um deploy, quando um HTML antigo pede um chunk que já não existe, e como não há Sentry no navegador, sem esse evento a coleta poderia parar por completo sem deixar rastro.

O que ele não envia também está claro. Como usa o build padrão do `web-vitals`, e não o build de attribution, não coleta qual foi o elemento do LCP, quanto durou cada uma das três fases do INP nem qual elemento empurrou o layout. Lembrando a figura do INP de antes, este blog só sabe a soma das três fases, não qual delas foi longa. E erros de JS que acontecem só no navegador não ficam registrados em lugar nenhum. É o preço de economizar 79KB.

Registro mais uma coisa. Estou enviando `metric_navigation_type`, mas, enquanto escrevia este post, não verifiquei se esse parâmetro está registrado como custom dimension no GA4 e se está sendo de fato desmembrado. A GA4 Admin API está desativada neste projeto do GCP, então também não havia como verificar na hora. Enviar algo e conseguir lê-lo separado são problemas diferentes.

## O navegador já está registrando

Resumindo, mesmo sem ativar um SDK de navegador, o navegador já registra fases de rede, pinturas, deslocamentos de layout e atraso de entrada. O `PerformanceObserver` é a porta de entrada para ler esse registro, e as Web Vitals são métricas que acrescentam por cima regras de cálculo como a atualização de candidatos, a soma de três fases e as session windows.

E essas regras de cálculo pressupõem uma unidade chamada página. Ao ativar soft navigation, as telas novas ganham métricas próprias, mas em troca a janela de observação da primeira página encurta, zeros se misturam ao TTFB e as restaurações do bfcache saem da distribuição de carregamentos. O que entendi de novo desta vez é que uma única opção muda não só os valores, mas também **o que conta como uma experiência**. Por isso, antes de comparar números, é preciso ver primeiro em que fronteira eles foram cortados. Se você está lendo isto, talvez valha a pena conferir uma vez em que momento foram fechados os números de desempenho que você está olhando agora.

Dito isso, este post só foi até a soma das três fases. Que trabalho estava segurando a main thread quando uma entrada chegou, e quanta memória usa uma página aberta por muito tempo, exigem outras APIs. Pretendo continuar essa história no próximo post, [CPU e memória do navegador](/260915).

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [web.dev, Debug performance in the field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [WICG, Soft Navigations explainer](https://github.com/WICG/soft-navigations)
:::
