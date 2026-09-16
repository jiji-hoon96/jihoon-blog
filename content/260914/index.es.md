---
emoji: 🔭
title: 'Observabilidad del navegador'
seoTitle: 'Observabilidad del navegador: Web Vitals y RUM en frontend'
date: '2026-09-14'
categories: observabilidad frontend navegador RUM
description: 'El Performance Timeline, cómo se calculan las Web Vitals y los criterios de diseño de un RUM, y por qué renuncié a 79KB de instrumentación.'
keywords: 'observabilidad frontend, medir rendimiento web, PerformanceObserver ejemplo, medir Web Vitals, monitoreo de usuarios reales RUM, LCP INP CLS explicado, web-vitals GA4, Soft Navigations API'
locale: es
translationOf: '260914'
sourceHash: 8777b7334d208ef6328ddb366d187cd5dd7af88a5c4e5368606f2ae46b2e2afb
---

En esta publicación quiero hablar de la observabilidad del navegador.

Mientras añadía a este blog código que recolecta directamente el rendimiento que perciben los visitantes, descubrí que mi conocimiento del lado del navegador, que creía terreno familiar, era más superficial de lo que pensaba. Llevo mucho tiempo abriendo el panel Performance de DevTools y ejecutando Lighthouse. Pero recolectar de forma continua lo que vivieron los usuarios reales cambia la pregunta. Hay que saber cuándo el navegador produce qué valores, qué incluyen esos valores y por qué, bajo ciertas condiciones, no se producen en absoluto.

Este conocimiento no está reunido en un solo documento. Está disperso en varias especificaciones, como `Performance Timeline`, `Navigation Timing`, `Resource Timing`, `Paint Timing` y `Event Timing`, y sobre ellas Web Vitals añade sus propias reglas de cálculo. Cuando entran en escena las transiciones de pantalla de una SPA, la restauración del estado de la página mediante :term[bfcache]{key="bfcache"}, las pestañas en segundo plano y los iframes, cada herramienta reporta números distintos para la misma página. (Cuando un valor difería de lo que esperaba, donde más tiempo me atasqué fue en distinguir si el sitio era lento o si la culpa era de las reglas de medición)

Por eso este artículo amplía el alcance de la observación en tres etapas: los eventos que dejó el navegador, la experiencia que percibió el usuario y la distribución en la población real de usuarios. Entre medias, coloco también los valores que este blog recolecta en la práctica y, en la dirección opuesta, una decisión de no ampliar la observación. La profundidad de la observabilidad del navegador no se decide por cuántas API se usan. Solo cuando se distingue entre materia prima, métricas y distribuciones, y se registra por el camino a los usuarios que quedaron fuera y las condiciones que distorsionan los valores, los datos observados se convierten en información útil para decidir.

## Las señales que deja el navegador

