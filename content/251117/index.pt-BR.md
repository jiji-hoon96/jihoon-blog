---
emoji: 🛡️
title: 'Tratamento de erros'
seoTitle: 'Tratamento de erros no frontend — guia para combinar Error Boundary e throwOnError do TanStack Query'
date: '2025-11-17'
categories: frontend React TanStack-Query tratamento-de-erros
description: "Uma análise de até onde vão as responsabilidades de React Error Boundary, try/catch e throwOnError do TanStack Query, e de como combiná-los. O texto diferencia erros de renderização e erros assíncronos e explica até o funcionamento interno do reset em react-error-boundary."
keywords: "tratamento de erros no frontend, React Error Boundary, react-error-boundary, TanStack Query throwOnError, tratamento de erros no React Query, reset de error boundary, erros com try catch, tratamento de erros assíncronos, tratamento de erros no React"
locale: pt-BR
translationOf: '251117'
sourceHash: 688aa8b21e8068e6d24e46e383d3dddbb24778dff87c065c19b3489cff0380fa
---

Neste post, quero falar sobre **como capturar erros no frontend**.

Ao escrever código de tratamento de erros no trabalho, muitas vezes fiquei com uma incômoda sensação de que algo não estava certo. Alguns erros eram capturados com `try/catch`, outros por `ErrorBoundary`, e outros ainda pelo `onError` do TanStack Query. Além disso, os limites de atuação de cada recurso se sobrepunham ou deixavam pequenas lacunas. Em certos dias, um erro escapava; em outros, propagava-se até onde eu não queria.

O problema é que raramente paramos para organizar, de uma só vez, como todas essas ferramentas funcionam. Sabemos que “Error Boundary só captura erros durante a renderização”, mas, se alguém pedir para explicar exatamente o que isso significa na prática, o que acontece internamente ao chamar `reset` ou em que momento o TanStack Query relança um erro quando `throwOnError` está habilitado, a resposta já não vem com tanta facilidade.

Com base no guia oficial do React, na biblioteca `react-error-boundary` e na documentação oficial do TanStack Query v5, este artigo organiza **até onde vai a responsabilidade** de cada ferramenta de tratamento de erros no frontend e **como combiná-las**.


## Erros que o React consegue e não consegue capturar

Vamos começar pela pergunta mais básica: **quais erros o React captura?**

A documentação oficial do React distingue com clareza os erros que uma Error Boundary consegue capturar daqueles que ficam fora de seu alcance.

**O que uma Error Boundary captura**

- Erros ocorridos durante a **renderização** de componentes filhos
- Erros ocorridos em **métodos do ciclo de vida**
- Erros ocorridos no **construtor**

**O que uma Error Boundary não captura**

- Erros dentro de **manipuladores de eventos**
- Erros em **código assíncrono**, como `setTimeout`, `requestAnimationFrame` e Promise
- Erros durante a **renderização no servidor (SSR)**
- Erros ocorridos na **própria Error Boundary**

Por que essa distinção é importante? Porque a maioria dos erros com que lidamos no dia a dia pertence, na verdade, **à segunda categoria**. O servidor pode responder com 500 após um clique disparar uma mutação; uma busca de dados pode falhar dentro de `useEffect`; ou a lógica de validação pode lançar um erro durante o envio de um formulário. O React não captura esses erros automaticamente. Precisamos capturá-los e tratá-los de forma explícita.

Por isso, o tratamento de erros no frontend se divide em dois caminhos: **erros de renderização ficam a cargo da Error Boundary**; **os demais, de try/catch ou das funções de retorno fornecidas pelas bibliotecas**. No ponto em que esses caminhos se cruzam, bibliotecas de gerenciamento de estado assíncrono, como o TanStack Query, funcionam como uma ponte.


## O que é uma Error Boundary

No fim das contas, uma Error Boundary é um **componente de classe** com dois métodos de ciclo de vida. Segundo a documentação oficial do React, para que um componente seja uma Error Boundary, ele precisa implementar um dos dois métodos abaixo — normalmente, ambos.

