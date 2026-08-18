---
emoji: 🔬
title: 'Cómo funcionan los tokens'
seoTitle: 'Tokens LLM: BPE, embeddings, prefill, decode y KV cache'
date: '2026-06-10'
categories: IA Tokens
description: 'Cómo BPE crea tokens, los embeddings alimentan los LLM, prefill y decode determinan el coste, y KV cache y prompt caching reducen entradas repetidas.'
keywords: 'cómo funcionan los tokens LLM, BPE, Byte Pair Encoding, tokenizer, token embedding, prefill decode, KV cache, prompt caching, context window, self-attention, coste tokens de entrada y salida, qué es un token de IA'
locale: es
translationOf: '260610'
sourceHash: 'a40bef05afd5f7b4cc1894abc929ced40531509eb954c8e78284fc47b3e4b592'
---

En este artículo quiero explicar qué son en realidad los tokens de IA y cómo funcionan.

Hasta ahora he escrito sobre todo acerca de cómo aprovechar bien las herramientas de IA, cuáles están de moda y por qué. Sin embargo, mientras preparaba el artículo sobre [cómo ahorrar tokens](/260611), volví a reparar en algo: para hablar de reducir costes, primero hay que entender «qué es un token y cómo se factura», pero nunca había explicado con rigor esa base. (Al escribir la guía de ahorro, la parte dedicada al funcionamiento de los tokens creció lo suficiente como para merecer un artículo propio.)

Este texto ofrece, por tanto, los fundamentos antes de entrar en las técnicas de ahorro. Veremos qué es exactamente un token si no es una palabra ni un carácter (BPE), en qué forma entra en el modelo (embedding), por qué la salida cuesta más que la entrada (prefill/decode), de qué parte del Transformer —la arquitectura de la red neuronal— nace el ahorro de prompt caching (KV cache) y por qué un contexto más largo resulta más caro (el coste cuadrático de la atención). Si buscas medidas prácticas, después puedes continuar con [Cómo ahorrar tokens](/260611).

---

## Un token no es una palabra ni un carácter

Empecemos por el hecho más básico: **un token no es una palabra ni un carácter.** Es una unidad de un vocabulario que el modelo construye comprimiendo secuencias de caracteres frecuentes en los datos de entrenamiento.

Nuestra intuición al preguntar «¿cuántas palabras tiene esta frase?» no coincide con la forma en que un modelo divide el texto. El modelo agrupa como una sola unidad combinaciones de caracteres que suelen aparecer juntas y segmenta el texto entrante según ese vocabulario. Por eso una palabra puede corresponder a un único token o dividirse en varios.

El algoritmo que construye ese vocabulario es BPE, una base común a casi todos los LLM modernos.

### El algoritmo BPE

BPE (Byte Pair Encoding o codificación por pares de bytes) amplía un vocabulario fusionando repetidamente el par de símbolos adyacentes que aparece con mayor frecuencia en un símbolo nuevo.

Lo curioso es que no nació para el procesamiento del lenguaje natural. Philip Gage propuso BPE por primera vez en 1994 como técnica de compresión de datos. El método sustituía el par de bytes más frecuente por un byte que no apareciera en los datos y almacenaba aparte, en una tabla, las reglas de sustitución.

El equipo de Sennrich, de la Universidad de Edimburgo, trasladó la idea al problema del vocabulario en la traducción neuronal. En «Neural Machine Translation of Rare Words with Subword Units», publicado en 2015 y presentado en ACL 2016, resolvieron con BPE la incapacidad de un vocabulario fijo para manejar palabras raras o desconocidas. La idea consiste en representar las palabras como combinaciones de fragmentos subword más pequeños en vez de memorizarlas enteras; así, incluso una palabra ausente del vocabulario puede codificarse con piezas conocidas.

El proceso es sorprendentemente sencillo.

1. Al principio, cada carácter individual es un token.
2. Se busca en el corpus el par de tokens adyacentes más frecuente.
3. Se fusiona ese par en un token nuevo y se sustituyen por él todas sus apariciones en el corpus.
4. Se repiten los pasos 2 y 3 hasta alcanzar el tamaño de vocabulario objetivo.

