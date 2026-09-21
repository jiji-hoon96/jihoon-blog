---
emoji: 🪟
title: 'overlay-kit'
seoTitle: 'overlay-kit: modales declarativos en React y openAsync'
date: '2026-09-21'
categories: ignore frontend React librería
description: 'Cambiar un flag global isOpen por un await: lo que gané, lo que perdí y cómo funcionan por dentro los eventos, el reducer y openAsync.'
keywords: 'overlay-kit, gestión de estado de modales en React, interfaz declarativa, openAsync, useOverlay, modal con Promise, overlay React, nice-modal-react'
locale: es
translationOf: '260921'
sourceHash: aee64a559fb8a6b52010dd747b1aae985c694053425332601b135523a67ada12
---

En este artículo quiero hablar de las interfaces que tratan los overlays de forma declarativa.

Me gusta el código declarativo. Abrir un overlay, cerrarlo y hacer trabajo asíncrono dentro de él es una secuencia que, en mi opinión, debería gestionar el propio overlay. Cuando quien llama guarda `isOpen` y lo enciende y apaga, el código que maneja el estado acaba en un lugar distinto del componente que lo dibuja.

Pero los modales de las pantallas de las que me ocupaba en la empresa eran justo lo contrario. Si un modal estaba abierto vivía en un store global, quien llamaba lo abría y quien llamaba lo cerraba. También era quien llamaba el que escribía el código que cerraba el modal y los callbacks que recibían su resultado. Por eso estuve mucho tiempo pensando cómo llevar esto hacia algo declarativo, y al final lo reescribí.

