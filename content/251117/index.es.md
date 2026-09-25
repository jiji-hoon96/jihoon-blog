---
emoji: 🛡️
title: 'Propagación de errores'
seoTitle: "Propagación de errores: qué recibe de verdad ErrorBoundary"
date: '2025-11-17'
updatedAt: '2026-09-24'
categories: frontend React TanStack-Query manejo-de-errores
description: 'Lanza el mismo error desde siete sitios y solo cuatro llegan al ErrorBoundary. Este artículo sigue hacia dónde propaga cada tipo.'
keywords: "manejo de errores frontend, propagación de errores, React ErrorBoundary, qué no captura ErrorBoundary, error en startTransition, unhandledrejection, window onerror, React 19 onCaughtError, TanStack Query throwOnError, error en useSuspenseQuery, react-router loader ErrorBoundary, React.lazy fallo al cargar chunk, fetch no rechaza con 404"
locale: es
translationOf: '251117'
sourceHash: 3f6e8fa00d3cc487b5caedfdc24f91ad33196ab0eb9c55899c052ad83bdee38c
---

En este artículo quiero hablar de **hasta dónde sube un error en el frontend**.

Dibujar un `ErrorBoundary` es fácil. Pones uno en la ruta, envuelves cada pantalla en un `ErrorBoundary` y, sobre el papel, no queda ningún hueco. Lo difícil es saber qué recibe **de verdad** ese `ErrorBoundary`.

La palabra «propagación» del título significa **hasta qué punto sube un error lanzado y quién acaba recibiéndolo**. El sitio donde se lanza y el sitio donde se recibe no siempre coinciden, y por eso hay que contarlos por separado.

Así que decidí contarlo. Lancé el mismo `new Error('boom')` siete veces cambiando solo el sitio, y miré si llegaba al `ErrorBoundary` o si pasaba de largo del `ErrorBoundary` y acababa en otro lado.

El widget de abajo es ese experimento. Si eliges a la izquierda el sitio desde el que lanzar, el error se lanza de verdad dentro de la caja de línea discontinua. Esa caja es el `ErrorBoundary`, y cuando el `ErrorBoundary` lo recibe, su interior se convierte en un fallback. Lo que no se recibe parece que no hubiera pasado nada, así que el widget escucha también en `window` los eventos `error` y `unhandledrejection` y escribe debajo adónde ha ido.

:::widget-error-propagation
:::

De los siete, solo cuatro llegan al `ErrorBoundary`. Los otros tres se lanzan dentro del `ErrorBoundary` y aun así atraviesan ese mismo `ErrorBoundary` y salen al ámbito global.

En este artículo compruebo por qué aparece esa división, tipo de error por tipo de error: los que terminan en tiempo de compilación, los que salen del render y del ciclo de vida, los que vienen de los datos del servidor, los que salen en la navegación, los que lanzan las bibliotecas externas y los que salen de eventos y código asíncrono. La idea es averiguar hacia dónde propaga cada uno. **En cuántas capas dividir el lado que recibe, y cómo deshacer el fallo, no se tratan aquí.** Dibujar capas sin conocer las rutas de propagación deja esas capas vacías, y por eso el orden es este.

Lo comprobé de dos maneras. El comportamiento de las bibliotecas lo leí abriendo las fuentes instaladas en lugar de fiarme de la memoria, y todo lo que podía confirmarse lanzando lo ejecuté de verdad en el widget de arriba.


## ErrorBoundary

Primero conviene dejar claro qué es un `ErrorBoundary`. Un `ErrorBoundary` son **dos métodos del ciclo de vida de un componente de clase**. Solo que los llamamos de otra forma.

En `react-error-boundary` existen únicamente dos implementaciones.

```js
static getDerivedStateFromError(e) { ... }
componentDidCatch(e, t) { ... }
```

