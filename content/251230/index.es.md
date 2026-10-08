---
emoji: 🧮
title: "Cómo se comparan las queryKey"
seoTitle: "Cómo compara TanStack Query las queryKey: hashKey explicado"
date: "2025-12-30"
categories: frontend React TanStack-Query queryKey
description: "Cómo TanStack Query trata arreglos queryKey nuevos como la misma clave con hashKey: el orden de claves no importa, el de arreglos sí, undefined se pierde."
keywords: "comparación de queryKey, hashKey, queryHash, clave de caché de TanStack Query, orden de queryKey en React Query, queryKeyHashFn, JSON.stringify claves ordenadas, QueryCache"
locale: es
translationOf: '251230'
sourceHash: 7e26877fcdd3f1c85b67751a911900b36ff424cb43b408fb640fb8aa3075e22a
---

En esta publicación quiero hablar sobre **cómo decide TanStack Query que dos queryKey son la misma clave**.

Está dirigida a quienes usan TanStack Query y se han preguntado por qué una queryKey, que se crea como un arreglo nuevo en cada renderizado, no provoca un fallo de caché cada vez, y si el orden de las claves de un objeto o los valores `undefined` afectan a la caché; al terminar sabrás qué regla hace que dos claves sean iguales y cómo afecta esa regla a la caché. Para adelantar la conclusión: TanStack Query usa como clave de caché la cadena que resulta de serializar la queryKey con `hashKey`, y en ese proceso se ignora el orden de las claves de los objetos mientras se conserva el orden de los elementos de los arreglos.

La queryKey es el arreglo que TanStack Query usa como base para gestionar la caché de consultas. La misma clave significa los mismos datos, y cuando `['user', userId]` cambia porque cambió su `userId`, se produce un fallo de caché y los datos se vuelven a obtener con fetch.

Aquí surge una pregunta: ¿cómo determina TanStack Query que dos queryKey son «la misma clave»? Si las comparase simplemente con `===`, las referencias de los objetos serían distintas y se produciría un fallo de caché en cada ocasión.


## El interior de QueryCache

