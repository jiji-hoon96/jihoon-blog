---
emoji: 🧩
title: "Modelo de dominio"
seoTitle: "Guía para diseñar modelos de dominio en frontend — Aplicación de DDD"
date: "2026-04-18"
categories: 프론트엔드 아키텍처 DDD
description: "Una explicación, desde la perspectiva del frontend, de los conceptos de dominio, modelo de dominio y objeto de dominio, que también aborda Entity y Value Object, el modelo de dominio anémico y la separación del ViewModel. Veamos cómo separar en React la lógica de dominio con un ejemplo práctico del impuesto sobre la renta global."
keywords: "modelo de dominio en frontend, diseño guiado por el dominio, DDD en frontend, Frontend DDD, objeto de dominio, Entity Value Object, Anemic Domain Model, modelo de dominio anémico, Clean Architecture en frontend, Eric Evans, Martin Fowler, separación de lógica de dominio, patrones de diseño en React, arquitectura frontend, separación del ViewModel, Bounded Context"
locale: es
translationOf: '260418'
sourceHash: a1d3e0f7ef15a579dbf42aa51384cdd5203c46ecd7905a9859da49208df8e961
---

En este artículo quiero hablar del **dominio (Domain)**.

Durante mi trayectoria como desarrollador me he encontrado con bastante frecuencia la palabra **«dominio (Domain)»**. Sin embargo, cuando alguien pregunta «¿qué es exactamente un dominio?», no resulta fácil dar una respuesta clara. (Sinceramente, cuando empecé a programar, pensaba que dominio se refería a www).

Al buscar información sobre el dominio, uno llega de forma natural a conceptos como **modelo de dominio**, **objeto de dominio** y **modelo de objetos de dominio**. Siempre he echado en falta artículos que expliquen bien en qué se diferencian y qué significan estos conceptos en el **frontend**, no en el backend. En este artículo partiré de la definición de cada concepto y explicaré con ejemplos cómo conviene separar y abstraer la lógica de dominio en el frontend.

Últimamente me interesa mucho el dominio fiscal. Como se acerca mayo, mes de la declaración del impuesto sobre la renta global en Corea, usaré los impuestos como ejemplo en este artículo.

---


## Dominio (Domain)

Empecemos por la pregunta más básica. ¿Qué es un **dominio**?

Eric Evans lo define así en su libro **Domain-Driven Design: Tackling Complexity in the Heart of Software (2003)**.

::::quote
:::translation
Una esfera de conocimiento, influencia o actividad.
:::

:::original
"A sphere of knowledge, influence, or activity."
:::
::::

Dicho de forma sencilla, el dominio es la propia **área problemática que se quiere resolver mediante programación**. Si creamos un servicio para presentar declaraciones de impuestos, el dominio es la «declaración de impuestos»; si creamos una plataforma de reclamaciones de seguros, el dominio es la «reclamación de seguros». El dominio no es código. Es un área problemática del mundo real que existe antes que el software.

¿Qué significa esto para quien desarrolla frontend? La UI que construimos es, al fin y al cabo, una **ventana (window)** que permite mostrar este dominio al usuario y manipularlo. Si desarrollamos un servicio de devolución de impuestos como Toss Income o Samjjeomsam, cuyo dominio principal son los impuestos, representamos en la UI conceptos de dominio como los tipos de ingresos, el coeficiente de gastos, las deducciones sobre la renta, los créditos fiscales y el importe de la devolución. Por eso, quien desarrolla frontend también debe comprender a fondo el dominio con el que trabaja. Tan importante como crear buenos componentes de UI es saber **«qué problema resuelve este servicio»**.

Pero incluso dentro de un único dominio como el de los «impuestos» existen numerosos subdominios. Basta con observar el flujo de cálculo del impuesto sobre la renta global que conozco a grandes rasgos.

![1.png](1.png)

Cada etapa de este flujo constituye un subdominio con reglas y datos propios. Dentro del gran dominio de los «impuestos» se entrelazan subdominios como ingresos (Income), deducciones (Deduction), cuota tributaria (Tax) y declaración (Filing). Cómo dividirlos en el código es precisamente la cuestión central del modelado de dominio.


## Modelo de dominio (Domain Model)

Entonces, ¿qué es un modelo de dominio? ¿En qué se diferencia el dominio del «modelo de dominio»?

Martin Fowler y Eric Evans definen el modelo de dominio de la siguiente manera.

::::quote
:::translation
Un modelo de objetos del dominio que incorpora tanto comportamiento como datos. — Martin Fowler
:::

:::original
An object model of the domain that incorporates both behavior and data.
:::
::::

