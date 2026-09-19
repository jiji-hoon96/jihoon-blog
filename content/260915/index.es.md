---
emoji: 🧮
title: 'CPU y memoria del navegador'
seoTitle: 'Hilo principal y memoria del navegador: long tasks y LoAF'
date: '2026-09-15'
updatedAt: '2026-09-19'
categories: observabilidad frontend navegador
description: 'Qué muestran las long tasks, TBT, LoAF, JS Self-Profiling, las API de memoria y los crash reports, comprobado con Lighthouse y cabeceras de este blog.'
keywords: 'hilo principal del navegador, long task 50ms, Long Animation Frames API, Total Blocking Time, JS Self-Profiling API, profiling de navegador en Sentry, measureUserAgentSpecificMemory, fuga de memoria en el navegador'
locale: es
translationOf: '260915'
sourceHash: a6c2a00e7d6b4f9d29de83090c3f3b829145afc5d29df4b16fd073292c191961
---

En esta publicación quiero hablar de cómo observar el hilo principal y la memoria del navegador.

En [la publicación anterior](/260914) seguí la red, el renderizado y las Web Vitals para ver los valores que el navegador deja sobre la carga y la interacción. Pero cuando se escarba en por qué esas métricas empeoraron, casi siempre se llega a uno de dos lugares. O el hilo principal estaba ocupado con otra cosa y no pudo atender la entrada y el renderizado a tiempo, o la memoria se fue acumulando hasta que la página se volvió lenta o acabó muriendo.

Estas dos áreas son más difíciles de observar que las Web Vitals. La mayoría de las API son exclusivas de Chromium, algunas solo se activan cambiando una cabecera de respuesta y ciertas señales, por su propia estructura, no pueden llegar a JavaScript. En la tabla de funciones de Sentry de [la primera publicación de la serie](/260913) dejé para este artículo la decisión sobre el profiling en el navegador, y aquí también desgloso sus condiciones.

Lo que comprobé personalmente fueron dos ejecuciones de Lighthouse, las cabeceras de respuesta de producción y los archivos de build de `web-vitals` instalados. Adelanto la conclusión: este blog solo ve el contorno de su hilo principal mediante mediciones de laboratorio (lab) y no tiene ningún medio para ver la memoria ni los crashes.

## Qué significa que el hilo principal esté ocupado

El hilo principal del navegador procesa en una sola fila la ejecución de JavaScript, el cálculo de estilos, el layout y la gestión de la entrada del usuario. Mientras corre una tarea, nada más puede colarse, así que si el usuario pulsa un botón en ese intervalo, el evento de entrada espera a que la tarea termine.

