---
emoji: 🔭
title: 'Observabilidad del navegador'
seoTitle: 'Rendimiento web: PerformanceObserver, Web Vitals y soft navs'
date: '2026-09-14'
updatedAt: '2026-09-16'
categories: observabilidad frontend navegador RUM
description: 'Qué se ve en el navegador sin SDK: Performance Timeline, fases de red, cómo se calculan LCP, INP y CLS, y web-vitals reportSoftNavs medido en producción.'
keywords: 'medir rendimiento web, PerformanceObserver ejemplo, cómo se calculan las Web Vitals, medir INP, CLS session window, Soft Navigations API, web-vitals reportSoftNavs, Resource Timing Timing-Allow-Origin'
locale: es
translationOf: '260914'
sourceHash: 3976b490db6bef1a28388bab84a42d789e23e2df6fc503abd0ac827c7b892867
---

En esta publicación quiero hablar de la observabilidad del navegador.

En el [artículo anterior](/260913) conté cómo añadí a este blog Sentry, que llevo años usando en el trabajo, y repasé de nuevo sus funciones. Pero esa configuración tiene un hueco evidente. Solo conecté Sentry al servidor y nunca activé el SDK del navegador.

La razón fue el tamaño del bundle. (Las mediciones que lo respaldan están en la primera sección) Eso no significaba que renunciara a mirar lo que ocurre dentro del navegador. Incluso sin un SDK, el navegador registra por sí mismo bastante información sobre la carga y el renderizado.

Así que la pregunta de este artículo es esta. **Sin un SDK externo, ¿qué se puede ver con las señales de carga y renderizado que el propio navegador informa dentro de la página?** Recorreré las fases de red, las reglas de cálculo de las Web Vitals y la frontera de la página que se difumina en una SPA, y al final dejaré escrito qué envía realmente este blog y qué no envía. (La CPU y la memoria corresponden al siguiente artículo, y cómo los valores recolectados se conectan con CrUX y la búsqueda, al último)

## Por qué no activé el SDK del navegador

Primero dejo constancia del fundamento de la decisión. Fui cambiando la configuración de Sentry y comparé el total en gzip de `.next/static/chunks/*.js` sobre builds limpios.

| Configuración | client JS (gzip) | Incremento |
|---|---|---|
| Sin Sentry | 181.6 KB | Referencia |
| **Solo servidor (actual)** | **182.3 KB** | **+0.7 KB** |
| Solo servidor + llamada a `captureException` en la UI de error de respaldo | 186.0 KB | +4.4 KB |
| Cliente + servidor | 260.4 KB | +78.8 KB |

Esta tabla se midió el 2026-08-04 con Next 16.1.4. La instrumentación del servidor salía prácticamente gratis, mientras que la del navegador exigía 78.8KB. También probé a activar `bundleSizeOptimizations.excludeTracing`, pero la cifra no cambió, y la única manera de eliminar el coste era no tener el archivo de inicialización del navegador (`src/instrumentation-client.ts`). La tercera fila responde a la misma lógica. Sin el SDK del navegador, `captureException` en la UI de respaldo no hace nada, pero el código del SDK igualmente viaja en el bundle. Por eso quité la llamada.

También volví a medir el estado actual. Con el mismo método, el 2026-09-16 salieron 206.1KB. Son 23.8KB más que la referencia, pero en ese intervalo Next subió a 16.3.4 y entró el reporte de soft navigations que trato más adelante. La configuración de Sentry sigue siendo solo de servidor, así que este aumento no se debe a Sentry. (No sé cuánto aporta cada uno de los dos, porque no reconstruí commit por commit)

En este blog el rendimiento de carga es la experiencia del visitante, y quien paga los 78.8KB no soy yo sino el visitante. Juzgué que los errores de navegador de un blog personal no devolverían ese coste. Pero una vez tomada esa decisión, hay que observar el lado del navegador de otra forma. El punto de partida es el registro que el navegador ya está dejando.

## El registro que deja el navegador

