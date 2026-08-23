---
emoji: 🔧
title: 'Biome 能取代 ESLint 和 Prettier 吗？'
seoTitle: 'Biome vs ESLint vs Prettier — Rust 一体化工具链的性能对比与迁移指南'
date: '2024-12-01'
categories: 前端 JavaScript
description: "对比 Biome 与 ESLint、Prettier 的 lint 和格式化性能，并总结这款 Rust 一体化工具链的实际引入经验与迁移指南。"
keywords: "Biome vs ESLint, Biome vs Prettier, Biome 迁移, JavaScript linter 对比, Rust linter, 前端开发工具"
locale: zh-CN
translationOf: '241201'
sourceHash: 16af1949a7c5575b586c919af82c78646819b783ebee024a579d48a0c0ac5032
---

这篇文章想聊聊一款名为 Biome 的工具。

我所在的团队成员使用 WebStorm、VSCode 等不同的 IDE，因此在维持统一的代码风格方面遇到了不少困难。不仅要为每种 IDE 分别管理配置文件，非常麻烦，代码评审中也经常因为格式差异而出现与逻辑无关的意见。

在这种情况下，ESLint 与格式化相关的规则被标记为 Deprecated，我们不得不寻找新的替代方案。**Prettier + ESLint** 组合需要额外配置来避免工具间的冲突，而 **@stylistic/eslint-plugin-ts** 当时还处于社区发展的早期阶段，稳定性尚未得到充分验证。就在这时，我们开始关注 Biome。

那么，Biome 究竟是一款什么样的工具？它真的能取代 ESLint 和 Prettier 吗？

<hr>

## Biome 是什么？

Biome 是面向 Web 项目的一体化（All-in-One）工具链。它通过一款工具统一提供 JavaScript、TypeScript、JSX、CSS、JSON、GraphQL 等代码的格式化与 lint 功能。其核心理念，就是用单个二进制程序承担 ESLint 和 Prettier 过去各自负责的工作。

