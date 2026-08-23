---
emoji: 🧠
title: "Gestión del estado"
seoTitle: "Criterio para gestionar el estado en frontend: 7 categorías y principios de diseño en React"
date: "2026-05-18"
categories: frontend gestión-del-estado React arquitectura
description: "La gestión del estado es una de las tareas más complejas del frontend. Clasificamos el estado en siete categorías —local, global, de servidor, de formulario, de URL, externo y guards— y presentamos cuatro criterios para elegir herramientas y modelar correctamente: Single Source of Truth, eliminación de estados imposibles y State Colocation, entre otros."
keywords: "gestión del estado frontend, gestión del estado React, comparativa Zustand Jotai, TanStack Query, Server State Client State, State Colocation, Single Source of Truth, React 19 useOptimistic"
locale: es
translationOf: '260518'
sourceHash: 7d2f8d18c54ae7f00c5922a4cb5cd7237792e4fce04be90a498fcdbaca0e3b41
---

En esta publicación quiero hablar sobre la **gestión del estado (State Management)**. No es una comparativa de librerías. Más que decidir qué herramienta es mejor, el objetivo es ordenar el criterio con el que **entendemos el estado** y determinamos **dónde trazar sus límites**.

Hoy las herramientas de IA (Claude, ChatGPT, Cursor, Gemini, Copilot) ya forman parte integral de nuestro trabajo. La velocidad de desarrollo ha crecido exponencialmente, pero, para ser franco, tengo la impresión de que la calidad final de los servicios no ha avanzado al mismo ritmo. Cada vez es más habitual encontrarnos con tantos errores nuevos como funcionalidades añadidas, y también escuchar: «No sé por qué esto terminó así».

Cuando desarrollamos con tanta rapidez, dejamos de examinar el código línea por línea con el mismo detenimiento. Precisamente por eso, considero aún más necesario contar con **los fundamentos necesarios para orientar a la IA en la dirección correcta**. Para mantener la calidad del resultado, debemos ser capaces de detectar los problemas del código generado por la IA y volver a guiarla hacia el objetivo deseado. Entre esos fundamentos se encuentran el desarrollo desde la perspectiva del dominio, la abstracción, el TDD (Test-Driven Development, desarrollo guiado por pruebas), el uso adecuado de librerías y la optimización del rendimiento.

Sin embargo, cada vez que pregunto a colegas de frontend y de otras áreas de TI «¿cuál es la tarea más difícil del desarrollo frontend?», la respuesta más frecuente es siempre la misma: **«Gestionar el flujo del estado»**.

En este artículo trataré de explicar por qué gestionar el flujo del estado resulta tan difícil y qué criterio e intuición conviene desarrollar para hacerlo bien.


## ¿Qué es el estado (State)?

Antes de entrar de lleno en el tema, empecemos por la pregunta más básica: ¿qué es exactamente eso que llamamos «estado»?

