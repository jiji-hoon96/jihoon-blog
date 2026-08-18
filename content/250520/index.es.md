---
emoji: ⚛️
title: 'React Fiber al completo'
seoTitle: 'React Fiber al completo — análisis de su arquitectura y del renderizado concurrente'
date: '2025-05-20'
categories: 프론트엔드 React
locale: es
translationOf: '250520'
sourceHash: da152b27d26e4621cb1e554cd3d68e531f794e86f395ef9ee35e851f1f0aeff8
description: "Análisis profundo de la arquitectura de React Fiber a partir del código fuente de React: desde Stack Reconciler hasta la prioridad por Lanes, el doble búfer, el scheduler basado en MessageChannel y las Concurrent Features. Un tema habitual en entrevistas de frontend."
keywords: "React Fiber, arquitectura de React Fiber, Stack Reconciler, Concurrent Mode, concurrencia en React 18, useTransition, useDeferredValue, Suspense, renderizado de React, análisis del código fuente de React, Virtual DOM, Reconciliation, prioridad por Lanes, entrevista de frontend"
---

En este artículo quiero hablar de la **arquitectura Fiber**, que podría considerarse el corazón de React.

Cuando conocí React, la palabra **"Fiber"** me sonaba poco más que a una pregunta habitual de entrevista. Memorizar una definición de una línea —«dividir el renderizado en unidades de trabajo y procesarlas por separado»— me parecía suficiente. Sin embargo, al empezar a examinar el código fuente de React, comprendí que Fiber no era un simple concepto, sino una arquitectura de runtime que gobierna **todo** el renderizado de React.

> Todavía recuerdo el impacto de abrir por primera vez el código fuente de React. Pensé: «Pero... ¿qué es todo esto?».

En este artículo iré más allá de responder «divide el trabajo en unidades y las procesa» a la pregunta «¿qué es Fiber?». Analizaré en profundidad **por qué** nació, **cómo** está diseñado y **cómo** esa estructura hace posibles las Concurrent Features de React.


## ¿Por qué apareció Fiber?

Para responder a esta pregunta, primero hay que entender qué problemas tenía el mundo anterior a Fiber: el **Stack Reconciler** utilizado hasta React 15.

Como indica su nombre, Stack Reconciler era un motor de reconciliación basado en llamadas **recursivas (recursive)**. Recorría el árbol de componentes de arriba abajo de forma recursiva y, una vez iniciado el renderizado, no podía detenerse hasta procesar el árbol completo. Era como estar en una llamada telefónica que no puedes cortar hasta que la otra persona termine de hablar. (Imagina que empieza a contarte sus problemas durante tres horas y no puedes interrumpirla. Terrible).

En concreto, Stack Reconciler presentaba las siguientes limitaciones.

- **Imposibilidad de interrumpir el renderizado**: al tener que procesar todo el árbol de una vez, en interfaces complejas el hilo principal quedaba ocupado durante decenas o cientos de milisegundos
- **Ausencia de prioridades**: tanto si el usuario hacía clic en un botón como si se actualizaban datos en segundo plano, todas las actualizaciones se procesaban de la misma manera
- **Dificultad para responder a animaciones y gestos**: mantener 60 fps exige completar todo el trabajo de cada frame en unos 16 ms, algo que el renderizado recursivo no podía garantizar
- **Detención de toda la aplicación ante un error**: si se producía un error en algún punto del árbol de componentes, toda la aplicación se detenía

Para superar estas limitaciones, el equipo de React ideó un nuevo modelo de ejecución capaz de **dividir** el trabajo, **asignarle prioridades** y, cuando fuera necesario, **interrumpirlo y reanudarlo**. El resultado fue **React Fiber**.

El documento [react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture), escrito por Andrew Clark, recoge las ideas centrales de este diseño y es la referencia más importante para entender Fiber. (Parece que se incorporó al equipo de React poco después de escribirlo).


## Stack vs Fiber

Entonces, ¿en qué se diferencian Stack Reconciler y Fiber Reconciler a nivel de código?

### Stack Reconciler basado en recursión

```jsx
function renderComponent(component) {
  const element = component.render();
  element.props.children.forEach(child => renderComponent(child)); // 재귀 호출
}
```

Con el enfoque Stack, al encontrar un componente hijo se entra **inmediatamente en una llamada recursiva**. El problema es que depende directamente del call stack de JavaScript. A medida que aumenta la profundidad de la recursión, se acumulan frames en el call stack y, hasta que todos se resuelven, el hilo principal del navegador no puede hacer ninguna otra cosa.

Dicho de forma sencilla, el navegador queda **completamente inmovilizado** hasta que se vacía el call stack.

<video width="640" height="480" controls>
  <source src="/content/250520/stack.mov" type="video/mp4">
</video>

En el vídeo se observa cómo el hilo principal queda totalmente bloqueado mientras Stack Reconciler renderiza.


### Fiber Reconciler basado en iteración

Fiber sustituyó la recursión por un **bucle iterativo (iterative loop)**. En lugar de usar el call stack, implementó su propia **pila virtual** en memoria. Cada nodo Fiber actúa como un «frame de la pila» y, dado que estos nodos existen como objetos de JavaScript en la memoria heap, el trabajo puede interrumpirse en cualquier momento y continuar más tarde.

