---
emoji: 🧬
title: "La diferencia entre LZ77 y LZ78"
seoTitle: "LZ77 vs LZ78: ventana deslizante, diccionario y DEFLATE"
date: "2024-07-01"
categories: curiosidades software
description: "Cómo difieren LZ77 y LZ78 al manejar su diccionario, y por qué, a través de LZSS y DEFLATE, ZIP, GZIP y Zstd acabaron en la familia LZ77."
keywords: "LZ77, LZ78, LZ77 vs LZ78, algoritmo LZ77, compresión con ventana deslizante, LZW, cómo funciona DEFLATE, compresión basada en diccionario"
locale: es
translationOf: '240701'
sourceHash: 52903051284734eb36f6b7918ae6ca4a2ff9c02f62fa2fa53411ac70e9539a71
---

En este artículo quiero hablar de **en qué se diferencian LZ77 y LZ78**.

Este artículo es para desarrolladores que usan herramientas como zip, gzip o zstd y se han preguntado cómo funciona la compresión basada en diccionario que llevan dentro. Al terminar, podrás explicar en qué se diferencian ambos algoritmos al manejar su diccionario y por qué casi todos los compresores de uso general actuales descienden de LZ77.

Si se comparan formatos para comprimir artefactos de compilación, tarde o temprano se acaba remontando a estos dos algoritmos.

<hr>

## ¿Qué es la compresión sin pérdida?

La compresión sin pérdida permite reconstruir los datos originales a la perfección. A diferencia de la compresión con pérdida, habitual en imágenes y audio, el resultado descomprimido no difiere del original ni en un solo bit. Cuando la integridad es esencial, como ocurre con el código fuente o los artefactos de compilación, hay que utilizar compresión sin pérdida.

Su idea central consiste en **aprovechar la redundancia estadística presente en los datos**. Si sustituimos patrones repetidos por representaciones más cortas, reducimos el tamaño total.

Entre estas técnicas, los métodos **basados en diccionarios (Dictionary-Based)** forman una de las familias más extendidas. Aquí “diccionario” no significa un libro de definiciones, sino una tabla de consulta que asocia fragmentos vistos anteriormente con códigos breves. **LZ77**, propuesto por Abraham Lempel y Jacob Ziv en el artículo de 1977 **"A Universal Algorithm for Sequential Data Compression"** de IEEE Transactions on Information Theory, y **LZ78**, publicado un año después, son los antepasados de esta familia. “LZ” toma una letra de cada apellido. Casi todos los algoritmos posteriores basados en diccionarios, como DEFLATE, LZMA, LZ4 y Zstd, descienden de ellos. (No es exagerado decir que la mayor parte del árbol genealógico de la compresión converge en estos dos investigadores.)

Pensemos en un ejemplo sencillo. Si la palabra “Linux” aparece cien veces en un texto, podemos registrarla en el diccionario la primera vez y reemplazar las siguientes por una referencia corta que signifique “entrada número 1”. “Linux” ocupa cinco bytes, mientras que el puntero puede expresarse con menos, por lo que el conjunto se hace más pequeño.

Entonces, ¿en qué se diferencian exactamente LZ77 y LZ78?

<hr>

### LZ77: el método de la ventana deslizante

LZ77 **no crea un diccionario explícito independiente**. Usa una región del propio flujo de entrada como diccionario. Esa región se llama **ventana deslizante** porque avanza conforme se procesan los datos. (Es el mismo concepto que aparece a menudo en ejercicios de algoritmos.)

La ventana se divide en dos zonas.

- **Búfer de búsqueda (Search Buffer)**: datos ya procesados. Cumple el papel de diccionario.
- **Búfer de anticipación (Look-ahead Buffer)**: datos aún no procesados que se comprimirán a continuación.

El algoritmo busca si el comienzo del búfer de anticipación ya apareció en alguna parte del búfer de búsqueda. Si encuentra el mismo patrón, codifica la coincidencia como una tupla **(distancia, longitud, carácter siguiente)**. La distancia indica cuántos caracteres hay que retroceder para llegar al inicio de la coincidencia y la longitud, cuántos caracteres abarca.

Supongamos que comprimimos la cadena `"banana_banana"` con LZ77. Al llegar al segundo `"banana"`, el algoritmo dice en la práctica: **“Retrocede siete caracteres y copia seis.”** De ese modo, una cadena de seis bytes queda representada por solo dos números.

