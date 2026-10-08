---
emoji: 🔁
title: "Por qué el botón de reintentar no hace nada"
seoTitle: "ErrorBoundary no reintenta: QueryErrorResetBoundary y lazy"
date: '2025-11-28'
updatedAt: '2026-10-08'
categories: frontend React TanStack-Query manejo-de-errores
description: "Tres casos en que reintentar en un fallback de react-error-boundary devuelve el mismo fallback, comprobados en el código, y cómo resolver cada uno."
keywords: "ErrorBoundary no reintenta, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy error al cargar chunk, error en useSuspenseQuery, react-error-boundary"
locale: es
translationOf: '251128'
sourceHash: 69901addb5820c18cdd362ff593f6e5f6d828a1efe5e78e7059cb26bf22b2e07
---

En esta entrada quiero hablar de **por qué el botón de reintentar de un `ErrorBoundary` no hace nada**.

Está pensada para desarrolladores frontend que pusieron un botón de reintentar en el fallback de `react-error-boundary` y, al pulsarlo, vuelven a ver la misma pantalla, y recoge los tres casos en que el estado del fallo se queda y cómo resolver cada uno. La respuesta corta: un `ErrorBoundary` solo restablece su propio estado, y el estado que provocó el fallo se queda en quien lanzó.

Los ejemplos usan TanStack Query junto con `react-error-boundary`. Comprobé el comportamiento de las librerías abriendo su código instalado, y el código citado coincide carácter por carácter con los archivos compilados de `@tanstack/react-query` 5.104.1, `react-error-boundary` 6.1.6 y React 19.2.3 (cotejado el 2026-10-08).


## Tres casos en los que reintentar no hace nada

Le puse al fallback un botón de reintentar. Es ese botón que pulsa el usuario para deshacer un fallo. Vamos a pulsarlo. **No hace nada.** Vuelve a salir la misma pantalla.

Aparece por tres razones y cada una se resuelve de otra manera. Tienen una cosa en común. **Un `ErrorBoundary` solo deshace su propio estado.** El estado que tiene quien lanzó hay que limpiarlo en quien lanzó.

### El error de query que reset limpia

Lo único que hace `resetErrorBoundary()` es devolver la bandera interna del `ErrorBoundary`. Los children se vuelven a montar y la query se vuelve a suscribir. Pero esa query está **clavada en la caché en estado de error.** Así que lanza de inmediato el mismo error otra vez y el `ErrorBoundary` vuelve a dibujar el fallback.

Por qué usa el error viejo en lugar de volver a pedir también está en el código. `errorBoundaryUtils.js` lo bloquea así.

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

Hay que leer primero la guarda de fuera. **Este bloqueo solo afecta a las queries que lanzan.** Una query con `suspense`, o con `throwOnError` activado, que se monte sin la marca de reset se queda con el reintento apagado. Un `useQuery` que no lanza no entra ahí y, al volver a montarse, simplemente vuelve a pedir.

Eso no significa que el bloqueo dure para siempre. Mientras se ve el fallback, ningún componente observa esa query, así que pasa a ser una query inactiva y, según [los valores por defecto de TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), se borra de la caché a los 5 minutos. Si se pulsa después, no hay error en la caché y vuelve a pedir desde cero. Por eso un código que olvidó `onReset` puede parecer que funciona si se pulsa mucho más tarde. Si la reproducción es irregular, mira primero si pulsaste antes o después de `gcTime`.

![Arriba, el flujo cuando onReset no está conectado: clic en reintentar, EB liberado, remontaje, vuelve a lanzar el error de la caché, y desde la última casilla una flecha roja vuelve a la primera con la etiqueta el mismo fallback. Abajo, el flujo cuando onReset sí está conectado: clic en reintentar, onReset y desbloqueo, EB liberado y remontaje, nueva petición, encadenados en una sola dirección con flechas azules](1.png?w=720)

**Lo que se bloquea es solo la query subida a un `ErrorBoundary`, y por eso hay que limpiar los dos estados a la vez.** Quien levanta esa marca es `QueryErrorResetBoundary`. Si abres el código, el estado es un solo booleano.

```js
reset: () => {
	isReset = true;
},
```

Si la marca solo se levantara y nadie la bajara, todos los errores posteriores volverían a pedir sin bloqueo. Quien la baja es el hook de la query. El hook remontado lee la marca durante el render y no apaga `retryOnMount`. `getHasError`, que mira la misma marca, tampoco lanza el error de la caché. Después, ya montado en pantalla, baja la marca en un effect. Es una función del mismo `errorBoundaryUtils.js`.

```js
const useClearResetErrorBoundary = (errorResetBoundary) => {
	React.useEffect(() => {
		errorResetBoundary.clearReset();
	}, [errorResetBoundary]);
};
```

Así, un solo boolean basta para reintentar solo esta vez.

Basta con conectar este `reset` al `ErrorBoundary`, en su `onReset`. La documentación de TanStack Query y los comentarios del código también traen como ejemplo código que los conecta así.