```jsx
function performWork(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 5) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  requestIdleCallback(performWork); // 나눠서 실행
}
```

Este código muestra el modelo conceptual inicial de Fiber. La clave consiste en procesar una sola unidad de trabajo (unit of work) cada vez dentro del bucle `while` y, si queda poco tiempo, salir del bucle para devolver el control al navegador.

(Al principio se planteó un enfoque basado en `requestIdleCallback`, pero React no lo utiliza en la práctica. Más adelante veremos el motivo en detalle).

<video width="640" height="480" controls>
  <source src="/content/250520/fiber.mov" type="video/mp4">
</video>

Con Fiber se puede responder de inmediato a eventos del usuario —clics, escritura, etc.— incluso durante el renderizado. Al ejecutar el trabajo en fragmentos pequeños, el navegador tiene margen para respirar.

Si quieres experimentar directamente la diferencia entre ambos enfoques, haz clic **<a href="https://animated-lollipop-2b6cbb.netlify.app/" target="_blank" rel="noopener noreferrer">aquí</a>**. Podrás observar con tus propios ojos cómo se comportan Stack Reconciler y Fiber Reconciler.

Estos son precisamente los objetivos fundamentales de Fiber que Andrew Clark destacó en su documento.

- **Poder pausar el trabajo y retomarlo más tarde**
- **Asignar prioridades a distintos tipos de trabajo**
- **Reutilizar trabajo completado anteriormente**
- **Abortar trabajo que ya no sea necesario**


## Estructura interna de un nodo Fiber

Al llegar hasta aquí surge una pregunta natural: «Entonces, ¿cómo es un nodo Fiber por dentro?».

El equipo de React no ofrece documentación oficial específica sobre la implementación interna de Fiber. Sin embargo, podemos comprender su estructura mediante el documento react-fiber-architecture de Andrew Clark y el código fuente real de React (`ReactFiber.js`).

Me gusta comparar un nodo Fiber con una **orden de trabajo (Work Order)**. Cuando se ensambla un producto en una fábrica, cada orden indica «qué tipo de pieza es», «qué materiales utiliza», «qué trabajo hay que realizar después» y «qué prioridad tiene». Un nodo Fiber funciona del mismo modo.


### ReactElement y FiberNode

Para entender Fiber, primero hay que distinguir entre **ReactElement** y **FiberNode**. Aunque suelen confundirse, son entidades completamente diferentes.

```ts
// ReactElement — React.createElement()가 반환하는 가벼운 객체
export interface ReactElement {
  type: string | Function; // 문자열(HTML 태그) 또는 함수(컴포넌트)
  props: {
    [key: string]: any;
    children: ReactElement[];
  };
  key: string | null;
  ref: any;
  _owner: FiberNode | null;
}
```

ReactElement no es más que el **plano** de la UI. Es una solicitud que dice «renderiza este componente con estas props»; no contiene la lógica real de renderizado ni el estado.

En cambio, **FiberNode** es la **unidad de trabajo de runtime** que React crea internamente a partir de ese plano. Aquí aparecen campos que ReactElement no tiene, como `tag`, `stateNode`, `child/sibling/return`, `memoizedState`, `updateQueue` y `lanes`.

Cuando React examina el `type` de un ReactElement para crear un FiberNode, determina el valor de **tag**.

- Si `type` es una función y tiene `prototype.isReactComponent` → `tag = ClassComponent(1)`
- Si `type` es una función → `tag = FunctionComponent(0)`
- Si `type` es una cadena (`"div"`, etc.) → `tag = HostComponent(5)`


**tag** es una constante numérica que representa el tipo de FiberNode. Está definida en `ReactWorkTags.js` y existen más de 25 tags, entre ellos `FunctionComponent(0)`, `ClassComponent(1)`, `HostRoot(3)`, `HostComponent(5)` y `HostText(6)`. React utiliza este valor tag para decidir qué lógica ejecutar en `beginWork`.


**type** desempeña un papel esencial durante la reconciliación (reconciliation). Al comparar el Fiber del renderizado anterior con el nuevo elemento, es **lo primero que React comprueba**. (Este valor se transfiere sin cambios del ReactElement al FiberNode).

- Si antes era un `div` y ahora también es un `div`, React **reutiliza** ese nodo Fiber y solo actualiza sus props
- Si antes era un `div` y ahora ha cambiado a un `span`, React **descarta** el Fiber anterior y crea uno nuevo

**key** también se transfiere del ReactElement al FiberNode y se utiliza principalmente al renderizar listas (arrays). Sin key, cuando cambia el orden de los elementos de una lista, React no puede saber con precisión qué elemento se ha movido y adónde. Esto puede provocar operaciones innecesarias sobre el DOM o hacer que el estado interno de un componente se conserve o se pierda de forma involuntaria.


### child, sibling, return

Aquí reside el secreto que permite a React Fiber utilizar iteración en lugar de recursión.

```js
function 부모() {
  return [<자식1/>, <자식2/>];
}
```

