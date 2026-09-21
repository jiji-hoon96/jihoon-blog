---
emoji: 🪟
title: 'overlay-kit'
seoTitle: 'overlay-kit: modais declarativos em React e openAsync'
date: '2026-09-21'
categories: ignore frontend React biblioteca
description: 'Trocar uma flag global isOpen por um await: o que ganhei, o que perdi e como funcionam por dentro os eventos, o reducer e o openAsync.'
keywords: 'overlay-kit, gerenciamento de estado de modais em React, interface declarativa, openAsync, useOverlay, modal com Promise, overlay React, nice-modal-react'
locale: pt-BR
translationOf: '260921'
sourceHash: aee64a559fb8a6b52010dd747b1aae985c694053425332601b135523a67ada12
---

Neste post quero falar sobre interfaces que tratam overlays de forma declarativa.

Eu gosto de código declarativo. Abrir um overlay, fechá-lo e fazer trabalho assíncrono dentro dele é uma sequência que, na minha opinião, o próprio overlay deveria gerenciar. Quando quem chama guarda `isOpen` e fica ligando e desligando esse valor, o código que lida com o estado acaba em um lugar diferente do componente que o desenha.

Só que os modais das telas pelas quais eu era responsável na empresa eram exatamente o contrário. Se um modal estava aberto ficava em uma store global, quem chamava abria e quem chamava fechava. Quem chamava também escrevia o código que fechava o modal e os callbacks que recebiam o resultado. Por isso passei bastante tempo pensando em como levar isso para uma direção declarativa e, no fim, reescrevi tudo.

