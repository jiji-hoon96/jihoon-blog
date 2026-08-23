---
emoji: 🧭
title: 'Ingeniería de Harness (Sistemas)'
seoTitle: 'Agentes de IA después del contexto: diseño de harness, eval y containment'
date: '2026-06-22'
categories: IA Agentes
description: 'Del prompt al context engineering: ¿qué viene después? A partir de las tendencias recientes del blog de ingeniería de Anthropic, este artículo conecta el ahorro de tokens con tres direcciones: diseño de harness, eval y containment (aislamiento).'
keywords: 'context engineering, diseño de harness, eval de agentes de IA, agent evaluation, containment, aislamiento de agentes, tendencias de IA 2026, prompt engineering, agentes LLM, después del ahorro de tokens'
locale: es
translationOf: '260622'
sourceHash: '3a4496827fcd34537ded61f9925a57116fbf16b6d28eee9508f66417f6d2345b'
---

En este artículo quiero hablar sobre prompt engineering, context engineering y lo que podría venir después.

Mientras terminaba el artículo anterior sobre [cómo ahorrar tokens](/260611), hubo una pregunta que no dejaba de rondarme. Creo que el centro de gravedad está pasando del trabajo sobre prompts individuales a la técnica de vaciar y seleccionar información —context engineering—. Al cerrar aquel texto, la siguiente pregunta surgió de forma natural: entonces, ¿qué viene después del contexto?

![Arquitectura de 3 capas para sistemas de IA fiables, compuesta por prompt, context y harness engineering](3.webp)

Hay que ser prudente al hablar de «la dirección futura». El futuro admite innumerables caminos; por eso, aquí nos centramos en ordenar **el cambio de énfasis que puede leerse en fuentes primarias ya publicadas**. Aunque inevitablemente haya cierta inferencia, espero que el texto se lea desde perspectivas diversas.

---

## Del prompt al contexto

Empecemos por aclarar los términos. Durante un tiempo, el gran tema del sector fue el **prompt engineering**. La cuestión era cómo redactar bien una única instrucción para el model: cómo diseñar indicaciones claras, buenos ejemplos y el formato de salida.

Después creció la unidad de trabajo. Cuando se generalizaron los agentes que operan durante decenas de turnos, dejó de importar solo un prompt y pasó a ser crucial cómo componer **todo el contexto que el modelo ve en cada turno** (system prompt + definiciones de herramientas + historial de conversación + resultados de búsqueda + memoria). A esto lo llamamos **context engineering**. Anthropic articuló este marco en septiembre de 2025 con «Effective context engineering for AI agents», y el estudio sobre context rot publicado ese mismo año por el equipo de Chroma (Hong et al.) añadió evidencia cuantitativa. Con 18 modelos, entre ellos GPT-4.1, Claude 4, Gemini 2.5 y Qwen3, mostraron que el rendimiento se degrada de forma desigual a medida que crece la entrada, incluso en tareas tan sencillas como copiar palabras literalmente. La suposición habitual de que un modelo trata igual el token número 100 y el número 10,000 no se sostiene en la práctica. La conclusión no fue «cuanto más largo el contexto, mejor», sino «cómo se coloca la información importa tanto como qué contiene». Esto impulsó el paso de llenar a seleccionar y ayudó a que el término se asentara con rapidez.

Conviene señalar un malentendido habitual. El prompt engineering no fue **sustituido** por el context engineering. Escribir buenos prompts sigue siendo fundamental; el context engineering se parece más a un concepto superior construido sobre esa base. (Que el interés pase de escribir buen código a diseñar buenos sistemas no vuelve innecesario el coding.) La descripción exacta no es «cambiamos una cosa por otra», sino **«se amplió incluyéndola»**.

Volvamos entonces a la pregunta: ¿esa ampliación terminó en el contexto? No parece que sea así.

## El blog de ingeniería de Anthropic

Creo que la forma más honesta de intuir una dirección es leer en orden cronológico qué publican quienes realmente están impulsando el campo. Si seguimos el blog de ingeniería de Anthropic después de «Effective context engineering» (septiembre de 2025), los títulos por sí solos ya dibujan hacia dónde siguió moviéndose el centro de gravedad.

