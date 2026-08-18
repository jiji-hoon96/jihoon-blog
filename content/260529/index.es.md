---
emoji: 🧭
title: 'Herramientas para agentes de IA'
seoTitle: 'Mapa de herramientas para agentes de codificación con IA — archivos md, MCP, inteligencia de código y GitHub Trending'
date: '2026-05-29'
categories: AI Herramientas-de-desarrollo Claude MCP CodeGraph
description: 'Organizamos desde cuatro perspectivas las herramientas que he encontrado al desarrollar frontend con Claude: las diferencias entre CLAUDE.md, AGENTS.md y SKILL.md; los fundamentos de MCP y Serena; cómo funcionan herramientas de inteligencia de código como CodeGraph; y cómo leer GitHub Trending.'
keywords: 'CLAUDE.md, AGENTS.md, SKILL.md, MCP, Model Context Protocol, Serena MCP, CodeGraph, inteligencia de código, GitHub Trending, agente de codificación con IA, Claude Code, Cursor rules, tree-sitter, LSP'
locale: es
translationOf: '260529'
sourceHash: dcdf13a2067a0ae15b501b063ecf0c65202580351b7df388dad34849f41e1c3c
---

En esta publicación quiero hablar sobre el **ecosistema de herramientas que rodea a los agentes de codificación con IA**.

Trabajo como desarrollador frontend y utilizo Claude a diario. Con el tiempo, apareció un `CLAUDE.md` en la raíz del proyecto, junto a un `AGENTS.md` que alguien había creado; `.cursorrules` seguía olvidado en un rincón y yo mismo terminé creando una carpeta `.claude/skills/` siguiendo algún artículo que había visto. (Cuando me di cuenta, había unos cinco archivos con contenidos parecidos).

La misma confusión surgió en otros ámbitos. Probé a añadir un MCP llamado `serena`, instalé `codegraph` después de verlo en GitHub Trending y, cada vez que descubría otra herramienta nueva, volvía a preguntarme: «¿A qué categoría pertenece exactamente y cómo funciona?». (Sobre todo, siempre acababa olvidando quién la había creado o mediante qué principio ahorraba tokens).

Por eso, en lugar de recomendar herramientas una por una, decidí **dibujar el mapa de las propias herramientas**. Lo he dividido en cuatro grandes ejes.

- Diferencias entre los archivos de contexto (`.md`)
- Fundamentos de MCP y Serena
- Jerarquía de las herramientas de inteligencia de código y CodeGraph
- Prestar atención a GitHub Trending

Creo que, una vez entendidos estos cuatro ejes, cuando aparezca una herramienta nueva podremos hacernos rápidamente una idea de qué clase de herramienta es.


## Archivos de contexto

Los agentes de codificación con IA tienen una limitación fundamental: **carecen de memoria persistente**. Cada sesión empieza desde cero y, en la conversación siguiente, no recuerdan las convenciones acordadas ayer ni la estructura de carpetas explicada una hora antes. Los archivos de contexto son el mecanismo más sencillo para resolver este problema. Si colocamos en el proyecto un archivo que se lea automáticamente al comenzar cada sesión, no tendremos que repetir siempre las mismas explicaciones.

El problema es que cada herramienta creó por separado archivos basados en la misma idea. Claude Code lee `CLAUDE.md`; Cursor, `.cursorrules` (actualmente deprecated y sustituido por la recomendación de usar `.cursor/rules`); GitHub Copilot, `.github/copilot-instructions.md`; y OpenAI Codex, `AGENTS.md`. Si un equipo utiliza varias herramientas, termina copiando el mismo contenido en cuatro lugares distintos.


### CLAUDE.md

`CLAUDE.md` es un archivo que Claude Code lee automáticamente al iniciar una sesión. Según la documentación oficial de Anthropic (`code.claude.com/docs/en/memory`), Claude Code busca `CLAUDE.md` en tres niveles.

- **Memoria de usuario** (`~/.claude/CLAUDE.md`): valores globales predeterminados que se aplican a todos los proyectos de la máquina
- **Memoria del proyecto** (`CLAUDE.md` en la raíz del proyecto): se incluye en git y la comparte todo el equipo
- **Memoria local** (`CLAUDE.md` en un subdirectorio): solo se carga adicionalmente al trabajar en ese directorio

Cuando existen los tres niveles, Claude **los lee todos y los concatena (concatenate)**. No elige uno solo según su prioridad, sino que los más específicos se añaden encima, como en el cascade de CSS. (Se combinan; no se reemplazan). Por tanto, distribuir reglas sobre un mismo tema entre varios niveles puede generar conflictos. (La documentación oficial de Anthropic indica que el comportamiento no está garantizado cuando hay conflictos).

Hay un detalle que suele pasarse por alto: **lee todos los `CLAUDE.md` que encuentra al ascender desde el directorio de trabajo actual hasta la raíz del repositorio**. Así, si trabajamos dentro de `packages/ui/` en un monorepo, se cargan tanto el `CLAUDE.md` de la raíz como `packages/ui/CLAUDE.md`. (Es una capacidad potente, pero también implica que el contexto puede crecer sin que nos demos cuenta).


### AGENTS.md

`AGENTS.md` es un estándar creado para resolver la proliferación de archivos específicos de cada herramienta que acabamos de describir. En diciembre de 2025, Anthropic, Block y OpenAI lo donaron, junto con MCP, a la **Agentic AI Foundation (AAIF)** de la Linux Foundation, con lo que se convirtió de facto en un estándar del sector. El sitio oficial (`agents.md`) afirma que **más de 60.000 repositorios open source han adoptado este archivo**.

