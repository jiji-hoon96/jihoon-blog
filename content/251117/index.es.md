---
emoji: 🛡️
title: 'Gestión de errores'
seoTitle: 'Gestión de errores del frontend — Guía para combinar Error Boundary y throwOnError de TanStack Query'
date: '2025-11-17'
categories: 프론트엔드 React TanStack-Query 에러핸들링
description: "Este artículo explica el alcance de React Error Boundary, try/catch y throwOnError de TanStack Query, así como la forma de combinarlos. Distingue los errores de renderizado de los errores asíncronos y analiza el funcionamiento interno del restablecimiento de react-error-boundary."
keywords: "gestión de errores del frontend, React Error Boundary, react-error-boundary, TanStack Query throwOnError, gestión de errores en React Query, restablecimiento de Error Boundary, errores con try catch, gestión de errores asíncronos, gestión de errores en React"
locale: es
translationOf: '251117'
sourceHash: 688aa8b21e8068e6d24e46e383d3dddbb24778dff87c065c19b3489cff0380fa
---

En este artículo quiero hablar de **cómo capturar errores en el frontend**.

Durante mi experiencia profesional, muchas veces he sentido cierta incomodidad al escribir código para gestionar errores. Algunos se capturan con `try/catch`, otros con `ErrorBoundary` y otros mediante `onError` de TanStack Query. Además, sus ámbitos se solapan o divergen de formas sutiles. Por eso, a veces un error se escapa y otras se propaga hasta lugares donde no debería llegar.

El problema es que rara vez nos detenemos a ordenar de una vez cómo funcionan todas estas herramientas. Sabemos que «Error Boundary solo captura errores durante el renderizado», pero, si tuviéramos que explicar exactamente qué significa eso en la práctica, qué ocurre internamente al llamar a `reset` o en qué momento TanStack Query vuelve a lanzar un error cuando `throwOnError` está activado, probablemente no sabríamos responder.

Basándome en la guía oficial de React, la biblioteca `react-error-boundary` y la documentación oficial de TanStack Query v5, en este artículo explicaré **hasta dónde llega la responsabilidad** de cada herramienta de gestión de errores del frontend y **cómo combinarlas**.


## Errores que React puede capturar y errores que no puede capturar

Empecemos por la pregunta más básica: **¿qué errores captura React?**

La documentación oficial de React distingue claramente entre los errores que Error Boundary puede capturar y los que no.

**Ámbito que captura Error Boundary**

- Errores producidos durante el **renderizado** de componentes descendientes
- Errores producidos dentro de **métodos del ciclo de vida**
- Errores producidos en el **constructor**

**Ámbito que Error Boundary no puede capturar**

- Errores dentro de **manejadores de eventos**
- Errores de código asíncrono como `setTimeout`, `requestAnimationFrame` o **Promise**
- Errores durante el **renderizado del lado del servidor (SSR)**
- Errores producidos en el **propio Error Boundary**

¿Por qué es importante esta distinción? En realidad, la mayoría de los errores que tratamos habitualmente **pertenecen a la segunda categoría.** Por ejemplo, un servidor que devuelve un 500 tras ejecutar una mutación al pulsar un botón, una solicitud que falla dentro de `useEffect` o una lógica de validación que lanza una excepción al enviar un formulario. React no captura automáticamente estos errores. Debemos capturarlos y gestionarlos de forma explícita.

Por eso, la gestión de errores del frontend se divide en dos ramas: **los errores de renderizado se tratan con Error Boundary** y **los demás, con try/catch o con manejadores proporcionados por bibliotecas**. En el punto donde se cruzan ambas ramas, las bibliotecas de estado asíncrono como TanStack Query actúan como puente.


## Qué es realmente un Error Boundary

Un Error Boundary no es más que un **componente de clase** con dos métodos del ciclo de vida. Según la documentación oficial de React, para convertirse en Error Boundary debe implementar uno de los dos métodos siguientes, aunque normalmente implementa ambos.

