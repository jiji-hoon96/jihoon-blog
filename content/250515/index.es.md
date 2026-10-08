---
emoji: ⏱️
title: "Por qué React usa MessageChannel"
seoTitle: "Por qué React usa MessageChannel y no requestIdleCallback"
date: "2025-05-15"
updatedAt: "2026-10-08"
categories: frontend React
locale: es
translationOf: '250515'
sourceHash: 2886d1f79bf522f36c50fa641be933949b9f29244460f6f2da25323d88f63148
description: "Por qué el Scheduler de React usa MessageChannel y no requestIdleCallback, rAF ni setTimeout: los PR de React y el retraso de 4 ms medido en Chrome."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4 ms, cómo funciona el scheduler de React, shouldYieldToHost, requestAnimationFrame, React Fiber"
---

En esta entrada quiero hablar de **por qué React programa su trabajo con MessageChannel en lugar de requestIdleCallback**.

Está pensada para desarrolladores frontend que, estudiando Fiber, leyeron que React «trabaja un poco cada vez que el navegador está ocioso» y luego se confundieron al encontrar `MessageChannel` en el código fuente real de React. Adelanto la respuesta: `requestIdleCallback` no se llamaba con la frecuencia que React necesitaba, y `setTimeout` añade un retraso de más de 4 ms cuando las llamadas se anidan. Por eso el paquete Scheduler de React usa `MessageChannel`, que en el navegador permite programar la siguiente macrotask sin ningún retraso artificial. Cuánto pesan en realidad esos 4 ms lo compruebo con números que medí yo mismo en Chrome.


## Por qué se descartó requestIdleCallback

Al explicar el concepto de Fiber se suele usar código que reparte el trabajo con `requestIdleCallback`. Es un modelo en el que se procesa una unidad de trabajo cada vez que el navegador no tiene nada que hacer. React también usó esta API al principio, y pasó por varios PR hasta llegar a su forma actual.

