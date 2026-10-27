---
emoji: 🔤
title: 'Subsets de fuentes web coreanas y next/font'
seoTitle: 'Fuentes web coreanas: subsets, next/font y font-display'
date: '2026-10-19'
categories: frontend rendimiento
description: 'Página coreana con cuatro fuentes medida en TTF, woff2, subsets, Google y next/font. Los subsets bajan 17 MB a 0.6 MB; Google directo y preload, ~0.1 s.'
keywords: 'optimización de fuentes web, fuentes web coreanas, unicode-range, woff2, subset de fuentes, fuentes variables, next/font, font-display, autoalojar Google Fonts, particionado de caché, Noto Sans KR'
locale: es
translationOf: '261019'
sourceHash: 1b0a9fd911ad78782c3081ebe2d0de561cc81a54fa27edf510ef1e8bcd5f29a2
---

En este artículo quiero hablar de cómo hacer que las fuentes web coreanas pesen menos al entregarse.

Está pensado para desarrolladores frontend que mantienen páginas en coreano que reparten fuentes entre el cuerpo, los títulos, el código y las citas. Mido cuánto ayuda en realidad cada uno de los métodos habituales para aligerar las fuentes web y ordeno por cuál conviene empezar.

Las fuentes coreanas tienen tantos caracteres que un solo peso va de cientos de kB a varios MB. Hay varias formas de descargar menos, descargar antes y evitar que la pantalla se mueva mientras tanto. Puedes cambiar el formato de archivo a woff2, dividir la fuente en subsets, cargarla directamente desde los servidores de Google, usar `next/font` para que las fuentes se pidan por adelantado (preload) y ajustar la fuente de respaldo, o usar `font-display` para decidir qué muestra la pantalla cuando una fuente llega tarde.