```js
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // 에러 발생 시 state를 업데이트해 다음 렌더에서 fallback UI를 보여준다
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  // 에러가 발생한 직후에 호출. 로깅 같은 사이드이펙트는 여기서 처리한다
  componentDidCatch(error, info) {
    logErrorToMyService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

`getDerivedStateFromError` debe ser una **función pura**. Su única función es devolver un nuevo estado, sin efectos secundarios. En cambio, `componentDidCatch` es el lugar destinado a esos efectos. Ahí se envía el error a Sentry o se imprime la pila de componentes en la consola.

Hay un detalle importante: estos dos métodos **solo existen en los componentes de clase.** Aún no hay una forma oficial de crear un Error Boundary con un componente funcional. La [documentación oficial de React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) también lo indica expresamente.

::::quote
:::translation
Actualmente no existe ninguna forma de escribir un Error Boundary como componente funcional.
:::

:::original
There is currently no way to write an Error Boundary as a function component.
:::
::::

Como resulta engorroso escribir un componente de clase cada vez, lo habitual es utilizar la biblioteca `react-error-boundary`. (La creó directamente Brian Vaughn, antiguo miembro del equipo de mantenimiento de React, y en la práctica se utiliza como un estándar.)


## Las tres formas de definir la interfaz alternativa en react-error-boundary

La biblioteca `react-error-boundary` permite especificar la interfaz alternativa de su componente `ErrorBoundary` mediante propiedades de **tres formas**. Veamos brevemente cómo se utiliza cada una.


### fallback

Es la forma más sencilla: se pasa JSX estático.

```tsx
<ErrorBoundary fallback={<div>문제가 발생했습니다.</div>}>
  <Page />
</ErrorBoundary>
```

Se utiliza cuando no es necesario acceder al objeto de error ni a la función de restablecimiento. En la práctica, normalmente hace falta mostrar un mensaje o permitir un reintento, así que hasta ahora no he tenido ocasión de usarla en proyectos reales.


### FallbackComponent

La interfaz alternativa se separa en otro componente y se pasa su **referencia**.

```tsx
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>오류가 발생했습니다.</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Page />
</ErrorBoundary>
```

El objeto de error y la función `resetErrorBoundary` se inyectan automáticamente como propiedades. Es una opción clara cuando la interfaz alternativa puede reutilizarse en otros lugares.


### fallbackRender

Se utiliza cuando se quiere renderizar la interfaz alternativa en línea.

```tsx
<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div role="alert">
      <p>오류가 발생했습니다: {error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  )}
>
  <Page />
</ErrorBoundary>
```

En esencia hace lo mismo que `FallbackComponent`, pero permite **resolverlo en línea sin crear un componente separado**. Es útil cuando se necesita acceder a un cierre léxico externo, como el estado o los manejadores del componente padre.

No existe una única opción correcta. El patrón que utilizo con frecuencia consiste en **crear un componente ErrorFallback común e inyectarlo mediante `FallbackComponent`**, porque el sistema de diseño y el tono deben mantenerse uniformes. Solo escribo un `fallbackRender` en línea cuando una página necesita una interfaz alternativa diferente.


## ¿Qué hace realmente el restablecimiento?

Al utilizar `react-error-boundary`, tarde o temprano aparece la función `resetErrorBoundary`: la que se ejecuta al pulsar el botón «Reintentar» de la interfaz alternativa. Veamos qué hace en realidad.

En pocas palabras, `resetErrorBoundary` solo indica al componente ErrorBoundary que **reinicie su propio estado y vuelva a renderizar los elementos secundarios**. No modifica automáticamente ningún estado externo, como la caché de TanStack Query.

Paso a paso, esto es lo que ocurre internamente:

1. Se llama a `resetErrorBoundary()`.
2. El estado `hasError` interno de ErrorBoundary vuelve a `false`.
3. Opcionalmente, se ejecuta la función `onReset`. Aquí tienen lugar los efectos secundarios definidos por el usuario.
4. Se vuelven a renderizar los elementos secundarios. Si la causa del error, como el estado o la caché, sigue presente, **se vuelve a lanzar el mismo error.**

El cuarto punto es esencial. **El restablecimiento solo significa «olvidemos el error e intentemos renderizar otra vez», no «corrijamos su causa».** Por eso, limitarse a restablecer el estado puede provocar que el mismo error se repita indefinidamente.

Para resolver este problema existen dos herramientas adicionales.


### onReset

Actúa como un punto de extensión que se ejecuta justo antes del restablecimiento. Aquí se limpia el estado externo que originó el error.

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }}
>
  <Page />
</ErrorBoundary>
```


### resetKeys

Cuando cambia alguno de los valores de la lista, ErrorBoundary se restablece automáticamente. Se pasan claves para las que tenga sentido volver a intentarlo si cambian, como un parámetro de URL, un término de búsqueda o la pestaña seleccionada.

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  resetKeys={[userId]}
>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

