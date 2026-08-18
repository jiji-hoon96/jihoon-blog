---
emoji: 🧠
title: "Gerenciamento de estado"
seoTitle: "Gerenciamento de estado no frontend — 7 categorias e critérios de arquitetura React"
date: "2026-05-18"
categories: gerenciamento de estado no frontend arquitetura React
description: "O gerenciamento de estado é uma das tarefas mais complexas do frontend. Classificamos o estado em sete categorias — local, global, de servidor, de formulário, de URL, externo e guards — e apresentamos quatro perspectivas para orientar a escolha de ferramentas e a modelagem, como Single Source of Truth, eliminação de estados impossíveis e State Colocation."
keywords: "gerenciamento de estado no frontend, gerenciamento de estado React, comparação Zustand Jotai, TanStack Query, Server State Client State, State Colocation, Single Source of Truth, React 19 useOptimistic"
locale: pt-BR
translationOf: '260518'
sourceHash: 7d2f8d18c54ae7f00c5922a4cb5cd7237792e4fce04be90a498fcdbaca0e3b41
---

Neste post, quero falar sobre **gerenciamento de estado (State Management)**. Não se trata de uma comparação entre bibliotecas. Mais importante do que decidir qual ferramenta é melhor é desenvolver uma percepção sobre **como enxergar** o estado e onde **traçar seus limites**.

Nos últimos tempos, as ferramentas de IA (Claude, ChatGPT, Cursor, Gemini, Copilot) passaram a ocupar um espaço cada vez maior ao nosso lado. A velocidade de desenvolvimento cresceu exponencialmente, mas, para ser sincero, tenho a impressão de que a qualidade final dos serviços não acompanhou esse ritmo. Tornou-se comum encontrar tantos bugs quanto funcionalidades novas, assim como ouvir: “Não sei por que isso ficou assim”.

À medida que desenvolvemos mais rápido, deixamos de examinar cada linha de código com o mesmo cuidado. Por isso mesmo, acredito que se tornou ainda mais necessário ter **uma base sólida para orientar a IA na direção correta**. Para manter a qualidade do resultado, precisamos identificar problemas no código gerado pela IA e redirecioná-la para aquilo que realmente queremos. Essa base pode envolver desenvolvimento orientado ao domínio, abstração, TDD (Test-Driven Development, desenvolvimento orientado a testes), uso adequado de bibliotecas, vantagens de performance, entre outros aspectos.

No entanto, sempre que pergunto a colegas de frontend — e também a profissionais de outras áreas de TI — “Qual é a tarefa mais difícil no desenvolvimento frontend?”, a resposta que mais ouço é sempre a mesma: **“Gerenciar o fluxo de estado.”**

Neste artigo, pretendo explicar por que gerenciar esse fluxo é tão difícil e que tipo de discernimento e sensibilidade precisamos desenvolver para lidar bem com ele.


## O que é estado (State)?

Antes de entrar no assunto propriamente dito, vamos começar pela pergunta mais básica: afinal, o que exatamente chamamos de “estado”?

