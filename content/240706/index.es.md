---
emoji: 🗜️
title: "Cómo funcionan los algoritmos de compresión"
seoTitle: "Compresión comparada: GZIP, Zstandard, Brotli y tar.gz"
date: "2024-07-06"
updatedAt: "2026-10-08"
categories: curiosidades software
description: "Comparamos estructura, velocidad y tasa de ZIP, GZIP, ZSTD, BZIP2, XZ y Brotli, por qué tar.gz comprime más que zip y cuándo elegir tar.zst para un build."
keywords: "comparativa algoritmos de compresión, GZIP vs ZSTD, tar.gz vs zip, tar.zst, Brotli, archivo sólido, optimización de compilación frontend"
locale: es
translationOf: "240706"
sourceHash: b12e08c3033cab03e44164ef060426b26390a5a80430530fc191e20f70f7ca0e
---

En este artículo quiero hablar sobre los algoritmos de compresión de software.

Este artículo es para desarrolladores que suben artefactos de compilación grandes a un servidor o almacenamiento y dudan entre zip, tar.gz y tar.zst. Al terminar, sabrás en qué se diferencian los principales formatos en velocidad y tasa de compresión, y tendrás criterios para elegir entre tar.gz y tar.zst.

Me encargaron mejorar el proceso de despliegue de un proyecto interno. La arquitectura exigía subir a S3 artefactos de compilación muy grandes, y pude comprobar que el tamaño de la carpeta de build afectaba directamente al tiempo de subida y al coste de almacenamiento. De ahí surgió una pregunta natural: ¿cómo podíamos comprimir y subir esos archivos de forma más eficiente?

Al investigar descubrí muchos más formatos de los que esperaba: zip, gzip, zstd, bzip2, xz y otros. Sus nombres se parecían, pero no era fácil encontrar una explicación que aclarara sus diferencias y cuándo convenía usar cada uno. (Pensaba que toda compresión era más o menos igual, pero el mundo es grande y las formas de reducir archivos también.)

Antes de comparar, conviene señalar una raíz común. Casi todos los compresores de uso general actuales descienden de LZ77, publicado en 1977. LZ77 usa como diccionario un tramo de los datos ya procesados, la ventana deslizante, y sustituye los patrones repetidos por una referencia breve que significa “retrocede tantos caracteres y copia tantos”. Una ventana más grande detecta repeticiones más alejadas, pero exige más cómputo y memoria. DEFLATE, el algoritmo de ZIP y GZIP, añade a esto la codificación Huffman (una codificación entrópica que asigna secuencias de bits más cortas a los símbolos más frecuentes). Cómo se separó LZ77 de su hermano LZ78 lo explico aparte en [La diferencia entre LZ77 y LZ78](/240701).

El rendimiento de compresión se evalúa en dos ejes: la **tasa de compresión**, cuánto se reduce el archivo, y la **velocidad de compresión**, cuánto tarda el proceso. Perseguir una tasa más alta suele requerir más cómputo y más tiempo. La estrategia práctica consiste en encontrar el punto adecuado entre ambos.

Con esta base, comparemos los distintos formatos uno por uno.

## ZIP

ZIP es un formato creado por Phil Katz en 1989. En su interior suele usar **DEFLATE**, que combina LZ77 y Huffman coding. La distinción importante es que ZIP no es un algoritmo de compresión, sino un formato contenedor que almacena datos comprimidos mediante algoritmos como DEFLATE.

ZIP **comprime cada archivo por separado**. Esta estructura, en la que cada archivo se comprime de forma independiente, se conoce como archivo no sólido (Non-solid Archive). El enfoque opuesto, que une todos los archivos en un solo flujo y lo comprime de una vez, es el archivo sólido. Gracias a la estructura no sólida, es posible extraer un archivo concreto sin descomprimir los demás. Como contrapartida, no aprovecha datos repetidos entre archivos, por lo que puede obtener una tasa inferior a tar.gz, que veremos más adelante.

Windows, macOS, Linux y la mayoría de los sistemas operativos lo admiten sin instalar software adicional. Por eso es la opción más segura cuando importa la compatibilidad entre plataformas.

## GZIP (GNU Zip)

Al igual que ZIP, GZIP utiliza **DEFLATE** internamente. ¿Por qué existe otro formato si el algoritmo es el mismo? ZIP también actúa como contenedor para varios archivos, mientras que GZIP está especializado en comprimir **un único archivo o flujo**.

Para comprimir varios archivos o un directorio con GZIP, primero se reúnen en un archivo TAR y después se comprime ese archivo con GZIP. Este proceso de dos pasos genera un `.tar.gz` o `.tgz`.