Cuando cambia `userId`, se produce un restablecimiento automático y los elementos secundarios vuelven a renderizarse. Si el usuario accede a otro perfil, el error anterior desaparece de forma natural.


## ¿Cómo se capturan los errores de manejadores de eventos y del código asíncrono?

Ya hemos visto que Error Boundary no puede capturar errores de manejadores de eventos ni de código asíncrono. Sin embargo, la mayoría de los errores con los que trabajamos nacen ahí. ¿Qué podemos hacer?

Para resolverlo, `react-error-boundary` ofrece el **hook `useErrorBoundary`**. Este devuelve una función llamada `showBoundary`; al invocarla, se puede enviar el error de forma explícita al ErrorBoundary más cercano.

```tsx
import { useErrorBoundary } from 'react-error-boundary';

function MyComponent() {
  const { showBoundary } = useErrorBoundary();

  const handleClick = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      showBoundary(error);
    }
  };

  return <button onClick={handleClick}>실행</button>;
}
```

La clave es que **el desarrollador debe elevar el error explícitamente**. React no lo hace por sí solo. Para trasladar un error asíncrono al ámbito de ErrorBoundary hay que capturarlo con `try/catch` y pasarlo a `showBoundary`.

Con este patrón, la pregunta «¿por qué ErrorBoundary captura unos errores y no otros?» queda resuelta con claridad. La respuesta es sencilla: **«¿se elevó hasta la fase de renderizado o no?»**.


## ¿Cómo gestiona los errores TanStack Query?

Después de ordenar todo lo anterior surge una pregunta natural. `useQuery`, que usamos a diario, trabaja con solicitudes asíncronas; ¿cómo se gestionan los errores que se producen en ellas?

De forma predeterminada, TanStack Query **expone el error en el campo `error`**.

```tsx
const { data, error, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

if (isError) {
  return <div>에러: {error.message}</div>;
}
```

Esta es la forma más sencilla. Aunque se produzca un error, el componente sigue renderizándose normalmente y el valor simplemente queda almacenado en el campo `error`. ErrorBoundary no interviene.

Conviene subrayar un dato importante: **el comportamiento predeterminado de TanStack Query es «no lanzar el error».** Tanto si queryFn lanza una excepción como si devuelve un rechazo, el error solo entra en el campo `error` y no interrumpe el flujo de renderizado de React. Por eso, sin una configuración adicional, ErrorBoundary nunca se activa.

Además, TanStack Query **reintenta automáticamente los errores tres veces de forma predeterminada**.

El `retryDelay` predeterminado utiliza una espera exponencial y aumenta hasta un máximo de 30 segundos. Esto significa que el usuario no ve el error inmediatamente después del primer fallo. Se reintenta tras intervalos de 1, 2 y 4 segundos y, si aun así falla, se rellena el campo `error`. (Si alguna vez durante el desarrollo se ha preguntado «¿por qué tarda tanto en aparecer el error?», casi con total seguridad esta es la causa.)


### Conectar ErrorBoundary mediante throwOnError

Entonces, ¿cómo se envían los errores de TanStack Query a ErrorBoundary? La respuesta es la opción **`throwOnError`**. (Hasta v4 se llamaba `useErrorBoundary`, pero en v5 pasó a llamarse `throwOnError`.)

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  throwOnError: true,
});
```

Cuando esta opción está activada, TanStack Query **vuelve a lanzar el error en el siguiente ciclo de renderizado**. Así, ese lanzamiento se convierte en un error de la fase de renderizado y ErrorBoundary por fin puede capturarlo.

`throwOnError` también acepta una función. De este modo se puede decidir qué errores se envían a ErrorBoundary y cuáles gestiona directamente el componente.

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // 5xx 서버 에러만 ErrorBoundary로 보낸다
  throwOnError: (error) => error.response?.status >= 500,
});
```

Este patrón resulta práctico porque, normalmente, lo natural es mostrar en el lugar correspondiente los **errores del cliente como los 4xx, por ejemplo un fallo de validación o falta de permisos**, mientras que para **errores del servidor como los 5xx** conviene cubrir toda la página y mostrar un mensaje como «Vuelva a intentarlo dentro de unos instantes».


### useSuspenseQuery

Si se utiliza `useSuspenseQuery`, no hace falta preocuparse por `throwOnError`. En modo Suspense, el comportamiento predeterminado es **lanzar siempre los errores**.

