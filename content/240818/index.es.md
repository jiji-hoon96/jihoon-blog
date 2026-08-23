---
emoji: 🤯
title: 'Zustand, ¿qué eres y por qué eres ProviderLess?'
seoTitle: 'Por qué Zustand no necesita Provider — Análisis de su funcionamiento basado en useSyncExternalStore'
date: '2024-08-18'
categories: frontend React
description: "Analizamos el código fuente de Zustand para descubrir cómo gestiona el estado sin Provider, sus diferencias con la Context API de React y su diseño basado en el scope de módulo."
keywords: "cómo funciona Zustand, por qué Zustand no necesita Provider, librería de gestión de estado para React, análisis del código fuente de Zustand, useSyncExternalStore, React Context API"
locale: es
translationOf: '240818'
sourceHash: 7e4c03efdbf0b5dead93870b853fa5c987ebfd96bb765663ebb98da138417e85
---

En este artículo quiero explicar cómo consigue Zustand gestionar el estado sin un Provider.

Mientras usaba Zustand, siempre había dado por sentado que podía gestionar el estado sin un Provider. Hasta que un día me surgió una pregunta. En la mayoría de las librerías del ecosistema React, envolver la aplicación con un Provider se ha convertido casi en un ritual. TanStack React Query exige envolverla con `QueryClientProvider` para poder usar `useQuery`, y overlay-kit de toss también exige `OverlayProvider` para poder llamar a `overlay.open()`. La Context API de React también requiere envolver el árbol de componentes con un Provider. Entonces, ¿qué clase de magia hace Zustand para no necesitar ese proceso?

Movido por la curiosidad, examiné directamente el código fuente de Zustand y encontré una estructura más interesante de lo que esperaba. En este artículo voy a ordenar lo que descubrí durante el proceso.

<hr>

## Cómo fluye el estado en React

En una aplicación React convencional, el estado funciona como se muestra en la siguiente imagen.

![3.png](3.png)

El estado interno de un componente se gestiona con los hooks de gestión de estado que ofrece React (`useState`, `useReducer`). Después, el estado se transmite a los componentes hijos mediante props. Hasta aquí, la historia es sencilla.

El problema aparece cuando hay que compartir estado entre componentes muy alejados. La solución oficial que ofrece React en este caso es la Context API, pero esta exige envolver el subárbol con un componente Provider.

<hr>

### ¿Por qué la Context API necesita un Provider?

Para responder a esta pregunta, tenemos que observar brevemente el funcionamiento interno de React.

React gestiona el árbol de componentes mediante una estructura de datos interna llamada Fiber. Cada nodo Fiber está conectado mediante relaciones padre-hijo y, cuando cambia el valor de un Context, React recorre el árbol Fiber de arriba abajo, encuentra los componentes suscritos a ese Context y activa su rerenderizado.

La clave es esta: **la propagación del valor de Context depende de la estructura del árbol Fiber.** La posición del Provider en el árbol determina el alcance al que se transmite el valor, y el componente que llama a `useContext` asciende por su árbol Fiber para encontrar el Provider más cercano. ¿Y si no hay Provider? Simplemente se usa el valor predeterminado pasado a `createContext`.

Es decir, la Context API está estrechamente acoplada al sistema de renderizado de React. El almacenamiento, la propagación y la suscripción del estado ocurren dentro del árbol de componentes de React.

Entonces, ¿cómo evita Zustand esta estructura?

<hr>

## Zustand vive fuera de React

![4.png](4.png)

Zustand funciona sobre el patrón Flux. El `state` dentro del closure desempeña el papel de Store; las funciones definidas por el usuario, el de Actions; la función `set`, el de Dispatcher; y los componentes React, el de Views. Aquí aparece la diferencia decisiva. 

**El Store de Zustand existe fuera del árbol de componentes de React, dentro del scope de un módulo JavaScript.**

Decir que está fuera del árbol de componentes significa que, a diferencia del estado interno de React, el estado de Zustand existe de forma independiente al árbol Fiber de React. Cualquier componente puede acceder al Store con solo hacer `import`, sin necesidad de envolver la aplicación en un Provider. (Es accesible desde cualquier lugar como una variable global, pero queda bien protegido dentro de un closure.)

