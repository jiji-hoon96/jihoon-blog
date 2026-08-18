---
emoji: 🧩
title: "Modelo de domínio"
seoTitle: "Guia de modelagem de domínio no frontend — aplicando DDD"
date: "2026-04-18"
categories: 프론트엔드 아키텍처 DDD
description: "Uma visão dos conceitos de domínio, modelo de domínio e objeto de domínio sob a perspectiva do frontend, incluindo Entity, Value Object, modelo de domínio anêmico e separação de ViewModel. Veja, com um exemplo do domínio do imposto de renda global, como separar a lógica de domínio no React na prática."
keywords: "modelo de domínio no frontend, design orientado a domínio, DDD no frontend, Frontend DDD, objeto de domínio, Entity Value Object, Anemic Domain Model, modelo de domínio anêmico, Clean Architecture no frontend, Eric Evans, Martin Fowler, separação da lógica de domínio, padrões de design React, arquitetura frontend, separação de ViewModel, Bounded Context"
locale: pt-BR
translationOf: '260418'
sourceHash: a1d3e0f7ef15a579dbf42aa51384cdd5203c46ecd7905a9859da49208df8e961
---

Neste post, quero falar sobre **domínio (Domain)**.

Ao longo da minha experiência com desenvolvimento, encontrei a palavra **"domínio (Domain)"** com bastante frequência. Mas, quando alguém pergunta "afinal, o que exatamente é um domínio?", não é tão fácil dar uma resposta clara. (Sinceramente, quando comecei a programar, achava que domínio significava www.)

Ao procurar informações sobre domínio, naturalmente chegamos a conceitos como **modelo de domínio**, **objeto de domínio** e **modelo de objetos de domínio**. Sempre senti falta, porém, de textos que organizassem tanto as diferenças entre eles quanto o significado desses conceitos no **frontend**, e não no backend. Neste texto, começarei pelas definições de cada conceito e, com exemplos, mostrarei como separar e abstrair a lógica de domínio no frontend de forma adequada.

Ultimamente, tenho me interessado bastante pelo domínio tributário. Como a declaração do imposto de renda global se aproxima em maio, os exemplos deste texto tratarão de impostos.

---


## Domínio (Domain)

Comecemos pela pergunta mais básica. O que é um **domínio**?

Eric Evans define domínio da seguinte forma em seu livro **Domain-Driven Design: Tackling Complexity in the Heart of Software (2003)**.

::::quote
:::translation
Uma esfera de conhecimento, influência ou atividade.
:::

:::original
"A sphere of knowledge, influence, or activity."
:::
::::

Em termos simples, domínio é a própria **área do problema que se pretende resolver por meio da programação**. Se estamos criando um serviço de declaração de impostos, "declaração de impostos" é o domínio; se estamos criando uma plataforma de sinistros de seguros, "sinistros de seguros" é o domínio. O domínio não é código. É uma área de problemas do mundo real que existe antes do software.

O que isso significa para quem desenvolve frontend? A UI que criamos é, no fim das contas, uma **janela (window)** que permite apresentar esse domínio ao usuário e possibilitar sua manipulação. Se desenvolvemos serviços de restituição de impostos como Toss Income ou 3o3, cujo domínio principal é tributário, estamos representando na UI conceitos do domínio como tipo de renda, coeficiente de despesas, dedução da renda, crédito tributário e valor da restituição. Portanto, quem desenvolve frontend também precisa compreender profundamente o domínio com que trabalha. Isso significa que entender **"qual problema este serviço resolve"** é tão importante quanto construir bons componentes de UI.

Mas até um único domínio como "impostos" contém inúmeros subdomínios quando examinado por dentro. Basta olhar para o pipeline de cálculo do imposto de renda global, que conheço apenas superficialmente.

![1.png](1.png)

Cada etapa desse pipeline é um subdomínio com regras e dados próprios. Dentro do grande domínio de "impostos", entrelaçam-se os subdomínios de renda (Income), deduções (Deduction), imposto (Tax) e declaração (Filing). Como dividi-los no código é justamente a questão central da modelagem de domínio.


## Modelo de domínio (Domain Model)

Então, o que é um modelo de domínio? Qual é a diferença entre domínio e "modelo de domínio"?

Martin Fowler e Eric Evans definem modelo de domínio da seguinte maneira.

::::quote
:::translation
Um modelo de objetos do domínio que incorpora tanto comportamento quanto dados. — Martin Fowler
:::

:::original
An object model of the domain that incorporates both behavior and data.
:::
::::

::::quote
:::translation
Um sistema de abstrações que descreve aspectos selecionados de um domínio e pode ser usado para resolver problemas relacionados a esse domínio. — Eric Evans
:::

:::original
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain.
:::
::::

O ponto central é a **"abstração seletiva"**. Um modelo de domínio não contém tudo o que existe no mundo real. Assim como um diretor de cinema não registra todas as cenas da realidade, mas escolhe apenas as necessárias para contar a história, o modelo de domínio também **seleciona e estrutura apenas os aspectos necessários para resolver o problema**.

Há um ponto importante aqui. Um modelo de domínio não precisa necessariamente ser código. Pode ser um diagrama desenhado em um quadro branco ou um modelo mental (Mental Model) compartilhado entre os integrantes da equipe. Em última análise, o próprio termo modelo de domínio pode designar um conceito independente do software.

