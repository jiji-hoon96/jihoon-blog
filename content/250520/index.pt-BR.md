---
emoji: ⚛️
title: 'Dominando o React Fiber por completo'
seoTitle: 'Dominando o React Fiber — análise da arquitetura e dos princípios da renderização concorrente'
date: '2025-05-20'
categories: 프론트엔드 React
description: "Uma análise aprofundada da arquitetura React Fiber com base no código-fonte do React, do Stack Reconciler às prioridades de Lane, double buffering, scheduler baseado em MessageChannel e Concurrent Features. Um tema recorrente em entrevistas de frontend."
keywords: "React Fiber, arquitetura React Fiber, Stack Reconciler, Concurrent Mode, concorrência no React 18, useTransition, useDeferredValue, Suspense, renderização do React, análise do código-fonte do React, Virtual DOM, Reconciliation, prioridade de Lane, entrevista de frontend"
locale: pt-BR
translationOf: '250520'
sourceHash: da152b27d26e4621cb1e554cd3d68e531f794e86f395ef9ee35e851f1f0aeff8
---

Neste post, quero falar sobre a **arquitetura Fiber**, que pode ser considerada o coração do React.

Quando conheci o React, eu via a palavra **"Fiber"** apenas como mais uma pergunta frequente em entrevistas. Decorei uma definição de uma linha — "dividir a renderização em unidades de trabalho e processá-las" — e achei que isso era tudo. Mas, quando comecei a examinar de fato o código-fonte do React, percebi que Fiber não era apenas um conceito, mas a arquitetura de runtime que controla **tudo** na renderização do React.

> Ainda não consigo esquecer o impacto de abrir o código-fonte do React pela primeira vez. Pensei: "O que... é tudo isso?"

Neste artigo, iremos além de responder à pergunta "O que é Fiber?" com "É a divisão do trabalho em unidades". Vamos investigar a fundo **por que** Fiber surgiu, **como** foi projetado e **como** essa estrutura viabiliza as Concurrent Features do React.


## Por que Fiber surgiu?

Para responder a essa pergunta, primeiro precisamos entender os problemas do mundo anterior ao Fiber: o **Stack Reconciler**, usado até o React 15.

Como o nome sugere, o Stack Reconciler era um mecanismo de reconciliação baseado em **chamadas recursivas (recursive)**. Ele percorria a árvore de componentes recursivamente, de cima para baixo, e, depois que a renderização começava, só podia parar após processar toda a árvore. Era como não poder desligar uma ligação até a outra pessoa terminar de falar. (Imagine que ela começa uma sessão de três horas contando a própria vida e você não pode interromper. Terrível.)

Mais especificamente, o Stack Reconciler tinha as seguintes limitações.

- **Impossibilidade de interromper a renderização**: como toda a árvore precisava ser processada de uma vez, a main thread podia ficar ocupada por dezenas ou centenas de milissegundos em UIs complexas
- **Ausência do conceito de prioridade**: fosse um clique do usuário ou uma atualização de dados em background, todas as atualizações eram processadas da mesma maneira
- **Dificuldade para lidar com animações e gestos**: manter 60 fps exige concluir todo o trabalho em cerca de 16 ms por frame, algo que a renderização recursiva não conseguia garantir
- **Um erro interrompia toda a aplicação**: um erro em qualquer ponto da árvore de componentes podia parar a aplicação inteira

Para superar essas limitações, a equipe do React concebeu um novo modelo de execução capaz de **dividir** o trabalho, **atribuir prioridades** e, quando necessário, **interromper e retomar** a execução. O resultado foi justamente o **React Fiber**.

O documento [react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture), escrito por Andrew Clark, reúne as ideias centrais desse design e é a referência mais importante para entender Fiber. (Ao que tudo indica, ele entrou para a equipe do React pouco depois de escrever esse documento.)


## Stack vs Fiber

Então, em que o Stack Reconciler e o Fiber Reconciler diferem no nível do código?

### Stack Reconciler baseado em recursão

```jsx
function renderComponent(component) {
  const element = component.render();
  element.props.children.forEach(child => renderComponent(child)); // 재귀 호출
}
```

Na abordagem Stack, ao encontrar um componente filho, entra-se **imediatamente em uma chamada recursiva**. O problema é que ela depende diretamente da call stack do JavaScript. Conforme as chamadas se aprofundam, frames se acumulam na call stack e, até que todos sejam resolvidos, a main thread do navegador não pode fazer mais nada.

Em termos simples, até a call stack esvaziar, o navegador fica **completamente imobilizado**.

