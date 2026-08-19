---
emoji: 🔭
title: 'Observabilidade'
seoTitle: 'Observabilidade com AI: instrumentação do Sentry no servidor, falhas silenciosas e Core Web Vitals'
date: '2026-07-03'
categories: observabilidade frontend Sentry confiabilidade
description: 'Eu usava Sentry no trabalho, mas meu blog pessoal não tinha monitoramento de erros. Reúno aqui o que encontrei ao adicionar instrumentação com AI: falhas escondidas atrás de respostas 200, gray failure, uma chamada ao GA presa por 65 segundos e até dados de pesquisa.'
keywords: 'configuração do Sentry no Next.js, observabilidade no frontend, diferença entre observability e monitoring, gray failure, differential observability, timeout da GA Data API, medição de Core Web Vitals, PerformanceObserver, análise de dados do Search Console, Sentry somente no servidor'
locale: pt-BR
translationOf: '260703'
sourceHash: fbcca6aea45957ef4f0764f5fae07c02e1481844e6db69d481df25b28077fd44
---

Neste post, quero falar sobre observabilidade.

Uso Sentry há bastante tempo no trabalho. Quando surge um issue, abrir o stack trace, restringir o escopo por release e tag e encontrar as condições de reprodução são tarefas familiares. Ainda assim, este blog não tinha monitoring de erros. No blog pessoal, eu lidava sobretudo com ferramentas do Google: via os visitantes no Analytics, consultava no Search Console quais buscas os traziam e ajustava títulos e descrições de acordo. Em outras palavras, eu tinha ferramentas para enxergar o usuário, mas não para enxergar como o server falhava.

Não era falta de conhecer as ferramentas. Eu adiava por outro motivo. Nos projetos da empresa, bastava construir sobre uma instrumentation que alguém já havia instalado; neste blog, eu teria de decidir tudo desde o início: qual ferramenta usar, onde instrumentar — server ou navegador — e o que considerar falha. Eram decisões de design, e tomá-las exigia rever primeiro como o blog funcionava. Eu sempre empurrava a tarefa adiante ao chegar a essa barreira.

Então comecei o trabalho com um agente de AI e terminei em um dia. Foram quatro PRs mesclados e dois PRs de validação fechados sem merge. Mas o que de fato motivou este texto não foi ter terminado rápido. Foi perceber que **ao instrumentar e medir, descobri que algumas coisas que eu julgava saber estavam erradas**.

Eu achava que o blog funcionava bem. As respostas eram 200 e as páginas abriam normalmente. Depois da instrumentation, porém, descobri que as estatísticas de visitantes já vinham ficando silenciosamente vazias e que, antes disso, o server permanecia preso por mais de 1 minuto. O valor de instalar uma ferramenta de observabilidade não estava na instalação em si, mas em descobrir coisas que, sem ela, eu não teria como saber.

Por isso, este texto segue por dois caminhos: um sobre confiabilidade do serviço e outro sobre entender os usuários. No fim, ambos chegam à mesma história.

## Primeiro, vamos esclarecer o que é observabilidade

Monitoring e observability são termos usados muitas vezes como sinônimos, mas apontam para coisas diferentes.

