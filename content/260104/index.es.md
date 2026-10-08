---
emoji: 🔑
title: "queryKey"
seoTitle: "queryKey en TanStack Query: fábricas y queryOptions"
date: "2026-01-04"
updatedAt: "2026-10-08"
categories: frontend React TanStack-Query queryKey
description: "Cómo evolucionó la gestión de queryKey en TanStack Query: de arreglos en línea a fábricas de claves y queryOptions de v5, con DataTag e invalidación."
keywords: "queryKey, fábrica de claves de consulta, queryKey de TanStack Query, reglas para escribir queryKey, queryOptions, setQueryData, claves de consulta de TkDodo, query-key-factory, React Query v5, invalidación de consultas"
locale: es
translationOf: '260104'
sourceHash: 50857db5f010cd899635d01d412999ec0ecc8b8d295039fbaad49e0c10d51f58
---

En esta publicación quiero hablar sobre **queryKey de TanStack Query**.

Está dirigida a desarrolladores frontend que usan TanStack Query y dudan entre dejar las queryKey como arreglos en línea, reunirlas en un objeto de constantes o en una fábrica de claves, o pasarlas a `queryOptions` de v5. Al terminar sabrás qué problema vino a resolver cada enfoque y tendrás un criterio para juzgar qué etapa encaja hoy con tu código.

Al usar TanStack Query en proyectos reales, he tenido que **replantear varias veces la forma de gestionar queryKey**. Al principio escribía directamente en los componentes arreglos como `['user', userId]`, pero, cada vez que tenía que invalidar una consulta, acababa repitiendo la misma clave en varios lugares y cometiendo errores tipográficos. Por eso las trasladé a un objeto de constantes como `QUERY_KEYS`. Más adelante, tras leer un artículo de TkDodo, adopté el patrón de fábrica de claves de consulta; bastante tiempo después incorporé la librería `@lukemorales/query-key-factory`; y, cuando apareció v5, volví a reorganizarlo todo en torno a `queryOptions`.


## Antes de que existiera queryKey

Antes de entrar de lleno en el tema, conviene detenernos en una cuestión. Hoy usamos con total naturalidad librerías como `TanStack Query` y `SWR`, pero ¿cómo se gestionaban los datos asíncronos antes de que existieran?

La forma más habitual probablemente consistía en combinar `useState`, `useEffect`, `fetch`, `axios` y herramientas similares.

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ...
}
```

El problema de este código es evidente. Basta con que haya dos componentes en la página mostrando el mismo `userId` para que **la misma petición se envíe dos veces**. La razón es que no existe una caché. Además, si el usuario visita otra página y después regresa, los datos vuelven a solicitarse desde cero. Como no hay forma de distinguir si se obtuvieron hace un segundo o hace una hora, también resulta difícil reproducir comportamientos como «mostrar el valor almacenado en caché mientras se actualiza en segundo plano». (Podríamos implantar nuestro propio sistema de caché, pero considero que gestionarlo sería bastante complicado.)

Para resolverlo apareció la combinación Redux + redux-thunk (o redux-saga). Al extraer la lógica de obtención de datos a un thunk y guardar el resultado en el almacén, otros componentes podían reutilizar los mismos datos. Sin embargo, había que definir tipos de acción, escribir reductores y gestionar manualmente los estados de carga, éxito y error en cada ocasión. La cantidad de código repetitivo necesaria para obtener un solo dato era enorme. (Empecé a trabajar profesionalmente en esa época y me preguntaba: «¿Por qué tengo que crear varios archivos para obtener un único dato?».)

En el fondo, todo este recorrido se reduce a lo siguiente: **«Para evitar repetir una petición, debemos poder identificar de qué petición se trata»**. Y el identificador que responde a «de qué petición se trata» es precisamente queryKey.

SWR y React Query (hoy TanStack Query) abordaron el problema de frente: «Toda petición asíncrona debe tener un identificador y, si el identificador es el mismo, debe compartir la caché». Este único y sencillo principio eliminó todo el código repetitivo anterior.


## La esencia de queryKey

Entonces, ¿qué es exactamente queryKey? La documentación oficial de TanStack Query lo define así.

::::quote
:::translation
En esencia, TanStack Query gestiona el almacenamiento en caché de las consultas a partir de sus claves. En el nivel superior, las claves de consulta deben ser un arreglo... Siempre que la clave de consulta se pueda serializar y sea **exclusiva de los datos de la consulta**, puede utilizarse.
:::

:::original
At its core, TanStack Query manages query caching for you based on query keys. Query keys have to be an Array at the top level... As long as the query key is serializable, and **unique to the query's data**, you can use it.
:::
::::

Hay dos ideas esenciales: **debe poder serializarse y debe ser exclusiva de esos datos**. Una misma clave representa los mismos datos, y datos distintos deben tener claves distintas. Esta sencilla regla determina el funcionamiento de todo el sistema de caché.

Hay, además, otro aspecto importante: **queryKey actúa al mismo tiempo como arreglo de dependencias**. Del mismo modo que en `useEffect` de React el efecto vuelve a ejecutarse cuando cambian sus dependencias, cuando cambia queryKey TanStack Query obtiene automáticamente los datos nuevos.

```tsx
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

