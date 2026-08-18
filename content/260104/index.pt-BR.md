---
emoji: 🔑
title: "queryKey"
seoTitle: "Dominando queryKey no TanStack Query — de fábricas de chaves de consulta a queryOptions"
date: "2026-01-04"
categories: 프론트엔드 React TanStack-Query queryKey
description: "Uma análise de como queryKey funciona no TanStack Query e por que seu gerenciamento evoluiu de vetores declarados diretamente para fábricas de chaves de consulta e queryOptions. Aborda, sob uma perspectiva prática, o padrão de TkDodo, queryOptions da v5, setQueryData e a invalidação de consultas."
keywords: "queryKey, fábrica de chaves de consulta, queryKey do TanStack Query, chave de cache do React Query, queryOptions, setQueryData, chaves de consulta de TkDodo, query-key-factory, React Query v5, invalidação de consultas"
locale: pt-BR
translationOf: '260104'
sourceHash: beee9a6d46fea46ddca7ab57b452f0182cf37efe534445726d0f3b9d81190400
---

Neste artigo, quero falar sobre a **queryKey do TanStack Query**.

Ao usar o TanStack Query em projetos reais, já precisei **reformular várias vezes a maneira de gerenciar queryKey**. No começo, eu simplesmente escrevia vetores como `['user', userId]` diretamente dentro dos componentes. Depois, comecei a cometer erros de digitação porque precisava repetir a mesma chave em vários lugares sempre que invalidava uma consulta, então migrei tudo para um objeto de constantes como `QUERY_KEYS`. Mais tarde, após ler um artigo de TkDodo, adotei o padrão de fábrica de chaves de consulta; bastante tempo depois, passei a usar a biblioteca `@lukemorales/query-key-factory`; então chegou a v5, e reformulei tudo mais uma vez com `queryOptions`.

Comecei a me perguntar por que tantos padrões haviam surgido em torno de um pequeno vetor que não passava de um identificador de cache. **Por que uma única queryKey carrega tantos vestígios dessa evolução?** E qual problema específico cada etapa tentava resolver?

Neste artigo, vou percorrer a documentação oficial do TanStack Query, a série de artigos de TkDodo e até a implementação interna de `queryOptions`, introduzida na v5, para explicar como queryKey funciona e por que evoluiu até sua forma atual.


## Antes de queryKey

Antes de entrar no assunto principal, vale esclarecer um ponto. Hoje usamos bibliotecas como `TanStack Query` e `SWR` com toda naturalidade, mas como os dados assíncronos eram tratados antes de elas existirem?

A abordagem mais comum provavelmente era combinar `useState`, `useEffect`, `fetch`, `axios` e ferramentas semelhantes.

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ...
}
```

O problema desse código é evidente. Se houver apenas dois componentes na página consultando o mesmo `userId`, **a mesma requisição será feita duas vezes.** Isso acontece porque não há cache. E, se o usuário navegar para outra página e voltar, os dados serão buscados novamente do zero. Como não há como saber se eles foram obtidos há um segundo ou há uma hora, também é difícil reproduzir um comportamento como "mostrar o valor armazenado em cache enquanto ele é atualizado em segundo plano". (É possível criar um sistema próprio de cache para isso, mas considero seu gerenciamento bastante complicado.)

Para resolver esse problema, surgiu a combinação Redux + redux-thunk (ou redux-saga). Ao mover a lógica de busca de dados para uma função thunk e armazenar o resultado no repositório central, outros componentes podiam reutilizar os mesmos dados. No entanto, ainda era necessário definir tipos de ação, escrever redutores e gerenciar manualmente os estados de carregamento, sucesso e falha. A quantidade de código repetitivo para buscar um único dado era enorme. (Comecei a trabalhar profissionalmente nessa época e me perguntava: "Por que preciso criar vários arquivos só para buscar um dado?")

A essência desse fluxo é: **"Só é possível evitar a repetição de uma requisição quando se consegue identificar que requisição é essa."** E o identificador que diz "qual requisição" é justamente a queryKey.

SWR e React Query (hoje TanStack Query) enfrentaram esse problema diretamente. "Uma requisição assíncrona precisa de um identificador, e requisições com o mesmo identificador compartilham o cache." Esse único princípio simples eliminou todo o código repetitivo descrito acima.


## A essência de queryKey

Então, o que é exatamente queryKey? A documentação oficial do TanStack Query a define assim.

::::quote
:::translation
Em essência, o TanStack Query gerencia o armazenamento de consultas em cache com base em chaves de consulta. No nível mais alto, as chaves de consulta precisam ser um vetor... Desde que a chave de consulta seja serializável e **exclusiva para os dados da consulta**, ela pode ser usada.
:::

:::original
At its core, TanStack Query manages query caching for you based on query keys. Query keys have to be an Array at the top level... As long as the query key is serializable, and **unique to the query's data**, you can use it.
:::
::::

Há dois pontos essenciais. **Ela precisa ser serializável e exclusiva para aqueles dados.** A mesma chave deve representar os mesmos dados, e dados diferentes devem ter chaves diferentes. Essa regra simples determina todo o funcionamento do sistema de cache.

Há ainda outro aspecto importante. **queryKey também exerce o papel de vetor de dependências.** Assim como um efeito de `useEffect` do React é executado novamente quando suas dependências mudam, o TanStack Query busca automaticamente novos dados quando queryKey muda.

```tsx
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

