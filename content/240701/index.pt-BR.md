---
emoji: 🧬
title: "A diferença entre LZ77 e LZ78"
seoTitle: "LZ77 vs LZ78: janela deslizante, dicionário e DEFLATE"
date: "2024-07-01"
categories: curiosidades software
description: "Como LZ77 e LZ78 diferem no uso do dicionário e por que, via LZSS e DEFLATE, ZIP, GZIP e Zstd acabaram todos na família LZ77."
keywords: "LZ77, LZ78, LZ77 vs LZ78, algoritmo LZ77, compressão com janela deslizante, LZW, como funciona o DEFLATE, compressão baseada em dicionário"
locale: pt-BR
translationOf: '240701'
sourceHash: 9e352eeafc2f7c4dce1defdd07912f7b310a670699148fa366b843c7814bf731
---

Neste artigo, quero falar sobre **como LZ77 e LZ78 diferem**.

Este artigo é para desenvolvedores que usam ferramentas como zip, gzip e zstd e já se perguntaram como funciona a compressão baseada em dicionário dentro delas. Ao final, você conseguirá explicar como os dois algoritmos diferem no tratamento do dicionário e por que quase todos os compressores mais usados hoje descendem do LZ77.

Ao comparar formatos para compactar artefatos de build, cedo ou tarde se acaba voltando a esses dois algoritmos.

<hr>

## O que é compressão sem perdas?

Compressão sem perdas, ou lossless compression, é um método que permite reconstruir perfeitamente os dados originais. Ao contrário da compressão com perdas usada em imagens e áudio, o conteúdo descompactado não difere do original nem por um único bit. Código-fonte e artefatos de build precisam desse tipo de compressão porque a integridade dos dados é essencial.

A ideia central é **aproveitar a redundância estatística presente nos dados**. Ao substituir padrões repetidos por representações mais curtas, reduzimos o tamanho total.

Entre essas técnicas, os métodos **baseados em dicionário (Dictionary-Based)** formam uma das famílias mais usadas. Aqui, dicionário não é um livro de definições, mas uma tabela de consulta que associa trechos vistos anteriormente a códigos curtos. O **LZ77**, apresentado por Abraham Lempel e Jacob Ziv no artigo de 1977 **"A Universal Algorithm for Sequential Data Compression"**, publicado na IEEE Transactions on Information Theory, e o **LZ78**, publicado no ano seguinte, são os ancestrais dessa família. As letras “LZ” vêm dos sobrenomes dos pesquisadores. Quase todos os algoritmos posteriores baseados em dicionário, como DEFLATE, LZMA, LZ4 e Zstd, têm suas raízes nesses dois. (Não é exagero dizer que boa parte da árvore genealógica da compressão converge em Lempel e Ziv.)

Um exemplo simples ajuda. Se a palavra “Linux” aparecer cem vezes em um texto, o compressor pode registrá-la no dicionário na primeira ocorrência e substituir as seguintes por uma referência curta que signifique “entrada número 1”. “Linux” ocupa cinco bytes, enquanto o ponteiro pode exigir menos, reduzindo o tamanho do conjunto.

Então, qual é exatamente a diferença entre LZ77 e LZ78?

<hr>

### LZ77: a abordagem da janela deslizante

O LZ77 **não cria um dicionário explícito separado**. Em vez disso, usa uma região do próprio fluxo de entrada como dicionário. Essa região é chamada de **janela deslizante** porque avança enquanto os dados são processados. (É o mesmo conceito que aparece com frequência em exercícios de algoritmos.)

A janela é dividida em duas áreas.

- **Buffer de busca (Search Buffer)**: os dados já processados. Ele funciona como o dicionário.
- **Buffer de antecipação (Look-ahead Buffer)**: os dados ainda não processados que serão comprimidos em seguida.

O algoritmo procura saber se o início do buffer de antecipação já apareceu em algum ponto do buffer de busca. Quando encontra o mesmo padrão, codifica a correspondência em uma tupla **(distância, comprimento, próximo caractere)**. A distância indica quantos caracteres é preciso voltar para encontrar o começo do trecho, e o comprimento informa quantos caracteres coincidem.

Imagine compactar a string `"banana_banana"` com LZ77. Ao chegar ao segundo `"banana"`, o algoritmo está efetivamente dizendo: **“Volte sete caracteres e copie os próximos seis.”** Assim, uma string de seis bytes pode ser representada por apenas dois números.

