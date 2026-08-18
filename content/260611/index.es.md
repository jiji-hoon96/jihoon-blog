---
emoji: 💸
title: 'Cómo ahorrar tokens de IA'
seoTitle: 'Cómo ahorrar tokens en Claude Code y Cursor'
date: '2026-06-11'
categories: IA Tokens
description: 'Mide costos de tokens con un React POC y redúcelos con prompt caching, subagent, MCP ligero, context engineering y Cursor Composer.'
keywords: 'ahorrar tokens de IA, costo de Claude Code, Cursor Composer, React POC, prompt caching, context engineering, subagent, MCP, model routing, context rot'
locale: es
translationOf: '260611'
sourceHash: e7ea965ce86523995dd6cce198d074d9895e6cd9655469a04591a7f5e2a7f1be
---

En este artículo quiero hablar de cómo ahorrar tokens de IA.

Al principio me centraba más en los resultados y el proceso que en el rendimiento y el costo. Como los resultados generados por la IA tenían bastantes fallos, había que verificarlos; y como necesitábamos obtenerlos rápido, muchas personas, incluido yo, comprábamos más tokens o pasábamos a una suscripción superior cuando se agotaban. Yo también lo hice. (De hecho, durante los primeros meses ni siquiera presté atención a cuánto estaba gastando en tokens.)

Sin embargo, con el tiempo empecé a ser cada vez más consciente del uso de tokens. Para las personas, la cuota mensual pesaba; para las empresas, crecían las dudas sobre los costos laborales y operativos. Como expliqué en [El panorama de herramientas de agentes de IA](/260529), mis otros artículos se han centrado menos en qué es la IA o cómo funciona y más en cómo aprovecharla bien, qué ayuda puede ofrecer, qué herramientas existen, qué está de moda y por qué surgieron esas tendencias. Sigo pensando que esos temas importan, pero con el tiempo el costo terminará siendo la pregunta que más interese.

En otro artículo, [Cómo funcionan los tokens](/260610), expliqué qué son exactamente, cómo los crea BPE y qué ocurre dentro de un transformador cuando prompt caching reduce el precio unitario. Sobre esa base, aquí veremos primero cómo se factura el costo y dónde nacen las ineficiencias, después ordenaremos patrones de ahorro comprobados y cerraremos con un pequeño POC que mide el uso de tokens al ejecutar la misma tarea con distintas estrategias.

---

## ¿De dónde surge el costo de los tokens?

Veamos de forma breve y directa cómo se generan los costos de tokens y cómo los proveedores los facturan.

Todo el texto que enviamos —prompt del sistema, definiciones de herramientas, historial de conversación y mensajes del usuario— se convierte en tokens de entrada, mientras que la respuesta del modelo se convierte en tokens de salida. Para el modelo, cada llamada es una entrada nueva que nunca ha visto. Da igual si la conversación fue ayer o si la llamada anterior ocurrió hace un minuto: en la nueva llamada se vuelve a enviar todo el contenido como entrada. (Este hecho tan simple es la clave del costo: el modelo no tiene memoria y nosotros se lo contamos todo otra vez.)

Aquí aparece otra variable. Volver a transmitir desde cero la parte estática de una llamada repetida es caro, por lo que los principales proveedores de LLM introdujeron prompt caching. La entrada estática se guarda una vez en caché y, en llamadas posteriores, los tokens leídos desde allí se cobran mucho más baratos. (En Cómo funcionan los tokens expliqué el mecanismo interno: cómo BPE crea tokens y cómo la caché reutiliza la KV cache del transformador para reducir el precio. Aquí nos centraremos en cómo ese mecanismo se traduce en costo.)

### Tokens de entrada, tokens de salida y tokens de caché

Veamos cuatro campos del objeto `usage` que devuelve el SDK de Anthropic.

![1.png](1.png)

- `input_tokens` la parte de la entrada enviada que excluye las lecturas de caché
- `output_tokens` la respuesta generada por el modelo
- `cache_creation_input_tokens` los tokens guardados por primera vez en caché en esta llamada
- `cache_read_input_tokens` los tokens releídos desde una caché existente

A cada campo se le aplica una tarifa distinta. Los tokens de salida son los más caros y los leídos desde caché, los más baratos. Según la documentación oficial de Anthropic, una lectura de caché cuesta 0,1 veces la tarifa base de entrada, exactamente un 10 %. La escritura cuesta 1,25 veces la tarifa base con un TTL (Time To Live, periodo de validez de la caché) de cinco minutos y 2 veces con un TTL de una hora. Es decir, se paga un poco más en la primera llamada y se ahorra un 90 % a partir de la segunda.

