---
emoji: 🧭
title: 'Archivos de contexto'
seoTitle: "CLAUDE.md, AGENTS.md y SKILL.md: archivos de contexto"
date: '2026-05-29'
updatedAt: "2026-10-08"
categories: IA Herramientas-de-desarrollo Claude MCP CodeGraph
description: "Cómo cargan los agentes CLAUDE.md, AGENTS.md, SKILL.md y Cursor rules, por qué se pierden instrucciones y qué escribir según un estudio de ETH Zurich."
keywords: "CLAUDE.md, AGENTS.md, SKILL.md, MEMORY.md, Cursor rules, copilot-instructions.md, archivos de contexto, agente de codificación con IA, Claude Code, estudio ETH Zurich AGENTS.md"
locale: es
translationOf: '260529'
sourceHash: 03edb5679e5e12f5dfab8b993152fdcc6c46eb0469c401b0c40f6255723f212d
---

En esta publicación quiero hablar sobre **los archivos de contexto que leen los agentes de codificación con IA**.

Este artículo está pensado para quienes tienen `CLAUDE.md`, `AGENTS.md`, `SKILL.md` y `.cursor/rules` acumulados en un mismo proyecto y no tienen claro cuándo se lee cada uno ni qué escribir en él. Al terminar, conocerás las diferencias entre estos archivos, cómo los cargan los agentes y un criterio respaldado por un estudio de ETH Zurich: escribir solo la información que el agente no puede inferir.

Trabajo como desarrollador frontend y utilizo Claude a diario. Con el tiempo, apareció un `CLAUDE.md` en la raíz del proyecto, junto a un `AGENTS.md` que alguien había creado; `.cursorrules` seguía olvidado en un rincón y yo mismo terminé creando una carpeta `.claude/skills/` siguiendo algún artículo que había visto. (Cuando me di cuenta, había unos cinco archivos con contenidos parecidos).


## Agentes sin memoria persistente

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

`AGENTS.md` es un estándar creado para resolver la proliferación de archivos específicos de cada herramienta que acabamos de describir. En diciembre de 2025, OpenAI donó este estándar a la **Agentic AI Foundation (AAIF)** de la Linux Foundation. Según el [anuncio de la Linux Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation), la AAIF la cofundaron Anthropic, Block y OpenAI, y sus proyectos fundacionales son tres: MCP de Anthropic (el protocolo que conecta a los agentes con sistemas externos), goose de Block y `AGENTS.md` de OpenAI. El sitio oficial (`agents.md`) afirma que **más de 60.000 repositorios open source han adoptado este archivo**.

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

MCP (Model Context Protocol), con el que aquí se comparaban las Skills, es un protocolo estándar que conecta al agente con sistemas externos como Slack, GitHub o una base de datos para que pueda invocarlos. Si los archivos de contexto tratan de qué contarle al agente, MCP trata de qué permitirle hacer. En qué se diferencia MCP de function calling lo he explicado aparte en [MCP y function calling](/260524).

Las herramientas que reducen el coste de que un agente encuentre el código relevante (Repomix, Aider, CodeGraph, Serena) reducen costes distintos según lo a fondo que entiendan el código. Esa comparación la he recogido aparte en [Cuatro niveles de inteligencia de código](/260526).


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


## En conclusión

Los archivos de contexto cambian de una herramienta a otra en nombre, ubicación y momento de lectura. Solo en este artículo hemos visto CLAUDE.md, AGENTS.md, SKILL.md, Cursor rules, copilot-instructions.md y MEMORY.md, y qué herramienta admite qué archivo no deja de cambiar. Memorizar una lista de archivos se queda obsoleto enseguida.

Por eso, mi objetivo aquí no era recomendar un formato de archivo concreto, sino desarrollar **la capacidad de ver cómo leen los agentes estos archivos**. Cuando sabemos por qué CLAUDE.md se inyecta como user message, por qué cada herramienta lee de forma distinta el mismo AGENTS.md y por qué las instrucciones se debilitan en la mitad del contexto, al aparecer un formato nuevo de archivo de contexto podemos identificar rápidamente «cuándo se carga y con cuánta fuerza actúa».

Al final, queda una intuición transmitida por el estudio de ETH Zurich: **el modelo ya sabe muchas cosas**. Meter de todo a la fuerza en un archivo de contexto no hace que el agente lo siga mejor. Es preferible conservar solo aquello que el modelo probablemente desconozca —convenciones propias del proyecto, herramientas no estándar y errores del pasado— y retirar lo demás. Escribir un archivo de contexto largo y escribirlo bien son dos problemas diferentes.

A quienes lean este artículo les recomiendo que, antes de ampliar CLAUDE.md a cientos de líneas, investiguen al menos una vez cuándo, dónde y con cuánta fuerza leen ese archivo las herramientas que ya utilizan. Creo que esa comprensión constituye una base sólida, cambien como cambien los formatos de archivo.


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