La documentación oficial de React separa el momento en el que se ejecuta cada método. `getDerivedStateFromError` se ejecuta en la **fase de render** y produce el estado con el que se dibuja el fallback, mientras que `componentDidCatch` se ejecuta en la **fase de commit** y se encarga de efectos secundarios como el registro. En cualquiera de los dos casos solo reciben **lo que React ha capturado dentro del árbol y les ha entregado**.

Así que la definición de lo que recibe un `ErrorBoundary` es una sola. **¿Se lanzó desde un sitio que React puede capturar?**

La documentación de React también deja escrito el lado que no se recibe. Son estos cuatro.

::::quote
:::translation
Manejadores de eventos, renderizado en el servidor, errores lanzados por el propio `ErrorBoundary` en lugar de por sus hijos, código asíncrono (por ejemplo, callbacks de `setTimeout` o de `requestAnimationFrame`); hay una excepción: el Hook `useTransition` y la función `startTransition` que devuelve. Los errores lanzados dentro de esa función de transición sí los capturan los error boundaries.
:::

:::original
Event handlers, Server side rendering, Errors thrown in the error boundary itself (rather than its children), Asynchronous code (e.g. `setTimeout` or `requestAnimationFrame` callbacks); an exception is the usage of the `startTransition` function returned by the `useTransition` Hook. Errors thrown inside the transition function are caught by error boundaries
:::
::::

El resultado del widget encaja exactamente con esa frase. Siete sitios se reparten en dos destinos.

![A la izquierda hay siete sitios de lanzamiento en vertical y a la derecha dos destinos. Durante el render, dentro de useEffect, dentro de startTransition y el rechazo del import de lazy van con flechas azules hasta ErrorBoundary, mientras que dentro de un manejador onClick, dentro de un callback de setTimeout y el rechazo de una Promise van con flechas grises hasta window](1.png?w=720)

`startTransition` es la excepción porque el trabajo que hay dentro pasa por el planificador de React. React envuelve esa ejecución con sus propias manos, así que puede capturarla y devolverla al árbol. Por la misma razón `setTimeout` no se puede capturar: cuando ese callback se ejecuta, React ya no está ahí.

Antes hay que saber una cosa. **Con un componente de función no se puede construir un `ErrorBoundary`.**

Cuando React se encuentra con un error lanzado, sube desde ese punto hacia el padre buscando el límite que lo reciba. `throwException`, que se encarga de ese recorrido, mira el `tag` que lleva cada fiber, y los únicos valores en los que se detiene son componente de clase y raíz. El `tag` de un componente de función no es ninguno de los dos, así que la búsqueda pasa de largo. **No llega a ser un límite no porque falte la API, sino porque la búsqueda ni siquiera lo mira.**

![Cuatro cajas en horizontal. Desde la izquierda, los componentes de función Child y FnBoundary tienen tag 0, el componente de clase ErrorBoundary tiene tag 1 y la raíz HostRoot tiene tag 3. Una flecha que sale de Child pasa por FnBoundary y se detiene en ErrorBoundary, y la línea que continúa hasta HostRoot es discontinua](2.png?w=720)

Ese `tag` lo decide si el componente hereda de `React.Component`. Por eso no sirve de nada colgar `getDerivedStateFromError` de una función como `static`. Lo colgué y lo ejecuté: esa función no se llamó ni una sola vez, el error no encontró límite, subió hasta la raíz y React retiró el árbol de la pantalla.

Así que instalar `react-error-boundary` no es añadir una funcionalidad que no existe. El `ErrorBoundary` de la 6.1.6 también es una clase que hereda de `Component` y lleva los mismos dos métodos. Lo que hace la biblioteca es escribir esa clase una sola vez y esconderla.


## Lo que termina en tiempo de compilación

Ya que estamos contando tipos de error, empecemos por el primero de todos: los errores de tipos.

Es el único que no llega al usuario. Si lees una propiedad que no existe o el tipo de un argumento no encaja, la compilación se detiene, y el código detenido no se despliega. Por eso no hay ninguna ruta de propagación que seguir. **Los errores de tipos quedan fuera de este artículo no porque no importen, sino porque no existen en tiempo de ejecución.**