La caché también tiene varias restricciones poco conocidas. El mínimo de tokens almacenables varía según el modelo e incluso según la versión de una misma familia. De acuerdo con Anthropic, Sonnet 4.6 y Opus 4.8 exigen 1.024 tokens, Opus 4.7 exige 2.048, y Haiku 4.5 junto con los antiguos Opus 4.5/4.6 exigen 4.096. Un prompt más corto no se almacena aunque se añada `cache_control`, sin mostrar ningún aviso. Una solicitud admite como máximo cuatro puntos de corte `cache_control`, y la caché se lee jerárquicamente en el orden `tools` → `system` → `messages`. Por eso, cambiar una sola definición de herramienta al principio invalida toda la caché posterior.

![Prompt caching exige una coincidencia exacta desde el inicio; cambiar el prefijo invalida todo lo almacenado después](2.webp)

El descuento del 90 % nace de reutilizar entre llamadas la KV cache del transformador, mecanismo que expliqué en detalle en Cómo funcionan los tokens. Desde la perspectiva del costo, basta recordar algo: solo hay acierto de caché cuando el prefijo coincide exactamente. Por eso hay que poner **el contenido estático al principio y el contenido dinámico que cambia en cada llamada al final**. Incluso un solo carácter de una marca temporal al inicio del prompt invalida toda la caché que viene después.

Surge entonces una duda natural: «Pero la entrada cambia en cada turno de una conversación, ¿no debería romperse la caché casi siempre?». La respuesta corta es no. La entrada conversacional no se reescribe como un bloque nuevo en cada turno; sigue una **estructura append que conserva lo acumulado al principio y solo agrega la nueva intervención al final**. Una vez fijados el prompt del sistema, las herramientas y las preguntas y respuestas anteriores, permanecen intactos; solo se añade la pregunta más reciente. Si comparamos desde el inicio la entrada actual con la anterior, la primera diferencia siempre está en esa nueva pregunta final. La entrada completa cambia, pero casi todo el prefijo sigue igual y la caché sobrevive. (Solo se rompe en cada turno cuando un diseño defectuoso inserta valores dinámicos al principio. Herramientas como Claude Code y opencode mantienen fijo el inicio y anexan al final, por lo que el usuario no debe configurar nada. Los errores ortográficos tampoco afectan por la misma razón: aparecen al final, fuera del prefijo ya almacenado.)

### Comparación de proveedores de IA

Al reunir las tarifas oficiales de Anthropic, OpenAI y Google vigentes en junio de 2026, el patrón se ve de inmediato. (Precios en USD por millón de tokens, con los modelos más habituales en flujos de programación.)

| Proveedor | Modelo | entrada | entrada en caché | salida |
| --- | --- | --- | --- | --- |
| Anthropic | Claude Opus 4.8 | $5.00 | $0.50 | $25.00 |
| Anthropic | Claude Sonnet 4.6 | $3.00 | $0.30 | $15.00 |
| Anthropic | Claude Haiku 4.5 | $1.00 | $0.10 | $5.00 |
| OpenAI | GPT-5.5 | $5.00 | $0.50 | $30.00 |
| OpenAI | GPT-5.5 Pro | $30.00 | $3.00 | $180.00 |
| Google | Gemini 3.1 Pro | $2.00 | $0.20 | $12.00 |
| Google | Gemini 3.5 Flash | $1.50 | $0.15 | $9.00 |

En los tres proveedores, los tokens de salida cuestan entre cinco y seis veces más que los de entrada. Por tanto, una respuesta más larga eleva rápidamente el costo aunque diga lo mismo. Dentro de una misma gama, la diferencia de precio entre modelos también llega a ser de tres a seis veces. La aritmética señala tres principios centrales: **pedir respuestas más breves, usar un modelo más barato si produce la misma respuesta y almacenar en caché la entrada estática**. (Otro cálculo resulta revelador. Si reutilizamos 100 veces un contexto estático de 10.000 tokens, con la tarifa base de GPT-5.5 cuesta $5 y leído desde caché cuesta $0.50. La caché ahorra $4.5 en esas 100 reutilizaciones y, como la primera escritura casi no tiene recargo, empieza a compensar desde la segunda llamada.)

### Diferencias entre los mecanismos de caché

Aunque los descuentos sean similares, el diseño interno cambia según el proveedor. Entender esas diferencias facilita decidir una política.

