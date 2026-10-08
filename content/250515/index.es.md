---
emoji: ⏱️
title: "Por qué React usa MessageChannel"
seoTitle: "Por qué React usa MessageChannel y no requestIdleCallback"
date: "2025-05-15"
updatedAt: "2026-10-08"
categories: frontend React
locale: es
translationOf: '250515'
sourceHash: f9e36a7b0a0e10bfe8dc30ec353c2703fbf8e586fb8ce86dccf0c23a712b3454
description: "Por qué el Scheduler de React usa MessageChannel y no requestIdleCallback, rAF ni setTimeout: los PR de React y el retraso de 4 ms medido en Chrome."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4 ms, cómo funciona el scheduler de React, shouldYieldToHost, requestAnimationFrame, React Fiber"
---

En esta entrada quiero hablar de **por qué React programa su trabajo con MessageChannel en lugar de requestIdleCallback**.

Está pensada para desarrolladores frontend que, estudiando Fiber, leyeron que React «trabaja un poco cada vez que el navegador está ocioso» y luego se confundieron al encontrar `MessageChannel` en el código fuente real de React. Adelanto la respuesta: `requestIdleCallback` no se llamaba con la frecuencia que React necesitaba, y `setTimeout` añade un retraso de más de 4 ms cuando las llamadas se anidan. Por eso el paquete Scheduler de React usa `MessageChannel`, que en el navegador permite programar la siguiente macrotask sin ningún retraso artificial. Cuánto pesan en realidad esos 4 ms lo compruebo con números medidos en Chrome headless.


## Métodos de programación descartados

Al explicar el concepto de Fiber se suele usar código que reparte el trabajo con `requestIdleCallback`. Es un modelo en el que se procesa una unidad de trabajo cada vez que el navegador no tiene nada que hacer. React también usó esta API al principio, y pasó por varios PR hasta llegar a su forma actual.

