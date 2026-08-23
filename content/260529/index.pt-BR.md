---
emoji: 🧭
title: 'Ferramentas para agentes de IA'
seoTitle: 'Panorama das ferramentas para agentes de programação com IA — arquivos md, MCP, inteligência de código e GitHub Trending'
date: '2026-05-29'
categories: IA Ferramentas-de-desenvolvimento Claude MCP CodeGraph
description: 'Uma análise das ferramentas encontradas ao desenvolver frontend com Claude sob quatro perspectivas: as diferenças entre CLAUDE.md, AGENTS.md e SKILL.md; os princípios do MCP e do Serena; como funcionam ferramentas de inteligência de código como o CodeGraph; e como acompanhar o GitHub Trending.'
keywords: 'CLAUDE.md, AGENTS.md, SKILL.md, MCP, Model Context Protocol, Serena MCP, CodeGraph, inteligência de código, GitHub Trending, agente de programação com IA, Claude Code, regras do Cursor, tree-sitter, LSP'
locale: pt-BR
translationOf: '260529'
sourceHash: dcdf13a2067a0ae15b501b063ecf0c65202580351b7df388dad34849f41e1c3c
---

Neste post, quero falar sobre o **ecossistema de ferramentas em torno dos agentes de programação com IA**.

Trabalho como desenvolvedor frontend e uso Claude no dia a dia. Com isso, em algum momento surgiu um `CLAUDE.md` na raiz do projeto, ao lado havia um `AGENTS.md` criado por alguém, um `.cursorrules` continuava esquecido em algum canto e eu cheguei até a criar uma pasta `.claude/skills/` seguindo um artigo que encontrei por aí. (Quando me dei conta, havia uns cinco arquivos com conteúdos parecidos.)

Uma confusão semelhante apareceu em outras áreas. Experimentei adicionar um MCP chamado `serena`, instalei algo chamado `codegraph` depois de vê-lo no GitHub Trending e, sempre que descobria uma ferramenta nova, voltava a me perguntar: “Afinal, em que categoria essa ferramenta se encaixa e como ela funciona?”. (Eu me esquecia principalmente de quem havia criado cada ferramenta e de qual princípio ela usava para economizar tokens.)

Por isso, em vez de recomendar as ferramentas uma a uma, decidi **desenhar o próprio mapa desse ecossistema**. Dividi-o nos quatro grandes eixos abaixo.
 
- As diferenças entre os arquivos de contexto (`.md`)
- Os princípios do MCP e o Serena
- A hierarquia das ferramentas de inteligência de código e o CodeGraph
- Prestar atenção ao GitHub Trending

Depois de entender esses quatro pontos, acredito que será possível ter uma boa noção do que é uma ferramenta nova quando ela surgir.


## Arquivos de contexto

Os agentes de programação com IA têm uma limitação fundamental: **não possuem memória persistente**. Toda sessão começa do zero, e na conversa seguinte eles não se lembram de convenções combinadas ontem nem da estrutura de pastas explicada uma hora antes. Os arquivos de contexto são o mecanismo mais simples para resolver esse problema. Se o projeto tiver um arquivo lido automaticamente no início de cada sessão, não será necessário repetir sempre as mesmas explicações.

O problema é que cada ferramenta criou seu próprio arquivo a partir da mesma ideia. Claude Code lê `CLAUDE.md`; Cursor, `.cursorrules` (que hoje está deprecated, e a recomendação é usar `.cursor/rules`); GitHub Copilot, `.github/copilot-instructions.md`; e OpenAI Codex, `AGENTS.md`. Quando uma equipe usa várias ferramentas, acaba tendo de copiar o mesmo conteúdo para quatro lugares diferentes.


### CLAUDE.md

`CLAUDE.md` é um arquivo que o Claude Code lê automaticamente no início da sessão. Segundo a documentação oficial da Anthropic (`code.claude.com/docs/en/memory`), o Claude Code procura `CLAUDE.md` nos três níveis abaixo.

- **Memória do usuário** (`~/.claude/CLAUDE.md`): valores-padrão globais aplicados a todos os projetos da máquina
- **Memória do projeto** (`CLAUDE.md` na raiz do projeto): versionada no Git e compartilhada por toda a equipe
- **Memória local** (`CLAUDE.md` em um subdiretório): carregada adicionalmente apenas ao trabalhar naquele diretório

Se os três níveis existirem, Claude **lê todos e os concatena (concatenate)**. Ele não escolhe apenas um por ordem de prioridade; a estrutura se parece com a cascade do CSS, em que o conteúdo mais específico é acrescentado por cima. (É uma mesclagem, não um override.) Portanto, espalhar regras sobre o mesmo assunto por vários níveis pode gerar conflitos. (A documentação oficial da Anthropic afirma que o comportamento em caso de conflito não é garantido.)

Há um detalhe frequentemente ignorado: **todos os arquivos `CLAUDE.md` encontrados ao subir do diretório de trabalho atual até a raiz do repositório são lidos**. Assim, ao trabalhar em `packages/ui/` dentro de um monorepo, tanto o `CLAUDE.md` da raiz quanto `packages/ui/CLAUDE.md` são carregados. (Isso é poderoso, mas também significa que o contexto pode crescer sem que ninguém perceba.)


### AGENTS.md

`AGENTS.md` é um padrão criado para resolver a proliferação de arquivos específicos de cada ferramenta descrita acima. Em dezembro de 2025, Anthropic, Block e OpenAI o doaram, junto com o MCP, à **Agentic AI Foundation (AAIF)**, vinculada à Linux Foundation, e ele se tornou o padrão de fato do setor. O site oficial (`agents.md`) afirma que **mais de 60 mil repositórios open source já adotam esse arquivo**.