¿Cuánta diferencia hacen en realidad estos métodos? Vamos a crear una página que usa cuatro fuentes, desplegarla por separado con cada método y medir cuántos datos de fuentes descarga, cuántos segundos tarda en tenerlos todos y cuánto se desplaza el diseño. También veremos qué métodos usan cinco servicios coreanos. La demo y los scripts de medición están en [jiji-hoon96/blog-labs](https://github.com/jiji-hoon96/blog-labs/tree/main/web-fonts), y las páginas desplegadas se pueden abrir directamente en [hooninedev-web-fonts.netlify.app](https://hooninedev-web-fonts.netlify.app/full-d-google/).

## Una página con cuatro fuentes

La página de prueba es el cuerpo del [artículo sobre overlay-kit](/260921) de este blog, copiado tal cual, con bloques de código y citas incluidos. Elegí un artículo real en lugar de un ejemplo corto porque el volumen de transferencia de una fuente coreana depende de la variedad de caracteres que usa la página. Las fuentes se reparten en cuatro, como es habitual en los blogs técnicos.

![Fuentes por zona de la página de prueba. Los títulos h1 y h2 son Noto Serif KR 700, el primer párrafo es Inter 300 y Noto Sans KR 300, el cuerpo es Inter 400 y Noto Sans KR 400 con la negrita en 700, los subtítulos h3 son Inter 500 y Noto Sans KR 500, las citas son Inter itálica 400 con el coreano inclinado de forma sintética, y el código es JetBrains Mono 400 con los comentarios en coreano en Noto Sans KR](1.png?w=720)

El cuerpo usa `font-family: 'Inter', 'Noto Sans KR'`. Las letras latinas y los dígitos los dibuja Inter y el coreano Noto Sans KR, en cuatro pesos: 300, 400, 500 y 700. Los títulos usan una sola fuente serif (de estilo Myeongjo), Noto Serif KR 700, y el código una sola fuente monoespaciada, JetBrains Mono 400. Las citas se dibujan con la itálica de Inter. Noto Sans KR no tiene itálica, así que el navegador sintetiza la inclinación del coreano dentro de las citas.

Son cuatro familias y, contando pesos y estilos, once fuentes: cinco de Inter (300, 400, 500, 700 e itálica 400), cuatro de Noto Sans KR y una de cada una de las otras dos.

## Cómo descarga fuentes el navegador

Una fuente web no se descarga en el momento en que se lee el CSS. Una regla `@font-face` solo declara el nombre de la fuente, el peso, la URL del archivo y el rango de caracteres que contiene el archivo (`unicode-range`); el navegador pide el archivo cuando necesita esa fuente al dibujar texto. La [especificación CSS Fonts Level 4](https://www.w3.org/TR/css-fonts-4/#font-face-loading) describe esta carga diferida como intención de diseño. La [sección unicode-range](https://www.w3.org/TR/css-fonts-4/#unicode-range-desc) de la misma especificación establece que la fuente no debe (must not) descargarse ni usarse para caracteres fuera del rango.

Así que, si divides una fuente en archivos por rangos de caracteres y das a cada archivo un `unicode-range`, el navegador descarga solo los archivos que contienen caracteres usados en la página. Un archivo recortado a una parte de los caracteres se llama subset, y en este artículo llamo fragmento a cada uno de esos archivos. Abajo está la regla de un fragmento usado en este experimento. Contiene hangul frecuente como `U+ac00` (가), `U+c774` (이) y `U+d558` (하), junto con el espacio y algunas letras latinas.

```css
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 300 700;
  font-display: swap;
  src: url(nskr-119.woff2) format('woff2');
  unicode-range: U+20-22, U+27-2a, U+2c-38, U+3a-3b, U+3f, U+41-47, U+4a-4c, U+4f-5d, U+61-7b, U+7d, U+a1, U+ab, U+ae, U+b7, U+bb, U+bf, U+2013-2014, U+201c-201d, U+2122, U+ac00, U+ace0, U+ae30, U+b2e4, U+b85c, U+b9ac, U+c0ac, U+c2a4, U+c2dc, U+c774, U+c778, U+c9c0, U+d558;
}
```

![Cómo funcionan los subsets. Una fuente se corta en varios fragmentos, cada uno con su unicode-range, y la página descarga solo los pocos fragmentos que contienen los caracteres que usa](2.png?w=720)

En las fuentes coreanas esta diferencia tiene que ser grande. Solo las sílabas hangul son 11,172, y Noto Sans KR, que además incluye hanja (caracteres chinos), contiene 23,174 caracteres. Sin subsets, para dibujar un solo artículo se descargan todos.

## Las cinco páginas comparadas

De los métodos anteriores, empiezo por el formato y los subsets. Hice cinco versiones de la misma página cambiando solo la forma de entregar las fuentes, e incluí una que usa los fragmentos que Google ya tiene divididos. El cuerpo y las declaraciones `font-family` son idénticos en las cinco; solo cambian el archivo `fonts.css` y los archivos de fuente a los que apunta.

El punto de partida es la CSS API de Google Fonts. La [documentación de Google Fonts](https://developers.google.com/fonts/docs/technical_considerations) dice que esta API devuelve una hoja de estilos adaptada al navegador que la pide. Si la pide un cliente que no reconoce como navegador, como curl, llega una URL TTF por peso; si la pide un Chrome reciente, llega una respuesta woff2 con un `@font-face` por fragmento. Si extraes solo las URL TTF de la primera respuesta y las fijas en tu CSS, cualquier navegador que visite la página recibe TTF.

- **A. TTF**: descargué los archivos TTF que la API da a curl y los alojé tal cual. Es la misma forma que fijar las URL TTF.
- **B. woff2**: los TTF de A, solo convertidos a woff2. Sin subsets.
- **C. Fragmentos estáticos**: los TTF de A cortados en fragmentos woff2 según los rangos de caracteres que Google usa para cada familia. Cada peso se corta por separado.
- **D. Respuesta de Google**: el CSS y los archivos de fuente que la misma API da a un Chrome reciente, descargados y alojados tal cual. Cada fragmento es una fuente variable que contiene varios pesos.
- **D-range**: igual que D, pero en lugar de enumerar los pesos en la petición a la API como `wght@300;400;500;700`, los pedí como rango, como `wght@300..700`.

A, B y C parten de los mismos TTF. De A a B solo cambia el formato y de B a C solo los subsets, así que se puede ver por separado cuánto recortó cada uno. Para convertir y cortar usé fontTools, una biblioteca de Python para manipular archivos de fuente. Eso sí, los rangos de Google no cubren todos los caracteres que contiene una fuente. En Noto Sans KR cubren solo 17,655 de 23,174 caracteres, y lo que queda fuera es sobre todo hanja de uso poco frecuente. Por eso C contiene menos caracteres que B, pero todos los caracteres usados en esta página caen dentro de los rangos de las cuatro familias, así que no afecta a la cantidad descargada.

Las cinco versiones están en un mismo sitio de Netlify, servidas desde el mismo host por HTTP/2. D también se sirve desde ese sitio y no desde los servidores de Google, así que el origen de los archivos no se mezcla en los resultados. La diferencia de cargar directamente desde los servidores de Google se mide aparte más adelante. Todos los archivos llevan `Cache-Control: public, max-age=31536000, immutable` para que la CDN (servidores de caché que guardan copias de los archivos cerca del usuario) los sirva sin volver a consultar al servidor de origen.

## Transferencia de fuentes por variante

Primero, la transferencia de fuentes de las cinco versiones, una al lado de otra.

| Variante | Archivos de fuente | Transferencia de fuentes | Transferencia de CSS |
|---|---|---|---|
| A. TTF | 11 | 17,200 kB | 0.4 kB |
| B. woff2 | 11 | 12,045 kB | 0.4 kB |
| C. Fragmentos estáticos | 58 | 679 kB | 107 kB |
| D. Respuesta de Google | 28 | 579 kB | 107 kB |
| D-range | 28 | 579 kB | 43 kB |

De A a C, la transferencia de fuentes bajó un 96%. Repasemos el panel Network de cada variante para ver de dónde salen estos números en DevTools.

### A, con TTF fijado

![Panel Network de DevTools para la variante A. 1 es el filtro Font, 2 es Disable cache, 3 son los nombres de los once archivos TTF, de serif-normal-700.ttf a nskr-normal-500.ttf, 4 es la columna Size, donde serif pesa 4,949 kB, los cuatro nskr entre 2,811 kB y 2,909 kB cada uno, e inter y mono entre unos 50 kB y 150 kB. 5 es la columna Content-Encoding, br en todos. 6 es 17,206 kB / 17,243 kB transferred en la barra inferior y 7 es 40,490 kB / 40,571 kB resources](3.png?w=720)

Antes de leer el panel hay que ajustar tres cosas. Activa el filtro Font (1) para que solo queden las peticiones de fuentes, y activa Disable cache (2) para que cada recarga vuelva a descargarlo todo, como un visitante nuevo. La columna Content-Encoding no se muestra por defecto, así que haz clic derecho en la cabecera de una columna y activa Content-Encoding en Response headers.

Los nombres (3) terminan en `.ttf`, un archivo por peso y estilo, once en total. Los tamaños (4) muestran que cada archivo de fuente coreana pesa entre 2.8 MB y 2.9 MB. Tenga la página los caracteres que tenga, cada uno de estos archivos contiene los 23,174.

El archivo más grande no es la fuente del cuerpo sino la de los títulos. Solo Noto Serif KR 700 pesa 4,949 kB, y 14 MB descomprimida. El coreano que esta página dibuja con ella se reduce a 50 caracteres distintos en nueve títulos (un h1 y ocho h2).

La barra inferior muestra cada número en pareja. En "17,206 kB / 17,243 kB transferred" (6), el primer valor suma solo las peticiones que pasan el filtro y el segundo es la página entera. transferred es lo que pasó por la red, y resources (7) es el tamaño después de descomprimir. Difieren en más del doble porque Content-Encoding (5) es `br`, es decir, Brotli (un formato de compresión creado por Google). TTF no tiene compresión propia, así que Netlify lo comprimió con Brotli antes de enviarlo. Lo que el usuario espera es transferred, así que todas las cifras de este artículo son transferred.

### B, solo el formato

Si sigues el consejo habitual y conviertes TTF a woff2, ¿cuánto se reduce? B es ese caso.

![El mismo panel para la variante B. 1 son once archivos cuyo nombre termina en woff2, 2 es la columna Size, donde serif pesa 3,215 kB y los cuatro nskr unos 2,000 kB cada uno. 3 es la columna Content-Encoding vacía, 4 es 12,045 kB / 12,082 kB transferred en la barra inferior y 5 es 12,037 kB / 12,118 kB resources](4.png?w=720)

17,200 kB pasaron a 12,045 kB, un 30% menos. Esta vez Content-Encoding (3) está vacía, y transferred (4) y resources (5) son casi iguales. woff2 ya va comprimido dentro del archivo, así que Netlify no lo volvió a comprimir.

Este 30% no se mide frente a archivos sin comprimir. A también llegó comprimido con Brotli, así que la diferencia que queda viene del método y del nivel de compresión. Según la [especificación WOFF2 del W3C](https://www.w3.org/TR/WOFF2/), woff2 primero transforma los datos de los glifos a una forma que se comprime bien y luego los comprime con Brotli. Pero el Brotli que Netlify aplicó a los TTF usaba un nivel bajo. Brotli permite elegir un nivel de 0 a 11; cuanto más alto, más pequeño el archivo, pero más tarda en comprimir. Netlify envió el mismo TTF de Noto Sans KR 400 en 2,866 kB, casi lo mismo que comprimiendo a nivel 4. Precomprimido al nivel más alto, 11, queda en 2,475 kB, y woff2 en 2,053 kB. Cuánto se ahorra al pasar a woff2 depende de cómo comprima el servidor el TTF. El gstatic de Google envía el mismo archivo con gzip en 3,023 kB.

Si eliges mal la referencia, esta cifra se infla. Si comparas B con los 40,490 kB de resources de A, parece una reducción del 70%, pero el usuario nunca descargó ese tamaño. Al revés, si tu propio servidor envía TTF sin comprimir, el usuario sí descarga 40 MB. En qué caso estás se ve enseguida en la columna Content-Encoding.

Aun así, B descarga 12 MB para dibujar un artículo. Cada archivo contiene todos los caracteres, así que cambiar el formato no cambia cuántos caracteres descargas.

### C, dividida en subsets

C corta los mismos TTF según los rangos de caracteres que usa Google: 124 rangos para Noto Sans KR y Noto Serif KR, 7 para Inter y 6 para JetBrains Mono. El equipo de Google Fonts explicó cómo se dividen los rangos coreanos en su [artículo de 2018 que anunciaba el soporte de japonés](https://developers.googleblog.com/en/google-fonts-launches-japanese-support/). Los 2,000 caracteres más usados se dividen en 20 fragmentos por frecuencia, y el resto en 100 fragmentos por orden de código Unicode. El CSS de Google no numera los fragmentos coreanos, así que los numeré desde 0 en el orden en que aparecen en el CSS. Del 0 al 99 son los fragmentos divididos por código (en el CSS aparecen primero los fragmentos con los códigos más altos), y del 100 al 119 los fragmentos por frecuencia. Al final se añaden 4 fragmentos para latín, latín extendido, cirílico y vietnamita, hasta 124. Los nombres de archivo de C siguen también esta numeración.

El CSS de C tiene una regla por fragmento y por peso, 661 en total: 496 para Noto Sans KR (124 rangos por cuatro pesos), 124 para Noto Serif KR, 35 para Inter (7 rangos por cinco fuentes) y 6 para JetBrains Mono.

![El mismo panel para la variante C, ordenado por nombre. 1 son cinco fragmentos inter, uno para itálica 400 y uno para cada peso 300, 400, 500 y 700. La fila sin marca de debajo es un fragmento mono. 2 son cinco fragmentos nskr-normal-300, 3 son diecinueve nskr-normal-400, 4 son nueve nskr-normal-500, 5 son trece nskr-normal-700 y 6 son seis serif-normal-700. 7 es 679 kB / 823 kB transferred en la barra inferior](5.png?w=720)

De las 661 reglas, solo se descargaron 58 archivos, que suman 679 kB (7), el 4% de A. Los nombres de archivo incluyen el peso, así que al ordenar por nombre se ve de un vistazo cuántos fragmentos descargó cada peso.

El peso del cuerpo, 400, es el que más tiene, 19 fragmentos (3); el 300 del primer párrafo tiene 5 (2), el 500 de los subtítulos 9 (4) y el 700 de la negrita 13 (5). La mayoría son fragmentos de la serie 100, que contienen los caracteres más usados. Hay fragmentos con números alejados, como el 56 del peso 400. El único carácter de esta página que cae en el rango del fragmento 56 es "눴" de "나눴다" (dividió), y por ese único carácter se descargó un fragmento entero.

La fuente de los títulos, que en A pesaba 4,949 kB, quedó en 6 fragmentos (6) y 113 kB, porque solo se descargaron los fragmentos que contienen los 50 caracteres de los títulos. Inter descargó un fragmento latino por peso y estilo (1), cinco en total.

No se descargó ni un solo fragmento latino de Noto Sans KR, porque Inter, que va primero, dibujó todos los espacios, dígitos y letras latinas. En el Chrome de esta medición, el orden de `font-family` cambió incluso qué archivos se descargaban.

Así se reparte lo que recortaron la conversión a woff2 y los subsets.

| Paso | Transferencia | Reducción |
|---|---|---|
| A. TTF (Brotli) | 17,200,139 B | Referencia |
| B. woff2, sin subsets | 12,045,102 B | Pasar a woff2 recortó 5,155,037 B |
| C. woff2, con subsets | 678,925 B | Los subsets recortaron otros 11,366,177 B |

El 69% de la reducción vino de los subsets. Esta proporción cuenta primero la conversión a woff2 y después los subsets, así que es la cuenta más favorable a woff2. Si divides en subsets primero, woff2 tiene menos que comprimir, y la parte de los subsets crece todavía más.

### D, con la respuesta de Google

D es lo que Google sirve de verdad a un Chrome reciente. Los rangos son los mismos que en C, pero hay la mitad de archivos.

![El mismo panel para la variante D, ordenado por nombre. 1 son dos archivos, inter-italic-latin e inter-latin. La fila sin marca de debajo es un mono-latin. 2 son diecinueve archivos, de nskr-101 a nskr-119 más nskr-56, y 3 son seis, de serif-114 a serif-latin. 4 es 579 kB / 723 kB transferred en la barra inferior](6.png?w=720)

La diferencia está en Noto Sans KR. C descargó fragmentos separados por peso, 46 en total, mientras que D descargó 19 (2). Es porque los fragmentos de D son fuentes variables (variable fonts). Una fuente variable trata el peso como un valor en un eje llamado `wght`.

![El archivo desplegado de D nskr-119.woff2 cargado en Wakamai Fondue. 1 es el resumen que indica que es una fuente variable con un eje, 2 es el nombre de archivo nskr-119.woff2, tamaño 16 KB, formato WOFF2, y 3 es el eje wght en Variable axes, con mínimo 100 y máximo 900](7.png?w=720)

Si cargas el `nskr-119.woff2` desplegado en [Wakamai Fondue](https://wakamaifondue.com/), una herramienta para inspeccionar fuentes, aparece como fuente variable (1), con el eje `wght` de 100 a 900 (3). 300, 400, 500 y 700 caen todos en ese intervalo, así que este único archivo de 16 KB (2) dibuja los cuatro pesos. Para comprobarlo sin instalar nada, abre el CSS de Google. Si cuatro `@font-face` con pesos distintos apuntan a la misma URL de archivo, es un archivo variable. Los 19 fragmentos que descargó D tienen exactamente los mismos números que los 19 que descargó C para el peso 400. Es decir, todos los caracteres dibujados en otros pesos estaban en los mismos fragmentos que los dibujados en 400.

A cambio, cada fragmento de D es más grande que el de C. Para el mismo fragmento 119, el 400 de C transfiere 9.0 kB y D 16.7 kB, unas 1.9 veces más. Una fuente variable lleva datos extra para dibujar el eje de peso, y mi proceso con fontTools y el proceso de producción de Google también difieren. Por eso, solo en Noto Sans KR, el número de archivos bajó mucho, de 46 a 19, pero los bytes solo un 16%, de 441 kB a 370 kB. Como un fragmento es unas 1.9 veces más grande, cada fragmento tiene que servir de media para casi dos pesos antes de que los fragmentos variables descarguen menos.

Inter pasó de cinco archivos a dos (1). Los cuatro pesos del estilo normal se unieron en un archivo variable, y la itálica, que solo era 400 desde el principio, sigue siendo uno. Este archivo itálico es estático, no variable, porque cuando pides un solo peso Google sirve un archivo estático con solo ese peso.

Por la misma razón, la fuente de los títulos (3) es casi igual en C y en D: 6 fragmentos y 113 kB en ambos. Esta página pidió Noto Serif KR solo en 700. En las fuentes que tienen versión variable, como las cuatro familias de este artículo, el archivo variable solo llega cuando pides dos pesos o más, y el eje no se recorta al rango pedido; llega el rango completo de la fuente (de 200 a 900 en Noto Serif KR). JetBrains Mono también se pide solo en 400, así que es un archivo estático.

### D-range, pesos pedidos como rango

D y D-range descargan los mismos 28 archivos de fuente. Comparé uno por uno los 268 archivos a los que apuntan los dos CSS, incluidos los fragmentos que no se descargan, y eran idénticos hasta el último byte. Solo cambia el CSS.

![Arriba D y abajo D-range, el mismo panel con el filtro CSS activado. 1 es el fonts.css de D con 107 kB, 2 es 429 kB descomprimido. 3 es el fonts.css de D-range con 43.1 kB, 4 es 173 kB descomprimido](8.png?w=720)

Si pides los pesos enumerados como `wght@300;400;500;700`, Google escribe una regla por peso, todas apuntando al mismo archivo: 124 por cuatro pesos, 496 reglas solo para Noto Sans KR. Si pides un rango como `wght@300..700`, llega una sola regla por fragmento con `font-weight: 300 700`, como en el código de antes. Por eso el CSS descomprimido bajó de 429 kB a 173 kB (2, 4), y la transferencia de 107 kB a 43 kB (1, 3).

Pero esa transferencia es el resultado de la compresión de Netlify. Netlify solo lo redujo a una cuarta parte aproximada del tamaño descomprimido, mientras que precomprimir el mismo CSS de D con Brotli da 41 kB incluso al nivel más bajo, 0. Al nivel más alto, 11, D queda en 14.9 kB y D-range en 14.3 kB. A nivel 11 la diferencia se reduce a 0.6 kB, porque las reglas que repiten las mismas cadenas se comprimen bien. Lo que de verdad reduce una petición por rango no es tanto la transferencia como la cantidad de CSS que el navegador tiene que leer.

## Llegada de las fuentes con Fast 4G

Con bytes tan distintos, ¿cuánto difiere el tiempo? Volví a medir los mismos despliegues con la condición Fast 4G de DevTools. Según el [código fuente de DevTools](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/core/sdk/NetworkManager.ts), los valores base de este preset son 60 ms de latencia y 9 Mbps, y en la práctica aplica multiplicadores que dan 165 ms de latencia y 8.1 Mbps de descarga. En la medición también usé estos valores aplicados. El tiempo va desde la petición del documento hasta que termina la respuesta de la última fuente, y uso la mediana de 9 cargas por variante, cada una en un navegador nuevo con la caché desactivada. Esta condición solo simula la latencia y el ancho de banda por petición, así que no incluye la pérdida de paquetes de una red móvil real ni la CPU de un teléfono.

![Momento en que llegó la última fuente con Fast 4G. Cada variante tiene puntos para 9 cargas y una barra con la mediana. A se agrupa entre 17.9 s y 18.8 s con mediana de 18.5 s, B entre 12.8 s y 13.7 s con 13.2 s. C va de 1.6 s a 2.7 s con 2.4 s, D de 1.5 s a 2.5 s con 2.1 s, y D-range de 1.5 s a 3.0 s con 2.2 s](9.png?w=720)

A tardó 18.5 s y B 13.2 s. Están cerca de los bytes divididos por el ancho de banda: 17.2 MB a 8.1 Mbps son 17 s, y 12.0 MB son 12 s. Las 9 cargas quedaron dentro de un segundo, y en tres mediciones separadas del mismo día las medianas de las dos variantes coincidieron con menos de 0.3 s de diferencia.

C, D y D-range, que tienen subsets, rondaron los 2 s. En una condición limitada por el ancho de banda, el tiempo sigue directamente a los bytes, así que los 11 s que recortaron los subsets pesan más que los 5 s que recortó el formato.

En cambio, el orden entre C, D y D-range no se pudo determinar con esta medición. Incluso dentro de una misma variante, las cargas oscilaron entre 1.5 s y 3.0 s, y esa oscilación era mayor que las diferencias entre variantes. La mayor parte de la oscilación venía de la CDN de Netlify.

El 27 de octubre volví a abrir el mismo D ocho veces en las mismas condiciones y capturé la pestaña Network en cada carga. Esta vez añadí como columna la cabecera de respuesta `cache-status`. Estas son dos de esas cargas, una al lado de otra.

![Panel Network de dos cargas de D con Fast 4G. Arriba, una carga en la que las fuentes salieron de la caché de la CDN: 1 es "Netlify Edge"; hit en la columna Cache-Status, y 2 es el Waterfall, donde cada barra tiene un tramo verde corto y uno azul largo. 3 es DOMContentLoaded 373 ms, Load 1.42 s en la barra inferior. Abajo, una carga que llegó hasta el servidor de origen: 4 es "Netlify Edge"; fwd=miss; fwd-status=200; stored, y 5 es el Waterfall, donde casi toda la barra es verde. 6 es DOMContentLoaded 889 ms, Load 2.21 s](10.png?w=720)

Arriba (1) está una carga en la que todas las fuentes salieron de la caché de la CDN, por eso aparece `hit`. Abajo (4) aparece `fwd=miss`: una carga en la que la CDN no tenía los archivos y tuvo que ir al servidor de origen y volver. En esa carga el HTML y el CSS también fueron al origen. En las barras del Waterfall (2, 5), el verde es el tiempo de espera hasta la primera respuesta del servidor y el azul el tiempo de recepción del contenido. En la carga desde caché el verde es corto y el azul largo, porque las 28 fuentes se reparten el ancho de banda. En la carga que fue al origen casi toda la barra es verde. Cada Waterfall está escalado a su propio tiempo total, así que no se pueden comparar las longitudes de las barras de arriba y de abajo. Los tiempos se comparan en la barra inferior (3, 6). Como el HTML llegó tarde del origen, DOMContentLoaded se retrasó de 373 ms a 889 ms, y las peticiones de fuentes empezaron igual de tarde. En esta página la última fuente termina en el mismo momento que Load, así que la diferencia queda como Load 1.42 s frente a 2.21 s. 6 de las 8 cargas salieron enteras de caché y terminaron entre 1.39 s y 1.44 s; las 2 que fueron al origen tardaron 2.21 s y 4.00 s. Sin cambiar ni una fuente, el estado de la caché por sí solo produjo una diferencia mayor que la que hay entre variantes.

El 26 de octubre volví a medir tras subir a 6 las cargas previas para calentar la CDN. Según la cabecera de respuesta `cache-status`, en las cargas en que las fuentes no estaban en la caché de la CDN y fueron al servidor de origen, el primer byte de la última fuente tardó normalmente entre 370 ms y 750 ms, y una vez 1.3 s. Las cargas servidas desde caché tuvieron una mediana de unos 210 ms. Las cargas más lentas (de 2.3 s a 3.3 s) fueron todas cargas en las que las fuentes, el HTML o el CSS fueron al origen. Incluso dejando solo las cargas en que todas las fuentes salieron de caché, cada variante seguía oscilando entre 0.2 s y 0.8 s, y C solo tuvo 3 cargas así de 9. Por eso la diferencia entre C y D la expreso solo en bytes y número de archivos, no en tiempo.

Esta medición tampoco permitió decidir cuándo se pinta la primera pantalla (FCP). Las medianas fueron A 1.0 s, B 1.0 s, C 1.4 s, D 1.1 s y D-range 1.3 s, pero en otra medición del mismo día C dio 1.0 s, y D-range, con el CSS más pequeño, fue más lento que D. Las diferencias entre variantes son menores que las diferencias entre cargas. Esta página declara `font-display: swap`, así que dibuja el texto con otra fuente antes de que lleguen las fuentes web. Por eso incluso los usuarios de A empiezan a leer en 1 s, y durante los 17 s siguientes el texto cambia a cada fuente a medida que llega.

## Los costes que dejan los subsets

Que los subsets sean la respuesta no significa que salgan gratis. Hay cinco costes.

Primero, el CSS crece. El `fonts.css` de A transfiere 0.4 kB, mientras que el de C y D transfiere 107 kB, porque cada una de las 661 reglas lleva su propio rango de caracteres. Descomprimido, C pesa 434 kB y D 429 kB. El navegador no dibuja hasta que el CSS cargado con `<link>` ha llegado entero, así que este CSS tiene que llegar antes que los archivos de fuente. Si te alojas tú mismo las fuentes, conviene precomprimir este CSS a un nivel alto. Como vimos antes, en este CSS el tamaño que envió Netlify y el precomprimido al nivel más alto difieren en un factor de siete.

Segundo, aumenta el número de peticiones. Los 11 archivos de B pasaron a 58 en C. Con HTTP/2 o superior se pueden enviar muchas peticiones a la vez por una sola conexión, así que cada petición extra cuesta poco, pero no cero. No medí a partir de cuántas peticiones ese coste supera el ahorro en bytes.

Tercero, los fragmentos comparten datos duplicados. Cada fragmento repite los datos comunes de la fuente, así que cuantos más fragmentos descargas, más se acumula esa duplicación. Si cortas los 17,655 caracteres de Noto Sans KR que cubren los rangos de Google en un único archivo de peso 400, pesa 1,302,420 B, pero si divides esos mismos caracteres en 124 fragmentos y los sumas todos, dan 1,823,312 B, cerca de un 40% más. Una página que descargue casi todos los fragmentos acabará descargando más que con un solo archivo. Esta página descargó como mucho 19 de 124 fragmentos por peso, así que está lejos de ese caso.

Cuarto, se despliegan muchos más archivos. La carpeta C de esta demo tiene 661 fragmentos. El navegador descarga 58, pero todos tienen que estar en el servidor. Lo que descarga el navegador y lo que subes al servidor hay que contarlo por separado.

Quinto, los caracteres fuera de los rangos se dibujan con una fuente de respaldo. Los rangos de Google cubren solo 17,655 de los 23,174 caracteres de Noto Sans KR, así que si aparece alguno de los 5,519 restantes, se dibuja con una fuente que no es la fuente web. Casi todos son hanja poco frecuentes, así que esta página no se vio afectada, pero los servicios donde aparecen hanja en nombres de personas o lugares deberían comprobarlo.

Además, en pantallas donde los caracteres llegan después, como campos de texto o chats, un carácter nuevo hace que se descargue su fragmento en ese momento. Cada artículo usa caracteres distintos, así que al pasar al siguiente también se pueden descargar fragmentos nuevos. La transferencia medida en la primera pantalla no lo es todo. No medí cuánto más descarga una segunda página.

## Cómo aplicar subsets

Si usas Google Fonts, basta con enlazar la CSS API tal cual. El `next/font/google` de Next.js también obtiene esta respuesta en tiempo de build y la autoaloja tal cual. La diferencia entre estos dos caminos se mide aparte más adelante.

Si te alojas las fuentes, paquetes como Fontsource (un proyecto que empaqueta fuentes de código abierto como paquetes npm) ya traen subsets. El CSS de `@fontsource/noto-sans-kr` 5.3.1, la última versión a 2026-10-22, tiene la forma de C, dividido en los mismos 124 rangos que Google, y esta estructura existe desde 5.2.8. En 5.2.7, el CSS por defecto no tenía reglas para el coreano, y el coreano iba aparte en un único archivo sin rango. Si necesitas fragmentos variables, `@fontsource-variable/noto-sans-kr` tiene la forma de D-range, con los mismos rangos declarados con un único `font-weight: 100 900`. Es más seguro abrir el CSS de la versión que uses y comprobar su `unicode-range`.

Si la fuente no está en Google, la cortas tú. Ese es el caso C. Toma la lista de rangos de Google, corta cada rango con el módulo subset de fontTools (el mismo motor que `pyftsubset`), guarda el resultado como woff2 y genera una regla con su `unicode-range` para cada fragmento. Los scripts de build de `scripts/` en el repositorio de la demo hacen este proceso.

Al revisar tu propio servicio, no te fíes de los nombres de archivo. Las figuras de este artículo usan archivos renombrados para que se lean mejor, pero las respuestas reales de Google y la salida de `next/font` tienen nombres con hash, así que no se ven ni el peso ni el número de fragmento. En su lugar, activa el filtro Font y mira el número de archivos y sus tamaños. Si hay un archivo de varios MB por peso, no hay subsets. Si hay decenas de fragmentos y su número crece con el número de pesos, son fragmentos estáticos; si abres la respuesta de `fonts.css` con el filtro CSS y `font-weight` aparece como un rango del tipo `100 900`, son fragmentos variables.

## El coste de cargar desde los servidores de Google

Los subsets redujeron lo que se descarga. Los métodos que quedan apenas lo reducen. En cambio, deciden cuándo se descargan las fuentes y qué se ve en pantalla mientras tanto. El primero es desde dónde se cargan las fuentes.

Hasta ahora D descargaba la respuesta de Google y la servía desde el mismo sitio. En los servicios reales es habitual enlazar directamente la URL del CSS de Google. Entonces el navegador obtiene el CSS de `fonts.googleapis.com` y las fuentes de `fonts.gstatic.com`, lo que suma dos sitios más a los que conectarse. Para ver este coste hice dos páginas más que envían la misma petición que D directamente a Google. Una solo enlaza el CSS, y la otra sigue el código de inserción que da fonts.google.com y añade `preconnect`, que abre las conexiones por adelantado, para los dos hosts.

Medí el 26 de octubre con la misma condición Fast 4G, y los valores son medianas de las cargas en que todas las fuentes salieron de caché. Fueron 7 de 9 en D y las 9 en las demás. La fecha de medición y el número de cargas previas difieren de la figura anterior, así que el valor de D también cambia (2.1 s frente a 1.74 s). Compara solo dentro de esta tabla.

Quedarse solo con las cargas desde caché favorece a servir desde el mismo sitio. En sitios con poco tráfico la caché de la CDN suele estar vacía, así que, como con C antes, muchas cargas van al servidor de origen. Ese coste lo paga el autoalojamiento.

| Página | Transferencia de fuentes | Llegada de la última fuente |
|---|---|---|
| D, servida desde el mismo sitio | 579 kB | 1.74 s |
| Conexión directa a Google | 576 kB | 1.73 s |
| Conexión directa a Google, con preconnect | 576 kB | 1.76 s |

Las tres quedan a menos de 0.03 s entre sí, menos que la variación al abrir varias veces la misma página (de 0.2 s a 0.8 s). El coste de conexión estaba ahí, sin duda. La primera conexión a `fonts.googleapis.com` (incluido TLS, que establece la conexión cifrada) tardó entre unos 80 ms y 190 ms por carga, y ese tiempo se suma antes de obtener el CSS. Pero el tiempo de conexión a `fonts.gstatic.com` salía como 0 en las peticiones de fuentes. La respuesta CSS de Google incluye la cabecera `Link: <https://fonts.gstatic.com>; rel=preconnect; crossorigin`, así que el navegador abre por adelantado la conexión al servidor de fuentes mientras descarga el CSS. Parece que por eso mismo la línea de gstatic entre los `preconnect` añadidos al HTML no marcó diferencia. La línea de googleapis tampoco la marcó, pero no analicé por qué, ni por qué el tiempo de conexión a googleapis no se refleja en la llegada de la última fuente.

![Orden de conexión al servir desde el mismo sitio frente a conectarse directamente a Google. Desde el mismo sitio, el HTML, el CSS y las 28 fuentes se obtienen uno tras otro sobre una única conexión al sitio. Con conexión directa a Google, después del HTML se abre una nueva conexión a googleapis para obtener el CSS; mientras se descarga el CSS, la cabecera Link abre por adelantado la conexión a gstatic, y después se obtienen las 28 fuentes](11.png?w=720)

Aun así, esta tabla subestima el coste de sumar sitios a los que conectarse. Fast 4G de DevTools añade latencia por petición, así que el establecimiento de la conexión (DNS, TCP, TLS) no recibe latencia añadida. En esta medición, conectarse a Netlify con Fast 4G activado tardaba normalmente unos 147 ms (de ellos, unos 74 ms de TLS), que es simplemente lo que da mi propia línea (en Seúl). La [documentación de throttling de Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md) también indica que la latencia aplicada por petición es menos precisa que la aplicada por paquete. Una conexión requiere varios viajes de ida y vuelta, así que en redes con un tiempo de ida y vuelta más largo, cada sitio extra al que conectarse cuesta más. No medí cuánto.

Antes se pensaba que conectarse directamente a Google tenía una ventaja. Como muchos sitios usan las mismas URL de fuentes de Google, una fuente ya descargada en otro sitio podía reutilizarse desde la caché del navegador. Chrome bloqueó este reparto a partir de la versión 86. Según el [artículo de Chrome sobre el particionado de la caché](https://developer.chrome.com/blog/http-cache-partitioning), la clave de caché incluye, junto con la URL del recurso, el sitio de nivel superior y el sitio del frame. Es decir, sitios distintos usan cachés separadas aunque la URL sea la misma.

En efecto, las fuentes con la misma URL se volvieron a descargar desde cero al cambiar de sitio. Con un solo perfil de Chrome, abrí dos veces en el sitio desplegado la página que se conecta directamente a Google, y luego dos veces en mi servidor local (otro sitio). Al volver a abrir en el mismo sitio, las 28 fuentes salieron de caché, pero al cambiar de sitio se volvieron a descargar las mismas 28 fuentes con las mismas URL, 576 kB. Al repetir la misma secuencia en un Chrome con el particionado de caché desactivado (`--disable-features=SplitCacheByNetworkIsolationKey`), las 28 salieron de caché incluso tras cambiar de sitio. En el Chrome actual no existe una caché que permita a distintos sitios compartir fuentes. El [capítulo de fuentes del Web Almanac 2024](https://almanac.httparchive.org/en/2024/fonts) de HTTP Archive también dice que el particionado de caché acabó con la ventaja de las CDN de fuentes compartidas, y que los sitios que sirven las fuentes solo desde su propio sitio pasaron del 22% en 2022 al 28% en 2024 en escritorio.

## El preload de next/font y las fuentes de respaldo

El `next/font` de Next.js toma esta decisión por ti en tiempo de build. Al compilar, descarga el CSS y las fuentes de Google y los sirve desde tu propio sitio, hace preload de las fuentes que indiques y ajusta el tamaño de la fuente de respaldo que se usa antes de que llegue la fuente web para que coincida con ella. El loader de 16.3.4 obtiene el CSS con el User-Agent de Chrome 104, descarga todos los archivos de fragmento que contiene y solo reescribe las URL, así que `unicode-range` se mantiene tal cual. Cuando hice una petición con el mismo User-Agent el 2026-10-21, recibí las mismas reglas y los mismos archivos que D.

Hice una página con Next.js 16.3.4 con el mismo cuerpo y las mismas cuatro familias, la exporté como archivos estáticos y la subí al mismo sitio. Noto Sans KR enumera cuatro pesos, y las cuatro familias usan `subsets: ['latin']`. Los únicos valores que admite `subsets` para Noto Sans KR son cyrillic, latin, latin-ext y vietnamese, así que no hay forma de elegir el coreano. Aun así, el coreano no se pierde. `subsets` solo decide qué fragmentos se precargan, y los `@font-face` de todos los fragmentos coreanos se quedan en el CSS. La salida contiene 268 archivos de fuente.

Descargó 631 kB, 52 kB más que D. Descargó el fragmento latin de Noto Sans KR (26 kB), que esta página no usa, y la itálica de Inter llegó como archivo variable, 26 kB más grande que el archivo estático de D. En las mismas condiciones que la tabla anterior, la última fuente llegó a 1.81 s (mediana de 7 cargas). Son 0.07 s de diferencia con el D de la tabla (1.74 s), menos que la variación entre cargas repetidas. Lo que `next/font` añade encima es el preload y el ajuste de la fuente de respaldo.

El preload no se aplica a los fragmentos coreanos. El HTML contiene 5 preloads, todos de fragmentos latin, porque en `next/font`, `subsets` no permite elegir fragmentos coreanos. Se podrían escribir preloads directamente en el HTML para los fragmentos que se descargan en cualquier artículo, como los 20 fragmentos por frecuencia, pero esta vez no lo medí. Además, de esos 5, el fragmento latin de Noto Sans KR (25,804 B) era un archivo que esta página no necesitaba. Si compilas con el preload desactivado, ese archivo ni siquiera se pide, porque, como vimos antes, Inter dibuja primero los caracteres latinos. En el build sin preload la última fuente llegó a 1.87 s, 0.13 s de diferencia con D.

El ajuste de la fuente de respaldo solo se aplica a los caracteres latinos. `next/font` genera para cada fuente una regla como `Noto Sans KR Fallback` y ajusta el tamaño de la fuente de respaldo a la fuente web con `size-adjust` y `ascent-override`. Pero la base es `local("Arial")` (Times New Roman para Noto Serif KR). Arial no tiene coreano, así que el coreano pasa a la siguiente fuente de respaldo, que no tiene ajuste. Al mirar qué fuentes dibujaron realmente un párrafo del cuerpo justo después del primer pintado, el latín ya era Inter, y el coreano cuyos fragmentos aún no habían llegado era Apple SD Gothic Neo, la fuente coreana por defecto de macOS. Esto también se ve en Rendered Fonts, al final de la pestaña Computed del panel Elements de DevTools; para la medición usé `CSS.getPlatformFontsForNode` del Chrome DevTools Protocol, que da la misma información.

## Por qué elegir next/font

Hasta aquí, `next/font` no ha hecho más rápida la página coreana. Google ya hace los subsets, y el preload y el ajuste de respaldo no se aplican al coreano. Aun así, hay otras razones por las que se usa tanto.

`next/font` apareció por primera vez en octubre de 2022 con [Next.js 13](https://nextjs.org/blog/next-13), con el nombre `@next/font`. El anuncio lo presenta como una herramienta que elimina las peticiones de red externas por privacidad y rendimiento, descarga las fuentes en tiempo de build para autoalojarlas y elimina el desplazamiento del diseño con `size-adjust`. El anuncio destaca aparte que el navegador no envía ninguna petición a Google.

En el terreno de la privacidad hubo una sentencia alemana a principios de ese mismo año. La [sentencia del Tribunal Regional de Múnich](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-GRURRS-B-2022-N-612) del 20 de enero de 2022 (asunto 3 O 17493/20) consideró ilícito que un sitio web, al cargar Google Fonts, transmitiera a Google la dirección IP de los visitantes sin su consentimiento, y concedió una indemnización de 100 euros. El tribunal se apoyó en que Google Fonts se puede usar sin conectarse a los servidores de Google. Con el autoalojamiento, este problema no tiene dónde surgir.

Las demás razones enlazan con lo que vimos antes. La caché compartida que se obtenía al conectarse directamente a Google ya no existe en Chrome. El coste de sumar sitios a los que conectarse salió pequeño en esta medición, pero porque Fast 4G no añade latencia al tiempo de conexión. Y hacer a mano el trabajo de descargar la respuesta de Google, reescribir las URL, configurar el preload y ajustar las fuentes de respaldo requiere varios scripts, como en la demo de este artículo. `next/font` lo reduce a una sola llamada a función.

## Qué se ve cuando la fuente llega tarde

`font-display` decide qué se dibuja antes de que llegue una fuente. Si no lo declaras, el valor por defecto es `auto`, y según el [artículo de web.dev sobre fuentes](https://web.dev/articles/font-best-practices), los navegadores basados en Chromium y Firefox esperan entonces a la fuente sin dibujar texto durante hasta 3 segundos. El CSS de Google, si no añades `display=swap` a la URL, también da reglas sin `font-display`. Todas las páginas hasta ahora declaran `swap`: dibujan primero con una fuente de respaldo y la cambian cuando llega la fuente web. Si al cambiar varían el ancho de los glifos y la altura de línea, los párrafos se desplazan, y la medida acumulada de ese desplazamiento es el CLS (Cumulative Layout Shift).

Las páginas de la familia D con `swap` tuvieron un CLS mediano de 0.018 a 0.020, y llegaron hasta 0.024 en alguna carga. Muy por debajo del 0.1 que el [artículo de web.dev sobre CLS](https://web.dev/articles/cls) fija como umbral de "bueno". El desplazamiento no ocurrió de una vez sino en varios pasos. Los fragmentos llegaban en momentos distintos, así que justo después del primer pintado a veces una parte de los caracteres de un mismo párrafo estaba en Noto Sans KR y el resto en Apple SD Gothic Neo.

Los builds con el ajuste de respaldo de `next/font` desactivado y activado también tuvieron el mismo CLS, 0.017 y 0.018. Los caracteres latinos a los que se aplica el ajuste no tenían que ver con el desplazamiento. Solo el build sin preload quedó en 0.009, más o menos la mitad; parece que los desplazamientos grandes pasaron de dos a uno, pero no confirmé la causa.

También medí una página que conserva los archivos de D y solo cambia a `font-display: optional`. El CLS fue de 0.0002 o menos en las 9 cargas. A cambio, en la primera visita el texto se quedó con las fuentes de respaldo hasta el final, aunque las fuentes terminaron de descargarse: Apple SD Gothic Neo para el coreano y la fuente del sistema para el latín, y tres primeras visitas abiertas por separado dieron lo mismo. Según la [sección font-display de la especificación CSS Fonts 4](https://www.w3.org/TR/css-fonts-4/#font-display-desc), con `optional` una fuente que no está lista enseguida para el primer pintado no se usa en esa página. El Chrome de esta medición descargó las fuentes hasta el final, así que quien llega por primera vez descarga las fuentes sin llegar a verlas. Las fuentes que quedan en caché pueden usarse en la siguiente visita. En los datos de escritorio del Web Almanac 2024, cerca del 44% de los sitios usa `swap`, y menos del 1% usa `optional`.

Este CLS se midió con las fuentes de respaldo de macOS. En Windows la fuente de respaldo es Malgun Gothic, así que los valores pueden ser distintos. La fuente de respaldo coreana que `next/font` no ajusta también se puede ajustar a mano: se toma `local("Apple SD Gothic Neo")` o `local("Malgun Gothic")` como base de un `@font-face`, se le ponen `size-adjust` y `ascent-override`, y se usa como fuente de respaldo. Esta vez no lo medí. Para conocer el tamaño de los desplazamientos que sufren los usuarios reales y los elementos que más se desplazan, recogerlos con el build de attribution de la biblioteca `web-vitals` es más preciso que medir en laboratorio.

## Las fuentes de los servicios coreanos

¿Qué hacen los servicios reales? El 26 de octubre de 2026 abrí la página de inicio de varios servicios coreanos en headless Chrome como si fuera la primera visita y medí la transferencia de fuentes sin limitar la red. Medí cada una dos veces, y las dos cargas difirieron como mucho en unos cientos de bytes.

| Servicio | Fuente | Subsets | Archivos de fuente | Transferencia de fuentes |
|---|---|---|---|---|
| Musinsa | Pretendard, cuatro pesos | No | 4 | 3,279 kB |
| Toss | Toss Product Sans, cuatro pesos | No | 5 | 2,049 kB |
| Web corporativa de Kakao | Dos tipografías de Kakao, dos pesos cada una | No | 4 | 1,395 kB |
| Kurly | Pretendard fuente variable | 92 fragmentos | 19 | 501 kB |
| Daangn (Karrot) | Pretendard fuente variable | 92 fragmentos | 10 | 262 kB |

![Gráfico de barras de la transferencia de fuentes en la primera visita a la página de inicio de servicios coreanos. Musinsa 3,279 kB, Toss 2,049 kB y la web corporativa de Kakao 1,395 kB, sin subsets, en gris; Kurly 501 kB y Daangn 262 kB, que usan subsets, en azul](12.png?w=720)

Los servicios sin subsets están en el mismo estado que la B de este artículo: woff2, pero cada archivo contiene todos los caracteres de un peso. El Pretendard de Musinsa supera los 800 kB por peso. De los cinco archivos de Toss, cuatro son los archivos por peso de Toss Product Sans y el restante es otra fuente de 10 kB. Kurly y Daangn, en cambio, usan un CSS que divide la fuente variable Pretendard en 92 fragmentos y descargan solo los fragmentos con los caracteres usados en la página. Dividido entre los 8.1 Mbps de Fast 4G, 3,279 kB son unos 3.2 s y 262 kB unos 0.3 s. Son valores calculados, no medidos, pero son más de diez veces mayores que las diferencias de tiempo que midió este artículo para la conexión directa a Google y el preload.

Son valores de la primera visita a una sola página de inicio, así que varían según la página y el momento. Con un archivo por peso, una vez descargados los archivos se sirven desde caché en las visitas siguientes, así que en servicios con muchas visitas recurrentes la diferencia se reduce.

Hay servicios que no están en la tabla. Naver dibuja el cuerpo con fuentes del sistema y solo descargó un archivo de NanumSquare Neo (389 kB) para algunas partes. Baemin (Baedal Minjok) declara Pretendard, pero no lo descargó en la página de inicio, y solo descargó un archivo de su tipografía propia (140 kB).

## Primero, los subsets

Una fuente sin subsets descarga todos los caracteres de cada archivo, use la página los caracteres que use. En esta página de cuatro fuentes eso supuso 17.2 MB en TTF y 12.0 MB en woff2, y con Fast 4G la última fuente tardó 18.5 s y 13.2 s en llegar. Con subsets, lo que se descarga sigue a los caracteres usados en la página. La misma página bajó a 0.6 MB y unos 2 s.

Los subsets importan especialmente en las páginas en coreano por el tamaño de los archivos. Pasar a woff2 recorta alrededor de un tercio, pero las fuentes coreanas de esta página seguían pesando entre 2 MB y 3.2 MB por peso. Una sola fuente serif añadida para dibujar unos pocos títulos pesaba más que la fuente del cuerpo.

Esta medición no pudo separar en tiempo las decisiones posteriores a los subsets. No se pudo ordenar entre fragmentos estáticos y variables, y las diferencias entre conectarse directamente a Google o servir desde tu propio sitio, el preload y el ajuste de respaldo fueron todas menores que la variación al abrir varias veces la misma página. Eso sí, Fast 4G no añade latencia al establecimiento de la conexión, así que el coste de los sitios extra a los que se conecta la conexión directa a Google puede haber salido pequeño en esta medición. Por eso conviene elegir entre estas opciones con otros criterios. La privacidad y el particionado de caché favorecen el autoalojamiento, y la herramienta que te quita ese trabajo es `next/font`. Con `font-display`, basta con decidir si aceptas pequeños desplazamientos con `swap` o si muestras fuentes de respaldo en la primera visita con `optional`.

También hay métodos que no comparé esta vez. Usar menos pesos y familias reduce lo que se descarga sin subsets en tantos archivos como quites. Este blog también usa solo dos pesos, 400 y 700. También se pueden enviar cuatro pesos en un único archivo de fuente variable sin subsets. Esta vez no medí ninguno de los dos.

También quedan cosas sin confirmar: el coste que añade cada sitio extra al que conectarse en redes con un tiempo de ida y vuelta largo, el CLS al dibujar con Malgun Gothic en Windows, por qué el CLS se redujo a la mitad sin preload, cuántos fragmentos nuevos se descargan al pasar al siguiente artículo y la causa de la variación que queda incluso entre cargas desde caché. Creo que ninguna es lo bastante grande como para invertir la diferencia que hicieron los subsets. Pero es una inferencia, no una medición.

Algunos grandes servicios coreanos todavía envían archivos de cientos de kB por peso sin subsets. Te animo a abrir el panel Network de tu propio servicio, activar el filtro Font y comprobar si hay archivos así. Si los hay, mira los subsets antes que `next/font` o el preload.

:::ref
- [docs] [MDN, unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range)
- [repo] [Fontsource](https://github.com/fontsource/fontsource)
- [docs] [fontTools, pyftsubset](https://fonttools.readthedocs.io/en/latest/subset/index.html)
:::