La lista de herramientas compatibles lo deja aún más claro. OpenAI Codex, Google Jules, VS Code, GitHub Copilot, Cursor, JetBrains Junie, Aider, Devin, Zed, Factory, Warp, goose, opencode, Amp, RooCode, Gemini CLI, Kilo Code, Phoenix, Semgrep, Ona, Windsurf y Augment Code, entre muchas otras, lo admiten. GitHub Copilot empezó a ofrecer compatibilidad nativa con `AGENTS.md` en agosto de 2025. Un detalle interesante es que **la compatibilidad nativa de Claude Code con `AGENTS.md` sigue siendo una active feature request**. Claude Code continúa tratando `CLAUDE.md` como su archivo principal.

Aunque se lo llame estándar, cabe dudar de si realmente se está adoptando. La prueba más sólida es el **dogfooding** (usar uno mismo el estándar que ha creado).

- En la raíz de la rama canary de **Vercel/Next.js** hay un `AGENTS.md`. En realidad, es un enlace simbólico a `CLAUDE.md`, que contiene la estructura del monorepo, iteraciones de 1-2 segundos mediante `pnpm --filter=next dev`, guías para probar tanto Turbopack como Webpack, el script `pr-status` y reglas para gestionar variables de entorno y secretos. El hecho de que `create-next-app` haya pasado a generar juntos `AGENTS.md` y `CLAUDE.md` en los proyectos nuevos responde a la misma tendencia.
- El propio repositorio **OpenAI/codex** mantiene su propio `AGENTS.md`.

En términos estratégicos, una práctica se está consolidando como la opción habitual: **usar `AGENTS.md` como única fuente de verdad (single source of truth)** y reducir `CLAUDE.md` a una línea que haga referencia a `AGENTS.md`, más las instrucciones exclusivas de Claude Code. Así desaparece la duplicación y no se pierde nada, porque Claude Code lee ambos archivos.


### SKILL.md

`SKILL.md` tiene una naturaleza distinta de los dos archivos anteriores. Si `CLAUDE.md` y `AGENTS.md` son **instrucciones persistentes que siempre están presentes en el contexto**, una Skill es **una capacidad on-demand que solo se invoca cuando hace falta**.

Las Skills se organizan por carpetas. Cada carpeta contiene un `SKILL.md`, los scripts que ejecuta la Skill y documentos Markdown adicionales. Claude solo carga esa carpeta cuando la tarea actual coincide con la `description` de la Skill. Esto se denomina **progressive disclosure (divulgación progresiva)**, un concepto que Jakob Nielsen formuló en el campo de la UX en 1995: trasladar las funciones avanzadas o poco frecuentes a pantallas secundarias para que el usuario se concentre en una sola tarea cada vez, reduciendo la carga cognitiva y los errores. En el contexto de Claude Skills, designa el mecanismo de «incorporar al contexto el contenido de una Skill únicamente cuando se necesita». Como resultado, el coste de la ventana de contexto puede reducirse de forma drástica.

El frontmatter de `SKILL.md` contiene varios campos propios.

- **`description`**: explica en qué situaciones se necesita la Skill y actúa como trigger para que el modelo decida si debe invocarla
- **`allowed-tools`**: limita las herramientas que pueden utilizarse dentro de la Skill (por ejemplo, `"Read, Glob, Grep, Bash(python:*)"`)
- **`disable-model-invocation: true`**: impide que el modelo la invoque; solo el usuario puede activarla mediante un comando slash. Se usa para operaciones con efectos secundarios, como deployments o commits
- **`user-invocable: false`**: no aparece en el menú slash del usuario y solo Claude puede invocarla autónomamente como conocimiento de fondo

Claude Skills se lanzó simultáneamente en Claude.ai, Claude Code, API y Agent SDK el 16 de octubre de 2025. El 18 de diciembre de 2025, Anthropic presentó la propia especificación de Skills como estándar abierto (`agentskills.io`). Simon Willison llegó a afirmar: «**Skills are awesome, maybe a bigger deal than MCP**». La razón es que su formato es mucho más sencillo que MCP y, al mismo tiempo, resuelve mediante progressive disclosure el problema del coste de la ventana de contexto.


### Archivos de otras herramientas

El archivo `.cursorrules` de Cursor está **deprecated desde la versión 0.43**. La recomendación oficial actual consiste en colocar varios archivos dentro del directorio `.cursor/rules/`; esos archivos usan la extensión `.mdc`. Cada archivo `.mdc` tiene frontmatter YAML.

- **`description`**: referencia que usa el agente para determinar la pertinencia de la regla
- **`globs`**: adjunta automáticamente la regla (auto-attach) cuando se incluye en la conversación un archivo que coincide con el patrón
- **`alwaysApply`**: si es `true`, se incluye siempre en todas las conversaciones (y se ignora `globs`)

GitHub Copilot ha evolucionado en una dirección similar. Las instrucciones globales del repositorio se colocan en `.github/copilot-instructions.md`; cuando se necesita scope por ruta, se crean archivos `.github/instructions/*.instructions.md` y se especifica un glob mediante la clave `applyTo:` del frontmatter. (Copilot code review ofrece compatibilidad oficial con path-scoped instructions desde septiembre de 2025).

Las demás herramientas, además de Cursor y Copilot, convergen en patrones parecidos. Podemos resumirlas así.

