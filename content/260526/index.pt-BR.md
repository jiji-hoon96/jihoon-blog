---
emoji: 🔎
title: "Quatro camadas de inteligência de código"
seoTitle: "Inteligência de código: Repomix, Aider, CodeGraph e Serena"
date: "2026-05-26"
categories: IA Ferramentas-de-desenvolvimento Claude MCP CodeGraph
description: "Quatro camadas de ferramentas que barateiam a busca de código de agentes de IA: Repomix, mapas tree-sitter, o grafo do CodeGraph e Serena com LSP."
keywords: "inteligência de código, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, economia de tokens agente de IA"
locale: pt-BR
translationOf: '260526'
sourceHash: 2efbc6c2bee1d73d457d75006378b5a689f2098be54a67edc2da20b38b07a9d0
---

Neste post, quero falar sobre **como diferem entre si as ferramentas que reduzem o custo de um agente de programação com IA encontrar o código relevante**.

Este texto é para quem já viu um agente gastar tokens repetindo grep e leituras de arquivos em uma base de código grande e está em dúvida sobre qual ferramenta adicionar, como Repomix, CodeGraph ou Serena. Ao final, você saberá distinguir como essas ferramentas diferem conforme a profundidade com que entendem o código e onde cada abordagem reduz o custo de busca. Essa profundidade se divide em quatro: o empacotamento de contexto, que coloca o código inteiro como texto; os mapas de repositório com tree-sitter, que sabem que um símbolo existe; os grafos de conhecimento, que armazenam de antemão as relações entre símbolos; e o LSP, que sabe o que esse símbolo é.

Desde que vi o `codegraph` no GitHub Trending e o instalei, toda vez que encontro uma ferramenta nova fico curioso sobre o princípio pelo qual ela economiza tokens.


## Ferramentas de inteligência de código

Em codebases grandes, a maior parte do custo de um agente de IA não está na alteração do código em si, mas em **descobrir onde está o código relevante**. Se toda tarefa começa com um ciclo de grep → read → filtragem → grep novamente, tokens, tempo e tool calls são desperdiçados. As ferramentas de inteligência de código são diferentes tentativas de reduzir esse custo de busca.

Eu divido essas tentativas nas quatro camadas (tier) abaixo. Não é uma classificação consagrada no setor, mas uma divisão minha, baseada na profundidade com que cada ferramenta entende o código.


### Empacotamento de contexto

A solução mais simples parte da ideia de “**colocar tudo em uma única janela de contexto**”. Não cria grafo nem índice: apenas serializa todo o repositório como um bloco de texto e o entrega inteiro ao modelo.

Uma ferramenta representativa é o **Repomix**. Ele empacota todo o repositório em uma estrutura otimizada para o parsing de XML do Claude. Com CLI, web, extensão e servidor MCP, possui o ecossistema mais completo.

O **GitIngest** é conhecido pela experiência sem atrito. Basta trocar uma palavra em uma URL do GitHub, substituindo `github.com` por `gitingest.com`, para transformar todo o repositório em uma página de texto. (Por exemplo, `github.com/facebook/react` → `gitingest.com/facebook/react`.) Como a única ação necessária é trocar uma palavra na barra de endereço do navegador, não há instalação. É especializado em exploração rápida e pontual.

O **code2prompt** (criado por Mufeed VH) é uma CLI baseada em Rust cujo ponto forte é a personalização por um sistema de templates.

Também vale mencionar uma variação interessante: **rtk** (`rtk-ai/rtk`, cerca de 55k stars). Enquanto as ferramentas anteriores “empacotam todo o repositório de uma vez”, o rtk **comprime em tempo real a própria saída dos comandos de CLI**. É um único binário escrito em Rust que se registra automaticamente nos shell hooks de 13 ferramentas, entre elas Claude Code, Cursor, Copilot, Gemini CLI e Codex. Assim, quando o agente chama `git status`, a chamada é reescrita internamente como `rtk git status`. (O principal diferencial é que o usuário não precisa mudar seu workflow.) A ferramenta aplica heurísticas de smart filtering, grouping, truncation e deduplication a mais de 100 comandos, reduzindo os tokens de saída em 60–90%. Uma frase do site oficial resume bem essa categoria: **“70% of your bill is noise the LLM doesn't need.”** Enquanto as ferramentas anteriores reduzem a quantidade de “contexto que entra”, o rtk reduz a quantidade de “contexto que volta como resultado de uma tool call”.