```js
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  // 에러 발생 시 state를 업데이트해 다음 렌더에서 fallback UI를 보여준다
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  // 에러가 발생한 직후에 호출. 로깅 같은 사이드이펙트는 여기서 처리한다
  componentDidCatch(error, info) {
    logErrorToMyService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

`getDerivedStateFromError` deve ser uma **função pura**. Sua única função é retornar o novo estado, sem efeitos colaterais. Já `componentDidCatch` é o lugar destinado aos efeitos colaterais. É ali que enviamos o erro ao Sentry ou registramos a pilha de componentes no console.

Há um ponto importante: esses dois métodos **só existem em componentes de classe**. Ainda não há uma forma oficial de criar uma Error Boundary como componente funcional. A [documentação oficial do React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) deixa isso explícito.

::::quote
:::translation
Atualmente, não há como escrever uma Error Boundary como componente funcional.
:::

:::original
There is currently no way to write an Error Boundary as a function component.
:::
::::

Como é trabalhoso escrever um componente de classe do zero toda vez, normalmente recorremos à biblioteca `react-error-boundary`. Ela foi criada por Brian Vaughn, ex-membro da equipe principal do React, e é usada praticamente como um padrão.


## As três formas de definir a interface de contingência em react-error-boundary

Em `react-error-boundary`, o componente `ErrorBoundary` oferece **três formas** de definir a propriedade da interface de contingência. Vejamos rapidamente como cada uma é usada.


### fallback

É a forma mais simples: basta passar um JSX estático.

```tsx
<ErrorBoundary fallback={<div>문제가 발생했습니다.</div>}>
  <Page />
</ErrorBoundary>
```

É útil quando não precisamos acessar o objeto de erro nem a função de reinicialização. Como normalmente precisamos exibir uma mensagem ou oferecer uma ação de nova tentativa, ainda não tive ocasião de usar essa opção em produção.


### FallbackComponent

Separamos a interface de contingência em outro componente e passamos a **referência** desse componente.

```tsx
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>오류가 발생했습니다.</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Page />
</ErrorBoundary>
```

O objeto de erro e a função `resetErrorBoundary` são injetados automaticamente por meio de propriedades. Essa opção é adequada quando existe a possibilidade de reutilizar a interface de contingência em outros lugares.


### fallbackRender

É a opção usada quando queremos escrever a interface de contingência diretamente no local de uso.

```tsx
<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div role="alert">
      <p>오류가 발생했습니다: {error.message}</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
    </div>
  )}
>
  <Page />
</ErrorBoundary>
```

Na essência, faz o mesmo que `FallbackComponent`, mas permite tratar tudo **diretamente no local de uso, sem criar um componente separado**. É útil quando precisamos acessar o escopo léxico externo, como o estado ou um manipulador do componente pai.

Não existe uma única resposta correta entre as três opções. O padrão que mais uso em produção é **criar um componente ErrorFallback comum e injetá-lo por meio de `FallbackComponent`**, porque o sistema de design e o tom da interface precisam ser consistentes. Só escrevo a interface de contingência diretamente no local de uso com `fallbackRender` quando uma página exige um tratamento diferente.


## O que a reinicialização realmente faz?

Ao usar `react-error-boundary`, inevitavelmente encontramos a função `resetErrorBoundary`: aquela chamada quando o usuário clica no botão “Tentar novamente” da interface de contingência. Vejamos o que ela realmente faz.

Em resumo, `resetErrorBoundary` apenas sinaliza ao componente ErrorBoundary que ele deve **reinicializar o próprio estado e renderizar novamente os componentes filhos**. Ela não altera automaticamente nenhum estado externo, como o cache do TanStack Query.

Internamente, a sequência é a seguinte.

1. `resetErrorBoundary()` é chamada.
2. O estado `hasError` interno da ErrorBoundary volta a `false`.
3. Opcionalmente, a função de retorno `onReset` é executada. É aqui que ocorrem os efeitos colaterais definidos pela aplicação.
4. Os componentes filhos são renderizados novamente. Se a causa do erro — estado, cache ou outra condição — continuar presente, **o mesmo erro será lançado outra vez**.

O quarto item é o ponto central. **Reinicializar significa apenas “vamos esquecer o erro e tentar renderizar de novo”; não significa “vamos corrigir a causa do erro”**. Por isso, apenas reinicializar pode repetir o mesmo erro indefinidamente.

Há mais duas ferramentas para resolver esse problema.


### onReset

Funciona como um hook chamado imediatamente antes da reinicialização. Nele, limpamos o estado externo que causou o erro.

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }}
>
  <Page />
</ErrorBoundary>
```


### resetKeys