Quando `userId` é `'A'` e quando é `'B'`, as chaves de consulta são diferentes. Se são diferentes, ocorre uma falha de cache; se há uma falha de cache, os dados são buscados. Tudo automaticamente. Graças a essa simplicidade, não precisamos escrever por conta própria uma lógica que diga: "userId mudou, então é preciso buscar os dados novamente".

Isso suscita uma pergunta: como o TanStack Query determina que uma queryKey é "a mesma chave"? Se a comparação fosse feita apenas com `===`, as referências dos objetos seriam diferentes e haveria uma falha de cache a cada vez.


## Por dentro de QueryCache

Segundo o artigo [Por dentro do React Query](https://tkdodo.eu/blog/inside-react-query), de TkDodo, `QueryCache` é, no fim das contas, apenas **uma estrutura de dados mantida na memória**. Mais precisamente, na [implementação oficial](https://github.com/TanStack/query/blob/main/packages/query-core/src/queryCache.ts) da v5, essa estrutura não é um objeto simples, mas um `Map<string, Query>`. Ela é declarada dentro da classe como `#queries = new Map<string, Query>()`, e todas as operações de escrita e leitura ocorrem por meio de `#queries.set(query.queryHash, query)` e `#queries.get(queryHash)`. A chave é a forma serializada de queryKey (`queryHash`), e o valor é uma instância da classe `Query`.

Versões antigas chegaram a usar objetos simples, mas, na v5, a implementação passou a adotar o `Map` nativo. (`Map` não apresenta risco de colisão de chaves nem de contaminação do protótipo, preserva a ordem de inserção e oferece, em média, consulta O(1) com chaves de texto, o que o torna uma escolha praticamente canônica para uma estrutura de cache.)

O que acontece a cada chamada de `useQuery` é simples. **queryKey é convertida em um valor de hash, que é usado para fazer uma consulta no Map.** Se houver um item, a instância de `Query` armazenada em cache é recuperada; se não houver, uma nova instância é criada e inserida com `set`.

Surge então outra pergunta natural. **Por que serializar queryKey como texto?** Por que não usar o próprio vetor como chave, como em `Map<QueryKey, Query>`?

A resposta está no modelo de igualdade do JavaScript. O `Map` nativo compara as chaves por **igualdade referencial (reference equality)**. Mesmo que o conteúdo seja idêntico, objetos diferentes na memória são considerados chaves distintas.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined — 새로 만든 배열은 다른 참조다
```

Em um componente React, porém, `useQuery({ queryKey: ['user', userId] })` **cria uma nova instância do vetor a cada renderização.** Embora o conteúdo dos vetores da primeira e da segunda renderização seja idêntico, eles são objetos distintos na memória. Se o cache dependesse da igualdade referencial, qualquer componente que consultasse os mesmos dados sofreria uma falha de cache a cada renderização.

A solução para o problema causado pela igualdade referencial é simples: **converter a igualdade referencial em igualdade estrutural (structural equality)**. Basta produzir um texto determinístico com base apenas no conteúdo de queryKey e usar esse texto como chave do Map. Assim, recuperamos a semântica desejada: "conteúdo igual significa chave igual". `JSON.stringify` é apenas a ferramenta mais simples para realizar essa conversão. (É também por isso que, após testar diferentes estratégias de serialização na época da v3, o TanStack Query acabou adotando uma variação estável de `JSON.stringify`.)

O elemento central aqui é a função que produz esse valor de hash: `hashKey`. A implementação oficial, definida em [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts), é exatamente esta.

```typescript
export function hashKey(queryKey: QueryKey | MutationKey): string {
  return JSON.stringify(queryKey, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val,
  )
}
```

Embora use `JSON.stringify`, não se trata de uma serialização comum: uma [função substituidora](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) é fornecida para **ordenar alfabeticamente as chaves dos objetos simples** antes da serialização.

Essa ordenação é essencial porque a serialização como texto exige uma condição ainda mais rigorosa: **entradas com o mesmo significado devem sempre ser convertidas no mesmo texto.** No entanto, `JSON.stringify` normalmente preserva a ordem das chaves. `{ a: 1, b: 2 }` e `{ b: 2, a: 1 }` são objetos semanticamente equivalentes, mas são serializados como textos diferentes e, por consequência, ocupam posições diferentes no cache. Isso faria com que os mesmos dados voltassem a ser solicitados duas vezes.

A técnica usada para evitar isso de forma consistente é a **forma canônica (canonical form)**. Ela força toda entrada com o mesmo significado a corresponder a uma única representação. É exatamente por isso que a função substituidora de `hashKey` ordena as chaves dos objetos simples. Independentemente da ordem de entrada, a saída se torna igual, fazendo o resultado da serialização corresponder univocamente ao significado do objeto. Em termos matemáticos, trata-se de escolher a forma ordenada como elemento representante da classe de equivalência (equivalence class) formada por objetos cujas chaves estão em ordens diferentes.

O fato de os vetores não serem ordenados é o outro lado do mesmo princípio. Como a própria ordem carrega significado nesse tipo de estrutura de dados, ordená-los causaria perda de informação. A ordem das chaves de um objeto é acidental; a ordem dos elementos de um vetor é intencional. `hashKey` trata corretamente esses dois casos de maneira distinta. Por isso, o guia oficial recomenda organizar queryKey do "genérico para o específico". Enquanto a ordem do vetor carregar significado, cabe a quem escreve o código definir esse significado.

Há mais um detalhe importante: a ordenação das chaves só se aplica a **objetos simples**. No mesmo arquivo, `isPlainObject` não verifica apenas `typeof === 'object'`; ela também verifica `Object.getPrototypeOf(o) === Object.prototype` para distinguir **literais de objeto puros** de **instâncias de classes**. Assim, um literal como `{ foo: 1 }` é ordenado, enquanto uma instância criada com `class User { ... }` segue adiante sem ordenação. (Daí surge uma armadilha: ao inserir diretamente uma instância de classe em queryKey, o comportamento de `JSON.stringify`, que só emite propriedades enumeráveis, pode produzir um hash diferente do esperado.)

Esse funcionamento produz duas consequências importantes.

**1. A ordem das chaves de um objeto é irrelevante.**

```tsx
useQuery({ queryKey: ['todos', { status: 'done', page: 1 }], queryFn });
useQuery({ queryKey: ['todos', { page: 1, status: 'done' }], queryFn });
// 두 쿼리는 같은 캐시 슬롯을 공유한다
```

Isso ocorre porque as chaves são ordenadas antes da serialização. Sem esse comportamento, seria necessário lembrar a ordem das chaves toda vez que se usasse um literal de objeto.

**2. A ordem dos elementos de um vetor é relevante.**

```tsx
useQuery({ queryKey: ['todos', status, page], queryFn });
useQuery({ queryKey: ['todos', page, status], queryFn });
// 두 쿼리는 다른 캐시이다
```

Isso acontece porque o vetor é uma estrutura de dados em que a própria ordem tem significado. `JSON.stringify` também preserva a ordem de seus elementos.

Também é útil saber que valores `undefined` desaparecem durante a serialização. `{ a: 1, b: undefined }` e `{ a: 1 }` produzem o mesmo valor de hash. (Eu mesmo já cometi o erro de pensar: "Como incluí undefined explicitamente, deve ser outro cache!")

Além disso, queryKey não pode conter **referências circulares nem funções**, pois `JSON.stringify` não consegue processá-las. Objetos `Date`, bem como `Map/Set`, `BigInt` e tipos semelhantes, tampouco são recomendados com o comportamento padrão. A estrutura precisa ser pura e serializável.

Um aspecto interessante é que essa restrição não é absoluta. Por meio da opção `queryKeyHashFn`, o TanStack Query oferece **uma saída para substituir a própria função de hash**. Internamente, `hashQueryKeyByOptions(queryKey, options)` verifica se `queryKeyHashFn` foi fornecida nas opções; em caso afirmativo, chama essa função, caso contrário, chama a `hashKey` padrão.

```tsx
useQuery({
  queryKey: [{ id: userId, fetchedAt: new Date() }],
  queryFn,
  // Date를 ISO 문자열로 바꿔서 해싱
  queryKeyHashFn: (key) =>
    JSON.stringify(key, (_, v) => (v instanceof Date ? v.toISOString() : v)),
});
```

Contudo, essa opção precisa ser definida separadamente para cada consulta e não se aplica a APIs imperativas chamadas sem acesso às opções, como `queryClient.setQueryData` ([Issue nº 1343](https://github.com/TanStack/query/issues/1343)). Por isso, em projetos reais, é muito mais seguro evitar essa saída e **converter queryKey para uma forma serializável no momento em que ela é criada**. (Certa vez, inseri diretamente um `Date` e passei muito tempo tentando entender: "Por que o cache não é atualizado se o instante é o mesmo?" A resposta era: "Esse `Date` representa o mesmo instante, mas é outra instância do objeto e, portanto, produz um hash diferente a cada vez.")


## Regras para escrever queryKey

Depois de compreender o funcionamento interno descrito acima, as regras de escrita decorrem naturalmente. As recomendações da documentação oficial podem ser resumidas assim.

**Regra 1. queryKey precisa ser um vetor.**

Mesmo que uma cadeia de caracteres funcione (ela é convertida internamente em um vetor), é melhor usar um vetor desde o início para manter a consistência.

```tsx
// 비권장
useQuery({ queryKey: 'todos', queryFn });

// 권장
useQuery({ queryKey: ['todos'], queryFn });
```

**Regra 2. Inclua em queryKey todas as variáveis das quais queryFn depende.**

```tsx
// 잘못된 예: userId가 쿼리키에 없다
useQuery({
  queryKey: ['user'],
  queryFn: () => fetchUser(userId),
});

// 올바른 예
useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

O raciocínio é idêntico ao das dependências de `useEffect`. Todas as variáveis usadas dentro da função precisam estar na chave, isto é, no vetor de dependências. Se essa regra for violada, pode surgir um erro difícil de rastrear: o usuário muda, mas os dados do usuário anterior continuam aparecendo.

**Regra 3. Organize os elementos do mais genérico para o mais específico.**

```tsx
// 좋다
['todos', 'list', { filter: 'done' }]
['todos', 'detail', todoId]

// 안 좋다 (순서가 뒤집혀 있음)
[{ filter: 'done' }, 'list', 'todos']
```

Essa ordem é importante por causa da **invalidação (invalidation)**. Por padrão, `invalidateQueries` do TanStack Query usa **correspondência por prefixo**.

```tsx
// 모든 todos 관련 쿼리 무효화
queryClient.invalidateQueries({ queryKey: ['todos'] });
// → ['todos', 'list', ...], ['todos', 'detail', ...] 모두 매치된다

// list 쿼리만 무효화
queryClient.invalidateQueries({ queryKey: ['todos', 'list'] });
// → ['todos', 'list', ...]만 매치된다
```

Ao projetar as chaves como uma árvore, torna-se possível expressar em uma única linha desde "busque novamente todos os dados deste domínio" até "busque novamente apenas este item específico". (À primeira vista, isso pode parecer pouco relevante; mas basta projetar mal uma vez e ver a invalidação atingir um escopo diferente do pretendido para perceber seu verdadeiro valor.)


## Evolução do gerenciamento de queryKey

Até aqui, tratamos do funcionamento e do uso de queryKey. Agora podemos passar à pergunta principal: **como o gerenciamento de queryKey mudou ao longo do tempo?**

Vou organizar em ordem cronológica as etapas pelas quais passei em projetos reais.


### 1. Vetores declarados diretamente

Esta é a forma mais simples. Dentro do componente, combinam-se textos fixos com valores das propriedades.

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  // ...
}