Cuando se abre una página, el navegador crea varios tipos de :term[PerformanceEntry]{key="performance-entry"}. El [Performance Timeline](https://www.w3.org/TR/performance-timeline/) del W3C es el marco común para leer esas entradas sobre una sola línea de tiempo. Aunque el desarrollador no marque un inicio y un fin como con un cronómetro, el navegador ya conoce sucesos como la navegación del documento, las peticiones de recursos, los pintados y la entrada del usuario.

| Qué se observa | entry type | Pregunta que puede responder |
|---|---|---|
| Navegación del documento | `navigation` | ¿Dónde se fue el tiempo entre DNS, conexión, respuesta y procesamiento del DOM? |
| Imágenes, scripts, CSS | `resource` | ¿Qué recurso llegó tarde y cuánto pesó la transferencia? |
| Visualización | `paint`, `largest-contentful-paint` | ¿Cuándo se vieron la primera pantalla y el contenido principal? |
| Cambios de layout | `layout-shift` | ¿Cuándo se movió la pantalla que se estaba mirando? |
| Entrada del usuario | `event` | ¿Cuánto tardó en pintarse el siguiente frame tras la entrada? |
| Tramos de la aplicación | `mark`, `measure` | ¿Cuánto tardó el trabajo que el propio servicio definió? |

`long-animation-frame`, que muestra los frames que retuvieron el hilo principal durante mucho tiempo, también pertenece a este marco, pero es un tema de CPU, así que lo trato en el siguiente artículo.

La interfaz estándar que recibe estos registros es :term[PerformanceObserver]{key="performance-observer"}.

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.entryType, entry.startTime, entry.duration)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

El código es corto, pero esconde algunas condiciones. Según la [documentación de `observe()`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe) de MDN, `buffered` debe usarse junto con `type` y no puede combinarse con `entryTypes`, que recibe varios tipos a la vez. Los scripts de recolección suelen ejecutarse cuando la página ya avanzó bastante, así que si se registra sin `buffered`, no se reciben los candidatos a LCP ni los registros de recursos creados antes.

Además, un type que el navegador no soporta se ignora sin lanzar excepción, y según el mismo documento como mucho puede quedar una advertencia en la consola. Si no se comprueba con `PerformanceObserver.supportedEntryTypes`, no se puede distinguir entre **que no haya entries** y **que fuera un navegador que no genera esas entries**. Un tramo vacío en un dashboard puede ser una diferencia en la mezcla de navegadores y no un problema de rendimiento.

## De qué se compone el tiempo de red

Decir que una página es lenta suele traducirse como un problema de red. Pero con un único `duration` no se pueden separar las causas. La entry `navigation` (`PerformanceNavigationTiming`) y la entry `resource` (`PerformanceResourceTiming`) dividen una petición en varias marcas de tiempo.

| Fase | Cálculo | Dónde sospechar si es grande |
|---|---|---|
| DNS | `domainLookupEnd - domainLookupStart` | La capa DNS |
| Conexión y TLS | `connectEnd - connectStart` | Reutilización de conexiones, negociación TLS |
| Hasta el primer byte | `responseStart - requestStart` | Procesamiento del servidor y latencia de ida y vuelta |
| Transferencia del cuerpo | `responseEnd - responseStart` | Tamaño de la respuesta y velocidad de transferencia |