A ErrorBoundary é reinicializada automaticamente quando os valores da lista mudam. Podemos passar parâmetros da URL, termos de busca, a aba selecionada ou qualquer outra chave cuja mudança indique que vale a pena tentar novamente.

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  resetKeys={[userId]}
>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

Quando `userId` muda, a reinicialização ocorre automaticamente e os componentes filhos são renderizados de novo. Ao navegar para outro perfil, o erro anterior desaparece de forma natural.


## Como capturar erros de manipuladores de eventos e de código assíncrono?

Como vimos, uma Error Boundary não captura erros em manipuladores de eventos nem em código assíncrono. Mas é justamente aí que ocorre a maioria dos erros com que lidamos. O que fazer, então?

Para esse caso, `react-error-boundary` oferece o **hook `useErrorBoundary`**. Ele retorna uma função chamada `showBoundary`; ao chamá-la, podemos encaminhar o erro à ErrorBoundary mais próxima.

```tsx
import { useErrorBoundary } from 'react-error-boundary';

function MyComponent() {
  const { showBoundary } = useErrorBoundary();

  const handleClick = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      showBoundary(error);
    }
  };

  return <button onClick={handleClick}>실행</button>;
}
```

O ponto central é que **o desenvolvedor precisa elevar o erro explicitamente**. O React não faz isso por conta própria. Para levar um erro assíncrono até o domínio de uma ErrorBoundary, é preciso capturá-lo com `try/catch` e passá-lo a `showBoundary`.

Entender esse padrão esclarece por que uma ErrorBoundary captura alguns erros e não outros. A resposta é simples: **“o erro foi elevado até a fase de renderização ou não?”**


## Como o TanStack Query trata erros?

Depois de organizar tudo até aqui, surge naturalmente outra pergunta. O `useQuery` que usamos todos os dias lida com requisições assíncronas; como são tratados os erros que ocorrem dentro dele?

Por padrão, o TanStack Query **expõe o erro no campo `error`**.

```tsx
const { data, error, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

if (isError) {
  return <div>에러: {error.message}</div>;
}
```

Essa é a forma mais simples. Mesmo quando ocorre um erro, o componente continua renderizando normalmente; apenas o campo `error` recebe um valor. A ErrorBoundary não participa desse fluxo.

Vale destacar um fato importante: **o comportamento padrão do TanStack Query é “não lançar o erro”**. Não importa se a queryFn lança uma exceção ou rejeita uma Promise: o erro é armazenado no campo `error` sem interromper o fluxo de renderização do React. Portanto, sem nenhuma configuração adicional, a ErrorBoundary nunca será acionada.

Além disso, por padrão, o TanStack Query **repete automaticamente uma consulta com erro três vezes**.

O `retryDelay` padrão usa intervalos exponenciais, chegando a no máximo 30 segundos. Isso significa que o erro não aparece para o usuário assim que ocorre a primeira falha. A consulta é repetida após intervalos de 1, 2 e 4 segundos; somente se todas as tentativas falharem o campo `error` é preenchido. Se você já se perguntou durante o desenvolvimento “por que o erro demora para aparecer?”, é quase certo que esse seja o motivo.


### Conectando à ErrorBoundary com throwOnError

Como encaminhar, então, os erros do TanStack Query para uma ErrorBoundary? A resposta é a opção **`throwOnError`**. Até a v4, ela se chamava `useErrorBoundary`; na v5, passou a se chamar `throwOnError`.

```tsx
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  throwOnError: true,
});
```

Quando essa opção está habilitada, o TanStack Query **relança o erro no próximo ciclo de renderização**. O lançamento passa, então, a ser um erro da fase de renderização, que finalmente pode ser capturado pela ErrorBoundary.

`throwOnError` também pode receber uma função. Assim, podemos encaminhar alguns erros à ErrorBoundary e deixar que o próprio componente trate os demais.

```tsx
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  // 5xx 서버 에러만 ErrorBoundary로 보낸다
  throwOnError: (error) => error.response?.status >= 500,
});
```

Esse padrão é prático porque **erros de cliente 4xx, como falha de validação ou falta de permissão**, normalmente devem ser exibidos no próprio contexto em que ocorreram, enquanto **erros de servidor 5xx** justificam cobrir a página inteira e mostrar uma mensagem como “Tente novamente em alguns instantes”.


### useSuspenseQuery

Se você usa `useSuspenseQuery`, não precisa se preocupar com `throwOnError`. No modo Suspense, **lançar o erro sempre é o comportamento padrão**.