function PostList({ filter }: { filter: PostFilter }) {
  const { data } = useQuery({
    queryKey: ['posts', filter],
    queryFn: () => fetchPosts(filter),
  });
  // ...
}
```

No início, isso pode ser suficiente.

O problema aparece à medida que a base de código cresce. Quando se precisa invalidar dados em uma mutação que altera informações de um usuário, é necessário pesquisar toda vez: "Qual era a chave das consultas de usuário?" Alguns lugares acabam usando `['user', userId]`, enquanto outros usam `['users', userId]`, no plural. Como essas chaves ocupam posições totalmente diferentes no cache, a invalidação afeta apenas uma delas.


### 2. Objeto de constantes

Para evitar erros de digitação, as chaves de consulta são reunidas em constantes.

```tsx
// queryKeys.ts
export const QUERY_KEYS = {
  USER: 'user',
  POSTS: 'posts',
  COMMENTS: 'comments',
} as const;

// 사용처
useQuery({
  queryKey: [QUERY_KEYS.USER, userId],
  queryFn: () => fetchUser(userId),
});
```

Os erros de digitação desaparecem, mas a responsabilidade de montar as chaves continua nos locais de uso. Alguém escreve a combinação `[QUERY_KEYS.USER, userId]` como `[QUERY_KEYS.USER, userId, 'detail']`, enquanto outra pessoa usa `['user', 'detail', userId]`. Chega um momento em que é necessário memorizar à parte qual convenção está correta.


### 3. Fábrica de chaves de consulta

Esse padrão foi concretizado no artigo [Chaves eficazes no React Query](https://tkdodo.eu/blog/effective-react-query-keys), de TkDodo. Define-se um objeto que cria as chaves de cada domínio, expressando a hierarquia por meio de funções.

```tsx
// features/todos/queries.ts
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: string) => [...todoKeys.lists(), { filters }] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};

