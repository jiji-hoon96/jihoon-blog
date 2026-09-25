---
emoji: 🛡️
title: 'Propagação de erros'
seoTitle: "Propagação de erros: o que o ErrorBoundary recebe de fato"
date: '2025-11-17'
updatedAt: '2026-09-24'
categories: frontend React TanStack-Query tratamento-de-erros
description: 'Lance o mesmo erro de sete lugares e só quatro chegam ao ErrorBoundary. Este post segue para onde cada tipo realmente propaga.'
keywords: "tratamento de erros frontend, propagação de erros, React ErrorBoundary, o que ErrorBoundary não captura, erro no startTransition, unhandledrejection, window onerror, React 19 onCaughtError, TanStack Query throwOnError, erro no useSuspenseQuery, react-router loader ErrorBoundary, React.lazy falha ao carregar chunk, fetch não rejeita com 404"
locale: pt-BR
translationOf: '251117'
sourceHash: 3f6e8fa00d3cc487b5caedfdc24f91ad33196ab0eb9c55899c052ad83bdee38c
---

Neste post quero falar sobre **até onde um erro sobe no frontend**.

Desenhar um `ErrorBoundary` é fácil. Você põe um na rota, envolve cada tela em um `ErrorBoundary` e, no papel, não sobra nenhum buraco. O difícil é saber o que aquele `ErrorBoundary` **recebe de verdade**.

A palavra "propagação" do título quer dizer **até que ponto um erro lançado sobe e quem acaba recebendo**. O lugar onde ele é lançado e o lugar onde é recebido nem sempre são o mesmo, e por isso é preciso contar os dois separadamente.

Então resolvi contar. Lancei o mesmo `new Error('boom')` sete vezes, mudando só o lugar, e observei se ele chegava ao `ErrorBoundary` ou se passava direto pelo `ErrorBoundary` e ia parar em outro lugar.

O widget abaixo é esse experimento. Se você escolher à esquerda o lugar de onde lançar, o erro é lançado de verdade dentro da caixa tracejada. Essa caixa é o `ErrorBoundary`, e quando o `ErrorBoundary` recebe, o interior vira um fallback. O que não é recebido parece que não aconteceu nada, então o widget também escuta em `window` os eventos `error` e `unhandledrejection` e escreve embaixo para onde foi.

:::widget-error-propagation
:::

Dos sete, só quatro chegam ao `ErrorBoundary`. Os outros três são lançados dentro do `ErrorBoundary` e mesmo assim atravessam esse mesmo `ErrorBoundary` e saem para o escopo global.

Neste post eu verifico por que essa divisão aparece, tipo de erro por tipo de erro: os que terminam em tempo de compilação, os que saem do render e do ciclo de vida, os que vêm dos dados do servidor, os que saem da navegação, os que as bibliotecas externas lançam e os que saem de eventos e código assíncrono. A ideia é descobrir para onde cada um propaga. **Em quantas camadas dividir o lado que recebe, e como desfazer a falha, não são tratados aqui.** Desenhar camadas sem conhecer as rotas de propagação deixa essas camadas vazias, e por isso a ordem é esta.

Verifiquei de duas formas. O comportamento das bibliotecas eu li abrindo as fontes instaladas em vez de confiar na memória, e tudo que dava para confirmar lançando eu rodei de verdade no widget acima.


## ErrorBoundary

Primeiro convém deixar claro o que é um `ErrorBoundary`. Um `ErrorBoundary` são **dois métodos de ciclo de vida de um componente de classe**. Só que a gente chama por outro nome.

Em `react-error-boundary` existem apenas duas implementações.

```js
static getDerivedStateFromError(e) { ... }
componentDidCatch(e, t) { ... }
```

A documentação oficial do React separa o momento em que cada método roda. `getDerivedStateFromError` roda na **fase de render** e produz o estado com que o fallback é desenhado, enquanto `componentDidCatch` roda na **fase de commit** e cuida de efeitos colaterais como o log. Em qualquer um dos casos, eles só recebem **o que o React capturou dentro da árvore e entregou**.