<video width="640" height="480" controls>
  <source src="/content/250520/stack.mov" type="video/mp4">
</video>

No vídeo acima, é possível ver a main thread totalmente bloqueada enquanto o Stack Reconciler renderiza.


### Fiber Reconciler baseado em iteração

Fiber substituiu a recursão por um **loop iterativo (iterative loop)**. Em vez da call stack, implementou sua **própria stack virtual** na memória. Cada nó Fiber funciona como um "stack frame" e, como esses nós são objetos JavaScript armazenados na heap, o trabalho pode ser interrompido a qualquer momento e retomado depois.

```jsx
function performWork(deadline) {
  while (nextUnitOfWork && deadline.timeRemaining() > 5) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  requestIdleCallback(performWork); // 나눠서 실행
}
```

O código acima mostra o modelo conceitual inicial do Fiber. O ponto central é processar apenas uma unidade de trabalho (unit of work) por vez dentro do loop `while` e, quando o tempo fica curto, sair do loop e devolver o controle ao navegador.

(No início, a abordagem usava `requestIdleCallback`, mas o React real não usa essa API. Veremos o motivo em detalhes mais adiante.)

<video width="640" height="480" controls>
  <source src="/content/250520/fiber.mov" type="video/mp4">
</video>

Com Fiber, é possível responder imediatamente a eventos do usuário — cliques, digitação etc. — mesmo durante a renderização. Ao executar o trabalho em pequenas partes, o navegador ganha espaço para respirar.

Se quiser experimentar pessoalmente a diferença entre as duas abordagens, clique **<a href="https://animated-lollipop-2b6cbb.netlify.app/" target="_blank" rel="noopener noreferrer">aqui</a>**. Você poderá observar visualmente como o Stack Reconciler e o Fiber Reconciler se comportam de formas diferentes.

Este é exatamente o objetivo central do Fiber enfatizado por Andrew Clark em seu documento.

- **Interromper o trabalho e voltar a ele depois**
- **Atribuir prioridades a diferentes tipos de trabalho**
- **Reutilizar trabalho concluído anteriormente**
- **Cancelar trabalho que não é mais necessário**


## Estrutura interna de um nó Fiber

Ao chegar até aqui, surge naturalmente uma pergunta: "Então, qual é a estrutura interna de um nó Fiber?"

A equipe do React não fornece uma documentação oficial separada sobre a implementação interna do Fiber. Ainda assim, podemos entender sua estrutura por meio do documento react-fiber-architecture, de Andrew Clark, e do código-fonte real do React (`ReactFiber.js`).

Gosto de comparar um nó Fiber a uma **ordem de trabalho (Work Order)**. Quando um produto é montado em uma fábrica, cada ordem registra "que tipo de peça é esta", "quais materiais serão usados", "qual trabalho deve ser feito em seguida" e "qual é a prioridade". Um nó Fiber funciona da mesma forma.


### ReactElement e FiberNode

Para entender Fiber, primeiro é preciso distinguir **ReactElement** de **FiberNode**. Os dois são confundidos com frequência, mas são entidades completamente diferentes.

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

ReactElement é apenas o **blueprint** da UI. É somente uma solicitação para "renderizar este componente com estas props"; ele não contém lógica real de renderização nem estado.

Já **FiberNode** é a **unidade de trabalho em runtime** criada internamente pelo React com base nesse blueprint. É nele que existem campos ausentes no ReactElement, como `tag`, `stateNode`, `child/sibling/return`, `memoizedState`, `updateQueue` e `lanes`.

Quando o React cria um FiberNode a partir do `type` de um ReactElement, o valor de **tag** é definido.

- Se `type` for uma função e tiver `prototype.isReactComponent` → `tag = ClassComponent(1)`
- Se `type` for uma função → `tag = FunctionComponent(0)`
- Se `type` for uma string (como `"div"`) → `tag = HostComponent(5)`


**tag** é uma constante numérica que representa o tipo do FiberNode. Ela é definida em `ReactWorkTags.js`, e existem mais de 25 tags, incluindo `FunctionComponent(0)`, `ClassComponent(1)`, `HostRoot(3)`, `HostComponent(5)` e `HostText(6)`. Com base nesse valor de tag, o React decide qual lógica executar em `beginWork`.


**type** exerce um papel central no processo de reconciliação (reconciliation). Ao comparar o Fiber da renderização anterior com o novo elemento, **a primeira coisa que o React verifica** é justamente o type. (Esse valor é transferido do ReactElement para o FiberNode sem alterações.)