// 사용
useQuery({ queryKey: todoKeys.detail(1), queryFn: ... });
useQuery({ queryKey: todoKeys.list('done'), queryFn: ... });

// 무효화
queryClient.invalidateQueries({ queryKey: todoKeys.all });        // 전체
queryClient.invalidateQueries({ queryKey: todoKeys.lists() });    // 모든 리스트
queryClient.invalidateQueries({ queryKey: todoKeys.detail(1) });  // 특정 항목
```

Esse padrão é poderoso porque **torna a hierarquia explicitamente visível no código**. `todoKeys.all` representa todas as consultas relacionadas a tarefas, `todoKeys.lists()` representa todas as consultas em formato de lista, e `todoKeys.detail(1)` representa um item específico. Assim, o escopo da invalidação pode ser expresso com precisão em uma única linha de código.

Outra vantagem é a **colocalização (co-location)**. TkDodo não recomenda reunir as chaves em um arquivo global. Em vez disso, recomenda colocar `queries.ts` dentro do diretório do recurso e manter juntos, nesse arquivo, as chaves e os hooks.

```
src/
└── features/
    └── todos/
        ├── index.tsx
        └── queries.ts   # 키와 훅을 모두 여기에
```

Isso cria um modelo mental simples: "Para alterar algo em tarefas, basta olhar a pasta de tarefas". É uma aplicação fiel do princípio de manter juntas as partes que mudam juntas.


### 4. @lukemorales/query-key-factory

Ao escrever manualmente o terceiro padrão repetidas vezes, o código repetitivo se acumula. Além disso, quando surge a necessidade de combinar e gerenciar as chaves de vários domínios, faz falta uma interface padronizada. A biblioteca [@lukemorales/query-key-factory](https://github.com/lukemorales/query-key-factory) é o resultado da transformação desse padrão em biblioteca.

```tsx
import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory';

