---
emoji: 🔌
title: "MCP y function calling"
seoTitle: "MCP frente a function calling: protocolo y flujo de llamadas"
date: "2026-05-24"
categories: IA Herramientas-de-desarrollo Claude MCP CodeGraph
description: "Cómo difiere MCP de function calling: seis primitive types, stdio y Streamable HTTP, el bucle de tools/list a tool_use y riesgos como Tool Poisoning."
keywords: "MCP, Model Context Protocol, MCP vs function calling, primitivas MCP, tools/list, Streamable HTTP, Tool Poisoning Attack, seguridad MCP"
locale: es
translationOf: '260524'
sourceHash: f5c56031068e65cfbee19861ae45e0809590a1961be8364a856a0caa02ffedcb
---

En esta publicación quiero hablar sobre **en qué se diferencia MCP (Model Context Protocol) de function calling**.

Este artículo está pensado para quienes usan servidores MCP con Claude Code o Cursor, pero les cuesta explicar en qué punto se separa MCP del function calling de las API de LLM. Al terminar, sabrás de qué parte del protocolo surge cada una de las cuatro diferencias entre ambos y a qué problemas de seguridad conduce esa estructura. Las cuatro son el descubrimiento dinámico, que obtiene la lista de herramientas en tiempo de ejecución; una stateful session con un ciclo de vida definido; primitive types además de Tool; y la bidireccionalidad, que permite al servidor invocar en sentido inverso el LLM del cliente.

Trabajo como desarrollador frontend y uso Claude a diario, pero cada vez que añadía un servidor MCP, nunca tenía del todo claro cómo entraban esas herramientas en el campo de visión del modelo.


## MCP (Model Context Protocol)

MCP (Model Context Protocol) resuelve la cuestión de «**qué debe poder hacer el agente**».

Veámoslo con más detalle. Para que un agente de IA envíe un mensaje a Slack, debe poder llamar a la Slack API. Para crear una issue de GitHub, debe poder llamar a la GitHub API. Para consultar Postgres, debe gestionar una conexión con la base de datos. MCP **agrupa todas estas integraciones con sistemas externos bajo un protocolo estándar**. (Significa que cualquier cliente puede conectarse a cualquier servidor a través de la misma interfaz).

MCP es un estándar abierto que Anthropic presentó por primera vez el **25 de noviembre de 2024**. El **9 de diciembre de 2025**, Anthropic, Block y OpenAI, como cofundadores, donaron la especificación MCP a la Agentic AI Foundation (AAIF) de la Linux Foundation. Google, Microsoft, AWS, Cloudflare y Bloomberg se incorporaron como miembros Platinum. (En el momento de la donación, en diciembre de 2025, ya se contabilizaban más de 97 millones de descargas mensuales de los SDK y más de 10.000 servidores MCP públicos activos).

MCP es un protocolo de sesión stateful construido sobre JSON-RPC. **JSON-RPC** es un protocolo RPC (Remote Procedure Call) stateless y ligero que utiliza JSON como wire format. Es independiente de la capa de transporte, por lo que puede funcionar sobre HTTP, TCP o la entrada y salida estándar. También admite notifications (llamadas sin respuesta) y llamadas batch.


### Dentro del protocolo

Todas las interacciones entre clientes y servidores MCP se expresan mediante uno de seis primitive types. Aquí, primitive no tiene relación con los tipos primitivos de JavaScript (como string o number); designa un tipo básico de interacción definido por el protocolo. Al principio había tres del lado del servidor, pero la spec 2025-06-18 añadió tres del lado del cliente, de modo que el estándar actual suma seis.

**Primitive types del servidor**

- **Tool** (model-controlled): acción cuya ejecución decide autónomamente el modelo. Puede tener side effects
- **Resource** (application-controlled): datos de solo lectura identificados mediante una URI. La aplicación host decide qué recursos expone
- **Prompt** (user-controlled): plantilla reutilizable que el usuario activa explícitamente mediante un comando slash u otro mecanismo

**Primitive types del cliente**

- **Sampling**: mecanismo que permite al servidor solicitar, a la inversa, una completion al LLM del cliente, convirtiendo la relación entre ambos en bidireccional
- **Roots**: información sobre los límites del workspace con la que el cliente indica al servidor «este es el alcance dentro del que puedes trabajar»
- **Elicitation**: función que permite al servidor solicitar al usuario información adicional de manera estructurada mientras ejecuta una herramienta

