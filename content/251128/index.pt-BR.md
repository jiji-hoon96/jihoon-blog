---
emoji: 🔁
title: "Por que o botão de tentar de novo não funciona"
seoTitle: "ErrorBoundary não tenta de novo: QueryErrorResetBoundary"
date: '2025-11-28'
updatedAt: '2026-10-08'
categories: frontend React TanStack-Query tratamento-de-erros
description: "Três casos em que tentar de novo num fallback do react-error-boundary traz o mesmo fallback, conferidos no código instalado, e como resolver cada um."
keywords: "ErrorBoundary não tenta de novo, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy falha ao carregar chunk, erro no useSuspenseQuery, react-error-boundary"
locale: pt-BR
translationOf: '251128'
sourceHash: 519f5b360dc478899cd12922bff90c3cf30f8d6159cb77aa7701b940a636385d
---

Neste post quero falar sobre **por que o botão de tentar de novo de um `ErrorBoundary` não funciona**.

É para desenvolvedores frontend que colocaram um botão de tentar de novo no fallback do `react-error-boundary` e, ao apertá-lo, veem a mesma tela voltar, e reúne os três casos em que o estado da falha permanece e como resolver cada um. A resposta curta: um `ErrorBoundary` só restaura o próprio estado, e o estado que causou a falha continua com quem lançou.

Os exemplos usam TanStack Query junto com `react-error-boundary`. Conferi o comportamento das bibliotecas abrindo o código instalado, e o código citado tem a mesma estrutura dos arquivos de build de `@tanstack/react-query` 5.104.1, `react-error-boundary` 6.1.6 e React 19.2.3 (comparado em 2026-10-08). A indentação e as quebras de linha foram ajustadas em alguns pontos para facilitar a leitura.


## Três casos em que tentar de novo não funciona

São três causas, e cada uma se resolve em um lugar diferente. Elas têm uma coisa em comum. **Um `ErrorBoundary` só desfaz o próprio estado.** O estado que quem lançou está segurando tem que ser limpo por quem lançou.

### O erro de query que o reset limpa

Tudo o que `resetErrorBoundary()` faz é voltar o estado interno do `ErrorBoundary` (`didCatch`). Quando os children remontam, o hook da query lê o cache de novo. Mas aquela query está **cravada no cache em estado de erro.** Então o hook lança o mesmo erro logo, durante o render, e o `ErrorBoundary` desenha o fallback de novo.

Por que ela usa o erro antigo em vez de refazer a requisição também está no código. `errorBoundaryUtils.js` desliga assim a nova requisição ao remontar.

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

É preciso ler primeiro a guarda de fora. **Essa condição só pega nas queries que lançam.** Se uma query com `suspense`, ou com `throwOnError` ligado, monta enquanto `isReset()` é falso, `retryOnMount` vira `false` e a nova requisição fica desligada. Um `useQuery` que não lança não se aplica e, ao remontar, simplesmente refaz a requisição.

Mas desligar `retryOnMount` só tem efeito em uma query que nunca teve dados no cache, ou seja, uma query que falhou no primeiro carregamento. Uma query que já tinha dados, ao falhar, fica com `isInvalidated` verdadeiro, é tratada como stale e refaz a requisição ao remontar por causa de `refetchOnMount`. Os erros de query de que este texto fala são falhas do primeiro carregamento.

Isso não quer dizer que a nova requisição fique desligada para sempre. Enquanto o fallback está na tela, nenhum componente observa aquela query, então ela vira uma query inativa e, pelos [padrões do TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), é removida do cache depois de 5 minutos. Se o botão for clicado depois disso, não há erro no cache e a requisição é feita do zero. Por isso um código que esqueceu o `onReset` pode parecer funcionar quando se clica bem mais tarde. Se a reprodução está inconsistente, veja primeiro se o clique foi antes ou depois do `gcTime`.

![Em cima, o fluxo quando o onReset não está ligado: clique em tentar de novo, ErrorBoundary liberado, remontagem, lança de novo o erro do cache, e da última caixa uma seta vermelha volta para a primeira com a legenda o mesmo fallback. Embaixo, o fluxo quando o onReset está ligado: clique em tentar de novo, onReset e a chamada a reset(), ErrorBoundary liberado e remontagem, nova requisição, encadeados em uma só direção com setas azuis](1.png?w=720)