const users = createQueryKeys('users', {
  detail: (userId: string) => ({
    queryKey: [userId],
    queryFn: () => api.getUser(userId),
  }),
  list: (filters: UserFilters) => ({
    queryKey: [{ filters }],
    queryFn: () => api.getUsers(filters),
  }),
});

const todos = createQueryKeys('todos', {
  detail: (id: number) => ({
    queryKey: [id],
    queryFn: () => api.getTodo(id),
  }),
});

export const queries = mergeQueryKeys(users, todos);

// 사용
useQuery(queries.users.detail('abc'));
useQuery(queries.todos.detail(1));

// 무효화
queryClient.invalidateQueries(queries.users._def);            // 모든 user 쿼리
queryClient.invalidateQueries(queries.users.detail('abc'));   // 특정 항목
```

`createQueryKeys` adiciona automaticamente o prefixo, e `mergeQueryKeys` permite combinar domínios. Além disso, a propriedade convencionada `_def` dá acesso à chave de todo o domínio. Com isso, desaparece o trabalho de acrescentar `as const` a cada vez e restringir manualmente os tipos, como era necessário na fábrica artesanal.

Durante algum tempo, essa biblioteca foi usada praticamente como um padrão de mercado. (Eu também a usei bastante.) Mas a chegada de queryOptions mudou o cenário.


### 5. queryOptions (API oficial da v5)

Uma das mudanças mais importantes do TanStack Query v5 foi a introdução da API `queryOptions`. Na migração da v4 para a v5, os argumentos de todos os hooks foram unificados em um único objeto. O verdadeiro objetivo dessa mudança era permitir que esse objeto fosse extraído como **uma unidade reutilizável**.

```tsx
import { queryOptions } from '@tanstack/react-query';