- Octubre de 2025, Equipar agentes con Agent Skills
- Noviembre de 2025, Code execution with MCP: agentes más eficientes
- Noviembre de 2025, Effective harnesses for long-running agents
- Enero de 2026, Demystifying evals for AI agents
- Enero de 2026, Diseñar evaluaciones técnicas AI-resistant
- Febrero de 2026, Cuantificar el ruido de infraestructura en evaluaciones de agentic coding
- Marzo de 2026, Harness design for long-running application development
- Abril de 2026, Scaling Managed Agents: separar cerebro y manos
- Mayo de 2026, Cómo contener a Claude en todos los productos

Visto con algo de distancia, los términos se agrupan en tres ramas: **harness**, **eval** y **containment**. Lo interpreto como un debate que sube un nivel desde cómo llenar y vaciar el contexto hacia cómo diseñar, medir y controlar el sistema de agentes completo. (Naturalmente, existe la limitación de que son las prioridades de una empresa. Aun así, dado el peso que tiene en el ecosistema de coding agents, cuesta reducirlas a los intereses de un único vendor.)

Veamos cada rama.

## harness

La palabra harness puede resultar poco familiar. Literalmente es un arnés: el equipo que se coloca a un caballo para dirigir su fuerza. En un agente de IA, harness designa **todo el armazón que rodea al model desde fuera y lo pone a trabajar**: qué tools puede usar y en qué orden, cómo recuperarse de un fallo, hasta dónde llegan sus permisos y cuándo se detiene el loop.

Si context engineering pregunta «¿qué le mostramos al model?», el diseño de harness pregunta «¿cómo hacemos que el model se mueva dentro de ese entorno?». Está una capa más afuera. Si el model fuera una persona recién contratada y muy capaz, el contexto serían los materiales de trabajo que recibe, mientras que el harness sería el entorno y el manual de procedimientos. La misma persona puede rendir de forma irregular en un espacio caótico y llegar mucho más lejos, con idénticas capacidades, sobre un proceso bien diseñado.

La importancia se ve con claridad en [un fracaso al que se enfrentó directamente el equipo de ingeniería de Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). Colocaron su mejor coding model, Opus 4.5, sobre Claude Agent SDK, le dieron solo instrucciones de alto nivel como «crea un clone de claude.ai» y lo ejecutaron durante varias sesiones. Aunque el model era inteligente, no produjo una app de nivel production. Los fallos se repetían de dos maneras. En una, la sesión intentaba terminar todo de una vez, agotaba el contexto a mitad de la implementación y dejaba a la siguiente una función a medio construir. En la otra, una sesión posterior veía que «ya se ha avanzado bastante» y declaraba que había terminado pese al trabajo pendiente. (Es como una tarea larga repartida por turnos entre varias personas, donde cada relevo carece por completo de los recuerdos del anterior.)

La solución no fue hacer más inteligente al model, sino cambiar el armazón. La primera sesión recibió un prompt exclusivo para preparar el entorno (initializer agent), desplegó más de 200 especificaciones funcionales en `feature_list.json` y creó `init.sh` para iniciar el servidor de desarrollo, además de un log de progreso (`claude-progress.txt`). Cada sesión posterior (coding agent) se ocupaba exactamente de una función, dejaba un estado limpio mediante un git commit y notas de progreso, y terminaba. La siguiente leía primero ese progress file y el git log para saber «hasta dónde llegó el turno anterior» y continuar desde allí. Era el mismo model, pero el resultado cambió al colocarlo sobre este armazón. El harness, no el model, decidió el éxito. (Curiosamente, las recetas de Anthropic no son nuevas. Las listas de funciones, los commits pequeños, las notas de progreso y los smoke tests ejecutados siempre son exactamente lo que hace a diario una persona con experiencia en desarrollo. Un buen armazón para un agente se parece, en definitiva, a incrustar buenos hábitos de engineering en el entorno.)

La conexión con el ahorro de tokens también es clara. El aislamiento de subagentes, la reducción de definiciones de tools y el model routing tratados en el artículo anterior parecen técnicas independientes si se observan por separado. Juntas, sin embargo, son partes de **cómo se diseña un único harness**. Decidir a qué model lane se envía cada tarea, qué tools permanecen activas y dónde se aísla la exploración verbose forma parte del diseño de harness. El ahorro se parece más a un efecto secundario de ese diseño.