Enquanto fazia esse trabalho, olhei o [overlay-kit](https://github.com/toss/overlay-kit). Era próximo da interface que eu buscava. Este post registra a interface declarativa do overlay-kit e como projetei o sistema de modais interno.

## O modal que eu guardava em estado

No meu post sobre [gerenciamento de estado](/260518), usei a flag de abertura de um modal como o exemplo mais simples de estado local. Escrevi que é um estado usado dentro de um único componente, que o mundo externo não precisa nem tem o direito de conhecer. Continuo achando isso verdade. Mas assim que você tem dezenas de tipos de modal, eles se empilham uns sobre os outros e precisam devolver um valor para quem os chamou, esse estado não fica mais dentro do componente.

O código que herdei mantinha a lista de modais abertos em uma store global. Como é código da empresa, o exemplo abaixo preserva a estrutura e troca os identificadores.

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

Três coisas nesse código me incomodavam.

**Primeira: a função que abre precisa sair de um hook.** `openPopup` e `closePopup` são valores selecionados da store, então só é possível obtê-los dentro de um componente. Isso significa que o código que abre um modal não consegue sair do componente. Para abrir um modal em algum lugar onde não dá para usar hooks, como um interceptador de respostas da API ou um guard de rota, você precisa repassar essa função como argumento.

**Segunda: o resultado volta por callbacks.** Se a nota foi salva ou se a pessoa simplesmente fechou o diálogo chega por dois ramos distintos, `onSubmit` e `onClose`. Tudo o que você quiser fazer depois de abrir o modal vai para dentro de um callback. E se precisar abrir dois modais em sequência, surge um callback dentro de outro callback.

**Terceira: fechar é responsabilidade de quem chama.** É quem chama que invoca `closePopup(PopupType.ADD_NOTE)`. O modal não se fecha sozinho: o lado que o abriu lembra de que tipo de modal se trata e o fecha. É por isso que a mesma constante aparece três vezes em uma só função.

O que as três têm em comum é que abrir um único modal obriga quem chama a escrever três tipos de código: o que abre, o callback que recebe o resultado e o que fecha.

Se decidir o que mostrar é tarefa de quem chama, aqui quem chamava carregava também tudo o que vinha depois. Em especial, `closePopup(PopupType.ADD_NOTE)` aponta o alvo com uma constante de texto. Escrever a constante de outro modal ainda passa na checagem de tipos porque pertence ao mesmo enum, e o modal errado é fechado.

## Uma interface que espera um resultado

Então, qual dessas três dá para eliminar? A resposta a que cheguei foi transformar a abertura de um modal em uma chamada de função e fazer essa função devolver uma Promise com o resultado.

```tsx
const result = await openModalAsync('ADD_NOTE', { itemId });
if (result.reason !== 'confirmed') return;

await saveNote(result.value);
```

Três coisas mudaram. A função que abre virou uma função de módulo em vez de um hook, então pode ser chamada fora de um componente. O resultado virou um valor de retorno em vez de um argumento de callback, então o trabalho seguinte permaneceu dentro do fluxo da função que chama. E fechar passou a ser tarefa do próprio componente do modal.

Como o tipo de retorno é `Promise<ModalResult<V>>`, o fim do modal se concentrou em um único valor.

Uma Promise termina apenas uma vez. Resolver uma Promise já resolvida não faz nada, então todos os motivos pelos quais um modal pode terminar precisam caber nesse único valor. Por isso dividi `reason` em cinco casos: a pessoa confirmou, a pessoa cancelou explicitamente, fechou sem valor, foi substituído por um modal novo do mesmo tipo, ou foi encerrado à força em uma limpeza geral. Com um único booleano, "cancelado" e "a tela inteira foi desmontada" viram o mesmo valor, e nos fluxos que precisam de limpeza é necessário distinguir esses dois casos.

Na direção oposta, se você nunca a encerra, quem chama espera para sempre. Nada acontece quando um callback não é chamado, mas um `await` simplesmente não retorna. Por isso, cada vez que surgia um novo caminho para remover um modal da tela, eu precisava verificar se aquele caminho também encerrava a Promise. A substituição e o encerramento forçado têm cada um o seu `reason` justamente por causa disso.

## O ponto de chamada do overlay-kit

O ponto de chamada do overlay-kit, da toss, é assim.

```tsx
const confirmed = await overlay.openAsync<boolean>(({ isOpen, close }) => (
  <ConfirmDialog
    open={isOpen}
    onConfirm={() => close(true)}
    onCancel={() => close(false)}
  />
));
```

Três pontos me pareceram uma boa interface.

**O que abre está no ponto de chamada.** A minha versão passa uma chave de texto, `'ADD_NOTE'`. Qual componente essa chave representa é o arquivo de registry que sabe: um arquivo com um único objeto que associa cada chave de texto à função `import()` que carrega aquele modal.

```tsx
export const modalImporters = {
  ADD_NOTE: () => import('.../add-note-modal'),
  CONFIRM: () => import('.../confirm-modal'),
  // 모달 종류만큼 이어진다
} as const;
```

O overlay-kit escreve o JSX ali mesmo. Quem lê o código sabe o que vai aparecer sem precisar ir até aquele arquivo.

**O tipo do resultado é decidido no ponto de chamada.** O argumento de tipo de `openAsync<boolean>` é ao mesmo tempo o tipo do argumento de `close` e o tipo do resultado do `await`. Não é preciso declarar um tipo de resultado por modal e registrá-lo em uma tabela.

**Fechar e remover são coisas separadas.** O controller recebe quatro props: `overlayId`, `isOpen`, `close` e `unmount`. `close` coloca `isOpen` em `false` e deixa o componente onde está. `unmount` é o que de fato o remove. [O guia oficial sobre abrir e fechar overlays](https://overlay-kit.slash.page/ko/docs/guides/introduction) explica assim.

> Essa diferença acontece porque, ao usar `close`, o overlay é mantido na memória para que a animação de fechamento possa ser exibida.

A minha versão não tem essa distinção. Ao fechar, sai da lista imediatamente. Isso significa que eu estava deixando as animações de fechamento a cargo da biblioteca de componentes e que só lidava com telas em que isso era possível.

## De overlay.open até a renderização

Quando você gosta de uma interface, a pergunta seguinte é o que há dentro. Para uma única função de módulo desenhar um componente dentro da árvore do React, algo precisa ligar os dois lados.

### Eventos e reducer

`overlay.open` não muda o estado. Ele emite um evento.

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

Quem recebe é o `OverlayProvider`. O provider guarda um `useReducer`, assina o evento e coloca `ADD` no reducer. O que merece atenção aqui é que `isOpen` entra como `false`.

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

E, no frame seguinte à montagem do controller, ele despacha `OPEN` para colocar `isOpen` em `true`.

```tsx
// packages/src/context/provider/content-overlay-controller.tsx
useEffect(() => {
  requestAnimationFrame(() => {
    overlayDispatch({ type: 'OPEN', overlayId });
  });
}, [overlayDispatch, overlayId]);
```

Aqui houve uma parte que não bateu com a minha expectativa.

**O estado não fica fora do React.** Como é uma API que abre por meio de uma função de módulo, imaginei que a store também estivesse no nível de módulo, mas na verdade é um `useReducer` dentro do provider. A única coisa fora do React é o barramento de eventos, e ele não guarda estado. Os overlays são renderizados como irmãos ao lado dos `children` do provider. Ele não usa `createPortal` nem importa `react-dom`.

Há mais uma coisa que chama atenção. Do ponto de chamada é uma linha só, `overlay.open()`, mas por dentro existe um procedimento de ordem fixa: emitir um evento, colocar `ADD` no reducer, esperar um frame e colocar `OPEN` de novo. Uma interface declarativa não elimina o código imperativo: ela o move para o outro lado de uma fronteira.

### O lado que abre e o lado que fecha

O `requestAnimationFrame` que acabamos de ver e a separação entre `close` e `unmount` da seção anterior parecem coisas distintas à primeira vista. Na prática são dois mecanismos que tapam as duas pontas da mesma restrição.

Essa restrição é que uma transição CSS só roda quando **tanto o estado inicial quanto o final são de fato renderizados**. [O guia de transições CSS da MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions) alerta sobre elementos recém-adicionados ao DOM.

> This is treated as if the initial state had never occurred and the element was always in its final state.

A falha aparece de duas formas. Ao abrir não existe estado inicial, então nada roda; ao fechar o elemento some antes de o estado final ser pintado, então também não roda.

| | Ao abrir | Ao fechar |
|---|---|---|
| Problema | Não existe estado inicial | Some antes de pintar o estado final |
| Solução | Montar fechado primeiro e abrir no frame seguinte | Manter montado, desligar só `isOpen` e remover depois |
| Mecanismo | `ADD(isOpen: false)`, rAF, `OPEN` | `CLOSE`, animação, `REMOVE` |
| Quem sabe o momento | A biblioteca | Quem usa |

A última linha explica por que o lado que fecha fica a cargo de quem usa. No lado que abre, a biblioteca conhece a constante: um frame basta. No lado que fecha, a biblioteca não tem como saber se a animação dura 200 ou 400 milissegundos.

**Por isso um lado é automático e o outro é entregue como uma função chamada `unmount`.**

O que sustenta o lado que fecha está no reducer. `CLOSE` apenas inverte, dentro de `overlayData`, o valor `isOpen`, e não toca em `overlayOrderList`. O provider renderiza percorrendo essa lista, então o componente continua vivo enquanto permanecer nela. Ele só é desmontado quando `REMOVE` o tira de lá.

**Dito isso, o rAF nem sempre é necessário.** O react-transition-group [não executa a transição de entrada na primeira montagem por padrão](https://reactcommunity.org/react-transition-group/transition). Ele a pula mesmo quando `in` já é `true`, e é preciso ativar `appear`. O rAF do overlay-kit muda `isOpen` de `false` para `true` depois da montagem, o que cobre esse caso.

### Vinte linhas embrulhadas em uma Promise

`openAsync` não é uma implementação à parte, e sim uma camada fina em volta de `open`.

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

Tudo o que ele faz é trocar o `close` que chega ao controller. O `close` original não recebe argumentos; este recebe um, resolve a Promise com ele e depois chama o `close` original. É também por isso que o tipo do resultado é decidido no ponto de chamada. `T` é ao mesmo tempo o tipo do argumento de `close` e o tipo da Promise.

Ainda assim, essa estrutura tem um buraco. A resolução só acontece quando `close` é chamado. Por isso, se você remover um overlay apenas com `unmount`, a Promise fica pendente para sempre. Está registrado na [issue #169](https://github.com/toss/overlay-kit/issues/169) e acho que precisa ser corrigido, mas a issue continua aberta.

O fato de a resolução acontecer em `close` tem outra implicação. É o momento em que o fechamento começa, não o momento em que a animação de fechamento termina. Isso não é problema em um fluxo que pede confirmação e depois chama uma API, mas em um fluxo que pede confirmação e depois abre o próximo modal, o segundo sobe enquanto o primeiro ainda está desaparecendo.

### Onde o design deu uma volta completa

Segui o histórico de commits para explorar como o design chegou até aqui e descobri que a estrutura não foi assim desde o começo. A 1.0 usava a mesma combinação de eventos e reducer de hoje. A 1.2.0 moveu o estado para uma store externa no nível de módulo, lida com `useSyncExternalStore`, e a 1.8.0 devolveu tudo para um reducer.

O motivo da volta atrás está escrito na [issue #148](https://github.com/toss/overlay-kit/issues/148).

> `useSyncExternalStore` resolves tearing issues, but it doesn't work well with suspense.

Quando buscar dados dentro de um overlay o fazia suspender, o React avisava que um componente havia suspendido enquanto respondia a uma entrada síncrona. O objetivo original de migrar para uma store externa era permitir ler o estado do overlay sem um hook, e o PR da época diz claramente que o objetivo não foi alcançado da forma pretendida. No fim o objetivo foi resolvido com um hook e apenas o mecanismo de armazenamento voltou ao lugar de origem.

O que levo desse registro não é uma conclusão, e sim um critério. Colocar o estado fora do React libera de onde você pode chamar as coisas, ao custo de abrir espaço para sair de compasso com o agendamento do React. O overlay-kit deixou de fora apenas o ponto de chamada e manteve o estado dentro.

## Ao reabrir com o mesmo id

Algo me chamou atenção ao ler o reducer. Logo no começo de `ADD` existe este ramo.

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

Se você abre um overlay informando um `overlayId`, faz `close` e depois o abre de novo com o mesmo id, cai nesse ramo. Só que o valor de retorno reaproveita o **objeto `overlay` existente**.

Nada usa o `action.overlay` que acabou de chegar nem o `controller` dele.

Ler não foi suficiente para me convencer, então clonei o repositório da biblioteca e escrevi um teste. Preparei dois componentes que desenham conteúdos diferentes e os abri em ordem com o mesmo id.

```tsx
const ControllerA = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">AAA</div> : null);
const ControllerB = ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="b">BBB</div> : null);

overlay.open(ControllerA, { overlayId: 'id-close' });
overlay.close('id-close');
overlay.open(ControllerB, { overlayId: 'id-close' });
```

Estes foram os resultados, executados com vitest na branch main na versão 1.9.0 do overlay-kit.

| Procedimento | O que foi renderizado |
|---|---|
| Abrir A, `close`, reabrir com B | `AAA`. B é descartado |
| Abrir A, `unmount`, reabrir com B | `BBB`. Substituição correta |
| Subir um contador para 1, `close`, reabrir | `1`. O estado do componente é preservado |

A terceira linha é um comportamento que a documentação descreve como recurso, então saiu como o esperado. O problema é a primeira linha.

**Se você só faz `close` e reabre com o mesmo id, o JSX novo com o conteúdo alterado é ignorado e a tela anterior aparece exatamente como estava.**

Aqui verifiquei mais uma coisa. Mais adiante, no mesmo reducer, há este comentário.

```ts
/**
 * @description Brings the overlay to the front when reopened after closing without unmounting.
 */
overlayOrderList: [...state.overlayOrderList.filter((item) => item !== action.overlay.id), action.overlay.id],
```

Ele diz que reabrir depois de fechar traz o overlay para a frente. Mas, como o ramo anterior chega antes ao `return`, essa linha não é executada nessa situação. Empilhei dois overlays, fiz `close` no de baixo, reabri, e a ordem do DOM não mudou.

**O que o comentário descreve e o que acontece de fato são coisas diferentes.**

Só que não verifiquei se isso aparece como um problema visível na tela. O teste olhou apenas a ordem do DOM e, como a maioria das bibliotecas de diálogo usa z-index próprio ou portais, a ordem do DOM não equivale à ordem visual.

A minha versão expõe essa mesma situação como uma opção. Ao reabrir um modal do mesmo tipo, quem chama escolhe entre manter o existente ou substituí-lo com props novas. Se escolher a substituição, a Promise existente termina como `replaced`. Essa é uma das razões pelas quais dividi antes o tipo do resultado em cinco ramos.

**É aqui que os dois designs divergem.** A minha abordagem trata modais como dados. Como a chave de texto e as props ficam em uma store, dá para substituí-los ou atualizá-los depois. O overlay-kit trata modais como funções. O controller é um closure, então, uma vez guardado, não há como mudar o conteúdo dele de fora.

## O preço do JSX no ponto de chamada

Então, escrever JSX no ponto de chamada é sempre melhor do que usar uma chave de texto? Eu acho que não. Há três preços a pagar.

**A divisão de código deixa de ser o padrão.** Escrever JSX no ponto de chamada significa que quem chama importa aquele componente. Se o modal é uma tela de edição pesada e poucas pessoas apertam aquele botão, esse peso entra no bundle da tela de listagem.

`React.lazy` funciona dentro de um controller. Medi do mesmo jeito que no teste anterior: o módulo não era carregado antes do `open` e, ao abrir, o fallback do `Suspense` aparecia primeiro e depois o conteúdo era renderizado.

```tsx
const Heavy = React.lazy(() => import('./HeavyModal'));

overlay.open(({ isOpen, close }) => isOpen ? (
  <Suspense fallback={<Spinner />}><Heavy onClose={close} /></Suspense>
) : null);
```

Ou seja, a diferença não está na possibilidade, e sim no padrão.

Na minha versão todos os valores do arquivo de registry são funções `import()`, então a divisão de código é imposta pela estrutura. Com o overlay-kit é preciso escrevê-la à mão em cada ponto de chamada.

**Quem usa precisa decidir onde chamar `unmount`.** Se você só chama `close` e para por aí, as informações do overlay ficam na memória. A documentação oficial alerta sobre isso e dá orientações separadas sobre onde prender `unmount` em cada design system. MUI e Mantine têm um callback para quando a transição termina, então basta prendê-lo ali, mas para bibliotecas sem esse callback a documentação manda colocar um timer com a duração da animação. O fato de essas orientações estarem divididas por biblioteca já é, em si, o custo dessa decisão.

**Os overlays são renderizados onde está o provider.** Como ele não usa portais, o mesmo código roda no React Native, o que é uma vantagem. Em contrapartida, o contexto fornecido abaixo do `OverlayProvider` não é visível dentro de um overlay. Ao abrir um modal que depende do contexto de rota ou de formulário, convém verificar esse ponto primeiro.

## Até onde vai a palavra declarativo

Depois de escrever até aqui, uma coisa me incomoda. Comecei este post chamando essa interface de declarativa, e no entanto `overlay.openAsync(...)` é uma chamada de função por qualquer ângulo que se olhe.

Comecemos pela definição. [A documentação do React](https://react.dev/learn/reacting-to-input-with-state) traça a linha assim.

> In React, you don't directly manipulate the UI--meaning you don't enable, disable, show, or hide components directly. Instead, you **declare what you want to show,** and React figures out how to update the UI.

A analogia do mesmo documento é mais nítida. O imperativo é ir cantando cada curva para quem dirige o carro; o declarativo é entrar em um táxi e dizer o destino.

**Uma interface declarativa não elimina o procedimento imperativo: ela o move para o outro lado de uma fronteira e dá um nome a essa fronteira.** O interior do overlay-kit que vimos é exatamente isso. O ponto de chamada tem uma linha, enquanto lá dentro roda um procedimento que emite um evento e faz dois dispatch.

Vejamos, então, onde cada projeto aplica a palavra. A documentação do overlay-kit chama a abordagem anterior de imperativa. O que ela aponta é o código que guarda a flag de abertura com `useState` e a inverte em um manipulador de eventos. O que ela chama de declarativo é o lado que trata o overlay como uma ação, e não como estado. O [artigo sobre código declarativo](https://toss.tech/article/frontend-declarative-code) do blog técnico da toss define a palavra de forma mais ampla: código declarativo é código com um nível de abstração mais alto, e um hook que abstrai a ação de exibir um overlay é um exemplo disso.

Por isso decidi estreitar a palavra assim: **quem chama não escreve o código que fecha**. Quando fechar, e o que permanece na tela enquanto fecha, quem decide é o overlay; quem chama escreve apenas o que mostrar e o que espera receber de volta.

Por esse critério, o código escrito com `useState` que guarda `isOpen` e o código que mantém uma lista de modais abertos em uma store global enquanto quem chama os fecha estão do mesmo lado. Muda só onde se guarda; nos dois, quem chama escreve a instrução de fechamento.

## Para encerrar

O que eu corrigi no código da empresa não foi, no fim das contas, onde o estado ficava guardado. Foi quem escreve o código que fecha.

Mesmo quando usávamos uma store global, o estado já estava fora do componente, mas as instruções que abriam e fechavam continuavam no ponto de chamada. Só depois de trocar por um único `await` é que essas instruções entraram no modal.

O overlay-kit chegou ao mesmo lugar e deu mais um passo: ele coloca também no ponto de chamada o que será exibido. Acho que essa interface se lê bem. E, enquanto escrevia isto, descobri quanto custa esse passo.

**Era a diferença entre tratar um modal como função e tratá-lo como dados.** Escrever JSX no ponto de chamada transforma o controller em um closure, e o conteúdo de um closure não pode ser alterado de fora depois de guardado. É dessa estrutura que nasce o JSX ignorado ao reabrir com o mesmo id. Tratá-lo com uma chave de texto transforma o modal em um valor guardado em uma store que você pode substituir, atualizar e dividir em chunks, mas quem chama só chega a conhecer um nome.

Acho que a sensação de gostar da interface de uma biblioteca é um sinal bastante confiável. Ainda assim, vale a pena colocar em palavras pelo menos uma vez para o que exatamente essa sensação aponta. Sem fazer isso, você não consegue distinguir se o que agradou foi a interface ou a reputação de quem usa a biblioteca. Recomendo a quem estiver lendo fazer esse exercício uma vez com alguma biblioteca que esteja usando agora.

:::ref
[docs] [Documentação oficial do overlay-kit](https://overlay-kit.slash.page/)
[repo] [desko27/react-call](https://github.com/desko27/react-call)
:::