El problema viene después. ¿**Hasta dónde** garantiza la comprobación de tipos?

```ts
async function getComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
  return data.comments
}
```

El tipo de retorno dice `Promise<Comment[]>`, así que todo el código que llama a esta función confía en recibir un array. Pero `Response` declara su `json()` así en el `lib.dom.d.ts` de TypeScript 5.9.3.

```ts
json(): Promise<any>;
```

`any`. Aquí es donde se corta la comprobación de tipos. El compilador nunca ha visto el valor que ha devuelto el servidor, y el argumento de tipo o la anotación de retorno que pongas después son **una declaración, no una comprobación**. Nadie añade por ti el código que verifica esa declaración en tiempo de ejecución.

Así que cuando el servidor responde `200` con `{ commits: null }`, la línea que lee `commits.length` lanza un `TypeError` durante el render. El HTTP fue un éxito y los tipos pasaron, y aun así la pantalla se rompe.

**Donde terminan los tipos es donde toca poner una comprobación en tiempo de ejecución.** Dónde coloques esa comprobación decide por qué ruta va el mismo fallo. Si revienta al leer durante el render se convierte en un error de render y va al `ErrorBoundary`; si compruebas antes, en el sitio donde llegan los datos, y lanzas ahí, se convierte en el fallo de esa petición. La sección **Render y ciclo de vida** de más abajo trata eso.


## Render y ciclo de vida

Lo que se lanza dentro del árbol de React propaga de forma sencilla. **Lo recibe el `ErrorBoundary` más cercano.**

Aquí entran las excepciones durante el render. El `commits.length` de antes es una, y llamar a `map` sobre un valor que creías que era un array es otra. Este grupo no puede hacer otra cosa que lanzar, así que siempre llega a un `ErrorBoundary`.

Lo que se lanza dentro de `useEffect` también se captura. React ejecuta los effects por su cuenta después del commit, así que puede envolver esa ejecución. Pero un **callback asíncrono llamado dentro** de un effect es distinto.

```tsx
useEffect(() => {
  throw new Error('boom')          // ErrorBoundary 가 받는다
}, [])

useEffect(() => {
  setTimeout(() => {
    throw new Error('boom')        // ErrorBoundary 를 지나친다
  }, 0)
}, [])
```

Los dos fragmentos están dentro del mismo `useEffect` y aun así sus rutas de propagación son distintas. **El criterio no es si está dentro de un `ErrorBoundary`, sino si React está sujetando esa ejecución.**

De este grupo basta con recordar una cosa más. La consola de desarrollo de React 19 le pone el nombre del componente al error capturado. Al ejecutar el widget, el render, el effect y la transición daban `The above error occurred in the <Thrower> component`, y solo `lazy` daba `occurred in one of your React components`. `lazy` todavía no tiene componente en el momento en que se rechaza, así que no puede escribir un nombre. Esa diferencia es una pista cuando solo tienes la pila para localizar el sitio.


## Datos del servidor

Aquí empieza la parte incómoda que hay que manejar cuando desarrollas frontend. La razón es que un fallo del servidor **no se convierte en error automáticamente**.

### fetch no rechaza por sí solo ante un error del servidor

MDN lo deja escrito con claridad.

::::quote
:::translation
La promesa de `fetch()` solo se rechaza cuando falla la petición en sí, por ejemplo porque la URL está mal formada o porque ha habido un error de red. No se rechaza cuando el servidor responde con un código de estado HTTP que indica error (`404`, `504`, etc.).
:::

:::original
A `fetch()` promise only rejects when the request fails, for example, because of a badly-formed request URL or a network error. A `fetch()` promise does not reject if the server responds with HTTP status codes that indicate errors (`404`, `504`, etc.).
:::
::::

Es decir, si usas solo `fetch`, una respuesta `500` es una **Promise con éxito**. Como no se ha lanzado nada, el `ErrorBoundary` no se entera y la biblioteca de datos tampoco. La documentación de TanStack Query también señala esto: para que una consulta se considere fallida, el `queryFn` tiene que lanzar o devolver una Promise rechazada, y mientras `axios` lanza por su cuenta, `fetch` no lo hace.

