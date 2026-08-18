---
emoji: 🗜️
title: "Entendendo algoritmos de compressão"
seoTitle: "Comparativo de compressão: GZIP, Zstandard, Brotli e os fundamentos do LZ77"
date: "2024-07-06"
categories: 소박한궁금증 소프트웨어
description: "Uma comparação prática entre ZIP, GZIP, ZSTD, Brotli e outros formatos, dos fundamentos do LZ77 à escolha ideal para artefatos de build."
keywords: "comparação de algoritmos de compressão, GZIP vs ZSTD, tar.gz vs zip, Brotli, LZ77, otimização de build frontend, compressão sem perdas"
locale: pt-BR
translationOf: "240706"
sourceHash: "f22dd067bdfcbcb307ebd4df15776267b07fc845a1d9909b7aeee26c73e24d16"
---

Neste artigo, quero falar sobre algoritmos de compressão de software.

Fiquei responsável por melhorar o processo de deploy de um projeto interno. A arquitetura exigia o envio de artefatos de build muito grandes para o S3, e logo percebi que o tamanho da pasta de build afetava diretamente tanto o tempo de upload quanto o custo de armazenamento. Daí surgiu uma pergunta natural: como poderíamos compactar e enviar esses arquivos de forma mais eficiente?

Quando comecei a pesquisar, encontrei muito mais opções do que esperava: zip, gzip, zstd, bzip2, xz e outras. Os nomes eram parecidos, mas não foi fácil achar uma explicação que deixasse claras as diferenças e os casos de uso de cada uma. (Eu achava que compressão era tudo mais ou menos igual, mas o mundo é grande e há muitas maneiras de diminuir arquivos.)

Resolvi então aproveitar a oportunidade para comparar os princípios e as características dos principais formatos e explicar por que acabei escolhendo um deles.

<hr>

## O que é compressão sem perdas?

Compressão sem perdas, ou lossless compression, é um método que permite reconstruir perfeitamente os dados originais. Ao contrário da compressão com perdas usada em imagens e áudio, o conteúdo descompactado não difere do original nem por um único bit. Código-fonte e artefatos de build precisam desse tipo de compressão porque a integridade dos dados é essencial.

A ideia central é **aproveitar a redundância estatística presente nos dados**. Ao substituir padrões repetidos por representações mais curtas, reduzimos o tamanho total.

Entre essas técnicas, os métodos **baseados em dicionário (Dictionary-Based)** formam uma das famílias mais usadas. Aqui, dicionário não é um livro de definições, mas uma tabela de consulta que associa trechos vistos anteriormente a códigos curtos. O **LZ77**, apresentado por Abraham Lempel e Jacob Ziv no artigo de 1977 _"A Universal Algorithm for Sequential Data Compression"_, publicado na IEEE Transactions on Information Theory, e o **LZ78**, publicado no ano seguinte, são os ancestrais dessa família. As letras “LZ” vêm dos sobrenomes dos pesquisadores. Quase todos os algoritmos posteriores baseados em dicionário, como DEFLATE, LZMA, LZ4 e Zstd, têm suas raízes nesses dois. (Não é exagero dizer que boa parte da árvore genealógica da compressão converge em Lempel e Ziv.)

Um exemplo simples ajuda. Se a palavra “Linux” aparecer cem vezes em um texto, o compressor pode registrá-la no dicionário na primeira ocorrência e substituir as seguintes por uma referência curta que signifique “entrada número 1”. “Linux” ocupa cinco bytes, enquanto o ponteiro pode exigir menos, reduzindo o tamanho do conjunto.

Então, qual é exatamente a diferença entre LZ77 e LZ78?

<hr>

### LZ77: a abordagem da janela deslizante

O LZ77 **não cria um dicionário explícito separado**. Em vez disso, usa uma região do próprio fluxo de entrada como dicionário. Essa região é chamada de **janela deslizante** porque avança enquanto os dados são processados. (É o mesmo conceito que aparece com frequência em exercícios de algoritmos.)

A janela é dividida em duas áreas.