**`retryOnMount` só é desligado na query subida para um `ErrorBoundary`, e por isso o `ErrorBoundary` e a query precisam ser limpos juntos.** Quem levanta a flag que `isReset()` lê é `QueryErrorResetBoundary`. Abrindo o código, o estado é um único booleano.

```js
reset: () => {
	isReset = true;
},
```

Se a flag só fosse levantada e ninguém a baixasse, os erros seguintes também não desligariam `retryOnMount` e cada um voltaria a requisitar. Quem a baixa é o hook da query. O hook remontado lê a flag durante o render e não desliga `retryOnMount`. `getHasError`, que olha a mesma flag, também não lança o erro do cache. Depois, já montado na tela, ele baixa a flag em um effect. É uma função do mesmo `errorBoundaryUtils.js`.

```js
const useClearResetErrorBoundary = (errorResetBoundary) => {
	React.useEffect(() => {
		errorResetBoundary.clearReset();
	}, [errorResetBoundary]);
};
```

Assim, um único boolean basta para tentar de novo só desta vez. Passo a passo, uma nova tentativa acontece assim:

1. `reset()` levanta a flag `isReset`.
2. O hook da query remontado vê a flag durante o render e não desliga `retryOnMount`.
3. Com a flag levantada, o hook vê um estado de requisição em andamento em vez do erro do cache e requisita de novo (`useSuspenseQuery` envia a requisição durante o render e suspende).
4. Se a requisição der certo e o componente for montado na tela, `clearReset()` baixa a flag em um effect; se falhar de novo, quem a baixa é o `catch` dessa requisição.
5. Com a flag baixada, os erros seguintes voltam a desligar `retryOnMount`.

Basta ligar este `reset` ao `ErrorBoundary`, no seu `onReset`. A documentação do TanStack Query e os comentários do código também trazem como exemplo um código que os liga assim.

```tsx
export function QueryAsyncBoundary({ children, pendingFallback }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback error={error} onRetry={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
```

É assim que `react-error-boundary` implementa `resetErrorBoundary`. É um arquivo compilado, então os nomes ficaram com uma letra só, mas a estrutura continua legível.

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

Só quando `didCatch` é verdadeiro ele chama `onReset` e volta o estado para o valor inicial `d` (`didCatch: false`). `setState` é renderizado depois que o handler termina, então, quando os children remontam, a flag que `reset()` levantou já está de pé. Por isso basta ligar `onReset` a `reset`.

Mesmo sem envolver com `QueryErrorResetBoundary`, se você pegar de `useQueryErrorResetBoundary()` o `reset` e ligá-lo ao `onReset`, a nova tentativa funciona. Sem uma fronteira envolvendo, o hook devolve um valor padrão global do módulo. Em troca, como o [guia de Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense) registra, o reset vale globalmente e o app inteiro compartilha uma única flag `isReset`.

Colocar `Query` no nome também é proposital. Se você chamar de `AsyncBoundary`, lê-se como se servisse para qualquer assincronia, e não serve, porque tem um `QueryErrorResetBoundary` dentro. Pela mesma razão não dei valor padrão a `pendingFallback`. Com um valor padrão, olhando só a linha da chamada você não sabe o que está sendo colocado embaixo.

### O erro de render que o reset não consegue limpar

O segundo é quando o servidor devolve um 200 com um formato diferente do esperado e o render que o lê lança um `TypeError`. O mesmo `ErrorBoundary` recebeu e o `onReset` está ligado, mas tentar de novo não funciona.

O que `reset` limpa é **uma query em estado de erro**. Mas essa query teve sucesso. O servidor deu um 200 e o cache guarda aquele valor como dado normal. Quem produziu o erro foi o render que leu esse valor. Então `reset` não tem nada a limpar, e o componente remontado lê o mesmo valor do cache durante o render e lança de novo na mesma linha. Como lança antes de ser montado na tela, nem chega a se inscrever na query. É por isso que não requisita de novo mesmo com `staleTime` em 0. Essa query também é removida do cache quando passa o `gcTime` e é requisitada de novo, mas, enquanto o servidor mandar o mesmo valor, ela lança de novo na mesma linha.