La estructura de GZIP, especificada en RFC 1952, es bastante sencilla: una **cabecera fija de 10 bytes**, una cabecera extendida opcional con datos como el nombre original o comentarios, los datos DEFLATE y un **tráiler de 8 bytes** con la suma CRC-32 y el tamaño original. CRC-32 permite comprobar que los datos descomprimidos coinciden con el original. GZIP es, por tanto, una envoltura ligera alrededor de un flujo DEFLATE.

DEFLATE usa una ventana deslizante de **hasta 32 KB**. Ese tamaño limita la tasa de compresión porque no se pueden referenciar patrones separados por más de 32 KB. GZIP también ofrece niveles del 1 al 9. El nivel 1 es rápido, pero obtiene una tasa menor, alrededor del 60%; el nivel 9 es lento, pero alcanza aproximadamente el 75%. El valor predeterminado, 6, busca el equilibrio entre velocidad y tamaño.

En entornos Unix y Linux se utiliza como un estándar para distribuir código fuente, comprimir registros y empaquetar software. También sigue siendo una opción habitual para compresión HTTP mediante `Content-Encoding: gzip`, aunque Brotli lo está sustituyendo progresivamente en ese terreno.

## ZSTD (Zstandard)

ZSTD es un algoritmo desarrollado por Yann Collet en Meta, antes Facebook, y publicado como código abierto en 2016. Su gran ventaja es que **comprime y descomprime mucho más rápido, manteniendo una tasa comparable a GZIP**.

Su funcionamiento interno tiene tres grandes etapas. Primero, un **buscador de coincidencias (Match Finder)** de la familia LZ77 detecta patrones repetidos. Después codifica los literales, las longitudes y los desplazamientos encontrados como **secuencias**. Por último, comprime esas secuencias mediante **codificación entrópica**. En lugar de la codificación Huffman de GZIP, utiliza **FSE (Finite State Entropy)**, un codificador basado en ANS (Asymmetric Numeral Systems). ANS actualiza un único estado entero cada vez que procesa un símbolo y emite menos bits cuanto más frecuente es el símbolo. Su objetivo es lograr una tasa de compresión cercana a la de la codificación aritmética (Arithmetic Coding) con una velocidad cercana a la de Huffman. Huffman solo puede asignar un número entero de bits por símbolo; FSE puede representar probabilidades equivalentes a bits fraccionarios y acercarse más al límite teórico. (A pesar del nombre, la idea esencial es expresar los mismos datos con menos bits de una manera más inteligente.)

El buscador también cambia de estrategia según el nivel. Los niveles bajos, del 1 al 4, usan tablas hash sencillas para ganar velocidad. Los intermedios, del 5 al 12, comparan varios candidatos mediante una estrategia Lazy. Los altos, del 13 al 22, recurren a árboles binarios y programación dinámica para encontrar coincidencias casi óptimas. Esta escala permite usar niveles bajos para transmisión en tiempo real y altos para archivo.

En el benchmark Silesia Corpus, ZSTD en su nivel predeterminado 3 comprime a unos 300 MB/s y descomprime a unos 1.200 MB/s. GZIP en el nivel 6 alcanza apenas 34 MB/s y 380 MB/s, respectivamente. **ZSTD comprime unas ocho veces más rápido y descomprime unas tres, y aun así su tasa es superior: 3,17 frente a 3,09 de GZIP.** Estas cifras muestran de forma directa cómo mejora el compromiso tradicional.

Su adopción crece con rapidez. Se usa para comprimir módulos del kernel de Linux y de forma transparente en sistemas de archivos; distribuciones como Arch Linux, Fedora, Debian y Ubuntu lo han adoptado como formato predeterminado de compresión de paquetes. Desde la versión 1.5.7, publicada en febrero de 2025, la **compresión multihilo está activada de forma predeterminada** con hasta cuatro hilos, ampliando aún más la diferencia práctica frente al GZIP monohilo. AWS también ha explicado que redujo alrededor de un 30% el almacenamiento en S3 al migrar servicios internos de gzip a zstd.

## BZIP2

BZIP2 comprime mediante una cadena de transformaciones.

1. **RLE (Run-Length Encoding)**: reduce las repeticiones consecutivas de los datos iniciales
2. **BWT (Burrows-Wheeler Transform)**: reorganiza los datos para facilitar su compresión
3. **MTF (Move-to-Front Transform)**: convierte la salida de BWT en una secuencia numérica
4. **RLE**: vuelve a reducir las repeticiones del resultado de MTF
5. **Huffman Coding**: aplica finalmente una codificación basada en frecuencias

BZIP2 proporciona una tasa mayor que GZIP, pero tanto la compresión como la descompresión son más lentas. Se ha usado para archivo cuando el tamaño importaba más que la velocidad.