**child** apunta al **primer** elemento hijo devuelto por el render del componente. En el ejemplo anterior, corresponde a `<자식1/>`. **sibling** representa el **siguiente hermano** que comparte el mismo padre. El sibling de `<자식1/>` es `<자식2/>`. **return** apunta al Fiber padre **al que hay que volver** cuando termina el procesamiento del nodo Fiber actual. Tanto `<자식1/>` como `<자식2/>` tienen a `부모` como return.

La estructura creada por estos tres campos es un **árbol en forma de lista simplemente enlazada (Singly Linked List)**. En un árbol convencional resulta intuitivo almacenar un array de hijos (`children[]`), pero Fiber lo evita deliberadamente.

¿Por qué? Una estructura de hijos basada en arrays exige gestionar un índice durante el recorrido y llevar un seguimiento adicional de «hasta dónde se había procesado» al interrumpirlo y reanudarlo. En cambio, con una linked list basta recordar la referencia al nodo actual para continuar el recorrido en cualquier momento. Esta es la base estructural que permite a Fiber admitir de manera natural la **interrupción y reanudación**.

React recorre los nodos en orden de búsqueda en profundidad (DFS) sobre esta estructura. Desciende siguiendo `child` (beginWork); al alcanzar un nodo hoja comprueba `sibling`; y, si no hay hermanos, asciende siguiendo `return` (completeWork).


### pendingProps y memoizedProps

**pendingProps** son las **props nuevas** recibidas cuando el Fiber comienza a procesarse, mientras que **memoizedProps** son las **props anteriores** cuyo procesamiento terminó en el renderizado previo.

Si ambos valores son iguales, React puede concluir que «este componente no ha cambiado» y reutilizar el resultado del renderizado anterior. Este es el mecanismo esencial de la **optimización por bailout**.

De forma similar, **memoizedState** almacena el estado de los hooks de ese Fiber, y **updateQueue** gestiona como una linked list las actualizaciones de estado todavía pendientes —las llamadas a setState—.


### stateNode

**stateNode** referencia la **instancia real** a la que apunta el nodo Fiber.

- Para un **HostComponent** (div, span, etc.): el nodo DOM real
- Para un **ClassComponent**: la instancia de la clase
- Para un **HostRoot**: el objeto FiberRoot

Este campo sirve de puente entre el mundo virtual de Fiber y el DOM real del navegador.


## Doble búfer: árbol current y árbol workInProgress

Un concepto esencial que no puede faltar al estudiar Fiber es el **doble búfer (Double Buffering)**.

Para entenderlo, pensemos en los gráficos de un videojuego. Si se dibujan píxeles directamente sobre la pantalla visible, el usuario puede ver un frame a medio dibujar, un fenómeno de **desgarro de imagen (tearing)**. Para evitarlo, los motores de juegos utilizan **dos búferes**. Dibujan por completo el siguiente frame en uno de ellos y, cuando está terminado, sustituyen de una vez el búfer que se muestra en pantalla.

React Fiber utiliza exactamente la misma estrategia.

```js
currentFiber.alternate === workInProgressFiber;
workInProgressFiber.alternate === currentFiber;
```

El **árbol current** es el árbol Fiber reflejado en la pantalla en ese momento: representa el estado de la UI que ve el usuario. El **árbol workInProgress** es el árbol Fiber que se prepara en segundo plano para el siguiente renderizado.

Ambos árboles se referencian entre sí mediante la propiedad `alternate`. Todos los cambios se realizan en el árbol workInProgress y, cuando el trabajo termina, los árboles se intercambian con una sola línea: `root.current = finishedWork`. El anterior workInProgress pasa a ser el nuevo current y el anterior current se recicla como workInProgress en el siguiente renderizado.

```js
function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // 최초 렌더: 새 Fiber를 생성하고 alternate를 연결
    workInProgress = createFiber(current.tag, pendingProps, current.key, current.mode);
    workInProgress.stateNode = current.stateNode; // DOM 노드는 공유!
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // 재렌더: 기존 alternate를 재사용, effect만 초기화
    workInProgress.pendingProps = pendingProps;
    workInProgress.flags = NoFlags;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }
  // lanes, child, memoizedState 등을 복사
  workInProgress.childLanes = current.childLanes;
  workInProgress.child = current.child;
  // ...
}
```

Detengámonos en el punto clave. `stateNode` —el nodo DOM real— se **comparte** entre current y workInProgress. En vez de crear un objeto Fiber desde cero en cada ocasión, React reutiliza el alternate existente y solo actualiza los campos modificados. Así puede construir el árbol de manera eficiente en cada renderizado sin añadir presión al recolector de basura (GC).

¿Y si no han cambiado las props ni el state? React puede omitir el subárbol completo mediante una **optimización por bailout**. Si el doble búfer de un juego optimiza por frames, el doble búfer de Fiber permite optimizar incluso **por componentes**.


## pendingWorkPriority => Lanes

Entonces, ¿cómo determina Fiber que «este trabajo es más importante»?

### Limitaciones de expirationTime

Las primeras versiones de Fiber empleaban una prioridad numérica llamada `pendingWorkPriority`, que más tarde evolucionó hacia un único número denominado `expirationTime`. Cuanto más próxima estaba la expiración, mayor era la prioridad, pero este enfoque tenía una limitación fundamental.