Así, aunque al principio cada carácter es un token, combinaciones frecuentes como «th», «the» o «tion» acaban fusionándose en tokens únicos. Cuanto más habitual es un patrón, más probable es que forme un bloque mayor.

![Cómo un tokenizer BPE amplía su vocabulario fusionando repetidamente pares de caracteres adyacentes frecuentes](2.webp?w=500)

La familia GPT lleva la idea un paso más allá con **BPE a nivel de bytes**. Primero convierte el texto en un flujo de bytes UTF-8 y después aplica BPE. De este modo, el vocabulario base puede empezar con solo 256 entradas —una por cada byte posible— y aun así codificar cualquier texto representable en UTF-8 sin tokens desconocidos. Ya sean emojis, caracteres chinos o símbolos especiales, siempre existe al menos una representación a nivel de byte.

### El mismo texto, distinto número de tokens

Debido a esta estructura, un mismo texto puede producir cantidades de tokens muy distintas según el tokenizer, la herramienta que divide el texto escrito por personas en unidades que el modelo puede procesar. Según cómo se haya entrenado el vocabulario, una misma frase puede descomponerse en piezas más pequeñas o en bloques mayores.

![Comparación del número de tokens del mismo texto según el tokenizer; o200k_base usa menos tokens que cl100k_base en textos no ingleses](3.png)

Los datos que OpenAI publicó junto con GPT-4o muestran bien la diferencia. El nuevo tokenizer o200k_base de la familia GPT-4o representa el mismo texto con menos tokens que cl100k_base, empleado por GPT-4. En inglés es alrededor de 1,1 veces más eficiente, pero la brecha crece en otros idiomas. En los ejemplos breves publicados, el número de tokens bajó unas 1,4 veces en chino y japonés, 1,7 veces en coreano y hasta 2,9 veces en hindi. (Desde la perspectiva de quien usa coreano, resulta llamativo que el salto generacional del tokenizer se perciba mucho más que en inglés.)

En una perspectiva más amplia también hay diferencias entre idiomas. En el análisis de Yennie Jun con cl100k_base, una frase con el mismo significado casi siempre usa menos tokens en inglés, mientras que los idiomas con sistemas de escritura propios suelen necesitar más. El hindi y el bengalí pueden usar cinco veces más tokens que el inglés, y el birmano más de diez veces. El coreano y el chino también se tokenizan en más piezas que el inglés, aunque sin llegar a esos extremos.

De aquí se desprende una consecuencia práctica importante. Al introducir un nuevo tokenizer a partir de Opus 4.7, Anthropic indicó en su documentación oficial de precios que «el mismo texto puede facturarse con hasta un 35 % más de tokens que en modelos anteriores». **Aunque el precio por token no cambie, la factura aumenta en la misma proporción que el número de tokens.** Una comparación honesta entre modelos debe mirar no solo la tarifa, sino la tarifa multiplicada por el número de tokens previsto.

Pero estos tokens segmentados no entran en el modelo como caracteres o palabras literales. ¿Qué forma adopta entonces un token como entrada del modelo?

## Cómo entran los tokens en el modelo

Las redes neuronales no pueden trabajar directamente con texto. En último término, un modelo solo calcula con números; más exactamente, con vectores, es decir, conjuntos de números. Por eso, antes de entrar en el modelo, los tokens pasan por varias etapas que los convierten en valores numéricos.

El orden es el siguiente.

1. **Texto → tokens**: un tokenizer BPE divide el texto en fragmentos de token.
2. **Token → token ID**: cada token se asigna a un ID entero que indica su posición en el vocabulario. Por ejemplo, si `" the"` es el token número 1.234, su ID será `1234`.
3. **Token ID → vector de embedding**: el ID selecciona la fila correspondiente de la matriz de embeddings. Esta matriz es una tabla enorme de tamaño `vocabulary size × model dimension (d_model)`; cada token ID corresponde a una fila, es decir, a un vector. Podemos imaginar ese vector como unas coordenadas que contienen el «significado» del token.
4. **Añadir información posicional**: por sí misma, la autoatención desconoce el orden de los tokens. Es decir, vería «yo te quiero» y «te yo quiero» como lo mismo. Por ello se inyecta información posicional en cada vector de token para comunicar el orden de la secuencia.