La distinción entre estos seis tipos es importante porque **la autoridad para decidir quién invoca o proporciona cada elemento es diferente**. Tool se ejecuta por decisión autónoma del modelo, por lo que existe el riesgo de llamadas erróneas. Resource está curado por la aplicación y es relativamente seguro. Prompt lo activa explícitamente el usuario y ofrece el máximo control. Sampling, Roots y Elicitation refinan aún más el modelo de permisos mediante el control del cliente.

Solo existen **dos métodos de transporte**. Es una decisión deliberada para evitar que el ecosistema se fragmente en decenas de protocolos rivales. El primero es **stdio**: el servidor MCP se ejecuta como subproceso local y se comunica mediante la entrada y salida estándar. Es apropiado para herramientas locales como el filesystem o git. El segundo es **Streamable HTTP**, que incorpora streaming SSE sobre HTTP POST para construir una comunicación casi bidireccional. Resulta adecuado para servidores remotos, autenticación OAuth, conexiones de varios clientes y deployments en la nube.

SSE (Server-Sent Events) es un estándar del W3C que permite al servidor enviar datos unidireccionalmente al cliente a través de una conexión HTTP. Su media type es `text/event-stream` y, en JavaScript, se accede mediante la API `EventSource`. A diferencia de WebSocket, es unidireccional, pero tiene la ventaja de funcionar sobre HTTP y ser compatible con proxies y firewalls. Streamable HTTP utiliza SSE para simular una comunicación bidireccional. Se introdujo en la spec del **26 de marzo de 2025** (versión `2025-03-26`) y sustituyó al transporte HTTP+SSE anterior.


### Flujo mediante el que un LLM invoca herramientas MCP

Tras revisar los primitive types y los métodos de transporte, sigamos ahora el flujo de **cómo un LLM descubre e invoca realmente una herramienta MCP**.

Al iniciarse una sesión MCP, se produce el siguiente handshake.

- **Cliente → servidor**: solicitud `initialize` (envía la versión de protocolo compatible y las capabilities del cliente)
- **Servidor → cliente**: respuesta `initialize` (capabilities del servidor y, opcionalmente, el campo `instructions`)
- **Cliente → servidor**: notification `notifications/initialized`
- **Cliente → servidor**: solicitud `tools/list` → recibe la lista de herramientas disponibles
- (Después) el LLM decide invocar una herramienta → el cliente envía `tools/call` → recibe el resultado

Hay un detalle que suele ignorarse: **en la respuesta `initialize`, el campo `instructions`**. Si el servidor devuelve texto en este campo, su contenido se añade de facto al system prompt del LLM. Es decir, la spec ofrece un slot formal para que el servidor MCP inyecte directamente en el LLM una guía sobre «cómo utilizar estas herramientas». (La existencia de este slot es una de las razones por las que el Tool Poisoning Attack que veremos después resulta peligroso).

Entonces, ¿cómo entra la propia definición de la tool en el campo de visión del LLM? Una definición de tool MCP tiene la siguiente forma de JSON Schema.

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

El cliente transforma la lista recibida mediante `tools/list` en el parámetro `tools` de la Anthropic Messages API o en el parámetro `tools` de OpenAI function calling, y la incluye en la llamada a la API del LLM. En Anthropic, cuando se proporciona el parámetro tool, **se añade automáticamente un special system prompt** para que el modelo comprenda cómo invocar herramientas. (En Claude 4.x, con `tool_choice: auto`, este prompt por sí solo añade 346 tokens).

Cuando el LLM decide que debe invocar una herramienta, incluye en su respuesta un bloque `tool_use` (`{"type": "tool_use", "name": ..., "input": ...}`) y finaliza con un `stop_reason` de valor `tool_use`. El cliente lo recibe, envía un `tools/call` al servidor MCP real, obtiene el resultado y vuelve a pasárselo al LLM en un bloque `tool_result` del siguiente user message. **El ciclo se repite hasta que `stop_reason` deja de ser `tool_use` y adopta otro valor (`end_turn`, `max_tokens`, etc.)**. Lo que solemos llamar «el agente trabajando» es, en esencia, una sucesión de estos ciclos de llamada, resultado y nueva llamada.

