---
emoji: 🧮
title: "Cómo se comparan las queryKey"
seoTitle: "queryKey en TanStack Query: hashKey y el orden de las claves"
date: "2025-12-30"
updatedAt: "2026-10-08"
categories: frontend React TanStack-Query queryKey
description: "Cómo TanStack Query decide que dos queryKey son iguales: la serialización con hashKey (orden de claves, undefined, Map) y la comparación de los filtros."
keywords: "comparación de queryKey, hashKey, queryHash, clave de caché de TanStack Query, orden de queryKey en React Query, queryKeyHashFn, JSON.stringify claves ordenadas, QueryCache"
locale: es
translationOf: '251230'
sourceHash: 47c18317b91a4b6f5d16479d680433d97c9f8ee7a016da28cd3387dd9417f417
---

En esta publicación quiero hablar sobre **cómo decide TanStack Query que dos queryKey son la misma clave**.

Está dirigida a quienes usan TanStack Query y se han preguntado por qué una queryKey, que se crea como un arreglo nuevo en cada renderizado, no provoca un fallo de caché cada vez, y si el orden de las claves de un objeto o los valores `undefined` afectan a la caché; al terminar sabrás qué regla hace que dos claves sean iguales y cómo afecta esa regla a la caché. Para adelantar la conclusión: TanStack Query usa como clave de caché la cadena que resulta de serializar la queryKey con `hashKey`, y en ese proceso se ignora el orden de las claves de los objetos mientras se conserva el orden de los elementos de los arreglos.

La queryKey es el arreglo que TanStack Query usa como base para gestionar la caché de consultas. La misma clave significa los mismos datos, y cuando `['user', userId]` cambia porque cambió su `userId`, se produce un fallo de caché y los datos se vuelven a obtener con fetch.


## El interior de QueryCache

