---
emoji: 🧩
title: 'De la observación al juicio'
seoTitle: 'Core Web Vitals y SEO: lo que muestran CrUX y Search Console'
date: '2026-09-16'
updatedAt: '2026-09-19'
categories: observabilidad frontend GA4 Search-Console
description: 'Cómo CrUX, PageSpeed Insights y Search Console filtran las Web Vitals, qué dice Google del ranking y un artículo con más clics pese a bajar de posición.'
keywords: 'datos de campo CrUX, PageSpeed Insights datos de campo, informe Core Web Vitals Search Console, Core Web Vitals afecta al posicionamiento, clics por consulta y por página Search Console, posición media bajó clics subieron, frecuencia de rastreo 5xx 429'
locale: es
translationOf: '260916'
sourceHash: ffb98bcd9319ff4b9e6d07267eeaf96c6cb22ce658817b7a29f36977d6a8de15
---

En este artículo quiero hablar del camino que recorren los datos de rendimiento medidos en el navegador hasta llegar a la búsqueda y al juicio.

Los tres primeros artículos de esta serie trataron señales que tengo yo mismo. En [Volver a abrir Sentry](/260913) vimos las llamadas que fallan en silencio en el servidor; en [Observabilidad del navegador](/260914), la red y el renderizado; y en [CPU y memoria del navegador](/260915), el hilo principal y la memoria. En los tres casos se trata de datos para los que yo mismo inserté el código de instrumentación y que leo desde mi propio almacenamiento.

Los datos de este artículo son de otra naturaleza. Los valores generados en los navegadores de los visitantes pasan al pipeline estadístico de Chrome, y el resultado vuelve a aparecer en PageSpeed Insights y en :term[Search Console]{key="search-console"}. De quién se cuenta la experiencia, cuántos datos deben acumularse para mostrarse y en qué unidades se agrupan lo decide todo Google.

Por eso la pregunta que este artículo intenta responder es una sola. **¿Qué hay que comprobar antes de usar para decidir un número que ya salió del navegador?** Mi respuesta es anotar primero la muestra y las reglas de agregación de cada número, no añadir nada que el texto oficial no diga y volver a medir con otro periodo cualquier conclusión a la que se haya llegado.

## Los web_vitals que recojo

El punto de partida es el :term[RUM]{key="rum"} que recojo yo mismo. Como vimos en el artículo de observabilidad del navegador, este blog mide LCP, INP, CLS, FCP y TTFB con `web-vitals` y los envía a GA4 como eventos `web_vitals`. Lo que conviene volver a mirar aquí no es qué parámetros se envían, sino **de quién es la experiencia que entra en la muestra**.

La muestra de esta recogida son **los navegadores en los que gtag.js se ejecutó de verdad**. Los eventos se acumulan primero en `dataLayer` y gtag.js consume esa cola al cargarse, así que en entornos donde la petición del script está bloqueada, las mediciones se generan pero nunca salen. A la inversa, un navegador que no sea Chrome también entra en la muestra si gtag.js se ejecuta y el navegador admite la métrica. Además, por `reportSoftNavs: true`, una pantalla que cambia por enrutamiento del lado del cliente se cuenta como una experiencia de página distinta. Como veremos más adelante, CrUX cuenta esa misma visita de otra manera.

Para ser sincero, mientras escribía este artículo no volví a consultar los valores de `web_vitals` acumulados en GA4. Tampoco comprobé la pregunta que dejé pendiente en el artículo anterior, es decir, si registrando `metric_navigation_type` como custom dimension de GA4 se pueden segmentar realmente los datos. Intenté consultarlo con una cuenta de servicio, pero ese proyecto no tenía habilitada la Analytics Admin API. **Enviar datos y poder leerlos son cosas distintas, y en este blog solo está comprobada la primera.**

## Los usuarios que cuenta CrUX