O limite dessa camada, porém, é claro: **repositórios grandes atingem o limite de tokens.** Além disso, o código é entregue apenas como “um bloco de texto”, sem relações entre símbolos nem compreensão estrutural.


### Mapa do repositório com tree-sitter

A camada seguinte usa **tree-sitter** para analisar a estrutura do código, mas sem executar um servidor de índice separado.

**AST (Abstract Syntax Tree, árvore sintática abstrata)** é uma estrutura de dados que representa o código-fonte como árvore. É o resultado da etapa de análise sintática de um compilador: detalhes superficiais, como espaços, ponto e vírgula e parênteses, são removidos, enquanto elementos significativos — variáveis, operadores, chamadas de função e fluxo de controle — permanecem como nós. Toda análise precisa feita por ferramentas de inteligência de código acaba se apoiando em uma AST.

**tree-sitter** é um gerador de parsers open source e uma biblioteca de parsing incremental. Foi adotado pela navegação de código do GitHub, pelo Neovim, Zed e Helix. Seu principal diferencial é **refazer o parsing apenas da parte editada**. Mesmo que uma linha seja alterada no editor, ele não analisa o arquivo inteiro outra vez; apenas aplica um patch à árvore modificada. Por isso, responde rapidamente e também é adequado para agentes de IA examinarem o código com agilidade.

O **Aider**, ferramenta de programação em par com IA usada no terminal, é um exemplo representativo dessa abordagem. Ele usa tree-sitter para extrair dos arquivos-fonte definições de símbolos como funções, classes e métodos; constrói um grafo em que arquivos são nós e dependências entre arquivos são arestas; e aplica ao grafo um algoritmo de ranking da família PageRank (que mede a importância de uma página pela quantidade e pela qualidade dos links que apontam para ela). Assim, extrai apenas as principais definições e assinaturas dentro do orçamento de tokens. (O padrão `--map-tokens=1024` gera um mapa do repositório de 1k tokens.)

O **AFT** (`cortexkit/aft`) desenvolve essa abordagem com mais precisão. Traduzindo diretamente a explicação do README oficial do AFT: **“Ler um arquivo de 500 linhas custa cerca de 375 tokens. Mas, quando o agente geralmente precisa de apenas uma função, passar o nome do símbolo a `aft_zoom` retorna somente essa função e um pouco de contexto. Isso custa cerca de 40 tokens.”** Além disso, edições baseadas em número de linha quebram assim que o código acima do alvo se move, enquanto a edição em modo de símbolo do AFT é estável por endereçar uma função pelo nome.

Há outra ferramenta digna de nota nessa camada: **ast-grep** (`ast-grep/ast-grep`, cerca de 13,9k stars). É uma CLI de busca estrutural e rewriting baseada em tree-sitter. Sua diferença decisiva em relação ao grep convencional é que ela procura padrões de CST (Concrete Syntax Tree), não texto. Por exemplo, uma busca pelo padrão `console.log($A)` encontra com precisão todas as chamadas com a mesma estrutura semântica, independentemente da aparência do texto. Existe também um servidor `ast-grep-mcp`, que permite a agentes de IA usar busca estrutural no lugar do grep textual.


### Knowledge Graph

A terceira camada vai além: **todo o codebase é previamente analisado para criar um grafo de conhecimento, que é salvo em disco**, e o agente faz queries nesse grafo armazenado. O exemplo que mais vem chamando atenção é uma ferramenta chamada **CodeGraph**.

A arquitetura é surpreendentemente simples. O código é analisado com **tree-sitter**; em seguida, os símbolos, as arestas e as informações de arquivos extraídos são armazenados na busca de texto integral FTS5 do SQLite; por fim, esse grafo de conhecimento é exposto ao agente de IA via MCP. Um ponto importante é que **toda essa extração é feita de maneira determinística por parsing de AST, não por resumo de LLM**, o que elimina espaço para alucinações.

