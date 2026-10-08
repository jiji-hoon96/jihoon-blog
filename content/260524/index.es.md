---
emoji: 🔌
title: "MCP y function calling"
seoTitle: "MCP frente a function calling: protocolo y flujo de llamadas"
date: "2026-05-24"
updatedAt: "2026-10-08"
categories: IA Herramientas-de-desarrollo Claude MCP
description: "Cómo difiere MCP de function calling: seis primitivas, stdio y Streamable HTTP, el bucle de tools/list a tool_use y riesgos como Tool Poisoning."
keywords: "MCP, Model Context Protocol, MCP vs function calling, primitivas MCP, tools/list, Streamable HTTP, Tool Poisoning Attack, seguridad MCP"
locale: es
translationOf: '260524'
sourceHash: b205038e9317d3f184709c9982ea3836b1f40973e9c105d846718153ca395fd3
---

En esta publicación quiero hablar sobre **en qué se diferencia MCP (Model Context Protocol) de function calling**.

Este artículo está pensado para quienes usan servidores MCP con Claude Code o Cursor, pero les cuesta explicar en qué punto se separa MCP del function calling de las API de LLM. La respuesta corta es que MCP no sustituye a function calling. La aplicación host convierte la lista de herramientas que recibe de un servidor MCP en el parámetro `tools` de function calling y devuelve al servidor MCP la llamada que elige el modelo. Al terminar, sabrás de qué parte del protocolo surge cada una de las cuatro diferencias que MCP añade encima, qué diferencias sobreviven a la revisión 2026-07-28 y qué superficie de ataque abre esa estructura.

Trabajo como desarrollador frontend y uso Claude a diario, pero cada vez que añadía un servidor MCP, nunca tenía del todo claro cómo entraban esas herramientas en el campo de visión del modelo.


## MCP (Model Context Protocol)

MCP (Model Context Protocol) resuelve la cuestión de «**qué debe poder hacer el agente**».

Veámoslo con más detalle. Para que un agente de IA envíe un mensaje a Slack, debe poder llamar a la Slack API. Para crear una issue de GitHub, debe poder llamar a la GitHub API. Para consultar Postgres, debe gestionar una conexión con la base de datos. MCP **agrupa todas estas integraciones con sistemas externos bajo un protocolo estándar**. (Significa que clientes y servidores se conectan siguiendo la misma especificación).

MCP es un estándar abierto que Anthropic presentó por primera vez el **25 de noviembre de 2024**. El **9 de diciembre de 2025**, Anthropic donó MCP a la [Agentic AI Foundation (AAIF)](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation) de la Linux Foundation. La AAIF la cofundaron Anthropic, Block y OpenAI.

