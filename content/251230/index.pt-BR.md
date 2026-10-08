---
emoji: 🧮
title: "Como as queryKey são comparadas"
seoTitle: "Como o TanStack Query compara queryKeys: hashKey explicado"
date: "2025-12-30"
updatedAt: "2026-10-08"
categories: frontend React TanStack-Query queryKey
description: "Como o TanStack Query decide que duas queryKey são iguais: a serialização com hashKey (ordem das chaves, undefined, Map) e a comparação dos filtros."
keywords: "comparação de queryKey, hashKey, queryHash, chave de cache do TanStack Query, ordem da queryKey no React Query, queryKeyHashFn, JSON.stringify chaves ordenadas, QueryCache"
locale: pt-BR
translationOf: '251230'
sourceHash: ac741f2d85d62c63a48506c66ba0ada891e74b35304a1db40d0da4cb32e2578c
---

Neste artigo, quero falar sobre **como o TanStack Query decide que duas queryKeys são a mesma chave**.

É para quem usa TanStack Query e já se perguntou por que uma queryKey, criada como um vetor novo a cada renderização, não causa um cache miss toda vez, e se a ordem das chaves de um objeto ou valores `undefined` afetam o cache; ao final, você saberá qual regra faz duas chaves serem iguais e como essa regra afeta o cache. Adiantando a conclusão: o TanStack Query usa como chave de cache a string obtida ao serializar a queryKey com `hashKey`, e nesse processo a ordem das chaves dos objetos é ignorada, enquanto a ordem dos elementos dos vetores é preservada.

A queryKey é o vetor que o TanStack Query usa como base para gerenciar o cache de consultas. A mesma chave significa os mesmos dados, e quando `['user', userId]` muda porque o seu `userId` mudou, ocorre um cache miss e os dados são buscados novamente com fetch.

Isso suscita uma pergunta: como o TanStack Query determina que uma queryKey é "a mesma chave"? Se a comparação fosse feita apenas com `===`, as referências dos objetos seriam diferentes e haveria uma falha de cache a cada vez.


## Por dentro de QueryCache

