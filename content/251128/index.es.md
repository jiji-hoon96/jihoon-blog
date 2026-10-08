---
emoji: 🔁
title: "Por qué el botón de reintentar no hace nada"
seoTitle: "ErrorBoundary no reintenta: QueryErrorResetBoundary y lazy"
date: '2025-11-28'
categories: frontend React TanStack-Query manejo-de-errores
description: "Tres casos en que reintentar en un fallback de react-error-boundary devuelve el mismo fallback, comprobados en el código, y cómo resolver cada uno."
keywords: "ErrorBoundary no reintenta, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy error al cargar chunk, error en useSuspenseQuery, react-error-boundary"
locale: es
translationOf: '251128'
sourceHash: bf21fc8f515898fa79deb6500860e1b524bee121476422600343e6ffa3febdcf
---

En esta entrada quiero hablar de **por qué el botón de reintentar de un `ErrorBoundary` no hace nada**.

Está pensada para desarrolladores frontend que pusieron un botón de reintentar en el fallback de `react-error-boundary` y, al pulsarlo, vuelven a ver la misma pantalla. La respuesta corta: un `ErrorBoundary` solo restablece su propio estado, y el estado que provocó el fallo se queda en quien lanzó. Al terminar, sabrás cuáles son los tres casos en que ese estado se queda y cómo resolver cada uno.

Los ejemplos usan TanStack Query junto con `react-error-boundary`, y comprobé el comportamiento de las librerías abriendo su código instalado.


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

![Arriba, el flujo cuando onReset no está conectado: clic en reintentar, EB liberado, remontaje, vuelve a lanzar el error de la caché, y desde la última casilla una flecha roja vuelve a la primera con la etiqueta el mismo fallback. Abajo, el flujo cuando onReset sí está conectado: clic en reintentar, onReset y desbloqueo, EB liberado y remontaje, nueva petición, encadenados en una sola dirección con flechas azules](1.png?w=720)

**Lo que se bloquea es solo la query subida a un `ErrorBoundary`, y por eso hay que limpiar los dos estados a la vez.** Quien levanta esa marca es `QueryErrorResetBoundary`. Si abres el código, el estado es un solo booleano.

```js
reset: () => {
	isReset = true;
},
```

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

Ponerle `Query` en el nombre también es intencionado. Si lo llamas `AsyncBoundary` se lee como si sirviera para cualquier asincronía, y no es así, porque dentro lleva `QueryErrorResetBoundary`. Por la misma razón no le puse valor por defecto a `pendingFallback`. Con un valor por defecto, mirando solo la línea de la llamada no sabes qué se está poniendo debajo.

### El error de render que reset no puede limpiar

El segundo es cuando el servidor devuelve un 200 con una forma distinta de la esperada y el render que la lee lanza un `TypeError`. Lo recibió el mismo `ErrorBoundary` y `onReset` está conectado, pero reintentar no hace nada.

Lo que `reset` limpia es **una query en estado de error**. Pero esta query tuvo éxito. El servidor dio un 200 y la caché guarda ese valor como dato normal. Quien produjo el error fue el render que lo leyó. Así que `reset` no tiene nada que limpiar, y el componente remontado recibe la misma caché, con el `staleTime` todavía vigente, y vuelve a lanzar en la misma línea.

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

En una respuesta de `fetch`, `json()` devuelve `Promise<any>`, así que el tipo que pongas después es una declaración, no una comprobación, y la comprobación en tiempo de ejecución que verifica lo que envió el servidor tienes que ponerla tú. **Ese sitio es este.** Si subes esa comprobación a `queryFn`, el mismo fallo se convierte en **el error de la query**. Se queda en la caché en estado de error, `reset` lo limpia y el reintento vuelve a pedir.

Si aplazas la comprobación en tiempo de ejecución porque total ya la recibe el `ErrorBoundary`, acabas con un fallback que recibe pero no puede deshacer.

### El lazy que solo arregla una recarga

El tercero es un fallo al cargar un chunk. Esta vez no tienen nada que ver ni `reset` ni `queryFn`. Quien guarda el estado es el propio `lazy`.

El `lazyInitializer` de React apunta el rechazo en `payload` y a partir de ahí lanza siempre lo mismo.

```js
throw payload._result;
```

No vuelve a hacer `import()`. La llamada a `lazy()` ocurrió una vez en el nivel superior del módulo y ese `payload` se queda igual mientras viva la aplicación. Aunque sueltes el `ErrorBoundary` y se vuelva a montar, vuelve el mismo error.

Por eso recuperarse de este fallo es volver a descargar la página. También significa que se ha desplegado una versión nueva, así que es mejor decírselo así al usuario.

Puestos los tres casos uno al lado del otro, un solo botón de reintentar tiene que hacer tres trabajos distintos. El error de query se resuelve con `reset`, el error de render convirtiéndolo antes en error de query en `queryFn`, y el fallo de chunk con una recarga. **El `ErrorBoundary` no hace ninguno de los tres por ti.**


## Para terminar

Si un botón de reintentar no hace nada, ojalá compruebes **qué lanzó y dónde sigue guardado su estado** antes de mirar el botón o el `ErrorBoundary`. Dónde se resuelve depende de si es la caché de la query, el render que leyó lo que envió el servidor o `lazy`.

Dónde colocar `ErrorBoundary` en la pantalla y cuántos, y qué fallos no deberían llevar botón de reintentar, lo trato en [Dónde colocar ErrorBoundary](/251203).

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
