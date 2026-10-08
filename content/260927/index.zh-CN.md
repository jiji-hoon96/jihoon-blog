---
emoji: 📖
title: "领域术语"
seoTitle: "领域、领域模型与领域对象的区别: 写给前端开发者的整理"
date: "2026-09-27"
categories: 前端 架构 DDD
description: "以 Eric Evans 与 Martin Fowler 的定义，梳理领域、领域模型、领域对象与领域对象模型的区别，并用综合所得税的例子说明为什么 API 响应类型不是领域模型，以及如何区分实体与值对象。"
keywords: "领域模型, 领域对象, 领域对象模型, 领域模型 数据模型 区别, 实体 值对象, 领域驱动设计 术语, DDD 前端, Eric Evans"
locale: zh-CN
translationOf: '260927'
sourceHash: 4cfc49adccec644b3c8e8010fb2c1d282e147c7aa47596cef38fd79f8a1adab8
---

这篇文章想聊聊**领域、领域模型、领域对象与领域对象模型之间到底有什么区别**。

本文写给在阅读 DDD 文章时，曾经分不清这些词是否指同一件事的前端开发者。读完之后，你可以把这四个术语放在一条从抽象到具体的线上，并说明为什么 API 响应类型不是领域模型。

笔者在开发中也经常接触这些词，但真被问到“领域到底是什么？”时，却很难给出清晰的回答。（说实话，刚开始写代码时，我以为领域指的是 www 那种域名。）文中的例子全部使用综合所得税的计算。

---


## 领域（Domain）

先从最基础的问题开始。什么是**领域**？

Eric Evans 在其著作 **Domain-Driven Design: Tackling Complexity in the Heart of Software（2003）** 中对领域作出了如下定义。

::::quote
:::translation
知识、影响力或活动的范围。
:::

:::original
"A sphere of knowledge, influence, or activity."
:::
::::

简单来说，领域就是**希望通过编程解决的问题范围**本身。如果要开发报税服务，“报税”就是领域；如果要开发保险理赔平台，“保险理赔”就是领域。领域不是代码，而是在软件出现之前就已存在的现实世界问题范围。

这对前端开发者意味着什么？我们构建的用户界面，归根结底是一个让用户看见并操作领域的**窗口（window）**。如果开发 Toss Income、3o3 这类以税务领域为核心的退税服务，就要通过用户界面呈现收入类型、费用率、所得扣除、税额抵免、退税额等领域概念。因此，前端开发者也必须深入理解自己处理的领域。换句话说，了解**“这项服务要解决什么问题”**，与出色地实现用户界面组件同样重要。

然而，即便只有“税务”这一个领域，深入其中也会发现大量子领域。仅以我略知皮毛的综合所得税计算流水线为例，就已经是这样。

![综合所得税计算流水线：从总收入到缴纳或退税的每个步骤，按收入、扣除、税额、结果四个子域着色](1.png)

这条流水线的每一个阶段，都是拥有独立规则和数据的子领域。“税务”这一大领域内部，交织着收入（Income）、扣除（Deduction）、税额（Tax）、申报结果（Filing）等细分领域。如何在代码中划分它们，正是领域建模的核心问题。


## 领域模型（Domain Model）

那么，什么是领域模型？领域和“领域模型”有什么区别？