| Herramienta | Archivo/directorio | Características |
|------|--------------|------|
| **Claude Code** | `CLAUDE.md` (3 niveles) | Se combina siguiendo el árbol de directorios |
| **Cursor** | `.cursor/rules/*.mdc` | Scope de patrones de archivo mediante `globs` |
| **GitHub Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | Compatible con el glob `applyTo` |
| **Cline** | Directorio `.clinerules/` | Integra todos los `.md`/`.txt`; activación condicional mediante el glob `paths` |
| **Continue.dev** | `.continue/rules/*.md` | Frontmatter `name`/`globs`/`alwaysApply` |
| **Aider** | `CONVENTIONS.md` + `.aider.conf.yml` | Se incluye en cada solicitud; **se recomiendan 200 líneas como máximo** |
| **Windsurf** | `.windsurfrules` + `global_rules.md` | Dos niveles: global y proyecto |
| **Estándar** | `AGENTS.md` (AAIF) | Adoptado por más de 60.000 repositorios |

Resulta especialmente interesante el archivo **`CONVENTIONS.md` de Aider**. Como la documentación oficial indica que el archivo completo se incorpora al contexto en cada solicitud, recomienda explícitamente **«mantenerlo por debajo de 200 líneas»**. (En cierto modo, Aider detectó pronto esta limitación y la comunica claramente a sus usuarios).


### MEMORY.md

Al margen de los archivos anteriores, hay otro patrón que aparece cada vez con más frecuencia: `MEMORY.md`. No es un estándar oficial, sino una convención surgida orgánicamente en la comunidad para **registrar decisiones y errores a lo largo del tiempo**.

```markdown
## 2026-04-10
Pages Router에서 App Router로 이전. 신규 라우트는 App Router 컨벤션 사용.

## 2026-04-22
Prisma 쿼리 결과에 optional chaining 쓰지 말 것 — null은 if-check로 명시적 처리.
(이전에 옵셔널 체이닝으로 null을 흘려보내 프로덕션 이슈 발생.)
```

Si `CLAUDE.md` o `AGENTS.md` contienen **las reglas vigentes en el presente**, `MEMORY.md` recoge **la historia de por qué se crearon esas reglas**. (Son complementarios, no sustitutos).


### Cómo leen estos archivos los agentes

Hasta ahora hemos repasado qué archivos existen. Sin embargo, hay una pregunta que se omite con sorprendente frecuencia: **¿dónde y cómo leen exactamente estos archivos los agentes?** Comprender este mecanismo permite entender mucho mejor el resultado de ETH Zurich que veremos después: que los archivos de contexto no se siguen demasiado bien.

Empecemos por un hecho esencial. **`CLAUDE.md` no se inyecta como system prompt, sino como user message.** La documentación oficial de Anthropic lo explica de la siguiente manera.

::::quote
:::translation
El contenido de CLAUDE.md se entrega como un mensaje del usuario después del system prompt, no como parte del propio system prompt. Claude lo lee e intenta seguirlo, pero no hay garantía de que lo cumpla estrictamente.
:::

:::original
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::
::::

En otras palabras, no es una regla obligatoria, sino «contexto de referencia». La guía oficial recomienda utilizar mecanismos separados, como un hook `PreToolUse`, cuando se quiere imponer un comportamiento concreto.

El orden de carga se acumula de broad → specific. En concreto: managed policy (configuración de la organización) → configuración global del usuario (`~/.claude/CLAUDE.md`) → proyecto (`./CLAUDE.md`) → configuración local (`./CLAUDE.local.md`). Dentro del mismo directorio, primero se carga `CLAUDE.md` y después `CLAUDE.local.md`. Podemos aprovechar que **las instrucciones más cercanas se leen al final** para que las reglas más específicas tengan mayor peso gracias al recency bias de los LLM.

Aquí entra en juego la interesante sintaxis `@import`. Si se escribe `@path/to/file` en cualquier parte del contenido de CLAUDE.md, el archivo correspondiente se despliega en ese lugar y se carga junto con él. **La profundidad recursiva máxima es de 4 hops**, y las rutas relativas se resuelven tomando como referencia el archivo que contiene el import. Por eso, la recomendación oficial consiste en tender un puente mediante `@AGENTS.md`. Si dejamos `CLAUDE.md` prácticamente vacío y solo escribimos `@AGENTS.md`, Claude Code leerá AGENTS.md de forma natural. (Es la solución más limpia mientras CLAUDE.md todavía no admita AGENTS.md de manera nativa).

También conviene considerar los tokens. CLAUDE.md no tiene un límite explícito de tokens, por lo que **se carga entero si existe**. Sin embargo, la recomendación oficial es **no superar las 200 líneas por archivo**. Cuando se superan las 200 líneas, la documentación advierte: «consume more context and may reduce adherence». Es interesante que, en Claude 4.x, **el mero hecho de activar tool use añade automáticamente 346 tokens al special system prompt** (con `tool_choice: auto`). El contexto se consume casi sin que nos demos cuenta.

Cursor emplea otro método. Las reglas de `.cursor/rules/*.mdc` funcionan en cuatro modalidades.

- **Always Apply**: se incluye siempre en todos los chats; ignora globs/description
- **Apply Intelligently** (Agent Requested): el agente lee `description`, evalúa su pertinencia e incorpora la regla
- **Apply to Specific Files** (Auto Attached): se activa cuando entra en el contexto un archivo que coincide con el patrón glob
- **Apply Manually**: el usuario la invoca explícitamente mediante `@rule-name`