Los field data que Google mira del lado de la búsqueda no vienen de mi GA4, sino del Chrome User Experience Report (CrUX). Si se lee la [documentación de metodología de CrUX](https://developer.chrome.com/docs/crux/methodology), la muestra se reduce a través de tres capas de condiciones.

La primera es la condición de usuario. Solo entran los usuarios que tienen activado el envío de estadísticas de uso, sincronizan su historial de navegación y no han configurado una frase de acceso para la sincronización. Las plataformas son Chrome de escritorio y Chrome para Android; **quedan fuera Chrome en iOS, Android WebView y otros navegadores Chromium como Edge.** No se publica qué porcentaje del total de usuarios cumple estas condiciones.

La segunda es la condición de página. La página debe ser públicamente descubrible con el mismo criterio que un buscador. Una página que no devuelve 200 tras las redirecciones o que lleva `noindex` no es elegible. Además tiene que superar un número mínimo de visitantes; esa cifra no se publica y se aplica el mismo valor a páginas y a origins.

La tercera es el método de agregación. Se eliminan las query strings y los fragmentos, y se agrupan como la misma página. Y la documentación indica explícitamente que las transiciones de ruta con JavaScript de una SPA, aunque al usuario le parezcan páginas nuevas, **se atribuyen a la experiencia de la única página cargada inicialmente**. Es exactamente lo contrario de mi RUM, que cuenta las soft navigations por separado. La [documentación del equipo de Chrome sobre soft navigations](https://developer.chrome.com/docs/web-platform/soft-navigations) también señala que todavía no se ha decidido cómo se reportarán las soft navigations a CrUX.

Si se aplican estas condiciones a mi blog, salen resultados concretos. El 11 de septiembre de 2026 pasé a `noindex, follow` 126 páginas de categoría que tenían un solo artículo. Esas páginas ya no son elegibles para CrUX a nivel de página. ¿Siguen contando, entonces, a nivel de origin? La respuesta de la documentación se divide dentro de una misma página. La sección Origin dice que, si el origin es descubrible, las experiencias de todas sus páginas se combinan a nivel de origin sin importar si cada página es descubrible, mientras que el comienzo de la sección Eligibility del mismo documento dice que las experiencias que no cumplen las condiciones de Page tampoco se incluyen en los datos a nivel de origin. No encontré forma de comprobar cuál es el comportamiento real. **Por eso dejo escrito que no sé si las visitas a las categorías pasadas a noindex siguen en el valor del origin.**

Hasta aquí las reglas que comprobé en la documentación. Lo importante es que **no sé si hooninedev.com supera el número mínimo de visitantes.** Como ese umbral no es público, la única opción es consultarlo directamente, y ese intento se atascó en la siguiente sección.

## Los dos números de PageSpeed Insights

PageSpeed Insights muestra en una sola pantalla dos tipos de números de naturaleza distinta. Según la [explicación oficial](https://developers.google.com/speed/docs/insights/v5/about), los datos lab son una única carga simulada por Lighthouse, y los datos field son los últimos 28 días de CrUX. Lab es el resultado de un único dispositivo y unas condiciones de red fijas, mientras que field es el registro de usuarios reales en entornos variados, así que la documentación también advierte que una buena puntuación lab no garantiza una buena experiencia real.

El lado field tiene una regla de respaldo. Si no hay suficientes datos a nivel de página, baja al nivel de origin, y si el origin tampoco tiene suficientes, no puede mostrar datos field en absoluto.

Intenté obtener los datos field de este blog con la API de PSI. Al solicitar `/260914` para móvil a las 2026-09-16T08:45:51Z recibí un HTTP 429, y al solicitar la portada (`/`) una vez más a las 2026-09-16T09:11:17Z recibí el mismo 429. El cuerpo de ambas respuestas era `Quota exceeded for quota metric 'Queries' and limit 'Queries per day'`. Parece que choqué con la cuota compartida por llamar sin clave de API. **Por eso este artículo no contiene valores field de CrUX para este blog.** La API de CrUX requiere una clave de API, y en mi entorno solo hay una cuenta de servicio para Search Console, así que no la llamé.

A esa misma hora, medir `/260914` con Lighthouse en local funcionó sin problemas. **Los valores lab se pueden generar en cualquier momento, pero los valores field solo existen cuando se cumplen el número de visitantes y las condiciones de elegibilidad.** Que en mi RUM se acumulen cifras no significa que CrUX tenga un valor.

## Los grupos de URL de Search Console

La última etapa es el informe de Core Web Vitals de Search Console. La [ayuda del informe](https://support.google.com/webmasters/answer/9205520) indica que los datos vienen de CrUX y añade varias capas más de reglas encima.

- Agrupa páginas similares en un **URL group**, y el estado del grupo sigue a su peor métrica.
- Un grupo solo aparece en el informe si **tanto** LCP como CLS alcanzan la cantidad mínima de datos. Si al grupo le faltan datos, se muestra agrupado en el origin group superior, y si al origin group también le faltan, queda fuera.
- **Solo aparecen URLs indexadas**, y son una muestra, no la lista completa.
- "No data available" significa que la propiedad es nueva o que no hay suficientes datos de CrUX para ese tipo de dispositivo.

Si se encadenan las cuatro etapas, se ve el orden en que se reduce la muestra. RUM cuenta las visitas donde gtag.js se ejecutó; CrUX conserva de ellas solo a los usuarios de Chrome elegibles y las páginas descubribles y con suficiente popularidad; PSI lo muestra a nivel de página o de origin; y Search Console agrupa las URLs indexadas y conserva solo las que superan el umbral. Como cada etapa filtra con reglas distintas, **que el LCP de una misma página aparezca con valores distintos en cuatro sitios no es un error, sino lo normal.**

Mi script de recogida (`scripts/fetch-gsc.js`) solo obtiene Search Analytics. Por eso, en este artículo no comprobé en qué estado está ahora mismo el informe de Core Web Vitals de este blog. Como existe el respaldo del origin group, tampoco puedo afirmar "No data available" solo porque el tráfico sea pequeño. No lo sabré hasta abrir el informe.

## Hasta dónde llega lo que Google dice del ranking

Si los datos field se filtran así, la siguiente pregunta es cuánto se usan en el posicionamiento de búsqueda. Este es el tema donde más fácilmente se cuela la exageración, así que cito tal cual el texto original de la [documentación de page experience](https://developers.google.com/search/docs/appearance/page-experience) de Google Search Central. El documento tiene formato de FAQ y, primero, responde así a la pregunta de si existe una única señal de page experience que se use en el ranking.

> There is no single signal. Our core ranking systems look at a variety of signals that align with overall page experience.

Quiere decir que no existe una señal única como una puntuación de page experience. La pregunta que sigue es qué aspectos de page experience se usan en el ranking, y la respuesta es esta.

> Core Web Vitals are used by our ranking systems. We recommend site owners achieve good Core Web Vitals for success with Search and to ensure a great user experience generally. Keep in mind that getting good results in reports like Search Console's Core Web Vitals report or third-party tools doesn't guarantee that your pages will rank at the top of Google Search results; there's more to great page experience than Core Web Vitals scores alone.

Lo que el original deja establecido es que Core Web Vitals se usan en los sistemas de ranking, y enseguida marca un límite: unos buenos resultados en los informes no garantizan aparecer arriba. La misma respuesta continúa diciendo que perseguir una puntuación perfecta solo por SEO puede no ser un buen uso del tiempo, y señala que los aspectos de page experience distintos de Core Web Vitals no mejoran directamente el posicionamiento.

Lo que considero más importante es **lo que este documento no dice**. En ningún sitio aparece cuánto pesan, si el efecto surge en el momento de cruzar un umbral ni cuánto se mueve el posicionamiento al pasar de needs improvement a good. Así que la frase "mejoramos Core Web Vitals y subimos en el ranking" no se puede respaldar con la documentación oficial, y menos aún en este blog. Como vimos en la sección anterior, este blog ni siquiera pudo comprobar sus valores field.

## Las respuestas del servidor que ve el rastreo

Donde la documentación oficial conecta con claridad rendimiento y búsqueda es, más bien, en el rastreo. Aun así, se trata de la velocidad de rastreo y de la indexación, no del ranking.

La [guía de crawl budget](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget) de Google empieza acotando a quién va dirigida. Sitios con 1 millón o más de páginas únicas que cambian más o menos una vez por semana, con 10.000 o más que cambian a diario, o con muchas URLs que Search Console clasifica como "Descubierta: actualmente sin indexar". El texto original dice directamente que, si un sitio no tiene muchas páginas que cambien rápido o sus páginas se rastrean el mismo día en que se publican, no necesita leer la guía. Este blog, con 186 URLs en el sitemap a 16 de septiembre de 2026, no está entre los destinatarios.

Aun así, conviene conocer la regla de capacidad de rastreo de la guía. Si el tiempo de respuesta se mantiene estable o mejora, el límite sube; si se vuelve lento o se envían 5xx o 429, baja. La [documentación de códigos de estado HTTP](https://developers.google.com/search/docs/crawling-indexing/http-network-errors) describe las consecuencias con más detalle. Los 5xx y 429 ralentizan temporalmente al rastreador. Las URLs ya indexadas se mantienen, pero si continúa, acaban saliendo del índice. Los 4xx distintos de 429 no afectan a la velocidad de rastreo. Aquí hay que distinguir con precisión los caminos. Los 5xx prolongados son un camino hacia **la salida del índice**; no encontré ninguna frase oficial que diga que sean una señal que rebaje el posicionamiento.

El mayor incidente de servidor de este blog fue JIHOON-BLOG-2, en el que una llamada a la GA Data API se quedó colgada más de 65 segundos. La respuesta fue 200. Hoy el único que llama a `src/lib/google-analytics.ts` es la ruta `/api/analytics`, pero en agosto la situación era otra. En JIHOON-BLOG-8, cuando las llamadas a GA volvieron a quedarse colgadas, la transaction del último evento fue la página de inicio (`GET /`), y de los 10 eventos que todavía se pueden consultar, 2 son `GET /` y 8 tienen la transaction vacía. Las llamadas a GA también se colgaron en peticiones a la página de inicio, que está abierta al rastreo. Pero no sé si eso afectó al rastreo, porque no abrí el informe Crawl Stats mientras escribía este artículo. **No conecto lo que no he comprobado.**

## La diferencia de clics entre page y query

Ahora cambiemos de dirección y veamos los datos de búsqueda que devuelve Search Console. Son los datos que descargo cada semana en CSV y que de verdad uso para corregir títulos y descripciones.

![En dos periodos de 28 días recogidos con la API de Search Console, el total de clics de la dimensión page es 47, mientras que el de la dimensión query se queda en 8 y 9](1.png?w=720)

Si sumo por dimensión el CSV que descargué el 11 de septiembre de 2026, los números no cuadran. En los últimos 28 días (del 12 de agosto al 8 de septiembre), el total de clics de la dimensión page es 47, mientras que el de la dimensión query es 8. Los 28 días anteriores (del 15 de julio al 11 de agosto) dan 47 y 9. Como la brecha tiene el mismo tamaño en ambos periodos, no es una casualidad puntual, sino algo estructural.

Lo primero que sospeché fue un límite de filas. La [documentación de la Search Analytics API](https://developers.google.com/webmaster-tools/v1/searchanalytics/query) dice que no garantiza todas las filas y que devuelve las principales. Pero mi script pide `rowLimit: 1000`, y las filas de query devueltas fueron 128 y 66. **No se llegó al límite, así que el recorte no es la causa.**

Quedan dos explicaciones, y ambas están en la [ayuda de Search Console](https://support.google.com/webmasters/answer/17010575). Una es la anonimización. Las consultas que se buscan muy rara vez se excluyen de la tabla de consultas por privacidad y solo se incluyen en los totales generales. La otra es la [unidad de agregación](https://support.google.com/webmasters/answer/7576553). La dimensión query cuenta por propiedad. Según el ejemplo de la [explicación de la agregación por propiedad](https://support.google.com/webmasters/answer/17011364), si un usuario hace clic sucesivamente en dos enlaces del mismo sitio, es 1 clic. La dimensión page cuenta por URL, así que el mismo comportamiento se convierte en 2 clics.

Por lo tanto, estos dos totales nunca fueron números construidos con las mismas reglas. Dejo anotada una tentación. En los últimos 28 días hubo seis consultas con clics, y cinco de ellas eran consultas comparativas de Biome, como "eslint vs biome" y "biome vs prettier". Esas cinco consultas suman 6 clics, y justo los clics de page de la URL en coreano del artículo de Biome también son 6. Parece encajar a la perfección, pero **no se pueden vincular dos números con reglas de agregación distintas solo porque sean iguales.** Los datos de query no deben leerse como un desglose del tráfico, sino como una muestra que deja entrever la intención de búsqueda.

## Bajó en el ranking, pero subieron los clics

Hay un caso en el que de verdad tomé una decisión con estos datos de búsqueda. [¿Puede Biome reemplazar a ESLint y Prettier?](/241201) es un artículo que escribí en diciembre de 2024 y que tenía llamativamente pocos clics en relación con sus impresiones. Así que el 11 de junio de 2026 le puse un `seoTitle` que empieza por "Biome vs ESLint vs Prettier", ajustado a la forma de las consultas reales.

En la comparación de 28 días recogida después de cambiar el título, los números de este artículo se movieron así. Las impresiones bajaron un 11%, de 230 a 204, y la posición media retrocedió de 8,9 a 11,6. Mirando solo esas dos métricas, el artículo empeoró. Sin embargo, los clics subieron de 2 a 13 y el CTR pasó del 0,87% al 6,37%.

Estos cuatro números son los valores que consulté entonces. `.gsc-data/` se sobrescribe en cada recogida, así que aquel CSV ya no está en el repositorio y tampoco guardé la fecha exacta de la recogida. Lo único comprobable es que estos números ya aparecen en la instantánea del borrador fechada el 16 de agosto e incluida en un commit del 18 de agosto.

![En la comparación de 28 días de Search Console para el artículo de Biome, las impresiones y la posición media empeoraron, pero los clics y el porcentaje de clics subieron mucho](2.png?w=720)

Lo honesto es rebajar primero el entusiasmo. Estos números no prueban el efecto del cambio de título. La posición media en la dimensión page es el promedio de la posición más alta de esa página registrada en cada impresión, así que basta con que desaparezcan impresiones que salían arriba pero que nadie pulsaba para que la posición empeore y el CTR suba. La composición de consultas y la estacionalidad también cambian de un periodo a otro. El aumento absoluto de clics es de 11 en 28 días. Visto como múltiplo es grande; en términos absolutos, pequeño.

Aun así, algo queda. Si se toma el ranking como resultado, es un artículo que hay que retocar; si se toma el tráfico real, es un artículo que mejoró. **Qué métrica se elige como resultado cambia la conclusión sobre los mismos datos.** Si solo hubiera mirado la caída en el ranking, habría vuelto a desmontar un artículo que acababa de empezar a mejorar.

### Los números consultados de nuevo en septiembre

Mientras escribía este artículo volví a revisar el estado actual del mismo artículo. En el CSV recogido el 11 de septiembre de 2026, la URL en coreano `/241201` queda así.

| Periodo | Impresiones | Clics | CTR | Posición media |
|---|---|---|---|---|
| 28 días anteriores (del 15 de julio al 11 de agosto) | 211 | 11 | 5,21% | 14,5 |
| Últimos 28 días (del 12 de agosto al 8 de septiembre) | 185 | 6 | 3,24% | 20,8 |

Si se ordenan por fecha de recogida los dos valores anteriores (8,9 y 11,6) y los dos de este CSV (14,5 y 20,8), la posición media fue retrocediendo durante todo el verano. Los clics fueron 13, luego 11 y luego 6. El periodo reciente de la primera comparación y el periodo anterior de la recogida de septiembre pueden solaparse, así que es difícil leer el paso de 13 a 11 como una caída, pero el 6 del periodo reciente es claramente un número que bajó. La historia de "bajó en el ranking, pero subieron los clics" era más nítida en la primera comparación, y el siguiente periodo la sacudió.

Aun así, la conclusión de la sección anterior no se invierte. 6 clics y un CTR del 3,24% siguen siendo más que en el periodo anterior de la primera comparación (2 clics, 0,87%). Pero se sumó una lección. No solo la elección de la métrica, sino **también la elección del periodo de comparación cambia la conclusión.** Si se cierra una historia con una sola comparación de 28 días, los 28 días siguientes la rompen.

Además, en el periodo reciente entran por primera vez las cinco traducciones de este artículo que subí en un commit el 17 de agosto. La versión en inglés, `/en/241201`, tuvo 84 impresiones y 0 clics, y la versión en chino, 12 impresiones y 1 clic. Todavía no sé si las traducciones se repartieron las impresiones con la URL en coreano ni por qué la posición media sigue retrocediendo. Hasta comprobarlo, lo dejo sin resolver.

## Cambios superpuestos en un mismo periodo

No atribuir causalidad en el artículo de Biome no es solo cuestión de prudencia. En este blog existen condiciones reales en las que la causalidad no se puede aislar.

Solo el 11 de septiembre de 2026 entraron seis cambios relacionados con la búsqueda, entre ellos la recuperación de hreflang, la reescritura de 48 títulos, la corrección de las imágenes OG y el noindex en 126 categorías, y hasta el 16 siguieron otra corrección de hreflang, la introducción de IndexNow, la reescritura de títulos y descripciones que se cortaban y la publicación de un artículo nuevo. La reescritura de este artículo también entra en ese periodo.

El 11 de septiembre dejé un documento de línea base. En los últimos 28 días hasta ese momento, las páginas de artículos en inglés tenían 892 impresiones y 0 clics, y decidí ver a principios de octubre si ese número se mueve. Pero aunque los clics en inglés suban en octubre, no podré elegir una única causa. Puede ser la corrección de hreflang, la reescritura de títulos del 11 de septiembre o la corrección de los cortes del 16 de septiembre. Además, los datos de la línea base ya contienen un contraejemplo. zh-CN, que solo tenía un título cortado, tuvo 7 clics, la mayor cifra entre los locales que no son coreano, lo que hace difícil ver el corte de títulos como la causa. **Por eso decidí que en la comparación de octubre leeré solo la dirección y no afirmaré contribuciones individuales.**

## Anotar primero la muestra y las reglas de cada número

Si los tres primeros artículos mostraron los fallos silenciosos del servidor, el tiempo que esperaron los visitantes y el lugar donde se originó esa espera, los datos de este artículo son lo que queda de esa experiencia después de salir del navegador y pasar por las reglas de otros. Por eso la conclusión también es un poco más defensiva. Los datos field se reducen en cada etapa, con reglas distintas, al pasar por RUM, CrUX, PSI y Search Console, y en un sitio tan pequeño como este blog puede que no sobrevivan hasta el final. Lo que Google dice del ranking se detiene en que Core Web Vitals se usan, y la documentación de rastreo se detiene en que las respuestas lentas y los 5xx afectan al rastreo y a la indexación. Los totales de page y query de Search Console son números contados con reglas distintas, así que no cuadran entre sí. **Anotar primero, para cada número, a quién se contó y con qué reglas, y detenerse donde se detiene el texto oficial.** Convertir la observación en juicio consistió, sobre todo, en esas dos cosas.

Yo también pienso comparar en octubre la línea base con el nuevo CSV leyendo solo la dirección. Si has seguido esta serie y la próxima vez te toca decidir algo a partir de un número de un dashboard, te recomiendo anotar primero, en una sola línea, a quién contó ese número y con qué reglas. Y vuelve a consultar esa conclusión un mes después con otro periodo.

:::ref
- [docs] [web.dev, Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- [docs] [Google Search Central, Understanding Core Web Vitals and Google search results](https://developers.google.com/search/docs/appearance/core-web-vitals)
:::
