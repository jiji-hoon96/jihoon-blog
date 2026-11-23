---
emoji: 🔎
title: 'Seguindo 42 MB no painel Network'
seoTitle: 'Chrome DevTools Network: rastreando 42 MB com Initiator'
date: '2026-11-20'
categories: frontend desempenho DevTools
description: 'A página inicial do Toss Bank baixa 42 MB. Com Size e Initiator, encontrei 27 MB de PNGs originais baixados para ler um pixel da cor de fundo dos cartões.'
keywords: 'Chrome DevTools painel Network, como usar a aba Network, Initiator stack assíncrona, Disable cache primeira visita, imagem loading lazy, Resource Timing transferSize, canvas getImageData CORS, otimização de transferência de imagens'
locale: pt-BR
translationOf: '261120'
sourceHash: d042953f2b5f612a21f4d2c9e416a9ddd7b509eafa8de9fa080916dede2a3734
---
Neste artigo, vou rastrear até o fim a quantidade de dados transferida por uma página usando o painel Network do Chrome DevTools.

Este artigo é para quem já abriu a aba Network para procurar uma API com falha, mas não sabe por onde começar para descobrir por que uma página é pesada. Seguindo a linha de resumo na parte inferior, a coluna Size e o Initiator, vou identificar até a linha de código a origem dos 42 MB da página inicial do Toss Bank. Nesse processo, também vou verificar uma requisição que `loading="lazy"` não conseguiu impedir e um caso em que o valor medido com Disable cache ativado difere do de uma primeira visita.

No trabalho, abro o painel Network todos os dias para analisar o desempenho das telas, mas, quando o abro, acabo olhando sempre os mesmos itens. Por isso, decidi aplicar os painéis do DevTools, um por um, a um serviço real e examiná-los até o fim. Para começar, escolhi a página inicial do Toss Bank (`www.tossbank.com`), que qualquer pessoa pode acessar sem fazer login. Não tenho como saber por que o Toss Bank fez essas escolhas, então não vou julgá-las. Este artigo trata dos números exibidos pelo painel e de como eles surgem.

## Linha de resumo na parte inferior

Fiz as medições na faixa das 18h de 20 de novembro de 2026, iniciando o Chrome 157.0.8103.80 em modo headless. Abri a página com um perfil novo a cada vez, em uma janela de 1600x1000, e contei o que foi baixado durante 15 segundos, sem limitação de rede. Repeti a medição três vezes e obtive os mesmos valores até a segunda casa decimal de MB. A página inicial do Toss Bank muda conforme as publicações e o feed; pela manhã do mesmo dia, um dos cartões era diferente e o total ficou 2 MB maior. Por isso, criei uma demonstração que reproduz a mesma estrutura em [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/image-color-sampling) e também a medi mais adiante no artigo.