Según [El interior de React Query](https://tkdodo.eu/blog/inside-react-query), de TkDodo, `QueryCache` no es más que **una estructura de datos mantenida en memoria**. En la [implementación oficial](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/queryCache.ts) de v5 esa estructura no es un objeto plano, sino un `Map<string, Query>`. El campo tiene el tipo `QueryStore`, y el constructor le asigna un `new Map<string, Query>()`. Las entradas se guardan y se consultan con `queryHash` como clave. La clave es la forma serializada de queryKey (`queryHash`), y el valor es una instancia de la clase `Query`. El código y los resultados de este artículo se basan en `@tanstack/query-core` 5.104.1.

A diferencia de los objetos planos que usaban las versiones antiguas, un `Map` nunca choca con claves heredadas de un prototipo.

Lo que ocurre cada vez que se llama a `useQuery` es sencillo: **queryKey se convierte en un valor hash y este se utiliza para buscar en el mapa**. Si existe, se recupera la instancia de `Query` almacenada en caché; si no, se crea una nueva y se guarda con `set`.

De aquí se desprende otra pregunta natural: **¿por qué serializar queryKey como una cadena?** ¿No bastaría con usar el propio arreglo como clave, como en `Map<QueryKey, Query>`?

La respuesta está en el modelo de igualdad de JavaScript. El `Map` nativo compara sus claves mediante **igualdad referencial (reference equality)**. Aunque el contenido sea el mismo, considera diferentes dos objetos que ocupan lugares distintos en memoria.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined. 새로 만든 배열은 다른 참조다
```

Sin embargo, en un componente de React, `useQuery({ queryKey: ['user', userId] })` **crea una nueva instancia del arreglo en cada renderizado**. Aunque los arreglos queryKey del primer y del segundo renderizado tengan el mismo contenido, son objetos distintos en memoria. Si la caché dependiera de la igualdad referencial, cada renderizado de un componente que mostrase los mismos datos provocaría un fallo de caché.

La solución al problema causado por la igualdad referencial es sencilla: **convertir la igualdad referencial en igualdad estructural (structural equality)**. Se genera una cadena determinista basada únicamente en el contenido de queryKey y se usa esa cadena como clave del mapa. Así se recupera la semántica deseada: «si el contenido es igual, la clave es igual». `JSON.stringify` no es más que la herramienta más sencilla para realizar esa conversión.

## Ordenamiento de claves en hashKey

La función que genera el valor hash es `hashKey`. La implementación oficial, definida en [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/utils.ts#L284-L295), es esta.

```typescript
export function hashKey(queryKey: QueryKey | MutationKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val,
  )
}
```

Usa `JSON.stringify` con una [función de reemplazo](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) que **ordena lexicográficamente las claves de los objetos planos** antes de serializarlos. En rigor, es el orden de unidades de código UTF-16, la comparación por defecto de `sort()`, así que las claves en mayúscula van antes que las de minúscula.

Este ordenamiento es esencial porque la serialización a una cadena impone otra condición aún más estricta: **las entradas semánticamente iguales deben convertirse siempre en la misma cadena**. Sin embargo, `JSON.stringify` normal conserva el orden de las claves. Aunque `{ a: 1, b: 2 }` y `{ b: 2, a: 1 }` sean objetos semánticamente iguales, se serializan como cadenas diferentes y terminan ocupando espacios de caché distintos. Así volverían a solicitarse dos veces los mismos datos.

La técnica que evita sistemáticamente este problema es la **forma canónica (canonical form)**. Consiste en obligar a que las entradas semánticamente iguales correspondan siempre a una única representación. Ese es el motivo por el que la función de reemplazo de `hashKey` ordena las claves de los objetos planos. Hace que el resultado sea idéntico con independencia del orden de entrada, de modo que los objetos con el mismo significado se conviertan siempre en la misma cadena. La dirección contraria no está garantizada, como veremos más adelante.

El hecho de que los arreglos no se ordenen es la otra cara del mismo principio. En un arreglo, el propio orden contiene significado; ordenarlo supondría perder información. El orden de las claves de un objeto es accidental, mientras que el orden de los elementos de un arreglo es intencionado. `hashKey` trata ambos casos de forma distinta. Que el mantenedor TkDodo recomiende en [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) estructurar queryKey desde lo más genérico hasta lo más específico también se debe a que el orden del arreglo tiene significado. La razón que él da es la invalidación: las claves que comparten la parte inicial se pueden invalidar todas a la vez con `['todos']`. Esa comparación no la hace el hash, sino la coincidencia por prefijo que veremos más adelante.

El ordenamiento de claves solo se aplica a los **objetos planos**. `isPlainObject`, definida en el mismo archivo, comprueba si `Object.prototype.toString` devuelve `[object Object]` y si el prototipo es `Object.prototype` (o `null`) para distinguir entre **literales de objeto puros** e **instancias de clase**. Por eso un literal como `{ foo: 1 }` se ordena, mientras que una instancia creada con `class User { ... }` pasa sin ordenarse. Si se introduce directamente una instancia de clase en queryKey, sus claves no se ordenan y se serializa en el orden en que se asignaron sus campos, así que valores iguales pueden producir hashes distintos.

Visto desde quien lo usa, hay dos resultados.

### El orden de las claves de un objeto es irrelevante

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

Sin el ordenamiento de claves, al escribir un literal de objeto habría que recordar siempre el orden de sus claves.

### El orden de los elementos de un arreglo sí importa

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```


## Valores que cambia la serialización

También conviene saber que los valores `undefined` desaparecen durante la serialización. `{ a: 1, b: undefined }` y `{ a: 1 }` generan el mismo hash. (Yo mismo cometí una vez el error de pensar: «¡Como he añadido undefined de forma explícita, será otra caché!».)

Dentro de un arreglo el comportamiento es distinto. Un elemento `undefined` no desaparece, sino que se convierte en `null`. Por eso `['user', undefined]` y `['user', null]` son la misma clave, y ambas son distintas de `['user']`. Es lo que ocurre con `['user', userId]` cuando `userId` todavía es `undefined`. Aunque bloquees el fetch con `enabled: false`, en la caché se crea igualmente una entrada `["user",null]`. Lo comprobé creando con las mismas opciones el objeto que `useQuery` usa internamente, un `QueryObserver`.

`undefined` no es el único caso. Como `hashKey` se apoya en `JSON.stringify`, la mayoría de los valores que JSON no puede representar se convierten en otros valores sin ningún error. Ejecuté el siguiente código el 2026-10-08 con `@tanstack/query-core` 5.104.1 y Node v24.16.0; los comentarios son la salida real.

```js
import { hashKey, QueryClient } from '@tanstack/query-core'

console.log(hashKey(['user', undefined])) // ["user",null]
console.log(hashKey(['user', null])) // ["user",null]
console.log(hashKey(['user'])) // ["user"]
console.log(hashKey(['f', { cb: () => 1 }])) // ["f",{}]
console.log(hashKey(['m', new Map([['a', 1]])])) // ["m",{}]
console.log(hashKey(['d', new Date('2025-12-30T00:00:00Z')])) // ["d","2025-12-30T00:00:00.000Z"]

const queryClient = new QueryClient()
queryClient.setQueryData(['m', new Map([['a', 1]])], 'mapA')
console.log(queryClient.getQueryData(['m', new Map([['b', 2]])])) // mapA
```

