---
emoji: 🗜️
title: "Entendendo algoritmos de compressão"
seoTitle: "Compressão comparada: GZIP, Zstandard, Brotli e tar.gz"
date: "2024-07-06"
updatedAt: "2026-10-08"
categories: curiosidades software
description: "Comparamos estrutura, velocidade e taxa de ZIP, GZIP, ZSTD, BZIP2, XZ e Brotli, por que o tar.gz comprime mais que o zip e quando escolher tar.zst."
keywords: "comparação de algoritmos de compressão, GZIP vs ZSTD, tar.gz vs zip, tar.zst, Brotli, arquivo sólido, otimização de build frontend"
locale: pt-BR
translationOf: "240706"
sourceHash: a5d06c7ae79971131aba4105788bf8fc7b1eece63850d584061d9dbf0b356473
---

Neste artigo, quero falar sobre algoritmos de compressão de software.

Este artigo é para desenvolvedores que enviam artefatos de build grandes para um servidor ou armazenamento e estão em dúvida entre zip, tar.gz e tar.zst. Ao final, você saberá onde os principais formatos diferem em velocidade e taxa de compressão e terá critérios para escolher entre tar.gz e tar.zst.

Fiquei responsável por melhorar o processo de deploy de um projeto interno. A arquitetura exigia o envio de artefatos de build muito grandes para o S3, e logo percebi que o tamanho da pasta de build afetava diretamente tanto o tempo de upload quanto o custo de armazenamento. Daí surgiu uma pergunta natural: como poderíamos compactar e enviar esses arquivos de forma mais eficiente?

Quando comecei a pesquisar, encontrei muito mais opções do que esperava: zip, gzip, zstd, bzip2, xz e outras. Os nomes eram parecidos, mas não foi fácil achar uma explicação que deixasse claras as diferenças e os casos de uso de cada uma. (Eu achava que compressão era tudo mais ou menos igual, mas o mundo é grande e há muitas maneiras de diminuir arquivos.)

Antes da comparação, vale destacar uma raiz comum. Quase todos os compressores mais usados hoje descendem do LZ77, publicado em 1977. O LZ77 usa como dicionário um trecho dos dados já processados, a janela deslizante, e substitui padrões repetidos por uma referência curta que significa “volte tantos caracteres e copie tantos”. Uma janela maior captura repetições mais distantes, mas exige mais processamento e memória. O DEFLATE, usado por ZIP e GZIP, acrescenta a isso a codificação de Huffman (uma codificação de entropia que atribui sequências de bits mais curtas aos símbolos mais frequentes). Como o LZ77 se separou do irmão LZ78 está explicado à parte em [A diferença entre LZ77 e LZ78](/240701).

O desempenho de compressão costuma ser avaliado em dois eixos: a **taxa de compressão**, ou quanto o arquivo diminui, e a **velocidade de compressão**, ou quanto tempo o processo leva. Buscar uma taxa maior geralmente exige mais processamento e, portanto, mais tempo. Uma estratégia prática consiste em encontrar o ponto certo entre os dois.

Com essa base, vamos comparar os principais formatos um a um.

## ZIP

ZIP é um formato criado por Phil Katz em 1989. Internamente, costuma usar **DEFLATE**, a combinação de LZ77 com Huffman coding. A distinção importante é que ZIP não é um algoritmo de compressão, mas um formato contêiner que armazena dados comprimidos por algoritmos como DEFLATE.

O ZIP **comprime cada arquivo individualmente**. Essa estrutura, em que cada arquivo é comprimido separadamente, é chamada de arquivo não sólido (Non-solid Archive). A abordagem oposta, que junta todos os arquivos em um único fluxo e o comprime de uma vez, é o arquivo sólido. Graças à estrutura não sólida, é possível extrair um arquivo específico sem descompactar os demais. Em contrapartida, não aproveita dados duplicados entre arquivos, por isso sua taxa pode ser inferior à do tar.gz, que veremos adiante.

Windows, macOS, Linux e a maioria dos sistemas operacionais oferecem suporte sem software adicional. Por isso, é a escolha mais segura quando a compatibilidade entre plataformas é importante.

## GZIP (GNU Zip)

Assim como ZIP, GZIP usa **DEFLATE** internamente. Por que existe um formato separado se o algoritmo é o mesmo? ZIP também funciona como contêiner para vários arquivos, enquanto GZIP é especializado em comprimir **um único arquivo ou fluxo**.

Para comprimir vários arquivos ou um diretório com GZIP, primeiro reunimos tudo em um arquivo TAR e depois comprimimos esse arquivo com GZIP. Esse processo em duas etapas produz um `.tar.gz` ou `.tgz`.