Sin embargo, el diseño de harness encierra una trampa peculiar: **cuanto mejor diseñado está el armazón, más probable es que envejezca cuando mejora el model.** Un harness es, en esencia, un conjunto de supuestos sobre «lo que el model no puede hacer por sí solo»; en cuanto puede hacerlo, esos supuestos se convierten en carga. Un [caso de Anthropic](https://www.anthropic.com/engineering/managed-agents) lo ilustra exactamente. Sonnet 4.5 tendía a apresurarse para terminar cuando se acercaba al límite de contexto —context anxiety—, así que el armazón incorporó un mecanismo de context reset. Al usar el mismo armazón con Opus 4.5, aquel hábito había desaparecido y el reset cuidadosamente añadido se volvió peso muerto. Cada vez que el model se hace un poco más capaz, alguna parte del armazón puede caducar.

De ahí surge una idea adicional: en lugar de perfeccionar un armazón concreto, **diseñar interfaces que permanezcan estables aunque el armazón cambie**. Managed Agents de Anthropic sigue esta dirección, cuyas raíces están, sorprendentemente, en los sistemas operativos. El OS ha resistido durante décadas porque virtualizó el hardware en abstracciones como procesos y archivos, creando por adelantado un recipiente para programas que aún no existían. Una línea de `read()` funciona igual con un disco de la década de 1970 que con un SSD actual. Aplicado a los agentes, el mismo razonamiento los divide en tres piezas: el **cerebro** que decide (Claude y el harness), las **manos** que actúan (sandbox de ejecución de código y tools) y el **session log** que registra mediante append todo lo ocurrido. Al separarlas, si muere el container, el cerebro puede tratarlo como un error de tool call; y si muere el harness, puede despertar desde el último punto del session log. Como efecto secundario también bajaron el coste y la latencia. Al iniciar containers solo cuando eran realmente necesarios, Anthropic afirma que el time to first token (TTFT) cayó cerca de un 60% en la mediana y, en p95, más de un 90%. (Aquí volvemos a encontrarnos con el artículo sobre tokens. Allí se recomendaba poner delante las partes estáticas para aprovechar prompt caching; decidir «cómo disponer el contexto para mejorar el cache hit rate» es precisamente la tarea del harness que acompaña a este cerebro.)

## eval

La segunda rama fue la que más me interesó personalmente. Como si se hubieran puesto de acuerdo, los artículos de comienzos de 2026 convergen en la **evaluación (eval)**.

La razón resulta natural. **¿Con qué comprobamos** si el contexto está bien compuesto, el harness bien diseñado o el coste realmente reducido? Cuanto más largas y complejas son las tareas que un agente resuelve de forma autónoma, más difícil es revisar a simple vista cada una y decidir «¿esto funcionó bien?». La base de la confianza acaba desplazándose hacia la medición. Por eso han pasado al primer plano preguntas como «¿cómo diseñar la evaluación de agentes?», «¿cómo eliminar el ruido de la propia evaluación?» o «¿cómo tratar el eval awareness, cuando el model detecta que lo evalúan y cambia su conducta?».

![4.png](4.png)

Evaluar agentes es difícil porque no se parece a una pregunta y respuesta de una sola vez. Un agente llama a tools y cambia estados a lo largo de varios turnos, de modo que un error se propaga y acumula. Además, los resultados varían entre ejecuciones aun con la misma entrada. [Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) divide esta no determinación en dos métricas. **pass@k** es la probabilidad de acertar al menos una vez en k intentos, por lo que crece al aumentar los intentos. **pass^k** es la probabilidad de acertar los k intentos, por lo que disminuye. En generación de código que solo necesita funcionar una vez importa pass@1; en un agente de atención al cliente que debe funcionar siempre, pass^k es fundamental. (Con una tasa de éxito per-trial del 75%, la probabilidad de tres éxitos seguidos es 0.75³, cerca del 42%. Así de grande es la distancia entre «suele funcionar» y «funciona siempre».)

¿Con qué se puntúa entonces un intento? El mismo artículo distingue tres tipos de grader. Los **code-based** (tests superados, static analysis y validación de tool calls) son rápidos, baratos y objetivos, pero débiles en tareas abiertas con varias respuestas válidas. Los **model-based** (LLM-as-judge y puntuación mediante rubric) captan matices de calidad, pero son no deterministas y deben calibrarse periódicamente con evaluación humana. Los **human-based** son los más exactos, pero lentos y caros. En la práctica se combinan los tres, preferiblemente con evaluación determinista como base y la del model como apoyo. Hay otra distinción. Un **capability eval** pregunta «¿qué puede lograr este agente?», por lo que comienza con puntuaciones bajas y ofrece una pendiente que subir. Un **regression eval** pregunta «¿sigue haciendo lo que antes hacía?», por lo que debe mantenerse casi en el 100%; una bajada indica que algo se rompió.

Aquí hay una trampa que se pasa por alto con sorprendente frecuencia: **una puntuación baja puede ser culpa de la evaluación, no del agente.** Anthropic cuenta que Opus 4.5 obtuvo inicialmente un 42% en CORE-Bench. Al investigar encontraron evaluaciones rígidas que esperaban «96.124991…» y marcaban «96.12» como incorrecto, especificaciones ambiguas y tareas estocásticas imposibles de reproducir. Tras corregir bugs y repetir con un scaffold de restricciones más flexibles, la puntuación subió al 95%. Por eso insisten en un principio: **no aceptes la puntuación sin más; lee tú mismo el transcript (registro de ejecución).** Si un frontier model realiza 100 intentos y obtiene un 0%, normalmente el problema está roto, no es que el model sea incapaz.

También resulta interesante que, al avanzar la medición, la propia línea de base se mueve deprisa. En SWE-bench Verified —benchmark destacado de coding agents que usa issues reales de GitHub y puntúa si pasan los tests—, los frontier models pasaron de la franja del 30% a más del 80% en 1 año. A esas alturas, todos los problemas fáciles están resueltos, la puntuación toca techo (saturation) y aparece una paradoja: grandes mejoras de capacidad solo se reflejan en pequeñas diferencias. Según se cuenta, una startup de code review desestimó al principio un model nuevo tras mirar solo evaluaciones one-shot; no vio bien la mejora hasta que adoptó evaluaciones de agentes con tareas más largas y complejas. Por eso un eval no se crea una vez y se da por terminado: es un activo vivo que debe reemplazarse continuamente por versiones más difíciles. (Anthropic lo compara con el «Swiss cheese model» de la ingeniería de seguridad. Una loncha con agujeros no basta, pero al superponer evaluación automática, production monitoring y revisión humana de transcripts, el fallo que atraviesa una capa queda atrapado en la siguiente.)

## containment

La tercera rama tiene un carácter algo distinto. No trata del coste ni del rendimiento, sino de **seguridad y control**.

Cuantas más herramientas maneja un agente y mayor es su autonomía, más crece el alcance de un solo error —su blast radius—. Para un agente capaz de borrar archivos, enviar solicitudes externas y ejecutar acciones privilegiadas en nombre de alguien, «¿dónde detenemos el daño cuando se equivoca?» importa tanto como «¿qué tan bien lo hace?». En este contexto puede leerse el protagonismo que Anthropic dio en mayo de 2026 a su artículo sobre [containment en todos sus productos](https://www.anthropic.com/engineering/how-we-contain-claude). Divide el riesgo de los agentes en tres ramas: **user misuse**, cuando un usuario solicita algo dañino con malicia o descuido; **model misbehavior**, cuando el modelo actúa por sí mismo sin que nadie se lo pida; y **external attacks** que llegan mediante herramientas, archivos o redes. Una observación interesante es que hacer más inteligente al modelo no se limita a reducir el riesgo. Los modelos menos capaces interpretan mal la situación y cometen errores obvios; los más capaces se equivocan menos, pero encuentran mejor rutas inesperadas para sortear restricciones que nadie escribió de forma explícita.

El punto central es el límite de «supervisar cada acción con una persona». Claude Code buscó inicialmente la seguridad pidiendo aprobación para cada escritura, ejecución y acceso a la red, pero la telemetría mostró que los usuarios aceptaban sin más cerca del 93% de las solicitudes. Cuantas más ventanas aparecen, menos atención recibe cada una: surge la **approval fatigue**. Una defensa probabilística basada en clics humanos siempre conservará agujeros. El centro de gravedad pasa de «vigilar lo que hace el agente» a «limitar lo que puede hacer desde el principio». Las defensas se apilan en tres capas: la **capa de entorno**, con sandbox, VM y control de egress; la **capa del model**, con system prompts y classifiers; y la **capa de contenido externo**, con MCP, plugins y resultados de búsqueda. El principio esencial es **instalar primero la capa de entorno, que bloquea de manera determinista**. No porque las defensas del model sean débiles. De hecho, en el benchmark de Gray Swan para prompt injection, la tasa de éxito de un ataque único ronda el 0.1%, un resultado de primera categoría. Pero con 100 intentos adaptativos sube al 5–6%, y una defensa probabilística no puede alcanzar por naturaleza un 100% de aciertos. Por eso se añade al final una frontera dura. (La introducción de un sandbox a nivel de OS redujo las solicitudes de aprobación en un 84%. El mecanismo de seguridad redujo la fricción.)

![Defensa de containment en 3 capas: las capas del model y del contenido externo (probabilísticas) se apilan sobre la capa de entorno (determinista, última línea de defensa)](2.png?w=720)

Aunque parezca alejado del ahorro de tokens, comparte la misma raíz. Ambos preguntan **«¿qué le damos al agente y hasta dónde?»** Anthropic muestra bien la conexión con dos casos. En uno, el red team interno hizo phishing a un empleado para que ejecutara Claude Code con un prompt malicioso. Una instrucción oculta le hizo leer `~/.aws/credentials` y enviar el contenido fuera mediante POST; de 25 intentos, funcionó 24 veces. Como el usuario había escrito directamente la instrucción, el classifier del model no vio nada sospechoso. Lo impidieron la frontera ambiental que mantenía las credenciales fuera del sandbox y el control de egress, no un model inteligente. El segundo caso es más sutil. Una allowlist de egress permitió correctamente `api.anthropic.com`, pero un archivo plantado por un atacante usó su propia API key para llamar a la API de carga de archivos de Anthropic, y los datos salieron hacia la cuenta atacante. El sandbox funcionó perfectamente, pero aun así hubo fuga. La lección fue entender la allowlist no como un «filtro de destinos», sino como «permiso para todas las capacidades disponibles en ese dominio». (Anthropic repite este principio: los hypervisors, filtros de syscall y runtimes de containers ya verificados resistieron; **lo que se rompió fueron los componentes que ellos mismos habían construido encima**.) Retirar tools de MCP que no se usan pertenece al mismo contexto: ahorra coste y reduce la attack surface. Mantener un diseño ligero no solo lo hace más barato y preciso, sino también más seguro.

## En resumen

Las tres ramas se pueden condensar en una frase. La unidad de atención se expande un nivel cada vez: **del prompt (una instrucción), al contexto (qué mostrar en cada turno), y luego al sistema de agentes completo (cómo operarlo, medirlo y contenerlo)**. Harness responde a «¿cómo hacerlo funcionar?», eval a «¿cómo sabemos si funcionó bien?» y containment a «¿cómo lo detenemos si funciona mal?».

![Expansión en 3 etapas del interés, desde el prompt al contexto y luego al sistema de agentes completo, con las ramas de harness, eval y containment](1.png?w=720)

Conviene insistir: estas tres ramas son **un cambio de énfasis que el autor infiere de materiales ya publicados**, no una predicción del tipo «esto será el estándar en la segunda mitad de 2026». Algunas corrientes crecerán y otras se integrarán bajo nombres diferentes. Lo claro es que ni el prompt ni el contexto desaparecerán: permanecerán como partes de un marco mayor. El campo ha avanzado añadiendo una capa sobre las anteriores, no borrando palabras viejas con otras nuevas, y es probable que siga haciéndolo.

Empezamos hablando de costes y llegamos hasta aquí. El artículo anterior recomendaba abrir el libro de cuentas de tokens; este propone dar un paso más. Conviene examinar a la vez **cómo verificamos** el ahorro (eval), **sobre qué armazón puede repetirse** (harness) y **hasta dónde es seguro ese armazón** (containment). Al final, lo que más perdure probablemente no será una técnica de ahorro concreta, sino el hábito de medir y controlar el propio sistema.

:::ref
- [article] [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [article] [Anthropic, Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [article] [Chroma Research, Context Rot](https://research.trychroma.com/context-rot)
:::
