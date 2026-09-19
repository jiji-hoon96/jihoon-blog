---
emoji: 🧩
title: 'Da observação ao julgamento'
seoTitle: 'As Core Web Vitals e o SEO segundo o CrUX e o Search Console'
date: '2026-09-16'
updatedAt: '2026-09-19'
categories: observabilidade frontend GA4 Search-Console
description: 'Como CrUX, PageSpeed Insights e Search Console filtram as Web Vitals, o que o Google diz sobre ranking e um post com mais cliques mesmo perdendo posição.'
keywords: 'dados de campo CrUX, PageSpeed Insights dados de campo, relatório Core Web Vitals Search Console, Core Web Vitals afeta o ranking, cliques por consulta e por página Search Console, posição média caiu cliques aumentaram, taxa de rastreamento 5xx 429'
locale: pt-BR
translationOf: '260916'
sourceHash: ffb98bcd9319ff4b9e6d07267eeaf96c6cb22ce658817b7a29f36977d6a8de15
---

Neste post, quero falar sobre o caminho que os dados de desempenho medidos no navegador percorrem até chegar à busca e ao julgamento.

Os três primeiros posts desta série trataram de sinais que eu mesmo tenho. Em [Reabrindo o Sentry](/260913), vimos chamadas que falham em silêncio no servidor; em [Observabilidade do navegador](/260914), a rede e a renderização; e em [CPU e memória do navegador](/260915), a main thread e a memória. Nos três casos, são dados para os quais eu mesmo inseri o código de instrumentação e que leio do meu próprio armazenamento.

Os dados deste post são de outra natureza. Os valores gerados nos navegadores dos visitantes passam para o pipeline estatístico do Chrome, e o resultado reaparece no PageSpeed Insights e no :term[Search Console]{key="search-console"}. De quem a experiência é contada, quanto precisa se acumular para ser exibido e em que unidades tudo é agrupado são decisões do Google.

Por isso, a pergunta que este post tenta responder é uma só. **O que é preciso verificar antes de usar, para tomar uma decisão, um número que já saiu do navegador?** Minha resposta é anotar primeiro a amostra e as regras de agregação de cada número, não acrescentar nada que o texto oficial não diga e medir de novo, com outro período, qualquer conclusão a que se tenha chegado.

## Os web_vitals que eu coleto

O ponto de partida é o :term[RUM]{key="rum"} que eu mesmo coleto. Como vimos no post de observabilidade do navegador, este blog mede LCP, INP, CLS, FCP e TTFB com `web-vitals` e os envia ao GA4 como eventos `web_vitals`. O que vale olhar de novo aqui não é quais parâmetros são enviados, e sim **de quem é a experiência que entra na amostra**.

A amostra desta coleta são **os navegadores em que o gtag.js realmente foi executado**. Os eventos se acumulam primeiro no `dataLayer` e o gtag.js consome essa fila ao carregar, então, em ambientes em que a requisição do script é bloqueada, as medições são geradas mas nunca saem. Por outro lado, um navegador que não é o Chrome também entra na amostra se o gtag.js rodar e o navegador suportar a métrica. E, por causa de `reportSoftNavs: true`, uma tela trocada por roteamento no lado do cliente é contada como uma experiência de página separada. Como veremos adiante, o CrUX conta a mesma visita de outra forma.

Para ser sincero, enquanto escrevia este post não consultei de novo os valores de `web_vitals` acumulados no GA4. Também não verifiquei a pergunta que deixei para depois no post anterior, ou seja, se registrar `metric_navigation_type` como custom dimension do GA4 permite de fato segmentar os dados. Tentei consultar com uma conta de serviço, mas a Analytics Admin API não estava habilitada nesse projeto. **Enviar dados e conseguir lê-los são coisas diferentes, e neste blog só a primeira está confirmada.**

## Os usuários que o CrUX conta

