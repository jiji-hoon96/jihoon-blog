---
emoji: 📖
title: "Domain Terms"
seoTitle: "Domain vs. Domain Model vs. Domain Object: A Frontend Guide"
date: "2026-04-13"
categories: frontend Architecture DDD
description: "How domains, domain models, domain objects, and domain object models differ, using Eric Evans' and Martin Fowler's definitions and an income tax example."
keywords: "domain model, domain object, domain object model, domain model vs data model, Entity Value Object, DDD terminology, frontend DDD, Eric Evans"
locale: en
translationOf: '260413'
sourceHash: c44630b259f5c6692b591bff280ce59e22263c54168a8cd07887817db1f56727
---

In this post, I want to talk about **how domains, domain models, domain objects, and domain object models differ from one another**.

This is for frontend developers who have read about DDD and wondered whether these words all point to the same thing. By the end, you will be able to place the four terms on a single line from abstract to concrete, and explain why an API response type is not a domain model.

I have encountered these words quite often as a developer, yet when someone asks, "What exactly is a domain?" it is not easy to give a clear answer. (Honestly, when I first started programming, I thought domain meant the "www" kind.) All the examples in this post use the comprehensive income tax calculation.

---


## Domain

Let us begin with the most fundamental question. What is a **domain**?

In his book **Domain-Driven Design: Tackling Complexity in the Heart of Software (2003)**, Eric Evans defines a domain as follows.

::::quote
:::translation
A sphere of knowledge, influence, or activity.
:::

:::original
"A sphere of knowledge, influence, or activity."
:::
::::

Put simply, the domain is the **problem space that we intend to solve through programming**. If we are building a tax filing service, "tax filing" is the domain; if we are building an insurance claims platform, "insurance claims" is the domain. A domain is not code. It is a real-world problem space that exists before the software does.

What does this mean for frontend developers? Ultimately, the UI we build is a **window** that lets users see and manipulate the domain. When developing tax-refund services such as Toss Income or 3o3, whose primary domain is tax, we are expressing domain concepts such as income types, expense rates, income deductions, tax credits, and refund amounts through the UI. Frontend developers therefore need a deep understanding of the domain they work with. In other words, knowing **"what problem this service solves"** is just as important as being good at rendering UI components.

But even a single domain called "tax" contains countless subdomains when examined closely. This is true even of the comprehensive income tax calculation pipeline I only understand at a high level.

![The income tax calculation pipeline, from gross income through to payment or refund, with each step colour-coded into the income, deduction, tax, and filing subdomains](1.png)

Each stage of this pipeline is a subdomain with its own rules and data. Within the broad domain of "tax," the detailed domains of Income, Deduction, Tax, and Filing are intertwined. How these should be divided in code is the central question of domain modeling.


## Domain Model

Then what is a domain model? How is a domain different from a "domain model"?