La clave es que **no hace falta guardar ni transmitir el diccionario por separado**. El decodificador reconstruye el búfer de búsqueda mientras descomprime, de modo que el diccionario queda implícito en los propios datos. A cambio, la descompresión siempre debe avanzar secuencialmente desde el principio. En términos del algoritmo, no puede empezar en un punto arbitrario del archivo.

El tamaño de la ventana mantiene una relación directa de compromiso con la tasa de compresión. Una ventana mayor puede referirse a patrones más lejanos y suele comprimir mejor, pero también aumenta el trabajo de búsqueda y el uso de memoria.

<hr>

### LZ78: un diccionario explícito

A diferencia de LZ77, LZ78 **construye un diccionario explícito** durante la compresión. No utiliza una ventana deslizante. Guarda los patrones observados como entradas indexadas y sustituye las repeticiones posteriores por sus índices.

LZ78 produce etiquetas con la forma **(índice del diccionario, carácter siguiente)**. El codificador busca la entrada más larga que coincida, emite su índice junto al carácter que rompe la coincidencia y añade **“la entrada coincidente más el nuevo carácter”** como otra entrada. El diccionario crece gradualmente durante el proceso.

La variante más conocida de LZ78 es **LZW** (Lempel-Ziv-Welch). Terry Welch publicó esta mejora en 1984, y se utilizó en el formato GIF y en la utilidad Unix `compress`, cuya extensión es `.Z`. (LZW llegó a estar en el centro de una disputa de patentes, episodio que contribuyó al nacimiento de PNG.)

<hr>

### ¿De cuál de las dos familias descienden los algoritmos modernos?

Curiosamente, casi todos los algoritmos de compresión dominantes hoy son **descendientes de LZ77**.

**LZSS**, publicado por Storer y Szymanski en 1982, mejoró LZ77 mediante un indicador de un bit que distingue si cada salida es un literal, es decir, un carácter original, o un par longitud-distancia. Cuando una coincidencia es tan corta que la referencia sale más cara, el codificador conserva el carácter original.

En 1993, Phil Katz combinó LZSS con la **codificación Huffman**, que asigna secuencias de bits más cortas a los símbolos frecuentes, y creó **DEFLATE**. ZIP, GZIP y PNG usan DEFLATE. Por tanto, los archivos `.zip`, `.gz` y `.png` que manejamos a diario son descendientes directos de LZ77.

Algoritmos posteriores como **LZMA** (7-Zip y XZ), **LZ4** y **Zstd** también parten de la ventana deslizante de LZ77 y evolucionan las estructuras de búsqueda de coincidencias y los métodos de codificación entrópica. La familia LZ78, en cambio, prácticamente abandonó la escena principal después de LZW.

Se ha demostrado que ambos algoritmos tienen una capacidad teórica equivalente **cuando se descomprime el conjunto completo de datos**. Aun así, LZ77 sobrevivió porque **integrar el diccionario en los datos ofrecía más flexibilidad de implementación y extensión**. El tamaño de la ventana, los algoritmos de búsqueda y el codificador entrópico posterior podían combinarse con libertad, dejando margen para evolucionar según las necesidades de cada época.

<hr>

## Conclusión

LZ77 y LZ78 partieron de la misma idea, sustituir patrones repetidos por referencias breves, pero se separaron en si el diccionario vive dentro de los datos o se construye aparte. Aunque su capacidad teórica es equivalente, sobrevivió LZ77, cuyo tamaño de ventana, búsqueda de coincidencias y codificador entrópico podían intercambiarse.

Cómo se traduce este linaje en la elección de un formato real, comparando la velocidad y la tasa de compresión de ZIP, GZIP, ZSTD y XZ y decidiendo qué usar para artefactos de compilación, lo trato en [Cómo funcionan los algoritmos de compresión](/240706).

La próxima vez que descomprimas un archivo `.zip` o `.gz`, ojalá recuerdes que dentro se están intercambiando instrucciones como “retrocede tantos caracteres y copia tantos”.


### Referencias

:::ref
- [paper] [Ziv, Lempel, A Universal Algorithm for Sequential Data Compression (1977)](https://doi.org/10.1109/TIT.1977.1055714)
- [paper] [Ziv, Lempel, Compression of Individual Sequences via Variable-Rate Coding (1978)](https://doi.org/10.1109/TIT.1978.1055934)
:::