Mientras hacía ese trabajo miré [overlay-kit](https://github.com/toss/overlay-kit). Se parecía a la interfaz que yo buscaba. Este artículo recoge la interfaz declarativa de overlay-kit y cómo diseñé el sistema de modales interno.

## El modal que guardaba en estado

En mi artículo sobre [gestión de estado](/260518) puse el indicador de apertura de un modal como el ejemplo más simple de estado local. Escribí que es estado que se usa dentro de un solo componente y que el exterior no necesita ni tiene derecho a conocer. Sigo pensando que es cierto. Pero en cuanto tienes decenas de tipos de modal, se superponen entre sí y deben devolver un valor a quien los llamó, ese estado deja de quedarse dentro del componente.

El código que heredé guardaba la lista de modales abiertos en un store global. Como es código de la empresa, el ejemplo siguiente conserva la estructura y cambia los identificadores.

```tsx
const [openPopup, closePopup] = useModalStore(
  useShallow((state) => [state.openPopup, state.closePopup]),
);

const handleAddNote = useCallback(() => {
  openPopup(PopupType.ADD_NOTE, {
    itemId,
    onClose: () => closePopup(PopupType.ADD_NOTE),
    onSubmit: (note) => {
      closePopup(PopupType.ADD_NOTE);
      saveNote(note);
    },
  });
}, [closePopup, openPopup, itemId]);
```

Tres cosas de este código me incomodaban.

**Primera: hay que sacar la función de apertura de un hook.** `openPopup` y `closePopup` son valores que se seleccionan del store, así que solo se pueden obtener dentro de un componente. Eso significa que el código que abre un modal no puede salir del componente. Para abrir un modal desde un sitio donde no puedes usar hooks, como un interceptor de respuestas de la API o un guard del router, tienes que ir pasando esa función como argumento.

**Segunda: el resultado vuelve por callbacks.** Si se guardó la nota o si el usuario simplemente cerró el diálogo llega por dos ramas distintas, `onSubmit` y `onClose`. Todo lo que quieras hacer después de abrir el modal entra dentro de un callback. Y si tienes que abrir dos modales seguidos, aparece un callback dentro de otro callback.

**Tercera: cerrar es responsabilidad de quien llama.** Es quien llama el que invoca `closePopup(PopupType.ADD_NOTE)`. El modal no se cierra a sí mismo: el lado que lo abrió recuerda de qué tipo de modal se trata y lo cierra. Por eso la misma constante aparece tres veces en una sola función.

Lo que las tres tienen en común es que abrir un único modal obliga a quien llama a escribir tres clases de código: el que lo abre, el callback que recibe el resultado y el que lo cierra.

Si decidir qué mostrar es tarea de quien llama, aquí quien llamaba cargaba además con todo lo que venía después. En particular, `closePopup(PopupType.ADD_NOTE)` señala su objetivo con una constante de texto. Escribir la constante de otro modal sigue pasando la comprobación de tipos porque pertenece al mismo enum, y se cierra el modal equivocado.

## Una interfaz que espera un resultado

Entonces, ¿cuál de las tres se puede quitar? La respuesta a la que llegué fue convertir la apertura de un modal en una llamada a función y hacer que esa función devuelva una Promise con el resultado.

```tsx
const result = await openModalAsync('ADD_NOTE', { itemId });
if (result.reason !== 'confirmed') return;

await saveNote(result.value);
```

Cambiaron tres cosas. La función de apertura pasó a ser una función de módulo en lugar de un hook, así que se puede llamar fuera de un componente. El resultado pasó a ser un valor de retorno en lugar de un argumento de callback, así que el trabajo posterior se quedó dentro del flujo de la función que llama. Y cerrar pasó a ser tarea del propio componente del modal.

Como el tipo de retorno es `Promise<ModalResult<V>>`, el final del modal se concentró en un único valor.

Una Promise termina una sola vez. Resolver una Promise ya resuelta no hace nada, así que todos los motivos por los que un modal puede terminar tienen que caber en ese único valor. Por eso dividí `reason` en cinco casos: el usuario confirmó, el usuario canceló explícitamente, se cerró sin valor, fue reemplazado por un modal nuevo del mismo tipo, o se cerró a la fuerza en una limpieza general. Con un solo booleano, «cancelado» y «se desmontó la pantalla entera» serían el mismo valor, y en los flujos que necesitan limpieza hay que distinguir esos dos casos.

En la dirección contraria, si nunca la terminas, quien llama espera para siempre. No pasa nada cuando un callback no se invoca, pero un `await` simplemente no regresa. Por eso, cada vez que aparecía un camino nuevo para quitar un modal de la pantalla, tenía que comprobar si ese camino también terminaba la Promise. El reemplazo y el cierre forzado tienen cada uno su propio `reason` justamente por eso.

## El punto de llamada de overlay-kit

El punto de llamada de overlay-kit, de toss, tiene este aspecto.

```tsx
const confirmed = await overlay.openAsync<boolean>(({ isOpen, close }) => (
  <ConfirmDialog
    open={isOpen}
    onConfirm={() => close(true)}
    onCancel={() => close(false)}
  />
));
```

Hay tres puntos que me parecieron una buena interfaz.

**Qué se abre está en el punto de llamada.** Mi versión pasa una clave de texto, `'ADD_NOTE'`. Qué componente es esa clave lo sabe un archivo de registry: un archivo que contiene un único objeto que empareja cada clave de texto con la función `import()` que carga ese modal.

```tsx
export const modalImporters = {
  ADD_NOTE: () => import('.../add-note-modal'),
  CONFIRM: () => import('.../confirm-modal'),
  // 모달 종류만큼 이어진다
} as const;
```

overlay-kit escribe el JSX ahí mismo. Quien lee el código sabe qué va a aparecer sin tener que ir a ese archivo.

**El tipo del resultado se decide en el punto de llamada.** El argumento de tipo de `openAsync<boolean>` es a la vez el tipo del argumento de `close` y el tipo del resultado del `await`. No hace falta declarar un tipo de resultado por modal y registrarlo en una tabla.

**Cerrar y eliminar están separados.** El controlador recibe cuatro props: `overlayId`, `isOpen`, `close` y `unmount`. `close` pone `isOpen` en `false` y deja el componente donde está. `unmount` es lo que realmente lo elimina. [La guía oficial sobre abrir y cerrar overlays](https://overlay-kit.slash.page/ko/docs/guides/introduction) lo explica así.

> Esta diferencia se debe a que, al usar `close`, el overlay se mantiene en memoria para poder mostrar su animación de cierre.

Mi versión no tiene esa distinción. Al cerrar, sale de la lista de inmediato. Eso significa que estaba dejando las animaciones de cierre en manos de la librería de componentes, y que solo trataba con pantallas donde eso era posible.

## De overlay.open al render

Cuando te gusta una interfaz, lo siguiente que te preguntas es qué hay dentro. Para que una sola función de módulo dibuje un componente dentro del árbol de React, algo tiene que unir ambos lados.

### Eventos y reducer

`overlay.open` no cambia el estado. Emite un evento.

```ts
// packages/src/event.ts
const open = (controller: OverlayControllerComponent, options?: OpenOverlayOptions) => {
  const overlayId = options?.overlayId ?? randomId();
  const componentKey = randomId();
  const dispatchOpenEvent = createEvent('open');

  dispatchOpenEvent({ controller, overlayId, componentKey });
  return overlayId;
};
```

Quien lo recibe es `OverlayProvider`. El provider tiene un `useReducer`, se suscribe al evento y mete `ADD` en el reducer. Lo que hay que mirar con atención aquí es que `isOpen` entra como `false`.

```tsx
// packages/src/context/provider/index.tsx
const [overlayState, overlayDispatch] = useReducer(overlayReducer, {
  current: null,
  overlayOrderList: [],
  overlayData: {},
});

const open: OverlayEvent['open'] = useCallback(({ controller, overlayId, componentKey }) => {
  overlayDispatch({
    type: 'ADD',
    overlay: { id: overlayId, componentKey, isOpen: false, isMounted: false, controller },
  });
}, []);
```

Y en el frame siguiente al montaje del controlador mete `OPEN` para poner `isOpen` en `true`.

```tsx
// packages/src/context/provider/content-overlay-controller.tsx
useEffect(() => {
  requestAnimationFrame(() => {
    overlayDispatch({ type: 'OPEN', overlayId });
  });
}, [overlayDispatch, overlayId]);
```

Aquí hubo una parte que no coincidió con lo que esperaba.

**El estado no está fuera de React.** Como es una API que abre mediante una función de módulo, supuse que el store también estaría a nivel de módulo, pero en realidad es un `useReducer` dentro del provider. Lo único que está fuera de React es el bus de eventos, y ese no guarda estado. Los overlays se renderizan como hermanos junto a los `children` del provider. No usa `createPortal` ni importa `react-dom`.

Hay algo más que llama la atención. Desde el punto de llamada es una sola línea, `overlay.open()`, pero dentro hay un procedimiento con un orden fijo: emitir un evento, meter `ADD` en el reducer, esperar un frame y volver a meter `OPEN`. Una interfaz declarativa no elimina el código imperativo: lo mueve al otro lado de una frontera.

### El lado que abre y el lado que cierra

El `requestAnimationFrame` que acabamos de ver y la separación entre `close` y `unmount` de la sección anterior parecen cosas distintas a primera vista. En realidad son dos mecanismos que tapan los dos extremos de la misma restricción.

Esa restricción es que una transición de CSS solo funciona si **tanto el estado inicial como el final se renderizan de verdad**. [La guía de transiciones CSS de MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions) advierte sobre los elementos recién añadidos al DOM.

> This is treated as if the initial state had never occurred and the element was always in its final state.

El fallo aparece con dos formas. Al abrir no hay estado inicial, así que no se ejecuta; al cerrar el elemento desaparece antes de que se pinte el estado final, así que tampoco.

| | Al abrir | Al cerrar |
|---|---|---|
| Problema | No hay estado inicial | Desaparece antes de pintar el estado final |
| Solución | Montarlo cerrado primero y abrirlo en el frame siguiente | Mantenerlo montado, apagar solo `isOpen` y eliminarlo después |
| Mecanismo | `ADD(isOpen: false)`, rAF, `OPEN` | `CLOSE`, animación, `REMOVE` |
| Quién conoce el momento | La librería | La persona que la usa |

La última fila explica por qué el lado que cierra queda en manos de quien usa la librería. En el lado que abre, la librería conoce la constante: basta con un frame. En el lado que cierra, la librería no puede saber si la animación dura 200 o 400 milisegundos.

**Por eso un lado es automático y el otro se entrega como una función llamada `unmount`.**

Lo que sostiene el lado que cierra está en el reducer. `CLOSE` solo invierte, dentro de `overlayData`, el valor `isOpen`, y no toca `overlayOrderList`. El provider renderiza recorriendo esa lista, así que el componente sigue vivo mientras permanezca en ella. Solo se desmonta cuando `REMOVE` lo saca.

**Dicho esto, rAF no siempre es necesario.** react-transition-group [no ejecuta la transición de entrada en el primer montaje de forma predeterminada](https://reactcommunity.org/react-transition-group/transition). La salta incluso cuando `in` ya es `true`, y hay que activar `appear`. El rAF de overlay-kit cambia `isOpen` de `false` a `true` después del montaje, lo que cubre ese caso.

### Veinte líneas envueltas en una Promise

`openAsync` no es una implementación aparte, sino una capa fina alrededor de `open`.

```ts
// packages/src/event.ts
const openAsync = async <T>(controller: OverlayAsyncControllerComponent<T>, options?: OpenOverlayOptions) => {
  return new Promise<T>((_resolve, _reject) => {
    open((overlayProps, ...deprecatedLegacyContext) => {
      const close = (param: T) => {
        _resolve(param);
        overlayProps.close();
      };
      const reject = (reason?: unknown) => {
        _reject(reason);
        overlayProps.close();
      };
      const props: OverlayAsyncControllerProps<T> = { ...overlayProps, close, reject };
      return controller(props, ...deprecatedLegacyContext);
    }, options);
  });
};
```

Todo lo que hace es sustituir el `close` que llega al controlador. El `close` original no recibe argumentos; este recibe uno, resuelve la Promise con él y después llama al `close` original. Esta es también la razón por la que el tipo del resultado se decide en el punto de llamada. `T` es a la vez el tipo del argumento de `close` y el tipo de la Promise.

Aun así, esta estructura tiene un agujero. La resolución solo ocurre cuando se llama a `close`. Por eso, si quitas un overlay únicamente con `unmount`, la Promise se queda pendiente para siempre. Está registrado en el [issue #169](https://github.com/toss/overlay-kit/issues/169) y creo que hay que arreglarlo, pero el issue sigue abierto.

Que la resolución ocurra en `close` tiene otra implicación. Es el momento en que empieza el cierre, no el momento en que termina la animación de cierre. Eso da igual en un flujo que pide confirmación y luego llama a una API, pero en un flujo que pide confirmación y luego abre el siguiente modal, el segundo sube mientras el primero todavía está desapareciendo.

### Donde el diseño dio la vuelta completa

Seguí el historial de commits para explorar cómo llegó aquí el diseño, y descubrí que la estructura no fue así desde el principio. La 1.0 usaba la misma combinación de eventos y reducer que hoy. La 1.2.0 movió el estado a un store externo a nivel de módulo que se leía con `useSyncExternalStore`, y la 1.8.0 lo devolvió a un reducer.

El motivo de la vuelta atrás está escrito en el [issue #148](https://github.com/toss/overlay-kit/issues/148).

> `useSyncExternalStore` resolves tearing issues, but it doesn't work well with suspense.

Cuando obtener datos dentro de un overlay lo hacía suspender, React avisaba de que un componente había suspendido mientras respondía a una entrada síncrona. El objetivo original de pasar a un store externo era poder leer el estado del overlay sin un hook, y el PR de entonces dice sin rodeos que el objetivo no se logró de la forma prevista. Al final el objetivo se resolvió con un hook y solo el mecanismo de almacenamiento volvió a su sitio original.

Lo que me llevo de este registro no es una conclusión, sino un criterio. Poner el estado fuera de React libera desde dónde puedes llamar, a cambio de abrir la puerta a desencajarse de la planificación de React. overlay-kit dejó fuera solo el punto de llamada y mantuvo el estado dentro.

## Al reabrir con el mismo id

Algo me llamó la atención leyendo el reducer. Justo al principio de `ADD` hay esta rama.

```ts
// packages/src/context/reducer.ts
case 'ADD': {
  if (state.overlayData[action.overlay.id] != null && state.overlayData[action.overlay.id].isOpen === false) {
    const overlay = state.overlayData[action.overlay.id];
    if (overlay == null || overlay.isOpen) {
      return state;
    }
    return {
      ...state,
      current: action.overlay.id,
      overlayData: { ...state.overlayData, [action.overlay.id]: { ...overlay, isOpen: true } },
    };
  }
  // ...
```

Si abres un overlay indicando un `overlayId`, haces `close` y luego lo vuelves a abrir con el mismo id, entras en esta rama. Pero el valor de retorno reutiliza el **objeto `overlay` existente**.

Nada usa nunca el `action.overlay` entrante ni su `controller`.

Leerlo no me bastaba para estar seguro, así que cloné el repositorio de la librería y le añadí una prueba yo mismo. Preparé dos componentes que dibujan contenidos distintos y los abrí en orden con el mismo id.

```tsx
const ControllerA = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">AAA</div> : null);
const ControllerB = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">BBB</div> : null);

overlay.open(ControllerA, { overlayId: 'id-close' });
overlay.close('id-close');
overlay.open(ControllerB, { overlayId: 'id-close' });
```

Estos fueron los resultados, ejecutados con vitest sobre la rama main en la versión 1.9.0 de overlay-kit.

| Procedimiento | Lo que se renderizó |
|---|---|
| Abrir A, `close`, reabrir con B | `AAA`. B se descarta |
| Abrir A, `unmount`, reabrir con B | `BBB`. Se reemplaza correctamente |
| Subir un contador a 1, `close`, reabrir | `1`. El estado del componente se conserva |

La tercera fila es un comportamiento que la documentación describe como una función, así que salió como esperaba. El problema es la primera fila.

**Si solo haces `close` y reabres con el mismo id, el JSX nuevo con el contenido cambiado se ignora y aparece la pantalla anterior tal cual.**

Aquí comprobé una cosa más. Más abajo, en el mismo reducer, hay este comentario.

```ts
/**
 * @description Brings the overlay to the front when reopened after closing without unmounting.
 */
overlayOrderList: [...state.overlayOrderList.filter((item) => item !== action.overlay.id), action.overlay.id],
```

Dice que reabrir después de cerrar trae el overlay al frente. Pero como la rama anterior llega antes a `return`, esta línea no se ejecuta en esa situación. Apilé dos overlays, hice `close` sobre el de abajo, lo volví a abrir y el orden del DOM no cambió.

**Lo que describe el comentario y lo que ocurre de verdad son cosas distintas.**

Eso sí, no comprobé si esto se manifiesta como un problema visible en pantalla. La prueba solo miró el orden del DOM y, como la mayoría de las librerías de diálogos usan su propio z-index o portales, el orden del DOM no equivale al orden visual.

Mi versión expone esta misma situación como una opción. Al reabrir un modal del mismo tipo, quien llama elige si conservar el existente o reemplazarlo con props nuevas. Si elige el reemplazo, la Promise existente termina como `replaced`. Esta es una de las razones por las que antes dividí el tipo del resultado en cinco ramas.

**Aquí es donde divergen los dos diseños.** Mi enfoque trata los modales como datos. Como la clave de texto y las props viven en un store, se pueden reemplazar o actualizar más tarde. overlay-kit trata los modales como funciones. El controlador es un closure, así que una vez guardado no hay forma de cambiar su contenido desde fuera.

## El precio del JSX en el punto de llamada

Entonces, ¿escribir JSX en el punto de llamada es siempre mejor que usar una clave de texto? Creo que no. Hay tres precios que pagar.

**La división de código deja de ser lo predeterminado.** Escribir JSX en el punto de llamada significa que quien llama importa ese componente. Si el modal es una pantalla de edición pesada y solo unos pocos usuarios pulsan ese botón, ese peso entra en el bundle de la pantalla de listado.

`React.lazy` sí funciona dentro de un controlador. Lo medí igual que en la prueba anterior: el módulo no se cargaba antes de `open` y, al abrirlo, primero aparecía el fallback de `Suspense` y después se renderizaba el contenido.

```tsx
const Heavy = React.lazy(() => import('./HeavyModal'));

overlay.open(({ isOpen, close }) => isOpen ? (
  <Suspense fallback={<Spinner />}><Heavy onClose={close} /></Suspense>
) : null);
```

Así que la diferencia no está en si es posible, sino en cuál es el valor predeterminado.

En mi versión todos los valores del archivo de registry son funciones `import()`, así que la división de código queda forzada por la estructura. Con overlay-kit hay que escribirla a mano en cada punto de llamada.

**Quien usa la librería tiene que decidir dónde llamar a `unmount`.** Si solo llamas a `close` y te quedas ahí, la información del overlay permanece en memoria. La documentación oficial advierte de esto y da indicaciones separadas sobre dónde enganchar `unmount` en cada sistema de diseño. MUI y Mantine tienen un callback para cuando termina la transición, así que basta con engancharlo ahí, pero para las librerías que no lo tienen la documentación dice que pongas un temporizador con la duración de la animación. Que esas indicaciones estén repartidas por librería es en sí mismo el coste de esta decisión.

**Los overlays se renderizan donde está el provider.** Como no usa portales, el mismo código funciona en React Native, lo cual es una ventaja. A cambio, el contexto proporcionado por debajo de `OverlayProvider` no es visible dentro de un overlay. Al abrir un modal que depende del contexto del router o de un formulario, conviene comprobar esto primero.

## Hasta dónde llega la palabra declarativo

Después de escribir hasta aquí, hay algo que me inquieta. Empecé este artículo llamando declarativa a esta interfaz, y sin embargo `overlay.openAsync(...)` es una llamada a función se mire como se mire.

Empecemos por la definición. [La documentación de React](https://react.dev/learn/reacting-to-input-with-state) traza la línea así.

> In React, you don't directly manipulate the UI--meaning you don't enable, disable, show, or hide components directly. Instead, you **declare what you want to show,** and React figures out how to update the UI.

La analogía del mismo documento es más nítida. Lo imperativo es ir cantando cada giro a quien conduce el coche; lo declarativo es subirse a un taxi y decir el destino.

**Una interfaz declarativa no elimina el procedimiento imperativo: lo mueve al otro lado de una frontera y le pone nombre a esa frontera.** El interior de overlay-kit que hemos visto es exactamente eso. El punto de llamada es una línea, mientras que dentro corre un procedimiento que emite un evento y hace dos dispatch.

Veamos entonces dónde aplica cada proyecto la palabra. La documentación de overlay-kit llama imperativo al enfoque anterior. Lo que señala es el código que guarda el indicador de apertura con `useState` y lo invierte en un manejador de eventos. Lo que llama declarativo es el lado que trata el overlay como una acción y no como estado. El [artículo sobre código declarativo](https://toss.tech/article/frontend-declarative-code) del blog técnico de toss define la palabra de forma más amplia: el código declarativo es código con un nivel de abstracción más alto, y un hook que abstrae la acción de mostrar un overlay es un ejemplo de ello.

Por eso decidí estrechar la palabra así: **quien llama no escribe el código que cierra**. Cuándo cerrar, y qué queda en pantalla mientras se cierra, lo decide el overlay; quien llama escribe solo qué mostrar y qué espera recibir de vuelta.

Con este criterio, el código escrito con `useState` que guarda `isOpen` y el código que mantiene una lista de modales abiertos en un store global mientras quien llama los cierra están del mismo lado. Solo cambia dónde se guarda; en ambos, quien llama escribe la instrucción de cierre.

## Para terminar

Lo que arreglé en el código de la empresa no fue, al final, dónde se guardaba el estado. Fue quién escribe el código que cierra.

Incluso cuando usábamos un store global, el estado ya estaba fuera del componente, pero las instrucciones que abrían y cerraban seguían en el punto de llamada. Solo tras cambiar a un único `await` esas instrucciones se metieron dentro del modal.

overlay-kit llegó al mismo lugar y luego dio un paso más: pone también en el punto de llamada qué se muestra. Creo que esa interfaz se lee bien. Y, al escribir esto, aprendí cuánto cuesta ese paso.

**Era la diferencia entre tratar un modal como una función y tratarlo como datos.** Escribir JSX en el punto de llamada convierte al controlador en un closure, y el contenido de un closure no se puede cambiar desde fuera una vez guardado. De esa estructura sale el JSX ignorado al reabrir con el mismo id. Tratarlo con una clave de texto convierte al modal en un valor guardado en un store que puedes reemplazar, actualizar y dividir en chunks, pero quien llama solo llega a conocer un nombre.

Creo que la sensación de que te gusta la interfaz de una librería es una señal bastante fiable. Aun así, conviene poner en palabras al menos una vez a qué apunta exactamente esa sensación. Si no lo haces, no puedes distinguir si lo que te gustó fue la interfaz o la reputación de quienes usan la librería. Animo a quien lea esto a hacer ese ejercicio una vez con alguna librería que esté usando ahora mismo.

:::ref
[docs] [Documentación oficial de overlay-kit](https://overlay-kit.slash.page/)
[repo] [desko27/react-call](https://github.com/desko27/react-call)
:::