[Martin Fowler](https://martinfowler.com/eaaCatalog/domainModel.html) defines a domain model as an object model of the domain that incorporates both behavior and data. Eric Evans goes one step further.

::::quote
:::translation
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain. — Eric Evans
:::

:::original
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain.
:::
::::

The key is **"selective abstraction."** A domain model does not contain everything in the real world. Just as a film director does not capture every scene in reality but selects only the scenes needed for the story, a domain model **selects and structures only the aspects needed to solve the problem**.

There is one important point here. A domain model does not necessarily have to be code. It might be a diagram on a whiteboard, or a shared mental model in the minds of team members. Ultimately, the term domain model itself can refer to a concept independent of software.

This is where frontend developers are particularly prone to confusion. They see the structure of an API response and think, "So this is the domain model." But that is a **data model**, not a domain model.

The distinction between a data model and a domain model is as follows.

| Category  | Domain Model                                      | Data Model                                 |
| --------- | ------------------------------------------------- | ------------------------------------------ |
| Purpose   | Express business concepts and rules               | Define storage/transfer structures         |
| Language  | Business terms (tax base, tax credit, refund)     | Technical terms (string, number, array)    |
| Contains  | Data + behavior (rules)                           | Data structure only                        |
| Example   | "The rate is 6% for a tax base up to KRW 14M"    | `{ taxableBase: number, taxRate: number }` |

A data model defines "the shape in which data is exchanged," while **a domain model defines "what that data means to the business and what rules it follows."** If we fail to distinguish the two, components become directly dependent on the API response structure, and the entire frontend is thrown into disarray whenever the backend schema changes.


## Domain Object

If a domain model is a system of concepts, a **domain object** is a concrete implementation of one of those concepts in code.

In [an article by Jason Swett](https://www.codewithjason.com/difference-domains-domain-models-object-models-domain-objects/), who runs Code with Jason, he defines a domain object as follows.

::::quote
:::translation
Any object in my object model that also exists as a concept in my domain model, I would call a domain object.
:::

:::original
Any object in my object model that also exist as a concept in my domain model I would call a domain object.
:::
::::

In other words, if the domain model contains a concept called "comprehensive income" and the code contains a type called `Income`, that `Income` is a domain object. But not every object in code is a domain object. Things such as `HttpClient`, `LocalStorageAdapter`, and `useDebounce` are technical tools, not domain concepts.


### Entity and Value Object

Evans classifies domain objects into three categories: **Entity**, **Value Object**, and **Service**. (Martin Fowler calls this the "Evans Classification.") A Service is a separate concept that represents "a domain operation that does not naturally belong to a particular object." Because the focus of this section is how data is identified, we will concentrate on Entities and Value Objects.

An **Entity** is an object with a unique identity that persists across time and different representations. A tax filing (TaxFiling), taxpayer (Taxpayer), or income record (IncomeRecord) is identified by a unique ID; even if its properties change, it remains the same Entity as long as its ID is the same. Even when the deductions on a filing are edited, it is still the same filing unless the filing ID changes.

A **Value Object** is an object whose meaning comes solely from the combination of its properties, and two Value Objects are considered equal when all their property values are equal. Money, a tax rate (TaxRate), and a tax bracket (TaxBracket) are objects whose values themselves carry the meaning. A "6% tax rate" is simply a "6% tax rate" wherever it is used.

Why does this distinction matter on the frontend? Let us look at the code below.

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

TaxFiling is an Entity because it uses its id as the basis of identity. (Merely having an id field does not make something an Entity; the key is that "the id determines whether two objects are the same or different.") Money has no id and is identified only by the combination of amount and currency; it is considered the same value when all properties are equal.

Entities use ID-based comparison; Value Objects use property-based comparison. Making this distinction explicit naturally clarifies the state-management logic for determining whether data is the same or different. When updating an item in a list, for example, an Entity can be found and replaced by ID, while a Value Object can be replaced immutably.


## Domain Object Model

We now understand the "domain model" and the "domain object," but what is a **domain object model**?

Surprisingly, I could not find a commonly agreed-upon definition. A substantial body of literature treats "domain model," "domain object model," "conceptual model," and "analysis object model" as **effectively synonymous**—different names for the conceptual model created during object-oriented analysis.

Another perspective, however, sees it as a more distinct layer. A representative explanation is that the **object model is the point where a domain model is translated into actual code**.

Under this second view, an **object model** is the structure of **every object in the system's code**. This includes technical tools such as `HttpClient` and `useDebounce`. Within it, the **subset of objects that represent domain concepts, together with the relationships among them**, is the **domain object model**. This also aligns with the object-oriented modeling tradition, which has defined an "object model" as the static structure of a system—its classes, properties, operations, and relationships.

I find this perspective more practical for frontend developers because the code we actually write always mixes domain objects with technical objects.

Ultimately, **domain → domain model → domain object model → domain object** is a progression from the abstract to the concrete. The domain is the broadest, and the domain object is the most concrete. Thus, the area we actually wrestle with when writing frontend code is **how to structure the domain object model—the types that express domain concepts and the relationships among them**.


## Conclusion

To summarize, a **domain** is the problem space we are trying to solve; a **domain model** is a conceptual system that selectively abstracts that problem; a **domain object model** is, in the view I adopted here, the implementation of that conceptual system in code; and a **domain object** is an individual object within that implementation.

How this distinction plays out in code, that is, where domain logic such as tax calculation should live outside components and how far to separate it, is the subject of [Domain Models](/260418).

Next time you look at an API response type, I hope you will ask yourself at least once: "Is this a data model or a domain model?"


### References

:::ref
- [article] [Eric Evans, Domain-Driven Design (Book)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
:::