::::quote
:::translation
Un sistema de abstracciones que describe determinados aspectos de un dominio y que puede utilizarse para resolver problemas relacionados con ese dominio. — Eric Evans
:::

:::original
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain.
:::
::::

La clave está en la **«abstracción selectiva»**. Un modelo de dominio no contiene todo lo que existe en el mundo real. Del mismo modo que un director de cine no registra cada escena de la realidad, sino que elige solo las necesarias para contar una historia, el modelo de dominio **selecciona y estructura únicamente los aspectos necesarios para resolver el problema**.

Hay aquí un punto importante: un modelo de dominio no tiene por qué ser código. Puede ser un diagrama dibujado en una pizarra o incluso un modelo mental (Mental Model) compartido por el equipo. En definitiva, el propio término modelo de dominio puede referirse a un concepto independiente del software.

Hay una confusión especialmente frecuente entre quienes desarrollan frontend: ver la estructura de una respuesta de API y pensar «este es el modelo de dominio». Sin embargo, eso es un **modelo de datos (Data Model)**, no un modelo de dominio.

Podemos distinguirlos así.

| Categoría          | Modelo de dominio                                      | Modelo de datos                                      |
| ------------------ | ------------------------------------------------------ | ---------------------------------------------------- |
| Propósito          | Expresar conceptos y reglas de negocio                 | Definir estructuras de almacenamiento o transmisión |
| Lenguaje           | Términos de negocio (base imponible, crédito fiscal, devolución) | Términos técnicos (string, number, array)    |
| Elementos incluidos | Datos + comportamiento (reglas)                       | Solo estructura de datos                             |
| Ejemplo            | «A una base imponible de hasta 14 millones de wones se le aplica un 6 %» | `{ taxableBase: number, taxRate: number }` |

El modelo de datos define «qué forma tienen los datos que se intercambian», mientras que **el modelo de dominio define «qué significan esos datos para el negocio y qué reglas siguen»**. Si no se distingue entre ambos, los componentes pasan a depender directamente de la estructura de las respuestas de la API y cualquier cambio en el esquema del backend acaba afectando a todo el frontend.


## Objeto de dominio (Domain Object)

Si el modelo de dominio es un sistema de conceptos, el **objeto de dominio** es la entidad concreta que implementa uno de esos conceptos en el código.