Mientras estudiaba desarrollo frontend, solía leer artículos de [hoseung.me](https://blog.hoseung.me/2021-12-05-state-management). Allí se define el estado como **«todos los datos que pueden afectar a la UI»**. El número de «me gusta», los productos del carrito, si un modal está abierto, los valores introducidos, la información del usuario autenticado, la pestaña seleccionada, los resultados de búsqueda o el estado de carga: todo eso es estado.

La documentación oficial de React ofrece una definición algo más formal. El propio título de la página es ["State: A Component's Memory"](https://react.dev/learn/state-a-components-memory), que podríamos desarrollar como **«el mecanismo mediante el cual un componente retiene datos entre renderizados y hace que React dispare un nuevo renderizado cuando esos datos se actualizan»**. Es decir, son datos que no desaparecen con el paso del tiempo, que se actualizan a raíz de algún evento y que, al hacerlo, provocan que la UI vuelva a dibujarse. Hay otro punto importante: el estado está **aislado en cada instancia del componente**. Aunque haya diez instancias del mismo componente en una página, cada una conserva su propio estado independiente. Este hecho se relaciona directamente con la cuestión que veremos más adelante: «¿dónde debe residir el estado?».

Ambas definiciones apuntan a lo mismo: el estado es **«un valor que cambia con el tiempo y afecta al renderizado»**. Una constante que no cambia no es estado. Un token de diseño primitivo fijado en build time no es estado, mientras que el modo oscuro que activa o desactiva el usuario sí lo es. (En rigor, el valor se resuelve según el estado del tema oscuro o claro; por tanto, es más preciso considerar que la «selección del tema» es el estado y que el token es el espejo en el que ese estado se refleja).

Conviene señalar algo más: **no todo el estado vive en los componentes**. Parte vive en cookies; otra, en localStorage, sessionStorage o IndexedDB; y otra, en la URL. Cuando traemos al cliente datos que residen en el servidor y los almacenamos en caché, también se convierten en una forma de estado. Incluso la posición de scroll o el stack del historial que mantiene el navegador deben tratarse a veces como estado, porque determinan el comportamiento de nuestra aplicación.


## ¿Por qué es tan difícil?

Pensemos primero en términos sencillos por qué cuesta tanto manejar el estado. ¿No bastaría con crear el estado necesario, llevarlo hasta donde haga falta y gestionar bien sus actualizaciones y su reinicialización?

Con esta pregunta en mente, abramos una página del servicio en el que estamos trabajando.

¿Cuántos componentes contiene? Incluso una página sencilla puede tener desde decenas hasta cientos de componentes organizados en forma de árbol. Cada componente puede mantener su propio estado, compartirlo con componentes hermanos o recibirlo de su padre. El estado también se transfiere entre páginas; parte debe sobrevivir a una recarga y parte debe desaparecer al cerrar la pestaña.

La verdadera razón por la que el estado es difícil de gestionar es esta: **no podemos ver de un vistazo dónde se declaran todos esos estados, cómo se actualizan ni cuándo desaparecen**. Cuantos más componentes con funciones similares aparecen, más difícil resulta nombrar el estado y rastrear el código que lo modifica.

Así se forma una telaraña invisible. Un clic en el componente A invalida los datos de B; esa invalidación cierra la UI de C; y al cerrarse C desaparece el contenido de un formulario. Si esta cadena no está expresada explícitamente en ninguna parte del código, cuando depuramos un error tenemos que reconstruir la telaraña en nuestra cabeza.

Entonces, ¿cómo podemos ordenar esa telaraña? A mi juicio, el primer paso consiste en reconocer que **«existen distintos tipos de estado»**.


## No todos los estados son iguales

[Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react) divide el estado entre **Server Cache** (información que reside en el servidor y que el cliente conserva para acceder a ella rápidamente) y **UI State** (estado que solo existe en la UI para controlar el comportamiento de la interfaz). A menudo cometemos errores al agrupar ambos.

La [documentación oficial de TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) lo define como una librería de server-state que gestiona operaciones asíncronas entre el servidor y el cliente, mientras que herramientas como Redux, MobX y Zustand son librerías de client-state. (Aunque pueden almacenar datos asíncronos, hacerlo resulta ineficiente).

La idea central es clara: **Server State y Client State son problemas distintos**. Server State es asíncrono, puede ser modificado por otros usuarios y, con el tiempo, pasa a estar stale. Client State es síncrono, está bajo nuestro control y desaparece al recargar la página. (Para ser exactos, cuando la página se descarga, **el runtime de JavaScript se reinicia y tanto el árbol de componentes como el estado alojado en la memoria heap son liberados**. Por eso, al montarse de nuevo, `useState` vuelve a comenzar desde su valor inicial). Si intentamos gestionar ambos con la misma herramienta, tendremos que implementar por nuestra cuenta patrones como la invalidación de caché, la actualización en background o las actualizaciones optimistas.

Doy un paso más y clasifico el estado del frontend en **siete categorías**. Conviene aclarar de antemano que estas siete categorías no se separan limpiamente sobre un único eje. Mezclan ubicación de almacenamiento, origen, ciclo de vida y función, por lo que un mismo estado puede pertenecer a varias categorías a la vez. No pretenden ser una taxonomía perfecta, sino **preguntas que debemos plantearnos al decidir cómo gestionar el estado**.

- **Estado local (Local State)** — Estado usado solo dentro de un componente o de un subárbol reducido
- **Estado global (Global State)** — Estado que debe compartirse en toda la aplicación
- **Estado del servidor (Server State)** — Estado cuya fuente de verdad es el servidor y cuya copia en el cliente es una caché
- **Estado del formulario (Form State)** — Estado temporal que existe mientras el usuario introduce datos
- **Estado de la URL (URL State)** — Estado compartible que vive en la barra de direcciones y sobrevive a una recarga
- **Estado externo (External State)** — Estado fuera de React, como cookies, localStorage, sessionStorage e IndexedDB
- **Guard de estado (State Guard)** — Lógica que bloquea, permite o valida accesos y acciones según combinaciones de estado, en lugar de ser estado por sí misma

Además, existen estados de flujo que conviene modelar con una máquina de estados y estados colaborativos en tiempo real basados en WebSocket o CRDT.

Veamos, una por una, por qué cada categoría requiere herramientas diferentes y con qué criterio debemos abordarla.


## Estado local (Local State)

Es el tipo de estado más sencillo. Solo se utiliza dentro de un componente y, desde fuera, no hay necesidad ni motivo para conocerlo. Algunos ejemplos son si un modal está abierto, el estado on/off de un botón toggle, el estado de hover o el término de búsqueda que se está escribiendo.

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

Hasta aquí, probablemente todo resulte familiar. Sin embargo, la verdadera dificultad del estado local reside en decidir **«dónde debe ubicarse este estado»**.

En su artículo sobre [State Colocation, Kent C. Dodds](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) señala que **la gente está acostumbrada a «elevar» el estado (lift up), pero rara vez vuelve a «colocarlo cerca» (colocate) cuando el código cambia**.

Elevar el estado es algo que hacemos de forma natural cuando varios componentes hermanos necesitan compartirlo. Como ambos deben ver los mismos datos, trasladamos el estado al padre común y lo pasamos hacia abajo mediante props.

El problema aparece cuando esos componentes hermanos dejan de necesitarlo. No solemos **volver a bajar** el estado hacia los hijos. Como resultado, el componente padre termina acumulando estados que en realidad no le conciernen y, cada vez que vuelve a renderizarse, todo el árbol de hijos se renderiza con él.

Por eso, el primer criterio para el estado local es: **para ganar velocidad y simplicidad, coloca el estado tan cerca como sea posible del código que lo utiliza**. Si un estado solo se usa en uno de los hijos de un componente, no hay razón para que lo mantenga el padre. Movámoslo al interior de ese hijo. El padre será más ligero.


## Estado global (Global State)

El estado global debe ser accesible desde cualquier parte de la aplicación. La información de autenticación, el tema, el idioma o las notificaciones (toasts) son posibles candidatos.

La diferencia entre el estado local y el global no se reduce a «dónde viven». Lo que cambia es **el contrato de acceso**. El estado local establece el contrato de que **«solo tiene sentido dentro de este componente»**; el global, en cambio, publica en todo el código el contrato de que **«este valor puede consultarse con este nombre desde cualquier lugar de la aplicación»**. La esencia del estado global es que ese contrato resulta costoso.

Crear un estado global equivale, en realidad, a añadir **una dependencia implícita en toda la aplicación**.


## Estado del servidor (Server State)

Guardamos en el estado del cliente los datos recibidos mediante una API, gestionamos manualmente la carga y los errores con valores boolean y terminamos preguntándonos: **«¿por qué escribo siempre el mismo boilerplate?»**.

Tanner Linsley, principal responsable de TanStack, afirma: **«Client State es síncrono y predecible. Server State es asíncrono, se comparte entre varios componentes y exige gestionar con cuidado el caching, las actualizaciones en background y los estados de error»**. Es decir, Server State es **una especie esencialmente distinta** de Client State. No deben tratarse con la misma herramienta.

La complejidad de Server State no se debe a las herramientas, sino a **la propia naturaleza de los datos**.

Los datos que ve el cliente pertenecen al servidor. Lo que conserva el cliente no es más que **un snapshot de un momento concreto**. Con el paso del tiempo, esos datos acumulan staleness. Además, son asíncronos, pueden fallar y atraviesan estados como pending, error y success.

La propiedad esencial más importante es que **nada garantiza que las respuestas regresen en el mismo orden en que se enviaron las solicitudes**. Imaginemos que escribimos rápidamente «react» en un campo de búsqueda. Las solicitudes r → re → rea → reac → react se envían en ese orden, pero si la respuesta de «react» llega primero y después llega la de «rea», la pantalla mostrará los resultados de «rea». Para evitar este problema hay que ocuparse de los **riesgos de concurrencia (race conditions)**, implementando cada vez a mano un AbortController o el seguimiento de los ID de solicitud.


## Estado de formulario (Form State)

Los formularios albergan un tipo de estado peculiar. Mientras el usuario escribe, cambia intensamente; pero, una vez enviado, normalmente desaparece. No se comparte con ningún otro lugar y, en la mayoría de los casos, tampoco tiene otro destino en el que almacenarse.

El problema es que ese «cambio intenso» resulta costoso. Si cada pulsación provoca un nuevo renderizado de React, en los formularios grandes el retraso al escribir puede llegar a ser perceptible. Además, un formulario no se limita a «guardar valores». Dentro de él conviven y cambian al mismo tiempo muchos tipos de estado: **validación, dirty check, estado de envío, mensajes de error y flujos de varios pasos**.

En un formulario de varios pasos, como un proceso de pago en tres etapas, se espera que **«el progreso sobreviva incluso a una recarga a mitad del proceso»**. Si mantenemos los valores del formulario únicamente con useState, la recarga los eliminará todos. Lo natural es almacenarlos en **sessionStorage** (persistencia temporal por pestaña) o en la **URL** (para pasos que puedan compartirse). Es decir, según los requisitos de su ciclo de vida, Form State se combina con **External State** o **URL State**.


## Estado de URL (URL State)

Supongamos que en una página de búsqueda estamos filtrando por categoría, orden y número de página. Si mantenemos esos estados con useState, aparecen tres problemas a la vez.

- Al recargar, todos los filtros se reinician
- Aunque compartamos la URL con otra persona, esta verá la página sin los filtros aplicados
- Al pulsar «Atrás», no regresaremos a los filtros anteriores

Para resolver estos problemas, **resulta natural colocar el estado en la URL**. La URL es, por sí misma, un almacenamiento persistente gratuito que ya admite recargas, uso compartido e historial.

```
/products?category=shoes&sort=price-desc&page=2
```

Esa única línea contiene el estado completo de **«la segunda página de la categoría de zapatos, ordenada por precio descendente»**. No hace falta mantenerlo por separado con useState.

Entonces, ¿cuándo conviene gestionar el estado en la URL? **La URL es una interfaz pública**. No debemos incluir en ella contraseñas, tokens de autenticación ni notas temporales que el usuario no quiera mostrar a otras personas. Tampoco conviene insertar directamente valores que cambian con demasiada frecuencia —como un término de búsqueda que se actualiza con cada pulsación—, porque el stack del historial se llenará de basura. En esos casos debemos aplicar el cambio después de un debounce y reservar `push` para cuando corresponda, usando `replace` en las actualizaciones que no deban añadir una entrada al historial.

Los valores de la URL son **siempre strings**. Los números, valores boolean, arrays y objetos deben pasar por un proceso de serialización y deserialización. Además, la URL debe seguir las reglas de [percent-encoding](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams), por lo que caracteres como `&`, `=`, el coreano o los espacios reciben un tratamiento especial. Implementarlo manualmente una y otra vez pronto se convierte en una fuente de errores.

```tsx
const params = new URLSearchParams(location.search);
const page = Number(params.get("page") ?? "1");
params.set("page", String(page + 1));
navigate(`?${params.toString()}`);

const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
```

Librerías como [nuqs](https://nuqs.dev/) resuelven ambos problemas mediante el concepto de *parser*. Parsers como `parseAsInteger`, `parseAsBoolean` y `parseAsJson` se encargan a la vez de la serialización, la deserialización y los tipos. Son compatibles con la mayoría de los entornos, incluidos Next.js (tanto App Router como Pages Router), React Router v6/v7, TanStack Router y Remix.


¿Significa eso que podemos insertar en la URL todo el estado que queramos? Al margen de los problemas de serialización y tipos, queda una última restricción. [RFC 7230](https://datatracker.ietf.org/doc/html/rfc7230) no fija un límite exacto, pero recomienda que «los servidores admitan al menos 8.000 octetos» (unidad que designa inequívocamente un byte formado por ocho bits en redes y comunicaciones de datos). Los límites también varían entre navegadores: los navegadores modernos suelen admitir desde 8 KB hasta decenas de miles de caracteres, pero **el procesamiento de OG y enlaces compartidos de buscadores y redes sociales, así como algunos gateways, puede truncarlos alrededor de los 2 KB**. Por tanto, no introduzcamos datos ilimitados en la URL. Lo seguro es conservar allí únicamente **los filtros esenciales que deban poder compartirse** y delegar el resto en sessionStorage o en almacenamiento del lado del servidor.


## Estado externo (External State)

React solo conoce el estado que hay en su interior. Sin embargo, nuestra aplicación se comunica sin cesar con el mundo exterior a React. Los estados que viven en ese mundo sobreviven y cambian con independencia del ciclo de vida de React. Aquí, External State se refiere a **Cookie, localStorage,sessionStorage,IndexedDB**.

¿Cómo elegir el almacenamiento apropiado? Suelo evaluarlo desde cuatro perspectivas: **duración, capacidad, sincronía y seguridad**.

Para los **tokens de autenticación**, la [recomendación de OWASP](https://owasp.org/www-community/HttpOnly) prioriza las **cookies HttpOnly + Secure**. Como JavaScript puede acceder a localStorage, **en cuanto se produce una vulnerabilidad XSS, el token queda directamente expuesto**. Algunas guías de seguridad recomiendan un patrón híbrido: **guardar el access token en memoria y el refresh token en una cookie HttpOnly**. Para datos persistentes, no sensibles y que cambian con poca frecuencia se utiliza localStorage; para datos que deben desaparecer junto con la pestaña, sessionStorage. IndexedDB suele emplearse para caché offline, grandes volúmenes de datos y archivos.

Cookie y Web Storage (local/session) **solo almacenan strings**. Para guardar un objeto hay que pasar por `JSON.stringify`/`JSON.parse`. Pero JSON tiene limitaciones.

```ts
JSON.stringify({ when: new Date() });
// → { "when": "2026-05-19T..." } — Date becomes a string

JSON.stringify({ map: new Map([["a", 1]]) });
// → { "map": {} } — Map is lost entirely

JSON.stringify({ value: undefined });
// → "{}" — the undefined field is omitted
```

`Date` se convierte en string al hacer un round trip por JSON, mientras que `Map`, `Set` y `undefined` pueden perder datos. Con el comportamiento predeterminado, `BigInt` hace que `JSON.stringify` lance un `TypeError`, por lo que la serialización falla por completo. Al guardar objetos en almacenamiento externo, debemos tener siempre presente **qué tipos pueden desaparecer, transformarse o hacer fallar la serialización** y añadir un adaptador cuando sea necesario.

La verdadera dificultad de External State es que **React no detecta automáticamente sus cambios**. Aunque escribamos un valor en localStorage, los componentes de React no vuelven a renderizarse. Normalmente existen tres patrones para resolverlo.

- **Envolverlo en un custom hook (useLocalStorage) y sincronizar el estado externo con el estado de React.** Es una solución ligera, pero si la implementamos nosotros mismos debemos cubrir todos los casos límite: múltiples pestañas, SSR, tearing, etc.
- Usar el hook `useSyncExternalStore`, incorporado en React 18, para **«sincronizarnos con un estado externo a React»**. Esto permite **garantizar que no se produzca tearing durante el renderizado concurrente**. Es la herramienta estándar para conectar localStorage, las API del navegador y los stores externos.
- Aprovechar librerías existentes, ya que las librerías de estado ofrecen como funcionalidad de primera clase la integración con almacenamiento externo, como el middleware `persist` de Zustand o `atomWithStorage` de Jotai.

Añadamos otro criterio: **en el momento en que llevamos External State a React, la responsabilidad de sincronizarlo recae sobre nosotros**. ¿Qué ocurre si se actualiza desde otra pestaña? ¿Si el servidor modifica una cookie? ¿Si el usuario manipula localStorage directamente desde las herramientas de desarrollo del navegador? Estas situaciones suelen convertirse en algunas de las mayores fuentes de errores.


## Guard del estado (State Guard)

La última categoría es algo diferente. No es estado en sí mismo, sino **la lógica que bloquea, permite o valida un flujo a partir de una combinación de estados**.

El ejemplo más habitual es el **Auth Guard**.

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
```

Aquí, el estado `isAuthenticated` controla el flujo de routing. Eso es precisamente la lógica de un guard. Existen varios tipos: Auth Guard (autenticación), guards de autorización (roles o permisos específicos), guards de flujo (ramificación al entrar) y guards de validación (activación de etapas), entre otros.

La lógica de guards tiende a concentrarse en un único lugar. Es habitual que un componente reúna condiciones como **«si no ha iniciado sesión, ir a la página de login; si no tiene permisos, mostrar un 403; si el carrito está vacío, ir a la página de productos; si el usuario está suspendido, mostrar el aviso de suspensión»**. Cuanto más crece el guard, más difícil resulta depurar qué condición bloqueó el flujo y dónde.

Un buen guard **solo comprueba una cosa**. La combinación se realiza mediante Composition.

```tsx
<AuthGuard>
  <RoleGuard role="admin">
    <FlowGuard require={["cartHasItems"]}>
      <CheckoutPage />
    </FlowGuard>
  </RoleGuard>
</AuthGuard>
```

Cada guard toma una única decisión y la composición queda a cargo de la estructura del árbol. Añadir un guard nuevo no requiere modificar los existentes.

Al diseñar guards, hay algo que debemos pensar incluso más que en el bloqueo: **decidir adónde enviar al usuario y qué hacer después**. Un guard que solo bloquea y no ofrece fallback termina en una pantalla en blanco o un spinner infinito.

El error más común consiste en que **«el contenido protegido parpadea brevemente antes de que termine la comprobación asíncrona del guard»**. La validación del token de autenticación y la consulta de permisos suelen ser asíncronas; durante ese intervalo, `isAuthenticated` puede adoptar temporalmente el valor `undefined` o `false`. **Si no tratamos explícitamente el estado de carga, el contenido protegido puede quedar expuesto durante ese instante o el usuario puede ser redirigido erróneamente a la página de login**.

```tsx
// Ignores loading and handles only missing data => incorrect
if (!user) return <Navigate to="/login" />;

// Treat loading as a first-class state (early return) => correct
if (isLoading) return <Spinner />;
if (!user) return <Navigate to="/login" replace />;
return children;
```

Al implementar guards de autorización se utilizan habitualmente dos modelos.

- **RBAC (Role-Based Access Control)**: asigna permisos por rol. Por ejemplo: «admin puede ver la información de todos los usuarios». Es sencillo y rápido, pero el número de roles se dispara a medida que aumenta la granularidad
- **ABAC (Attribute-Based Access Control)**: determina los permisos mediante una combinación de atributos. Por ejemplo: «si el usuario es autor de la publicación, pertenece al mismo equipo o es admin». Tiene una gran capacidad expresiva, pero es difícil de implementar y depurar

Como muestra la [guía de RBAC de TanStack Router](https://tanstack.com/router/v1/docs/framework/react/how-to/setup-rbac), se recomienda el patrón de colocar los guards en `beforeLoad`, en el nivel del router. La clave es que **las comprobaciones de autorización no estén dispersas por el código, sino que puedan expresarse como datos (listas de roles y permisos)**. Así, un cambio en la política de permisos se limita a un *cambio de datos*.


## Conclusión

Recapitulemos. La gestión del estado no es difícil porque las librerías lo sean. Es difícil porque **a menudo olvidamos que existen distintos tipos de estado** y porque resulta fácil pasar por alto que cada tipo exige herramientas y formas de pensar diferentes.

Mantener el estado local lo más cerca posible; cuestionar una vez más si el estado global es realmente global; tratar Server State como caché; separar los formularios del dominio; aprovechar la URL de forma más activa; ser conscientes de la responsabilidad que implica el almacenamiento externo; y dividir los guards en unidades pequeñas que puedan componerse. Esos son los fundamentos para trabajar con las siete categorías.

Y el criterio que opera por encima de ellas puede condensarse, en última instancia, en cuatro preguntas.

- ¿Dónde está la Single Source of Truth de estos datos?
- ¿Es un valor que puede calcularse o un valor que realmente debemos almacenar?
- ¿Hay alguna combinación imposible entre estos estados?
- ¿Este estado debe estar realmente en esta ubicación?

Plantearnos estas preguntas cada vez que construimos una pantalla nueva, revisamos una PR o recibimos código generado por la IA es, a mi juicio, la forma más segura de desarrollar criterio e intuición.

Como decía al principio, la IA permanecerá a nuestro lado durante mucho tiempo. Cada vez dedicaremos menos tiempo a revisar el código línea por línea. Pero, precisamente por eso, será más valiosa la capacidad de responder a pequeñas preguntas como **«¿dónde debe residir este estado?»**. Pedirle a la IA «añade aquí otro useState» es fácil. Sin embargo, comprender qué hilo añade esa línea a la telaraña de nuestra aplicación depende únicamente del criterio de quien lee el código.

No existe una única respuesta correcta. Pero hay una diferencia evidente entre **«crear estado sin saber qué es el estado»** y **«crearlo siendo conscientes de su tipo y ubicación»**. Espero que, la próxima vez que los lectores de este artículo vayan a escribir una línea de `useState`, se detengan un instante y se pregunten: «¿a qué categoría de estado pertenece esto?».


### Referencias

:::ref
- [docs] [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [docs] [React, You Probably Don't Need Derived State](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)
- [docs] [XState](https://xstate.js.org/)
- [article] [Top 5 React State Management Tools in 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
:::