¿En qué se diferencia entonces MCP del simple function calling? Puede resumirse en cuatro puntos.

- **Descubrimiento dinámico**: la lista de herramientas no se conoce en build time, sino que se obtiene en runtime mediante `tools/list`. También puede cambiar durante la sesión mediante `notifications/tools/list_changed`
- **Stateful session**: define lifecycle phases (initialize → operation → shutdown), lo que permite un cierre limpio
- **Primitive types además de Tool**: expone Prompt, Resource, Sampling, Roots y Elicitation mediante capability negotiation
- **Bidireccionalidad**: la spec permite que el servidor invoque a la inversa el LLM del cliente mediante sampling

(Por estas diferencias, MCP también se describe como «un estándar generalizado de function calling para agentes»).


### ¿Es seguro MCP?

Hay un punto importante que aclarar: **MCP no automatiza la concesión de permisos**. El usuario es responsable de decidir en qué servidores puede confiar, qué side effects tiene cada herramienta y si seguirá comportándose igual con el paso del tiempo.

Conviene conocer dos ataques representativos.

- **Tool Poisoning Attack (TPA)**: ataque bautizado por Invariant Labs, que publicó una PoC en abril de 2025. Si se ocultan instrucciones maliciosas en la descripción (description) de una herramienta de un servidor MCP, el modelo las confunde con instrucciones del usuario y las sigue. Es un texto invisible para el usuario, pero visible para el modelo.

- **Rug Pull** (Silent Redefinition): concepto analizado por Simon Willison en una publicación del 9 de abril de 2025. Al principio, la herramienta es legítima. El usuario la revisa, aprueba e integra en su workflow. Semanas después, su definición cambia silenciosamente e incorpora instrucciones maliciosas. Como no se solicita una nueva aprobación, su comportamiento cambia sin más.

El **15 de abril de 2026** se produjo un incidente de seguridad relacionado. OX Security reveló vulnerabilidades RCE sistémicas que afectaban a todos los principales SDK de MCP (Python, TypeScript, Java y Rust). Quedaron dentro del alcance más de 150 millones de descargas, unos 7.000 servidores públicos y cerca de 200.000 deployments potencialmente vulnerables. Se asignaron más de 14 CVE, y Cursor, VS Code, Windsurf, Claude Code y Gemini-CLI se vieron afectados.

¿Qué medidas se tomaron después? Anthropic **no modificó la arquitectura del protocolo**. En su lugar, actualizó `SECURITY.md` para aclarar que, al utilizar adaptadores stdio, la responsabilidad de sanitizar las entradas corresponde a los desarrolladores downstream. En la spec, la revisión **2025-06-18 hizo obligatorio OAuth 2.1 + RFC 8707 Resource Indicators** para impedir ataques de reutilización de tokens, y la revisión **2025-11-25 introdujo incremental scope consent** (el usuario acepta progresivamente solo los permisos mínimos necesarios). Aun así, solo entre enero y febrero de 2026 se publicaron más de 30 CVE relacionados con MCP, y las estadísticas indican que **command injection representó el 43 %**. **La seguridad sigue siendo un terreno en evolución**.


## Conclusión

En resumen, MCP no sustituye a function calling, sino que es un estándar construido sobre él. El modelo sigue invocando herramientas mediante el parámetro `tools` y el bucle `tool_use`; lo que MCP añade es una forma de intercambiar la lista de herramientas en tiempo de ejecución, un ciclo de vida de sesión, primitive types además de Tool y llamadas que van del servidor al cliente. Como las definiciones de herramientas viajan en tiempo de ejecución, en ese mismo punto surgen los ataques que las envenenan o las cambian en silencio.

Si MCP trata de qué permitir hacer al agente, qué contarle es tarea de archivos de contexto como `CLAUDE.md` o `AGENTS.md`. Cómo lee el agente esos archivos y hasta qué punto se respetan sus instrucciones se trata en [Archivos de contexto](/260529).


## Referencias

:::ref
- [docs] [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [article] [Simon Willison, MCP Prompt Injection](https://simonwillison.net/2025/Apr/9/mcp-prompt-injection/)
- [article] [OX Security, MCP Supply Chain Advisory](https://www.ox.security/blog/mcp-supply-chain-advisory-rce-vulnerabilities-across-the-ai-ecosystem/)
:::