O ponto principal é que **não é necessário armazenar nem transmitir o dicionário separadamente**. O decodificador reconstrói o buffer de busca naturalmente durante a descompressão, de modo que o dicionário fica implícito nos próprios dados. A contrapartida é que a descompressão precisa avançar sequencialmente desde o início. Em princípio, não é possível começar em um ponto arbitrário no meio do arquivo.

O tamanho da janela tem uma relação direta de compromisso com a taxa de compressão. Uma janela maior consegue referenciar padrões mais distantes e tende a comprimir melhor, mas aumenta o custo da busca e o uso de memória.

<hr>

### LZ78: um dicionário explícito

Ao contrário do LZ77, o LZ78 **constrói um dicionário explícito** durante a compressão. Não há janela deslizante. Padrões observados anteriormente são guardados como entradas indexadas e, quando se repetem, são substituídos pelos índices.

O LZ78 produz unidades na forma **(índice do dicionário, próximo caractere)**. O codificador encontra a entrada mais longa que coincide, emite o índice junto ao caractere que quebra a correspondência e adiciona **“a entrada encontrada mais o novo caractere”** ao dicionário. Assim, o dicionário cresce aos poucos durante o processamento.

A variação mais famosa do LZ78 é o **LZW** (Lempel-Ziv-Welch). Terry Welch publicou essa melhoria em 1984, e ela foi usada no formato de imagem GIF e no utilitário Unix `compress`, com a extensão `.Z`. (O LZW já esteve no centro de uma disputa de patentes, episódio que contribuiu para o surgimento do PNG.)

<hr>

### De qual família descendem os algoritmos modernos?

Curiosamente, quase todos os algoritmos de compressão dominantes hoje são **descendentes do LZ77**.

O **LZSS**, publicado por Storer e Szymanski em 1982, aprimorou o LZ77 adicionando um indicador de um bit para distinguir se cada saída é um literal, isto é, um caractere original, ou um par comprimento-distância. Quando uma correspondência é curta demais e a referência custaria mais, o codificador simplesmente mantém o caractere original.

Em 1993, Phil Katz combinou o LZSS com a **codificação de Huffman**, que atribui sequências de bits mais curtas aos símbolos mais frequentes, e criou o **DEFLATE**. ZIP, GZIP e PNG usam DEFLATE. Ou seja, os arquivos `.zip`, `.gz` e `.png` que manipulamos todos os dias são descendentes diretos do LZ77.

Algoritmos posteriores como **LZMA** (7-Zip e XZ), **LZ4** e **Zstd** também partem da janela deslizante do LZ77 e evoluem as estruturas de busca e os métodos de codificação de entropia. A família LZ78, por outro lado, praticamente deixou o cenário principal depois do LZW.

Foi provado que os dois algoritmos têm capacidade teórica equivalente **quando todo o conjunto de dados é descompactado**. Ainda assim, o LZ77 sobreviveu porque **incorporar o dicionário aos dados tornou o projeto mais flexível para implementar e estender**. O tamanho da janela, os algoritmos de busca e o codificador de entropia posterior podiam ser combinados livremente, deixando espaço para evoluir com as necessidades de cada época.

<hr>

## Conclusão

LZ77 e LZ78 partiram da mesma ideia, substituir padrões repetidos por referências curtas, mas divergiram quanto a manter o dicionário dentro dos dados ou construí-lo à parte. Embora sua capacidade teórica seja equivalente, quem sobreviveu foi o LZ77, cujo tamanho de janela, busca de correspondências e codificador de entropia podiam ser trocados.

Como essa linhagem se reflete na escolha de um formato real, comparando velocidade e taxa de compressão de ZIP, GZIP, ZSTD e XZ e decidindo o que usar para artefatos de build, está em [Entendendo algoritmos de compressão](/240706).

Da próxima vez que você descompactar um arquivo `.zip` ou `.gz`, espero que se lembre de que, lá dentro, circulam instruções como “volte tantos caracteres e copie tantos”.


### Referências

:::ref
- [paper] [Ziv, Lempel, A Universal Algorithm for Sequential Data Compression (1977)](https://doi.org/10.1109/TIT.1977.1055714)
- [paper] [Ziv, Lempel, Compression of Individual Sequences via Variable-Rate Coding (1978)](https://doi.org/10.1109/TIT.1978.1055934)
:::