export const userDetailOptions = (userId: string) =>
  queryOptions({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,
  });

// 어디서나 사용 가능
useQuery(userDetailOptions('abc'));
useSuspenseQuery(userDetailOptions('abc'));
queryClient.prefetchQuery(userDetailOptions('abc'));
queryClient.setQueryData(userDetailOptions('abc').queryKey, newUser);
```

À primeira vista, pode surgir a dúvida: "O que há de diferente? Parece apenas um objeto envolvido por uma função." TkDodo reconhece esse ponto no artigo [A API Query Options](https://tkdodo.eu/blog/the-query-options-api). Em tempo de execução, ela realmente se limita a devolver o objeto recebido.

O trabalho realmente útil acontece **dentro do sistema de tipos**. Veremos isso a seguir.


## DataTag de queryOptions

O motivo pelo qual `queryOptions` não é apenas uma função auxiliar é que ela **incorpora informações sobre o tipo dos dados na queryKey retornada.** Dentro do TanStack Query, esse mecanismo é chamado de `DataTag`.

Sua implementação aproximada é esta.

```typescript
declare const dataTagSymbol: unique symbol;
declare const dataTagErrorSymbol: unique symbol;

export type DataTag<TType, TValue, TError = unknown> = TType & {
  [dataTagSymbol]: TValue;
  [dataTagErrorSymbol]: TError;
};
```

Trata-se de um **tipo marcado (branded type)** que usa `unique symbol`. Em tempo de execução, é apenas uma marca sem efeito algum; para o TypeScript, porém, ela carrega a informação de que "este vetor não é um vetor qualquer, mas um vetor associado a dados do tipo `TValue`".

Há um motivo específico para usar `unique symbol`. O artigo da Zenn [Revelando o unique symbol por trás de DataTag](https://zenn.dev/tsuboi/articles/tanstack-query-options-unique-symbol?locale=en) compara esse recurso a "uma vaga exclusiva para informações de tipo". Uma chave de texto comum poderia colidir com chaves de outras bibliotecas ou do código do usuário; no entanto, **cada declaração de `unique symbol` cria por si só um tipo exclusivo** e, portanto, nunca tem o mesmo tipo de qualquer outra declaração. Ela se torna um identificador sem possibilidade de colisão.

A diferença produzida por esse único recurso é significativa.

```tsx
const data = queryClient.getQueryData(['user', 'abc']); // unknown
const data = queryClient.getQueryData(userDetailOptions('abc').queryKey); // User | undefined
```

Embora `getQueryData` e `setQueryData` recebam apenas uma queryKey, a própria queryKey já contém o tipo dos dados; por isso, o tipo de retorno é inferido automaticamente. Não é necessário fornecer parâmetros genéricos manualmente, e o compilador aponta imediatamente uma tentativa de passar a `setQueryData` um valor de tipo incorreto.

É claro que existem limitações. Em métodos como `getQueriesData`, que recuperam várias consultas de uma vez, o resultado é um vetor heterogêneo de tuplas e a inferência de tipos não se aplica. Além disso, como a implementação usa `unique symbol`, a geração de arquivos `.d.ts` em um monorrepositório pode causar o erro TS4023; uma forma de contorná-lo é importar explicitamente `dataTagSymbol`.

Ao resumir o mecanismo até aqui, um fato fica claro. **A inferência de tipos de queryOptions depende inteiramente de queryKey e queryFn serem declaradas juntas no mesmo lugar.** Para incorporar em queryKey o tipo retornado por queryFn, ambas precisam ser declaradas lado a lado.

Esse ponto traz uma implicação importante para o rumo das fábricas de chaves de consulta. Os padrões das gerações anteriores davam prioridade a extrair a gestão de queryKey como uma unidade de abstração separada. A recomendação da v5 segue a direção oposta: **reunir novamente queryKey e queryFn em uma única unidade.** TkDodo chega a dizer que "separar queryKey de queryFn foi um erro". Afinal, a chave é o conjunto das dependências usadas pela função, e as duas têm uma relação inseparável.


## Padrão de composição com queryOptions em projetos reais

O verdadeiro valor de `queryOptions` aparece quando ela é combinada a uma fábrica por domínio. A forma recomendada pela documentação oficial da v5 é esta.

```tsx
import { queryOptions } from '@tanstack/react-query';