Su última versión fue la 1.0.8, publicada en 2019, y no está en desarrollo activo. A medida que los benchmarks muestran que ZSTD supera a BZIP2 en tasa y velocidad, los proyectos nuevos tienden a elegir ZSTD.

## XZ

XZ es un formato que usa **LZMA2**. LZMA, Lempel-Ziv-Markov chain Algorithm, fue desarrollado por Igor Pavlov y combina compresión por diccionario basada en LZ77 con codificación por rangos (Range Encoding). Más que una simple “versión mejorada de LZMA”, LZMA2 se parece a un **formato contenedor** para flujos LZMA. Añade compresión y descompresión multihilo y un tratamiento eficiente de los datos que no se pueden comprimir.

De todos los formatos tratados aquí, XZ ofrece **la tasa de compresión más alta**. A cambio, comprime muy despacio y consume mucha memoria. Resulta adecuado para archivo cuando ahorrar espacio es la prioridad absoluta.

En marzo de 2024, sin embargo, **se descubrió una puerta trasera en xz-utils, la biblioteca central de XZ, durante el grave incidente de cadena de suministro CVE-2024-3094**. Una campaña de ingeniería social de dos años había obtenido permisos de mantenimiento, y la vulnerabilidad recibió la puntuación máxima CVSS 10.0. Las principales distribuciones revirtieron inmediatamente a versiones seguras, pero el caso fue una advertencia contundente sobre la seguridad de la cadena de suministro de código abierto. (El valor técnico de XZ permanece, aunque conviene conocer este contexto al elegir herramientas.)

## TAR

TAR, Tape Archive, no es un algoritmo de compresión. Es una herramienta y un formato que **reúne varios archivos y directorios en un solo archivo**. Se creó originalmente para copias en cinta magnética. Dado que la cinta es un medio secuencial, concatenar los datos de forma continua era una estructura natural.

Su organización interna es sorprendentemente sencilla. Todo se procesa en **bloques de 512 bytes**. Antes de cada archivo aparece una cabecera de 512 bytes con metadatos como el nombre, hasta 100 bytes, el modo, UID/GID del propietario, tamaño, fecha de modificación y suma de comprobación. Los datos siguen a la cabecera y se rellenan hasta un múltiplo de 512 bytes. Dos bloques de ceros de 512 bytes indican el final. La mayoría de las implementaciones modernas siguen **UStar (Unix Standard TAR)**, definido por POSIX, que admite nombres de hasta 256 bytes y campos adicionales.

La propiedad clave es que TAR conserva **los metadatos del sistema de archivos Unix**, como permisos, propietarios, marcas de tiempo y enlaces simbólicos. ZIP no siempre conserva perfectamente estos datos específicos de Unix, por lo que TAR suele encajar mejor en despliegues de servidor.

TAR no reduce el tamaño por sí mismo; de hecho, las cabeceras y el relleno lo hacen ligeramente mayor que el original. La compresión real se consigue al combinarlo con GZIP, BZIP2, XZ o ZSTD. De ahí proceden extensiones como `.tar.gz`, `.tar.bz2`, `.tar.xz` y `.tar.zst`. TAR se encarga de “agrupar” y la otra herramienta de “reducir”, un ejemplo clásico de la filosofía Unix de “hacer bien una sola cosa”.

Es el método estándar de archivado en Unix/Linux, mientras que Windows puede necesitar software adicional como 7-Zip.

## Una breve mirada a Brotli

Quienes desarrollan frontend también deberían conocer **Brotli**. Google creó este algoritmo y en 2015 se estandarizó para compresión de flujos HTTP como `Content-Encoding: br`.

Todos los navegadores principales lo admiten sobre HTTPS, con una cobertura global superior al 96%, y suele ofrecer **entre un 15 y un 25% más de compresión que GZIP**. Resulta especialmente eficaz con archivos estáticos de texto como JavaScript, CSS y HTML. Grandes CDN como Cloudflare lo usan de forma predeterminada, y la práctica moderna se resume en “Brotli primero, GZIP como alternativa”.

Si los artefactos se suben a S3 y se sirven mediante una CDN, precomprimir los estáticos con Brotli puede reducir notablemente la transferencia de red. (En aquel momento no tenía suficiente evidencia específica del proyecto para introducirlo de inmediato, pero sigue siendo una opción que merece conocerse y revisarse.)

## Por qué tar.gz comprime mejor que ZIP

La razón está en la diferencia entre **archivos sólidos (Solid Archive)** y **no sólidos (Non-solid Archive)**.