Cuando se abre una página web, el navegador crea internamente varios tipos de :term[PerformanceEntry]{key="performance-entry"}. El [Performance Timeline](https://www.w3.org/TR/performance-timeline/) del W3C es la base común que permite manejar estos elementos en un único eje temporal.

Lo importante es que el desarrollador no tiene que marcar el inicio y el final como con un cronómetro. El navegador ya conoce eventos como la navegación del documento, las peticiones de recursos, los paints y la entrada del usuario. El punto de partida de la observabilidad frontend es leer este registro interno.

| Qué se observa | Entry representativo | Pregunta que puede responder |
|---|---|---|
| Navegación del documento | `navigation` | Dónde se fue el tiempo entre DNS, conexión, TLS, respuesta y procesamiento del DOM |
| Imágenes, scripts, CSS | `resource` | Qué recursos llegaron tarde y cómo fueron su caché y su tamaño de transferencia |
| Renderizado en pantalla | `paint`, `largest-contentful-paint` | Cuándo se vieron la primera pantalla y el contenido principal |
| Cambios de layout | `layout-shift` | Cuándo se movió la pantalla que ve el usuario y por culpa de qué |
| Entrada del usuario | `event` | Dónde estuvo el retraso entre la entrada y el siguiente frame que pinta el navegador |
| Trabajo largo de renderizado | `long-animation-frame` | Qué scripts y etapas de renderizado consumieron tiempo dentro de un frame |
| Tramos de la aplicación | `mark`, `measure` | Cuánto tardaron las operaciones que define el servicio |

Esta tabla deja claro que la observabilidad del navegador no es una simple medición del tiempo de carga de la página. La red, el hilo principal, el pipeline de renderizado y la entrada del usuario pueden colocarse sobre el mismo eje temporal.

Pero cada entry no es una conclusión terminada. Se parece más a la materia prima que proporciona el navegador.

## Recolectar entries de rendimiento

La interfaz estándar para recibir esta materia prima en tiempo real es :term[PerformanceObserver]{key="performance-observer"}.

```ts
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    sendPerformanceEntry(entry)
  }
})

observer.observe({ type: 'resource', buffered: true })
```

El código es corto, pero esconde varias condiciones importantes.

Primero, como explica la [documentación de `observe()`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe) de MDN, `buffered` debe usarse junto con `type`. No puede combinarse con `entryTypes`, que recibe varios tipos a la vez. Si necesitas recibir los candidatos de LCP o los registros de recursos creados antes de que se ejecutara tu script inicial, esta diferencia decide si pierdes datos.

Segundo, los entries que el navegador no soporta pueden ignorarse en silencio. Por eso el recolector debe comprobar `PerformanceObserver.supportedEntryTypes`. Si asumes que los valores visibles en el Chrome más reciente también llegarán desde todos los Safari y Firefox, interpretarás los tramos vacíos del dashboard como problemas de rendimiento.

Tercero, los entries tienen un límite de búfer. Si el código de observación arranca tarde, o en aplicaciones que solicitan muchísimos recursos, los elementos antiguos pueden salir empujados del búfer. Igual que "no hubo errores" difiere de "no recibimos errores", hay que distinguir "no hay entry" de "no se generó el entry".

El propio código de observación también se ejecuta en el hilo principal. Si dentro del callback serializas objetos grandes y lanzas peticiones de red de inmediato, el código que mide la experiencia del usuario puede empeorar la experiencia del usuario. Por eso hay que separar la recolección del envío, normalizar solo las propiedades necesarias y diseñar el batching y el sampling.

## De qué se compone el tiempo de red

"La página va lenta" suele traducirse primero como un problema de red. Pero mirando solo `duration` es difícil distinguir las causas.

`PerformanceNavigationTiming` y `PerformanceResourceTiming` contienen varias fronteras alrededor de la petición. Se pueden separar la resolución DNS, la conexión TCP, la negociación TLS, el envío de la petición, el primer byte y la finalización de la respuesta. También se puede comprobar si el navegador pasó por un Service Worker, cuánto difieren el tamaño transferido y el decodificado, y si un recurso bloqueó el renderizado.

Esta separación cambia la respuesta.

- Si `domainLookupEnd - domainLookupStart` es grande, mira la capa DNS.
- Si `connectEnd - connectStart` es grande, mira la conexión y TLS.
- Si `responseStart - requestStart` es grande, sospecha a la vez del procesamiento del servidor y de los viajes de ida y vuelta por la red.
- Si `responseEnd - responseStart` es grande, mira el tamaño de la respuesta y la velocidad de transferencia.
- Si `transferSize` es 0, comprueba la posible reutilización de caché, pero considera también las restricciones de exposición cross-origin y las condiciones de implementación del navegador.

Sin embargo, los tramos detallados de los recursos cross-origin están ocultos por defecto. Como explica la [especificación de Resource Timing](https://www.w3.org/TR/resource-timing/) del W3C, algunos valores detallados solo se exponen cuando el servidor que los sirve lo permite con la cabecera de respuesta `Timing-Allow-Origin`. Aunque un CDN o una imagen externa parezcan lentos, dentro del navegador los tramos pueden aparecer como 0.

Por eso, en los datos de RUM, un 0 no siempre significa rápido. Puede ser un valor invisible por razones de permisos.

## La interpretación de las Web Vitals

LCP, INP y CLS, las métricas incluidas en :term[Web Vitals]{key="web-vitals"}, no son marcas de tiempo que el navegador registró una sola vez. Son métricas centradas en el usuario, construidas interpretando varios entries y el ciclo de vida de la página.

LCP se actualiza cada vez que cambia el candidato a contenido principal visible en pantalla. INP observa los clics, toques e interacciones de teclado durante la vida de la página y luego elige como valor representativo uno cercano al más lento. Cuando las interacciones superan las 50, se excluyen algunos valores extremos, pero en la mayoría de las páginas la interacción más lenta se convierte en el INP. CLS no suma todos los desplazamientos indefinidamente; selecciona el mayor valor entre ventanas de sesión agrupadas por intervalos de tiempo fijos.

Se puede calcular todo esto a mano, pero es difícil acertar con las condiciones de frontera, incluyendo los momentos en que la página se oculta o se restaura. La librería [`web-vitals`](https://github.com/GoogleChrome/web-vitals) de Google no es una herramienta que entrega los entries del navegador tal cual; es una implementación que aplica, sobre las API estándar, ese manejo del ciclo de vida y las reglas de cálculo de cada métrica.

Un paso más adentro surge el problema de que la puntuación sola no basta. Sabes que el LCP fue de 4 segundos, pero si no sabes qué elemento y qué recurso produjeron ese valor, no puedes encontrar qué corregir. El build `web-vitals/attribution` añade información más cercana a las causas, como el elemento del LCP, el objetivo del evento y los tramos de procesamiento del INP, y los elementos que contribuyeron al CLS.

Es decir, la observación se profundiza en tres etapas.

1. Recolectar las métricas.
2. Encontrar la distribución de los usuarios y entornos lentos.
3. Atribuir la métrica a los elementos, scripts y peticiones que la produjeron.

Con la primera etapa sola se produce un informe; solo al llegar a la tercera aparece información sobre la que se puede actuar.

## Laboratorio y usuarios reales

Lighthouse y DevTools son buenos para medir repetidamente la misma página en condiciones controladas. Son útiles para atrapar regresiones antes de desplegar el código o para analizar a fondo un perfil concreto. Pero no pueden mostrar en qué dispositivos y redes estuvieron los usuarios reales ni cómo interactuaron.

:term[RUM]{key="rum"}(Real User Monitoring) recolecta valores en los navegadores de los visitantes reales. La [documentación de Web Vitals](https://web.dev/articles/vitals) de Google recomienda evaluar las Core Web Vitals en el percentil 75 de las visitas a la página y mirar por separado móvil y escritorio. Un único promedio puede borrar al grupo de usuarios lentos.

El INP, en particular, solo puede calcularse cuando hay entrada real. Lighthouse, que no tiene usuarios, usa el TBT como métrica sustituta del INP. Ambos están relacionados, pero no son el mismo valor.

Chrome UX Report (CrUX) también es RUM, pero su carácter difiere del RUM interno de un servicio. La [CrUX API](https://developer.chrome.com/docs/crux/api) proporciona field data agregada de los usuarios de Chrome por página o por origin. Es buena para compararse con el estándar de la industria, pero no permite ver junto a ella una release concreta, un flujo de usuario o el estado de la aplicación.

A la inversa, un RUM propio permite añadir el contexto que quieras, pero el sesgo de la muestra y los errores de implementación corren de tu cuenta. Si los bloqueadores de anuncios frenan las peticiones de recolección, si excluyes a los usuarios que no dieron su consentimiento, o si cierto navegador no soporta una API, los usuarios observados dejan de parecerse al total de usuarios.

Mi blog es un pequeño ejemplo de esa elección. En este blog, un único componente de cliente llamado `WebVitalsReporter` carga dinámicamente `web-vitals`, mide LCP, INP, CLS, FCP y TTFB, y los envía a GA4 como un único evento llamado `web_vitals`. Los nombres de las métricas se distinguen con `event_label`, y se incluye `metric.id` para no contar dos veces los valores actualizados dentro de la misma vida de la página. Como el value de un evento de GA4 es un entero, el CLS se multiplica por 1000 y se redondea. Es una configuración montada sobre el GA4 que ya operaba, sin servidor de recolección aparte.

Siendo honesto, lo que he comprobado hasta ahora con esta configuración llega solo hasta el hecho de que los valores se envían. Para ver en GA4 la distribución p75 o el ranking de páginas lentas que un producto RUM dedicado da por defecto, tendría que montar aparte un informe de exploración, y ese trabajo todavía no lo he hecho. Es decir, esta capa está encendida y los datos se acumulan, pero el lado que los lee está vacío. Y hereda tal cual los sesgos de arriba. Si un bloqueador de anuncios frena la petición a GA, ese visitante desaparece de mi distribución.

Ninguna de las dos es la respuesta correcta; responden preguntas distintas.

- ¿Este cambio se volvió más lento, antes de desplegar?: lab data
- ¿Dónde están los tramos lentos de los usuarios reales?: RUM propio
- ¿En qué nivel está este origin en la web pública?: CrUX

Si eliges un RUM propio, la siguiente pregunta es qué contar como una experiencia de página. Solo cuando esa frontera queda fijada se pueden diseñar de forma coherente los valores y el contexto a recolectar.

## La frontera difusa de la página

En la navegación tradicional, el navegador sabe dónde empieza y termina un documento. En la client-side navigation de una SPA, la URL y la pantalla cambian pero no se crea un documento nuevo. Desde el punto de vista del navegador, tiende a quedar como una única y larga vida de página.

Para resolver este problema, cada herramienta de RUM y cada framework ha usado sus propias heurísticas. Pero cada implementación definía "pantalla nueva" de forma distinta, lo que dificultaba la comparación. A través de la [Soft Navigations API](https://developer.chrome.com/docs/web-platform/soft-navigations), el equipo de Chrome ha impulsado la dirección de que el navegador reconozca directamente una soft navigation, atando la entrada del usuario, el cambio de URL y la actualización de la pantalla.

Esta API viene incluida por defecto desde Chrome 151, publicado en agosto de 2026. La librería `web-vitals` también empezó a soportar, desde la 6.0, el reporte de métricas por unidad de soft navigation con la opción `reportSoftNavs`. Sin embargo, por ahora solo funciona en los navegadores de la familia Chromium, y Firefox y Safari no tienen una implementación equivalente, así que no puede reemplazar de inmediato la instrumentación de rutas existente. Mi blog también entra de la lista de artículos a un artículo con la client-side navigation de Next.js, y mientras el código de recolección se basó en la 5.x, esa transición no se capturaba como una experiencia de página separada. Al escribir este artículo subí a la 6.2.1, activé `reportSoftNavs` y luego conecté un Chrome headless a producción para abrir tal cual las peticiones que salían hacia GA4. En una sesión salieron estos valores.

| Métrica | Valor | `navigationType` |
|---|---|---|
| TTFB | 798ms | `navigate` |
| FCP | 1680ms | `navigate` |
| LCP | 1680ms | `navigate` |
| FCP | 542ms | `soft-navigation` |
| TTFB | 0ms | `soft-navigation` |

Tal como se pretendía, la transición de la lista al artículo quedó capturada como una experiencia separada. Pero la misma tabla también muestra por qué no termina con una sola opción. **El TTFB de una soft navigation es 0.** Es un valor obvio, porque nunca se hizo una petición al servidor, pero si este 0 se acumula en el mismo lugar que los 798ms de la carga inicial, el promedio de TTFB baja en silencio sin que nadie toque el código. Por eso tuve que modificar el código para enviar como parámetro del evento el `navigationType` que llega con cada métrica. Añades una observación y crecen con ella las dimensiones necesarias para distinguirla.

Al volver a medir aprendí dos cosas más. Una es que, para que el navegador reconozca una soft navigation, **tiene que haber entrada del usuario**. Cuando llamé a `click()` desde un script, no se generó el entry `soft-navigation` aunque la URL cambió y la pantalla se actualizó; solo se capturó después de enviar una entrada real de ratón. La otra es que los lugares donde ocurre esa transición en este blog son más estrechos de lo que pensaba. Los enlaces de la lista y del encabezado son el `Link` de Next, así que son client-side navigation, pero **los enlaces internos dentro del cuerpo del artículo son etiquetas `a` normales generadas por Markdown, así que son cargas de página completas**. Incluso dentro del mismo sitio, algunos movimientos son soft navigations y otros no.

El hecho más importante que muestra este caso es que medir el rendimiento de una SPA no es un simple problema de configuración de librería, sino la cuestión de **quién define la frontera de la página**.

Una vez fijada la frontera de la página, también se puede decidir en qué unidad guardar la ruta, el metric id y el contexto de sesión. Llevemos ahora esa pregunta al modelo de datos del RUM.

## El modelo de datos del RUM

El código que envía valores con `navigator.sendBeacon()` no es largo. Lo difícil es controlar el costo y la :term[cardinalidad]{key="cardinality"} sin perder las preguntas que querrás responder después.

Como mínimo, acabas considerando junto el siguiente contexto.

| Contexto | Por qué hace falta |
|---|---|
| Página y ruta | Distinguir las pantallas lentas |
| Release y commit | Encontrar el despliegue que introdujo la regresión |
| Tipo de navegación | Distinguir navegación nueva, recarga y restauración por bfcache |
| Dispositivo y conexión | Ver cómo difiere la distribución según el entorno |
| Metric id | No contar dos veces los valores actualizados en la misma vida de página |
| Session y trace id | Conectar comportamiento, errores y peticiones al servidor |
| Visibility state | Filtrar los valores distorsionados en pestañas en segundo plano |

Si a esto le añades sin criterio el selector DOM completo, la URL completa y el ID del usuario, el análisis parece más fácil, pero crecen el costo y el riesgo de privacidad. Las URL dinámicas hacen explotar la cardinalidad, y en los selectores y los cuerpos de red puede colarse información personal.

Los datos de observación no son mejores cuantos más haya. **Es mejor no recolectar los atributos que no se conectan con una decisión que tomarás después.**

## Opciones de recolección y almacenamiento

No hace falta construir la observabilidad del navegador desde cero.

- `web-vitals` proporciona el cálculo de las Core Web Vitals y la attribution.
- [Boomerang](https://github.com/akamai/boomerang) es un recolector RUM de código abierto con larga historia, que ofrece numerosos plugins de rendimiento y formas de envío por beacon.
- [Grafana Faro Web SDK](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/) recolecta rendimiento, errores, logs y traces en el navegador y los conecta con la observabilidad del backend.
- OpenTelemetry JavaScript puede generar traces del navegador, pero la [documentación oficial](https://opentelemetry.io/docs/languages/js/) todavía marca la client instrumentation del navegador como experimental.

Al elegir una herramienta, antes que el número de funciones hay que mirar el alcance que vas a poseer. La elección cambia según si solo usarás el SDK, si también operarás el endpoint de recolección y el almacenamiento, o si te harás responsable hasta del borrado de datos personales y las políticas de retención.

Con un SaaS se reduce la carga operativa; operando tú mismo un stack de código abierto puedes controlar con más detalle la ruta de los datos y el modelo de costos. Ninguna de las dos sale gratis.

## La decisión de renunciar a 79KB

Ya que salió el tema del costo, dejo anotada una decisión que tomé de verdad en este blog. La instrumentación de errores de este blog (Sentry) es solo de servidor. Me seguía incomodando no poder ver los errores que ocurren solo en el navegador, así que activé la instrumentación de cliente y comparé el total gzip del JS de cliente sobre un clean build.

| Configuración | client JS (gzip) | Incremento |
|---|---|---|
| Sin Sentry | 181.6 KB | base |
| **Solo servidor (actual)** | **182.3 KB** | **+0.7 KB** |
| Solo servidor + llamar a `captureException` en la UI de respaldo de errores | 186.0 KB | +4.4 KB |
| Cliente + servidor | 260.4 KB | +78.8 KB |

La instrumentación de servidor era prácticamente gratis, pero la del navegador exigía 78.8KB. También probé las opciones de optimización del bundle, pero la cifra no se movió, y la única forma de reducir el costo del cliente era no tener en absoluto un archivo de inicialización del navegador. La tercera fila cuesta 4.4KB por la misma estructura. Sin el SDK del navegador, el `captureException` de la UI de respaldo de errores es un no-op que no hace nada, pero el código del SDK igual viaja en el bundle. Por eso quité la llamada misma.

Esta medición también tiene defectos. Es la suma de todos los artefactos estáticos, así que difiere de lo que un visitante descarga realmente, y el hecho de que activar las opciones de optimización no redujera ni un byte puede ser señal de que esas opciones no estaban surtiendo efecto. Así que, para ser exactos, lo correcto no es "la observabilidad del navegador cuesta 79KB" sino "en mi configuración no pude bajarla de ahí".

Aun así, la decisión fue clara. En este blog, el rendimiento de carga es a la vez la experiencia del usuario y la premisa de la visibilidad en buscadores, y quien paga los 78.8KB no soy yo sino el visitante. Si es una observación cuyo costo pagan los usuarios, hay que preguntarse qué les devuelve esa observación, y mi respuesta sobre la instrumentación de errores de cliente en un blog personal fue "no devuelve lo suficiente". En una sección anterior dije que el código que mide la experiencia del usuario puede empeorar la experiencia del usuario; extiende ese principio a la escala de adoptar una herramienta y llegas aquí. **Hacer la observación más densa no siempre es la elección correcta.**

## La barrera de entrada de las preguntas

Al conectar las API y herramientas anteriores con preguntas reales, la IA resulta útil en tres puntos.

Primero, estrecha el camino del síntoma a la especificación. Síntomas como "el LCP llega dos veces", "todos los tramos de un recurso cross-origin son 0" o "el valor no se actualiza tras una transición en la SPA" pueden conectarse con las API y condiciones pertinentes.

Segundo, ayuda a traducir los resultados de herramientas distintas a un mismo eje temporal. Cuando el trace de DevTools, el event de RUM, el span de Sentry y los logs del servidor apuntan a tiempos e identificadores distintos, permite generar rápido candidatos para comparar.

Tercero, permite explorar distribuciones y tramos anómalos en los datos recolectados. En lugar de promedios simples, propone diferencias por navegador, ruta, release y dispositivo, y baja el costo de construir la siguiente consulta.

Sin embargo, este proceso genera candidatos; no sustituye a la evidencia. Los usuarios no recolectados no están en los datos, y una métrica mal definida produce conclusiones erróneas por muy fino que sea el análisis. Si se pueden enviar datos personales, o si los usuarios deben cargar con el costo del código de observación, tampoco puede decidirse solo con documentación técnica.

La IA no es tanto un nuevo sensor que hace observar mejor el navegador, sino una herramienta que abarata leer el manual de los sensores existentes y formular preguntas.

## La observación empieza en una pregunta

En resumen, el navegador ya registra en detalle la red, el renderizado, la entrada y los cambios de layout. `PerformanceObserver` es el punto de partida para leer ese registro, las Web Vitals son métricas que lo interpretan en el lenguaje de la experiencia del usuario, y el RUM es el sistema que recolecta continuamente su distribución en los entornos de usuarios reales.

Las tres etapas se parecen, pero responden preguntas distintas. Los entries dicen qué pasó en el navegador, las Web Vitals comprimen qué percibió el usuario, y el RUM muestra a quién y con qué frecuencia se repite esa experiencia.

El umbral para leer varias especificaciones y combinar herramientas ha bajado, pero poder recolectar con facilidad y poder interpretar correctamente son problemas distintos. Solo cuando puedes explicar qué usuarios faltan y bajo qué condiciones se distorsionan los valores, los datos de observación se convierten por fin en información útil para decidir. Espero que quienes leen este artículo también se detengan a repasar qué experiencia, resumida con qué reglas, representan los números de rendimiento que tienen delante.

En el siguiente artículo, [Observabilidad del sistema](/260915), quiero ver cómo estos datos del navegador pueden conectarse con errores, traces, profiles y logs del servidor. Es la historia de seguir hasta dónde llegó, dentro del sistema, una petición que empezó en la pantalla del usuario.

:::ref
- [docs] [W3C, Event Timing API](https://www.w3.org/TR/event-timing/)
- [docs] [W3C, Long Animation Frames API](https://www.w3.org/TR/long-animation-frames/)
- [docs] [web.dev, Debug Performance in the Field](https://web.dev/articles/debug-performance-in-the-field)
- [docs] [Chrome for Developers, Back Forward Cache](https://developer.chrome.com/docs/web-platform/bfcache)
:::