Cuando `userId` es `'A'` y cuando es `'B'`, las queryKey son diferentes. Si son diferentes, se produce un fallo de caché; si hay un fallo de caché, se obtienen los datos. Todo ocurre automáticamente. Gracias a esta sencillez, no tenemos que escribir por nuestra cuenta la lógica de «como userId ha cambiado, hay que volver a obtener los datos».

Entonces, ¿cómo reconoce TanStack Query como la misma clave un arreglo que se crea de nuevo en cada renderizado? No compara las referencias de los arreglos, sino que usa como clave de caché la cadena que resulta de serializar la queryKey con `hashKey` (`queryHash`). Esta función ordena las claves de los objetos planos mientras serializa con `JSON.stringify`, así que el orden de las claves dentro de un objeto no afecta al hash, pero el orden de los elementos de un arreglo sí. Una propiedad cuyo valor es `undefined` desaparece durante la serialización, de modo que `{ a: 1, b: undefined }` y `{ a: 1 }` resultan ser la misma clave. He recogido aparte este comportamiento, siguiendo el código de la implementación, en [Cómo se comparan las queryKey](/251230).


## Reglas para escribir queryKey

Una vez que se entiende que la queryKey es a la vez el identificador de la caché y un arreglo de dependencias, las reglas de escritura se deducen de forma natural. Las recomendaciones de la documentación oficial pueden resumirse así.

**Regla 1. queryKey debe ser siempre un arreglo.**

Aunque pasar una cadena también funciona (internamente se convierte en un arreglo), conviene usar un arreglo desde el principio para mantener la coherencia.

```tsx
// 비권장
useQuery({ queryKey: 'todos', queryFn });

// 권장
useQuery({ queryKey: ['todos'], queryFn });
```

**Regla 2. Incluye en queryKey todas las variables de las que depende queryFn.**

```tsx
// 잘못된 예: userId가 쿼리키에 없다
useQuery({
  queryKey: ['user'],
  queryFn: () => fetchUser(userId),
});

// 올바른 예
useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

Es la misma forma de pensar que con las dependencias de `useEffect`. Todas las variables utilizadas dentro de la función deben formar parte de la clave (= dependencia). Si se incumple esta regla, pueden aparecer errores difíciles de rastrear, como que los datos del usuario anterior sigan mostrándose después de cambiar a otro usuario.

**Regla 3. Organiza los elementos desde el más genérico hasta el más específico.**

```tsx
// 좋다
['todos', 'list', { filter: 'done' }]
['todos', 'detail', todoId]

// 안 좋다 (순서가 뒤집혀 있음)
[{ filter: 'done' }, 'list', 'todos']
```

Este orden es importante por la **invalidación (invalidation)**. De forma predeterminada, `invalidateQueries` de TanStack Query utiliza **coincidencia por prefijo**.

```tsx
// 모든 todos 관련 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todos'] });
// → ['todos', 'list', ...], ['todos', 'detail', ...] 모두 매치된다

// list 쿼리만 무효화
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
// → ['todos', 'list', ...]만 매치된다
```

Si las claves se diseñan como una estructura de árbol, se puede expresar en una sola línea desde «vuelve a obtener todos los datos de este dominio» hasta «vuelve a obtener únicamente este elemento concreto». (A primera vista puede parecer poco importante, pero su valor se vuelve evidente después de diseñarlo mal una vez y comprobar que el alcance de la invalidación no se comporta como esperabas.)


## Evolución de la gestión de queryKey

Hasta aquí hemos visto el funcionamiento y el uso de queryKey. Pasemos ahora a la pregunta principal: **¿cómo ha ido cambiando su gestión?**

Voy a ordenar cronológicamente las etapas por las que he pasado en proyectos reales.


### 1. Arreglos en línea

Es la forma más sencilla. Dentro del componente se combinan cadenas fijas con valores de las propiedades.

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  // ...
}

function PostList({ filter }: { filter: PostFilter }) {
  const { data } = useQuery({
    queryKey: ['posts', filter],
    queryFn: () => fetchPosts(filter),
  });
  // ...
}
```