Há uma parte que costuma confundir especialmente quem desenvolve frontend: olhar para a estrutura de uma resposta de API e pensar "este é o modelo de domínio". Mas isso é um **modelo de dados (Data Model)**, não um modelo de domínio.

Podemos distinguir modelo de dados e modelo de domínio da seguinte forma.

| Critério          | Modelo de domínio                                      | Modelo de dados                                  |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Objetivo          | Expressar conceitos e regras de negócio                | Definir a estrutura de armazenamento/transmissão |
| Linguagem         | Termos de negócio (base tributável, crédito, restituição) | Termos técnicos (string, number, array)        |
| Elementos         | Dados + comportamento (regras)                         | Apenas a estrutura dos dados                     |
| Exemplo           | "A faixa de até 14 milhões de won tem alíquota de 6%" | `{ taxableBase: number, taxRate: number }`        |

O modelo de dados define "em que formato os dados circulam", enquanto **o modelo de domínio define "o que esses dados significam para o negócio e quais regras seguem".** Quando não distinguimos os dois, os componentes passam a depender diretamente da estrutura da resposta da API, e qualquer mudança no schema do backend acaba abalando todo o frontend.


## Objeto de domínio (Domain Object)

Se o modelo de domínio é um sistema de conceitos, o **objeto de domínio** é a concretização desse conceito em código.