- **Buffer de busca (Search Buffer)**: os dados já processados. Ele funciona como o dicionário.
- **Buffer de antecipação (Look-ahead Buffer)**: os dados ainda não processados que serão comprimidos em seguida.

O algoritmo procura saber se o início do buffer de antecipação já apareceu em algum ponto do buffer de busca. Quando encontra o mesmo padrão, codifica a correspondência em uma tupla **(distância, comprimento, próximo caractere)**. A distância indica quantos caracteres é preciso voltar para encontrar o começo do trecho, e o comprimento informa quantos caracteres coincidem.

Imagine compactar a string `"banana_banana"` com LZ77. Ao chegar ao segundo `"banana"`, o algoritmo está efetivamente dizendo: _“Volte sete caracteres e copie os próximos seis.”_ Assim, uma string de seis bytes pode ser representada por apenas dois números.

O ponto principal é que **não é necessário armazenar nem transmitir o dicionário separadamente**. O decodificador reconstrói o buffer de busca naturalmente durante a descompressão, de modo que o dicionário fica implícito nos próprios dados. A contrapartida é que a descompressão precisa avançar sequencialmente desde o início. Em princípio, não é possível começar em um ponto arbitrário no meio do arquivo.

O tamanho da janela tem uma relação direta de compromisso com a taxa de compressão. Uma janela maior consegue referenciar padrões mais distantes e tende a comprimir melhor, mas aumenta o custo da busca e o uso de memória.

<hr>

### LZ78: um dicionário explícito

Ao contrário do LZ77, o LZ78 **constrói um dicionário explícito** durante a compressão. Não há janela deslizante. Padrões observados anteriormente são guardados como entradas indexadas e, quando se repetem, são substituídos pelos índices.

O LZ78 produz unidades na forma **(índice do dicionário, próximo caractere)**. O codificador encontra a entrada mais longa que coincide, emite o índice junto ao caractere que quebra a correspondência e adiciona _“a entrada encontrada mais o novo caractere”_ ao dicionário. Assim, o dicionário cresce aos poucos durante o processamento.

A variação mais famosa do LZ78 é o **LZW** (Lempel-Ziv-Welch). Terry Welch publicou essa melhoria em 1984, e ela foi usada no formato de imagem GIF e no utilitário Unix `compress`, com a extensão `.Z`. (O LZW já esteve no centro de uma disputa de patentes, episódio que contribuiu para o surgimento do PNG.)

<hr>

### De qual família descendem os algoritmos modernos?

Curiosamente, quase todos os algoritmos de compressão dominantes hoje são **descendentes do LZ77**.

O **LZSS**, publicado por Storer e Szymanski em 1982, aprimorou o LZ77 adicionando um indicador de um bit para distinguir se cada saída é um literal, isto é, um caractere original, ou um par comprimento-distância. Quando uma correspondência é curta demais e a referência custaria mais, o codificador simplesmente mantém o caractere original.

Em 1993, Phil Katz combinou o LZSS com a **codificação de Huffman**, que atribui sequências de bits mais curtas aos símbolos mais frequentes, e criou o **DEFLATE**. ZIP, GZIP e PNG usam DEFLATE. Ou seja, os arquivos `.zip`, `.gz` e `.png` que manipulamos todos os dias são descendentes diretos do LZ77.

Algoritmos posteriores como **LZMA** (7-Zip e XZ), **LZ4** e **Zstd** também partem da janela deslizante do LZ77 e evoluem as estruturas de busca e os métodos de codificação de entropia. A família LZ78, por outro lado, praticamente deixou o cenário principal depois do LZW.

Foi provado que os dois algoritmos têm capacidade teórica equivalente _quando todo o conjunto de dados é descompactado_. Ainda assim, o LZ77 sobreviveu porque **incorporar o dicionário aos dados tornou o projeto mais flexível para implementar e estender**. O tamanho da janela, os algoritmos de busca e o codificador de entropia posterior podiam ser combinados livremente, deixando espaço para evoluir com as necessidades de cada época.