export const todoQueries = {
  all: () => ['todos'] as const,
  lists: () => [...todoQueries.all(), 'list'] as const,
  list: (filters: TodoFilters) =>
    queryOptions({
      queryKey: [...todoQueries.lists(), filters],
      queryFn: () => fetchTodos(filters),
      staleTime: 30 * 1000,
    }),
  details: () => [...todoQueries.all(), 'detail'] as const,
  detail: (id: number) =>
    queryOptions({
      queryKey: [...todoQueries.details(), id],
      queryFn: () => fetchTodo(id),
      staleTime: 5 * 60 * 1000,
    }),
};
```

Vejamos, um a um, os motivos pelos quais esse padrão funciona bem.

**1. Ele oferece, ao mesmo tempo, uma hierarquia e inferência de tipos.**

`todoQueries.all()` e `todoQueries.lists()` retornam apenas vetores, enquanto `todoQueries.detail(1)` retorna, por meio de `queryOptions`, um objeto com a marca de tipo dos dados. Usa-se o vetor para invalidar e o objeto de opções para executar a consulta.

```tsx
useQuery(todoQueries.detail(1));                                // 옵션 객체
queryClient.invalidateQueries({ queryKey: todoQueries.all() }); // 배열
```

**2. O componente pode sobrescrever parcialmente as opções.**

Como o resultado de `queryOptions` é, no fim das contas, um objeto, algumas opções podem ser combinadas no momento da chamada.

```tsx
const { data: title } = useQuery({
  ...todoQueries.detail(1),
  select: (todo) => todo.title,  // 컴포넌트별로 다른 select 적용
});
```

Esse padrão é especialmente poderoso porque o tipo retornado por `select` é inferido automaticamente e o tipo de `data` é restringido para `string`. Do ponto de vista do componente, é possível selecionar apenas a parte necessária, mantendo a definição do domínio intacta em um só lugar.

**3. Hooks personalizados que envolvem `useQuery` tornam-se cada vez menos necessários.**

Na época da v4, um padrão comum era criar um hook personalizado para cada domínio.

O problema dessa abordagem era que, **assim que surgia a necessidade de fazer uma busca antecipada, era preciso escrever a mesma definição outra vez**. Como `useTodoDetail` é um hook, ele não pode ser chamado fora de um componente; portanto, no carregador de uma rota ou em um manipulador de eventos, era necessário escrever novamente `queryClient.prefetchQuery({ queryKey: [...], queryFn: ... })`.

Com `queryOptions`, essa duplicação desaparece.

Uma única definição funciona em qualquer lugar. Por isso, TkDodo recomenda: "Na v5, defina queryOptions em vez de criar hooks." O hook passa a ser uma camada fina usada apenas quando necessário, e a definição do domínio existe de maneira autossuficiente, sem depender dele.


## Invalidação após mutações

É na invalidação após uma mutação que a hierarquia de queryKey realmente se destaca. Segundo a documentação de [Invalidação de consultas](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) do TanStack Query, `invalidateQueries` usa **correspondência por prefixo** por padrão.

```tsx
// 모든 todos 관련 쿼리 (list, detail, lists 모두)
queryClient.invalidateQueries({ queryKey: todoQueries.all() });

// 모든 list만 (detail은 건드리지 않음)
queryClient.invalidateQueries({ queryKey: todoQueries.lists() });

// 정확히 이 키만 (자식 키 매치 안 함)
queryClient.invalidateQueries({
  queryKey: todoQueries.detail(1).queryKey,
  exact: true,
});