Al comenzar, esto puede ser suficiente.

El problema aparece cuando crece la base de código. Hay que invalidar desde una mutación que modifica la información del usuario, pero cada vez es necesario buscar «¿cuál era la clave de las consultas relacionadas con usuarios?». Unos lugares utilizan `['user', userId]` y otros `['users', userId]` (en plural). Como ocupan espacios de caché completamente distintos, la invalidación solo se aplica a uno de ellos.


### 2. Objeto de constantes

Para evitar errores tipográficos, las claves de consulta se agrupan como constantes.

```tsx
// queryKeys.ts
export const QUERY_KEYS = {
  USER: 'user',
  POSTS: 'posts',
  COMMENTS: 'comments',
} as const;

// 사용처
useQuery({
  queryKey: [QUERY_KEYS.USER, userId],
  queryFn: () => fetchUser(userId),
});
```

Los errores tipográficos desaparecen, pero la responsabilidad de componer la clave sigue recayendo en cada lugar de uso. Alguien escribe la combinación `[QUERY_KEYS.USER, userId]` como `[QUERY_KEYS.USER, userId, 'detail']`, mientras que otra persona usa `['user', 'detail', userId]`. Llega un momento en el que hay que memorizar por separado qué convención es la correcta.


### 3. Fábrica de claves de consulta