```tsx
export function QueryAsyncBoundary({ children, pendingFallback }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback error={error} onRetry={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

El orden importa. Y ese orden lo garantiza `react-error-boundary`. Es un archivo compilado, así que los nombres se han quedado en una letra, pero la estructura se lee igual.

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

Están unidos por el operador coma, así que **`onReset` corre primero y `setState` va después**. `d` es el estado inicial con `didCatch` en `false`. Por eso los children se vuelven a montar después de haberse soltado el bloqueo de la caché. **Una línea de diferencia es lo que convierte el reintento en un reintento de verdad.**

Aunque no envuelvas con `QueryErrorResetBoundary`, si tomas de `useQueryErrorResetBoundary()` su `reset` y lo conectas a `onReset`, el reintento funciona. Sin un límite que lo envuelva, el hook devuelve un valor por defecto global del módulo. A cambio, como indica la [guía de Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense), el reset se aplica globalmente y toda la aplicación comparte una sola marca.

Ponerle `Query` en el nombre también es intencionado. Si lo llamas `AsyncBoundary` se lee como si sirviera para cualquier asincronía, y no es así, porque dentro lleva `QueryErrorResetBoundary`. Por la misma razón no le puse valor por defecto a `pendingFallback`. Con un valor por defecto, mirando solo la línea de la llamada no sabes qué se está poniendo debajo.

### El error de render que reset no puede limpiar

El segundo es cuando el servidor devuelve un 200 con una forma distinta de la esperada y el render que la lee lanza un `TypeError`. Lo recibió el mismo `ErrorBoundary` y `onReset` está conectado, pero reintentar no hace nada.

Lo que `reset` limpia es **una query en estado de error**. Pero esta query tuvo éxito. El servidor dio un 200 y la caché guarda ese valor como dato normal. Quien produjo el error fue el render que leyó ese valor. Así que `reset` no tiene nada que limpiar, y el componente remontado lee el mismo valor de la caché durante el render y vuelve a lanzar en la misma línea. Como lanza antes de montarse en pantalla, ni siquiera llega a suscribirse a la query. Por eso no vuelve a pedir aunque `staleTime` sea 0.

El sitio donde se arregla es **`queryFn`**.

```ts
queryFn: async () => {
  const data = await getComments(postId)
  if (!Array.isArray(data.comments)) {
    throw new TypeError('comments 가 배열이 아니다')
  }
  return data.comments
},
```

En una respuesta de `fetch`, `json()` devuelve `Promise<any>`, así que el tipo que pongas después es una declaración, no una comprobación, y la comprobación en tiempo de ejecución que verifica lo que envió el servidor tienes que ponerla tú. **Si subes esa comprobación a `queryFn`**, el mismo fallo se convierte en **el error de la query**. Se queda en la caché en estado de error, `reset` lo limpia y el reintento vuelve a pedir.

Si aplazas la comprobación en tiempo de ejecución porque total ya la recibe el `ErrorBoundary`, acabas con un fallback que recibe pero no puede deshacer.

### El lazy que solo arregla una recarga

El tercero es un fallo al cargar un chunk. Esta vez no tienen nada que ver ni `reset` ni `queryFn`. Quien guarda el estado es el propio `lazy`.

El `lazyInitializer` de React apunta el rechazo en `payload` y a partir de ahí lanza siempre lo mismo.

```js
throw payload._result;
```

No vuelve a hacer `import()`. La llamada a `lazy()` ocurrió una vez en el nivel superior del módulo y ese `payload` se queda igual mientras viva la aplicación. Aunque sueltes el `ErrorBoundary` y se vuelva a montar, vuelve el mismo error.

¿Y si se crea un `lazy` nuevo y se vuelve a llamar a `import()`? Hasta ahora lo impedía el navegador. El mapa de módulos recordaba el resultado fallido y no volvía a descargar la misma URL. Un [cambio en la especificación HTML](https://github.com/whatwg/html/pull/10327) que altera esto se fusionó el 2026-07-15. El estado por motor, comprobado el 2026-10-08: Firefox [lo incluyó en 155](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211), publicado el 2026-09-01. WebKit [lo integró en main](https://bugs.webkit.org/show_bug.cgi?id=319492), pero no pude confirmar si ya está en una versión estable de Safari. Chrome sigue en Proposed en [chromestatus](https://chromestatus.com/feature/5214647044145152). Así que en Chrome un `import()` nuevo devuelve el mismo fallo.

Por eso recuperarse de este fallo es volver a descargar la página. Aunque los navegadores lleguen a volver a descargar, no todo se resuelve. Un fallo de carga de chunk puede venir de una red caída o, como explica la [documentación de Vite](https://vite.dev/guide/build#load-error-handling), de un despliegue nuevo que borró los chunks antiguos. Un chunk borrado sigue sin existir al pedirlo otra vez, así que en ese caso la recuperación sigue siendo recargar. Como no se puede fijar una sola causa, es mejor que el texto del fallback sugiera recargar en lugar de afirmar que salió una versión nueva.

En resumen, el error de query se resuelve con `reset`, el error de render convirtiéndolo antes en error de query dentro de `queryFn`, y el fallo de chunk recargando.


## Para terminar

Si un botón de reintentar no hace nada, ojalá compruebes **qué lanzó y dónde sigue guardado su estado** antes de mirar el botón o el `ErrorBoundary`. Dónde se resuelve depende de si es la caché de la query, el render que leyó lo que envió el servidor o `lazy`.

Dónde colocar `ErrorBoundary` en la pantalla y cuántos, y qué fallos no deberían llevar botón de reintentar, lo trato en [Dónde colocar ErrorBoundary](/251203).

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