¿Cómo es posible? Veamos el siguiente código.

```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

En este código, `create` se llama cuando se carga el módulo. Es decir, el Store ya existe en memoria incluso antes de que React empiece a renderizar. Este es el patrón **module-level singleton**.

<hr>

### ¿Qué es un module-level singleton?

El sistema de módulos ES de JavaScript **evalúa cada módulo una sola vez y almacena el resultado en caché**. A partir de ahí, cualquier `import` del mismo módulo devuelve el mismo objeto almacenado, en lugar de volver a ejecutarlo. Es decir, tanto si el componente A hace `import { useStore } from './store'` como si lo hace el componente B, ambos hacen referencia a **exactamente la misma instancia del Store**.

No hace falta implementar una clase singleton aparte ni vincular nada a una variable global (`window.store`). El propio sistema de módulos satisface de forma natural las condiciones de un singleton: «se crea una sola vez y desde cualquier lugar se accede a la misma instancia». Zustand aprovecha directamente esta garantía del lenguaje para que todos los componentes puedan compartir un único Store sin un Provider adicional.

Llegados a este punto, surge una pregunta de forma natural: ¿cómo es exactamente Zustand por dentro?

<hr>

## Estructura interna de Zustand

Al examinar el [repositorio de Zustand en GitHub](https://github.com/pmndrs/zustand/tree/main/src), sorprende lo concisa que es su lógica principal. Dos archivos concentran el núcleo: `vanilla.ts` contiene el Store propiamente dicho y `react.ts` se encarga de conectarlo con React.

<hr>

### vanilla.ts

[vanilla.ts](https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts) es el corazón de Zustand. Todo lo relativo a cómo se crea el Store y cómo se gestiona el estado está contenido en este único archivo. Dicho de forma más sencilla, aquí se definen el estado encerrado en un closure y las funciones que lo manipulan.

```typescript
const createStoreImpl: CreateStoreImpl = (createState) => {
  type TState = ReturnType<typeof createState>
  type Listener = (state: TState, prevState: TState) => void
  let state: TState
  const listeners: Set<Listener> = new Set()

  const setState: StoreApi<TState>['setState'] = (partial, replace) => {
    const nextState =
      typeof partial === 'function'
        ? (partial as (state: TState) => TState)(state)
        : partial
    if (!Object.is(nextState, state)) {
      const previousState = state
      state =
        (replace ?? (typeof nextState !== 'object' || nextState === null))
          ? (nextState as TState)
          : Object.assign({}, state, nextState)
      listeners.forEach((listener) => listener(state, previousState))
    }
  }

  const getState: StoreApi<TState>['getState'] = () => state

  const getInitialState: StoreApi<TState>['getInitialState'] = () =>
    initialState

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const api = { setState, getState, getInitialState, subscribe }
  const initialState = (state = createState(setState, getState, api))
  return api as any
}
```

Al analizar este código línea por línea, se revela el mecanismo central de Zustand.

- **Encapsulación del estado mediante un closure**

  - La variable `let state: TState` se declara como variable local de la función `createStoreImpl`. Aunque la ejecución de la función termine, las funciones internas como `setState` y `getState` siguen haciendo referencia a esta variable, por lo que el recolector de basura no la elimina. Esa es la esencia de un closure.

  - Desde el exterior no existe ninguna forma de acceder directamente a la variable `state`. Solo se puede leer con `getState()` y escribir con `setState()`. (Es como implementar mediante un closure el campo private de la programación orientada a objetos.)

- **Detección de cambios con `Object.is`**

  - Después de calcular el nuevo estado, `setState` lo compara con el estado anterior mediante `Object.is(nextState, state)`. Si la referencia es la misma, no ocurre nada. Esta es la primera línea de defensa contra rerenderizados innecesarios.

  - Sin embargo, esta comparación con `Object.is` comprueba la **igualdad estricta de referencias (strict reference equality)**, así que hay un aspecto al que debe prestar atención quien lo usa. No hay problema cuando se extrae un único valor primitivo, como un número o una cadena.

    ```typescript
    const count = useStore((state) => state.count);
    ```

    Pero la situación cambia si el selector **devuelve un objeto nuevo**.

    ```typescript
    const { count, name } = useStore((state) => ({
      count: state.count,
      name: state.name,
    }));
    ```

    El objeto `{ count, name }` obtiene una referencia nueva en cada llamada, aunque sus valores sean idénticos. Como `Object.is` no compara las propiedades internas, sino solo las referencias, Zustand considera que «el estado ha cambiado» y activa un rerenderizado cada vez.

    Para resolver este problema, Zustand ofrece el hook **`useShallow`**.

    ```typescript
    import { useShallow } from 'zustand/react/shallow';

    const { count, name } = useStore(
      useShallow((state) => ({ count: state.count, name: state.name }))
    );
    ```

    `useShallow` compara una por una las **propiedades de primer nivel del objeto devuelto** y solo provoca un rerenderizado cuando los valores cambian realmente. Es un enfoque parecido al de `useSelector` de Redux, que utiliza comparación por referencia de forma predeterminada, pero permite pasar `shallowEqual` como segundo argumento. (Eso sí, como indica su nombre, `useShallow` hace una comparación «superficial», por lo que no sigue el interior de objetos anidados.)

- **Sistema de listeners con el patrón Pub/Sub**

  - La línea `const listeners: Set<Listener> = new Set()` constituye todo el sistema de suscripción de Zustand. Cuando cambia el estado, `listeners.forEach` notifica a todos los suscriptores. 
  - Al llamar a `subscribe`, el listener se añade al `Set`; al llamar a la función devuelta, se elimina del `Set`.
  - Este patrón es importante porque constituye un **sistema de notificación completamente independiente del árbol Fiber de React**. En lugar de que un Provider recorra el árbol buscando suscriptores, el propio Store administra directamente su lista de suscriptores.

- **Creación del estado inicial**

  - Veamos la última línea que gestiona el estado inicial.

    ```typescript
    const initialState = (state = createState(setState, getState, api))
    ```
    
    Esta línea condensa muchas cosas. En JavaScript, el operador de asignación (`=`) es una expresión (expression) que **devuelve el propio valor asignado**. Por tanto, primero se ejecuta `state = createState(...)` dentro de los paréntesis y se asigna el estado inicial a `state`; después, el valor devuelto vuelve a asignarse a `const initialState`. Como resultado, `state` e `initialState` **hacen referencia al mismo objeto**.

    Pero ¿por qué guardar deliberadamente el mismo valor en dos variables? La clave es que las dos variables tienen funciones distintas.

    - **`state`** es una variable declarada con `let`. Cada vez que se llama a `setState`, se sustituye por un valor nuevo. Representa, por tanto, **el estado vivo en el momento actual**.
    - **`initialState`** es una variable declarada con `const`. Conserva permanentemente el estado que existía cuando se creó el Store. Ninguna llamada posterior a `setState` modifica este valor. Es **la primera snapshot del Store**.

    Este `initialState` se expone al exterior mediante el método `getInitialState()` y se pasa en `react.ts` como **tercer argumento de `useSyncExternalStore` (snapshot del servidor)**.

    ```typescript
    const slice = React.useSyncExternalStore(
      api.subscribe,
      () => selector(api.getState()),       
      () => selector(api.getInitialState()), 
    )
    ```

    En un entorno de renderizado del lado del servidor (SSR) no existen las API del navegador ni la interacción del usuario, así que `setState` nunca llega a llamarse. Por eso, en el servidor siempre se utiliza `initialState` (= el estado inicial) como snapshot. Cuando empieza la hydration en el cliente, React compara el HTML renderizado en el servidor con el resultado del primer renderizado del cliente. Como ambos se han renderizado a partir del mismo `initialState`, se puede **evitar un desajuste de hydration**.

<hr>

### react.ts

[react.ts](https://github.com/pmndrs/zustand/blob/main/src/react.ts) se encarga de conectar el Store JavaScript puro que acabamos de crear con el sistema de renderizado de React.

```typescript
export function useStore<TState, StateSlice>(
  api: ReadonlyStoreApi<TState>,
  selector: (state: TState) => StateSlice = identity as any,
) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector]),
  )
  React.useDebugValue(slice)
  return slice
}
```

La pieza central aquí es `useSyncExternalStore`. Este hook se introdujo en React 18 y fue diseñado para **integrar de forma segura en el ciclo de renderizado de React un almacén de estado que existe fuera de React**.

La estructura queda clara al observar los tres argumentos que recibe `useSyncExternalStore`. (Es casi lo mismo que vimos antes en vanilla.ts.)

- **`api.subscribe`**: función que se suscribe a los cambios del Store. React la utiliza para pedir «avísame cuando cambie el estado».
- **`() => selector(api.getState())`**: devuelve la snapshot del estado actual. React llama a esta función en cada renderizado para obtener el estado más reciente.
- **`() => selector(api.getInitialState())`**: snapshot inicial que se usará durante el renderizado del lado del servidor. Evita discrepancias de estado entre el servidor y el cliente durante la hydration.

En particular, `useSyncExternalStore` resuelve el **problema de tearing** que puede producirse en el modo concurrente de React (Concurrent Mode). El tearing ocurre cuando, dentro de una misma pasada de renderizado, componentes distintos muestran **snapshots diferentes de la misma fuente de datos**.

Resulta más fácil de entender con un escenario concreto. El componente A lee `store.value` (= 10) y empieza a renderizar. En ese momento, React **pausa temporalmente (yield)** el renderizado en modo concurrente y cede el control al navegador. Durante esa pausa llega un mensaje de WebSocket que cambia `store.value` a 11. Cuando React reanuda el renderizado, el componente B lee `store.value` (= 11). Como resultado, en el mismo frame A muestra 10 y B muestra 11, creando una **UI desgarrada (teared)**. Antes de React 18, el renderizado siempre era síncrono, por lo que este problema no se producía.

`useSyncExternalStore` registra la snapshot existente al comenzar el renderizado (`getSnapshot`). Si el Store externo cambia durante el renderizado y la snapshot deja de coincidir, lo detecta y **reinicia el renderizado desde el principio**. Así garantiza que todos los componentes se rendericen a partir de la misma snapshot.

Por último, la función `createImpl` reúne todo esto.

```typescript
const createImpl = <T>(createState: StateCreator<T, [], []>) => {
  const api = createStore(createState)
  const useBoundStore: any = (selector?: any) => useStore(api, selector)
  Object.assign(useBoundStore, api)
  return useBoundStore
}
```

Se crea un Store vanilla con `createStore`, se envuelve en un hook personalizado llamado `useBoundStore` y, mediante `Object.assign`, se adjuntan los métodos de la API del Store (`setState`, `getState`, `subscribe`, etc.) a la propia función hook. Como resultado, el `useBoundStore` devuelto posee una doble naturaleza: **es un hook de React y, al mismo tiempo, la API del Store**. (Un patrón muy propio de JavaScript: una función que también tiene métodos.)

<hr>

## ¿Qué ocurre con otras librerías de gestión de estado?

Después de entender todo esto, es natural querer compararlo con otras librerías.

Existen muchas librerías de gestión de estado, como Jotai, Recoil, MobX, Xstate y Redux, pero me centraré en las que he utilizado personalmente.

> Como referencia, **Recoil** (Meta), que solía compararse a menudo con Jotai, archivó su repositorio en enero de 2025 y su desarrollo quedó, en la práctica, interrumpido. Tampoco llegó a incorporar compatibilidad con React 19. Si se busca un modelo de estado atómico, hoy Jotai puede considerarse la única opción realista.

<hr>

### Redux

Redux también utiliza internamente un Store a nivel de módulo. Entonces, ¿por qué necesita un Provider?

El `<Provider store={store}>` de Redux **inyecta (inject)** la instancia del Store en el árbol de componentes mediante React Context. `useSelector` y `useDispatch` llaman internamente a `useContext` para acceder al Store ofrecido por el Provider. Lo importante aquí es que Redux no usa Context como **canal de propagación del estado, sino como mecanismo de inyección de dependencias (Dependency Injection)**. Lo que se transmite mediante Context no es el propio valor del estado, sino **una referencia al objeto Store** que administra ese estado. La suscripción y las actualizaciones reales del estado se procesan con el Pub/Sub interno del Store.

Las ventajas de este diseño son claras. Durante las pruebas, envolver una instancia distinta del Store con un Provider ofrece un aislamiento perfecto; además, una misma aplicación puede construir varios árboles de Store independientes mediante la prop `context`. Como subraya Mark Erikson, mantenedor de Redux, «Context es un mecanismo de transporte (transport mechanism), no una herramienta de gestión de estado».

<hr>

### Jotai

Jotai adopta un **modelo de estado atómico (atomic)** radicalmente distinto del de Redux o Zustand. En lugar de reunir todo el estado en un gran objeto Store, este enfoque **separa cada fragmento de estado en un atom independiente**. (La propia documentación oficial de Jotai explica que «si Zustand se parece a Redux, Jotai se parece a Recoil».)

La diferencia central de esta estructura está en **cómo optimiza el renderizado**. Zustand sigue un enfoque **descendente (top-down)** que extrae mediante un selector solo la parte necesaria de un único Store. El desarrollador debe escribir directamente un selector como `useStore((state) => state.count)` y, en ocasiones, necesita memoización para conservar la igualdad referencial (referential equality). Jotai, por el contrario, crea automáticamente un **grafo de dependencias (dependency graph)** entre atoms. Cuando cambia uno, propaga el cambio **de abajo arriba (bottom-up)** y rerenderiza exactamente los componentes que dependen de ese atom. Este seguimiento automático de dependencias resulta especialmente eficaz cuando decenas de estados están interrelacionados, como en una hoja de cálculo o un editor de canvas.

Desde el punto de vista del Provider, Jotai ocupa una posición intermedia interesante. De forma predeterminada utiliza un Store global y funciona sin Provider, pero, si hace falta, puede envolverse con `<Provider>` para crear un scope de Store aislado. Tomando prestadas las palabras de la documentación oficial de Jotai, Jotai es **«context first, module second»**, mientras que Zustand es **«module first, context second»**.

<hr>

### La elección de Zustand

Zustand tomó la decisión más radical. De forma predeterminada es un singleton a nivel de módulo y no tiene ningún Provider. Lo que aporta esta elección es una **API extremadamente sencilla**. Basta con crear el Store mediante `create` y llamar al hook desde el componente.

Sin embargo, decir que «no tiene ningún Provider» describe, para ser exactos, su **diseño predeterminado**. Desde v4 se puede implementar el patrón **Scoped Store** combinando `createStore` (un Store vanilla) con el `createContext` de React.

El [blog de TkDodo, mantenedor de React Query](https://tkdodo.eu/blog/zustand-and-react-context), analiza este patrón en profundidad. Su argumento principal es que un Store singleton global tiene tres limitaciones.

- **No se puede inicializar con props**: como el Store se crea al cargar el módulo, no hay forma de usar como valor inicial los datos recibidos del servidor o las props del componente padre.
- **El aislamiento de las pruebas es difícil**: hay que restablecer manualmente el Store en cada prueba.
- **No es reutilizable**: si se renderizan en una página dos componentes que necesitan un Store con la misma estructura, ambos terminan compartiendo el estado.

El patrón Scoped Store resuelve las tres limitaciones. La idea central es **transmitir mediante Context la referencia a la instancia del Store, no el valor del estado**. (Es exactamente la misma estructura que utiliza el Provider de Redux.)

La implementación concreta es la siguiente.

```typescript
import { createStore, useStore } from 'zustand';
import { createContext, useContext, useState } from 'react';