En [un artículo de Jason Swett](https://www.codewithjason.com/difference-domains-domain-models-object-models-domain-objects/), creador de Code with Jason, se define así el objeto de dominio.

::::quote
:::translation
Llamaría objeto de dominio a cualquier objeto de mi modelo de objetos que también exista como concepto en mi modelo de dominio.
:::

:::original
Any object in my object model that also exist as a concept in my domain model I would call a domain object.
:::
::::

Es decir, si en el modelo de dominio existe el concepto de «renta global» y en el código hay un tipo llamado `Income`, ese `Income` es un objeto de dominio. Pero no todos los objetos del código son objetos de dominio. Elementos como `HttpClient`, `LocalStorageAdapter` o `useDebounce` son herramientas técnicas, no conceptos de dominio.


### Entity y Value Object

Evans clasifica los objetos de dominio en tres categorías: **Entity**, **Value Object** y **Service**. (Martin Fowler denomina esta clasificación «Evans Classification»). Un Service representa una operación de dominio que no pertenece de forma natural a un objeto concreto. Como el tema central de este artículo es cómo identificar los datos, nos centraremos en Entity y Value Object.

Una **Entity** es un objeto con una identidad única que persiste a lo largo del tiempo y de sus distintas representaciones. Una declaración de impuestos (TaxFiling), un contribuyente (Taxpayer) o un registro de ingresos (IncomeRecord) se identifican mediante un ID único; aunque cambien sus atributos, si conservan el mismo ID siguen siendo la misma Entity. Aunque se modifiquen las deducciones de una declaración, mientras no cambie su ID, seguirá siendo la misma declaración.

Un **Value Object** es un objeto cuyo significado depende únicamente de la combinación de sus atributos y se considera igual a otro si todos sus valores coinciden. El dinero (Money), un tipo impositivo (TaxRate) o un tramo impositivo (TaxBracket) son objetos cuyo propio valor constituye su significado. Un «tipo impositivo del 6 %» es el mismo «tipo impositivo del 6 %» dondequiera que se utilice.

¿Por qué es importante esta distinción en frontend? Veámoslo con el siguiente ejemplo.

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

TaxFiling es una Entity porque toma el id como criterio de identidad. (Tener un campo id no define por sí solo una Entity; lo esencial es que «ese id permite decidir si dos elementos son iguales o distintos»). Money se identifica únicamente por la combinación de amount y currency, sin id, y se considera el mismo valor cuando coinciden todos sus atributos.

Las Entity se comparan por ID y los Value Object, por atributos. Si esta distinción está clara, la lógica para decidir «si estos datos son iguales o distintos» en la gestión del estado se ordena de forma natural. Al actualizar un elemento de una lista, una Entity se busca por ID y se reemplaza, mientras que un Value Object se sustituye de forma inmutable (immutable replace).


## Modelo de objetos de dominio (Domain Object Model)

Ya sabemos qué son un «modelo de dominio» y un «objeto de dominio», pero ¿qué es un **modelo de objetos de dominio**?

Al investigar el tema, descubrí que, sorprendentemente, no existe una definición consensuada. Buena parte de la bibliografía considera «modelo de dominio», «modelo de objetos de dominio», «modelo conceptual (conceptual model)» y «modelo de objetos de análisis (analysis object model)» como **sinónimos en la práctica**: distintos nombres para el modelo conceptual que se dibuja durante la fase de análisis orientado a objetos.

También hay quien los considera capas algo más separadas. Una explicación representativa de esta visión sostiene que **el modelo de objetos es el punto en el que el modelo de dominio se transforma en código real**.

Desde esta segunda perspectiva, el **modelo de objetos** es la estructura de **todos los objetos de código** del sistema. Incluye también herramientas técnicas como `HttpClient` y `useDebounce`. Dentro de él, el **subconjunto de objetos que representan conceptos de dominio y las relaciones entre ellos** constituye el **modelo de objetos de dominio**. Esta idea enlaza con la tradición del modelado orientado a objetos, que ha definido el «Object Model» como la estructura estática de un sistema —clases, atributos, operaciones y relaciones—.

Considero que esta perspectiva resulta más práctica para quien desarrolla frontend, porque en el código que escribimos los objetos de dominio y los objetos técnicos siempre aparecen mezclados.

En definitiva, **dominio → modelo de dominio → modelo de objetos de dominio → objeto de dominio** es una jerarquía que va de lo abstracto a lo concreto. El dominio es el concepto más amplio y el objeto de dominio, el más concreto. Por eso, al escribir código frontend, la cuestión que realmente debemos resolver es **cómo estructurar el modelo de objetos de dominio, es decir, los tipos que representan los conceptos de dominio y las relaciones entre ellos**.


## ¿Dónde debe estar la lógica de dominio en el frontend?

Terminadas las definiciones, pasemos a la práctica. ¿**Dónde** debe estar la lógica de dominio en el frontend?

[Khalil Stemmler](https://khalilstemmler.com/about/), muy interesado en el diseño de software, sostuvo al principio que «la lógica de negocio no pertenece al frontend», pero más adelante revisó su postura y afirmó que «casi todo lo que hacemos arquitectónicamente en el backend también podemos y debemos hacerlo en el frontend».

Estoy de acuerdo. Por supuesto, el frontend no debe convertirse en la **única fuente de verdad (Single Source of Truth)** de la lógica de negocio. Ese es el papel del backend. Pero en el frontend también existe, sin duda, **lógica de dominio propia del frontend**.

Pensemos en un caso en el que «hay que mostrar en tiempo real la devolución estimada en función de la información introducida por el usuario». Si esta lógica de cálculo solo existe en el backend, habría que llamar a la API cada vez que el usuario corrigiese un solo dígito del importe de sus ingresos. La UI se detendría durante todo el viaje de ida y vuelta por la red y, si el usuario escribe rápido, se dispararía una cantidad enorme de peticiones innecesarias. Incluso con debounce, un retraso de varios cientos de milisegundos basta para romper la experiencia de una «vista previa en tiempo real». **En última instancia, el frontend no tiene más remedio que realizar directamente los cálculos que requieren una respuesta inmediata, por lo que existe lógica que solo puede ejecutarse en el frontend.**


### Cuando la lógica de dominio se mezcla con el componente

Tomemos como ejemplo una pantalla de vista previa del impuesto sobre la renta global. Cuando el usuario introduce la información sobre sus ingresos, se muestra en tiempo real la cuota estimada. Este es un ejemplo habitual de código en el que se mezclan la lógica de dominio y la lógica de UI.

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

¿Se aprecia el problema? Las **reglas de negocio fijadas por la legislación fiscal** —«deducción personal de 1,5 millones de wones por persona», «ocho tramos impositivos progresivos» y «retención del 3,3 %»— están incrustadas directamente en un componente de React. La legislación fiscal cambia cada año; si estas reglas están dispersas por los componentes, cada reforma obliga a buscar todos los lugares que hay que modificar. Si además existen escenarios E2E gestionados por el equipo de QA, el coste de las pruebas tampoco será menor.

Al final, resulta difícil distinguir la lógica de vista de la lógica de negocio, y el código acaba enredado entre innumerables condicionales y hooks personalizados.


### Separemos la lógica de dominio

Tomemos prestado un principio central del enfoque de Clean Architecture de Alex Bespoyasov: separar la lógica de dominio en **funciones puras que no dependan de ningún framework**.

::::quote
:::translation
El dominio es el núcleo que distingue una aplicación de otra. Puede entenderse como aquello que no cambiaría si migrásemos de React a Angular.
:::

:::original
The domain is the core that distinguishes one application from another. You can think of the domain as something that won't change if we move from React to Angular.
:::
::::

Refactoricemos el ejemplo anterior del cálculo de impuestos.

Primero definimos los tipos y las reglas del dominio para cohesionar la información relacionada.

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

A continuación, separamos la lógica de dominio en funciones puras.

Separamos en la función `computeFullTax` la lógica anterior para calcular los ingresos, las deducciones, la base imponible, la cuota y la devolución. A su vez, dividimos cada etapa en pequeñas funciones puras. Si inferimos el tipo del resultado con `ReturnType<typeof computeFullTax>`, no hace falta declarar otra interfaz.

Después, el componente se limita a «usar» la lógica de dominio.

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

¿Qué ha cambiado?

- La **tabla de ocho tramos impositivos progresivos** (`TAX_BRACKETS`) está reunida en un único lugar, por lo que, cuando cambie la legislación fiscal, solo habrá que modificar `domain/tax.ts`.
- El **flujo de cálculo** está cohesionado en una sola función, `computeFullTax`, lo que permite ver de un vistazo el proceso completo. (Se ha agrupado para simplificar el ejemplo, pero en un proyecto real conviene dividirlo más según su propósito: cálculo de ingresos, cálculo de deducciones, cálculo de la cuota, etc.).
- El **componente se concentra únicamente en «cómo mostrarlo»**. Aunque cambien los tipos impositivos, no hace falta modificar el componente.
- Aunque se migre de React a otro framework, `domain/tax.ts` **no cambia**.

Cuando se separa la lógica de dominio, las pruebas se vuelven sorprendentemente sencillas. Esto es especialmente importante en el dominio fiscal, donde **la precisión de los cálculos es, literalmente, el dinero del usuario**.

Las funciones puras que contienen cálculos fiscales no necesitan React Testing Library, ni `render`, ni `screen.getByText`. Basta con proporcionar una entrada y comprobar la salida. Casos como «tipo del 6 % hasta 14 millones de wones», «si la base imponible es 0 wones, la cuota también es 0» o «devolución para un autónomo con 30 millones de wones de ingresos» pueden expresarse con un `it` de una sola línea. Las pruebas unitarias del dominio establecen de forma natural el criterio para separar componentes y, además, el código de prueba actúa como documentación.


## Modelo de dominio anémico (Anemic Domain Model)

En el apartado anterior separamos la **lógica de cálculo**. Sin embargo, la lógica de dominio también incluye **reglas de transición de estado** y **comprobaciones de permisos**. Preguntas como «¿se puede editar ahora esta declaración?», «¿se puede presentar?» o «¿se puede cambiar el tipo de reclamación?» pertenecen a esta categoría. Al separar estas reglas es fácil caer en una trampa que Martin Fowler denominó **modelo de dominio anémico (Anemic Domain Model)**.

Un modelo de dominio anémico es aquel en el que **los tipos están bien definidos en el lenguaje del dominio, pero las reglas que operan sobre ellos se han dispersado fuera del dominio**. Veamos como ejemplo el dominio de una declaración de impuestos (Filing). El tipo está limpio.

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

Pero las reglas para decidir y realizar transiciones sobre este tipo están incrustadas en otros lugares.

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

La misma regla de dominio existe con formas distintas en tres lugares: utils, un componente y un hook. Si en este estado llega un requisito como «cambian las condiciones para presentar una reclamación», habrá que recorrer el código en busca de todos los lugares que deben modificarse, y cualquier omisión provocará una decisión incorrecta en alguna parte del sitio. Fowler criticó este tipo de código por ser **«poco más que código procedimental revestido con una apariencia orientada a objetos»**.

La solución es la misma que aplicamos a la lógica de cálculo en el apartado anterior: **poner las reglas junto al tipo**.

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

Ahora las reglas relacionadas con las declaraciones se gestionan en un único lugar, `domain/filing.ts`. Cualquier componente puede llamar a `canAmend(filing)` y, si cambia una regla, basta con modificar este archivo. La clave es **entender el tipo y las reglas que operan sobre él como una sola unidad**. Dejar solo el tipo en la carpeta del dominio y extraer las reglas a utils es una separación parcial que puede parecer limpia, pero sigue siendo anémica.


## Capa de transformación entre la respuesta de la API y el modelo de dominio

En un proyecto real hay que tener en cuenta otra cuestión: la estructura de las respuestas de la API del backend no siempre coincide con el modelo de dominio del frontend. Esto es aún más cierto en un servicio fiscal conectado con organismos públicos. Los datos de integración con Hometax, el portal de la Agencia Tributaria Nacional de Corea, están llenos de abreviaturas y códigos, por lo que es poco probable que lleguen con la misma forma que el modelo de dominio del frontend.

Para eso necesitamos una **capa de transformación (Mapper)**. En lugar de llevar el tipo de la respuesta de la API directamente hasta el componente, primero lo depuramos y lo convertimos en un tipo de dominio. Basta con una función pura.

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

De este modo, las abreviaturas y clasificaciones basadas en códigos de la respuesta de la API, como `총수입금액` y `경비율`, se transforman **en un único lugar** para adaptarlas al dominio del frontend. Los valores que deben desplegarse como enum, como el código del tipo de ingreso, pueden resolverse con una pequeña lookup table dentro del mapper. Aunque cambien los nombres de los campos de la API de Hometax, solo habrá que modificar el mapper.


## Funciones utilitarias y lógica de dominio

Al separar la lógica de dominio surge inevitablemente una pregunta: **«¿esto no es una función utilitaria?»**

Veamos, por ejemplo, estas dos funciones.

```typescript
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}원`;
}

function calculateTax(taxableBase: number): number {
  const bracket = TAX_BRACKETS.find((bracket) => taxableBase <= bracket.limit);
  return Math.floor(taxableBase * bracket.rate - bracket.progressiveDeduction);
}
```

`formatCurrency` es pura **lógica de presentación (Presentation)** que transforma un número en texto. Añadir la unidad «won» y los separadores de miles no es una regla de negocio, sino una decisión sobre cómo mostrar el valor al usuario. En cambio, `calculateTax` contiene una **regla de negocio basada en la legislación fiscal**: «aplicar ocho tramos impositivos progresivos». Es una regla del dominio que debe aplicarse de la misma forma incluso sin UI.

Este es el criterio que uso en la práctica.

> **Si esta lógica desaparece, ¿se rompe el negocio o solo se rompe la pantalla?**

Si se rompe el negocio, es lógica de dominio; si solo se rompe la pantalla, es lógica de presentación. Esta pregunta permite trazar la mayoría de los límites.

| Criterio                              | Lógica de dominio                          | Lógica utilitaria/de presentación       |
| ------------------------------------- | ------------------------------------------ | --------------------------------------- |
| ¿Qué se rompe si falta?               | El cálculo de impuestos                    | La pantalla (UI) se ve mal              |
| ¿Qué ocurre si cambia el framework?   | Se conserva                                | Puede cambiar                           |
| ¿Está especificada como requisito?    | «Base imponible × tipo − deducción progresiva» | «Los importes llevan separadores»  |
| ¿Existe la misma lógica en el backend? | Existe o debería existir                  | No (solo concierne al frontend)         |

Pero la realidad no es tan limpia. El caso más difícil es el de la **lógica que parece de dominio, pero en realidad es de presentación**.

Veamos el siguiente código. Como recibe un concepto de dominio llamado FilingStatus, se ha clasificado como lógica de dominio. Pero ¿lo es realmente?

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

Aunque `getStatusBadgeColor` y `getStatusDisplayText` usan el concepto de dominio `FilingStatus`, su función es la **presentación en pantalla**. Si cambia el color de la insignia, el negocio no se rompe en absoluto. Si ponemos estas funciones en `domain/filing.ts`, el módulo de dominio crecerá cada vez más y la auténtica lógica de dominio acabará mezclada con la lógica de presentación.


### Separar el modelo de dominio y el ViewModel

Hay una forma práctica de resolver este problema: **separar el ViewModel en un archivo distinto dentro de la misma carpeta del dominio**. En lugar de `.ui.ts`, usar el nombre `.viewModel.ts` enlaza de forma natural con el concepto de ViewModel del patrón MVVM. El propio nombre deja claro su papel como «capa que transforma los datos de dominio para adaptarlos a la pantalla».

```
domains/
└── filing/
    ├── filing.ts              # 순수 도메인 모델 + 도메인 로직
    ├── filing.viewModel.ts    # ViewModel (표현 변환 계층)
    ├── filing.test.ts         # 도메인 로직 테스트
    └── filingMapper.ts        # API ↔ 도메인 변환
```

Movemos tal cual `getStatusBadgeColor` y `getStatusDisplayText` a `filing.viewModel.ts`. También reunimos aquí transformaciones como `getFilingTypeLabel(type: FilingType): string`, que convierte los tipos de declaración en etiquetas coreanas. `filing.ts` se ocupa solo de las reglas de negocio y `filing.viewModel.ts`, solo de su presentación en pantalla.

La clave es la **dirección de las dependencias**. `filing.viewModel.ts` importa `filing.ts`, pero `filing.ts` nunca importa `filing.viewModel.ts`. El dominio no conoce la presentación; la presentación sí conoce el dominio. Puede verse como una versión reducida de la regla de dependencias (Dependency Rule) de Robert C. Martin.

He colocado en la misma carpeta los archivos que cambian juntos porque considero que deben estar en el mismo directorio. Si se añade un valor nuevo al tipo `FilingStatus` —por ejemplo, `'rejected'`—, habrá que modificar tanto `filing.ts` como `filing.viewModel.ts`. Al encontrarse en la misma carpeta, el alcance del cambio resulta evidente.


## Límites y cohesión

Tan importante como separar la lógica de dominio es decidir **dónde trazar los límites**. Estos son algunos de los problemas al definir límites que encuentro con frecuencia en proyectos reales.

Los datos que maneja un frontend proceden, a grandes rasgos, de cuatro fuentes.

- **Datos del servidor**: recibidos como respuesta de una API.
- **Datos derivados**: calculados a partir de los datos del servidor.
- **Estado de la UI**: destinado a controlar la pantalla y las interacciones del usuario.
- **Entrada del usuario**: datos que se están introduciendo en un formulario.

Si mezclamos los cuatro en un único tipo, contaminamos el modelo de dominio.

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

Este tipo mete en el mismo recipiente conceptos de dominio, estado de la UI y datos temporales. Cada vez que cambia `activeStep`, es como si se actualizase el dominio de la declaración. (Cambiar de paso en un formulario no es un evento de negocio).

La mejora consiste en separar los tipos según sus límites. El **modelo de dominio** solo contiene conceptos de negocio como `id`, `status` y `determinedTax`; el **estado de la UI** (`FilingFormViewState`) contiene únicamente controles de pantalla como `isExpanded` y `activeStep`; y el **estado del formulario** (`DeductionEditForm`), solo los datos temporales que se están introduciendo.

Así, cada tipo tiene **un único motivo para cambiar**. Los tipos de dominio solo se modifican cuando cambia la legislación fiscal; el estado de la UI, cuando cambia el diseño de la pantalla; y el estado del formulario, cuando cambia la UX de entrada.


### Mantengamos juntas las cosas que cambian juntas

En el DDD de Eric Evans existe el concepto de **Aggregate (agregado)**: «tratar un grupo de objetos relacionados como una sola unidad». No hace falta aplicarlo literalmente en el frontend, pero sí merece la pena adoptar su principio central: **mantener juntos los datos y las reglas que cambian juntos**.

En un servicio fiscal, por ejemplo, `Income` (ingresos) y `ExpenseRate` (coeficiente de gastos) siempre cambian juntos. Si cambia el tipo de ingreso, también cambia el coeficiente aplicable y se ve afectado el cálculo de la renta global. Por tanto, conviene cohesionarlos en un solo archivo, `domain/tax.ts`.

En cambio, `TaxFiling` (declaración) puede cambiar con independencia del cálculo de la cuota. Aunque cambien las reglas de transición de estado de una declaración, la lógica para calcular los tipos impositivos no se ve afectada. Por tanto, es correcto separarla en `domain/filing.ts`.

```
이렇게 묻자: "A가 변할 때 B도 반드시 변해야 하는가?"
  → Yes: 같은 모듈에 둔다 (Income + ExpenseRate + TaxBracket)
  → No: 분리한다 (Tax 계산 ↔ Filing 상태관리)
```


## Class frente a estilo funcional

Llegados a este punto puede surgir una pregunta fundamental. Todos los ejemplos anteriores combinan `interface` y funciones puras; ¿no sería más natural expresar el dominio con Class para lograr una mayor cohesión?

Es cierto. Cuando se expresa un dominio mediante Class, los datos y el comportamiento quedan agrupados en un mismo objeto, por lo que la cohesión se hace visible directamente en la estructura del código.

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

Con Class, el comportamiento pertenece a los datos y el sujeto queda claro allí donde se utiliza. `filing.canAmend()` resulta intuitivo, como una frase en lenguaje natural. El sujeto (filing) y el verbo (canAmend) están unidos de forma explícita. Del mismo modo, al escribir `jihoon.eat('감자탕')` se lee de inmediato que «Jihoon come gamjatang».

En el estilo funcional, en cambio, queda así.

```typescript
canAmend(filing);
eat("jihoon", "감자탕");
```

En el enfoque funcional, los datos existen fuera de la función. Las dos líneas anteriores reciben `filing` como argumento y ejecutan alguna operación. La función `eat` recibe `jihoon` y `감자탕` como datos y realiza la acción.

Como resultado, la relación entre sujeto y verbo es más débil. Para saber que la función `canAmend` está relacionada con `TaxFiling`, hay que abrir el archivo o consultar su firma de tipos. Si en un mismo archivo se mezclan funciones como `canAmend(filing)`, `canEdit(filing)` y `calculateTax(taxableBase)`, puede resultar difícil saber de un vistazo a qué dominio pertenece cada una.


### Entonces, ¿deberíamos usar Class?

Sinceramente, la respuesta es **«depende de la situación»**. Sin embargo, según mi experiencia, hay razones prácticas por las que Class no es una solución universal en un entorno React + TypeScript.

**1. Fricción con la gestión del estado de React**

La gestión del estado de React encaja de forma más natural con **Plain Object**. Aunque `useState` y `useReducer` pueden contener técnicamente cualquier valor, y Redux DevTools no elimina por sí mismo el prototipo de una instancia de Class, cuando el middleware de persistencia de Redux/Zustand guarda y restaura el estado como JSON, una instancia de Class pierde sus métodos y su prototipo en el ciclo `JSON.stringify` → `JSON.parse` y queda reducida a un plain object. El límite de props entre React Server Component y Client Component impone una restricción distinta: solo admite valores serializables (serializable) compatibles, por lo que una instancia arbitraria de Class no puede atravesarlo.

Veamos el siguiente código.

```typescript
const [filing, setFiling] = useState(
  new TaxFilingModel("F-001", "draft", 2025, "regular", 0),
);
```

Actualizar el estado de React no hace que `filing` deje de ser una instancia de `TaxFilingModel`. Sin embargo, si la persistencia de Redux/Zustand lo guarda y restaura como JSON, el valor recuperado puede ser un plain object sin métodos, y una llamada desprevenida a `filing.canAmend()` puede provocar un error en tiempo de ejecución. Al pasarlo de React Server Component a Client Component, el fallo ocurre antes, porque una instancia de Class no es un valor de props serializable compatible.

**2. Dificultad para garantizar la inmutabilidad**

React detecta los cambios de estado mediante **comparación de referencias (referential equality)**. Si un método de una instancia de Class modifica internamente el estado con algo como `this.items.push(...)`, la referencia no cambia y React no activa un nuevo renderizado. Así que `addDeduction(item)` tendría que devolver siempre una instancia nueva, por ejemplo con `return new DeductionList([...this.items, item])`; pero entonces se diluye la ventaja de Class de «modificar un estado encapsulado». El resultado no es muy distinto de una actualización funcional.


### Estrategias para lograr cohesión con el estilo funcional

Entonces, ¿cómo podemos mejorar en el estilo funcional el problema de cohesión débil que vemos en `eat('jihoon', '감자탕')`? Estas son tres estrategias que me han resultado eficaces.

**1. Cohesionar mediante un namespace de módulo**

Es la opción más intuitiva. Se convierte el propio archivo —el módulo— en una unidad de dominio y se usa un namespace al importarlo. Podemos reutilizar tal cual el archivo `domain/filing.ts` definido antes.

```typescript
import * as FilingModel from "../domain/filing";

FilingModel.canEdit(filing);
FilingModel.canAmend(filing);
FilingModel.canSubmit(filing);
```

Aunque `FilingModel.canAmend(filing)` no llega a ser tan directo como `filing.canAmend()`, el código deja claro al menos que la función pertenece al dominio Filing. También desaparece el riesgo de mezclar funciones de varios dominios.

**2. Usar siempre como primer argumento el sujeto del dominio**

Existe otra convención para expresar cohesión en el estilo funcional: **colocar siempre como primer argumento al «sujeto de la acción»**. Si unificamos las firmas como `canAmend(filing)` y `calculateTotalIncome(income)`, `canAmend(filing)` se lee como «consultar canAmend sobre filing». Es coherente con la forma de pensar de las pipelines de Unix (`data |> transform`). De hecho, el receptor de métodos de Go sigue exactamente este patrón, al igual que el bloque `impl` de Rust cuando recibe `self` como primer argumento.

**3. Agrupar el comportamiento con una función de creación de objetos de dominio (Factory)**

Este patrón resulta útil cuando echamos de menos la cohesión de Class. Una función factory devuelve a la vez el objeto de dominio y su comportamiento.

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

Este patrón combina la expresividad de Class (`filing.canAmend()`) con la practicidad de componer comportamiento mediante un objeto literal. Como el objeto devuelto contiene propiedades que son funciones, no es en sí mismo un dato serializable como JSON. También tiene el coste de crear cada vez nuevos objetos de función, pero rara vez supone un problema de rendimiento con el volumen de datos habitual en frontend.


## ¿Hasta dónde debemos separar?

Al leer sobre Clean Architecture encontramos estructuras ideales con tres o cuatro capas y definiciones de Port/Adapter. Sin embargo, aplicar esta estructura a todos los proyectos puede convertirse en sobreingeniería (over-engineering).

Estos son, en mi opinión, unos criterios prácticos.

- **Separar los tipos de dominio de los tipos de respuesta de la API**. Ya sea con `interface` o con `type`, se definen en un archivo aparte los conceptos de dominio que usa el frontend.
- **Extraer de los componentes la lógica que contenga reglas de negocio**. No es imprescindible que esté en una carpeta `domain/`. Lo importante es convertirla en funciones puras que no dependan de React.
- **Transformar la respuesta de la API en el modelo de dominio en un único lugar**. Ya sea mediante una función Mapper o un esquema de Zod, se crea una estructura en la que basta modificar ese punto para evitar que el cambio se propague.

Si el proyecto gana complejidad, también pueden plantearse estas opciones.

- **Dividir las carpetas por Bounded Context**. El [capítulo de frontend de Toss](https://frontend-fundamentals.com/) también recalca el principio de «colocar en el mismo directorio los archivos que cambian juntos». Al dividir las carpetas por dominios, las rutas de importación revelan de forma natural sus límites.
- **Introducir una capa de Use Case**. Cuando la combinación de lógica de dominio se vuelve compleja, hace falta una capa Application que reúna en una sola función un escenario como «consultar información de ingresos → aplicar el coeficiente de gastos → calcular las deducciones → calcular la cuota → determinar la devolución».

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

Incluso dentro de un único dominio fiscal, el **cálculo de la cuota (tax)**, la **gestión de declaraciones (filing)** y las **deducciones (deduction)** se dividen en subdominios independientes. Aunque cambien los tipos impositivos, no se ven afectadas las reglas de transición de estado de las declaraciones; aunque se añadan deducciones, el flujo para presentar una declaración permanece intacto. Esta es una aplicación práctica de Bounded Context.


## Conclusión

En resumen, el **dominio** es el área problemática que queremos resolver; el **modelo de dominio** es el sistema conceptual que abstrae de forma selectiva ese problema; el **modelo de objetos de dominio** es la implementación en código de ese sistema conceptual; y el **objeto de dominio** es cada objeto individual de esa implementación.

Llevar estos conceptos a la práctica en frontend no consiste simplemente en dividir carpetas, sino en **evaluar conscientemente varias capas de límites**. «¿Esto es una regla de negocio o lógica de presentación?», «¿estos datos son estado de dominio o estado de la UI?», «¿esta función tiene suficiente cohesión?». El mero hábito de formularse estas preguntas mejora de forma natural la estructura del código.

Por supuesto, no todos los proyectos necesitan todas las capas de Clean Architecture. Dividir una aplicación CRUD sencilla en cuatro capas y aplicar el patrón Factory a todos los dominios sería matar moscas a cañonazos. Entre la elegante cohesión de Class y la flexibilidad práctica del estilo funcional, la respuesta depende de la complejidad del proyecto y del contexto del equipo.

No hay una única respuesta correcta. Pero existe una diferencia clara entre **«escribir código sin saber qué es el dominio»** y **«reconocer el dominio, evaluar sus límites y separarlo conscientemente»**. Espero que quienes lean este artículo se pregunten al menos una vez en sus propios proyectos: «¿cuál es aquí el dominio y dónde debería estar este código?».


### Referencias

:::ref
- [article] [Eric Evans, Domain-Driven Design (Book)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [article] [Robert C. Martin, Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [article] [Khalil Stemmler, Does DDD Belong on the Frontend?](https://khalilstemmler.com/articles/typescript-domain-driven-design/ddd-frontend/)
- [article] [Alex Bespoyasov, Clean Architecture on Frontend](https://bespoyasov.me/blog/clean-architecture-on-frontend/)
- [article] [토스, E2E 자동화 여정](https://toss.tech/article/income-qa-e2e-automation)
:::