Em um [texto de Jason Swett](https://www.codewithjason.com/difference-domains-domain-models-object-models-domain-objects/), responsável pelo Code with Jason, o objeto de domínio é definido assim.

::::quote
:::translation
Eu chamaria de objeto de domínio qualquer objeto do meu modelo de objetos que também exista como conceito no meu modelo de domínio.
:::

:::original
Any object in my object model that also exist as a concept in my domain model I would call a domain object.
:::
::::

Ou seja, se existe o conceito de "renda global" no modelo de domínio e um tipo chamado `Income` no código, esse `Income` é um objeto de domínio. Mas nem todo objeto no código é um objeto de domínio. Elementos como `HttpClient`, `LocalStorageAdapter` e `useDebounce` são ferramentas técnicas, não conceitos do domínio.


### Entity e Value Object

Evans classifica os objetos de domínio em três categorias: **Entity**, **Value Object** e **Service**. (Martin Fowler chama essa divisão de "Evans Classification".) Service é um conceito separado que representa "uma operação de domínio que não pertence naturalmente a um objeto específico". Como o foco deste texto é a forma de identificar os dados, examinaremos principalmente Entity e Value Object.

Uma **Entity** é um objeto com identidade própria que persiste ao longo do tempo e entre diferentes representações. Uma declaração de impostos (TaxFiling), um contribuinte (Taxpayer) e um registro de renda (IncomeRecord) são identificados por um ID próprio; mesmo que seus atributos mudem, continuam sendo a mesma Entity se o ID for o mesmo. Ainda que os itens de dedução de uma declaração sejam alterados, ela continua sendo a mesma declaração enquanto seu ID não mudar.

Um **Value Object** é um objeto cujo significado decorre apenas da combinação de seus atributos; quando todos os atributos têm os mesmos valores, os objetos são considerados iguais. Dinheiro (Money), alíquota (TaxRate) e faixa tributária (TaxBracket) são objetos em que o próprio valor carrega o significado. Uma "alíquota de 6%" é simplesmente uma "alíquota de 6%", onde quer que seja usada.

Por que essa distinção é importante no frontend? Vejamos o exemplo de código abaixo.

```typescript
interface TaxFiling {
  id: string;
  taxpayerName: string;
  taxYear: number;
  status: FilingStatus;
}

const isSameFiling = (a: TaxFiling, b: TaxFiling) => a.id === b.id;

interface Money {
  amount: number;
  currency: "KRW" | "USD";
}

const isSameMoney = (a: Money, b: Money) =>
  a.amount === b.amount && a.currency === b.currency;
```

TaxFiling é uma Entity porque usa o id como critério de identidade. (O simples fato de ter um campo id não define uma Entity; o ponto central é que "esse id determina se é o mesmo objeto ou outro".) Money é identificado apenas pela combinação de amount e currency, sem id, e é considerado o mesmo valor quando todos os seus atributos são iguais.

Entity é comparada por ID; Value Object, por atributos. Quando essa distinção está clara, a lógica de gerenciamento de estado que decide "se estes dados são iguais ou diferentes" se organiza naturalmente. Ao atualizar um item de uma lista, por exemplo, localizamos e substituímos uma Entity pelo ID, enquanto um Value Object é substituído de forma imutável (immutable replace).


## Modelo de objetos de domínio (Domain Object Model)

Já entendemos "modelo de domínio" e "objeto de domínio", mas o que é um **modelo de objetos de domínio**?

Ao pesquisar, descobri que, surpreendentemente, não há uma definição consensual. Grande parte da literatura trata "modelo de domínio", "modelo de objetos de domínio", "modelo conceitual (conceptual model)" e "modelo de objetos de análise (analysis object model)" como **praticamente sinônimos**. Segundo essa visão, são apenas nomes diferentes para o modelo conceitual elaborado durante a análise orientada a objetos.

Há, por outro lado, quem os veja como camadas um pouco mais separadas. Uma explicação representativa é que o **modelo de objetos é justamente o ponto em que o modelo de domínio é transformado em código real**.

Nessa segunda perspectiva, o **modelo de objetos** é a estrutura de **todos os objetos de código** do sistema. Isso inclui ferramentas técnicas como `HttpClient` e `useDebounce`. Dentro dele, o **subconjunto dos objetos que representam conceitos do domínio e as relações entre eles** constitui o **modelo de objetos de domínio**. Essa visão também se alinha à tradição da modelagem orientada a objetos, que define "Object Model" como a estrutura estática de um sistema (classes, atributos, operações e relações).

Considero essa perspectiva mais prática para quem desenvolve frontend. Afinal, no código que escrevemos, objetos de domínio e objetos técnicos estão sempre misturados.

No fim, **domínio → modelo de domínio → modelo de objetos de domínio → objeto de domínio** forma uma hierarquia que vai do abstrato ao concreto. O domínio é o mais amplo, e o objeto de domínio é o mais concreto. Por isso, ao escrever código frontend, a questão prática com que realmente lidamos é **como estruturar o modelo de objetos de domínio — os tipos que representam conceitos do domínio e as relações entre eles**.


## Onde a lógica de domínio deve ficar no frontend?

Encerradas as definições, passemos à prática. **Onde** a lógica de domínio deve ficar no frontend?

[Khalil Stemmler](https://khalilstemmler.com/about/), que se interessa profundamente por design de software, primeiro defendeu que "a lógica de negócio não pertence ao frontend". Mais tarde, reviu sua posição e afirmou: "Podemos e devemos fazer no frontend quase tudo o que fazemos arquiteturalmente no backend."

Concordo com essa posição. É claro que o frontend não deve ser a **fonte única da verdade (Single Source of Truth)** da lógica de negócio. Esse é o papel do backend. Mas também existe, sem dúvida, **lógica de domínio própria do frontend**.

Pense no caso em que "é preciso mostrar em tempo real a restituição estimada com base nas informações inseridas pelo usuário". Se essa lógica de cálculo existir apenas no backend, será necessário chamar a API toda vez que o usuário corrigir um único caractere no valor da renda. A UI ficará parada durante o tempo de ida e volta pela rede e, se o usuário digitar rápido, o volume de solicitações desnecessárias crescerá de forma explosiva. Mesmo com debounce, um atraso de algumas centenas de milissegundos já é suficiente para comprometer a experiência de uma "prévia em tempo real". **No fim, cálculos que exigem feedback imediato precisam ser executados diretamente pelo frontend, e passam a existir lógicas que só podem ser executadas nele.**


### Quando a lógica de domínio se mistura ao componente

Tomemos como exemplo uma tela de prévia do imposto de renda global. Nela, quando o usuário informa seus rendimentos, o imposto estimado é exibido em tempo real. Abaixo está um código comum em que a lógica de domínio e a lógica de UI estão misturadas.

```tsx
function TaxPreviewPage() {
  const [총수입, set총수입] = useState(0);
  const [경비율, set경비율] = useState(0.641); 
  const [인적공제대상인원, set인적공제대상인원] = useState(1); 

  const 종합소득금액 = 총수입 - 총수입 * 경비율;

  const 소득공제합계 = 인적공제대상인원 * 1_500_000;
  const 과세표준 = Math.max(0, 종합소득금액 - 소득공제합계);

  let calculatedTax = 0;
  if (과세표준 <= 14_000_000) {
    calculatedTax = 과세표준 * 0.06;
  } else if (과세표준 <= 50_000_000) {
    calculatedTax = 과세표준 * 0.15 - 1_260_000;
  } else if (과세표준 <= 88_000_000) {
    calculatedTax = 과세표준 * 0.24 - 5_760_000;
  } else if (과세표준 <= 150_000_000) {
    calculatedTax = 과세표준 * 0.35 - 15_440_000;
  } else {
    calculatedTax = 과세표준 * 0.38 - 19_940_000;
  }

  const 기납부세액 = 총수입 * 0.033;
  const refundOrPayment = 기납부세액 - calculatedTax;

  return <div>...</div>;
}
```

Você consegue ver o problema desse código? **Regras de negócio definidas pela legislação tributária**, como "dedução pessoal de 1,5 milhão de won por pessoa", "alíquota progressiva em oito faixas" e "retenção na fonte de 3,3%", estão inseridas diretamente no componente React. A legislação tributária muda todos os anos; se essas regras estiverem espalhadas pelos componentes, será preciso caçar todos os lugares que devem ser corrigidos a cada revisão. E, se houver cenários E2E mantidos não só por quem desenvolve, mas também pela equipe de QA, o custo dos testes também não será pequeno.

Com isso, fica difícil distinguir lógica de View e lógica de negócio, e tudo acaba emaranhado em inúmeras condicionais e hooks customizados.


### Vamos separar a lógica de domínio

Tomemos emprestado o princípio central da abordagem de Clean Architecture de Alex Bespoyasov: separar a lógica de domínio em **funções puras que não dependem de framework**.

::::quote
:::translation
O domínio é o núcleo que distingue uma aplicação de outra. Podemos pensar no domínio como algo que não mudaria se migrássemos do React para o Angular.
:::

:::original
The domain is the core that distinguishes one application from another. You can think of the domain as something that won't change if we move from React to Angular.
:::
::::

Vamos refatorar o exemplo de cálculo de impostos acima.

Primeiro, definimos os tipos e as regras do domínio para manter as informações relacionadas coesas.

```typescript
export interface Income {
  grossAmount: number;
  expenseRate: number;
}

export interface Deductions {
  personalCount: number;
  pensionPaid: number;
  additionalDeductions: number;
}

const PERSONAL_DEDUCTION_PER_PERSON = 1_500_000;
const WITHHOLDING_RATE = 0.033;
const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, progressiveDeduction: 0 },
  /** ...구간들... **/
] as const;
```

Depois, separamos a lógica de domínio em funções puras.

Separamos na função `computeFullTax` as lógicas de cálculo de renda, deduções, base tributável, imposto e restituição mencionadas anteriormente. Cada etapa volta a ser dividida em pequenas funções puras. Se o tipo do resultado for inferido com `ReturnType<typeof computeFullTax>`, não será necessário declarar uma interface separada.

Depois disso, o componente apenas "usa" a lógica de domínio.

```tsx
import { computeFullTax } from "../domain/tax";

function TaxPreviewPage() {
  const [income, setIncome] = useState<Income>({
    grossAmount: 0,
    expenseRate: 0.641,
  });
  const [deductions, setDeductions] = useState<Deductions>({
    personalCount: 1,
    pensionPaid: 0,
    additionalDeductions: 0,
  });

  const result = computeFullTax(income, deductions);

  return (
    <div>
      <IncomeForm value={income} onChange={setIncome} />
      <DeductionForm value={deductions} onChange={setDeductions} />
      <TaxResultSummary result={result} />
    </div>
  );
}
```

O que mudou?

- A **tabela das oito faixas progressivas** (`TAX_BRACKETS`) está reunida em um só lugar; quando a legislação mudar, basta alterar `domain/tax.ts`.
- O **pipeline de cálculo** está coeso em uma única função, `computeFullTax`, permitindo visualizar o fluxo completo de uma vez. (Agrupamos tudo para manter o exemplo simples, mas, em um projeto real, convém subdividir ainda mais por finalidade, como cálculo de renda, cálculo de deduções e apuração do imposto.)
- O **componente se concentra apenas em "como exibir"**. Mesmo que a alíquota mude, não é preciso alterar o componente.
- Mesmo que haja uma migração do React para outro framework, `domain/tax.ts` **não muda**.

Quando a lógica de domínio é separada, os testes se tornam surpreendentemente simples. Isso é especialmente importante no domínio tributário, pois **a precisão dos cálculos é o próprio dinheiro do usuário**.

Funções puras que contêm cálculos tributários não precisam de React Testing Library, `render` nem `screen.getByText`. Basta fornecer a entrada e verificar a saída. Casos como "alíquota de 6% até 14 milhões de won", "imposto igual a zero quando a base tributável é zero" e "restituição sobre uma renda de 30 milhões de won de um profissional autônomo" podem ser expressos em um `it` de uma única linha. Os testes unitários do domínio estabelecem naturalmente os critérios de separação dos componentes, e o código de teste ainda funciona como documentação.


## Modelo de domínio anêmico (Anemic Domain Model)

Na seção anterior, separamos a **lógica de cálculo**. Mas a lógica de domínio também inclui **regras de transição de estado** e **decisões de permissão**. Perguntas como "é possível editar esta declaração agora?", "ela pode ser enviada?" e "é possível mudar o tipo de solicitação?" fazem parte disso. Ao separar essas regras, é fácil cair em uma armadilha que Martin Fowler chamou de **modelo de domínio anêmico (Anemic Domain Model)**.

Um modelo de domínio anêmico é uma situação em que **os tipos estão bem definidos na linguagem do domínio, mas as regras que operam sobre eles ficam espalhadas para fora do domínio**. Vejamos o domínio de declaração de impostos (Filing). Os tipos estão bem organizados.

```typescript
// types/filing.ts
export interface TaxFiling {
  id: string;
  status: "draft" | "submitted" | "reviewing" | "completed" | "amended";
  taxYear: number;
  filingType: "regular" | "late" | "amendment";
  determinedTax: number;
}
```

Mas as regras de decisão e transição desse tipo estão inseridas em outros lugares.

```typescript
// utils/filingHelpers.ts
export function canAmendFiling(filing: TaxFiling) {
  return filing.status === "completed" && filing.filingType !== "amendment";
}

// components/FilingDetail.tsx
function FilingDetail({ filing }: { filing: TaxFiling }) {
  // 같은 도메인 규칙을 컴포넌트 안에 다시 작성한다
  const canEdit = filing.status === "draft" || filing.status === "reviewing";
  // ...
}

// hooks/useSubmitFiling.ts
export function handleSubmitFiling(filing: TaxFiling) {
  if (filing.status !== "draft") return;
  // ...
}
```

A mesma regra de domínio existe em três lugares — utils, componente e hook —, cada um com uma forma diferente. Se surgir um requisito dizendo "as condições para solicitação serão alteradas", será necessário procurar todos os pontos que precisam mudar; qualquer um que for esquecido passará a tomar uma decisão incorreta em algum lugar do site. Fowler criticou esse tipo de código afirmando que **"ele não difere de código procedural revestido apenas com uma aparência orientada a objetos"**.

A solução é a mesma aplicada à lógica de cálculo na seção anterior: **colocar as regras ao lado do tipo**.

```typescript
export interface TaxFiling {
  id: string;
  status: FilingStatus;
  taxYear: number;
  filingType: FilingType;
  determinedTax: number;
}

export type FilingStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "completed"
  | "amended";

export type FilingType = "regular" | "late" | "amendment";

// 도메인 규칙은 도메인 옆에 둔다
export function canEdit(filing: TaxFiling): boolean {
  return filing.status === "draft";
}

export function canSubmit(filing: TaxFiling): boolean {
  return filing.status === "draft" && filing.determinedTax >= 0;
}

export function canAmend(filing: TaxFiling): boolean {
  return filing.status === "completed" && filing.filingType !== "amendment";
}
```

Agora, as regras relacionadas às declarações são gerenciadas em um único lugar: `domain/filing.ts`. Qualquer componente pode chamar `canAmend(filing)`, e, se a regra mudar, basta alterar esse arquivo. O ponto central é **entender o tipo e as regras que operam sobre ele como um único conjunto**. Uma separação parcial que coloca apenas o tipo na pasta de domínio e envia as regras para utils pode parecer organizada por fora, mas continua anêmica.


## Camada de transformação entre a resposta da API e o modelo de domínio

Há mais um ponto a considerar no trabalho real: a estrutura da resposta da API do backend nem sempre coincide com o modelo de domínio do frontend. Isso é ainda mais verdadeiro em um serviço tributário integrado a órgãos governamentais. Os dados de integração do Hometax, o serviço da Receita Nacional da Coreia, estão cheios de abreviações e códigos; dificilmente chegarão no mesmo formato do modelo de domínio do frontend.

É aí que entra uma **camada de transformação (Mapper)**. Em vez de deixar o tipo da resposta da API fluir diretamente até o componente, primeiro o refinamos para o tipo do domínio e só então o utilizamos. Uma única função pura é suficiente.

```typescript
import type { Income } from "../domain/tax";

interface HometaxIncomeResponse {
  총수입금액: number;
  경비율: number;
  소득유형코드: string;
  // ... 나머지 약어 필드들
}

export function toIncome(response: HometaxIncomeResponse): Income {
  return {
    총수입_금액: response.총수입금액,
    경비_비율: response.경비율,
  };
}
```

Assim, abreviações como `총수입금액` e `경비율` e classificações baseadas em códigos da resposta da API são transformadas **em um só lugar** para se adequar ao domínio do frontend. Valores como o código do tipo de renda, que precisam ser convertidos para enum, podem ser tratados com uma pequena lookup table dentro do mapper. Mesmo que o nome de um campo da API do Hometax mude, basta alterar um único mapper.


## Funções utilitárias e lógica de domínio

Ao separar a lógica de domínio, surge inevitavelmente uma pergunta: **"isto não é uma função utilitária?"**

Observe as duas funções abaixo.

```typescript
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find((bracket) => taxableBase <= bracket.limit);
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}
```

`formatCurrency` é uma lógica pura de **apresentação (Presentation)** que transforma um número em string. Acrescentar a unidade "won" e separar milhares por vírgulas não é uma regra de negócio, mas uma questão de como apresentar o valor ao usuário. Já `calculateTax` contém uma **regra de negócio baseada na legislação tributária**: a aplicação de oito faixas progressivas. É uma regra do domínio que precisa continuar igual mesmo sem UI.

Este é o critério que uso no trabalho:

> **Se essa lógica desaparecer, o negócio quebra ou apenas a tela quebra?**

Se o negócio quebra, é lógica de domínio; se apenas a tela quebra, é lógica de apresentação. Essa única pergunta permite distinguir a maioria das fronteiras.

| Critério                               | Lógica de domínio                              | Lógica utilitária/de apresentação       |
| -------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| O que quebra se ela não existir?       | O cálculo do imposto fica incorreto            | A tela (UI) fica estranha               |
| E se o framework mudar?                | Permanece igual                                | Pode mudar                              |
| Está especificada nos requisitos?      | "base tributável × alíquota - dedução progressiva" | "valores separados por vírgulas"  |
| Existe a mesma lógica no backend?       | Existe ou deveria existir                      | Não (é uma preocupação só do frontend)  |

Mas a realidade não é tão bem delimitada. O caso mais difícil é quando **algo parece lógica de domínio, mas na verdade é lógica de apresentação**.

Observe o código abaixo. Como recebe o conceito de domínio FilingStatus como argumento, ele foi classificado como lógica de domínio. Mas será que realmente é?

```typescript
// domain/filing.ts
function getStatusBadgeColor(status: FilingStatus): string {
  const colors: Record<FilingStatus, string> = {
    draft: "gray",
    submitted: "blue",
    reviewing: "yellow",
    completed: "green",
    amended: "purple",
  };
  return colors[status];
}

function getStatusDisplayText(status: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    draft: "작성 중",
    submitted: "제출 완료",
    reviewing: "검토 중",
    completed: "신고 완료",
    amended: "경정청구",
  };
  return labels[status];
}
```

Embora `getStatusBadgeColor` e `getStatusDisplayText` usem o conceito de domínio `FilingStatus`, o que fazem é **apresentação de tela**. Se a cor do badge mudar, o negócio não quebra de forma alguma. Colocar essas funções em `domain/filing.ts` faz o módulo de domínio crescer cada vez mais e mistura a verdadeira lógica de domínio com a lógica de apresentação.


### Separando o modelo de domínio e o ViewModel

Há uma maneira prática de resolver esse problema: **separar o ViewModel em outro arquivo dentro da mesma pasta de domínio**. Em vez de `.ui.ts`, usar o nome `.viewModel.ts` cria uma conexão natural com o conceito de ViewModel do padrão MVVM. O próprio nome deixa evidente o papel de "camada que transforma os dados do domínio para a tela".

```
domains/
└── filing/
    ├── filing.ts              # 순수 도메인 모델 + 도메인 로직
    ├── filing.viewModel.ts    # ViewModel (표현 변환 계층)
    ├── filing.test.ts         # 도메인 로직 테스트
    └── filingMapper.ts        # API ↔ 도메인 변환
```

Movemos `getStatusBadgeColor` e `getStatusDisplayText`, vistos anteriormente, diretamente para `filing.viewModel.ts`. Outras transformações, como `getFilingTypeLabel(type: FilingType): string`, que convertem o tipo de declaração em um rótulo em coreano, também ficam reunidas ali. `filing.ts` fica responsável apenas pelas regras de negócio; `filing.viewModel.ts`, apenas pela apresentação na tela.

O ponto central é a **direção das dependências**. `filing.viewModel.ts` importa `filing.ts`, mas `filing.ts` jamais importa `filing.viewModel.ts`. O domínio não conhece a apresentação; a apresentação conhece o domínio. Isso pode ser visto como uma versão em miniatura da regra de dependência (Dependency Rule) de Robert C. Martin.

Coloquei esses arquivos na mesma pasta porque acredito que arquivos que mudam juntos devem ficar no mesmo diretório. Se o tipo `FilingStatus` receber um novo valor (por exemplo, `'rejected'`), tanto `filing.ts` quanto `filing.viewModel.ts` precisarão ser alterados. Como estão na mesma pasta, o escopo da mudança fica visível de imediato.


## Fronteiras e coesão

Tão importante quanto separar a lógica de domínio é decidir **onde traçar as fronteiras**. A seguir, organizo alguns problemas de delimitação que encontro com frequência no trabalho.

Os dados tratados no frontend vêm, aproximadamente, de quatro fontes.

- **Dados do servidor**: recebidos como resposta da API
- **Dados derivados**: calculados a partir dos dados do servidor
- **Estado da UI**: usado para controlar a tela e as interações do usuário
- **Entrada do usuário**: dados que estão sendo preenchidos em um formulário

Misturar esses quatro tipos em um único tipo contamina o modelo de domínio.

```typescript
// 안티패턴: 모든 것이 섞인 타입
interface TaxFiling {
  // 서버 데이터 (도메인)
  id: string;
  status: FilingStatus;
  determinedTax: number;

  // 파생 데이터 (도메인)
  refundAmount: number;
  canAmend: boolean;

  // UI 상태 (표현)
  isExpanded: boolean;
  activeStep: number;

  // 임시 상태
  editingDeductions: Deduction[];
}
```

Nesse tipo, conceitos do domínio, estado da UI e dados temporários estão todos no mesmo recipiente. Sempre que `activeStep` muda, é como se o domínio da declaração fosse atualizado. (A mudança de etapa de um formulário não é um evento de negócio.)

A solução é separar os tipos de acordo com suas fronteiras. O **modelo de domínio** contém apenas conceitos de negócio, como `id`, `status` e `determinedTax`; o **estado da UI** (`FilingFormViewState`) contém apenas controles da tela, como `isExpanded` e `activeStep`; e o **estado do formulário** (`DeductionEditForm`) contém apenas os dados temporários que estão sendo preenchidos.

Assim, cada tipo passa a ter **um único motivo para mudar**. O tipo de domínio só muda quando a legislação tributária muda; o estado da UI, apenas quando o design da tela muda; e o estado do formulário, apenas quando a UX de entrada muda.


### Mantenha junto o que muda junto

No DDD de Eric Evans, existe o conceito de **Aggregate (agregado)**: "tratar um cluster de objetos relacionados como uma única unidade". Não é necessário aplicar esse conceito literalmente no frontend, mas vale tomar emprestado seu princípio central: **dados e regras que mudam juntos devem ficar juntos.**

Em um serviço tributário, por exemplo, `Income` (renda) e `ExpenseRate` (coeficiente de despesas) sempre mudam juntos. Quando o tipo de renda muda, o coeficiente de despesas aplicável também muda, o que afeta o cálculo da renda global. Portanto, eles devem ficar coesos em um único arquivo, `domain/tax.ts`.

Já `TaxFiling` (declaração) pode mudar independentemente do cálculo do imposto. Mesmo que as regras de transição de estado da declaração mudem, a lógica de cálculo das alíquotas não é afetada. Portanto, o correto é separá-la em `domain/filing.ts`.

```
이렇게 묻자: "A가 변할 때 B도 반드시 변해야 하는가?"
  → Yes: 같은 모듈에 둔다 (Income + ExpenseRate + TaxBracket)
  → No: 분리한다 (Tax 계산 ↔ Filing 상태관리)
```


## Class vs estilo funcional

Depois de chegar até aqui, pode surgir uma pergunta fundamental. Todos os exemplos até agora usaram a combinação de `interface` com funções puras; a coesão não seria mais natural se representássemos o domínio com Class?

Sim. Quando representamos o domínio com Class, dados e comportamento ficam reunidos em um único objeto, e a coesão aparece diretamente na estrutura do código.

```typescript
class TaxFilingModel {
  constructor(
    public readonly id: string,
    public readonly status: FilingStatus,
    public readonly taxYear: number,
    public readonly filingType: FilingType,
    public readonly determinedTax: number,
  ) {}

  canEdit(): boolean {
    return this.status === "draft";
  }

  canAmend(): boolean {
    return this.status === "completed" && this.filingType !== "amendment";
  }

  canSubmit(): boolean {
    return this.status === "draft" && this.determinedTax >= 0;
  }
}

const filing = new TaxFilingModel(
  "F-001",
  "completed",
  2025,
  "regular",
  547200,
);

filing.canAmend();
```

Quando usamos Class, o comportamento pertence aos dados. E o sujeito fica claro no ponto de uso. `filing.canAmend()` é intuitivo como a leitura de uma frase em linguagem natural. O sujeito (filing) e o verbo (canAmend) estão claramente combinados. É como escrever `jihoon.eat('감자탕')`: dá para ler imediatamente que "Jihoon come gamjatang".

No estilo funcional, por outro lado, fica assim.

```typescript
canAmend(filing);
eat("jihoon", "감자탕");
```

No estilo funcional, os dados existem do lado de fora. Os dois códigos acima recebem os dados `filing` como argumento e executam uma operação. A função `eat` recebe os dados `jihoon` e `감자탕` como argumentos e é executada.

Com isso, a ligação entre sujeito e verbo fica mais frouxa. Para saber que a função `canAmend` está relacionada a `TaxFiling`, é necessário abrir o arquivo ou conferir a assinatura do tipo. Se funções como `canAmend(filing)`, `canEdit(filing)` e `calculateTax(taxableBase)` estiverem misturadas no mesmo arquivo, pode ficar difícil perceber de imediato a qual domínio cada função pertence.


### Então devemos usar Class?

Sinceramente, a resposta é **"depende da situação"**. Mas, segundo minha experiência, há motivos práticos para Class não ser uma solução universal em ambientes React + TypeScript.

**1. Atrito com o gerenciamento de estado do React**

O gerenciamento de estado do React combina de forma mais natural com **Plain Object**. Tecnicamente, `useState` e `useReducer` podem conter qualquer valor, e o Redux DevTools não remove por si só o protótipo de uma instância de Class. Porém, quando o middleware de persistência de Redux/Zustand salva e restaura o estado como JSON, uma instância de Class perde seus métodos e seu protótipo no ciclo de `JSON.stringify` → `JSON.parse` e se degrada em plain object. A fronteira de props entre React Server Component e Client Component tem outra restrição: aceita apenas valores serializáveis (serializable) compatíveis, portanto uma instância arbitrária de Class não pode atravessá-la.

Observe o código abaixo.

```typescript
const [filing, setFiling] = useState(
  new TaxFilingModel("F-001", "draft", 2025, "regular", 0),
);
```

Atualizar o estado do React, por si só, não faz `filing` deixar de ser uma instância de `TaxFilingModel`. Porém, se a persistência de Redux/Zustand o salvar e restaurar como JSON, o valor recuperado pode ser um plain object sem métodos, e uma chamada desatenta a `filing.canAmend()` pode provocar um erro em runtime. Ao transmiti-lo de React Server Component para Client Component, a falha acontece antes, porque uma instância de Class não é um valor serializável de props compatível.

**2. Dificuldade de garantir imutabilidade**

O React detecta mudanças de estado com base em **igualdade referencial (referential equality)**. Se um método de uma instância de Class fizer uma mutação interna como `this.items.push(...)`, a referência permanecerá a mesma e o React não disparará uma nova renderização. Por isso, no fim, é preciso escrever `addDeduction(item)` de modo que retorne uma nova instância toda vez, como em `return new DeductionList([...this.items, item])`; isso esvazia a vantagem da Class de oferecer uma "mudança de estado encapsulada". O código deixa de ser muito diferente de uma atualização funcional.


### Estratégias para obter coesão no estilo funcional

Então, como melhorar no estilo funcional o problema da coesão frouxa visto em `eat('jihoon', '감자탕')`? Apresento três métodos que considero eficazes.

**1. Obter coesão com namespace de módulo**

É o método mais intuitivo. Transformamos o próprio arquivo (módulo) em uma unidade de domínio e usamos um namespace na importação. Basta usar diretamente o `domain/filing.ts` que definimos anteriormente.

```typescript
import * as FilingModel from "../domain/filing";

FilingModel.canEdit(filing);
FilingModel.canAmend(filing);
FilingModel.canSubmit(filing);
```

`FilingModel.canAmend(filing)` não é tão conciso quanto `filing.canAmend()`, mas ao menos torna evidente no próprio código que a função pertence ao domínio de Filing. Também elimina o risco de misturar funções de vários domínios.

**2. Padronizar o primeiro argumento como sujeito do domínio**

Há outra convenção para expressar coesão no estilo funcional: **o primeiro argumento é sempre o "sujeito da ação"**. Ao padronizar as assinaturas como `canAmend(filing)` e `calculateTotalIncome(income)`, `canAmend(filing)` passa a ser lido como "perguntar canAmend sobre filing". Isso também se alinha à mentalidade de pipeline do Unix (`data |> transform`). Na verdade, o receiver de método da linguagem Go segue exatamente esse padrão, e, em um bloco `impl` do Rust, receber `self` como primeiro argumento parte da mesma ideia.

**3. Agrupar comportamentos em uma função de criação de objeto de domínio (Factory)**

Esse padrão pode ser usado quando sentimos falta da coesão de uma Class. Uma função Factory retorna de uma só vez o objeto de domínio e seus comportamentos.

```typescript
export function createFilingModel(data: TaxFiling) {
  return {
    ...data,
    canEdit: () => data.status === "draft",
    canSubmit: () => data.status === "draft" && data.determinedTax >= 0,
    canAmend: () =>
      data.status === "completed" && data.filingType !== "amendment",
  } as const;
}

const filing = createFilingModel(rawFiling);
filing.canAmend();
filing.canEdit();
```

Esse padrão reúne a expressividade da Class (`filing.canAmend()`) e a praticidade de compor comportamentos com um objeto literal. Como o objeto retornado contém propriedades que são funções, ele não é, por si só, um dado serializável em JSON. Também há o custo de criar novos objetos de função a cada vez, mas isso raramente se torna um problema de desempenho no volume de dados tratado pelo frontend.


## Até que ponto devemos separar?

Ao ler sobre Clean Architecture, encontramos uma estrutura ideal que divide três ou quatro camadas e define Port/Adapter. Mas aplicar essa estrutura a todos os projetos pode se tornar engenharia excessiva (over-engineering).

Estes são os critérios práticos que considero adequados.

- **Separe o tipo do domínio do tipo da resposta da API.** Seja com `interface` ou `type`, defina em um arquivo separado os conceitos do domínio usados pelo frontend.
- **Retire do componente toda lógica que contenha regras de negócio.** Ela não precisa estar em uma pasta `domain/`. O importante é transformá-la em uma função pura que não dependa do React.
- **Faça a transformação resposta da API → modelo de domínio em um único lugar.** Pode ser uma função Mapper ou um schema Zod; crie uma estrutura em que a mudança não se propague, pois basta alterar esse único ponto.

Se o projeto se tornar mais complexo, também vale considerar as situações abaixo.

- **Divida as pastas por Bounded Context.** O [capítulo de frontend da Toss](https://frontend-fundamentals.com/) também enfatiza o princípio de "colocar no mesmo diretório os arquivos que mudam juntos". Quando as pastas são divididas por domínio, os caminhos de import revelam naturalmente as fronteiras do domínio.
- **Introduza uma camada de Use Case.** Quando a composição da lógica de domínio se torna complexa, passa a ser necessária uma camada Application que reúna em uma única função um cenário como "consultar informações de renda → aplicar o coeficiente de despesas → calcular os itens de dedução → apurar o imposto → confirmar a restituição".

```
src/
├── domains/
│   ├── tax/
│   │   ├── tax.ts                  # 세액 계산 도메인 (세율, 공제, 계산 파이프라인)
│   │   ├── tax.viewModel.ts        # 세액 표현 (금액 포맷, 구간 라벨)
│   │   ├── tax.test.ts             # 세액 계산 테스트
│   │   └── incomeMapper.ts         # 홈택스 API ↔ 도메인 변환
│   ├── filing/
│   │   ├── filing.ts               # 신고 상태 도메인 (상태 전이, 권한)
│   │   ├── filing.viewModel.ts     # 신고 표현 (상태 배지, 라벨)
│   │   ├── filing.test.ts
│   │   └── filingMapper.ts
│   └── deduction/
│       ├── deduction.ts            # 공제 항목 도메인 (자격 조건, 한도)
│       └── deduction.viewModel.ts
├── hooks/                           # React 의존 로직
├── components/                      # UI 컴포넌트
└── api/                             # API 호출
```

Mesmo dentro de um único domínio tributário, **cálculo de imposto (tax)**, **gestão de declarações (filing)** e **itens de dedução (deduction)** são separados como subdomínios independentes. Uma mudança nas alíquotas não afeta a lógica de transição de estado das declarações; a adição de um item de dedução não altera o fluxo de envio da declaração. Essa é uma aplicação prática de Bounded Context.


## Conclusão

Em resumo, **domínio** é a área do problema que queremos resolver; **modelo de domínio** é o sistema conceitual que abstrai seletivamente esse problema; **modelo de objetos de domínio** é a implementação desse sistema conceitual em código; e **objeto de domínio** é cada objeto individual dentro dessa implementação.

Colocar esses conceitos em prática no frontend não significa simplesmente dividir pastas, mas **avaliar conscientemente várias camadas de fronteiras**. "Isto é regra de negócio ou lógica de apresentação?" "Estes dados são estado do domínio ou estado da UI?" "Esta função tem coesão suficiente?" Só o hábito de fazer essas perguntas já melhora naturalmente a estrutura do código.

É claro que nem todo projeto precisa de todas as camadas da Clean Architecture. Dividir um aplicativo CRUD simples em quatro camadas e aplicar o padrão Factory a todos os domínios pode criar mais estrutura do que valor. Entre a coesão elegante da Class e a flexibilidade prática do estilo funcional, a resposta correta depende da complexidade do projeto e do contexto da equipe.

Não existe uma resposta única. Mas há uma diferença clara entre **"escrever código sem saber o que é o domínio"** e **"reconhecer o domínio, avaliar suas fronteiras e separá-lo de forma consciente"**. Espero que este texto também incentive você a perguntar, ao menos uma vez, em seu próprio projeto: "qual é o domínio aqui, e onde este código deveria ficar?"


### Referências

:::ref
- [article] [Eric Evans, Domain-Driven Design (Book)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [article] [Robert C. Martin, Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [article] [Khalil Stemmler, Does DDD Belong on the Frontend?](https://khalilstemmler.com/articles/typescript-domain-driven-design/ddd-frontend/)
- [article] [Alex Bespoyasov, Clean Architecture on Frontend](https://bespoyasov.me/blog/clean-architecture-on-frontend/)
- [article] [토스, E2E 자동화 여정](https://toss.tech/article/income-qa-e2e-automation)
:::
