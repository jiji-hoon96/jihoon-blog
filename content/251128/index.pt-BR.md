---
emoji: 🔁
title: "Por que o botão de tentar de novo não funciona"
seoTitle: "ErrorBoundary não tenta de novo: QueryErrorResetBoundary"
date: '2025-11-28'
categories: frontend React TanStack-Query tratamento-de-erros
description: "Três casos em que tentar de novo num fallback do react-error-boundary traz o mesmo fallback, conferidos no código instalado, e como resolver cada um."
keywords: "ErrorBoundary não tenta de novo, QueryErrorResetBoundary, retryOnMount, resetErrorBoundary, onReset, React.lazy falha ao carregar chunk, erro no useSuspenseQuery, react-error-boundary"
locale: pt-BR
translationOf: '251128'
sourceHash: 9b7369d4cc04cce44463bae3484aac4cfc28f8721890c7216a90b1df3612021d
---

Neste post quero falar sobre **por que o botão de tentar de novo de um `ErrorBoundary` não funciona**.

É para desenvolvedores frontend que colocaram um botão de tentar de novo no fallback do `react-error-boundary` e, ao apertá-lo, veem a mesma tela voltar, e reúne os três casos em que o estado da falha permanece e como resolver cada um. A resposta curta: um `ErrorBoundary` só restaura o próprio estado, e o estado que causou a falha continua com quem lançou.

Os exemplos usam TanStack Query junto com `react-error-boundary`, e conferi o comportamento das bibliotecas abrindo o código instalado.


## Três casos em que tentar de novo não funciona

Coloquei um botão de tentar de novo no fallback. É aquele botão que o usuário aperta para desfazer uma falha. Vamos apertar. **Não funciona.** A mesma tela volta igual.

Isso aparece por três razões e cada uma se resolve de um jeito. Elas têm uma coisa em comum. **Um `ErrorBoundary` só desfaz o próprio estado.** O estado que quem lançou está segurando tem que ser limpo por quem lançou.

### O erro de query que o reset limpa

Tudo o que `resetErrorBoundary()` faz é voltar a flag interna do `ErrorBoundary`. Os children remontam e a query volta a ser assinada. Mas aquela query está **cravada no cache em estado de erro.** Então ela lança imediatamente o mesmo erro de novo e o `ErrorBoundary` desenha o fallback de novo.

Por que ela usa o erro antigo em vez de refazer a requisição também está no código. `errorBoundaryUtils.js` tranca assim.

```js
if (options.suspense || throwOnError) {
  if (!errorResetBoundary.isReset()) options.retryOnMount = false;
}
```

É preciso ler primeiro a guarda de fora. **Essa trava só pega nas queries que lançam.** Uma query com `suspense`, ou com `throwOnError` ligado, que monte sem a marca de reset fica com o retry desligado. Um `useQuery` que não lança não se aplica e, ao remontar, simplesmente refaz a requisição.

![Em cima, o fluxo quando o onReset não está ligado: clique em tentar de novo, EB liberado, remontagem, lança de novo o erro do cache, e da última caixa uma seta vermelha volta para a primeira com a legenda o mesmo fallback. Embaixo, o fluxo quando o onReset está ligado: clique em tentar de novo, onReset e destravamento, EB liberado e remontagem, nova requisição, encadeados em uma só direção com setas azuis](1.png?w=720)

**O que é travado é só a query subida para um `ErrorBoundary`, e por isso os dois estados precisam ser limpos juntos.** Quem levanta essa marca é `QueryErrorResetBoundary`. Abrindo o código, o estado é um único booleano.

```js
reset: () => {
	isReset = true;
},
```

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

A ordem importa. E essa ordem é garantida por `react-error-boundary`. É um arquivo compilado, então os nomes ficaram com uma letra só, mas a estrutura continua legível.

```js
resetErrorBoundary(...e) {
  const { didCatch: t } = this.state;
  t && (this.props.onReset?.({ args: e, reason: "imperative-api" }), this.setState(d));
}
```

Estão unidos pelo operador vírgula, então **`onReset` roda primeiro e `setState` vem depois**. `d` é o estado inicial com `didCatch` em `false`. Por isso os children remontam depois que a trava do cache foi solta. **Uma linha de diferença é o que transforma o tentar de novo em um tentar de novo de verdade.**

Colocar `Query` no nome também é proposital. Se você chamar de `AsyncBoundary`, lê-se como se servisse para qualquer assincronia, e não serve, porque tem um `QueryErrorResetBoundary` dentro. Pela mesma razão não dei valor padrão a `pendingFallback`. Com um valor padrão, olhando só a linha da chamada você não sabe o que está sendo colocado embaixo.

### O erro de render que o reset não consegue limpar

O segundo é quando o servidor devolve um 200 com um formato diferente do esperado e o render que o lê lança um `TypeError`. O mesmo `ErrorBoundary` recebeu e o `onReset` está ligado, mas tentar de novo não funciona.

O que `reset` limpa é **uma query em estado de erro**. Mas essa query teve sucesso. O servidor deu um 200 e o cache guarda aquele valor como dado normal. Quem produziu o erro foi o render que o leu. Então `reset` não tem o que limpar, e o componente remontado recebe o mesmo cache, com o `staleTime` ainda válido, e lança de novo na mesma linha.

O lugar de corrigir é **`queryFn`**.

```ts
queryFn: async () => {
  const data = await getComments(postId)
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

Por isso recuperar-se dessa falha é baixar a página de novo. Também significa que uma versão nova foi publicada, então é melhor dizer isso ao usuário.

Colocando os três casos lado a lado, um único botão de tentar de novo precisa fazer três trabalhos diferentes. O erro de query se resolve com `reset`, o erro de render transformando-o antes em erro de query no `queryFn`, e a falha de chunk com um recarregamento. **O `ErrorBoundary` não faz nenhum dos três por você.**


## Encerrando

Se um botão de tentar de novo não funciona, espero que você confira **o que lançou e onde o estado dele continua guardado** antes de olhar para o botão ou para o `ErrorBoundary`. Onde resolver depende de ser o cache da query, o render que leu o que o servidor mandou ou o `lazy`.

Onde colocar o `ErrorBoundary` na tela e quantos, e quais falhas nem deveriam ter botão de tentar de novo, é o tema de [Onde colocar o ErrorBoundary](/251203).

:::ref
- [docs] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [docs] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [repo] [bvaughn/react-error-boundary](https://github.com/bvaughn/react-error-boundary)
:::
