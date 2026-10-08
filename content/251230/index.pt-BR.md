---
emoji: 🧮
title: "Como as queryKey são comparadas"
seoTitle: "Como o TanStack Query compara queryKeys: hashKey explicado"
date: "2025-12-30"
categories: frontend React TanStack-Query queryKey
description: "Como o TanStack Query trata novos vetores queryKey como a mesma chave com hashKey: a ordem das chaves não importa, a do vetor sim, e undefined desaparece."
keywords: "comparação de queryKey, hashKey, queryHash, chave de cache do TanStack Query, ordem da queryKey no React Query, queryKeyHashFn, JSON.stringify chaves ordenadas, QueryCache"
locale: pt-BR
translationOf: '251230'
sourceHash: 7e26877fcdd3f1c85b67751a911900b36ff424cb43b408fb640fb8aa3075e22a
---

Neste artigo, quero falar sobre **como o TanStack Query decide que duas queryKeys são a mesma chave**.

É para quem usa TanStack Query e já se perguntou por que uma queryKey, criada como um vetor novo a cada renderização, não causa um cache miss toda vez, e se a ordem das chaves de um objeto ou valores `undefined` afetam o cache; ao final, você saberá qual regra faz duas chaves serem iguais e como essa regra afeta o cache. Adiantando a conclusão: o TanStack Query usa como chave de cache a string obtida ao serializar a queryKey com `hashKey`, e nesse processo a ordem das chaves dos objetos é ignorada, enquanto a ordem dos elementos dos vetores é preservada.

A queryKey é o vetor que o TanStack Query usa como base para gerenciar o cache de consultas. A mesma chave significa os mesmos dados, e quando `['user', userId]` muda porque o seu `userId` mudou, ocorre um cache miss e os dados são buscados novamente com fetch.

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

A técnica usada para evitar isso de forma consistente é a **forma canônica (canonical form)**. Ela força toda entrada com o mesmo significado a corresponder a uma única representação. É exatamente por isso que a função substituidora de `hashKey` ordena as chaves dos objetos simples. Independentemente da ordem de entrada, a saída se torna igual, fazendo o resultado da serialização corresponder univocamente ao significado do objeto. Em outras palavras, trata como um mesmo grupo os objetos que diferem apenas na ordem das chaves e escolhe uma única forma, a de chaves ordenadas, para representar esse grupo.

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


## Conclusão

Em resumo, o TanStack Query não compara as referências dos vetores queryKey. `hashKey` ordena as chaves dos objetos simples enquanto serializa com `JSON.stringify`, e a string resultante (`queryHash`) é usada como chave de um `Map`. Por isso a ordem das chaves de um objeto não afeta o cache, a ordem dos elementos de um vetor afeta, e uma propriedade cujo valor é `undefined` equivale a uma propriedade ausente. Valores que não podem ser serializados podem ser contornados com `queryKeyHashFn`, mas é mais seguro convertê-los em valores serializáveis ao montar a chave.

Como esse critério se reflete na forma de escrever e gerenciar queryKeys, ou seja, o caminho dos vetores inline, passando pelas fábricas de chaves, até `queryOptions`, é o assunto de [queryKey](/260104).

Da próxima vez que você colocar um objeto ou um `Date` em uma queryKey, espero que pare um instante para pensar em qual string ele vai virar na serialização.


## Referências

:::ref
- [documentação] [TanStack Query, Chaves de consulta](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
:::
