---
emoji: 🔎
title: '42 MB rastreados con el panel Network'
seoTitle: 'Chrome DevTools Network: rastrear 42 MB con Initiator'
date: '2026-11-20'
categories: frontend rendimiento DevTools
description: 'La pantalla inicial de Toss Bank descarga 42 MB. Size e Initiator revelan 27 MB de PNG originales para leer un píxel del fondo de las tarjetas.'
keywords: 'Chrome DevTools Network, cómo usar la pestaña Network, pila asíncrona Initiator, Disable cache primera visita, imágenes loading lazy, Resource Timing transferSize, canvas getImageData CORS, optimizar transferencia de imágenes'
locale: es
translationOf: '261120'
sourceHash: d042953f2b5f612a21f4d2c9e416a9ddd7b509eafa8de9fa080916dede2a3734
---
En este artículo voy a seguir hasta el final la cantidad de datos transferidos por una página con el panel Network de Chrome DevTools.

Está dirigido a desarrolladores frontend que quizá hayan buscado una API fallida en la pestaña Network, pero no sepan por dónde empezar para averiguar por qué una página pesa tanto. Siguiendo, en orden, la fila de resumen inferior, la columna Size e Initiator, encontraré hasta la línea de código el origen de los 42 MB de la pantalla inicial de Toss Bank. En el proceso, comprobaré qué solicitudes no consigue detener `loading="lazy"` y en qué casos la cifra medida con Disable cache activado difiere de la de una primera visita.

En el trabajo, abro a diario el panel Network cuando analizo el rendimiento de una página, pero siempre acabo mirando los mismos elementos de siempre. Por eso decidí aplicar los paneles de DevTools, uno por uno, a un servicio real y examinarlos hasta el final. Para empezar, elegí la página de inicio de Toss Bank (`www.tossbank.com`), que cualquiera puede abrir sin iniciar sesión. No puedo saber por qué Toss Bank lo construyó así, así que no voy a juzgarlo. Este artículo trata de las cifras que muestra el panel y de cómo se producen.

## La fila de resumen inferior

Hice la medición el 20 de noviembre de 2026, alrededor de las 18:00, con Chrome 157.0.8103.80 en modo headless. Cada vez abrí la página en un perfil nuevo, con la ventana a 1600x1000, y conté lo recibido durante 15 segundos sin limitar la red. Repetí la medición tres veces y obtuve el mismo valor hasta la segunda cifra decimal de MB. La página de inicio de Toss Bank cambia con los despliegues y el feed; esa misma mañana una tarjeta era distinta y el resultado era 2 MB mayor. Por eso creé una demo que reproduce la misma estructura en [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/image-color-sampling), que mediré también más adelante en el artículo.

