---
emoji: 🧮
title: "Cómo se comparan las queryKey"
seoTitle: "Cómo compara TanStack Query las queryKey: hashKey explicado"
date: "2025-12-30"
updatedAt: "2026-10-08"
categories: frontend React TanStack-Query queryKey
description: "Cómo TanStack Query trata arreglos queryKey nuevos como la misma clave con hashKey: el orden de claves no importa, el de arreglos sí, undefined se pierde."
keywords: "comparación de queryKey, hashKey, queryHash, clave de caché de TanStack Query, orden de queryKey en React Query, queryKeyHashFn, JSON.stringify claves ordenadas, QueryCache"
locale: es
translationOf: '251230'
sourceHash: 47b793dc921cc4a4557e91344efd55785d4d646a3f8f86d04bd3566dea99e8c3
---

En esta publicación quiero hablar sobre **cómo decide TanStack Query que dos queryKey son la misma clave**.

Está dirigida a quienes usan TanStack Query y se han preguntado por qué una queryKey, que se crea como un arreglo nuevo en cada renderizado, no provoca un fallo de caché cada vez, y si el orden de las claves de un objeto o los valores `undefined` afectan a la caché; al terminar sabrás qué regla hace que dos claves sean iguales y cómo afecta esa regla a la caché. Para adelantar la conclusión: TanStack Query usa como clave de caché la cadena que resulta de serializar la queryKey con `hashKey`, y en ese proceso se ignora el orden de las claves de los objetos mientras se conserva el orden de los elementos de los arreglos.

La queryKey es el arreglo que TanStack Query usa como base para gestionar la caché de consultas. La misma clave significa los mismos datos, y cuando `['user', userId]` cambia porque cambió su `userId`, se produce un fallo de caché y los datos se vuelven a obtener con fetch.

Aquí surge una pregunta: ¿cómo determina TanStack Query que dos queryKey son «la misma clave»? Si las comparase simplemente con `===`, las referencias de los objetos serían distintas y se produciría un fallo de caché en cada ocasión.


## El interior de QueryCache