Las demás herramientas siguen otros enfoques. OpenAI Codex recorre desde la raíz del repositorio git hasta cwd, reúne todos los `AGENTS.md` y los inyecta **justo antes del prompt del usuario**. GitHub Copilot inserta `.github/copilot-instructions.md` con una prioridad intermedia en la ventana de contexto: «después de edit context y explicit references, pero antes de loosely related open files». Incluso con un mismo archivo `AGENTS.md`, el momento de carga, la prioridad y las reglas de merge difieren según la herramienta, por lo que **no hay garantía de que las tres lo interpreten exactamente del mismo modo**.

Queda, sin embargo, una pregunta fundamental: **¿por qué los modelos solo siguen parte de las instrucciones presentes en el contexto?** Decir simplemente que «las instrucciones son largas» no basta. Detrás de este fenómeno hay una limitación estructural de los LLM.

### Alucinaciones y olvido del contexto

Si alguna vez hemos visto a un agente de IA confundir el contexto de una conversación u olvidar al final algo que se le había indicado claramente al principio, hemos presenciado una forma de **alucinación (Hallucination)**. En general, al hablar de alucinaciones pensamos primero en «inventar hechos inexistentes», pero académicamente se dividen en tres categorías. El estudio de 2023 de Yue Zhang et al. («Siren's Song in the AI Ocean») distingue entre **conflicto con la entrada** (generar algo distinto de lo indicado explícitamente por el usuario), **conflicto con el contexto** (contradecir algo generado anteriormente por el propio modelo) y **conflicto factual** (no coincidir con el conocimiento del mundo). Ignorar instrucciones de un archivo de contexto no corresponde al tercer tipo, sino **al primero**: al procesar la entrada, el modelo trata parte de la información como si no existiera.

El problema más profundo es que estas alucinaciones son **imposibles de eliminar por completo**. Un equipo de la National University of Singapore lo demostró matemáticamente mediante teoría del aprendizaje. Ningún LLM puede aprender todas las funciones computables; por tanto, mientras se utilice como solucionador de problemas general, inevitablemente alucinará en algún punto.

El efecto de la posición también es importante. Un equipo de Stanford demostró experimentalmente que los modelos consultan mejor la información pertinente cuando está **al principio o al final de la ventana de contexto**, y que el rendimiento desciende notablemente cuando queda **enterrada en el medio**. Esto se relaciona directamente con los archivos de contexto. `CLAUDE.md` queda insertado en algún punto intermedio del orden de carga y, cuanto más se alarga la conversación, más se desplazan sus instrucciones hacia «el medio» del contexto. Es la otra cara del recency bias ya mencionado: la franja intermedia del **efecto primacy-recency es la más vulnerable**.

Al reunir todos estos fenómenos, aparece una imagen clara. Un archivo de contexto no es más que **texto insertado fuera del sistema antes del primer turno del usuario**. No obliga al modelo a tomar decisiones; es simplemente otro bloque de tokens que cae en la ventana de contexto. Cuanto más largo es el archivo y más se prolonga la conversación, más se desplazan sus instrucciones hacia «el medio» y menor es la probabilidad de que se consulten. Los resultados de ETH Zurich cuantifican esta limitación estructural.


### El estudio de ETH Zurich

Mucha gente habrá pensado: «Entonces, ¿lo mejor será escribir todo lo posible en estos archivos?». Sin embargo, un estudio reciente contradice frontalmente esta intuición: el trabajo de ETH Zurich que hemos venido mencionando.

El equipo de ETH Zurich publicó en febrero de 2026 el artículo «Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?». Midió cuatro agentes —Claude Code (Sonnet-4.5), Codex (GPT-5.2 / GPT-5.1 mini) y Qwen Code— usando un benchmark de 138 tareas reales de ingeniería de software en Python (AGENTBENCH) y SWE-bench Lite. Los resultados fueron sorprendentes.

- Los **archivos de contexto generados automáticamente por un LLM** redujeron la tasa de éxito de las tareas aproximadamente un 0,5 % en SWE-bench Lite y un 2 % en AGENTBENCH
- Incluso los **archivos escritos por personas** solo lograron, de media, una mejora marginal cercana al 4 %
- Añadir archivos de contexto incrementó el **coste de inferencia por instancia en más de un 20 %**
- En modelos más potentes (GPT-5.2), el efecto de los archivos de contexto fue aún menor (cuanto más potente es el modelo, mayor es su conocimiento paramétrico y más probable que el contexto adicional actúe como ruido)

Hubo, no obstante, una excepción: **especificar herramientas no estándar**. Por ejemplo, al mencionar en el contexto `uv`, el gestor de paquetes de Python, la frecuencia con la que el agente utilizaba `uv` pasó de 0,01 a 1,6 veces por instancia: **un aumento aproximado de 160 veces**.

La recomendación de Aider de «no superar las 200 líneas» ofrece una orientación práctica basada en que «el archivo entra siempre en el contexto», mientras que el estudio de ETH Zurich demuestra cuantitativamente que «los archivos de contexto largos reducen estadísticamente el rendimiento». A mi juicio, sus implicaciones prácticas son las siguientes.

- Los **archivos de contexto enormes generados automáticamente pueden hacer más daño que bien**. Si metemos a la fuerza estándares de código, arquitectura y workflows en un `CLAUDE.md` de 300 líneas, el agente seguirá algunas partes e ignorará el resto. Esa inconsistencia puede producir resultados peores que no tener contexto.
- **Lo que sí debemos escribir es «información que no puede inferirse»**: herramientas no estándar, convenciones propias del proyecto y fallos anteriores. El modelo ya conoce las buenas prácticas generales de programación.
- Conviene usar AGENTS.md como fuente única, reservar CLAUDE.md para instrucciones breves específicas de la herramienta y separar los workflows detallados en Skills.


## MCP (Model Context Protocol)

Si los archivos `.md` resuelven la cuestión de «qué debe saber el agente», MCP (Model Context Protocol) resuelve la de «**qué debe poder hacer el agente**».

Veámoslo con más detalle. Para que un agente de IA envíe un mensaje a Slack, debe poder llamar a la Slack API. Para crear una issue de GitHub, debe poder llamar a la GitHub API. Para consultar Postgres, debe gestionar una conexión con la base de datos. MCP **agrupa todas estas integraciones con sistemas externos bajo un protocolo estándar**. (Significa que cualquier cliente puede conectarse a cualquier servidor a través de la misma interfaz).

MCP es un estándar abierto que Anthropic presentó por primera vez el **25 de noviembre de 2024**. El **9 de diciembre de 2025**, Anthropic, Block y OpenAI, como cofundadores, donaron la especificación MCP a la Agentic AI Foundation (AAIF) de la Linux Foundation. Google, Microsoft, AWS, Cloudflare y Bloomberg se incorporaron como miembros Platinum. (En el momento de la donación, en diciembre de 2025, ya se contabilizaban más de 97 millones de descargas mensuales de los SDK y más de 10.000 servidores MCP públicos activos).

MCP es un protocolo de sesión stateful construido sobre JSON-RPC. **JSON-RPC** es un protocolo RPC (Remote Procedure Call) stateless y ligero que utiliza JSON como wire format. Es independiente de la capa de transporte, por lo que puede funcionar sobre HTTP, TCP o la entrada y salida estándar. También admite notifications (llamadas sin respuesta) y llamadas batch.


### Dentro del protocolo

Todas las interacciones entre clientes y servidores MCP se expresan mediante uno de seis primitive types. Al principio había tres del lado del servidor, pero la spec 2025-06-18 añadió tres del lado del cliente, de modo que el estándar actual suma seis.

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

Tras revisar los primitive types y los métodos de transporte, sigamos ahora el flujo de **cómo un LLM descubre e invoca realmente una herramienta MCP**. (Si con los archivos `.md` preguntábamos «dónde se inyectan», aquí la cuestión es «cómo entra MCP en el campo de visión del LLM»).

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

El cliente transforma la lista recibida mediante `tools/list` en el parámetro `tools` de la Anthropic Messages API o en el parámetro `tools` de OpenAI function calling, y la incluye en la llamada a la API del LLM. En Anthropic, cuando se proporciona el parámetro tool, **se añade automáticamente un special system prompt** para que el modelo comprenda cómo invocar herramientas. (Ese es el origen de los 346 tokens adicionales mencionados antes).

Cuando el LLM decide que debe invocar una herramienta, incluye en su respuesta un bloque `tool_use` (`{"type": "tool_use", "name": ..., "input": ...}`) y finaliza con un `stop_reason` de valor `tool_use`. El cliente lo recibe, envía un `tools/call` al servidor MCP real, obtiene el resultado y vuelve a pasárselo al LLM en un bloque `tool_result` del siguiente user message. **El ciclo se repite hasta que `stop_reason` deja de ser `tool_use` y adopta otro valor (`end_turn`, `max_tokens`, etc.)**. Lo que solemos llamar «el agente trabajando» es, en esencia, una sucesión de estos ciclos de llamada, resultado y nueva llamada.

¿En qué se diferencia entonces MCP del simple function calling? Puede resumirse en cuatro puntos.

- **Descubrimiento dinámico**: la lista de herramientas no se conoce en build time, sino que se obtiene en runtime mediante `tools/list`. También puede cambiar durante la sesión mediante `notifications/tools/list_changed`
- **Stateful session**: define lifecycle phases (initialize → operation → shutdown), lo que permite un cierre limpio
- **Primitive types además de Tool**: expone Prompt, Resource, Sampling, Roots y Elicitation mediante capability negotiation
- **Bidireccionalidad**: la spec permite que el servidor invoque a la inversa el LLM del cliente mediante sampling

(Por estas diferencias, MCP también se describe como «un estándar generalizado de function calling para agentes»).

### Serena

**Serena** (`oraios/serena`) es uno de los servidores MCP que más se mencionan en relación con los agentes de codificación. En mayo de 2026 contaba con unas 24,7k stars y, en cerca de un año, pasó de ser una herramienta minoritaria a convertirse de facto en un MCP de código estándar.

Su idea central puede resumirse en una frase: **mostrar símbolos al agente, no texto**.

Veámoslo con más detalle. Supongamos que necesitamos encontrar todos los usos de la función `calculateTotal`. Una herramienta convencional basada en texto (como grep o Read) funciona así.

Primero busca `calculateTotal` con grep en todo el codebase. Después reúne los números de línea de todas las coincidencias y lee un determinado rango de líneas en cada archivo para construir el contexto. También recoge coincidencias accidentales en nombres de variables, string literals y comentarios.

Serena, que se basa en LSP, realiza una única llamada a `find_referencing_symbols("calculateTotal")` y devuelve únicamente las referencias exactas del símbolo, sin el ruido de coincidencias en nombres de variables o comentarios.

**LSP (Language Server Protocol)** es un protocolo abierto basado en JSON-RPC que estandariza la comunicación entre editores de código o IDE y «herramientas de inteligencia del lenguaje» (autocompletado, ir a la definición, búsqueda de referencias, refactoring, etc.). Microsoft, Red Hat y Codenvy lo estandarizaron conjuntamente en 2016. La idea central es «no volver a implementar un analizador de cada lenguaje en cada editor, sino crear un servidor por lenguaje al que puedan consultar todos los editores». (El servidor de TypeScript, rust-analyzer y pyright para Python son servidores LSP).

Las herramientas principales de Serena incluyen `find_symbol`, `find_referencing_symbols` y `get_symbols_overview`. Puede elegirse entre dos backends. El predeterminado es un language server que implementa LSP (gratuito y open source); la otra opción es un plugin de pago que utiliza el análisis de código de los IDE de JetBrains (con prueba gratuita).

La verdadera razón de la rápida adopción de Serena es **el ahorro de tokens**. El ciclo de grep de texto + Read de archivos consume muchos tokens, mientras que una sola llamada precisa a LSP consume muy pocos. Cuanto mayor es el codebase, mayor es la diferencia.


### ¿Es seguro MCP?

Hay un punto importante que aclarar: **MCP no automatiza la concesión de permisos**. El usuario es responsable de decidir en qué servidores puede confiar, qué side effects tiene cada herramienta y si seguirá comportándose igual con el paso del tiempo.

Conviene conocer dos ataques representativos.

- **Tool Poisoning Attack (TPA)**: ataque bautizado por Invariant Labs, que publicó una PoC en abril de 2025. Si se ocultan instrucciones maliciosas en la descripción (description) de una herramienta de un servidor MCP, el modelo las confunde con instrucciones del usuario y las sigue. Es un texto invisible para el usuario, pero visible para el modelo.

- **Rug Pull** (Silent Redefinition): concepto analizado por Simon Willison en una publicación del 9 de abril de 2025. Al principio, la herramienta es legítima. El usuario la revisa, aprueba e integra en su workflow. Semanas después, su definición cambia silenciosamente e incorpora instrucciones maliciosas. Como no se solicita una nueva aprobación, su comportamiento cambia sin más.

El **15 de abril de 2026** se produjo un incidente de seguridad relacionado. OX Security reveló vulnerabilidades RCE sistémicas que afectaban a todos los principales SDK de MCP (Python, TypeScript, Java y Rust). Quedaron dentro del alcance más de 150 millones de descargas, unos 7.000 servidores públicos y cerca de 200.000 deployments potencialmente vulnerables. Se asignaron más de 14 CVE, y Cursor, VS Code, Windsurf, Claude Code y Gemini-CLI se vieron afectados.

¿Qué medidas se tomaron después? Anthropic **no modificó la arquitectura del protocolo**. En su lugar, actualizó `SECURITY.md` para aclarar que, al utilizar adaptadores stdio, la responsabilidad de sanitizar las entradas corresponde a los desarrolladores downstream. En la spec, la revisión **2025-06-18 hizo obligatorio OAuth 2.1 + RFC 8707 Resource Indicators** para impedir ataques de reutilización de tokens, y la revisión **2025-11-25 introdujo incremental scope consent** (el usuario acepta progresivamente solo los permisos mínimos necesarios). Aun así, solo entre enero y febrero de 2026 se publicaron más de 30 CVE relacionados con MCP, y las estadísticas indican que **command injection representó el 43 %**. **La seguridad sigue siendo un terreno en evolución**.


## Herramientas de inteligencia de código

Si los archivos `.md` responden a «qué debemos contarle al agente» y MCP a «qué debemos permitirle hacer», las herramientas de inteligencia de código resuelven «**cómo encontrar rápidamente el código pertinente**».

En un codebase grande, la mayor parte del coste de un agente de IA no se dedica a modificar código, sino a **encontrar dónde está el código relevante**. Si cada tarea empieza con el ciclo grep → Read → filtrar → volver a grep, se desperdician tokens, tiempo y tool calls. Las herramientas de inteligencia de código son distintos intentos de reducir este coste de búsqueda.

Dividirlas en cuatro niveles (tiers) ayuda a ordenar el panorama.


### Empaquetado de contexto

La solución más sencilla parte de la idea de «**meterlo todo en una sola ventana de contexto**». No construye grafos ni crea índices: simplemente serializa el repositorio entero como un bloque de texto y se lo entrega al modelo.

Una herramienta representativa es **Repomix**. Empaqueta todo el repositorio en una estructura optimizada para el parsing XML de Claude. Cuenta con CLI, web, extensión y servidor MCP, por lo que ofrece uno de los ecosistemas más completos.

**GitIngest** es conocida por su experiencia sin fricciones. Basta con cambiar `github.com` por `gitingest.com` en una URL de GitHub para convertir todo el repositorio en una página de texto. (Por ejemplo, `github.com/facebook/react` → `gitingest.com/facebook/react`). Cambiar una sola palabra en la barra de direcciones es todo lo que se necesita; no requiere instalación y está especializada en exploraciones rápidas de una sola vez.

**code2prompt** (creada por Mufeed VH) es una CLI basada en Rust que destaca por la personalización mediante un sistema de templates.

También merece atención una variante interesante: **rtk** (`rtk-ai/rtk`, unas 55k stars). Mientras que las herramientas anteriores «empaquetan todo el repositorio de una vez», rtk **comprime en tiempo real la salida de los propios comandos de la CLI**. Es un único binario escrito en Rust que se registra automáticamente en los shell hooks de 13 herramientas, entre ellas Claude Code, Cursor, Copilot, Gemini CLI y Codex. Así, cuando un agente invoca `git status`, internamente se reescribe como `rtk git status`. (Su gran diferenciador es que el usuario no necesita cambiar su workflow). Aplica heurísticas de smart filtering, grouping, truncation y deduplication a más de 100 comandos, reduciendo entre un 60 y un 90 % los tokens de salida. Una frase de su sitio oficial resume bien la categoría: *«70% of your bill is noise the LLM doesn't need.»* Si las herramientas anteriores reducen la cantidad de «contexto que entra», rtk reduce la cantidad de «contexto que regresa como resultado de una tool call».

La limitación de este nivel es clara: **los repositorios grandes alcanzan el límite de tokens**. Además, el código solo se transmite como «un bloque de texto», sin comprensión estructural ni relaciones entre símbolos.


### Mapa del repositorio con tree-sitter

El siguiente nivel utiliza **tree-sitter** para analizar la estructura del código, pero sin ejecutar un servidor de indexación independiente.

Un **AST (Abstract Syntax Tree, árbol de sintaxis abstracta)** es una estructura de datos que representa el código fuente como un árbol. Es el resultado de la fase de parsing de un compilador: elimina detalles superficiales como espacios, puntos y coma o paréntesis, y conserva como nodos únicamente elementos significativos, como variables, operadores, llamadas a funciones y control flow. Todos los análisis precisos de las herramientas de inteligencia de código se realizan, en última instancia, sobre un AST.

**tree-sitter** es un generador de parsers open source y una librería de parsing incremental. Lo utilizan la navegación de código de GitHub, Neovim, Zed y Helix, entre otros. Su principal diferenciador consiste en que **solo vuelve a analizar la parte editada**. Aunque modifiquemos una línea en el editor, no vuelve a analizar el archivo entero, sino que parchea únicamente el árbol modificado. Por eso ofrece una respuesta rápida y también resulta adecuado para que los agentes de IA examinen código con agilidad.

**Aider**, que vimos antes, es un caso representativo de este enfoque. Utiliza tree-sitter para extraer definiciones de símbolos —funciones, clases y métodos— de los archivos fuente; crea un grafo en el que los archivos son nodos y las dependencias entre archivos son edges; y aplica al grafo un algoritmo de ranking de la familia PageRank (que calcula la importancia de una página según la cantidad y la calidad de los enlaces que apuntan a ella) para extraer únicamente las definiciones y signatures esenciales dentro del presupuesto de tokens. (Con el valor predeterminado `--map-tokens=1024`, crea un mapa del repositorio de 1k tokens).

**AFT** (`cortexkit/aft`) lleva este enfoque a un nivel más preciso. Traducido literalmente de su README oficial: **«Leer un archivo de 500 líneas cuesta unos 375 tokens. Pero, cuando el agente solo necesita una función en la mayoría de los casos, pasar el nombre del símbolo a `aft_zoom` devuelve únicamente esa función y un poco de contexto. El coste es de unos 40 tokens»**. Además, la edición basada en números de línea se rompe cuando se mueve el código situado por encima del objetivo, mientras que el modo de edición por símbolos de AFT es estable porque se dirige a la función por su nombre.

En este mismo nivel hay otra herramienta que merece una mención adicional: **ast-grep** (`ast-grep/ast-grep`, unas 13,9k stars). Es una CLI de búsqueda estructural y rewriting basada en tree-sitter. Su diferencia decisiva frente al grep convencional es que no busca texto, sino patrones CST (Concrete Syntax Tree). Por ejemplo, al buscar el patrón `console.log($A)`, encuentra con precisión todas las llamadas con la misma estructura semántica, con independencia de su forma textual. También existe un servidor `ast-grep-mcp` independiente para que los agentes de IA utilicen búsquedas estructurales en lugar de grep de texto.


### Knowledge Graph

El tercer nivel va un paso más allá: **analiza de antemano todo el codebase, construye un knowledge graph y lo guarda en disco**; después, el agente consulta ese grafo ya almacenado. El caso que más atención ha recibido es una herramienta llamada **CodeGraph**.

Su arquitectura es sorprendentemente sencilla. Analiza el código con **tree-sitter**, guarda los símbolos, edges y archivos extraídos en la búsqueda full-text FTS5 de SQLite y expone ese knowledge graph al agente de IA mediante MCP. Conviene destacar que **toda la extracción se realiza de forma determinista mediante parsing AST, no mediante resúmenes de un LLM**, por lo que no hay margen para alucinaciones.

**FTS5 (SQLite Full-Text Search 5)** es una extensión de búsqueda de texto completo proporcionada como virtual table de SQLite. Forma parte de la amalgamation desde SQLite 3.9.0 (2015-10-14). Se crea una tabla mediante `CREATE VIRTUAL TABLE ... USING fts5(...)` y se consulta con el operador `MATCH`. Su ventaja decisiva es que permite mantener un índice full-text en un único archivo SQLite sin ejecutar un motor de búsqueda independiente como Elasticsearch. Esta es también una de las razones por las que CodeGraph puede anunciar un «funcionamiento 100 % local».

El **parsing determinista (deterministic)** que acabamos de mencionar designa un algoritmo de parsing que, sin backtracking, solo permite una elección única en cada fase. Los parsers LL(1) y LR son ejemplos representativos y funcionan en tiempo lineal. En el contexto de CodeGraph, significa que «las relaciones entre símbolos extraídas del AST son matemáticamente exactas, no una interpretación del LLM». Si un LLM resume el código para construir el grafo, existe riesgo de alucinaciones; al analizar directamente el AST, en cambio, se obtienen **relaciones entre símbolos matemáticamente exactas**. Este principio es fundamental para la herramienta.

Los benchmarks también resultan llamativos. Se comparó la ejecución headless de Claude Opus 4.7 con y sin CodeGraph MCP. Según los promedios del README oficial, activarlo resultó **un 35 % más barato**, utilizó **un 57 % menos de tokens**, fue **un 46 % más rápido** y redujo las **tool calls en un 71 %**. Además, el beneficio aumenta en proporción al tamaño del codebase: en un repositorio grande como Tokio se midieron reducciones del 82 % en coste, del 86 % en tokens y del 92 % en tool calls, junto con una mejora de velocidad del 71 %. (Sin CodeGraph, el agente hace un fan-out amplio de grep/find/Read; con CodeGraph, una sola consulta al índice sustituye todas esas operaciones).

El contexto académico también es profundo. **GraphCoder** (ASE 2024) creó un Code Context Graph que integra control flow y data/control dependence. **CodexGraph** (NAACL 2025) hizo que un agente LLM escribiera y ejecutara directamente consultas en una graph database. **Prometheus** combinó un knowledge graph basado en tree-sitter con memoria integrada y lo aplicó a la resolución de issues multilingües. Se trata claramente de un patrón hacia el que convergen a la vez la investigación y la industria.

Veamos una variante interesante. **La indexación de Cursor** sigue un camino diferente al anterior: no utiliza un grafo AST, sino búsqueda semántica basada en vector embeddings. Divide localmente los archivos en chunks de funciones y clases, los sincroniza con el servidor mediante hashes de un Merkle tree y almacena únicamente los embeddings en una vector DB llamada Turbopuffer. (El aspecto central de su modelo de privacidad es que no guarda el código fuente original en la nube). Al realizar una consulta, convierte la pregunta en un embedding, ejecuta una búsqueda nearest-neighbor y vuelve a leer localmente las rutas de archivo y los rangos de líneas obtenidos para pasárselos al LLM. Busca **«código relacionado semánticamente», no «símbolos exactos»**: tiene menor precisión, pero funciona bien con consultas en lenguaje natural. CodeGraph y la indexación de Cursor resuelven el mismo problema —el coste de búsqueda— partiendo de supuestos diferentes.


### LSP

El último nivel **depende directamente de un language server**. Si tree-sitter sabe «que existe un símbolo», LSP sabe «qué es ese símbolo».

Veamos la diferencia con un ejemplo concreto. El LSP de TypeScript sabe que `UserService` implementa la interfaz `IUserService`, qué parámetros generic type recibe, qué overloads existen y cuál es el return type. tree-sitter no puede llegar tan lejos.

**Serena**, que vimos en la sección sobre MCP, pertenece exactamente a este nivel. Aider no utiliza LSP, sino su propio análisis de archivos, por lo que solo puede reconocer elementos al nivel de funciones y clases. En cambio, la integración LSP de herramientas como **OpenCode** ofrece una comprensión más profunda de los tipos, aunque tiene la limitación de depender de buenos servidores LSP para cada lenguaje.


## GitHub Trending

![Flujo de las herramientas para agentes de codificación con IA y de la inteligencia de código](1.webp)

Para terminar, descubrí por primera vez muchas de las herramientas anteriores a través de **GitHub Trending**. Es un lugar donde se puede ver de un vistazo quién está creando qué herramientas y cuáles están ganando popularidad de repente.

En `github.com/trending` se puede consultar por tres intervalos: today, this week y this month. También permite filtrar por lenguaje y categoría. (Normalmente consulto weekly + TypeScript / Python y, de vez en cuando, amplío la búsqueda a todos los lenguajes).

Al seguir Trending durante las últimas semanas, descubrí algo interesante: **los repositorios más destacados de este trimestre forman clusters claros**. Conocer esos clusters ayuda a situar mejor cada herramienta.

## En conclusión

Mientras escribía este artículo, mi pensamiento más recurrente fue que **las herramientas se multiplican demasiado deprisa**. Incluso durante la redacción aparecieron nuevos servidores MCP en GitHub Trending, cambió la compatibilidad con AGENTS.md y se publicaron nuevas CVE de seguridad. La sensación de que un párrafo a medio terminar queda obsoleto enseguida es inherente a la escritura técnica, pero el ecosistema de agentes de IA avanza a una velocidad especialmente vertiginosa.

Por eso, mi objetivo aquí no era recomendar herramientas concretas, sino desarrollar **la capacidad de comprender las relaciones entre ellas**. Cuando sabemos por qué CLAUDE.md se inyecta como user message, en qué se diferencia concretamente MCP de function calling y por qué tree-sitter y LSP pertenecen a niveles distintos, al aparecer una herramienta nueva podemos identificar rápidamente «en qué nivel está y qué problema resuelve de qué manera».

Al final, queda una intuición transmitida por el estudio de ETH Zurich: **el modelo ya sabe muchas cosas**. Meter de todo a la fuerza en un archivo de contexto no hace que el agente lo siga mejor. Es preferible conservar solo aquello que el modelo probablemente desconozca —convenciones propias del proyecto, herramientas no estándar y errores del pasado— y retirar lo demás. Instalar más herramientas y saber utilizarlas bien son dos problemas diferentes.

A quienes lean este artículo les recomiendo que, antes de añadir de golpe diez MCP o ampliar CLAUDE.md a cientos de líneas, investiguen al menos una vez los principios en los que se basan las herramientas que ya utilizan. Creo que esa comprensión constituye una base sólida, con independencia de la dirección que tome el ecosistema.


## Referencias

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