Em outras palavras, usar `useSuspenseQuery` significa delegar **o carregamento ao Suspense e os erros à ErrorBoundary**. Deixamos de precisar de ramificações como `if (isError)` ou `if (isLoading)` dentro do componente e passamos a envolvê-lo externamente com esses dois limites.


## QueryErrorResetBoundary

Neste ponto, surge mais uma pergunta: o que acontece quando o usuário clica em “Tentar novamente” na interface de contingência?

Como vimos, `resetErrorBoundary` apenas reinicializa o estado `hasError` da ErrorBoundary. Porém, no cache do TanStack Query, continua existindo **uma consulta presa no estado de erro**. Quando os componentes filhos são renderizados novamente, o TanStack Query consulta o cache, conclui que a consulta já falhou e lança o mesmo erro imediatamente. É um ciclo infinito infernal.

Para resolver esse problema, o TanStack Query oferece o hook **`useQueryErrorResetBoundary`** e o componente **`QueryErrorResetBoundary`**. Apesar dos nomes longos, a função é simples: emitir o comando **“reinicialize o estado de erro das consultas dentro deste escopo”**.

```tsx
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          <p>에러가 발생했습니다.</p>
          <button onClick={resetErrorBoundary}>다시 시도</button>
        </div>
      )}
    >
      <Page />
    </ErrorBoundary>
  );
}
```

Vejamos em ordem cronológica o que acontece aqui.

1. O usuário clica em “Tentar novamente” → `resetErrorBoundary()` é chamada
2. A ErrorBoundary executa a função de retorno `onReset` → `reset()` é chamada, reinicializando o estado de erro do TanStack Query
3. A ErrorBoundary reinicializa o próprio estado e renderiza os componentes filhos novamente
4. O `useQuery` dentro dos componentes filhos é executado → como o estado de erro foi removido, uma nova busca de dados é iniciada

O ponto central é a conexão feita em `onReset` com `reset`. Graças a essa única linha, a ErrorBoundary e o TanStack Query sincronizam seus estados.


### Usando a forma de componente

É possível fazer a mesma coisa com um componente em vez do hook. Basta escolher uma das duas formas.

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div role="alert">
              <p>에러가 발생했습니다: {error.message}</p>
              <button onClick={resetErrorBoundary}>다시 시도</button>
            </div>
          )}
        >
          <Page />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

A maior diferença em relação à versão em hook é que a função `reset` é passada aos filhos por meio do padrão de **propriedade de renderização**. `QueryErrorResetBoundary` recebe uma função como conteúdo filho, passa `{ reset }` como argumento e renderiza o valor retornado por essa função. Assim, podemos conectá-la imediatamente com `onReset={reset}` dentro do componente.

Quando não há uma `QueryErrorResetBoundary` próxima, a versão em hook **reinicializa os erros do cache global**. A versão em componente restringe o escopo da reinicialização à própria subárvore. Para controlar esse alcance de forma mais granular, a versão em componente é mais segura.

Vale ressaltar um ponto: **a reinicialização não limpa o cache**. Em vez de apagar todos os dados, ela apenas libera o estado das consultas marcadas com erro. Para invalidar os dados de fato, é preciso chamar `queryClient.invalidateQueries()` separadamente.


## Erros de mutações

Quase todos os padrões apresentados até aqui partiram de `useQuery`. Com **`useMutation`, porém, a situação é um pouco diferente.**

A principal diferença é que uma mutação normalmente começa com uma **ação explícita do usuário, como um clique ou envio de formulário**. Por isso, é natural tratar o erro perto dessa ação. Em vez de cobrir a página inteira com uma interface de contingência, faz mais sentido mostrar uma notificação ou um texto de erro ao lado do formulário, como “Falha no pagamento: confira novamente os dados do cartão”.

Em [Dominando mutações no React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query), TkDodo resume a essência dessa diferença em uma frase: **uma consulta é declarativa, enquanto uma mutação é imperativa**. Uma consulta é executada automaticamente quando o componente é montado, pode ser observada por outros componentes com a mesma chave e é armazenada em cache para reutilização. Já uma mutação só é executada quando o usuário aciona uma operação, não é armazenada em cache e fica vinculada individualmente à instância do componente que a chamou. Essa diferença fundamental separa também as estratégias de tratamento de erros.