Como la explicación resulta abstracta solo con palabras, he añadido una herramienta interactiva para experimentar con las cuatro etapas. Al cambiar la frase o pulsar un token, se puede seguir su recorrido desde el ID hasta el vector de embedding y ver cómo la información posicional produce el vector de entrada final. (Solo se muestran unas pocas dimensiones, pero conviene recordar que el vector real de GPT-4 tiene 12.288.)

La dimensión del modelo (d_model) es la longitud del vector que representa un token. En el artículo original del Transformer era 512, pero en los LLM actuales es mucho mayor. (Incluso Llama 2 7B usa 4.096 dimensiones.) Una dimensión mayor permite expresar con más riqueza diferencias sutiles de significado, a costa de más cálculo y memoria.

![Cómo un token ID consulta una fila de la matriz de embeddings y se convierte en un vector de dimensión d_model](4.png)

La forma de introducir información posicional también ha cambiado. El Transformer original sumaba a los embeddings vectores de posición construidos con funciones seno y coseno. RoPE (Rotary Position Embedding), estándar de facto en los LLM abiertos actuales, inyecta en cambio la posición relativa durante el cálculo de la atención al rotar los vectores Query y Key. (El mecanismo cambia, pero el objetivo es el mismo: dotar al Transformer de sentido del orden.)

En resumen, el flujo es **texto → tokens → token IDs → vectores de embedding (+ información posicional) → entrada del Transformer**. El «número de tokens» de una factura corresponde a la segunda etapa de este proceso: cuántos tokens produjo la segmentación del texto.

Ya sabemos cómo se crean los tokens y en qué forma entran en el modelo. Pero cuando este los procesa, ¿por qué cuestan tan distinto la entrada y la salida, y cómo puede abaratarse el envío repetido de una misma entrada?

## Por qué la entrada es barata y la salida es cara

Quien haya trabajado con tokens probablemente se lo haya preguntado: en las tablas de precios, **los tokens de salida cuestan varias veces más que los de entrada.** En Anthropic, la tarifa de salida es exactamente cinco veces la de entrada en todos los modelos. (Opus cuesta $5 de entrada y $25 de salida; Haiku, $1 y $5.) Si es el mismo token, ¿por qué cambia el precio según entre o salga?

La respuesta es que el modelo procesa los tokens de maneras completamente distintas en la entrada y la salida. La inferencia de un LLM tiene dos etapas.

- **prefill (procesamiento de la entrada)**: procesa todos los tokens de la instrucción **a la vez y en paralelo**. Contenga 1.000 o 10.000 tokens, la GPU los recorre conjuntamente y calcula los vectores K/V (Key/Value) de cada uno. El cálculo total es considerable, pero el paralelismo mejora la eficiencia por token.
- **decode (generación de la salida)**: genera los tokens de la respuesta **en secuencia, de uno en uno**. Tras producir uno, lo añade a la entrada y genera el siguiente. El ciclo continúa hasta completar la respuesta.

Esta asimetría crea la diferencia de coste. Según el análisis de rendimiento de inferencia de Databricks, prefill es una etapa limitada por el cálculo, mientras que decode está limitado por el ancho de banda de memoria. Durante decode, para producir cada token hay que volver a leer de la memoria de la GPU todos los pesos del modelo, y cada pasada solo genera un token. Gran parte de la enorme capacidad de cálculo de la GPU queda ociosa. (En palabras de Databricks, se paga por mantenerla funcionando sin utilizar el cálculo disponible.)

En otras palabras, **los tokens de entrada se procesan eficientemente juntos mediante prefill paralelo, mientras que los de salida deben extraerse ineficientemente de uno en uno.** Factores comerciales como la demanda o el margen también pueden influir en el precio, pero esta ineficiencia de decode forma parte de su fundamento técnico. «Recibir una respuesta corta» no es, por tanto, un consejo de ahorro genérico: reduce directamente la etapa más cara.

¿Hay forma de hacer que decode sea al menos un poco menos ineficiente? Aquí entra en juego KV cache.