Então a definição do que um `ErrorBoundary` recebe é uma só. **Foi lançado de um lugar que o React consegue capturar?**

A documentação do React também deixa escrito o lado que não é recebido. São estes quatro.

::::quote
:::translation
Manipuladores de eventos, renderização no servidor, erros lançados pelo próprio `ErrorBoundary` em vez de pelos seus filhos, código assíncrono (por exemplo, callbacks de `setTimeout` ou de `requestAnimationFrame`); há uma exceção: o Hook `useTransition` e a função `startTransition` que ele devolve. Erros lançados dentro dessa função de transição são capturados pelos error boundaries.
:::

:::original
Event handlers, Server side rendering, Errors thrown in the error boundary itself (rather than its children), Asynchronous code (e.g. `setTimeout` or `requestAnimationFrame` callbacks); an exception is the usage of the `startTransition` function returned by the `useTransition` Hook. Errors thrown inside the transition function are caught by error boundaries
:::
::::

O resultado do widget bate exatamente com essa frase. Sete lugares se dividem em dois destinos.

![À esquerda há sete lugares de lançamento na vertical e à direita dois destinos. Durante o render, dentro do useEffect, dentro do startTransition e a rejeição do import do lazy vão por setas azuis até ErrorBoundary, enquanto dentro de um manipulador onClick, dentro de um callback de setTimeout e a rejeição de uma Promise vão por setas cinzas até window](1.png?w=720)

`startTransition` é a exceção porque o trabalho que está dentro dele passa pelo escalonador do React. O React envolve essa execução com as próprias mãos, então consegue capturá-la e devolvê-la para a árvore. Pelo mesmo motivo `setTimeout` não dá para capturar: quando aquele callback roda, o React já não está ali.

Antes é preciso saber uma coisa. **Com um componente de função não dá para construir um `ErrorBoundary`.**

Quando o React encontra um erro lançado, ele sobe daquele ponto na direção do pai procurando o limite que vai recebê-lo. `throwException`, que cuida desse percurso, olha a `tag` presa em cada fiber, e os únicos valores em que ele para são componente de classe e raiz. A `tag` de um componente de função não é nenhum dos dois, então a busca passa direto. **Ele não vira um limite não porque falte API, mas porque a busca nem sequer olha para ele.**

![Quatro caixas na horizontal. Da esquerda, os componentes de função Child e FnBoundary têm tag 0, o componente de classe ErrorBoundary tem tag 1 e a raiz HostRoot tem tag 3. Uma seta que sai de Child passa por FnBoundary e para em ErrorBoundary, e a linha que continua até HostRoot é tracejada](2.png?w=720)

Essa `tag` é decidida por herdar ou não de `React.Component`. Por isso não adianta pendurar `getDerivedStateFromError` em uma função como `static`. Pendurei e rodei: aquela função não foi chamada nenhuma vez, o erro não achou limite, subiu até a raiz e o React tirou a árvore da tela.

Então instalar `react-error-boundary` não é acrescentar uma funcionalidade que não existe. O `ErrorBoundary` da 6.1.6 também é uma classe que herda de `Component` e carrega os mesmos dois métodos. O que a biblioteca faz é escrever essa classe uma vez só e escondê-la.


## O que termina em tempo de compilação

Já que estamos contando tipos de erro, vamos começar pelo primeiro deles: os erros de tipo.

Esse é o único que não chega ao usuário. Se você lê uma propriedade que não existe ou o tipo de um argumento não bate, o build trava, e código travado não é publicado. Por isso não há rota de propagação a seguir. **Os erros de tipo ficam de fora deste post não porque não importem, mas porque não existem em tempo de execução.**

O problema vem depois. **Até onde** a checagem de tipos garante?

```ts
async function getComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
  return data.comments
}
```

