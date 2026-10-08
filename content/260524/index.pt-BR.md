---
emoji: 🔌
title: "MCP e function calling"
seoTitle: "MCP versus function calling: protocolo e fluxo de chamadas"
date: "2026-05-24"
updatedAt: "2026-10-08"
categories: IA Ferramentas-de-desenvolvimento Claude MCP CodeGraph
description: "Como o MCP difere de function calling: seis primitivas, stdio e Streamable HTTP, o fluxo de tools/list ao loop tool_use e riscos como Tool Poisoning."
keywords: "MCP, Model Context Protocol, MCP vs function calling, primitivas MCP, tools/list, Streamable HTTP, Tool Poisoning Attack, segurança MCP"
locale: pt-BR
translationOf: '260524'
sourceHash: 40b731774ee30c6a2b8287ddcb0a8bf0acc4f1476512e95a6310a8b8a18e50fa
---

Neste post, quero falar sobre **como o MCP (Model Context Protocol) difere de function calling**.

Este texto é para quem usa servidores MCP com Claude Code ou Cursor, mas tem dificuldade em explicar onde o MCP se separa do function calling das APIs de LLM. A resposta curta é que o MCP não substitui o function calling. A aplicação host converte a lista de ferramentas que recebe de um servidor MCP no parâmetro `tools` do function calling e devolve ao servidor MCP a chamada que o modelo escolhe. Ao final, você saberá de que parte do protocolo vem cada uma das quatro diferenças que o MCP acrescenta por cima, quais diferenças sobrevivem à revisão 2026-07-28 e que superfície de ataque essa estrutura abre.

Trabalho como desenvolvedor frontend e uso o Claude no dia a dia, mas, a cada servidor MCP que eu adicionava, nunca ficava muito claro para mim como essas ferramentas entravam no campo de visão do modelo.


## MCP (Model Context Protocol)

O MCP (Model Context Protocol) resolve o problema de “**o que permitir que o agente faça**”.

Em termos mais concretos: para um agente de IA enviar uma mensagem no Slack, ele precisa conseguir chamar a API do Slack. Para criar uma issue no GitHub, precisa chamar a API do GitHub. Para fazer uma query no Postgres, precisa saber lidar com a conexão ao banco. O MCP **reúne todas essas integrações com sistemas externos em um único protocolo padrão**. (A ideia é que qualquer cliente possa se conectar a qualquer servidor pela mesma interface.)

O MCP é um padrão aberto apresentado pela primeira vez pela Anthropic em **25 de novembro de 2024**. Em **9 de dezembro de 2025**, Anthropic, Block e OpenAI, como cofundadoras, doaram a especificação do MCP à **Agentic AI Foundation (AAIF)**, vinculada à Linux Foundation. Google, Microsoft, AWS, Cloudflare e Bloomberg aderiram como membros platinum. (Na data da doação, em dezembro de 2025, o ecossistema já registrava mais de 97 milhões de downloads mensais dos SDKs e mais de 10 mil servidores MCP públicos ativos.)