Con tar.gz, TAR reúne todos los archivos en un flujo continuo y GZIP comprime el flujo entero de una vez. Así puede reconocer y aprovechar **datos repetidos entre archivos**. Eso es un archivo sólido. Si una carpeta de build contiene decenas de bundles JavaScript parecidos, un patrón del archivo A puede referenciarse cuando reaparece en B. También disminuye la sobrecarga porque no hay que registrar una cabecera, una suma y una tabla de contenidos independientes para cada flujo comprimido.

ZIP es no sólido y comprime cada archivo por separado, de modo que no aprovecha redundancias entre ellos. Aunque A y B contengan el mismo bloque de código, sus flujos DEFLATE no conocen la existencia del otro. Por eso tar.gz suele obtener una tasa entre un 5 y un 15% mejor que ZIP. La diferencia crece cuando el artefacto contiene muchos archivos de estructura similar.

Los archivos sólidos también tienen desventajas claras.

- Para extraer un solo archivo puede ser necesario **descomprimir primero todos los datos que lo preceden**. Como todo forma un único flujo, no se puede saltar directamente a un punto intermedio. ZIP permite acceso aleatorio a cada archivo y puede ser mejor cuando se extraen elementos concretos con frecuencia.
- Si una parte se daña, **todos los datos posteriores al punto dañado pueden quedar irrecuperables**. En un formato no sólido a veces se pierde solo el archivo afectado y se conserva el resto.

## En 2024 elegí tar.gz. ¿Qué elegiría ahora?

Añadí esta sección en 2026. Entonces escogí tar.gz por su compatibilidad y estabilidad. Tras subir el artefacto a S3 había que descomprimirlo en distintos entornos, así que un formato disponible casi en cualquier lugar era la opción segura.

Si afrontara hoy la misma situación, consideraría seriamente **tar.zst (TAR + ZSTD)**. Recordemos las cifras anteriores.

GZIP comprime a 34 MB/s en su nivel predeterminado y ZSTD a 300 MB/s. Para una carpeta de 2 GB, un cálculo simple da unos 60 segundos con GZIP y siete con ZSTD. Si además contamos el multihilo activado por defecto desde ZSTD v1.5.7, con hasta cuatro hilos, el tiempo real es todavía menor. En una canalización CI/CD esta diferencia se acumula en cada despliegue, así que no es una cifra despreciable.

```sh
# tar.zst 생성 (멀티스레드 자동 활용)
tar --zstd -cf archive.tar.zst directory/

# 또는 압축 레벨 지정 (-T0은 사용 가능한 모든 코어 활용)
tar -cf archive.tar.zst -I 'zstd -3 -T0' directory/
```

ZSTD también iguala o mejora la tasa de GZIP, por lo que prácticamente desaparece el compromiso de aceptar un archivo mayor para ganar velocidad. Es más rápido y produce un resultado más pequeño.

Aun así, hay que confirmar que el entorno receptor pueda descomprimir zstd. Las principales distribuciones Linux ya lo incluyen y en macOS se instala fácilmente con Homebrew mediante `brew install zstd`. Los sistemas antiguos o mínimos quizá necesiten una instalación adicional, por lo que conviene revisar de antemano todos los entornos del equipo. Si la compatibilidad es la prioridad absoluta, tar.gz sigue siendo la alternativa más segura.

## Comparativa rápida

| Formato    | Algoritmo       | Tasa      | Velocidad | Características principales          |
| ---------- | --------------- | --------- | --------- | ------------------------------------ |
| **ZIP**    | DEFLATE         | Media     | Rápida    | Multiplataforma, no sólido           |
| **GZIP**   | DEFLATE         | Media     | Rápida    | Flujo único, combinado con TAR       |
| **ZSTD**   | Zstandard       | Alta      | Muy rápida | Niveles ajustables, estándar moderno |
| **BZIP2**  | BWT+MTF+Huffman | Alta      | Lenta     | Desarrollo prácticamente detenido    |
| **XZ**     | LZMA2           | Muy alta  | Muy lenta | Máxima tasa, contexto de seguridad   |
| **Brotli** | Brotli          | Alta      | Media     | Especializado en la web              |

## Conclusión

Antes de profundizar en la compresión pensaba sinceramente: “¿No basta con meterlo todo en un zip?”. Trabajar con una carpeta de build de más de 2 GB hizo tangible que el algoritmo elegido puede cambiar de forma significativa el tiempo de subida y el coste.

Cada formato tiene su propia filosofía y sus compromisos: la compatibilidad de ZIP, la universalidad de GZIP, la velocidad de ZSTD y la tasa de XZ. No existe una opción “mejor” en todos los casos; la decisión adecuada depende del contexto del proyecto.

Entender los principios de las herramientas que usamos sin pensar nos ayuda a decidir mejor cuando aparece un problema parecido. Espero que este artículo sirva como una pequeña referencia para quien tenga que elegir un algoritmo de compresión.