A estrutura do GZIP, definida na RFC 1952, é simples: um **cabeçalho fixo de 10 bytes**, um cabeçalho estendido opcional com informações como nome original e comentários, os dados comprimidos com DEFLATE e um **trailer de 8 bytes** contendo o checksum CRC-32 e o tamanho original. O CRC-32 verifica se os dados descompactados são iguais ao original. Portanto, GZIP é uma camada leve em torno de um fluxo DEFLATE.

O DEFLATE usa uma janela deslizante de **no máximo 32 KB**. Esse limite é importante porque padrões separados por mais de 32 KB não podem se referenciar. O GZIP também oferece níveis de 1 a 9. O nível 1 é rápido, mas produz uma taxa menor, em torno de 60%; o nível 9 é lento, mas chega a aproximadamente 75%. O nível 6 é o padrão e procura equilibrar velocidade e tamanho.

Em ambientes Unix e Linux, GZIP é usado como padrão para distribuir código-fonte, comprimir logs e empacotar software. Também segue comum na compressão HTTP por meio de `Content-Encoding: gzip`, embora o Brotli venha substituindo-o gradualmente nesse uso.

## ZSTD (Zstandard)

ZSTD é um algoritmo desenvolvido por Yann Collet na Meta, antiga Facebook, e publicado como código aberto em 2016. Sua principal vantagem é **comprimir e descomprimir muito mais rápido, mantendo uma taxa comparável à do GZIP**.

Seu funcionamento tem três grandes etapas. Primeiro, um **localizador de correspondências (Match Finder)** da família LZ77 detecta padrões repetidos na entrada. Depois, codifica literais, comprimentos e deslocamentos como **sequências**. Por fim, comprime essas sequências com **codificação de entropia**. Em vez da codificação de Huffman do GZIP, usa **FSE (Finite State Entropy)**, um codificador baseado em ANS (Asymmetric Numeral Systems). O ANS atualiza um único estado inteiro a cada símbolo processado e emite menos bits quanto mais frequente for o símbolo. O objetivo é alcançar uma taxa de compressão próxima à da codificação aritmética (Arithmetic Coding) com velocidade próxima à de Huffman. Huffman só consegue atribuir números inteiros de bits por símbolo; o FSE representa probabilidades equivalentes a bits fracionários e se aproxima mais do limite teórico. (Apesar do nome grandioso, a ideia é apenas expressar os mesmos dados com menos bits de forma mais inteligente.)

O localizador também muda de estratégia conforme o nível. Os níveis baixos, de 1 a 4, usam tabelas hash simples para priorizar velocidade. Os intermediários, de 5 a 12, comparam vários candidatos por uma estratégia Lazy. Os altos, de 13 a 22, usam árvores binárias e programação dinâmica para encontrar correspondências quase ideais. Essa faixa permite aplicar níveis baixos em transmissão em tempo real e altos em arquivamento.

No benchmark Silesia Corpus, o nível padrão 3 do ZSTD comprime a cerca de 300 MB/s e descomprime a aproximadamente 1.200 MB/s. Já o nível padrão 6 do GZIP alcança apenas 34 MB/s e 380 MB/s. **O ZSTD comprime cerca de oito vezes mais rápido e descomprime cerca de três vezes mais rápido, e ainda assim sua taxa é superior: 3,17 contra 3,09 do GZIP.** Esses números mostram com clareza como o ZSTD melhora o compromisso tradicional.

A adoção cresceu rapidamente. O ZSTD é usado na compressão de módulos do kernel Linux e na compressão transparente de sistemas de arquivos; distribuições como Arch Linux, Fedora, Debian e Ubuntu o adotaram como formato padrão de compressão de pacotes. Desde a versão 1.5.7, lançada em fevereiro de 2025, a **compressão multithread fica ativada por padrão** com até quatro threads, ampliando ainda mais a diferença prática em relação ao GZIP single-thread. A AWS também informou ter reduzido em cerca de 30% o armazenamento no S3 ao migrar serviços internos de gzip para zstd.

## BZIP2

O BZIP2 comprime dados por uma sequência de transformações.

1. **RLE (Run-Length Encoding)**: reduz repetições consecutivas nos dados iniciais
2. **BWT (Burrows-Wheeler Transform)**: reorganiza os dados para facilitar a compressão
3. **MTF (Move-to-Front Transform)**: converte a saída do BWT em uma sequência numérica
4. **RLE**: reduz novamente as repetições do resultado do MTF
5. **Huffman Coding**: aplica por fim uma codificação baseada em frequência

O BZIP2 oferece taxa maior que o GZIP, mas tanto a compressão quanto a descompressão são mais lentas. Ele foi usado para arquivamento quando o tamanho importava mais do que a velocidade.

Sua última versão foi a 1.0.8, em 2019, e não está em desenvolvimento ativo. Conforme benchmarks mostram que o ZSTD supera o BZIP2 em taxa e velocidade, projetos novos tendem a escolher ZSTD.