O desempenho de compressão costuma ser avaliado em dois eixos: a **taxa de compressão**, ou quanto o arquivo diminui, e a **velocidade de compressão**, ou quanto tempo o processo leva. Buscar uma taxa maior geralmente exige mais processamento e, portanto, mais tempo. Uma estratégia prática consiste em encontrar o ponto certo entre os dois.

Com essa base, vamos comparar os principais formatos um a um.

<hr>

## ZIP

ZIP é um formato criado por Phil Katz em 1989. Internamente, costuma usar **DEFLATE**, a combinação de LZ77 com Huffman coding. A distinção importante é que ZIP não é um algoritmo de compressão, mas um formato contêiner que armazena dados comprimidos por algoritmos como DEFLATE.

O ZIP **comprime cada arquivo individualmente**. Isso é chamado de arquivo não sólido (Non-solid Archive) e permite extrair um arquivo específico sem descompactar os demais. Em contrapartida, não aproveita dados duplicados entre arquivos, por isso sua taxa pode ser inferior à do tar.gz, que veremos adiante.

Windows, macOS, Linux e a maioria dos sistemas operacionais oferecem suporte sem software adicional. Por isso, é uma escolha segura quando a compatibilidade entre plataformas é importante.

<hr>

## GZIP (GNU Zip)

Assim como ZIP, GZIP usa **DEFLATE** internamente. Por que existe um formato separado se o algoritmo é o mesmo? ZIP também funciona como contêiner para vários arquivos, enquanto GZIP é especializado em comprimir **um único arquivo ou fluxo**.

Para comprimir vários arquivos ou um diretório com GZIP, primeiro reunimos tudo em um arquivo TAR e depois comprimimos esse arquivo com GZIP. Esse processo em duas etapas produz um `.tar.gz` ou `.tgz`.

A estrutura do GZIP, definida na RFC 1952, é simples: um **cabeçalho fixo de 10 bytes**, um cabeçalho estendido opcional com informações como nome original e comentários, os dados comprimidos com DEFLATE e um **trailer de 8 bytes** contendo o checksum CRC-32 e o tamanho original. O CRC-32 verifica se os dados descompactados são iguais ao original. Portanto, GZIP é uma camada leve em torno de um fluxo DEFLATE.

O DEFLATE usa uma janela deslizante de **no máximo 32 KB**. Esse limite é importante porque padrões separados por mais de 32 KB não podem se referenciar. O GZIP também oferece níveis de 1 a 9. O nível 1 é rápido, mas produz uma taxa menor, em torno de 60%; o nível 9 é lento, mas chega a aproximadamente 75%. O nível 6 é o padrão e procura equilibrar velocidade e tamanho.

Em ambientes Unix e Linux, GZIP é usado como padrão para distribuir código-fonte, comprimir logs e empacotar software. Também segue comum na compressão HTTP por meio de `Content-Encoding: gzip`, embora o Brotli venha substituindo-o gradualmente nesse uso.

<hr>

## ZSTD (Zstandard)

ZSTD é um algoritmo desenvolvido por Yann Collet na Meta, antiga Facebook, e publicado como código aberto em 2016. Sua principal vantagem é **comprimir e descomprimir muito mais rápido, mantendo uma taxa comparável à do GZIP**.

Seu funcionamento tem três grandes etapas. Primeiro, um **localizador de correspondências (Match Finder)** da família LZ77 detecta padrões repetidos na entrada. Depois, codifica literais, comprimentos e deslocamentos como **sequências**. Por fim, comprime essas sequências com **codificação de entropia**. Em vez de depender apenas de Huffman como o GZIP, usa **FSE (Finite State Entropy)**, um codificador baseado em ANS (Asymmetric Numeral Systems) que combina propriedades de Huffman e da codificação aritmética (Arithmetic Coding). Huffman só consegue atribuir números inteiros de bits por símbolo; o FSE representa probabilidades equivalentes a bits fracionários e se aproxima mais do limite teórico. (Apesar do nome grandioso, a ideia é apenas expressar os mesmos dados com menos bits de forma mais inteligente.)