O tipo de retorno diz `Promise<Comment[]>`, então todo código que chama essa função acredita que recebe um array. Mas `Response` declara seu `json()` assim no `lib.dom.d.ts` do TypeScript 5.9.3.

```ts
json(): Promise<any>;
```

`any`. É aqui que a checagem de tipos se interrompe. O compilador nunca viu o valor que o servidor devolveu, e o argumento de tipo ou a anotação de retorno que você põe depois são **uma declaração, não uma checagem**. Ninguém insere por você o código que confere essa declaração em tempo de execução.

Então quando o servidor devolve `200` com `{ commits: null }`, a linha que lê `commits.length` lança um `TypeError` durante o render. O HTTP foi sucesso e os tipos passaram, e ainda assim a tela quebra.

**Onde os tipos terminam é onde uma checagem em tempo de execução deve ficar.** Onde você coloca essa checagem decide por qual rota a mesma falha vai. Se estourar ao ler durante o render, vira um erro de render e vai para o `ErrorBoundary`; se você checar antes, no lugar onde os dados chegam, e lançar ali, vira a falha daquela requisição. A seção **Render e ciclo de vida** mais abaixo trata disso.


## Render e ciclo de vida

O que é lançado dentro da árvore do React propaga de forma simples. **O `ErrorBoundary` mais próximo recebe.**

As exceções durante o render entram aqui. O `commits.length` de antes é uma, e chamar `map` em um valor que você achava ser um array é outra. Esse grupo não tem o que fazer além de lançar, então sempre chega a um `ErrorBoundary`.

O que é lançado dentro de `useEffect` também é capturado. O React roda os effects por conta própria depois do commit, então consegue envolver essa execução. Mas um **callback assíncrono chamado dentro** de um effect é diferente.

```tsx
useEffect(() => {
  throw new Error('boom')          // ErrorBoundary 가 받는다
}, [])

useEffect(() => {
  setTimeout(() => {
    throw new Error('boom')        // ErrorBoundary 를 지나친다
  }, 0)
}, [])
```

Os dois trechos estão dentro do mesmo `useEffect` e ainda assim as rotas de propagação são diferentes. **O critério não é estar dentro de um `ErrorBoundary`, e sim se o React está segurando aquela execução.**

Desse grupo basta lembrar de mais uma coisa. O console de desenvolvimento do React 19 põe o nome do componente no erro capturado. Ao rodar o widget, o render, o effect e a transition deram `The above error occurred in the <Thrower> component`, e só `lazy` deu `occurred in one of your React components`. `lazy` ainda não tem componente no momento em que é rejeitado, então não consegue escrever um nome. Essa diferença vira uma pista quando você só tem a pilha para achar o lugar.


## Dados do servidor

É aqui que começa a parte chata que a gente precisa tratar desenvolvendo frontend. O motivo é que uma falha do servidor **não vira erro automaticamente**.

### fetch não rejeita sozinho diante de um erro do servidor

A MDN deixa isso escrito com clareza.

::::quote
:::translation
A promise de `fetch()` só é rejeitada quando a própria requisição falha, por exemplo porque a URL está malformada ou porque houve um erro de rede. Ela não é rejeitada quando o servidor responde com um código de status HTTP que indica erro (`404`, `504`, etc.).
:::

:::original
A `fetch()` promise only rejects when the request fails, for example, because of a badly-formed request URL or a network error. A `fetch()` promise does not reject if the server responds with HTTP status codes that indicate errors (`404`, `504`, etc.).
:::
::::

Ou seja, se você usa só `fetch`, uma resposta `500` é uma **Promise com sucesso**. Como nada foi lançado, o `ErrorBoundary` não fica sabendo e a biblioteca de dados também não. A documentação do TanStack Query aponta o mesmo: para uma query ser considerada falha, o `queryFn` precisa lançar ou devolver uma Promise rejeitada, e enquanto o `axios` lança por conta própria, o `fetch` não faz isso.

