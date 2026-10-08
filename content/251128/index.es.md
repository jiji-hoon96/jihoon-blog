---
emoji: 🔁
title: "Por qué el botón de reintentar no hace nada"
seoTitle: "Por qué no funciona el botón de reintentar de ErrorBoundary"
date: '2025-11-28'
updatedAt: '2026-10-08'
categories: frontend React TanStack-Query manejo-de-errores
description: "Tres casos en que reintentar en un fallback de react-error-boundary devuelve el mismo fallback, comprobados en el código, y cómo resolver cada uno."
keywords: "ErrorBoundary no reintenta, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy error al cargar chunk, error en useSuspenseQuery, react-error-boundary"
locale: es
translationOf: '251128'
sourceHash: fcf6001b4010f388052cef96f91df83091e0a33fd111de033ea9cf622021a566
---

En esta entrada quiero hablar de **por qué el botón de reintentar de un `ErrorBoundary` no hace nada**.

Está pensada para desarrolladores frontend que pusieron un botón de reintentar en el fallback de `react-error-boundary` y, al pulsarlo, vuelven a ver la misma pantalla, y recoge los tres casos en que el estado del fallo se queda y cómo resolver cada uno. La respuesta corta: un `ErrorBoundary` solo restablece su propio estado, y el estado que provocó el fallo se queda en quien lanzó.

Los ejemplos usan TanStack Query junto con `react-error-boundary`. Comprobé el comportamiento de las librerías abriendo su código instalado, y el código citado tiene la misma estructura que los archivos compilados de `@tanstack/react-query` 5.104.1, `react-error-boundary` 6.1.6 y React 19.2.3 (cotejado el 2026-10-08). La sangría y los saltos de línea se ajustaron en algunos puntos para facilitar la lectura.


## Tres casos en los que reintentar no hace nada

Hay tres causas, y cada una se resuelve en un sitio distinto. Tienen una cosa en común. **Un `ErrorBoundary` solo deshace su propio estado.** El estado que tiene quien lanzó hay que limpiarlo en quien lanzó.

### El error de query que reset limpia

Lo único que hace `resetErrorBoundary()` es devolver a su sitio el estado interno del `ErrorBoundary` (`didCatch`). Cuando los children se vuelven a montar, el hook de la query vuelve a leer la caché. Pero esa query está **clavada en la caché en estado de error.** Así que el hook lanza el mismo error enseguida, durante el render, y el `ErrorBoundary` vuelve a dibujar el fallback.

Por qué usa el error viejo en lugar de volver a pedir también está en el código. `errorBoundaryUtils.js` apaga así la nueva petición al remontar.

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

Hay que leer primero la guarda de fuera. **Esta condición solo afecta a las queries que lanzan.** Si una query con `suspense`, o con `throwOnError` activado, se monta mientras `isReset()` es falso, `retryOnMount` pasa a `false` y la nueva petición queda apagada. Un `useQuery` que no lanza no entra ahí y, al volver a montarse, simplemente vuelve a pedir.

Ahora bien, apagar `retryOnMount` solo tiene efecto en una query que nunca tuvo datos en la caché, es decir, una query que falló en su primera carga. Una query que ya tenía datos, al fallar, queda con `isInvalidated` en verdadero, se trata como stale y vuelve a pedir al remontarse gracias a `refetchOnMount`. Los errores de query de los que habla este artículo son fallos de la primera carga.

Eso no significa que la nueva petición quede apagada para siempre. Mientras se ve el fallback, ningún componente observa esa query, así que pasa a ser una query inactiva y, según [los valores por defecto de TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), se borra de la caché a los 5 minutos. Si se pulsa después, no hay error en la caché y vuelve a pedir desde cero. Por eso un código que olvidó `onReset` puede parecer que funciona si se pulsa mucho más tarde. Si la reproducción es irregular, mira primero si pulsaste antes o después de `gcTime`.

![Arriba, el flujo cuando onReset no está conectado: clic en reintentar, ErrorBoundary liberado, remontaje, vuelve a lanzar el error de la caché, y desde la última casilla una flecha roja vuelve a la primera con la etiqueta el mismo fallback. Abajo, el flujo cuando onReset sí está conectado: clic en reintentar, onReset y la llamada a reset(), ErrorBoundary liberado y remontaje, nueva petición, encadenados en una sola dirección con flechas azules](1.png?w=720)

**`retryOnMount` solo se apaga en la query subida a un `ErrorBoundary`, y por eso hay que limpiar el `ErrorBoundary` y la query a la vez.** Quien levanta la bandera que lee `isReset()` es `QueryErrorResetBoundary`. Si abres el código, el estado es un solo booleano.

```js
reset: () => {
	isReset = true;
},
```

Si la bandera solo se levantara y nadie la bajara, los errores posteriores tampoco apagarían `retryOnMount` y cada uno volvería a pedir. Quien la baja es el hook de la query. El hook remontado lee la bandera durante el render y no apaga `retryOnMount`. `getHasError`, que mira la misma bandera, tampoco lanza el error de la caché. Después, ya montado en pantalla, baja la bandera en un effect. Es una función del mismo `errorBoundaryUtils.js`.