Es decir, utilizar `useSuspenseQuery` implica que **Suspense gestiona la carga y ErrorBoundary gestiona los errores**. Ya no hacen falta condicionales como `if (isError)` o `if (isLoading)` dentro del componente; en su lugar, hay que envolverlo externamente con ambos límites.


## QueryErrorResetBoundary

Llegados a este punto surge otra pregunta: ¿qué ocurre cuando el usuario pulsa el botón «Reintentar» de la interfaz alternativa?

Como vimos antes, `resetErrorBoundary` solo reinicia el estado `hasError` de ErrorBoundary. Sin embargo, en la caché de TanStack Query sigue existiendo **una consulta bloqueada en estado de error**. Cuando los elementos secundarios vuelven a renderizarse, TanStack Query consulta la caché, determina que la consulta ya tiene un error y vuelve a lanzar inmediatamente el mismo error. (Es un bucle infinito infernal.)

Para resolver este problema, TanStack Query ofrece el hook **`useQueryErrorResetBoundary`** y el componente **`QueryErrorResetBoundary`**. Sus nombres son largos, pero su función es sencilla: emitir la orden **«restablece el estado de error de las consultas de este ámbito»**.

```tsx
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          <p>에러가 발생했습니다.</p>
          <button onClick={resetErrorBoundary}>다시 시도</button>
        </div>
      )}
    >
      <Page />
    </ErrorBoundary>
  );
}
```

Veamos en orden cronológico lo que ocurre aquí.

1. El usuario pulsa el botón «Reintentar» → se llama a `resetErrorBoundary()`
2. ErrorBoundary ejecuta la función `onReset` → se llama a `reset()` (se reinicia el estado de error de TanStack Query)
3. ErrorBoundary reinicia su propio estado y vuelve a renderizar los elementos secundarios
4. Se ejecuta el `useQuery` de los elementos secundarios → como el estado de error ha desaparecido, vuelve a intentar la obtención de datos

La clave está en conectar `onReset` con `reset`. Gracias a esa línea, ErrorBoundary y TanStack Query sincronizan sus estados.


### Uso como componente

También se puede conseguir lo mismo con un componente en lugar de usar la función anterior. Basta con elegir una de las dos alternativas.

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert">
              <p>에러가 발생했습니다: {error.message}</p>
              <button onClick={resetErrorBoundary}>다시 시도</button>
            </div>
          )}
        >
          <Page />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

La principal diferencia con la versión basada en un hook es que pasa la función `reset` a sus elementos secundarios mediante el patrón de **propiedad de renderizado**. `QueryErrorResetBoundary` recibe una función como elemento secundario, le pasa `{ reset }` como argumento y renderiza su valor de retorno. Por eso puede conectarse inmediatamente mediante `onReset={reset}`.

Si no existe un `QueryErrorResetBoundary` cercano, la versión basada en un hook **restablece los errores de la caché global**. La versión basada en un componente limita el alcance del restablecimiento a su propio árbol de descendientes. Si se quiere controlar el ámbito de forma más precisa, la versión de componente es más segura.

Conviene aclarar un punto: **el restablecimiento no borra la caché.** No elimina todos los datos, sino que libera el estado de las consultas marcadas con error. Si se quieren invalidar realmente los datos, hay que llamar por separado a `queryClient.invalidateQueries()`.


## Errores de mutaciones

Hasta ahora, casi todos los patrones se han explicado desde la perspectiva de `useQuery`. Sin embargo, **el caso de `useMutation` es algo diferente.**

La mayor diferencia es que una mutación suele comenzar a raíz de una **acción explícita del usuario, como un clic o un envío**. Por eso, resulta natural gestionar el error cerca de esa acción. En vez de cubrir toda la página con una interfaz alternativa, es preferible mostrar en una notificación o junto al formulario un texto como «Pago fallido: compruebe de nuevo los datos de su tarjeta».

En [Dominar las mutaciones en React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query), TkDodo resume la esencia de esta diferencia en una frase: **las consultas son declarativas y las mutaciones son imperativas.** Una consulta se ejecuta automáticamente al montar el componente, puede ser observada por otros componentes con la misma clave y queda almacenada en caché para reutilizarse. En cambio, una mutación no se ejecuta hasta que el usuario pulsa un botón, no se almacena en caché y queda vinculada de forma individual a la instancia del componente que la invocó. Esta diferencia esencial separa también sus formas de gestionar errores.