Así que convertir el fallo del servidor en un error es **algo que tienes que hacer tú**.

```ts
const response = await fetch('/todos/' + todoId)
if (!response.ok) {
  throw new Error('Network response was not ok')
}
```

Sin estas tres líneas, el resto de esta sección no significa nada. Lo que no se lanza no propaga a ninguna parte.

### Los cinco caminos por los que se reparte un fallo

Una vez que el fallo se ha convertido en fallo, empieza la siguiente división. Un mismo `500` se dispersa hacia cinco sitios según **cómo lo hayas llamado**. El criterio son los valores por defecto, sin tocar ninguna opción.

**`useQuery` no lanza el error.** Si abres `useQuery.js`, la cadena `throwOnError` no aparece por ningún lado. Si se lanza o no lo decide `query-core` con su `shouldThrowError`.

```js
function shouldThrowError(throwOnError, params) {
	if (typeof throwOnError === "function") return throwOnError(...params);
	return !!throwOnError;
}
```

Si no hay valor es `!!undefined`, así que `false`. Por eso el fallo entra solo en `query.error` y el componente se renderiza con normalidad. El `ErrorBoundary` de fuera no llega a enterarse de que le tocaba.

**`useSuspenseQuery` lanza, pero no siempre.** Este hook despliega las opciones y después sobrescribe `throwOnError`.

```js
return useBaseQuery({
  ...options,
  enabled: true,
  suspense: true,
  throwOnError: defaultThrowOnError,
  placeholderData: void 0
}, QueryObserver, queryClient);
```

La sobrescritura viene después de `...options`, así que **el `throwOnError` que pase quien llama se ignora.** Y la decisión por defecto que ocupa ese sitio está en una sola línea de `suspense.js`.

```js
const defaultThrowOnError = (_error, query) => query.state.data === void 0;
```

**Si hay caché que mostrar, no lanza.** En la práctica el sitio donde se separa esta rama es una recarga en segundo plano. Quien entra por primera vez tiene la caché vacía, así que el fallo va al `ErrorBoundary` y ve el fallback. Quien ya estaba en la pantalla, se va a otra pestaña y vuelve, dispara una recarga, y si esa recarga falla la caché todavía guarda los datos viejos, así que no se lanza nada. La pantalla sigue mostrando el valor rancio y no cambia por sí sola.

Que la pantalla no se rompa suele ser un buen comportamiento. Pero con ello viene **que la pantalla tampoco te avise**, y elegirlo sabiéndolo no es lo mismo que sufrirlo sin saberlo.

**Ninguna de las dos funciones que devuelve una mutation va al `ErrorBoundary`.** Los motivos son distintos. Si abres `useMutation.js`, uno de los lados se traga el rechazo directamente.

```js
observer.mutate(args[0], args[1]).catch(noop);
```

Esto es `mutate`. En el mismo archivo, `mutateAsync` expone `result.mutate` tal cual, y ese `result.mutate` es lo que `mutationObserver.js` ha puesto ahí con `mutate: this.mutate`, así que acaba siendo la misma función que envuelve la línea de arriba. **Solo uno de los dos lados pasa por `.catch(noop)`.** Ese rechazo revienta en el sitio donde se hace `await`, no se lanza durante el render, así que este lado tampoco tiene nada que ver con el `ErrorBoundary`.

**Eso no significa que una mutation no tenga nunca nada que ver con el `ErrorBoundary`.** En el cuerpo del hook hay un interruptor más.

```js
if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) throw result.error;
```

Si le das `throwOnError`, esta línea lanza **durante el render**, y entonces sí va al `ErrorBoundary`. Que las dos funciones devueltas no lleguen al `ErrorBoundary` y que el hook no lance son dos historias distintas.