// 1. 스토어 팩토리 함수 — props를 받아 스토어를 생성
const createSelectionStore = (initialItems: string[]) =>
  createStore<SelectionState>((set) => ({
    items: initialItems,
    selected: new Set<string>(),
    toggle: (id) =>
      set((state) => {
        const next = new Set(state.selected);
        next.has(id) ? next.delete(id) : next.add(id);
        return { selected: next };
      }),
  }));

// 2. Context 생성
type SelectionStore = ReturnType<typeof createSelectionStore>;
const SelectionContext = createContext<SelectionStore | null>(null);

// 3. Provider — useState로 스토어를 한 번만 생성
const SelectionProvider = ({
  children,
  initialItems,
}: {
  children: React.ReactNode;
  initialItems: string[];
}) => {
  const [store] = useState(() => createSelectionStore(initialItems));
  return (
    <SelectionContext.Provider value={store}>
      {children}
    </SelectionContext.Provider>
  );
};

// 4. 커스텀 훅 — Context에서 스토어를 꺼내 useStore로 구독
const useSelectionStore = <T,>(selector: (state: SelectionState) => T) => {
  const store = useContext(SelectionContext);
  if (!store) throw new Error('SelectionProvider가 필요합니다');
  return useStore(store, selector);
};
```

Ahora se pueden renderizar en una misma página tantos componentes multiselect independientes como se quiera.

```tsx
// 각 SelectionProvider가 자신만의 스토어 인스턴스를 가진다
<SelectionProvider initialItems={['A', 'B', 'C']}>
  <MultiSelect />