Então transformar a falha do servidor em erro é **um trabalho que você precisa fazer**.

```ts
const response = await fetch('/todos/' + todoId)
if (!response.ok) {
  throw new Error('Network response was not ok')
}
```

Sem estas três linhas, o resto desta seção não significa nada. O que não é lançado não propaga para lugar nenhum.

### Os cinco caminhos por onde uma falha se divide

Depois que a falha virou falha, começa a próxima divisão. Um mesmo `500` se espalha para cinco lugares dependendo de **como foi chamado**. O critério são os valores padrão, sem mexer em nenhuma opção.

**`useQuery` não lança o erro.** Se você abrir `useQuery.js`, a string `throwOnError` não aparece em lugar nenhum. Se lança ou não, quem decide é `query-core` com seu `shouldThrowError`.

```js
function shouldThrowError(throwOnError, params) {
	if (typeof throwOnError === "function") return throwOnError(...params);
	return !!throwOnError;
}
```

Sem valor fica `!!undefined`, portanto `false`. Por isso a falha entra só em `query.error` e o componente renderiza normalmente. O `ErrorBoundary` de fora nunca fica sabendo que chegou a vez dele.

**`useSuspenseQuery` lança, mas nem sempre.** Esse hook espalha as opções e depois sobrescreve `throwOnError`.

```js
return useBaseQuery({
  ...options,
  enabled: true,
  suspense: true,
  throwOnError: defaultThrowOnError,
  placeholderData: void 0
}, QueryObserver, queryClient);
```

A sobrescrita vem depois de `...options`, então **o `throwOnError` passado por quem chama é ignorado.** E a decisão padrão que ocupa esse lugar está em uma linha só de `suspense.js`.

```js
const defaultThrowOnError = (_error, query) => query.state.data === void 0;
```

**Se há cache para mostrar, não lança.** Na prática o lugar onde esse desvio se separa é uma revalidação em segundo plano. Quem entra pela primeira vez tem o cache vazio, então a falha vai para o `ErrorBoundary` e vê o fallback. Quem já estava na tela, vai para outra aba e volta, dispara uma nova requisição, e se ela falhar o cache ainda guarda os dados antigos, então nada é lançado. A tela continua mostrando o valor velho e não muda sozinha.

A tela não quebrar costuma ser um bom comportamento. Só que junto vem **a tela também não avisar**, e escolher isso sabendo é diferente de levar sem saber.

**Nenhuma das duas funções que uma mutation devolve vai para o `ErrorBoundary`.** Os motivos são diferentes. Se você abrir `useMutation.js`, um dos lados engole a rejeição diretamente.

```js
observer.mutate(args[0], args[1]).catch(noop);
```

Isto é o `mutate`. No mesmo arquivo, `mutateAsync` expõe `result.mutate` como está, e esse `result.mutate` é o que `mutationObserver.js` colocou ali com `mutate: this.mutate`, então acaba sendo a mesma função que a linha acima envolveu. **Só um dos lados passa por `.catch(noop)`.** Aquela rejeição estoura no lugar onde se faz `await`, não é lançada durante o render, então esse lado também não tem nada a ver com o `ErrorBoundary`.

**Isso não quer dizer que uma mutation seja para sempre alheia ao `ErrorBoundary`.** No corpo do hook há mais um interruptor.

```js
if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) throw result.error;
```

Se você der `throwOnError`, esta linha lança **durante o render**, e aí sim vai para o `ErrorBoundary`. As duas funções devolvidas não chegarem ao `ErrorBoundary` e o hook não lançar são duas histórias diferentes.

![De um único 500 do servidor à esquerda saem cinco setas para useQuery, useSuspenseQuery, um hook com throwOnError ligado, mutate e mutateAsync, e cada uma segue até query.error, ErrorBoundary, ErrorBoundary, mutation.error e o catch de quem chama. Só as duas caixas centrais de ErrorBoundary estão ligadas por uma linha tracejada, marcadas como as duas que ErrorBoundary recebe](3.png?w=720)

