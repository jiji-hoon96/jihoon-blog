---
emoji: 🔎
title: "Quatro camadas de inteligência de código"
seoTitle: "Inteligência de código: Repomix, Aider, CodeGraph e Serena"
date: "2026-05-26"
updatedAt: "2026-10-08"
categories: IA Ferramentas-de-desenvolvimento Claude MCP CodeGraph
description: "Quatro camadas de ferramentas que barateiam a busca de código de agentes de IA: Repomix, mapas tree-sitter, o grafo do CodeGraph e Serena com LSP."
keywords: "inteligência de código, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, economia de tokens agente de IA"
locale: pt-BR
translationOf: '260526'
sourceHash: 182bb75afe619d0d97875b8a9abbc855d796bdf96b4c9aaf93ff0695021afce5
---

Neste post, quero falar sobre **o que diferencia entre si as ferramentas que reduzem o custo de um agente de programação com IA encontrar o código relevante**.

Este texto é para desenvolvedores que já viram um agente gastar tokens repetindo grep e leituras de arquivo em uma base de código grande, e que estão em dúvida sobre qual ferramenta adicionar, como Repomix, CodeGraph ou Serena. Essas ferramentas se dividem em quatro camadas de acordo com a profundidade com que entendem o código (context packing, o repo map do tree-sitter, o grafo de conhecimento e o LSP), e cada camada reduz o custo de busca em um ponto diferente. Para o grafo de conhecimento, incluo o benchmark do seu criador; para as outras três camadas, medições feitas no próprio repositório deste blog.

Desde que vi o `codegraph` no GitHub Trending e o instalei por conta própria, sempre que encontro uma ferramenta nova fico curioso para saber por qual princípio ela economiza tokens. Muitas das ferramentas deste texto também conheci primeiro no GitHub Trending, que costumo ver por semana, filtrando por TypeScript e Python.


## Ferramentas de inteligência de código

Antes de alterar qualquer código, um agente primeiro procura onde está o código relevante. É um loop: busca com grep, lê arquivos, filtra e faz grep de novo. No benchmark do CodeGraph que veremos mais adiante, o lado que respondia sem a ferramenta usou até 43 tool calls para uma única pergunta. As ferramentas de inteligência de código são tentativas de reduzir esse custo de busca.

Mas "custo" não aponta para uma coisa só. Os tokens que o modelo processou, o número de tool calls e os tokens que continuam na context window depois que o trabalho termina se movem separadamente. Em cada camada, este texto olha qual dos três ela reduz.

Divido essas tentativas nas quatro camadas (tiers) abaixo, de acordo com quão profundamente cada ferramenta entende o código. Não há uma classificação estabelecida no setor; o agrupamento é meu. Todos os valores medidos neste artigo foram obtidos em 2026-10-08 no commit `36e5cfa` deste repositório, e os tokens foram contados com o `o200k_base` do tiktoken. Os valores diferem dos do tokenizador do Claude, então servem para comparar, não como números absolutos.


### Empacotamento de contexto

A solução mais simples parte da ideia: "**colocar tudo em uma única context window**". Não constrói grafo nem faz indexação. Simplesmente serializa o repositório inteiro em um bloco de texto e o entrega inteiro ao modelo.

A ferramenta representativa é o **Repomix**. Seu formato de saída padrão é XML, e o README traz um link para a documentação da Anthropic sobre tags XML. Ele tem CLI, versão web, extensão de navegador e servidor MCP.

O ponto forte do **GitIngest** é dispensar instalação. Se você trocar `github.com` por `gitingest.com` em uma URL do GitHub, o repositório inteiro vira uma única página de texto. O **code2prompt** (criado por Mufeed VH), uma CLI em Rust, permite mudar o formato de saída com templates.

O **rtk** (`rtk-ai/rtk`) segue uma direção um pouco diferente. Enquanto as ferramentas acima empacotam o repositório inteiro de uma vez, o rtk comprime a saída dos comandos de CLI que o agente executa. É um único binário feito em Rust, registrado nos hooks de vários agentes, como Claude Code, Cursor, Copilot, Gemini CLI e Codex, de modo que, quando o agente chama `git status`, ele executa `rtk git status` no lugar. Aplica filtering, grouping, truncation e deduplication a mais de 100 comandos. O hook do rtk tem como alvo apenas as tool calls do Bash. `Read`, `Grep` e `Glob` do Claude Code passam direto.