O localizador também muda de estratégia conforme o nível. Os níveis baixos, de 1 a 4, usam tabelas hash simples para priorizar velocidade. Os intermediários, de 5 a 12, comparam vários candidatos por uma estratégia Lazy. Os altos, de 13 a 22, usam árvores binárias e programação dinâmica para encontrar correspondências quase ideais. Essa faixa permite aplicar níveis baixos em transmissão em tempo real e altos em arquivamento.

No benchmark Silesia Corpus, o nível padrão 3 do ZSTD comprime a cerca de 300 MB/s e descomprime a aproximadamente 1.200 MB/s. Já o nível padrão 6 do GZIP alcança apenas 34 MB/s e 380 MB/s. **O ZSTD comprime cerca de oito vezes mais rápido e descomprime três vezes mais rápido, enquanto sua taxa é ligeiramente melhor: 3,17 contra 3,09 do GZIP.** Esses números mostram com clareza como o ZSTD melhora o compromisso tradicional.

A adoção cresceu rapidamente. O ZSTD é usado na compressão de módulos do kernel Linux e na compressão transparente de sistemas de arquivos; distribuições como Arch Linux, Fedora, Debian e Ubuntu o adotaram para pacotes. Desde a versão 1.5.7, lançada em fevereiro de 2025, a **compressão multithread fica ativada por padrão** com até quatro threads, ampliando ainda mais a diferença prática em relação ao GZIP single-thread. A AWS também informou ter reduzido em cerca de 30% o armazenamento no S3 ao migrar serviços internos de gzip para zstd.

<hr>

## BZIP2

O BZIP2 comprime dados por uma sequência de transformações.

1. **RLE (Run-Length Encoding)**: reduz repetições consecutivas nos dados iniciais
2. **BWT (Burrows-Wheeler Transform)**: reorganiza os dados para facilitar a compressão
3. **MTF (Move-to-Front Transform)**: converte a saída do BWT em uma sequência numérica
4. **RLE**: reduz novamente as repetições do resultado do MTF
5. **Huffman Coding**: aplica por fim uma codificação baseada em frequência

O BZIP2 oferece taxa maior que o GZIP, mas tanto a compressão quanto a descompressão são mais lentas. Ele foi usado para arquivamento quando o tamanho importava mais do que a velocidade.

Sua última versão foi a 1.0.8, em 2019, e o desenvolvimento ativo praticamente parou. Conforme benchmarks mostram que o ZSTD supera o BZIP2 em taxa e velocidade, projetos novos tendem a escolher ZSTD.

<hr>

## XZ

XZ é um formato que usa **LZMA2**. LZMA, Lempel-Ziv-Markov chain Algorithm, foi desenvolvido por Igor Pavlov e combina compressão por dicionário baseada em LZ77 com codificação por intervalo (Range Encoding). Em vez de ser apenas uma “versão melhorada do LZMA”, LZMA2 se parece mais com um **formato contêiner** para fluxos LZMA. Ele acrescenta compressão e descompressão multithread e tratamento eficiente para dados que não podem ser comprimidos.

Entre os formatos discutidos aqui, o XZ oferece **a maior taxa de compressão**. O custo é uma compressão muito lenta e alto consumo de memória. É adequado para arquivamento quando economizar espaço é a prioridade absoluta.

Em março de 2024, porém, **foi descoberta uma backdoor no xz-utils, a biblioteca central do XZ, no grave incidente de cadeia de suprimentos CVE-2024-3094**. Uma campanha de engenharia social de dois anos havia obtido permissões de mantenedor, e a vulnerabilidade recebeu a nota máxima CVSS 10.0. As principais distribuições voltaram imediatamente a versões seguras, mas o caso serviu como um alerta importante sobre segurança na cadeia de software open source. (O valor técnico do XZ continua existindo, mas vale considerar esse contexto na escolha de ferramentas.)

<hr>

## TAR

