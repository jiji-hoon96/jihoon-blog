---
emoji: 🧬
title: "La diferencia entre LZ77 y LZ78"
seoTitle: "LZ77 vs LZ78: ventana deslizante, diccionario y DEFLATE"
date: "2024-07-01"
updatedAt: "2026-10-08"
categories: curiosidades software
description: "Cómo difieren LZ77 y LZ78 al manejar su diccionario y al olvidar lo antiguo, y cómo DEFLATE, ZIP, GZIP y Zstd descienden de la familia LZ77."
keywords: "LZ77, LZ78, LZ77 vs LZ78, algoritmo LZ77, compresión con ventana deslizante, LZW, cómo funciona DEFLATE, compresión basada en diccionario"
locale: es
translationOf: '240701'
sourceHash: ddc4d9e1f3f50970b1b45c010136599e1ae4ffc77291be473b4b38679baa37a9
---

En este artículo quiero hablar de **en qué se diferencian LZ77 y LZ78**.

Este artículo es para desarrolladores que usan herramientas como zip, gzip o zstd y se han preguntado cómo funciona la compresión basada en diccionario que llevan dentro. Al terminar, podrás explicar en qué se diferencian ambos algoritmos al manejar su diccionario y de cuál de los dos descienden los compresores dominantes actuales.

Si se comparan formatos para comprimir artefactos de compilación, tarde o temprano se acaba remontando a estos dos algoritmos.

## Compresión basada en diccionarios

La compresión sin pérdida permite reconstruir los datos originales a la perfección. A diferencia de la compresión con pérdida, habitual en imágenes y audio, el resultado descomprimido no difiere del original ni en un solo bit. Cuando la integridad es esencial, como ocurre con el código fuente o los artefactos de compilación, hay que utilizar compresión sin pérdida.

Su idea central consiste en **aprovechar la redundancia estadística presente en los datos**. Si sustituimos patrones repetidos por representaciones más cortas, reducimos el tamaño total.