- Se antes era `div` e continua sendo `div`, o React **reutiliza** esse nó Fiber e atualiza apenas as props
- Se antes era `div`, mas agora mudou para `span`, o React **descarta** o Fiber anterior e cria um novo

**key** também é transferida do ReactElement para o FiberNode e é usada principalmente na renderização de listas (arrays). Sem key, quando a ordem dos itens muda, o React não consegue saber com precisão qual item foi movido para onde. Isso pode causar operações desnecessárias no DOM ou fazer com que o estado interno de componentes seja mantido ou perdido de forma inesperada.


### child, sibling, return

É aqui que está o segredo que permite ao React Fiber usar iteração em vez de recursão.

```js
function 부모() {
  return [<자식1/>, <자식2/>];
}
```

**child** aponta para o **primeiro** elemento filho retornado pelo render do componente. No exemplo acima, é `<자식1/>`. **sibling** representa o **próximo irmão** que tem o mesmo pai. O sibling de `<자식1/>` é `<자식2/>`. **return** aponta para o Fiber **pai ao qual voltar** depois que o processamento do nó atual terminar. O return tanto de `<자식1/>` quanto de `<자식2/>` é `부모`.

A estrutura formada por esses três campos é uma **árvore em formato de lista simplesmente encadeada (Singly Linked List)**. Em uma árvore convencional, seria intuitivo manter um array de filhos (`children[]`), mas Fiber evita isso deliberadamente.

Por quê? Em uma estrutura de filhos baseada em array, é preciso gerenciar índices durante a travessia e rastrear separadamente "até onde o processamento chegou" quando o trabalho é interrompido e retomado. Já em uma estrutura linked list, basta guardar a referência ao nó atual para continuar a travessia a qualquer momento. Essa é a base estrutural que permite ao Fiber oferecer **interrupção e retomada** de maneira natural.

Com base nessa estrutura, o React percorre os nós em ordem de busca em profundidade (DFS). Ele desce seguindo `child` (beginWork); ao chegar a um nó folha, verifica `sibling`; e, quando não há irmão, sobe seguindo `return` (completeWork).


### pendingProps e memoizedProps

**pendingProps** são as **novas props** recebidas no momento em que o processamento daquele Fiber começa, enquanto **memoizedProps** são as **props anteriores** cujo processamento terminou na renderização anterior.

Se os dois valores forem iguais, o React pode concluir que "não houve mudança neste componente" e reutilizar o resultado da renderização anterior. Esse é o mecanismo central da **otimização por bailout**.

Da mesma forma, **memoizedState** armazena o estado dos hooks daquele Fiber, e **updateQueue** gerencia as atualizações de estado ainda não processadas (chamadas de setState) em uma linked list.


### stateNode

**stateNode** referencia a **instância real** apontada pelo nó Fiber.

- Para **HostComponent** (div, span etc.): o nó DOM real
- Para **ClassComponent**: a instância da classe
- Para **HostRoot**: o objeto FiberRoot

Esse campo funciona como uma ponte entre o mundo virtual do Fiber e o DOM real do navegador.


## Double buffering: árvore current e árvore workInProgress

Um conceito central que não pode faltar ao entender Fiber é o **double buffering (Double Buffering)**.

Para compreendê-lo, pense em gráficos de jogos. Se os pixels fossem desenhados diretamente na tela atual, o usuário veria um frame pela metade, fenômeno chamado de **screen tearing (tearing)**. Para evitar isso, engines de jogos usam **dois buffers**. O próximo frame é desenhado por completo em um deles e, quando fica pronto, o buffer exibido na tela é trocado de uma só vez.

O React Fiber usa exatamente a mesma estratégia.

```js
currentFiber.alternate === workInProgressFiber;
workInProgressFiber.alternate === currentFiber;
```

A **árvore current** é a árvore Fiber que está refletida na tela naquele momento e representa o estado da UI que o usuário vê. A **árvore workInProgress** é a árvore Fiber preparada em background para a próxima renderização.

As duas árvores referenciam uma à outra pela propriedade `alternate`. Todas as mudanças são feitas na árvore workInProgress e, quando o trabalho termina, as árvores são trocadas com uma única linha: `root.current = finishedWork`. A antiga workInProgress se torna a nova current, e a antiga current é reciclada como workInProgress na renderização seguinte.

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

Vale destacar o ponto principal. O `stateNode` (o nó DOM real) é **compartilhado** entre current e workInProgress. Em vez de criar um novo objeto Fiber a cada renderização, o React reutiliza o alternate existente e atualiza somente os campos alterados. Graças a isso, consegue construir a árvore de forma eficiente sem impor a cada renderização o custo do garbage collector (GC).