## Cómo el almacenamiento en caché reduce el precio

Prompt caching guarda una vez la entrada estática en una caché para que las llamadas siguientes la lean a un precio mucho menor. Según la documentación oficial de Anthropic, una lectura cuesta 0,1 veces la tarifa base de entrada: exactamente un 10 %. La escritura cuesta 1,25 veces con un TTL (Time To Live, periodo de validez de la caché) de cinco minutos y 2 veces con un TTL de una hora. Se paga un poco más en la primera llamada y se ahorra un 90 % desde la segunda.

Pero ¿cómo puede reducirse el precio un 90 %? ¿Y por qué es tan estricta la condición de que «el prefijo coincida exactamente»? Ambas respuestas aparecen al mirar dentro del Transformer.

### KV cache

Al procesar los tokens de entrada, el modelo crea los vectores Query/Key/Value (Q/K/V) correspondientes. La autoatención calcula puntuaciones de atención mediante el producto escalar de Query y Key y usa esas puntuaciones para obtener una suma ponderada de los valores. Es el cálculo que determina cuánto debe «consultar» un token a los demás.

Aquí es donde decode plantea el problema descrito antes. Para crear cada nuevo token, el modelo necesita los K/V de todos los tokens anteriores. Recalcularlos desde cero en cada paso repetiría indefinidamente el mismo trabajo.

![Estructura de funcionamiento del KV cache del Transformer](1.webp)

KV cache elimina esa duplicación. Almacena los K/V ya calculados y, al generar un token nuevo, lee y reutiliza desde la caché los K/V anteriores en lugar de volver a calcularlos. Dentro de una secuencia, el coste de producir un token adicional pasa así de O(n²), que recalcularía toda la secuencia en cada paso, a O(n), que solo lee la caché. (En rigor, hablamos del coste por paso; la idea esencial es sencilla: no recalcular lo ya calculado.) Esta es también la razón por la que decode está limitado por la memoria: cada paso debe leer de nuevo el KV cache desde la memoria.

### Reutilización entre llamadas

Si KV cache nació para acelerar decode dentro de una respuesta, prompt caching propone reutilizar esa estructura de memoria **no solo dentro de una llamada, sino también entre una llamada y la siguiente**.

Los K/V de un prefijo estático —una instrucción del sistema, definiciones de herramientas o fragmentos de código cuyo comienzo cambia poco— permanecen en la memoria de la GPU durante un TTL de cinco minutos o una hora. Si la siguiente llamada empieza con el mismo prefijo, el modelo omite por completo el cálculo de sus K/V y los lee directamente de la caché. En sentido estricto, la tarifa de los tokens de entrada no baja por arte de magia: **desaparece el trabajo de GPU necesario para calcularlos.** La reducción del 90 % refleja ese cálculo evitado.

Al entender el mecanismo, también se entiende la exigencia de coincidencia exacta del prefijo. Un acierto de caché se decide comparando el hash acumulativo del prefijo. Como la autoatención es causal, cambiar un solo token anterior modifica los K/V de todos los tokens posteriores. Basta con añadir una marca temporal al principio de la instrucción para que su valor cambie en cada llamada, el hash deje de coincidir y toda la caché posterior quede invalidada.

Anthropic lee la caché con la jerarquía `tools` → `system` → `messages`. Por eso, cambiar una sola definición de herramienta al principio invalida toda la caché que viene detrás. La conclusión es simple: **el contenido estático debe ir primero y el contenido dinámico que cambia en cada llamada, al final.**

La caché también tiene restricciones menos conocidas. El mínimo de tokens que admite depende del modelo e incluso de la versión dentro de una misma familia. Una instrucción más corta que el umbral no se guarda, sin aviso, aunque el almacenamiento en caché esté activado. (Como esos mínimos y las políticas de cada proveedor afectan directamente al diseño de costes, los explico con las tablas de precios en la guía de ahorro de tokens.)

## Por qué la ventana de contexto impone un límite de tokens

El último concepto imprescindible es la ventana de contexto: el número máximo de tokens que un modelo puede aceptar a la vez. Entender el motivo de este límite también aclara la conocida advertencia de que «un contexto más largo cuesta más».