</SelectionProvider>

<SelectionProvider initialItems={['X', 'Y', 'Z']}>
  <MultiSelect />  {/* 위 컴포넌트와 상태가 완전히 독립 */}
</SelectionProvider>
```

Hay que destacar que lo que se transmite mediante Context **no es el valor del estado, sino el objeto Store**. Aunque cambie el valor del estado, el `value` de Context (= la referencia al Store) no cambia, por lo que **no se producen rerenderizados innecesarios debidos a un cambio del valor de Context.** El rerenderizado real se gestiona dentro de `useStore`, donde `useSyncExternalStore` aplica el selector. La función de transporte de Context queda perfectamente separada de la función de suscripción de Zustand.

TkDodo presentó un caso real en el que aplicó este patrón a un componente multiselect de un sistema de diseño. La estructura anterior, que gestionaba el estado interno con `useState` + Context, sufría una degradación del rendimiento con más de 50 elementos. El problema se resolvió al pasar a la suscripción basada en selectors de Zustand.

Después de que en v4 se eliminara el helper que v3 ofrecía mediante `zustand/context`, llamado `createContext`, este patrón se consolidó como la **combinación directa del `createContext` nativo de React con `createStore`/`useStore` de Zustand**. La API sigue igual en v5, y la [documentación oficial de Zustand](https://github.com/pmndrs/zustand/blob/main/docs/previous-versions/zustand-v3-create-context.md) también presenta este patrón en la guía de migración a v4+.

<hr>

## La sombra de ProviderLess

Por supuesto, la ausencia de un Provider no solo ofrece ventajas. Voy a resumir los aspectos a los que, en mi opinión, conviene prestar atención.

<hr>

### El problema de compartir estado en SSR

Un singleton a nivel de módulo puede ser peligroso en un entorno de servidor. Un servidor Node.js procesa varias solicitudes en un único proceso, mientras que cada módulo solo se carga una vez dentro de ese proceso. Esto significa que las solicitudes de usuarios distintos podrían **compartir la misma instancia del Store**.

Por eso Zustand ofrece `getInitialState` y pasa una snapshot del servidor como tercer argumento de `useSyncExternalStore`. Sin embargo, esto por sí solo puede no aislar por completo el estado entre solicitudes. En entornos SSR se recomienda usar el patrón Scoped Store mencionado antes (`createStore` + React Context) para crear un Store nuevo en cada solicitud.

<hr>

### La dificultad de aislar las pruebas

En una librería basada en Provider, envolver cada prueba con un Provider distinto aísla el Store de forma natural. En cambio, el singleton a nivel de módulo de Zustand puede filtrar estado entre pruebas. Por eso hay que restablecer explícitamente el Store en el `beforeEach` de cada prueba. (Yo también sufrí este problema una vez.)

```typescript
// 테스트 파일에서의 스토어 리셋 예시
beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});
```

Aquí también el patrón Scoped Store sirve como solución. Si se envuelve con un Provider, cada prueba puede crear e inyectar un Store nuevo, lo que permite un aislamiento perfecto sin lógica de restablecimiento.

<hr>

### La ausencia de múltiples instancias

Si una aplicación necesita dos Stores independientes con la misma estructura, con el patrón Provider basta con envolver cada uno en un Provider diferente. Pero con un singleton a nivel de módulo hay que llamar por separado a la función de creación del Store para obtener instancias distintas. Por ejemplo, si una misma página contiene dos paneles de pestañas independientes y cada uno debe gestionar por separado su estado de selección, resulta difícil expresarlo de forma natural mediante un singleton global.

También en este caso, el patrón `createStore` + Context es la respuesta. Si cada componente de panel renderiza su propio Provider, se crean instancias totalmente independientes con la misma estructura de Store. La documentación oficial de Zustand recomienda este patrón cuando «un componente reutilizable necesita un Store».

## Conclusión

En resumen, el diseño ProviderLess de Zustand es posible gracias a la combinación de los cuatro mecanismos siguientes.

- **Singleton a nivel de módulo**: el Store se crea fuera del árbol de componentes de React, dentro del scope de un módulo JavaScript.
- **Encapsulación del estado mediante un closure**: en `vanilla.ts`, dentro de `createStoreImpl`, la variable `state` y el Set `listeners` quedan encerrados en un closure e inaccesibles desde el exterior.
- **Sistema Pub/Sub propio**: en lugar de recorrer el árbol Fiber, gestiona directamente `Set<Listener>` para notificar los cambios de estado a los suscriptores.
- **Integración con React mediante `useSyncExternalStore`**: sincroniza de forma segura los cambios de estado del Store externo con el ciclo de renderizado de React.

Al final, la pregunta que plantea Zustand es esta: «¿Tiene el estado que vivir necesariamente dentro de React?». La respuesta de Zustand es clara. El estado puede estar fuera de React y solo hace falta tender un puente cuando sea necesario. Ese puente es `useSyncExternalStore`.

Por supuesto, este enfoque no es el mejor en todas las situaciones. En escenarios como SSR, aislamiento de pruebas o múltiples instancias, un diseño basado en Provider puede ser más adecuado. No hay una única respuesta correcta, pero entender los trade-offs de diseño que ha elegido cada librería permite escoger la herramienta adecuada para cada situación.

Recomiendo a quienes lean este artículo que abran alguna vez el código fuente de una de las librerías que utilizan. Es posible descubrir una profundidad que no aparece en la documentación oficial.

<hr>

![7.jpeg](7.jpeg)

### Ah, y una novedad

Mientras investigaba lo anterior, descubrí que **Zustand v5.0.0 se lanzó oficialmente en octubre de 2024**.

Lo interesante es que v5 apenas incorpora funciones nuevas. Durante v4.x ya se habían añadido nuevas funciones y se habían marcado como deprecated varias API existentes, por lo que v5 tiene sobre todo el carácter de una **versión de limpieza (cleanup)**. Estos son los principales cambios. (Para más detalles, consulta la **[página de releases](https://github.com/pmndrs/zustand/releases)** y la **[guía de migración](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)**.)

- Los requisitos mínimos aumentaron a **React 18 y TypeScript 4.5 o superior**.
- Se eliminó **`getServerState`**. (Se sustituye por el tercer argumento de `useSyncExternalStore`.)
- Se dejó de ofrecer **compatibilidad con ES5**.
- Se eliminó la posibilidad de indicar una **función equality personalizada** en la función `create`.
- Se mejoró la función **`shallow` para admitir objetos iterables**.

Al migrar de v4 a v5, se recomienda actualizar primero a la versión más reciente de v4. Esa versión muestra advertencias de deprecation; si se resuelven antes de pasar a v5, la transición puede realizarse sin dificultades.

<hr>

### Referencias

:::ref
- [docs] [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [docs] [Jotai Comparison](https://jotai.org/docs/basics/comparison)
- [article] [InterBolt, Concurrent React, External Stores, and Tearing](https://interbolt.org/blog/react-ui-tearing/)
:::