![Desde un único 500 del servidor a la izquierda salen cinco flechas hacia useQuery, useSuspenseQuery, un hook con throwOnError activado, mutate y mutateAsync, y cada una sigue hasta query.error, ErrorBoundary, ErrorBoundary, mutation.error y el catch de quien llama. Solo las dos cajas centrales de ErrorBoundary están unidas por una línea discontinua, marcadas como las dos que recibe ErrorBoundary](3.png?w=720)

En resumen, el mismo `500` tiene cinco destinos: el campo `query.error`, el campo `mutation.error`, el `catch` de quien llama y los dos casos que van al `ErrorBoundary`. Los dos que van al `ErrorBoundary` son `useSuspenseQuery` fallando sin caché y tener `throwOnError` activado. **El destino lo decide la forma de llamar, no el tipo de fallo.**


## Navegación

Los fallos que aparecen al cambiar de pantalla se dividen en dos. El criterio es **si está dentro o fuera del árbol de React**.

### loader se ejecuta fuera del árbol

El `loader` del router es una función que se ejecuta antes de que empiece el render. No es un componente de React, así que no le llegan ni `getDerivedStateFromError` ni `componentDidCatch`. Por mucho que envuelvas cosas con `react-error-boundary`, ese `ErrorBoundary` no puede ver el fallo de un loader.

En su lugar, el router mantiene su propio sistema de `ErrorBoundary`. La documentación de React Router lo escribe así.

::::quote
:::translation
Los route modules capturan automáticamente los errores de tu código y renderizan el `ErrorBoundary` más cercano.
:::

:::original
route modules will automatically catch errors in your code and render the closest `ErrorBoundary`.
:::
::::

Cómo se elige el más cercano está en las fuentes. `findNearestBoundary` elige así.

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

Recorre las rutas coincidentes desde atrás, elige la primera que tenga un `ErrorBoundary` y, si no hay ninguna, lo manda a la ruta de más arriba. **Por eso poner un `ErrorBoundary` más en una ruta inferior no es duplicar trabajo, sino estrechar el área sobre la que se dibuja el fallback.**

El lado que lo lee también es distinto. Un `ErrorBoundary` de ruta no recibe el error por props, lo saca directamente con `useRouteError()`. Si lleva o no un código de estado se distingue con `isRouteErrorResponse(error)`. Estas dos herramientas no existen en el `ErrorBoundary` de React.

### El rechazo de lazy está dentro del árbol

Dentro de la misma navegación, el lado que recibe el código tarde funciona al revés. Cuando `lazy(() => import('./Tab'))` ve rechazado su `import()`, React lo recoge y lo lanza al **`ErrorBoundary` más cercano**. El cuarto botón del widget es esta ruta.

Cuando sale un despliegue, los archivos de chunk viejos desaparecen, pero una pantalla que se abrió antes del despliegue sigue llevando las direcciones viejas. Si en ese estado pide ese código, el `import()` se rechaza y Chrome lanza `TypeError: Failed to fetch dynamically imported module`.

Aquí se añade una cosa más. **`lazy` recuerda el rechazo.** El `lazyInitializer` de React apunta el resultado en el `payload`, y si se rechaza cambia el estado y guarda el motivo.

```js
payload._status = 2;
payload._result = error;
```

A partir de ahí, cada vez que se renderiza este componente se ejecuta la última rama.

```js
throw payload._result;
```

No vuelve a hacer `import()`. La llamada a `lazy()` ocurrió una sola vez en el nivel superior del módulo y ese `payload` se queda ahí mientras viva la aplicación. **Aunque deshagas el `ErrorBoundary` y vuelvas a montar, llega otra vez el mismo error.** Por eso lo único que recupera este fallo es volver a cargar la página.

Dentro de la misma navegación, el fallo del loader lo recibe el router y el fallo de `lazy` lo recibe React. **Si no separas estos dos antes de decidir dónde poner un `ErrorBoundary`, uno de ellos se queda sin sitio al que ir.**


## Manejadores globales fuera de ErrorBoundary