O tamanho da redução precisa ser lido com cuidado. O [README do rtk](https://github.com/rtk-ai/rtk/blob/8533612180c60efbcb5827c7db4e910aba096705/README.md#L66-L70) diz que reduz a saída do Bash em até 90%, e logo acrescenta que isso não significa reduzir a conta em 90%. Do lado do modelo, a saída de um comando é parte dos tokens de entrada, e os tokens de entrada são parte da conta, então a redução se dilui a cada etapa. O número que o [site oficial](https://www.rtk-ai.app/) destaca é 56% em média, nos comandos que o rtk reescreve. Se as ferramentas acima reduzem o texto que entra, o rtk reduz o texto que volta como resultado das tool calls.

O limite desta camada é que **repositórios grandes esbarram no teto de tokens**. Empacotar só os 109 arquivos do `src/` deste blog já dá 94.596 tokens. Isso ainda cabe na janela, mas um repositório com milhares de arquivos chegaria ao limite logo. O Repomix responde a isso com `--compress`. Segundo o [README](https://github.com/yamadashy/repomix/blob/8d6429121e98ed178e4d3a975c2bdbbecc958c4a/README.md#L797-L831), ele usa Tree-sitter para manter as assinaturas de funções e classes e descartar os corpos de implementação.

```bash
# repomix 1.18.1, 이 리포 커밋 36e5cfa, 2026-10-08
npx -y repomix@1.18.1 src -o out.xml              # Total Tokens: 94,596 tokens
npx -y repomix@1.18.1 src --compress -o out.xml   # Total Tokens: 30,320 tokens
```

A redução foi de 68%. Os comentários ficam, então `visit-counter.ts`, que tem JSDoc longo, só foi de 1.642 para cerca de 1.220 tokens, 26% a menos. A versão comprimida mantém as instruções import e as assinaturas, mas as chamadas dentro dos corpos das funções somem. Dá para ver no texto qual arquivo importa o quê, mas não dá para perguntar quem chama quem. Por isso a fronteira entre esta camada e a próxima está menos em a ferramenta ver a sintaxe do que em poder ser consultada sobre relações.


### Mapa do repositório com tree-sitter

A camada seguinte usa o **tree-sitter** para analisar a estrutura do código, mas sem subir um servidor de índice separado.

O que o tree-sitter, a ferramenta em que esta camada se apoia, constrói é uma **CST (Concrete Syntax Tree)**, uma árvore que representa a estrutura do código-fonte. A [documentação oficial do tree-sitter](https://tree-sitter.github.io/tree-sitter/) também diz que ele constrói uma concrete syntax tree. É uma árvore que mantém como nós até os parênteses e a pontuação, e é com ela que as ferramentas abaixo trabalham.

O **tree-sitter** é um gerador de parsers de código aberto e uma biblioteca de parsing incremental (incremental). A [code navigation do GitHub](https://docs.github.com/en/repositories/working-with-files/using-files/navigating-code-on-github) usa o tree-sitter. Como ele só refaz o parsing da parte editada, mudar uma linha no editor não refaz o parsing do arquivo inteiro; só corrige a parte da árvore que mudou. Essa vantagem é dos editores, onde as edições não param. O Aider, logo abaixo, mantém um cache baseado na hora de modificação dos arquivos para não refazer o parsing dos que não mudaram.

O **Aider**, uma ferramenta de programação em par com IA usada no terminal, é o exemplo representativo dessa abordagem. O Aider usa o tree-sitter para extrair de cada arquivo as definições e referências de funções, classes e métodos. Depois monta um grafo com os arquivos como nós. Quando o arquivo A referencia um identificador definido no arquivo B, surge uma aresta de A para B.

Para escolher os arquivos importantes desse grafo, o Aider usa o PageRank. O PageRank é um algoritmo que dá mais pontuação a um nó quanto mais links ele recebe e quanto mais pesados eles são. O Aider usa uma variante chamada personalized PageRank, que inclina a pontuação para os nós escolhidos. Depois coloca no orçamento de tokens as definições e assinaturas dos arquivos mais bem classificados.

O que entra no orçamento muda com a conversa atual. No [`repomap.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L487-L525) do Aider, o peso de uma aresta é a raiz quadrada do número de referências multiplicada por um fator. Identificadores mencionados na conversa recebem 10x, e identificadores em camelCase, snake_case ou kebab-case com 8 ou mais caracteres também 10x. Os que começam com `_` e os definidos em mais de 5 arquivos recebem 0,1x cada, e as arestas que saem dos arquivos adicionados agora ao chat recebem 50x. Os arquivos do chat, os mencionados na conversa e aqueles cujo caminho ou nome de arquivo coincide com um identificador da conversa também recebem pontuação de personalization no PageRank.

O orçamento também não é fixo. A [documentação do Aider](https://aider.chat/docs/repomap.html) dá 1k como padrão de `--map-tokens`, mas o [código](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/models.py#L782-L789) corta um oitavo do limite de entrada do modelo para um valor entre 1.024 e 4.096. E, quando não há arquivos no chat, amplia até `--map-multiplier-no-files` (padrão 2) vezes. Conferi isso com o `src/` deste repositório. A versão 0.86.1 que executei e o commit linkado acima têm o mesmo código de ranking. Os maps impressos foram contados com o200k_base, incluindo as três linhas de texto de orientação que o Aider adiciona.

```bash
# aider-chat 0.86.1, 리포 루트에서 시작한다, 2026-10-08
mkdir /tmp/aidermap && cp -R src /tmp/aidermap/ && cd /tmp/aidermap && git init -q && git add -A && git commit -qm init
# 키는 더미 값이다. --show-repo-map 은 map 만 출력하고 LLM 을 부르지 않는다
export OPENAI_API_KEY=dummy
aider_map() { uvx --python 3.12 --from aider-chat==0.86.1 aider --no-check-update --analytics-disable --no-gitignore --model gpt-4o "$@"; }
aider_map --show-repo-map                                              # Repo-map: using 4096 tokens
aider_map --map-tokens 1024 --show-repo-map                            # Repo-map: using 1024 tokens
aider_map --map-tokens 1024 --show-repo-map src/lib/filter-posts.ts    # 이 파일을 채팅에 올린 상태
```

| Condição | Orçamento escolhido pelo Aider | Map impresso | Arquivos incluídos |
|---|---|---|---|
| Padrões, sem arquivo no chat | 4.096 | 7.370 tokens | 61 |
| `--map-tokens 1024`, sem arquivo no chat | 1.024 | 2.019 tokens | 27 |
| `--map-tokens 1024`, `filter-posts.ts` adicionado ao chat | 1.024 | 983 tokens | 12 |

O limite de entrada do gpt-4o é de 128k, então um oitavo foi cortado para 4.096, e com o chat vazio o map saiu dentro do dobro disso. Ao adicionar um arquivo ao chat, o map encolheu até caber no orçamento; dos 27 arquivos anteriores só 10 ficaram, e `PostList.tsx` e `SearchModal.tsx` entraram como novos. Um repo map não é um resumo fixo do repositório, e sim um trecho ajustado à conversa daquele momento.

Há mais uma ferramenta que vale citar nesta camada: o **ast-grep** (`ast-grep/ast-grep`). É uma CLI de busca estrutural e rewrite baseada em tree-sitter, que casa nós da árvore sintática em vez de texto. Por exemplo, o padrão `console.log($A)` pega todas as chamadas a `console.log` com um único argumento, não importa como estejam as quebras de linha ou os espaços. O que ele pega é a mesma estrutura sintática. Ele não sabe o tipo de `$A` nem de onde vem o nome `console`. Também existe um servidor `ast-grep-mcp`, com o qual dá para fazer um agente usar busca estrutural em vez de grep de texto.


### Knowledge Graph

A terceira camada vai um passo além. Ela **faz o parsing de toda a base de código de antemão, constrói um grafo de conhecimento e o salva em disco**; depois o agente envia consultas a esse grafo salvo. O exemplo mais comentado é uma ferramenta chamada **CodeGraph**.

A estrutura que o [README do CodeGraph](https://github.com/colbymchenry/codegraph/blob/b635dd467f0578926a9c01a37b9d28d2b26689f1/README.md) descreve é simples. Ele faz o parsing do código com tree-sitter para extrair símbolos, arestas e informações de arquivos, e os salva em um banco de dados SQLite local. A busca por nome passa pelo índice FTS5 do SQLite. O agente consulta esse grafo via MCP. Nos passos que o README descreve não aparece nenhum LLM. Por isso entendo que essa extração é determinística (deterministic), ou seja, que o mesmo código sempre dá o mesmo resultado.

Se um LLM resume o código para montar o grafo, os resultados podem variar até para o mesmo código, e alucinações podem se infiltrar. Já ao fazer o parsing direto da árvore sintática, as relações entre símbolos são extraídas apenas pelas regras da gramática da linguagem, sem espaço para esse tipo de interpretação.

O **FTS5 (SQLite Full-Text Search 5)**, que aparece aqui, é uma extensão de busca de texto completo oferecida pelo SQLite como tabela virtual. Segundo a [documentação do SQLite](https://www.sqlite.org/fts5.html), ela faz parte da amalgamation desde a 3.9.0 (2015-10-14); você cria uma tabela com `CREATE VIRTUAL TABLE ... USING fts5(...)` e consulta com o operador `MATCH`. Dá para manter um índice de texto completo em um único arquivo SQLite sem subir um mecanismo de busca separado como o Elasticsearch.

Mas ser determinístico não é o mesmo que ser completo. O mesmo README registra o reconhecimento de rotas de frameworks que dependem de convenção e reflexão entre 74,1% para Django e 83,9% para ASP.NET, e chama isso de limite da análise estática (honest static-analysis ceiling). O mesmo código dá o mesmo resultado, mas a esse resultado podem faltar arestas.

O benchmark foi medido pelo próprio CodeGraph. A nova medição de 2026-08-05 no mesmo README rodou o Claude Opus 4.8 em modo headless e fez uma pergunta de arquitetura a cada um de 7 repositórios de código aberto. O lado com o CodeGraph MCP ativado reduziu o custo médio em 44%, os tokens processados em 62% e as tool calls em 88%. Essa nova medição impediu os dois lados de chamar a CLI `codegraph` pelo Bash. Em um ambiente de medição sem esse bloqueio, o lado sem a ferramenta encontrou e usou a CLI em 26 de 28 execuções, e o README deixa claro que os números publicados antes foram obtidos sem esse bloqueio.

O tamanho da economia não acompanhou o tamanho do repositório. Nas perguntas em que o lado sem a ferramenta usou de 28 a 43 tool calls, o custo caiu de 57 a 78%, e no Gin, que terminou em 7, ficou praticamente igual. O VS Code, com cerca de 11k arquivos, deu 71%, e o Excalidraw, com cerca de 640, 78%. O README atribui isso à quantidade de busca que cada pergunta exigiu. Como há uma única pergunta por repositório, leio daí apenas a direção.

O README também registra um número na direção oposta. Os tokens processados caem, mas ao fim de uma sessão de vários turnos, os resultados de retrieval que continuam na context window são cerca de 80% maiores do lado do CodeGraph no conjunto dos 7 repositórios. A diferença varia por repositório; só no VS Code são 67k contra 18k tokens, cerca de 3,7 vezes. Ele devolve o texto-fonte denso de uma vez, e esse texto permanece na janela. O CodeGraph reduziu as tool calls e os tokens processados ao preço de deixar mais coisa na janela.

O **Cursor** seguiu outro caminho e depois mudou de rumo. A indexação descrita no [post do blog do Cursor de janeiro de 2026](https://cursor.com/blog/secure-codebase-indexing) não era um grafo sintático, e sim **busca semântica baseada em embeddings vetoriais**. Ela dividia os arquivos em chunks localmente, sincronizava com o servidor por meio de hashes de Merkle tree e transformava os chunks em embeddings para a busca semântica. Em julho de 2026, um Community Support Engineer do Cursor respondeu no [fórum](https://forum.cursor.com/t/what-do-you-think-about-cursor-removing-the-codebase-indexing-settings/165899): "Semantic/embeddings indexing is being turned down in favor of grep-based retrieval". No mesmo tópico, outro membro da equipe escreveu que, à medida que os modelos ficaram bons em usar grep, o antigo caminho de busca semântica deixou de ajudar de forma significativa. Hoje a [documentação do Cursor](https://cursor.com/docs/context/codebase-indexing) diz que o Instant Grep constrói e consulta seu índice na sua máquina e não guarda embeddings da sua base de código para busca.


### LSP

A última camada **depende diretamente de um servidor de linguagem**. Se o tree-sitter sabe "que um símbolo existe", o LSP sabe "o que esse símbolo é".

O **[LSP (Language Server Protocol)](https://microsoft.github.io/language-server-protocol/)** é um protocolo aberto baseado em JSON-RPC que padroniza a comunicação entre editores e ferramentas de análise de linguagem (autocompletar, ir para a definição, encontrar referências, refatoração etc.). Em 2016, [Microsoft, Red Hat e Codenvy anunciaram a colaboração](https://www.redhat.com/en/about/press-releases/red-hat-codenvy-and-microsoft-collaborate-language-server-protocol). A ideia central é "não reimplementar um analisador de linguagem para cada editor; ter um servidor por linguagem e fazer todos os editores consultá-lo". O rust-analyzer e o pyright do Python são servidores LSP, enquanto o TypeScript usa o typescript-language-server, que envolve em LSP o `tsserver`, que fala um protocolo próprio.

O **Serena** (`oraios/serena`) é um servidor MCP desta camada. Em 2026-10-08 tem 30.093 stars, e o repositório foi criado em março de 2025. A ideia central do Serena cabe em uma linha: **mostrar ao agente o código como símbolos.** Suas ferramentas principais incluem `find_symbol`, `find_referencing_symbols` e `get_symbols_overview`. Dá para escolher um de dois backends. O padrão é um servidor de linguagem que implementa LSP (gratuito/código aberto); a outra opção é um plugin pago que usa a análise de código da IDE da JetBrains (com teste gratuito).

Medir neste repositório mostra de onde vem a diferença. Procurei os usos de `isHiddenPost` (`src/lib/filter-posts.ts:12`), que filtra os posts privados, de duas formas. O lado de texto é o grep.

```bash
# 커밋 36e5cfa, 2026-10-08. 이 글도 같은 이름을 담고 있어 content/ 는 뺐다
git grep -n isHiddenPost -- ':!content'   # 16줄, 파일 9개
git grep -n -C1 isHiddenPost -- ':!content'   # 같은 16곳을 앞뒤 1줄과 함께
```

No lado do LSP, foi chamado o [`find_referencing_symbols`](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/tools/symbol_tools.py#L169-L172) do Serena. A busca de referências do LSP pergunta por posição (arquivo, linha e coluna), não por nome, então essa ferramenta também recebe ao mesmo tempo `name_path`, o nome do símbolo, e `relative_path`, o arquivo onde está a definição. Em vez de subir o Serena como servidor MCP, a ferramenta foi chamada diretamente do Python no mesmo commit.

```python
# serena 3b99f8b, 커밋 36e5cfa, 2026-10-08. 리포 루트에서 실행한다
# uvx --python 3.12 --from git+https://github.com/oraios/serena@3b99f8b024dafd58c962ea6e74f37c8a730ef532 python refs.py
from serena.agent import SerenaAgent
from serena.config.serena_config import SerenaConfig
from serena.tools.symbol_tools import FindReferencingSymbolsTool
agent = SerenaAgent(project=".", serena_config=SerenaConfig().with_headless_mode_overrides())
agent.execute_task(lambda: None)  # 언어 서버가 뜰 때까지 기다린다
tool = agent.get_tool(FindReferencingSymbolsTool)
print(agent.execute_task(lambda: tool.apply(name_path="isHiddenPost", relative_path="src/lib/filter-posts.ts")))
```

A saída é uma única linha de JSON. Este é só o primeiro item. Os números de linha começam em 0.

```text
{"src/lib/filter-posts.ts": {"Function": [{"name_path": "filterPublishedPosts", "body_location": {"start_line": 22, "end_line": 24}, "content_around_reference": "...  22:export function filterPublishedPosts(posts: Post[]): Post[] {\n  >  23:  return posts.filter(post => !isHiddenPost(post))\n...  24:}"}]}, ...
```

O Serena devolveu 10 referências. Ele deixa de fora a definição em `filter-posts.ts:12` e, para as linhas de import de três arquivos, devolve o próprio arquivo como símbolo (`File`). As 11 posições de código que o grep encontrou são essas 10 mais a linha da definição. Esse nome é único no repositório, então o grep não deixou de fora nem acrescentou nenhuma posição de código. As 5 posições a mais que o grep encontrou eram frases de documentos que explicam essa função: o `CLAUDE.md` da raiz, os arquivos de `.claude/commands/` `audit.md` e `write-post.md` e, em `docs/research/snapshot-20260816/`, as cópias que restaram de `CLAUDE.md` e `write-post.md`.

O Serena devolve cada referência com [uma linha antes e outra depois](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/repl/api/lsp_api.py#L367-L369). Por isso o grep foi executado de duas formas, `git grep -n`, que devolve só números de linha, e `git grep -n -C1`, que também devolve uma linha antes e outra depois, e as três saídas foram contadas por inteiro com `o200k_base`.

| Saída | Posições | tokens |
|---|---|---|
| `git grep -n` | 16 (código 11, documentos 5) | 703 |
| `git grep -n -C1` | 16 (código 11, documentos 5) | 1.575 (código 733, documentos 841) |
| Serena `find_referencing_symbols` | 10 | 892 |

Comparado a um grep que devolve uma linha antes e outra depois, o Serena usa 683 tokens a menos. A diferença vem de não devolver as 5 posições em documentos. Mas o Serena acrescenta a cada referência o nome do símbolo e as informações de posição em JSON, então, olhando só o lado do código, ele na verdade usa 159 tokens a mais. E os 892 tokens do Serena superam os 703 de `git grep -n`, que devolve só números de linha. O que a camada LSP economiza neste repositório não é o resultado da busca, e sim o passo seguinte: ler linhas ou arquivos ao redor depois de ver o resultado do grep.

Nesse passo seguinte, se o agente lesse inteiros os 9 arquivos que o grep encontrou, leria 47.034 tokens: 3.716 dos 4 arquivos de código e 43.318 dos 5 documentos. Isso é um limite superior. Em uma sessão real, `CLAUDE.md` provavelmente já está no context e não seria lido de novo. Com um nome comum como `isLocale`, os resultados poderiam divergir até nas posições de código.


## Conclusão

Resumindo, as quatro camadas se dividem pela profundidade com que entendem o código, e reduzem custos diferentes. O context packing entrega o código como texto e, mesmo com `--compress`, mantém só a sintaxe, reduzindo os tokens que entram. O repo map do tree-sitter sabe que um símbolo existe, põe um teto de orçamento nos tokens que entram, e a conversa daquele momento decide com o que preenchê-lo. O grafo de conhecimento guarda as relações de antemão e reduz as tool calls e os tokens processados, mas, pela medição do próprio fornecedor, o que fica na janela até aumentou. O LSP sabe o que é um símbolo; neste repositório ele não devolveu o mesmo nome nos documentos, mas em troca acrescentou metadados a cada resultado. O que ele economiza não está no resultado da busca, e sim na leitura que vem depois.

Por isso, ao escolher uma ferramenta, olho primeiro qual custo é o problema agora, mais do que a profundidade da camada. Se a janela é pequena e as sessões são longas, olho o que fica; se as idas e voltas são lentas, o número de tool calls; se no repositório documentos e código compartilham nomes, quantos arquivos acabo lendo depois de um resultado do grep. Leio o Cursor ter removido a busca semântica por embeddings e passado a um índice de texto local (Instant Grep) como um sinal de que um índice caro nem sempre supera a própria capacidade de busca do modelo.

Se essas ferramentas reduzem o custo de um agente encontrar código, quantas regras do projeto o agente deve conhecer desde o início, e em qual arquivo escrevê-las, é outro problema. Trato disso em [Arquivos de contexto](/260529).


:::ref
- [repo] [ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)
- [repo] [ast-grep/ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)
:::