```js
const useClearResetErrorBoundary = (errorResetBoundary) => {
	React.useEffect(() => {
		errorResetBoundary.clearReset();
	}, [errorResetBoundary]);
};
```

Así, un solo boolean basta para reintentar solo esta vez. Paso a paso, un reintento ocurre así:

1. `reset()` levanta la bandera `isReset`.
2. El hook de la query remontado ve la bandera durante el render y no apaga `retryOnMount`.
3. Con la bandera levantada, el hook ve un estado de petición en curso en lugar del error de la caché y vuelve a pedir (`useSuspenseQuery` envía la petición durante el render y suspende).
4. Si la petición tiene éxito y el componente queda montado en pantalla, la baja `clearReset()` en un effect; si vuelve a fallar, la baja el `catch` de esa petición.
5. Con la bandera bajada, los errores posteriores vuelven a apagar `retryOnMount`.

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

Así implementa `react-error-boundary` su `resetErrorBoundary`. Es un archivo compilado, así que los nombres se han quedado en una letra, pero la estructura se lee igual.

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

Solo cuando `didCatch` es verdadero llama a `onReset` y devuelve el estado al valor inicial `d` (`didCatch: false`). `setState` se renderiza cuando termina el handler, así que cuando los children se vuelven a montar, la bandera que levantó `reset()` ya está arriba. Por eso basta con conectar `onReset` a `reset`.

Aunque no envuelvas con `QueryErrorResetBoundary`, si tomas de `useQueryErrorResetBoundary()` su `reset` y lo conectas a `onReset`, el reintento funciona. Sin un límite que lo envuelva, el hook devuelve un valor por defecto global del módulo. A cambio, como indica la [guía de Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense), el reset se aplica globalmente y toda la aplicación comparte una sola bandera `isReset`.

### El error de render que reset no puede limpiar

El segundo es cuando el servidor devuelve un 200 con una forma distinta de la esperada y el render que la lee lanza un `TypeError`. Lo recibió el mismo `ErrorBoundary` y `onReset` está conectado, pero reintentar no hace nada.

Lo que `reset` limpia es **una query en estado de error**. Pero esta query tuvo éxito. El servidor dio un 200 y la caché guarda ese valor como dato normal. Quien produjo el error fue el render que leyó ese valor. Así que `reset` no tiene nada que limpiar, y el componente remontado lee el mismo valor de la caché durante el render y vuelve a lanzar en la misma línea. Como lanza antes de montarse en pantalla, ni siquiera llega a suscribirse a la query. Por eso no vuelve a pedir aunque `staleTime` sea 0. Esta query también se borra de la caché cuando pasa `gcTime` y se vuelve a pedir, pero mientras el servidor envíe el mismo valor, vuelve a lanzar en la misma línea.

El sitio donde se arregla es **`queryFn`**.

```ts
queryFn: async () => {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
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

¿Y si se crea un `lazy` nuevo y se vuelve a llamar a `import()`? Hasta ahora lo impedía el navegador. El mapa de módulos recordaba el resultado fallido y no volvía a descargar la misma URL. Un [cambio en la especificación HTML](https://github.com/whatwg/html/pull/10327) que altera esto se fusionó el 2026-07-15. El estado por motor, comprobado el 2026-10-08: Firefox [lo incluyó en 155](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211), publicado el 2026-09-01. WebKit [lo integró en main](https://bugs.webkit.org/show_bug.cgi?id=319492) el 2026-08-19, y el registro del bug no indica qué versión estable de Safari lo incluye. Chrome sigue en Proposed en [chromestatus](https://chromestatus.com/feature/5214647044145152). Así que en Chrome un `import()` nuevo devuelve el mismo fallo.

Esto vale para las compilaciones que cargan los chunks con el `import()` nativo del navegador, como Vite. El runtime de webpack carga los chunks con etiquetas script y borra el registro del chunk que falló, así que, si se vuelve a llamar con un `lazy` nuevo, vuelve a pedirlo.

En cualquier caso, un `lazy` ya creado no lo vuelve a intentar, así que la recuperación por defecto de este fallo es volver a descargar la página. Aunque los navegadores lleguen a volver a descargar, no todo se resuelve. Un fallo de carga de chunk puede venir de una red caída o, como explica la [documentación de Vite](https://vite.dev/guide/build#load-error-handling), de un despliegue nuevo que borró los chunks antiguos. Un chunk borrado sigue sin existir al pedirlo otra vez, así que en ese caso la recuperación sigue siendo recargar. Como no se puede fijar una sola causa, es mejor que el texto del fallback sugiera recargar en lugar de afirmar que salió una versión nueva.

En resumen, el error de query se resuelve con `reset`, el error de render convirtiéndolo antes en error de query dentro de `queryFn`, y el fallo de chunk recargando.


## Para terminar

Si un botón de reintentar no hace nada, ojalá compruebes **qué lanzó y dónde sigue guardado su estado** antes de mirar el botón o el `ErrorBoundary`. Dónde se resuelve depende de si es la caché de la query, el render que leyó lo que envió el servidor o `lazy`.

Dónde colocar `ErrorBoundary` en la pantalla y cuántos, y qué fallos no deberían llevar botón de reintentar, lo trato en [Dónde colocar ErrorBoundary](/251203).

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