- **Enero de 2017**: React usaba el `requestIdleCallback` nativo y, en los navegadores que no lo tenían, un polyfill que lo imitaba con `requestAnimationFrame` y `postMessage` ([PR #8833](https://github.com/facebook/react/pull/8833)). Los navegadores sin esta API, como Safari, quedaron a cargo del polyfill desde el principio. La versión estable de Safari [sigue sin tener esta API en octubre de 2026](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility).
- **Marzo y abril de 2018**: se añadió un flag para usar el polyfill aunque existiera la API nativa. Andrew Clark dio como motivo en la descripción del PR los problemas de starvation (trabajo que no consigue turno para ejecutarse y se pospone una y otra vez) que venían observando ([PR #12385](https://github.com/facebook/react/pull/12385)). Un mes después se eliminó el flag y el polyfill quedó como definitivo ([PR #12648](https://github.com/facebook/react/pull/12648)).
- **Julio de 2019**: en lugar de adivinar el siguiente vsync y ceder al final del frame, un flag experimental introdujo un bucle que trabaja 5 ms dentro de un evento message y luego cede ([PR #16214](https://github.com/facebook/react/pull/16214)). Este bucle no usa `requestAnimationFrame` en absoluto.
- **Noviembre de 2019**: tras un informe según el cual las pruebas de rendimiento mostraban mejor uso de CPU con el bucle de mensajes ([PR #16271](https://github.com/facebook/react/pull/16271)), se eliminó la implementación con rAF ([PR #17252](https://github.com/facebook/react/pull/17252)).

La starvation nace de la propia definición de `requestIdleCallback`. La [especificación del W3C](https://w3c.github.io/requestidlecallback/) establece que el callback se invoca durante el periodo de inactividad (idle period) que queda después de que el navegador termina el trabajo del frame. En una página ocupada esos periodos llegan pocas veces, y el trabajo de React se pospone en la misma medida. Dan Abramov también escribió en un comentario de agosto de 2018 que React dejó de usar esta API porque «it's not as aggressive as we need» ([facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)).

Los motivos para abandonar después el enfoque con `requestAnimationFrame` están en la descripción del PR #16214. Ese enfoque tenía que adivinar cuándo llegaría el siguiente vsync (la señal ligada al ciclo de refresco de la pantalla), y detectaba si la tasa de refresco subía después de cargar la página, pero no si bajaba. El bucle de mensajes cede cada 5 ms esté donde esté en el ciclo de vsync, así que puede mantener la capacidad de respuesta del hilo principal incluso en pantallas de alta tasa de refresco. El comentario actual del código del Scheduler también dice que la mayoría de las tareas no necesitan alinearse con los límites de frame.

## MessageChannel

Finalmente, React eligió **MessageChannel**. Abajo están las [líneas 530 a 562 de Scheduler.js](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L562) en React v19.3.0, con los comentarios recortados.

```js
let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
  // Node.js and old IE.
  schedulePerformWorkUntilDeadline = () => {
    localSetImmediate(performWorkUntilDeadline);
  };
} else if (typeof MessageChannel !== 'undefined') {
  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // We should only fallback here in non-browser environments.
  schedulePerformWorkUntilDeadline = () => {
    localSetTimeout(performWorkUntilDeadline, 0);
  };
}
```

Hay tres ramas. Los navegadores actuales no tienen `setImmediate`, así que se toma la segunda rama, `MessageChannel`. La primera rama existe para Node.js y jsdom. Según el comentario del código, `MessageChannel` impide que un proceso de Node.js termine, mientras que `setImmediate` no ([facebook/react#20756](https://github.com/facebook/react/issues/20756)). Por eso, si sigues el Scheduler en Jest, no recorres la ruta de `MessageChannel` sino la de `setImmediate`.

El propósito de programar así el siguiente turno es devolver el hilo principal al navegador. Mientras JavaScript ocupa el hilo principal, el navegador no puede procesar entradas ni pintar la pantalla. Por eso el Reconciler pregunta `shouldYield()` cada vez que procesa un Fiber ([líneas 3073 a 3078 de ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)). `shouldYieldToHost()` del Scheduler, que da la respuesta, comprueba si el tiempo transcurrido desde que empezó la tarea de mensaje actual supera `frameInterval`. Ese valor se inicializa con la constante de `SchedulerFeatureFlags.js` llamada `frameYieldMs`, es decir, **5 ms** ([línea 11](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)). Los 5 ms no son el tamaño de un fragmento de trabajo sino el umbral de tiempo para comprobar si hay que ceder. Si renderizar un solo componente tarda 20 ms, esos 20 ms no se dividen.

## El retraso de 4 ms de setTimeout

¿Por qué no `setTimeout`, sino `MessageChannel`, para programar el siguiente fragmento después de ceder? Los [pasos de inicialización de temporizadores](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps) de la especificación HTML elevan a 4 ms el retraso de un `setTimeout` cuyo nivel de anidamiento supera 5 si es menor que eso. Cuando medí en Chrome una cadena en la que `setTimeout(fn, 0)` se vuelve a programar a sí mismo, los intervalos de las llamadas 1 a 6 fueron de 0 a 0,1 ms, y a partir de la 7.ª se añadieron de 4,4 a 4,6 ms. Los mensajes de un `MessageChannel` no tienen ese retraso mínimo. Un mensaje simplemente entra en la cola de tareas, así que el navegador puede intercalar el procesamiento de entradas o el renderizado entre medias, y ese hueco es justo lo que busca el Scheduler.

4 ms parecen poco, pero en un bucle que cede cada 5 ms la historia cambia. Dividí 200 ms de trabajo en 40 fragmentos de 5 ms y programé el siguiente fragmento con `MessageChannel` y con `setTimeout(work, 0)`. Si lo pegas en la consola de DevTools, funciona tal cual.

```js
function busy(ms) { const s = performance.now(); while (performance.now() - s < ms) {} }
const ch = new MessageChannel();
let done = 0, frames = 0;
const raf = () => { frames++; if (done < 200) requestAnimationFrame(raf); };
const start = performance.now();
const work = () => {
  busy(5); done += 5;
  if (done < 200) schedule();
  else console.log(Math.round(performance.now() - start), 'ms,', frames, 'frames');
};
ch.port1.onmessage = work;
const schedule = () => ch.port2.postMessage(null); // setTimeout(work, 0) 로 바꿔 비교
requestAnimationFrame(raf);
schedule();
```

Estos son los resultados de ejecutar tres variantes tres veces cada una el 2026-10-08 en Chrome 154.0.8037.98 (headless) sobre macOS. La tercera fila de la tabla sustituye `busy(5); done += 5;` por `busy(200); done += 200;` para no dividir el trabajo.

| Cómo se programa el siguiente fragmento | Tiempo hasta terminar | Frames dibujados mientras tanto |
|---|---|---|
| `MessageChannel` | 200 ms | 12 a 13 |
| `setTimeout(work, 0)` | 353 a 354 ms | 21 |
| Sin dividir | 200 ms | 0 |

Con `setTimeout`, a partir de las seis primeras llamadas cada fragmento ganó unos 4,5 ms de tiempo muerto, y el mismo trabajo tardó unas 1,8 veces más. El mayor número de frames se debe a que el trabajo terminó tarde y el intervalo medido se alargó. No significa mejor capacidad de respuesta. Sin dividir, el trabajo termina en 200 ms, pero durante ese tiempo no se dibuja ni un solo frame. `MessageChannel` terminó el trabajo en los mismos 200 ms y siguió produciendo frames a unos 60 fps. No medí en Safari ni en Firefox.


## Conclusión

En resumen, lo que React necesitaba no era una API que esperara a que el navegador estuviera ocioso, sino una que le permitiera trabajar un rato breve y programar enseguida su siguiente turno. `requestIdleCallback` solo se llamaba en periodos de inactividad, de modo que el trabajo de React se posponía; el enfoque con `requestAnimationFrame` tenía que adivinar cuándo llegaría el vsync; y `setTimeout`, una vez anidado, hacía descansar cada fragmento más de 4 ms. `MessageChannel` es lo que cumplió esas condiciones.

Cómo son los nodos Fiber, las unidades de trabajo que este Scheduler reparte, y cómo los recorre el Work Loop lo trato en [React Fiber al completo](/250520). Ojalá que, la próxima vez que encuentres `MessageChannel` en el código fuente de React, recuerdes por un momento por qué está ahí.


## Fuentes

:::ref
- [repo] [ReactDOMFrameScheduling.js justo antes de React 16.0](https://github.com/facebook/react/blob/3019210df2b486416ed94d7b9becffaf254e81c4/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