A lista de ferramentas compatíveis deixa isso ainda mais claro. OpenAI Codex, Google Jules, VS Code, GitHub Copilot, Cursor, JetBrains Junie, Aider, Devin, Zed, Factory, Warp, goose, opencode, Amp, RooCode, Gemini CLI, Kilo Code, Phoenix, Semgrep, Ona, Windsurf e Augment Code estão entre as muitas ferramentas com suporte. O GitHub Copilot passou a oferecer suporte nativo a `AGENTS.md` em agosto de 2025. Um detalhe interessante é que **o suporte nativo do Claude Code a `AGENTS.md` ainda está no estado de active feature request**. Para o Claude Code, `CLAUDE.md` continua sendo o arquivo principal.

Mesmo sendo chamado de padrão, é razoável desconfiar se ele está realmente sendo adotado. A evidência mais forte é o **dogfooding** (quando quem cria um padrão também o utiliza).

- A raiz da branch canary de **Vercel/Next.js** contém um `AGENTS.md`. Na verdade, trata-se de um link simbólico para `CLAUDE.md`, cujo conteúdo inclui a estrutura do monorepo, iterações de 1–2 segundos com `pnpm --filter=next dev`, orientações de testes para Turbopack e Webpack, o script `pr-status` e regras para variáveis de ambiente e secrets. O fato de `create-next-app` ter passado a gerar `AGENTS.md` e `CLAUDE.md` juntos em novos projetos faz parte do mesmo movimento.
- O próprio repositório **OpenAI/codex** mantém seu `AGENTS.md`.

Do ponto de vista estratégico, a abordagem que vem se consolidando é esta: manter **`AGENTS.md` como single source of truth** e reduzir `CLAUDE.md` ao mínimo, deixando nele apenas uma linha que referencia `AGENTS.md` e instruções específicas do Claude Code. Isso elimina duplicações e, como o Claude Code lê os dois arquivos, não há perda de informação.


### SKILL.md

`SKILL.md` tem uma natureza diferente dos dois arquivos anteriores. Enquanto `CLAUDE.md` e `AGENTS.md` são **instruções persistentes, sempre presentes no contexto**, uma Skill é uma **capacidade on-demand, invocada apenas quando necessária**.

Uma Skill é organizada como uma pasta. Dentro dela ficam um arquivo `SKILL.md`, scripts executados pela Skill e documentos Markdown adicionais. Claude só carrega essa pasta quando a tarefa atual corresponde ao `description` da Skill. Esse mecanismo é chamado de **progressive disclosure (divulgação progressiva)**, conceito estabelecido por Jakob Nielsen na área de UX em 1995. A técnica reduz a carga cognitiva e os erros ao deslocar funções avançadas ou pouco usadas para telas secundárias, permitindo que o usuário se concentre em uma tarefa de cada vez. No contexto das Claude Skills, o termo se refere ao mecanismo de “trazer o corpo da Skill para o contexto apenas quando necessário”. O resultado é uma economia drástica no custo da janela de contexto.

O frontmatter de `SKILL.md` possui alguns campos próprios.

- **`description`**: descreve em quais situações a Skill é necessária e funciona como gatilho para o modelo decidir se deve invocá-la
- **`allowed-tools`**: restringe as ferramentas disponíveis dentro da Skill (por exemplo, `"Read, Glob, Grep, Bash(python:*)"`)
- **`disable-model-invocation: true`**: impede que o modelo invoque a Skill; somente o usuário pode acioná-la por um comando slash. É usado em operações com efeitos colaterais, como deploy e commit
- **`user-invocable: false`**: oculta a Skill do menu de comandos slash do usuário; apenas Claude pode invocá-la de forma autônoma como conhecimento de apoio

Claude Skills foi lançado simultaneamente no Claude.ai, Claude Code, API e Agent SDK em 16 de outubro de 2025. Em 18 de dezembro de 2025, a Anthropic publicou a própria especificação das Skills como padrão aberto (`agentskills.io`). Simon Willison chegou a avaliá-las dizendo: “**Skills are awesome, maybe a bigger deal than MCP**”. O motivo é que seu formato é drasticamente mais simples que o MCP e, ao mesmo tempo, resolve o custo da janela de contexto por meio de progressive disclosure.


### Arquivos de outras ferramentas

O `.cursorrules` do Cursor foi **deprecated a partir da versão 0.43**. A recomendação oficial atual é criar vários arquivos dentro do diretório `.cursor/rules/`, cada um com a extensão `.mdc`. Cada arquivo `.mdc` possui um frontmatter YAML.

- **`description`**: usado pelo agente para avaliar a relevância da regra
- **`globs`**: faz auto-attach quando um arquivo correspondente ao padrão é incluído na conversa
- **`alwaysApply`**: quando `true`, inclui a regra obrigatoriamente em todas as conversas (nesse caso, `globs` é ignorado)

O GitHub Copilot evoluiu em uma direção semelhante. Instruções válidas para todo o repositório ficam em `.github/copilot-instructions.md`; quando é necessário definir escopo por caminho, criam-se arquivos `.github/instructions/*.instructions.md`, usando a chave `applyTo:` no frontmatter para especificar o glob. (O Copilot code review passou a oferecer suporte oficial a path-scoped instructions em setembro de 2025.)

As demais ferramentas também convergem para padrões parecidos. A tabela abaixo resume o cenário.

| Ferramenta | Arquivo/diretório | Característica |
|------|--------------|------|
| **Claude Code** | `CLAUDE.md` (3 níveis) | Mesclagem ao longo da árvore de diretórios |
| **Cursor** | `.cursor/rules/*.mdc` | Escopo por padrão de arquivos com `globs` |
| **GitHub Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | Suporte a glob com `applyTo` |
| **Cline** | diretório `.clinerules/` | Combina todos os arquivos `.md`/`.txt`; ativação condicional por glob em `paths` |
| **Continue.dev** | `.continue/rules/*.md` | Frontmatter com `name`/`globs`/`alwaysApply` |
| **Aider** | `CONVENTIONS.md` + `.aider.conf.yml` | Incluído em toda solicitação; **recomendação de no máximo 200 linhas** |
| **Windsurf** | `.windsurfrules` + `global_rules.md` | Dois níveis: global e projeto |
| **Padrão** | `AGENTS.md` (AAIF) | Adotado por mais de 60.000 repositórios |