TAR, Tape Archive, não é um algoritmo de compressão. É uma ferramenta e um formato para **reunir vários arquivos e diretórios em um único arquivo**. Como o nome indica, foi criado originalmente para backups em fita magnética. Como a fita é um meio sequencial, concatenar os dados continuamente era uma estrutura natural.

Sua organização interna é surpreendentemente simples. Tudo é processado em **blocos de 512 bytes**. Cada arquivo começa com um cabeçalho de 512 bytes que contém metadados como nome, com até 100 bytes, modo, UID/GID do proprietário, tamanho, data de modificação e checksum. Os dados vêm depois e recebem padding até um múltiplo de 512 bytes. Dois blocos zerados de 512 bytes marcam o fim do arquivo. A maioria das implementações modernas segue o formato **UStar (Unix Standard TAR)**, definido pelo POSIX, que aceita nomes de até 256 bytes e campos adicionais.

A característica principal é preservar **metadados do sistema de arquivos Unix**, incluindo permissões, propriedade, timestamps e links simbólicos. ZIP nem sempre mantém perfeitamente esses dados específicos do Unix, por isso TAR costuma ser mais adequado para deploys em servidores.

TAR não reduz o tamanho por conta própria; cabeçalhos e padding podem até deixar o resultado um pouco maior. A compressão real ocorre ao combiná-lo com GZIP, BZIP2, XZ ou ZSTD. É daí que vêm extensões como `.tar.gz`, `.tar.bz2`, `.tar.xz` e `.tar.zst`. TAR cuida de “agrupar”, e a outra ferramenta, de “reduzir”: um exemplo clássico da filosofia Unix de “fazer bem uma única coisa”.

É o método padrão de arquivamento em Unix/Linux, enquanto o Windows pode precisar de software adicional, como 7-Zip.

<hr>

## Uma breve introdução ao Brotli

Quem trabalha com frontend também deve conhecer o **Brotli**. O Google desenvolveu esse algoritmo, que em 2015 foi padronizado para compressão de fluxos HTTP como `Content-Encoding: br`.

Todos os navegadores principais oferecem suporte em HTTPS, com cobertura global acima de 96%, e ele costuma produzir arquivos **cerca de 15% a 25% menores que o GZIP**. É especialmente eficaz para arquivos estáticos de texto, como JavaScript, CSS e HTML. Grandes CDNs, incluindo Cloudflare, usam Brotli como padrão, e a prática moderna pode ser resumida em “Brotli primeiro, GZIP como fallback”.

Se os artefatos são enviados para o S3 e servidos por uma CDN, pré-comprimir os arquivos estáticos com Brotli pode reduzir bastante a transferência de rede. (Naquele momento, eu não tinha evidências específicas do projeto suficientes para adotá-lo imediatamente, mas ele continua sendo uma alternativa que vale conhecer e reavaliar.)

<hr>

## Por que tar.gz comprime melhor que ZIP?

A razão está na diferença entre **arquivos sólidos (Solid Archive)** e **não sólidos (Non-solid Archive)**.

Com tar.gz, o TAR reúne todos os arquivos em um fluxo contínuo e o GZIP comprime esse fluxo inteiro de uma vez. Assim, consegue reconhecer e aproveitar **dados duplicados entre arquivos**. Esse é o modelo de arquivo sólido. Se uma pasta de build contém dezenas de bundles JavaScript com estruturas parecidas, um padrão encontrado no arquivo A pode ser referenciado quando reaparece no B. A sobrecarga também diminui porque não é preciso registrar cabeçalho, checksum e tabela de conteúdos separados para cada fluxo comprimido.

ZIP é não sólido e comprime cada arquivo de forma independente, portanto não aproveita redundâncias entre eles. Mesmo que A e B contenham o mesmo bloco de código, seus fluxos DEFLATE não sabem da existência um do outro. É por isso que tar.gz geralmente obtém uma taxa de 5% a 15% melhor que ZIP. A diferença aumenta quando o artefato contém muitos arquivos de estrutura semelhante.

Arquivos sólidos também têm desvantagens claras.

