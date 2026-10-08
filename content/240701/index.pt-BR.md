---
emoji: 🧬
title: "A diferença entre LZ77 e LZ78"
seoTitle: "LZ77 vs LZ78: janela deslizante, dicionário e DEFLATE"
date: "2024-07-01"
updatedAt: "2026-10-08"
categories: curiosidades software
description: "Como LZ77 e LZ78 diferem no uso do dicionário e na forma de esquecer o antigo, e como DEFLATE, ZIP, GZIP e Zstd descendem da família LZ77."
keywords: "LZ77, LZ78, LZ77 vs LZ78, algoritmo LZ77, compressão com janela deslizante, LZW, como funciona o DEFLATE, compressão baseada em dicionário"
locale: pt-BR
translationOf: '240701'
sourceHash: ddc4d9e1f3f50970b1b45c010136599e1ae4ffc77291be473b4b38679baa37a9
---

Neste artigo, quero falar sobre **como LZ77 e LZ78 diferem**.

Este artigo é para desenvolvedores que usam ferramentas como zip, gzip e zstd e já se perguntaram como funciona a compressão baseada em dicionário dentro delas. Ao final, você conseguirá explicar como os dois algoritmos diferem no tratamento do dicionário e de qual dos dois descendem os compressores mais usados hoje.

Ao comparar formatos para compactar artefatos de build, cedo ou tarde se acaba voltando a esses dois algoritmos.

## Compressão baseada em dicionário

Compressão sem perdas, ou lossless compression, é um método que permite reconstruir perfeitamente os dados originais. Ao contrário da compressão com perdas usada em imagens e áudio, o conteúdo descompactado não difere do original nem por um único bit. Código-fonte e artefatos de build precisam desse tipo de compressão porque a integridade dos dados é essencial.

A ideia central é **aproveitar a redundância estatística presente nos dados**. Ao substituir padrões repetidos por representações mais curtas, reduzimos o tamanho total.