Biome 的前身是 [Rome](https://github.com/rome/tools)。**Rome Tools Inc.** 在 2021 年获得 450 万美元风险投资后雄心勃勃地起步，但到了 2023 年年中，公司解雇了全部员工，代码仓库也被归档。随后，核心贡献者 fork 了该项目，并于 2023 年 8 月以 Biome 的名义重新出发。它摆脱了 Rome 时期“承诺过多、交付不足”的形象，通过实用且持续的 release 逐步建立起信任。

它最大的特点是采用 Rust 编写。至于这会带来怎样的性能差异，后文会详细说明。

<hr>

## 为什么要使用 Biome？

选择 Biome 的理由主要可以归纳为三点。

**一款工具就能同时处理格式化与 lint。** 使用 ESLint + Prettier 组合时，为避免两款工具的规则冲突，需要添加 `eslint-config-prettier` 等额外配置。Biome 从根本上消除了这种复杂性。

**性能非常出色。** 根据官方 benchmark，它的速度约为 Prettier 的 25 倍、ESLint 的 15 倍。后文会通过直接对比来看看这些数字在实际中意味着什么。

![1.png](1.png)

**与现有工具兼容。** Biome 与 Prettier 的格式化兼容度约为 97%，并内置了 ESLint 的主要规则。`eslint-plugin-react-hooks`、`eslint-plugin-jsx-a11y` 等常用插件的规则也已集成，因此迁移负担相对较小。

<hr>

## 如何使用？

Biome 的配置相当简单。[官方文档](https://biomejs.dev/guides/getting-started/)中有清晰的说明，可以参考。

首先安装 Biome。

```bash
npm install --save-dev --save-exact @biomejs/biome
```

然后生成配置文件。

```bash
npx @biomejs/biome init
```

这会生成 `biome.json` 文件。在其中定义团队的格式化与 lint 规则即可。

还需要安装 IDE 扩展。使用 VSCode 时请安装 [VSCode Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)；使用 WebStorm 时请安装 [WebStorm Biome](https://plugins.jetbrains.com/plugin/22761-biome) 插件。

最后，在 VSCode 的 `settings.json` 中添加以下配置，即可在保存时自动执行格式化和 lint。

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

<hr>

## 直接比较一下

仅仅说速度快很难有直观感受，因此我在同一个项目中直接比较了 Biome 和 ESLint + Prettier。左侧是 Biome，右侧是 ESLint + Prettier。

### Vite 项目的本地运行时间

![biome1.png](biome1.png)  ![lint1.png](lint1.png)


Biome 为 **506ms**，ESLint + Prettier 为 **630ms**，运行时间快了约 20%。

<hr>

### Vite 项目的构建时间

![biome2.png](biome2.png) ![lint2.png](lint2.png)


Biome 为 **117.13s**，ESLint + Prettier 为 **131.48s**，构建时间快了约 10%。

<hr>

### Lint 任务

![biome3.png](biome3.png) ![lint3.png](lint3.png)

差距最大的是 lint 任务。Biome 为 **0.79s**（CPU 0.470s），ESLint 为 **16.32s**（CPU 8.600s），**Biome 的性能大约快了 20 倍**。CPU 使用效率也高得多。

这种差异在开发环境中已经很明显，而在 CI/CD pipeline 中检查数百个文件时，差距会进一步扩大。Biome 无需通过 npm 安装即可直接运行二进制程序，因此还能节省 CI 的冷启动时间。

<hr>

![3.jpeg](3.jpeg)

嗯……（到这个程度，反而更难找到不用它的理由了。）

<hr>

## 为什么这么快？

“因为用 Rust 开发，所以速度快”这句话没错，但仅凭这一点还不足以完整解释。下面来看看造就 Biome 性能优势的具体技术因素。

<hr>

### Rust 的底层性能

| ![5.webp](5.webp) | ![6.webp](6.webp) |
| --- | --- |

Biome 使用系统编程语言 Rust 编写。Rust 追求零成本抽象（Zero-cost Abstraction），即使使用高层抽象，也能达到与手动优化的底层代码相同的性能。此外，它不依赖垃圾回收器（GC），而是通过所有权（Ownership）系统管理内存，因此不会产生 GC 带来的 runtime overhead。

相比之下，ESLint 和 Prettier 使用 JavaScript 编写，运行在 Node.js runtime 上。尽管 V8 引擎的 JIT（Just-In-Time）编译会优化 JavaScript，但仍无法完全避开解释型语言的根本限制和垃圾回收成本。

<hr>

### 单次解析架构

Biome 使用一个解析器（Parser）对代码进行一次解析，生成 AST（Abstract Syntax Tree，抽象语法树），并在格式化和 lint 时复用这棵 AST。

使用 ESLint + Prettier 组合时会发生什么？ESLint 先解析代码、生成 AST 并执行 lint；随后 Prettier 再次解析同一份代码，生成另一棵 AST 并执行格式化。也就是说，同一个文件会被解析两次。Biome 的单次解析架构从根本上消除了这种重复。

<hr>

### 原生并行处理

![7.png](7.png)

Biome 利用 Rust 的并发模型，在多个线程中并行处理文件。它将任务拆分为较小的单元，并通过 work-stealing scheduler 在各线程间高效分配负载。Rust 的所有权系统会在编译阶段从根本上阻止数据竞争（Data Race），因此 runtime 的同步成本也能降到最低。

Node.js 默认采用基于事件循环的单线程模型。虽然可以使用 Worker Threads 实现并行处理，但线程创建和消息传递会带来额外 overhead。Biome 直接使用操作系统级的原生线程，因此能在没有这类 overhead 的情况下充分利用 CPU 核心。

<hr>

### 内存高效的 AST 处理

![4.svg](4.svg)

Biome 使用 CST（Concrete Syntax Tree，具体语法树）。根据 Biome 官方架构文档，这棵 CST 基于 rowan 库的内部 fork 实现了 Green/Red Tree 模式，能够保留原始代码中的全部信息，包括注释和空白。Rowan 的 Arena 风格内存分配将节点放在连续的内存区域中，从而提升 CPU 缓存局部性（Cache Locality），并尽量减少不必要的对象分配。

JavaScript 基于对象的 AST 处理方式会让每个节点都成为独立的 heap 对象，导致内存分散，并增大 GC 压力。Biome 的方式可以使用更少的内存实现更快的树遍历。

<hr>

## 那么，应该引入 Biome 吗？

Biome 的性能和便利性显然很有吸引力。不过，我并不认为所有项目都应该无条件引入它。下面来看看几个实际需要考虑的因素。

<hr>

### 适合使用 Biome 的情况

- 维护**大型代码库**，构建和 lint 性能非常重要
- 希望缩短 CI/CD pipeline 中的代码检查时间
- 已经厌倦 ESLint + Prettier 配置的复杂性
- 正在启动新项目，希望采用简洁的工具配置

我的团队也在维护一个大型项目，CI pipeline 中的 lint 耗时很长，开发者也苦于缓慢的 lint 速度，因此最终决定引入 Biome。

<hr>

### 需要注意的事项

**最大的限制是插件生态。** ESLint 拥有数千个社区插件，而 Biome 主要围绕内置规则运行。它已内置 `eslint-plugin-react`、`eslint-plugin-react-hooks`、`eslint-plugin-jsx-a11y`、`eslint-plugin-unicorn`、`typescript-eslint` 等主流插件的相当一部分规则，但并非每个插件的所有规则都已完成移植。Biome v2 已宣布将引入基于 GritQL 的插件系统，不过目前仍处于实验阶段。如果项目必须依赖 `@next/eslint-plugin-next`、`eslint-plugin-angular` 等框架专用规则，就需要谨慎考虑迁移。

**还需要确认语言支持范围。** JavaScript、TypeScript、JSX、CSS、JSON、GraphQL 均已获得稳定支持，但 Vue 和 Svelte 的 SFC（Single File Component）文件目前只对 `<script>` 块提供部分支持。HTML、YAML 和 Markdown 尚未得到支持。

**也不能忘记 ESLint 本身还在不断发展。** ESLint v9（2024 年 4 月）引入的 Flat Config（`eslint.config.js`）大幅简化了原有 `.eslintrc` 方式的复杂性。此外，它还分别在 2024 年 10 月和 2025 年 2 月发布 `@eslint/json` 与 `@eslint/css`，将 lint 范围扩展到 JavaScript 以外的语言。ESLint Stylistic（`@stylistic/eslint-plugin`）项目则提供了不使用 Prettier、仅靠 ESLint 完成格式化的方案。随着 ESLint 生态的演进，Biome 的“一体化”优势正在一定程度上被削弱。

此外，也需要记住 Rome 转变为 Biome 的历史。Rome 被归档时给现有用户造成的不便，说明选择工具时项目的可持续性有多么重要。幸运的是，Biome 通过 OpenCollective 和 GitHub Sponsors 获得资金支持，并保持着稳定的 release 周期。

![8.png](8.png)

从 npm trends 来看，Biome 每周约 690 万次的下载量与 ESLint 约 1.2 亿次、Prettier 约 8200 万次相比，仍有很大差距。不过，Biome 的增长速度值得关注。仅仅一年多的时间里，其周下载量便增长到原来的三至四倍以上，尤其是在新项目中的采用率显著上升。

<hr>

## 写在最后

对于 Biome 能否完全取代 ESLint 和 Prettier 这个问题，我的回答是：**“目前还不能，但它已经是非常有力的替代方案。”**

它的性能非常出色，配置简洁，开发速度也很快。不过，插件生态尚不成熟，而且对部分语言的支持有限，这些问题可能会因项目而异，成为实际障碍。最好仔细评估项目的技术栈与团队需求，再决定是否引入。

有一点可以确定：前端工具生态正在朝着“更快、更简洁、更集成”的方向发展。不可否认，Biome 正站在这股潮流的前沿。它无疑是一款值得期待未来发展的工具。

## 参考资料

:::ref
:::
