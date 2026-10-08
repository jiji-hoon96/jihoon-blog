---
emoji: 🧭
title: 'Ferramentas para agentes de IA'
seoTitle: "CLAUDE.md, AGENTS.md e SKILL.md: arquivos de contexto"
date: '2026-05-29'
updatedAt: "2026-10-08"
categories: IA Ferramentas-de-desenvolvimento Claude MCP CodeGraph
description: "Como agentes carregam CLAUDE.md, AGENTS.md, SKILL.md e regras do Cursor, por que instruções se perdem e o que escrever segundo um estudo da ETH Zurich."
keywords: "CLAUDE.md, AGENTS.md, SKILL.md, MEMORY.md, regras do Cursor, copilot-instructions.md, arquivos de contexto, agente de programação com IA, Claude Code, estudo ETH Zurich AGENTS.md"
locale: pt-BR
translationOf: '260529'
sourceHash: 576f9a09086bc4f6444b6e39ded3b6204214a004b2497c595989116307daebab
---

Neste post, quero falar sobre **os arquivos de contexto que os agentes de programação com IA leem**.

Este texto é para quem tem `CLAUDE.md`, `AGENTS.md`, `SKILL.md` e `.cursor/rules` acumulados no mesmo projeto e não sabe ao certo quando cada um é lido nem o que escrever nele. Ao final, você conhecerá as diferenças entre esses arquivos, como os agentes os carregam e um critério apoiado por um estudo da ETH Zurich: escrever apenas as informações que o agente não consegue inferir.

Trabalho como desenvolvedor frontend e uso Claude no dia a dia. Com isso, em algum momento surgiu um `CLAUDE.md` na raiz do projeto, ao lado havia um `AGENTS.md` criado por alguém, um `.cursorrules` continuava esquecido em algum canto e eu cheguei até a criar uma pasta `.claude/skills/` seguindo um artigo que encontrei por aí. (Quando me dei conta, havia uns cinco arquivos com conteúdos parecidos.)


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

O MCP (Model Context Protocol), com o qual as Skills foram comparadas aqui, é um protocolo padrão que conecta o agente a sistemas externos como Slack, GitHub ou um banco de dados para que ele possa chamá-los. Se os arquivos de contexto tratam do que informar ao agente, o MCP trata do que permitir que ele faça. Como o MCP difere de function calling está explicado à parte em [MCP e function calling](/260524).


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


## E então?

Ao escrever este texto, o pensamento que mais me ocorreu foi: **as ferramentas estão se multiplicando rápido demais**. Enquanto eu escrevia, novos servidores MCP apareciam no GitHub Trending, o estado do suporte a AGENTS.md mudava e novas CVEs de segurança eram publicadas. A sensação de que um parágrafo ainda pela metade já ficou obsoleto faz parte do destino de quem escreve sobre tecnologia, mas o ritmo do ecossistema de agentes de IA é especialmente intenso.

Por isso, meu objetivo neste artigo não foi recomendar um formato de arquivo específico, mas desenvolver **um olhar capaz de enxergar como os agentes leem esses arquivos**. Depois de entender por que CLAUDE.md é injetado como user message, por que cada ferramenta lê o mesmo AGENTS.md de um jeito diferente e por que as instruções se enfraquecem no meio do contexto, fica mais fácil olhar para um novo formato de arquivo de contexto e perceber rapidamente “quando ele é carregado e com que força atua”.

No fim, o que permanece é uma intuição transmitida pelo estudo da ETH Zurich: **o modelo já sabe muitas coisas.** Encher um arquivo de contexto com todo tipo de informação não faz o agente segui-lo melhor. É preferível manter apenas o que o modelo provavelmente não conhece — convenções específicas do projeto, ferramentas não convencionais e erros do passado — e remover o restante. Instalar mais ferramentas e saber usá-las bem são problemas diferentes.

Em vez de adicionar dez MCPs agora mesmo ou ampliar CLAUDE.md para centenas de linhas, recomendo que quem leu este artigo procure entender ao menos uma vez os princípios por trás das ferramentas que já usa. Acredito que essa compreensão cria uma base estável, independentemente da direção que o ecossistema tomar.


## Referências

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
:::