- **Enero de 2017**: React usaba el `requestIdleCallback` nativo y, en los navegadores que no lo tenían, un polyfill que lo imitaba con `requestAnimationFrame` y `postMessage` ([PR #8833](https://github.com/facebook/react/pull/8833)). Los navegadores sin esta API, como Safari, quedaron a cargo del polyfill desde el principio. La versión estable de Safari [sigue sin tener esta API en octubre de 2026](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback#browser_compatibility).
- **Marzo y abril de 2018**: se añadió un flag para usar el polyfill aunque existiera la API nativa. Andrew Clark escribió en la descripción del PR que el objetivo era probar si el polyfill reducía los problemas de starvation (trabajo que no consigue turno para ejecutarse y se pospone una y otra vez) que venían observando, y añadió que era difícil asegurarlo porque esos problemas costaban de reproducir ([PR #12385](https://github.com/facebook/react/pull/12385)). Un mes después, tras concluir internamente que funcionaba mejor que la implementación nativa, se eliminó el flag y el polyfill quedó como definitivo ([PR #12648](https://github.com/facebook/react/pull/12648)).
- **Noviembre de 2018**: el evento message que el polyfill enviaba a `window` pasó a enviarse por un `MessageChannel`. Si se envía a `window`, todos los demás manejadores de message de la página también se ejecutan en cada frame ([PR #14234](https://github.com/facebook/react/pull/14234)).
- **Julio de 2019**: en lugar de adivinar el siguiente vsync y ceder al final del frame, un flag experimental introdujo un bucle que trabaja 5 ms dentro de un evento message y luego cede ([PR #16214](https://github.com/facebook/react/pull/16214)). Este bucle no usa `requestAnimationFrame` en absoluto.
- **Agosto y noviembre de 2019**: en agosto llegó un informe según el cual las pruebas de rendimiento mostraban mejor uso de CPU con el bucle de mensajes ([PR #16271](https://github.com/facebook/react/pull/16271), no fusionado), y en noviembre se eliminó la implementación con rAF ([PR #17252](https://github.com/facebook/react/pull/17252)).

Por qué se produce la starvation puede deducirse de la propia definición de `requestIdleCallback`. La [especificación del W3C](https://w3c.github.io/requestidlecallback/) deja que el navegador decida qué es un periodo de inactividad (idle period) y pone como uno de sus ejemplos el tiempo sobrante entre un frame y el siguiente. Durante una animación esos periodos llegan a menudo, pero en una pantalla de 60 Hz suelen durar menos de 16 ms. Si el hilo principal está ocupado con tareas largas, incluso esos se reducen, y a mi juicio el trabajo de React se pospone en la misma medida. Dan Abramov también escribió en un comentario de agosto de 2018 que React dejó de usar esta API porque «it's not as aggressive as we need» ([facebook/react#11171](https://github.com/facebook/react/issues/11171#issuecomment-417349573)).

Los motivos para abandonar después el enfoque con `requestAnimationFrame` están en la descripción del PR #16214. Ese enfoque tenía que adivinar cuándo llegaría el siguiente vsync (la señal ligada al ciclo de refresco de la pantalla). Empezaba suponiendo 30 fps, con una duración de frame de 33,33 ms, y cuando dos intervalos consecutivos entre frames eran ambos más cortos, reducía la duración del frame al mayor de los dos. El plazo del frame actual era la hora de inicio del frame más esa duración ([SchedulerHostConfig.default.js justo antes del PR #17252](https://github.com/facebook/react/blob/6dc2734b41aef944e457eaa23ae218952fce0a54/packages/scheduler/src/forks/SchedulerHostConfig.default.js#L123-L336)). Como su única regla reducía la duración, detectaba si la tasa de refresco subía después de cargar la página, pero no si bajaba, tal como dice el PR.

El bucle de mensajes cede cada 5 ms esté donde esté en el ciclo de vsync. La descripción del PR esperaba que así el hilo principal mantuviera su capacidad de respuesta incluso en pantallas con tasas de refresco muy altas («should keep the main thread responsive»). El mismo PR señalaba también el riesgo de que ceder más a menudo aumentara la competencia con otras tareas del navegador, y que no estaba claro cuánto se limitan los eventos message en una pestaña en segundo plano. El comentario actual del código del Scheduler dice que la mayoría de las tareas no necesitan alinearse con los límites de frame.

## MessageChannel

El mecanismo de programación que quedó tras retirar rAF es **MessageChannel**. Abajo están las [líneas 530 a 561 de Scheduler.js](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/forks/Scheduler.js#L530-L561) en React v19.3.0, con los comentarios recortados.

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

Hay tres ramas. Los navegadores actuales no tienen `setImmediate`, así que se toma la segunda rama, `MessageChannel`. Según el comentario del código, la primera rama existe para Node.js y el antiguo IE, y `MessageChannel` impide que un proceso de Node.js termine, mientras que `setImmediate` no ([facebook/react#20756](https://github.com/facebook/react/issues/20756)). Por eso el entorno node de Jest toma la ruta de `setImmediate`. Desde Jest 27, al entorno jsdom se le quitó `setImmediate` de sus globales ([jestjs/jest#11222](https://github.com/jestjs/jest/pull/11222)) y tampoco tiene `MessageChannel`, así que toma la ruta de `setTimeout`.

El propósito de programar así el siguiente turno es devolver el hilo principal al navegador. Mientras JavaScript ocupa el hilo principal, el navegador no puede procesar entradas ni pintar la pantalla. Sin embargo, solo ceden a mitad de camino los renders divididos en el tiempo, como los de Transition y Retry. El Reconciler de React v19.3.0 renderiza hasta el final sin ceder si el render incluye una blocking lane como Sync, InputContinuous o Default, incluye una lane que esperó tanto que caducó, o se llamó con `forceSync` ([línea 1168 de ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L1168)).

En esos renders, el Reconciler pregunta `shouldYield()` cada vez que procesa un Fiber ([líneas 3073 a 3078 de ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/v19.3.0/packages/react-reconciler/src/ReactFiberWorkLoop.js#L3073-L3078)). Esa función la exporta el Scheduler, y la decisión real la toma `shouldYieldToHost()` dentro del Scheduler. El criterio es el tiempo transcurrido desde que empezó la tarea de mensaje actual. Cuando ese tiempo alcanza `frameInterval`, cede, y si se llamó a `requestPaint()` después de un commit, cede sin importar el tiempo. El valor inicial de `frameInterval` es la constante de `SchedulerFeatureFlags.js` llamada `frameYieldMs`, es decir, **5 ms** ([línea 11](https://github.com/facebook/react/blob/v19.3.0/packages/scheduler/src/SchedulerFeatureFlags.js#L11)). Los 5 ms no son el tamaño de un fragmento de trabajo sino el umbral de tiempo para comprobar si hay que ceder. Si renderizar un solo componente tarda 20 ms, esos 20 ms no se dividen. Todo esto describe la build stable. En las builds experimental, `enableAlwaysYieldScheduler` del mismo archivo está activado, así que el Scheduler cede al navegador en cuanto termina una tarea, salvo que la siguiente ya haya caducado, en lugar de agotar los 5 ms, y no atiende la señal de `requestPaint()`.

## El retraso de 4 ms de setTimeout

¿Por qué no `setTimeout`, sino `MessageChannel`, para programar el siguiente fragmento después de ceder? Los [pasos de inicialización de temporizadores](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps) de la especificación HTML elevan a 4 ms el retraso de un `setTimeout` cuyo nivel de anidamiento supera 5 si es menor que eso. Al medir en Chrome headless una cadena en la que `setTimeout(fn, 0)` se vuelve a programar a sí mismo, los intervalos de las llamadas 1 a 6 fueron de 0 a 0,1 ms, y a partir de la 7.ª se añadieron de 4 a 5 ms (normalmente unos 5 ms). Los mensajes de un `MessageChannel` no tienen ese retraso mínimo. Un mensaje simplemente entra en la cola de tareas, así que el navegador puede intercalar el procesamiento de entradas o el renderizado entre medias, y ese hueco es justo lo que busca el Scheduler.

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

Estos son los resultados de ejecutar tres variantes ocho veces cada una el 2026-10-08 en Chrome 154.0.8037.98 (headless) sobre macOS. No se midió en Safari ni en Firefox. La tercera fila de la tabla sustituye `busy(5); done += 5;` por `busy(200); done += 200;` para no dividir el trabajo.

| Cómo se programa el siguiente fragmento | Tiempo hasta terminar | Frames dibujados mientras tanto |
|---|---|---|
| `MessageChannel` | 201 ms | 12 a 13 |
| `setTimeout(work, 0)` | unos 365 a 371 ms | 21 a 22 |
| Sin dividir | 200 ms | 0 |

Con `setTimeout`, después de las seis primeras llamadas cada fragmento ganó de 4 a 5 ms de tiempo muerto, y el mismo trabajo tardó unas 1,8 veces más. Las cifras varían según la máquina y la carga, pero la proporción de unas 1,8 veces se mantuvo en las repeticiones. El mayor número de frames se debe a que el trabajo terminó tarde y el intervalo medido se alargó. No significa mejor capacidad de respuesta. Sin dividir, el trabajo termina en 200 ms, pero durante ese tiempo no se dibuja ni un solo frame. `MessageChannel` terminó el trabajo en los mismos 200 ms y siguió produciendo frames, por lo general a unos 60 fps.


## Conclusión

En resumen, lo que React necesitaba no era una API que esperara a que el navegador estuviera ocioso, sino una que le permitiera trabajar un rato breve y programar enseguida su siguiente turno. `requestIdleCallback` no se llamaba con la insistencia que React necesitaba; el enfoque con `requestAnimationFrame` tenía que adivinar cuándo llegaría el vsync; y `setTimeout`, una vez anidado, hacía descansar cada fragmento más de 4 ms. `MessageChannel` es lo que cumplió esas condiciones.

Cómo son los nodos Fiber, las unidades de trabajo que este Scheduler reparte, y cómo los recorre el Work Loop lo trato en [React Fiber al completo](/250520). Ojalá que, la próxima vez que encuentres `MessageChannel` en el código fuente de React, recuerdes por un momento por qué está ahí.


## Referencias

:::ref
- [repo] [ReactDOMFrameScheduling.js de React 16.0.0](https://github.com/facebook/react/blob/v16.0.0/src/renderers/shared/ReactDOMFrameScheduling.js)
:::