Enquanto estudava desenvolvimento frontend, eu lia com frequência os textos de [hoseung.me](https://blog.hoseung.me/2021-12-05-state-management). Ali, estado é definido como **“todo dado capaz de afetar a UI”**. Número de curtidas, itens do carrinho, modal aberto ou fechado, valores digitados, informações do usuário autenticado, aba selecionada, resultados de busca, estado de carregamento: tudo isso é estado.

A documentação oficial do React oferece uma definição mais formal. O próprio título da página é [“State: A Component's Memory”](https://react.dev/learn/state-a-components-memory); em outras palavras, trata-se de **“um mecanismo que permite ao componente reter dados entre renderizações e acionar uma nova renderização no React quando esses dados são atualizados”**. Ou seja, são dados que não desaparecem com o tempo, mudam em resposta a algum evento e fazem a UI ser renderizada novamente quando mudam. Há ainda outro ponto importante: o estado é **isolado por instância do componente**. Mesmo que o mesmo componente apareça dez vezes em uma página, cada instância terá seu próprio estado independente. Esse fato se conecta diretamente à discussão posterior sobre “onde o estado deve ficar”.

As duas definições apontam para o mesmo lugar: estado é **“um valor que muda ao longo do tempo e afeta a renderização”**. Uma constante que não muda não é estado. Um design token primitivo fixado no build time não é estado, mas um dark mode que o usuário pode alternar é. (A rigor, o valor em si é resolvido conforme o estado do tema, dark ou light; portanto, é mais preciso dizer que a “seleção do tema” é o estado e que o token é o espelho no qual esse estado se reflete.)

Há um aspecto que vale destacar: **nem todo estado vive em um componente**. Alguns estados vivem em cookies; outros, em localStorage, sessionStorage ou IndexedDB; outros ainda, na URL. Quando trazemos dados do servidor para o cliente e os armazenamos em cache, eles também se tornam uma forma de estado. Até a posição de scroll e a pilha de histórico mantidas pelo próprio navegador às vezes precisam ser tratadas como estado, pois determinam o comportamento da aplicação.


## Por que é tão difícil?

Vamos começar pensando de forma simples sobre por que lidar com estado é difícil. Não bastaria criar os estados necessários, levá-los até onde são usados e tratar corretamente suas atualizações e resets?

Com essa pergunta em mente, abra uma página do serviço em que você trabalha hoje.

Quantos componentes existem nessa página? Mesmo em uma página simples, provavelmente há de dezenas a centenas de componentes formando uma árvore. Cada componente pode manter seu próprio estado, compartilhá-lo com componentes irmãos ou recebê-lo do pai. O estado também transita entre páginas; alguns valores precisam sobreviver a um refresh, enquanto outros devem desaparecer quando a aba é fechada.

O verdadeiro motivo de ser tão difícil gerenciar estado é este: **não conseguimos visualizar de imediato onde os inúmeros estados são declarados, como são atualizados e quando deixam de existir**. Conforme aumenta o número de componentes com papéis semelhantes, torna-se mais difícil tanto nomear estados quanto rastrear o código que os altera.

É assim que surge uma teia invisível. Um clique no componente A invalida os dados de B; a invalidação de B fecha a UI de C; ao fechar C, os dados digitados no formulário desaparecem. Se essa cadeia não estiver explicitada em nenhum lugar do código, teremos de reconstruir mentalmente toda a teia ao depurar um bug.

Como, então, organizar essa teia? Para mim, o primeiro passo é reconhecer que **“existem diferentes tipos de estado”**.


## Nem todo estado é igual

[Kent C. Dodds](https://kentcdodds.com/blog/application-state-management-with-react) divide o estado em **Server Cache** (informações que existem no servidor e são mantidas pelo cliente para acesso rápido) e **UI State** (informações que existem apenas na UI para controlar o comportamento da interface). Muitas vezes erramos justamente ao agrupar os dois.

A [documentação oficial do TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) define a ferramenta como uma biblioteca de Server State, responsável por gerenciar operações assíncronas entre servidor e cliente, enquanto Redux, MobX e Zustand são definidos como bibliotecas de Client State. (É possível armazenar dados assíncronos nelas, mas isso é ineficiente.)

O ponto central é claro: **Server State e Client State são problemas diferentes**. Server State é assíncrono, pode ser alterado por outros usuários e se torna stale com o tempo. Client State é síncrono, está sob nosso controle e desaparece com um refresh. (Mais precisamente, quando a página é descarregada, **o runtime JavaScript é reiniciado, e a árvore de componentes mantida na memória heap, junto com seus estados, é coletada.** Por isso, na próxima montagem, tudo recomeça pelo valor inicial de `useState`.) Se tentarmos tratar os dois com a mesma ferramenta, teremos de implementar por conta própria padrões como invalidação de cache, atualização em background e optimistic updates.

Vou um passo além e divido o estado do frontend em **sete categorias**. Vale esclarecer desde já que essas categorias não se separam perfeitamente em um único eixo. Local de armazenamento, origem, ciclo de vida e função se misturam, de modo que um mesmo estado pode pertencer a mais de uma categoria. Em vez de uma taxonomia perfeita, encare-as como **perguntas que ajudam a decidir como gerenciar um estado**.

- **Estado local (Local State)** — Estado usado apenas em um componente ou em uma subárvore restrita
- **Estado global (Global State)** — Estado que precisa ser compartilhado por toda a aplicação
- **Estado do servidor (Server State)** — Estado cuja fonte da verdade é o servidor e cuja cópia no cliente é um cache
- **Estado de formulário (Form State)** — Estado temporário que existe enquanto o usuário preenche dados
- **Estado da URL (URL State)** — Estado compartilhável que vive na barra de endereços e sobrevive ao refresh
- **Estado externo (External State)** — Estado fora do React, como cookies, localStorage, sessionStorage e IndexedDB
- **Guard de estado (State Guard)** — Lógica que bloqueia, permite ou valida acessos e ações conforme combinações de estado, em vez de ser um estado em si

Além dessas categorias, há estados de fluxo que podem exigir uma máquina de estados e estados colaborativos em tempo real baseados em WebSocket ou CRDT.

Vamos analisar, uma a uma, por que cada categoria exige ferramentas diferentes e com que perspectiva devemos abordá-la.


## Estado local (Local State)

É a forma mais simples de estado. Ele é usado apenas dentro de um componente, e quem está de fora não precisa — nem deveria precisar — conhecê-lo. Alguns exemplos são: modal aberto ou fechado, botão de alternância on/off, hover e termo de busca enquanto está sendo digitado.

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

Isso provavelmente já é familiar. A verdadeira dificuldade do estado local, porém, está na decisão de **“onde esse estado deve ficar”**.

No artigo de Kent C. Dodds sobre [State Colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster), ele observa que **as pessoas estão acostumadas a “elevar (lift up)” o estado, mas raramente voltam a “aproximá-lo (colocate)” quando o código muda**.

Elevar o estado é algo que fazemos naturalmente quando componentes irmãos precisam compartilhá-lo. Como os dois precisam enxergar os mesmos dados, levamos o estado para o pai comum e o distribuímos via props.

O problema surge quando os componentes irmãos deixam de precisar desse estado. Raramente fazemos o caminho inverso, **descendo-o** de volta para o filho. Como resultado, o componente pai acumula vários estados que na verdade não lhe dizem respeito e, sempre que renderiza novamente, acaba levando consigo toda a árvore de filhos.

Por isso, o primeiro princípio do estado local é: **para tornar o código mais rápido e simples, mantenha o estado o mais próximo possível do código que o utiliza**. Se um estado é usado apenas por um único filho, não há motivo para o pai mantê-lo. Mova-o para dentro desse filho; o pai ficará mais leve.


## Estado global (Global State)

Estado global é aquele que precisa estar acessível de qualquer ponto da aplicação. Informações de login, tema, idioma e notificações (toasts) são possíveis candidatos.

A diferença entre estado local e global não se resume a “onde ele vive”. O que muda é o **contrato de referência**. O estado local assume o compromisso de que **“isso só tem significado dentro deste componente”**; já o estado global publica para todo o código o compromisso de que **“esse valor pode ser acessado por esse nome em qualquer lugar da aplicação”**. A essência do estado global está no custo desse compromisso.

Criar um estado global significa, na prática, adicionar **uma dependência implícita em toda a aplicação**.


## Estado de servidor (Server State)

Colocamos os dados recebidos de uma API no estado do cliente, gerenciamos loading e error manualmente com booleanos e, em algum momento, chegamos à pergunta: **“Por que estou escrevendo o mesmo boilerplate toda vez?”**

Tanner Linsley, principal mantenedor do TanStack, diz que **“Client State é síncrono e previsível. Server State é assíncrono, compartilhado entre vários componentes e exige atenção ao cache, às atualizações em background e aos estados de erro.”** Em outras palavras, Server State é **uma espécie fundamentalmente diferente** de Client State. Não devemos tratá-los com a mesma ferramenta.

A dificuldade do Server State não decorre das ferramentas, mas da **natureza dos dados**.

Os dados que o cliente exibe pertencem ao servidor. Aquilo que o cliente possui é apenas **um snapshot de determinado momento**. Com o passar do tempo, esses dados ficam stale. Além disso, são assíncronos, podem falhar e passam por estados como pending, error e success.

A característica mais importante é que **não existe garantia de que as respostas retornarão na ordem em que as requisições foram enviadas**. Imagine digitar rapidamente “react” em uma caixa de busca. As requisições r → re → rea → reac → react são enviadas nessa ordem; porém, se a resposta de “react” chegar primeiro e a de “rea” chegar depois, a tela exibirá os resultados de “rea”. Para evitar esse problema, é preciso lidar com **riscos de concorrência (race conditions)** que exigiriam implementar manualmente, a cada vez, um AbortController ou o rastreamento de IDs das requisições.


## Estado de formulário (Form State)

Formulários têm um tipo peculiar de estado. Enquanto o usuário digita, ele muda intensamente; depois do envio, em geral desaparece. Não é compartilhado com nenhum outro lugar e, na maioria dos casos, também não há onde armazená-lo.

O problema é que essa “mudança intensa” custa caro. Se cada tecla pressionada causar uma nova renderização do React, o atraso na digitação pode se tornar perceptível em formulários grandes. Além disso, um formulário não serve apenas para “guardar valores”. **Validação, dirty check, estado de envio, mensagens de erro e fluxos em múltiplas etapas** coexistem e mudam ao mesmo tempo dentro de um único formulário.

Espera-se que um formulário em várias etapas, como um checkout de três passos, **“preserve o progresso mesmo após um refresh no meio do processo”**. Se seus valores forem mantidos apenas com useState, todos desaparecerão no refresh. É natural armazená-los em **sessionStorage** (armazenamento temporário por aba) ou na **URL** (para etapas compartilháveis). Ou seja, dependendo dos requisitos de ciclo de vida, o estado de formulário se combina com **External State** ou **URL State**.


## Estado da URL (URL State)

Imagine uma página de busca em que categoria, ordenação e número da página são usados como filtros. Se esses estados forem mantidos com useState, três problemas surgirão ao mesmo tempo.

- Ao atualizar a página, todos os filtros voltam aos valores iniciais
- Ao compartilhar a URL com alguém, essa pessoa verá a página sem os filtros aplicados
- Ao clicar em voltar, você não retornará aos filtros anteriores

Para resolver esses problemas, **é natural colocar o estado na URL**. A própria URL é um armazenamento persistente gratuito, compatível com refresh, compartilhamento e histórico.

```
/products?category=shoes&sort=price-desc&page=2
```

Essa única URL contém o estado completo de **“página 2 da categoria de calçados, ordenada por preço decrescente”**. Não é necessário mantê-lo separadamente com useState.

Quando, então, é apropriado tratar estado na URL? **A URL é uma interface pública.** Senhas, tokens de autenticação e anotações temporárias que o usuário não queira mostrar a outras pessoas não devem estar na URL. Além disso, inserir diretamente na URL valores que mudam com muita frequência — como uma busca atualizada a cada tecla — enche a pilha de histórico de lixo. Nesses casos, devemos aplicar a alteração após um debounce, reservar `push` para quando fizer sentido e usar `replace` nas atualizações que não devem adicionar uma entrada ao histórico.

Os valores da URL são **sempre strings**. Números, booleanos, arrays e objetos precisam passar por serialização e desserialização. Além disso, a URL precisa seguir as regras de [percent-encoding](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams), que dão tratamento especial a `&`, `=`, caracteres coreanos, espaços e outros elementos. Implementar tudo isso manualmente a cada vez logo se transforma em uma fonte de bugs.

```tsx
const params = new URLSearchParams(location.search);
const page = Number(params.get("page") ?? "1");
params.set("page", String(page + 1));
navigate(`?${params.toString()}`);

const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
```

Bibliotecas como [nuqs](https://nuqs.dev/) resolvem os dois problemas por meio do conceito de *parser*. Parsers como `parseAsInteger`, `parseAsBoolean` e `parseAsJson` cuidam de uma só vez da serialização, da desserialização e dos tipos. A biblioteca oferece suporte à maioria dos ambientes, incluindo Next.js (App Router e Pages Router), React Router v6/v7, TanStack Router e Remix.


Isso significa que podemos colocar qualquer quantidade de estado na URL? Além dos problemas de serialização e tipos, ainda existe uma última restrição a considerar. A [RFC 7230](https://datatracker.ietf.org/doc/html/rfc7230) não define um limite exato, mas recomenda que “o servidor ofereça suporte a pelo menos 8.000 octetos” (octeto é a unidade usada em redes e comunicação de dados para designar, sem ambiguidade, um conjunto de 8 bits, isto é, 1 byte). Os limites também variam entre navegadores: browsers modernos geralmente aceitam de 8 KB a dezenas de milhares de caracteres, mas **mecanismos de busca, o processamento de OG/compartilhamento em redes sociais e alguns gateways podem truncar a URL por volta de 2 KB**. Portanto, não devemos inserir dados indefinidamente na URL. É mais seguro manter nela apenas os **principais filtros compartilháveis** e deixar o restante a cargo do sessionStorage ou de um armazenamento no servidor.


## Estado externo (External State)

O React conhece apenas o estado dentro dele próprio. Nossa aplicação, porém, conversa constantemente com o mundo fora do React. Os estados que vivem nesse mundo sobrevivem e mudam independentemente do ciclo de vida do React. O External State abordado aqui inclui **Cookie, localStorage,sessionStorage,IndexedDB**.

Como escolher o armazenamento adequado? Costumo pensar em quatro perspectivas: **duração, capacidade, sincronicidade e segurança**.

Para **tokens de autenticação**, a [recomendação da OWASP](https://owasp.org/www-community/HttpOnly) prioriza **cookies HttpOnly + Secure**. Como o localStorage é acessível via JavaScript, **basta uma exposição a XSS para que o token seja roubado diretamente**. Alguns guias de segurança recomendam um padrão híbrido: **access token na memória e refresh token em um cookie HttpOnly**. Para dados persistentes, não sensíveis e que mudam pouco, usa-se localStorage; para dados que devem desaparecer com a aba, sessionStorage. IndexedDB costuma ser usado para cache offline, grandes volumes de dados e arquivos.

Cookies e Web Storage (local/session) **armazenam apenas strings**. Por isso, inserir um objeto exige passar por `JSON.stringify`/`JSON.parse`. O JSON, contudo, tem limitações.

```ts
JSON.stringify({ when: new Date() });
// → { "when": "2026-05-19T..." } — Date becomes a string

JSON.stringify({ map: new Map([["a", 1]]) });
// → { "map": {} } — Map is lost entirely

JSON.stringify({ value: undefined });
// → "{}" — the undefined field is omitted
```

`Date` se torna string em um round trip por JSON, enquanto `Map`, `Set` e `undefined` podem perder dados. No comportamento padrão, `BigInt` faz `JSON.stringify` lançar um `TypeError`, portanto a serialização falha por completo. Ao armazenar objetos fora do React, devemos sempre ter consciência de **quais tipos podem desaparecer, ser alterados ou fazer a serialização falhar** e, se necessário, criar um adapter.

A verdadeira dificuldade do External State é que **o React não detecta suas mudanças automaticamente**. Gravar um valor no localStorage não faz um componente React renderizar novamente. Em geral, há três padrões para resolver isso.

- **Encapsular o armazenamento em um hook customizado (useLocalStorage) e sincronizar o External State com o estado do React.** É uma solução leve, mas, quando implementada do zero, exige lidar com casos extremos como múltiplas abas, SSR e tearing.
- Usar o hook `useSyncExternalStore`, introduzido no React 18, para **“sincronizar o React com estados externos”**. Com isso, **é possível garantir que não ocorra tearing durante a renderização concorrente**. É a ferramenta padrão para integrar localStorage, APIs do navegador e stores externos.
- Como bibliotecas de estado oferecem integração com armazenamento externo como recurso de primeira classe — por exemplo, o middleware `persist` do Zustand e o `atomWithStorage` do Jotai —, podemos aproveitar implementações já prontas.

Há ainda outro princípio importante: **no momento em que trazemos um estado externo para o React, a responsabilidade pela sincronização passa a ser nossa**. E se ele for atualizado em outra aba? E se o servidor alterar o cookie? E se o usuário modificar diretamente o localStorage pelas ferramentas de desenvolvedor do navegador? Essas situações frequentemente se tornam grandes fontes de bugs.


## Guard de estado (State Guard)

A última categoria tem uma natureza um pouco diferente. Não é o estado em si, mas **a lógica que usa uma combinação de estados para impedir, permitir ou validar determinado fluxo**.

O exemplo mais comum é o **guard de autenticação (Auth Guard)**.

```tsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
```

Aqui, o estado `isAuthenticated` controla o fluxo de roteamento. Isso é uma lógica de guard. Existem vários tipos: guard de autenticação (usuário autenticado), guard de autorização (papel ou permissão específica), guard de fluxo (ramificação de entrada) e guard de validação (habilitação de etapa), entre outros.

A lógica de guards tende a se concentrar em um único lugar. É comum um componente reunir tudo: **“se não estiver autenticado, vá para o login; se não tiver permissão, mostre 403; se o carrinho estiver vazio, vá para a página de produtos; se o usuário estiver suspenso, exiba o aviso de suspensão”**. Quanto mais inchado fica o guard, mais difícil é depurar qual condição bloqueou o fluxo e onde isso aconteceu.

Um bom guard **verifica apenas uma coisa**. A combinação é feita por Composition.

```tsx
<AuthGuard>
  <RoleGuard role="admin">
    <FlowGuard require={["cartHasItems"]}>
      <CheckoutPage />
    </FlowGuard>
  </RoleGuard>
</AuthGuard>
```

Cada guard toma apenas uma decisão, e a estrutura em árvore é responsável pela composição. Para adicionar um novo guard, não é necessário alterar os existentes.

Ao trabalhar com guards, há algo que exige ainda mais reflexão do que decidir o que bloquear: **definir para onde encaminhar o usuário e como tratar o fluxo depois disso**. Um guard que apenas bloqueia, sem fallback, termina em uma tela branca ou em um spinner infinito.

O bug mais comum ocorre quando **“o conteúdo protegido pisca brevemente antes de a verificação assíncrona do guard terminar”**. A validação do token de autenticação e a consulta de permissões quase sempre são assíncronas; nesse intervalo, `isAuthenticated` pode ficar temporariamente como `undefined` ou `false`. **Se o estado de loading não for tratado explicitamente, a tela protegida pode ser exposta nesse intervalo ou o usuário pode ser redirecionado por engano para a página de login.**

```tsx
// Ignores loading and handles only missing data => incorrect
if (!user) return <Navigate to="/login" />;

// Treat loading as a first-class state (early return) => correct
if (isLoading) return <Spinner />;
if (!user) return <Navigate to="/login" replace />;
return children;
```

Dois modelos são usados com frequência na implementação de guards de autorização.

- **RBAC (Role-Based Access Control)**: concede permissões por papel. Por exemplo: “admin pode ver as informações de todos os usuários”. É simples e rápido, mas o número de papéis explode à medida que eles se tornam mais granulares
- **ABAC (Attribute-Based Access Control)**: determina permissões a partir de uma combinação de atributos. Por exemplo: “se o usuário for o autor do post, pertencer à mesma equipe ou for admin”. Tem grande poder de expressão, mas é difícil de implementar e depurar

Como mostra o [guia de RBAC do TanStack Router](https://tanstack.com/router/v1/docs/framework/react/how-to/setup-rbac), recomenda-se o padrão de inserir o guard em `beforeLoad`, no nível do router. O ponto central é que **as verificações de permissão devem poder ser representadas como dados — uma lista de papéis ou permissões — em vez de ficarem espalhadas pelo código**. Assim, uma mudança na política de acesso se resume a uma *mudança de dados*.


## Conclusão

Vamos recapitular. O gerenciamento de estado não é difícil porque as bibliotecas são difíceis. Ele é difícil porque **frequentemente esquecemos que existem diferentes tipos de estado** e deixamos passar o fato de que cada tipo exige ferramentas e formas de pensar distintas.

Mantenha o estado local o mais próximo possível; questione mais uma vez se o estado global é realmente global; trate Server State como cache; separe os formulários do domínio; use a URL de forma mais ativa; assuma conscientemente as responsabilidades envolvidas no armazenamento externo; e divida os guards em partes pequenas que possam ser compostas. Esses são os fundamentos para lidar com as sete categorias.

Acima de tudo isso, o discernimento necessário se resume, no fim, a quatro perguntas.

- Onde está a Single Source of Truth destes dados?
- Este valor pode ser calculado ou realmente precisa ser armazenado?
- Existe alguma combinação impossível entre esses estados?
- Este estado realmente deveria estar neste lugar?

Fazer essas perguntas sempre que criamos uma nova tela, revisamos um PR ou recebemos código produzido por IA é, acredito, o caminho mais seguro para desenvolver esse discernimento e essa sensibilidade.

Como mencionei no início, a IA permanecerá ao nosso lado por muito tempo. O tempo que dedicamos a examinar linha por linha continuará diminuindo. Mas, justamente por isso, a capacidade de responder a pequenas perguntas como **“Onde este estado deveria ficar?”** se tornará ainda mais valiosa. É fácil pedir à IA: “adicione mais um useState aqui”. Saber que novo fio essa linha acrescenta à teia da nossa aplicação, porém, depende exclusivamente do discernimento de quem lê o código.

Não existe uma resposta única. Ainda assim, há uma diferença evidente entre **“criar estado sem saber o que é estado”** e **“criá-lo tendo consciência de seu tipo e de sua localização”**. Espero que, da próxima vez que você estiver prestes a escrever uma linha de `useState`, pare por um instante e pergunte: “A qual categoria de estado isto pertence?”


### Referências

:::ref
- [docs] [React, Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [docs] [React, You Probably Don't Need Derived State](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)
- [docs] [XState](https://xstate.js.org/)
- [article] [Top 5 React State Management Tools in 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
:::