E se props e state não tiverem mudado? Torna-se possível pular a subárvore inteira com a **otimização por bailout**. Se o double buffering dos jogos otimiza no nível do frame, o double buffering do Fiber permite otimizar até o **nível do componente**.


## pendingWorkPriority => Lanes

Então, como Fiber determina que "este trabalho é mais importante"?

### Limitações de expirationTime

No início, Fiber usava uma prioridade numérica chamada `pendingWorkPriority`, que depois evoluiu para um único número chamado `expirationTime`. Quanto mais próximo o vencimento, maior a prioridade. Mas essa abordagem tinha uma limitação fundamental.

Com um único número, era **impossível fazer classificações flexíveis** como "esta atualização pertence ao grupo A e aquela pertence ao grupo B". Quando uma entrada do usuário e uma atualização de Transition ocorriam ao mesmo tempo, por exemplo, o modelo baseado em expirationTime só conseguia classificá-las por comparação de intervalo (range), o que limitava o processamento seletivo de atualizações específicas.

### Lane

Para resolver esse problema, Andrew Clark introduziu o **sistema de Lanes** no [PR #18796](https://github.com/facebook/react/pull/18796).

Para entender Lane, pense em uma **rodovia**. Uma rodovia tem várias faixas (lanes), e cada uma serve a uma finalidade diferente. A faixa da esquerda é para ultrapassagens (urgente), as centrais para o tráfego normal e o acostamento para emergências. Cada veículo (atualização) é colocado na faixa adequada à sua natureza, e o sistema de gestão da rodovia (scheduler) decide quais veículos devem passar primeiro.

As Lanes do React funcionam da mesma maneira. Cada atualização recebe **um bit (lane)**, e operações bitwise são usadas para formar e comparar grupos.

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

Ao todo, 31 lanes foram projetadas para caber em um inteiro de 31 bits, permitindo aproveitar a otimização **SMI (Small Integer)** do engine V8. Inteiros de até 31 bits são tratados pelo V8 com pointer tagging e podem ser operados diretamente na stack, sem alocação na heap. Entre as principais lanes, **quanto mais baixo o bit, maior a prioridade**.

Graças a essa estrutura, o React consegue decidir qual trabalho processar primeiro com uma única operação bitwise. A função `getNextLanes()` seleciona em `pendingLanes` o grupo de lanes de maior prioridade, ignora lanes interrompidas (suspended) e prioriza novas tentativas de lanes que receberam dados (pinged), possibilitando um scheduling sofisticado.

Além disso, para evitar **starvation**, cada lane recebe um tempo de expiração. Sync/InputContinuous é adicionada a `expiredLanes` após 250 ms, e Transition após 5.000 ms, forçando o processamento síncrono. Isso significa que nenhum trabalho será ignorado para sempre, por menor que seja sua prioridade. (Se baixa prioridade significasse ser ignorado para sempre, isso não seria um sistema de prioridades, mas um sistema de discriminação.)


## O output do Fiber

Depois de examinar a estrutura do Fiber até aqui, surge outra pergunta: como esses nós Fiber se transformam no **DOM real**?

O output representa informações concretas de nós DOM que podem ser aplicadas ao DOM real. Há uma distinção importante aqui.

```jsx
// 사용자 정의 컴포넌트 — output 없음
function 아바타() {
  return <img src="profile.jpg" />;
}

// 호스트 컴포넌트 — output 생성
<img src="profile.jpg" />
<div className="프로필" />
```

Somente **host components** (div, span, img etc.) criam nós DOM reais. O navegador não sabe o que é `<아바타/>`. Como componentes definidos pelo usuário são conceitos abstratos, precisam ser decompostos em host components para que o navegador consiga entendê-los.

Vamos analisar esse processo mais concretamente.

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

A relação entre a árvore Fiber produzida por esses componentes e o output é a seguinte.

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

A coleta do output ocorre **de baixo para cima**. Primeiro, o DOM é criado nos nós folha (host).

```js
// 호스트 컴포넌트들이 실제 DOM 정보 생성
img_fiber.output = createDOMElement('img', {
  src: 'profile.jpg',
  alt: '프로필'
});

h2_fiber.output = createDOMElement('h2', {}, '홍길동');
p_fiber.output = createDOMElement('p', {}, '개발자');
```

Em seguida, o host component pai coleta o output dos filhos.

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

Por fim, componentes definidos pelo usuário simplesmente encaminham o output dos filhos.

```js
// 사용자 정의 컴포넌트는 자식의 출력을 위로 전달
아바타_fiber.output = img_fiber.output;
유저정보_fiber.output = 유저정보_div_fiber.output;
프로필_fiber.output = 프로필_div_fiber.output;
```


## Scheduling do Fiber

Se o valor central do Fiber está em "dividir o trabalho", onde essa "divisão" realmente acontece? No **Work Loop**.

### Work Loop: o coração da travessia do Fiber

A renderização do React começa no Work Loop, definido em `ReactFiberWorkLoop.js`. Conforme a situação, o React usa dois Work Loops.

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

Observe a diferença entre as duas funções. `workLoopSync` roda **incondicionalmente** até `workInProgress` se tornar `null`. Já `workLoopConcurrent` estabelece um **limite de tempo** e sai do loop quando esse limite é excedido.

Um detalhe interessante é a diferença no intervalo de yield. Trabalho **non-idle, perceptível pelo usuário**, como Transition ou Retry, cede a execução em intervalos de **25 ms**, enquanto **trabalho idle, de baixa prioridade, que pode ser processado quando o usuário não está fazendo nada**, cede a cada **5 ms**. O motivo para conceder 25 ms ao trabalho non-idle é limitar intencionalmente as animações a cerca de 30 fps, evitando que a renderização da transition provoque starvation em outros trabalhos.


### performUnitOfWork

`performUnitOfWork` é a função que processa um único nó Fiber. Ela contém o núcleo da travessia do Fiber.

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

`beginWork` processa o nó atual e retorna o primeiro filho. Em seguida, confirma `pendingProps` como `memoizedProps`: se houver um filho, avança para ele; caso contrário, chama `completeUnitOfWork`.


### beginWork

`beginWork` percorre os nós Fiber de cima para baixo e realiza em cada um os cálculos necessários. Definida em `ReactFiberBeginWork.js`, a função se ramifica internamente por um enorme **switch** baseado na `tag` do Fiber.

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

O ponto central é a **verificação de bailout** no início. Se props e context forem iguais aos anteriores, `bailoutOnAlreadyFinishedWork` pula a subárvore inteira. Esse é um dos caminhos mais importantes para a otimização de performance do React.

O valor retornado por `beginWork` é o **primeiro Fiber filho**. Se existir um filho, ele se torna o próximo `workInProgress`; se não existir (`null`), a execução entra em `completeUnitOfWork`.


### completeWork

`completeWork` começa em um nó folha e finaliza o trabalho subindo em direção ao pai.

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

Os principais trabalhos executados em `completeWork` são os seguintes.

- **Para HostComponent**: cria o nó DOM real (`createInstance`) e faz append dos DOMs filhos. Se o DOM já existir, coleta as props alteradas e as armazena em `updateQueue`.
- **`bubbleProperties()`**: agrega as flags dos filhos em `subtreeFlags`. Essas informações são usadas na otimização que pula subárvores durante a Commit Phase.

Em resumo, a travessia funciona assim: **desce seguindo child (beginWork) -> ao concluir uma folha, avança para sibling -> se não houver irmão, sobe seguindo return (completeWork)**. Essa é a ordem de busca em profundidade do Fiber.


### Por que requestIdleCallback foi abandonado

Anteriormente, mostramos um código que usa `requestIdleCallback` no modelo conceitual do Fiber, mas o React real não utiliza essa API. Os motivos são claros.

- **Frequência de chamada muito baixa**: ela só é chamada em verdadeiro "tempo ocioso", quando o navegador não tem nada a fazer; por isso, em uma página movimentada, o trabalho do React poderia ser adiado indefinidamente. Dan Abramov também afirmou que "requestIdleCallback is called too infrequently to be useful for scheduling React work".
- **Problemas de compatibilidade entre navegadores**: durante muito tempo, o Safari não a implementou, e o comportamento variava entre navegadores.
- **Limite superior de 20 ms**: como o idle deadline tinha um teto, não era possível controlar o timing de maneira tão previsível quanto o React precisava.

Depois disso, a equipe tentou usar `requestAnimationFrame` com uma estimativa do orçamento do frame, mas essa abordagem também foi abandonada ao concluir que o trabalho do React não precisava acompanhar o ciclo de vsync (tecnologia que sincroniza a exibição de frames com o momento em que o monitor conclui a varredura vertical).

### MessageChannel

Por fim, o React escolheu **MessageChannel**.

```js
if (typeof MessageChannel !== 'undefined') {
  const channel = new MessageChannel();
  channel.port1.onmessage = performWorkUntilDeadline;
  schedulePerformWorkUntilDeadline = () => channel.port2.postMessage(null);
} else {
  schedulePerformWorkUntilDeadline = () => setTimeout(performWorkUntilDeadline, 0);
}
```

Por que não `setTimeout`, mas sim `MessageChannel`? Segundo a especificação HTML, quando `setTimeout` é aninhado cinco vezes ou mais, um **atraso mínimo de 4 ms** é imposto. Já `MessageChannel` roda imediatamente como uma macrotask no próximo tick do event loop, sem essa restrição. Para Fiber, que divide o trabalho em unidades de 5 ms, um atraso artificial de 4 ms seria fatal.

(Se 4 dos 5 ms são tempo de espera, sobra apenas 1 ms de trabalho real. Isso não é work-life balance; é só life.)

Internamente, o pacote Scheduler do React mantém **dois min-heaps**.

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

**taskQueue** é a fila de tarefas que "podem ser executadas agora". Quanto menor o `expirationTime` (= startTime + timeout), ou seja, quanto mais próximo o vencimento, mais cedo a tarefa é executada. **timerQueue** é a sala de espera das tarefas "cujo momento de execução ainda não chegou". No instante em que o horário atual ultrapassa startTime, elas passam para taskQueue.

Como, então, é definido o timeout que determina expirationTime? Cada atualização recebe um timeout próprio conforme seu nível de prioridade (Priority Level).

```
우선순위          timeout        만료까지         예시
─────────────────────────────────────────────────────────
Immediate        -1ms          즉시 만료         flushSync
UserBlocking     250ms         0.25초           클릭, 입력
Normal           5,000ms       5초              일반 setState
Low              10,000ms      10초             startTransition
Idle             ~1,073,741,823ms  ~12.4일      오프스크린 렌더링
```

**Immediate** expira assim que é criada e, portanto, é executada com prioridade máxima assim que entra em taskQueue. (Expirar logo ao nascer é um destino um tanto melancólico.) Os 250 ms de **UserBlocking** correspondem ao limite em que uma pessoa começa a sentir que "a resposta está lenta" (100–300 ms). Se nada acontecer até 0,25 segundo depois de um clique, o usuário se incomoda. Os 5 segundos de **Normal** parecem generosos, mas representam a garantia de que o trabalho será processado mesmo no pior caso. Na prática, ele é executado assim que o trabalho anterior termina. Os cerca de 12,4 dias de **Idle** são praticamente infinitos: ele só roda depois que todo o restante termina. (Como é muito improvável deixar o navegador aberto por 12 dias, podemos tratar isso como infinito.)

Esses valores de timeout também são um mecanismo de prevenção de **starvation**. Por menor que seja a prioridade, depois do timeout o trabalho expira e é executado à força. Assim, mesmo que trabalhos de alta prioridade continuem chegando, um trabalho de baixa prioridade nunca será ignorado para sempre.

O `shouldYieldToHost()` do Scheduler verifica se o tempo decorrido desde o início do trabalho excedeu `frameInterval` (por padrão, **5 ms**, definido em `SchedulerFeatureFlags.js`) e decide se deve devolver o controle à main thread.


## Render Phase e Commit Phase

Até aqui, examinamos a estrutura e o scheduling do Fiber. Agora vamos organizar o fluxo completo para entender como tudo isso se combina e produz uma atualização real da UI.

Internamente, Fiber passa por duas etapas: **Render Phase** e **Commit Phase**. Essa separação é o design central que viabiliza o modelo de concorrência do React. Se quiser conferir diretamente o fluxo de funcionamento do Fiber, clique na imagem abaixo.

[![2.png](/content/250520/2.png)](https://storied-centaur-55230f.netlify.app/)



### Render Phase

A Render Phase é a etapa que **calcula quais mudanças a UI requer**. Nela, o DOM real não é afetado de forma alguma. Sua característica mais importante é que ela **pode ser interrompida e retomada de forma assíncrona**.

Essa etapa opera principalmente por meio de `beginWork` e `completeWork`, que vimos anteriormente.

Em **beginWork(fiber)**, a lógica apropriada é executada conforme o tipo de cada Fiber (FunctionComponent, ClassComponent, HostComponent etc.). Os nós Fiber filhos são então criados e conectados. Se as props forem iguais às anteriores, a memoization permite pular o trabalho (bailout).

Em **completeWork(fiber)**, são preparados o trabalho de criação do DOM e as informações de effects. Em seguida, `bubbleProperties()` agrega as flags dos filhos em `subtreeFlags`, e as informações são completadas enquanto a travessia sobe em direção ao pai.

Como o DOM não é modificado diretamente nessa etapa, o trabalho pode ser interrompido e retomado depois sem expor ao usuário uma UI incompleta. Essa é a base do Concurrent Mode.


### subtreeFlags

Durante a Render Phase, os side effects necessários são registrados em cada Fiber como **bit flags**. Vejamos as principais flags definidas em `ReactFiberFlags.js`.

- `Placement`: inserir um novo nó no DOM
- `Update`: atualizar propriedades do DOM
- `ChildDeletion`: remover um nó filho
- `Ref`: conectar ou desconectar uma ref
- `Passive`: executar o callback de useEffect
- `Snapshot`: executar getSnapshotBeforeUpdate
- `Callback`: executar um callback de lifecycle

Versões anteriores do React (até a 16) usavam uma linked list conectada por `firstEffect` -> `nextEffect` -> `lastEffect` para reunir apenas os Fibers com side effects. Porém, essa abordagem mantinha referências a Fibers desmontados, causando **memory leaks**, e tinha dificuldade para processar com eficiência novos padrões como Suspense.

A partir do React 17, essa effect list foi removida e substituída pela abordagem de **subtreeFlags** ([PR #19381](https://github.com/facebook/react/pull/19381)). Durante `completeWork`, `bubbleProperties()` agrega as flags dos filhos no pai.

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

A maior vantagem dessa estrutura é poder **pular uma subárvore inteira** durante a Commit Phase. Se `subtreeFlags & MutationMask === NoFlags` para determinado Fiber, nenhum nó daquela subárvore precisa de uma mudança no DOM, então ela pode ser ignorada por completo. Essa otimização era impossível com a antiga linked list.


### Commit Phase

A Commit Phase é a etapa que **aplica ao DOM real** as mudanças calculadas na Render Phase. Ela é executada **sempre de forma síncrona** e, depois de começar, segue até o fim sem interrupções. Isso impede que o usuário veja uma UI atualizada apenas pela metade.

Internamente, a Commit Phase segue esta ordem detalhada.

1. **Before Mutation Phase**: `commitBeforeMutationEffects()`
   - Lê o estado atual do DOM antes que ele seja alterado. O lifecycle `getSnapshotBeforeUpdate` é executado aqui. Como, nesse momento, a árvore `current` ainda representa o estado exibido na tela, informações como posição do scroll e dimensões do DOM podem ser capturadas com segurança.
2. **Mutation Phase**: `commitMutationEffects()`
   - É a etapa em que ocorre a **manipulação real do DOM**. Novos nós são inseridos, os existentes são modificados e os desnecessários são removidos. `componentWillUnmount` também é executado nesse momento, pois `current` ainda aponta para a árvore anterior, permitindo ler o estado antigo.
3. **Troca da árvore**: `root.current = finishedWork`
   - Este é o ponto central do double buffering: a árvore workInProgress é promovida a árvore current. É importante que essa troca aconteça depois de Mutation e antes de Layout. `componentWillUnmount` precisa ler a **árvore anterior**, por isso é executado na Mutation Phase; já `componentDidMount`/`componentDidUpdate` precisam ler a **nova árvore**, por isso são executados na Layout Phase.
4. **Layout Phase**: `commitLayoutEffects()`
   - Depois que as mudanças no DOM terminam, são executados os trabalhos baseados no novo estado do DOM.
      - execução de `componentDidMount` e `componentDidUpdate`
      - execução dos callbacks de `useLayoutEffect`
      - nesse momento, `current` já aponta para a nova árvore, portanto a leitura do DOM retorna os valores atualizados
5. **Passive Effects** (assíncronos)
   - O cleanup e o setup de `useEffect` são agendados separadamente e executados **de forma assíncrona**. Como eles tratam side effects que não dependem de mudanças no DOM, como data fetching e event subscriptions, não precisam ser executados de maneira síncrona. Ao processá-los assincronamente, o React cede ao navegador a oportunidade de desenhar a tela primeiro.


## Concurrent Features e Fiber

Agora vamos ver, por meio das Concurrent Features disponíveis desde o React 18, que tipo de experiência para o usuário todos os designs do Fiber examinados até aqui — double buffering, prioridades baseadas em Lane e Work Loop interrompível — tornam possível.

### useTransition

Ao chamar `startTransition(() => setState(...))`, a atualização recebe uma `TransitionLane`. As 14 TransitionLanes são atribuídas em round-robin, isto é, uma de cada vez em sequência, para evitar conflitos.

Como TransitionLane tem prioridade menor do que SyncLane ou DefaultLane, quando chega uma atualização urgente, como uma entrada do usuário, o React pode **interromper** a renderização da transition e processar primeiro a atualização urgente. Enquanto isso, a árvore `current` — o estado anterior — continua na tela, e a transition avança em background na árvore workInProgress.

É aqui que o valor do double buffering se destaca. Uma renderização de transition interrompida afeta apenas a árvore workInProgress; a tela vista pelo usuário, a árvore current, permanece completamente intacta.

A flag `isPending` indica que a transition ainda não terminou, permitindo, por exemplo, exibir um indicador de loading.


### useDeferredValue

Na primeira renderização, `useDeferredValue(value)` retorna diretamente o `value` recebido. Nas renderizações seguintes, se a renderização atual for urgente, retorna o valor memoized anterior e agenda uma nova renderização com TransitionLane. Assim como uma Transition, a renderização adiada pode ser interrompida.

Conceitualmente, é semelhante a `startTransition`, mas com uma diferença: ela é aplicada no **lado que recebe o valor**, e não no lado que dispara a atualização. Um caso de uso típico é refletir imediatamente o texto digitado em uma busca, mas adiar a renderização da lista de resultados.


### Suspense

Quando um componente lança uma Promise dentro de `<Suspense>`, `throwException` a captura e marca esse Fiber como `Incomplete`. Depois, sobe pela cadeia de `return` procurando o limite de Suspense mais próximo e faz esse limite passar a exibir a fallback UI. Quando a Promise é resolvida, `markRootPinged` marca essa lane como pinged, e o React renderiza novamente a subárvore suspended.

No Concurrent Mode, os nós **irmãos (sibling)** do componente suspended podem continuar sendo renderizados, portanto uma única requisição de dados não bloqueia a renderização de toda a árvore. Isso é possível porque a estrutura de linked list do Fiber permite avançar livremente para um sibling.


### Streaming SSR e Selective Hydration

O `renderToPipeableStream` do React 18 usa limites de Suspense.

- **Servidor**: quando um limite de Suspense é suspenso, envia primeiro o HTML da fallback e, quando os dados ficam prontos, faz streaming do conteúdo real posteriormente por meio de uma tag `<script>`
- **Cliente (Selective Hydration)**: cada limite de Suspense pode sofrer hydration **independentemente**. Se o usuário clicar em uma área que ainda não passou por hydration, `SelectiveHydrationLane` processa **prioritariamente** a hydration daquele limite e só então dispara o evento

Tudo isso é possível porque cada limite de Suspense é um nó Fiber que pode ser agendado de maneira independente. No fim, o design central da arquitetura Fiber — "dividir o trabalho, atribuir prioridades e poder interromper/retomar" — é o fundamento de todos esses recursos.


## Conclusão

Se resumíssemos este artigo em uma frase, diríamos que **React Fiber é uma arquitetura que substitui recursão por iteração e move a call stack para a heap, permitindo interromper e retomar a renderização**.

Para isso, vários designs sofisticados foram combinados: uma estrutura de árvore baseada em linked list, double buffering, um sistema de prioridades baseado em Lane e um scheduler baseado em MessageChannel. E tudo isso converge para um objetivo: **maximizar a responsividade da UI percebida pelo usuário**.

Naturalmente, a implementação interna do Fiber continua mudando a cada versão do React, e o conteúdo deste artigo é apenas um snapshot de determinado momento. Ainda assim, acredito que a filosofia central do Fiber — "dividir o trabalho, atribuir prioridades, interromper e retomar" — continuará a mesma.

Espero que este artigo tenha mostrado que React Fiber não é apenas uma palavra-chave de entrevistas, mas a arquitetura de runtime que sustenta todos os recursos do React. Não há uma resposta única, mas espero também que você examine o código-fonte diretamente e construa sua própria compreensão.


## Fontes

:::ref
- [repo] [Código-fonte do React, ReactFiberWorkLoop.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
- [repo] [Código-fonte do React, ReactFiberBeginWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberBeginWork.js)
- [repo] [Código-fonte do React, ReactFiberCompleteWork.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberCompleteWork.js)
- [repo] [Código-fonte do React, ReactFiberLane.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberLane.js)
- [repo] [Código-fonte do React, ReactFiber.js](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js)
- [repo] [Código-fonte do React, Scheduler.js](https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js)
- [repo] [Issue #7942, Fiber Principles](https://github.com/facebook/react/issues/7942)
- [docs] [React 18 WG, New Suspense SSR Architecture](https://github.com/reactwg/react-18/discussions/37)
- [docs] [React 18 WG, Concurrent Scheduling](https://github.com/reactwg/react-18/discussions/27)
- [docs] [Post do blog do React v18.0](https://react.dev/blog/2022/03/29/react-v18)
:::
