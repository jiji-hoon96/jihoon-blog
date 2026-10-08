---
emoji: 🔎
title: "Cuatro niveles de inteligencia de código"
seoTitle: "Inteligencia de código: Repomix, Aider, CodeGraph y Serena"
date: "2026-05-26"
updatedAt: "2026-10-08"
categories: IA Herramientas-de-desarrollo Claude MCP CodeGraph
description: "Cuatro niveles de herramientas que abaratan la búsqueda de código de un agente de IA: Repomix, mapas tree-sitter, el grafo de CodeGraph y Serena con LSP."
keywords: "inteligencia de código, CodeGraph, Serena MCP, tree-sitter, LSP, Repomix, Aider repo map, ahorro de tokens agente de IA"
locale: es
translationOf: '260526'
sourceHash: 182bb75afe619d0d97875b8a9abbc855d796bdf96b4c9aaf93ff0695021afce5
---

En esta entrada quiero hablar de **en qué se diferencian entre sí las herramientas que reducen el costo de que un agente de programación con IA encuentre el código relevante**.

Este artículo es para desarrolladores que han visto a un agente gastar tokens repitiendo grep y lecturas de archivos en una base de código grande, y que dudan qué herramienta añadir, como Repomix, CodeGraph o Serena. Estas herramientas se dividen en cuatro niveles según lo profundamente que entienden el código (context packing, el repo map de tree-sitter, el grafo de conocimiento y LSP), y cada nivel reduce el costo de búsqueda en un lugar distinto. Para el grafo de conocimiento incluyo el benchmark de su creador; para los otros tres niveles, mediciones hechas en el propio repositorio de este blog.

Desde que vi `codegraph` en GitHub Trending y lo instalé yo mismo, cada vez que encuentro una herramienta nueva me pregunto con qué principio ahorra tokens. Muchas de las herramientas de este artículo también las conocí por primera vez en GitHub Trending, que suelo revisar por semana, filtrando por TypeScript y Python.


## Herramientas de inteligencia de código

Antes de cambiar código, un agente primero busca dónde está el código relevante. Es un bucle: busca con grep, lee archivos, filtra y vuelve a hacer grep. En el benchmark de CodeGraph que veremos más adelante, el lado que respondía sin la herramienta usó hasta 43 tool calls para una sola pregunta. Las herramientas de inteligencia de código son intentos de reducir este costo de búsqueda.

Pero "costo" no designa una sola cosa. Los tokens que procesó el modelo, el número de tool calls y los tokens que siguen en la context window cuando termina el trabajo se mueven por separado. En cada nivel, este artículo mira cuál de los tres reduce.

Divido estos intentos en los cuatro niveles (tiers) de abajo, según lo profundamente que cada herramienta entiende el código. No hay una clasificación establecida en la industria; la agrupación es mía. Todos los valores medidos en este artículo se obtuvieron el 2026-10-08 en el commit `36e5cfa` de este repositorio, y los tokens se contaron con `o200k_base` de tiktoken. Los valores difieren de los del tokenizador de Claude, así que sirven para comparar, no como cifras absolutas.


### Empaquetado de contexto

La solución más simple parte de la idea: "**meterlo todo en una sola context window**". No construye grafos ni hace indexación. Simplemente serializa todo el repositorio en un bloque de texto y se lo entrega entero al modelo.

La herramienta representativa es **Repomix**. Su formato de salida por defecto es XML, y su README enlaza la documentación de Anthropic sobre etiquetas XML. Tiene CLI, versión web, extensión de navegador y servidor MCP.

La ventaja de **GitIngest** es que no requiere instalación. Si cambias `github.com` por `gitingest.com` en una URL de GitHub, todo el repositorio se convierte en una sola página de texto. **code2prompt** (creado por Mufeed VH), una CLI en Rust, permite cambiar el formato de salida con plantillas.

