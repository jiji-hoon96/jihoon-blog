---
emoji: 🔭
title: 'Observabilidade do navegador'
seoTitle: 'Observabilidade do navegador no frontend: PerformanceObserver, Web Vitals e RUM'
date: '2026-09-14'
categories: observabilidade frontend navegador RUM
description: 'Um guia em três etapas da observabilidade do navegador: do Performance Timeline e do cálculo das Web Vitals até os critérios de design de um RUM. Inclui o que medi ao adicionar a coleta de web-vitals ao meu blog e por que abri mão de 79KB de instrumentação no cliente.'
keywords: 'observabilidade frontend, medir desempenho web, PerformanceObserver exemplo, medir Web Vitals, monitoramento de usuários reais RUM, LCP INP CLS explicado, web-vitals GA4, Soft Navigations API'
locale: pt-BR
translationOf: '260914'
sourceHash: 8b1ddfa951db604b5f16fc4dc56013d11f88263aacd5ddff5102a8a3f2fc7be5
---

Neste post, quero falar sobre observabilidade do navegador.

Enquanto adicionava a este blog um código que coleta diretamente o desempenho percebido pelos visitantes, descobri que meu conhecimento do lado do navegador, que eu acreditava ser terreno familiar, era mais raso do que eu pensava. Faz tempo que abro o painel Performance do DevTools e executo o Lighthouse. Mas coletar continuamente o que os usuários reais vivenciaram muda a pergunta. É preciso saber quando o navegador produz quais valores, o que esses valores incluem e por que, em certas condições, eles simplesmente não são produzidos.

Esse conhecimento não está reunido em um único documento. Ele está espalhado por várias especificações, como `Performance Timeline`, `Navigation Timing`, `Resource Timing`, `Paint Timing` e `Event Timing`, e sobre elas as Web Vitals acrescentam suas próprias regras de cálculo. Quando entram em cena as transições de tela de uma SPA, a restauração do estado da página via :term[bfcache]{key="bfcache"}, as abas em segundo plano e os iframes, cada ferramenta reporta números diferentes para a mesma página. (Quando um valor diferia do que eu esperava, o lugar onde mais fiquei travado foi em distinguir se o site estava lento ou se a culpa era das regras de medição)

Por isso este artigo amplia o escopo da observação em três etapas: os eventos que o navegador deixou, a experiência que o usuário percebeu e a distribuição na população real de usuários. No meio do caminho, coloco também os valores que este blog coleta de fato e, na direção oposta, uma decisão de não ampliar a observação. A profundidade da observabilidade do navegador não é determinada por quantas APIs você usa. Só quando se distingue matéria-prima, métricas e distribuições, e se registram pelo caminho os usuários que ficaram de fora e as condições que distorcem os valores, os dados observados se tornam informação útil para decidir.

## Os sinais que o navegador deixa