O MCP é um protocolo construído sobre JSON-RPC. O [JSON-RPC 2.0](https://www.jsonrpc.org/specification) é um protocolo de RPC (Remote Procedure Call) stateless e leve que usa JSON como wire format. Como é independente da camada de transporte, funciona sobre HTTP, TCP ou entrada e saída padrão. Também define notification (chamada sem resposta) e chamadas batch, mas o MCP removeu o batch na [revisão 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/changelog). Este texto usa como referência a revisão 2025-11-25, na qual o MCP é um protocolo stateful que estabelece uma sessão para cada conexão. O que mudou na revisão seguinte fica para depois de percorrermos o fluxo de chamadas.


### Por dentro do protocolo

A visão geral da especificação 2025-11-25 divide o que clientes e servidores trocam em seis primitivas. Aqui, primitiva não tem relação com os tipos primitivos do JavaScript (como string ou number); refere-se a um tipo básico de interação definido pelo protocolo. As três primitivas do lado do servidor e Sampling e Roots do lado do cliente existem desde a primeira revisão (2024-11-05), enquanto Elicitation entrou na revisão 2025-06-18.

**Primitivas do lado do servidor**

- **Tool** (model-controlled): uma ação cuja chamada o próprio modelo decide. Essas ações podem ter efeitos colaterais (side effects)
- **Resource** (application-controlled): dados identificados por uma URI. A especificação só tem `resources/read` para ler o conteúdo e nenhum método de escrita. A aplicação host decide quais recursos expor
- **Prompt** (user-controlled): um template reutilizável que o usuário aciona explicitamente, por exemplo com um comando de barra

**Primitivas do lado do cliente**

- **Sampling**: um mecanismo que permite ao servidor pedir, no sentido inverso, uma completion ao LLM do cliente, tornando bidirecional a relação entre cliente e servidor
- **Roots**: informação sobre os limites do workspace com a qual o cliente diz ao servidor “até aqui vai a área em que você pode trabalhar”
- **Elicitation**: um recurso que permite ao servidor pedir ao usuário dados adicionais de forma estruturada enquanto executa uma ferramenta

Essa distinção importa porque **quem decide chamar ou fornecer algo é diferente**. Um Tool é executado por decisão do modelo, então uma chamada errada traz risco, enquanto um Prompt é escolhido explicitamente pelo usuário. Um Resource é escolhido pela aplicação por padrão, mas a especificação também permite implementações que incluem recursos automaticamente, com base em heurísticas ou na seleção do modelo. Por isso não dá para dizer que um Resource é sempre mais seguro que um Tool. As três primitivas do lado do cliente vão no sentido oposto: o servidor pede, e o cliente decide se responde.

Há dois [mecanismos de transporte padrão](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), e a especificação também permite outros transportes personalizados (MAY). O primeiro é o **stdio**, que executa o servidor MCP como um subprocesso local e se comunica pela entrada e saída padrão. É adequado para ferramentas que funcionam localmente, como sistema de arquivos ou git. O segundo é o **Streamable HTTP**, que coloca streaming SSE sobre HTTP POST para criar uma comunicação quase bidirecional. É adequado para cenários que acontecem através da rede, como servidores remotos, autenticação OAuth, conexões de vários clientes e deploy em nuvem.

Aqui, SSE (Server-Sent Events) é uma forma de o servidor enviar dados unidirecionais ao cliente por uma conexão HTTP, e hoje está definido no [padrão HTML do WHATWG](https://html.spec.whatwg.org/multipage/server-sent-events.html). O media type é `text/event-stream`, e no JavaScript ele é acessado pela API `EventSource`. Diferentemente do WebSocket, é unidirecional, mas, como funciona sobre HTTP, tem a vantagem de se dar bem com proxies e firewalls. O Streamable HTTP, na prática, usa o SSE para imitar uma comunicação bidirecional. Ele foi introduzido na especificação de **26 de março de 2025** (versão `2025-03-26`) e substituiu o antigo transporte HTTP+SSE.


### O fluxo de uma chamada de ferramenta MCP por um LLM

Depois de ver as primitivas e os transportes, vamos seguir o fluxo de **como um LLM realmente descobre e chama uma ferramenta MCP**.

Na revisão 2025-11-25, quando uma conexão começa, acontece o seguinte handshake. Em 2026-10-08, o SDK de TypeScript 1.32.1 e a versão 2.3.1 da linha v2 também seguem essa ordem na configuração padrão.

- **Cliente → servidor**: requisição `initialize` (envia a versão de protocolo suportada e as capabilities do cliente)
- **Servidor → cliente**: resposta `initialize` (capabilities do servidor e, opcionalmente, o campo `instructions`)
- **Cliente → servidor**: notificação `notifications/initialized`
- **Cliente → servidor**: requisição `tools/list` → recebe a lista de ferramentas disponíveis
- (Depois) O LLM decide chamar uma ferramenta → o cliente envia `tools/call` → recebe o resultado

Há um detalhe que costuma passar despercebido: a **resposta `initialize` e seu campo `instructions`**. É onde o servidor envia um texto sobre como suas ferramentas devem ser usadas, e o [comentário do schema da especificação](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts) só diz que esse conteúdo MAY ser adicionado ao system prompt. Adicionar ou não é decisão do host. No exemplo abaixo, o SDK de TypeScript 1.32.1 apenas entrega esse valor por `getInstructions()` e não o repassa ao modelo. Na minha visão, esse espaço é do mesmo tipo que o Tool Poisoning que veremos adiante, porque um texto escrito pelo servidor pode acabar diante do modelo.

Então, como a própria definição da ferramenta entra no campo de visão do LLM? A definição de uma ferramenta MCP tem esta forma de JSON Schema.

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

O host converte a lista recebida por `tools/list` no **parâmetro `tools` da Anthropic Messages API** ou no **parâmetro `tools` do OpenAI function calling** e a inclui na chamada à API do LLM. No caso da Anthropic, quando o parâmetro de ferramentas é enviado, um [special system prompt é adicionado automaticamente](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) para que o modelo entenda como chamar ferramentas. O tamanho varia conforme o modelo. Na tabela da documentação que consultei em 2026-10-08, os modelos atuais adicionavam de 286 a 675 tokens com `tool_choice: auto`.

Quando o LLM decide que precisa chamar uma ferramenta, a resposta contém um bloco `tool_use` (`{"type": "tool_use", "name": ..., "input": ...}`) e o `stop_reason` da resposta termina como `tool_use`. O host recebe isso, envia `tools/call` ao servidor MCP real, recebe o resultado, coloca-o em um bloco `tool_result` da próxima mensagem user e o envia de volta ao LLM. **Esse loop se repete até que `stop_reason` mude de `tool_use` para outro valor, como `end_turn` ou `max_tokens`.** O que costumamos chamar de “o agente trabalhando” é, na prática, uma sequência desses loops de chamada, resultado e nova chamada.

Desenhando, não há nenhuma linha entre o modelo e o servidor MCP. O modelo só vê as definições que recebeu por `tools`, e o servidor MCP recebe as requisições do host, não do modelo. O que liga os dois protocolos é o host no meio.

![Entre a API do LLM à esquerda e o host no centro vão setas rotuladas tools, tool_use e tool_result, e entre o host e o servidor MCP à direita vão setas rotuladas tools/list e tools/call. Não há nenhuma linha entre a API do LLM e o servidor MCP](1.png?w=720)

Executei essa conversão para ver o quanto ela é curta de fato. Rodou em 2026-10-08 com Node v24.16.0, `@modelcontextprotocol/sdk` 1.32.1 e `zod` 4.6.5. Em vez de stdio, o transporte é o `InMemoryTransport`, que liga servidor e cliente dentro de um mesmo processo, e nenhum LLM foi chamado. O bloco `tool_use` foi montado à mão no formato mostrado na documentação da Anthropic.

```js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

// MCP 서버: 도구 하나와 instructions 를 둔다
const server = new McpServer(
  { name: "weather", version: "1.0.0" },
  { instructions: "Use get_weather for current conditions only." }
);
server.registerTool(
  "get_weather",
  { description: "Get current weather information for a location", inputSchema: { location: z.string() } },
  async ({ location }) => ({ content: [{ type: "text", text: `${location}: 15C, partly cloudy` }] })
);

// 호스트: 같은 프로세스 안에서 서버와 잇고, 클라이언트가 보내는 메서드 이름을 찍는다
const [clientT, serverT] = InMemoryTransport.createLinkedPair();
const send = clientT.send.bind(clientT);
clientT.send = (m) => { console.log("C->S", m.method, m.params?.protocolVersion ?? ""); return send(m); };
await server.connect(serverT);
const client = new Client({ name: "demo-host", version: "1.0.0" });
await client.connect(clientT);
console.log("instructions:", client.getInstructions());

// 1. tools/list 결과를 LLM API 의 tools 파라미터 모양으로 바꾼다
const { tools } = await client.listTools();
const anthropicTools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
const openaiTools = tools.map((t) => ({ type: "function", name: t.name, description: t.description, parameters: t.inputSchema }));
console.log("anthropic:", JSON.stringify(anthropicTools[0]));
console.log("openai:", JSON.stringify(openaiTools[0]));

// 2. 모델이 이런 tool_use 블록을 돌려줬다고 가정한다. input 이 그대로 tools/call 의 arguments 가 된다
const toolUse = { type: "tool_use", id: "toolu_demo", name: "get_weather", input: { location: "Seoul" } };
const result = await client.callTool({ name: toolUse.name, arguments: toolUse.input });
console.log("tool_result:", JSON.stringify({ type: "tool_result", tool_use_id: toolUse.id, content: result.content }));
await client.close();
```

A saída de `node post-demo.mjs` é esta.

```text
C->S initialize 2025-11-25
C->S notifications/initialized 
instructions: Use get_weather for current conditions only.
C->S tools/list 
anthropic: {"name":"get_weather","description":"Get current weather information for a location","input_schema":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"],"$schema":"http://json-schema.org/draft-07/schema#"}}
openai: {"type":"function","name":"get_weather","description":"Get current weather information for a location","parameters":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"],"$schema":"http://json-schema.org/draft-07/schema#"}}
C->S tools/call 
tool_result: {"type":"tool_result","tool_use_id":"toolu_demo","content":[{"type":"text","text":"Seoul: 15C, partly cloudy"}]}
```

A conversão não passa de renomear campos. O `inputSchema` do MCP vira `input_schema` na Anthropic e `parameters` na OpenAI. A saída também mostra que o SDK acrescenta `$schema` ao schema. A direção contrária é igualmente curta. O `tool_use.input` da Anthropic é um objeto, então entra direto em `tools/call` como seus `arguments`. O formato da OpenAI acima é o da Responses API. Os `arguments` de uma chamada que a OpenAI devolve são uma [string JSON](https://developers.openai.com/api/docs/guides/function-calling), então precisam passar uma vez por `JSON.parse` antes de serem repassados. Confirmei essa parte na documentação e não a executei no código acima.


### Quatro coisas que o MCP acrescenta

Então, o que o MCP acrescenta ao function calling? Pela revisão 2025-11-25, são quatro coisas.

- **Descoberta dinâmica**: a lista de ferramentas não é conhecida em tempo de build, e sim obtida em tempo de execução por `tools/list`. O servidor pode avisar por `notifications/tools/list_changed` que a lista mudou durante a conexão
- **Stateful session**: a conexão é estabelecida com `initialize`, e as requisições são trocadas dentro dela. Não há uma mensagem de encerramento própria; fechar o transporte é o encerramento
- **Primitivas além de Tool**: Resource, Prompt, Sampling, Roots e Elicitation são expostos por capability negotiation. A capability negotiation é a etapa de `initialize` em que cada lado anuncia os recursos que suporta
- **Bidirecionalidade**: o servidor pode pedir, no sentido inverso, uma completion ao LLM do cliente por Sampling

No entanto, em 2026-10-08, a revisão que o site oficial abre como latest é a [revisão 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog), e nela metade desta lista mudou. O handshake formado por `initialize` e `notifications/initialized` e as sessões no nível do protocolo desapareceram, e cada requisição leva em `_meta` a versão do protocolo e as capabilities do cliente. Os servidores MUST implementar `server/discover`, que anuncia as versões e capabilities suportadas. Sampling e Roots ficaram deprecated junto com Logging, e a especificação recomenda integrar diretamente com as APIs dos provedores de LLM em vez de usar Sampling. As requisições que o servidor enviava primeiro foram substituídas por um padrão chamado Multi Round-Trip Requests.

Mesmo assim, o comportamento padrão dos SDKs ainda é o antigo. O SDK de TypeScript 1.32.1 tem `2025-11-25` como constante de versão mais recente e não conhece a revisão 2026-07-28, e a 2.3.1 suporta essa revisão, mas sua negociação de versão padrão é `legacy`. A primeira linha da saída acima, `initialize 2025-11-25`, é o resultado disso.

O que resta das quatro, então, é a descoberta dinâmica e as primitivas além de Tool (Resource, Prompt, Elicitation). A descoberta dinâmica também mudou um pouco de forma: as notificações de mudança de lista só chegam aos clientes que fazem opt-in no stream `subscriptions/listen`. No fim, o ponto em que o MCP se separa do function calling está menos nas sessões ou na bidirecionalidade e mais em **um contrato para trocar a lista de ferramentas e o contexto em tempo de execução**.


### Quando a API vira o cliente MCP

O [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) da Anthropic mostra quanto desse contrato chega ao modelo. É um recurso em que a Messages API se conecta diretamente a um servidor MCP remoto, e a seção Limitations da documentação diz que, dos recursos da especificação MCP, "only tool calls are currently supported", e que "Local STDIO servers cannot be connected directly". A mesma documentação orienta que, se você precisar de servidores locais, prompts ou resources do MCP, gerencie a conexão por conta própria com um SDK de MCP e use os helpers de conversão do SDK da Anthropic.

Ou seja, quando o MCP é consumido na camada de function calling, só sobra o Tool. Resource e Prompt só fazem sentido quando há um host para levá-los à tela ou ao contexto. O guia de function calling da OpenAI também apresenta uma forma de usar a funcionalidade de um servidor MCP como built-in tool. Até onde esse lado aceita primitivas além de Tool não foi verificado neste texto.


### A superfície de ataque da descoberta dinâmica

**O MCP não automatiza a autorização.** A [especificação de tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) recomenda que haja no loop uma pessoa capaz de recusar chamadas de ferramentas (SHOULD) e exige que as tool annotations não sejam consideradas confiáveis a menos que venham de servidores confiáveis (MUST). Em quais servidores confiar e se uma ferramenta continuará se comportando da mesma forma ao longo do tempo fica a cargo do host e do usuário.

Os dois ataques representativos vêm do fato de as definições de ferramentas trafegarem em tempo de execução.

- **Tool Poisoning Attack (TPA)**: um ataque que a [Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) nomeou e para o qual publicou uma PoC em abril de 2025. Se instruções maliciosas forem escondidas na descrição (description) de uma ferramenta de um servidor MCP, o modelo pode confundi-las com instruções do usuário e segui-las. É um texto invisível para o usuário, mas visível para o modelo.

- **Rug Pull** (Silent Redefinition): um ataque em que o servidor muda a definição de uma ferramenta depois que o usuário a aprovou. A Invariant Labs o descreveu primeiro no mesmo post, o nome Silent Redefinition vem de um texto de Elena Cross, e [Simon Willison](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/) o citou em sua análise de 9 de abril de 2025. A ferramenta começa legítima. O usuário a revisa, aprova e integra ao fluxo de trabalho. Semanas depois, a definição muda silenciosamente e passa a incluir instruções maliciosas. Como o usuário não precisa aprová-la de novo, o comportamento muda sem aviso.

Um Rug Pull acontece no mesmo lugar que `notifications/tools/list_changed`, que é o que torna possível a descoberta dinâmica. A especificação só define como avisar que a lista mudou; não exige mostrar de novo ao usuário a definição alterada. Willison escreveu que os clientes MCP deveriam mostrar aos usuários as descrições iniciais das ferramentas e alertá-los se essas descrições mudarem. Pedir uma nova aprovação depois de uma mudança é tarefa do host, não da especificação.


## Conclusão

Em resumo, o MCP não substitui o function calling; é um padrão que se apoia sobre ele. O modelo continua chamando ferramentas pelo parâmetro `tools` e pelo loop de `tool_use`, e o host traduz entre os dois protocolos. Na revisão 2025-11-25, o que o MCP acrescentava era a descoberta dinâmica, uma stateful session, primitivas além de Tool e chamadas que vão do servidor para o cliente. Com o fim das sessões e o Sampling deprecated na revisão 2026-07-28, o que resta é um contrato para trocar a lista de ferramentas e o contexto em tempo de execução. Por causa desse contrato, ataques que envenenam as definições de ferramentas ou as mudam em silêncio surgem no mesmo lugar. Quando adicionar mais um servidor MCP, recomendo verificar não só o que esse servidor pode fazer, mas também se o seu host avisa quando as definições dele mudam.

Se o MCP trata do que permitir que o agente faça, o que informar a ele é papel de arquivos de contexto como `CLAUDE.md` e `AGENTS.md`. Como o agente lê esses arquivos e até que ponto suas instruções são seguidas é o tema de [Arquivos de contexto](/260529).


## Referências

:::ref
- [docs] [MCP Specification 2025-11-25, Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [docs] [MCP Specification 2026-07-28, Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [docs] [OpenAI, Remote MCP](https://developers.openai.com/api/docs/guides/tools-remote-mcp)
:::
