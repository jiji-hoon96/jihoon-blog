---
emoji: 📖
title: "Dominio y modelo de dominio"
seoTitle: "Dominio, modelo de dominio y objeto de dominio: diferencias"
date: "2026-10-08"
categories: frontend arquitectura DDD
description: "Diferencias entre dominio, modelo de dominio, objeto de dominio y modelo de objetos de dominio según Eric Evans y Martin Fowler."
keywords: "modelo de dominio, objeto de dominio, modelo de objetos de dominio, modelo de dominio vs modelo de datos, Entity Value Object, terminología DDD, DDD en frontend, Eric Evans"
locale: es
translationOf: '261008'
sourceHash: 3afe226b523a5e987c1bd99df63c9d9b63955e9ee64e14fa11c8404948284762
---

En esta entrada quiero hablar de **en qué se diferencian el dominio, el modelo de dominio, el objeto de dominio y el modelo de objetos de dominio**.

Está pensada para desarrolladores frontend que, leyendo sobre DDD, se han preguntado si estas palabras señalan lo mismo. Al terminar, podrás colocar los cuatro términos en una sola línea que baja de lo abstracto a lo concreto y explicar por qué el tipo de una respuesta de la API no es un modelo de dominio.

Me he topado con estas palabras muy a menudo como desarrollador, pero cuando alguien pregunta «¿qué es exactamente un dominio?», no es fácil responder con claridad. (Siendo sincero, cuando empecé a programar creía que dominio se refería a lo de «www».) Todos los ejemplos usan el cálculo del impuesto sobre la renta.

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

![Pipeline de cálculo del impuesto sobre la renta, de los ingresos brutos al pago o la devolución, con cada paso coloreado según los subdominios de ingreso, deducción, impuesto y declaración](1.png)

Cada etapa de este flujo constituye un subdominio con reglas y datos propios. Dentro del gran dominio de los «impuestos» se entrelazan subdominios como ingresos (Income), deducciones (Deduction), cuota tributaria (Tax) y declaración (Filing). Cómo dividirlos en el código es precisamente la cuestión central del modelado de dominio.


## Modelo de dominio (Domain Model)

Entonces, ¿qué es un modelo de dominio? ¿En qué se diferencia el dominio del «modelo de dominio»?

[Martin Fowler](https://martinfowler.com/eaaCatalog/domainModel.html) define el modelo de dominio como un modelo de objetos del dominio que incorpora tanto comportamiento como datos. La definición de Eric Evans va un paso más allá.

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

Evans clasifica los objetos de dominio en tres categorías: **Entity**, **Value Object** y **Service**. (Martin Fowler denomina esta clasificación «Evans Classification»). Un Service representa una operación de dominio que no pertenece de forma natural a un objeto concreto. Como el tema central de esta sección es cómo identificar los datos, nos centraremos en Entity y Value Object.

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


## Conclusión

En resumen, el **dominio** es el área problemática que queremos resolver; el **modelo de dominio** es el sistema conceptual que abstrae de forma selectiva ese problema; el **modelo de objetos de dominio** es, desde el enfoque que adopté aquí, la implementación en código de ese sistema conceptual; y el **objeto de dominio** es cada objeto individual de esa implementación.

Cómo se traduce esta distinción en el código, es decir, dónde debe vivir fuera de los componentes la lógica de dominio como el cálculo de impuestos y hasta dónde separarla, lo trato en [Modelo de dominio](/260418).

Ojalá que, la próxima vez que mires el tipo de una respuesta de la API, te preguntes al menos una vez: «¿esto es un modelo de datos o un modelo de dominio?».


### Referencias

:::ref
- [article] [Eric Evans, Domain-Driven Design (Book)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
:::