Un solo número no permitía una **clasificación flexible** del tipo «esta actualización pertenece al grupo A y aquella al grupo B». Por ejemplo, cuando una entrada del usuario y una actualización Transition ocurrían al mismo tiempo, el sistema basado en expirationTime solo podía clasificarlas comparando rangos (range), por lo que tenía dificultades para procesar selectivamente determinadas actualizaciones.

### Lane

Para resolver este problema, Andrew Clark introdujo el sistema de **Lanes** en la [PR #18796](https://github.com/facebook/react/pull/18796).

Para entender las Lanes, imaginemos una **autopista**. Una autopista tiene varios carriles (lanes), cada uno con una función distinta. El carril izquierdo sirve para adelantar —trabajo urgente—, otro para la circulación normal y el arcén para emergencias. Cada vehículo —una actualización— se asigna al carril correspondiente a sus características, y el sistema de gestión de la autopista —el scheduler— decide qué carril deja pasar primero.

Las Lanes de React funcionan igual. A cada actualización se le asigna **un bit (lane)** y, mediante operaciones bit a bit, se crean y comparan grupos.

```js
// 각 업데이트는 하나의 lane(단일 비트)을 가진다
const SyncLane =             /*  */ 0b0000000000000000000000000000010;
const InputContinuousLane =  /*  */ 0b0000000000000000000000000001000;
const DefaultLane =          /*  */ 0b0000000000000000000000000100000;
const TransitionLane1 =      /*  */ 0b0000000000000000000000100000000;
const IdleLane =             /*  */ 0b0001000000000000000000000000000;

// 배치(batch)는 여러 비트의 OR 조합이다
const SyncUpdateLanes = SyncLane | InputContinuousLane | DefaultLane;

// 특정 lane이 batch에 포함되는지 확인은 단순 비트 연산
const isIncluded = (lane & lanes) !== 0;
```

El diseño permite almacenar un total de 31 lanes en un entero de 31 bits para aprovechar la optimización **SMI (Small Integer)** del motor V8. V8 procesa los enteros de hasta 31 bits mediante pointer tagging, lo que permite operar directamente con ellos en la pila sin asignarlos en el heap. En las lanes principales, **cuanto más bajo es el bit, mayor es la prioridad**.

Gracias a esta estructura, React puede decidir qué trabajo procesar primero con una sola operación bit a bit. La función `getNextLanes()` selecciona en `pendingLanes` el grupo de lanes con mayor prioridad, omite las lanes suspendidas (suspended) y reintenta primero las lanes que ya han recibido datos (pinged), lo que permite una planificación sofisticada.

Además, para evitar la **inanición (starvation)**, cada lane recibe un tiempo de expiración. Sync/InputContinuous se añade a `expiredLanes` al cabo de 250 ms y Transition al cabo de 5000 ms, lo que fuerza su procesamiento síncrono. Por baja que sea su prioridad, ningún trabajo queda ignorado para siempre. (Si una prioridad baja significara ser ignorado eternamente, ya no sería un sistema de prioridades, sino un sistema de discriminación).


## El output de Fiber

Después de examinar la estructura de Fiber, surge otra pregunta: ¿cómo se convierten estos nodos Fiber en el **DOM real**?

El output contiene la información concreta de los nodos DOM que se puede aplicar al DOM real. Aquí hay una distinción importante.

```jsx
// 사용자 정의 컴포넌트 — output 없음
function 아바타() {
  return <img src="profile.jpg" />;
}

// 호스트 컴포넌트 — output 생성
<img src="profile.jpg" />
<div className="프로필" />
```

Solo los **host components** —div, span, img, etc.— crean nodos DOM reales. El navegador no sabe qué es `<아바타/>`. Como los componentes definidos por el usuario son conceptos abstractos, deben descomponerse en host components para que el navegador pueda entenderlos.

Veamos el proceso con más detalle.

```jsx
function 프로필() {
  return (
    <div className="프로필">
      <아바타 />
      <유저정보 />
    </div>
  );
}

function 아바타() {
  return <img src="profile.jpg" alt="프로필" />;
}

function 유저정보() {
  return (
    <div>
      <h2>홍길동</h2>
      <p>개발자</p>
    </div>
  );
}
```

La relación entre el árbol Fiber generado por estos componentes y su output es la siguiente.

```
프로필 (출력: 없음, 컴포넌트 함수)
  │
  └─► div.프로필 (출력: <div class="프로필">...</div>)
       │
       ├─► 아바타 (출력: 없음, 컴포넌트 함수)
       │    │
       │    └─► img (출력: <img src="profile.jpg" alt="프로필">)
       │
       └─► 유저정보 (출력: 없음, 컴포넌트 함수)
            │
            └─► div (출력: <div>...</div>)
                 │
                 ├─► h2 (출력: <h2>홍길동</h2>)
                 │
                 └─► p (출력: <p>개발자</p>)
```

El output se recopila **de abajo arriba**. Primero se crea el DOM en los nodos hoja (host).

```js
// 호스트 컴포넌트들이 실제 DOM 정보 생성
img_fiber.output = createDOMElement('img', {
  src: 'profile.jpg',
  alt: '프로필'
});

h2_fiber.output = createDOMElement('h2', {}, '홍길동');
p_fiber.output = createDOMElement('p', {}, '개발자');
```

A continuación, el host component padre recopila el output de sus hijos.

```js
// div 노드가 자식들의 출력을 수집
유저정보_div_fiber.output = createDOMElement('div', {}, [
  h2_fiber.output,  // <h2>홍길동</h2>
  p_fiber.output    // <p>개발자</p>
]);

// 최상위 div가 모든 자식 출력을 수집
프로필_div_fiber.output = createDOMElement('div', {className: '프로필'}, [
  img_fiber.output,           // <img src="profile.jpg" alt="프로필">
  유저정보_div_fiber.output   // <div><h2>홍길동</h2><p>개발자</p></div>
]);
```

Por último, los componentes definidos por el usuario transmiten directamente el output de sus hijos.

```js
// 사용자 정의 컴포넌트는 자식의 출력을 위로 전달
아바타_fiber.output = img_fiber.output;
유저정보_fiber.output = 유저정보_div_fiber.output;
프로필_fiber.output = 프로필_div_fiber.output;
```


## Planificación de Fiber

Si el valor principal de Fiber consiste en «poder dividir el trabajo», ¿dónde se lleva a cabo realmente esa división? En el **Work Loop**.

### Work Loop: el corazón del recorrido de Fiber

El renderizado de React empieza en el Work Loop definido en `ReactFiberWorkLoop.js`. React utiliza dos Work Loops según la situación.

```js
// 동기 렌더링: 중단 없이 모든 Fiber를 처리
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

// 동시성 렌더링: 시간 제한 내에서 작업을 나누어 처리
function workLoopConcurrent(nonIdle) {
  if (workInProgress !== null) {
    const yieldAfter = now() + (nonIdle ? 25 : 5);
    do {
      performUnitOfWork(workInProgress);
    } while (workInProgress !== null && now() < yieldAfter);
  }
}
```

Observa la diferencia entre ambas funciones. `workLoopSync` se ejecuta **incondicionalmente** hasta que `workInProgress` pasa a ser `null`. En cambio, `workLoopConcurrent` impone un **límite de tiempo** y sale del bucle cuando se supera.

Resulta interesante la diferencia entre sus intervalos de yield. El trabajo **non-idle —actualizaciones perceptibles por el usuario, como Transition o Retry—** cede el control cada **25 ms**, mientras que el **trabajo idle —trabajo de baja prioridad que puede procesarse cuando el usuario no hace nada—** lo hace cada **5 ms**. El trabajo non-idle recibe 25 ms para limitar de forma deliberada las animaciones a unos 30 fps y evitar que el renderizado de una transition provoque inanición en otros trabajos.


### performUnitOfWork

`performUnitOfWork` procesa un nodo Fiber. Esta función contiene el núcleo del recorrido de Fiber.

```js
function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;
  const next = beginWork(current, unitOfWork, renderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next !== null) {
    workInProgress = next;
  } else {
    completeUnitOfWork(unitOfWork);
  }
}
```

`beginWork` procesa el nodo actual y devuelve su primer hijo. A continuación fija `pendingProps` como `memoizedProps`; si hay un hijo, avanza hacia él y, si no lo hay, llama a `completeUnitOfWork`.


### beginWork

`beginWork` recorre los nodos Fiber de arriba abajo y realiza en cada uno los cálculos necesarios. Está definida en `ReactFiberBeginWork.js` y, por dentro, bifurca la ejecución con un enorme **switch** basado en el `tag` del Fiber.

```js
function beginWork(current, workInProgress, renderLanes) {
  // bailout 체크: props와 context가 변경되지 않았다면 스킵
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    if (oldProps === newProps && !hasContextChanged()) {
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }

  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, ...);
    case ClassComponent:
      return updateClassComponent(current, workInProgress, ...);
    case HostComponent:
      return updateHostComponent(current, workInProgress, ...);
    case SuspenseComponent:
      return updateSuspenseComponent(current, workInProgress, ...);
    // ... 약 25가지 이상의 케이스
  }
}
```

La clave está en la **comprobación de bailout** al principio. Si las props y el context son iguales que antes, `bailoutOnAlreadyFinishedWork` omite el subárbol completo. Este es uno de los caminos más importantes para optimizar el rendimiento de React.

El valor devuelto por `beginWork` es el **primer Fiber hijo**. Si existe, pasa a ser el siguiente `workInProgress`; si no existe (`null`), se entra en `completeUnitOfWork`.


### completeWork

`completeWork` comienza en los nodos hoja y finaliza el trabajo mientras asciende hacia los padres.

```js
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    // 1. completeWork로 현재 노드의 작업 마무리 (DOM 생성 등)
    completeWork(current, completedWork, renderLanes);

    // 2. 형제가 있으면 형제로 이동 (다시 beginWork 시작)
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }

    // 3. 형제가 없으면 부모로 올라감
    completedWork = completedWork.return;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```

Las principales tareas realizadas en `completeWork` son las siguientes.

- **Para un HostComponent**: crea el nodo DOM real (`createInstance`) y añade los DOM hijos mediante append. Si el DOM ya existe, recopila las props modificadas y las guarda en `updateQueue`.
- **`bubbleProperties()`**: agrega los flags de los hijos en `subtreeFlags`. Esta información se utiliza durante la Commit Phase para optimizar la omisión de subárboles.

En resumen, el recorrido funciona así: **desciende siguiendo child (beginWork) -> al completar un nodo hoja avanza a sibling -> si no hay hermanos, asciende siguiendo return (completeWork)**. Este es el orden de búsqueda en profundidad de Fiber.


### Por qué se descartó requestIdleCallback

Antes mostré un modelo conceptual de Fiber que utilizaba `requestIdleCallback`, pero React no lo usa en la práctica. Los motivos son claros.

- **Frecuencia de llamada demasiado baja**: solo se invoca durante auténticos «periodos de inactividad —cuando el navegador no tiene nada que hacer—», por lo que en una página ocupada el trabajo de React podría posponerse indefinidamente. Dan Abramov también señaló que «requestIdleCallback is called too infrequently to be useful for scheduling React work».
- **Problemas de compatibilidad entre navegadores**: Safari tardó mucho en implementarlo y su comportamiento variaba entre navegadores.
- **Límite superior de 20 ms**: el idle deadline tiene un límite máximo que impide a React controlar los tiempos con la previsibilidad que necesita.

Después se probó un enfoque basado en `requestAnimationFrame` y la estimación del presupuesto de cada frame. Sin embargo, también se abandonó al concluir que el trabajo de React no necesitaba ajustarse al ciclo de vsync —la técnica que sincroniza la salida de frames con el momento en que el monitor completa el barrido vertical—.

### MessageChannel

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

(Si de 5 ms se dedican 4 a esperar, solo queda 1 ms de trabajo real. Eso no es conciliación entre vida y trabajo: es solo vida).

El paquete Scheduler de React mantiene internamente **dos min-heaps (montículos mínimos)**.

```
timerQueue (대기실)                    taskQueue (실행 대기열)
┌──────────────────┐                  ┌──────────────────┐
│ 아직 시작 시간이     │   startTime      │ 지금 실행 가능한     │
│ 안 된 태스크들       │ ──경과 시──→      │ 태스크들           │
│                  │                  │                  │
│ 정렬: startTime   │                  │ 정렬: expiration  │
│ (빠른 순)          │                  │ Time (임박한 순)   │
└──────────────────┘                  └──────────────────┘
```

**taskQueue** es la cola de tareas «que pueden ejecutarse ahora mismo». Cuanto menor sea `expirationTime` (= startTime + timeout), es decir, cuanto más próxima esté la expiración, antes se ejecutan. **timerQueue** es la sala de espera de las tareas «cuyo momento de ejecución todavía no ha llegado». En cuanto el tiempo actual supera startTime, se trasladan a taskQueue.

Entonces, ¿cómo se determina el timeout que define expirationTime? Cada actualización recibe un timeout propio según su prioridad (Priority Level).

```
우선순위          timeout        만료까지         예시
─────────────────────────────────────────────────────────
Immediate        -1ms          즉시 만료         flushSync
UserBlocking     250ms         0.25초           클릭, 입력
Normal           5,000ms       5초              일반 setState
Low              10,000ms      10초             startTransition
Idle             ~1,073,741,823ms  ~12.4일      오프스크린 렌더링
```

**Immediate** expira nada más crearse y recibe la máxima prioridad en cuanto entra en taskQueue. (Expirar en el mismo momento de nacer es un destino un poco triste). Los 250 ms de **UserBlocking** se ajustan al umbral en que una persona percibe una respuesta como lenta —entre 100 y 300 ms—. Si tras un clic no ocurre nada durante 0,25 segundos, el usuario se irrita. Los 5 segundos de **Normal** pueden parecer generosos, pero garantizan que el trabajo se procesará incluso en el peor caso. En la práctica, se ejecuta en cuanto terminan las tareas anteriores. Los aproximadamente 12,4 días de **Idle** equivalen de hecho al infinito. Solo se ejecuta cuando ha terminado todo lo demás. (Como es muy poco probable mantener el navegador abierto durante 12 días, podemos considerarlo infinito).

Estos timeouts también funcionan como mecanismo para evitar la **inanición (starvation)**. Por baja que sea la prioridad, cuando transcurre el timeout el trabajo expira y se fuerza su ejecución. Aunque sigan llegando tareas de alta prioridad, las de baja prioridad nunca quedan ignoradas para siempre.

`shouldYieldToHost()` del Scheduler comprueba si el tiempo transcurrido desde el inicio del trabajo supera `frameInterval` —**5 ms** por defecto, definido en `SchedulerFeatureFlags.js`— y decide si debe devolver el control al hilo principal.


## Render Phase y Commit Phase

Hasta ahora hemos visto la estructura y la planificación de Fiber. Organicemos ahora el flujo completo para entender cómo se combinan todas estas piezas y producen una actualización real de la UI.

Internamente, Fiber atraviesa dos etapas: la **Render Phase** y la **Commit Phase**. Esta separación es el diseño esencial que hace posible el modelo de concurrencia de React. Si quieres observar directamente el flujo de funcionamiento de Fiber, haz clic en la imagen siguiente.

[![2.png](/content/250520/2.png)](https://storied-centaur-55230f.netlify.app/)



### Render Phase

La Render Phase es la etapa que **calcula qué cambios necesita** la UI. En ella no se modifica realmente el DOM. Su característica más importante es que **puede interrumpirse y reanudarse de forma asíncrona**.

Esta etapa gira en torno a `beginWork` y `completeWork`, que ya hemos visto.

En **beginWork(fiber)** se ejecuta la lógica correspondiente al tipo de cada Fiber —FunctionComponent, ClassComponent, HostComponent, etc.— y se crean y enlazan sus nodos Fiber hijos. Si las props son iguales a las anteriores, se puede omitir el trabajo mediante memoization (bailout).

En **completeWork(fiber)** se preparan la creación del DOM y la información de los effects. Después, `bubbleProperties()` agrega los flags de los hijos en `subtreeFlags` y completa la información mientras asciende hacia los padres.

Como esta etapa no modifica directamente el DOM, el trabajo puede interrumpirse en cualquier momento y retomarse más tarde sin exponer al usuario una UI incompleta. Esta es la base del modo Concurrent.


### subtreeFlags

Durante la Render Phase, cada Fiber registra mediante **flags de bits** qué efectos secundarios (side effects) necesita. Veamos los principales flags definidos en `ReactFiberFlags.js`.

- `Placement`: insertar un nodo nuevo en el DOM
- `Update`: actualizar propiedades del DOM
- `ChildDeletion`: eliminar un nodo hijo
- `Ref`: conectar o desconectar una ref
- `Passive`: ejecutar un callback de useEffect
- `Snapshot`: ejecutar getSnapshotBeforeUpdate
- `Callback`: ejecutar un callback del lifecycle

Las versiones anteriores de React —hasta la 16— utilizaban una linked list conectada mediante `firstEffect` -> `nextEffect` -> `lastEffect` para reunir únicamente los Fibers con efectos secundarios. Sin embargo, las referencias a Fibers desmontados permanecían y provocaban **memory leaks**; además, resultaba difícil procesar de forma eficiente patrones nuevos como Suspense.

A partir de React 17 se eliminó esta effect list y se adoptó el sistema de **subtreeFlags** ([PR #19381](https://github.com/facebook/react/pull/19381)). Durante `completeWork`, `bubbleProperties()` agrega los flags de los hijos en el padre.

```js
function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags;
  let child = completedWork.child;
  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;
    subtreeFlags |= child.flags;
    child = child.sibling;
  }
  completedWork.subtreeFlags |= subtreeFlags;
}
```

La gran ventaja de esta estructura es que durante la Commit Phase se puede **omitir un subárbol completo**. Si en un Fiber se cumple `subtreeFlags & MutationMask === NoFlags`, no hay ningún nodo de ese subárbol que requiera cambios en el DOM, por lo que puede saltarse entero. Esta optimización era imposible con el anterior sistema de linked lists.


### Commit Phase

La Commit Phase es la etapa que **aplica al DOM real** los cambios calculados durante la Render Phase. Se ejecuta **siempre de forma síncrona** y, una vez iniciada, continúa hasta el final sin interrupciones. Así se evita que el usuario vea una UI actualizada solo a medias.

Internamente, la Commit Phase sigue esta secuencia detallada.

1. **Before Mutation Phase**: `commitBeforeMutationEffects()`
   - Lee el estado actual del DOM antes de modificarlo. Aquí se ejecuta el lifecycle `getSnapshotBeforeUpdate`. En ese momento el árbol `current` todavía representa el estado visible, por lo que se pueden capturar con seguridad datos como la posición del scroll o el tamaño del DOM.
2. **Mutation Phase**: `commitMutationEffects()`
   - Es la etapa en la que se realizan las **operaciones reales sobre el DOM**: insertar nodos nuevos, modificar los existentes y eliminar los innecesarios. `componentWillUnmount` también se ejecuta aquí, porque `current` todavía apunta al árbol anterior y permite leer su estado.
3. **Intercambio de árboles**: `root.current = finishedWork`
   - Es la esencia del doble búfer. El árbol workInProgress asciende a árbol current. Es importante que el intercambio ocurra después de Mutation y antes de Layout: `componentWillUnmount` debe leer el **árbol anterior**, por lo que se ejecuta durante Mutation, mientras que `componentDidMount`/`componentDidUpdate` deben leer el **árbol nuevo**, por lo que se ejecutan durante Layout.
4. **Layout Phase**: `commitLayoutEffects()`
   - Una vez modificado el DOM, se ejecutan los trabajos basados en su nuevo estado.
      - Ejecución de `componentDidMount` y `componentDidUpdate`
      - Ejecución de los callbacks de `useLayoutEffect`
      - En este punto `current` ya apunta al árbol nuevo, por lo que al leer el DOM se obtienen los valores actualizados
5. **Passive Effects** (asíncronos)
   - El cleanup y el setup de `useEffect` se planifican por separado y se ejecutan de forma **asíncrona**. Como procesan efectos secundarios que no dependen de cambios en el DOM —obtención de datos, suscripciones a eventos, etc.—, no es necesario ejecutarlos síncronamente. Al procesarlos de forma asíncrona, React cede el control para que el navegador pueda pintar antes la pantalla.


## Concurrent Features y Fiber

Veamos ahora qué experiencias de usuario hacen posibles todos los elementos de Fiber estudiados hasta aquí —doble búfer, prioridades basadas en Lanes y Work Loop interrumpible— mediante las Concurrent Features disponibles desde React 18.

### useTransition

Al llamar a `startTransition(() => setState(...))`, se asigna una `TransitionLane` a esa actualización. Existen 14 TransitionLanes que se distribuyen mediante round-robin —asignándolas una a una por turnos— para evitar colisiones.

Como TransitionLane tiene menos prioridad que SyncLane o DefaultLane, si llega una actualización urgente como una entrada del usuario, React puede **interrumpir** el renderizado de la transition y procesar primero la actualización urgente. Mientras tanto, la pantalla mantiene el árbol `current` —el estado anterior— y la transition avanza en segundo plano sobre el árbol workInProgress.

Aquí es donde brilla el valor del doble búfer. Un renderizado de transition interrumpido solo afecta al árbol workInProgress; la pantalla que ve el usuario —el árbol current— permanece completamente intacta.

El flag `isPending` indica que la transition todavía no ha terminado, lo que permite mostrar un indicador de carga u ofrecer un tratamiento similar.


### useDeferredValue

En el primer renderizado, `useDeferredValue(value)` devuelve directamente el `value` recibido. En renderizados posteriores, si el render actual es urgente, devuelve el valor memoized anterior y planifica un render nuevo con TransitionLane. Igual que una Transition, el renderizado diferido se puede interrumpir.

Conceptualmente se parece a `startTransition`, pero se aplica en el lado que **recibe el valor**, no en el que despacha la actualización. Un caso de uso habitual consiste en reflejar inmediatamente el texto de un campo de búsqueda, pero retrasar el renderizado de la lista de resultados.


### Suspense

Cuando un componente dentro de `<Suspense>` lanza una Promise, `throwException` la captura y marca ese Fiber como `Incomplete`. Después asciende por la cadena `return` en busca del límite de Suspense más cercano y hace que este muestre la fallback UI. Cuando la Promise se resuelve, `markRootPinged` hace ping a la lane correspondiente y React vuelve a renderizar el subárbol suspendido.

En el modo Concurrent se pueden **seguir renderizando los nodos hermanos (sibling)** de un componente suspendido, de modo que una sola petición de datos no bloquea el renderizado del árbol completo. Esto es posible porque la estructura de linked list de Fiber permite desplazarse libremente hacia sibling.


### Streaming SSR y Selective Hydration

`renderToPipeableStream` de React 18 utiliza los límites de Suspense.

- **Servidor**: cuando un límite de Suspense se suspende, envía primero el HTML de fallback y, cuando los datos están listos, transmite después el contenido real mediante una etiqueta `<script>`
- **Cliente (Selective Hydration)**: cada límite de Suspense puede hidratarse de forma **independiente**. Si el usuario hace clic en una zona todavía no hidratada, `SelectiveHydrationLane` procesa **con prioridad** la hydration de ese límite y después despacha el evento

Todo esto es posible porque cada límite de Suspense es un nodo Fiber que se puede planificar de manera independiente. En definitiva, el diseño esencial de la arquitectura Fiber —«dividir el trabajo, asignarle prioridades e interrumpirlo/reanudarlo»— constituye la base de todas estas funcionalidades.


## Conclusión

Si hubiera que resumir este artículo en una frase: **React Fiber es una arquitectura que sustituye la recursión por iteración y traslada el call stack al heap para poder interrumpir y reanudar el renderizado**.

Para conseguirlo combina numerosos diseños sofisticados: una estructura de árbol basada en linked lists, doble búfer, un sistema de prioridades basado en Lanes y un scheduler basado en MessageChannel. Todos persiguen un mismo objetivo: **maximizar la capacidad de respuesta de la UI percibida por el usuario**.

Por supuesto, la implementación interna de Fiber sigue cambiando con cada versión de React, y lo explicado aquí no deja de ser una fotografía tomada en un momento concreto. Sin embargo, creo que la filosofía esencial de Fiber —«dividir el trabajo, asignarle prioridades e interrumpirlo y reanudarlo»— permanecerá inalterada.

Espero que este artículo haya mostrado que React Fiber no es una simple palabra clave para entrevistas, sino la arquitectura de runtime que sostiene todas las funciones de React. No existe una única respuesta correcta, pero también espero que quienes lean este artículo examinen directamente el código fuente y construyan su propia comprensión.


## Fuentes

:::ref
- [repo] [Código fuente de React, ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [repo] [Código fuente de React, ReactFiberBeginWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [repo] [Código fuente de React, ReactFiberCompleteWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCompleteWork.js)
- [repo] [Código fuente de React, ReactFiberLane.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberLane.js)
- [repo] [Código fuente de React, ReactFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)
- [repo] [Código fuente de React, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [repo] [Issue #7942, Fiber Principles](https://github.com/facebook/react/issues/7942)
- [docs] [React 18 WG, New Suspense SSR Architecture](https://github.com/reactwg/react-18/discussions/37)
- [docs] [React 18 WG, Concurrent Scheduling](https://github.com/reactwg/react-18/discussions/27)
- [docs] [Artículo del blog de React v18.0](https://react.dev/blog/2022/03/29/react-v18)
:::