¿Adónde han ido los tres que el `ErrorBoundary` no ha capturado? A **los manejadores globales del navegador**.

Lo que se lanza desde un manejador de eventos o desde un callback de `setTimeout` acaba en `window`, en su evento `error`. El rechazo de una Promise va a otro evento. La definición de MDN es esta.

::::quote
:::translation
El evento `unhandledrejection` se envía al ámbito global de un script cuando se rechaza una Promise de JavaScript que no tiene manejador de rechazo; normalmente es el `window`, pero también puede ser un `Worker`.
:::

:::original
The `unhandledrejection` event is sent to the global scope of a script when a JavaScript Promise that has no rejection handler is rejected; typically, this is the `window`, but may also be a `Worker`.
:::
::::

Estos dos son el último sitio en el que recibe el navegador. Es también donde la mayoría de las herramientas de monitorización capturan los errores del navegador.

React 19 añadió un sitio más para recibir del lado del árbol. Es una opción de `createRoot`. La documentación oficial separa los tres así.

| Opción | Cuándo se llama |
|---|---|
| `onCaughtError` | Cuando React ha capturado un error dentro de un Error Boundary |
| `onUncaughtError` | Cuando se ha lanzado un error y ningún Error Boundary lo ha capturado |
| `onRecoverableError` | Cuando React se ha recuperado por sí mismo |

Recibir y arreglar son cosas distintas. **Que un manejador global lo capture no restaura la pantalla.** Aunque un error lanzado dentro de `onClick` lo reciba `window` y se envíe a la herramienta de monitorización, en ese momento el usuario solo ve un botón que no ha respondido. Informar y recuperar son trabajos distintos.


## Para terminar

Memorizar el manejo de errores en el frontend como una lista de herramientas deja huecos una y otra vez. Pasa incluso sabiéndose `ErrorBoundary`, `throwOnError`, `useRouteError`, `lazy` y `unhandledrejection`. No es por no conocer las herramientas, sino porque **nunca se ha contado qué va adónde**.

Lo que he tratado en este artículo se resume así.

- Un `ErrorBoundary` solo recibe lo que React ha capturado y le ha entregado. Los manejadores de eventos y los callbacks asíncronos no están en ese sitio.
- La comprobación de tipos termina en la respuesta. Desde el punto en el que `json()` devuelve `any`, es una declaración y no una comprobación.
- Un fallo del servidor no se convierte en error por sí solo. `fetch` no rechaza con `500`, así que lanzar es un trabajo que haces tú.
- Una vez lanzado, la forma de llamar decide el destino. El mismo fallo va a un campo, a quien llama o a un `ErrorBoundary`.
- La navegación se divide en dos. El loader está fuera del árbol y lo recibe el router; `lazy` está dentro del árbol y lo recibe React.
- Fuera del `ErrorBoundary` están los manejadores globales. Capturan, pero la pantalla no se restaura.

Así que lo que hay que hacer antes de dibujar un `ErrorBoundary` no es elegir el componente que se envuelve. Es **escribir todos los sitios en los que esta pantalla puede fallar y marcar a cuál de los seis anteriores corresponde cada uno**. El sitio sin marcar es justamente el hueco.

Estaría bien que miraras cuántos sitios puede fallar ahora mismo en tu pantalla, cuántos de ellos llegan al `ErrorBoundary` y adónde están yendo los que no llegan.

[El siguiente artículo](/251203) trata con qué recibir cada destino: en cuántas capas dividir, cómo tratar el área de pantalla que se lleva un fallo y qué hay que soltar a la vez para que el botón de reintentar del fallback reintente de verdad.


:::ref
- [docs] [React, el Error Boundary de Component](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [docs] [React, los callbacks de error de createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [docs] [React, lazy](https://react.dev/reference/react/lazy)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [docs] [TanStack Query, Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
- [docs] [MDN, unhandledrejection](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [docs] [MDN, fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [docs] [axios, Error handling](https://axios.rest/pages/advanced/error-handling)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