En `useQuery`, el valor predeterminado de `retry` es `3`, pero **en `useMutation`, el valor predeterminado de `retry` es `0`.** La razón es sencilla: una mutación produce **efectos secundarios**. Si una solicitud de pago falla por agotarse el tiempo de espera de la red y la biblioteca la repite automáticamente dos veces más, la tarjeta del usuario podría recibir tres cargos.

Por eso, la regla es activar explícitamente los reintentos de una mutación **solo cuando el desarrollador pueda garantizar que la operación es idempotente**. Esto se limita a consultas seguras del tipo GET cuyo resultado esté garantizado aunque se envíe dos veces la misma solicitud, o a casos en los que el servidor impida duplicados mediante una clave de idempotencia.

Los errores de `useQuery` **quedan fijados en la caché**. Por eso se propagan inmediatamente a otros componentes que observan la misma `queryKey` y hay que restablecerlos en conjunto mediante mecanismos como `QueryErrorResetBoundary`.

Las mutaciones son diferentes. El error de una mutación que falla en un componente **solo permanece en el estado de esa instancia.** No afecta a las mutaciones de otros componentes que utilicen la misma `mutationFn`. Por eso TanStack Query no tiene nada parecido a `MutationErrorResetBoundary`: **no es necesario**.

Esta diferencia tiene una consecuencia práctica. Si dos componentes invocan `useMutation` por separado, el error producido en uno no es visible en el otro. Si se necesita conocer «el error de esta mutación en toda la aplicación», su `onError` a nivel de componente no basta; hay que elevarlo a `MutationCache.onError`.


### mutate vs mutateAsync

`useMutation` devuelve dos funciones de ejecución. La diferencia entre ellas determina cómo se gestionan los errores.

El tipo de retorno de mutate es `void`. No devuelve una Promise. Por tanto, no es posible esperar el resultado con await y este solo puede recibirse mediante manejadores como `onSuccess/onError`.


```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    toast.error(`등록 실패: ${error.message}`);
  },
});

mutation.mutate(newPost);
```


En cambio, `mutateAsync` devuelve una Promise. El error se puede gestionar con `try/catch`.

```tsx
const mutation = useMutation({ mutationFn: createPost });

const handleSubmit = async () => {
  try {
    const result = await mutation.mutateAsync(newPost);
    router.push(`/posts/${result.id}`);
  } catch (error) {
    // 여기서 처리
  }
};
```

¿Cuándo conviene usar cada una? Yo aplico los siguientes criterios.

- **Se necesita una acción posterior al terminar la mutación**, por ejemplo navegar al finalizar o utilizar el resultado → `mutateAsync`
- **Solo hay que ejecutarla y delegar los efectos secundarios en los manejadores configurados**, por ejemplo alternar un «Me gusta» o mostrar únicamente una notificación → `mutate` + `onError`

Hay un error frecuente que conviene señalar: **usar `mutateAsync` sin `try/catch` provoca el rechazo no gestionado de una promesa.** `mutate`, que gestiona el error mediante los manejadores configurados, lo absorbe, mientras que el comportamiento predeterminado de `mutateAsync` consiste en lanzarlo al código que la invoca. Si se mezclan sin conocer esta diferencia, la consola se llena de advertencias rojas.


### onError

Hay otro detalle que suele pasarse por alto. En `useMutation`, `onError` puede definirse **en dos lugares**, en el hook y en mutate.

