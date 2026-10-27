---
emoji: 🔤
title: 'Subsets de fontes web coreanas e next/font'
seoTitle: 'Fontes web coreanas: subsets, next/font e font-display'
date: '2026-10-19'
categories: frontend desempenho
description: 'Página coreana com quatro fontes medida em TTF, woff2, subsets, Google e next/font. Subsets cortam 17 MB para 0.6 MB; Google direto e preload, ~0.1 s.'
keywords: 'otimização de fontes web, fontes web coreanas, unicode-range, woff2, subset de fontes, fontes variáveis, next/font, font-display, auto-hospedar Google Fonts, particionamento de cache, Noto Sans KR'
locale: pt-BR
translationOf: '261019'
sourceHash: 1b0a9fd911ad78782c3081ebe2d0de561cc81a54fa27edf510ef1e8bcd5f29a2
---

Neste post, quero falar sobre como deixar mais leve a entrega de fontes web coreanas.

Este texto é para desenvolvedores frontend que mantêm páginas em coreano que dividem fontes entre corpo, títulos, código e citações. Meço quanto cada um dos métodos comuns para enxugar fontes web realmente ajuda e organizo por qual vale a pena começar.

Fontes coreanas têm tantos caracteres que um único peso vai de centenas de kB a alguns MB. Há várias formas de baixar menos, baixar mais cedo e evitar que a tela se mexa enquanto isso. Dá para trocar o formato do arquivo para woff2, dividir a fonte em subsets, carregá-la direto dos servidores do Google, usar `next/font` para buscar as fontes antecipadamente (preload) e ajustar a fonte de fallback, ou usar `font-display` para definir o que a tela mostra quando uma fonte chega atrasada.