El umbral que acota esa espera es 50ms. La [especificación de la Long Tasks API](https://w3c.github.io/longtasks/) del W3C define como long task a una tarea que ocupa el hilo principal durante más de 50ms (la introducción dice "50ms or more", así que la forma de expresar el límite varía un poco), y también explica por qué. Para responder a una entrada en menos de 100ms, la tarea que se estaba ejecutando en el momento de la entrada debe terminar en 50ms, y la tarea que procesa esa entrada también debe terminar en 50ms.

### TBT suma el exceso de las long tasks

Si solo se cuentan, una tarea de 60ms y otra de 600ms valen lo mismo, así que las herramientas de lab usan Total Blocking Time (TBT). Según el artículo de web.dev sobre TBT, el blocking time de una long task es la parte que supera los 50ms, y TBT es la suma de los blocking times de las long tasks posteriores a FCP. Por defecto, Lighthouse solo cuenta hasta TTI (Time to Interactive).

![Figura con cinco tareas en la línea de tiempo del hilo principal, donde las tres que superan 50ms muestran excesos de 200, 40 y 105ms](1.png?w=720)

(Fuente de la figura: [web.dev, Total Blocking Time (TBT)](https://web.dev/articles/tbt), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), SVG convertido a PNG con fondo blanco)

La parte amarilla son los primeros 50ms de cada tarea y la parte roja es el blocking time. En el ejemplo del mismo artículo, las tareas suman 560ms de ejecución, pero TBT es 345ms. Las tareas de menos de 50ms no aportan nada a TBT, por muy a menudo que aparezcan.

### TBT no puede sustituir a INP

TBT es una métrica de lab, y la métrica de capacidad de respuesta de Core Web Vitals es INP. El [artículo de web.dev sobre INP](https://web.dev/articles/inp) marca el límite: en herramientas de lab que solo miran la carga, sin interacción, TBT puede ser un proxy razonable, pero no un reemplazo.

Esto se debe a que TBT no sabe cuándo pulsó el usuario ni qué. Aunque el hilo principal esté muy bloqueado, INP puede ser bajo si el usuario pulsa después de que terminen los scripts. Una long task puede alargar INP por varios caminos. Si el propio handler es largo, crece el processing duration; si el renderizado posterior es largo, crece el presentation delay. De ellos, el camino más directamente ligado a TBT es alargar el input delay que vimos en la publicación anterior en tanto tiempo como le quede a la tarea que estaba en ejecución en el momento de pulsar. Por eso un TBT bajo solo dice "el hilo principal no estuvo muy bloqueado durante la carga". Para saber qué bloqueó una entrada real hay que mirar tareas y frames en field.

## Long Tasks y Long Animation Frames

Hay dos API del navegador para ver el hilo principal en field: la Long Tasks API (`PerformanceLongTaskTiming`), disponible desde Chrome 58, y la Long Animation Frames API (`PerformanceLongAnimationFrameTiming`, LoAF para abreviar), lanzada en Chrome 123. Ambas se suscriben mediante :term[PerformanceObserver]{key="performance-observer"}.

### LoAF es una alternativa, no un reemplazo

El artículo del equipo de Chrome sobre LoAF (fuente de la figura de más abajo) presenta LoAF como un "update" y una "alternative" a la Long Tasks API, y en su FAQ responde que "at this time, there are no plans to deprecate the Long Tasks API". En los datos de compatibilidad de MDN, `PerformanceLongTaskTiming` tampoco lleva marca de deprecated; ambas API son experimental, y ni Firefox ni Safari las soportan.

La razón por la que hacía falta una API nueva es la atribución (attribution). Según el mismo artículo, la atribución de la Long Tasks API "at best only tells you the container", es decir, llega a indicar si fue el documento de nivel superior o algún iframe, pero no dice qué script consumió el tiempo.

LoAF no reporta como entry una tarea individual, sino **un frame cuya actualización de renderizado se retrasó más de 50ms**. También lo detecta cuando varias tareas cortas y el renderizado suman juntos más que el umbral.

### blockingDuration y atribución de scripts

El campo de LoAF que conecta directamente con INP es `blockingDuration`. Suma el exceso sobre 50ms de las tareas del frame, pero a la tarea más larga le incluye también el tiempo del renderizado final. En el ejemplo del artículo, cuando a tareas de 55ms y 65ms les sigue un renderizado de 20ms, `duration` es de unos 140ms y `blockingDuration` es (55 - 50) + (65 + 20 - 50) = 40ms. Es como llevar la idea de TBT del tramo de carga a los frames de toda la página.

![Figura con varios long frames en la línea de tiempo de una página, donde el frame que se solapa con la interacción elegida como INP aparece resaltado con una línea de puntos](2.png?w=720)

(Fuente de la figura: [Chrome for Developers, Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), redimensionada)

En una página aparecen muchos long frames, pero el que explica el valor de INP es el frame que se solapa con la interacción de INP. El array `scripts` de ese frame contiene, por cada script que se ejecutó más de 5ms, el punto de invocación, la URL de origen y el tiempo de ejecución. Aquí aparece el "quién" que le faltaba a la Long Tasks API.

Eso sí, la atribución de scripts solo se aplica al hilo principal y a los iframes same-origin. Los iframes cross-origin, los workers y el código de extensiones no tienen nombre aunque alarguen un frame. El trabajo dentro del iframe de comentarios de utteranc.es en las páginas de artículos de este blog no queda atribuido ni siquiera con LoAF.

### Este blog no recolecta LoAF

También hay una forma de usar LoAF sin suscribirse directamente. `web-vitals` incorporó "Add INP breakdown timings and LoAF attribution" en su [changelog de la v4.0.0 (2024-05-13)](https://github.com/GoogleChrome/web-vitals/blob/main/CHANGELOG.md), y más tarde añadió el script más largo (`longestScript`) y los totales de tiempo de script, layout y paint. Pero esto solo viene en el build de atribución (`web-vitals/attribution`).

Como vimos en la publicación anterior, el `src/components/WebVitalsReporter.tsx` de este blog usa el build estándar mediante `import('web-vitals')`. **Recolecta el valor de INP, pero no qué script bloqueó ese INP.** En el `web-vitals@6.2.1` instalado, la cadena `long-animation-frame` aparece 0 veces en `dist/web-vitals.js` y 1 vez en `dist/web-vitals.attribution.js`. El build estándar ni siquiera registra un observer de LoAF. (Este hecho vuelve a ser importante en la sección sobre memoria)

Según el [README](https://github.com/GoogleChrome/web-vitals#attribution-build), el build de atribución pesa unos 1,5K más en brotli, pero lo que me hizo dudar fue más el destino que el tamaño. No he comprobado si con el tráfico de este blog saldría en GA4 una distribución por script con sentido, así que decidí mirar primero el lab antes de ampliar la recolección.

## Las long tasks que aparecieron en este blog

Así que ejecuté una página de artículo en el lab. Lighthouse 12.8.2 (`npx lighthouse@12`), Chrome headless en local, el form factor mobile por defecto, simulated throttling (RTT 150ms, 1638,4kbps, CPU ralentizada 4 veces), con `https://hooninedev.com/260914` como objetivo, dos ejecuciones con 25 minutos de diferencia el 2026-09-16.

| Elemento | 1.ª ejecución (08:46:15Z) | 2.ª ejecución (09:11:01Z) |
|---|---|---|
| Performance score | 0,92 | 0,93 |
| FCP, LCP | 2501ms | 2415ms |
| TBT | 40ms | 47ms |
| TTI | 5489ms | 5375ms |
| Trabajo total del hilo principal | 916ms | 1035ms |
| De ello, Style & Layout | 343ms | 344ms |
| De ello, Script Evaluation | 254ms | 292ms |

En ambas ejecuciones el elemento LCP no fue una imagen sino el primer párrafo (`div#post-content > p`), por lo que FCP y LCP coincidieron, y la partida más grande del hilo principal no fue el script sino Style & Layout.

![Gráfico de línea de tiempo en el que las cuatro long tasks (el documento, un chunk de Next y dos de gtag) aparecen en el mismo orden en las dos ejecuciones de Lighthouse](3.png?w=720)

Las dos ejecuciones tuvieron cuatro long tasks, y en el mismo orden: la tarea del documento (104ms, 122ms), un chunk de Next.js (68ms, 69ms) y dos tareas de `googletagmanager.com/gtag/js` (66ms y 56ms en la 1.ª, 69ms y 59ms en la 2.ª). Los instantes están en una línea de tiempo que Lighthouse calculó suponiendo una CPU 4 veces más lenta, así que no deben leerse como tiempos absolutos en un dispositivo real.

TBT coincide exactamente con el exceso de las tres tareas posteriores a FCP. La 1.ª da (68 - 50) + (66 - 50) + (56 - 50) = 40ms y la 2.ª (69 - 50) + (69 - 50) + (59 - 50) = 47ms. Un TBT bajo no significa "no hay long tasks", sino "el exceso posterior a FCP es pequeño".

Lo siguiente es dónde cae gtag. El layout raíz (`src/app/[lang]/layout.tsx`) carga gtag con `next/script` usando `strategy="afterInteractive"`. Por eso las dos tareas de gtag se ejecutan seguidas algo más de 2,8 segundos después de LCP, y el punto donde termina la última se registra como TTI. Es un lugar que, más que con las métricas de carga, puede solaparse con **el input delay de una entrada pulsada justo después de que aparece la página**. Aun así, es una inferencia sobre una línea de tiempo de lab, y este blog no recolecta qué pulsaron los usuarios reales en ese momento.

Además, se trata de una medición de lab con n=2. Que se repita la misma forma es solo una evidencia débil de que esta estructura no es casual, y no sustituye la distribución de dispositivos y redes de los usuarios reales.

Entonces, ¿cómo averiguar qué función consumió el tiempo dentro de esa tarea de gtag de 66ms?

## Profilers de muestreo

La respuesta a nivel de función la da un profiler. La JS Self-Profiling API pretende hacer el trabajo del panel Performance de DevTools dentro del navegador de los usuarios reales.

### JS Self-Profiling API

La [especificación JS Self-Profiling](https://wicg.github.io/js-self-profiling/) del WICG define una API con la que una aplicación web controla el profiler de muestreo del navegador. Su ejemplo es `new Profiler({ sampleInterval: 10, maxBufferSize: 10000 })`, que significa capturar la pila de llamadas cada 10ms y reunir hasta 10.000 muestras. Como hace :term[muestreo]{key="sampling"} en lugar de instrumentar cada llamada, su sobrecarga es pequeña, a cambio de poder perder llamadas más cortas que el intervalo. La especificación excluye de los resultados los stack frames de scripts cross-origin no permitidos por CORS. Es decir, el interior de un script de otro origin, como gtag, puede seguir sin verse incluso con esta API.

La especificación no está en el standards track: es un WICG Community Group Draft, y según los datos de compatibilidad de MDN, `Profiler` solo funciona en navegadores basados en Chromium a partir de Chrome 94. Y como indica [MDN](https://developer.mozilla.org/en-US/docs/Web/API/JS_Self-Profiling_API), el documento debe servirse con una Document Policy que incluya `js-profiling`. Eso significa que la respuesta HTML necesita la cabecera `Document-Policy: js-profiling`.

### Activar la cabecera también tiene un coste

Durante la investigación encontré un punto en el que los documentos no coincidían. Un cambio que entró en el repositorio de la especificación en enero de 2026 marcó `js-profiling` como **deprecated** y definió en su lugar `js-profiling-mode` (`eager`, `lazy`). Las implementaciones deberían seguir soportando `js-profiling` por compatibilidad (SHOULD), pero pueden eliminarlo (MAY).

Según la especificación, `eager` (equivalente al antiguo `js-profiling`) prepara la infraestructura de profiling durante la carga, así que puede afectar a FCP y LCP aunque nunca se use el profiler. `lazy` retrasa esa preparación hasta que se crea el primer `Profiler`, pero si esa inicialización ocurre mientras se procesa una interacción, puede afectar a INP. La especificación admite así que **una cabecera activada para medir puede imponer un coste sobre las mismas métricas que se miden**. La documentación de Sentry, en cambio, seguía indicando solo `Document-Policy: js-profiling` al consultarla el 2026-09-16. En ChromeStatus, la entrada de `js-profiling-mode` figura como Proposed y sin hito de lanzamiento, pero no he comprobado directamente si Chrome la implementa, así que no puedo decir qué cabecera conviene usar hoy.

### Condiciones del profiling de navegador en Sentry

La [documentación de JavaScript profiling](https://docs.sentry.io/platforms/javascript/profiling/) de Sentry deja las condiciones claras. El profiling de navegador está en beta, usa la JS Self-Profiling API y, por tanto, solo funciona en navegadores basados en Chromium como Chrome y Edge, y el servidor debe enviar `Document-Policy: js-profiling`. Indica explícitamente que no se puede usar en un hosting donde no se pueden cambiar las cabeceras. El SDK requiere `@sentry/browser` 10.27.0 o superior y usa `browserProfilingIntegration()` junto con la tasa por sesión `profileSessionSampleRate`. El FAQ responde que lo normal es que los perfiles lleguen solo de usuarios de Chrome. Por eso no hay que leer los perfiles recogidos como representativos de todos los usuarios.

La facturación es por [UI Profile Hours](https://docs.sentry.io/pricing/quotas/manage-ui-profile-hours/), y en tamaño de bundle, según los límites gzip del repositorio `sentry-javascript`, archivo `.size-limit.js` (rama develop, consultado el 2026-09-16), añadir Profiling a la combinación de Tracing de 56 KB da 59 KB.

### En este blog está apagado en dos capas

Primero, no hay SDK de navegador. El Sentry de este blog es solo de servidor y no existe `src/instrumentation-client.ts`. Es una decisión tomada a partir de una medición del 2026-08-04 que mostró que el SDK de cliente añade 78,8 KB gzip al client JS (lo traté en la publicación anterior).

Segundo, no hay cabecera. La respuesta que comprobé con `curl -sI https://hooninedev.com/260914` a las 2026-09-16T09:10:42Z no tiene `document-policy`. Las cabeceras que este repositorio añade al HTML son las cuatro de la función `next.config.ts` `headers()`: `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`, y esas cuatro aparecen también en la respuesta. (Ya había medido en este repositorio que `public/_headers` solo se aplica a los assets estáticos y no llega al HTML)

Así que activar el profiling de navegador en este blog no es cuestión de una opción. Supone revertir la decisión de los 78,8KB, añadir una cabecera a todo el HTML y medir de nuevo el coste que esa cabecera impone sobre FCP, LCP e INP. Todavía no hay evidencia de que las dos tareas de gtag que vimos antes sean un problema que justifique ese coste.

## Qué significa medir la memoria

Si la CPU trata de "qué está bloqueando ahora", la memoria trata de "qué se acumula con el tiempo", así que hay que observar cómo cambia dentro de una sesión. Sin embargo, el camino para traer ese valor desde field es más estrecho que en el caso de la CPU.

### performance.memory no es estándar

`performance.memory` es una propiedad "non-standard and legacy" según [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory), y sus datos de compatibilidad la marcan como deprecated y exclusiva de Chromium. Ni siquiera está estandarizado qué es exactamente "el heap".

### measureUserAgentSpecificMemory exige aislamiento

La alternativa es `performance.measureUserAgentSpecificMemory()`. El [artículo de web.dev sobre medir la memoria de la página](https://web.dev/articles/monitor-total-page-memory-usage) explica que mide durante la recolección de basura, por lo que el resultado llega con retraso, y recomienda llamarla a intervalos aleatorios con una media de 5 minutos. Solo está soportada en navegadores basados en Chromium a partir de Chrome 89.

La condición decisiva está en otra parte. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory) establece que el documento debe ser un secure context y además estar **cross-origin isolated**. Es decir, debe aislarse con las cabeceras `Cross-Origin-Opener-Policy` y `Cross-Origin-Embedder-Policy` para que `window.crossOriginIsolated` sea `true`.

La respuesta de `curl` anterior no tiene ninguna de las dos cabeceras, así que en este blog esta API no se puede llamar. Además, calculo que activarla costaría más que la cabecera de profiling. Con COEP activado, los recursos cross-origin que carga la página tienen que cumplir esa política, y este blog carga el script de gtag y el iframe de utteranc.es. No las he activado para comprobar si estos dos se rompen de verdad.

Cuando field está cerrado, lo que queda es reproducir en local con el panel Memory de DevTools. Es el método de buscar con heap snapshots los árboles DOM detached, que la [documentación del equipo de Chrome sobre problemas de memoria](https://developer.chrome.com/docs/devtools/memory-problems) señala como causa habitual de fugas, pero no es algo que yo haya hecho en este blog.

### Una fuga creada por código de observabilidad

El caso que más me interesó en todo el tema de memoria vino de una librería de observabilidad. La primera línea del changelog de `web-vitals` v6.2.2 (2026-09-14) es "Cap pending LoAFs to avoid memory leak".

Según la descripción del [issue #795](https://github.com/GoogleChrome/web-vitals/issues/795), el `onINP` del build de atribución acumula entries de LoAF en `pendingLoAFs` para encontrar los LoAF que se solapan con INP. El criterio de limpieza, el instante del "evento procesado más recientemente", solo avanza cuando hay entrada del usuario, así que en páginas que se miran mucho tiempo sin interactuar, como la reproducción de un vídeo, los LoAF no hacían más que acumularse. El [PR de corrección #796](https://github.com/GoogleChrome/web-vitals/pull/796) aplicó también a la lista de LoAF el límite `MAX_PENDING_FRAMES` (10) que ya se usaba en la lista de grupos de eventos, de modo que, salvo los frames que se solapan con un candidato a INP, solo se conservan los 10 más recientes.

Este blog está en 6.2.1. ¿Arrastra esta fuga? No. El único archivo fuente que cambió el PR es `src/attribution/onINP.ts` (el resto son archivos de test) y, como vimos, el build estándar de este blog no tiene observer de LoAF. **La misma decisión de no recolectar la atribución de LoAF también cerraba el camino a esta fuga.** Eso no lleva a la conclusión de "entonces no recolectemos". Lo que quiere decir es que el coste del código de observabilidad a veces solo sale a la luz en un changelog, y que cambiar al build de atribución presupone 6.2.2 o superior.

## Cuando el navegador muere

Si la memoria se agota por completo, la página muere. La señal que queda en ese momento es el crash report de la Reporting API.

### La forma de un crash report

La [especificación Crash Reporting](https://wicg.github.io/crash-reporting/) del WICG define el report type `"crash"` y declara ella misma que no es un estándar del W3C ni está en el standards track. El `reason` del body incluye `oom`, cuando la página agotó la memoria, y `unresponsive`, cuando se terminó por no responder. La entrega va, si la cabecera `Reporting-Endpoints` define un endpoint `crash-reporting`, a ese endpoint; si no, a `default`; y si no existe ninguno de los dos, no se envía nada.

### JavaScript no puede recibirlo

La propiedad clave de esta señal está en una frase de la especificación.

> Crash reports are not observable to JavaScript, as the page which would receive them is, by definition, not able to.

La página que tendría que recibir el reporte ya murió por ese mismo crash, así que, por definición, JavaScript no tiene forma de observarlo. El navegador simplemente hace un POST a un endpoint del servidor desde fuera de la página.

Lo que esto significa para los SDK de navegador se ve en el código. En `sentry-javascript`, el [código fuente de `reportingObserverIntegration`](https://github.com/getsentry/sentry-javascript/blob/develop/packages/browser/src/integrations/reportingobserver.ts) incluye `'crash'`, `'deprecation'` e `'intervention'` entre los tipos suscritos por defecto, y hasta tiene una rama `report.type === 'crash'`. Pero esta integración usa un `ReportingObserver` dentro de la página, así que, si la especificación se cumple, no hay camino por el que esa rama se ejecute en un crash OOM real. Eso sí, es una inferencia mía a partir de la especificación, y no he provocado un crash para comprobarlo.

Del lado del servidor, ¿podría Sentry ser el destino de `Reporting-Endpoints`? [getsentry/sentry#38940](https://github.com/getsentry/sentry/issues/38940), que pedía esta función, se abrió el 2022-09-15 y seguía open al consultarlo el 2026-09-16. Lo que se puede hacer hoy llega solo a montar un endpoint propio y reenviar a Sentry.

### Los crashes de este blog no se registran

La respuesta de `curl` anterior tampoco tiene la cabecera `reporting-endpoints`. Según las reglas de entrega de la especificación, sin endpoint el reporte no se envía. Aunque la pestaña de alguien se muriera por falta de memoria mientras leía este blog, ese hecho no quedaría en ningún sitio. Independientemente de si Sentry lo soporta, es porque no declaré dónde recibirlo.

Como son páginas para leer artículos estáticos largos, no pienso cambiarlo por ahora. Aun así, dejo anotado que "no hay crashes" y "no hay medios para ver los crashes" se ven como la misma pantalla vacía en un dashboard.

## Una observación que solo se abre bajo condiciones

Observar la CPU y la memoria del navegador, en su mayor parte, **solo se abre cuando se cumplen ciertas condiciones**. Las long tasks y LoAF solo llegan desde Chromium, y la atribución de scripts de LoAF no ve los iframes cross-origin. Los profilers de muestreo exigen la cabecera `Document-Policy`, cuyo nombre está cambiando en la especificación, y la propia cabecera puede imponer un coste sobre las métricas. La API de medición de memoria exige cross-origin isolation, y los crash reports, un endpoint de servidor fuera de JavaScript.

Este blog no ha activado ninguna de esas condiciones. Ese estado no es abandono, sino el resultado acumulado de la decisión de los 78,8KB, el build estándar y la elección de no añadir cabeceras, y de todo ello el build estándar acabó además esquivando la fuga de LoAF de web-vitals. Que ampliar la observabilidad también signifique cargar en la página código que tiene un coste se ve con especial claridad en esta área.

Todas las cifras de este artículo salieron del lab o de mis comprobaciones en local. Qué significa la field data recogida de usuarios reales una vez que sale del navegador, en CrUX, Search Console y la búsqueda, es algo que pienso continuar en [la siguiente publicación](/260916).

:::ref
- [docs] [MDN, PerformanceLongAnimationFrameTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming)
- [docs] [web.dev, Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp)
:::