[Martin Fowler](https://martinfowler.com/eaaCatalog/domainModel.html) 把领域模型定义为同时包含行为和数据的领域对象模型。Eric Evans 的定义则更进一步。

::::quote
:::translation
一种描述领域中选定方面的抽象体系，可用于解决与该领域相关的问题。—— Eric Evans
:::

:::original
A system of abstractions that describes selected aspects of a domain and can be used to solve problems related to that domain.
:::
::::

关键在于**“选择性抽象”**。领域模型不会囊括现实世界的一切。就像电影导演不会拍下现实中的所有场景，而只选择叙事所需的场景一样，领域模型也是**选取解决问题所需的方面并加以结构化**的结果。

这里有一点很重要：领域模型不一定非得是代码。它可以是白板上的图，也可以是团队成员头脑中共享的心智模型（Mental Model）。归根结底，“领域模型”这个术语本身可以是一个独立于软件的概念。

这里还有一个前端开发者特别容易混淆的地方：看到 API 响应结构，就认为“这就是领域模型”。但它其实是**数据模型（Data Model）**，而不是领域模型。

数据模型与领域模型的区别如下。

| 区分项    | 领域模型                                   | 数据模型                                  |
| --------- | ------------------------------------------ | ----------------------------------------- |
| 目的      | 表达业务概念与规则                         | 定义存储/传输结构                         |
| 语言      | 业务术语（计税依据、税额抵免、退税额）     | 技术术语（string、number、array）          |
| 包含要素  | 数据 + 行为（规则）                        | 仅数据结构                                |
| 示例      | “计税依据不超过 1,400 万韩元的区间税率为 6%” | `{ taxableBase: number, taxRate: number }` |

数据模型定义“数据以什么形式流转”，而**领域模型定义“这些数据在业务上意味着什么，又遵循哪些规则”。**如果无法区分两者，组件就会直接依赖 API 响应结构，每当后端 schema 发生变化，整个前端都会受到牵连。


## 领域对象（Domain Object）

如果说领域模型是一套概念体系，那么**领域对象**就是这些概念在代码中的具体实现。

经营 Code with Jason 的 [Jason Swett 在文章中](https://www.codewithjason.com/difference-domains-domain-models-object-models-domain-objects/)这样定义领域对象。

::::quote
:::translation
在我的对象模型中，凡是在领域模型里也作为一个概念存在的对象，我都会称之为领域对象。
:::

:::original
Any object in my object model that also exist as a concept in my domain model I would call a domain object.
:::
::::

也就是说，如果领域模型中存在“综合所得”这一概念，代码中又有名为 `Income` 的类型，那么这个 `Income` 就是领域对象。但并非所有代码对象都是领域对象。`HttpClient`、`LocalStorageAdapter`、`useDebounce` 等只是技术工具，并不是领域概念。


### 实体与值对象

Evans 将领域对象分为**实体（Entity）**、**值对象（Value Object）**、**服务（Service）**三类。（Martin Fowler 将这种分类称为“Evans Classification”。）服务是一个独立概念，用来表达“无法自然归属于某个特定对象的领域操作”。不过，本节关注的核心是如何识别数据，因此将重点讨论实体和值对象。

**实体（Entity）**是具有唯一身份、能够贯穿时间与多种表现形式的对象。报税申报单（TaxFiling）、纳税人（Taxpayer）、收入记录（IncomeRecord）等都通过唯一标识符识别；即使属性发生变化，只要标识符相同，就仍是同一个实体。即使修改了申报单的扣除项目，只要申报单标识符没有变化，它就仍是同一份申报单。

**值对象（Value Object）**是仅由属性组合赋予意义的对象，所有属性值都相同时，就视为同一个对象。金额（Money）、税率（TaxRate）、税级（TaxBracket）等都属于其数值本身即有意义的对象。“6% 的税率”无论用在哪里，都只是“6% 的税率”。

为什么这种区分在前端很重要？来看下面的代码示例。

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

TaxFiling 以 id 作为身份判断标准，因此是实体。（拥有 id 字段本身并不是实体的定义，关键在于“用这个 id 判断对象是否相同”。）Money 没有 id，仅通过 amount 与 currency 的组合来识别；所有属性相同时，就视为同一个值。

实体基于标识符比较，值对象基于属性比较。明确这种区分后，状态管理中判断“这份数据是否相同”的逻辑就会自然地得到梳理。比如更新列表项时，如果是实体，就通过标识符找到并替换；如果是值对象，则执行不可变替换（immutable replace）。


## 领域对象模型（Domain Object Model）

已经知道了“领域模型”和“领域对象”，那么**领域对象模型**又是什么？

查阅资料后发现，这个概念出人意料地没有公认定义。许多文献把“领域模型”“领域对象模型”“概念模型（conceptual model）”“分析对象模型（analysis object model）”视为**实质上的同义词**，认为它们只是对面向对象分析阶段所绘制概念模型的不同称呼。

但也有观点认为，它们属于划分得更细的不同层次。其中有一种典型解释：**领域模型转化为实际代码的地方，正是对象模型**。

按照第二种观点，**对象模型**是系统中**所有代码对象的结构**，也包含 `HttpClient`、`useDebounce` 等技术工具。其中，**用于表达领域概念的对象子集及其相互关系**，就是**领域对象模型**。这也与面向对象建模的传统一脉相承——在这一传统中，“对象模型”被定义为系统的静态结构，包括类、属性、操作与关系。

我认为，这种观点对前端开发者更实用，因为我们实际编写的代码总是混合着领域对象和技术对象。

归根结底，**领域 → 领域模型 → 领域对象模型 → 领域对象**是一组从抽象走向具体的层次关系。领域最宽泛，领域对象最具体。因此，编写前端代码时，我们真正要思考的终究是：**如何组织领域对象模型，也就是表达领域概念的类型及其相互关系**。


## 结语

总而言之，**领域**是我们要解决的问题范围；**领域模型**是对这一问题进行选择性抽象后形成的概念体系；**领域对象模型**在笔者采用的视角下，是用代码实现这套概念体系的结果；**领域对象**则是实现中的各个具体对象。

这种区分在代码中会带来什么不同，也就是像税额计算这样的领域逻辑应该放在组件之外的哪里、要拆分到什么程度，会在[领域模型](/260418)中继续讨论。

希望读到这里的各位，下次看到 API 响应类型时，也能问自己一次：“这是数据模型，还是领域模型？”


### 参考资料

:::ref
- [article] [Eric Evans，《领域驱动设计》（书籍）](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
:::