## XZ

XZ é um formato que usa **LZMA2**. LZMA, Lempel-Ziv-Markov chain Algorithm, foi desenvolvido por Igor Pavlov e combina compressão por dicionário baseada em LZ77 com codificação por intervalo (Range Encoding). Em vez de ser apenas uma “versão melhorada do LZMA”, LZMA2 se parece mais com um **formato contêiner** para fluxos LZMA. Ele acrescenta compressão e descompressão multithread e tratamento eficiente para dados que não podem ser comprimidos.

Entre os formatos discutidos aqui, o XZ oferece **a maior taxa de compressão**. O custo é uma compressão muito lenta e alto consumo de memória. É adequado para arquivamento quando economizar espaço é a prioridade absoluta.

Em março de 2024, porém, **foi descoberta uma backdoor no xz-utils, a biblioteca central do XZ, no grave incidente de cadeia de suprimentos CVE-2024-3094**. Uma campanha de engenharia social de dois anos havia obtido permissões de mantenedor, e a vulnerabilidade recebeu a nota máxima CVSS 10.0. As principais distribuições voltaram imediatamente a versões seguras, mas o caso serviu como um alerta importante sobre segurança na cadeia de software open source. (O valor técnico do XZ continua existindo, mas vale considerar esse contexto na escolha de ferramentas.)

## TAR

TAR, Tape Archive, não é um algoritmo de compressão. É uma ferramenta e um formato para **reunir vários arquivos e diretórios em um único arquivo**. Como o nome indica, foi criado originalmente para backups em fita magnética. Como a fita é um meio sequencial, concatenar os dados continuamente era uma estrutura natural.

Sua organização interna é surpreendentemente simples. Tudo é processado em **blocos de 512 bytes**. Cada arquivo começa com um cabeçalho de 512 bytes que contém metadados como nome, com até 100 bytes, modo, UID/GID do proprietário, tamanho, data de modificação e checksum. Os dados vêm depois e recebem padding até um múltiplo de 512 bytes. Dois blocos zerados de 512 bytes marcam o fim do arquivo. A maioria das implementações modernas segue o formato **UStar (Unix Standard TAR)**, definido pelo POSIX, que aceita nomes de até 256 bytes e campos adicionais.

A característica principal é preservar **metadados do sistema de arquivos Unix**, incluindo permissões, propriedade, timestamps e links simbólicos. ZIP nem sempre mantém perfeitamente esses dados específicos do Unix, por isso TAR costuma ser mais adequado para deploys em servidores.

TAR não reduz o tamanho por conta própria; na verdade, cabeçalhos e padding deixam o resultado um pouco maior que o original. A compressão real ocorre ao combiná-lo com GZIP, BZIP2, XZ ou ZSTD. É daí que vêm extensões como `.tar.gz`, `.tar.bz2`, `.tar.xz` e `.tar.zst`. TAR cuida de “agrupar”, e a outra ferramenta, de “reduzir”: um exemplo clássico da filosofia Unix de “fazer bem uma única coisa”.

É o método padrão de arquivamento em Unix/Linux, enquanto o Windows pode precisar de software adicional, como 7-Zip.

## Uma breve introdução ao Brotli

Quem trabalha com frontend também deve conhecer o **Brotli**. O Google desenvolveu esse algoritmo, que em 2015 foi padronizado para compressão de fluxos HTTP como `Content-Encoding: br`.

Todos os navegadores principais oferecem suporte em HTTPS, com cobertura global acima de 96%, e ele costuma produzir arquivos **cerca de 15% a 25% menores que o GZIP**. É especialmente eficaz para arquivos estáticos de texto, como JavaScript, CSS e HTML. Grandes CDNs, incluindo Cloudflare, usam Brotli como padrão, e a prática moderna pode ser resumida em “Brotli primeiro, GZIP como fallback”.

Se os artefatos são enviados para o S3 e servidos por uma CDN, pré-comprimir os arquivos estáticos com Brotli pode reduzir bastante a transferência de rede. (Naquele momento, eu não tinha evidências específicas do projeto suficientes para adotá-lo imediatamente, mas ele continua sendo uma alternativa que vale conhecer e reavaliar.)

## Por que tar.gz comprime melhor que ZIP?

A razão está na diferença entre **arquivos sólidos (Solid Archive)** e **não sólidos (Non-solid Archive)**.

Com tar.gz, o TAR reúne todos os arquivos em um fluxo contínuo e o GZIP comprime esse fluxo inteiro de uma vez. Assim, consegue reconhecer e aproveitar **dados duplicados entre arquivos**. Esse é o modelo de arquivo sólido. Se uma pasta de build contém dezenas de bundles JavaScript com estruturas parecidas, um padrão encontrado no arquivo A pode ser referenciado quando reaparece no B. A sobrecarga também diminui porque não é preciso registrar cabeçalho, checksum e tabela de conteúdos separados para cada fluxo comprimido.