Charity Majors, fundadora da Honeycomb e uma das principais vozes desse debate há anos, explica [em seu blog](https://charity.wtf/2020/03/03/observability-is-a-many-splendored-thing/) que monitoring consiste em definir antecipadamente o que verificar e estabelecer limites: alertar quando a CPU passa de 90% ou quando a taxa de erros supera 1%, por exemplo. Já observability é definida assim.

::::quote
:::translation
É possível entender o que acontece dentro do sistema — entender **qualquer** estado interno em que ele possa entrar — apenas fazendo perguntas do lado de fora?
:::

:::original
can you understand what is happening inside the system — can you understand ANY internal state the system may get itself into, simply by asking questions from the outside?
:::
::::

É possível fazer perguntas externamente e compreender **qualquer** estado interno em que o sistema possa entrar? A palavra central é “qualquer”. Monitoring define de antemão as perguntas que serão feitas; observability é a capacidade de responder também às perguntas que não foram previstas. Em [outro texto](https://www.honeycomb.io/blog/observability-a-manifesto), Majors resume a diferença como known-unknowns e unknown-unknowns: o que sabemos que não sabemos e aquilo que nem sabemos que desconhecemos.

O que aconteceu comigo foi exatamente o segundo caso. Eu não havia perguntado antes: “O que acontece se a chamada ao GA falhar?”. Nem me ocorreu fazer essa pergunta.

Vale acrescentar que observabilidade costuma ser apresentada como “os três pilares: logs, métricas e traces”, formulação que a própria Majors critica em vários textos. A documentação oficial do OpenTelemetry também prefere o termo signal a pillar. Entender que coletar os três automaticamente produz observabilidade costuma levar a um estado em que as ferramentas existem, mas não respondem às perguntas. (Eu também comecei por uma lista de ferramentas e mudei de direção neste ponto.)

## Trabalhar com ferramentas de observabilidade é difícil demais

Então, o que tornava concretamente difícil adicionar essas ferramentas? Revendo por que adiei tanto, havia dois tipos de dificuldade.

O primeiro é **precisar entender como o navegador produz os valores**. Isso é especialmente verdadeiro ao observar o lado do usuário no frontend. Para medir diretamente o desempenho percebido pelo visitante, por exemplo, é preciso começar pelo `PerformanceObserver`. Mas essa API restringe combinações de opções. Segundo a documentação da MDN, a [opção buffered](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe), que recupera entradas já ocorridas, só pode ser usada com `type`, não com `entryTypes`. É isso que determina se, ao não colocar o script no topo da página, você perde por completo as métricas iniciais.

As próprias definições das métricas contrariam a intuição. O CLS, que mede deslocamentos de layout, não é a soma de todos os deslocamentos ocorridos na página. A [documentação de CLS](https://web.dev/articles/cls) do web.dev define o valor como **o maior agrupamento** entre as janelas de sessão. Deslocamentos separados por menos de 1 segundo pertencem ao mesmo grupo, cuja duração máxima é 5 segundos. Além disso, movimentos ocorridos até 500 milissegundos após uma entrada do usuário recebem a marca `hadRecentInput` e são excluídos, porque o usuário abrir um acordeão ao clicar num botão não é um erro. Se você somar tudo manualmente sem conhecer essas regras, obterá outro valor e dificilmente saberá onde errou.

A composição das métricas também muda. O FID, que media atraso de entrada, foi substituído pelo INP [em 2024/3/12](https://web.dev/blog/inp-cwv-march-12). A métrica deixou de observar apenas a primeira resposta de uma interação e passou a avaliar a responsividade das interações durante toda a vida da página.

Naturalmente, não é preciso implementar os cálculos à mão: basta usar a biblioteca `web-vitals`, do Google. Ainda assim, [a documentação](https://github.com/GoogleChrome/web-vitals) enumera armadilhas que permanecem. Essas APIs não enxergam dentro de iframes, de modo que, em páginas com iframe, o valor medido pela biblioteca diverge do Chrome User Experience Report (CrUX). Páginas carregadas em abas em segundo plano não reportam CLS, FCP nem LCP. Ao serem restauradas do cache de voltar/avançar, as métricas são reportadas novamente. Portanto, quando um valor foge do esperado, distinguir entre lentidão real do site e regras de medição ainda exige conhecimento do navegador.

O segundo desafio é **decidir onde colocar a instrumentation**. A documentação do OpenTelemetry explica bem essa distinção. Ela chama de zero-code instrumentation o método que se acopla como agente sem alterar o código-fonte e [descreve seu alcance](https://opentelemetry.io/docs/concepts/instrumentation/zero-code/) assim.

::::quote
:::translation
Em geral, a zero-code instrumentation adiciona instrumentation às bibliotecas que você usa. Isso significa instrumentar solicitações e respostas, chamadas ao banco de dados, chamadas a filas de mensagens e assim por diante. O código da sua aplicação, porém, normalmente não é instrumentado. Para instrumentá-lo, você precisa usar code-based instrumentation.
:::

:::original
Typically, zero-code instrumentation adds instrumentation for the libraries you're using. This means that requests and responses, database calls, message queue calls, and so forth are what are instrumented. Your application's code, however, is not typically instrumented. To instrument your code, you'll need to use code-based instrumentation.
:::
::::

O que a instrumentation automática oferece de graça são os limites das bibliotecas: uma solicitação HTTP entrou, uma chamada ao DB saiu. **Ela normalmente não informa que decisão o código da minha aplicação tomou.** Para saber isso, é preciso instrumentar manualmente.

E era exatamente esse segundo tipo que eu precisava. Eu não queria saber que “o client do GA foi chamado”, mas que “a função de consulta de estatísticas deste blog engoliu uma falha e devolveu o valor padrão”.

### O que mudou com o uso de AI

Então, o que a AI mudou? Antes de tudo, não tenho grupo de comparação. Nunca fiz exatamente o mesmo trabalho sozinho, portanto “um dia” não deve ser lido como resultado de desempenho, apenas como sinal de que ficou mais fácil começar. Com essa ressalva, houve duas mudanças.

Uma delas foi **não precisar memorizar todas as regras acima**. Antes, quando um valor parecia estranho, eu gastava meio dia só distinguindo um erro no meu código de uma regra de medição. Agora posso levar o valor observado e reduzir as possibilidades comparando “como esta métrica é calculada nestas condições?” com a documentação. Claro, não se pode acreditar cegamente. Enquanto escrevia este texto, flagrei a AI inventando de modo convincente uma frase que não existia no artigo acadêmico. Por isso, conferi no original todas as frases usadas como evidência. Ainda assim, **saber onde verificar é diferente de memorizar tudo**, e o peso da segunda tarefa diminuiu claramente.

A outra foi revisar em conjunto os pontos candidatos à instrumentation. Listar opções e trocar justificativas sobre por que cada ponto deveria ser escolhido foi mais rápido do que fazer isso sozinho. Porém, **decidir o que conta como falha continuou sendo responsabilidade minha até o fim.** A história a seguir registra precisamente como essa decisão estava errada.

## Havia uma falha sendo reportada como sucesso

O plano inicial era simples: adicionar o reporte de erro ao `catch` do handler da rota da API de estatísticas. Assim eu saberia quando a chamada ao GA falhasse. Parecia razoável.

Mas, ao injetar uma chave inválida de conta de serviço numa build local de produção para provocar a falha, **o erro não chegou ao `catch` da rota.** Quatro blocos `catch` no módulo de consulta de estatísticas, uma camada abaixo, o capturavam antes e devolviam valores padrão. O resultado era esta resposta.

```
HTTP 200 OK
{ "slug": "/260610", "views": 0 }
```

O visitante via 0 nas estatísticas, e o server respondia que tudo estava normal. Sem instrumentation, não havia como saber. (Já tratei dessa hierarquia em [Tratamento de erros](/251117); naquela ocasião, a questão era “onde capturar?”, enquanto agora eu encontrava “capturamos, mas ninguém sabe”.)

Por isso, movi a instrumentation da rota para esses quatro pontos e adicionei tags para distinguir em qual consulta a falha ocorria. Mais adiante, essas tags seriam decisivas.

### A assimetria da observação

Eu chamava isso apenas de “uma situação em que a falha não parece falha”, mas descobri que já existia um nome exato: o artigo que a Microsoft e a equipe do Azure apresentaram na HotOS de 2017, [Gray Failure: The Achilles' Heel of Cloud-Scale Systems](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/06/paper-1.pdf).

O artigo afirma que grandes incidentes de disponibilidade na nuvem em geral não são paralisações completas. Mecanismos de recuperação baseados num modelo simples, em que um componente ou funciona corretamente ou para por completo, são inadequados nessas situações e às vezes as agravam. Sua característica central é definida assim.

::::quote
:::translation
Argumentamos que uma característica fundamental de gray failure é a differential observability: os detectores de falha do sistema podem não perceber problemas mesmo quando as aplicações são afetadas por eles.
:::

:::original
we argue that a key feature of gray failure is differential observability: that the system's failure detectors may not notice problems even when applications are afflicted by them.
:::
::::

Differential observability, isto é, assimetria da observação. Um agente sofre os efeitos da falha enquanto outro não a percebe — e o problema é que o segundo é justamente quem deve detectar e recuperar falhas. O exemplo do artigo é marcante: se o módulo que processa solicitações parar, mas o módulo de heartbeat continuar vivo, o tratamento de erros que depende desse heartbeat considerará o sistema saudável, enquanto o client que solicitou o serviço o considerará falho.

O artigo também aponta uma direção para a solução: concentrar-se em fechar a lacuna entre o que componentes diferentes entendem como falha. Mover a instrumentation da rota para a camada inferior foi exatamente um trabalho de fechar essa lacuna.

## E então apareceu uma falha real

O primeiro issue real em produção após a instrumentation é a cena seguinte desta história.

A chamada ao GA falhava com `DEADLINE_EXCEEDED` depois de **65.877 segundos**. Mas, devido à estrutura descrita acima, a resposta continuava sendo 200. A home usa renderização dinâmica e transmite a área de estatísticas por streaming, por isso a página em si aparece de imediato. Em compensação, **essa área permanece carregando por mais de 1 minuto e então é silenciosamente preenchida com 0.**

Ao investigar, encontrei isto no arquivo de configuração da biblioteca client do GA.

```json
"RunReport": { "timeout_millis": 60000, "retry_params_name": "default" }
```

O timeout RPC padrão da biblioteca é 60 segundos, e meu código não passava timeout em nenhum dos cinco pontos de chamada. Naquele momento, interpretei os 65.877 segundos observados como 60 segundos mais o overhead de conexão e do load balancer. (Essa interpretação seria abalada depois; voltarei a isso.)

Aprendi então que não era um erro só meu, mas um tipo de falha amplamente advertido. O [texto sobre deadline no blog oficial do gRPC](https://grpc.io/blog/deadlines/), de Gráinne Sheerin, da equipe de SRE do Google, começa logo abaixo do título com “TL;DR: Always set a deadline”. Ele explica que, sem deadline, todas as solicitações em andamento podem reter recursos até o timeout máximo, esgotando memória, aumentando a latência e, no pior caso, encerrando o processo. O client do GA que uso também se baseia em gRPC; a documentação já alertava para o mesmo princípio, mas eu não o havia aplicado nos pontos de chamada.

A correção foi fixar o timeout em 5 segundos e passá-lo aos cinco pontos. Em seguida, montei um server TCP local que não respondia para reproduzir o caso de forma determinística.

| Condição | Tempo decorrido | Mensagem de erro |
|---|---|---|
| Sem timeout (antes da correção) | **60.04 segundos** | `Deadline exceeded after 60.000s` |
| `timeout: 5000` (depois da correção) | **5.00 segundos** | `Deadline exceeded after 5.000s` |

Os números se comportaram exatamente como descrito. Só depois de obter essa tabela pude afirmar que a configuração de timeout realmente chegava ao código. (Antes disso, era apenas a suposição de que “deve ser por não haver timeout”. Mais adiante, porém, ficou claro que isso não confirmava a causa em produção.)

Mais um detalhe: o número 5 em si não tem fundamento. Como não medi a distribuição da latência do GA quando tudo funciona, 5 segundos foi uma escolha essencialmente arbitrária. A direção da decisão, porém, tinha apoio. No [capítulo 3, Embracing Risk](https://sre.google/sre-book/embracing-risk/), o livro de SRE do Google afirma que 100% nunca é uma meta correta de confiabilidade: além de inalcançável, costuma exceder o nível que os usuários desejam ou sequer percebem. Neste blog, a contagem de visitantes é informação complementar. Para a experiência do visitante, é melhor desistir rapidamente e desenhar o valor padrão do que esperar por uma resposta exata. Foi uma decisão de não estabelecer uma meta de confiabilidade de 100%.

## Medi de novo depois de achar que estava corrigido

Até aqui seria o final original deste texto: eu havia encontrado a causa, reproduzido o problema e corrigido.

Mas, enquanto escrevia, abri novamente a lista de issues por hábito. Na release que continha o commit da correção, havia mais de cem ocorrências da mesma família de `DEADLINE_EXCEEDED`. A mais recente era de poucas horas antes.

Extraí as 100 ocorrências mais recentes e examinei a distribuição dos tempos reportados. É importante notar que esse valor não é o tempo que o GA realmente levou para responder, mas o wall-clock time (tempo decorrido real) desde a definição do deadline até o instante em que o timer de fato disparou. Essa diferença se torna importante adiante.

![Distribuição dos tempos reportados em 100 ocorrências de DEADLINE_EXCEEDED após a correção do timeout](2.png?w=720)

A leitura é esta: **o limite inferior foi respeitado.** Nenhuma chamada terminou em menos de 5 segundos; a mais curta levou 5.16 segundos. Comparando com a reprodução de 60 segundos quando não havia limite explícito, a configuração de 5 segundos de fato chega ao código. Mas os valores sobem até 8 minutos e 24 segundos, com mediana de 61 segundos. Mais estranho ainda, não se concentram em faixa alguma. Se o atraso viesse simplesmente de lentidão do GA, deveriam se acumular perto do limite, mas não é o que ocorre.

As tags revelaram mais. Entre as 100 ocorrências, apareciam apenas `stats` e `popular`, geralmente em pares. Esses dois caminhos têm algo em comum: **ambos são caminhos de revalidação atrás de um cache de uma hora.** Já os outros dois (`page` e `pages`), que chamam o GA no momento da solicitação sem cache, não apareceram nenhuma vez entre as 100 ocorrências.

Isso importa porque indica que a falha não ocorre enquanto se processa a solicitação do visitante, mas **apenas na tarefa que repopula o cache após o fim da resposta**.

E essa observação abala uma frase que escrevi na seção anterior. Eu disse que a área de estatísticas ficava carregando por mais de 1 minuto; se a falha ocorre apenas depois da resposta, talvez o visitante não tenha esperado esse tempo. A história pode ser diferente na primeira solicitação com o cache vazio, mas os dados disponíveis não distinguem os casos. Era mais uma frase escrita sem medir.

Há outro ponto incômodo. Antes interpretei 65.877 segundos como o timeout de 60 segundos mais overhead. Ao reabrir os itens de overhead daquele evento, porém, a soma mal chegava a 2 milissegundos. Vista agora, aquela interpretação também tinha base fraca. O mesmo tipo de inflação pode ter acontecido naquele evento.

Minha hipótese atual é esta. O blog roda em funções serverless, cujo ambiente de execução congela depois de enviar a resposta até a chamada seguinte. Se os timers também pararem nesse intervalo e dispararem atrasados quando a função despertar, o valor registrado em wall-clock time pode parecer inflado sem representar espera real. Isso explicaria tanto o limite inferior exatamente junto de 5 segundos quanto a ausência de concentração dos valores superiores. Também coincide com a observação anterior de que as falhas surgem apenas no trabalho posterior à resposta.

Mas é preciso ter cuidado mais uma vez: **uma distribuição não contradizer a hipótese é diferente de sustentá-la.** Há vários cenários em que um timer dispara tarde. Além do congelamento serverless, uma renderização pesada poderia bloquear o event loop, ou o contêiner poderia sofrer restrição de CPU. Os três produziriam uma distribuição com a mesma forma observada. Portanto, o gráfico não reduz as possibilidades.

Também mantenho outra explicação como candidata. A configuração da biblioteca define um orçamento total de 600 segundos incluindo retries, e o máximo observado, 504 segundos, cabe nele. Entretanto, a lista de códigos elegíveis para retry está vazia nesse método, o que indica que esse caminho não deveria ser usado. Seja qual for a resposta, **a hipótese ainda não foi confirmada.** E havia uma armadilha até na escolha de como confirmá-la. Minha primeira ideia foi medir o horário imediatamente antes e depois da chamada, mas isso não responderia à pergunta: wall-clock time continua passando enquanto a função está congelada e apenas reproduziria o número que já tenho. O que distingue os casos é **o tempo de CPU no mesmo intervalo**. Se passarem 61 segundos no wall clock enquanto o tempo de CPU permanecer quase em 0, o processo não estava esperando; estava parado. Esse parece ser o próximo trabalho.

Tenho um motivo para manter esta seção. Eu acreditava ter corrigido o problema. Havia reproduzido o caso e até produzido uma tabela, então o considerava certo. Ao reabrir os dados, descobri que não era. Instalar instrumentation é uma tarefa pontual; observabilidade é medir continuamente. Confundir as duas leva exatamente ao engano que cometi.

Mais um detalhe: não vi a lista de issues, a distribuição das tags e os valores de tempo abrindo um dashboard; pedi esses dados a um agente. O Sentry oferece um [server MCP oficial](https://github.com/getsentry/sentry-mcp) que permite consultar issues e eventos diretamente no editor. Assim, posso abrir os problemas de produção ao lado do código, sem vários cliques. **Não caiu apenas o custo de adicionar instrumentation; caiu também o custo de consultar os dados acumulados.**

## Instalar e usar são coisas diferentes

Depois disso, reli a documentação desde o início para entender até onde a ferramenta poderia ir. Afinal, uma única tag acabou sendo decisiva nesta investigação, e eu a havia adicionado quase de passagem durante a instrumentation. Se algo casual teve tanto valor, que perguntas os recursos ativados deliberadamente poderiam responder?

![Camadas de perguntas que o Sentry pode responder e o alcance ativado neste blog](3.png?w=720)

**Releases e commits** formam o primeiro bloco. Neste blog, o hash do commit de deploy é anexado à release, por isso sei a partir de qual deploy um problema começou. Indo além, é possível enviar também a lista de commits da release, ativando os [suspect commits](https://docs.sentry.io/product/issues/suspect-commits/). Para cada frame da aplicação no stack trace, o recurso consulta o blame do arquivo e do número da linha e, se o commit mais recente tiver menos de 1 ano, o aponta como suspeito. Depois, sugere seu autor como responsável ou até o atribui automaticamente. [Ao associar commits a uma release](https://docs.sentry.io/product/releases/associate-commits/), um ID de issue incluído na mensagem de commit também pode fazer o issue ser marcado como resolvido naquela release. Como este blog já envia sourcemaps, metade da base existe, mas a associação de commits ainda não foi configurada.

**Regras de propriedade** não têm muita utilidade num blog pessoal, mas sua estrutura é interessante. Segundo a [documentação](https://docs.sentry.io/product/issues/ownership-rules/), elas combinam caminhos de arquivo, módulos, URLs de solicitação e valores específicos de tag por meio de globs Unix para designar uma pessoa ou equipe responsável: `path:src/api/*` para a equipe de backend, por exemplo. Minha primeira impressão foi que isso não é mero roteamento de alertas, mas **uma forma de registrar propriedade como código**. Se uma pessoa precisa decidir quem deve examinar cada issue quando ele chega, nos dias corridos ninguém o examina.

**Tracing** responde a outro tipo de pergunta. A [documentação do Sentry](https://docs.sentry.io/concepts/key-terms/tracing/) define trace como o registro de eventos e operações conectados de uma aplicação, e span como uma única operação com nome e duração. Ao seguir uma solicitação por vários serviços, bancos de dados e funções, vemos **quanto tempo cada trecho consumiu**. Se o reporte de erros responde “o que quebrou?”, tracing responde “onde o tempo desapareceu?”. Foi exatamente nessa segunda pergunta que fiquei preso na seção anterior. Para saber se o tempo reportado era espera real, eu precisaria do início e do fim do trecho da chamada. Para economizar, este blog coleta apenas 10% das amostras de trace, decisão de que senti falta aqui.

E o **monitor de tarefas agendadas** é a opção mais alinhada à tese deste texto. O reporte de erros captura apenas o que aconteceu; não captura o que deixou de acontecer. Um monitor de Cron informa que uma tarefa está em andamento quando começa e se terminou com sucesso ou falha. O importante é o terceiro estado: a [documentação](https://docs.sentry.io/product/crons/job-monitoring/) classifica separadamente como missed uma execução da qual não chega sinal no horário previsto. Isso inclui um scheduler configurado incorretamente ou uma tarefa que nem chegou a começar.

Isso não é abstrato para mim. Toda segunda-feira, o blog coleta automaticamente dados do Search Console, e uma das camadas de observabilidade descritas adiante depende inteiramente dessa tarefa. Hoje, porém, eu não saberia se ela deixasse silenciosamente de executar numa semana. Não haveria erro, porque não teria **acontecido coisa alguma**. O próprio mecanismo que coleta dados de observabilidade estava num ponto cego.

Em resumo, instalar a ferramenta leva um dia, mas ampliar as perguntas que ela pode responder continua sendo trabalho. E não se decide qual camada ativar percorrendo uma lista de recursos. **É preciso primeiro definir o que conta como falha para saber qual camada é necessária.** Neste blog, no instante em que “a coleta semanal não executou” passou a ser reconhecida como falha, surgiu mais uma camada a ativar.

## Quando uma opção não faz o que a documentação sugere

Quero registrar mais um caso paralelo, de natureza um pouco diferente.

Depois de enviar os sourcemaps, eu precisava remover os arquivos `.map` dos artefatos da build por causa do tamanho. Os sourcemaps do server somavam **57MB**, mais que o JS do server (15MB), e sem removê-los todos seriam incluídos no bundle da função de deploy. Havia justamente uma opção para excluir sourcemaps após o upload, então eu a ativei.

Ao medir, porém, os arquivos `.map` do server ainda ocupavam os mesmos 57MB logo depois do upload. A opção limpava somente o diretório de artefatos estáticos, não o diretório do server que concentrava o tamanho. No fim, passei a especificar diretamente o caminho a excluir.

Pelo mesmo motivo, alterei os logs de upload para que fossem mantidos condicionalmente. Se eles ficarem sempre desligados, um token expirado pode fazer todo o upload falhar em silêncio, e ninguém saberá até aparecer um stack trace ilegível.

Isso não é um problema de detecção de falha, mas uma divergência entre o nome e o alcance real do comportamento. Por isso, não o classifico como gray failure. A lição, contudo, aponta na mesma direção: **ler a documentação e ativar uma opção é diferente de verificar se ela fez o que você esperava.**

## Erros não são o único objeto da observabilidade

Até aqui falamos de confiabilidade. Mas o valor de usar bem os dados de observabilidade não termina na detecção de incidentes. Voltemos ao outro caminho anunciado no início: entender os usuários.

A definição de confiabilidade da documentação do OpenTelemetry captura bem a transição: ela responde se “o serviço faz o que os usuários esperam?”. A referência não são métricas do server, mas **as expectativas do usuário**. Portanto, também precisamos medir o que os usuários realmente vivenciam.

Este blog acabou sendo observado em três camadas.

![As três camadas de observabilidade deste blog: erros, desempenho percebido e comportamento de pesquisa](4.png?w=720)

Cada uma responde a uma pergunta: a primeira, o que quebrou; a segunda, quanto o visitante esperou; a terceira, por qual consulta de pesquisa ele chegou.

Houve uma decisão importante na segunda camada. Podemos medir desempenho abrindo uma página num ambiente controlado ou observando todos os visitantes reais. O web.dev chama o primeiro método de lab data e o segundo de field data e, em [sua comparação entre os dois](https://web.dev/articles/lab-and-field-data-differences), recomenda priorizar field data quando ambos estão disponíveis, pois representam o que usuários reais vivenciam. Uma boa pontuação no Lighthouse não impede que a distribuição entre visitantes reais seja diferente. Por isso, o blog não para na pontuação: envia ao GA4 os valores de usuários reais.

A referência vem da [documentação de Web Vitals do web.dev](https://web.dev/articles/vitals): LCP até 2.5 segundos, INP até 200 milissegundos e CLS até 0.1, avaliados no 75º percentil dos carregamentos, separando dispositivos móveis e desktop. Ou seja, observamos o limite superado pelos 25% mais lentos, não a média. (Só ao entender esse critério percebi que a média apaga por completo os usuários lentos.)

### A posição caiu, mas os cliques aumentaram

Na terceira camada, os dados de pesquisa contrariaram mais uma expectativa.

O blog coleta periodicamente dados do Search Console e compara os 28 dias mais recentes com os 28 anteriores. Entre os dados acumulados, um post antigo chamou minha atenção.

![Comparação de 28 dias de um post no Search Console: impressões e posição pioraram, mas cliques e taxa de cliques cresceram muito](5.png?w=720)

As impressões caíram 11%, e a posição média foi de 8.9 para 11.6. Considerando apenas essas métricas, o post piorou. Mas os cliques passaram de 2 para 13, e a taxa de cliques, de 0.87% para 6.37%.

É honesto reduzir um pouco o suspense: esse padrão não surpreende quem trabalha com dados de pesquisa. Como a posição média é ponderada por impressões, se desaparecem impressões em posições altas nas quais ninguém clicava, a posição média piora e a taxa de cliques sobe mecanicamente. Uma simples mudança na composição das consultas pode parecer uma reviravolta. Além disso, em 28 dias, o aumento absoluto foi de 11 cliques, um número pequeno.

Ainda assim, algo permanece: mais pessoas chegaram ao post, e eu não saberia disso se olhasse apenas para impressões e posição. O que extraí desses números não foi uma conclusão sobre um post específico, mas o fato de que **a escolha da métrica pode inverter a conclusão**. Se posição fosse a medida de sucesso, o texto precisaria de correção; se cliques fossem a medida, ele teria ido bem. É a mesma ideia da definição de confiabilidade anterior: colocar o usuário como referência muda o que enxergamos.

Há muito tempo ajusto títulos e descrições neste blog, reescrevendo o que aparece nos resultados conforme as consultas reais. Esses números não provam o efeito desse trabalho. O aumento da taxa de cliques apesar da queda de posição pode ter várias outras causas, como sazonalidade ou mudança na composição das buscas. Mas **sem medir, eu nem saberia que houve uma mudança nessa direção**.

### A decisão de abrir mão de 79KB

Ao falar das três camadas, não posso omitir a decisão de não adicionar instrumentation no navegador.

Eu queria ativar também o monitoring de erros do client. A impossibilidade de ver erros exclusivos do navegador continuava me incomodando. Então ativei o recurso e medi o bundle. Estes são os totais de gzip do JS do client numa clean build.

| Configuração | JS do client (gzip) | Aumento |
|---|---|---|
| Não aplicado | 181.6 KB | Referência |
| **Somente server (atual)** | **182.3 KB** | **+0.7 KB** |
| Incluindo client | 260.4 KB | +78.8 KB |

A instrumentation do server era praticamente gratuita, mas a do navegador exigia 78.8KB. Também tentei opções de otimização do bundle, sem alterar o número. A única forma de reduzir o custo do client era não criar o arquivo de inicialização do navegador.

Hoje vejo uma falha nessa medição. O fato de ativar uma opção não reduzir sequer um byte poderia indicar que ela não estava surtindo efeito, mas na ocasião li apenas a conclusão. Além disso, somei todos os artefatos estáticos, valor diferente do que um único visitante realmente baixa. Portanto, a formulação precisa não é “observabilidade no navegador custa 79KB”, mas **“na minha configuração, não consegui reduzi-la abaixo disso”**.

O objetivo da adoção era capturar chamadas que falhavam silenciosamente no server, e essa parte não tinha custo. Neste blog, desempenho de carregamento é experiência do usuário e também condição para visibilidade nas buscas. Por isso, desisti. Curiosamente, a decisão segue a lógica anterior: **se definimos confiabilidade pelas expectativas do usuário, tornar a observabilidade mais detalhada nem sempre é a escolha correta.** A própria observabilidade pode prejudicar a experiência.

Isso parece contradizer meu arrependimento por amostrar apenas 10% dos traces. Nos dois casos comprei menos observabilidade por custo; por que um seria arrependimento e o outro uma boa decisão? O critério que formulei depois é **quem paga esse custo**. Reduzir a amostragem de traces economizou na minha conta; os 78.8KB da instrumentation do navegador custariam dados e tempo aos visitantes. Quando o custo é meu, em geral vale comprar mais. Quando é do usuário, preciso perguntar o que essa observabilidade devolve a ele.

## Sobre o que devemos alertar?

Assim que adicionamos instrumentation, surge a pergunta: onde configurar os alertas?

O [documento sobre filosofia de alertas](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic), escrito por Rob Ewaschuk nos primeiros anos do SRE do Google, determina que um alerta que chama uma pessoa deve ser urgente, importante, acionável e real. Recomenda também alertar sobre sintomas, não causas: sinais externos, como uma resposta 500 ou um erro visível ao usuário.

Há, porém, uma tensão sutil entre esse princípio e o que vivi. **Meu sintoma não era 500.** Era uma resposta 200 com estatísticas vazias. Alertas baseados em sintomas pressupõem que a falha aparece no status code; a differential observability descrita antes é justamente a situação que rompe essa premissa.

Não considero que isso refute o princípio. Minha conclusão é que **definir “o que conta como sintoma” é a parte realmente difícil**. Neste blog, o sintoma não era o status code, mas “a função de consulta de estatísticas devolveu o valor padrão”, e só a instrumentation manual poderia transformá-lo em sintoma observável.

Outro conselho do mesmo documento merece atenção: prefira remover alertas ruidosos, porque o excesso de monitoring é mais difícil de resolver do que a falta dele. Como nota, o livro de SRE inclui **a própria falha do monitoring** entre os gatilhos para escrever um postmortem. A decisão de manter logs condicionais para impedir que o upload de sourcemaps falhasse em silêncio apontava na mesma direção.

## Por que isso importa ainda mais na era da AI

Até aqui, uma pergunta surge naturalmente: isto não é apenas uma defesa de instalar bem ferramentas de observabilidade? O que tem a ver com AI?

Na minha opinião, muito, por duas razões.

Primeiro, os dados do setor dizem isso. O [relatório DORA de 2025](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report), liderado por Nathen Harvey e Derek DeBellis, baseia-se numa pesquisa com cerca de 5 mil profissionais de tecnologia do mundo todo e em mais de 100 horas de dados qualitativos. Após registrar uma relação positiva entre adoção de AI, throughput e resultados de produto, ele acrescenta imediatamente esta frase.

::::quote
:::translation
No entanto, a adoção de AI continua apresentando uma relação negativa com a estabilidade da entrega de software.
:::

:::original
However, AI adoption does continue to have a negative relationship with software delivery stability.
:::
::::

A relação com a estabilidade da entrega continua negativa: quanto mais velocidade, mais instabilidade. Em um [texto separado de insights](https://dora.dev/insights/balancing-ai-tensions/), o DORA explica o mecanismo: o tempo poupado na geração é realocado para overhead de verificação, enquanto cresce a própria velocidade com que se produz código a revisar. O resumo do relatório expressa melhor a situação: AI não conserta uma equipe; amplifica o que já existe. Se aumentarmos a velocidade de deploy sem observabilidade, amplificaremos falhas silenciosas.

Segundo — e esta razão pesou mais para mim — há **evidências de que não podemos confiar na própria percepção**. Em 2025, a METR publicou um [estudo](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) que atribuiu aleatoriamente a 16 desenvolvedores experientes de open source permissão para usar AI em cada um de 246 issues reais.

::::quote
:::translation
Quando os desenvolvedores podem usar ferramentas de AI, levam 19% mais tempo para concluir os issues…
:::

:::original
When developers are allowed to use AI tools, they take 19% longer to complete issues…
:::
::::

O trecho realmente marcante vem em seguida. Antes do estudo, os desenvolvedores esperavam que a AI os tornasse 24% mais rápidos e, **mesmo depois de vivenciarem a desaceleração, acreditavam ter ficado 20% mais rápidos.** Também citei esse estudo ao escrever [Engenheiro de frontend com AI](/260302), quando o li no contexto da produtividade. Hoje o leio de outra forma. O número não é evidência de que não se deve usar AI; é **evidência de que percepção e realidade divergem**.

Se não podemos confiar na percepção, resta uma saída: medir. Eu sentia que o blog funcionava bem; ao medir, descobri chamadas ao GA presas por mais de 1 minuto. Senti que havia corrigido; ao medir novamente, descobri que ainda não.

## O objeto da observabilidade também está se ampliando

Por fim, quero registrar uma tendência recente.

O próprio objeto que devemos observar está mudando. O OpenTelemetry vem organizando semantic conventions para AI generativa em um [repositório separado](https://github.com/open-telemetry/semantic-conventions-genai), incluindo como alvos de instrumentation não só clients de GenAI, mas também chamadas MCP (Model Context Protocol). Ainda é um estágio inicial, com o schema em construção, portanto não acho que seja o momento de recomendar a adoção. A direção, porém, é clara: à medida que conectamos ferramentas a agentes de AI, essas chamadas também se tornam observáveis. Expliquei o funcionamento do MCP em [Ferramentas para agentes de AI](/260529) e tratei de evals em [Harness(Systems) Engineering](/260622); parece que os dois assuntos se encontram aqui.

Serviços de monitoring de erros caminham na mesma direção. O Sentry lançou o agente de debugging por AI [Seer](https://docs.sentry.io/product/ai-in-sentry/seer/), que usa em conjunto detalhes do issue, traces, logs e contexto de profiling para encontrar a causa raiz e até criar um PR de correção. Ainda não o usei seriamente e não encontrei números oficiais de precisão na documentação, portanto não posso afirmar seu desempenho. Mas é claramente a mesma direção da experiência anterior de abrir issues via MCP: o custo de interpretar dados de observabilidade está caindo.

## Conclusão

Em resumo:

Trabalhar com AI realmente reduziu a barreira para adicionar ferramentas de observabilidade. Uma tarefa adiada por muito tempo terminou em um dia, e o peso de conhecimentos como a forma em que o navegador produz métricas já não é o mesmo. Mas o que obtive não foi apenas uma ferramenta. Descobri que estavam erradas as suposições de que bastava capturar o `catch` da rota, de que uma opção faria o que seu nome sugeria e de que adicionar um timeout encerraria o assunto. Nada disso poderia ser conhecido sem medir.

Passei então a entender observabilidade assim: ela serve para encontrar a causa de incidentes, mas, antes disso, é **uma ferramenta para medir a lacuna entre minha percepção do sistema e a realidade**. Nos termos do artigo sobre Gray Failure, é o trabalho de fechar a diferença entre o que agentes distintos consideram falha. Essa diferença existe tanto na confiabilidade quanto no que os usuários realmente vivenciam.

Quanto mais barata fica a geração, mais fácil é essa lacuna crescer, porque a velocidade de criação aumenta sem que a velocidade de verificação acompanhe necessariamente. Por isso, hoje penso que observabilidade é o que permite usar AI de forma mais ativa. A ordem parece invertida, mas, quando podemos criar rápido, também precisamos verificar rápido.

Naturalmente, estas observações vêm da pequena escala de um blog pessoal. Com outro volume de tráfego ou tamanho de equipe, as decisões podem mudar. Em outro serviço, talvez fosse correto aceitar os 78.8KB. Não parece haver uma resposta universal. Ainda assim, uma coisa posso afirmar: sentir que algo funciona bem não é o mesmo que ele realmente funcionar, e só medindo se conhece a diferença. Espero que os leitores pensem no que acreditam sobre seus serviços sem jamais terem medido e no que julgam ter corrigido sem voltar a abrir os dados.

:::ref
- [docs] [OpenTelemetry, introdução à observabilidade](https://opentelemetry.io/docs/concepts/observability-primer/)
- [docs] [Livro de SRE do Google, Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [docs] [Livro de SRE do Google, Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [docs] [Livro de SRE do Google, Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [docs] [web.dev, Interaction to Next Paint](https://web.dev/articles/inp)
- [article] [Martin Fowler, CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html)
:::