| Elemento | Anthropic | OpenAI | Google Gemini |
| --- | --- | --- | --- |
| Activación | Puntos de corte `cache_control` explícitos | Automática (sin cambios de código) | Caché automática (implicit) y explícita (explicit) |
| Tamaño mínimo | 1.024–4.096 tokens (según modelo) | 1.024+ (incrementos de 128) | 2.048–4.096 (según modelo) |
| Costo de escritura | 1.25x (5 min) / 2x (1h) de la tarifa de entrada | Gratis | Gratis (con tarifa de almacenamiento por hora) |
| Costo de lectura | 0.1x de la tarifa de entrada | Cerca de 0.1x | 0.1x de la tarifa de entrada |
| TTL | [5 minutos o 1 hora (a elección del usuario)](https://github.com/anthropics/claude-code/issues/46829) | 5–10 minutos de inactividad por defecto, hasta 1 hora (24 horas al ampliar) | Definido por el usuario (almacenamiento por hora) |
| Costo adicional | Ninguno | Ninguno | Almacenamiento: Flash $1/M-hora, Pro $4.50/M-hora |

La filosofía de cada proveedor queda clara. **Anthropic** pide marcar explícitamente qué se almacena, cobra una pequeña prima en la primera llamada (1,25 veces) y después ofrece un gran descuento. Al poder controlar la posición del prefijo, la tasa de lecturas resulta predecible. **OpenAI** automatiza todo: desde 1.024 tokens la entrada se almacena sin costo adicional, pero el usuario tiene menos control. **Google** ofrece ambos sistemas y cobra almacenamiento separado cuando el usuario gestiona la caché de forma explícita. La caché implícita conviene para reutilizaciones breves y frecuentes; la explícita con almacenamiento, para contextos grandes que deben conservarse una hora o más.

### Definiciones de herramientas y tokenizadores

Hay otras dos variables con un impacto sorprendentemente grande.

La primera son las definiciones de herramientas. Cuando hay varios servidores MCP conectados, cada llamada incluye todos los nombres y esquemas de parámetros —más adelante mediremos cuánto infla esto el costo—. Incluso con las mismas herramientas, cambiar solo el modelo altera el gasto. La documentación de Anthropic muestra que la longitud del prompt de sistema para herramientas varía: con `tool_choice: auto`, Sonnet 4.6 y Haiku 4.5 usan unos 497 tokens, Opus 4.7 usa 675 y Opus 4.8 baja a 290. Antes del model routing conviene comprobar cuánto expande el modelo actual las definiciones, porque la diferencia puede ser considerable.

La segunda es la eficiencia del tokenizador, que divide el texto humano en unidades procesables por el modelo. Como vimos en Cómo funcionan los tokens, un mismo texto puede producir cantidades distintas según el tokenizador. o200k_base de OpenAI usa muchos menos tokens que cl100k_base con textos no ingleses, y Anthropic indica que, tras adoptar un nuevo tokenizador desde Opus 4.7, el mismo texto puede facturarse con hasta un 35 % más de tokens que en modelos anteriores. Elegir solo por tarifa puede hacer que el costo reaparezca por ineficiencia del tokenizador. Una comparación honesta multiplica precio unitario por cantidad esperada de tokens.

La diferencia destaca especialmente en coreano. Al tokenizar las mismas frases con dos tokenizadores de OpenAI, las oraciones técnicas en inglés dieron la misma cantidad, pero cl100k_base utilizó entre un 31 y un 43 % más tokens para el coreano que o200k_base. Un párrafo coreano de 167 caracteres llegó a convertirse en 169 tokens con el sistema antiguo: **más tokens que caracteres**. En promedio, cada carácter coreano consumió más de un token.

![Comparación de tokens en coreano e inglés por tokenizador: cl100k frente a o200k](3.png?w=720)

El tokenizador antiguo fragmenta el coreano de forma agresiva a nivel de bytes, mientras que el nuevo agrupa expresiones frecuentes como «개발» o «입니다» en un único token. Así, aun con la misma tarifa, una carga de trabajo centrada en coreano puede costar más de 1,5 veces solo por la eficiencia del tokenizador.

Llegados aquí surge otra pregunta: «¿Dónde estamos generando exactamente toda esta ineficiencia?».

## Patrones habituales que desperdician tokens

El desperdicio es sorprendentemente común incluso cuando creemos usar bien la IA. Los patrones que he observado en mi trabajo y entre otros desarrolladores se agrupan así.

### Demasiados servidores MCP y definiciones de herramientas

Ya lo mencioné, pero merece repetirse. Una vez conectados servidores MCP como Linear, GitHub, Notion, Figma, Slack o Sentry, rara vez se eliminan. Los esquemas sin usar inflan la entrada en cada llamada. Para resolverlo, Claude Code activa por defecto MCP Tool Search: al iniciar la sesión solo carga los nombres y descripciones de servidores, y el esquema completo aparece cuando el modelo llama realmente a la herramienta.

Medí el tamaño de la diferencia. Con 27 herramientas MCP de una sesión de Claude Code —10 de Serena, ocho de cuatro integraciones OAuth de claude.ai, dos de Figma y siete de agentmemory— envié **el mismo mensaje de usuario con dos configuraciones**. Una no tenía MCP; la otra tenía las 27 conectadas pero no disponibles para el modelo. En ambos casos hubo cero llamadas a herramientas.

![6.png](6.png)

Con la misma pregunta, el mismo modelo y una respuesta equivalente, la entrada pasó de **41 → 10,335 (+10,294)** tokens en Opus 4.7. El costo por llamada subió de **$0.0048 → $0.0563, unas 12 veces**, y el aumento de 250 veces en la entrada añadió **+783ms** de latencia por la carga de prefill. Más llamativo que el importe fue que era **un costo pagado en cada llamada aunque el usuario no usara ninguna herramienta MCP en ese turno**. Ese es el costo que evita Tool Search. (Desde esta medición, depuro continuamente los servidores MCP que no uso.)

### Acumulación de contexto y Lost in the Middle

![4.jpg](4.jpg)

Arrastrar una conversación larga no solo aumenta los tokens de entrada por llamada: también reduce la precisión. El artículo «Lost in the Middle» del equipo de Liu en Stanford cuantificó una curva en U: los modelos recuperan mejor la información clave al principio o al final y empeoran cuando queda enterrada en medio. Es la peor combinación: gastar más tokens para obtener una respuesta peor. Como el cálculo de self-attention crece con el cuadrado de los tokens, la atención disponible para cada uno se diluye al alargarse el contexto. El centro se debilita primero porque los datos de entrenamiento suelen concentrar la información importante en los extremos.

Si profundizamos, la forma en que el modelo trata la «posición» contiene dos tendencias que entierran el centro. Suenan técnicas, pero la intuición es sencilla.

Primero, el modelo **escucha más a los tokens cercanos**. RoPE (Rotary Position Embedding), la representación posicional usada por la mayoría de modelos abiertos actuales, conecta más débilmente dos tokens cuanto más separados están: un decay effect en el que la señal se desvanece con la distancia. Por eso los tokens lejanos reciben menos atención.

Segundo, el modelo **envía demasiada atención al primer token**. Debe repartir siempre el 100 % de su atención —softmax obliga a que los pesos sumen 1— y, cuando no hay nada especial que atender, tiene que desechar el sobrante en algún lugar, normalmente el primer token. Este fenómeno se llama attention sink. (El equipo de Xiao en el MIT lo cuantificó por primera vez en StreamingLLM. No ocurre porque el primer token sea importante, sino porque funciona como desagüe de atención sobrante.)

Juntas, ambas tendencias concentran la atención en los dos extremos —los tokens recientes cercanos y el primero—, mientras que la información del centro recibe el trato más débil. No es un fallo de un modelo concreto. LLaMA, Mistral y Qwen usan mecanismos de la familia RoPE, y se cree que Claude y GPT emplean enfoques similares. Lost in the middle es, por tanto, un sesgo común de la arquitectura moderna de transformadores.

![5.png](5.png)

Más recientemente, el fenómeno se denomina **context rot**. Un [análisis del equipo de Chroma](https://research.trychroma.com/context-rot) sometió a 18 modelos de frontera —GPT-4.1, Claude 4, Gemini 2.5 y Qwen3, entre otros— a la misma tarea NIAH (needle in a haystack). Cuando la entrada creció de 10k a más de 100k tokens, la precisión cayó entre un 20 y un 50 % según el modelo. Los 18 empeoraron y la familia Claude lo hizo más lentamente. Anthropic también lo explica como un problema de «presupuesto de atención» derivado de la atención n², que se consume entre los tokens. Mantener ligero el contexto reduce costos y protege la precisión.

### Llamar subagent sin criterio

Delegar todo porque los subagent son útiles es otra trampa. Un subagent comienza en un contexto separado, así que paga desde cero el costo fijo del prompt de sistema y las herramientas. Si se delega un comando breve de shell o una consulta simple de git, ese arranque puede superar cualquier ahorro en el contexto principal. Según el informe de Anthropic sobre su sistema multiagente, un agente usa unas cuatro veces más tokens que un chat normal y un sistema multiagente unas quince veces más. Delegar solo tiene sentido si la mejora de precisión justifica ese costo.

La misma trampa aparece al conectar herramientas MCP. Cada herramienta activa añade su esquema al prompt del sistema en cada turno y se factura aunque no se use. «Activarlo todo por si acaso» puede parecer más seguro, pero las mediciones dicen otra cosa.

Probé precisión y costo con el mismo lote de preguntas sobre el código del reconciler de facebook/react v19, dividido en tres configuraciones:

- Sin herramientas
- Una herramienta (CodeGraph, Serena, ripgrep o grep básico)
- Las cuatro herramientas conectadas a la vez

![Recall y uso de tokens por escenario de herramientas en el benchmark de codesearch](9.png?w=500)

Destacaron tres resultados. (Aquí recall indica cuán completas fueron las respuestas correctas.)

- **Sin herramientas** obtuvo un recall medio de solo 0,31, lo que confirma que las herramientas aportan valor.
- **Solo Serena (LSP)** logró 1,00 de recall por $0.38, la estrategia individual más eficiente.
- **Las cuatro herramientas conectadas** bajaron el recall a 0,89 y elevaron el costo a $0.47. En preguntas multi-hop, su puntuación coincidió con CodeGraph solo (0.78 / 0.88) hasta el segundo decimal: el modelo tendió a una herramienta y heredó sus debilidades.

Un principio sirve tanto para subagent como para las herramientas: el costo extra solo compensa cuando mejora la precisión. **Elegir la herramienta adecuada para el dominio es más barato y preciso que activarlas todas por si acaso.**

Entonces, ¿qué métodos comprobados permiten ahorrar tokens? ¿Existen estrategias que funcionen de verdad?

## Formas comprobadas de ahorrar tokens

Cada patrón ataca un eje distinto: algunos reducen la entrada, otros abaratan la misma entrada y otros asignan el mismo trabajo a un modelo más económico. Veámoslos uno a uno.

### Prompt caching

Es el efecto más inmediato. Como vimos, las lecturas de caché cuestan 0,1 veces la tarifa base de entrada. Tras pagar una pequeña prima de escritura de 1,25 veces en la primera llamada, la misma sección estática puede reutilizarse desde la segunda a una décima parte del precio.

Desde la perspectiva del ahorro, hay un punto clave: en cualquier sistema de caché, **las partes casi idénticas entre llamadas** —herramientas, fragmentos de código y contexto RAG— son precisamente las almacenables. El beneficio se mantiene si esos bloques no se mezclan con contenido dinámico, como la pregunta actual o el resultado recién llegado de una herramienta. Al llamar directamente a la API, agrupar lo estático al principio y lo dinámico después logra casi todo el ahorro. En Claude Code u opencode, la propia herramienta ordena esos bloques.

### Agrupar trabajo asíncrono con Batch API

Cuando una llamada no necesita terminar de inmediato, Batch API es la forma más sencilla de reducir la tarifa. Anthropic, OpenAI y Google descuentan un 50 % tanto en entrada como en salida a cambio de entregar el resultado en un máximo de 24 horas. En Anthropic, la mayoría de los lotes termina en menos de una hora, pero el SLA es de 24 horas. La llamada no cambia y el precio se reduce a la mitad, por lo que el costo de adopción es mínimo.

Ese 50 % resulta especialmente interesante porque se acumula multiplicativamente con otros ahorros. Anthropic dice de forma explícita que los descuentos de caché y lote se combinan. Para entrada estática: tarifa estándar × 0.5 (lote) × 0.1 (lectura de caché) = 0.05 veces, es decir, un 5 % del precio estándar. La clave es que se multiplican, no se suman.

Calculé la diferencia. Supongamos 100 trabajos con 10.000 tokens de contexto estático, 500 de entrada dinámica y 1.000 de salida. Con las tarifas de Opus 4.8, comparé cuatro estrategias.

![Ahorro de tokens con Batch API y Prompt caching: los descuentos se acumulan de forma multiplicativa](12.png?w=720)

Solo la caché reduce el costo un 57 %, solo el lote un 50 %, y ambos juntos hasta un 79 %. Se multiplican en la parte estática en lugar de sumarse. (La salida no se almacena y solo recibe el 50 % del lote; cuanto mayor sea su proporción, menor será el ahorro total respecto al 79 %. Cuanto más pese la entrada estática, mayor será el efecto.) Hay muchos trabajos donde nadie necesita esperar ante la pantalla: indexación nocturna, evaluación de artículos antes de publicar, extracción de datos e informes periódicos.

No todo puede aplazarse. Batch no encaja cuando el tiempo de respuesta aporta valor, como en la sesión principal de un agente de programación o un chat interactivo. Separar el trabajo en «resultado inmediato» y «resultado antes del siguiente día laboral» puede reducir la factura a la mitad.

### Aislar trabajo verbose con un subagent

![Estructura de aislamiento de contexto mediante subagent](7.webp?w=500)

[En palabras de la documentación oficial de Claude Code,](https://www.anthropic.com/engineering/multi-agent-research-system) un subagent «opera en su propia ventana de contexto aislada; las llamadas y resultados intermedios permanecen dentro del subagent y solo el mensaje final vuelve al padre». Delegar una tarea verbose deja así solo un resumen limpio en el contexto principal. Según el artículo de Anthropic sobre [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), aunque un subagent use decenas de miles de tokens explorando, suele devolver al padre un resumen comprimido de 1.000 a 2.000. El beneficio para el contexto principal es claro.

> Una tarea verbose produce una enorme cantidad de tokens para encontrar una respuesta de una línea. Ejecutar pruebas, buscar documentación y analizar registros son ejemplos típicos.

Hay que aclarar un malentendido: un subagent no reduce automáticamente el costo total. El informe de Anthropic dice que los agentes usan unas cuatro veces más tokens que un chat y los sistemas multiagente unas quince veces más. Un subagent protege la precisión y el costo de un contexto principal largo al extraer de él la salida verbose; no es magia que siempre reduzca el gasto. Por eso solo conviene delegar si el ahorro de limpieza del contexto supera el costo de arranque. Para tareas cortas, es más barato que el padre actúe directamente.

También importa el dominio. El informe de Anthropic afirma que, en su evaluación interna, un líder Opus 4 con subagent Sonnet 4 mejoró un 90,2 % frente a un único Opus 4. Pero la mejora no es uniforme. El mismo informe advierte que los dominios donde los agentes deben compartir contexto o tienen muchas dependencias no encajan bien, y señala la programación como caso exacto. La investigación permite explorar direcciones independientes en paralelo; el código vive en un grafo de dependencias. (Si usa una configuración multiagente para programar, conviene comprobar si el flujo realmente es exploración paralela. Un agente único con un subagent de exploración aislado puede ser una base más segura.)

### compact y progressive disclosure

El comando `/compact` de Claude Code comprime toda la conversación en un resumen y reinicia con un contexto nuevo. Según Anthropic, no es un simple recorte sino un resumen semántico: conserva el trabajo en curso y los cambios recientes, y elimina salidas repetitivas que probablemente no vuelvan a consultarse. A diferencia de `/clear`, que borra todo, `/compact` deja un resumen. Cuando la ventana llega cerca del 95 %, auto-compact hace lo mismo automáticamente. Ordenar una sesión larga corta la acumulación de entrada.

Mirando más adentro, `/compact` es solo la última etapa que el usuario puede activar; antes funciona una tubería automática de cuatro etapas. Según [el estudio externo «Dive into Claude Code»,](https://github.com/VILA-Lab/Dive-into-Claude-Code) `query.ts` revisa estas cinco etapas antes de cada llamada.

![8.png](8.png)

- **Budget Reduction** recorta las partes de cada salida de herramienta que superan el límite.
- **Snip** elimina el historial más antiguo en el eje temporal.
- **Microcompact** realiza una compresión fina sin perder conciencia de caché.
- **Context Collapse** reproyecta el historial muy largo en read-time para reducir su dimensión.
- **Auto-Compact** activa la compresión semántica al 95 % como último recurso.

Las etapas superiores son más ligeras y baratas; las inferiores, más pesadas pero eficaces. El diseño reconoce que una sola estrategia no resuelve toda presión de contexto. Invocar `/compact` equivale aproximadamente a adelantar la última etapa automática.

La misma idea aparece en la arquitectura Skills de Claude Code. Si `/compact` reduce el contexto ya acumulado, la carga en tres fases de `/skills` evita que se acumule desde el principio.

Según Anthropic, una skill se carga en tres fases. Al inicio solo entran su nombre y descripción breve —unos 100 tokens—. El cuerpo (`SKILL.md`, menos de 5.000 tokens) se carga cuando se activa. Si se ejecutan scripts o recursos mediante bash, solo vuelve la salida; el código no entra al contexto. Por eso instalar decenas de skills apenas aumenta el contexto inicial.

### Model routing: un modelo más barato para la misma respuesta

![13.png](13.png)

La entrada de Opus 4.8 cuesta cinco veces la de Haiku 4.5. Usar el modelo mayor para toda búsqueda simple, exploración o resumen breve desperdicia dinero. Encaminar según dificultad —Haiku → Sonnet → Opus— y reservar Opus para razonamiento pesado se está volviendo estándar. [La investigación RouteLLM de LMSYS](https://lmsys.org/blog/2024-07-01-routellm/) mostró un router que conservó el 95 % de la calidad de GPT-4 reduciendo al 14 % las llamadas al modelo fuerte, aunque el benchmark era de razonamiento general y no de programación.

El ecosistema también se ha asentado. Entre las pasarelas comerciales están OpenRouter, Martian y NotDiamond; en código abierto, RouteLLM de LMSYS y capas de observabilidad de costos como LiteLLM y Bifrost. En Anthropic, el argumento de selección de modelo del Agent SDK, el campo `model` del subagent de Claude Code —Explore usa Haiku por defecto— y el comando `/model` sirven para este routing. Hay una salvedad: al llamar directamente a una API, esta no evalúa la dificultad para elegir modelo. Las API de Anthropic, OpenAI y Google ejecutan exactamente el nombre indicado. El routing automático es una opción de producto, como Auto de Cursor, el modo auto de ChatGPT u `openrouter/auto`. Para ahorrar así hay que construirlo con una pasarela o clasificador.

Eso no significa que convenga añadir cualquier router automático. Auto Router de OpenRouter, que cambia el modelo en cada llamada, choca con prompt caching. La caché efímera de Anthropic solo acierta con el mismo modelo y prefijo. Si cambia la clave del modelo, falla la clave de caché: se pierde el descuento del 90 % y es habitual ahorrar con routing para devolverlo en fallos de caché. Por eso OpenRouter recomienda stickiness mediante `session_id`.

El patrón práctico es simple: no clasificar cada llamada, sino dividir estáticamente por tipo de tarea. El campo `model` de subagent sigue este patrón. Explore usa siempre una vía Haiku para explorar código; revisión usa una vía Opus. Dentro de cada vía se repiten modelo, prompt y herramientas, y cada modelo acumula su propia caché. Que «routing se vuelve estándar» significa cada vez más una bifurcación estática por tarea con «coordinador + ejecutor», no un clasificador por llamada. Así conviven routing y caché.

### Cursor Composer 2.5

![10.webp](10.webp)

Es una vía distinta de ahorro, pero también puede usarse un agente como Cursor. [Composer 2.5, modelo propio de Cursor publicado el 18 de mayo de 2026,](https://cursor.com/blog/composer-2-5) se basa en el checkpoint abierto Kimi K2.5 de Moonshot AI y fue ajustado para programación. Cursor afirma que en sus benchmarks alcanza un rendimiento comparable a Claude Opus 4.7 por cerca de una décima parte del precio. La tarifa publicada es $0.50 de entrada y $2.50 de salida, un orden de magnitud por debajo de $5.00 y $25.00 de Opus 4.8.

Como Cursor midió su propio modelo, es prudente no tomar las cifras absolutas como definitivas. Importa la tendencia: un modelo menor especializado en código puede rendir de forma comparable a uno de frontera general en la misma tarea y reducir el costo en un orden de magnitud. Es una de las tendencias de ahorro más claras de 2026.

Lo más interesante es que no solo baja la tarifa: **cuando el modelo se diseña junto con un IDE, también reduce la propia entrada**. Composer y Cascade están entrenados para consumir con eficiencia el contexto que envía el IDE —archivo actual, archivos vecinos y símbolos indexados—. Así se reduce la inflación causada cuando un modelo general pide más archivos y repite operaciones de grep y lectura. Baja un orden de magnitud la tarifa y también un poco la cantidad de tokens, por lo que el ahorro real puede superar la diferencia de precio.

### Sacar el contexto fuera del contexto

Una de las tendencias más interesantes de 2026 es cargar «solo lo necesario, cuando sea necesario». Anthropic lo llama **contexto just in time (JIT)**. En vez de incluir todos los recursos por adelantado, el agente conserva referencias ligeras como rutas o consultas y recupera el material mediante herramientas cuando lo necesita. Claude Code sigue este patrón al leer archivos bajo demanda con glob y grep en lugar de cargar toda la base de código.

memory tool y context editing, publicados por Anthropic con Sonnet 4.5, siguen la misma filosofía. La «memoria» de memory tool no es el historial de conversación que vive en la ventana y desaparece al cerrar la sesión, ni un archivo como `CLAUDE.md` escrito por una persona y cargado al inicio. memory tool es **una herramienta con la que el modelo escribe y lee archivos directamente**.

En detalle, las interfaces son sencillas. memory tool permite a Claude crear, leer, actualizar y borrar archivos en un directorio dedicado de la infraestructura del usuario. El modelo trata las notas como un sistema de archivos común. Alojarlo en la infraestructura del usuario es decisivo: ofrece memoria persistente fuera de la ventana entre sesiones y deja al usuario controlar almacenamiento y retención. La memoria de sesión es volátil dentro del contexto; esta permanece fuera. context editing actúa en dirección opuesta: al acercarse al límite, elimina resultados antiguos de herramientas que ya no se consultan, mantiene la conversación y permite ejecutar el agente más tiempo.

En la evaluación de Anthropic, ambas herramientas mejoraron el rendimiento un 39 % sobre la línea base y context editing por sí solo un 29 %. En una evaluación de búsqueda web de 100 turnos, el consumo cayó un 84 %. (Son benchmarks del proveedor, pero la dirección es clara: diseñar cómo vaciar el contexto importa cada vez más que llenarlo.) Esto coincide con la tubería de `/compact`: `/compact` reduce lo que está dentro; memory tool crea almacenamiento fuera. Se complementan.

## Conclusión

![14.webp](14.webp)

En conjunto, el ahorro se reduce a tres ejes: **enviar menos para el mismo trabajo, pagar menos por la misma entrada y asignar la misma respuesta a un modelo más barato**. Prompt caching, Batch API, aislamiento con subagent, `/compact`, memory tool y context editing, model routing y modelos especializados solo difieren en qué eje atacan. La dirección de 2026 puede resumirse así: el centro de gravedad pasa de llenar el contexto a vaciarlo y seleccionarlo, es decir, a context engineering. Como muestra context rot, un contexto ligero mejora el costo y la precisión.

No existe una única respuesta correcta. Cada equipo trabaja distinto, e incluso para una misma persona la estructura de costos cambia al escribir prosa o código. Pero algo es seguro: con un ecosistema tan rápido, asumir que «el patrón que funcionó ayer funcionará hoy» resulta cada vez más arriesgado. Seguir modelos, herramientas y tarifas nuevas, y adquirir el hábito de validarlos con un pequeño POC en el propio flujo, quizá sea la forma de ahorro más discreta y duradera. Recomiendo a cada lector revisar al menos una vez su propia contabilidad de tokens. (Para entender la raíz de estas estrategias, conviene leer también BPE y KV cache en Cómo funcionan los tokens.)

Queda una pregunta. Si ya sabemos vaciar y seleccionar el contexto, ¿qué sigue? Los trabajos publicados desplazan el foco un paso más allá, hacia el sistema de agentes completo: cómo operarlo (diseño del harness), cómo medir si funcionó bien (eval) y cómo confinarlo cuando falla (containment). Curiosamente, cuando la actitud de «mídelo con un POC» de este artículo escala al sistema, se convierte exactamente en eval. Exploraré esa dirección en [Más allá del contexto](/260622).

:::ref
- [docs] [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [docs] [Anthropic Batch Processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [docs] [Anthropic Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [docs] [Anthropic Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [docs] [Anthropic Claude Code MCP Tool Search](https://docs.claude.com/en/docs/claude-code/mcp)
- [docs] [Anthropic Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [docs] [OpenAI Prompt Caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [docs] [OpenAI API Pricing](https://openai.com/api/pricing/)
- [docs] [Google Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching)
- [docs] [Google Gemini API Pricing](https://ai.google.dev/pricing)
- [article] [Anthropic, Managing context on the Claude Developer Platform](https://www.anthropic.com/news/context-management)
- [paper] [LLMRouterBench (Findings of ACL 2026)](https://arxiv.org/abs/2601.07206)
- [paper] [VILA-Lab, Dive into Claude Code](https://arxiv.org/abs/2604.14228)
:::
