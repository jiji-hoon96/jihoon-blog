---
emoji: 🔭
title: 'Observabilidad'
seoTitle: 'Observabilidad con IA: instrumentación de Sentry en el servidor, fallos silenciosos y Core Web Vitals'
date: '2026-07-03'
categories: observabilidad frontend Sentry estabilidad
description: 'En el trabajo utilizaba Sentry, pero mi blog personal no tenía monitorización de errores. Este artículo reúne lo que encontré al añadir instrumentación con IA: fallos ocultos tras respuestas 200, gray failure, una llamada a GA bloqueada durante 65 segundos y hasta datos de búsqueda.'
keywords: 'configuración de Sentry en Next.js, observabilidad frontend, diferencia entre observability y monitoring, gray failure, differential observability, timeout de GA Data API, medición de Core Web Vitals, PerformanceObserver, análisis de datos de Search Console, Sentry solo en servidor'
locale: es
translationOf: '260703'
sourceHash: fbcca6aea45957ef4f0764f5fae07c02e1481844e6db69d481df25b28077fd44
---

En este artículo quiero hablar de observabilidad.

Llevo mucho tiempo usando Sentry en el trabajo. Cuando aparece un issue, abrir el stack trace, acotar el alcance mediante releases y tags y buscar las condiciones de reproducción son tareas habituales. Sin embargo, este blog no tenía error monitoring. En mi blog personal había trabajado con herramientas de Google: Analytics para ver a los visitantes, Search Console para saber con qué búsquedas llegaban y, a partir de ahí, corregir títulos y descripciones. Es decir, tenía herramientas para observar a los usuarios, pero ninguna para ver cómo fallaba el server.

No era por desconocimiento de las herramientas. Lo había pospuesto por otro motivo. En los proyectos de la empresa bastaba con trabajar sobre instrumentation que alguien ya había instalado; en este blog tenía que decidirlo todo desde cero: qué herramienta utilizar, si colocarla en el server o en el navegador y qué considerar un fallo. Todas eran decisiones de diseño y, para tomarlas, primero debía revisar cómo funcionaba el blog. Cada vez que llegaba a ese umbral, volvía a dejarlo para más adelante.

Entonces empecé el trabajo con un agente de IA y terminó en un día. Fueron cuatro PR fusionadas y dos PR de validación que cerré sin fusionar. Pero no escribí este texto porque «terminara rápido», sino porque **al instalarlo y medir descubrí que varias cosas que creía saber eran incorrectas**.

Pensaba que el blog funcionaba bien. Las respuestas eran 200 y las páginas se mostraban correctamente. Sin embargo, tras añadir instrumentation descubrí que las estadísticas de visitantes ya llevaban tiempo quedándose vacías en silencio, mientras el server permanecía bloqueado más de un minuto antes de ellas. El valor de añadir una herramienta de observabilidad no estaba en haberla instalado, sino en conocer cosas que sin ella no había forma de descubrir.

Por eso, este artículo sigue dos caminos. Uno trata de la estabilidad del servicio y el otro, de comprender a los usuarios. Ambos acaban llegando a la misma historia.

## Empecemos por aclarar qué significa observabilidad

Monitoring y observability suelen mezclarse, pero designan cosas distintas.