Si se prueban otros valores de la misma manera, el resultado se resume así.

| Valor en la clave | Resultado serializado | Se trata como la misma clave que |
|---|---|---|
| `undefined`, `NaN`, `Infinity` o una función como elemento de arreglo | `null` | una clave con `null` en esa posición |
| `undefined` o una función como propiedad de objeto | la propiedad desaparece | una clave sin esa propiedad |
| `Map`, `Set` | `{}` | cualquier `Map`, `Set` u objeto vacío, sea cual sea su contenido |
| `Date` | una cadena ISO | la misma cadena ISO |
| `BigInt` | lanza `TypeError` | ninguna |
| referencia circular | lanza `RangeError` si el ciclo pasa solo por objetos planos y `TypeError` si pasa por un arreglo o una instancia de clase | ninguna |

Los más peligrosos son `Map` y `Set`. En el código anterior, los datos guardados con la clave `new Map([['a', 1]])` se recuperaron al consultar con `new Map([['b', 2]])`. Como no hay error, tampoco hay ninguna pista de que la pantalla está mostrando datos equivocados.

Solo dos casos aparecen como error: `BigInt` y las referencias circulares. En las referencias circulares, el error depende de qué forma el ciclo. Un ciclo que pasa solo por objetos planos termina con `RangeError: Maximum call stack size exceeded`, mientras que uno que pasa aunque sea por un arreglo o una instancia de clase, como en `arr.push(arr)`, termina con `TypeError: Converting circular structure to JSON`. Como la función de reemplazo devuelve un objeto nuevo por cada objeto plano, la detección de ciclos de `JSON.stringify` nunca vuelve a encontrar el mismo objeto; los arreglos y las instancias de clase, en cambio, la función de reemplazo los devuelve tal cual, y el ciclo se detecta. Por su parte, `Date` se convierte en una cadena ISO mediante `toJSON`, así que en la consulta de la caché el mismo instante produce la misma clave y resulta relativamente seguro.

Una vez puse un `Date` directamente en una clave y pasé mucho tiempo preguntándome: «¿Por qué se actualiza la caché si es el mismo instante?». Un `Date` que apunta al mismo instante se convierte en la misma cadena ISO aunque sea otra instancia, así que produce el mismo hash. Si cada vez salía una clave distinta, el instante en sí era distinto, aunque pareciera el mismo. Si se crea un `new Date()` durante el renderizado, cada renderizado recibe una hora distinta por milisegundos, y cada una se convierte en una clave nueva.

Por eso lo más seguro es poner en una queryKey solo cadenas, números, booleanos, `null` y arreglos u objetos planos formados por ellos.


## queryKeyHashFn

Esta restricción tiene una vía de escape. Mediante la opción `queryKeyHashFn`, TanStack Query permite **sustituir la propia función hash**. Internamente, `hashQueryKeyByOptions(queryKey, options)` decide: si las opciones incluyen `queryKeyHashFn`, la llama; si no, llama a la función predeterminada `hashKey`.

Sustituirla significa reemplazar `hashKey` por completo. El ordenamiento de claves visto antes desaparece con ella, así que si lo necesitas tienes que implementarlo tú. El caso en que esta opción resulta útil es un valor con el que la serialización por defecto lanza un error, como `BigInt`. El siguiente código también lo ejecuté en el mismo entorno.

```js
import { QueryClient } from '@tanstack/query-core'

const bigintSafeHash = (queryKey) =>
  JSON.stringify(queryKey, (_, v) => (typeof v === 'bigint' ? v.toString() : v))

const queryClient = new QueryClient({
  defaultOptions: { queries: { queryKeyHashFn: bigintSafeHash } },
})

queryClient.setQueryData(['order', 9007199254740993n], 'ok')
console.log(queryClient.getQueryData(['order', 9007199254740993n])) // ok
console.log(queryClient.getQueryData(['order', '9007199254740993'])) // ok

queryClient.setQueryData(['todos', { status: 'done', page: 1 }], 'A')
console.log(queryClient.getQueryData(['todos', { page: 1, status: 'done' }])) // undefined
```

La segunda salida significa que un `BigInt` y una cadena con el mismo número se convierten en la misma clave. La última salida es el efecto de perder el ordenamiento: los objetos que solo difieren en el orden de sus claves ya no se tratan como la misma clave.

