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
sourceHash: 9a33115d344f82b9a1e409d899e5e6da01038a2ca2503ea140cf69b7034b52c5
---

En esta entrada quiero hablar de **en qué se diferencian entre sí las herramientas que reducen el costo de que un agente de programación con IA encuentre el código relevante**.

Este artículo es para desarrolladores que han visto a un agente gastar tokens repitiendo grep y lecturas de archivos en una base de código grande, y que dudan qué herramienta añadir, como Repomix, CodeGraph o Serena. Al terminar, podrás distinguir cómo se separan estas herramientas según lo profundamente que entienden el código, y dónde reduce cada enfoque el costo de búsqueda. Esa profundidad se divide en cuatro niveles: context packing, que mete el código entero como texto; el repo map de tree-sitter, que sabe que un símbolo existe; el grafo de conocimiento, que guarda de antemano las relaciones entre símbolos; y LSP, que sabe qué es ese símbolo. Para los tres niveles que no son el grafo de conocimiento, incluyo lo que medí directamente con el `src/` del propio repositorio de este blog; para el grafo de conocimiento, el benchmark de su creador.

Desde que vi `codegraph` en GitHub Trending y lo instalé yo mismo, cada vez que encuentro una herramienta nueva me pregunto con qué principio ahorra tokens. Muchas de las herramientas de este artículo también las conocí por primera vez en GitHub Trending, que suelo revisar por semana, filtrando por TypeScript y Python.


## Herramientas de inteligencia de código

Antes de cambiar código, un agente primero busca dónde está el código relevante. Es un bucle: busca con grep, lee archivos, filtra y vuelve a hacer grep. En el benchmark de CodeGraph que veremos más adelante, el lado que respondía sin la herramienta usó hasta 43 tool calls para una sola pregunta. Las herramientas de inteligencia de código son intentos de reducir este costo de búsqueda.

Pero "costo" no designa una sola cosa. Los tokens que procesó el modelo, el número de tool calls y los tokens que siguen en la context window cuando termina el trabajo se mueven por separado. En cada nivel, este artículo mira cuál de los tres reduce.

Divido estos intentos en los cuatro niveles (tiers) de abajo. No es una clasificación establecida en la industria; es una agrupación mía, basada en lo profundamente que cada herramienta entiende el código. Todos los valores que medí yo mismo se obtuvieron el 2026-10-08 en el commit `36e5cfa` de este repositorio, y los tokens se contaron con `o200k_base` de tiktoken. Los valores difieren de los del tokenizador de Claude, así que sirven para comparar, no como cifras absolutas.


### Empaquetado de contexto

La solución más simple parte de la idea: "**meterlo todo en una sola context window**". No construye grafos ni hace indexación. Simplemente serializa todo el repositorio en un bloque de texto y se lo entrega entero al modelo.

La herramienta representativa es **Repomix**. Su formato de salida por defecto es XML, y su README enlaza la documentación de Anthropic sobre etiquetas XML. Tiene CLI, versión web, extensión de navegador y servidor MCP.

**GitIngest** es conocido por su uso sin fricción. En una URL de GitHub, basta con cambiar una sola palabra, `github.com` por `gitingest.com`, y todo el repositorio se convierte en una sola página de texto. (Por ejemplo: `github.com/facebook/react` → `gitingest.com/facebook/react`.) Como solo hay que cambiar una palabra en la barra de direcciones del navegador, no hace falta instalar nada. Está pensado para exploraciones rápidas y puntuales.

**code2prompt** (creado por Mufeed VH) es una CLI basada en Rust cuya fortaleza es la personalización mediante un sistema de plantillas.