Al abrir el panel Network y recargar la página, lo primero que conviene mirar es la fila del final. En la página de inicio de Toss Bank aparecieron 156 solicitudes, `42,202 kB transferred` y `55,603 kB resources`. La [referencia del panel Network](https://developer.chrome.com/docs/devtools/network/reference) explica que esta fila muestra el tamaño total transferido y el tamaño total una vez descomprimido. transferred es la cantidad que realmente pasó por la red: los encabezados de respuesta y el cuerpo comprimido. resources es el tamaño descomprimido y también suma el tamaño completo de las respuestas obtenidas de la caché, aunque hayan aportado 0 bytes a la red. Por eso resources es mayor.

Al aplicar un filtro, la fila cambia a dos valores: «resultados del filtro / total». Si pulso Img en el filtro de tipo, aparecen `57 / 156 requests` y `40,450 kB / 42,202 kB transferred`. Las imágenes, que representan el 37% de las solicitudes, ocupan el 96% de los datos transferidos. Por eso empiezo por ellas. Con el mismo filtro, resources marca 50,862 kB, algo más de 10 MB por encima de transferred. Los PNG no llegan comprimidos, así que casi toda esa diferencia corresponde a imágenes obtenidas de la caché. Volveré a esta cifra al hablar de Disable cache.

![En la pantalla Network de la página de inicio de Toss Bank, al activar el filtro Img y ordenar Size de forma descendente, el banner de arriba aparece solicitado por Parser y las miniaturas de las tarjetas de abajo, por Script. 1 es el filtro Img; 2, el encabezado de la columna Size ordenada de forma descendente; 3, las dos cifras de Size de la primera fila, tossbank-banner-web-Financial-sector.png: 5,590 kB y 5,587 kB. 4 es Initiator en esa misma fila: (index):5 y Parser; 5 es Initiator en la segunda fila, bankfeed-gold-decline-cover.png: index-8989962b29fa3f03.js:1 y Script. 6 son las dos cifras de Size de logo-bank-mono-white.svg: 1,616 kB y 2,140 kB. 7 es la fila inferior: 40,450 kB / 42,202 kB transferred; 8 es 50,862 kB / 55,603 kB resources](1.png?w=720)

## Las dos cifras de la columna Size

Con el filtro aplicado, pulso el encabezado de Size para ordenar de mayor a menor. De forma predeterminada, la columna Size muestra una sola cifra. Si pulso el icono de engranaje, al extremo derecho de la barra de herramientas del panel Network, por encima de la fila de filtros, y activo Big request rows, aparecen dos cifras. Según la referencia, la de arriba es el tamaño combinado de los encabezados y el cuerpo enviados por el servidor; la de abajo es el tamaño descomprimido.

El banner superior `tossbank-banner-web-Financial-sector.png` marca 5,590 kB arriba y 5,587 kB abajo: casi lo mismo. Como PNG ya es un formato comprimido, el servidor no volvió a comprimir la respuesta y esta no tenía `content-encoding` en sus encabezados. Solo los encabezados de respuesta no explican los 3.7 kB restantes. La respuesta llegó por HTTP/2, que divide el cuerpo en tramas (de un máximo predeterminado de 16 KB) y añade un encabezado de 9 bytes a cada una. Chromium también cuenta esos encabezados de trama como bytes recibidos ([`spdy_session.cc`](https://github.com/chromium/chromium/blob/main/net/spdy/spdy_session.cc)). Si dividimos los 5.6 MB en tramas de 16 KB, salen algo más de 340; solo sus encabezados suman unos 3 kB. Al añadir los encabezados de respuesta, el cálculo encaja. En cambio, el logo `logo-bank-mono-white.svg` muestra 1,616 kB arriba y 2,140 kB abajo, una diferencia considerable. SVG es texto, así que se transmitió comprimido con gzip. El logo ocupa 2 MB porque contiene dos imágenes PNG codificadas en base64.

En la parte superior de la lista ordenada aparecen el banner superior y las miniaturas de las tarjetas del feed. Los tres banners grandes tienen un original de 5120x2800 y se muestran en pantalla a 1600x1000. Las miniaturas de tarjetas cuyos nombres empiezan por `bankfeed-` tienen un original de 3200x2160 y se muestran a 302x170. Incluso si tomamos como referencia una pantalla Retina, que dibuja cada píxel CSS con dos píxeles físicos (relación de píxeles del dispositivo 2), los banners reciben 5,120 px cuando necesitan 3,200 px de ancho, y las tarjetas, 3,200 px cuando necesitan 604 px. Confirmé las dimensiones originales leyendo `naturalWidth` en la página.

También comparé la cifra superior de Size con otra herramienta. Los datos transferidos de este artículo son la suma de `encodedDataLength`, que Chrome DevTools Protocol (CDP) proporciona para cada solicitud, y coinciden con la fila inferior hasta el byte. También se pueden leer desde el JavaScript de la página. Al consultar la miniatura de tarjeta más grande mediante `performance.getEntriesByType('resource')`, `transferSize` es 300 mayor que `encodedBodySize`. La [especificación Resource Timing](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-transfersize) establece que se añadan 300 como constante al tamaño del cuerpo para no revelar el tamaño real de los encabezados. Que apareciera este valor en una imagen de otro origen se debe a que la solicitud se hizo con CORS y el servidor permitió ambos encabezados, `access-control-allow-origin` y `timing-allow-origin`, con el valor `*`.

Si solo miramos los tamaños, parece una historia habitual de optimización de imágenes. Pero al mirar también la columna Initiator vemos que las miniaturas de las tarjetas las solicitó un script, no el `<img>` que aparece en pantalla.

## Initiator y la pila asíncrona

La columna Initiator muestra quién creó la solicitud. Los valores que aparecen en la referencia son Parser, Redirect, Script, Early Hints y Other. En la figura 1, Initiator del banner muestra `(index):5` y Parser. El parser que leía el HTML encontró un `<img>` e hizo la solicitud. La miniatura de tarjeta `bankfeed-gold-decline-cover.png` muestra `index-8989962b29fa3f03.js:1` y Script. La solicitud se produjo mientras se ejecutaba un script.

La tarjeta que aparece en pantalla usa un `<img>`, así que ¿por qué figura Script? Si pulso la fila y abro la pestaña Initiator del panel de detalles, aparece la pila de llamadas que creó la solicitud.

![La pestaña Initiator de la misma solicitud muestra una pila de llamadas dividida en tres límites asíncronos: Image, setTimeout y await in fetch. 1 es la pestaña Initiator; 2 es el primer grupo, Image, con dos instancias de T.o, T y (anonymous), todas en index-8989962b29fa3f03.js. 3 es el grupo setTimeout, con batch, setData y fetch de los bundles main y _app; 4 es el grupo await in fetch, con H, onSubscribe y subscribe](2.png?w=720)

Los rótulos en negrita `Image`, `setTimeout` y `await in fetch` marcan límites asíncronos. Los frames que aparecen debajo de cada límite corresponden a la pila en el momento en que se programó esa tarea asíncrona. Por eso, si se lee de abajo arriba, se sigue el orden temporal.

1. Una función llamada `fetch` espera los datos con `await` y luego reanuda su ejecución (4). Ese nombre no corresponde a `window.fetch` del navegador, sino a una función dentro del bundle. `onSubscribe` y `subscribe`, debajo, son quienes la llamaron.
2. Esa función cambia el estado mediante `setData` y, pasando por `batch`, programa `setTimeout` (3).
3. Se ejecuta el temporizador y, tras pasar por frames `framework-*.js` que parecen internos de React, la función `T` asigna el `src` de la imagen (2).

El límite superior, `Image`, señala el momento en que el script asignó el `src` al elemento de imagen. El navegador emite la solicitud por separado justo después, así que Initiator muestra la pila de ese momento. Este nombre por sí solo no permite distinguir entre un `<img>` del DOM y `new Image()`. Para saberlo, hay que abrir el código.

Al pulsar `index-8989962b29fa3f03.js:1` en la pila, el panel Sources abre esa ubicación. Sources muestra los archivos comprimidos con formato legible de forma predeterminada (pretty print), así que se puede leer incluso un bundle de una sola línea. El hash del bundle cambia con cada despliegue, pero el enlace de Initiator lleva al archivo de ese momento. Descargué y leí el mismo archivo; una llamada de retorno que parecía pertenecer al efecto de un componente de tarjeta llamaba a `T` con la URL de la miniatura. Esto es lo que hace `T`:

1. Crea un `new Image()`, establece `crossOrigin` en `"anonymous"` y le asigna la URL original de la miniatura de tarjeta.
2. Cuando termina de cargarse, crea un canvas del mismo tamaño que la imagen.
3. Dibuja la imagen en el canvas.
4. Usa `getImageData` para leer el píxel situado a 20 px del borde derecho y 20 px de la parte superior, y utiliza ese color como fondo de la tarjeta.

`T` rellena el fondo de la tarjeta con el color del borde de la miniatura. Para leer ese único píxel, descarga el PNG original entero. En la primera pantalla hay 24 miniaturas de tarjeta recibidas por esta ruta: 27.14 MB. Es dos tercios de los 40.45 MB de transferencia de imágenes.

Así se resume el proceso en un diagrama. El mismo PNG original se solicita por dos rutas.

![Dos rutas solicitan el mismo PNG original. El img de la tarjeta con loading lazy hace una solicitud cuando se acerca a la pantalla, con Initiator Parser. new Image() del script solicita las 24 imágenes en cuanto llegan los datos del feed, con Initiator Script; después dibuja los originales recibidos en canvas del mismo tamaño y usa getImageData para leer un píxel. Con un original de 3200x2160, el canvas ocupa unos 27.6 MB. La segunda solicitud ocupa 0 B si la caché está activada y vuelve a descargarse con Disable cache](3.png?w=720)

El lugar para ver esta diferencia es Initiator en DevTools. Resource Timing dentro de la página no permite distinguirlas. Las miniaturas recibidas con `new Image()` también aparecen con `initiatorType` igual a `"img"`. La especificación clasifica las solicitudes creadas al procesar el `src` de un elemento img como `img`, y `new Image()` también es un elemento img.

### Un canvas del tamaño original y CORS

`T` establece `width` y `height` del canvas con las dimensiones originales de la imagen. Según la [especificación HTML](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element), estos dos atributos determinan el tamaño del bitmap del canvas. Por eso, una imagen de 3200x2160 genera un bitmap de 6.91 millones de píxeles. A 4 bytes RGBA por píxel, son unos 27.6 MB. Para hacer `drawImage` también hay que descomprimir el PNG original, así que hay otro bitmap decodificado del mismo tamaño, y se repite el proceso para cada miniatura. El canvas es una variable local de la función y existe solo un rato, hasta que GC la recoge. Estas cifras son cálculos. Intenté medirlas usando la memoria del proceso, pero los valores se repartían entre el proceso de renderizado y el de GPU, y variaban en cada ejecución; no pude distinguir las diferencias entre variantes.

`crossOrigin="anonymous"` es necesario por `getImageData`. La imagen viene de `static.toss.im`, un origen distinto al de la página. La [especificación HTML](https://html.spec.whatwg.org/multipage/canvas.html#security-with-canvas-elements) impide leer un canvas en el que se haya dibujado una imagen de otro origen sin permiso y establece que llamar a `getImageData` en ese estado lance `SecurityError`. Si se especifica `crossOrigin`, la solicitud se hace con CORS y el canvas se puede leer si el servidor lo permite. Ese permiso se confirma en el encabezado de respuesta `access-control-allow-origin: *`, en la pestaña Headers.

## Solicitudes de scripts fuera del lazy loading

El `<img>` de la tarjeta tiene `loading="lazy"`. Aun así, las 24 imágenes se reciben en la primera pantalla porque lazy solo retrasa la solicitud del propio `<img>`. La [especificación HTML](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#lazy-loading-attributes) define lazy loading como un estado que aplaza la descarga hasta que se cumplan ciertas condiciones. Si un script solicita la misma URL por separado, esa solicitud no depende de lazy.

Al contar cuánto se adelantó la descarga, esto es lo que observé. Los 24 `<img>` de tarjeta con lazy están entre las posiciones 760 px y 3,411 px del documento. Tras 15 segundos se habían cargado los 12 que llegaban hasta 1,896 px; los 12 desde 2,275 px hacia abajo no se cargaron. Según la documentación sobre carga diferida de [web.dev](https://web.dev/articles/browser-level-image-lazy-loading), cuando Chrome estima que la conexión es 4G, descarga por adelantado las imágenes lazy que están a menos de 1,250 px del viewport. Si sumamos 1,250 px a los 1,000 px de alto de la ventana, el límite queda en 2,250 px, de modo que coincide con lo observado. Las 12 imágenes de abajo todavía no tocaba descargarlas como `<img>`, pero el script descargó antes 17.20 MB. La miniatura más grande, de 5,376 kB, también está en este grupo, en la posición 2,654 px del documento.

Esta proporción es aún mayor en una pantalla móvil. Abrí la misma página con el agente de usuario de iPhone y una pantalla de 390x844; la transferencia fue casi la misma, 42.17 MB. Como las tarjetas se disponen de una en una por fila, las que quedaban fuera del límite de 844 px de alto de la ventana más 1,250 px aumentaron a 19, con un total de 23.88 MB.

El banner superior descarga imágenes que no aparecen en pantalla por una razón distinta de lazy. En la pantalla móvil se recibieron cuatro banners para escritorio, 10.27 MB; en escritorio se recibieron cuatro banners para móvil, 1.42 MB. Ambos grupos están dentro de áreas con `display: none` y contienen `<img>` sin `loading`. La especificación HTML establece que las imágenes se descargan de inmediato por defecto, así que también se descargan los `<img>` ocultos.

## Disable cache y solicitudes duplicadas

Hasta aquí medí con Disable cache desactivado. La referencia del panel Network titula la sección que explica esta casilla «Simular a un visitante nuevo (Emulate a first-time visitor)». El panel Performance de Chrome 157 también dice junto a esta opción que simula una experiencia de red parecida a la de una primera visita. Por eso es habitual activar la casilla antes de medir una primera visita. La activé en la página de inicio de Toss Bank y volví a medir.

![Al activar Disable cache, la misma miniatura se descarga dos veces, una con Parser y otra con Script, y la transferencia aumenta a 52 MB. 1 es Disable cache activado; 2 muestra dos filas para bankfeed-ipo-reorganization-cover.png: la fila superior tiene Initiator (index):5 Parser y la inferior, index-8989962b29fa3f03.js:1 Script; ambas marcan 1,625 kB. 3 es la fila inferior: 50,391 kB / 52,148 kB transferred](4.png?w=720)

La transferencia aumentó de 42.20 MB a 52.15 MB, es decir, 9.95 MB. De esa cantidad, 9.94 MB corresponden a los 12 `<img>` de tarjeta que estaban lo bastante cerca de la pantalla para cargarse. Las otras siete solicitudes eran pequeñas solicitudes preflight que no eran imágenes. En una primera visita con la caché activada, esos 12 archivos ocuparon 0 bytes. El script ya había descargado los mismos archivos, y las solicitudes posteriores de `<img>` los reutilizaron. Con Disable cache, los mismos archivos se descargan de nuevo. La fila de la figura 4 en la que el mismo nombre de archivo aparece dos veces, con Parser y Script, es este caso. Los aproximadamente 10 MB de diferencia entre resources y transferred en la fila de resumen inferior también correspondían a estos 12 archivos.

Esta medición no me permitió confirmar qué caché reutilizó los archivos. De los 12, uno aparecía en la información de respuesta como almacenado en caché en disco; los 11 restantes marcaron 0 bytes sin indicar que procedieran de la caché. La respuesta tenía `cache-control: max-age=86400` y no tenía encabezado `Vary`. Las solicitudes CORS (`crossOrigin`) y las solicitudes normales de `<img>` usan modos de credenciales distintos. [`resource.cc`](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/loader/fetch/resource.cc), que trata la caché de memoria de Blink, indica que se vuelve a descargar si el modo de credenciales difiere del de la solicitud anterior. Como ejemplo, menciona el caso en que el servidor devuelve `Access-Control-Allow-Origin: *` y se mezclan solicitudes CORS con solicitudes que no usan CORS. Por otro lado, la función que divide la caché HTTP por credenciales (`kSplitCacheByIncludeCredentials`) está desactivada por defecto en [`net/base/features.cc`](https://github.com/chromium/chromium/blob/main/net/base/features.cc). Por eso me parece que la reutilización se produjo en la caché HTTP, pero no lo confirmé con la medición.

Un visitante nuevo tiene la caché vacía, no carece de caché. Los archivos recibidos por primera vez se pueden reutilizar enseguida dentro de la misma página. Disable cache también impide esa reutilización, así que, si una página solicita dos veces el mismo archivo, el valor medido con esta casilla activada será mayor que el de una primera visita. Para medir una primera visita en una página así, vacía la caché y recarga con la casilla desactivada. Haz clic con el botón derecho en la lista de solicitudes del panel Network y encontrarás Clear browser cache. Comprobé con el comando CDP equivalente que, tras abrir la página una vez, vaciar la caché y volver a abrirla, el resultado era 42.20 MB, igual que en la primera apertura. Si la abría de nuevo sin vaciarla, eran 0.16 MB.

## Medir la misma estructura con una demo

La página de inicio de Toss Bank seguirá cambiando después de publicar este artículo. Por eso recreé la misma estructura usando recursos públicos. Se descargan desde otro origen 24 tarjetas PNG de 3200x2160, cada una con un `<img loading="lazy">`. Solo cambié tres veces la forma de determinar el color de fondo de las tarjetas. Este es el código que lee el color:

```js
async function sampleColor(src, x, y) {
  const img = await new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const [r, g, b] = ctx.getImageData(img.width - x, y, 1, 1).data;
  return { r, g, b };
}
```

- **Leer del original**: la estructura es igual a la de Toss Bank. Se llama a `sampleColor` con el original de la tarjeta.
- **Leer de la miniatura**: se llama a la misma función con una miniatura de 64x43.
- **Color precalculado**: el color se obtiene en JSON.

En las mismas condiciones (ventana 1600x1000, perfil nuevo, 3 ejecuciones), la transferencia de las tres variantes fue de 16.80 MB, 8.03 MB y 7.94 MB. Leer del original también descarga el doble al recibir las 12 tarjetas que están lejos de la pantalla. Leer de la miniatura solo añade 98 kB, la transferencia de las 24 miniaturas de 64x43. Al activar Disable cache, solo la variante que leía del original aumentó a 24.73 MB. La variante del color precalculado se mantuvo en 7.94 MB porque no solicita el mismo archivo dos veces. En el panel Network, Initiator también coincide con Toss Bank: las 24 solicitudes de lectura del color aparecen como Script y las solicitudes de los `<img>` de tarjeta, como Parser.

## De la fila inferior a una línea de código

De los 42.20 MB de la primera pantalla de Toss Bank, 40.45 MB eran imágenes; de esos, 27.14 MB eran 24 PNG originales que un script recibió para leer un píxel del fondo de las tarjetas. Como `loading="lazy"` solo aplazó las solicitudes de los `<img>` de tarjeta, las 12 tarjetas lejanas, 17.20 MB, también se descargaron en la primera pantalla. Si se mide con Disable cache activado, se descarga dos veces el mismo archivo y el total llega a 52.15 MB.

No necesité muchas funciones para llegar a esta conclusión. Comprobé la transferencia total en la fila de resumen inferior, usé el filtro de tipo para ver qué clase de recurso pesaba más, ordené Size para examinar primero los archivos grandes, distinguí quién originaba las solicitudes mediante la columna Initiator y seguí la pila asíncrona de la pestaña Initiator hasta llegar al código. La columna Size basta para ver que una imagen es grande. Para saber por qué se descarga, hay que llegar hasta Initiator.

En tu servicio, te recomiendo activar el filtro Img y ordenar por Size, o introducir `larger-than:500k` en el cuadro de filtros para dejar solo las respuestas grandes. Después, comprueba si Initiator en las filas de arriba es Parser o Script. Si es Script, esa solicitud no está sujeta a `loading="lazy"` ni a `srcset`. Si necesitas leer un color de una imagen, como medí en la demo, precalcularlo y enviarlo como dato, o leerlo de una miniatura pequeña, reduce a la mitad la cantidad descargada. Y, cuando midas una primera visita, comprueba primero si la página solicita el mismo archivo dos veces. Si lo hace, ábrela en un navegador con la caché vacía.

Este es el primer artículo de una serie en la que aplicaré los paneles de DevTools, uno por uno, a servicios reales. En el siguiente, usaré Waterfall y la pestaña Timing del mismo panel Network para ver en qué se emplea el tiempo de una solicitud.

:::ref
- [docs] [MDN, Permitir el uso de imágenes y canvas entre orígenes](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [docs] [Chrome DevTools, Inspeccionar la actividad de red](https://developer.chrome.com/docs/devtools/network)
:::