Según [El interior de React Query](https://tkdodo.eu/blog/inside-react-query), de TkDodo, `QueryCache` no es más que **una estructura de datos mantenida en memoria**. Para ser más precisos, en la [implementación oficial](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/queryCache.ts) de v5 esa estructura no es un objeto plano, sino un `Map<string, Query>`. Dentro de la clase se declara como `#queries = new Map<string, Query>()`, y todas las escrituras y lecturas se realizan mediante `#queries.set(query.queryHash, query)` y `#queries.get(queryHash)`. La clave es la forma serializada de queryKey (`queryHash`), y el valor es una instancia de la clase `Query`. El código y los resultados de este artículo se basan en `@tanstack/query-core` 5.104.1.

En versiones antiguas también se utilizaron objetos planos, pero en v5 se adoptó el `Map` nativo. `Map` nunca choca con claves heredadas de un prototipo y conserva el orden de inserción. En cuanto a la velocidad de búsqueda, la [especificación de ECMAScript](https://tc39.es/ecma262/#sec-map-objects) solo exige tiempos de acceso sublineales respecto al número de elementos, y V8 [lo implementa como una tabla hash](https://v8.dev/blog/hash-code). Es una elección razonable para una estructura de caché.

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

La pieza central es la función que genera ese valor hash: `hashKey`. La implementación oficial, definida en [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/utils.ts#L284-L295), es exactamente esta.

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

Utiliza `JSON.stringify`, pero no sin más: introduce una [función de reemplazo](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) que **ordena lexicográficamente las claves de los objetos planos** antes de serializarlos. En rigor, es el orden de unidades de código UTF-16, la comparación por defecto de `sort()`, así que las claves en mayúscula van antes que las de minúscula.

Este ordenamiento es esencial porque la serialización a una cadena impone otra condición aún más estricta: **las entradas semánticamente iguales deben convertirse siempre en la misma cadena**. Sin embargo, `JSON.stringify` normal conserva el orden de las claves. Aunque `{ a: 1, b: 2 }` y `{ b: 2, a: 1 }` sean objetos semánticamente iguales, se serializan como cadenas diferentes y terminan ocupando espacios de caché distintos. Así volverían a solicitarse dos veces los mismos datos.

La técnica que evita sistemáticamente este problema es la **forma canónica (canonical form)**. Consiste en obligar a que las entradas semánticamente iguales correspondan siempre a una única representación. Ese es exactamente el motivo por el que la función de reemplazo de `hashKey` ordena las claves de los objetos planos. Hace que el resultado sea idéntico con independencia del orden de entrada, de modo que el resultado de la serialización quede vinculado de manera unívoca al significado del objeto. Dicho de otro modo, trata como un mismo grupo a los objetos que solo difieren en el orden de sus claves y elige una única forma, la de claves ordenadas, para representar ese grupo.

El hecho de que los arreglos no se ordenen es la otra cara del mismo principio. En un arreglo, el propio orden contiene significado; ordenarlo supondría perder información. El orden de las claves de un objeto es accidental, mientras que el orden de los elementos de un arreglo es intencionado. `hashKey` trata ambos casos de forma deliberadamente distinta. Por eso el mantenedor TkDodo, en [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys), recomienda estructurar queryKey desde lo más genérico hasta lo más específico. Mientras el orden del arreglo aporte significado, el autor debe definirlo expresamente.

Hay otro detalle que conviene señalar: el ordenamiento de claves solo se aplica a los **objetos planos**. `isPlainObject`, definida en el mismo archivo, no se limita a comprobar `typeof === 'object'`, sino que verifica incluso `Object.getPrototypeOf(o) === Object.prototype` para distinguir entre **literales de objeto puros** e **instancias de clase**. Por eso un literal como `{ foo: 1 }` se ordena, mientras que una instancia creada con `class User { ... }` pasa sin ordenarse. (De aquí surge el riesgo de que, si se introduce directamente una instancia de clase en queryKey, se genere un hash distinto del esperado debido a que `JSON.stringify` solo emite las propiedades enumerables.)

Este funcionamiento tiene dos consecuencias importantes.

**1. El orden de las claves de un objeto es irrelevante.**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

La razón es que las claves se ordenan antes de serializarse. Sin este proceso, al escribir un literal de objeto habría que recordar siempre el orden de sus claves.

**2. El orden de los elementos de un arreglo sí importa.**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```

Esto se debe a que un arreglo es una estructura de datos en la que el propio orden tiene significado. `JSON.stringify` también conserva el orden de los arreglos.


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
| referencia circular | lanza `RangeError` | ninguna |

Los más peligrosos son `Map` y `Set`. En el código anterior, los datos guardados con la clave `new Map([['a', 1]])` se recuperaron al consultar con `new Map([['b', 2]])`. Como no hay error, tampoco hay ninguna pista de que la pantalla está mostrando datos equivocados.

Solo dos casos aparecen como error: `BigInt` y las referencias circulares. Una referencia circular no termina con el mensaje habitual `Converting circular structure`, sino con `Maximum call stack size exceeded`. Como la función de reemplazo devuelve un objeto nuevo por cada objeto plano, parece que la detección de ciclos de `JSON.stringify` nunca vuelve a encontrar el mismo objeto. En cambio, `Date` se convierte en una cadena ISO mediante `toJSON`, y el mismo instante produce la misma clave, así que resulta seguro.

Por eso lo más seguro es poner en una queryKey solo cadenas, números, booleanos, `null` y arreglos u objetos planos formados por ellos.


## queryKeyHashFn

Esta restricción tiene una vía de escape. Mediante la opción `queryKeyHashFn`, TanStack Query permite **sustituir la propia función hash**. Internamente, `hashQueryKeyByOptions(queryKey, options)` decide: si las opciones incluyen `queryKeyHashFn`, la llama; si no, llama a la función predeterminada `hashKey`.

Sustituirla significa reemplazar `hashKey` por completo. El ordenamiento de claves visto antes desaparece con ella, así que si lo necesitas tienes que implementarlo tú. El caso en que esta opción hace falta de verdad es un valor con el que la serialización por defecto lanza un error, como `BigInt`. El siguiente código también lo ejecuté en el mismo entorno.

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

El lugar donde se registra también cambia el resultado. Si se registra en `QueryClient` mediante `defaultOptions` o con `setQueryDefaults`, como arriba, `setQueryData` y `getQueryData` también usan esa función. Ocurre porque ambas API combinan las opciones por defecto con `defaultQueryOptions` antes de calcular el hash. En cambio, si se escribe solo en la llamada a `useQuery`, las API imperativas usan el `hashKey` predeterminado y la misma clave se divide en dos entradas dentro de la caché. En la etapa beta de v3.2.0, ni siquiera el valor global se aplicaba a `setQueryData`. En el [Issue #1343](https://github.com/TanStack/query/issues/1343), un mantenedor respondió que debería estar corregido en v3.2.0-beta.30, y quien lo reportó confirmó que funcionaba.

Por eso, en producción es mucho más seguro evitar la vía de escape y **convertir los valores a una forma serializable al construir la queryKey**. Escribir tu propia función hash obliga a ocuparse tanto del ordenamiento de claves como del lugar donde se registra.

Una vez puse un `Date` directamente en una clave y pasé mucho tiempo preguntándome: «¿Por qué se actualiza la caché si es el mismo instante?». Un `Date` que apunta al mismo instante se convierte en la misma cadena ISO aunque sea otra instancia, así que produce el mismo hash. Si cada vez salía una clave distinta, el instante en sí era distinto, aunque pareciera el mismo. Si se crea un `new Date()` durante el renderizado, cada renderizado recibe una hora distinta por milisegundos, y cada una se convierte en una clave nueva.


## Búsqueda en caché y coincidencia de filtros

La «misma clave» de la que se ha hablado hasta ahora significa que las cadenas hash son iguales, y el hash solo se usa en la búsqueda en caché y en los filtros con `exact: true`. Los filtros como `invalidateQueries` o `findAll` se comportan de otra forma por defecto. `partialMatchKey` compara de forma recursiva la estructura de la queryKey original, no la cadena hash. Los arreglos se comparan desde el principio y en los objetos solo se miran las claves escritas en el filtro. El siguiente código también lo ejecuté en el mismo entorno.

```js
import { partialMatchKey } from '@tanstack/query-core'

const queryKey = ['todos', { status: 'done', page: 1 }]
console.log(partialMatchKey(queryKey, ['todos'])) // true
console.log(partialMatchKey(queryKey, ['todos', { status: 'done' }])) // true
console.log(partialMatchKey(queryKey, [{ status: 'done' }])) // false
console.log(partialMatchKey(queryKey, ['todos', { status: 'todo' }])) // false
```

Como esta coincidencia no pasa por el hash, sustituir `queryKeyHashFn` no la cambia. En un `QueryClient` con una función hash sin ordenamiento, como en el ejemplo anterior, un objeto que solo difiere en el orden de sus claves no se encuentra con `exact: true`, pero la coincidencia por prefijo sí lo encuentra.


## Conclusión

En resumen, TanStack Query no compara las referencias de los arreglos queryKey. `hashKey` ordena las claves de los objetos planos mientras serializa con `JSON.stringify`, y la cadena resultante (`queryHash`) se usa como clave de un `Map`. Por eso el orden de las claves de un objeto no afecta a la caché, el orden de los elementos de un arreglo sí, y una propiedad cuyo valor es `undefined` equivale a una propiedad ausente. La mayoría de los valores que JSON no puede representar se convierten en otros sin ningún error, de modo que claves distintas pasan a ser la misma en silencio. Se puede cambiar la función hash con `queryKeyHashFn`, pero eso también descarta el ordenamiento de claves, así que es más seguro convertir los valores en serializables al construir la clave. También conviene recordar que los filtros, como los de invalidación, comparan la estructura de la queryKey y no el hash.

Cómo este criterio se traslada a la forma de escribir y gestionar las queryKey, es decir, el camino desde los arreglos en línea, pasando por las fábricas de claves, hasta `queryOptions`, se trata en [queryKey](/260104).

La próxima vez que metas un objeto o un `Map` en una queryKey, espero que pienses por un momento en qué cadena se va a serializar.


## Referencias

:::ref
- [documentación] [TanStack Query, claves de consulta](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [documentación] [TanStack Query, QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient)
:::