O **`CONVENTIONS.md` do Aider é especialmente interessante**. Como a documentação oficial informa que o arquivo inteiro é incluído no contexto a cada solicitação, ela determina explicitamente: **“mantenha-o com no máximo 200 linhas”**. (Pode-se dizer que o Aider reconheceu essa limitação cedo e a comunicou diretamente aos usuários.)


### MEMORY.md

Além dos arquivos anteriores, outro padrão aparece com frequência cada vez maior: `MEMORY.md`. Não é um padrão oficial, mas uma convenção que surgiu organicamente na comunidade para **registrar decisões e erros ao longo do tempo**.

```markdown
## 2026-04-10
Pages Router에서 App Router로 이전. 신규 라우트는 App Router 컨벤션 사용.

## 2026-04-22
Prisma 쿼리 결과에 optional chaining 쓰지 말 것 — null은 if-check로 명시적 처리.
(이전에 옵셔널 체이닝으로 null을 흘려보내 프로덕션 이슈 발생.)
```

Se `CLAUDE.md` e `AGENTS.md` registram **as regras vigentes no momento**, `MEMORY.md` registra **a história de por que essas regras foram criadas**. (Eles se complementam; um não substitui o outro.)


### Como o agente lê esses arquivos

Até aqui, vimos quais arquivos existem. Mas há uma pergunta que, surpreendentemente, costuma ficar de fora: **para onde e de que forma exatamente o agente lê esses arquivos?** Entender esse mecanismo ajuda a compreender com mais clareza o resultado da ETH Zurich apresentado adiante — o de que arquivos de contexto não são seguidos tão bem quanto se esperaria.

Primeiro, um fato importante: **`CLAUDE.md` não é um system prompt; ele é injetado como user message.** A documentação oficial da Anthropic afirma o seguinte:

::::quote
:::translation
O conteúdo de CLAUDE.md é entregue como uma mensagem do usuário após o prompt do sistema, e não como parte do próprio prompt do sistema. Claude o lê e tenta segui-lo, mas não há garantia de conformidade estrita.
:::

:::original
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::
::::

Ou seja, ele não é uma regra obrigatória, mas um “contexto de referência”. Para impor um comportamento específico, o guia oficial recomenda usar um mecanismo separado, como um hook `PreToolUse`.

A ordem de carregamento se acumula de broad → specific. Mais precisamente: managed policy (configuração da organização) → global do usuário (`~/.claude/CLAUDE.md`) → projeto (`./CLAUDE.md`) → local (`./CLAUDE.local.md`). Dentro do mesmo diretório, `CLAUDE.md` vem antes de `CLAUDE.local.md`. É possível aproveitar o fato de que **a instrução mais próxima é lida por último** para fazer regras mais específicas terem maior peso, graças ao recency bias dos LLMs.

Outro ponto interessante é a sintaxe `@import`. Ao escrever `@path/to/file` em qualquer lugar do corpo de CLAUDE.md, esse arquivo é expandido naquele ponto e carregado junto. **A profundidade recursiva máxima é de 4 hops**, e caminhos relativos são resolvidos a partir do arquivo que contém o import. Por isso, a recomendação oficial é usar `@AGENTS.md` como ponte. Se `CLAUDE.md` ficar quase vazio, contendo apenas a linha `@AGENTS.md`, o Claude Code também lerá AGENTS.md naturalmente. (Na situação atual, em que CLAUDE.md ainda não oferece suporte nativo a AGENTS.md, essa é a solução alternativa mais limpa.)

Também vale examinar os tokens. CLAUDE.md não possui um limite explícito de tokens, portanto, **se existir, será carregado por inteiro**. Ainda assim, a recomendação oficial é de **no máximo 200 linhas por arquivo**. Acima de 200 linhas, a documentação diz “consume more context and may reduce adherence”. Curiosamente, no Claude 4.x, **apenas habilitar o tool use adiciona automaticamente +346 tokens a um special system prompt** (com `tool_choice: auto`). O contexto vaza sem que se perceba.

O Cursor funciona de outra maneira. As regras em `.cursor/rules/*.mdc` operam em quatro modos.

- **Always Apply**: incluída obrigatoriamente em todos os chats; ignora globs/description
- **Apply Intelligently** (Agent Requested): o agente lê `description`, avalia a relevância e usa a regra quando necessário
- **Apply to Specific Files** (Auto Attached): ativada quando um arquivo que corresponde ao padrão glob entra no contexto
- **Apply Manually**: invocada explicitamente pelo usuário com `@rule-name`

Outras ferramentas funcionam de formas diferentes. O OpenAI Codex percorre o caminho da raiz do repositório Git até o cwd, coleta todos os `AGENTS.md` e os injeta **imediatamente antes do prompt do usuário**. Já o GitHub Copilot insere `.github/copilot-instructions.md` em uma prioridade intermediária da janela de contexto: “depois do edit context e das explicit references, mas antes de open files loosely related”. Mesmo quando usam o mesmo arquivo `AGENTS.md`, ferramentas diferentes podem carregá-lo em momentos distintos, com prioridades e regras de mesclagem diferentes; portanto, **não há garantia de que três ferramentas enxerguem esse arquivo exatamente da mesma maneira.**

Mas resta uma pergunta fundamental: **por que o modelo segue apenas parte das instruções presentes no contexto?** Dizer apenas que “as instruções são longas” não basta. Por trás desse fenômeno existe uma limitação estrutural dos LLMs.

### Alucinação e esquecimento do contexto

