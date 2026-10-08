---
emoji: 🔌
title: "MCP e function calling"
seoTitle: "MCP versus function calling: protocolo e fluxo de chamadas"
date: "2026-05-24"
categories: IA Ferramentas-de-desenvolvimento Claude MCP CodeGraph
description: "Como o MCP difere de function calling: seis primitivas, stdio e Streamable HTTP, o fluxo de tools/list ao loop tool_use e riscos como Tool Poisoning."
keywords: "MCP, Model Context Protocol, MCP vs function calling, primitivas MCP, tools/list, Streamable HTTP, Tool Poisoning Attack, segurança MCP"
locale: pt-BR
translationOf: '260524'
sourceHash: c8c4c1ecc1bcc3dec03f51f86523bff1a97cfb134b8b21433ff155fcea071b34
---

Neste post, quero falar sobre **como o MCP (Model Context Protocol) difere de function calling**.

Este texto é para quem usa servidores MCP com Claude Code ou Cursor, mas tem dificuldade em explicar onde o MCP se separa do function calling das APIs de LLM. Adiantando a resposta, são quatro diferenças: descoberta dinâmica, que obtém a lista de ferramentas em tempo de execução; uma stateful session com ciclo de vida definido; primitivas além de Tool; e bidirecionalidade, que permite ao servidor chamar o LLM do cliente no sentido inverso. Ao final, você saberá de que parte do protocolo vem cada uma dessas quatro diferenças e a que problemas de segurança essa estrutura leva.

Trabalho como desenvolvedor frontend e uso o Claude no dia a dia, mas, a cada servidor MCP que eu adicionava, nunca ficava muito claro para mim como essas ferramentas entravam no campo de visão do modelo.


## MCP (Model Context Protocol)

O MCP (Model Context Protocol) resolve o problema de “**o que permitir que o agente faça**”.

Em termos mais concretos: para um agente de IA enviar uma mensagem no Slack, ele precisa conseguir chamar a API do Slack. Para criar uma issue no GitHub, precisa chamar a API do GitHub. Para fazer uma query no Postgres, precisa saber lidar com a conexão ao banco. O MCP **reúne todas essas integrações com sistemas externos em um único protocolo padrão**. (A ideia é que qualquer cliente possa se conectar a qualquer servidor pela mesma interface.)

O MCP é um padrão aberto apresentado pela primeira vez pela Anthropic em **25 de novembro de 2024**. Em **9 de dezembro de 2025**, Anthropic, Block e OpenAI, como cofundadoras, doaram a especificação do MCP à **Agentic AI Foundation (AAIF)**, vinculada à Linux Foundation. Google, Microsoft, AWS, Cloudflare e Bloomberg aderiram como membros platinum. (Na data da doação, em dezembro de 2025, o ecossistema já registrava mais de 97 milhões de downloads mensais dos SDKs e mais de 10 mil servidores MCP públicos ativos.)

O MCP é um protocolo de sessão stateful construído sobre JSON-RPC. **JSON-RPC** é um protocolo de RPC (Remote Procedure Call) stateless e leve que usa JSON como wire format. Como é independente da camada de transporte, funciona sobre HTTP, TCP ou entrada e saída padrão. Também oferece suporte a notification (chamada sem resposta) e chamadas batch.


### Por dentro do protocolo

Toda interação entre cliente e servidor no MCP é representada por um de seis tipos primitivos (primitive). Aqui, primitive não tem relação com os tipos primitivos do JavaScript (como string ou number); designa um tipo básico de interação definido pelo protocolo. No início havia três no lado do servidor; a spec 2025-06-18 acrescentou três primitivas do lado do cliente, totalizando as seis atuais.

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

Depois de conhecer as primitivas e os transportes, vamos acompanhar o fluxo de **como um LLM realmente descobre e chama ferramentas MCP**.

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

O cliente converte a lista recebida por `tools/list` para o **parâmetro `tools` da Anthropic Messages API** ou para o **parâmetro `tools` do OpenAI function calling** e a inclui na chamada à API do LLM. No caso da Anthropic, quando o parâmetro tool é fornecido, um **special system prompt é adicionado automaticamente** para ensinar o modelo a fazer chamadas de tool. (No Claude 4.x, com `tool_choice: auto`, só esse prompt acrescenta 346 tokens.)