// 더 복잡한 조건은 predicate으로
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' &&
    (query.queryKey[2] as any)?.version >= 10,
});
```

Quando as chaves são projetadas hierarquicamente, **o escopo da invalidação corresponde ao significado do código.** "Atualize todas as tarefas" é expresso com `all()`, "atualize apenas as listas" com `lists()`, e "atualize somente este item" com `detail(id)`.

Se as chaves estivessem espalhadas de forma plana, como `['todoList']` e `['todoDetail', 1]`, seria preciso fazer duas chamadas separadas para invalidar "todo o domínio de tarefas" ou criar e gerenciar uma constante de prefixo específica. (E, sempre que uma nova chave do domínio fosse adicionada sem que alguém se lembrasse de incluí-la nessa constante, surgiria um erro por omissão na invalidação.)


## Recuperando queryKey dentro de queryFn

Por fim, há mais um padrão a considerar. `queryFn` recebe como argumento um objeto chamado `QueryFunctionContext`, que contém exatamente a queryKey usada no momento da chamada.

```tsx
queryOptions({
  queryKey: ['user', userId, { include: 'profile' }] as const,
  queryFn: ({ queryKey }) => {
    const [, id, options] = queryKey;
    return fetchUser(id, options);
  },
});
```

Por que esse padrão é útil? Segundo o artigo de TkDodo [Aproveitando o contexto da função de consulta](https://tkdodo.eu/blog/leveraging-the-query-function-context), ele permite **forçar a sincronização entre as dependências de queryKey e queryFn**.

```tsx
const sortBy = 'name';

queryOptions({
  queryKey: ['users'],
  queryFn: () => fetchUsers({ sortBy }),
});
```

Esse código é perigoso porque queryFn depende de uma variável externa. Além disso, mesmo que `sortBy` mude, o cache não será atualizado, pois essa dependência não foi incluída na chave. Enquanto `queryFn` capturar variáveis de um fechamento externo, esse tipo de erro poderá acontecer a qualquer momento.

A solução é simples: fazer com que `queryFn` não dependa de variáveis externas. **Se todas as dependências forem extraídas de queryKey**, uma variável ausente na chave simplesmente não poderá ser usada dentro da função.

```tsx
queryOptions({
  queryKey: ['users', { sortBy }] as const,
  queryFn: ({ queryKey: [, { sortBy }] }) => fetchUsers({ sortBy }),
});
```

Com essa estrutura, quando surge uma nova dependência, não há como usá-la na função sem incluí-la em queryKey. O compilador avisa: "Essa chave não existe." Em vez de depender de uma convenção, a sincronização entre chave e função é **delegada ao sistema de tipos**.


## Até que ponto separar

Depois de ler até aqui, pode surgir a pergunta: "Então todas as consultas devem ser extraídas para `queryOptions`?"

Como sempre, minha resposta é: **"Depende da situação."**

É importante lembrar que **uma abstração nem sempre é benéfica**. Se uma consulta é usada apenas uma vez, extraí-la à força para uma fábrica de domínio só obriga quem lê o código a alternar entre dois arquivos. A evolução dos padrões de gerenciamento de queryKey não significa que "a ferramenta mais sofisticada deve ser usada sempre", mas que **"há a opção de subir um degrau de cada vez quando surgir a necessidade"**.


## Conclusão

Em resumo, queryKey é **a unidade mais fundamental usada pelo TanStack Query para identificar e armazenar dados assíncronos em cache**. Nesse pequeno vetor estão condensados o identificador de uma posição no cache, o vetor de dependências, o escopo de invalidação e, desde a v5, até informações sobre o tipo dos dados. Como tantas responsabilidades convergem para esse único ponto, a maneira de escrever e gerenciar queryKey afeta diretamente a carga cognitiva de toda a base de código.

Cada etapa foi uma resposta a um problema real enfrentado por alguém naquele momento. Portanto, o caminho correto não é simplesmente pensar: "Agora estamos na v5, então sempre devemos usar apenas `queryOptions`", mas **"Que tipo de problema minha base de código enfrenta neste momento?"** Introduzir uma fábrica de domínio em um projeto para o qual vetores declarados diretamente já são suficientes pode, por si só, ser um excesso de engenharia.

Espero que quem leu este artigo também examine seu próprio projeto: como queryKey está espalhada pela base de código, como as invalidações são realizadas e se essa estrutura é adequada ao tamanho atual da equipe e à complexidade do domínio.


## Referências

:::ref
- [documentação] [TanStack Query, Chaves de consulta](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [documentação] [TanStack Query, Opções de consulta](https://tanstack.com/query/v5/docs/framework/react/guides/query-options)
- [documentação] [TanStack Query, TypeScript](https://tanstack.com/query/v5/docs/framework/react/typescript)
- [artigo] [TanStack, Anúncio do TanStack Query v5](https://tanstack.com/blog/announcing-tanstack-query-v5)
:::