MCP es un protocolo construido sobre JSON-RPC. [JSON-RPC 2.0](https://www.jsonrpc.org/specification) es un protocolo RPC (Remote Procedure Call) stateless y ligero que utiliza JSON como wire format. Es independiente de la capa de transporte, por lo que puede funcionar sobre HTTP, TCP o la entrada y salida estándar. Este artículo toma como referencia la revisión 2025-11-25, en la que MCP es un protocolo stateful que establece una sesión por cada conexión. Qué cambió en la revisión posterior lo veremos después de recorrer el flujo de llamadas.


### Seis primitivas

La visión general de la especificación 2025-11-25 enumera tres funciones que ofrecen los servidores y tres que ofrecen los clientes. Este artículo llama primitivas a estas seis. Aquí, una primitiva no tiene nada que ver con los tipos primitivos de JavaScript (como string o number); se refiere a un tipo básico de interacción definido por el protocolo.

#### Primitivas del lado del servidor

- **Tool** (model-controlled): una acción cuya invocación decide el propio modelo. Estas acciones pueden tener efectos secundarios (side effects)
- **Resource** (application-controlled): datos identificados por una URI. La especificación solo tiene `resources/read` para leer su contenido y ningún método para escribir. Cómo se incorporan esos recursos al contexto lo decide la aplicación host
- **Prompt** (user-controlled): una plantilla reutilizable que el usuario activa explícitamente, por ejemplo con un comando de barra

#### Primitivas del lado del cliente

- **Sampling**: un mecanismo que permite al servidor pedir en sentido inverso una completion al LLM del cliente, lo que vuelve bidireccional la relación entre cliente y servidor. Sirve para que un servidor que necesita generar texto mientras ejecuta una herramienta use el modelo del cliente sin tener su propia clave de API. En la revisión 2026-07-28 quedó deprecated, es decir, con su eliminación prevista
- **Roots**: información sobre los límites del espacio de trabajo con la que el cliente le dice al servidor «hasta aquí llega el área en la que puedes trabajar»
- **Elicitation**: una función que permite al servidor pedir al usuario datos adicionales de forma estructurada mientras ejecuta una herramienta

Esta distinción importa porque **quién decide invocar o proporcionar algo es distinto**. Un Tool se ejecuta por decisión del modelo, así que una invocación errónea implica riesgo, mientras que un Prompt lo elige el usuario de forma explícita. Un Resource lo elige la aplicación por defecto, pero la especificación también permite implementaciones que incluyen recursos automáticamente, según heurísticas o la selección del modelo. Las tres primitivas del lado del cliente van en sentido contrario: el servidor pide y el cliente decide si responde.

### Dos mecanismos de transporte

Hay dos [mecanismos de transporte estándar](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), y la especificación también permite otros transportes personalizados (MAY). El primero es **stdio**, que ejecuta el servidor MCP como un subproceso local y se comunica mediante la entrada y salida estándar. Es adecuado para herramientas que funcionan localmente, como el sistema de archivos o git. El segundo es **Streamable HTTP**, que añade streaming SSE (Server-Sent Events) sobre HTTP POST y GET para lograr una comunicación casi bidireccional. SSE es una forma de que el servidor envíe datos al cliente en una sola dirección a través de una conexión HTTP. Es adecuado para escenarios que ocurren a través de la red, como servidores remotos, autenticación OAuth, conexiones de varios clientes y despliegues en la nube.


### Flujo mediante el que un LLM invoca herramientas MCP

Ya que hemos visto las primitivas y los transportes, sigamos el flujo de **cómo un LLM descubre e invoca realmente una herramienta MCP**.

En la revisión 2025-11-25, al iniciarse una conexión se produce el siguiente handshake. A fecha de 2026-10-08, el SDK de TypeScript 1.32.1 y la versión 2.3.1 de la línea v2 también siguen este orden con su configuración por defecto.

- **Cliente → servidor**: solicitud `initialize` (envía la versión de protocolo admitida y las capabilities del cliente)
- **Servidor → cliente**: respuesta `initialize` (capabilities del servidor y, opcionalmente, el campo `instructions`)
- **Cliente → servidor**: notificación `notifications/initialized`
- **Cliente → servidor**: solicitud `tools/list` → recibe la lista de herramientas disponibles
- (Después) El LLM decide invocar una herramienta → el cliente envía `tools/call` → recibe el resultado

En la respuesta `initialize`, el campo `instructions` es donde el servidor envía un texto sobre cómo deben usarse sus herramientas. La línea instructions de la salida de la demo, más abajo, muestra ese valor.

Entonces, ¿cómo entra la propia definición de la herramienta en el campo de visión del LLM? La definición de una herramienta MCP tiene esta forma de JSON Schema.

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

El host convierte la lista recibida con `tools/list` en el **parámetro `tools` de la Anthropic Messages API** o en el **parámetro `tools` de OpenAI function calling**, y la incluye en la llamada a la API del LLM. En el caso de Anthropic, cuando llega el parámetro de herramientas, se [añade automáticamente un special system prompt](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) para que el modelo entienda cómo invocarlas. Su longitud depende del modelo. En la tabla de la documentación que consulté el 2026-10-08, los modelos actuales añadían entre 286 y 675 tokens con `tool_choice: auto`.

Cuando el LLM decide que debe invocar una herramienta, su respuesta incluye un bloque `tool_use` (`{"type": "tool_use", "name": ..., "input": ...}`) y el `stop_reason` de la respuesta termina en `tool_use`. El host lo recibe, envía `tools/call` al servidor MCP real, recibe el resultado, lo coloca en un bloque `tool_result` del siguiente mensaje user y lo envía de nuevo al LLM. **Este bucle se repite hasta que `stop_reason` cambia de `tool_use` a otro valor, como `end_turn` o `max_tokens`.** Lo que solemos llamar «el agente trabajando» se parece mucho a una sucesión de estos bucles de llamada, resultado y nueva llamada.

Si lo dibujamos, no hay ninguna línea entre el modelo y el servidor MCP. El modelo solo ve las definiciones que recibió mediante `tools`, y el servidor MCP recibe las solicitudes del host, no del modelo. Lo que une los dos protocolos es el host del centro.

![Entre la API del LLM a la izquierda y el host en el centro van flechas etiquetadas tools, tool_use y tool_result, y entre el host y el servidor MCP a la derecha van flechas etiquetadas tools/list y tools/call. No hay ninguna línea entre la API del LLM y el servidor MCP](1.png?w=720)

Ejecuté esta conversión para ver lo corta que es en realidad. Se ejecutó el 2026-10-08 con Node v24.16.0, `@modelcontextprotocol/sdk` 1.32.1 y `zod` 4.6.5. En lugar de stdio, el transporte es `InMemoryTransport`, que conecta servidor y cliente dentro de un mismo proceso, y no se llamó a ningún LLM. El bloque `tool_use` se construyó a mano con la forma que muestra la documentación de Anthropic.

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

La salida de `node post-demo.mjs` es esta.

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

La conversión de la definición de la herramienta no es más que renombrar campos. El `inputSchema` de MCP pasa a ser `input_schema` en Anthropic y `parameters` en OpenAI. La salida también muestra que el SDK añade `$schema` al esquema. La dirección contraria es igual de corta. El `tool_use.input` de Anthropic es un objeto, así que entra tal cual en `tools/call` como sus `arguments`. En el lado del resultado, los bloques de texto tienen la misma forma y pasan tal cual, pero los resultados de imagen o de error tienen otra forma, así que el helper de MCP del SDK de Anthropic los convierte por separado. La forma de OpenAI de arriba es el formato de la Responses API. Los `arguments` de una llamada que devuelve OpenAI son una [cadena JSON](https://developers.openai.com/api/docs/guides/function-calling), así que hay que pasarlos una vez por `JSON.parse` antes de entregarlos. El código de arriba solo construye un bloque `tool_use` con la forma de Anthropic, así que este paso de parse no aparece en la salida.


### Cuatro cosas que añade MCP

Entonces, ¿qué añade MCP a function calling? Según la revisión 2025-11-25, son cuatro cosas.

- **Descubrimiento dinámico**: la lista de herramientas no se conoce en tiempo de compilación, sino que se obtiene en tiempo de ejecución con `tools/list`. El servidor puede avisar con `notifications/tools/list_changed` de que la lista cambió durante la conexión
- **Stateful session**: la conexión se establece con `initialize` y las solicitudes se intercambian dentro de ella. No hay un mensaje JSON-RPC de cierre específico; la sesión termina cerrando el transporte
- **Primitivas además de Tool**: Resource, Prompt, Sampling, Roots y Elicitation se exponen mediante capability negotiation. La capability negotiation es el paso de `initialize` en el que cada lado anuncia las funciones que admite
- **Bidireccionalidad**: el servidor puede pedir en sentido inverso una completion al LLM del cliente mediante Sampling (deprecated en la revisión 2026-07-28)

### Después de la revisión 2026-07-28

A fecha de 2026-10-08, la revisión que el sitio oficial abre como latest es la [revisión 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog), y en ella cambió la mitad de esta lista. Primero, desaparecieron el handshake formado por `initialize` y `notifications/initialized` y las sesiones a nivel de protocolo. En su lugar, cada solicitud lleva en `_meta` la versión del protocolo y las capabilities del cliente. Ese campo es un espacio que MCP reserva para adjuntar metadatos aparte de los parámetros propios del mensaje. Los servidores MUST implementar `server/discover`. Es una RPC que devuelve las versiones del protocolo que admite el servidor, sus capabilities y su información, y el cliente puede llamarla antes de cualquier otra solicitud para comprobar de antemano las versiones y capabilities admitidas.

Las solicitudes que antes enviaba primero el servidor se sustituyeron por un patrón llamado Multi Round-Trip Requests (MRTR). En lugar de enviar una solicitud aparte, el servidor devuelve un resultado intermedio que indica que necesita más datos (`input_required`), y el cliente completa esos datos y vuelve a enviar la solicitud original.

Sampling y Roots quedaron deprecated junto con Logging. Siguen en la especificación y funcionan, pero las implementaciones nuevas no deberían adoptarlos, y la especificación recomienda integrarse directamente con las API de los proveedores de LLM en lugar de usar Sampling.

Aun así, el comportamiento por defecto de los SDK sigue siendo el antiguo. El SDK de TypeScript 1.32.1 tiene `2025-11-25` como constante de versión más reciente y no conoce la revisión 2026-07-28, y la 2.3.1 admite esta revisión, pero su negociación de versión por defecto es `legacy`. La primera línea de la salida de arriba, `initialize 2025-11-25`, es el resultado.

Lo que queda de las cuatro, entonces, es el descubrimiento dinámico y las primitivas además de Tool (Resource, Prompt, Elicitation). El descubrimiento dinámico también cambió un poco de forma: las notificaciones de cambio de lista solo llegan a los clientes que se suscriben (opt-in) al stream `subscriptions/listen`. Al final, el punto en que MCP se separa de function calling está menos en las sesiones o la bidireccionalidad y más en **un contrato para intercambiar la lista de herramientas y el contexto en tiempo de ejecución**.


### Cuando la API es el cliente MCP

El [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) (beta) de Anthropic muestra cuánto de este contrato llega al modelo. Es una función con la que la Messages API se conecta directamente a un servidor MCP remoto, y la sección Limitations de su documentación dice que, de las funciones de la especificación MCP, "only tool calls are currently supported", y que "Local STDIO servers cannot be connected directly". La misma documentación indica que, si necesitas servidores locales, prompts o resources de MCP, gestiones tú la conexión con un SDK de MCP y uses los helpers de conversión del SDK de Anthropic.

Es decir, cuando MCP se consume en la capa de function calling, solo queda Tool. Resource y Prompt solo tienen sentido si hay un host que los lleve a la pantalla o al contexto. La guía de function calling de OpenAI también presenta una forma de usar la funcionalidad de un servidor MCP como built-in tool. La [guía MCP servers](https://developers.openai.com/api/docs/guides/tools-connectors-mcp) de OpenAI solo explica cómo listar y llamar herramientas, y no dice si admite Resource o Prompt.


### La superficie de ataque del descubrimiento dinámico

Las descripciones de las herramientas y los resultados de sus invocaciones llegan, a través del host, al contexto del modelo. Así que, escriba lo que escriba ahí el servidor, el modelo lo lee. Los dos ataques representativos nacen de ahí.

- **Tool Poisoning Attack (TPA)**: un ataque al que [Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks) dio nombre y del que publicó una PoC en abril de 2025. Si se ocultan instrucciones maliciosas en la descripción (description) de una herramienta de un servidor MCP, el modelo lee ese texto, que el usuario no ve, y puede seguirlo sin que el usuario lo sepa.

- **Rug Pull**: un ataque, descrito por Invariant Labs en la misma publicación, en el que el servidor cambia la definición de una herramienta después de que el usuario la aprobó. Como en el ejemplo de Elena Cross [citado por Simon Willison](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/), apruebas el día 1 una herramienta de aspecto seguro y, para el día 7, esa herramienta ha cambiado para enviar tus claves de API a un atacante; ocurre porque las definiciones de herramientas se obtienen del servidor en tiempo de ejecución y no en el momento de la instalación. La [especificación de tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) recomienda (SHOULD) una UI que muestre qué herramientas se exponen al modelo, pero no exige volver a aprobar una definición modificada, así que esa nueva aprobación queda en manos del host.


## Conclusión

En resumen, MCP no sustituye a function calling; es un estándar que se apoya sobre él. El modelo sigue invocando herramientas mediante el parámetro `tools` y el bucle de `tool_use`, y el host traduce entre los dos protocolos. En la revisión 2025-11-25, lo que añadía MCP era el descubrimiento dinámico, una stateful session, primitivas además de Tool y llamadas que van del servidor al cliente. Al desaparecer las sesiones y quedar Sampling deprecated en la revisión 2026-07-28, lo que queda es un contrato para intercambiar la lista de herramientas y el contexto en tiempo de ejecución. Por ese contrato, los ataques que envenenan las definiciones de herramientas o las cambian en silencio surgen en el mismo lugar. Cuando añadas otro servidor MCP, te recomiendo comprobar no solo qué puede hacer ese servidor, sino también si tu host te avisa cuando cambian sus definiciones.

Si MCP trata de qué permitir hacer al agente, qué contarle es tarea de archivos de contexto como `CLAUDE.md` o `AGENTS.md`. Cómo lee el agente esos archivos y hasta qué punto se respetan sus instrucciones se trata en [Archivos de contexto](/260529).

:::ref
- [docs] [MCP Specification 2025-11-25, Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
- [docs] [MCP Specification 2026-07-28, Versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
:::
