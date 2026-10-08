---
emoji: 🧱
title: 'As layers de um app React'
seoTitle: 'Arquitetura em camadas no React com hooks e Strategy'
date: '2026-10-01'
categories: frontend React arquitetura
description: 'Dividimos uma tela de pagamento React em view, model e data seguindo Juntao Qiu. O repositório de exemplo revela um useMemo inútil e um fetch em loop.'
keywords: 'arquitetura React, separação em camadas React, layers em React, custom hooks React, domain object, padrão Strategy React, Presentation Domain Data layering, refatoração React, clean architecture frontend'
locale: pt-BR
translationOf: '261001'
sourceHash: a471069dd1f6949b51da4ba268781878b3bb9d94f9bf5e928521cd4799ecef3e
---

Neste post quero falar sobre como dividir o código de um app React em tela, regras de negócio e acesso a dados. É um texto para quem tem fetch, cálculo e render juntos em um único component e precisa ler tudo toda vez que mexe nele. Lendo até o fim, você vai saber a partir de quais sinais e em que ordem extrair hooks, pure components, domain objects, Strategy e um network client, e onde essa estrutura quebra quando é copiada como está.

A espinha dorsal é [Modularizing React Applications with Established UI Patterns](https://martinfowler.com/articles/modularizing-react-apps.html), publicado em partes por Juntao Qiu, da Thoughtworks, no martinfowler.com em fevereiro de 2023. Não traduzi o original. Reescrevi com as minhas palavras, e todas as figuras do texto vêm desse artigo. Por cima disso, baixei o [repositório de exemplo](https://github.com/abruzzi/payment-round-up-refactoring) do autor, rodei a checagem de tipos e os testes, e acrescentei os resultados junto com outros materiais que tratam do mesmo problema.

## React é uma view library

Quando se aprende React, a ideia mais atraente é que a UI é uma função pura que transforma dados em DOM. Até certo ponto, é verdade. Mas no momento em que você manda uma requisição ao servidor ou navega para outra página, o component deixa de ser puro. Junte a isso o state global e o state local se entrelaçando, e o código fica complicado rapidinho.

A resposta do autor é mudar o ponto de vista. Não existe uma espécie à parte de software chamada "aplicação React". React é uma library que desenha a UI, e onde colocar cálculos ou regras de negócio nunca foi uma preocupação dela. O que fica por cima é um app JavaScript comum. Sendo assim, dá para usar como estão os designs que vêm desde a época das GUIs de desktop, em especial a divisão do código em três layers: presentation, domain e data.

Um app de frontend real tem, além da view, router, local storage, vários níveis de cache, requisições de rede, integração com serviços externos e login, segurança, logging e ajuste de performance. Se você empurra tudo isso para components e hooks, num mesmo arquivo a linha que pede o status do pedido é seguida por uma linha que tira os espaços do começo de uma string, e depois por uma linha que navega para outra tela. Quem lê precisa ficar indo e voltando enquanto troca de nível de abstração o tempo todo.

Os motivos para dividir se resumem a dois. A tela muda com mais frequência do que as regras de negócio. E, com as duas separadas, basta pensar em uma coisa de cada vez. O segundo motivo é o que Martin Fowler aponta em [PresentationDomainDataLayering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html) como a maior vantagem dessa separação. Como dá para pensar nos três temas de forma relativamente isolada, o escopo que exige atenção diminui.

## Cinco estágios de crescimento de um app

Antes de entrar na refatoração, o autor mostra em cinco figuras como a estrutura muda conforme o app cresce. O que importa é o gatilho para passar ao estágio seguinte. Não é um momento predeterminado: o incômodo que surge em cada estágio é o que chama o próximo. As cores têm o mesmo significado nas cinco figuras. Verde-claro é o container component que tem state, verde-escuro é o presentational component que só desenha, roxo é hook, azul é domain object e laranja é infrastructure, como a rede.

No começo, um único component tem requisição de rede, state, cálculo e render. Para um app pequeno ou um projeto descartável isso basta, e como o código se parece com HTML, fica até mais fácil de ler. Quando o código que percorre uma lista para montar itens se mistura com o código que configura components externos e ler o que está acontecendo começa a tomar tempo, é hora do próximo estágio.

![Estrutura em que um único component tem requisição de rede, gerenciamento de state, domain logic e render, e chama a API diretamente](1.png?w=720)

Quando a tela cresce, os components são divididos seguindo o formato do HTML resultante. Os components que só desenham se separam, mas no component do topo continuam a requisição de rede, o código que transforma a resposta no formato da tela e o código que junta os dados a mandar para o servidor. Nenhum dos três é UI, e mesmo assim estão dentro do component.

![Estrutura em que os components que só desenham foram separados, mas a requisição de rede e a domain logic continuam no component de cima](2.png?w=720)

Em seguida, o state e suas mudanças vão para um custom hook. Aí sobra dentro do hook um cálculo puro, que não é side effect nem state.

![Estrutura em que a requisição de rede e a domain logic foram para o hook, mas continuam misturadas dentro dele](3.png?w=720)

Extraindo esse cálculo para um objeto que não tem nada a ver com React, nasce um domain object. Conversão de formato de dados, checagem de null e valores de fallback vêm para cá. Conforme os objetos se multiplicam, herança e polimorfismo começam a ser necessários.

![Estrutura em que só o state fica no hook, a domain logic vai para um objeto Domain e a requisição de rede vai para um Fetcher](4.png?w=720)

Por fim, quando aparecem objetos que não pertencem à UI e nem se importam se os dados vêm do servidor, do local storage ou de um cache, eles são agrupados à parte em uma model layer.

![Estrutura em que a faixa do meio é a model layer, com components e hooks acima e infrastructure como Fetcher e Adaptor abaixo](5.png?w=720)

Só pelas figuras, fica abstrato. Vamos percorrer esses cinco estágios uma vez com código de verdade. O exemplo escolhido pelo autor é a tela de pagamento de um pedido online.

## Partindo de uma única tela de pagamento

Os meios de pagamento vêm da configuração do servidor e variam por país. Se o servidor devolve pelo menos um, o pagamento em dinheiro é acrescentado no fim e deixado selecionado como padrão. Se não devolve nenhum, nada é exibido.

![Tela com radios de apple, google e pagamento em dinheiro na área de pagamento abaixo dos detalhes do pedido, com pagamento em dinheiro selecionado](6.png?w=600)

O código inicial tem a cara que se vê em todo tutorial. Faz fetch dentro do `useEffect`, transforma a resposta no formato da tela, acrescenta o pagamento em dinheiro e desenha a lista de radios. Abaixo está a versão que eu resumi.

```tsx
export const Payment = ({ amount }: { amount: number }) => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((methods: RemotePaymentMethod[]) => {
        if (methods.length === 0) return setPaymentMethods([]);
        const extended = methods.map((m) => ({ provider: m.name, label: `Pay with ${m.name}` }));
        extended.push({ provider: "cash", label: "Pay in cash" });
        setPaymentMethods(extended);
      });
  }, []);

  return (
    <div>
      {paymentMethods.map((method) => (
        <label key={method.provider}>
          <input type="radio" defaultChecked={method.provider === "cash"} />
          {method.label}
        </label>
      ))}
      <button>${amount}</button>
    </div>
  );
};
```

Nesse tamanho, não é problema. Mas para mexer nesse component é preciso entender quatro coisas ao mesmo tempo: como a requisição de rede começa, como os dados do servidor viram o formato que a tela conhece, como se desenha um meio de pagamento e como se desenha a área de pagamento inteira. Conforme o código cresce, quem lê precisa ficar indo e voltando entre essas quatro.

## Hooks e pure components

A primeira coisa a extrair é o state e o fetch. O sinal é simples. **Quando o código sem relação com render passa da metade do corpo do component**, ele vai para um hook. O `usePaymentMethods` cuida do fetch e da conversão, e o component só recebe o array que o hook entrega e desenha.

A segunda é o JSX que desenha a lista. **Quando aparece um bloco que dá para desenhar recebendo só props**, ele vira um component. `PaymentMethods` é um pure component que recebe apenas um array de meios de pagamento, então é fácil de testar e reutilizar. Mesmo que depois ganhe um callback `onSelect` para avisar da seleção, continua pure, porque não toca em state externo.

```tsx
const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<LocalPaymentMethod[]>([]);
  useEffect(() => { /* 위의 fetch와 변환 */ }, []);
  return { paymentMethods };
};

export const Payment = ({ amount }: { amount: number }) => {
  const { paymentMethods } = usePaymentMethods();
  return (
    <div>
      <PaymentMethods paymentMethods={paymentMethods} />
      <button>${amount}</button>
    </div>
  );
};
```

O autor chama as duas operações de [Extract Function](https://refactoring.com/catalog/extractFunction.html), do catálogo de refatorações. É que em React o component também é uma função. O ponto importante é que nenhum conceito novo foi introduzido: apenas uma função foi dividida em duas.

Parece que acabou, mas ainda restam dois lugares. Dentro da view há a decisão "se for dinheiro, vem selecionado por padrão", e dentro do hook há uma função anônima que transforma a resposta no formato da tela. O autor chama esse vazamento de regras de negócio para a view e o hook de logic leak.

## Regras reunidas em um domain object

O terceiro sinal é **quando as decisões sobre os mesmos dados estão espalhadas entre a view e o hook**. As decisões e conversões que vazaram são reunidas em uma única class `PaymentMethod`. É colocar a regra ao lado dos dados, como tratei em [modelo de domínio](/260418) aqui no blog.

```ts
class PaymentMethod {
  constructor(private remote: RemotePaymentMethod) {}
  get provider() { return this.remote.name; }
  get label() { return this.provider === "cash" ? "Pay in cash" : `Pay with ${this.provider}`; }
  get isDefaultMethod() { return this.provider === "cash"; }
}

const convertPaymentMethods = (methods: RemotePaymentMethod[]) =>
  methods.length === 0
    ? []
    : [...methods.map((m) => new PaymentMethod(m)), new PaymentMethod({ name: "cash" })];
```

O radio da view agora pergunta ao objeto com `defaultChecked={method.isDefaultMethod}`. O padrão de pagamento em dinheiro também é representado por uma instância da mesma class. Como o que veio do servidor e o que o app acrescentou passam a ter o mesmo formato, a view não precisa distinguir os dois.

![Estrutura em que Payment chama usePaymentMethods, o hook cria PaymentMethod e PaymentMethods só desenha](7.png?w=720)

O autor aponta como vantagem dessa estrutura que os testes ficam mais fáceis. O original para nessa frase, mas é mais rápido ver no código o quanto ficam mais fáceis. Abaixo estão testes que eu escrevi. Não há React, nem renderer, nem mock de fetch.

```ts
test("서버가 준 결제 수단 끝에 현금 결제를 기본값으로 붙인다", () => {
  const methods = convertPaymentMethods([{ name: "apple" }, { name: "google" }]);

  expect(methods.map((m) => m.label)).toEqual(["Pay with apple", "Pay with google", "Pay in cash"]);
  expect(methods.filter((m) => m.isDefaultMethod).map((m) => m.provider)).toEqual(["cash"]);
});

test("서버가 아무것도 주지 않으면 현금 결제도 보여 주지 않는다", () => {
  expect(convertPaymentMethods([])).toEqual([]);
});
```

Para verificar a mesma regra no código inicial, era preciso fazer render do component, interceptar o fetch e esperar os radios serem desenhados. No momento em que a regra sai para um objeto, o teste vira uma linha de chamada de função.

Outra vantagem é que, quando chega um requisito novo, já está definido para onde ele vai. A estrutura de arquivos neste ponto é esta.

```text
src
├── components
│   ├── Payment.tsx
│   └── PaymentMethods.tsx
├── hooks
│   └── usePaymentMethods.ts
└── models
    └── PaymentMethod.ts
```

Só dá para saber se a estrutura aguenta de verdade quando chega um requisito novo. Aqui o autor acrescenta mais uma funcionalidade.

## A funcionalidade de doação e o hook como state machine

O requisito novo é arredondar o valor do pedido para cima e permitir doar a diferença a uma instituição de caridade. Num pedido de 19,80 dólares, o app pergunta se o cliente quer doar 0,20 dólar e, se ele concordar, o botão mostra 20 dólares.

![Tela de pagamento com uma checkbox de doação de 0,2 dólar acrescentada abaixo dos meios de pagamento](8.png?w=600)

De propósito, o autor primeiro coloca o state de concordância e o cálculo dentro do component de pagamento. Com o markup da checkbox, a ramificação do texto e o cálculo do total entrando de uma vez, o component volta a ficar pesado. A ordem de limpeza é a mesma de antes. State e cálculo vão para o hook `useRoundUp`, a montagem do texto vai para uma função helper e o markup da checkbox vai para o component `DonationCheckbox`.

```ts
export const useRoundUp = (amount: number) => {
  const [agreeToDonate, setAgreeToDonate] = useState(false);

  const { total, tip } = useMemo(() => ({
    total: agreeToDonate ? Math.floor(amount + 1) : amount,
    tip: parseFloat((Math.floor(amount + 1) - amount).toPrecision(10)),
  }), [amount, agreeToDonate]);

  const updateAgreeToDonate = () => setAgreeToDonate((v) => !v);
  return { total, tip, agreeToDonate, updateAgreeToDonate };
};
```

O `toPrecision(10)` é um trecho cujo motivo o original não explica. Quando rodei no Node 24, `20 - 19.8` deu `0.1999999999999993`. É um mecanismo para eliminar o erro de ponto flutuante.

O autor vê esse tipo de hook como "a state machine por trás da view". Quando chega um evento da UI, ele cria um state novo, e o state novo dispara outro render. Os hooks foram criados originalmente para vários components compartilharem logic, mas a posição do autor é que, mesmo com um único lugar usando, vale extrair, porque deixa o component focado no render. Acrescento uma coisa: como aponta [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), da documentação oficial do React, o que um custom hook compartilha é a logic que lida com o state, não o state em si. Essa state machine nasce separadamente para cada component que chama o hook.

Terminada a limpeza, o component de pagamento chama dois hooks e enfileira dois subcomponents e um botão. Ganhou uma funcionalidade, e o papel do component de pagamento continua o mesmo.

![Estrutura com dois hooks, useRoundUp e usePaymentMethods, e dois subcomponents, PaymentMethods e DonationCheckbox, abaixo de Payment](9.png?w=720)

## Regras por país e shotgun surgery

O requisito seguinte é usar uma unidade de arredondamento diferente por país. No Japão, de 100 em 100 ienes. Na Dinamarca, de 10 em 10 coroas. O autor, dizendo que "parece uma correção fácil", mostra de propósito primeiro o caminho de receber o código do país como prop e enfiar ramificações.

```tsx
// useRoundUp 안
total: agreeToDonate
  ? countryCode === "JP" ? Math.floor(amount / 100 + 1) * 100 : Math.floor(amount + 1)
  : amount,

// 체크박스 문구 helper 안
const currencySign = countryCode === "JP" ? "¥" : "$";

// 버튼 JSX 안
<button>{countryCode === "JP" ? "¥" : "$"}{total}</button>
```

A mesma decisão `countryCode === "JP"` entrou em três lugares: no hook, no helper e no botão. Acrescentando a Dinamarca, é preciso mexer de novo nos três, e quando o operador ternário não dá mais conta, surge uma tabela que busca o símbolo da moeda pelo código do país. Essa tabela, no fim, também acaba sendo consultada separadamente em vários lugares. Esse cheiro, em que uma única mudança obriga a mexer em vários módulos ao mesmo tempo, se chama shotgun surgery.

![Figura com barras coloridas, que representam as regras por país, espalhadas por vários components, hooks e domain objects](10.png?w=720)

O que diferencia este estágio dos três anteriores é que o sinal não vem do código, e sim de um **pedido de mudança**. Olhando só o código atual, três ramificações não são difíceis de ler. O problema só aparece quando você conta quantos lugares precisa alterar para acrescentar mais um país. Então, para onde levar as ramificações espalhadas?

## Diferenças por país reunidas em um Strategy

A resposta do autor é transformar a própria diferença entre países em um objeto. Primeiro, com [Extract Class](https://refactoring.com/catalog/extractClass.html) e [Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html), ele cria uma interface e uma implementação por país.

```ts
interface PaymentStrategy {
  getRoundUpAmount(amount: number): number;
  getTip(amount: number): number;
}

class PaymentStrategyAU implements PaymentStrategy { /* 1달러 단위 */ }
class PaymentStrategyJP implements PaymentStrategy { /* 100엔 단위 */ }
```

Depois de criadas, o que muda de uma implementação para outra são só duas coisas, o símbolo da moeda e a função de arredondamento, e o resto, como `getTip`, é idêntico. Por isso o autor junta as implementações em uma única class com [Inline Class](https://refactoring.com/catalog/inlineClass.html) e recebe só as partes diferentes pelo construtor. Dá para receber o algoritmo de arredondamento como função, sem criar uma subclass por país, porque em JavaScript funções são valores. Abaixo está o resultado, que eu resumi.

```ts
class CountryPayment {
  constructor(readonly currencySign: string, private roundUp: (n: number) => number) {}
  getRoundUpAmount(n: number) { return this.roundUp(n); }
  getTip(n: number) { return parseFloat((this.getRoundUpAmount(n) - n).toPrecision(10)); }
}

const japan = new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100);
japan.getRoundUpAmount(3312); // 3400
japan.getTip(3312);           // 88
```

Hooks e components agora não sabem nada de país. Eles recebem esse único objeto e só usam `strategy.getRoundUpAmount(amount)` e `strategy.currencySign`. Para acrescentar um país, basta criar mais um objeto, e nenhum arquivo precisa ser alterado.

![Estrutura em que o component olha apenas para um PaymentStrategy, com três implementações por país reunidas atrás dele](11.png?w=720)

Passar por uma interface e depois juntar tudo de novo pode parecer um desvio desnecessário. Para mim, este é o trecho mais instrutivo do original. O polimorfismo não era o objetivo, e sim uma ferramenta para expor semelhanças e diferenças. Assim que ficou claro que a diferença se reduzia a uma função, a hierarquia de classes foi removida. Mais difícil do que introduzir um padrão é decidir quando removê-lo.

## Tirando o fetch do hook

A última coisa a extrair é o fetch e a conversão dentro de `usePaymentMethods`. Hook é um conceito do React, então fica do lado da view. Colocando error handling e retry, o hook incha rápido, e se você migrar para outra view library, o hook não serve. Uma função comum, por outro lado, funciona em qualquer lugar.

```ts
const fetchPaymentMethods = async () => {
  const response = await fetch(`${API}/payment-methods?countryCode=AU`);
  return convertPaymentMethods(await response.json());
};

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  useEffect(() => {
    fetchPaymentMethods().then(setPaymentMethods);
  }, []);
  return { paymentMethods };
};
```

O autor escreve que essa função funciona como uma Anti-Corruption Layer ou um Gateway. Ou seja, mesmo que a estrutura da resposta do servidor mude, o lugar a corrigir fica restrito a essa função. Só que os dois nomes não são a mesma coisa. O [Gateway](https://martinfowler.com/articles/gateway-pattern.html) de Fowler é um objeto que encapsula num só lugar o acesso a um sistema externo, enquanto Anti-Corruption Layer é um termo do DDD de Eric Evans: uma fronteira que traduz um modelo externo, com outro sistema de significados, para que ele não contamine o seu modelo. A resposta do servidor neste exemplo é só `{ name }`, então quase não há diferença de significado a traduzir, e por isso eu acho que Gateway é o nome mais preciso. Quando o servidor é um legado de outro time e o próprio significado de meio de pagamento é diferente, esse mesmo lugar vira uma Anti-Corruption Layer.

A estrutura final é esta. O render está no component, o state no hook, as regras no domain object e a requisição de rede em uma função.

![Estrutura final com Payment e seus subcomponents, os hooks useRoundUp e usePaymentMethods, os domain objects PaymentStrategy e PaymentMethod e o Fetcher, cada um em seu compartimento](12.png?w=720)

O autor aponta cinco vantagens resultantes dessa divisão. Fica mais fácil achar onde está um defeito. Fica mais fácil reutilizar e combinar código. Fica mais fácil de ler. Acrescentar funcionalidades não abala o todo. E, como a domain logic não conhece a view, dá para trocar só a view layer. Sobre esta última, o próprio autor faz a ressalva de que, na maioria dos projetos, isso é muito raro. Também vale lembrar que nenhuma das cinco vem acompanhada de medições.

Até aqui é o enredo do original. Só que, rodando esse código de verdade, aparece o que não se via no texto.

## O que aparece quando você roda o exemplo

Baixei o repositório de exemplo do autor (16 commits, último commit `de186c5`) e rodei `tsc --noEmit` e os 7 testes. Os dois passaram, e o helper cuja definição faltava no original também estava no `src/utils.ts` do repositório. Mas olhando a estrutura, havia três coisas que é preciso saber antes de copiá-la.

### Um Strategy criado de novo a cada render

O component de pagamento recebe o Strategy como prop e, se ninguém passa, cria o valor padrão com `new`. E o `useRoundUp` coloca esse Strategy na dependency do `useMemo`.

```tsx
export const Payment = ({
  amount,
  strategy = new PaymentStrategy("$", roundUpToNearestInteger),
}: { amount: number; strategy?: PaymentStrategy }) => {
  const { total, tip } = useRoundUp(amount, strategy); // 안에서 [agreeToDonate, amount, strategy]
  // ...
};
```

Os default parameters do JavaScript [são avaliados a cada chamada](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters). E o `useMemo` compara as dependencies com `Object.is`. Quando os dois se encontram, nasce uma instância nova a cada render e o memo recalcula toda vez. Fazendo render da mesma estrutura quatro vezes no React 18, o cálculo rodou 4 vezes usando o valor padrão e 1 vez passando a mesma instância. O `App.tsx` do repositório não passa Strategy (`<Payment amount={19.9} />`), então o caminho de execução do app é exatamente o do valor padrão.

O cálculo deste exemplo são algumas somas, então não há custo. O problema é a estrutura. Nem o texto nem o repositório definem quem cria o Strategy e onde, e só os testes criam instâncias do Japão e da Dinamarca. No meu lugar, eu deixaria as instâncias como constantes no nível do module e as passaria buscando pelo código do país.

```ts
const strategies = {
  AU: new CountryPayment("$", (n) => Math.floor(n + 1)),
  JP: new CountryPayment("¥", (n) => Math.floor(n / 100 + 1) * 100),
} as const;

<Payment amount={amount} strategy={strategies[countryCode]} />
```

### O fetch do repositório não tem dependency array

O `useEffect` do código no original tem `[]`, mas o `usePaymentMethods` do repositório não tem dependency array do primeiro ao último commit. Um effect sem array roda de novo a cada render. Quando a resposta chega, o state é trocado por um array novo, isso dispara um render e o effect faz fetch de novo. Como `convertPaymentMethods` devolve um array novo toda vez, isso não para.

Trocando o fetch por um mock que responde na hora e contando as chamadas por 300ms no Jest, medi quatro vezes e obtive 152, 225, 231 e 233 chamadas. Com `[]`, é 1. Os testes do repositório só verificam se o texto aparece na tela, então não pegam essa repetição e passam todos. Quem digitou o código acompanhando o original não tem esse problema. Ele só aparece quando você baixa e usa o repositório como está.

### A race que surge quando o código do país vira prop

O fetch effect do código original também não tem cleanup. [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), da documentação oficial do React, diz que, ao fazer fetch dentro de um effect, uma resposta anterior que chega atrasada pode sobrescrever a mais recente, então é preciso descartar a resposta anterior com uma flag `ignore`. O original faz fetch só uma vez, no mount, então por enquanto não há problema. Mas no momento em que o `countryCode=AU` da URL passa a vir de uma prop, surge uma dependency e a race se abre. Ao copiar essa estrutura, eu escreveria assim desde o começo.

```ts
useEffect(() => {
  let ignore = false;
  fetchPaymentMethods(countryCode).then((methods) => {
    if (!ignore) setPaymentMethods(methods);
  });
  return () => { ignore = true; };
}, [countryCode]);
```

Mais uma coisa: o arredondamento do original é `Math.floor(amount + 1)`, então, se o valor já é inteiro, ele sobe mais 1. Um pedido de 20 dólares vira 21. O original só dá como exemplos 19,80 dólares e 3312 ienes, então não dá para saber se isso é intencional. Se for levar isso para um serviço real, a primeira coisa a decidir é em que isso difere de `Math.ceil`.

## Quando usar essa estrutura

O próprio autor diz que dividir não é uma regra fixa. Components pequenos e coesos são mais fáceis de entender quando ficam em um único arquivo, e o que se deve evitar é um arquivo crescer a ponto de ficar incompreensível. Ele afirma que, num app de Todo ou num app de um único formulário, tudo bem colocar tudo no component, e que o exemplo foi complicado de propósito para mostrar muitos padrões. Outros materiais fazem ressalvas na mesma direção.

No mesmo texto sobre layering, Fowler diz para usar essa separação apenas em unidades relativamente pequenas. Ter view, model e data como pastas de nível superior tudo bem em sistemas pequenos, mas, se alguma delas crescer demais, o nível superior deve ser dividido por domínio e, dentro dele, por layer. Levar as pastas `components/`, `hooks/` e `models/` vistas acima como estão para a estrutura de nível superior de um app grande resulta justamente no formato que Fowler manda evitar.

Dan Abramov tem uma trajetória parecida. Em 2015, ele propôs dividir em [presentational e container components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0) e, em 2019, colocou no topo do texto uma atualização dizendo que não recomenda mais dividir assim. O motivo era que os Hooks fazem a mesma coisa sem uma divisão arbitrária, e ele acrescentou que tinha visto essa divisão ser imposta de forma dogmática, sem necessidade, vezes demais. A extração de hooks do original se aproxima do jeito que essa atualização descreve. Não existe um component separado chamado container: o `Payment`, que chama o hook, acumula esse papel.

Sobre fetch, a documentação oficial do React vai um passo além. [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) diz que extrair a fetch logic para um custom hook facilita migrar depois para uma estratégia melhor, mas recomenda em primeiro lugar o fetching embutido do framework ou um client cache como o TanStack Query. Se você extrai o fetch para uma função comum, como no último estágio do original, dá para passar essa função como está para o `queryFn` do TanStack Query, e a race e as chamadas repetidas da seção anterior ficam por conta da library. Para mim, esse é o ganho mais prático, que o original menciona em uma única frase. Como amarrar chaves e funções eu tratei à parte em [queryKey](/260104).

Resumindo, minha avaliação é esta. A ordem do original (hook, pure component, domain object, Strategy, network client) vale ser seguida como está, porque em cada estágio o incômodo daquele estágio vira o motivo do seguinte. Mas não é preciso ir até o fim: basta ver de qual estágio é o incômodo que você sente agora e parar ali. Se há muito código sem relação com render, vá até o hook. Se a mesma decisão está espalhada, até o domain object. Se uma única mudança faz você mexer em vários arquivos, até o Strategy. E, se for usar Strategy, defina primeiro onde as instâncias são criadas. Se for deixar o fetch em um effect, escreva antes de tudo o cleanup e as dependencies. Essas duas coisas que o original omitiu foram os primeiros lugares a quebrar quando o código foi copiado de verdade.

Não existe resposta certa, mas espero que você, que está lendo, pare um momento para ver de qual estágio é o incômodo que o seu código está sentindo agora.

:::ref
- [docs] [Microsoft Azure Architecture Center, padrão Anti-corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
- [article] [Juntao Qiu, Headless Component](https://martinfowler.com/articles/headless-component.html)
- [article] [Juntao Qiu, Data Fetching Patterns in Single-Page Applications](https://martinfowler.com/articles/data-fetch-spa.html)
:::