La clave está en la estructura de cálculo de la autoatención. La atención hace que cada token consulte una vez a todos los demás. Con n tokens hay n × n pares, por lo que **el cálculo y la memoria de la autoatención crecen con el cuadrado de la longitud n de la secuencia.** Al duplicar los tokens, el coste de la atención se cuadruplica. (Conviene precisar que no todo el modelo es O(n²); lo es la etapa de atención.)

![Matriz de autoatención en la que cada token consulta a todos los demás; con n tokens, los pares crecen como n×n](5.png)

Las [estimaciones de Hugging Face](https://huggingface.co/docs/transformers/en/llm_tutorial_optimization) muestran lo acusada que es esta subida cuadrática. Con atención estándar sin optimizar, almacenar solo la matriz de puntuaciones requiere unos 50 MB para una entrada de 1.000 tokens, cerca de 19 GB para 16.000 tokens y casi 1 TB para 100.000.

El KV cache también ocupa memoria en proporción al número de tokens. Conforme crece el contexto, los K/V que hay que conservar se acumulan linealmente. En definitiva, el límite de la ventana de contexto es una frontera física fijada por el modelo: más allá, la memoria y el cálculo dejan de ser manejables.

Por eso, arrastrar sin cambios una conversación larga no consiste solo en sumar tokens de entrada. El coste de la atención crece al cuadrado y, al acercarse al límite, también disminuye la precisión con que el modelo maneja la información. (Esta pérdida de precisión está directamente relacionada con la degradación del contexto, tratada en la guía de ahorro; mantener un contexto ligero beneficia tanto al coste como a la calidad de las respuestas.)

## Conclusión

En conjunto, el funcionamiento de los tokens se resume en unos pocos hechos. **Un token es una unidad de vocabulario que BPE crea agrupando patrones frecuentes**; tras asignarse a un token ID, se convierte en un vector de embedding y entra en el modelo. **La entrada se procesa de una vez mediante prefill paralelo, mientras que la salida es más cara porque debe extraerse token a token**; KV cache reduce esa ineficiencia reutilizando los K/V. **La caché no abarata por magia, sino porque el Transformer evita recalcular K/V ya obtenidos**, y de esta estructura se deriva la estricta condición de que el prefijo sea idéntico. Por último, un contexto más largo cuesta más porque el coste de la atención crece con el cuadrado del número de tokens.

Con esta base, la economía de los tokens se ve con mucha más claridad. Acortar la salida, organizar la instrucción para no romper la caché, mantener ligero el contexto o pasar a un modelo más barato cuando ofrece la misma respuesta son estrategias asentadas en estos principios. Si has llegado hasta aquí para entender el mecanismo, te recomiendo seguir con la guía de ahorro de tokens y comprobar cómo estas ideas reducen los costes reales.

:::ref
- [paper] [Philip Gage, A New Algorithm for Data Compression (1994)](https://en.wikipedia.org/wiki/Byte-pair_encoding)
- [paper] [Sennrich, Haddow, Birch, Neural Machine Translation of Rare Words with Subword Units (ACL 2016)](https://arxiv.org/abs/1508.07909)
- [article] [Jay Alammar, The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
- [docs] [HuggingFace, Byte-Pair Encoding tokenization](https://huggingface.co/learn/nlp-course/en/chapter6/5)
- [docs] [HuggingFace, Transformers KV Cache strategies](https://huggingface.co/docs/transformers/en/kv_cache)
- [repo] [OpenAI, tiktoken](https://github.com/openai/tiktoken)
- [article] [OpenAI, Hello GPT-4o (Language tokenization)](https://openai.com/index/hello-gpt-4o/)
- [article] [Yennie Jun, All languages are NOT created (tokenized) equal](https://www.artfish.ai/p/all-languages-are-not-created-tokenized)
- [article] [Databricks, LLM Inference Performance Engineering Best Practices](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices)
- [article] [Baseten, A guide to LLM inference and performance](https://www.baseten.co/blog/llm-transformer-inference-guide/)
- [docs] [Anthropic, Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
:::
