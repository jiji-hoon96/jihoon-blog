---
emoji: 🤖
title: 'Ingeniero frontend de IA'
seoTitle: 'Cómo sobrevivir como ingeniero frontend en la era de la IA: nuevas competencias de verificación, especificación y criterio'
date: '2026-03-02'
categories: frontend carrera IA
description: 'En una era en la que la IA escribe el código, ¿cómo pueden los ingenieros frontend crecer y sobrevivir? A partir de fuentes contrastadas como el agentic engineering de Karpathy, Vercel v0, la encuesta de Stack Overflow y el estudio de METR, se presentan las nuevas competencias y estrategias de aprendizaje centradas en la verificación, la especificación y el criterio.'
keywords: 'frontend en la era de la IA, desarrolladores en la era de la IA, vibe coding, agentic engineering, herramientas de programación con IA, Product Engineer, hoja de ruta profesional para frontend'
locale: es
translationOf: '260302'
sourceHash: 8622877ee90352b24b0ec5131450def442d07449b2b669894ba2f674c2508509
---

En esta publicación quiero hablar, desde una perspectiva personal, de **cómo pueden crecer y sobrevivir los ingenieros en la era de la IA**.

Uno de los textos que más me impresionó cuando era junior fue [«Hoja de ruta profesional para ingenieros frontend: tres vías de especialización para perfiles junior», de Hwidong Bae](https://kr.linkedin.com/posts/hwidongbae_%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%BB%A4%EB%A6%AC%EC%96%B4-%EB%A1%9C%EB%93%9C%EB%A7%B5-%EC%A3%BC%EB%8B%88%EC%96%B4%EB%A5%BC-%EC%9C%84%ED%95%9C-3%EA%B0%80%EC%A7%80-%EC%A0%84%EB%AC%B8%EC%84%B1-%ED%8A%B8%EB%9E%99-activity-7013888624140189696-XiIz). El artículo organizaba la carrera de un ingeniero frontend en tres vías: **especialización web (Software Engineer) / especialización en producto (Product Engineer) / especialización en operaciones (Full-Stack Engineer)**, y abordaba además las «cinco competencias básicas de un ingeniero excelente» y los «tres puntos clave para convertirse en senior». En aquel entonces, la gran cuestión era decidir qué competencias desarrollar en cada vía. Sin embargo, ni siquiera habían pasado dos años desde que leí aquel texto cuando la propia cuestión cambió por completo.

Últimamente, cuando hablo con otros ingenieros, percibo que sus inquietudes tienen un tono algo distinto de las que venía oyendo durante los últimos años.

- «En la empresa hemos adoptado la IA y, si le damos un diseño, prácticamente lo construye todo. Es cómodo, pero...»
- «El mercado laboral está realmente frío».
- «Me da miedo hacer merge sin más del código generado por la IA, pero revisarlo línea por línea reduce la eficiencia. No sé qué hacer».

Yo también pasé por una etapa parecida y todavía sigo en ella. Hace apenas uno o dos años veía la IA como «una buena herramienta de apoyo»; hoy, en cambio, hemos llegado a un entorno en el que cuesta imaginar el desarrollo sin IA (yo mismo le estoy pidiendo a Claude que investigue mientras escribo este artículo). Este texto pretende ser una especie de continuación del de Hwidong Bae: quiero ordenar, desde mi punto de vista, cómo ha cambiado el panorama desde entonces y qué competencias adicionales debemos desarrollar como ingenieros frontend en este nuevo escenario.

Una vez más, he intentado buscar y contrastar tantos datos como fuera posible, pero, dado que este campo cambia a una velocidad extraordinaria, pido de antemano comprensión si alguna parte ya ha quedado anticuada cuando se publique el artículo. Si hay algo que rebatir o debatir, no dudéis en dejarlo en los comentarios.


## «¿Pero ahora no lo hace todo la IA?»

Antes que nada, hay una cuestión que debemos aclarar. ¿Es cierta la frase «la IA lo hace todo»? ¿Hasta qué punto es verdad y a partir de dónde empieza la ilusión?

En febrero de 2025, [Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383), cofundador de OpenAI y antiguo director de IA de Tesla, publicó esta frase en Twitter.

::::quote
:::translation
Hay un nuevo tipo de programación al que llamo «vibe coding»: consiste en dejarse llevar por completo por las vibraciones, abrazar el crecimiento exponencial y olvidar incluso que el código existe.
:::

:::original
There's a new kind of coding I call 'vibe coding', where you fully give in to the vibes, embrace exponentials, and forget that the code even exists.
:::
::::

El **vibe coding** es, en pocas palabras, «una forma de programar en la que se le entrega el teclado a la IA y uno se limita a describir en lenguaje natural lo que quiere». No hay documentos de arquitectura, ni boilerplate, ni búsquedas de puntos y comas. El código simplemente avanza siguiendo el vibe. En menos de un año, el término se asentó como parte del vocabulario habitual de la comunidad de desarrolladores anglófona.

Sin embargo, exactamente un año después, en febrero de 2026, el mismo Karpathy [dio un paso atrás](https://thenewstack.io/vibe-coding-is-passe/). Propuso sustituir la expresión vibe coding por **«agentic engineering»**. La diferencia entre ambos conceptos es clara.

- **Vibe coding**: describir lo que se quiere y aceptar el resultado.
- **Agentic engineering**: diseñar el sistema, especificar las restricciones y utilizar la IA para acelerar una implementación cuyo razonamiento ya se ha completado mentalmente.

Si hace un año el punto de partida era «basta con pedírselo y lo construye todo», ahora la propia «capacidad de diseñar qué pedirle a la IA y cómo hacerlo» se ha convertido en una competencia de ingeniería. Y esta corriente no se limita al tuit de una sola persona. Por esas mismas fechas, el ingeniero de Google [Addy Osmani](https://addyosmani.com/) publicó el libro [Beyond Vibe Coding: From Coder to AI-Era Developer](https://www.amazon.com/Beyond-Vibe-Coding-AI-Era-Developer/dp/B0F6S5425Y), donde sentenció: «La IA no es más que un asistente, no un programador autónomo en el que se pueda confiar. Tú eres el desarrollador senior y el LLM existe para acelerar tu criterio».


### Las herramientas avanzan sin freno

El ecosistema de herramientas también evoluciona rápidamente en consonancia con esta corriente. A mayo de 2026, las herramientas de programación más mencionadas son Cursor, Claude Code, GitHub Copilot, Windsurf, v0 by Vercel, Bolt.new y Devin.

La evolución de v0 es especialmente simbólica. Vercel utiliza la expresión [«90% problem»](https://venturebeat.com/infrastructure/vercel-rebuilt-v0-to-tackle-the-90-problem-connecting-ai-generated-code-to), que significa que el 90% del desarrollo real tiene lugar dentro de una base de código y una infraestructura ya existentes. Al principio bastaba con que v0 creara buenos prototipos greenfield; ahora importa repositorios de GitHub para trabajar directamente con ellos, aplica sistemas de diseño y obtiene automáticamente las variables de entorno de despliegue. En cierto modo, el ecosistema de herramientas está respondiendo directamente a la objeción de los perfiles senior: «¿La IA no sirve únicamente para crear demos de juguete?».

Las bases de código de las grandes tecnológicas son el mejor escaparate de este cambio.

Sundar Pichai, de Google, [anunció en la presentación de resultados del tercer trimestre de octubre de 2024 que «más del 25% del código nuevo había sido generado por IA y después revisado y aprobado por ingenieros»](https://fortune.com/2024/10/30/googles-code-ai-sundar-pichai/), y en abril de 2025 afirmó que la cifra había superado el 30%. Satya Nadella, de Microsoft, [reveló en LlamaCon, en abril de 2025, que «hasta el 30% de nuestro código está escrito por IA»](https://www.cnbc.com/2025/04/29/satya-nadella-says-as-much-as-30percent-of-microsoft-code-is-written-by-ai.html). En Meta, el objetivo interno ha llegado al nivel de que «para la primera mitad de 2026, el 65% de los ingenieros genere con IA más del 75% de sus commits».

En Corea la tendencia no es distinta. [Toss](https://toss.tech/article/toss-frontend-ai-docs) construyó un sistema de documentación basado en IA para mejorar la DX y evitar que los desarrolladores tuvieran que buscar documentos, y fue aún más lejos al tratar temas como [«Qué ocurrió al eliminar a los diseñadores en la era de la IA»](https://toss.tech/article/removing_designers_in_ai_era). Daangn comparte experimentos de cada equipo todos los martes mediante [AI Show & Tell](https://medium.com/daangn) y empezó a utilizar el [eslogan de contratación](https://about.daangn.com/blog/archive/%EB%8B%B9%EA%B7%BC-%ED%95%B4%EC%BB%A4%ED%86%A4-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%B1%84%EC%9A%A9/) «De ingeniero a builder». Woowa Brothers, por su parte, transmite mediante artículos como [«En una era en la que la IA escribe código, ¿aun así queréis ser desarrolladores?»](https://techblog.woowahan.com/22828/) el mensaje de que «la esencia de un desarrollador no está en el código, sino en la capacidad de definir y resolver problemas».


### Sin embargo, las cifras cuentan una historia algo distinta

Si nos quedáramos solo con lo anterior, sería fácil concluir que «ahora basta con pedírselo y todo se resuelve». Pero los datos reales cuentan una historia algo distinta.

Veamos primero las cifras de la [**2025 Stack Overflow Developer Survey**](https://survey.stackoverflow.co/2025/ai), que analiza de forma integral el estado del desarrollo de software.

- El 84% de los desarrolladores afirmó utilizar herramientas de IA o tener previsto hacerlo. (Un aumento respecto al 76% de 2024).
- El 51% de los desarrolladores profesionales usa herramientas de IA a diario.
- Sin embargo, **la opinión favorable hacia las herramientas de IA (positive sentiment) disminuyó**. Tras superar el 70% en 2023 y 2024, cayó hasta el 60% en 2025.
- Los desarrolladores senior con más de diez años de experiencia son quienes menos confían en los resultados de la IA.

En resumen: **«Todo el mundo las usa, pero cada vez se fía menos»**.

Un experimento realizado en 2025 por el instituto de investigación sin ánimo de lucro [**METR**](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) muestra de forma aún más llamativa la brecha entre esta percepción y la realidad. Fue un experimento controlado en el que se asignó aleatoriamente el uso o no de IA a 16 desarrolladores expertos de código abierto, con una media de cinco años de experiencia y 1.500 commits, para que completaran 246 tareas. Los resultados fueron los siguientes.

- Antes de empezar, los desarrolladores predijeron que «con IA serían un 24% más rápidos».
- Justo después de terminar las tareas, seguían valorando que «parecía que habían sido alrededor de un 20% más rápidos».
- Sin embargo, la medición real mostró que habían sido **un 19% más lentos**.

Las causas señaladas por los investigadores son interesantes. La tasa de aceptación del código generado por la IA fue inferior al 44%; incluso el código rechazado exigió tiempo de revisión y pruebas, y hasta el código aceptado requirió bastante tiempo de revisión y corrección. Esa ilusión de haber ido más rápido pese a haber tardado más es una de las razones por las que los desarrolladores senior se muestran cada vez más escépticos ante la IA.

Además, la propia «calidad del código escrito por IA» tampoco es impecable. Veamos el experimento de [**Veracode**](https://www.veracode.com/blog/genai-code-security-report/), que pidió a más de cien modelos de IA que escribieran código.

- El **45% del código generado por IA contenía vulnerabilidades de seguridad del OWASP Top 10**.
- La **tasa de fallos en la protección contra XSS (cross-site scripting) fue del 86%**.
- La tasa de fallos en la protección contra Log Injection fue del 88%.
- Otro estudio informó de que la densidad de vulnerabilidades del código de IA era **2,7 veces mayor** que la del código humano.

El 86% de fallos en XSS, algo directamente relacionado con el frontend, merece especial atención. La cifra muestra muy bien qué implica hacer merge sin más de un form input creado por la IA. (A quienes tengan experiencia con auditorías de seguridad frontend ya les resulta incómodo y preocupante escribir personalmente `dangerouslySetInnerHTML`; parece aún más aterrador cuando la IA lo introduce a escondidas).

Las señales sobre la calidad son parecidas. [**GitClear**](https://www.gitclear.com/ai_assistant_code_quality_2025_research) analizó 211 millones de líneas de cambios de código entre 2020 y 2024 y obtuvo estos resultados.

- Porcentaje de código revertido en las dos semanas posteriores a su escritura (Code Churn): 5,5% en 2020 → **7,9%** en 2024.
- Porcentaje correspondiente a refactorización: 25% en 2021 → **menos del 10%** en 2024.
- Porcentaje de copia y pega (clones): 8,3% en 2021 → **12,3%** en 2024 (en 2025 llegó a multiplicarse por cuatro).

La interpretación no es muy difícil. Ha aumentado la capacidad de producir código rápidamente, pero ha disminuido la de escribir código que merezca la pena revisar y mejorar. Los [datos de Apiiro](https://www.softwareseni.com/ai-generated-code-security-risks-why-vulnerabilities-increase-2-74x-and-how-to-prevent-them/), basados en el análisis de empresas Fortune 50, son aún más contundentes. Los desarrolladores asistidos por IA producen entre tres y cuatro veces más commits que sus compañeros, pero generan diez veces más security findings. Las rutas de escalada de privilegios (privilege escalation) aumentaron un 322% y los defectos de diseño arquitectónico, un 153%.


## Qué ha sustituido la IA y qué no ha podido sustituir

Las herramientas avanzan sin freno, pero las cifras presentan matices. Entonces, ¿qué ha sustituido exactamente la IA y qué no ha podido sustituir todavía? Solo si distinguimos claramente ambas cosas podremos saber dónde debemos invertir nuestro tiempo.

Lo que se ha sustituido es parte del trabajo de teclear directamente que hacían los desarrolladores. Hay menos situaciones en las que debamos escribir boilerplate o código repetitivo; con solo un diseño se puede obtener en pocos minutos una pantalla que respete las convenciones, y tanto el tiempo de búsqueda sobre sintaxis y API como la curva de aprendizaje se han reducido drásticamente. En suma, la IA ha **igualado la «velocidad de producción»**.

Pero todavía no ha sustituido el ámbito del «criterio». (Para ser exactos, sería más apropiado decir que «todavía no ha satisfecho las expectativas». Aunque existen diferencias entre personas en la capacidad de aprovechar la IA, aquí desarrollaré el argumento a partir de una experiencia de uso promedio).

El primer escollo es **traducir los requisitos en especificaciones**. Convertir necesidades de negocio ambiguas en casos límite precisos y máquinas de estados sigue requiriendo una intervención humana más profunda. Lo mismo ocurre con **comprender el impacto en todo el sistema**: aunque la IA ofrezca respuestas plausibles a preguntas como qué efecto tiene este componente sobre el bundle, si una dependencia permite tree shaking o cómo afecta un patrón de data fetching a la puntuación de [Core Web Vitals](https://web.dev/articles/vitals) denominada [INP (Interaction to Next Paint)](https://web.dev/articles/inp), al final uno solo se queda tranquilo cuando una persona vuelve a revisarlas.

Tampoco pueden dejarse de lado **la seguridad y la evaluación de riesgos**, como demuestra el problema ya mencionado del 45% de vulnerabilidades OWASP; ni ámbitos como **mantener el sistema de diseño y la coherencia**, comprobando que un componente nuevo se ajuste a los tokens, las reglas de accesibilidad y los patrones de interacción existentes; o **entender el contexto del cliente y del mercado**, preguntándose por qué hace falta una función y en qué flujo de usuario debe integrarse.

Por último, tomando prestada una expresión del artículo de [yceffort](https://yceffort.kr/2026/02/frontend-engineering-in-ai-era), la **gestión de la deuda cognitiva (Cognitive Debt)** —«la brecha entre la complejidad del sistema y el grado en que el equipo lo comprende»— es precisamente un ámbito en el que la distancia crece aún más rápido desde la adopción de la IA. Por eso, la tarea de cerrar esa brecha sigue correspondiendo a las personas.

> Lo que desaparece no es el desarrollador, sino la forma que tenía su trabajo. El cuello de botella ha pasado de la «velocidad para construir» a la «velocidad para decidir».

En la misma línea, el artículo de Toss [«¿Serán sustituidos los desarrolladores por la IA?»](https://toss.tech/article/will-ai-replace-developers) ofrece un diagnóstico de mayor calado. Su idea principal es esta: la IA no reemplaza a toda la fuerza laboral, sino que está eliminando la escalera de aprendizaje (apprenticeship ladder). Dentro de diez o veinte años, cuando los senior actuales se jubilen, faltará la siguiente generación capaz de diseñar sistemas complejos. No es una cuestión del nivel de «qué haremos con la contratación del año que viene en nuestra empresa», sino una especie de bomba de relojería para todo el sector. (Creo que es un artículo realmente bien escrito para una época llena de incertidumbre).

La «primera versión que funciona» creada por la IA representa el 70%. El 30% necesario para llegar a una «versión que pueda ofrecerse a usuarios reales» pertenece a las personas. Y la capacidad de completar ese 30% no aparece de la noche a la mañana. Esa es la esencia del problema de la escalera de aprendizaje. Si desaparece el tiempo de «ensuciarse las manos» escribiendo boilerplate y componentes sencillos, también desaparecen quienes podrían completar ese 30%.

El artículo original de Hwidong Bae enumeraba como «cinco competencias básicas de un ingeniero excelente» **escribir buen código, maximizar el valor presente (equilibrar un lanzamiento rápido y la mantenibilidad a largo plazo), tomar decisiones basadas en datos, ayudar eficazmente a los compañeros a decidir y aprender de forma constante**. Las cinco siguen siendo válidas en la era de la IA, pero la última ocupa la posición más vulnerable. El aprendizaje no ha desaparecido; ha cambiado su objeto. Antes aprendíamos «cómo se usa esta herramienta»; ahora debemos dedicar tiempo a aprender «cómo funciona todo este sistema». Más inquietante aún es [el problema señalado por Evan Moon](https://evan-moon.github.io/2026/04/18/developers-who-stopped-growing-in-ai-era/): «en cuanto la IA se encarga de escribir el código, la carga cognitiva del cerebro cae drásticamente». Que disminuya la carga cognitiva suena bien, pero es peligroso porque esa carga era precisamente la materia prima del aprendizaje. **Cuanto más cómodo resulta, menos se crece.**

Aquí surge de forma natural una pregunta. Entonces, ¿han dejado de tener sentido las tres vías del artículo de Hwidong Bae —especialización web, en producto y en operaciones—?

Yo no lo creo. Las vías siguen siendo válidas. Lo adecuado es considerar que cada una ha evolucionado un nivel para adaptarse a la era de la IA. Veamos cómo ha cambiado el panorama en cada caso.


## De productor a «verificador»

En el artículo original de Hwidong Bae, la vía de especialización web se agrupaba bajo el nombre de **Software Engineer**. Sus pilares eran «la comprensión profunda y el uso de Internet, los navegadores web y HTML/CSS/JS», el conocimiento de las ventajas e inconvenientes de las herramientas del ecosistema web, la experiencia resolviendo problemas y una actitud receptiva a las nuevas tecnologías. Como caminos hacia un puesto senior se proponían **ingeniero en una empresa que desarrolla herramientas para el ecosistema web / formador de frontend / tech lead en una organización con productos complejos**. En pocas palabras, eran «personas que profundizan en el funcionamiento del navegador y de HTML/CSS/JS», y hasta hace uno o dos años su mayor arma era «poder escribir código con más precisión que nadie».

¿Cómo ha cambiado su valor en la era de la IA? Si atendemos únicamente a la velocidad para escribir código, la IA ya los ha alcanzado. Sin embargo, **«la capacidad de evaluar con precisión el código escrito por la IA»** se ha convertido prácticamente en patrimonio exclusivo de estos perfiles.

- Persona no desarrolladora que utiliza IA: se ha implementado según mis requisitos y funciona correctamente.
- Desarrollador que utiliza IA: funciona, pero esta dependencia puede causar ciertos problemas, y mejorar este patrón de esta forma encajaría mejor con las convenciones. Revisemos también las partes relacionadas.

En el estudio de Veracode ya mencionado aparecían tasas de fallo del 86% en XSS y del 88% en Log Injection. Quienes pueden detectar y corregir esos problemas somos precisamente los especialistas como nosotros. Estos perfiles evolucionan de manera natural hacia funciones senior de control de calidad (QA) de lo producido por la IA.

Además, al ámbito de los especialistas se ha añadido un tema completamente nuevo: la **UI generativa (Generative UI)** y el **diseño de interfaces de IA**. Algunos ejemplos son las interfaces de chat que renderizan por streaming las respuestas de un LLM, los controles de abort para detenerlas a mitad de camino, el renderizado progresivo de Markdown y bloques de código, la UX que muestra inline los resultados de las llamadas a herramientas y la integración de asistentes mediante [Vercel AI SDK](https://sdk.vercel.ai/) o [MCP (Model Context Protocol)](https://modelcontextprotocol.io/). En este campo, se está disparando la demanda de «personas que conozcan con precisión cómo funciona la web y, al mismo tiempo, comprendan las características operativas de los LLM y sepan aplicarlas y aprovecharlas».


## La evolución natural hacia Product Engineer

La vía de especialización en producto es la que más se ha beneficiado. Quienes comprenden bien el mercado y a los clientes y se comunican a menudo con las partes interesadas externas han obtenido, al incorporar la IA, un arma mucho más potente. Otra característica de esta vía era que, entre los caminos hacia puestos senior, también se proponía la expansión hacia otras profesiones, como **ingeniero de growth o consultor / transición a PM, PO o CPO**.

Un cambio interesante es que el nombre de esta vía ha empezado a convertirse en un estándar global. El artículo original ya la llamaba «Product Engineer», pero cuando lo leí la expresión me resultaba algo desconocida. Un año después, se ha asentado hasta el punto de que [Vercel cambió en bloque «Fullstack Engineer» por «Product Engineer» en las descripciones de sus puestos](https://leerob.com/product-engineers).

Lee Robinson señala tres cualidades esenciales de un Product Engineer.


- **Mentalidad de iteración (Iteration)**: recorre rápidamente el ciclo despliegue → feedback → ajuste.
- **Orientación al cliente**: habla directamente con los clientes para mejorar el producto.
- **Pragmatismo**: «toda elección tecnológica no es más que un medio». Descarta sin dudar las herramientas que no contribuyan al objetivo del producto.

Aquí hay una trampa: es peligroso que el ingeniero especializado en producto sea percibido únicamente como «alguien que construye rápido». Ahora que existe la IA, el riesgo es aún mayor. «Implementar funcionalidades rápidamente» es algo que cualquier otra profesión puede hacer ya con herramientas de IA. La diferencia de un Product Engineer está en «la capacidad de definir con precisión el problema del cliente y validarlo rápidamente con la solución más pequeña», no en «tener manos rápidas».

En esta corriente, la profesión de **Design Engineer** ha empezado a ascender a la categoría de puesto formal. Vercel está contratando [ingenieros de diseño en una vía profesional formal con salarios superiores a 200.000 dólares](https://cjroth.com/blog/2026-02-18-building-an-elite-engineering-culture), y Linear y Stripe avanzan en una dirección similar. Es una profesión que elimina el propio handoff entre frontend y diseño. Como la IA dibuja rápidamente, se ha vuelto más escasa la capacidad de abordar a la vez «qué dibujar y si el resultado encaja en un sistema de diseño coherente».


## Orquestador de IA

La vía de especialización en operaciones es la que está cambiando de forma más drástica. En el artículo original de Hwidong Bae se clasificaba como **Full-Stack Engineer** y se definía como «una persona muy interesada en la estructura, la integración, las pruebas y el despliegue del proyecto, que maneja directamente API e infraestructura sencillas, cubre los vacíos de la organización y mejora los procesos». En el último año o dos, se le ha añadido **la función de operar los propios agentes de IA**, por lo que el alcance de esta vía está ampliándose rápidamente.

Al resumir las [tendencias de 2026](https://beyond.addy.ie/2026-trends/), se destacó como concepto central la **«orquestación de agentes de programación (Orchestrating Coding Agents)»**. Significa ir más allá de encargarle algo a una sola IA para diseñar y operar un sistema en el que varios agentes de IA colaboran simultáneamente. En la misma línea, también se propone codificar directamente los flujos de trabajo profesionales, las puertas de calidad y las mejores prácticas del sector en la lógica operativa de los agentes mediante un framework llamado [«agent-skills»](https://github.com/addyosmani/agent-skills).

Tras reunir los materiales relacionados, estas son, a mi juicio, las nuevas palabras clave que deben manejar los ingenieros de la vía de operaciones.

- **MCP (Model Context Protocol)**: estándar propuesto por Anthropic para conectar los LLM con herramientas externas.
- **Gobernanza de IA**: gestionar quién puede usar la IA y con qué contexto, y comprobar que no se filtren secretos.
- **Evaluación de agentes (Evaluation)**: pipeline que puntúa automáticamente los resultados producidos por un agente.
- **Puerta de IA**: verificación automática de seguridad y calidad antes de hacer merge de una PR, y etiquetado del código de IA.

El artículo original proponía como caminos senior de la vía de operaciones puestos como **ingeniero de equipo de plataforma en una organización a gran escala / tech lead / coach agile / technical program manager (TPM) / CTO**. Esos caminos siguen siendo válidos, pero ahora se les han sumado puestos como **«responsable de infraestructura de desarrollo con IA»** e **«ingeniero de productividad del desarrollador (DevProd)»**.

Mientras cada una de las tres vías evoluciona por su cuenta, hay competencias que se han vuelto más importantes en todas ellas. En un principio quería pensar a cinco años vista, pero, con la velocidad actual del progreso, incluso un año parece una unidad demasiado grande. Por eso reduciré de momento el horizonte a «el año que viene» y señalaré las competencias que, en mi opinión, cobrarán más importancia.


## Cinco competencias

**La primera es la capacidad de redactar especificaciones (Specification).** En la era de la IA, el «punto de partida de la programación» no es el teclado, sino la **especificación**. La capacidad de describir con precisión qué se le debe pedir a la IA se ha vuelto más importante que el propio código. Aquí, una especificación no es necesariamente un grandilocuente documento RFC. Puede tratarse de **pruebas** que expresan en código el comportamiento esperado de la lógica de negocio, de **stories de Storybook** que recogen los escenarios y el contrato visual de un componente de UI, o de **definiciones de tipos** que especifican el contrato del flujo de datos. En definitiva, consiste en establecer de antemano criterios que permitan verificar automáticamente lo producido por la IA; si se programa con IA sin ellos, los problemas se acumulan.

**La segunda es la capacidad de verificación y el criterio.** La IA produce con seguridad código plausible pero incorrecto. Por eso considero esencial «la capacidad de revisar el código de IA con rapidez y precisión». Se trata de detectar si faltan headers de seguridad, sanitization de inputs o tokens CSRF; si siguen funcionando la accesibilidad —ARIA, navegación con teclado y focus traps—; y si existen problemas de rendimiento relacionados con el coste de renderizado, la memoria o el tamaño del bundle. Lanzar AI slop a una PR sin revisarlo es una dejación de funciones como ingeniero. Quien pulsa el botón de merge sigue siendo una persona y no puede trasladar esa responsabilidad a la IA. Es muy probable que, en la encuesta de Stack Overflow, la confianza de los senior en la IA sea la más baja precisamente porque tienen el ojo necesario para detectar estos detalles.

**La tercera es la comprensión de sistemas y el pensamiento arquitectónico.** La IA maneja bien un archivo cada vez y posee una gran capacidad para reconocer flujos y relaciones. La IA corrige rápidamente los síntomas, pero un buen desarrollador encuentra la causa raíz. Una forma de cultivar esta competencia es realizar actividades deliberadas como una Architecture Retrospective. Como la velocidad de cambio del código ha aumentado, si no se eleva también conscientemente la comprensión del sistema por parte del equipo, la deuda cognitiva se acumula con rapidez.

**La cuarta es la capacidad de orquestar IA.** El manejo de la propia IA también se está separando como un conjunto específico de competencias. Ya no se trata simplemente de «escribir buenos prompts», sino de abordar como un todo la capacidad de dividir el trabajo en tickets pequeños, elegir qué modelo utilizar para cada tarea, diseñar pipelines de evaluación y verificación de agentes, y definir estrategias de recuperación (rollback) cuando un agente falla. [Steve Yegge](https://sourcegraph.com/blog/revenge-of-the-junior-developer) organiza esta evolución en **seis waves (traditional → completions → chat → coding agents → agent clusters → agent fleets)**.

**La quinta es Context Engineering.** Es un concepto que [Karpathy y Tobi Lütke, CEO de Shopify, empezaron a impulsar juntos a mediados de 2025](https://www.faros.ai/blog/context-engineering-for-developers) y que, en pocas palabras, consiste en «la capacidad de diseñar qué contexto mostrarle a la IA, en qué formato y en qué cantidad». En concreto, adopta formas como el trabajo con **archivos CLAUDE.md / rules**, donde se documentan las convenciones del proyecto, los principios arquitectónicos y las prohibiciones al alcance de la IA; la **reducción deliberada del contexto**, que selecciona únicamente los módulos relevantes en lugar de incorporar todos los archivos; la **separación explícita de etapas**, que divide planificación → implementación → verificación en sesiones distintas para evitar la contaminación del contexto; y el **contexto externo mediante MCP**, que conecta a través de interfaces estándar fuentes externas como sistemas de diseño, esquemas de API y datos de monitorización. [La documentación oficial de Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) lo denomina «the new prompt engineering» y afirma categóricamente que un único prompt jamás puede contener el conocimiento arquitectónico, los patrones y la tribal wisdom de un sistema. Dicho de otro modo, «diseñar de una vez un buen prompt» importa mucho menos que «diseñar un entorno en el que la IA reciba siempre un buen contexto».

Llegados hasta aquí, surge una pregunta natural. Entonces, ¿cómo se estudia todo esto en concreto? Los métodos que utilizo son, a grandes rasgos, cuatro.


## Cómo aprender

La «formación continua» señalada en el artículo original sigue siendo válida, pero debe cambiar **la distribución del tiempo de aprendizaje**.

Hay áreas a las que antes dedicábamos mucho tiempo y que ahora podemos reducir. En cambio, también existen ámbitos complejos que antes evitábamos por su dificultad o porque exigían mucho tiempo. Entre estos últimos están la redacción de especificaciones de pruebas, el uso de herramientas de medición del rendimiento ([Lighthouse](https://developer.chrome.com/docs/lighthouse), [WebPageTest](https://www.webpagetest.org/), Chrome DevTools Performance), la accesibilidad ([WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)) y la seguridad, en especial el [OWASP Top 10](https://owasp.org/www-project-top-ten/). Y hay ámbitos completamente nuevos que debemos aprender, como Vercel AI SDK, LangChain.js, MCP, los patrones de UI por streaming y los pipelines de evaluación de agentes. **Es importante reconocer qué competencias necesito y distribuir el tiempo en consecuencia.**

El código producido por la IA tiende a crecer mucho. Genera cientos de líneas por minuto. Por eso, si no se gestionan conscientemente el tamaño de las PR y el ciclo de merge, la propia revisión de código se viene abajo. Tras la adopción interna de la IA, el tamaño medio de las PR aumentó un 18%, los incidentes por PR un 24% y la tasa de fallos de cambios un 30%. Si relacionamos estas cifras con los datos anteriores, hacer cambios grandes y fusionarlos de una sola vez **dificulta comprender el flujo y reflejar la intención, por lo que es importante dividir el trabajo en unidades más pequeñas.**

Hay una cuestión directamente relacionada con el problema de la reducción de la carga cognitiva señalado en el artículo de Evan Moon. Conviene reservar una o dos horas al día para escribir código sin IA. Por ejemplo, dibujar la arquitectura a mano o leer personalmente, línea por línea, código de un ámbito poco familiar. (Yo también intento programar sin IA todos los días durante ese sopor que sigue al almuerzo. Es un tiempo que reservo para no alejarme de aquella familiaridad).

No se trata simplemente de «no olvidar la forma antigua». La razón es que la propia profundidad no crece durante el tiempo en que la IA hace el trabajo por uno. Competencias como la verificación, el criterio y la comprensión de sistemas dependen del tiempo dedicado a enfrentarse directamente a los problemas.


## Entonces, nosotros

Aunque me he extendido mucho, lo cierto es que el perfil del ingeniero frontend que sobrevive en la era de la IA no difiere tanto de la conclusión del artículo original. Estos eran los tres puntos que allí se atribuían a un buen ingeniero senior.

- Se esfuerza por **mantener unos fundamentos sólidos**. (Mantiene y refuerza continuamente las cinco competencias básicas).
- Aunque no sea un líder explícito, ejerce una influencia natural mediante una conducta ejemplar.
- No se conforma con terminar bien el trabajo asignado, sino que examina el contexto anterior y posterior y genera un gran impacto.

Aplicado a la era de la IA, quedaría así.

- Mantiene sólidos los **fundamentos** —web, sistemas y dominio— que hay más allá del código producido por la IA.
- Marca personalmente la dirección, en lugar de dejarla en manos de la IA. Incluso cuando no es la persona responsable explícita, decide «hacia dónde hay que ir».
- No utiliza la IA solo como herramienta de productividad personal, sino para eliminar los cuellos de botella del equipo y del sistema.

Si examinamos los escritos de Andrej Karpathy, una autoridad de Open AI, el núcleo del **«agentic engineering»** que ahora subraya es, en última instancia, el mismo: diseñar el sistema, especificar las restricciones y usar la IA para acelerar una implementación cuyo razonamiento ya se ha completado mentalmente. Aunque cambien las herramientas, el control de la dirección sigue en manos humanas.

El mensaje final del artículo original también era que se convierte en senior «la persona que no se conforma con terminar bien el trabajo asignado, sino que examina el contexto anterior y posterior y genera un gran impacto». En la era de la IA solo ha cambiado la definición de ese «impacto». Hay quien hace merge de una pantalla creada por la IA en una hora con un «funciona, así que vale», y hay quien dedica treinta minutos más a comprobar hasta qué punto esa pantalla es razonable en términos de accesibilidad, seguridad, rendimiento y coherencia con el sistema. Dentro de un año, se reconocerá como senior al segundo. Sobre la frontera entre el 70% —funcionamiento— y el 30% —aplicación y aprovechamiento—, sobrevivirá quien se sitúe del lado del 30%.

Espero que los ingenieros frontend que lean este artículo también se lleven su propia respuesta a la pregunta «¿qué debo estudiar ahora?». Nadie conoce la respuesta correcta, pero estoy bastante convencido de que, cuanto más programe la IA, más sobrevivirán quienes sepan ver «lo que hay más allá del código». Concluyo con la esperanza de poder volver a escribir dentro de un año sobre cuánto habrá cambiado una vez más este panorama.

**(Si dentro de un año este artículo parece demasiado obvio o anticuado, quizá signifique que hemos sabido responder bien).**


## Referencias

:::ref
:::