ZIP é não sólido e comprime cada arquivo de forma independente, portanto não aproveita redundâncias entre eles. Mesmo que A e B contenham o mesmo bloco de código, seus fluxos DEFLATE não sabem da existência um do outro. É por isso que tar.gz geralmente obtém uma taxa de 5% a 15% melhor que ZIP. A diferença aumenta quando o artefato contém muitos arquivos de estrutura semelhante.

Arquivos sólidos também têm desvantagens claras.

- Para extrair um único arquivo, pode ser necessário **descomprimir primeiro todos os dados anteriores a ele**. Como tudo pertence a um único fluxo, não é possível saltar diretamente para o meio. ZIP permite acesso aleatório a cada arquivo e pode ser melhor quando itens específicos são extraídos com frequência.
- Se uma parte for corrompida, **todos os dados posteriores ao ponto danificado podem se tornar irrecuperáveis**. Em um formato não sólido, às vezes apenas o arquivo afetado é perdido e o restante permanece intacto.

## Em 2024 escolhi tar.gz. O que escolheria hoje?

Adicionei esta seção em 2026. Na época, escolhi tar.gz por compatibilidade e estabilidade. Depois do upload para o S3, o artefato precisava ser descompactado em vários ambientes, então um formato disponível praticamente em qualquer lugar era a opção segura.

Se eu enfrentasse a mesma situação hoje, consideraria seriamente **tar.zst (TAR + ZSTD)**. Vale lembrar os números anteriores.

O GZIP comprime a 34 MB/s no nível padrão, enquanto o ZSTD chega a 300 MB/s. Para uma pasta de 2 GB, uma conta simples resulta em aproximadamente 60 segundos com GZIP e sete com ZSTD. Considerando ainda o multithreading ativado por padrão desde o ZSTD v1.5.7, com até quatro threads, o tempo real fica ainda menor. Em uma pipeline de CI/CD, essa diferença se acumula a cada deploy, então não é um número desprezível.

```sh
# tar.zst 생성 (멀티스레드 자동 활용)
tar --zstd -cf archive.tar.zst directory/

# 또는 압축 레벨 지정 (-T0은 사용 가능한 모든 코어 활용)
tar -cf archive.tar.zst -I 'zstd -3 -T0' directory/
```

O ZSTD também iguala ou supera a taxa do GZIP, portanto praticamente desaparece o compromisso de aceitar um artefato maior para ganhar velocidade. Ele é mais rápido e produz um resultado menor.

Ainda assim, é essencial verificar se o ambiente de destino consegue descompactar zstd. As principais distribuições Linux já o incluem, e no macOS é fácil instalá-lo pelo Homebrew com `brew install zstd`. Sistemas legados ou instalações mínimas podem exigir uma instalação adicional, então todos os ambientes usados pela equipe devem ser verificados antes. Se compatibilidade for a prioridade absoluta, tar.gz continua sendo a alternativa mais segura.

## Comparação rápida

| Formato    | Algoritmo       | Taxa      | Velocidade | Principais características          |
| ---------- | --------------- | --------- | --------- | ----------------------------------- |
| **ZIP**    | DEFLATE         | Média     | Rápida    | Multiplataforma, não sólido         |
| **GZIP**   | DEFLATE         | Média     | Rápida    | Fluxo único, combinado com TAR      |
| **ZSTD**   | Zstandard       | Alta      | Muito rápida | Níveis ajustáveis, padrão moderno |
| **BZIP2**  | BWT+MTF+Huffman | Alta      | Lenta     | Desenvolvimento praticamente parado |
| **XZ**     | LZMA2           | Muito alta | Muito lenta | Maior taxa, contexto de segurança |
| **Brotli** | Brotli          | Alta      | Média     | Especializado para a web            |

## Conclusão

Antes de me aprofundar em compressão, eu sinceramente pensava: “Não basta colocar tudo em um zip?”. Trabalhar com uma pasta de build maior que 2 GB tornou concreto que a escolha do algoritmo pode mudar de forma significativa o tempo de upload e o custo.

Cada formato tem sua própria filosofia e seus compromissos: a compatibilidade do ZIP, a universalidade do GZIP, a velocidade do ZSTD e a taxa do XZ. Não existe uma opção “melhor” para todos os casos; a escolha certa depende do contexto do projeto.

Entender os princípios das ferramentas que usamos sem pensar ajuda a tomar decisões melhores quando aparece um problema parecido. Espero que este artigo sirva como uma pequena referência para quem precisar escolher um algoritmo de compressão.