Charity Majors, fundadora de Honeycomb y una de las voces que más tiempo ha guiado el debate en este ámbito, explica en [su blog](https://charity.wtf/2020/03/03/observability-is-a-many-splendored-thing/) que monitoring consiste en decidir de antemano qué comprobar y fijar umbrales: una alerta si la CPU supera el 90%, otra si la tasa de errores supera el 1%. En cambio, define observability así.

::::quote
:::translation
¿Puedes comprender qué sucede dentro del sistema —puedes comprender **cualquier** estado interno en el que el sistema pueda encontrarse— simplemente haciendo preguntas desde fuera?
:::

:::original
can you understand what is happening inside the system — can you understand ANY internal state the system may get itself into, simply by asking questions from the outside?
:::
::::

¿Podemos comprender un estado interno **arbitrario** en el que entre el sistema haciendo preguntas desde fuera? La clave es «arbitrario». Monitoring establece de antemano las preguntas; observability es la capacidad de responder también preguntas no previstas. En [otro artículo](https://www.honeycomb.io/blog/observability-a-manifesto), Majors resume la diferencia como known-unknowns frente a unknown-unknowns: lo que sabemos que desconocemos y lo que ni siquiera sabemos que desconocemos.

Lo que me ocurrió pertenecía exactamente al segundo grupo. Nunca había preguntado «¿qué pasa si falla la llamada a GA?». Ni siquiera se me había ocurrido.

Una precisión más: es frecuente presentar observability como «los tres pilares de logs, métricas y traces», pero la propia Majors ha criticado ese marco en varios textos. La documentación oficial de OpenTelemetry también habla de signals, no de pillars. Si se entiende que reunir las tres cosas basta para obtener observabilidad, es fácil terminar con todas las herramientas y sin respuestas. (Yo también empecé por una lista de herramientas y cambié de rumbo en este punto.)

## Trabajar con herramientas de observabilidad es muy difícil

Entonces, ¿qué dificultaba concretamente añadir una herramienta de observabilidad? Al repasar por qué lo había pospuesto, encontré dos tipos de dificultad.

La primera es **tener que entender cómo produce los valores el navegador**. Esto resulta especialmente cierto al observar al usuario desde el frontend. Para medir directamente el rendimiento que perciben los visitantes, por ejemplo, hay que conocer `PerformanceObserver`. Esta API restringe las combinaciones de opciones. Según MDN, la [opción buffered](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe), que recupera entradas anteriores, solo puede utilizarse con `type` y no junto con `entryTypes`. Colocar o no el script al principio de la página puede determinar que se pierdan por completo las métricas iniciales.

La propia definición de las métricas tampoco es intuitiva. CLS, que mide los desplazamientos del diseño, no suma todos los movimientos ocurridos en la página. La [documentación de CLS](https://web.dev/articles/cls) de web.dev lo define como **la mayor agrupación** dentro de las ventanas de sesión. Los movimientos separados por menos de 1 segundo forman un grupo, cuya duración máxima es de 5 segundos. Además, los que ocurren en los 500 milisegundos posteriores a una interacción del usuario se marcan con `hadRecentInput` y se excluyen, porque que un acordeón se abra al pulsar un botón no es un defecto. Si se suman manualmente sin conocer estas reglas, el resultado difiere y cuesta averiguar dónde está el error.

La composición de las métricas también cambia. FID, que medía el retraso de entrada, fue sustituido por INP [el 12 de marzo de 2024](https://web.dev/blog/inp-cwv-march-12). Se pasó de medir solo la primera respuesta de una interacción a evaluar la capacidad de respuesta de las interacciones durante toda la vida de la página.

Por supuesto, no hace falta calcularlo a mano. Se puede usar la biblioteca `web-vitals` de Google. Aun así, [su documentación](https://github.com/GoogleChrome/web-vitals) enumera trampas que persisten. Estas API no pueden mirar dentro de un iframe, por lo que en páginas con iframes los valores de la biblioteca pueden diferir de los del Chrome User Experience Report (CrUX). CLS, FCP y LCP ni siquiera se informan para páginas cargadas en pestañas en segundo plano. Al restaurar desde el back/forward cache, las métricas vuelven a enviarse. Por tanto, cuando un valor no coincide con lo esperado, distinguir entre lentitud del sitio y reglas de medición exige finalmente conocimientos del navegador.

La segunda dificultad es **decidir dónde colocar la instrumentation**. La documentación de OpenTelemetry explica con claridad esta separación. Llama zero-code instrumentation al enfoque que se instala como agente sin modificar el código fuente y [describe su alcance](https://opentelemetry.io/docs/concepts/instrumentation/zero-code/) así.

::::quote
:::translation
Normalmente, zero-code instrumentation añade instrumentation a las bibliotecas que utilizas. Esto significa que se instrumentan las solicitudes y respuestas, las llamadas a bases de datos, las llamadas a colas de mensajes, etc. Sin embargo, el código de tu aplicación no suele instrumentarse. Para instrumentar tu código, tendrás que utilizar code-based instrumentation.
:::

:::original
Typically, zero-code instrumentation adds instrumentation for the libraries you're using. This means that requests and responses, database calls, message queue calls, and so forth are what are instrumented. Your application's code, however, is not typically instrumented. To instrument your code, you'll need to use code-based instrumentation.
:::
::::

Lo que automatic instrumentation ofrece gratis es el límite de las bibliotecas: que entró una solicitud HTTP y salió una llamada a la base de datos. **Por lo general, no explica qué decisión tomó el código de la aplicación.** Eso hay que añadirlo manualmente.

Y la instrumentation que yo necesitaba era justamente la segunda. No quería saber «se llamó al client de GA», sino «la función de consulta de estadísticas del blog se tragó un fallo y devolvió un valor predeterminado».

### Qué cambió al utilizar IA

¿Qué cambió entonces la IA? Para ser claro, no tengo un grupo de control. Nunca había hecho el mismo trabajo solo, así que «un día» no debe leerse como una medida de rendimiento, sino únicamente como que bajó el umbral para empezar. Con esa salvedad, hubo dos cambios.

Uno fue no tener que **memorizar todas las reglas anteriores**. Antes, cuando un valor parecía extraño, podía perder medio día solo separando si la causa era mi código o una regla de medición. Ahora puedo llevar el valor observado y acotar «cómo se calcula esta métrica bajo estas condiciones» contrastándolo con la documentación. Naturalmente, no se puede creer sin comprobar. Mientras escribía este artículo descubrí una vez que la IA había inventado una frase convincente que no estaba en el paper. Por eso verifiqué en las fuentes originales todas las frases usadas como evidencia. Pero **saber dónde comprobar y tenerlo todo memorizado son problemas distintos**, y la carga del segundo ha disminuido claramente.

El otro cambio fue revisar juntos los puntos candidatos de instrumentation. Enumerarlos e intercambiar razones sobre por qué debían estar allí fue más rápido que hacerlo solo. Sin embargo, **decidir qué debía considerarse un fallo siguió siendo responsabilidad mía hasta el final.** Lo que viene a continuación es el registro de cómo esa decisión estaba equivocada.

## Había fallado, pero se informaba como éxito

El plan inicial era sencillo: añadir error reporting al `catch` del route handler de la API de estadísticas. Así sabría cuándo fallara la llamada a GA. Parecía razonable.

Pero al inyectar deliberadamente una clave incorrecta de cuenta de servicio en un production build local, **el error no llegó al `catch` de la route**. Cuatro bloques `catch` del módulo de consulta de estadísticas, una capa más abajo, lo atrapaban antes y devolvían valores predeterminados. El resultado era esta respuesta.

```
HTTP 200 OK
{ "slug": "/260610", "views": 0 }
```

El visitante ve 0 en las estadísticas y el server afirma que todo está bien. Sin instrumentation, no hay forma de saberlo. (Ya traté esta jerarquía en [Gestión de errores](/251117). Entonces preguntaba «¿dónde debemos atraparlo?»; ahora me encontré con «lo atrapamos y nadie lo sabe».)

Así que trasladé la instrumentation desde la route a esos cuatro puntos y añadí tags para distinguir qué consulta había fallado. Más adelante, esos tags resultaron decisivos.

### La asimetría de la observación

Yo lo llamaba algo así como «un fallo que no parece un fallo», pero descubrí que ya tenía un nombre preciso. Es el paper [Gray Failure: The Achilles' Heel of Cloud-Scale Systems](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/06/paper-1.pdf), presentado por los equipos de Microsoft y Azure en HotOS 2017.

El paper afirma que los grandes incidentes de disponibilidad en la nube no suelen ser paradas completas. Los mecanismos de recuperación que presuponen un modelo simple —un componente funciona correctamente o se detiene por completo— son inadecuados ante estas situaciones y a veces las empeoran. Define así su rasgo central.

::::quote
:::translation
Sostenemos que una característica clave del gray failure es differential observability: los detectores de fallos del sistema pueden no advertir problemas aunque las aplicaciones se vean afectadas por ellos.
:::

:::original
we argue that a key feature of gray failure is differential observability: that the system's failure detectors may not notice problems even when applications are afflicted by them.
:::
::::

Differential observability es una asimetría de observación. Una parte sufre el fallo mientras otra no lo percibe, y esta última es precisamente la responsable de detectar fallos y recuperarse. El ejemplo del paper es revelador: si el módulo que procesa solicitudes se detiene pero el de heartbeat sigue vivo, el módulo de errores que depende del heartbeat considera sano el sistema, mientras el client que solicitó el servicio considera que falló.

El paper también propone la dirección de la solución: centrarse en cerrar la brecha entre las percepciones de distintos componentes sobre qué constituye un fallo. Bajar la instrumentation de la route a la capa inferior hizo exactamente eso.

## Y entonces capturó un incidente real

El primer issue real de production después de añadir instrumentation es la siguiente escena.

Una llamada a GA fallaba con `DEADLINE_EXCEEDED` tras **65.877 segundos**. Por la estructura anterior, la respuesta seguía siendo 200. La página principal usa rendering dinámico y transmite el área de estadísticas por streaming, así que la página aparece enseguida. En cambio, **esa zona permanece cargando más de un minuto y luego se rellena silenciosamente con 0.**

Al investigar la causa, encontré esto en el archivo de configuración de la biblioteca client de GA.

```json
"RunReport": { "timeout_millis": 60000, "retry_params_name": "default" }
```

El timeout RPC predeterminado de la biblioteca es de 60 segundos. Mi código no lo sobrescribía en ninguno de los cinco puntos de llamada. En ese momento interpreté los 65.877 segundos observados como 60 segundos más sobrecarga de conexión y del load balancer. (Más adelante esa interpretación se tambalea.)

Aprendí que no era un error exclusivamente mío, sino una clase de error sobre la que existen muchas advertencias. El [artículo oficial de gRPC sobre deadlines](https://grpc.io/blog/deadlines/), escrito por Gráinne Sheerin del equipo Google SRE, empieza bajo el título con «TL;DR: Always set a deadline». Explica que sin deadline todas las solicitudes en curso pueden retener recursos hasta el timeout máximo, agotando memoria, aumentando la latencia y, en el peor caso, matando el process. Mi client de GA también se basa en gRPC: la documentación ya advertía del mismo principio, pero yo no lo había aplicado en las llamadas.

La corrección consistió en fijar el timeout en 5 segundos y pasarlo a los cinco puntos. Después levanté un server TCP local que no respondía para reproducirlo de manera concluyente.

| Condición | Tiempo transcurrido | Mensaje de error |
|---|---|---|
| Sin timeout especificado (antes) | **60.04 segundos** | `Deadline exceeded after 60.000s` |
| `timeout: 5000` (después) | **5.00 segundos** | `Deadline exceeded after 5.000s` |

Las cifras se comportaron exactamente como se describía. Solo después de obtener esta tabla pude afirmar que había confirmado que la configuración de timeout llegaba realmente al código. (Antes solo era la conjetura «debe ser porque no hay timeout». Como se verá, aquello no confirmaba la causa en production.)

Una cosa más: el número 5 no tiene una base propia. No había medido la distribución de latencia de GA cuando funcionaba bien, así que 5 segundos fue una elección prácticamente arbitraria. Pero la dirección sí tenía apoyo. En el capítulo 3, [Embracing Risk](https://sre.google/sre-book/embracing-risk/), el libro de Google SRE afirma que 100% nunca es el objetivo de fiabilidad correcto: además de inalcanzable, suele superar la fiabilidad que los usuarios desean o perciben. El número de visitantes es información complementaria en este blog. Para la experiencia del visitante es mejor abandonar pronto y dibujar el valor predeterminado que obtener la cifra exacta. Decidí, en suma, no fijar el objetivo de fiabilidad en 100%.

## Volví a medir después de creer que estaba arreglado

Este iba a ser el final original del artículo. Había encontrado la causa, la había reproducido y la había corregido.

Pero mientras escribía volví a abrir la lista de issues por costumbre. En la release que incluía el commit de la corrección se habían acumulado más de cien `DEADLINE_EXCEEDED` del mismo tipo. El más reciente era de hacía pocas horas.

Extraje los últimos 100 y observé la distribución de sus tiempos informados. Conviene precisar que este valor no es el tiempo que GA dedicó realmente a responder. Es el wall-clock time —tiempo transcurrido real— desde que se establece el deadline hasta que el timer se dispara de verdad. Esta distinción será importante.

![Distribución de tiempos informados de 100 DEADLINE_EXCEEDED posteriores a la corrección del timeout](2.png?w=720)

Se interpreta así. **El límite inferior se respetó.** Ningún caso terminó antes de 5 segundos; el más corto fue 5.16 segundos. Frente a los 60 segundos reproducidos sin sobrescribir el límite, el valor de 5 segundos sí llegaba al código. Pero el extremo superior alcanza 8 minutos y 24 segundos, y la mediana es 61 segundos. Lo más extraño es que los valores no se concentran en ningún tramo. Si la causa fuera una respuesta lenta de GA, deberían acumularse cerca del límite, pero no lo hacen.

Los tags revelaron más. Entre los 100 casos solo aparecían `stats` y `popular`, normalmente por parejas. Ambos caminos tienen algo en común: **son rutas de revalidación detrás de una cache de una hora.** En cambio, las otras dos rutas (`page`, `pages`), que reciben solicitudes sin cache y llaman a GA en ese momento, no aparecen ni una vez.

Esto es importante: el fallo no sucede mientras se atiende la solicitud del visitante, sino **solo durante el trabajo de rellenar de nuevo la cache después de completar la respuesta**.

La observación cuestiona una frase de la sección anterior. Escribí que el área de estadísticas permanecía cargando más de un minuto; si el fallo solo ocurre después de responder, quizá el visitante nunca esperó ese tiempo. La primera solicitud con la cache vacía sería distinta, pero los datos actuales no permiten distinguir los casos. Había otra frase escrita sin medir.

Hay otro detalle. Antes interpreté los 65.877 segundos como un timeout de 60 segundos más sobrecarga, pero al volver a abrir los campos de sobrecarga de aquel evento sumaban apenas unos 2 milisegundos. Vista ahora, esa interpretación también tenía poco fundamento. El mismo tipo de inflación podría haber estado presente entonces.

Mi hipótesis actual es la siguiente. El blog funciona sobre funciones serverless, cuyo entorno de ejecución se congela después de enviar la respuesta hasta la próxima invocación. Si el timer se detiene también y se dispara tarde cuando la función despierta, puede registrarse un valor inflado de wall-clock time que no representa una espera real. Esto explicaría tanto que el límite inferior se pegue exactamente a 5 segundos como que los valores superiores no se concentren. También encaja con que los fallos solo aparezcan en trabajos posteriores a la respuesta.

Sin embargo, hay que ser cautos otra vez. **Que una distribución no contradiga una hipótesis no equivale a que la respalde.** Hay varios escenarios donde un timer se dispara tarde. Además de la congelación serverless, un rendering pesado podría haber ocupado el event loop o el container podría haber limitado la CPU. Los tres generan la misma forma de distribución, por lo que el gráfico no reduce los candidatos.

También mantengo otra explicación. La configuración de la biblioteca asigna un presupuesto total de 600 segundos incluidas las reintentos, y el máximo observado de 504 segundos cabe dentro. Sin embargo, la lista de códigos reintentables del método está vacía, por lo que parece no seguir esa ruta. En cualquier caso, **sigue siendo una hipótesis sin verificar.** Elegir cómo comprobarla tenía otra trampa. Primero pensé medir la hora justo antes y después de la llamada, pero no respondería la pregunta: wall-clock time sigue avanzando mientras la función está congelada y solo reproduciría el dato existente. Lo que separa las posibilidades es **el tiempo de CPU durante el mismo intervalo**. Si transcurren 61 segundos de wall-clock time con un tiempo de CPU casi nulo, la función no estuvo esperando, sino detenida. Ese parece ser el siguiente trabajo.

Dejé esta sección deliberadamente por un motivo. Creía haber arreglado el problema. Lo había reproducido e incluso creado una tabla, así que me parecía seguro. Al abrirlo de nuevo, no lo estaba. Añadir instrumentation es una tarea puntual; observability consiste en seguir midiendo. Confundir ambas cosas conduce exactamente al error que cometí.

Un detalle más: no obtuve la lista de issues, la distribución de tags y los tiempos abriendo el dashboard, sino preguntando al agente. Sentry ofrece un [server MCP oficial](https://github.com/getsentry/sentry-mcp); al conectarlo se pueden consultar issues y eventos directamente desde el editor. Pude colocar los problemas de production junto al código sin varias rondas de clics. **No solo ha bajado el coste de añadir instrumentation, sino también el de consultar los datos acumulados.**

## Instalarlo y utilizarlo son trabajos diferentes

Al llegar aquí hice una cosa más: volví a recorrer la documentación desde el principio para saber hasta dónde podía utilizar la herramienta. Al final, lo decisivo en esta investigación fue un solo tag que había añadido casi de paso durante la instrumentation. Si algo tan casual ofreció tanto valor, ¿qué preguntas responderían las funciones activadas deliberadamente?

![Capas de preguntas que Sentry puede responder y alcance habilitado en este blog](3.png?w=720)

**Releases y commits** forman la primera capa. Este blog adjunta el hash del commit desplegado como release, así que sé desde qué despliegue empezó un problema. El paso siguiente sería subir con la release la lista de commits para activar [suspect commits](https://docs.sentry.io/product/issues/suspect-commits/). Este sistema consulta la información de blame del archivo y la línea de cada application frame del stack trace y señala como sospechoso el commit más reciente si tiene menos de un año. Después propone a su autor como responsable o incluso lo asigna automáticamente. [Asociar commits con una release](https://docs.sentry.io/product/releases/associate-commits/) también puede marcar un issue como resuelto en esa release usando el ID incluido en un mensaje de commit. Este blog ya sube source maps, por lo que tiene media base preparada, pero no había asociado los commits.

Las **reglas de propiedad** tienen poca utilidad en un blog personal, pero su estructura es interesante. La [documentación](https://docs.sentry.io/product/issues/ownership-rules/) muestra cómo asignar responsables o equipos haciendo matching con globs de Unix sobre rutas de archivo, módulos, URL de solicitudes o valores concretos de tags: `path:src/api/*` para el equipo backend, por ejemplo. Al verlo pensé que no era una función para enrutar alertas, sino **un mecanismo para expresar la propiedad como código**. Si cada issue requiere que una persona decida quién debe mirarlo, en los días ocupados nadie lo hará.

**Tracing** responde preguntas de otra naturaleza. La [documentación de Sentry](https://docs.sentry.io/concepts/key-terms/tracing/) define un trace como un registro de eventos y operaciones conectados procedentes de una aplicación, y un span como una sola operación con nombre y duración. Sigue una solicitud por varios servicios, bases de datos y funciones para ver **cuánto tiempo consumió cada tramo**. Si error reporting responde «¿qué se rompió?», tracing responde «¿dónde desapareció el tiempo?». Mi bloqueo en la sección anterior pertenecía exactamente al segundo caso. Para distinguir si el tiempo informado era una espera real, necesitaba el inicio y el final del tramo de la llamada. Para ahorrar costes, este blog solo muestrea el 10% de los traces, una decisión que lamenté aquí.

Y el **monitor de tareas programadas** es la carta que mejor encaja con el argumento del artículo. Error reporting solo captura lo que ocurrió; no puede capturar lo que no ocurrió. Un monitor Cron anuncia que la tarea está en curso al empezar y comunica éxito o fallo al terminar. Lo importante es el tercer estado. La [documentación](https://docs.sentry.io/product/crons/job-monitoring/) clasifica por separado como ejecución perdida (missed) la ausencia de una señal en el momento previsto. Aquí entran una configuración incorrecta del scheduler o una tarea que ni siquiera comenzó.

No era un asunto ajeno. Cada lunes, este blog recopila automáticamente datos de Search Console. Toda una capa de observabilidad, descrita después, descansa sobre esa tarea. Pero si una semana no se ejecuta silenciosamente, hoy no tengo forma de saberlo. No falló: **no ocurrió nada**, por lo que no hubo error. El propio mecanismo que reúne datos de observabilidad tenía un punto ciego.

En resumen, instalar una herramienta puede llevar un día, pero ampliar las preguntas que responde es trabajo continuo. No se decide qué capa activar leyendo una lista de funciones. **Primero hay que decidir qué se considera un fallo; solo entonces se sabe qué capa hace falta.** En este blog, reconocer «la recopilación semanal no se ejecutó» como fallo creó una capa más que activar.

## Cuando una opción no hace lo que sugiere la documentación

Quiero dejar constancia de otro caso tangencial, de naturaleza algo distinta.

Después de subir los source maps, debía borrar los archivos `.map` de los artefactos del build por su tamaño. Los source maps del server ocupaban **57MB**, más que el JS del server (15MB), y dejarlos los incluiría enteros en el bundle de la función desplegada. Había una opción que eliminaba source maps tras subirlos, así que la activé.

Pero al medir, los 57MB de archivos `.map` del server seguían allí justo después de la subida. La opción solo borraba el directorio de artefactos estáticos y no tocaba el directorio del server que ocupaba el espacio. Al final cambié a especificar directamente las rutas que debían eliminarse.

Por la misma razón, hice que los logs de subida se conservaran de forma condicional. Si se desactivan siempre, un token caducado puede hacer fallar toda la subida en silencio y nadie lo sabrá hasta encontrar el siguiente stack trace ilegible.

No es un problema de detección de fallos, sino una discrepancia entre el nombre y el alcance real del comportamiento, así que no lo agrupo bajo gray failure. Pero la lección apunta al mismo sitio: **leer la documentación y activar una opción no es lo mismo que verificar que hizo lo esperado.**

## Los errores no son lo único que se observa

Hasta aquí, la parte de estabilidad. Sin embargo, gestionar bien la información de observabilidad no solo sirve para detectar incidentes. Pasemos al otro camino anunciado al principio: comprender a los usuarios.

La definición de fiabilidad de OpenTelemetry expresa bien la transición. La fiabilidad responde si «un servicio hace lo que los usuarios esperan que haga». El criterio no es una métrica del server, sino **las expectativas del usuario**. Por tanto, también hay que medir lo que realmente experimentan los usuarios.

Este blog observa finalmente tres capas.

![Las tres capas de observación de este blog: errores, rendimiento percibido y comportamiento de búsqueda](4.png?w=720)

Cada capa responde una pregunta distinta. La primera dice qué se rompió; la segunda, cuánto esperó el visitante; la tercera, con qué búsquedas llegó en primer lugar.

En la segunda capa hubo una decisión importante. El rendimiento puede medirse abriendo la página en un entorno controlado u observando a todos los visitantes reales. web.dev llama lab data al primer método y field data al segundo, y en su [documento sobre las diferencias](https://web.dev/articles/lab-and-field-data-differences) recomienda priorizar con field data cuando se dispone de ambos, porque representa la experiencia real. Aunque Lighthouse dé una buena puntuación, la distribución entre visitantes puede ser distinta. Por eso este blog no se limita a medir una puntuación, sino que envía valores de usuarios reales a GA4.

La referencia procede de la [documentación de Web Vitals](https://web.dev/articles/vitals) de web.dev: LCP no superior a 2.5 segundos, INP de 200 milisegundos o menos y CLS de 0.1 o menos, evaluados en el percentil 75 de las cargas, por separado en móvil y escritorio. Es decir, se observa el límite que supera el 25% más lento, no la media. (Solo al entender este criterio comprendí que la media borra por completo a los usuarios lentos.)

### La posición bajó, pero aumentaron los clics

La tercera capa, los datos de búsqueda, volvió a dar la vuelta a mis expectativas.

El blog recopila periódicamente datos de Search Console y compara los últimos 28 días con los 28 anteriores. Un artículo antiguo destacó entre los datos acumulados.

![Comparación de 28 días de un artículo en Search Console: empeoraron impresiones y posición, pero aumentaron mucho los clics y el porcentaje de clics](5.png?w=720)

Las impresiones cayeron un 11% y la posición media pasó de 8.9 a 11.6. Con solo esas dos métricas, el artículo había empeorado. Sin embargo, los clics subieron de 2 a 13 y el porcentaje de clics pasó del 0.87% al 6.37%.

Primero conviene rebajar la emoción. El patrón no resulta extraño para quien trabaja con datos de búsqueda. La posición media está ponderada por impresiones: si desaparecen impresiones de buena posición en las que nadie hacía clic, la posición media empeora y el porcentaje de clics sube mecánicamente. Un simple cambio en la composición de las consultas puede parecer un vuelco. Además, el aumento absoluto fue de 11 clics en 28 días, una cifra pequeña.

Aun considerándolo, queda algo. Más personas llegaron al artículo y no lo habría sabido mirando solo impresiones y posición. Lo que obtuve no fue una conclusión sobre ese artículo, sino que **la métrica elegida puede invertir la conclusión**. Si el resultado fuera la posición, habría que corregirlo; si fueran los clics, fue un éxito. Es la misma idea que la definición de fiabilidad anterior: al poner el criterio del lado del usuario, cambia lo visible.

Durante mucho tiempo he corregido títulos y descripciones del blog, reescribiendo el texto que aparece en los resultados según consultas reales. Las cifras no demuestran el efecto de ese trabajo. La estacionalidad o un cambio en la composición de consultas, entre otros factores, podrían explicar perfectamente un mayor porcentaje de clics con peor posición. Pero **sin medir, ni siquiera habría sabido que se produjo un cambio en esa dirección.**

### La decisión de renunciar a 79KB

Hay una decisión imprescindible al hablar de las tres capas: no añadir instrumentation en el navegador.

Quería activar client error monitoring. Me preocupaba seguir sin ver errores exclusivos del navegador. Así que lo activé y medí el bundle. Estos son los totales gzip del JS de client en clean builds.

| Configuración | client JS (gzip) | Incremento |
|---|---|---|
| Sin activar | 181.6 KB | Referencia |
| **Solo server (actual)** | **182.3 KB** | **+0.7 KB** |
| Con client | 260.4 KB | +78.8 KB |

La instrumentation del server era prácticamente gratuita, pero la del navegador exigía 78.8KB. Probé también opciones de optimización del bundle, sin cambiar las cifras. La única forma de reducir el coste del client era omitir por completo el archivo de inicialización del navegador.

Vista ahora, la medición tiene un defecto. Que una opción no reduzca ni un byte podría indicar que no funcionó, pero entonces solo lo interpreté en favor de la conclusión. También sumé todos los artefactos estáticos, algo distinto de lo que descarga un visitante. Por tanto, lo preciso no es «la observabilidad del navegador cuesta 79KB», sino **«con mi configuración, no conseguí bajarla de ahí».**

El propósito de adoptar la herramienta era capturar llamadas que fallaban silenciosamente en el server, y esa parte era gratuita. En este blog, el rendimiento de carga es experiencia de usuario y también requisito para la visibilidad en búsquedas, así que renuncié. Lo interesante es cómo enlaza con la sección anterior: **cuando la fiabilidad se define según las expectativas del usuario, aumentar la observabilidad no siempre es correcto.** La propia observabilidad puede perjudicar la experiencia.

Pero esto parece contradecir mi lamento por reducir el muestreo de traces al 10%. Ambas decisiones limitaron la observabilidad por coste; ¿por qué una fue lamentable y otra acertada? El criterio que organicé después es **quién paga el coste**. Al reducir el muestreo ahorré en mi factura, mientras los 78.8KB adicionales cuestan datos y tiempo a los visitantes. Si lo pago yo, suele convenir comprar más; si lo paga el usuario, debo preguntar qué le devuelve esa observación.

## ¿Qué debe activar una alerta?

Al instalar instrumentation surge inmediatamente la pregunta siguiente: ¿dónde colocar alertas?

Un documento temprano de Google SRE escrito por Rob Ewaschuk, [My Philosophy on Alerting](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic), establece que una alerta a una persona debe ser urgente, importante, accionable y real. Recomienda alertar sobre síntomas y no sobre causas: señales externas como respuestas 500 o errores visibles para el usuario.

Sin embargo, existe una tensión sutil entre ese principio y mi experiencia. **Mi síntoma no era un 500.** Era un 200 con estadísticas vacías. Las alertas basadas en síntomas presuponen que el fallo aparece en el status code; differential observability es precisamente la situación que rompe esa premisa.

No creo que haya que refutar el principio. Más bien concluí que **definir qué se considera un síntoma es la parte verdaderamente difícil**. En este blog, el síntoma no era el status code, sino «la función de estadísticas devolvió un valor predeterminado», algo que solo podía convertirse en síntoma mediante instrumentation manual.

Otro consejo del mismo documento merece recordarse: inclinarse por borrar las alertas ruidosas, porque resolver exceso de monitoring es más difícil que resolver su escasez. Como referencia, el libro de SRE incluye **el propio fallo de monitoring** entre los triggers para redactar un postmortem. La decisión de conservar logs condicionales para que la subida de source maps no fallara en silencio apuntaba en la misma dirección.

## Por qué importa aún más en la era de la IA

Llegados aquí surge una pregunta natural. ¿No se trata simplemente de instalar bien herramientas de observabilidad? ¿Qué relación tiene con la IA?

Creo que la relación es grande, por dos razones.

Primero, los datos del sector lo indican. El [informe DORA 2025](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report), dirigido por Nathen Harvey y Derek DeBellis, se basa en una encuesta a cerca de 5.000 profesionales tecnológicos de todo el mundo y más de 100 horas de datos cualitativos. Señala una relación positiva entre adopción de IA y throughput y resultados de producto, y añade inmediatamente esta frase.

::::quote
:::translation
Sin embargo, la adopción de IA sigue manteniendo una relación negativa con la estabilidad de la entrega de software.
:::

:::original
However, AI adoption does continue to have a negative relationship with software delivery stability.
:::
::::

La relación con la estabilidad de entrega sigue siendo negativa. Se gana velocidad y también inestabilidad. En [otro artículo de análisis](https://dora.dev/insights/balancing-ai-tensions/), DORA explica el mecanismo: el tiempo ahorrado en generación se reasigna a sobrecarga de verificación, mientras también aumenta el ritmo al que se crea código que debe revisarse. El resumen del mismo informe lo expresa mejor: la IA no arregla al equipo; amplifica lo que ya existe. Si solo aumenta la velocidad de despliegue sin observabilidad, lo que se amplifica son fallos silenciosos.

Segundo —y esto me dejó una impresión más profunda—, hay pruebas de que **no podemos fiarnos de nuestra sensación subjetiva**. Un [estudio de METR de 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) entregó 246 issues reales a 16 desarrolladores experimentados de open source y asignó aleatoriamente en cada issue si se permitía utilizar IA.

::::quote
:::translation
Cuando se permite a los desarrolladores utilizar herramientas de IA, tardan un 19% más en completar los issues…
:::

:::original
When developers are allowed to use AI tools, they take 19% longer to complete issues…
:::
::::

Lo verdaderamente llamativo viene después. Antes, los desarrolladores preveían que la IA los haría un 24% más rápidos y, **incluso después de experimentar la ralentización, creían haber sido un 20% más rápidos.** Ya cité el estudio al escribir [Ingeniero frontend con IA](/260302), entonces en el contexto de la productividad. Ahora lo leo de otra forma. No es una razón para no usar IA, sino **una prueba de que la percepción difiere de la realidad**.

Y si no podemos confiar en la percepción, solo queda una vía: medir. Sentía que el blog funcionaba bien, pero al medir encontré una llamada a GA bloqueada más de un minuto. Sentía que la había arreglado, pero al volver a medir descubrí que aún no había terminado.

## También se amplía el objeto de la observabilidad

Por último, quiero señalar una tendencia reciente.

Está cambiando aquello que debemos observar. OpenTelemetry está organizando semantic conventions para IA generativa en un [repositorio separado](https://github.com/open-telemetry/semantic-conventions-genai), donde la instrumentation abarca no solo clients de GenAI, sino también llamadas MCP (Model Context Protocol). Es una fase temprana y el schema aún se está definiendo, así que no creo que sea momento de recomendar su adopción. Pero la dirección es clara: al conectar herramientas a agentes de IA, sus llamadas también se convierten en objeto de observabilidad. Expliqué MCP en [Herramientas para agentes de IA](/260529) y hablé de evals en [Harness(Systems) Engineering](/260622); parece que aquí se encuentran ambos temas.

Los servicios de error monitoring avanzan en la misma dirección. Sentry ofrece un agente de debugging con IA llamado [Seer](https://docs.sentry.io/product/ai-in-sentry/seer/), que, según explica, combina detalles de issues con contexto de traces, logs y perfiles para encontrar la causa raíz e incluso crear una PR de corrección. Aún no lo he usado a fondo y tampoco encontré cifras oficiales de precisión, por lo que no puedo afirmar nada sobre su rendimiento. Pero sigue claramente la misma dirección que mi experiencia al abrir issues mediante MCP: está bajando el coste de interpretar los datos de observabilidad.

## Para terminar

En resumen:

Trabajar con IA redujo de verdad el umbral para añadir herramientas de observabilidad. Una tarea pospuesta durante mucho tiempo terminó en un día, y la carga de conocimiento —como entender cómo produce las métricas el navegador— ya no es tan grande. Pero lo que obtuve no fue una herramienta. Fue descubrir que todas mis suposiciones eran erróneas: que bastaba con capturar el `catch` de la route, que una opción haría lo que indicaba su nombre y que añadir un timeout significaba haber terminado. Ninguna podía conocerse antes de medir.

Así llegué a entender observability de esta manera: es una herramienta para hallar la causa de un incidente, pero antes de eso es **una herramienta para medir la brecha entre mi percepción del sistema y su realidad**. Tomando la expresión del paper sobre Gray Failure, consiste en cerrar la brecha entre lo que distintos sujetos consideran un fallo. Esa brecha existe tanto en la estabilidad como en lo que viven realmente los usuarios.

Cuanto más barata sea la generación, más fácil es que la brecha se amplíe. Aumenta la velocidad de creación, pero no necesariamente la de verificación. Por eso últimamente pienso que la observabilidad es lo que necesito para utilizar la IA de forma más activa. Parece el orden inverso, pero si podemos crear rápido, también debemos poder comprobar rápido.

Naturalmente, estas observaciones proceden de la pequeña escala de un blog personal. Con otro tráfico y otro tamaño de equipo, las decisiones cambiarían. En otro servicio podría ser correcto decidir lo contrario sobre los 78.8KB. No parece un terreno con una sola respuesta. Pero sí puedo afirmar algo: sentir que un sistema funciona bien y que funcione bien de verdad son cosas distintas, y la única manera de conocer la diferencia es medir. Espero que quienes lean esto piensen qué creen sobre sus propios servicios sin haberlo medido, y qué creen haber arreglado sin volver a abrirlo.

:::ref
- [docs] [OpenTelemetry, Observability Primer](https://opentelemetry.io/docs/concepts/observability-primer/)
- [docs] [Google SRE Book, Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [docs] [Google SRE Book, Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [docs] [Google SRE Book, Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [docs] [web.dev, Interaction to Next Paint](https://web.dev/articles/inp)
- [article] [Martin Fowler, CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html)
:::