- Para extrair um único arquivo, pode ser necessário **descomprimir primeiro todos os dados anteriores a ele**. Como tudo pertence a um único fluxo, não é possível saltar diretamente para o meio. ZIP permite acesso aleatório a cada arquivo e pode ser melhor quando itens específicos são extraídos com frequência.
- Se uma parte for corrompida, **todos os dados posteriores ao ponto danificado podem se tornar irrecuperáveis**. Em um formato não sólido, às vezes apenas o arquivo afetado é perdido e o restante permanece intacto.

<hr>

**Adicionado em 2026**

## Em 2024 escolhi tar.gz. O que escolheria hoje?

Na época, escolhi tar.gz por compatibilidade e estabilidade. Depois do upload para o S3, o artefato precisava ser descompactado em vários ambientes, então um formato disponível praticamente em qualquer lugar era a opção segura.

Se eu enfrentasse a mesma situação hoje, consideraria seriamente **tar.zst (TAR + ZSTD)**. Vale lembrar os números anteriores.

O GZIP comprime a 34 MB/s no nível padrão, enquanto o ZSTD chega a 300 MB/s. Para uma pasta de 2 GB, uma conta simples resulta em aproximadamente 60 segundos com GZIP e sete com ZSTD. Considerando ainda o multithreading ativado por padrão desde o ZSTD v1.5.7, com até quatro threads, a diferença prática pode ser maior. Em uma pipeline de CI/CD, esses segundos se acumulam a cada deploy.

```sh
# tar.zst 생성 (멀티스레드 자동 활용)
tar --zstd -cf archive.tar.zst directory/

# 또는 압축 레벨 지정 (-T0은 사용 가능한 모든 코어 활용)
tar -cf archive.tar.zst -I 'zstd -3 -T0' directory/
```

O ZSTD também iguala ou supera a taxa do GZIP, portanto praticamente desaparece o compromisso de aceitar um artefato maior para ganhar velocidade. Ele é mais rápido e produz um resultado menor.

Ainda assim, é essencial verificar se o ambiente de destino consegue descompactar zstd. As principais distribuições Linux já o incluem, e no macOS é fácil instalá-lo pelo Homebrew com `brew install zstd`. Sistemas legados ou instalações mínimas podem exigir uma instalação adicional, então todos os ambientes usados pela equipe devem ser verificados antes. Se compatibilidade for a prioridade absoluta, tar.gz continua sendo a alternativa mais segura.

<hr>

## Comparação rápida

| Formato    | Algoritmo       | Taxa      | Velocidade | Principais características          |
| ---------- | --------------- | --------- | --------- | ----------------------------------- |
| **ZIP**    | DEFLATE         | Média     | Rápida    | Multiplataforma, não sólido         |
| **GZIP**   | DEFLATE         | Média     | Rápida    | Fluxo único, combinado com TAR      |
| **ZSTD**   | Zstandard       | Alta      | Muito rápida | Níveis ajustáveis, padrão moderno |
| **BZIP2**  | BWT+MTF+Huffman | Alta      | Lenta     | Desenvolvimento praticamente parado |
| **XZ**     | LZMA2           | Muito alta | Muito lenta | Maior taxa, contexto de segurança |
| **Brotli** | Brotli          | Alta      | Média     | Especializado para a web            |

<hr>

## Conclusão

Antes de me aprofundar em compressão, eu sinceramente pensava: “Não basta colocar tudo em um zip?”. Trabalhar com uma pasta de build maior que 2 GB tornou concreto que a escolha do algoritmo pode mudar de forma significativa o tempo de upload e o custo.

Cada formato tem sua própria filosofia e seus compromissos: a compatibilidade do ZIP, a universalidade do GZIP, a velocidade do ZSTD e a taxa do XZ. Não existe uma opção “melhor” para todos os casos; a escolha certa depende do contexto do projeto.

Entender os princípios das ferramentas que usamos sem pensar ajuda a tomar decisões melhores quando aparece um problema parecido. Espero que este artigo sirva como uma pequena referência para quem precisar escolher um algoritmo de compressão.