Resumindo, o mesmo `500` tem cinco destinos: o campo `query.error`, o campo `mutation.error`, o `catch` de quem chama e os dois casos que vão para o `ErrorBoundary`. Os dois que vão para o `ErrorBoundary` são `useSuspenseQuery` falhando sem cache e `throwOnError` ligado. **Quem decide o destino é a forma de chamar, não o tipo de falha.**


## Navegação

As falhas que aparecem ao trocar de tela se dividem em duas. O critério é **estar dentro ou fora da árvore do React**.

### loader roda fora da árvore

O `loader` do router é uma função que roda antes de o render começar. Não é um componente React, então nem `getDerivedStateFromError` nem `componentDidCatch` chegam até ele. Por mais que você envolva tudo com `react-error-boundary`, aquele `ErrorBoundary` não consegue ver a falha de um loader.

Em vez disso o router mantém o próprio sistema de `ErrorBoundary`. A documentação do React Router escreve assim.

::::quote
:::translation
Os route modules capturam automaticamente os erros do seu código e renderizam o `ErrorBoundary` mais próximo.
:::

:::original
route modules will automatically catch errors in your code and render the closest `ErrorBoundary`.
:::
::::

Como o mais próximo é escolhido está na fonte. `findNearestBoundary` escolhe assim.

```js
function findNearestBoundary(matches, routeId) {
  let eligibleMatches = routeId ? matches.slice(0, matches.findIndex((m) => m.route.id === routeId) + 1) : [...matches];
  return eligibleMatches.reverse().find((m) => m.route.hasErrorBoundary === true) || matches[0];
}
```

Ele percorre as rotas casadas de trás para frente, escolhe a primeira que tem um `ErrorBoundary` e, se não houver nenhuma, manda para a rota da frente. **Por isso pôr mais um `ErrorBoundary` em uma rota inferior não é duplicar trabalho, e sim estreitar a área sobre a qual o fallback é desenhado.**

O lado que lê também é diferente. Um `ErrorBoundary` de rota não recebe o erro por props, ele tira direto com `useRouteError()`. Se veio ou não com um código de status se distingue com `isRouteErrorResponse(error)`. Essas duas ferramentas não existem no `ErrorBoundary` do React.

### A rejeição do lazy está dentro da árvore

Dentro da mesma navegação, o lado que recebe o código mais tarde funciona ao contrário. Quando `lazy(() => import('./Tab'))` tem seu `import()` rejeitado, o React pega isso e lança para o **`ErrorBoundary` mais próximo**. O quarto botão do widget é essa rota.

Quando sai um deploy, os arquivos de chunk antigos somem, mas uma tela aberta antes do deploy continua com os endereços antigos. Se nesse estado ela pedir aquele código, o `import()` é rejeitado e o Chrome lança `TypeError: Failed to fetch dynamically imported module`.

Aqui entra mais uma coisa. **`lazy` lembra da rejeição.** O `lazyInitializer` do React anota o resultado no `payload`, e se for rejeitado ele muda o estado e guarda o motivo.

```js
payload._status = 2;
payload._result = error;
```

Daí em diante, toda vez que esse componente renderiza, o último desvio roda.

```js
throw payload._result;
```

Ele não faz `import()` de novo. A chamada de `lazy()` aconteceu uma vez só no topo do módulo e aquele `payload` fica ali enquanto a aplicação viver. **Mesmo desfazendo o `ErrorBoundary` e remontando, o mesmo erro volta.** É por isso que a única recuperação dessa falha é receber a página de novo.

Na mesma navegação, a falha do loader é recebida pelo router e a falha do `lazy` pelo React. **Se você não separar esses dois antes de decidir onde pôr um `ErrorBoundary`, um deles fica sem lugar para ir.**