No `useQuery`, o `retry` padrão é `3`, mas no **`useMutation` o `retry` padrão é `0`**. O motivo é simples: uma mutação produz **efeitos colaterais**. Se uma requisição de pagamento falhar por esgotamento do tempo de espera da rede e a biblioteca repetir a chamada automaticamente mais duas vezes, o cartão do usuário poderá ser cobrado três vezes.

Por isso, a regra é habilitar novas tentativas para mutações de forma explícita **apenas quando for possível garantir que a operação é idempotente**. Isso vale para leituras seguras semelhantes a GET, nas quais repetir a requisição produz comprovadamente o mesmo resultado, ou para casos em que o servidor impede duplicações por meio de uma chave de idempotência.

Os erros de `useQuery` ficam **registrados no cache**. Assim, propagam-se imediatamente para outros componentes que observam a mesma `queryKey`, exigindo um mecanismo como `QueryErrorResetBoundary` para reinicializá-los em conjunto.

Com mutações é diferente. Um erro em uma instância de mutação permanece **apenas no estado daquela instância**. Ele não afeta a mutação de outro componente que use a mesma `mutationFn`. Por isso, o TanStack Query não tem algo como `MutationErrorResetBoundary`: **não há necessidade**.

Essa diferença tem uma consequência prática. Quando dois componentes chamam o mesmo `useMutation`, o erro ocorrido em um deles não aparece no outro. Para observar “os erros dessa mutação em toda a aplicação”, o `onError` no nível do componente não basta; é preciso elevá-los por meio de `MutationCache.onError`.


### mutate vs mutateAsync

`useMutation` retorna duas funções de execução. A diferença entre elas determina a forma de tratar erros.

O tipo de retorno de mutate é `void`. Ela não retorna uma Promise. Portanto, não podemos aguardar o resultado com await, e ele só pode ser recebido por funções de retorno como `onSuccess/onError`.


```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    toast.error(`등록 실패: ${error.message}`);
  },
});

mutation.mutate(newPost);
```


Já `mutateAsync` retorna uma Promise. Isso permite tratar o erro com `try/catch`.

```tsx
const mutation = useMutation({ mutationFn: createPost });

const handleSubmit = async () => {
  try {
    const result = await mutation.mutateAsync(newPost);
    router.push(`/posts/${result.id}`);
  } catch (error) {
    // 여기서 처리
  }
};
```

Quando usar cada uma? Adoto os seguintes critérios.

- **Há uma ação subsequente após o fim da mutação**, como navegar em caso de sucesso ou usar o valor retornado → `mutateAsync`
- **Basta disparar a chamada e delegar os efeitos colaterais às funções de retorno**, como alternar uma curtida ou apenas exibir uma notificação → `mutate` + `onError`

Há um erro comum nesse ponto: **usar `mutateAsync` sem `try/catch` causa uma rejeição de promessa não tratada**. A função `mutate`, baseada em funções de retorno, absorve o erro internamente; `mutateAsync`, por sua vez, lança o erro para o chamador por padrão. Misturar as duas abordagens sem conhecer essa diferença enche o console de alertas vermelhos.


### onError

Outro detalhe frequentemente ignorado é que, em `useMutation`, `onError` pode ser definido **em dois lugares**: no hook e em mutate.

```tsx
const mutation = useMutation({
  mutationFn: createPost,
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

No nível do hook, ele sempre é executado; no nível de mutate, é executado apenas no momento da chamada.

```tsx
mutation.mutate(newPost, {
  onError: (error) => {
    setFormError(error.message);
  },
});
```

A ordem de execução indicada pela documentação oficial é: **nível do hook → nível de mutate**. Quando as duas funções de retorno estão definidas, a do hook é executada primeiro e, depois, a de mutate.


## Tratamento global de erros

Até aqui, todos os padrões atuavam no nível do componente. Mas podemos ter requisitos como “registrar todos os erros de consultas em um único lugar” ou “sempre encerrar a sessão ao receber um erro 401”. Para interesses transversais como esses, podemos registrar funções de retorno em `QueryCache`/`MutationCache` ao criar o **QueryClient**.

```tsx
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        toast.error(`데이터 갱신 실패: ${error.message}`);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error.status === 401) {
        redirectToLogin();
      }
    },
  }),
});
```

O ponto central é que `QueryCache.onError` é chamado **apenas uma vez por consulta**. Mesmo que vários componentes observem a mesma consulta, a função de retorno é executada uma única vez, evitando problemas como notificações duplicadas.

Também podemos verificar `query.state.data !== undefined`, como no exemplo acima. Quando ocorre **uma falha ao buscar novamente enquanto já existem dados em cache**, o usuário ainda está vendo os dados na tela. Cobrir a página com uma ErrorBoundary seria excessivo; basta informar que a atualização falhou. Por outro lado, se o primeiro carregamento falhar sem que existam dados em cache, faz sentido a ErrorBoundary capturar o erro e exibir a interface de contingência.

Ao combinar esses dois fluxos, podemos definir uma política clara: “falhas no carregamento inicial vão para a ErrorBoundary; falhas ao buscar novamente em segundo plano geram uma notificação”.


## Componente compartilhado

Depois de chegar até aqui, é natural querer evitar envolver cada trecho, toda vez, em três camadas de `QueryErrorResetBoundary`, `ErrorBoundary` e `Suspense`. Que tal **reuni-las em um único componente reutilizável**?

É uma ideia natural. Eu mesmo já criei e usei um componente `AsyncBoundary` como o seguinte.

```tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Suspense, type ComponentType, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { Spinner } from './Spinner';