O **FTS5 (SQLite Full-Text Search 5)** mencionado aqui é uma extensão de busca de texto integral fornecida como tabela virtual do SQLite. Ele faz parte da amalgamation desde o SQLite 3.9.0 (2015-10-14). A tabela é criada com `CREATE VIRTUAL TABLE ... USING fts5(...)` e consultada pelo operador `MATCH`. A vantagem decisiva é poder manter um índice de texto integral em um único arquivo SQLite sem executar um mecanismo de busca separado, como o Elasticsearch. Esse é um dos motivos pelos quais o CodeGraph pode anunciar “operação 100% local”.

Já a palavra **determinístico (deterministic)**, usada acima, significa que o mesmo código sempre produz o mesmo resultado. Se um LLM resumisse o código para criar o grafo, o resultado poderia variar mesmo para o mesmo código, com risco de alucinações. Ao analisar a AST diretamente, por outro lado, as relações entre símbolos são extraídas apenas segundo as regras da gramática da linguagem, sem espaço para esse tipo de interpretação. É por isso que esse princípio é central no CodeGraph.

Os benchmarks também impressionam. Uma comparação executou Claude Opus 4.7 em modo headless com e sem o MCP do CodeGraph. Segundo as médias do README oficial, com o CodeGraph o custo caiu **35%**, o uso de tokens caiu **57%**, a execução ficou **46% mais rápida** e as **tool calls diminuíram 71%**. O ganho cresce proporcionalmente ao tamanho do codebase: em um repositório grande como Tokio, foram medidos até 82% de redução de custo, 86% de redução de tokens, 71% de aumento de velocidade e 92% de redução nas tool calls. (Sem CodeGraph, o agente espalha amplamente grep/find/Read; com CodeGraph, uma única query ao índice substitui tudo isso.)

O contexto acadêmico também é profundo. O **GraphCoder** (ASE 2024) criou um Code Context Graph que integra control flow e data/control dependence. O **CodexGraph** (NAACL 2025) fez agentes LLM escreverem e executarem diretamente queries em bancos de dados de grafos. O **Prometheus** combinou um grafo de conhecimento baseado em tree-sitter com memória integrada e aplicou a solução de issues multilíngues. É evidente que academia e indústria estão convergindo simultaneamente nessa direção.

Vale observar uma variação interessante. **A indexação do Cursor** segue um caminho diferente: busca semântica baseada em vector embeddings, não em grafo de AST. Localmente, os arquivos são divididos em chunks por função e classe e sincronizados com o servidor por hashes de Merkle tree; apenas os embeddings são armazenados em um banco de dados vetorial chamado Turbopuffer. (O ponto central do modelo de privacidade é que o código-fonte original não é armazenado na cloud.) Na consulta, a pergunta é convertida em embedding para executar uma busca de nearest neighbors; os caminhos e intervalos de linhas retornados são então lidos localmente e enviados ao LLM. Como a ferramenta busca **“código semanticamente relacionado” em vez de “símbolos exatos”**, tem precisão menor, mas funciona bem com consultas em linguagem natural. CodeGraph e a indexação do Cursor resolvem o mesmo problema — o custo de busca — com premissas diferentes.


### LSP

A última camada **depende diretamente de servidores de linguagem**. Enquanto tree-sitter sabe “que um símbolo existe”, LSP sabe “o que esse símbolo é”.

**LSP (Language Server Protocol)** é um protocolo aberto baseado em JSON-RPC que padroniza a comunicação entre editores de código/IDEs e “ferramentas de inteligência de linguagem”, como code completion, go to definition, find references e refactoring. Ele foi padronizado em conjunto por Microsoft, Red Hat e Codenvy em 2016. A ideia central é: “em vez de reimplementar um analisador de linguagem em cada editor, mantenha um servidor por linguagem e faça todos os editores consultarem esse servidor”. (O servidor de TypeScript, o Rust analyzer e o pyright do Python são todos servidores LSP.)