Entre essas técnicas, os métodos **baseados em dicionário (Dictionary-Based)** formam uma família muito usada. Aqui, dicionário é o mecanismo que permite apontar de novo para dados já vistos. Se esse mecanismo são os próprios dados já percorridos ou uma lista construída à parte é o que separa o LZ77 do LZ78. O **LZ77**, proposto por Jacob Ziv e Abraham Lempel em um [artigo](https://doi.org/10.1109/TIT.1977.1055714) de 1977 na IEEE Transactions on Information Theory, e o **LZ78**, do [artigo que os dois publicaram no ano seguinte](https://doi.org/10.1109/TIT.1978.1055934), são os ancestrais dessa família. As letras “LZ” vêm dos sobrenomes dos pesquisadores. Os algoritmos posteriores baseados em dicionário, como DEFLATE, LZMA, LZ4 e Zstd, têm suas raízes nesses dois.

Um exemplo simples ajuda. Se a palavra “Linux” se repetir cem vezes, a partir da segunda ocorrência o compressor escreve, no lugar do texto original, uma referência curta que aponta para “aquele trecho visto antes”. Se a referência for mais curta que o original, o tamanho total diminui.

Então, qual é exatamente a diferença entre LZ77 e LZ78?

## LZ77: a abordagem da janela deslizante

O LZ77 **não cria um dicionário explícito separado**. Em vez disso, usa uma região do próprio fluxo de entrada como dicionário. Essa região é chamada de **janela deslizante** porque avança o tanto que já foi processado.

A janela é dividida em duas áreas.

- **Buffer de busca (Search Buffer)**: os dados já processados. Ele funciona como o dicionário.
- **Buffer de antecipação (Look-ahead Buffer)**: os dados ainda não processados que serão comprimidos em seguida.

O algoritmo procura saber se o início do buffer de antecipação já apareceu em algum ponto do buffer de busca. Quando encontra o mesmo padrão, codifica a correspondência em uma tupla **(distância, comprimento, próximo caractere)**. A distância indica quantos caracteres é preciso voltar para encontrar o começo do trecho, e o comprimento informa quantos caracteres coincidem. O artigo original registrava o primeiro valor como uma posição dentro do buffer; as implementações atuais registram a mesma informação como uma distância.

Por exemplo, ao compactar a string `"banana_banana"` com o codificador didático incluído mais adiante neste artigo, saem cinco tokens LZ77: `(0,0,b)` `(0,0,a)` `(0,0,n)` `(2,3,_)` `(7,5,a)`. Os três primeiros são caracteres vistos pela primeira vez, então carregam apenas o próximo caractere, sem correspondência. O segundo `"banana"` é resolvido por um único token, o último, `(7,5,a)`. Ele significa “volte sete caracteres, copie cinco e acrescente `a`”. Ele não copia os seis caracteres porque este codificador sempre deixa o último caractere da entrada na posição de próximo caractere.

Em `(2,3,_)`, o comprimento 3 é maior que a distância 2. Com `ban` já escrito, o decodificador começa a copiar a partir do `a` dois caracteres atrás e, ao copiar o terceiro caractere, lê de novo o `a` que acabou de escrever. Assim sai `ana`, e depois `_` é acrescentado. Acompanhando caractere por caractere, fica assim.

| Etapa | Caractere lido | Saída |
|---|---|---|
| Início | nenhum | `ban` |
| Cópia 1 | 2º caractere, `a` | `bana` |
| Cópia 2 | 3º caractere, `n` | `banan` |
| Cópia 3 | 4º caractere, `a` (escrito na cópia 1) | `banana` |
| Próximo caractere | `_` do token | `banana_` |

A [RFC 1951](https://www.rfc-editor.org/rfc/rfc1951) especifica o mesmo comportamento: se os dois últimos bytes forem X e Y, `<length = 5, distance = 2>` acrescenta X,Y,X,Y,X. Isso funciona porque o dicionário é justamente o dado recém-restaurado.

Nessa abordagem, **o dicionário não é armazenado nem transmitido separadamente.** O decodificador reconstrói sozinho o buffer de busca durante a descompressão, de modo que o dicionário fica implícito nos próprios dados. Como as referências apontam para dados anteriores, a descompressão, em princípio, avança em ordem desde o início. No entanto, as referências só alcançam até onde vai a janela. A RFC 1951 limita as referências do DEFLATE a no máximo 32K bytes para trás. O `Z_FULL_FLUSH` do zlib reinicia o estado de compressão para que a descompressão possa recomeçar a partir desse ponto se os dados comprimidos anteriores estiverem danificados ou se for preciso acesso aleatório. O [zlib.h](https://github.com/madler/zlib/blob/v1.3.1/zlib.h) avisa que usá-lo com muita frequência pode degradar seriamente a compressão.

O tamanho da janela tem uma relação direta de compromisso com a taxa de compressão. Uma janela maior consegue referenciar padrões mais distantes e comprime melhor, mas usa mais memória e, com mais candidatos a verificar, a busca de correspondências costuma ficar mais lenta.

## LZ78: um dicionário explícito

Ao contrário do LZ77, o LZ78 **constrói um dicionário explícito** durante a compressão. Não há janela deslizante. Padrões observados anteriormente são guardados como entradas indexadas e, quando se repetem, são substituídos pelos índices.

O LZ78 produz unidades na forma **(índice do dicionário, próximo caractere)**. O codificador encontra a entrada mais longa que coincide, emite o índice junto ao caractere que quebra a correspondência e adiciona **“a entrada encontrada mais o novo caractere”** ao dicionário. Assim, o dicionário cresce aos poucos durante o processamento.

Ao compactar o mesmo `"banana_banana"` com LZ78, saem oito tokens e o dicionário acumula sete entradas. Os tokens são `(0,b)` `(0,a)` `(0,n)` `(2,n)` `(2,_)` `(1,a)` `(3,a)` `(7,)`, e o dicionário é `1:b` `2:a` `3:n` `4:an` `5:a_` `6:ba` `7:na`. O segundo `"banana"` se divide em três tokens que produzem `ba`, `na` e `na`. É a parte que o LZ77 resolveu com um único token. Uma entrada do dicionário do LZ78 cresce apenas um caractere por vez, então uma entrada longa só surge depois de ver a mesma palavra várias vezes. O último token, `(7,)`, é o caso em que a entrada termina e não há próximo caractere. Este codificador não empacota os tokens em bits, então o número de tokens não serve para comparar taxas de compressão.

As duas sequências de tokens podem ser reproduzidas com o código abaixo. É o resultado de salvá-lo em um arquivo e rodar `node lz.mjs` em 2026-10-08 no macOS 26.6.2 com Node v24.16.0.

```js
// LZ77: (거리, 길이, 다음 문자). 가장 긴 일치를 고르고, 겹친 복사를 허용한다
function lz77(s, win = 4096) {
  const out = []
  let i = 0
  while (i < s.length) {
    let best = { d: 0, l: 0 }
    for (let j = Math.max(0, i - win); j < i; j++) {
      let l = 0
      // 입력의 마지막 글자는 매치에 넣지 않고 다음 문자로 남긴다
      while (i + l < s.length - 1 && s[j + l] === s[i + l]) l++
      if (l > best.l) best = { d: i - j, l }
    }
    out.push([best.d, best.l, s[i + best.l]])
    i += best.l + 1
  }
  return out
}

// LZ78: (사전 인덱스, 다음 문자). 인덱스 0 은 빈 문자열이다
function lz78(s) {
  const dict = new Map()
  const out = []
  let w = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (dict.has(w + c)) {
      if (i < s.length - 1) { w += c; continue }
      out.push([dict.get(w + c), '']) // 입력이 끝나 다음 문자가 없다
      break
    }
    out.push([w ? dict.get(w) : 0, c])
    dict.set(w + c, dict.size + 1)
    w = ''
  }
  return { out, dict: [...dict.keys()] }
}

// 두 디코더 모두 토큰만 받는다. 사전은 전달받지 않는다
function unlz77(tokens) {
  let o = ''
  for (const [d, l, c] of tokens) {
    for (let k = 0; k < l; k++) o += o[o.length - d] // 방금 쓴 글자도 다시 읽는다
    o += c
  }
  return o
}
function unlz78(tokens) {
  const dict = ['']
  let o = ''
  for (const [i, c] of tokens) {
    const entry = dict[i] + c
    o += entry
    dict.push(entry) // 인코더와 같은 순서로 사전을 다시 쌓는다
  }
  return o
}

const s = 'banana_banana'
const a = lz77(s)
const b = lz78(s)
console.log('LZ77', a.map(([d, l, c]) => `(${d},${l},${c})`).join(' '), unlz77(a) === s)
console.log('LZ78', b.out.map(([i, c]) => `(${i},${c})`).join(' '), unlz78(b.out) === s)
console.log('사전', b.dict.map((e, k) => `${k + 1}:${e}`).join(' '))
```

```text
LZ77 (0,0,b) (0,0,a) (0,0,n) (2,3,_) (7,5,a) true
LZ78 (0,b) (0,a) (0,n) (2,n) (2,_) (1,a) (3,a) (7,) true
사전 1:b 2:a 3:n 4:an 5:a_ 6:ba 7:na
```

## Onde os dois se separam

Os dois decodificadores do código recebem apenas tokens. Isso significa que **o LZ78 também não transmite o dicionário**. O decodificador lê os tokens e adiciona entradas na mesma ordem que o codificador, então o mesmo dicionário é reconstruído. Não transmitir o dicionário é algo que os dois algoritmos têm em comum; onde eles se separam é na **forma de esquecer o conteúdo antigo**. A janela do LZ77 avança e esquece os dados antigos por conta própria. O dicionário do LZ78 continua crescendo se for deixado como está. O artigo original o esvaziava por inteiro sempre que terminava um bloco de comprimento fixo, e as implementações reais limitam o tamanho do dicionário e, quando ele enche, o congelam, o esvaziam ou reutilizam parte das entradas.

A variação mais conhecida do LZ78 é o **LZW** (Lempel-Ziv-Welch). Terry Welch publicou essa melhoria em 1984, e ela foi usada no formato GIF e no utilitário Unix `compress`, associado à extensão `.Z`. As duas implementações colocaram um limite no dicionário. A [especificação GIF89a](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) limita os códigos a 12 bits (valor máximo 4095) e define à parte um Clear code que devolve o dicionário ao estado inicial. Segundo a [página de manual do ncompress](https://github.com/vapier/ncompress/blob/v5.0/compress.1), o `compress` acompanha a taxa de compressão depois que o comprimento do código atinge o limite de `-b` (16 bits por padrão) e, se a taxa cair, descarta o dicionário e o reconstrói do zero.

Cada artigo demonstrou otimalidade assintótica dentro do próprio modelo. O artigo de 1977 mostrou que a taxa de compressão do LZ77 “uniformly approaches the lower bounds” (aproxima-se uniformemente dos limites inferiores) atingíveis por códigos projetados conhecendo a fonte de antemão, e o artigo de 1978 mostrou, para sequências individuais, que o incremental parsing do LZ78 é assintoticamente ótimo. Como os modelos são diferentes, esses resultados sozinhos não permitem comparar os dois.

## Descendentes do LZ77

Então, de qual lado vêm os algoritmos de compressão modernos? A maioria dos algoritmos de compressão predominantes hoje é **descendente do LZ77**.

O **LZSS**, que surgiu do artigo de Storer e Szymanski de 1982, é uma variante do LZ77. Quando uma correspondência é tão curta que o ponteiro ficaria mais longo que o original, ele emite um literal (o caractere original) no lugar do ponteiro.

O **DEFLATE** foi projetado por Phil Katz para o PKZIP 2, e sua especificação foi consolidada em 1996 como RFC 1951. A RFC 1951 descreve o DEFLATE como a combinação do LZ77 com a **codificação de Huffman**, que atribui sequências de bits mais curtas aos símbolos mais frequentes. Sua saída é uma sequência que mistura literais e pares (comprimento, distância), e junta literais e comprimentos de correspondência em um único alfabeto (0 a 285), distinguido por um único código de Huffman. O método de compressão que a maioria dos programas ZIP usa por padrão, assim como GZIP e PNG, usam esse DEFLATE. Ou seja, a maioria dos arquivos `.zip`, `.gz` e `.png` que manipulamos todos os dias é descendente direta do LZ77.

Nenhuma razão isolada explica por que o lado do LZ77 se tornou predominante, mas um ponto que as próprias especificações destacam são as patentes. A RFC 1951 observa que muitas variações do LZ77 são patenteadas e afirma que o formato DEFLATE pode ser implementado facilmente de uma forma não coberta por patentes. A [especificação PNG](https://www.w3.org/TR/png-3/) apresenta o PNG logo no início como um substituto do GIF livre de patentes. O GIF é o formato que usa o LZW visto antes.

Algoritmos posteriores como **LZMA** (usado pelo 7-Zip e pelo XZ), **LZ4** e **Zstd** também partiram da ideia da janela deslizante do LZ77. LZMA e Zstd desenvolveram juntas a busca de correspondências e a codificação de entropia, enquanto o LZ4 abriu mão por completo da codificação de entropia e escolheu a velocidade com um formato orientado a bytes. A família LZ78 continua presente, na forma do LZW, dentro de formatos como o GIF.

## Conclusão

LZ77 e LZ78 partiram da mesma ideia de substituir padrões repetidos por referências curtas. Nenhum dos dois transmite o dicionário e, em ambos, o decodificador o reconstrói, mas eles se separaram em se uma referência aponta para uma posição nos dados já percorridos ou para o número de uma entrada de um dicionário construído à parte, e também esquecem o conteúdo antigo de formas diferentes. Os compressores predominantes que vão do DEFLATE ao LZMA, LZ4 e Zstd descendem do LZ77, enquanto o lado do LZ78 sobrevive como LZW em formatos como o GIF.

Como essa linhagem se reflete na escolha de um formato real, comparando velocidade e taxa de compressão de ZIP, GZIP, ZSTD e XZ e decidindo o que usar para artefatos de build, está em [Entendendo algoritmos de compressão](/240706).

Da próxima vez que você descompactar um arquivo `.zip` ou `.gz`, espero que se lembre de que, lá dentro, circulam instruções como “volte tantos caracteres e copie tantos”.


:::ref
- [paper] [Storer, Szymanski, Data compression via textual substitution (1982)](https://doi.org/10.1145/322344.322346)
- [paper] [Welch, A Technique for High-Performance Data Compression (1984)](https://doi.org/10.1109/MC.1984.1659158)
- [docs] [PKWARE, APPNOTE.TXT: .ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
:::