Entre estas técnicas, los métodos **basados en diccionarios (Dictionary-Based)** forman una familia muy extendida. Aquí, el diccionario es el mecanismo que permite volver a señalar datos ya vistos. Que ese mecanismo sean los propios datos ya recorridos o una lista construida aparte es lo que separa a LZ77 de LZ78. **LZ77**, propuesto por Jacob Ziv y Abraham Lempel en un [artículo](https://doi.org/10.1109/TIT.1977.1055714) de 1977 en IEEE Transactions on Information Theory, y **LZ78**, del [artículo que ambos publicaron al año siguiente](https://doi.org/10.1109/TIT.1978.1055934), son los antepasados de esta familia. “LZ” toma una letra de cada apellido. Los algoritmos posteriores basados en diccionarios, como DEFLATE, LZMA, LZ4 y Zstd, descienden de ellos.

Pensemos en un ejemplo sencillo. Si la palabra “Linux” se repite cien veces, a partir de la segunda aparición se escribe, en lugar del texto original, una referencia corta que apunta a “ese fragmento visto antes”. Si la referencia es más corta que el original, el tamaño total se reduce.

Entonces, ¿en qué se diferencian exactamente LZ77 y LZ78?

## LZ77: el método de la ventana deslizante

LZ77 **no crea un diccionario explícito independiente**. Usa una región del propio flujo de entrada como diccionario. Esa región se llama **ventana deslizante** porque se desplaza hacia delante tanto como se ha procesado.

La ventana se divide en dos zonas.

- **Búfer de búsqueda (Search Buffer)**: datos ya procesados. Cumple el papel de diccionario.
- **Búfer de anticipación (Look-ahead Buffer)**: datos aún no procesados que se comprimirán a continuación.

El algoritmo busca si el comienzo del búfer de anticipación ya apareció en alguna parte del búfer de búsqueda. Si encuentra el mismo patrón, codifica la coincidencia como una tupla **(distancia, longitud, carácter siguiente)**. La distancia indica cuántos caracteres hay que retroceder para llegar al inicio de la coincidencia y la longitud, cuántos caracteres abarca. El artículo original registraba el primer valor como una posición dentro del búfer; las implementaciones actuales registran la misma información como una distancia.

Por ejemplo, si comprimimos la cadena `"banana_banana"` con el codificador didáctico incluido más adelante en este artículo, salen cinco tokens LZ77: `(0,0,b)` `(0,0,a)` `(0,0,n)` `(2,3,_)` `(7,5,a)`. Los tres primeros son caracteres vistos por primera vez, así que solo llevan el carácter siguiente, sin coincidencia. El segundo `"banana"` se resuelve con un único token, el último, `(7,5,a)`. Significa “retrocede siete caracteres, copia cinco y añade `a`”. No copia los seis caracteres porque este codificador siempre deja el último carácter de la entrada en la posición del carácter siguiente.

En `(2,3,_)`, la longitud 3 es mayor que la distancia 2. Con `ban` ya escrito, el decodificador empieza a copiar desde la `a` situada dos caracteres atrás y, al copiar el tercer carácter, vuelve a leer la `a` que acaba de escribir. Así sale `ana` y después se añade `_`. Seguido carácter a carácter, queda así.

| Paso | Carácter leído | Salida |
|---|---|---|
| Inicio | ninguno | `ban` |
| Copia 1 | 2.º carácter, `a` | `bana` |
| Copia 2 | 3.º carácter, `n` | `banan` |
| Copia 3 | 4.º carácter, `a` (escrito en la copia 1) | `banana` |
| Carácter siguiente | `_` del token | `banana_` |

[RFC 1951](https://www.rfc-editor.org/rfc/rfc1951) especifica el mismo comportamiento: si los dos últimos bytes son X e Y, `<length = 5, distance = 2>` añade X,Y,X,Y,X. Esto es posible porque el diccionario son los datos que se acaban de restaurar.

En este método **el diccionario no se guarda ni se transmite por separado.** El decodificador reconstruye por sí mismo el búfer de búsqueda mientras descomprime, de modo que el diccionario queda implícito en los propios datos. Como las referencias apuntan a datos anteriores, la descompresión avanza, en principio, en orden desde el comienzo. Sin embargo, las referencias solo alcanzan hasta donde llega la ventana. RFC 1951 limita las referencias de DEFLATE a un máximo de 32K bytes hacia atrás. El `Z_FULL_FLUSH` de zlib reinicia el estado de compresión para que la descompresión pueda reanudarse desde ese punto si los datos comprimidos anteriores se dañaron o si se necesita acceso aleatorio. [zlib.h](https://github.com/madler/zlib/blob/v1.3.1/zlib.h) advierte que usarlo con demasiada frecuencia puede degradar seriamente la compresión.

El tamaño de la ventana mantiene una relación directa de compromiso con la tasa de compresión. Una ventana mayor puede referirse a patrones más lejanos y comprime mejor, pero usa más memoria y, como hay más candidatos que revisar, la búsqueda de coincidencias suele volverse más lenta.

## LZ78: un diccionario explícito

A diferencia de LZ77, LZ78 **construye un diccionario explícito** durante la compresión. No utiliza una ventana deslizante. Guarda los patrones observados como entradas indexadas y sustituye las repeticiones posteriores por sus índices.

LZ78 produce etiquetas con la forma **(índice del diccionario, carácter siguiente)**. El codificador busca la entrada más larga que coincida, emite su índice junto al carácter que rompe la coincidencia y añade **“la entrada coincidente más el nuevo carácter”** como otra entrada. El diccionario crece gradualmente durante el proceso.

Si comprimimos el mismo `"banana_banana"` con LZ78, salen ocho tokens y el diccionario acumula siete entradas. Los tokens son `(0,b)` `(0,a)` `(0,n)` `(2,n)` `(2,_)` `(1,a)` `(3,a)` `(7,)`, y el diccionario es `1:b` `2:a` `3:n` `4:an` `5:a_` `6:ba` `7:na`. El segundo `"banana"` se divide en tres tokens que producen `ba`, `na` y `na`. Es la parte que LZ77 resolvió con un solo token. Una entrada del diccionario de LZ78 crece solo un carácter cada vez, así que solo aparece una entrada larga después de ver la misma palabra varias veces. El último token, `(7,)`, es el caso en que la entrada termina y no hay carácter siguiente. Este codificador no empaqueta los tokens en bits, por lo que el número de tokens no sirve para comparar tasas de compresión.

Ambas secuencias de tokens se pueden reproducir con el código siguiente. Es el resultado de guardarlo en un archivo y ejecutar `node lz.mjs` el 2026-10-08 en macOS 26.6.2 con Node v24.16.0.

```js
// LZ77: (거리, 길이, 다음 문자). 가장 긴 일치를 고르고, 겹친 복사를 허용한다
function lz77(s, win = 4096) {
  const out = []
  let i = 0
  while (i < s.length) {
    let best = { d: 0, l: 0 }
    for (let j = Math.max(0, i - win); j < i; j++) {
      let l = 0
      // 입력의 마지막 글자는 매치에 넣지 않고 다음 문자로 남긴다
      while (i + l < s.length - 1 && s[j + l] === s[i + l]) l++
      if (l > best.l) best = { d: i - j, l }
    }
    out.push([best.d, best.l, s[i + best.l]])
    i += best.l + 1
  }
  return out
}

// LZ78: (사전 인덱스, 다음 문자). 인덱스 0 은 빈 문자열이다
function lz78(s) {
  const dict = new Map()
  const out = []
  let w = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (dict.has(w + c)) {
      if (i < s.length - 1) { w += c; continue }
      out.push([dict.get(w + c), '']) // 입력이 끝나 다음 문자가 없다
      break
    }
    out.push([w ? dict.get(w) : 0, c])
    dict.set(w + c, dict.size + 1)
    w = ''
  }
  return { out, dict: [...dict.keys()] }
}

// 두 디코더 모두 토큰만 받는다. 사전은 전달받지 않는다
function unlz77(tokens) {
  let o = ''
  for (const [d, l, c] of tokens) {
    for (let k = 0; k < l; k++) o += o[o.length - d] // 방금 쓴 글자도 다시 읽는다
    o += c
  }
  return o
}
function unlz78(tokens) {
  const dict = ['']
  let o = ''
  for (const [i, c] of tokens) {
    const entry = dict[i] + c
    o += entry
    dict.push(entry) // 인코더와 같은 순서로 사전을 다시 쌓는다
  }
  return o
}

const s = 'banana_banana'
const a = lz77(s)
const b = lz78(s)
console.log('LZ77', a.map(([d, l, c]) => `(${d},${l},${c})`).join(' '), unlz77(a) === s)
console.log('LZ78', b.out.map(([i, c]) => `(${i},${c})`).join(' '), unlz78(b.out) === s)
console.log('사전', b.dict.map((e, k) => `${k + 1}:${e}`).join(' '))
```

```text
LZ77 (0,0,b) (0,0,a) (0,0,n) (2,3,_) (7,5,a) true
LZ78 (0,b) (0,a) (0,n) (2,n) (2,_) (1,a) (3,a) (7,) true
사전 1:b 2:a 3:n 4:an 5:a_ 6:ba 7:na
```

## Dónde se separan los dos

Los dos decodificadores del código reciben solo tokens. Eso significa que **LZ78 tampoco transmite su diccionario**. El decodificador lee los tokens y añade entradas en el mismo orden que el codificador, así que se reconstruye el mismo diccionario. No transmitir el diccionario es algo que comparten ambos algoritmos; donde se separan es en **cómo olvidan el contenido antiguo**. La ventana de LZ77 avanza y olvida los datos viejos por sí sola. El diccionario de LZ78 sigue creciendo si se deja como está. El artículo original lo vaciaba por completo cada vez que terminaba un bloque de longitud fija, y las implementaciones reales limitan su tamaño y, cuando se llena, lo congelan, lo vacían o reutilizan algunas entradas.

La variante más conocida de LZ78 es **LZW** (Lempel-Ziv-Welch). Terry Welch publicó esta mejora en 1984, y se utilizó en el formato GIF y en la utilidad Unix `compress`, cuya extensión es `.Z`. Ambas implementaciones pusieron un límite al diccionario. La [especificación GIF89a](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) limita los códigos a 12 bits (valor máximo 4095) y define aparte un Clear code que devuelve el diccionario a su estado inicial. Según la [página de manual de ncompress](https://github.com/vapier/ncompress/blob/v5.0/compress.1), `compress` vigila la tasa de compresión una vez que la longitud de código alcanza el límite de `-b` (16 bits por defecto) y, si la tasa baja, descarta el diccionario y lo reconstruye desde cero.

Cada artículo demostró optimalidad asintótica dentro de su propio modelo. El artículo de 1977 mostró que la tasa de compresión de LZ77 “uniformly approaches the lower bounds” (se acerca uniformemente a las cotas inferiores) alcanzables por códigos diseñados conociendo la fuente de antemano, y el artículo de 1978 mostró, para secuencias individuales, que el incremental parsing de LZ78 es asintóticamente óptimo. Como los modelos son distintos, estos resultados por sí solos no permiten comparar ambos.

## Descendientes de LZ77

¿De cuál de los dos lados vienen, entonces, los algoritmos modernos? La mayoría de los algoritmos de compresión dominantes hoy son **descendientes de LZ77**.

**LZSS**, que surgió del artículo de Storer y Szymanski de 1982, es una variante de LZ77. Cuando una coincidencia es tan corta que el puntero resultaría más largo que el original, emite un literal (el carácter original) en lugar del puntero.

**DEFLATE** lo diseñó Phil Katz para PKZIP 2, y su especificación se recogió en 1996 como RFC 1951. RFC 1951 describe DEFLATE como la combinación de LZ77 y la **codificación Huffman**, que asigna secuencias de bits más cortas a los símbolos frecuentes. Su salida es una secuencia que mezcla literales y pares (longitud, distancia), y une literales y longitudes de coincidencia en un solo alfabeto (0 a 285) que se distingue con un único código Huffman. El método de compresión que la mayoría de los programas ZIP usan por defecto, así como GZIP y PNG, usan este DEFLATE. Por tanto, la mayoría de los archivos `.zip`, `.gz` y `.png` que manejamos a diario son descendientes directos de LZ77.

No hay una sola razón que explique por qué el lado de LZ77 se volvió dominante, pero una que las propias especificaciones destacan son las patentes. RFC 1951 señala que muchas variantes de LZ77 están patentadas y afirma que el formato DEFLATE puede implementarse fácilmente de una manera no cubierta por patentes. La [especificación PNG](https://www.w3.org/TR/png-3/) presenta PNG desde su comienzo como un reemplazo de GIF libre de patentes. GIF es el formato que usa el LZW visto antes.

Algoritmos posteriores como **LZMA** (7-Zip y XZ), **LZ4** y **Zstd** también partieron de la idea de la ventana deslizante de LZ77. LZMA y Zstd desarrollaron a la vez la búsqueda de coincidencias y la codificación entrópica, mientras que LZ4 prescindió por completo de la codificación entrópica y optó por la velocidad con un formato orientado a bytes. La familia LZ78 sigue presente, en forma de LZW, dentro de formatos como GIF.

## Conclusión

LZ77 y LZ78 partieron de la misma idea, sustituir patrones repetidos por referencias breves. Ninguno transmite su diccionario y en ambos lo reconstruye el decodificador, pero se separaron en si una referencia apunta a una posición de los datos ya recorridos o al número de una entrada de un diccionario construido aparte, y también olvidan lo antiguo de forma distinta. Los compresores dominantes que van de DEFLATE a LZMA, LZ4 y Zstd descienden de LZ77, mientras que el lado de LZ78 sigue vivo como LZW en formatos como GIF.

Cómo se traduce este linaje en la elección de un formato real, comparando la velocidad y la tasa de compresión de ZIP, GZIP, ZSTD y XZ y decidiendo qué usar para artefactos de compilación, lo trato en [Cómo funcionan los algoritmos de compresión](/240706).

La próxima vez que descomprimas un archivo `.zip` o `.gz`, ojalá recuerdes que dentro se están intercambiando instrucciones como “retrocede tantos caracteres y copia tantos”.


:::ref
- [paper] [Storer, Szymanski, Data compression via textual substitution (1982)](https://doi.org/10.1145/322344.322346)
- [paper] [Welch, A Technique for High-Performance Data Compression (1984)](https://doi.org/10.1109/MC.1984.1659158)
- [docs] [PKWARE, APPNOTE.TXT: .ZIP File Format Specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)
:::