Este patrón quedó concretado en el artículo [Claves eficaces para React Query](https://tkdodo.eu/blog/effective-react-query-keys), de TkDodo. Consiste en definir un objeto que crea las claves de cada dominio y expresar la jerarquía mediante funciones.

```tsx
// features/todos/queries.ts
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};

// 사용
useQuery({ queryKey: todoKeys.detail(1), queryFn: ... });
useQuery({ queryKey: todoKeys.list('done'), queryFn: ... });

// 무효화
queryClient.invalidateQueries({ queryKey: todoKeys.all });        // 전체
queryClient.invalidateQueries({ queryKey: todoKeys.lists() });    // 모든 리스트
queryClient.invalidateQueries({ queryKey: todoKeys.detail(1) });  // 특정 항목
```

Este patrón es potente porque **la jerarquía queda expresada de forma explícita en el código**. `todoKeys.all` apunta a todas las consultas relacionadas con tareas, `todoKeys.lists()` a todas las consultas de tipo lista y `todoKeys.detail(1)` a un elemento concreto. El alcance de la invalidación puede expresarse con precisión en una línea de código.

Otra ventaja es la **colocación conjunta (co-location)**. TkDodo no recomienda reunir las claves en un archivo global. En su lugar, propone colocar `queries.ts` dentro del directorio de la funcionalidad y mantener allí tanto las claves como los hooks.

```
src/
└── features/
    └── todos/
        ├── index.tsx
        └── queries.ts   # 키와 훅을 모두 여기에
```

Así se obtiene un modelo mental sencillo: «para modificar algo relacionado con tareas, basta con mirar la carpeta de tareas». Es una aplicación fiel del principio de mantener juntas las cosas que cambian juntas.


### 4. @lukemorales/query-key-factory

Al escribir manualmente una y otra vez el tercer patrón, el código repetitivo se acumula. Además, cuando se quieren combinar y gestionar las claves de varios dominios, se echa en falta una interfaz normalizada. [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) es el resultado de convertir este patrón en una librería.

```tsx
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

const users = createQueryKeys('users', {
  detail: (userId: string) => ({
    queryKey: [userId],
    queryFn: () => api.getUser(userId),
  }),
  list: (filters: UserFilters) => ({
    queryKey: [{ filters }],
    queryFn: () => api.getUsers(filters),
  }),
});

const todos = createQueryKeys('todos', {
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => api.getTodo(id),
  }),
});

export const queries = mergeQueryKeys(users, todos);

// 사용
useQuery(queries.users.detail('abc'));
useQuery(queries.todos.detail(1));

// 무효화
queryClient.invalidateQueries(queries.users._def);            // 모든 user 쿼리
queryClient.invalidateQueries(queries.users.detail('abc'));   // 특정 항목
```

`createQueryKeys` añade automáticamente el prefijo, y `mergeQueryKeys` permite combinar dominios. Además, la propiedad convenida `_def` da acceso a la clave de todo el dominio. Desaparece así la necesidad de añadir `as const` en cada fábrica manual para restringir los tipos por cuenta propia.

Durante un tiempo, esta librería se utilizó prácticamente como un estándar. (Yo también la usé con frecuencia durante bastante tiempo.) Sin embargo, la aparición de queryOptions cambió la situación.


### 5. queryOptions (API oficial de v5)

Uno de los cambios más importantes de TanStack Query v5 fue la introducción de la API `queryOptions`. Con el paso de v4 a v5, los argumentos de todos los hooks se unificaron en un único objeto. El verdadero propósito de ese cambio era permitir extraer ese objeto como **unidad reutilizable**.

```tsx
import { queryOptions } from '@tanstack/react-query';

export const userDetailOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,
  });

// 어디서나 사용 가능
useQuery(userDetailOptions('abc'));
useSuspenseQuery(userDetailOptions('abc'));
queryClient.prefetchQuery(userDetailOptions('abc'));
queryClient.setQueryData(userDetailOptions('abc').queryKey, newUser);
```

A primera vista puede surgir la duda: «¿Qué tiene esto de diferente? Parece simplemente un objeto envuelto en una función». TkDodo también lo reconoce en su artículo [La API Query Options](https://tkdodo.eu/blog/the-query-options-api). Durante la ejecución, se limita realmente a devolver el mismo objeto que recibe.

El trabajo verdaderamente útil ocurre **dentro del sistema de tipos**. Veámoslo a continuación.


## DataTag de queryOptions

`queryOptions` no es una simple función auxiliar porque **incorpora información sobre el tipo de los datos en la queryKey devuelta**. Dentro de TanStack Query, este mecanismo se denomina `DataTag`.

Su implementación aproximada es la siguiente.

```typescript
declare const dataTagSymbol: unique symbol;
declare const dataTagErrorSymbol: unique symbol;

export type DataTag<TType, TValue, TError = unknown> = TType & {
  [dataTagSymbol]: TValue;
  [dataTagErrorSymbol]: TError;
};
```

Se trata de un **tipo con marca (branded type)** basado en `unique symbol`. Es solo una marca sin ningún efecto durante la ejecución, pero para TypeScript contiene la información de que «este arreglo no es un simple arreglo, sino un arreglo asociado a datos del tipo `TValue`».

Existe una razón concreta para utilizar `unique symbol`. El artículo de Zenn [El unique symbol que se oculta tras DataTag](https://zenn.dev/tsuboi/articles/tanstack-query-options-unique-symbol?locale=en) compara este recurso con «una plaza de aparcamiento exclusiva para la información de tipos». Si se utilizase una clave de cadena normal, podría colisionar con una clave de otra librería o del código del usuario; sin embargo, **cada declaración `unique symbol` crea por sí misma un tipo único**, por lo que nunca coincide con otra declaración. Se convierte así en un identificador que no puede colisionar.

La diferencia que produce este único mecanismo es considerable.

```tsx
const data = queryClient.getQueryData(['user', 'abc']); // unknown
const data = queryClient.getQueryData(userDetailOptions('abc').queryKey); // User | undefined
```

Aunque `getQueryData` y `setQueryData` solo reciben una queryKey, como esta ya lleva incorporado el tipo de datos, el tipo devuelto se infiere automáticamente. No es necesario proporcionar los genéricos a mano y, si se intenta introducir en `setQueryData` un valor de un tipo incorrecto, el compilador lo detecta de inmediato.

Por supuesto, también existen limitaciones. En métodos como `getQueriesData`, que obtienen varias consultas a la vez, el resultado es un arreglo de tuplas heterogéneas y no se aplica la inferencia de tipos. Además, el uso de `unique symbol` puede provocar un error TS4023 al generar archivos `.d.ts` en un monorepositorio; se evita importando `dataTagSymbol` de forma explícita.

Al resumir el mecanismo visto hasta aquí, queda claro un hecho: **la inferencia de tipos de queryOptions depende por completo de que queryKey y queryFn se declaren juntas en un mismo lugar**. Para incorporar en queryKey el tipo que devuelve queryFn, ambas deben declararse juntas.

Esto tiene una implicación de peso para la dirección de diseño de las fábricas de claves de consulta. Los patrones de la generación anterior se centraban en separar la gestión de queryKey como una unidad de abstracción independiente. Sin embargo, la recomendación de v5 va en la dirección opuesta: **volver a unir queryKey y queryFn en una sola unidad**. TkDodo llega a afirmar que «separar queryKey y queryFn fue un error». Al fin y al cabo, la clave es el conjunto de dependencias que utiliza la función, y ambas mantienen una relación inseparable.


## Patrón práctico de composición con queryOptions

El verdadero potencial de `queryOptions` aparece al combinarla con una fábrica por dominio. La forma recomendada por la documentación oficial de v5 es la siguiente.

```tsx
import { queryOptions } from '@tanstack/react-query';

export const todoQueries = {
  all: () => ['todos'] as const,
  lists: () => [...todoQueries.all(), 'list'] as const,
  list: (filters: TodoFilters) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), filters],
      queryFn: () => fetchTodos(filters),
      staleTime: 30 * 1000,
    }),
  details: () => [...todoQueries.all(), 'detail'] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.details(), id],
      queryFn: () => fetchTodo(id),
      staleTime: 5 * 60 * 1000,
    }),
};
```

Veamos una por una las razones por las que este patrón resulta útil.

**1. Permite obtener al mismo tiempo jerarquía e inferencia de tipos.**

`todoQueries.all()` y `todoQueries.lists()` devuelven simples arreglos, mientras que `todoQueries.detail(1)` devuelve mediante `queryOptions` un objeto con una etiqueta de datos. Para invalidar se usa el arreglo; para invocar la consulta, el objeto de opciones.

```tsx
useQuery(todoQueries.detail(1));                                // 옵션 객체
queryClient.invalidateQueries({ queryKey: todoQueries.all() }); // 배열
```

**2. Los componentes pueden sobrescribir parcialmente las opciones.**

Como el resultado de `queryOptions` sigue siendo un objeto, en el momento de la llamada pueden combinarse algunas opciones.

```tsx
const { data: title } = useQuery({
  ...todoQueries.detail(1),
  select: (todo) => todo.title,  // 컴포넌트별로 다른 select 적용
});
```

Este patrón es especialmente potente porque el tipo devuelto por `select` se infiere automáticamente y el tipo de `data` se restringe a `string`. Desde el punto de vista del componente, es posible seleccionar solo la parte necesaria y mantener la definición del dominio intacta en un único lugar.

**3. Los hooks personalizados que envuelven `useQuery` van desapareciendo.**

Durante la época de v4, el patrón habitual consistía en crear hooks personalizados para cada dominio.

El problema era que, **en cuanto se necesitaba una precarga, había que volver a escribir la misma definición**. Como `useTodoDetail` no puede llamarse fuera de un componente, en el cargador del enrutador o en un manejador de eventos había que volver a escribir `queryClient.prefetchQuery({ queryKey: [...], queryFn: ... })`.

Con `queryOptions`, esa duplicación desaparece.

Una sola definición funciona en cualquier lugar. Por eso TkDodo recomienda «en v5, define queryOptions en lugar de crear hooks». Estos hooks quedan como una capa ligera que solo se añade cuando es necesaria, mientras que la definición del dominio puede existir de manera autosuficiente sin ellos.


## Invalidación tras una mutación

El lugar en el que la jerarquía de queryKey brilla de verdad es la invalidación posterior a una mutación. Según la documentación de TanStack Query sobre [invalidación de consultas](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation), `invalidateQueries` utiliza de forma predeterminada la **coincidencia por prefijo**.

```tsx
// 모든 todos 관련 쿼리 (list, detail, lists 모두)
queryClient.invalidateQueries({ queryKey: todoQueries.all() });

// 모든 list만 (detail은 건드리지 않음)
queryClient.invalidateQueries({ queryKey: todoQueries.lists() });

// 정확히 이 키만 (자식 키 매치 안 함)
queryClient.invalidateQueries({
  queryKey: todoQueries.detail(1).queryKey,
  exact: true,
});

// 더 복잡한 조건은 predicate으로
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' &&
    (query.queryKey[2] as any)?.version >= 10,
});
```

Si las claves se diseñan de forma jerárquica, **el alcance de la invalidación coincide con el significado del código**. «Actualiza todas las tareas» se expresa con `all()`, «actualiza solo las listas» con `lists()` y «actualiza solo este elemento» con `detail(id)`.

Si las claves estuvieran dispersas de forma plana, como `['todoList']` y `['todoDetail', 1]`, para invalidar «todo el dominio de tareas» habría que realizar dos llamadas separadas o crear y gestionar una constante de prefijo adicional. (Y, si al añadir una nueva clave al dominio se olvidase incorporarla a esa constante, se produciría un error que la dejaría fuera de la invalidación.)


## Recuperar queryKey dentro de queryFn

Por último, hay otro patrón que merece atención. En realidad, `queryFn` recibe como argumento un objeto llamado `QueryFunctionContext`, que contiene la queryKey del momento de la llamada.

```tsx
queryOptions({
  queryKey: ['user', userId, { include: 'profile' }] as const,
  queryFn: ({ queryKey }) => {
    const [, id, options] = queryKey;
    return fetchUser(id, options);
  },
});
```

¿Por qué resulta útil este patrón? Según [Cómo aprovechar el contexto de la función de consulta](https://tkdodo.eu/blog/leveraging-the-query-function-context), de TkDodo, permite **forzar la sincronización entre las dependencias de queryKey y queryFn**.

```tsx
const sortBy = 'name';

queryOptions({
  queryKey: ['users'],
  queryFn: () => fetchUsers({ sortBy }),
});
```

Este código es peligroso porque queryFn depende de una variable externa. Además, aunque cambie `sortBy`, la caché no se actualiza porque esa dependencia no está incluida en la clave. Mientras `queryFn` tome variables de un cierre externo, siempre será posible cometer este error.

La solución es sencilla: hacer que `queryFn` no dependa de variables externas. **Si todas las dependencias se extraen de queryKey**, una variable que no figure en queryKey ni siquiera podrá utilizarse dentro de la función.

```tsx
queryOptions({
  queryKey: ['users', { sortBy }] as const,
  queryFn: ({ queryKey: [, { sortBy }] }) => fetchUsers({ sortBy }),
});
```

Con esta estructura, cuando aparece una dependencia nueva no existe forma de usarla dentro de la función sin añadirla a queryKey. El compilador detectará que «esa clave no existe». La sincronización entre la clave y la función deja de depender de una convención y se **delega al sistema de tipos**.


## Hasta dónde separar

Después de leer todo lo anterior puede surgir una pregunta: «Entonces, ¿hay que extraer todas las consultas a `queryOptions`?».

Mi respuesta, como casi siempre, es: **«depende de la situación»**.

Conviene recordar que **una abstracción no siempre es beneficiosa**. Si una consulta solo se utiliza una vez, extraerla innecesariamente a una fábrica de dominio solo obliga a quien lee el código a desplazarse entre dos archivos. La evolución de los patrones de gestión de queryKey no significa «hay que usar siempre la herramienta más sofisticada», sino que **«existe la posibilidad de subir un peldaño cuando resulte necesario»**.


## Conclusión

En resumen, queryKey es **la unidad fundamental con la que TanStack Query identifica y almacena en caché los datos asíncronos**. En ese pequeño arreglo se concentran el identificador del espacio de caché, el arreglo de dependencias, el alcance de la invalidación y, desde v5, incluso la información sobre el tipo de los datos. Precisamente porque tantas responsabilidades convergen en un único punto, la forma de escribirlo y gestionarlo influye directamente en la carga cognitiva de toda la base de código.

Cada etapa fue la respuesta a un problema real que alguien encontró en su momento. Por eso, la conclusión no debe ser simplemente «como ahora estamos en v5, hay que usar exclusivamente `queryOptions`», sino **«primero hay que identificar qué clase de problema está experimentando actualmente mi base de código»**. Introducir una fábrica de dominio en un proyecto donde bastan los arreglos en línea puede constituir por sí mismo un exceso de diseño.

Espero que quienes lean este artículo revisen también sus propios proyectos: cómo se distribuyen las queryKey por toda la base de código, cómo se realizan las invalidaciones y si esa estructura se ajusta al tamaño actual del equipo y a la complejidad del dominio.


## Referencias

:::ref
- [documentación] [TanStack Query, claves de consulta](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [documentación] [TanStack Query, opciones de consulta](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)
- [documentación] [TanStack Query, TypeScript](https://tanstack.com/query/v5/docs/framework/react/typescript)
- [artículo] [TanStack, presentación de TanStack Query v5](https://tanstack.com/blog/announcing-tanstack-query-v5)
:::