Segundo o artigo [Por dentro do React Query](https://tkdodo.eu/blog/inside-react-query), de TkDodo, `QueryCache` é, no fim das contas, apenas **uma estrutura de dados mantida na memória**. Mais precisamente, na [implementação oficial](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/queryCache.ts) da v5, essa estrutura não é um objeto simples, mas um `Map<string, Query>`. Ela é declarada dentro da classe como `#queries = new Map<string, Query>()`, e todas as operações de escrita e leitura ocorrem por meio de `#queries.set(query.queryHash, query)` e `#queries.get(queryHash)`. A chave é a forma serializada de queryKey (`queryHash`), e o valor é uma instância da classe `Query`. O código e os resultados deste artigo se baseiam em `@tanstack/query-core` 5.104.1.

Versões antigas chegaram a usar objetos simples, mas, na v5, a implementação passou a adotar o `Map` nativo. `Map` nunca colide com chaves herdadas de um protótipo e preserva a ordem de inserção. Quanto à velocidade de consulta, a [especificação do ECMAScript](https://tc39.es/ecma262/#sec-map-objects) só exige tempos de acesso sublineares em relação ao número de elementos, e o V8 [o implementa como uma tabela hash](https://v8.dev/blog/hash-code). É uma escolha sensata para uma estrutura de cache.

O que acontece a cada chamada de `useQuery` é simples. **queryKey é convertida em um valor de hash, que é usado para fazer uma consulta no Map.** Se houver um item, a instância de `Query` armazenada em cache é recuperada; se não houver, uma nova instância é criada e inserida com `set`.

Surge então outra pergunta natural. **Por que serializar queryKey como texto?** Por que não usar o próprio vetor como chave, como em `Map<QueryKey, Query>`?

A resposta está no modelo de igualdade do JavaScript. O `Map` nativo compara as chaves por **igualdade referencial (reference equality)**. Mesmo que o conteúdo seja idêntico, objetos diferentes na memória são considerados chaves distintas.

```js
const m = new Map();
m.set(['user', 1], 'alice');
m.get(['user', 1]); // undefined. 새로 만든 배열은 다른 참조다
```

Em um componente React, porém, `useQuery({ queryKey: ['user', userId] })` **cria uma nova instância do vetor a cada renderização.** Embora o conteúdo dos vetores da primeira e da segunda renderização seja idêntico, eles são objetos distintos na memória. Se o cache dependesse da igualdade referencial, qualquer componente que consultasse os mesmos dados sofreria uma falha de cache a cada renderização.

A solução para o problema causado pela igualdade referencial é simples: **converter a igualdade referencial em igualdade estrutural (structural equality)**. Basta produzir um texto determinístico com base apenas no conteúdo de queryKey e usar esse texto como chave do Map. Assim, recuperamos a semântica desejada: "conteúdo igual significa chave igual". `JSON.stringify` é apenas a ferramenta mais simples para realizar essa conversão.

O elemento central aqui é a função que produz esse valor de hash: `hashKey`. A implementação oficial, definida em [`packages/query-core/src/utils.ts`](https://github.com/TanStack/query/blob/%40tanstack%2Fquery-core%405.104.1/packages/query-core/src/utils.ts#L284-L295), é exatamente esta.

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

Usa `JSON.stringify` com uma [função substituidora](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#the_replacer_parameter) que **ordena lexicograficamente as chaves dos objetos simples** antes da serialização. A rigor, é a ordem de unidades de código UTF-16, a comparação padrão de `sort()`, então chaves maiúsculas vêm antes das minúsculas.

Essa ordenação é essencial porque a serialização como texto exige uma condição ainda mais rigorosa: **entradas com o mesmo significado devem sempre ser convertidas no mesmo texto.** No entanto, o `JSON.stringify` comum preserva a ordem das chaves. `{ a: 1, b: 2 }` e `{ b: 2, a: 1 }` são objetos semanticamente equivalentes, mas são serializados como textos diferentes e, por consequência, ocupam posições diferentes no cache. Isso faria com que os mesmos dados voltassem a ser solicitados duas vezes.

A técnica usada para evitar isso de forma consistente é a **forma canônica (canonical form)**. Ela força toda entrada com o mesmo significado a corresponder a uma única representação. É exatamente por isso que a função substituidora de `hashKey` ordena as chaves dos objetos simples. Independentemente da ordem de entrada, a saída se torna igual, fazendo o resultado da serialização corresponder univocamente ao significado do objeto. Em outras palavras, trata como um mesmo grupo os objetos que diferem apenas na ordem das chaves e escolhe uma única forma, a de chaves ordenadas, para representar esse grupo.

O fato de os vetores não serem ordenados é o outro lado do mesmo princípio. Como a própria ordem carrega significado nesse tipo de estrutura de dados, ordená-los causaria perda de informação. A ordem das chaves de um objeto é acidental; a ordem dos elementos de um vetor é intencional. `hashKey` trata corretamente esses dois casos de maneira distinta. Por isso, o mantenedor TkDodo, em [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys), recomenda estruturar queryKey do mais genérico para o mais específico. Enquanto a ordem do vetor carregar significado, cabe a quem escreve o código definir esse significado.

Há mais um detalhe importante: a ordenação das chaves só se aplica a **objetos simples**. No mesmo arquivo, `isPlainObject` verifica `typeof === 'object'` e também `Object.getPrototypeOf(o) === Object.prototype` para distinguir **literais de objeto puros** de **instâncias de classes**. Assim, um literal como `{ foo: 1 }` é ordenado, enquanto uma instância criada com `class User { ... }` segue adiante sem ordenação. (Daí surge uma armadilha: ao inserir diretamente uma instância de classe em queryKey, o comportamento de `JSON.stringify`, que só emite propriedades enumeráveis, pode produzir um hash diferente do esperado.)

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


## Valores que a serialização altera

Também é útil saber que valores `undefined` desaparecem durante a serialização. `{ a: 1, b: undefined }` e `{ a: 1 }` produzem o mesmo valor de hash. (Eu mesmo já cometi o erro de pensar: "Como incluí undefined explicitamente, deve ser outro cache!")

Dentro de um vetor, o comportamento é diferente. Um elemento `undefined` não desaparece; ele vira `null`. Por isso `['user', undefined]` e `['user', null]` são a mesma chave, e ambas são diferentes de `['user']`. É o que acontece com `['user', userId]` quando `userId` ainda é `undefined`. Mesmo que você bloqueie o fetch com `enabled: false`, uma entrada `["user",null]` é criada no cache. Confirmei isso criando, com as mesmas opções, o objeto que `useQuery` usa internamente, um `QueryObserver`.

`undefined` não é o único caso. Como `hashKey` se apoia em `JSON.stringify`, a maioria dos valores que o JSON não consegue representar vira outro valor sem nenhum erro. Executei o código abaixo em 2026-10-08 com `@tanstack/query-core` 5.104.1 e Node v24.16.0; os comentários são a saída real.

```js
import { hashKey, QueryClient } from '@tanstack/query-core'

console.log(hashKey(['user', undefined])) // ["user",null]
console.log(hashKey(['user', null])) // ["user",null]
console.log(hashKey(['user'])) // ["user"]
console.log(hashKey(['f', { cb: () => 1 }])) // ["f",{}]
console.log(hashKey(['m', new Map([['a', 1]])])) // ["m",{}]
console.log(hashKey(['d', new Date('2025-12-30T00:00:00Z')])) // ["d","2025-12-30T00:00:00.000Z"]

const queryClient = new QueryClient()
queryClient.setQueryData(['m', new Map([['a', 1]])], 'mapA')
console.log(queryClient.getQueryData(['m', new Map([['b', 2]])])) // mapA
```

Testando outros valores da mesma forma, o resultado fica assim.

| Valor na chave | Resultado serializado | Tratado como a mesma chave que |
|---|---|---|
| `undefined`, `NaN`, `Infinity` ou uma função como elemento de vetor | `null` | uma chave com `null` nessa posição |
| `undefined` ou uma função como propriedade de objeto | a propriedade desaparece | uma chave sem essa propriedade |
| `Map`, `Set` | `{}` | qualquer `Map`, `Set` ou objeto vazio, seja qual for o conteúdo |
| `Date` | uma string ISO | a mesma string ISO |
| `BigInt` | lança `TypeError` | nenhuma |
| referência circular | lança `RangeError` para um objeto simples e `TypeError` para um vetor | nenhuma |

Os mais perigosos são `Map` e `Set`. No código acima, os dados guardados com a chave `new Map([['a', 1]])` voltaram ao consultar com `new Map([['b', 2]])`. Como não há erro, também não há nenhuma pista de que a tela está exibindo dados errados.

Só dois casos aparecem como erro: `BigInt` e referências circulares. Nas referências circulares, o erro depende do que forma o ciclo. Um objeto simples que aponta para si mesmo termina com `RangeError: Maximum call stack size exceeded`, enquanto um vetor que contém a si mesmo, como em `arr.push(arr)`, termina com `TypeError: Converting circular structure to JSON`. Como a função substituidora devolve um objeto novo para cada objeto simples, a detecção de ciclos de `JSON.stringify` nunca reencontra o mesmo objeto; já um vetor é devolvido como está pela função substituidora, e o ciclo é detectado. Já `Date` vira uma string ISO por meio de `toJSON`, e o mesmo instante gera a mesma chave, o que o torna seguro.

Por isso, o mais seguro é colocar em uma queryKey apenas strings, números, booleanos, `null` e vetores e objetos simples formados por eles.


## queryKeyHashFn

Essa restrição tem uma saída. Por meio da opção `queryKeyHashFn`, o TanStack Query permite **substituir a própria função de hash**. Internamente, `hashQueryKeyByOptions(queryKey, options)` decide: se as opções tiverem `queryKeyHashFn`, chama essa função; caso contrário, chama o `hashKey` padrão.

Substituir significa trocar `hashKey` por inteiro. A ordenação de chaves vista antes vai embora junto, então, se você precisar dela, terá de implementá-la. O caso em que essa opção é realmente necessária é um valor com o qual a serialização padrão lança erro, como `BigInt`. O código abaixo também foi executado no mesmo ambiente.

```js
import { QueryClient } from '@tanstack/query-core'

const bigintSafeHash = (queryKey) =>
  JSON.stringify(queryKey, (_, v) => (typeof v === 'bigint' ? v.toString() : v))

const queryClient = new QueryClient({
  defaultOptions: { queries: { queryKeyHashFn: bigintSafeHash } },
})

queryClient.setQueryData(['order', 9007199254740993n], 'ok')
console.log(queryClient.getQueryData(['order', 9007199254740993n])) // ok
console.log(queryClient.getQueryData(['order', '9007199254740993'])) // ok

queryClient.setQueryData(['todos', { status: 'done', page: 1 }], 'A')
console.log(queryClient.getQueryData(['todos', { page: 1, status: 'done' }])) // undefined
```

A segunda saída significa que um `BigInt` e uma string com o mesmo número viram a mesma chave. A última saída é o efeito de perder a ordenação: objetos que diferem só na ordem das chaves deixam de ser tratados como a mesma chave.

O lugar onde ela é registrada também muda o resultado. Se for registrada no `QueryClient` por meio de `defaultOptions` ou de `setQueryDefaults`, como acima, `setQueryData` e `getQueryData` também usam essa função. Isso acontece porque as duas APIs mesclam as opções padrão com `defaultQueryOptions` antes de calcular o hash. Já se ela for escrita só na chamada de `useQuery`, as APIs imperativas usam o `hashKey` padrão, e a mesma chave se divide em duas entradas no cache. Na fase beta da v3.2.0, nem o valor global era aplicado a `setQueryData`. Na [Issue #1343](https://github.com/TanStack/query/issues/1343), um mantenedor respondeu que isso deveria estar corrigido na v3.2.0-beta.30, e quem reportou confirmou que funcionava.

Por isso, na prática, é muito mais seguro evitar essa saída e **converter os valores para uma forma serializável no momento de construir a queryKey**. Escrever a própria função de hash exige cuidar tanto da ordenação de chaves quanto do lugar onde ela é registrada.

Uma vez coloquei um `Date` diretamente em uma chave e passei um bom tempo me perguntando: "Por que o cache está sendo atualizado se é o mesmo instante?". Um `Date` que aponta para o mesmo instante vira a mesma string ISO mesmo sendo outra instância, então gera o mesmo hash. Se saía uma chave diferente a cada vez, o horário em si era diferente, mesmo que parecesse o mesmo instante. Criar um `new Date()` durante a renderização coloca um horário diferente por milissegundos em cada renderização, e cada um vira uma chave nova.


## Como os filtros comparam chaves

Há mais uma forma de julgar se duas chaves são iguais. A "mesma chave" de que falamos até aqui significa que as strings de hash são iguais, e o hash só é usado na consulta ao cache e em filtros com `exact: true`. Filtros como `invalidateQueries` e `findAll` decidem por padrão com `partialMatchKey`, que compara recursivamente a estrutura da queryKey original, e não a string de hash. Vetores são comparados a partir do início, e nos objetos só são verificadas as chaves escritas no filtro. O código abaixo também foi executado no mesmo ambiente.

```js
import { partialMatchKey } from '@tanstack/query-core'

const queryKey = ['todos', { status: 'done', page: 1 }]
console.log(partialMatchKey(queryKey, ['todos'])) // true
console.log(partialMatchKey(queryKey, ['todos', { status: 'done' }])) // true
console.log(partialMatchKey(queryKey, [{ status: 'done' }])) // false
console.log(partialMatchKey(queryKey, ['todos', { status: 'todo' }])) // false
```

Como essa correspondência não passa pelo hash, trocar `queryKeyHashFn` não a altera. Em um `QueryClient` com uma função de hash sem ordenação, como no exemplo anterior, um objeto que difere só na ordem das chaves não é encontrado com `exact: true`, mas a correspondência por prefixo ainda o encontra.


## Conclusão

Em resumo, o TanStack Query não compara as referências dos vetores queryKey. `hashKey` ordena as chaves dos objetos simples enquanto serializa com `JSON.stringify`, e a string resultante (`queryHash`) é usada como chave de um `Map`. Por isso a ordem das chaves de um objeto não afeta o cache, a ordem dos elementos de um vetor afeta, e uma propriedade cujo valor é `undefined` equivale a uma propriedade ausente. A maioria dos valores que o JSON não consegue representar vira outro valor sem nenhum erro, e chaves diferentes passam silenciosamente a ser a mesma. É possível trocar a função de hash com `queryKeyHashFn`, mas isso também descarta a ordenação de chaves, então é mais seguro converter os valores em serializáveis ao montar a chave. Também vale lembrar que filtros, como os de invalidação, por padrão não passam pelo hash e comparam a estrutura da queryKey a partir do início.

Como esse critério se reflete na forma de escrever e gerenciar queryKeys, ou seja, o caminho dos vetores inline, passando pelas fábricas de chaves, até `queryOptions`, é o assunto de [queryKey](/260104).

Da próxima vez que você colocar um objeto ou um `Map` em uma queryKey, espero que pare um instante para pensar em qual string ele vai virar na serialização.


## Referências

:::ref
- [documentação] [TanStack Query, Chaves de consulta](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [documentação] [TanStack Query, QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient)
:::
