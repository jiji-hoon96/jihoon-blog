---
emoji: ⏱️
title: "Por qué React usa MessageChannel"
seoTitle: "Por qué React usa MessageChannel y no requestIdleCallback"
date: "2025-05-15"
categories: frontend React
locale: es
translationOf: '250515'
sourceHash: bfb181318a2adf0a9dd6422a287895eff5a1b654aab1a204bbdc1eba1ec1808c
description: "Por qué el Scheduler de React pasó de requestIdleCallback, requestAnimationFrame y setTimeout a MessageChannel: frecuencia, soporte y el retraso de 4 ms."
keywords: "requestIdleCallback, MessageChannel, React Scheduler, setTimeout 4 ms, cómo funciona el scheduler de React, shouldYieldToHost, requestAnimationFrame, React Fiber"
---

En esta entrada quiero hablar de **por qué React programa su trabajo con MessageChannel en lugar de requestIdleCallback**.

Está pensada para desarrolladores frontend que, estudiando Fiber, leyeron que React «trabaja un poco cada vez que el navegador está ocioso» y luego se confundieron al encontrar `MessageChannel` en el código fuente real de React. Adelanto la respuesta: `requestIdleCallback` se llama con demasiada poca frecuencia y se comportaba distinto en cada navegador, y `setTimeout` añade un retraso de 4 ms cuando las llamadas se anidan. Por eso el paquete Scheduler de React usa `MessageChannel`, que permite programar la siguiente macrotask sin ese retraso.


## Por qué se descartó requestIdleCallback

Al explicar el concepto de Fiber se suele usar código que reparte el trabajo con `requestIdleCallback`. Es un modelo en el que se procesa una unidad de trabajo cada vez que el navegador no tiene nada que hacer. Sin embargo, React no lo usa en la práctica. Hay tres motivos.

- **Frecuencia de llamada demasiado baja**: solo se invoca durante auténticos «periodos de inactividad —cuando el navegador no tiene nada que hacer—», por lo que en una página ocupada el trabajo de React podría posponerse indefinidamente. Dan Abramov también señaló que «requestIdleCallback is called too infrequently to be useful for scheduling React work».
- **Problemas de compatibilidad entre navegadores**: Safari tardó mucho en implementarlo y su comportamiento variaba entre navegadores.
- **Límite superior de 20 ms**: el idle deadline tiene un límite máximo que impide a React controlar los tiempos con la previsibilidad que necesita.

Después se probó un enfoque basado en `requestAnimationFrame` y la estimación del presupuesto de cada frame. Sin embargo, también se abandonó al concluir que el trabajo de React no necesitaba ajustarse al ciclo de vsync —la técnica que sincroniza la salida de frames con el momento en que el monitor completa el barrido vertical—.

## MessageChannel

Finalmente, React eligió **MessageChannel**.

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

¿Por qué no `setTimeout`, sino `MessageChannel`? Según la especificación HTML, cuando `setTimeout` se anida cinco veces o más se impone un **retraso mínimo de 4 ms**. `MessageChannel`, en cambio, se ejecuta inmediatamente como macrotask en el siguiente tick del event loop sin esta limitación. Para Fiber, que divide el trabajo en unidades de 5 ms, una demora artificial de 4 ms sería fatal.

`shouldYieldToHost()` del Scheduler comprueba si el tiempo transcurrido desde el inicio del trabajo supera `frameInterval` —**5 ms** por defecto, definido en `SchedulerFeatureFlags.js`— y decide si debe devolver el control al hilo principal.


## Conclusión

En resumen, lo que React necesitaba no era una API que esperara a que el navegador estuviera ocioso, sino una que le permitiera trabajar un rato breve y programar enseguida su siguiente turno. `requestIdleCallback` se llamaba demasiado poco, `requestAnimationFrame` quedaba atado a un ciclo de vsync al que el trabajo de React no necesitaba ajustarse y `setTimeout` añadía un retraso de 4 ms. `MessageChannel` es lo que cumplió esas condiciones.

Cómo son los nodos Fiber, las unidades de trabajo que este Scheduler reparte, y cómo los recorre el Work Loop lo trato en [React Fiber al completo](/250520). Ojalá que, la próxima vez que encuentres `MessageChannel` en el código fuente de React, recuerdes por un momento por qué está ahí.


## Fuentes

:::ref
- [repo] [Código fuente de React, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [docs] [WHATWG, HTML Standard, Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
:::