## Manipuladores globais fora do ErrorBoundary

Para onde foram os três que o `ErrorBoundary` não capturou? Para **os manipuladores globais do navegador**.

O que é lançado de um manipulador de eventos ou de um callback de `setTimeout` acaba em `window`, no evento `error` dele. A rejeição de uma Promise vai para outro evento. A definição da MDN é esta.

::::quote
:::translation
O evento `unhandledrejection` é enviado ao escopo global de um script quando uma Promise de JavaScript sem manipulador de rejeição é rejeitada; normalmente esse escopo é o `window`, mas também pode ser um `Worker`.
:::

:::original
The `unhandledrejection` event is sent to the global scope of a script when a JavaScript Promise that has no rejection handler is rejected; typically, this is the `window`, but may also be a `Worker`.
:::
::::

Esses dois são o último lugar em que o navegador recebe algo. É também onde a maioria das ferramentas de monitoramento captura os erros do navegador.

O React 19 acrescentou mais um lugar de recepção do lado da árvore. É uma opção de `createRoot`. A documentação oficial separa os três assim.

| Opção | Quando é chamada |
|---|---|
| `onCaughtError` | Quando o React capturou um erro dentro de um Error Boundary |
| `onUncaughtError` | Quando um erro foi lançado e nenhum Error Boundary capturou |
| `onRecoverableError` | Quando o React se recuperou sozinho |

Receber e consertar são coisas diferentes. **Um manipulador global capturar não restaura a tela.** Mesmo que um erro lançado dentro de `onClick` seja recebido por `window` e enviado para a ferramenta de monitoramento, naquele momento o usuário só vê um botão que não respondeu. Reportar e recuperar são trabalhos diferentes.


## Para terminar

Decorar o tratamento de erros no frontend como uma lista de ferramentas deixa buraco atrás de buraco. Acontece mesmo sabendo `ErrorBoundary`, `throwOnError`, `useRouteError`, `lazy` e `unhandledrejection`. Não é por não conhecer as ferramentas, e sim porque **nunca se contou o que vai para onde**.

O que este post tratou se resume assim.

- Um `ErrorBoundary` só recebe o que o React capturou e entregou. Manipuladores de eventos e callbacks assíncronos não estão naquele lugar.
- A checagem de tipos termina na resposta. A partir do ponto em que `json()` devolve `any`, é declaração e não checagem.
- Uma falha do servidor não vira erro sozinha. `fetch` não rejeita com `500`, então lançar é um trabalho que você faz.
- Depois de lançado, a forma de chamar decide o destino. A mesma falha vai para um campo, para quem chama ou para um `ErrorBoundary`.
- A navegação se divide em duas. O loader está fora da árvore e o router recebe; `lazy` está dentro da árvore e o React recebe.
- Fora do `ErrorBoundary` existem os manipuladores globais. Eles capturam, mas a tela não se restaura.

Então o que fazer antes de desenhar um `ErrorBoundary` não é escolher o componente a envolver. É **escrever todos os lugares em que esta tela pode falhar e marcar a qual dos seis acima cada um pertence**. O lugar sem marca é justamente o buraco.

Seria bom você descobrir quantos lugares podem falhar na sua tela agora, quantos deles chegam ao `ErrorBoundary` e para onde estão indo os que não chegam.

[O próximo post](/251203) trata com o que receber cada destino: em quantas camadas dividir, como tratar a área de tela que uma falha leva e o que mais precisa ser solto para o botão de tentar de novo do fallback realmente tentar de novo.


:::ref
- [docs] [React, o Error Boundary de Component](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [docs] [React, os callbacks de erro de createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [docs] [React, lazy](https://react.dev/reference/react/lazy)
- [docs] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [docs] [TanStack Query, Query Functions](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)
- [docs] [MDN, unhandledrejection](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [docs] [MDN, fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [docs] [axios, Error handling](https://axios.rest/pages/advanced/error-handling)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