**rtk** (`rtk-ai/rtk`) va en una dirección algo distinta. Mientras las herramientas anteriores empaquetan todo el repositorio de una vez, rtk comprime la salida de los comandos de CLI que ejecuta el agente. Es un único binario hecho en Rust que se registra en los hooks de varios agentes, como Claude Code, Cursor, Copilot, Gemini CLI y Codex, de modo que cuando el agente llama a `git status`, ejecuta `rtk git status` en su lugar. Aplica filtering, grouping, truncation y deduplication a más de 100 comandos. El hook de rtk solo toma como objetivo las tool calls de Bash. `Read`, `Grep` y `Glob` de Claude Code pasan de largo.

La magnitud de la reducción hay que leerla con cuidado. El [README de rtk](https://github.com/rtk-ai/rtk/blob/8533612180c60efbcb5827c7db4e910aba096705/README.md#L66-L70) dice que reduce la salida de Bash hasta en un 90%, y añade enseguida que eso no significa reducir la factura un 90%. Desde el lado del modelo, la salida de un comando es parte de los tokens de entrada, y los tokens de entrada son parte de la factura, así que la reducción se diluye en cada paso. La cifra que destaca el [sitio oficial](https://www.rtk-ai.app/) es un 56% de media, en los comandos que rtk reescribe. Si las herramientas anteriores reducen el texto que entra, rtk reduce el texto que vuelve como resultado de las tool calls.

El límite de este nivel es que **los repositorios grandes chocan con el tope de tokens**. Empaquetar solo los 109 archivos del `src/` de este blog ya da 94.596 tokens. Eso todavía cabe en la ventana, pero un repositorio con miles de archivos llegaría al límite enseguida. Repomix responde a esto con `--compress`. Según el [README](https://github.com/yamadashy/repomix/blob/8d6429121e98ed178e4d3a975c2bdbbecc958c4a/README.md#L797-L831), usa Tree-sitter para conservar las firmas de funciones y clases y descartar los cuerpos de implementación.

```bash
# repomix 1.18.1, 이 리포 커밋 36e5cfa, 2026-10-08
npx -y repomix@1.18.1 src -o out.xml              # Total Tokens: 94,596 tokens
npx -y repomix@1.18.1 src --compress -o out.xml   # Total Tokens: 30,320 tokens
```

Se redujo un 68%. Los comentarios se quedan, así que `visit-counter.ts`, con JSDoc largo, solo pasó de 1.642 a unos 1.220 tokens, un 26%. La versión comprimida conserva las sentencias import y las firmas, pero desaparecen las llamadas dentro de los cuerpos de las funciones. En el texto se ve qué archivo importa qué, pero no se puede preguntar quién llama a quién. Por eso la frontera entre este nivel y el siguiente está menos en si la herramienta ve la sintaxis que en si se le pueden preguntar relaciones.


### Mapa del repositorio con tree-sitter

El siguiente nivel usa **tree-sitter** para analizar la estructura del código, pero sin levantar un servidor de índices aparte.

Lo que construye tree-sitter, la herramienta en la que se apoya este nivel, es un **CST (Concrete Syntax Tree)**, un árbol que representa la estructura del código fuente. La [documentación oficial de tree-sitter](https://tree-sitter.github.io/tree-sitter/) también dice que construye un concrete syntax tree. Es un árbol que conserva como nodos incluso los paréntesis y la puntuación, y es el árbol con el que trabajan las herramientas de abajo.

**tree-sitter** es un generador de parsers de código abierto y una biblioteca de parsing incremental (incremental). La [code navigation de GitHub](https://docs.github.com/en/repositories/working-with-files/using-files/navigating-code-on-github) usa tree-sitter. Como solo vuelve a parsear la parte editada, cambiar una línea en el editor no vuelve a parsear todo el archivo; solo corrige la parte del árbol que cambió. Esa ventaja es de los editores, donde las ediciones no paran. Aider, más abajo, mantiene una caché basada en la hora de modificación de los archivos para no volver a parsear los que no cambiaron.

**Aider**, una herramienta de programación en pareja con IA que se usa en la terminal, es el ejemplo representativo de este enfoque. Aider usa tree-sitter para extraer de cada archivo las definiciones y referencias de funciones, clases y métodos. Luego construye un grafo con los archivos como nodos. Cuando el archivo A referencia un identificador definido en el archivo B, se crea una arista de A a B.

Para elegir los archivos importantes de este grafo, Aider usa PageRank. PageRank es un algoritmo que da más puntuación a un nodo cuantos más enlaces recibe y cuanto más pesan. Aider usa una variante llamada personalized PageRank, que inclina la puntuación hacia los nodos elegidos. Después mete en el presupuesto de tokens las definiciones y firmas de los archivos mejor clasificados.

Qué entra en el presupuesto cambia con la conversación actual. En [`repomap.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L487-L525) de Aider, el peso de una arista es la raíz cuadrada del número de referencias multiplicada por un factor. Los identificadores mencionados en la conversación reciben x10, y los identificadores en camelCase, snake_case o kebab-case de 8 o más caracteres también x10. Los que empiezan por `_` y los definidos en más de 5 archivos reciben x0,1 cada uno, y las aristas que salen de los archivos añadidos ahora al chat reciben x50. Los archivos del chat, los mencionados en la conversación y aquellos cuya ruta o nombre de archivo coincide con un identificador de la conversación también reciben puntuación de personalization en PageRank.

El presupuesto tampoco es fijo. La [documentación de Aider](https://aider.chat/docs/repomap.html) da 1k como valor por defecto de `--map-tokens`, pero el [código](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/models.py#L782-L789) recorta un octavo del límite de entrada del modelo a un valor entre 1.024 y 4.096. Y cuando no hay archivos en el chat, lo amplía hasta `--map-multiplier-no-files` (por defecto 2) veces. Lo comprobé con el `src/` de este repositorio. La versión 0.86.1 que ejecuté y el commit enlazado arriba tienen el mismo código de ranking. Los maps impresos se contaron con o200k_base, incluidas las tres líneas de texto de guía que añade Aider.

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

| Condición | Presupuesto elegido por Aider | Map impreso | Archivos incluidos |
|---|---|---|---|
| Valores por defecto, sin archivos en el chat | 4.096 | 7.370 tokens | 61 |
| `--map-tokens 1024`, sin archivos en el chat | 1.024 | 2.019 tokens | 27 |
| `--map-tokens 1024`, `filter-posts.ts` añadido al chat | 1.024 | 983 tokens | 12 |

El límite de entrada de gpt-4o es de 128k, así que un octavo se recortó a 4.096, y con el chat vacío el map salió dentro del doble de eso. Al añadir un archivo al chat, el map se encogió hasta caber en el presupuesto; de los 27 archivos anteriores solo quedaron 10, y entraron como nuevos `PostList.tsx` y `SearchModal.tsx`. Un repo map no es un resumen fijo del repositorio, sino un extracto ajustado a la conversación de ese momento.

Hay una herramienta más que vale la pena mencionar en este nivel: **ast-grep** (`ast-grep/ast-grep`). Es una CLI de búsqueda estructural y rewrite basada en tree-sitter, y hace coincidir nodos del árbol sintáctico en lugar de texto. Por ejemplo, el patrón `console.log($A)` atrapa todas las llamadas a `console.log` con un solo argumento, sin importar cómo sean los saltos de línea o los espacios. Lo que atrapa es la misma estructura sintáctica. No sabe el tipo de `$A` ni de dónde viene el nombre `console`. También existe un servidor `ast-grep-mcp`, con el que se puede hacer que un agente use búsqueda estructural en lugar de grep de texto.


### Knowledge Graph

El tercer nivel va un paso más allá. **Parsea de antemano toda la base de código, construye un grafo de conocimiento y lo guarda en disco**; luego el agente lanza consultas a ese grafo guardado. El ejemplo del que más se habla es una herramienta llamada **CodeGraph**.

La estructura que describe el [README de CodeGraph](https://github.com/colbymchenry/codegraph/blob/b635dd467f0578926a9c01a37b9d28d2b26689f1/README.md) es sencilla. Parsea el código con tree-sitter para extraer símbolos, aristas e información de archivos, y los guarda en una base de datos SQLite local. La búsqueda por nombre pasa por el índice FTS5 de SQLite. El agente consulta este grafo a través de MCP. En los pasos que describe el README no aparece ningún LLM. Por eso entiendo que esta extracción es determinista (deterministic), es decir, que el mismo código siempre da el mismo resultado.

Si un LLM resume el código para construir el grafo, los resultados pueden variar incluso con el mismo código, y pueden colarse alucinaciones. En cambio, si se parsea directamente el árbol sintáctico, las relaciones entre símbolos se extraen solo según las reglas de la gramática del lenguaje, sin margen para ese tipo de interpretación.

**FTS5 (SQLite Full-Text Search 5)**, que aparece aquí, es una extensión de búsqueda de texto completo que SQLite ofrece en forma de tabla virtual. Según la [documentación de SQLite](https://www.sqlite.org/fts5.html), está incluida en la amalgamation desde la 3.9.0 (2015-10-14); se crea una tabla con `CREATE VIRTUAL TABLE ... USING fts5(...)` y se consulta con el operador `MATCH`. Permite tener un índice de texto completo en un solo archivo SQLite sin levantar un motor de búsqueda aparte como Elasticsearch.

Pero ser determinista no es lo mismo que ser completo. El mismo README registra el reconocimiento de rutas de los frameworks que dependen de convenciones y reflexión entre un 74,1% para Django y un 83,9% para ASP.NET, y lo llama el límite del análisis estático (honest static-analysis ceiling). El mismo código da el mismo resultado, pero a ese resultado le pueden faltar aristas.

El benchmark lo midió CodeGraph mismo. La nueva medición del 2026-08-05 en el mismo README ejecutó Claude Opus 4.8 en modo headless y planteó una pregunta de arquitectura a cada uno de 7 repositorios de código abierto. El lado con CodeGraph MCP activado redujo el costo medio un 44%, los tokens procesados un 62% y las tool calls un 88%. Esta nueva medición impidió en ambos lados llamar a la CLI `codegraph` desde Bash. En un entorno de medición sin ese bloqueo, el lado sin la herramienta encontró y usó la CLI en 26 de 28 ejecuciones, y el README aclara que las cifras publicadas antes se obtuvieron sin este bloqueo.

El tamaño del ahorro no siguió al tamaño del repositorio. En las preguntas en las que el lado sin la herramienta usó de 28 a 43 tool calls, el costo bajó entre un 57 y un 78%, y en Gin, que terminó en 7, quedó casi igual. VS Code, con unos 11k archivos, dio un 71%, y Excalidraw, con unos 640, un 78%. El README lo atribuye a la cantidad de búsqueda que exigía cada pregunta. Como hay una sola pregunta por repositorio, solo leo de ahí la dirección.

El README también registra una cifra en sentido contrario. Los tokens procesados bajan, pero al final de una sesión de varios turnos, los resultados de retrieval que siguen en la context window son alrededor de un 80% mayores del lado de CodeGraph en el conjunto de los 7 repositorios. La diferencia varía según el repositorio; solo en VS Code son 67k frente a 18k tokens, unas 3,7 veces. Devuelve el texto fuente denso de una vez, y ese texto se queda en la ventana. CodeGraph redujo las tool calls y los tokens procesados a cambio de dejar más en la ventana.

**Cursor** tomó otro camino y luego cambió de rumbo. La indexación que describía la [entrada del blog de Cursor de enero de 2026](https://cursor.com/blog/secure-codebase-indexing) no era un grafo sintáctico sino **búsqueda semántica basada en embeddings vectoriales**. Dividía los archivos en chunks localmente, se sincronizaba con el servidor mediante hashes de Merkle tree y convertía los chunks en embeddings para la búsqueda semántica. En julio de 2026, un Community Support Engineer de Cursor respondió en el [foro](https://forum.cursor.com/t/what-do-you-think-about-cursor-removing-the-codebase-indexing-settings/165899): "Semantic/embeddings indexing is being turned down in favor of grep-based retrieval". En el mismo hilo, otro miembro del equipo escribió que, a medida que los modelos aprendieron a usar bien grep, la antigua ruta de búsqueda semántica dejó de ayudar de forma significativa. Hoy la [documentación de Cursor](https://cursor.com/docs/context/codebase-indexing) dice que Instant Grep construye y consulta su índice en tu máquina y no guarda embeddings de tu base de código para la búsqueda.


### LSP

El último nivel **depende directamente de un servidor de lenguaje**. Si tree-sitter sabe "que un símbolo existe", LSP sabe "qué es ese símbolo".

**[LSP (Language Server Protocol)](https://microsoft.github.io/language-server-protocol/)** es un protocolo abierto basado en JSON-RPC que estandariza la comunicación entre editores y herramientas de análisis de lenguaje (autocompletado, ir a la definición, buscar referencias, refactorización, etc.). En 2016, [Microsoft, Red Hat y Codenvy anunciaron su colaboración](https://www.redhat.com/en/about/press-releases/red-hat-codenvy-and-microsoft-collaborate-language-server-protocol). La idea central es "no reimplementar un analizador de lenguaje para cada editor; tener un servidor por lenguaje y que todos los editores le pregunten". rust-analyzer y pyright de Python son servidores LSP, mientras que TypeScript usa typescript-language-server, que envuelve en LSP a `tsserver`, que habla su propio protocolo.

**Serena** (`oraios/serena`) es un servidor MCP de este nivel. A 2026-10-08 tiene 30.093 stars, y el repositorio se creó en marzo de 2025. La idea central de Serena cabe en una línea: **mostrarle al agente el código como símbolos.** Sus herramientas principales incluyen `find_symbol`, `find_referencing_symbols` y `get_symbols_overview`. Se puede elegir uno de dos backends. El predeterminado es un servidor de lenguaje que implementa LSP (gratuito/de código abierto); la otra opción es un plugin de pago que usa el análisis de código del IDE de JetBrains (con prueba gratuita).

Medir en este repositorio muestra de dónde sale la diferencia. Busqué los usos de `isHiddenPost` (`src/lib/filter-posts.ts:12`), que filtra las entradas privadas, de dos formas. El lado de texto es grep.

```bash
# 커밋 36e5cfa, 2026-10-08. 이 글도 같은 이름을 담고 있어 content/ 는 뺐다
git grep -n isHiddenPost -- ':!content'   # 16줄, 파일 9개
git grep -n -C1 isHiddenPost -- ':!content'   # 같은 16곳을 앞뒤 1줄과 함께
```

En el lado LSP se llamó a [`find_referencing_symbols`](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/tools/symbol_tools.py#L169-L172) de Serena. La búsqueda de referencias de LSP pregunta por posición (archivo, línea y columna), no por nombre, así que esta herramienta también recibe a la vez `name_path`, el nombre del símbolo, y `relative_path`, el archivo donde está la definición. En lugar de levantar Serena como servidor MCP, la herramienta se llamó directamente desde Python sobre el mismo commit.

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

La salida es una sola línea de JSON. Este es solo el primer elemento. Los números de línea empiezan en 0.

```text
{"src/lib/filter-posts.ts": {"Function": [{"name_path": "filterPublishedPosts", "body_location": {"start_line": 22, "end_line": 24}, "content_around_reference": "...  22:export function filterPublishedPosts(posts: Post[]): Post[] {\n  >  23:  return posts.filter(post => !isHiddenPost(post))\n...  24:}"}]}, ...
```

Serena devolvió 10 referencias. Deja fuera la definición en `filter-posts.ts:12`, y para las líneas de import de tres archivos devuelve el propio archivo como símbolo (`File`). Las 11 ubicaciones de código que encontró grep son estas 10 más la línea de la definición. Este nombre es único en el repositorio, así que grep no omitió ni añadió ninguna ubicación de código. Las 5 ubicaciones de más que encontró grep eran frases de documentos que explican esta función: el `CLAUDE.md` de la raíz, los archivos de `.claude/commands/` `audit.md` y `write-post.md`, y, en `docs/research/snapshot-20260816/`, las copias que quedan de `CLAUDE.md` y `write-post.md`.

Serena devuelve cada referencia con [una línea antes y otra después](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/repl/api/lsp_api.py#L367-L369). Por eso grep se ejecutó de dos formas, `git grep -n`, que solo devuelve números de línea, y `git grep -n -C1`, que también devuelve una línea antes y otra después, y las tres salidas se contaron completas con `o200k_base`.

| Salida | Ubicaciones | tokens |
|---|---|---|
| `git grep -n` | 16 (código 11, documentos 5) | 703 |
| `git grep -n -C1` | 16 (código 11, documentos 5) | 1.575 (código 733, documentos 841) |
| Serena `find_referencing_symbols` | 10 | 892 |

Frente a un grep que devuelve una línea antes y otra después, Serena usa 683 tokens menos. La diferencia sale de no devolver las 5 ubicaciones en documentos. Pero Serena añade a cada referencia el nombre del símbolo y la información de ubicación en JSON, así que, mirando solo el lado del código, usa de hecho 159 tokens más. Y los 892 tokens de Serena superan los 703 de `git grep -n`, que solo devuelve números de línea. Lo que ahorra el nivel LSP en este repositorio no es el resultado de la búsqueda, sino el paso siguiente: leer líneas o archivos cercanos tras ver el resultado de grep.

En ese paso siguiente, si el agente leyera enteros los 9 archivos que encontró grep, leería 47.034 tokens: 3.716 de los 4 archivos de código y 43.318 de los 5 documentos. Eso es una cota superior. En una sesión real, `CLAUDE.md` probablemente ya esté en el context y no se vuelva a leer. Con un nombre común como `isLocale`, los resultados podrían diferir incluso en las ubicaciones de código.


## Conclusión

En resumen, los cuatro niveles se separan según lo profundamente que entienden el código, y reducen costos distintos. Context packing entrega el código como texto, e incluso con `--compress` conserva solo la sintaxis y reduce los tokens que entran. El repo map de tree-sitter sabe que un símbolo existe, pone un tope de presupuesto a los tokens que entran, y la conversación de ese momento decide con qué se llena. El grafo de conocimiento guarda las relaciones de antemano y reduce las tool calls y los tokens procesados, pero según la medición del propio proveedor, lo que queda en la ventana incluso aumentó. LSP sabe qué es un símbolo; en este repositorio no devolvió el mismo nombre en los documentos, pero a cambio añadió metadatos a cada resultado. Lo que ahorra no está en el resultado de la búsqueda, sino en la lectura que viene después.

Por eso, al elegir una herramienta, primero miro qué costo es el problema ahora, más que la profundidad del nivel. Si la ventana es pequeña y las sesiones largas, miro lo que queda; si los viajes de ida y vuelta son lentos, el número de tool calls; si en el repositorio los documentos y el código comparten nombres, cuántos archivos acabo leyendo tras un resultado de grep. Leo que Cursor quitara la búsqueda semántica por embeddings y pasara a un índice de texto local (Instant Grep) como una señal de que un índice caro no siempre supera la propia capacidad de búsqueda del modelo.

Si estas herramientas reducen el costo de que un agente encuentre código, cuántas reglas del proyecto que el agente debe conocer desde el principio escribir, y en qué archivo, es otro problema. Lo trato en [Archivos de contexto](/260529).


:::ref
- [repo] [ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)
- [repo] [ast-grep/ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)
:::