Se você já viu um agente de IA confundir o contexto da conversa ou esquecer mais adiante algo dito claramente no início, isso também é uma forma de **alucinação (Hallucination)**. Em geral, pensamos primeiro em alucinação como “inventar fatos inexistentes”, mas academicamente ela se divide em três tipos. O survey de 2023 da equipe de Yue Zhang (“Siren's Song in the AI Ocean”) os classifica como **conflito com a entrada** (gerar algo diferente do que o usuário informou explicitamente), **conflito com o contexto** (contradizer algo que o próprio modelo gerou antes) e **conflito factual** (discordar do conhecimento de mundo). Ignorar instruções de arquivos de contexto pertence ao primeiro tipo, não ao terceiro. Ao processar a entrada, o modelo trata parte das informações como se elas “não existissem”.

O problema mais fundamental é que essa alucinação **não pode ser eliminada por completo**. Uma equipe da Universidade Nacional de Singapura demonstrou isso matematicamente por meio da teoria da aprendizagem. Nenhum LLM consegue aprender todas as funções computáveis e, portanto, enquanto for usado como solucionador de problemas de propósito geral, inevitavelmente alucinará em algum ponto.

O efeito da posição também é importante. Pesquisadores de Stanford demonstraram experimentalmente que o modelo consulta melhor informações relevantes quando elas estão **no início ou no fim da janela de contexto**, enquanto o desempenho cai bastante quando ficam **enterradas no meio**. Isso se relaciona diretamente aos arquivos de contexto. Pela ordem de carregamento, `CLAUDE.md` entra em algum ponto intermediário e, quanto mais longa fica a conversa, mais suas instruções são empurradas para o “meio” do contexto. Isso também se conecta ao outro lado do recency bias mencionado anteriormente: a faixa intermediária do **efeito primazia–recência é a mais vulnerável**.

Ao reunir esses fenômenos, surge uma imagem única. Um arquivo de contexto é apenas **um texto adicional inserido fora do sistema antes do primeiro turno do usuário**. Não é um mecanismo que impõe decisões ao modelo, mas apenas mais um bloco de tokens despejado na janela de contexto. Quanto maior ele for — e quanto mais longa ficar a conversa —, mais suas instruções serão empurradas para o “meio” e menos consultadas. O resultado da ETH Zurich apenas quantificou essa limitação estrutural.


### O estudo da ETH Zurich

Muitas pessoas devem ter pensado: “Então é melhor colocar o máximo possível nesses arquivos, certo?”. Um estudo recente confrontou diretamente essa intuição: a pesquisa da ETH Zurich mencionada ao longo da seção anterior.

Em fevereiro de 2026, uma equipe da ETH Zurich publicou o artigo “Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?”. Foram avaliadas 138 tarefas reais de engenharia de software em Python no benchmark AGENTBENCH e no SWE-bench Lite, usando quatro agentes: Claude Code (Sonnet-4.5), Codex (GPT-5.2 / GPT-5.1 mini) e Qwen Code. Os resultados foram inesperados.

- **Arquivos de contexto gerados automaticamente por LLMs** reduziram a taxa de sucesso das tarefas em cerca de **0,5% no SWE-bench Lite e 2% no AGENTBENCH**
- Mesmo **arquivos escritos manualmente por pessoas** trouxeram apenas uma pequena melhora média, de cerca de 4%
- A adição de arquivos de contexto **aumentou o custo de inferência em mais de 20% por instância**
- Em modelos mais poderosos (GPT-5.2), o efeito dos arquivos de contexto foi ainda menor (quanto mais forte o modelo, maior seu conhecimento paramétrico e maior a chance de o contexto adicional virar ruído)

Houve, porém, uma exceção: **quando uma ferramenta não convencional era especificada**. Por exemplo, ao mencionar no contexto o gerenciador de pacotes Python `uv`, a frequência de uso de `uv` pelo agente passou de 0,01 para 1,6 vez por instância — um aumento de **aproximadamente 160 vezes**.

A recomendação do Aider mencionada antes — “200 linhas”, “como entra sempre no contexto, mantenha curto” — é uma orientação prática. Já o estudo da ETH Zurich demonstrou quantitativamente que “arquivos de contexto longos reduzem o desempenho”. Na minha opinião, as implicações práticas dessa pesquisa são as seguintes.

- **Arquivos de contexto enormes gerados automaticamente podem causar mais danos do que benefícios**. Se padrões de código, arquitetura e workflow forem todos espremidos em um `CLAUDE.md` de 300 linhas, o agente seguirá apenas parte e ignorará o restante. Essa inconsistência pode produzir resultados piores do que não ter contexto algum.
- **O que precisa ser registrado são as informações que não podem ser inferidas**: ferramentas não convencionais, convenções específicas do projeto e falhas do passado. O modelo já conhece as boas práticas gerais de programação.
- Use AGENTS.md como fonte única; deixe em CLAUDE.md apenas instruções curtas específicas da ferramenta; e separe workflows detalhados em Skills.


## MCP (Model Context Protocol)

Se os arquivos `.md` resolvem o problema de “**o que informar ao agente**”, o MCP (Model Context Protocol) resolve o problema de “**o que permitir que o agente faça**”.

Em termos mais concretos: para um agente de IA enviar uma mensagem no Slack, ele precisa conseguir chamar a API do Slack. Para criar uma issue no GitHub, precisa chamar a API do GitHub. Para fazer uma query no Postgres, precisa saber lidar com a conexão ao banco. O MCP **reúne todas essas integrações com sistemas externos em um único protocolo padrão**. (A ideia é que qualquer cliente possa se conectar a qualquer servidor pela mesma interface.)

O MCP é um padrão aberto apresentado pela primeira vez pela Anthropic em **25 de novembro de 2024**. Em **9 de dezembro de 2025**, Anthropic, Block e OpenAI, como cofundadoras, doaram a especificação do MCP à **Agentic AI Foundation (AAIF)**, vinculada à Linux Foundation. Google, Microsoft, AWS, Cloudflare e Bloomberg aderiram como membros platinum. (Na data da doação, em dezembro de 2025, o ecossistema já registrava mais de 97 milhões de downloads mensais dos SDKs e mais de 10 mil servidores MCP públicos ativos.)

O MCP é um protocolo de sessão stateful construído sobre JSON-RPC. **JSON-RPC** é um protocolo de RPC (Remote Procedure Call) stateless e leve que usa JSON como wire format. Como é independente da camada de transporte, funciona sobre HTTP, TCP ou entrada e saída padrão. Também oferece suporte a notification (chamada sem resposta) e chamadas batch.


### Por dentro do protocolo

Toda interação entre cliente e servidor no MCP é representada por um de seis tipos primitivos (primitive). No início havia três no lado do servidor; a spec 2025-06-18 acrescentou três primitivas do lado do cliente, totalizando as seis atuais.

**Primitivas do lado do servidor**

- **Tool** (model-controlled): ação cuja execução é decidida autonomamente pelo modelo. Pode ter efeitos colaterais (side effect)
- **Resource** (application-controlled): dados somente leitura identificados por URI. O aplicativo host decide quais resources serão expostos
- **Prompt** (user-controlled): template reutilizável acionado explicitamente pelo usuário, por exemplo por um comando slash

**Primitivas do lado do cliente**

- **Sampling**: mecanismo que permite ao servidor solicitar uma completion ao LLM do cliente, transformando cliente e servidor em uma estrutura bidirecional
- **Roots**: informações sobre os limites do workspace com as quais o cliente comunica ao servidor “este é o escopo em que você pode trabalhar”
- **Elicitation**: recurso que permite ao servidor solicitar dados adicionais ao usuário, de forma estruturada, durante a execução de uma ferramenta

A distinção entre essas seis primitivas é importante porque varia **quem decide pela chamada ou pelo fornecimento**. Como Tool é executada pela decisão autônoma do modelo, há risco de chamadas indevidas. Resource é relativamente segura porque é selecionada pelo aplicativo. Prompt oferece o maior controle, pois é acionado explicitamente pelo usuário. Sampling, Roots e Elicitation tornam o modelo de permissões mais refinado por meio do controle no lado do cliente.

Há **exatamente duas** formas de transporte. Essa é uma decisão deliberada para impedir que o ecossistema se fragmente em dezenas de protocolos concorrentes. A primeira é **stdio**: o servidor MCP é executado como subprocesso local e se comunica pela entrada e saída padrão. É adequada a ferramentas locais, como filesystem ou Git. A outra é **Streamable HTTP**, que adiciona streaming SSE sobre HTTP POST para produzir uma comunicação próxima da bidirecional. É adequada a cenários através da rede, como servidores remotos, autenticação OAuth, conexões com vários clientes e deploy em cloud.

SSE (Server-Sent Events) é um padrão W3C pelo qual o servidor envia dados ao cliente em uma única direção por meio de uma conexão HTTP. Seu media type é `text/event-stream`, e em JavaScript ele é acessado pela API `EventSource`. Ao contrário de WebSocket, é unidirecional; por operar sobre HTTP, porém, tem boa compatibilidade com proxies e firewalls. Pode-se dizer que Streamable HTTP usa SSE para simular comunicação bidirecional. Ele foi introduzido na spec de **26 de março de 2025** (version `2025-03-26`) e substituiu o transporte HTTP+SSE anterior.


### O fluxo de uma chamada de ferramenta MCP por um LLM

Depois de conhecer as primitivas e os transportes, vamos acompanhar o fluxo de **como um LLM realmente descobre e chama ferramentas MCP**. (No caso dos arquivos `.md`, a pergunta era “onde eles são injetados”; aqui, é “como o MCP entra no campo de visão do LLM”.)

Quando uma sessão MCP começa, ocorre o handshake abaixo.

- **Cliente → servidor**: solicitação `initialize` (envia a versão do protocolo compatível e as capabilities do cliente)
- **Servidor → cliente**: resposta a `initialize` (capabilities do servidor + campo `instructions` opcional)
- **Cliente → servidor**: notification `notifications/initialized`
- **Cliente → servidor**: solicitação `tools/list` → recebe a lista de ferramentas disponíveis
- (Depois) o LLM decide chamar uma ferramenta → o cliente envia `tools/call` → recebe o resultado

Na resposta a **`initialize`, há um detalhe frequentemente ignorado: o campo `instructions`**. Quando o servidor envia texto nesse campo, o conteúdo é, na prática, acrescentado ao system prompt do LLM. Isso significa que a spec possui um espaço oficial em que o servidor MCP pode injetar diretamente no LLM orientações sobre “como usar estas ferramentas”. (A existência desse espaço é uma das razões pelas quais o Tool Poisoning Attack discutido adiante é perigoso.)

E como a própria definição de uma tool entra no campo de visão do LLM? No MCP, ela tem a seguinte forma de JSON Schema.

```json
{
  "name": "get_weather",
  "description": "Get current weather information for a location",
  "inputSchema": {
    "type": "object",
    "properties": { "location": { "type": "string" } },
    "required": ["location"]
  }
}
```

O cliente converte a lista recebida por `tools/list` para o **parâmetro `tools` da Anthropic Messages API** ou para o **parâmetro `tools` do OpenAI function calling** e a inclui na chamada à API do LLM. No caso da Anthropic, quando o parâmetro tool é fornecido, um **special system prompt é adicionado automaticamente** para ensinar o modelo a fazer chamadas de tool. (Essa é a origem dos +346 tokens mencionados anteriormente.)

Quando o LLM decide chamar uma ferramenta, sua resposta contém um bloco `tool_use` (`{"type": "tool_use", "name": ..., "input": ...}`), e a resposta termina com `stop_reason` definido como `tool_use`. O cliente recebe isso, envia `tools/call` ao servidor MCP real, obtém o resultado e o devolve ao LLM em um bloco `tool_result` na próxima user message. **Esse loop se repete até que `stop_reason` mude de `tool_use` para outro valor, como `end_turn` ou `max_tokens`.** O comportamento que costumamos chamar de “um agente trabalhando” é, na prática, uma sequência desse loop de chamada–resultado–chamada.

Então, o que diferencia o MCP de um simples function calling? A resposta pode ser resumida em quatro pontos.

- **Descoberta dinâmica**: a lista de ferramentas não precisa ser conhecida em build time; ela é obtida em runtime por `tools/list`. Alterações durante a sessão também são possíveis com `notifications/tools/list_changed`
- **Sessão stateful**: há lifecycle phases definidas (initialize → operation → shutdown), permitindo um encerramento organizado
- **Primitivas além de Tool**: Prompt, Resource, Sampling, Roots e Elicitation também são expostas por capability negotiation
- **Bidirecionalidade**: pela spec, o servidor também pode chamar o LLM do cliente por sampling

(Por essa diferença, o MCP às vezes é chamado de “padrão generalizado de function calling para agentes”.)

### Serena

**Serena** (`oraios/serena`) é uma das ferramentas mais citadas entre os servidores MCP voltados a agentes de programação. Em maio de 2026, tinha cerca de 24,7k stars e, em aproximadamente um ano, passou de ferramenta de nicho a MCP de código que é padrão de fato.

A ideia central do Serena cabe em uma frase: **mostre símbolos ao agente, não texto.**

Em termos mais concretos, imagine que seja necessário encontrar todos os usos da função `calculateTotal`. Uma ferramenta convencional baseada em texto, como grep ou Read, funciona assim.

Primeiro, executa grep de `calculateTotal` em todo o codebase. Depois, coleta os números de todas as linhas correspondentes e lê uma faixa de linhas em cada arquivo para construir o contexto. Isso também captura coincidências acidentais em nomes de variáveis, strings literais e comentários.

O Serena, baseado em LSP, faz uma única chamada a `find_referencing_symbols("calculateTotal")` e retorna apenas referências precisas ao símbolo, sem ruído como correspondências em nomes de variáveis ou comentários.

**LSP (Language Server Protocol)** é um protocolo aberto baseado em JSON-RPC que padroniza a comunicação entre editores de código/IDEs e “ferramentas de inteligência de linguagem”, como code completion, go to definition, find references e refactoring. Ele foi padronizado em conjunto por Microsoft, Red Hat e Codenvy em 2016. A ideia central é: “em vez de reimplementar um analisador de linguagem em cada editor, mantenha um servidor por linguagem e faça todos os editores consultarem esse servidor”. (O servidor de TypeScript, o Rust analyzer e o pyright do Python são todos servidores LSP.)

As principais ferramentas do Serena incluem `find_symbol`, `find_referencing_symbols` e `get_symbols_overview`. É possível escolher entre dois backends. O padrão é um servidor de linguagem que implementa LSP (gratuito/open source); a outra opção é um plugin pago que usa a análise de código das IDEs da JetBrains (com avaliação gratuita).

O verdadeiro motivo da rápida adoção do Serena é a **economia de tokens**. Um loop de grep de texto + leitura de arquivos consome muitos tokens, enquanto uma única chamada LSP precisa de quase nenhum. Quanto maior o codebase, maior a diferença.


### Então, o MCP é seguro?

Há um ponto importante: **o MCP não automatiza a concessão de permissões.** Cabe ao usuário decidir em quais servidores o agente pode confiar, quais efeitos colaterais cada ferramenta produz e se ela continuará se comportando da mesma maneira ao longo do tempo.

Vale conhecer dois ataques representativos.

- **Tool Poisoning Attack (TPA)**: ataque batizado pela Invariant Labs, que publicou uma PoC em abril de 2025. Ao esconder instruções maliciosas na descrição (description) de uma ferramenta de um servidor MCP, o modelo pode confundi-las com instruções do usuário e segui-las. É um texto invisível para o usuário, mas visível para o modelo.

- **Rug Pull** (Silent Redefinition): conceito abordado por Simon Willison em uma análise publicada em 9 de abril de 2025. No início, a ferramenta é legítima. O usuário a revisa, aprova e integra ao workflow. Semanas depois, sua definição é alterada silenciosamente para incluir instruções maliciosas. Como não houve uma nova aprovação do usuário, o comportamento muda sem aviso.

Houve um incidente de segurança em **15 de abril de 2026**. A OX Security revelou vulnerabilidades sistêmicas de RCE que afetavam todos os principais SDKs do MCP (Python, TypeScript, Java e Rust). Mais de 150 milhões de downloads, cerca de 7.000 servidores públicos e uma estimativa de 200 mil deploys vulneráveis ficaram sob risco. Mais de 14 CVEs foram atribuídas, e Cursor, VS Code, Windsurf, Claude Code e Gemini-CLI estavam entre os afetados.

E o que aconteceu depois? A Anthropic **não alterou a arquitetura do protocolo**. Em vez disso, atualizou `SECURITY.md` para deixar claro que, ao usar o adaptador stdio, a responsabilidade pela sanitization das entradas cabe ao desenvolvedor downstream. No nível da spec, **a revisão 2025-06-18 tornou obrigatórios OAuth 2.1 + RFC 8707 Resource Indicators**, bloqueando ataques de reutilização de tokens, enquanto **a revisão 2025-11-25 introduziu incremental scope consent** (o usuário consente gradualmente apenas com as permissões mínimas necessárias). Mesmo assim, somente em janeiro e fevereiro de 2026 foram publicadas mais de 30 CVEs relacionadas ao MCP, e **command injection representava 43%** delas. **A segurança continua sendo um campo em evolução.**


## Ferramentas de inteligência de código

Se um arquivo `.md` responde a “o que informar” e o MCP responde a “o que permitir fazer”, uma ferramenta de inteligência de código resolve o problema de “**como encontrar rapidamente o código relevante**”.

Em codebases grandes, a maior parte do custo de um agente de IA não está na alteração do código em si, mas em **descobrir onde está o código relevante**. Se toda tarefa começa com um ciclo de grep → read → filtragem → grep novamente, tokens, tempo e tool calls são desperdiçados. As ferramentas de inteligência de código são diferentes tentativas de reduzir esse custo de busca.

Organizar tudo em quatro camadas (tier) torna o cenário mais claro.


### Empacotamento de contexto

A solução mais simples parte da ideia de “**colocar tudo em uma única janela de contexto**”. Não cria grafo nem índice: apenas serializa todo o repositório como um bloco de texto e o entrega inteiro ao modelo.

Uma ferramenta representativa é o **Repomix**. Ele empacota todo o repositório em uma estrutura otimizada para o parsing de XML do Claude. Com CLI, web, extensão e servidor MCP, possui o ecossistema mais completo.

O **GitIngest** é conhecido pela experiência sem atrito. Basta trocar uma palavra em uma URL do GitHub, substituindo `github.com` por `gitingest.com`, para transformar todo o repositório em uma página de texto. (Por exemplo, `github.com/facebook/react` → `gitingest.com/facebook/react`.) Como a única ação necessária é trocar uma palavra na barra de endereço do navegador, não há instalação. É especializado em exploração rápida e pontual.

O **code2prompt** (criado por Mufeed VH) é uma CLI baseada em Rust cujo ponto forte é a personalização por um sistema de templates.

Também vale mencionar uma variação interessante: **rtk** (`rtk-ai/rtk`, cerca de 55k stars). Enquanto as ferramentas anteriores “empacotam todo o repositório de uma vez”, o rtk **comprime em tempo real a própria saída dos comandos de CLI**. É um único binário escrito em Rust que se registra automaticamente nos shell hooks de 13 ferramentas, entre elas Claude Code, Cursor, Copilot, Gemini CLI e Codex. Assim, quando o agente chama `git status`, a chamada é reescrita internamente como `rtk git status`. (O principal diferencial é que o usuário não precisa mudar seu workflow.) A ferramenta aplica heurísticas de smart filtering, grouping, truncation e deduplication a mais de 100 comandos, reduzindo os tokens de saída em 60–90%. Uma frase do site oficial resume bem essa categoria: *“70% of your bill is noise the LLM doesn't need.”* Enquanto as ferramentas anteriores reduzem a quantidade de “contexto que entra”, o rtk reduz a quantidade de “contexto que volta como resultado de uma tool call”.

O limite dessa camada, porém, é claro: **repositórios grandes atingem o limite de tokens.** Além disso, o código é entregue apenas como “um bloco de texto”, sem relações entre símbolos nem compreensão estrutural.


### Mapa do repositório com tree-sitter

A camada seguinte usa **tree-sitter** para analisar a estrutura do código, mas sem executar um servidor de índice separado.

**AST (Abstract Syntax Tree, árvore sintática abstrata)** é uma estrutura de dados que representa o código-fonte como árvore. É o resultado da etapa de análise sintática de um compilador: detalhes superficiais, como espaços, ponto e vírgula e parênteses, são removidos, enquanto elementos significativos — variáveis, operadores, chamadas de função e fluxo de controle — permanecem como nós. Toda análise precisa feita por ferramentas de inteligência de código acaba se apoiando em uma AST.

**tree-sitter** é um gerador de parsers open source e uma biblioteca de parsing incremental. Foi adotado pela navegação de código do GitHub, pelo Neovim, Zed e Helix. Seu principal diferencial é **refazer o parsing apenas da parte editada**. Mesmo que uma linha seja alterada no editor, ele não analisa o arquivo inteiro outra vez; apenas aplica um patch à árvore modificada. Por isso, responde rapidamente e também é adequado para agentes de IA examinarem o código com agilidade.

O **Aider**, apresentado antes, é um exemplo representativo dessa abordagem. Ele usa tree-sitter para extrair dos arquivos-fonte definições de símbolos como funções, classes e métodos; constrói um grafo em que arquivos são nós e dependências entre arquivos são arestas; e aplica ao grafo um algoritmo de ranking da família PageRank (que mede a importância de uma página pela quantidade e pela qualidade dos links que apontam para ela). Assim, extrai apenas as principais definições e assinaturas dentro do orçamento de tokens. (O padrão `--map-tokens=1024` gera um mapa do repositório de 1k tokens.)

O **AFT** (`cortexkit/aft`) desenvolve essa abordagem com mais precisão. Traduzindo diretamente a explicação do README oficial do AFT: **“Ler um arquivo de 500 linhas custa cerca de 375 tokens. Mas, quando o agente geralmente precisa de apenas uma função, passar o nome do símbolo a `aft_zoom` retorna somente essa função e um pouco de contexto. Isso custa cerca de 40 tokens.”** Além disso, edições baseadas em número de linha quebram assim que o código acima do alvo se move, enquanto a edição em modo de símbolo do AFT é estável por endereçar uma função pelo nome.

Há outra ferramenta digna de nota nessa camada: **ast-grep** (`ast-grep/ast-grep`, cerca de 13,9k stars). É uma CLI de busca estrutural e rewriting baseada em tree-sitter. Sua diferença decisiva em relação ao grep convencional é que ela procura padrões de CST (Concrete Syntax Tree), não texto. Por exemplo, uma busca pelo padrão `console.log($A)` encontra com precisão todas as chamadas com a mesma estrutura semântica, independentemente da aparência do texto. Existe também um servidor `ast-grep-mcp`, que permite a agentes de IA usar busca estrutural no lugar do grep textual.


### Knowledge Graph

A terceira camada vai além: **todo o codebase é previamente analisado para criar um grafo de conhecimento, que é salvo em disco**, e o agente faz queries nesse grafo armazenado. O exemplo que mais vem chamando atenção é uma ferramenta chamada **CodeGraph**.

A arquitetura é surpreendentemente simples. O código é analisado com **tree-sitter**; em seguida, os símbolos, as arestas e as informações de arquivos extraídos são armazenados na busca de texto integral FTS5 do SQLite; por fim, esse grafo de conhecimento é exposto ao agente de IA via MCP. Um ponto importante é que **toda essa extração é feita de maneira determinística por parsing de AST, não por resumo de LLM**, o que elimina espaço para alucinações.

O **FTS5 (SQLite Full-Text Search 5)** mencionado aqui é uma extensão de busca de texto integral fornecida como tabela virtual do SQLite. Ele faz parte da amalgamation desde o SQLite 3.9.0 (2015-10-14). A tabela é criada com `CREATE VIRTUAL TABLE ... USING fts5(...)` e consultada pelo operador `MATCH`. A vantagem decisiva é poder manter um índice de texto integral em um único arquivo SQLite sem executar um mecanismo de busca separado, como o Elasticsearch. Esse é um dos motivos pelos quais o CodeGraph pode anunciar “operação 100% local”.

Já o **parsing determinístico (deterministic)** citado acima designa algoritmos de parsing que permitem uma única escolha em cada etapa, sem backtracking. Parsers LL(1) e LR são exemplos representativos e operam em tempo linear. No contexto do CodeGraph, isso significa que “as relações entre símbolos extraídas da AST são matematicamente exatas, e não interpretações de um LLM”. Se um LLM resumisse o código para criar o grafo, haveria risco de alucinação; ao analisar a AST diretamente, é possível obter **relações entre símbolos matematicamente exatas**. Esse princípio é central para a abordagem.

Os benchmarks também impressionam. Uma comparação executou Claude Opus 4.7 em modo headless com e sem o MCP do CodeGraph. Segundo as médias do README oficial, com o CodeGraph o custo caiu **35%**, o uso de tokens caiu **57%**, a execução ficou **46% mais rápida** e as **tool calls diminuíram 71%**. O ganho cresce proporcionalmente ao tamanho do codebase: em um repositório grande como Tokio, foram medidos até 82% de redução de custo, 86% de redução de tokens, 71% de aumento de velocidade e 92% de redução nas tool calls. (Sem CodeGraph, o agente espalha amplamente grep/find/Read; com CodeGraph, uma única query ao índice substitui tudo isso.)

O contexto acadêmico também é profundo. O **GraphCoder** (ASE 2024) criou um Code Context Graph que integra control flow e data/control dependence. O **CodexGraph** (NAACL 2025) fez agentes LLM escreverem e executarem diretamente queries em bancos de dados de grafos. O **Prometheus** combinou um grafo de conhecimento baseado em tree-sitter com memória integrada e aplicou a solução de issues multilíngues. É evidente que academia e indústria estão convergindo simultaneamente nessa direção.

Vale observar uma variação interessante. **A indexação do Cursor** segue um caminho diferente: busca semântica baseada em vector embeddings, não em grafo de AST. Localmente, os arquivos são divididos em chunks por função e classe e sincronizados com o servidor por hashes de Merkle tree; apenas os embeddings são armazenados em um banco de dados vetorial chamado Turbopuffer. (O ponto central do modelo de privacidade é que o código-fonte original não é armazenado na cloud.) Na consulta, a pergunta é convertida em embedding para executar uma busca de nearest neighbors; os caminhos e intervalos de linhas retornados são então lidos localmente e enviados ao LLM. Como a ferramenta busca **“código semanticamente relacionado” em vez de “símbolos exatos”**, tem precisão menor, mas funciona bem com consultas em linguagem natural. CodeGraph e a indexação do Cursor resolvem o mesmo problema — o custo de busca — com premissas diferentes.


### LSP

A última camada **depende diretamente de servidores de linguagem**. Enquanto tree-sitter sabe “que um símbolo existe”, LSP sabe “o que esse símbolo é”.

Vejamos um exemplo concreto da diferença. O LSP do TypeScript sabe que `UserService` implementa a interface `IUserService`, quais parâmetros de tipo genérico recebe, quais overloads possui e qual é seu tipo de retorno. tree-sitter não chega a esse nível.

O **Serena**, discutido na seção sobre MCP, pertence exatamente a essa camada. Como o Aider não usa LSP e faz sua própria análise dos arquivos, seu reconhecimento se limita a funções e classes. Já uma integração LSP como a do **OpenCode** oferece compreensão mais profunda dos tipos, mas tem a limitação de depender de um bom servidor LSP para cada linguagem.


## GitHub Trending

![Fluxo das ferramentas para agentes de programação com IA e da inteligência de código](1.webp)

Por fim, vale mencionar que conheci boa parte das ferramentas acima por meio do **GitHub Trending**. É um lugar onde se pode ver de uma só vez quem está criando quais ferramentas e o que ganhou popularidade repentinamente.

Em `github.com/trending`, é possível visualizar três períodos: today, this week e this month. Também há filtros por linguagem e categoria. (Em geral, acompanho weekly + TypeScript / Python e, às vezes, amplio para todas as linguagens.)

Ao acompanhar o Trending nas últimas semanas, percebi algo interessante: **os principais repositórios deste trimestre formam clusters bem definidos**. Entender esses clusters ajuda a situar melhor cada ferramenta.

## E então?

Ao escrever este texto, o pensamento que mais me ocorreu foi: **as ferramentas estão se multiplicando rápido demais**. Enquanto eu escrevia, novos servidores MCP apareciam no GitHub Trending, o estado do suporte a AGENTS.md mudava e novas CVEs de segurança eram publicadas. A sensação de que um parágrafo ainda pela metade já ficou obsoleto faz parte do destino de quem escreve sobre tecnologia, mas o ritmo do ecossistema de agentes de IA é especialmente intenso.

Por isso, meu objetivo neste artigo não foi recomendar ferramentas específicas, mas desenvolver **um olhar capaz de enxergar as relações entre elas**. Depois de entender por que CLAUDE.md é injetado como user message, o que exatamente diferencia MCP de function calling e por que tree-sitter e LSP pertencem a camadas distintas, fica mais fácil olhar para uma ferramenta nova e perceber rapidamente “em qual camada ela está e que problema resolve de que maneira”.

No fim, o que permanece é uma intuição transmitida pelo estudo da ETH Zurich: **o modelo já sabe muitas coisas.** Encher um arquivo de contexto com todo tipo de informação não faz o agente segui-lo melhor. É preferível manter apenas o que o modelo provavelmente não conhece — convenções específicas do projeto, ferramentas não convencionais e erros do passado — e remover o restante. Instalar mais ferramentas e saber usá-las bem são problemas diferentes.

Em vez de adicionar dez MCPs agora mesmo ou ampliar CLAUDE.md para centenas de linhas, recomendo que quem leu este artigo procure entender ao menos uma vez os princípios por trás das ferramentas que já usa. Acredito que essa compreensão cria uma base estável, independentemente da direção que o ecossistema tomar.


## Referências

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
- [repo] [rtk-ai/rtk](https://github.com/rtk-ai/rtk)
:::