La especificación [Navigation Timing](https://www.w3.org/TR/navigation-timing-2/) del W3C incluye un diagrama que muestra en qué orden se registran estas marcas de tiempo. Si los nombres de las fases resultan poco familiares, mirar ese diagrama una vez es más rápido que la tabla.

Una trampa son los recursos cross-origin. Según la [especificación Resource Timing](https://www.w3.org/TR/resource-timing/) del W3C, en un recurso de otro origin las marcas detalladas como DNS, conexión e inicio de petición y respuesta quedan ocultas como 0, salvo que el servidor que lo entrega las permita con la cabecera de respuesta `Timing-Allow-Origin`. Si una imagen de un CDN externo parecía lenta y al abrirla el DNS y la conexión estaban todos en 0, no era rápida: simplemente no había permiso para verlo. **En este terreno, 0 puede no significar rápido.**

El tiempo hasta el primer byte de este blog tampoco es ligero. El 2026-09-16, al pedir con `curl` dos artículos y la portada una vez cada uno desde un punto de Corea, `time_starttransfer` quedó entre 0.95 y 2.43 segundos (un valor que incluye el tiempo de DNS, conexión y TLS), y las cabeceras de respuesta mostraban hit en la caché Durable de Netlify y miss en la caché del edge. Con solo tres muestras no generalizo, pero está en la misma escala que el TTFB de 798ms de la medición que veremos más adelante. Solo con este desglose por fases se puede elegir, cuando el LCP llega tarde, entre reducir la imagen o adelantar la llegada del documento.

## Cómo se calculan las Web Vitals

Si las fases de red son la materia prima, las :term[Web Vitals]{key="web-vitals"} son métricas que ponen reglas de cálculo encima. Las Core Web Vitals que define la documentación de Web Vitals de Google son tres, LCP, INP y CLS, y los umbrales de bueno son LCP de 2.5 segundos, INP de 200ms y CLS de 0.1 o menos.

![Rangos bueno, necesita mejorar y deficiente de las tres métricas LCP, INP y CLS. Los límites son 2.5 y 4.0 segundos para LCP, 200ms y 500ms para INP, y 0.1 y 0.25 para CLS](1.png?w=720)

(Fuente de la figura: las tres figuras de umbrales de [web.dev, Web Vitals](https://web.dev/articles/vitals) unidas en horizontal, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))

Ninguna de las tres métricas es una marca de tiempo que el navegador registra una sola vez. El valor solo aparece tras interpretar varias entries y el ciclo de vida de la página. Si no se conoce esta diferencia, cuando los valores de un código de recolección propio no coinciden con los de una biblioteca o herramienta, no hay forma de juzgar cuál es el correcto.

### El candidato a LCP cambia una y otra vez

Según la [documentación de LCP](https://web.dev/articles/lcp), el navegador emite una nueva entry `largest-contentful-paint` cada vez que se pinta un elemento de contenido más grande. Si primero se pinta texto, un `<p>` es el candidato, y si más tarde carga una imagen grande, pasa a ser `<img>`. Y en el momento en que el usuario toca, hace scroll o pulsa una tecla, deja de reportar nuevas entries. Por eso el LCP no es la primera entry sino el último candidato válido reportado antes de la entrada, y decidir ese momento de cierre pasa a ser tarea del código de recolección.

### INP suma tres fases de una entrada

La documentación de INP de web.dev divide una interacción en tres fases. El input delay, desde que llega la entrada hasta que empieza el manejador de eventos; el processing duration, mientras se ejecuta el manejador; y el presentation delay, hasta que el siguiente frame se muestra en pantalla.

![Cómo se procesa una entrada en el hilo principal. Una blocking task genera input delay, los manejadores pointerup, mouseup y click forman el processing duration, y el tramo que pasa por render y paint hasta presentar el frame es el presentation delay. Debajo de paint siguen los trabajos de compositing, GPU y raster](2.png?w=720)

(Fuente de la figura: [web.dev, Interaction to Next Paint (INP)](https://web.dev/articles/inp), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), convertida a PNG con fondo blanco)

Lo que hay que notar en esta figura es que, en el momento en que el usuario pulsa, ya se está ejecutando una blocking task gris. Por muy rápido que sea el código del manejador, si otro trabajo retiene el hilo principal justo antes de la entrada, el INP empeora. (Encontrar qué es ese otro trabajo es el tema del siguiente artículo)

El INP de una página se acerca al valor más lento entre las interacciones observadas durante una visita. El mismo documento explica que por cada 50 interacciones se ignora el valor más alto. Así que en una visita con menos de 50 interacciones, la interacción más lenta es directamente el INP.

### CLS cuenta los desplazamientos por grupos

La [documentación de CLS](https://web.dev/articles/cls) define el CLS no como la suma de todos los desplazamientos durante la vida de la página, sino como la puntuación de la ráfaga (burst) más grande. Si el intervalo entre desplazamientos es menor de 1 segundo, se agrupan en la misma session window, y una window dura como máximo 5 segundos. De esas windows, la de mayor puntuación total es el CLS. Es una regla pensada para que los pequeños desplazamientos de una pestaña abierta durante mucho tiempo no se acumulen sin fin.

Se pueden implementar a mano las reglas de las tres métricas. Pero ajustar las condiciones de frontera, hasta el momento en que se oculta una pestaña o se restaura una página, es difícil. La biblioteca [`web-vitals`](https://github.com/GoogleChrome/web-vitals) de Google no es una herramienta que pase las entries tal cual, sino una implementación que aplica estas reglas del ciclo de vida sobre las APIs estándar. Este blog también la usa.

Sin embargo, todas estas reglas presuponen una unidad llamada "una página". ¿Qué pasa cuando esa unidad se difumina?

## La frontera difusa de la página

En una navigation tradicional, el navegador sabe dónde empieza un documento. En la client-side navigation de una SPA, la URL y la pantalla cambian, pero no se crea un documento nuevo. Para el navegador es como una única primera carga que se alarga, así que la segunda pantalla, a la que se llega pasando de la lista a un artículo, no tiene su propio LCP.

Hasta ahora, las herramientas de RUM y los frameworks definían cada uno una "pantalla nueva" con sus propias heurísticas. El equipo de Chrome trasladó ese juicio al navegador con la [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations). Cuando una entrada del usuario, un cambio de URL y un pintado de pantalla ocurren juntos, el navegador crea una entry `soft-navigation`. Esta función está activada por defecto desde Chrome 151, y la fecha de lanzamiento estable de Chrome 151 es el [2026-07-28](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=151). `web-vitals` también reporta métricas por soft navigation mediante la opción `reportSoftNavs` desde la 6.0. Según el README, este reporte solo funciona en Chromium 151 o superior, y en otros navegadores activar la opción no cambia la forma de reportar.

### Valores medidos con reportSoftNavs activado

Este blog también pasa de la lista de artículos a un artículo con el `Link` de Next.js. El 2026-09-14, tras actualizar `web-vitals` a 6.2.1 y activar `reportSoftNavs` (`cc21a0d`), me conecté por CDP a un Chrome headless que había abierto la página de producción y examiné tal cual las peticiones que salían hacia GA4. Estos fueron los valores enviados en una sesión. (Las métricas que no están en la tabla no aparecían en las peticiones de esa sesión, y no investigué por qué)

| Métrica | Valor | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

La transición de la lista a un artículo quedó capturada como una experiencia separada, tal como se pretendía. Pero esta tabla también muestra por qué no basta con una opción. **El TTFB de una soft navigation es 0.** Nunca se pidió un documento al servidor, así que es exactamente el valor que describe el README, pero si ese 0 se acumula en el mismo evento que los 798ms de la primera carga, el promedio de TTFB baja en silencio sin que cambie el código. Por eso modifiqué el código para enviar también, como parámetro de GA4, el `navigationType` que acompaña a cada métrica. Al añadir una unidad de observación, crecen con ella las dimensiones necesarias para distinguirla.

Al medir aprendí dos cosas más. Una es que la soft navigation **necesita una entrada real del usuario**. Cuando llamé a `click()` desde un script dentro de la página, no se creó ninguna entry `soft-navigation` aunque la URL cambió y la pantalla se actualizó, y solo se capturó después de enviar un clic por coordenadas con `Input.dispatchMouseEvent` de CDP. Para verificar esta función con automatización de pruebas hay que enviar eventos de entrada a nivel de navegador y no el `click()` del DOM.

La otra es que los lugares de este blog donde ocurren soft navigations son más reducidos de lo que pensaba. Los enlaces de la lista y de la cabecera son `Link`, así que son client-side navigations, pero **los enlaces internos dentro del cuerpo de un artículo son etiquetas `a` normales generadas desde Markdown, así que son cargas completas de página**. Incluso dentro del mismo sitio, unos desplazamientos son soft navigations y otros no.

### Cuándo se cierran las métricas de la primera página

Después de medir, releí el README y encontré una frase que se me había pasado.

> Note that this will change the way the first page loads are measured as the metrics for the initial URL will be finalized once the first soft nav occurs.

Significa que, con la opción activada, las métricas de la primera página se cierran en el momento de la primera soft navigation. INP y CLS son métricas que normalmente se observan hasta que el usuario abandona la página, pero ahora la observación de la página de lista termina en cuanto el usuario pulsa el enlace de un artículo, y el INP y el CLS de la nueva pantalla vuelven a empezar desde 0. El mismo README indica que LCP y FCP también cuentan solo los elementos pintados de nuevo después de la soft navigation. Elementos que permanecen entre pantallas, como la cabecera, no pueden ser candidatos de la nueva pantalla.

Por eso la distribución de las métricas de la primera carga puede cambiar antes y después de activar la opción. Si al medir el mismo sitio el INP mejoró a partir de un despliegue, puede que no mejorara el código sino que se acortara la ventana de observación. Como solo se comporta así en Chromium 151 o superior, también aparecen diferencias entre navegadores. (Debería haber conocido esta diferencia antes de medir. Esta sola frase influye más en la interpretación que los valores de la tabla)

### Una restauración desde bfcache también es una experiencia nueva

Hay otra vía que difumina la frontera de la página. El :term[bfcache]{key="bfcache"} restaura una página entera desde memoria al ir hacia atrás o hacia adelante. El [artículo sobre bfcache](https://web.dev/articles/bfcache) de web.dev indica que, según los datos de uso de Chrome, 1 de cada 10 navegaciones en escritorio y 1 de cada 5 en móvil son hacia atrás o hacia adelante. Una restauración no es una carga nueva, así que las visitas de vuelta, que habrían sido las más rápidas, salen de la distribución de cargas, y la distribución recolectada puede inclinarse hacia lo lento aunque la experiencia real haya mejorado. El mismo artículo recomienda mirar métricas como el TTFB separadas por navigation type. En este caso `web-vitals` reporta `navigationType` como `back-forward-cache`, así que el parámetro que este blog añadió por las soft navigations también distingue las restauraciones desde bfcache.

## Lo que este blog envía realmente

Trasladado al código de este blog, todo lo anterior es un único `src/components/WebVitalsReporter.tsx`. Un client component carga `web-vitals` de forma dinámica, registra LCP, INP, CLS, FCP y TTFB, y los envía a GA4 como un solo evento llamado `web_vitals`. La versión instalada es la 6.2.1 según el lockfile.

| Parámetro | Contenido |
|---|---|
| `event_label` | Nombre de la métrica (`LCP`, `INP`, etc.) |
| `value` | Valor de la métrica. El value de GA4 es entero, así que CLS se multiplica por 1000 y se redondea |
| `metric_id` | Id que identifica una métrica dentro de la vida de una página. Si la misma métrica se reporta otra vez, se agrupa por este valor |
| `metric_rating` | good, needs-improvement o poor según el juicio de la biblioteca |
| `metric_navigation_type` | `navigate`, `soft-navigation`, `back-forward-cache`, etc. |

Es una configuración de :term[RUM]{key="rum"} montada sobre el GA4 que ya tenía en marcha, sin un servidor de recolección aparte. Si falla la propia carga del módulo, deja un evento `web_vitals_unavailable`. Es el fallo que ocurre justo después de un despliegue, cuando un HTML antiguo pide un chunk que ya no existe, y como no hay Sentry en el navegador, sin este evento la recolección podría detenerse por completo sin dejar rastro.

Lo que no envía también está claro. Como usa la build estándar de `web-vitals` y no la build de attribution, no recolecta cuál fue el elemento del LCP, cuánto duró cada una de las tres fases del INP ni qué elemento empujó el layout. Recordando la figura del INP de antes, este blog conoce solo la suma de las tres fases, no cuál fue la larga. Y los errores de JS que ocurren solo en el navegador no quedan registrados en ninguna parte. Es el precio de ahorrar 79KB.

Dejo anotada una cosa más. Envío `metric_navigation_type`, pero mientras escribía este artículo no comprobé si ese parámetro está registrado como custom dimension en GA4 y se está desglosando de verdad. La GA4 Admin API está desactivada en este proyecto de GCP, así que tampoco había forma inmediata de comprobarlo. Enviar algo y poder leerlo desglosado son problemas distintos.

## El navegador ya está registrando

En resumen, aunque no se active un SDK de navegador, el navegador ya registra las fases de red, los pintados, los desplazamientos de layout y el retraso de entrada. `PerformanceObserver` es la puerta para leer ese registro, y las Web Vitals son métricas que añaden encima reglas de cálculo como la actualización de candidatos, la suma de tres fases y las session windows.

Y estas reglas de cálculo presuponen una unidad llamada página. Al activar soft navigation, las pantallas nuevas obtienen sus propias métricas, pero a cambio la ventana de observación de la primera página se acorta, se mezclan ceros en el TTFB y las restauraciones desde bfcache salen de la distribución de cargas. Lo que entendí de nuevo esta vez es que una sola opción cambia no solo los valores sino también **qué se cuenta como una experiencia**. Por eso, antes de comparar números, primero hay que ver en qué frontera se cortaron. Si estás leyendo esto, quizá valga la pena revisar una vez en qué momento se cerraron las cifras de rendimiento que tienes delante.

Eso sí, este artículo solo llegó hasta la suma de las tres fases. Qué trabajo retenía el hilo principal cuando llegó una entrada, y cuánta memoria usa una página abierta durante mucho tiempo, requieren otras APIs. Pienso continuar esa historia en el siguiente artículo, [CPU y memoria del navegador](/260915).

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [web.dev, Debug performance in the field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [WICG, Soft Navigations explainer](https://github.com/WICG/soft-navigations)
:::