Os field data que o Google olha do lado da busca não vêm do meu GA4, e sim do Chrome User Experience Report (CrUX). Lendo a [documentação de metodologia do CrUX](https://developer.chrome.com/docs/crux/methodology), a amostra se reduz em três camadas de condições.

A primeira é a condição de usuário. Só entram usuários que ativaram o envio de estatísticas de uso, sincronizam o histórico de navegação e não definiram uma senha longa de sincronização. As plataformas são o Chrome para desktop e o Chrome para Android; **ficam de fora o Chrome no iOS, o Android WebView e outros navegadores Chromium, como o Edge.** Não é divulgado qual porcentagem do total de usuários atende a essas condições.

A segunda é a condição de página. A página precisa ser publicamente detectável pelo mesmo critério de um mecanismo de busca. Uma página que não retorna 200 depois dos redirecionamentos, ou que tem `noindex`, não é elegível. Ela também precisa ultrapassar um número mínimo de visitantes; esse número não é divulgado, e o mesmo valor vale para páginas e origins.

A terceira é o método de agregação. Query strings e fragmentos são removidos e agrupados como a mesma página. E a documentação afirma explicitamente que as transições de rota em JavaScript de uma SPA, mesmo que pareçam páginas novas para o usuário, **são atribuídas à experiência da única página carregada inicialmente**. É exatamente o oposto do meu RUM, que conta soft navigations separadamente. A [documentação da equipe do Chrome sobre soft navigations](https://developer.chrome.com/docs/web-platform/soft-navigations) também registra que ainda não foi decidido como as soft navigations serão reportadas ao CrUX.

Aplicando essas condições ao meu blog, surgem resultados concretos. Em 11 de setembro de 2026, mudei para `noindex, follow` 126 páginas de categoria que tinham um único post. Essas páginas não são mais elegíveis para o CrUX no nível de página. Então elas continuam no nível de origin? A resposta da documentação se divide dentro de uma mesma página. A seção Origin diz que, se o origin for detectável, as experiências de todas as suas páginas são combinadas no nível de origin independentemente de cada página ser detectável, enquanto o início da seção Eligibility do mesmo documento diz que experiências que não cumprem as condições de Page também não entram nos dados no nível de origin. Não encontrei uma forma de confirmar qual é o comportamento real. **Por isso registro que não sei se as visitas às categorias que passaram para noindex continuam no valor do origin.**

Até aqui estão as regras que confirmei na documentação. O ponto central é que **não sei se hooninedev.com ultrapassa o número mínimo de visitantes.** Como esse limite não é público, a única saída é consultar diretamente, e essa tentativa travou na seção seguinte.

## Os dois números do PageSpeed Insights

O PageSpeed Insights mostra em uma única tela dois tipos de números de natureza diferente. Segundo a [explicação oficial](https://developers.google.com/speed/docs/insights/v5/about), os dados lab são um único carregamento simulado pelo Lighthouse, e os dados field são os últimos 28 dias do CrUX. Lab é o resultado de um único dispositivo e de uma condição de rede fixos, enquanto field é o registro de usuários reais em ambientes variados, então a documentação também avisa que uma boa pontuação lab não garante uma boa experiência real.

O lado field tem uma regra de fallback. Se não houver dados suficientes no nível de página, ele desce para o nível de origin, e se o origin também não tiver o suficiente, não consegue mostrar dados field.

Tentei obter os dados field deste blog pela API do PSI. Ao requisitar `/260914` para mobile em 2026-09-16T08:45:51Z, recebi HTTP 429, e ao requisitar a página inicial (`/`) mais uma vez em 2026-09-16T09:11:17Z, recebi o mesmo 429. O corpo das duas respostas era `Quota exceeded for quota metric 'Queries' and limit 'Queries per day'`. Parece que esbarrei na cota compartilhada por chamar sem chave de API. **Por isso, este post não traz valores field do CrUX para este blog.** A API do CrUX exige chave de API, e no meu ambiente só existe uma conta de serviço para o Search Console, então não a chamei.

No mesmo horário, medir `/260914` com o Lighthouse local funcionou sem problema. **Valores lab podem ser gerados a qualquer momento, mas valores field só existem quando o número de visitantes e as condições de elegibilidade são atendidos.** Ter números acumulados no meu RUM não significa que o CrUX tenha um valor.

## Os grupos de URL do Search Console

A última etapa é o relatório de Core Web Vitals do Search Console. A [ajuda do relatório](https://support.google.com/webmasters/answer/9205520) informa que os dados vêm do CrUX e empilha mais algumas camadas de regras por cima.

- Páginas semelhantes são agrupadas em um **URL group**, e o status do grupo segue a pior métrica.
- Um grupo só aparece no relatório quando **tanto** LCP quanto CLS atingem a quantidade mínima de dados. Se faltarem dados ao grupo, ele é exibido agrupado no origin group superior, e se faltarem também ao origin group, ele fica de fora.
- **Só aparecem URLs indexadas**, e elas são uma amostra, não a lista completa.
- "No data available" significa que a propriedade é nova ou que não há dados suficientes do CrUX para aquele tipo de dispositivo.

Encadeando as quatro etapas, dá para ver a ordem em que a amostra encolhe. O RUM conta as visitas em que o gtag.js rodou; o CrUX mantém delas só os usuários elegíveis do Chrome e as páginas detectáveis e populares o bastante; o PSI mostra isso no nível de página ou de origin; e o Search Console agrupa as URLs indexadas e mantém só as que passam do limite. Como cada etapa filtra com regras diferentes, **o LCP da mesma página aparecer com valores diferentes em quatro lugares não é erro, é o normal.**

Meu script de coleta (`scripts/fetch-gsc.js`) só busca Search Analytics. Por isso, neste post não verifiquei em que estado está agora o relatório de Core Web Vitals deste blog. Como existe o fallback do origin group, também não posso concluir "No data available" só porque o tráfego é pequeno. Não vou saber até abrir o relatório.

## Até onde vai o que o Google diz sobre ranking

Se os dados field são filtrados assim, a próxima pergunta é quanto esses dados pesam no ranking da busca. Este é o tema em que o exagero gruda com mais facilidade, então cito o texto original da [documentação de page experience](https://developers.google.com/search/docs/appearance/page-experience) do Google Search Central tal como está. O documento está em formato de FAQ e, primeiro, responde assim à pergunta sobre se existe um único sinal de page experience usado no ranking.

> There is no single signal. Our core ranking systems look at a variety of signals that align with overall page experience.

Quer dizer que não existe um sinal único como uma pontuação de page experience. A pergunta seguinte é quais aspectos de page experience são usados no ranking, e a resposta é esta.

> Core Web Vitals are used by our ranking systems. We recommend site owners achieve good Core Web Vitals for success with Search and to ensure a great user experience generally. Keep in mind that getting good results in reports like Search Console's Core Web Vitals report or third-party tools doesn't guarantee that your pages will rank at the top of Google Search results; there's more to great page experience than Core Web Vitals scores alone.

O que o original estabelece é que as Core Web Vitals são usadas pelos sistemas de ranking, e logo em seguida traça um limite: bons resultados nos relatórios não garantem as primeiras posições. A mesma resposta continua dizendo que buscar uma pontuação perfeita só por SEO pode não ser um bom uso do tempo, e afirma que os aspectos de page experience além das Core Web Vitals não melhoram o ranking diretamente.

O que considero mais importante é **o que este documento não diz**. Em nenhum lugar aparece qual é o peso, se o efeito surge no momento em que um limite é ultrapassado, ou quanto o ranking se move ao passar de needs improvement para good. Então a frase "melhoramos as Core Web Vitals e subimos no ranking" não pode ser sustentada pela documentação oficial, e menos ainda neste blog. Como vimos na seção anterior, este blog nem conseguiu confirmar os próprios valores field.

## As respostas do servidor vistas pelo rastreamento

O lugar em que a documentação oficial liga claramente desempenho e busca é, na verdade, o rastreamento. Mesmo assim, o assunto é taxa de rastreamento e indexação, não ranking.

O [guia de crawl budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget) do Google começa restringindo o público. Sites com 1 milhão ou mais de páginas únicas que mudam cerca de uma vez por semana, com 10 mil ou mais que mudam diariamente, ou com muitas URLs que o Search Console classifica como "Detectada, mas não indexada no momento". O texto original diz diretamente que sites sem muitas páginas que mudam rápido, ou cujas páginas são rastreadas no dia da publicação, não precisam ler o guia. Este blog, com 186 URLs no sitemap em 16 de setembro de 2026, não é o público.

Ainda assim, vale conhecer a regra de capacidade de rastreamento do guia. Quando o tempo de resposta fica estável ou melhora, o limite sobe; quando fica lento ou o site envia 5xx ou 429, ele desce. A [documentação de códigos de status HTTP](https://developers.google.com/search/docs/crawling-indexing/http-network-errors) descreve as consequências de forma mais concreta. 5xx e 429 desaceleram temporariamente o rastreador. URLs já indexadas são mantidas, mas, se isso continuar, acabam saindo do índice. 4xx diferentes de 429 não afetam a taxa de rastreamento. Aqui é preciso separar os caminhos com precisão. 5xx prolongado é um caminho para **sair do índice**; não encontrei nenhuma frase oficial dizendo que seja um sinal que derruba o ranking.

O maior incidente de servidor deste blog foi o JIHOON-BLOG-2, em que uma chamada à GA Data API ficou pendurada por mais de 65 segundos. A resposta foi 200. Hoje o único que chama `src/lib/google-analytics.ts` é a rota `/api/analytics`, mas em agosto era diferente. No JIHOON-BLOG-8, quando as chamadas ao GA voltaram a travar, a transaction do último evento foi a página inicial (`GET /`), e dos 10 eventos que ainda dá para consultar, 2 são `GET /` e 8 têm a transaction vazia. As chamadas ao GA também travaram em requisições à página inicial, que está aberta ao rastreamento. Mas não sei se isso afetou o rastreamento, porque não abri o relatório Crawl Stats enquanto escrevia este post. **Não conecto o que não confirmei.**

## A diferença de cliques entre page e query

Agora vamos mudar de direção e olhar os dados de busca que o Search Console devolve. São os dados que baixo toda semana em CSV e que realmente uso para corrigir títulos e descrições.

![Em dois períodos de 28 dias coletados pela API do Search Console, o total de cliques da dimensão page é 47, enquanto o da dimensão query fica em apenas 8 e 9](1.png?w=720)

Somando por dimensão o CSV que baixei em 11 de setembro de 2026, os números não batem. Nos últimos 28 dias (de 12 de agosto a 8 de setembro), o total de cliques da dimensão page é 47, enquanto o da dimensão query é 8. Os 28 dias anteriores (de 15 de julho a 11 de agosto) também dão 47 e 9. Como a diferença tem o mesmo tamanho nos dois períodos, não é um acaso isolado, é estrutural.

A primeira suspeita foi um limite de linhas. A [documentação da Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) diz que não garante todas as linhas e retorna as principais. Mas meu script faz a requisição com `rowLimit: 1000`, e as linhas de query que voltaram foram 128 e 66. **O limite não foi atingido, então o corte não é a causa.**

Sobram duas explicações, e ambas estão na [ajuda do Search Console](https://support.google.com/webmasters/answer/17010575). Uma é a anonimização. Consultas pesquisadas muito raramente são excluídas da tabela de consultas por privacidade e só entram nos totais gerais. A outra é a [unidade de agregação](https://support.google.com/webmasters/answer/7576553). A dimensão query conta por propriedade. Como no exemplo da [explicação da agregação por propriedade](https://support.google.com/webmasters/answer/17011364), se um usuário clica em sequência em dois links do mesmo site, é 1 clique. A dimensão page conta por URL, então o mesmo comportamento vira 2 cliques.

Portanto, esses dois totais nunca foram números construídos com as mesmas regras. Deixo registrada uma tentação. Nos últimos 28 dias, seis consultas tiveram cliques, e cinco delas eram consultas comparativas do Biome, como "eslint vs biome" e "biome vs prettier". Somando os cliques dessas cinco consultas dá 6, e por coincidência os cliques de page da URL em coreano do post do Biome também são 6. Parece encaixar perfeitamente, mas **não dá para ligar dois números com regras de agregação diferentes só porque são iguais.** Os dados de query devem ser lidos não como uma decomposição do tráfego, e sim como uma amostra que deixa entrever a intenção de busca.

## O ranking caiu, mas os cliques aumentaram

Há um caso em que tomei de fato uma decisão com esses dados de busca. [O Biome pode substituir o ESLint e o Prettier?](/241201) é um post que escrevi em dezembro de 2024 e que tinha visivelmente poucos cliques em relação às impressões. Então, em 11 de junho de 2026, adicionei um `seoTitle` começando com "Biome vs ESLint vs Prettier", ajustado ao formato das consultas reais.

Na comparação de 28 dias coletada depois da troca de título, os números deste post se moveram assim. As impressões caíram 11%, de 230 para 204, e a posição média recuou de 8,9 para 11,6. Olhando só essas duas métricas, o post piorou. Mas os cliques subiram de 2 para 13, e o CTR foi de 0,87% para 6,37%.

Estes quatro números são os valores que consultei na época. `.gsc-data/` é sobrescrito a cada coleta, então aquele CSV não está mais no repositório e também não registrei a data exata da coleta. O que dá para confirmar é só que esses números já aparecem no snapshot do rascunho de 16 de agosto incluído em um commit de 18 de agosto.

![Na comparação de 28 dias do Search Console para o post do Biome, as impressões e a posição média pioraram, mas os cliques e a taxa de cliques subiram muito](2.png?w=720)

O honesto é baixar a empolgação primeiro. Esses números não provam o efeito da troca de título. A posição média na dimensão page é a média da posição mais alta daquela página registrada em cada impressão, então basta sumirem impressões que apareciam no topo mas que ninguém clicava para a posição piorar e o CTR subir. A composição das consultas e a sazonalidade também mudam de um período para outro. O aumento absoluto de cliques foi de 11 em 28 dias. Como múltiplo é grande; em termos absolutos, é pequeno.

Ainda assim, algo fica. Se o ranking for o resultado, é um post que precisa de ajuste; se o tráfego real for o resultado, é um post que melhorou. **Qual métrica se escolhe como resultado muda a conclusão sobre os mesmos dados.** Se eu tivesse olhado só a queda no ranking, teria desmontado de novo um post que tinha acabado de começar a melhorar.

### Os números consultados de novo em setembro

Enquanto escrevia este post, verifiquei de novo o estado atual do mesmo post. No CSV coletado em 11 de setembro de 2026, a URL em coreano `/241201` fica assim.

| Período | Impressões | Cliques | CTR | Posição média |
|---|---|---|---|---|
| 28 dias anteriores (15 de julho a 11 de agosto) | 211 | 11 | 5,21% | 14,5 |
| Últimos 28 dias (12 de agosto a 8 de setembro) | 185 | 6 | 3,24% | 20,8 |

Colocando em ordem de coleta os dois valores anteriores (8,9 e 11,6) e os dois deste CSV (14,5 e 20,8), a posição média foi recuando durante todo o verão. Os cliques foram 13, depois 11 e depois 6. O período recente da primeira comparação e o período anterior da coleta de setembro podem se sobrepor, então é difícil ler a passagem de 13 para 11 como queda, mas o 6 do período recente é claramente um número que desceu. A história de "o ranking caiu, mas os cliques aumentaram" estava mais nítida na primeira comparação, e o período seguinte a abalou.

Mesmo assim, a conclusão da seção anterior não se inverte. 6 cliques e CTR de 3,24% ainda são mais altos que o período anterior da primeira comparação (2 cliques, 0,87%). Mas uma lição se somou. Não só a escolha da métrica, mas **também a escolha do período de comparação muda a conclusão.** Se uma história é fechada com uma única comparação de 28 dias, os 28 dias seguintes a quebram.

E o período recente passa a incluir as cinco traduções deste post que commitei em 17 de agosto. A versão em inglês, `/en/241201`, teve 84 impressões e 0 cliques, e a versão em chinês, 12 impressões e 1 clique. Ainda não sei se as traduções dividiram as impressões com a URL em coreano, nem por que a posição média continua recuando. Até confirmar, deixo como não resolvido.

## Mudanças sobrepostas em um mesmo período

Não atribuir causalidade no post do Biome não é só cautela. Neste blog existem condições reais em que a causalidade não pode ser isolada.

Só no dia 11 de setembro de 2026 entraram seis mudanças relacionadas à busca, entre elas a restauração do hreflang, a reescrita de 48 títulos, a correção das imagens OG e o noindex em 126 categorias, e até o dia 16 vieram outra correção de hreflang, a adoção do IndexNow, a reescrita de títulos e descrições que eram cortados e a publicação de um post novo. A reescrita deste post também cai nesse período.

Em 11 de setembro deixei um documento de linha de base. Nos últimos 28 dias até aquele momento, as páginas de posts em inglês tinham 892 impressões e 0 cliques, e decidi ver no início de outubro se esse número se move. Mas, mesmo que os cliques em inglês aumentem em outubro, não vou conseguir escolher uma única causa. Pode ser a correção do hreflang, a reescrita de títulos de 11 de setembro ou a correção dos cortes de 16 de setembro. Além disso, os dados da linha de base já trazem um contraexemplo. O zh-CN, que tinha só um título cortado, teve 7 cliques, o maior número entre as locales que não são coreano, o que torna difícil ver o corte de títulos como causa. **Por isso decidi que, na comparação de outubro, vou ler só a direção e não afirmar contribuições individuais.**

## Anotar primeiro a amostra e as regras de cada número

Se os três primeiros posts mostraram as falhas silenciosas do servidor, o tempo que os visitantes esperaram e o lugar onde essa espera surgiu, os dados deste post são o que resta dessa experiência depois que ela sai do navegador e é filtrada pelas regras de outra pessoa. Por isso a conclusão também é um pouco mais defensiva. Os field data encolhem a cada etapa, com regras diferentes, ao passar por RUM, CrUX, PSI e Search Console, e em um site pequeno como este blog podem não sobreviver até o fim. O que o Google diz sobre ranking para em afirmar que as Core Web Vitals são usadas, e a documentação de rastreamento para em afirmar que respostas lentas e 5xx afetam o rastreamento e a indexação. Os totais de page e query do Search Console são números contados com regras diferentes, então não se somam. **Anotar primeiro, para cada número, quem foi contado e com quais regras, e parar onde o texto oficial para.** Transformar observação em julgamento foi, na maior parte, essas duas coisas.

Eu também pretendo comparar a linha de base com o novo CSV em outubro lendo só a direção. Se você acompanhou esta série e da próxima vez precisar tomar uma decisão com base em um número de um dashboard, recomendo anotar primeiro, em uma linha, quem esse número contou e com quais regras. E consulte essa conclusão de novo um mês depois, com outro período.

:::ref
- [docs] [web.dev, Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- [docs] [Google Search Central, Understanding Core Web Vitals and Google search results](https://developers.google.com/search/docs/appearance/core-web-vitals)
:::