Depois de abrir o painel Network e atualizar a página, o primeiro lugar para olhar é a linha mais abaixo. Na página inicial do Toss Bank, ela mostrou 156 requisições, `42,202 kB transferred` e `55,603 kB resources`. A [referência do painel Network](https://developer.chrome.com/docs/devtools/network/reference) explica que essa linha mostra a soma dos tamanhos transferidos e descompactados. transferred é a quantidade que realmente passou pela rede, incluindo os cabeçalhos da resposta e o corpo compactado. resources é o tamanho descompactado; respostas carregadas do cache também são somadas com seu tamanho integral, mesmo que 0 bytes tenham passado pela rede. Por isso, resources é maior.

Ao aplicar um filtro, essa linha passa a mostrar dois valores: “resultado do filtro / total”. Ao clicar em Img no filtro de tipo, os valores ficam `57 / 156 requests` e `40,450 kB / 42,202 kB transferred`. Imagens, que representam 37% das requisições, respondem por 96% do volume transferido. Por isso, começo por elas. Com o mesmo filtro, resources é 50,862 kB, pouco mais de 10 MB acima de transferred. Como PNG não é transferido com compactação, essa diferença vem quase toda de imagens carregadas do cache. Esse número vai aparecer de novo quando eu tratar de Disable cache.

![Na tela Network da página inicial do Toss Bank, com o filtro Img ativado e Size em ordem decrescente, o banner no topo aparece como solicitado por Parser, e a miniatura do cartão logo abaixo, por Script. 1 é o filtro Img, 2 é o cabeçalho da coluna Size em ordem decrescente, 3 são as duas linhas de Size da primeira linha tossbank-banner-web-Financial-sector.png, com 5,590 kB e 5,587 kB. 4 é o Initiator da mesma linha, (index):5 e Parser; 5 é o Initiator da segunda linha, bankfeed-gold-decline-cover.png, index-8989962b29fa3f03.js:1 e Script. 6 são as duas linhas de Size de logo-bank-mono-white.svg, com 1,616 kB e 2,140 kB. 7 é a linha inferior com 40,450 kB / 42,202 kB transferred; 8 é 50,862 kB / 55,603 kB resources](1.png?w=720)

## As duas linhas da coluna Size

Com o filtro ativo, clique no cabeçalho da coluna Size para ordenar dos maiores aos menores. Por padrão, a coluna Size tem uma linha. Clique no ícone de engrenagem na extremidade direita da barra de ferramentas do painel Network, acima da linha dos filtros, e ative Big request rows para que ela passe a ter duas linhas. Segundo a referência, a linha superior mostra o tamanho combinado dos cabeçalhos e do corpo enviados pelo servidor; a inferior, o tamanho descompactado.

O banner superior, `tossbank-banner-web-Financial-sector.png`, tem 5,590 kB na linha de cima e 5,587 kB na de baixo, quase o mesmo valor. PNG é um formato já compactado, então o servidor não compactou a resposta novamente, e não havia `content-encoding` nos cabeçalhos da resposta. Os 3.7 kB restantes não podem ser explicados apenas pelos cabeçalhos. Essa resposta veio por HTTP/2, que divide o corpo em quadros (com tamanho máximo padrão de 16 KB) e adiciona um cabeçalho de 9 bytes a cada quadro. O Chromium também contabiliza esses cabeçalhos de quadro entre os bytes recebidos ([`spdy_session.cc`](https://github.com/chromium/chromium/blob/main/net/spdy/spdy_session.cc)). Dividindo 5.6 MB em quadros de 16 KB, temos pouco mais de 340 quadros; só os cabeçalhos dos quadros somam cerca de 3 kB. Ao acrescentar os cabeçalhos da resposta, a conta fecha. Já o logo `logo-bank-mono-white.svg` mostra uma diferença: 1,616 kB na linha de cima e 2,140 kB na de baixo. Como SVG é texto, foi transferido compactado com gzip. O logo tem 2 MB porque contém duas imagens PNG em base64.

No topo da lista ordenada estão o banner superior e as miniaturas dos cartões do feed. Os três banners grandes têm originais de 5120x2800 e são exibidos na tela em 1600x1000. As miniaturas dos cartões que começam com `bankfeed-` têm originais de 3200x2160 e são exibidas em 302x170. Mesmo considerando uma tela Retina, que renderiza cada pixel CSS como dois pixels físicos (proporção de pixels do dispositivo 2), o banner recebe 5,120 px para uma largura necessária de 3,200 px, e o cartão, 3,200 px para 604 px. Confirmei as dimensões originais lendo `naturalWidth` na página.

Também conferi o valor superior de Size com outra ferramenta. A quantidade transferida neste artigo é a soma de `encodedDataLength`, que o Chrome DevTools Protocol (CDP) fornece para cada requisição, e bate com a linha inferior até o byte. Também é possível ler esses dados com JavaScript na página. Ao consultar a maior miniatura de cartão com `performance.getEntriesByType('resource')`, `transferSize` aparece 300 bytes acima de `encodedBodySize`. A [especificação Resource Timing](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-transfersize) determina que se some um valor constante de 300 ao tamanho do corpo para não revelar o tamanho real dos cabeçalhos. Vi esse valor na imagem de outra origem porque a requisição usou CORS, e o servidor permitiu ambos, `access-control-allow-origin` e `timing-allow-origin`, com `*`.

Olhando apenas para os tamanhos, parece uma história comum de otimização de imagens. Mas, ao observar também a coluna Initiator, vemos que as miniaturas dos cartões foram solicitadas por um script, e não pelo `<img>` exibido na tela.

## Initiator e pilha assíncrona

A coluna Initiator mostra quem criou a requisição. Os valores listados na referência são Parser, Redirect, Script, Early Hints e Other. Na figura 1, o Initiator do banner é `(index):5` e Parser. O parser que estava lendo o HTML encontrou o `<img>` e fez a requisição. Já a miniatura do cartão `bankfeed-gold-decline-cover.png` mostra `index-8989962b29fa3f03.js:1` e Script. A requisição foi feita durante a execução de um script.

Se o cartão exibido na tela usa `<img>`, por que aparece Script? Clique na linha e abra a aba Initiator na tela de detalhes para ver a pilha de chamadas que criou a requisição.

![Na aba Initiator da mesma requisição, a pilha de chamadas aparece dividida em três limites assíncronos: Image, setTimeout e await in fetch. 1 é a aba Initiator; 2 é o primeiro grupo, Image, com T.o, T e dois (anonymous), todos em index-8989962b29fa3f03.js. 3 é o grupo setTimeout, com main e batch, setData e fetch do bundle _app; 4 é o grupo await in fetch, com H, onSubscribe e subscribe](2.png?w=720)

Os itens em negrito `Image`, `setTimeout` e `await in fetch` são limites assíncronos. Os frames abaixo de cada limite são as pilhas do instante em que aquela tarefa assíncrona foi agendada. Por isso, lendo de baixo para cima, temos a ordem cronológica.

1. Uma função chamada `fetch` espera os dados com `await` e depois retoma a execução (4). Esse nome não é o `window.fetch` do navegador, mas o nome de uma função dentro do bundle. `onSubscribe` e `subscribe` abaixo dela são quem chamou essa função.
2. A função altera o estado com `setData` e, passando por `batch`, agenda um `setTimeout` (3).
3. O temporizador dispara; depois de passar por frames `framework-*.js` que parecem ser internos do React, a função `T` define o `src` da imagem (2).

O limite superior, `Image`, marca o instante em que o script definiu `src` no elemento de imagem. Como o navegador emite a requisição separadamente logo depois, Initiator mostra a pilha daquele instante. Só esse nome não permite distinguir entre um `<img>` no DOM e um `new Image()`. Para saber qual é o caso, é preciso abrir o código.

Clique em `index-8989962b29fa3f03.js:1` na pilha para abrir aquela localização no painel Sources. Por padrão, Sources formata o arquivo descompactado (pretty print), então dá para ler até um bundle que esteja em uma única linha. O hash do bundle muda a cada publicação, mas seguindo o link de Initiator chegamos ao arquivo daquela versão. Baixei o mesmo arquivo e o li: uma função de callback que parece ser o effect do componente do cartão chama `T` usando o endereço da miniatura. A função `T` faz quatro coisas:

1. Cria um `new Image()`, define `crossOrigin` como `"anonymous"` e insere o endereço do original da miniatura do cartão.
2. Quando o carregamento termina, cria um canvas do mesmo tamanho da imagem.
3. Desenha a imagem no canvas.
4. Com `getImageData`, lê um pixel 20 px a partir da borda direita e 20 px abaixo do topo, e usa essa cor como fundo do cartão.

`T` preenche o fundo do cartão com a cor das bordas da miniatura. Para ler aquele único pixel, baixa o arquivo PNG original inteiro. Na primeira tela, esse caminho baixou 24 miniaturas de cartão, totalizando 27.14 MB. Isso corresponde a dois terços dos 40.45 MB transferidos em imagens.

O processo fica assim em uma figura. Há dois caminhos que solicitam o mesmo original.

![Dois caminhos que solicitam o mesmo PNG original. O img do cartão com loading lazy faz uma requisição com Initiator Parser quando se aproxima da tela. O new Image() do script solicita todas as 24 imagens quando os dados do feed chegam, com Initiator Script, e desenha cada original recebido em um canvas do mesmo tamanho antes de ler 1 pixel com getImageData. Para um original de 3200x2160, o canvas tem cerca de 27.6 MB. A segunda requisição é 0 B quando o cache está ativado e é baixada novamente com Disable cache](3.png?w=720)

O lugar para ver essa distinção é Initiator no DevTools. Ela não aparece no Resource Timing da página. A miniatura baixada com `new Image()` também aparece com `initiatorType` igual a `"img"`. A especificação classifica as requisições geradas ao processar o `src` de um elemento img como `img`, e `new Image()` também cria um elemento img.

### Canvas do tamanho original e CORS

`T` define `width` e `height` do canvas com as dimensões originais da imagem. De acordo com a [especificação HTML](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element), esses dois atributos determinam o tamanho do bitmap do canvas. Portanto, uma imagem de 3200x2160 cria um bitmap com 6.91 milhões de pixels. Com 4 bytes RGBA por pixel, são cerca de 27.6 MB. Como `drawImage` também precisa descompactar o PNG original, há outro bitmap decodificado do mesmo tamanho, e esse trabalho se repete para cada miniatura. O canvas é uma variável local dentro da função e existe por pouco tempo, até o GC liberá-lo. Esses valores foram calculados. Tentei medi-los pela memória do processo, mas os valores se distribuíam entre os processos de renderização e GPU, variavam a cada execução e não me permitiam identificar a diferença entre as variantes.

`crossOrigin="anonymous"` é necessário por causa de `getImageData`. A imagem vem de `static.toss.im`, uma origem diferente da página. A [especificação HTML](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements) impede que se leia, sem permissão, um canvas no qual foi desenhada uma imagem de outra origem e determina que `getImageData` lance `SecurityError` nesse estado. Com `crossOrigin`, a requisição usa CORS e, se o servidor permitir, o canvas pode ser lido. Essa permissão pode ser confirmada no cabeçalho de resposta `access-control-allow-origin: *` da aba Headers.

## Requisições de script fora do lazy

O `<img>` do cartão tem `loading="lazy"`. Mesmo assim, 24 imagens são baixadas na primeira tela porque o lazy só adia a requisição do próprio `<img>`. A [especificação HTML](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes) define lazy como um estado que adia o carregamento até que certas condições sejam atendidas. Se um script solicita o mesmo endereço separadamente, essa requisição não tem relação com lazy.

Veja quanto o carregamento foi antecipado. Os 24 elementos `<img>` dos cartões com lazy estão entre 760 px e 3,411 px de posição no documento. Após 15 segundos, haviam sido carregados os 12 que chegavam até 1,896 px; os 12 abaixo, a partir de 2,275 px, não haviam carregado. Segundo o artigo sobre carregamento lazy do [web.dev](https://web.dev/articles/browser-level-image-lazy-loading), quando o Chrome estima que a conexão é 4G, ele baixa antecipadamente imagens lazy a até 1,250 px da viewport. Somando 1,250 px à altura da janela, 1,000 px, chegamos a 2,250 px, então o limite observado corresponde a esse critério. Os 12 cartões abaixo ainda não deveriam ser baixados como `<img>`, mas o script baixou primeiro 17.20 MB. A maior miniatura, com 5,376 kB, também está nesse grupo, na posição 2,654 px do documento.

Essa proporção aumenta em uma tela de celular. Abri a mesma página com o user agent do iPhone e uma tela de 390x844; o total transferido foi praticamente igual, 42.17 MB. Como os cartões ficam um por linha, o número de cartões fora do limite de altura da janela mais 1,250 px aumentou para 19, totalizando 23.88 MB.

Os banners superiores baixam imagens que não aparecem na tela por outro motivo, diferente de lazy. Na tela de celular, foram baixados quatro banners para desktop, totalizando 10.27 MB; no desktop, quatro banners para celular, totalizando 1.42 MB. Ambos os grupos ficam em áreas com `display: none` e contêm elementos `<img>` sem `loading`. Como a especificação HTML determina que as imagens sejam baixadas imediatamente por padrão, até os `<img>` ocultos são baixados.

## Disable cache e requisições duplicadas

Até aqui, fiz as medições com Disable cache desativado. A referência do painel Network chama a seção que explica essa caixa de seleção “Emulate a first-time visitor”. O painel Performance do Chrome 157 também diz ao lado dessa opção que ela simula uma experiência de rede semelhante à de uma primeira visita. Por isso, é comum ativar essa caixa de seleção ao medir uma primeira visita. Fiz isso e medi a página inicial do Toss Bank novamente.

![Com Disable cache ativado, a mesma miniatura é baixada duas vezes, por Parser e Script, e o volume transferido aumenta para 52 MB. 1 é Disable cache marcado; 2 é bankfeed-ipo-reorganization-cover.png, que aparece em duas linhas: a superior tem Initiator (index):5 Parser, a inferior tem index-8989962b29fa3f03.js:1 Script, e ambas mostram 1,625 kB. 3 é a linha inferior com 50,391 kB / 52,148 kB transferred](4.png?w=720)

O volume transferido subiu de 42.20 MB para 52.15 MB, um aumento de 9.95 MB. Desse total, 9.94 MB correspondem aos 12 elementos `<img>` dos cartões que estavam perto da tela e foram carregados. As outras sete requisições eram pequenos pedidos de preflight, não imagens. Na primeira visita com o cache ativado, esses 12 arquivos totalizaram 0 bytes. O script já havia baixado os mesmos arquivos, e as requisições posteriores dos `<img>` os reutilizaram. Com Disable cache ativado, o mesmo arquivo é baixado mais uma vez. Na figura 4, são as linhas em que o mesmo nome de arquivo aparece duas vezes, uma com Parser e outra com Script como Initiator. É também por causa desses 12 arquivos que, na linha de resumo inferior, resources era pouco mais de 10 MB maior do que transferred.

Essa medição não permitiu confirmar qual cache reutilizou os arquivos. Um dos 12 aparecia como vindo do cache de disco nas informações da resposta; os outros 11 tinham 0 bytes sem indicação de cache. A resposta tinha `cache-control: max-age=86400` e nenhum cabeçalho `Vary`. As requisições CORS (`crossOrigin`) e as requisições comuns de `<img>` têm modos de credenciais diferentes. O [`resource.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/loader/fetch/resource.cc), que trata do cache de memória do Blink, diz que uma requisição é baixada novamente se o modo de credenciais for diferente do da requisição anterior. Como exemplo, cita o caso em que o servidor retorna `Access-Control-Allow-Origin: *` e se misturam requisições CORS e sem CORS. Por outro lado, a opção de separar o cache HTTP por credenciais (`kSplitCacheByIncludeCredentials`) está desativada por padrão em [`net/base/features.cc`](https://github.com/chromium/chromium/blob/main/net/base/features.cc). Por isso, acredito que houve reutilização pelo cache HTTP, mas não confirmei isso com a medição.

Uma primeira visita é feita por alguém com o cache vazio, não por alguém sem cache. Os arquivos baixados pela primeira vez são reutilizados imediatamente na própria página. Disable cache também impede essa reutilização; portanto, se uma página solicita o mesmo arquivo duas vezes, a medição com essa opção ativada resulta em um valor maior do que o de uma primeira visita. Para medir uma primeira visita nessa página, limpe o cache e atualize com a caixa de seleção desativada. Clique com o botão direito na lista de requisições do painel Network para encontrar Clear browser cache. Confirmei com o comando CDP equivalente: depois de abrir uma vez, limpar o cache e abrir novamente, o total foi 42.20 MB, igual ao da primeira abertura. Ao abrir novamente sem limpar, foi 0.16 MB.

## Medir a mesma estrutura com uma demonstração

A página inicial do Toss Bank continuará mudando depois da publicação deste artigo. Por isso, recriei a mesma estrutura usando materiais públicos. Ela baixa 24 imagens PNG de cartões de 3200x2160 de outra origem e coloca um `<img loading="lazy">` em cada cartão. Só o método de definir a cor de fundo do cartão muda entre três variantes. O código que lê a cor é este:

```js
async function sampleColor(src, x, y) {
  const img = await new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const [r, g, b] = ctx.getImageData(img.width - x, y, 1, 1).data;
  return { r, g, b };
}
```

- **Ler do original**: a estrutura é igual à do Toss Bank. Chama `sampleColor` com o original do cartão.
- **Ler da miniatura**: chama a mesma função com uma miniatura de 64x43.
- **Cor pré-calculada**: recebe a cor em JSON e a usa.

Nas mesmas condições (janela de 1600x1000, perfil novo, 3 execuções), o volume transferido nas três variantes foi 16.80 MB, 8.03 MB e 7.94 MB. Ler do original dobra o volume ao baixar também os 12 cartões distantes da tela. Ler da miniatura adiciona apenas os 98 kB de transferência das 24 miniaturas de 64x43. Com Disable cache ativado, somente a variante que lê do original subiu para 24.73 MB. A variante da cor pré-calculada permaneceu em 7.94 MB porque não solicita o mesmo arquivo duas vezes. No painel Network, o Initiator também foi igual ao do Toss Bank: as 24 requisições para ler cores aparecem como Script, e as dos elementos `<img>` dos cartões, como Parser.

## Da linha inferior até uma linha de código

Dos 42.20 MB da primeira tela do Toss Bank, 40.45 MB eram imagens. Desses, 27.14 MB eram 24 PNGs originais baixados pelo script para ler um pixel da cor de fundo dos cartões. `loading="lazy"` adiou apenas as requisições dos `<img>` dos cartões; por isso, os 12 cartões distantes da tela, com 17.20 MB, também foram baixados na primeira tela. Se medir com Disable cache ativado, os mesmos arquivos são baixados duas vezes e o total chega a 52.15 MB.

Para chegar a essa conclusão, usei poucas funções. Conferi o volume transferido total na linha de resumo inferior, filtrei por tipo para identificar o que era mais pesado, ordenei Size para inspecionar os maiores primeiro, separei os responsáveis pelas requisições com a coluna Initiator e, pela pilha assíncrona da aba Initiator, cheguei ao código. A coluna Size mostra que as imagens são grandes. Para descobrir por que foram baixadas, é preciso chegar até Initiator.

No seu serviço, recomendo ativar o filtro Img e ordenar por Size, ou inserir `larger-than:500k` na caixa de filtro para deixar somente as respostas grandes; depois, confira se o Initiator das linhas no topo é Parser ou Script. Se for Script, `loading="lazy"` e `srcset` não se aplicam a essa requisição. Se precisar ler uma cor da imagem, como medi na demonstração, pré-calcular a cor e enviá-la como dado ou lê-la de uma miniatura pequena já reduz pela metade o volume baixado. E, ao medir uma primeira visita, confira primeiro se a página solicita o mesmo arquivo duas vezes. Se solicitar, abra um navegador com o cache limpo em vez de ativar Disable cache.

Este é o primeiro artigo de uma série em que vou aplicar os painéis do DevTools, um por um, a serviços reais. No próximo artigo, vou usar Waterfall e a aba Timing do mesmo painel Network para ver onde o tempo de uma requisição é gasto.

:::ref
- [docs] [MDN, Permitir o uso de imagens e canvas entre origens](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [docs] [Chrome DevTools, Inspecionar atividade de rede](https://developer.chrome.com/docs/devtools/network)
:::