**rtk** (`rtk-ai/rtk`) va en una dirección algo distinta. Mientras las herramientas anteriores empaquetan todo el repositorio de una vez, rtk comprime la salida de los comandos de CLI que ejecuta el agente. Es un único binario hecho en Rust que se registra en los hooks de varios agentes, como Claude Code, Cursor, Copilot, Gemini CLI y Codex, de modo que cuando el agente llama a `git status`, ejecuta `rtk git status` en su lugar. Aplica filtering, grouping, truncation y deduplication a más de 100 comandos. Este hook solo actúa sobre las tool calls de Bash. `Read`, `Grep` y `Glob` de Claude Code pasan de largo.

La magnitud de la reducción hay que leerla con cuidado. El [README de rtk](https://github.com/rtk-ai/rtk/blob/8533612180c60efbcb5827c7db4e910aba096705/README.md#L66-L70) dice que reduce la salida de Bash hasta en un 90%, y añade enseguida que eso no significa reducir la factura un 90%. Desde el lado del modelo, la salida de un comando es parte de los tokens de entrada, y los tokens de entrada son parte de la factura, así que la reducción se diluye en cada paso. La cifra que destaca el [sitio oficial](https://www.rtk-ai.app/) es un 56% de media, en los comandos que rtk reescribe. Si las herramientas anteriores reducen el texto que entra, rtk reduce el texto que vuelve como resultado de las tool calls.

El límite de este nivel es que **los repositorios grandes chocan con el tope de tokens**. Empaquetar solo los 109 archivos del `src/` de este blog ya da 94.596 tokens. Repomix responde a esto con `--compress`. Según el [README](https://github.com/yamadashy/repomix/blob/8d6429121e98ed178e4d3a975c2bdbbecc958c4a/README.md#L797-L831), usa Tree-sitter para conservar las firmas de funciones y clases y descartar los cuerpos de implementación.

```bash
# repomix 1.18.1, 이 리포 커밋 36e5cfa, 2026-10-08
npx -y repomix@1.18.1 src -o out.xml              # Total Tokens: 94,596 tokens
npx -y repomix@1.18.1 src --compress -o out.xml   # Total Tokens: 30,320 tokens
```

Se redujo un 68%. Los comentarios se quedan, así que `visit-counter.ts`, con JSDoc largo, solo pasó de 1.642 a unos 1.220 tokens, un 26%. Lo que conserva la versión comprimida es la sintaxis de cada archivo, sin relaciones como quién llama a quién. Por eso la frontera entre este nivel y el siguiente está menos en si la herramienta ve la sintaxis que en si se le pueden preguntar relaciones.


### Mapa del repositorio con tree-sitter

El siguiente nivel usa **tree-sitter** para analizar la estructura del código, pero sin levantar un servidor de índices aparte.

Un **AST (Abstract Syntax Tree, árbol de sintaxis abstracta)** es una estructura de datos que representa la estructura del código fuente como un árbol. Es el resultado de la fase de análisis sintáctico de un compilador: descarta detalles superficiales como paréntesis y puntos y comas, y deja como nodos solo elementos como variables, operadores y llamadas a funciones. Pero lo que construye tree-sitter, la herramienta en la que se apoya este nivel, es un **CST (Concrete Syntax Tree)**. La [documentación oficial de tree-sitter](https://tree-sitter.github.io/tree-sitter/) también dice que construye un concrete syntax tree. Es un árbol que conserva como nodos incluso los paréntesis y la puntuación, y es el árbol con el que trabajan las herramientas de abajo.

**tree-sitter** es un generador de parsers de código abierto y una biblioteca de parsing incremental (incremental). La [code navigation de GitHub](https://docs.github.com/en/repositories/working-with-files/using-files/navigating-code-on-github) usa tree-sitter. Como solo vuelve a parsear la parte editada, cambiar una línea en el editor no vuelve a parsear todo el archivo; solo corrige la parte del árbol que cambió. Esa ventaja es de los editores, donde las ediciones no paran. Aider, más abajo, mantiene una caché basada en la hora de modificación de los archivos para no volver a parsear los que no cambiaron.

**Aider**, una herramienta de programación en pareja con IA que se usa en la terminal, es el ejemplo representativo de este enfoque. Usa tree-sitter para extraer de cada archivo las definiciones y referencias de funciones, clases y métodos, y construye un grafo con los archivos como nodos. Cuando el archivo A referencia un identificador definido en el archivo B, se crea una arista de A a B. Sobre este grafo ejecuta personalized PageRank (una variante que puntúa la importancia de un nodo según el número y el peso de sus enlaces, inclinando la puntuación hacia los nodos elegidos) y mete en el presupuesto de tokens las definiciones y firmas de los archivos mejor clasificados.

Qué entra en el presupuesto cambia con la conversación actual. En [`repomap.py`](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/repomap.py#L487-L525) de Aider, el peso de una arista es la raíz cuadrada del número de referencias multiplicada por un factor. Los identificadores mencionados en la conversación reciben x10, los identificadores en camelCase o snake_case de 8 o más caracteres también x10, los que empiezan por `_` reciben x0,1, y las aristas que salen de los archivos añadidos ahora al chat reciben x50. Los archivos del chat y los archivos mencionados en la conversación también reciben puntuación de personalization en PageRank.

El presupuesto tampoco es fijo. La [documentación de Aider](https://aider.chat/docs/repomap.html) da 1k como valor por defecto de `--map-tokens`, pero el [código](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/models.py#L782-L789) recorta un octavo del límite de entrada del modelo a un valor entre 1.024 y 4.096. Y cuando no hay archivos en el chat, lo amplía hasta `--map-multiplier-no-files` (por defecto 2) veces. Lo comprobé con el `src/` de este repositorio. La versión 0.86.1 que ejecuté y el commit enlazado arriba tienen el mismo código de ranking.

```bash
# aider-chat 0.86.1, 리포 루트에서 시작한다, 2026-10-08
mkdir /tmp/aidermap && cp -R src /tmp/aidermap/ && cd /tmp/aidermap && git init -q && git add -A && git commit -qm init
# 키는 더미 값이다. --show-repo-map 은 map 만 출력하고 LLM 을 부르지 않는다
export OPENAI_API_KEY=dummy
AIDER="uvx --python 3.12 --from aider-chat==0.86.1 aider --no-check-update --analytics-disable --no-gitignore --model gpt-4o"
$AIDER --show-repo-map                                              # Repo-map: using 4096 tokens
$AIDER --map-tokens 1024 --show-repo-map                            # Repo-map: using 1024 tokens
$AIDER --map-tokens 1024 --show-repo-map src/lib/filter-posts.ts    # 이 파일을 채팅에 올린 상태
```

| Condición | Presupuesto elegido por Aider | Map impreso | Archivos incluidos |
|---|---|---|---|
| Valores por defecto, sin archivos en el chat | 4.096 | 7.370 tokens | 61 |
| `--map-tokens 1024`, sin archivos en el chat | 1.024 | 2.019 tokens | 27 |
| `--map-tokens 1024`, `filter-posts.ts` añadido al chat | 1.024 | 983 tokens | 12 |

El límite de entrada de gpt-4o es de 128k, así que un octavo se recortó a 4.096, y con el chat vacío el map salió dentro del doble de eso. Al añadir un archivo al chat, el map se encogió hasta caber en el presupuesto; de los 27 archivos anteriores solo quedaron 10, y entraron como nuevos `PostList.tsx` y `SearchModal.tsx`. Un repo map no es un resumen fijo del repositorio, sino un extracto ajustado a la conversación de ese momento.

**AFT** (`cortexkit/aft`) lee y edita a nivel de símbolo. Las ediciones basadas en números de línea se rompen en cuanto se mueve el código por encima del objetivo, pero las ediciones en modo símbolo de AFT direccionan las funciones por nombre, así que no les afecta.

Hay una herramienta más que vale la pena mencionar en este nivel: **ast-grep** (`ast-grep/ast-grep`). Es una CLI de búsqueda estructural y rewrite basada en tree-sitter, y hace coincidir nodos del árbol sintáctico en lugar de texto. Por ejemplo, el patrón `console.log($A)` atrapa todas las llamadas a `console.log` con un solo argumento, sin importar cómo sean los saltos de línea o los espacios. Lo que atrapa es la misma estructura sintáctica. No sabe el tipo de `$A` ni de dónde viene el nombre `console`. También existe un servidor `ast-grep-mcp`, con el que se puede hacer que un agente use búsqueda estructural en lugar de grep de texto.


### Knowledge Graph

El tercer nivel va un paso más allá. **Parsea de antemano toda la base de código, construye un grafo de conocimiento y lo guarda en disco**; luego el agente lanza consultas a ese grafo guardado. El ejemplo del que más se habla es una herramienta llamada **CodeGraph**.

La estructura que describe el [README de CodeGraph](https://github.com/colbymchenry/codegraph/blob/b635dd467f0578926a9c01a37b9d28d2b26689f1/README.md) es sencilla. Parsea el código con tree-sitter para extraer símbolos, aristas e información de archivos, y los guarda en una base de datos SQLite local. La búsqueda por nombre pasa por el índice FTS5 de SQLite. El agente consulta este grafo a través de MCP. Y **esta extracción ocurre de forma determinista a partir del parsing del árbol sintáctico, no de resúmenes de un LLM.**

**FTS5 (SQLite Full-Text Search 5)**, que aparece aquí, es una extensión de búsqueda de texto completo que SQLite ofrece en forma de tabla virtual. Según la [documentación de SQLite](https://www.sqlite.org/fts5.html), está incluida en la amalgamation desde la 3.9.0 (2015-10-14); se crea una tabla con `CREATE VIRTUAL TABLE ... USING fts5(...)` y se consulta con el operador `MATCH`. Permite tener un índice de texto completo en un solo archivo SQLite sin levantar un motor de búsqueda aparte como Elasticsearch.

La palabra **determinista (deterministic)** que acabo de usar significa que el mismo código siempre produce el mismo resultado. Si un LLM resume el código para construir el grafo, los resultados pueden variar incluso con el mismo código, y pueden colarse alucinaciones. En cambio, si se parsea directamente el árbol sintáctico, las relaciones entre símbolos se extraen solo según las reglas de la gramática del lenguaje, sin margen para ese tipo de interpretación.

Pero ser determinista no es lo mismo que ser completo. El mismo README registra el reconocimiento de rutas de los frameworks que dependen de convenciones y reflexión en un 83,3% para Spring y un 83,9% para ASP.NET, y lo llama el límite del análisis estático (honest static-analysis ceiling). El mismo código da el mismo resultado, pero a ese resultado le pueden faltar aristas.

El benchmark lo midió CodeGraph mismo. La nueva medición del 2026-08-05 en el mismo README ejecutó Claude Opus 4.8 en modo headless y planteó una pregunta de arquitectura a cada uno de 7 repositorios de código abierto. El lado con CodeGraph MCP activado redujo el costo medio un 44%, los tokens procesados un 62% y las tool calls un 88%. Esta nueva medición impidió en ambos lados llamar a la CLI `codegraph` desde Bash. En un harness sin ese bloqueo, el lado sin la herramienta encontró y usó la CLI en 26 de 28 ejecuciones, y el README aclara que las cifras publicadas antes se obtuvieron sin este bloqueo. Las cifras de Opus 4.7 que este artículo recogió al principio (35% más barato, 71% menos tool calls) son esas cifras anteriores.

El tamaño del ahorro no siguió al tamaño del repositorio. En las preguntas en las que el lado sin la herramienta usó de 28 a 43 tool calls, el costo bajó entre un 57 y un 78%, y en Gin, que terminó en 7, quedó casi igual. VS Code, con unos 11k archivos, dio un 71%, y Excalidraw, con unos 640, un 78%. Cuanto más búsqueda necesitaba una pregunta, mayor fue la ganancia.

El README también registra una cifra en sentido contrario. Los tokens procesados bajan, pero al final de una sesión de varios turnos, los resultados de retrieval que siguen en la context window son alrededor de un 80% mayores del lado de CodeGraph. En VS Code son 67k frente a 18k tokens. Devuelve el texto fuente denso de una vez, y ese texto se queda en la ventana. Este nivel reduce las tool calls y los tokens procesados a cambio de dejar más en la ventana.

En la academia hay investigación en la misma dirección. [GraphCoder](https://arxiv.org/abs/2406.07003) (ASE 2024) construyó un Code Context Graph que combina control flow con data/control dependence, y [CodexGraph](https://aclanthology.org/2025.naacl-long.7/) (NAACL 2025) hizo que agentes LLM escribieran y ejecutaran ellos mismos consultas a una base de datos de grafos. [Prometheus](https://arxiv.org/abs/2507.19942), un preprint que no ha pasado revisión por pares, añadió working memory a un grafo de conocimiento basado en tree-sitter y lo aplicó a la resolución de issues en varios lenguajes.

**Cursor** tomó otro camino y luego cambió de rumbo. La indexación que describía la [entrada del blog de Cursor de enero de 2026](https://cursor.com/blog/secure-codebase-indexing) no era un grafo sintáctico sino **búsqueda semántica basada en embeddings vectoriales**. Dividía los archivos en chunks localmente, se sincronizaba con el servidor mediante hashes de Merkle tree y guardaba los embeddings en una base de datos vectorial llamada Turbopuffer. En julio de 2026, un Community Support Engineer de Cursor respondió en el [foro](https://forum.cursor.com/t/what-do-you-think-about-cursor-removing-the-codebase-indexing-settings/165899): "Semantic/embeddings indexing is being turned down in favor of grep-based retrieval". En el mismo hilo, otro miembro del equipo escribió que, a medida que los modelos aprendieron a usar bien grep, la antigua ruta de búsqueda semántica dejó de ayudar de forma significativa. Hoy la [documentación de Cursor](https://cursor.com/docs/context/codebase-indexing) dice que Instant Grep construye y consulta su índice en tu máquina y no guarda embeddings de tu base de código.


### LSP

El último nivel **depende directamente de un servidor de lenguaje**. Si tree-sitter sabe "que un símbolo existe", LSP sabe "qué es ese símbolo".

**[LSP (Language Server Protocol)](https://microsoft.github.io/language-server-protocol/)** es un protocolo abierto basado en JSON-RPC que estandariza la comunicación entre editores y herramientas de análisis de lenguaje (autocompletado, ir a la definición, buscar referencias, refactorización, etc.). En 2016, [Microsoft, Red Hat y Codenvy anunciaron su colaboración](https://www.redhat.com/en/about/press-releases/red-hat-codenvy-and-microsoft-collaborate-language-server-protocol). La idea central es "no reimplementar un analizador de lenguaje para cada editor; tener un servidor por lenguaje y que todos los editores le pregunten". rust-analyzer y pyright de Python son servidores LSP, mientras que TypeScript usa typescript-language-server, que envuelve en LSP a `tsserver`, que habla su propio protocolo.

**Serena** (`oraios/serena`) es un servidor MCP de este nivel. A 2026-10-08 tiene 30.093 stars, y el repositorio se creó en marzo de 2025. La idea central de Serena cabe en una línea: **mostrarle al agente símbolos, no texto.** Sus herramientas principales incluyen `find_symbol`, `find_referencing_symbols` y `get_symbols_overview`. Se puede elegir uno de dos backends. El predeterminado es un servidor de lenguaje que implementa LSP (gratuito/de código abierto); la otra opción es un plugin de pago que usa el análisis de código del IDE de JetBrains (con prueba gratuita).

Medir en este repositorio muestra de dónde sale la diferencia. Busqué los usos de `isHiddenPost` (`src/lib/filter-posts.ts:12`), que filtra las entradas privadas, de dos formas. El lado de texto es grep.

```bash
# 커밋 36e5cfa, 2026-10-08. 이 글도 같은 이름을 담고 있어 content/ 는 뺐다
git grep -n isHiddenPost -- ':!content'   # 16줄, 파일 9개
```

En el lado LSP, typescript-language-server responde a `textDocument/references` con la API `findReferences` de TypeScript, y llamé a esa API directamente. No medí ejecutando Serena. La búsqueda de referencias de LSP pregunta por posición (archivo, línea y columna), no por nombre. Por eso [`find_referencing_symbols`](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/tools/symbol_tools.py#L169-L172) de Serena recibe a la vez `name_path` y `relative_path`. En este ejemplo sería `find_referencing_symbols(name_path="isHiddenPost", relative_path="src/lib/filter-posts.ts")`.

```js
// 리포 루트에서 실행한다: node - < refs.cjs
const path = require('path')
const ts = require('typescript')
const cfg = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic() {} })
const service = ts.createLanguageService({
  getScriptFileNames: () => cfg.fileNames,
  getScriptVersion: () => '0',
  getScriptSnapshot: f => ts.sys.fileExists(f) ? ts.ScriptSnapshot.fromString(ts.sys.readFile(f)) : undefined,
  getCurrentDirectory: () => process.cwd(),
  getCompilationSettings: () => cfg.options,
  getDefaultLibFileName: o => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
})
const file = 'src/lib/filter-posts.ts'
// 이름이 아니라 정의가 있는 위치(파일과 오프셋)로 묻는다
const pos = ts.sys.readFile(file).indexOf('isHiddenPost')
for (const group of service.findReferences(file, pos) ?? []) {
  for (const ref of group.references) {
    const { line } = service.getProgram().getSourceFile(ref.fileName).getLineAndCharacterOfPosition(ref.textSpan.start)
    console.log(`${path.relative(process.cwd(), ref.fileName)}:${line + 1}${ref.isDefinition ? ' (정의)' : ''}`)
  }
}
```

```text
$ node - < refs.cjs   # typescript 5.9.3, Node 24.16.0
src/lib/filter-posts.ts:12 (정의)
src/lib/filter-posts.ts:24
src/lib/post-navigation.ts:2
src/lib/post-navigation.ts:6
src/app/[lang]/[slug]/opengraph-image.tsx:7
src/app/[lang]/[slug]/opengraph-image.tsx:38
src/app/[lang]/[slug]/page.tsx:5
src/app/[lang]/[slug]/page.tsx:47
src/app/[lang]/[slug]/page.tsx:67
src/app/[lang]/[slug]/page.tsx:74
src/app/[lang]/[slug]/page.tsx:90
```

Ambos lados encontraron las mismas 11 ubicaciones de código. Este nombre es único en el repositorio, así que grep no omitió ni añadió ninguna ubicación de código. La diferencia salió de las otras 5. grep también devolvió 5 líneas de texto explicativo de `CLAUDE.md`, los documentos de comandos y sus instantáneas.

Serena devuelve cada referencia con [una línea antes y otra después](https://github.com/oraios/serena/blob/3b99f8b024dafd58c962ea6e74f37c8a730ef532/src/serena/repl/api/lsp_api.py#L367-L369). Así que apliqué el mismo criterio a ambos lados y conté los tokens de cada ubicación con su `file:line` más una línea antes y otra después.

```python
# 리포 루트에서 실행한다: python3 count.py (tiktoken 0.13.0)
import subprocess, tiktoken
enc = tiktoken.get_encoding("o200k_base")
def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout.splitlines()
def tokens(locs):  # 위치마다 file:line 과 앞뒤 1줄을 붙여 센다
    total = 0
    for f, n in locs:
        lines = open(f).read().splitlines()
        total += len(enc.encode(f"{f}:{n}\n" + "\n".join(lines[max(0, n - 2):n + 1])))
    return total
grep = [(l.split(":")[0], int(l.split(":")[1])) for l in run("git grep -n isHiddenPost -- ':!content'")]
refs = [(l.rsplit(":", 1)[0], int(l.rsplit(":", 1)[1])) for l in run("node - < refs.cjs") if "(정의)" not in l]
code = [x for x in grep if x[0].startswith("src/")]
print(f"grep {len(grep)}곳 {tokens(grep)} (코드 {len(code)}곳 {tokens(code)}) | 참조 {len(refs)}곳 {tokens(refs)}")
```

```text
$ python3 count.py
grep 16곳 1172 (코드 11곳 453) | 참조 10곳 423
```

| Método | Ubicaciones | tokens |
|---|---|---|
| grep | 16 (código 11, docs 5) | 1.172 (código 453, docs 719) |
| findReferences (sin la definición) | 10 | 423 |

De la diferencia de 749 tokens, 719 vienen de las 5 ubicaciones en documentos. Lo que LSP ahorró en este repositorio no fue el costo de encontrar ubicaciones de código, sino el de leer coincidencias de ruido. Si el agente leyera enteros los 9 archivos que encontró grep, el lado de grep crecería hasta 47.737 tokens, 43.318 de ellos de los 5 documentos. Eso es una cota superior. En una sesión real, `CLAUDE.md` probablemente ya esté en el context y no se vuelva a leer. Con un nombre común como `isLocale`, los resultados podrían diferir incluso en las ubicaciones de código, pero esta vez no lo medí.

Aider no usa LSP, así que su conocimiento llega hasta el nivel de funciones y clases. [OpenCode](https://opencode.ai/docs/lsp/) conecta servidores LSP y, por defecto, devuelve los diagnósticos al agente. Su herramienta `lsp`, que pregunta por definiciones, referencias, hover y call hierarchy, solo se activa con [`OPENCODE_EXPERIMENTAL_LSP_TOOL=true`](https://opencode.ai/docs/tools/). En cualquier caso, queda la condición de que cada lenguaje necesita un buen servidor LSP.


## Conclusión

En resumen, los cuatro niveles se separan según lo profundamente que entienden el código, y reducen costos distintos. Context packing entrega el código como texto, e incluso con `--compress` conserva solo la sintaxis y reduce los tokens que entran. El repo map de tree-sitter sabe que un símbolo existe pone un tope de presupuesto a los tokens que entran, y la conversación de ese momento decide con qué se llena. El grafo de conocimiento guarda las relaciones de antemano y reduce las tool calls y los tokens procesados, pero según la medición del propio proveedor, lo que queda en la ventana incluso aumentó. LSP sabe qué es un símbolo, y en este repositorio la mayor parte de su ahorro vino de filtrar las coincidencias de ruido que grep arrastra consigo, lo que redujo los tokens a procesar.

Por eso, al elegir una herramienta, primero miro qué costo es el problema ahora, más que la profundidad del nivel. Si la ventana es pequeña y las sesiones largas, miro lo que queda; si los viajes de ida y vuelta son lentos, el número de tool calls; si en el repositorio los documentos y el código comparten nombres, las coincidencias de ruido. Leo que Cursor quitara la búsqueda semántica y volviera a grep como una señal de que el nivel más profundo no siempre es mejor.

Si estas herramientas reducen el costo de que un agente encuentre código, cuántas reglas del proyecto que el agente debe conocer desde el principio escribir, y en qué archivo, es otro problema. Lo trato en [Archivos de contexto](/260529).


## Referencias

:::ref
- [repo] [cortexkit/aft](https://github.com/cortexkit/aft)
- [repo] [ast-grep/ast-grep](https://github.com/ast-grep/ast-grep)
- [repo] [ast-grep/ast-grep-mcp](https://github.com/ast-grep/ast-grep-mcp)
:::