Según [El interior de React Query](https://tkdodo.eu/blog/inside-react-query), de TkDodo, `QueryCache` no es más que **una estructura de datos mantenida en memoria**. Para ser más precisos, en la [implementación oficial](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts) de v5 esa estructura no es un objeto plano, sino un `Map<string, Query>`. Dentro de la clase se declara como `#queries = new Map<string, Query>()`, y todas las escrituras y lecturas se realizan mediante `#queries.set(query.queryHash, query)` y `#queries.get(queryHash)`. La clave es la forma serializada de queryKey (`queryHash`), y el valor es una instancia de la clase `Query`.

En versiones antiguas también se utilizaron objetos planos, pero en v5 se adoptó el `Map` nativo. (`Map` evita las colisiones de claves y el riesgo de contaminación del prototipo, conserva el orden de inserción y ofrece búsquedas por clave de cadena con una complejidad media de O(1), por lo que es una elección casi canónica para una estructura de caché.)

Lo que ocurre cada vez que se llama a `useQuery` es sencillo: **queryKey se convierte en un valor hash y este se utiliza para buscar en el mapa**. Si existe, se recupera la instancia de `Query` almacenada en caché; si no, se crea una nueva y se guarda con `set`.

De aquí se desprende otra pregunta natural: **¿por qué serializar queryKey como una cadena?** ¿No bastaría con usar el propio arreglo como clave, como en `Map<QueryKey, Query>`?

La respuesta está en el modelo de igualdad de JavaScript. El `Map` nativo compara sus claves mediante **igualdad referencial (reference equality)**. Aunque el contenido sea el mismo, considera diferentes dos objetos que ocupan lugares distintos en memoria.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined — 새로 만든 배열은 다른 참조다
```

Sin embargo, en un componente de React, `useQuery({ queryKey: ['user', userId] })` **crea una nueva instancia del arreglo en cada renderizado**. Aunque los arreglos queryKey del primer y del segundo renderizado tengan el mismo contenido, son objetos distintos en memoria. Si la caché dependiera de la igualdad referencial, cada renderizado de un componente que mostrase los mismos datos provocaría un fallo de caché.

La solución al problema causado por la igualdad referencial es sencilla: **convertir la igualdad referencial en igualdad estructural (structural equality)**. Se genera una cadena determinista basada únicamente en el contenido de queryKey y se usa esa cadena como clave del mapa. Así se recupera la semántica deseada: «si el contenido es igual, la clave es igual». `JSON.stringify` no es más que la herramienta más sencilla para realizar esa conversión. (Esta es también la razón por la que TanStack Query, tras probar varias estrategias de serialización durante la época de v3, terminó adoptando una variante estable de `JSON.stringify`.)

La pieza central es la función que genera ese valor hash: `hashKey`. La implementación oficial, definida en [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts), es exactamente esta.

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

Utiliza `JSON.stringify`, pero no sin más: introduce una [función de reemplazo](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) que **ordena alfabéticamente las claves de los objetos planos** antes de serializarlos.

Este ordenamiento es esencial porque la serialización a una cadena impone otra condición aún más estricta: **las entradas semánticamente iguales deben convertirse siempre en la misma cadena**. Sin embargo, `JSON.stringify` normal conserva el orden de las claves. Aunque `{ a: 1, b: 2 }` y `{ b: 2, a: 1 }` sean objetos semánticamente iguales, se serializan como cadenas diferentes y terminan ocupando espacios de caché distintos. Así volverían a solicitarse dos veces los mismos datos.

La técnica que evita sistemáticamente este problema es la **forma canónica (canonical form)**. Consiste en obligar a que las entradas semánticamente iguales correspondan siempre a una única representación. Ese es exactamente el motivo por el que la función de reemplazo de `hashKey` ordena las claves de los objetos planos. Hace que el resultado sea idéntico con independencia del orden de entrada, de modo que el resultado de la serialización quede vinculado de manera unívoca al significado del objeto. Dicho de otro modo, trata como un mismo grupo a los objetos que solo difieren en el orden de sus claves y elige una única forma, la de claves ordenadas, para representar ese grupo.

El hecho de que los arreglos no se ordenen es la otra cara del mismo principio. En un arreglo, el propio orden contiene significado; ordenarlo supondría perder información. El orden de las claves de un objeto es accidental, mientras que el orden de los elementos de un arreglo es intencionado. `hashKey` trata ambos casos de forma deliberadamente distinta. Por eso la guía oficial recomienda organizar queryKey de «lo genérico a lo específico». Mientras el orden del arreglo aporte significado, el autor debe definirlo expresamente.

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

También conviene saber que los valores `undefined` desaparecen durante la serialización. `{ a: 1, b: undefined }` y `{ a: 1 }` generan el mismo hash. (Yo mismo cometí una vez el error de pensar: «¡Como he añadido undefined de forma explícita, será otra caché!».)

Además, queryKey no puede contener **referencias circulares ni funciones**, porque `JSON.stringify` no puede procesarlas. Por el mismo motivo, tampoco se recomienda utilizar con su comportamiento predeterminado objetos `Date`, `Map/Set`, `BigInt` y similares. Debe ser una estructura de datos pura y serializable.

Lo interesante es que esta restricción no se impone por completo. Mediante la opción `queryKeyHashFn`, TanStack Query ofrece una **vía de escape que permite sustituir la propia función hash**. Internamente, `hashQueryKeyByOptions(queryKey, options)` comprueba si las opciones incluyen `queryKeyHashFn`: si existe, la llama; si no, utiliza la función `hashKey` predeterminada.

```tsx
useQuery({
  queryKey: [{ id: userId, fetchedAt: new Date() }],
  queryFn,
  // Date를 ISO 문자열로 바꿔서 해싱
  queryKeyHashFn: (key) =>
    JSON.stringify(key, (_, v) => (v instanceof Date ? v.toISOString() : v)),
});
```

Sin embargo, esta opción debe configurarse por separado para cada consulta y no se aplica en API imperativas como `queryClient.setQueryData`, que se invocan sin conocer esas opciones ([incidencia n.º 1343](https://github.com/TanStack/query/issues/1343)). Por eso, en la práctica es mucho más seguro evitar esta vía de escape y **convertir queryKey a una forma serializable en el momento de crearla**. (Yo también introduje una vez un `Date` directamente y pasé bastante tiempo preguntándome: «¿Por qué no se actualiza la caché si es el mismo instante?». La respuesta final fue: «Ese `Date` representa el mismo instante, pero es otra instancia de objeto y genera un hash distinto cada vez».)


## Conclusión

En resumen, TanStack Query no compara las referencias de los arreglos queryKey. `hashKey` ordena las claves de los objetos planos mientras serializa con `JSON.stringify`, y la cadena resultante (`queryHash`) se usa como clave de un `Map`. Por eso el orden de las claves de un objeto no afecta a la caché, el orden de los elementos de un arreglo sí, y una propiedad cuyo valor es `undefined` equivale a una propiedad ausente. Los valores que no se pueden serializar pueden sortearse con `queryKeyHashFn`, pero es más seguro convertirlos en valores serializables al construir la clave.

Cómo este criterio se traslada a la forma de escribir y gestionar las queryKey, es decir, el camino desde los arreglos en línea, pasando por las fábricas de claves, hasta `queryOptions`, se trata en [queryKey](/260104).

La próxima vez que metas un objeto o un `Date` en una queryKey, espero que pienses por un momento en qué cadena se va a serializar.


## Referencias

:::ref
- [documentación] [TanStack Query, claves de consulta](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
:::