Quando o LLM decide chamar uma ferramenta, sua resposta contém um bloco `tool_use` (`{"type": "tool_use", "name": ..., "input": ...}`), e a resposta termina com `stop_reason` definido como `tool_use`. O cliente recebe isso, envia `tools/call` ao servidor MCP real, obtém o resultado e o devolve ao LLM em um bloco `tool_result` na próxima user message. **Esse loop se repete até que `stop_reason` mude de `tool_use` para outro valor, como `end_turn` ou `max_tokens`.** O comportamento que costumamos chamar de “um agente trabalhando” é, na prática, uma sequência desse loop de chamada–resultado–chamada.

Então, o que diferencia o MCP de um simples function calling? A resposta pode ser resumida em quatro pontos.

- **Descoberta dinâmica**: a lista de ferramentas não precisa ser conhecida em build time; ela é obtida em runtime por `tools/list`. Alterações durante a sessão também são possíveis com `notifications/tools/list_changed`
- **Sessão stateful**: há lifecycle phases definidas (initialize → operation → shutdown), permitindo um encerramento organizado
- **Primitivas além de Tool**: Prompt, Resource, Sampling, Roots e Elicitation também são expostas por capability negotiation
- **Bidirecionalidade**: pela spec, o servidor também pode chamar o LLM do cliente por sampling

(Por essa diferença, o MCP às vezes é chamado de “padrão generalizado de function calling para agentes”.)


### Então, o MCP é seguro?

Há um ponto importante: **o MCP não automatiza a concessão de permissões.** Cabe ao usuário decidir em quais servidores o agente pode confiar, quais efeitos colaterais cada ferramenta produz e se ela continuará se comportando da mesma maneira ao longo do tempo.

Vale conhecer dois ataques representativos.

- **Tool Poisoning Attack (TPA)**: ataque batizado pela Invariant Labs, que publicou uma PoC em abril de 2025. Ao esconder instruções maliciosas na descrição (description) de uma ferramenta de um servidor MCP, o modelo pode confundi-las com instruções do usuário e segui-las. É um texto invisível para o usuário, mas visível para o modelo.

- **Rug Pull** (Silent Redefinition): conceito abordado por Simon Willison em uma análise publicada em 9 de abril de 2025. No início, a ferramenta é legítima. O usuário a revisa, aprova e integra ao workflow. Semanas depois, sua definição é alterada silenciosamente para incluir instruções maliciosas. Como não houve uma nova aprovação do usuário, o comportamento muda sem aviso.

Houve um incidente de segurança em **15 de abril de 2026**. A OX Security revelou vulnerabilidades sistêmicas de RCE que afetavam todos os principais SDKs do MCP (Python, TypeScript, Java e Rust). Mais de 150 milhões de downloads, cerca de 7.000 servidores públicos e uma estimativa de 200 mil deploys vulneráveis ficaram sob risco. Mais de 14 CVEs foram atribuídas, e Cursor, VS Code, Windsurf, Claude Code e Gemini-CLI estavam entre os afetados.

E o que aconteceu depois? A Anthropic **não alterou a arquitetura do protocolo**. Em vez disso, atualizou `SECURITY.md` para deixar claro que, ao usar o adaptador stdio, a responsabilidade pela sanitization das entradas cabe ao desenvolvedor downstream. No nível da spec, **a revisão 2025-06-18 tornou obrigatórios OAuth 2.1 + RFC 8707 Resource Indicators**, bloqueando ataques de reutilização de tokens, enquanto **a revisão 2025-11-25 introduziu incremental scope consent** (o usuário consente gradualmente apenas com as permissões mínimas necessárias). Mesmo assim, somente em janeiro e fevereiro de 2026 foram publicadas mais de 30 CVEs relacionadas ao MCP, e **command injection representava 43%** delas. **A segurança continua sendo um campo em evolução.**


## Conclusão

Em resumo, o MCP não substitui o function calling; é um padrão construído sobre ele. O modelo continua chamando ferramentas pelo parâmetro `tools` e pelo loop `tool_use`; o que o MCP acrescenta é uma forma de trocar a lista de ferramentas em tempo de execução, um ciclo de vida de sessão, primitivas além de Tool e chamadas que vão do servidor para o cliente. Como as definições de ferramentas trafegam em tempo de execução, é nesse mesmo ponto que surgem os ataques que as envenenam ou as alteram silenciosamente.

Se o MCP trata do que permitir que o agente faça, o que informar a ele é papel de arquivos de contexto como `CLAUDE.md` e `AGENTS.md`. Como o agente lê esses arquivos e até que ponto suas instruções são seguidas é o tema de [Ferramentas para agentes de IA](/260529).


## Referências

:::ref
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
:::