Quanta diferença esses métodos fazem na prática? Vamos montar uma página que usa quatro fontes, publicá-la separadamente para cada método e medir quantos dados de fonte ela baixa, quantos segundos leva para baixar tudo e quanto o layout se desloca. Também vamos ver quais métodos cinco serviços coreanos usam. A demo e os scripts de medição estão em [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/web-fonts), e as páginas publicadas podem ser abertas diretamente em [hooninedev-web-fonts.netlify.app](https://hooninedev-web-fonts.netlify.app/full-d-google/).

## Uma página com quatro fontes

A página de teste é o corpo do [post sobre overlay-kit](/260921) deste blog, copiado como está, com blocos de código e citações. Escolhi um post real em vez de um exemplo curto porque o volume transferido de uma fonte coreana acompanha a variedade de caracteres usados na página. As fontes são divididas em quatro, como é comum em blogs técnicos.

![Fontes por parte da página de teste. Os títulos h1 e h2 são Noto Serif KR 700, o primeiro parágrafo é Inter 300 e Noto Sans KR 300, o corpo é Inter 400 e Noto Sans KR 400 com o negrito em 700, os subtítulos h3 são Inter 500 e Noto Sans KR 500, as citações são Inter itálico 400 com o coreano inclinado de forma sintética, e o código é JetBrains Mono 400 com os comentários em coreano em Noto Sans KR](1.png?w=720)

O corpo usa `font-family: 'Inter', 'Noto Sans KR'`. Letras latinas e dígitos são desenhados pela Inter e o coreano pela Noto Sans KR, em quatro pesos: 300, 400, 500 e 700. Os títulos usam uma única fonte serifada (no estilo Myeongjo), Noto Serif KR 700, e o código uma única fonte monoespaçada, JetBrains Mono 400. As citações são desenhadas com o itálico da Inter. A Noto Sans KR não tem itálico, então o navegador sintetiza a inclinação do coreano dentro das citações.

São quatro famílias e, contando pesos e estilos, onze fontes: cinco da Inter (300, 400, 500, 700 e itálico 400), quatro da Noto Sans KR e uma de cada uma das outras duas.

## Como o navegador baixa fontes

Uma fonte web não é baixada no momento em que o CSS é lido. Uma regra `@font-face` apenas declara o nome da fonte, o peso, a URL do arquivo e o intervalo de caracteres que o arquivo contém (`unicode-range`); o navegador pede o arquivo quando precisa daquela fonte para desenhar texto. A [especificação CSS Fonts Level 4](https://www.w3.org/TR/css-fonts-4/#font-face-loading) descreve esse carregamento sob demanda como intenção de design. A [seção unicode-range](https://www.w3.org/TR/css-fonts-4/#unicode-range-desc) da mesma especificação determina que a fonte não deve (must not) ser baixada nem usada para caracteres fora do intervalo.

Assim, se você divide uma fonte em arquivos por intervalo de caracteres e dá a cada arquivo um `unicode-range`, o navegador baixa só os arquivos que contêm caracteres usados na página. Um arquivo recortado para uma parte dos caracteres se chama subset, e neste post chamo cada um desses arquivos de fragmento. Abaixo está a regra de um fragmento usado neste experimento. Ele contém hangul frequente como `U+ac00` (가), `U+c774` (이) e `U+d558` (하), junto com o espaço e algumas letras latinas.

```css
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(nskr-119.woff2) format('woff2');
  unicode-range: U+20-22, U+27-2a, U+2c-38, U+3a-3b, U+3f, U+41-47, U+4a-4c, U+4f-5d, U+61-7b, U+7d, U+a1, U+ab, U+ae, U+b7, U+bb, U+bf, U+2013-2014, U+201c-201d, U+2122, U+ac00, U+ace0, U+ae30, U+b2e4, U+b85c, U+b9ac, U+c0ac, U+c2a4, U+c2dc, U+c774, U+c778, U+c9c0, U+d558;
}
```

![Como os subsets funcionam. Uma fonte é cortada em vários fragmentos, cada um com seu unicode-range, e a página baixa só os poucos fragmentos que contêm os caracteres que ela usa](2.png?w=720)

Em fontes coreanas essa diferença tem de ser grande. Só as sílabas hangul somam 11,172, e a Noto Sans KR, que também inclui hanja (caracteres chineses), contém 23,174 caracteres. Sem subsets, desenhar um único post significa baixar todos eles.

## As cinco páginas comparadas

Dos métodos acima, começo pelo formato e pelos subsets. Fiz cinco versões da mesma página mudando apenas a forma de entregar as fontes, e incluí uma que usa os fragmentos que o Google já dividiu. O corpo e as declarações `font-family` são idênticos nas cinco; só mudam o arquivo `fonts.css` e os arquivos de fonte para os quais ele aponta.

O ponto de partida é a CSS API do Google Fonts. A [documentação do Google Fonts](https://developers.google.com/fonts/docs/technical_considerations) diz que essa API devolve uma folha de estilo adaptada ao navegador que fez o pedido. Se o pedido vem de um cliente que ela não reconhece como navegador, como o curl, chega uma URL TTF por peso; se vem de um Chrome recente, chega uma resposta woff2 com um `@font-face` por fragmento. Se você extrai só as URLs TTF da primeira resposta e as fixa no CSS, qualquer navegador que acessar a página recebe TTF.

- **A. TTF**: baixei os arquivos TTF que a API entrega ao curl e os hospedei como estão. É o mesmo formato de fixar as URLs TTF.
- **B. woff2**: os TTFs de A, apenas convertidos para woff2. Sem subsets.
- **C. Fragmentos estáticos**: os TTFs de A cortados em fragmentos woff2 segundo os intervalos de caracteres que o Google usa para cada família. Cada peso é cortado separadamente.
- **D. Resposta do Google**: o CSS e os arquivos de fonte que a mesma API entrega a um Chrome recente, baixados e hospedados como estão. Cada fragmento é uma fonte variável que contém vários pesos.
- **D-range**: igual a D, mas em vez de listar os pesos no pedido à API como `wght@300;400;500;700`, pedi como intervalo, como `wght@300..700`.

A, B e C partem dos mesmos TTFs. De A para B só muda o formato e de B para C só os subsets, então dá para ver separadamente quanto cada um cortou. Para converter e cortar usei o fontTools, uma biblioteca Python para manipular arquivos de fonte. Só que os intervalos do Google não cobrem todos os caracteres que uma fonte contém. Na Noto Sans KR eles cobrem apenas 17,655 de 23,174 caracteres, e o que fica de fora é quase todo hanja de uso raro. Por isso C contém menos caracteres que B, mas todos os caracteres usados nesta página estão dentro dos intervalos das quatro famílias, então a quantidade baixada não é afetada.

As cinco versões ficaram em um mesmo site da Netlify, servidas pelo mesmo host via HTTP/2. D também é servida por esse site, e não pelos servidores do Google, então a origem dos arquivos não se mistura aos resultados. A diferença de carregar direto dos servidores do Google é medida à parte mais adiante. Todos os arquivos receberam `Cache-Control: public, max-age=31536000, immutable` para que a CDN (servidores de cache que guardam cópias dos arquivos perto do usuário) os sirva sem consultar de novo o servidor de origem.

## Transferência de fontes por variante

Primeiro, a transferência de fontes das cinco versões lado a lado.

| Variante | Arquivos de fonte | Transferência de fontes | Transferência de CSS |
|---|---|---|---|
| A. TTF | 11 | 17,200 kB | 0.4 kB |
| B. woff2 | 11 | 12,045 kB | 0.4 kB |
| C. Fragmentos estáticos | 58 | 679 kB | 107 kB |
| D. Resposta do Google | 28 | 579 kB | 107 kB |
| D-range | 28 | 579 kB | 43 kB |

De A para C, a transferência de fontes caiu 96%. Vamos passar pelo painel Network de cada variante para ver de onde esses números saem no DevTools.

### A, com TTF fixado

![Painel Network do DevTools para a variante A. 1 é o filtro Font, 2 é Disable cache, 3 são os nomes dos onze arquivos TTF, de serif-normal-700.ttf a nskr-normal-500.ttf, 4 é a coluna Size, em que serif tem 4,949 kB, os quatro nskr têm de 2,811 kB a 2,909 kB cada, e inter e mono ficam entre cerca de 50 kB e 150 kB. 5 é a coluna Content-Encoding, br em todos. 6 é 17,206 kB / 17,243 kB transferred na barra inferior e 7 é 40,490 kB / 40,571 kB resources](3.png?w=720)

Antes de ler o painel, ajuste três coisas. Ative o filtro Font (1) para que só fiquem as requisições de fontes, e ative Disable cache (2) para que cada recarga baixe tudo de novo, como um visitante novo. A coluna Content-Encoding não aparece por padrão, então clique com o botão direito no cabeçalho de uma coluna e ative Content-Encoding em Response headers.

Os nomes (3) terminam em `.ttf`, um arquivo por peso e estilo, onze no total. Os tamanhos (4) mostram cada arquivo de fonte coreana com 2.8 MB a 2.9 MB. Não importa quantos caracteres a página tenha, cada um desses arquivos contém todos os 23,174.

O maior arquivo não é a fonte do corpo, e sim a dos títulos. Só a Noto Serif KR 700 tem 4,949 kB, e 14 MB descompactada. O coreano que esta página desenha com ela se resume a 50 caracteres distintos em nove títulos (um h1 e oito h2).

A barra inferior mostra cada número em par. Em "17,206 kB / 17,243 kB transferred" (6), o primeiro valor soma só as requisições que passam pelo filtro e o segundo é a página inteira. transferred é o que passou pela rede, e resources (7) é o tamanho depois de descompactado. Os dois diferem em mais que o dobro porque o Content-Encoding (5) é `br`, ou seja, Brotli (um formato de compressão criado pelo Google). O TTF não tem compressão própria, então a Netlify o comprimiu com Brotli antes de enviar. O que o usuário espera é o transferred, então todos os números deste post são transferred.

### B, só o formato

Se você segue o conselho comum e converte TTF para woff2, quanto diminui? B é esse caso.

![O mesmo painel para a variante B. 1 são onze arquivos cujos nomes terminam em woff2, 2 é a coluna Size, em que serif tem 3,215 kB e os quatro nskr cerca de 2,000 kB cada. 3 é a coluna Content-Encoding vazia, 4 é 12,045 kB / 12,082 kB transferred na barra inferior e 5 é 12,037 kB / 12,118 kB resources](4.png?w=720)

17,200 kB viraram 12,045 kB, uma queda de 30%. Desta vez o Content-Encoding (3) está vazio, e transferred (4) e resources (5) são quase iguais. O woff2 já vem comprimido dentro do arquivo, então a Netlify não o comprimiu de novo.

Esses 30% não são medidos contra arquivos sem compressão. A também chegou comprimido com Brotli, então a diferença que sobra vem do método e do nível de compressão. Segundo a [especificação WOFF2 do W3C](https://www.w3.org/TR/WOFF2/), o woff2 primeiro transforma os dados dos glifos numa forma que comprime bem e depois os comprime com Brotli. Mas o Brotli que a Netlify aplicou aos TTFs usava um nível baixo. O Brotli permite escolher um nível de 0 a 11; quanto mais alto, menor o arquivo, mas mais demora a compressão. A Netlify enviou o mesmo TTF da Noto Sans KR 400 com 2,866 kB, quase o mesmo que comprimir no nível 4. Pré-comprimido no nível mais alto, 11, fica com 2,475 kB, e o woff2 com 2,053 kB. Quanto se economiza ao converter para woff2 depende de como o servidor comprime o TTF. O gstatic do Google envia o mesmo arquivo com gzip em 3,023 kB.

Se a base de comparação estiver errada, esse número fica inflado. Comparando B com os 40,490 kB de resources de A, parece uma redução de 70%, mas o usuário nunca baixou esse tamanho. Por outro lado, se o seu próprio servidor envia TTF sem compressão, o usuário baixa mesmo 40 MB. Em qual caso você está aparece na hora na coluna Content-Encoding.

Mesmo assim, B baixa 12 MB para desenhar um post. Cada arquivo contém todos os caracteres, então mudar o formato não muda quantos caracteres você baixa.

### C, dividida em subsets

C corta os mesmos TTFs segundo os intervalos de caracteres que o Google usa: 124 intervalos para a Noto Sans KR e a Noto Serif KR, 7 para a Inter e 6 para a JetBrains Mono. A equipe do Google Fonts explicou como os intervalos coreanos são divididos no [post de 2018 que anunciou o suporte a japonês](https://developers.googleblog.com/en/google-fonts-launches-japanese-support/). Os 2,000 caracteres mais usados são divididos em 20 fragmentos por frequência, e o restante em 100 fragmentos pela ordem do código Unicode. O CSS do Google não numera os fragmentos coreanos, então eu os numerei a partir de 0 na ordem em que aparecem no CSS. Do 0 ao 99 são os fragmentos divididos por código (no CSS aparecem primeiro os fragmentos com os códigos mais altos), e do 100 ao 119 os fragmentos por frequência. No fim entram 4 fragmentos para latim, latim estendido, cirílico e vietnamita, totalizando 124. Os nomes de arquivo de C também seguem essa numeração.

O CSS de C tem uma regra por fragmento e por peso, 661 no total: 496 para a Noto Sans KR (124 intervalos vezes quatro pesos), 124 para a Noto Serif KR, 35 para a Inter (7 intervalos vezes cinco fontes) e 6 para a JetBrains Mono.

![O mesmo painel para a variante C, ordenado por nome. 1 são cinco fragmentos inter, um para itálico 400 e um para cada peso 300, 400, 500 e 700. A linha sem marcação logo abaixo é um fragmento mono. 2 são cinco fragmentos nskr-normal-300, 3 são dezenove nskr-normal-400, 4 são nove nskr-normal-500, 5 são treze nskr-normal-700 e 6 são seis serif-normal-700. 7 é 679 kB / 823 kB transferred na barra inferior](5.png?w=720)

Das 661 regras, só 58 arquivos foram baixados, somando 679 kB (7), ou 4% de A. Os nomes dos arquivos incluem o peso, então ao ordenar por nome dá para ver de relance quantos fragmentos cada peso baixou.

O peso do corpo, 400, é o que tem mais, 19 fragmentos (3); o 300 do primeiro parágrafo tem 5 (2), o 500 dos subtítulos tem 9 (4) e o 700 do negrito tem 13 (5). A maioria são fragmentos da faixa 100, que contêm os caracteres mais usados. Há fragmentos com números fora da curva, como o 56 do peso 400. O único caractere desta página que cai no intervalo do fragmento 56 é o "눴" de "나눴다" (dividiu), e por esse único caractere um fragmento inteiro foi baixado.

A fonte dos títulos, que em A tinha 4,949 kB, virou 6 fragmentos (6) e 113 kB, porque só foram baixados os fragmentos com os 50 caracteres dos títulos. A Inter baixou um fragmento latino por peso e estilo (1), cinco no total.

Nenhum fragmento latino da Noto Sans KR foi baixado, porque a Inter, que vem primeiro, desenhou todos os espaços, dígitos e letras latinas. No Chrome desta medição, a ordem em `font-family` mudou até quais arquivos foram baixados.

Veja quanto a conversão para woff2 e os subsets cortaram, cada um.

| Etapa | Transferência | Redução |
|---|---|---|
| A. TTF (Brotli) | 17,200,139 B | Base |
| B. woff2, sem subsets | 12,045,102 B | A conversão para woff2 cortou 5,155,037 B |
| C. woff2, com subsets | 678,925 B | Os subsets cortaram mais 11,366,177 B |

69% da redução veio dos subsets. Essa proporção conta primeiro a conversão para woff2 e depois os subsets, então é a conta mais favorável ao woff2. Se você dividir em subsets primeiro, sobra menos para o woff2 comprimir, e a parcela dos subsets fica ainda maior.

### D, com a resposta do Google

D é o que o Google de fato entrega a um Chrome recente. Os intervalos são os mesmos de C, mas há metade dos arquivos.

![O mesmo painel para a variante D, ordenado por nome. 1 são dois arquivos, inter-italic-latin e inter-latin. A linha sem marcação logo abaixo é um mono-latin. 2 são dezenove arquivos, de nskr-101 a nskr-119 mais nskr-56, e 3 são seis, de serif-114 a serif-latin. 4 é 579 kB / 723 kB transferred na barra inferior](6.png?w=720)

A diferença está na Noto Sans KR. C baixou fragmentos separados por peso, 46 no total, enquanto D baixou 19 (2). Isso porque os fragmentos de D são fontes variáveis (variable fonts). Uma fonte variável trata o peso como um valor num eixo chamado `wght`.

![O arquivo publicado de D nskr-119.woff2 carregado no Wakamai Fondue. 1 é o resumo dizendo que é uma fonte variável com um eixo, 2 é o nome do arquivo nskr-119.woff2, tamanho 16 KB, formato WOFF2, e 3 é o eixo wght em Variable axes, com mínimo 100 e máximo 900](7.png?w=720)

Carregando o `nskr-119.woff2` publicado no [Wakamai Fondue](https://wakamaifondue.com/), uma ferramenta de inspeção de fontes, ele aparece como fonte variável (1), com o eixo `wght` indo de 100 a 900 (3). 300, 400, 500 e 700 estão todos nesse intervalo, então esse único arquivo de 16 KB (2) desenha os quatro pesos. Para conferir sem instalar nada, abra o CSS do Google. Se quatro `@font-face` com pesos diferentes apontam para a mesma URL de arquivo, é um arquivo variável. Os 19 fragmentos que D baixou têm exatamente os mesmos números dos 19 que C baixou para o peso 400. Ou seja, todos os caracteres desenhados nos outros pesos estavam nos mesmos fragmentos dos caracteres desenhados em 400.

Em compensação, cada fragmento de D é maior que o de C. No mesmo fragmento 119, o 400 de C transfere 9.0 kB e D transfere 16.7 kB, cerca de 1.9 vez. Uma fonte variável carrega dados extras para desenhar o eixo de peso, e o meu processo com fontTools também é diferente do processo de produção do Google. Por isso, só na Noto Sans KR, o número de arquivos caiu bastante, de 46 para 19, mas os bytes caíram só 16%, de 441 kB para 370 kB. Como um fragmento é cerca de 1.9 vez maior, cada fragmento precisa servir em média quase dois pesos para que os fragmentos variáveis baixem menos.

A Inter passou de cinco arquivos para dois (1). Os quatro pesos do estilo normal se juntaram em um arquivo variável, e o itálico, que desde o início era só 400, continua sendo um. Esse arquivo itálico é estático, não variável, porque quando você pede um único peso o Google entrega um arquivo estático só com esse peso.

Pelo mesmo motivo, a fonte dos títulos (3) é quase igual em C e D: 6 fragmentos e 113 kB nas duas. Esta página pediu a Noto Serif KR só em 700. Em fontes que têm versão variável, como as quatro famílias deste post, o arquivo variável só vem quando você pede dois pesos ou mais, e o eixo não é cortado para o intervalo pedido; vem o intervalo completo da fonte (de 200 a 900 na Noto Serif KR). A JetBrains Mono também é pedida só em 400, então é um arquivo estático.

### D-range, pesos pedidos como intervalo

D e D-range baixam os mesmos 28 arquivos de fonte. Comparei um por um os 268 arquivos para os quais os dois CSS apontam, incluindo os fragmentos que não são baixados, e eles eram idênticos até o último byte. Só o CSS muda.

![Em cima D e embaixo D-range, o mesmo painel com o filtro CSS ativado. 1 é o fonts.css de D com 107 kB, 2 é 429 kB descompactado. 3 é o fonts.css de D-range com 43.1 kB, 4 é 173 kB descompactado](8.png?w=720)

Se você pede os pesos listados como `wght@300;400;500;700`, o Google escreve uma regra por peso, todas apontando para o mesmo arquivo: 124 vezes quatro pesos, 496 regras só para a Noto Sans KR. Se pede um intervalo como `wght@300..700`, vem uma única regra por fragmento com `font-weight: 300 700`, como no código mostrado antes. Por isso o CSS descompactado caiu de 429 kB para 173 kB (2, 4), e a transferência de 107 kB para 43 kB (1, 3).

Só que essa transferência é resultado da compressão da Netlify. A Netlify só reduziu para cerca de um quarto do tamanho descompactado, enquanto pré-comprimir o mesmo CSS de D com Brotli dá 41 kB mesmo no nível mais baixo, 0. No nível mais alto, 11, D fica com 14.9 kB e D-range com 14.3 kB. No nível 11 a diferença cai para 0.6 kB, porque regras que repetem as mesmas strings comprimem bem. O que um pedido por intervalo reduz com certeza não é tanto a transferência, e sim a quantidade de CSS que o navegador precisa ler.

## Chegada das fontes no Fast 4G

Com bytes tão diferentes, quanto muda o tempo? Medi de novo as mesmas publicações na condição Fast 4G do DevTools. Segundo o [código-fonte do DevTools](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/sdk/NetworkManager.ts), os valores base desse preset são 60 ms de latência e 9 Mbps, e na prática ele aplica multiplicadores que resultam em 165 ms de latência e 8.1 Mbps de download. Na medição também usei esses valores aplicados. O tempo vai da requisição do documento até o fim da resposta da última fonte, e uso a mediana de 9 carregamentos por variante, cada um num navegador novo com o cache desativado. Essa condição só simula latência e banda por requisição, então não inclui a perda de pacotes de uma rede móvel real nem a CPU de um celular.

![Momento em que a última fonte chegou no Fast 4G. Cada variante tem pontos para 9 carregamentos e uma barra com a mediana. A se concentra entre 17.9 s e 18.8 s com mediana de 18.5 s, B entre 12.8 s e 13.7 s com 13.2 s. C vai de 1.6 s a 2.7 s com 2.4 s, D de 1.5 s a 2.5 s com 2.1 s, e D-range de 1.5 s a 3.0 s com 2.2 s](9.png?w=720)

A levou 18.5 s e B 13.2 s. Esses valores ficam perto de bytes divididos pela banda: 17.2 MB a 8.1 Mbps levam 17 s, e 12.0 MB levam 12 s. Os 9 carregamentos ficaram dentro de um segundo, e em três medições separadas no mesmo dia as medianas das duas variantes coincidiram com menos de 0.3 s de diferença.

C, D e D-range, que têm subsets, ficaram em torno de 2 s. Numa condição limitada pela banda, o tempo acompanha diretamente os bytes, então os 11 s cortados pelos subsets pesam mais que os 5 s cortados pelo formato.

Já a ordem entre C, D e D-range não pôde ser definida por esta medição. Mesmo dentro de uma única variante, os carregamentos oscilaram de 1.5 s a 3.0 s, e essa oscilação foi maior que as diferenças entre variantes. A maior parte da oscilação veio da CDN da Netlify.

Em 27 de outubro, abri o mesmo D mais oito vezes nas mesmas condições e capturei a aba Network a cada carregamento. Dessa vez adicionei como coluna o cabeçalho de resposta `cache-status`. Aqui estão dois desses carregamentos lado a lado.

![Painel Network de dois carregamentos de D no Fast 4G. Em cima, um carregamento em que as fontes vieram do cache da CDN: 1 é "Netlify Edge"; hit na coluna Cache-Status, e 2 é o Waterfall, em que cada barra tem um trecho verde curto e um azul longo. 3 é DOMContentLoaded 373 ms, Load 1.42 s na barra inferior. Embaixo, um carregamento que foi até o servidor de origem: 4 é "Netlify Edge"; fwd=miss; fwd-status=200; stored, e 5 é o Waterfall, em que quase toda a barra é verde. 6 é DOMContentLoaded 889 ms, Load 2.21 s](10.png?w=720)

Em cima (1) está um carregamento em que todas as fontes vieram do cache da CDN, por isso aparece `hit`. Embaixo (4) aparece `fwd=miss`: um carregamento em que a CDN não tinha os arquivos e precisou ir até o servidor de origem e voltar. Nesse carregamento o HTML e o CSS também foram até a origem. Nas barras do Waterfall (2, 5), o verde é o tempo esperando a primeira resposta do servidor e o azul é o tempo recebendo o conteúdo. No carregamento vindo do cache o verde é curto e o azul é longo, porque as 28 fontes dividem a banda. No carregamento que foi à origem quase toda a barra é verde. Cada Waterfall é desenhado na escala do seu próprio tempo total, então não dá para comparar o comprimento das barras de cima e de baixo. Os tempos se comparam na barra inferior (3, 6). Como o HTML chegou atrasado da origem, o DOMContentLoaded passou de 373 ms para 889 ms, e as requisições de fontes começaram com o mesmo atraso. Nesta página a última fonte termina no mesmo momento que o Load, então a diferença fica como Load de 1.42 s contra 2.21 s. 6 dos 8 carregamentos vieram inteiramente do cache e terminaram entre 1.39 s e 1.44 s; os 2 que foram à origem levaram 2.21 s e 4.00 s. Sem mudar uma fonte sequer, só o estado do cache produziu uma diferença maior que a diferença entre variantes.

Em 26 de outubro medi de novo depois de aumentar para 6 os carregamentos prévios para aquecer a CDN. Pelo cabeçalho de resposta `cache-status`, nos carregamentos em que as fontes não estavam no cache da CDN e foram até o servidor de origem, o primeiro byte da última fonte levou em geral de 370 ms a 750 ms, e uma vez 1.3 s. Os carregamentos vindos do cache tiveram mediana de cerca de 210 ms. Os carregamentos mais lentos (de 2.3 s a 3.3 s) foram todos carregamentos em que as fontes, o HTML ou o CSS foram até a origem. Mesmo mantendo só os carregamentos em que todas as fontes vieram do cache, cada variante ainda oscilava de 0.2 s a 0.8 s, e C teve só 3 carregamentos assim em 9. Por isso descrevo a diferença entre C e D só em bytes e número de arquivos, não em tempo.

Esta medição também não permitiu decidir quando a primeira tela é pintada (FCP). As medianas foram A 1.0 s, B 1.0 s, C 1.4 s, D 1.1 s e D-range 1.3 s, mas em outra medição no mesmo dia C deu 1.0 s, e D-range, com o menor CSS, ficou mais lento que D. As diferenças entre variantes são menores que as diferenças entre carregamentos. Esta página declara `font-display: swap`, então desenha o texto com outra fonte antes de as fontes web chegarem. Por isso até os usuários de A começam a ler em 1 s, e nos 17 s seguintes o texto vai trocando para cada fonte à medida que ela chega.

## Os custos que os subsets deixam

Os subsets serem a resposta não quer dizer que saiam de graça. Há cinco custos.

Primeiro, o CSS cresce. O `fonts.css` de A transfere 0.4 kB, enquanto o de C e D transfere 107 kB, porque cada uma das 661 regras carrega o seu próprio intervalo de caracteres. Descompactado, C tem 434 kB e D 429 kB. O navegador não desenha a tela enquanto o CSS carregado por `<link>` não chegar por inteiro, então esse CSS precisa chegar antes dos arquivos de fonte. Se você auto-hospeda as fontes, vale a pena pré-comprimir esse CSS num nível alto. Como vimos antes, neste CSS o tamanho enviado pela Netlify e o tamanho pré-comprimido no nível mais alto diferem por um fator de sete.

Segundo, o número de requisições aumenta. Os 11 arquivos de B viraram 58 em C. No HTTP/2 ou superior, várias requisições podem ser enviadas ao mesmo tempo por uma única conexão, então cada requisição extra custa pouco, mas não zero. Não medi a partir de quantas requisições esse custo supera a economia em bytes.

Terceiro, os fragmentos têm dados sobrepostos. Cada fragmento repete os dados comuns da fonte, então quanto mais fragmentos você baixa, mais essa duplicação se acumula. Cortando os 17,655 caracteres da Noto Sans KR cobertos pelos intervalos do Google num único arquivo de peso 400, o resultado tem 1,302,420 B, mas dividindo os mesmos caracteres em 124 fragmentos e somando todos, dá 1,823,312 B, cerca de 40% a mais. Uma página que baixa quase todos os fragmentos acaba baixando mais do que com um único arquivo. Esta página baixou no máximo 19 de 124 fragmentos por peso, então está longe desse caso.

Quarto, há muito mais arquivos para publicar. A pasta C desta demo tem 661 fragmentos. O navegador baixa 58, mas todos precisam estar no servidor. O que o navegador baixa e o que você envia ao servidor precisam ser contados separadamente.

Quinto, caracteres fora dos intervalos são desenhados com uma fonte de fallback. Os intervalos do Google cobrem só 17,655 dos 23,174 caracteres da Noto Sans KR, então se aparecer algum dos 5,519 restantes, ele é desenhado com uma fonte que não é a fonte web. Quase todos são hanja de uso raro, então esta página não foi afetada, mas serviços em que aparecem hanja em nomes de pessoas ou lugares devem verificar.

E em telas em que os caracteres chegam depois, como campos de texto ou chats, um caractere novo faz o navegador baixar o fragmento dele naquele momento. Cada post usa caracteres diferentes, então ao passar para o próximo post também podem ser baixados fragmentos novos. A transferência medida na primeira tela não é tudo. Não medi quanto a mais uma segunda página baixa.

## Como aplicar subsets

Se você usa o Google Fonts, basta linkar a CSS API como está. O `next/font/google` do Next.js também busca essa resposta no build e a auto-hospeda como está. A diferença entre esses dois caminhos é medida à parte mais adiante.

Se você auto-hospeda, pacotes como o Fontsource (um projeto que empacota fontes open source como pacotes npm) já trazem subsets. O CSS do `@fontsource/noto-sans-kr` 5.3.1, a versão mais recente em 2026-10-22, tem o formato de C, dividido nos mesmos 124 intervalos do Google, e essa estrutura existe desde a 5.2.8. Na 5.2.7, o CSS padrão não tinha regras para o coreano, e o coreano ficava à parte num único arquivo sem intervalo. Se você precisa de fragmentos variáveis, o `@fontsource-variable/noto-sans-kr` tem o formato de D-range, com os mesmos intervalos declarados com um único `font-weight: 100 900`. É mais seguro abrir o CSS da versão que você usa e conferir o `unicode-range`.

Se a fonte não está no Google, você mesmo corta. Esse é o caso C. Pegue a lista de intervalos do Google, corte cada intervalo com o módulo subset do fontTools (o mesmo motor do `pyftsubset`), salve como woff2 e gere uma regra com o `unicode-range` de cada fragmento. Os scripts de build em `scripts/` no repositório da demo fazem esse processo.

Ao verificar o seu próprio serviço, não confie nos nomes de arquivo. As figuras deste post usam arquivos renomeados para facilitar a leitura, mas as respostas reais do Google e a saída do `next/font` têm nomes com hash, então não dá para ver o peso nem o número do fragmento. Em vez disso, ative o filtro Font e olhe a quantidade de arquivos e os tamanhos. Se houver um arquivo na casa dos MB por peso, não há subsets. Se houver dezenas de fragmentos e a quantidade crescer com o número de pesos, são fragmentos estáticos; se você abrir a resposta do `fonts.css` no filtro CSS e o `font-weight` estiver escrito como intervalo, por exemplo `100 900`, são fragmentos variáveis.

## O custo de carregar dos servidores do Google

Os subsets reduziram o que é baixado. Os métodos que restam quase não reduzem isso. Em vez disso, definem quando as fontes são baixadas e como a tela fica enquanto isso. O primeiro é de onde as fontes vêm.

Até aqui, D baixava a resposta do Google e a servia pelo mesmo site. Em serviços reais é comum linkar direto a URL do CSS do Google. Aí o navegador busca o CSS em `fonts.googleapis.com` e as fontes em `fonts.gstatic.com`, o que soma dois lugares a mais para se conectar. Para ver esse custo, fiz mais duas páginas que enviam o mesmo pedido de D direto ao Google. Uma só linka o CSS, e a outra segue o código de incorporação que o fonts.google.com fornece e adiciona `preconnect`, que abre as conexões antecipadamente, para os dois hosts.

Medi em 26 de outubro na mesma condição Fast 4G, e os valores são medianas dos carregamentos em que todas as fontes vieram do cache. Foram 7 de 9 em D e todos os 9 nas demais. A data da medição e o número de carregamentos prévios são diferentes da figura anterior, então o valor de D também muda (2.1 s contra 1.74 s). Compare só dentro desta tabela.

Ficar só com os carregamentos vindos do cache favorece servir pelo mesmo site. Em sites com pouco tráfego, o cache da CDN fica vazio com frequência, então, como no caso de C mostrado antes, muitos carregamentos vão até o servidor de origem. Esse custo fica com a auto-hospedagem.

| Página | Transferência de fontes | Chegada da última fonte |
|---|---|---|
| D, servida pelo mesmo site | 579 kB | 1.74 s |
| Conexão direta ao Google | 576 kB | 1.73 s |
| Conexão direta ao Google, com preconnect | 576 kB | 1.76 s |

As três ficam a menos de 0.03 s umas das outras, menos que a variação ao abrir a mesma página várias vezes (de 0.2 s a 0.8 s). O custo de conexão existia, sem dúvida. A primeira conexão a `fonts.googleapis.com` (incluindo o TLS, que estabelece a conexão criptografada) levou cerca de 80 ms a 190 ms por carregamento, e esse tempo entra antes de o CSS ser buscado. Mas o tempo de conexão a `fonts.gstatic.com` aparecia como 0 nas requisições de fontes. A resposta CSS do Google traz o cabeçalho `Link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin`, então o navegador abre antecipadamente a conexão ao servidor de fontes enquanto baixa o CSS. Parece ser pelo mesmo motivo que a linha do gstatic entre os `preconnect` colocados no HTML não fez diferença. A linha do googleapis também não fez diferença, mas não separei por quê, nem por que o tempo de conexão ao googleapis não apareceu no horário de chegada da última fonte.

![Ordem de conexão ao servir pelo mesmo site em comparação com a conexão direta ao Google. Pelo mesmo site, o HTML, o CSS e as 28 fontes são buscados em sequência sobre uma única conexão com o site. Com conexão direta ao Google, depois do HTML abre-se uma nova conexão com o googleapis para buscar o CSS; enquanto o CSS é baixado, o cabeçalho Link abre antecipadamente a conexão com o gstatic, e depois as 28 fontes são buscadas](11.png?w=720)

Ainda assim, esta tabela subestima o custo de somar lugares para se conectar. O Fast 4G do DevTools adiciona latência por requisição, então o estabelecimento da conexão (DNS, TCP, TLS) não recebe latência extra. Nesta medição, conectar à Netlify com o Fast 4G ligado levava em geral cerca de 147 ms (dos quais cerca de 74 ms de TLS), que é simplesmente o valor da minha própria linha (em Seul). A [documentação de throttling do Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) também diz que latência aplicada por requisição é menos precisa que a aplicada por pacote. Uma conexão envolve várias idas e voltas, então em redes com tempo de ida e volta maior, cada lugar a mais para se conectar custa mais. Não medi quanto.

Antes se considerava que conectar direto ao Google tinha uma vantagem. Como muitos sites usam as mesmas URLs de fontes do Google, uma fonte já baixada em outro site podia ser reaproveitada do cache do navegador. O Chrome bloqueou esse compartilhamento a partir da versão 86. Segundo o [artigo do Chrome sobre particionamento de cache](https://developer.chrome.com/blog/http-cache-partitioning), a chave de cache inclui, além da URL do recurso, o site de nível superior e o site do frame. Ou seja, sites diferentes usam caches separados mesmo para a mesma URL.

De fato, fontes com a mesma URL foram baixadas do zero quando o site mudou. Com um único perfil do Chrome, abri duas vezes no site publicado a página que se conecta direto ao Google, e depois duas vezes no meu servidor local (outro site). Ao reabrir no mesmo site, as 28 fontes vieram do cache, mas ao trocar de site as mesmas 28 fontes, com as mesmas URLs, 576 kB, foram baixadas de novo. Repetindo a mesma sequência num Chrome com o particionamento de cache desativado (`--disable-features=SplitCacheByNetworkIsolationKey`), as 28 vieram do cache mesmo depois de trocar de site. No Chrome atual não existe cache que permita a sites diferentes compartilhar fontes. O [capítulo de fontes do Web Almanac 2024](https://almanac.httparchive.org/en/2024/fonts) do HTTP Archive também diz que o particionamento de cache acabou com a vantagem das CDNs de fontes compartilhadas, e que os sites que servem fontes só pelo próprio site passaram de 22% em 2022 para 28% em 2024 no desktop.

## O preload do next/font e as fontes de fallback

O `next/font` do Next.js toma essa decisão por você no build. No build, ele baixa o CSS e as fontes do Google e os serve pelo seu próprio site, faz preload das fontes indicadas e ajusta o tamanho da fonte de fallback, usada antes de a fonte web chegar, para combinar com ela. O loader da 16.3.4 busca o CSS com o User-Agent do Chrome 104, baixa todos os arquivos de fragmento que ele contém e só reescreve as URLs, então o `unicode-range` permanece como está. Quando fiz um pedido com o mesmo User-Agent em 2026-10-21, recebi as mesmas regras e os mesmos arquivos de D.

Montei uma página com Next.js 16.3.4 com o mesmo corpo e as mesmas quatro famílias, exportei como arquivos estáticos e coloquei no mesmo site. A Noto Sans KR lista quatro pesos, e as quatro famílias usam `subsets: ['latin']`. Os únicos valores que `subsets` aceita para a Noto Sans KR são cyrillic, latin, latin-ext e vietnamese, então não há como escolher o coreano. Mesmo assim, o coreano não some. `subsets` só define quais fragmentos recebem preload, e os `@font-face` de todos os fragmentos coreanos continuam no CSS. A saída contém 268 arquivos de fonte.

Ela baixou 631 kB, 52 kB a mais que D. Baixou o fragmento latin da Noto Sans KR (26 kB), que esta página não usa, e o itálico da Inter veio como arquivo variável, 26 kB maior que o arquivo estático de D. Nas mesmas condições da tabela acima, a última fonte chegou em 1.81 s (mediana de 7 carregamentos). São 0.07 s de diferença em relação ao D da tabela (1.74 s), menos que a variação entre carregamentos repetidos. O que o `next/font` acrescenta por cima é o preload e o ajuste da fonte de fallback.

O preload não se aplica aos fragmentos coreanos. O HTML contém 5 preloads, todos de fragmentos latin, porque no `next/font`, `subsets` não permite escolher fragmentos coreanos. Daria para escrever preloads direto no HTML para fragmentos que todo post baixa, como os 20 fragmentos por frequência, mas desta vez não medi isso. Além disso, desses 5, o fragmento latin da Noto Sans KR (25,804 B) era um arquivo de que esta página não precisava. Fazendo o build com o preload desligado, esse arquivo nem chega a ser requisitado, porque, como vimos antes, a Inter desenha primeiro os caracteres latinos. No build sem preload a última fonte chegou em 1.87 s, 0.13 s de diferença em relação a D.

O ajuste da fonte de fallback só vale para caracteres latinos. O `next/font` gera para cada fonte uma regra como `Noto Sans KR Fallback` e ajusta o tamanho da fonte de fallback à fonte web com `size-adjust` e `ascent-override`. Mas a base é `local("Arial")` (Times New Roman para a Noto Serif KR). A Arial não tem coreano, então o coreano passa para a próxima fonte de fallback, que não tem ajuste. Olhando quais fontes realmente desenharam um parágrafo do corpo logo após a primeira pintura, o latim já estava em Inter, e o coreano cujos fragmentos ainda não tinham chegado estava em Apple SD Gothic Neo, a fonte coreana padrão do macOS. Isso também aparece em Rendered Fonts, no fim da aba Computed do painel Elements do DevTools; na medição usei `CSS.getPlatformFontsForNode` do Chrome DevTools Protocol, que dá a mesma informação.

## Por que escolher o next/font

Até aqui, o `next/font` não deixou a página coreana mais rápida. O Google já faz os subsets, e o preload e o ajuste de fallback não se aplicam ao coreano. Ainda assim, há outros motivos para ele ser tão usado.

O `next/font` apareceu pela primeira vez em outubro de 2022 no [Next.js 13](https://nextjs.org/blog/next-13), com o nome `@next/font`. O anúncio o apresenta como uma ferramenta que elimina requisições de rede externas em nome da privacidade e do desempenho, baixa as fontes no build para auto-hospedá-las e elimina o deslocamento de layout com `size-adjust`. O anúncio destaca à parte que o navegador não envia nenhuma requisição ao Google.

No lado da privacidade, houve uma decisão judicial alemã no início daquele mesmo ano. A [decisão do Tribunal Regional de Munique](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-GRURRS-B-2022-N-612) de 20 de janeiro de 2022 (processo 3 O 17493/20) considerou ilícito que um site, ao carregar o Google Fonts, repassasse ao Google o endereço IP dos visitantes sem consentimento, e concedeu uma indenização de 100 euros. A decisão se apoiou no fato de que o Google Fonts pode ser usado sem conexão com os servidores do Google. Com a auto-hospedagem, esse problema não tem onde surgir.

Os demais motivos se ligam ao que vimos antes. O cache compartilhado que se ganhava ao conectar direto ao Google não existe mais no Chrome. O custo de somar lugares para se conectar saiu pequeno nesta medição, mas porque o Fast 4G não adiciona latência ao tempo de conexão. E fazer à mão o trabalho de baixar a resposta do Google, reescrever as URLs, configurar o preload e ajustar as fontes de fallback exige vários scripts, como na demo deste post. O `next/font` reduz isso a uma única chamada de função.

## O que a tela mostra quando a fonte atrasa

`font-display` define o que desenhar antes de a fonte chegar. Se você não o declara, o padrão é `auto`, e segundo o [artigo do web.dev sobre fontes](https://web.dev/articles/font-best-practices), navegadores baseados em Chromium e o Firefox então esperam pela fonte sem desenhar texto por até 3 segundos. O CSS do Google, se você não adicionar `display=swap` à URL, também entrega regras sem `font-display`. Todas as páginas até aqui declaram `swap`: desenham primeiro com uma fonte de fallback e trocam quando a fonte web chega. Se na troca a largura dos glifos e a altura da linha mudam, os parágrafos se deslocam, e a medida acumulada desse deslocamento é o CLS (Cumulative Layout Shift).

As páginas da família D com `swap` tiveram CLS mediano de 0.018 a 0.020, chegando a 0.024 em carregamentos individuais. Bem abaixo do 0.1 que o [artigo do web.dev sobre CLS](https://web.dev/articles/cls) define como limite de "bom". O deslocamento não aconteceu de uma vez, mas em várias etapas. Os fragmentos chegavam em momentos diferentes, então logo após a primeira pintura às vezes parte dos caracteres de um mesmo parágrafo estava em Noto Sans KR e o resto em Apple SD Gothic Neo.

Os builds com o ajuste de fallback do `next/font` desligado e ligado também tiveram o mesmo CLS, 0.017 e 0.018. Os caracteres latinos aos quais o ajuste se aplica não tinham relação com o deslocamento. Só o build sem preload ficou em 0.009, cerca da metade; parece que os deslocamentos grandes passaram de dois para um, mas não confirmei a causa.

Também medi uma página que mantém os arquivos de D e só muda para `font-display: optional`. O CLS ficou em 0.0002 ou menos nos 9 carregamentos. Em compensação, na primeira visita o texto ficou nas fontes de fallback até o fim, mesmo depois de as fontes terminarem de baixar: Apple SD Gothic Neo para o coreano e a fonte do sistema para o latim, e três primeiras visitas abertas separadamente deram o mesmo resultado. Pela [seção font-display da especificação CSS Fonts 4](https://www.w3.org/TR/css-fonts-4/#font-display-desc), com `optional` uma fonte que não está pronta logo a tempo da primeira pintura não é usada naquela página. O Chrome desta medição baixou as fontes até o fim, então quem chega pela primeira vez baixa as fontes sem chegar a vê-las. As fontes que ficam no cache podem ser usadas na próxima visita. Nos dados de desktop do Web Almanac 2024, cerca de 44% dos sites usam `swap`, e menos de 1% usam `optional`.

Esse CLS foi medido com as fontes de fallback do macOS. No Windows a fonte de fallback é a Malgun Gothic, então os valores podem ser diferentes. A fonte de fallback coreana que o `next/font` não ajusta também pode ser ajustada à mão: usa-se `local("Apple SD Gothic Neo")` ou `local("Malgun Gothic")` como base de um `@font-face`, define-se `size-adjust` e `ascent-override` nele, e ele é usado como fonte de fallback. Desta vez não medi isso. Para saber o tamanho dos deslocamentos que usuários reais sofrem e os elementos que mais se deslocam, coletar com o build de attribution da biblioteca `web-vitals` é mais preciso que medir em laboratório.

## As fontes dos serviços coreanos

O que os serviços reais fazem? Em 26 de outubro de 2026, abri a página inicial de alguns serviços coreanos em headless Chrome como numa primeira visita e medi a transferência de fontes sem limitar a rede. Medi cada um duas vezes, e os dois carregamentos diferiram no máximo em algumas centenas de bytes.

| Serviço | Fonte | Subsets | Arquivos de fonte | Transferência de fontes |
|---|---|---|---|---|
| Musinsa | Pretendard, quatro pesos | Não | 4 | 3,279 kB |
| Toss | Toss Product Sans, quatro pesos | Não | 5 | 2,049 kB |
| Site institucional da Kakao | Duas fontes da Kakao, dois pesos cada | Não | 4 | 1,395 kB |
| Kurly | Pretendard fonte variável | 92 fragmentos | 19 | 501 kB |
| Daangn (Karrot) | Pretendard fonte variável | 92 fragmentos | 10 | 262 kB |

![Gráfico de barras da transferência de fontes na primeira visita à página inicial de serviços coreanos. Musinsa 3,279 kB, Toss 2,049 kB e o site institucional da Kakao 1,395 kB, sem subsets, em cinza; Kurly 501 kB e Daangn 262 kB, que usam subsets, em azul](12.png?w=720)

Os serviços sem subsets estão no mesmo estado do B deste post: woff2, mas cada arquivo contém todos os caracteres de um peso. A Pretendard da Musinsa passa de 800 kB por peso. Dos cinco arquivos da Toss, quatro são os arquivos por peso da Toss Product Sans e o restante é outra fonte de 10 kB. Já a Kurly e o Daangn usam um CSS que divide a fonte variável Pretendard em 92 fragmentos e baixam só os fragmentos com os caracteres usados na página. Dividindo pelos 8.1 Mbps do Fast 4G, 3,279 kB dão cerca de 3.2 s e 262 kB cerca de 0.3 s. São valores calculados, não medidos, mas são mais de dez vezes maiores que as diferenças de tempo que este post mediu para a conexão direta ao Google e o preload.

São valores de primeira visita a uma única página inicial, então variam conforme a página e o momento. Com um arquivo por peso, uma vez baixados, os arquivos vêm do cache nas visitas seguintes, então em serviços com muitas visitas recorrentes a diferença diminui.

Há serviços que não estão na tabela. A Naver desenha o corpo com fontes do sistema e baixou só um arquivo da NanumSquare Neo (389 kB) para algumas partes. O Baemin (Baedal Minjok) declara a Pretendard, mas não a baixou na página inicial, e baixou só um arquivo da sua fonte própria (140 kB).

## Primeiro, os subsets

Uma fonte sem subsets baixa todos os caracteres de cada arquivo, não importa quantos caracteres a página use. Nesta página de quatro fontes isso deu 17.2 MB em TTF e 12.0 MB em woff2, e no Fast 4G a última fonte levou 18.5 s e 13.2 s para chegar. Com subsets, o que é baixado acompanha os caracteres usados na página. A mesma página caiu para 0.6 MB e cerca de 2 s.

Os subsets importam especialmente em páginas em coreano por causa do tamanho dos arquivos. Converter para woff2 corta cerca de um terço, mas as fontes coreanas desta página ainda ficaram com 2 MB a 3.2 MB por peso. Uma única fonte serifada colocada para desenhar alguns títulos era maior que a fonte do corpo.

Esta medição não conseguiu separar no tempo as escolhas feitas depois dos subsets. Não deu para ordenar fragmentos estáticos e variáveis, e as diferenças entre conectar direto ao Google ou servir pelo próprio site, o preload e o ajuste de fallback foram todas menores que a variação ao abrir a mesma página várias vezes. Ainda assim, o Fast 4G não adiciona latência ao estabelecimento da conexão, então o custo dos lugares a mais para se conectar na conexão direta ao Google pode ter saído pequeno nesta medição. Por isso é melhor escolher entre essas opções por outros critérios. Privacidade e particionamento de cache favorecem a auto-hospedagem, e a ferramenta que tira esse trabalho das suas mãos é o `next/font`. Com o `font-display`, basta decidir se você aceita pequenos deslocamentos com `swap` ou mostra fontes de fallback na primeira visita com `optional`.

Também há métodos que não comparei desta vez. Usar menos pesos e famílias reduz o que é baixado sem subsets em tantos arquivos quantos forem removidos. Este blog também usa só dois pesos, 400 e 700. Também dá para enviar quatro pesos num único arquivo de fonte variável sem subsets. Desta vez não medi nenhum dos dois.

Também ficaram coisas sem confirmar: o custo que cada lugar a mais para se conectar acrescenta em redes com tempo de ida e volta longo, o CLS ao desenhar com Malgun Gothic no Windows, por que o CLS caiu pela metade sem preload, quanto de fragmentos novos é baixado ao passar para o próximo post e a causa da variação que sobra mesmo entre carregamentos vindos do cache. Acredito que nenhum deles é grande o bastante para inverter a diferença que os subsets fizeram. Mas isso é uma inferência, não uma medição.

Alguns grandes serviços coreanos ainda enviam arquivos de centenas de kB por peso, sem subsets. Recomendo abrir o painel Network do seu próprio serviço, ativar o filtro Font e ver se há arquivos assim. Se houver, olhe para os subsets antes do `next/font` ou do preload.

:::ref
- [docs] [MDN, unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range)
- [repo] [Fontsource](https://github.com/fontsource/fontsource)
- [docs] [fontTools, pyftsubset](https://fonttools.readthedocs.io/en/latest/subset/index.html)
:::