O lugar de corrigir é **`queryFn`**.

```ts
queryFn: async () => {
  const res = await fetch(`/api/posts/${postId}/comments`)
  const data = await res.json()
  if (!Array.isArray(data.comments)) {
    throw new TypeError('comments 가 배열이 아니다')
  }
  return data.comments
},
```

Numa resposta de `fetch`, `json()` devolve `Promise<any>`, então o tipo que você coloca depois é uma declaração, não uma checagem, e a checagem em tempo de execução que confirma o que o servidor mandou precisa ser colocada por você. **Se você sobe essa checagem para `queryFn`**, a mesma falha vira **o erro da query**. Fica no cache em estado de erro, `reset` limpa e o tentar de novo refaz a requisição.

Se você adiar a checagem em tempo de execução porque o `ErrorBoundary` recebe de qualquer jeito, acaba com um fallback que recebe mas não consegue desfazer.

### O lazy que só um recarregamento resolve

O terceiro é uma falha ao carregar um chunk. Desta vez nem `reset` nem `queryFn` têm a ver. Quem segura o estado é o próprio `lazy`.

O `lazyInitializer` do React anota a rejeição no `payload` e, daí em diante, lança sempre a mesma coisa.

```js
throw payload._result;
```

Ele não faz `import()` de novo. A chamada de `lazy()` aconteceu uma vez no topo do módulo, e aquele `payload` fica como está enquanto o app viver. Mesmo soltando o `ErrorBoundary` e remontando, o mesmo erro volta.

E se criarmos um `lazy` novo e chamarmos `import()` de novo? Até agora o navegador impedia. O mapa de módulos lembrava o resultado com falha e não baixava a mesma URL de novo. Uma [mudança na especificação HTML](https://github.com/whatwg/html/pull/10327) que altera isso foi mesclada em 2026-07-15. O estado por engine, conferido em 2026-10-08: o Firefox [incluiu na versão 155](https://bugzilla.mozilla.org/show_bug.cgi?id=2055211), lançada em 2026-09-01. O WebKit [colocou na main](https://bugs.webkit.org/show_bug.cgi?id=319492) em 2026-08-19, e o registro do bug não indica qual versão estável do Safari o inclui. O Chrome ainda está como Proposed no [chromestatus](https://chromestatus.com/feature/5214647044145152). Então, no Chrome, um `import()` novo devolve a mesma falha.

Isso vale para builds que carregam os chunks com o `import()` nativo do navegador, como o Vite. O runtime do webpack carrega os chunks com tags script e apaga o registro do chunk que falhou, então, se for chamado de novo por um `lazy` novo, ele requisita de novo.

De qualquer forma, um `lazy` já criado não tenta de novo, então a recuperação padrão dessa falha é baixar a página de novo. Mesmo quando os navegadores passarem a baixar de novo, nem tudo se resolve. Uma falha de carregamento de chunk pode vir de uma rede caída ou, como explica a [documentação do Vite](https://vite.dev/guide/build#load-error-handling), de um deploy novo que apagou os chunks antigos. Um chunk apagado continua sem existir quando requisitado de novo, então nesse caso a recuperação continua sendo recarregar. Como não dá para cravar uma única causa, é melhor o texto do fallback sugerir recarregar do que afirmar que saiu uma versão nova.

Resumindo, o erro de query se resolve com `reset`, o erro de render transformando-o antes em erro de query no `queryFn`, e a falha de chunk recarregando.


## Encerrando

Se um botão de tentar de novo não funciona, espero que você confira **o que lançou e onde o estado dele continua guardado** antes de olhar para o botão ou para o `ErrorBoundary`. Onde resolver depende de ser o cache da query, o render que leu o que o servidor mandou ou o `lazy`.

Onde colocar o `ErrorBoundary` na tela e quantos, e quais falhas nem deveriam ter botão de tentar de novo, é o tema de [Onde colocar o ErrorBoundary](/251203).

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