Quando uma página web é aberta, o navegador cria internamente vários tipos de :term[PerformanceEntry]{key="performance-entry"}. O [Performance Timeline](https://www.w3.org/TR/performance-timeline/) do W3C é a base comum que permite tratar esses itens em um único eixo de tempo.

O ponto importante é que o desenvolvedor não precisa marcar início e fim como em um cronômetro. O navegador já conhece eventos como a navegação do documento, as requisições de recursos, os paints e a entrada do usuário. O ponto de partida da observabilidade frontend é ler esse registro interno.

| O que se observa | Entry representativo | Pergunta que pode responder |
|---|---|---|
| Navegação do documento | `navigation` | Onde o tempo foi gasto entre DNS, conexão, TLS, resposta e processamento do DOM |
| Imagens, scripts, CSS | `resource` | Quais recursos atrasaram e como ficaram o cache e o tamanho transferido |
| Exibição na tela | `paint`, `largest-contentful-paint` | Quando a primeira tela e o conteúdo principal ficaram visíveis |
| Mudanças de layout | `layout-shift` | Quando a tela que o usuário vê se moveu, e por causa de quê |
| Entrada do usuário | `event` | Onde ficou o atraso entre a entrada e o próximo quadro pintado pelo navegador |
| Trabalho longo de renderização | `long-animation-frame` | Quais scripts e etapas de renderização consumiram tempo dentro de um quadro |
| Trechos da aplicação | `mark`, `measure` | Quanto tempo levaram as operações definidas pelo serviço |

Essa tabela deixa claro que a observabilidade do navegador não é uma simples medição do tempo de carregamento da página. Rede, thread principal, pipeline de renderização e entrada do usuário podem ser colocados sobre o mesmo eixo de tempo.

Mas cada entry não é uma conclusão pronta. Está mais próximo da matéria-prima que o navegador fornece.

## Coletando entries de desempenho

A interface padrão para receber essa matéria-prima em tempo real é o :term[PerformanceObserver]{key="performance-observer"}.

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    sendPerformanceEntry(entry)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

O código é curto, mas várias condições importantes se escondem nele.

Primeiro, como explica a [documentação do `observe()`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe) no MDN, `buffered` precisa ser usado junto com `type`. Ele não pode ser combinado com `entryTypes`, que recebe vários tipos de uma vez. Se você precisa receber os candidatos de LCP ou os registros de recursos criados antes de o seu script inicial rodar, essa diferença decide se você perde dados.

Segundo, entries que o navegador não suporta podem ser ignorados em silêncio. Por isso o coletor deve verificar `PerformanceObserver.supportedEntryTypes`. Se você presumir que os valores visíveis no Chrome mais recente também chegarão de todos os Safari e Firefox, vai interpretar os trechos vazios do dashboard como problemas de desempenho.

Terceiro, os entries têm limite de buffer. Se o código de observação começar tarde, ou em aplicações que requisitam muitíssimos recursos, itens antigos podem ser empurrados para fora do buffer. Assim como "não houve erros" difere de "não recebemos erros", é preciso distinguir "não há entry" de "o entry não foi gerado".

O próprio código de observação também roda na thread principal. Se você serializar objetos grandes dentro do callback e disparar requisições de rede imediatamente, o código que mede a experiência do usuário pode piorar a experiência do usuário. É por isso que é preciso separar coleta de envio, normalizar apenas as propriedades necessárias e projetar batching e sampling.

## A composição do tempo de rede

"A página está lenta" costuma ser traduzido primeiro como um problema de rede. Mas olhando apenas `duration` é difícil distinguir as causas.

`PerformanceNavigationTiming` e `PerformanceResourceTiming` contêm várias fronteiras em torno da requisição. Dá para separar a consulta DNS, a conexão TCP, a negociação TLS, o envio da requisição, o primeiro byte e a conclusão da resposta. Também dá para verificar se o navegador passou por um Service Worker, quanto o tamanho transferido difere do decodificado e se um recurso bloqueou a renderização.

Essa separação muda a resposta.

- Se `domainLookupEnd - domainLookupStart` for grande, olhe a camada DNS.
- Se `connectEnd - connectStart` for grande, olhe a conexão e o TLS.
- Se `responseStart - requestStart` for grande, suspeite ao mesmo tempo do processamento do servidor e das idas e voltas pela rede.
- Se `responseEnd - responseStart` for grande, olhe o tamanho da resposta e a velocidade de transferência.
- Se `transferSize` for 0, verifique a possível reutilização de cache, mas considere também as restrições de exposição cross-origin e as condições de implementação do navegador.

Porém, os trechos detalhados de recursos cross-origin ficam ocultos por padrão. Como explica a [especificação de Resource Timing](https://www.w3.org/TR/resource-timing/) do W3C, alguns valores detalhados só são expostos quando o servidor de origem permite com o cabeçalho de resposta `Timing-Allow-Origin`. Mesmo que um CDN ou uma imagem externa pareçam lentos, dentro do navegador os trechos podem aparecer como 0.

Por isso, nos dados de RUM, 0 nem sempre significa rápido. Pode ser um valor invisível por questão de permissão.

## A interpretação das Web Vitals

LCP, INP e CLS, as métricas incluídas nas :term[Web Vitals]{key="web-vitals"}, não são timestamps que o navegador simplesmente registrou uma vez. São métricas centradas no usuário, construídas interpretando vários entries e o ciclo de vida da página.

O LCP é atualizado sempre que muda o candidato a conteúdo principal visível na tela. O INP observa os cliques, toques e interações de teclado ao longo da vida da página e então escolhe como valor representativo um próximo do mais lento. Quando as interações passam de 50, alguns valores extremos são excluídos, mas na maioria das páginas a interação mais lenta vira o INP. O CLS não soma todos os deslocamentos indefinidamente; ele seleciona o maior valor entre janelas de sessão agrupadas por intervalos fixos de tempo.

Dá para calcular tudo isso por conta própria, mas é difícil acertar as condições de fronteira, incluindo os momentos em que a página é ocultada ou restaurada. A biblioteca [`web-vitals`](https://github.com/GoogleChrome/web-vitals) do Google não é uma ferramenta que repassa os entries do navegador como estão; é uma implementação que aplica, sobre as APIs padrão, esse tratamento de ciclo de vida e as regras de cálculo de cada métrica.

Um passo mais fundo surge o problema de que a pontuação sozinha não basta. Você descobriu que o LCP foi de 4 segundos, mas sem saber qual elemento e qual recurso produziram esse valor, não consegue encontrar o que corrigir. O build `web-vitals/attribution` adiciona informações mais próximas das causas, como o elemento do LCP, o alvo do evento e os trechos de processamento do INP, e os elementos que contribuíram para o CLS.

Ou seja, a observação se aprofunda em três etapas.

1. Coletar as métricas.
2. Encontrar a distribuição dos usuários e ambientes lentos.
3. Atribuir a métrica aos elementos, scripts e requisições que a produziram.

Só com a primeira etapa nasce um relatório; é preciso chegar à terceira para nascer informação sobre a qual se pode agir.

## Laboratório e usuários reais

Lighthouse e DevTools são bons para medir repetidamente a mesma página em condições controladas. São úteis para pegar regressões antes de fazer o deploy do código ou para analisar a fundo um perfil específico. Mas não conseguem mostrar em quais dispositivos e redes os usuários reais estavam, nem como interagiram.

:term[RUM]{key="rum"}(Real User Monitoring) coleta valores nos navegadores dos visitantes reais. A [documentação de Web Vitals](https://web.dev/articles/vitals) do Google recomenda avaliar as Core Web Vitals no percentil 75 das visitas de página e olhar mobile e desktop separadamente. Uma única média pode apagar o grupo de usuários lentos.

O INP, em particular, só pode ser calculado quando há entrada real. O Lighthouse, que não tem usuários, usa o TBT como métrica substituta do INP. Os dois estão relacionados, mas não são o mesmo valor.

O Chrome UX Report (CrUX) também é RUM, mas seu caráter difere do RUM interno de um serviço. A [CrUX API](https://developer.chrome.com/docs/crux/api) fornece field data agregada dos usuários do Chrome por página ou por origin. É boa para se comparar com o padrão do setor, mas não permite ver junto uma release específica, um fluxo de usuário ou o estado da aplicação.

Na direção oposta, um RUM próprio permite anexar o contexto que você quiser, mas o viés da amostra e os erros de implementação ficam por sua conta. Se bloqueadores de anúncios barram as requisições de coleta, se você exclui usuários que não consentiram, ou se determinado navegador não suporta uma API, os usuários observados deixam de corresponder ao total de usuários.

Meu blog é um pequeno exemplo dessa escolha. Neste blog, um único componente de cliente chamado `WebVitalsReporter` carrega dinamicamente o `web-vitals`, mede LCP, INP, CLS, FCP e TTFB, e os envia ao GA4 como um único evento chamado `web_vitals`. Os nomes das métricas são distinguidos por `event_label`, e `metric.id` vai junto para não contar duas vezes valores atualizados dentro da mesma vida de página. Como o value de um evento do GA4 é um inteiro, o CLS é multiplicado por 1000 e arredondado. É uma configuração montada sobre o GA4 que eu já operava, sem servidor de coleta separado, então as telas ficam aquém de um produto RUM dedicado, mas foi suficiente para ver a distribuição por página e dispositivo. Claro, ela herda como estão os vieses acima. Se um bloqueador de anúncios barrar a requisição do GA, aquele visitante some da minha distribuição.

Nenhum dos dois é a resposta certa; eles respondem perguntas diferentes.

- Esta mudança ficou mais lenta, antes do deploy: lab data
- Onde estão os trechos lentos dos usuários reais: RUM próprio
- Em que nível está este origin na web pública: CrUX

Se você escolhe um RUM próprio, a próxima pergunta é o que contar como uma experiência de página. Só depois de fixada essa fronteira é possível projetar de forma consistente os valores e o contexto a coletar.

## A fronteira borrada da página

Na navegação tradicional, o navegador sabe onde um documento começa e termina. Na client-side navigation de uma SPA, a URL e a tela mudam, mas nenhum documento novo é criado. Do ponto de vista do navegador, tende a permanecer como uma única e longa vida de página.

Para resolver esse problema, cada ferramenta de RUM e cada framework vem usando suas próprias heurísticas. Mas cada implementação definia "tela nova" de um jeito, o que dificultava a comparação. Por meio da [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations), o time do Chrome vem empurrando a direção de o navegador reconhecer diretamente uma soft navigation, amarrando entrada do usuário, mudança de URL e atualização da tela.

Essa API passa a vir por padrão a partir do Chrome 151, lançado em agosto de 2026. A biblioteca `web-vitals` também começou a suportar, a partir da 6.0, o relatório de métricas por unidade de soft navigation com a opção `reportSoftNavs`. Porém, por enquanto ela só funciona nos navegadores da família Chromium, e Firefox e Safari não têm implementação correspondente, então não dá para substituir de imediato a instrumentação de rotas existente. Meu blog também navega entre posts com a client-side navigation do Next.js, e enquanto o código de coleta era baseado na 5.x, essas transições não eram capturadas como experiências de página separadas. Ao escrever este artigo, subi para a 6.2.1 e liguei o `reportSoftNavs`. Mas não terminou com uma opção só. Se os valores vindos de soft navigations e os vindos do carregamento inicial do documento se misturam no mesmo lugar no GA4, não dá para saber o que a distribuição significa, então tive que alterar o código para enviar como parâmetro do evento o `navigationType` que chega com cada métrica. Você adiciona uma observação e crescem junto as dimensões necessárias para distingui-la. O fato mais importante que este caso mostra é que medir o desempenho de uma SPA não é um simples problema de configuração de biblioteca, mas a questão de **quem define a fronteira da página**.

Definida a fronteira da página, também dá para decidir em que unidade armazenar rota, metric id e contexto de sessão. Agora vamos levar essa pergunta para o modelo de dados do RUM.

## O modelo de dados do RUM

O código que envia valores com `navigator.sendBeacon()` não é longo. O difícil é controlar o custo e a :term[cardinalidade]{key="cardinality"} sem perder as perguntas que você vai querer responder depois.

No mínimo, você acaba considerando junto o seguinte contexto.

| Contexto | Por que é necessário |
|---|---|
| Página e rota | Distinguir as telas lentas |
| Release e commit | Encontrar o deploy que introduziu a regressão |
| Tipo de navegação | Distinguir navegação nova, recarga e restauração por bfcache |
| Dispositivo e conexão | Ver como a distribuição difere conforme o ambiente |
| Metric id | Não contar duas vezes valores atualizados na mesma vida de página |
| Session e trace id | Conectar comportamento, erros e requisições ao servidor |
| Visibility state | Filtrar valores distorcidos em abas em segundo plano |

Se em cima disso você anexar sem critério o seletor DOM inteiro, a URL inteira e o ID do usuário, a análise parece mais fácil, mas o custo e o risco de privacidade crescem. URLs dinâmicas explodem a cardinalidade, e em seletores e corpos de rede podem se misturar dados pessoais.

Dados de observação não são melhores quanto mais numerosos. **É melhor não coletar atributos que não se conectam a uma decisão que você tomará depois.**

## As opções de coleta e armazenamento

Não é preciso construir a observabilidade do navegador do zero.

- O `web-vitals` fornece o cálculo das Core Web Vitals e a attribution.
- O [Boomerang](https://github.com/akamai/boomerang) é um coletor RUM de código aberto com longa história, que oferece vários plugins de desempenho e formas de envio por beacon.
- O [Grafana Faro Web SDK](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/) coleta desempenho, erros, logs e traces no navegador e os conecta à observabilidade do backend.
- O OpenTelemetry JavaScript consegue produzir traces do navegador, mas a [documentação oficial](https://opentelemetry.io/docs/languages/js/) ainda marca a client instrumentation do navegador como experimental.

Ao escolher uma ferramenta, olhe antes o escopo que você vai possuir do que a quantidade de recursos. A escolha muda conforme você for usar só o SDK, operar também o endpoint de coleta e o armazenamento, ou assumir a responsabilidade até pela exclusão de dados pessoais e pelas políticas de retenção.

Com um SaaS, o fardo operacional diminui; operando você mesmo um stack de código aberto, dá para controlar com mais detalhe o caminho dos dados e o modelo de custos. Nenhum dos dois sai de graça.

## A decisão de abrir mão de 79KB

Já que o assunto custo apareceu, deixo registrada uma decisão que tomei de verdade neste blog. A instrumentação de erros deste blog (Sentry) é só de servidor. Ficava me incomodando não conseguir ver os erros que acontecem apenas no navegador, então liguei a instrumentação de cliente e comparei o total gzip do JS de cliente em um clean build.

| Configuração | client JS (gzip) | Acréscimo |
|---|---|---|
| Sem Sentry | 181.6 KB | base |
| **Só servidor (atual)** | **182.3 KB** | **+0.7 KB** |
| Só servidor + chamar `captureException` na UI de fallback de erro | 186.0 KB | +4.4 KB |
| Cliente + servidor | 260.4 KB | +78.8 KB |

A instrumentação de servidor era praticamente de graça, mas a do navegador exigia 78.8KB. Também tentei as opções de otimização do bundle, mas o número não se moveu, e o único jeito de reduzir o custo do cliente era não ter arquivo de inicialização do navegador nenhum. A terceira linha custa 4.4KB pela mesma estrutura. Sem o SDK do navegador, o `captureException` da UI de fallback de erro é um no-op que não faz nada, mas o código do SDK ainda assim embarca no bundle. Por isso removi a própria chamada.

Essa medição também tem falhas. É a soma de todos os artefatos estáticos, então difere do que um visitante realmente baixa, e o fato de ligar as opções de otimização não ter cortado um único byte pode ser sinal de que essas opções não estavam surtindo efeito. Então, para ser exato, o correto não é "a observabilidade do navegador custa 79KB", e sim "na minha configuração, não consegui baixar disso".

Ainda assim, a decisão foi clara. Neste blog, o desempenho de carregamento é ao mesmo tempo a experiência do usuário e a premissa da visibilidade na busca, e quem paga os 78.8KB não sou eu, é o visitante. Se é uma observação cujo custo os usuários pagam, é preciso perguntar o que essa observação devolve a eles, e a minha resposta sobre a instrumentação de erros de cliente em um blog pessoal foi "não devolve o suficiente". Em uma seção anterior eu disse que o código que mede a experiência do usuário pode piorar a experiência do usuário; estenda esse princípio à escala da adoção de uma ferramenta e você chega aqui. **Tornar a observação mais densa nem sempre é a escolha certa.**

## A barreira de entrada das perguntas

Ao conectar as APIs e ferramentas vistas acima a perguntas reais, a IA é útil em três pontos.

Primeiro, ela estreita o caminho do sintoma até a especificação. Sintomas como "o LCP chega duas vezes", "todos os trechos de um recurso cross-origin são 0" ou "o valor não atualiza depois de uma transição na SPA" podem ser conectados às APIs e condições pertinentes.

Segundo, ela ajuda a traduzir os resultados de ferramentas diferentes para o mesmo eixo de tempo. Quando o trace do DevTools, o event do RUM, o span do Sentry e os logs do servidor apontam para horários e identificadores diferentes, dá para gerar rapidamente candidatos de comparação.

Terceiro, ela permite explorar distribuições e trechos anômalos nos dados coletados. Em vez de médias simples, sugere diferenças por navegador, rota, release e dispositivo, e baixa o custo de montar a próxima consulta.

Porém, esse processo produz candidatos; ele não substitui a evidência. Usuários não coletados não estão nos dados, e uma métrica mal definida produz conclusões erradas por mais refinada que seja a análise. Se dados pessoais podem ser enviados, ou se os usuários devem arcar com o custo do código de observação, também não dá para decidir só com documentação técnica.

A IA não é tanto um novo sensor que faz observar melhor o navegador; está mais para uma ferramenta que barateia ler o manual dos sensores existentes e formular perguntas.

## A observação começa em uma pergunta

Resumindo, o navegador já registra em detalhe a rede, a renderização, a entrada e as mudanças de layout. O `PerformanceObserver` é o ponto de partida para ler esse registro, as Web Vitals são métricas que o interpretam na linguagem da experiência do usuário, e o RUM é o sistema que coleta continuamente sua distribuição nos ambientes de usuários reais.

As três etapas parecem semelhantes, mas respondem perguntas diferentes. Os entries dizem o que aconteceu no navegador, as Web Vitals comprimem o que o usuário percebeu, e o RUM mostra para quem e com que frequência aquela experiência se repete.

O degrau para ler várias especificações e combinar ferramentas baixou, mas conseguir coletar com facilidade e conseguir interpretar corretamente são problemas diferentes. Só quando você consegue explicar quais usuários ficaram de fora e em quais condições os valores se distorcem, os dados de observação finalmente se tornam informação útil para decidir. Espero que quem lê este artigo também pare um momento para rever de quem é a experiência, resumida por quais regras, que os números de desempenho à sua frente representam.

No próximo artigo, [Observabilidade do sistema](/260915), pretendo ver como esses dados do navegador podem ser conectados a erros, traces, profiles e logs do servidor. É a história de seguir até onde chegou, dentro do sistema, uma requisição que começou na tela do usuário.

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [W3C, Long Animation Frames API](https://www.w3.org/TR/long-animation-frames/)
- [docs] [web.dev, Debug Performance in the Field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [Chrome for Developers, Back Forward Cache](https://developer.chrome.com/docs/web-platform/bfcache)
:::