```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

En el nivel del hook se ejecuta siempre, mientras que en el nivel de mutate solo se ejecuta al invocarla.

```tsx
mutation.mutate(newPost, {
  onError: (error) => {
    setFormError(error.message);
  },
});
```

La documentación oficial especifica este orden de ejecución: **nivel del hook → nivel de mutate.** Si ambos manejadores están definidos, se ejecuta primero el del hook y después el de mutate.


## Gestión global de errores

Todos los patrones vistos hasta ahora operan a nivel de componente. Sin embargo, puede haber requisitos como «registrar todos los errores de las consultas en un solo lugar» o «cerrar siempre la sesión ante un error 401». Para estas preocupaciones transversales se pueden añadir manejadores a `QueryCache`/`MutationCache` al crear el **QueryClient**.

```tsx
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        toast.error(`데이터 갱신 실패: ${error.message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error.status === 401) {
        redirectToLogin();
      }
    },
  }),
});
```

La clave es que `QueryCache.onError` se invoca **una sola vez por cada consulta**. Aunque varios componentes observen la misma consulta, la función solo se ejecuta una vez, por lo que no se producen problemas como notificaciones duplicadas.

También se puede comprobar `query.state.data !== undefined`, como en el ejemplo anterior. Si **falla una actualización cuando ya hay datos en caché**, el usuario sigue viendo información en pantalla. Cubrir la página con un ErrorBoundary sería excesivo; basta con informarle del fallo. En cambio, si falla la carga inicial y no hay datos almacenados, lo apropiado es que ErrorBoundary capture el error y muestre la interfaz alternativa.

Al combinar ambos flujos se puede diseñar una política clara: «ErrorBoundary para los fallos de carga inicial y una notificación para los fallos de actualización en segundo plano».


## Componente común

Llegados aquí, es natural pensar: si resulta molesto envolver todo cada vez con tres capas de `QueryErrorResetBoundary`, `ErrorBoundary` y `Suspense`, ¿por qué no **agruparlas en un componente reutilizable**?

Es una idea razonable. De hecho, hace tiempo también creé y utilicé un componente `AsyncBoundary` como el siguiente.

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { Spinner } from './Spinner';

interface Props {
  children: ReactNode;
  pendingFallback?: ReactNode;
  rejectedFallback?: ComponentType<FallbackProps>;
}

export function AsyncBoundary({
  children,
  pendingFallback = <Spinner />,
  rejectedFallback = ErrorFallback,
}: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={rejectedFallback}>
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

En una página, todo queda reducido a una línea.

```tsx
<AsyncBoundary>
  <Content />
</AsyncBoundary>
```

Parece limpio. Sin embargo, un compañero me hizo los siguientes comentarios.

> El nombre AsyncBoundary no se utiliza como un término tan establecido, por lo que probablemente no resulte demasiado extraño sea cual sea su contenido, pero **sí puede ser difícil prever que también incluye ResetBoundary de React Query.**

> También me preocupa que `pendingFallback` y `rejectedFallback` tengan valores predeterminados. Al ver solo una línea con `<AsyncBoundary>`, no se puede saber qué interfaz alternativa se aplica internamente, así que **es posible que ni siquiera se perciba que existen esos valores predeterminados en las propiedades.**


### El nombre oculta la dependencia

El componente se llama `AsyncBoundary`. Su nombre solo sugiere un límite asíncrono. Sin embargo, la implementación interna está **fuertemente acoplada a TanStack Query**. Incluye `QueryErrorResetBoundary` y conecta `onReset` con `reset`. Es decir, en realidad es **«un límite para ámbitos asíncronos que utilizan React Query»**, pero su nombre no lo revela en absoluto.

¿Por qué supone esto un problema? Porque **rompe las expectativas de quien lee el código**. No leemos el código interpretando cada línea de forma aislada, sino **anticipando** patrones aprendidos con la experiencia. Cuando esa expectativa falla, la carga cognitiva aumenta bruscamente.

Al ver por primera vez el nombre `AsyncBoundary`, un compañero imaginará «un límite genérico para gestionar operaciones asíncronas». Parecería reutilizable tanto con SWR como con una solicitud directa. Sin embargo, contiene un `QueryErrorResetBoundary`, por lo que **arrastra un acoplamiento sin sentido en contextos que no utilizan TanStack Query**. Hay una grieta entre el nombre y la implementación.

Podría verse como una abstracción con fugas en sentido inverso. Normalmente, una fuga ocurre cuando «se escapa un detalle que debería quedar oculto tras la abstracción»; aquí, en cambio, **una dependencia que debería estar visible ha quedado demasiado bien escondida tras el nombre.** Quizá sea incluso peor. (Porque se reutiliza sin saberlo.)


### Mostrar la dependencia en el nombre

La solución más sencilla es cambiar el nombre. En vez de `AsyncBoundary`, puede usarse **`QueryAsyncBoundary`** para hacer explícita la dependencia. Al revisar la biblioteca [Suspensive](https://suspensive.org/) de Toss, se observa que también explicita sus dependencias. `@suspensive/react` solo incluye los componentes genéricos `ErrorBoundary` y `Suspense`, mientras que el componente integrado con TanStack Query se separa en el paquete `@suspensive/react-query` bajo el nombre `QueryAsyncBoundary`.

La información que aporta esta única palabra es considerable. En cuanto aparece el prefijo `Query`, queda claro de inmediato que **«esto es exclusivo de un entorno TanStack Query»**. Así se evitan de antemano usos en contextos equivocados.


### Dividir en unidades componibles

Un enfoque más fundamental consiste en **no agruparlas**.

ErrorBoundary y Suspense son, en esencia, **preocupaciones diferentes**. Si se agrupan en un solo componente, puede perderse flexibilidad de composición. Algunas páginas solo necesitarán ErrorBoundary; otras, únicamente Suspense; y en otras quizá se quiera colocar dos Suspense dentro de un ErrorBoundary. Agruparlos en `AsyncBoundary` vuelve incómodas estas variantes. Si se mantienen separados, pueden componerse libremente.

Este patrón añade una línea de código, pero ofrece la ventaja de que **la responsabilidad de cada límite se lee directamente en el código**. Además, al utilizar `useSuspenseQuery`, la unidad que se quiere resolver de una vez suele ser distinta de la unidad cuyos errores se quieren capturar, por lo que mantenerlas separadas resulta más natural.

Mi conclusión es la siguiente: **si el patrón de composición repetido es realmente idéntico, agrúpelo; si necesita variaciones, manténgalo separado.** E incluso si se agrupa, hay que hacer visible la dependencia en el nombre. Con solo respetar estos dos principios, será menos probable recibir comentarios de revisión como «no sé qué contiene AsyncBoundary».


### Propiedades predeterminadas

Corregir únicamente el nombre no basta. Volvamos al código anterior.

```tsx
pendingFallback = <Spinner />,
rejectedFallback = ErrorFallback,
```

`<QueryAsyncBoundary>...</QueryAsyncBoundary>` funciona en una sola línea porque internamente se aplican de forma automática `Spinner` y `ErrorFallback`. **No es información que pueda deducirse del nombre.**

Es otra versión del problema anterior, «el nombre oculta la dependencia». El prefijo `Query` hace visible la dependencia, pero las dependencias de interfaz `Spinner` y `ErrorFallback` siguen ocultas tras las propiedades predeterminadas. **El ocultamiento solo se ha desplazado un nivel hacia dentro.**

La solución es sencilla: **hacer obligatorias ambas propiedades de la interfaz alternativa e inyectarlas siempre en el punto de uso.**

```tsx
interface Props {
  children: ReactNode;
  pendingFallback: ReactNode;                    
  rejectedFallback: ComponentType<FallbackProps>;
}
```

```tsx
<QueryAsyncBoundary
  pendingFallback={<Spinner />}
  rejectedFallback={ErrorFallback}
>
  <Content />
</QueryAsyncBoundary>
```

El código crece dos líneas. La razón para aceptar ese coste es clara: **aumenta el esfuerzo de quien escribe para reducir el coste de rastreo de todas las personas que leen.** En el propio punto de uso se ve qué interfaz alternativa aparecerá. No hace falta abrir otro archivo para comprobar «¿cuál era el valor predeterminado de este componente?». La conocida idea de que el código se lee muchas más veces de las que se escribe también se aplica aquí.


## ErrorFallback

Hay otro aspecto que merece atención. Normalmente, `ErrorFallback` se define como un único componente de la siguiente forma.

```tsx
const DEFAULT_ERROR_MESSAGE = '문제가 발생했어요. 잠시 후 다시 시도해주세요';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = getErrorMessage(error, DEFAULT_ERROR_MESSAGE);

  return (
    <Flex direction="column" alignItems="center" role="alert" aria-live="assertive">
      <Text>{message}</Text>
      <Spacing size={16} />
      <Button onClick={resetErrorBoundary}>다시 시도</Button>
    </Flex>
  );
}
```

Es una implementación cuidada que incluye incluso `role="alert"` y `aria-live="assertive"`. Pero planteemos una pregunta: **«¿está bien mostrar la misma pantalla para un 401, un 404, un 500 o una desconexión de red?»**

En la mayoría de los casos, la respuesta es **no**, porque la acción que debe realizar el usuario cambia según el tipo de error.

| Tipo de error | Acción del usuario | ¿Tiene sentido «Reintentar»? |
| --- | --- | --- |
| Desconexión de red | Comprobar la conexión y reintentar | O |
| Error 5xx del servidor | Esperar y reintentar | O |
| Fallo de autenticación 401 | Ir a la pantalla de inicio de sesión | X |
| Falta de permisos 403 | Ir a otra pantalla | X |
| Recurso no encontrado 404 | Volver al listado | △ |
| Fallo de validación 422 | Corregir los datos introducidos | X |

Mostrar el botón «Reintentar» en todos los casos equivale a **indicar al usuario una acción equivocada para resolver el error**. Pulsarlo ante un 401 solo produce otro 401. La acción que realmente debe realizar el usuario es iniciar sesión.

Por eso, la interfaz alternativa de error **debe renderizarse de forma distinta según el tipo de error**. No hace falta empezar con un enorme `if/else`; se pueden crear pequeños componentes y seleccionar el adecuado.

Cada componente alternativo expone únicamente el mensaje y la acción apropiados para ese error. En la pantalla solo quedan acciones que el usuario puede realizar de verdad.


### shouldCatch

Si damos un paso más, también existe el patrón de **distinguir en el nivel del componente entre los errores que se capturan y los que se dejan pasar**. El `ErrorBoundary` de Suspensive ofrece la propiedad `shouldCatch`.

```tsx
<ErrorBoundary
  shouldCatch={(error) => isHttpError(error) && error.status >= 500}
  fallback={ServerErrorFallback}
>
  <ErrorBoundary shouldCatch={NetworkError} fallback={NetworkErrorFallback}>
    <Page />
  </ErrorBoundary>
</ErrorBoundary>
```

El ErrorBoundary interior solo captura errores de red y deja pasar los 5xx. Los errores no capturados **ascienden al ErrorBoundary superior** según el comportamiento predeterminado de React. Así, el ErrorBoundary exterior termina capturando los 5xx. Frente a implementar la misma gestión con una estructura condicional, resulta atractivo poder **dar significado a los propios límites**.

`react-error-boundary` no incluye esta propiedad, pero se puede conseguir el mismo efecto bifurcando la lógica dentro de la interfaz alternativa. Lo importante es el patrón, no la biblioteca.


## Conclusión

En resumen, la gestión de errores del frontend **no se resuelve con una sola herramienta**. Error Boundary se ocupa de los errores de renderizado; `try/catch` o `showBoundary`, de los errores de manejadores de eventos; `throwOnError` y `useQueryErrorResetBoundary` de TanStack Query, de los errores al obtener datos de forma asíncrona; `mutateAsync` u `onError`, de los errores de las mutaciones; y `QueryCache`/`MutationCache`, de las preocupaciones transversales. Además, hay que diseñar **el nombre y la unidad de composición de los componentes comunes** y **el modelado de dominio de los propios tipos de error** para conseguir una política de errores coherente.

Cuando se entiende la responsabilidad de cada herramienta, se pueden tomar decisiones claras como **«este error se captura aquí y aquel se deja pasar hasta allí»**. La suma de esas decisiones acaba creando una experiencia de usuario estable: evitar una pantalla en blanco, impedir que aparezca cinco veces la misma notificación, evitar que un fallo temporal de red inutilice toda la página o mostrar la pantalla de inicio de sesión ante un 401 en vez de «Reintentar». Estos detalles, en conjunto, transmiten la impresión de un servicio bien construido.

Por supuesto, no todos los proyectos necesitan todos los patrones. Para una herramienta interna sencilla puede bastar un ErrorBoundary y alguna notificación; en un dominio como los pagos, donde un solo error tiene consecuencias económicas, habrá que aplicar una gestión minuciosa a cada mutación. El dominio determina la respuesta correcta.

Invito a quienes lean este artículo a revisar alguna vez en sus proyectos «¿qué errores captura ahora nuestro servicio, dónde los captura y qué nombre tiene el componente que lo hace?». Puede haber más errores de los esperados que, aunque parecían bien capturados, en realidad se escapan o llegan a la interfaz alternativa equivocada. (A mí también me ocurre cada vez.)


## Referencias

:::ref
- [documentación] [React, Límites de errores](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [documentación] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [documentación] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [documentación] [TanStack Query, Valores predeterminados importantes](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [artículo] [TkDodo, Gestión de errores en React Query](https://tkdodo.eu/blog/react-query-error-handling)
- [artículo] [TkDodo, Romper a propósito la API de React Query](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)
- [repositorio] [toss/suspensive, @suspensive/react-query](https://github.com/toss/suspensive)
- [documentación] [React Router, Límites de errores](https://reactrouter.com/how-to/error-boundary)
:::