El lugar donde se registra también cambia el resultado. Si se registra en `QueryClient` mediante `defaultOptions` o con `setQueryDefaults`, como arriba, `setQueryData` y `getQueryData` también usan esa función. Ocurre porque ambas API combinan las opciones por defecto con `defaultQueryOptions` antes de calcular el hash. En cambio, si se escribe solo en la llamada a `useQuery`, las API imperativas usan el `hashKey` predeterminado y la misma clave se divide en dos entradas dentro de la caché. En la etapa beta de v3.2.0, ni siquiera el valor global se aplicaba a `setQueryData`, y quien reportó el [Issue #1343](https://github.com/TanStack/query/issues/1343) confirmó que quedó corregido en v3.2.0-beta.30.

Por eso, en producción es mucho más seguro evitar la vía de escape y **convertir los valores a una forma serializable al construir la queryKey**. Escribir tu propia función hash obliga a ocuparse tanto del ordenamiento de claves como del lugar donde se registra.


## Cómo comparan claves los filtros

Hay una forma más de juzgar si dos claves son iguales. La «misma clave» de la que se ha hablado hasta ahora significa que las cadenas hash son iguales, y el hash solo se usa en la búsqueda en caché y en los filtros con `exact: true`. Los filtros como `invalidateQueries` o `findAll` deciden por defecto con `partialMatchKey`, que compara de forma recursiva la estructura de la queryKey original, no la cadena hash. Los arreglos se comparan desde el principio y en los objetos solo se miran las claves escritas en el filtro. El siguiente código también lo ejecuté en el mismo entorno.

```js
import { partialMatchKey } from '@tanstack/query-core'

const queryKey = ['todos', { status: 'done', page: 1 }]
console.log(partialMatchKey(queryKey, ['todos'])) // true
console.log(partialMatchKey(queryKey, ['todos', { status: 'done' }])) // true
console.log(partialMatchKey(queryKey, [{ status: 'done' }])) // false
console.log(partialMatchKey(queryKey, ['todos', { status: 'todo' }])) // false
```

Como esta coincidencia no pasa por el hash, sustituir `queryKeyHashFn` no la cambia. En un `QueryClient` con una función hash sin ordenamiento, como en el ejemplo anterior, un objeto que solo difiere en el orden de sus claves no se encuentra con `exact: true`, pero la coincidencia por prefijo sí lo encuentra.

Por eso no hay garantía de que las claves iguales por hash también lo sean en un filtro. Una consulta creada con `['user', undefined]` no queda atrapada por la coincidencia por prefijo de un filtro `['user', null]`, y una clave que contiene `NaN` ni siquiera coincide consigo misma. A la inversa, si se pone un `Date` o un `Map` en un filtro, como no tiene propiedades enumerables que comparar, coincide con cualquier `Date` u objeto en la misma posición.


## Conclusión

En resumen, TanStack Query no compara las referencias de los arreglos queryKey. `hashKey` ordena las claves de los objetos planos mientras serializa con `JSON.stringify`, y la cadena resultante (`queryHash`) se usa como clave de un `Map`. Por eso el orden de las claves de un objeto no afecta a la caché, el orden de los elementos de un arreglo sí, y una propiedad cuyo valor es `undefined` equivale, para el hash, a una propiedad ausente. La mayoría de los valores que JSON no puede representar se convierten en otros sin ningún error, de modo que claves distintas pasan a ser la misma en silencio. Se puede cambiar la función hash con `queryKeyHashFn`, pero eso también descarta el ordenamiento de claves, así que es más seguro convertir los valores en serializables al construir la clave. Los filtros, como los de invalidación, por defecto no pasan por el hash y comparan la estructura de la queryKey desde el principio, así que conviene no esperar que las claves iguales por hash lo sean también en un filtro. Al final, la búsqueda en caché compara el contenido de la clave mediante `hashKey` y los filtros comparan su parte inicial, así que si en queryKey solo se ponen valores simples cuyo significado no cambia al serializarse, ambas comparaciones se comportan como se espera.

Cómo este criterio se traslada a la forma de escribir y gestionar las queryKey, es decir, el camino desde los arreglos en línea, pasando por las fábricas de claves, hasta `queryOptions`, se trata en [queryKey](/260104).

La próxima vez que metas un objeto o un `Map` en una queryKey, espero que pienses por un momento en qué cadena se va a serializar.

:::ref
- [documentación] [TanStack Query, claves de consulta](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [documentación] [TanStack Query, QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient)
:::