interface Props {
  children: ReactNode;
  pendingFallback?: ReactNode;
  rejectedFallback?: ComponentType<FallbackProps>;
}

export function AsyncBoundary({
  children,
  pendingFallback = <Spinner />,
  rejectedFallback = ErrorFallback,
}: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={rejectedFallback}>
          <Suspense fallback={pendingFallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

Na página, tudo se resume a uma linha.

```tsx
<AsyncBoundary>
  <Content />
</AsyncBoundary>
```

Parece elegante. No entanto, recebi o seguinte feedback de um colega.

> Como AsyncBoundary não é um nome usado de forma tão consagrada, acho que o conteúdo interno não causaria grande estranheza. Mesmo assim, **é um pouco difícil prever que ali também existe uma ResetBoundary do React Query**.

> Também me incomoda um pouco que `pendingFallback` e `rejectedFallback` tenham valores padrão. Ao ver apenas uma linha com `<AsyncBoundary>`, não dá para saber qual interface de contingência será exibida; **talvez a pessoa nem perceba que esses valores vêm das propriedades padrão**.


### O nome esconde a dependência

O nome desse componente é `AsyncBoundary`. Ele comunica apenas a ideia de um limite assíncrono. Sua implementação, porém, é **fortemente acoplada ao TanStack Query**: contém `QueryErrorResetBoundary` e conecta `onReset` a `reset`. Na prática, trata-se de **“um limite para áreas assíncronas que usam React Query”**, mas o nome não revela nada disso.

Por que isso é um problema? Porque **contraria as expectativas de quem lê**. Não lemos código interpretando cada linha isoladamente; lemos **antecipando** padrões que acumulamos com a experiência. Quando essa previsão falha, a carga cognitiva aumenta de forma abrupta.

Ao encontrar `AsyncBoundary` pela primeira vez, um colega imagina “um limite genérico para processamento assíncrono”. Parece que ele poderia ser usado com SWR ou com uma busca direta de dados. Na realidade, porém, há uma `QueryErrorResetBoundary` embutida, criando **um acoplamento sem utilidade em contextos que não usam TanStack Query**. Existe uma fissura entre o nome e a implementação.

Podemos interpretar isso como uma espécie de abstração com vazamento na direção oposta. Em geral, um vazamento ocorre quando “um detalhe que deveria estar escondido atrás da abstração escapa”; aqui, **uma dependência que deveria estar evidente ficou escondida demais atrás do nome**. Talvez seja ainda pior, porque usamos o componente sem sequer perceber.


### Tornando a dependência explícita no nome

A solução mais simples é mudar o nome. Em vez de `AsyncBoundary`, usar algo como **`QueryAsyncBoundary`**, deixando a dependência explícita. Ao analisar a biblioteca [Suspensive](https://suspensive.org/), criada pela Toss, vi que ela também explicita essa dependência. O pacote `@suspensive/react` contém apenas as versões genéricas de `ErrorBoundary` e `Suspense`; já o componente integrado ao TanStack Query fica separado no pacote `@suspensive/react-query`, como `QueryAsyncBoundary`.

Uma única palavra faz muita diferença na quantidade de informação transmitida a quem lê o código. Assim que aparece o prefixo `Query`, fica imediatamente claro: **“este componente é exclusivo para um ambiente com TanStack Query”**. Isso evita, de antemão, seu uso em um contexto inadequado.


### Decompondo em unidades combináveis

Uma abordagem mais fundamental é **não agrupar**.

ErrorBoundary e Suspense representam, em essência, **interesses diferentes**. Ao reuni-los em um só componente, podemos perder flexibilidade de composição. Algumas páginas precisam apenas de ErrorBoundary; outras, apenas de Suspense; e outras podem querer duas instâncias de Suspense dentro de uma única ErrorBoundary. Agrupar tudo em `AsyncBoundary` torna essas variações pouco naturais. Mantendo os componentes separados, podemos combiná-los livremente.

Esse padrão deixa o código uma linha mais longo, mas tem a vantagem de permitir que **a responsabilidade de cada limite seja lida diretamente no código**. Além disso, ao usar `useSuspenseQuery`, a unidade que queremos carregar de uma só vez costuma ser diferente da unidade em que queremos capturar erros, por isso a separação tende a ser mais natural.

Minha conclusão foi esta: **agrupe quando o padrão de composição repetido for realmente idêntico; se houver necessidade de variação, mantenha separado**. E, mesmo ao agrupar, torne a dependência visível no nome. Só esses dois princípios já reduzem a chance de receber em uma revisão o comentário “não sei o que existe dentro de AsyncBoundary”.


### Propriedades padrão

Corrigir apenas o nome não basta. Voltemos ao código anterior.

```tsx
pendingFallback = <Spinner />,
rejectedFallback = ErrorFallback,
```

`<QueryAsyncBoundary>...</QueryAsyncBoundary>` funciona sozinho em uma única linha porque `Spinner` e `ErrorFallback` são inseridos automaticamente. **Essa informação não pode ser inferida pelo nome**.

É outra versão do problema anterior, em que “o nome esconde a dependência”. O prefixo `Query` passou a revelar a dependência, mas as dependências de interface `Spinner` e `ErrorFallback` continuam ocultas atrás das propriedades padrão. **O esconderijo apenas mudou um nível para dentro**.

A solução é simples: **tornar ambas as interfaces de contingência propriedades obrigatórias e injetá-las sempre no ponto de uso**.

```tsx
interface Props {
  children: ReactNode;
  pendingFallback: ReactNode;                    
  rejectedFallback: ComponentType<FallbackProps>;
}
```

```tsx
<QueryAsyncBoundary
  pendingFallback={<Spinner />}
  rejectedFallback={ErrorFallback}
>
  <Content />
</QueryAsyncBoundary>
```

O código ganha duas linhas. O motivo para aceitar esse custo é claro: **aumentamos o trabalho de quem escreve para reduzir o custo de investigação de todos que leem**. A interface de contingência exibida fica visível no próprio ponto de uso. Não é preciso abrir outro arquivo para verificar “qual era mesmo o valor padrão deste componente?”. A conhecida máxima de que código é lido muito mais vezes do que é escrito também se aplica aqui.


## ErrorFallback

Há ainda outro aspecto a considerar. Normalmente, criamos um único componente `ErrorFallback` como este.

```tsx
const DEFAULT_ERROR_MESSAGE = '문제가 발생했어요. 잠시 후 다시 시도해주세요';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = getErrorMessage(error, DEFAULT_ERROR_MESSAGE);

  return (
    <Flex direction="column" alignItems="center" role="alert" aria-live="assertive">
      <Text>{message}</Text>
      <Spacing size={16} />
      <Button onClick={resetErrorBoundary}>다시 시도</Button>
    </Flex>
  );
}
```

É uma implementação bem cuidada, que inclui até `role="alert"` e `aria-live="assertive"`. Mas vale fazer uma pergunta: **“é adequado mostrar a mesma tela para 401, 404, 500 e falta de conexão?”**

Na maioria dos casos, a resposta é **não**, porque a ação que o usuário precisa tomar varia conforme o tipo de erro.

| Tipo de erro | Ação do usuário | “Tentar novamente” faz sentido? |
| --- | --- | --- |
| Sem conexão | Verificar a conexão e tentar novamente | O |
| Erro 5xx do servidor | Tentar novamente após alguns instantes | O |
| Falha de autenticação 401 | Ir para a tela de login | X |
| Sem permissão 403 | Ir para outra tela | X |
| Recurso não encontrado 404 | Voltar à lista | △ |
| Falha de validação 422 | Corrigir os dados inseridos | X |

Exibir o botão “Tentar novamente” em todos os casos equivale a **orientar o usuário de forma incorreta sobre “a ação capaz de resolver o erro”**. Clicar em “Tentar novamente” após um 401 só produz outro 401. O que o usuário realmente precisa fazer é entrar novamente.

Por isso, a interface de contingência do erro deve **variar conforme o tipo de erro**. Não é necessário começar com um enorme `if/else`; podemos criar componentes pequenos e escolher entre eles.

Cada componente de contingência deve expor apenas a mensagem e a ação adequadas ao erro correspondente. A tela deve mostrar somente ações que o usuário realmente pode realizar.


### shouldCatch

Indo um passo além, existe também o padrão de **distinguir, no nível do componente, “os erros que devem ser capturados” daqueles que devem “seguir adiante”**. A `ErrorBoundary` do Suspensive oferece a propriedade `shouldCatch`.

```tsx
<ErrorBoundary
  shouldCatch={(error) => isHttpError(error) && error.status >= 500}
  fallback={ServerErrorFallback}
>
  <ErrorBoundary shouldCatch={NetworkError} fallback={NetworkErrorFallback}>
    <Page />
  </ErrorBoundary>
</ErrorBoundary>
```

A ErrorBoundary interna captura apenas erros de rede, não erros 5xx. Os erros que ela não captura **sobem para a ErrorBoundary superior** de acordo com o comportamento padrão do React. Assim, a ErrorBoundary externa fica responsável pelos erros 5xx. Em comparação com implementar o mesmo tratamento em uma condicional if/else, é atraente poder **atribuir significado aos próprios limites**.

`react-error-boundary` não oferece essa propriedade, mas podemos obter o mesmo efeito fazendo a ramificação dentro da interface de contingência. O padrão em si é mais importante do que a biblioteca.


## Conclusão

Em resumo, o tratamento de erros no frontend **não se resolve com uma única ferramenta**. Erros de renderização ficam a cargo da Error Boundary; erros em manipuladores de eventos, de `try/catch` ou `showBoundary`; erros na obtenção assíncrona de dados, de `throwOnError` e `useQueryErrorResetBoundary` do TanStack Query; erros de mutação, de `mutateAsync` ou `onError`; e interesses transversais, de `QueryCache`/`MutationCache`. Além disso, precisamos projetar em conjunto **o nome e a unidade de composição dos componentes compartilhados** e **a modelagem de domínio dos próprios tipos de erro** para chegar a uma política de erros consistente.

Quando entendemos a responsabilidade de cada ferramenta, conseguimos decidir com clareza: **“este erro é capturado aqui; aquele segue adiante até lá”**. O acúmulo dessas decisões é o que torna a experiência do usuário mais estável. Evitar uma tela em branco, impedir que a mesma notificação apareça cinco vezes, não deixar uma falha temporária de rede derrubar a página inteira e mostrar a tela de login em vez de “Tentar novamente” após um erro 401: são esses detalhes que constroem a impressão de um serviço bem-feito.

É claro que nem todo projeto precisa de todos esses padrões. Em uma ferramenta administrativa simples, uma ErrorBoundary e algumas notificações podem bastar. Em um domínio como pagamentos, onde um único erro custa dinheiro, cada mutação precisa de um tratamento minucioso. É o domínio que determina a resposta.

Espero que este texto também motive você a examinar seu projeto e perguntar: “quais erros o nosso serviço captura hoje, onde e em componentes com quais nomes?”. Talvez haja uma quantidade surpreendente de erros que pareciam estar bem capturados, mas na verdade estão escapando ou chegando à interface de contingência errada. Comigo, isso aconteceu repetidas vezes.


## Referências

:::ref
- [documentação] [React, Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [documentação] [TanStack Query, Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)
- [documentação] [TanStack Query, QueryErrorResetBoundary](https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary)
- [documentação] [TanStack Query, padrões importantes](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [artigo] [TkDodo, tratamento de erros no React Query](https://tkdodo.eu/blog/react-query-error-handling)
- [artigo] [TkDodo, alterando a API do React Query de propósito](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose)
- [repositório] [toss/suspensive, @suspensive/react-query](https://github.com/toss/suspensive)
- [documentação] [React Router, Error Boundaries](https://reactrouter.com/how-to/error-boundary)
:::