Vejamos um exemplo concreto da diferença. O LSP do TypeScript sabe que `UserService` implementa a interface `IUserService`, quais parâmetros de tipo genérico recebe, quais overloads possui e qual é seu tipo de retorno. tree-sitter não chega a esse nível.

O Serena é uma ferramenta que pertence exatamente a essa camada.

**Serena** (`oraios/serena`) é uma das ferramentas mais citadas entre os servidores MCP voltados a agentes de programação. Em maio de 2026, tinha cerca de 24,7k stars e, em aproximadamente um ano, passou de ferramenta de nicho a MCP de código que é padrão de fato.

A ideia central do Serena cabe em uma frase: **mostre símbolos ao agente, não texto.**

Em termos mais concretos, imagine que seja necessário encontrar todos os usos da função `calculateTotal`. Uma ferramenta convencional baseada em texto, como grep ou Read, funciona assim.

Primeiro, executa grep de `calculateTotal` em todo o codebase. Depois, coleta os números de todas as linhas correspondentes e lê uma faixa de linhas em cada arquivo para construir o contexto. Isso também captura coincidências acidentais em nomes de variáveis, strings literais e comentários.

O Serena, baseado em LSP, faz uma única chamada a `find_referencing_symbols("calculateTotal")` e retorna apenas referências precisas ao símbolo, sem ruído como correspondências em nomes de variáveis ou comentários.

As principais ferramentas do Serena incluem `find_symbol`, `find_referencing_symbols` e `get_symbols_overview`. É possível escolher entre dois backends. O padrão é um servidor de linguagem que implementa LSP (gratuito/open source); a outra opção é um plugin pago que usa a análise de código das IDEs da JetBrains (com avaliação gratuita).

O verdadeiro motivo da rápida adoção do Serena é a **economia de tokens**. Um loop de grep de texto + leitura de arquivos consome muitos tokens, enquanto uma única chamada LSP precisa de quase nenhum. Quanto maior o codebase, maior a diferença.

Como o Aider não usa LSP e faz sua própria análise dos arquivos, seu reconhecimento se limita a funções e classes. Já uma integração LSP como a do **OpenCode** oferece compreensão mais profunda dos tipos, mas tem a limitação de depender de um bom servidor LSP para cada linguagem.


## GitHub Trending

![Repositórios do GitHub Trending deste mês, com colbymchenry/codegraph no topo](1.webp)

Por fim, vale mencionar que conheci boa parte das ferramentas acima por meio do **GitHub Trending**. É um lugar onde se pode ver de uma só vez quem está criando quais ferramentas e o que ganhou popularidade repentinamente.

Em `github.com/trending`, é possível visualizar três períodos: today, this week e this month. Também há filtros por linguagem e categoria. (Em geral, acompanho weekly + TypeScript / Python e, às vezes, amplio para todas as linguagens.)


## Conclusão

Em resumo, as quatro camadas resolvem o mesmo problema, o custo de encontrar o código relevante, de maneiras diferentes conforme a profundidade com que entendem o código. O empacotamento de contexto só passa o código como texto, os mapas de repositório com tree-sitter sabem que um símbolo existe, os grafos de conhecimento armazenam essas relações de antemão e o LSP sabe o que o símbolo é. Quanto mais se desce nas camadas, mais preparação é necessária, como um índice ou um servidor de linguagem. O que o benchmark do CodeGraph mostra, porém, é uma comparação da camada de grafo de conhecimento com a busca sem ferramenta. Nessa comparação, a economia cresceu com o tamanho da base de código, mas o benchmark não permite saber se as outras camadas reduzem o custo na mesma proporção.

Se essas ferramentas reduzem o custo de o agente encontrar código, decidir em qual arquivo e com que extensão escrever as regras do projeto que o agente precisa conhecer desde o início é outra questão. Isso é tratado em [Arquivos de contexto](/260529).


## Referências

:::ref
- [repo] [rtk-ai/rtk](https://github.com/rtk-ai/rtk)
- [repo] [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph)
- [repo] [oraios/serena](https://github.com/oraios/serena)
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
:::
