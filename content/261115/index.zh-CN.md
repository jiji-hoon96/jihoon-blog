---
emoji: '🧭'
title: '使用 Biome 两年后的体验'
seoTitle: 'Biome 与 ESLint：两年使用体验'
date: '2026-11-15'
categories: 前端 JavaScript
description: '我使用 Biome 近两年，测量配置整合与检查速度，并结合实际代码和官方文档，梳理 ESLint 缺失的检查、类型信息规则的成本，以及迁移到 Biome 2 时出现的差异，并总结实测结果与迁移注意事项，供团队做迁移决策时参考。'
keywords: 'Biome, ESLint, Prettier, Biome 2, 迁移, 前端, 静态分析'
locale: zh-CN
translationOf: '261115'
sourceHash: feec0e755ce7548b6041920f4a0c6c5c69e93f2b62859ef17347e02523e41d8a
---

这篇文章面向正在使用 ESLint 和 Prettier、并考虑迁移到 Biome 或从 Biome 1 升级到 2 的开发者。我将整理自己代码中的测量数据和迁移结果。我在公司的两个前端服务中分别于 2024 年 11 月和 2025 年 1 月引入了 Biome 1.9.4。[Biome 能替代 ESLint 和 Prettier 吗？](/241201)是我刚引入时写的介绍文章。

先说结论：在这两个服务中，Biome 将配置集中到了一处；即使文件数接近翻倍，完整检查仍在 0.2 秒左右。在此过程中，我们失去了一些 ESLint 检查，升级到 Biome 2 时也出现了包括 import 排序在内的大量 diff。下面我会根据自己的验证结果，区分 Biome 负责的工作和不负责的工作。

## 配置整合与检查速度

迁移之前，配置分散在多个地方。ESLint 配置分别写在 `.eslintrc.js` 和 `package.json` 的 `eslintConfig` 中，但 ESLint 8 只读取同一文件夹中的一个配置文件。`package.json` 中的配置继承了 airbnb 配置，但 airbnb 配置甚至没有安装。文件里写着一些实际上并未生效的规则，仿佛它们正在生效。

Prettier 选项也分散在 `.prettierrc` 和 ESLint 的 `prettier/prettier` 规则中，import 排序则单独配置在 ESLint 里。Biome 在一个 `biome.json` 中配置 lint、format 和 import 排序。两个服务中，与 lint 和 format 相关的开发依赖分别从 12 种降至 1 种、从 10 种降至 1 种。负责判定配置的一方统一之后，配置中写的规则与实际生效规则不一致的可能性也降低了。

我在 Apple M2 Max 的 12 核 CPU 上，对引入 Biome 前代码的 `src` 目录中 751 个文件进行了无缓存检查并比较速度。ESLint 8.57 的整套流程耗时 10.34～10.93 秒；Biome 1.9.4 的 `check` 包含 lint、format 和 import 排序，耗时 0.21～0.22 秒。两者各测了五次。不过，双方检查的规则组合并不相同。

关闭 ESLint 的 `prettier/prettier` 规则后，耗时降至 5.31～5.35 秒，约为原来的一半。把 Prettier 作为 lint 规则运行时，每个文件都要重新解析，这部分占了约一半时间。ESLint 的 `--cache` 填充后，耗时为 0.85～0.91 秒。将 Biome 限制为单线程运行时，耗时为 1.26 秒。

根据这些结果，我反向推断，在 0.22 秒中，并行处理约占 6 倍的提速，其余约 8 倍来自原生二进制，以及 lint 和 format 共用一次解析后生成的语法树。这些数值并非分别控制各个因素后测得，而是基于上述测量值作出的推断。

截至 2026 年 11 月，同一服务的 `src` 文件已增至 1,457 个。Biome 1.9.4 `check` 自行报告的耗时为 220～275ms，Biome 2.6.8 为 215～236ms。两者各测了三次。文件数接近翻倍，报告的检查时间却几乎没变。对我来说，无须单独管理缓存也能运行完整检查，是一项实际工作中的优势。

## Biome 的解析与执行结构

Biome 的解析器经过设计，即使遇到语法错误也会尝试恢复。根据官方 architecture 文档，解析结果是 CST（concrete syntax tree），它使用 rowan 库的内部 fork 实现 green/red tree 模式。CST 会保留注释和空白。

错误语法会标记为 Bogus 节点，以免规则和格式化程序将其当作正常语法处理。官方文档说明，Biome 解析器有意比 Prettier 解析器更严格，格式化程序会原样输出 Bogus 节点，不会修复它们。我的团队设置了 `formatWithErrors: true`，因此有语法错误的文件也会被格式化。

Biome 也采用服务器和客户端架构。后台守护进程处理编辑器和 CLI 请求，编辑器扩展通过 `biome lsp-proxy` 将 LSP 消息转发给守护进程。官方文档还介绍了 `biome inspect` 命令，可用于查看格式化程序的中间表示（IR）。此命令从 2.6 版开始提供。

scanner 并非每次默认运行，而是 opt-in 的。启用 project 域规则或类型信息规则时，scanner 会查找嵌套的 `biome.json` 和 `.gitignore`，并为 `package.json` 和源文件建立索引。官方 FAQ 表示，在约 2,000 个文件的项目中，不启用 scanner 时约需 800ms，启用后约需 2 秒。我认为，默认 `check` 的测量值与启用类型信息规则后的测量值，测量的执行范围并不相同。

## 规则与修复范围

Biome 的 lint 规则分为 Accessibility、Complexity、Correctness、Nursery、Performance、Security、Style、Suspicious 八个组。从 v2 开始，所有规则都有默认严重级别，Style 组默认发出警告。与稳定版规则不同，Nursery 规则必须在配置中手动启用。

规则不只会报告诊断，有时也会修改代码。safe 修复保证不会改变代码含义，并通过 `--write` 应用。unsafe 修复可能改变代码含义，因此需要 `--write --unsafe`。`noFloatingPromises` 的修复属于 unsafe。

Biome 的抑制注释会在语法中包含原因。例如，使用 `// biome-ignore lint/<그룹>/<규칙>: <이유>` 这种格式。要抑制整个文件，可在文件顶部使用 `biome-ignore-all`；要抑制特定范围，可使用 `biome-ignore-start` 和 `biome-ignore-end`。未使用的抑制注释会显示为 `suppression/unused` 诊断。

在我的代码中，检查 React Hook 依赖数组的 recommended 规则 `useExhaustiveDependencies` 仍有 326 条警告。团队将其设为警告，而不是错误。

## 类型信息与 project 规则

Biome 不是类型检查器。官方文档说明的能力范围是：即使不安装 `typescript` 包，也能使用基于类型信息的 lint 规则。在我的两个服务中，CI 的类型检查仍由构建命令中的 `tsc` 负责。

Biome 1 的规则只查看单个文件的语法，因此无法检查调用的函数是否返回 Promise 这类问题。Biome 2 引入了不依赖 TypeScript 编译器的类型信息 lint 规则。首个规则 `noFloatingPromises` 在预备测试中据称能捕获 typescript-eslint 可捕获情况的约 75%。v2.1 修复了类型推断，据称将这一比例提升至约 85%，并新增了七条规则，包括 `noMisusedPromises`。

我在 2.6.8 中为当前代码启用 `noFloatingPromises` 后，发现了 22 处问题。其中一个例子是，代码调用了一个返回 Promise 的确认回调，却没有 `await`，随后马上关闭窗口。即使在 2.6.8 中，此规则仍属于 Nursery 组。官方文档将 Nursery 描述为实验阶段，并说明其行为随时可能变化。它的默认严重级别是 info，启用后会运行扫描项目文件的 scanner 和类型推断引擎，因此检查时间会增加。

project 域规则会根据 `package.json` 中的依赖自动启用规则组合。例如，它会根据 React 16 及以上版本、Next 14 及以上版本、Vitest 等测试工具，启用相关规则。我在 Apple M2 Max 上直接测量了 2.6.8 对当前代码 `src` 目录中 1,438 个文件的检查时间。保持当前设置只运行 lint 时，耗时为 122～160ms；只额外启用使用类型推断的 `noFloatingPromises` 后，耗时为 225～262ms。

`noImportCycles` 属于 Suspicious 组，默认严重级别为警告。官方文档说明该规则计算成本较高。在我的代码中，启用此规则后耗时为 253～264ms，并产生了 88 条警告。

`noUnresolvedImports` 属于 Correctness 组，用于检查 import 的名称是否实际导出，默认严重级别为错误。它不检查动态 `import()` 和 `require()`。连接实际的 `node_modules` 后运行，耗时为 243～253ms，产生了 553 条错误。虽然这段代码可以通过构建和测试，但这 553 条都不是真正的错误。

其中，499 条是从 Vitest 导入的 `describe`、`it`、`expect`、`vi` 等名称，28 条是 React 的 `Fragment`、`Suspense`，25 条是带有 Vite 的 `?url`、`?worker` 后缀的 import。剩下的一条来自一个包。React 包的入口文件通过 CommonJS 的 `module.exports` 导出。我推断，Biome 似乎无法静态识别这类导出。

不连接 `node_modules` 并运行同一规则时，约 700ms 会产生 4,136 条错误。基于这一结果，我判断在当前代码中，难以通过 project 规则恢复 ESLint 时代的 `import/no-unresolved` 检查。此判断仅适用于我自己的代码结果。

我通过 v2.4 开始提供的 `--profile-rules` 查看各规则耗时。它会排除预处理时间，并将各线程的规则运行时间相加。在我的测量中，`useExhaustiveDependencies` 耗时最长，为 54.6ms，执行了 24,086 次。接下来是 `noFallthroughSwitchClause`，耗时 13.0ms；`noUnusedVariables` 为 9.3ms；`useImportType` 为 8.7ms。完整 `check` 包含 format 和 import 排序，耗时为 215～236ms。我推断，它与仅运行 lint 的 122～160ms 之间的差值来自 format 和 assist。我们也尝试在同一代码上测量 oxlint，但这次没能测成，因此不纳入速度比较。

## 两年间新增的功能

我引入的 1.9.4 版于 2024 年 10 月 17 日在 npm 上发布。v2.0.0 于 2025 年 6 月 17 日发布，v2.6.8 于 2026 年 11 月 15 日发布。在此期间，Biome 除了增加类型信息 lint，还扩大了支持范围并增加了执行工具。

v2 增加了 GritQL 插件，以及支持使用多个配置文件的 monorepo 功能。

v2.3 以实验阶段的形式增加了对 Vue、Svelte、Astro 的支持，还包含以 `!` 排除文件的新忽略语法，以及 Tailwind v4 指令解析。v2.4 可检查 JavaScript 中的 CSS 和 GraphQL 片段，并新增了 15 条 HTML 无障碍规则。用于测量各规则耗时的 `--profile-rules` 也在此版本加入。

v2.5 中 lint 规则超过 500 条，并新增了 `--watch` 模式。GritQL 插件也开始能够提出代码修复建议。v2.6 支持 Markdown、SCSS、YAML，并以 developer preview 形式发布了 JavaScript 插件。

Biome 无法原样继承 ESLint 插件生态。GritQL 插件无法访问 Biome Rust 规则使用的 semantic model。JavaScript 插件仍处于 developer preview 阶段，即使在补丁版本中也可能发生变化。因此，没有依据认为现有 ESLint 插件可以原样迁移。

截至 2026 年 11 月 15 日，根据官方网站，Biome 与 Prettier 的兼容度为 97%，lint 规则有 816 条。官方文档没有说明 97% 是如何测量的。

Biome 的下载量也有所增长。比较 npm 周下载量在 2024 年 11 月 11 日至 17 日与 2026 年 11 月 9 日至 15 日的数据，Biome 从 124 万增长到 2,739 万。同一时期，ESLint 从 4,806 万增至 2 亿 705 万，Prettier 从 4,379 万增至 1 亿 8,472 万，oxlint 从 9 万增至 4,828 万。

Prettier 与 Biome 的格式化结果也会在一些具体场景中出现差异。移除对象和类属性的引号时，Prettier 只处理 ES5 标识符，Biome 则会移除 ES2015 及之后版本的标识符周围的引号。在计算属性键中的赋值表达式里，Biome 会去掉括号。

## ESLint 中缺失的检查

迁移到 Biome 时，确实有一些检查缺失了。Biome 1.9 没有 `import/no-unresolved` 和 `import/named`，因此无法负责检查 import 路径和名称；在我的服务中，这些检查由 `tsc` 代劳。不过，上一节中 `noUnresolvedImports` 的实测产生了并非实际错误的诊断，因此我判断很难用 project 规则替代这些检查。

Hook 调用位置检查也缺失了。它在 ESLint 中是错误，但引入时我关闭了 Biome 的 `useHookAtTopLevel`。文件和文件夹名称规则也缺失了。当时 ESLint 的 `check-file` 检出了 336 处问题，而 Biome 只有用于文件名的 `useFilenamingConvention`，没有文件夹名称规则。

Biome 1 也没有未处理 Promise 检查。要判断函数返回值是否为 Promise，需要类型信息，而 Biome 1 的规则只查看单个文件的语法。浏览器的 `unhandledrejection` 错误监控只能捕获一部分情况，起到兜底作用。Biome 2 增加了 `noFloatingPromises`，但此规则属于 Nursery 组，启用后会增加运行时间。

## 迁移到 Biome 2

两个服务仍在使用 Biome 1.9.4。我在当前代码的副本上运行了 `biome migrate --write`，以确认配置变更和诊断差异。`files.include` 和 `ignore` 合并为一个 `includes`，排除模式以 `!` 开头。`organizeImports` 移到了 `assist.actions.source.organizeImports`。部分规则也改了名称或分组。例如，`noMultipleSpacesInRegularExpressionLiterals` 改为 `noAdjacentSpacesInRegex`，`noWith` 和 `noVar` 则移到了 Suspicious 组。

根据官方升级指南，import 排序方式发生变化，无法生成与 1.x 完全相同的顺序。还有一项变更是不再在 glob 前添加 `**/`。运行 `biome migrate --write` 迁移设置后再进行检查，322 个文件出现了 import 排序不同的诊断，15 个文件出现了格式差异。升级到 Biome 2 需要一次性修复这些差异的提交。

`biome migrate eslint --write` 会迁移 ESLint 规则、globals、overrides 和 ignore 模式。它可以读取旧版 eslintrc 和 flat config，并沿着 extends 解析配置。迁移时规则 preset 设为 none，只启用迁移过来的规则。默认只迁移相同规则，指定 `--include-inspired` 后也会迁移相似规则。官方指南也建议审核结果后再使用。

`biome migrate prettier --write` 会明确写出所有 Prettier 选项，以保持当前输出。

## CI 中的判定

在我的开发流程中，Biome 会在编辑器保存和提交前自动修复并检查。pull request 和发布流水线的 CI 会运行 `biome ci`，检查 format、lint 和 assist，但不会修改文件。提交钩子可以跳过，因此是否通过由 CI 决定。

`biome ci --changed` 会与默认分支或通过 `--since` 指定的基准比较，只检查已提交的变更文件，适用于 CI。`--staged` 只检查已暂存文件，适用于本地。可以在 github、gitlab、junit、checkstyle、sarif、rdjson、summary 报告器中选择，json 仍处于实验阶段。

## 常见问题与回答

- **Biome 能替代类型检查吗**：不能。虽然可以使用类型信息 lint 规则，但在我的两个服务中，CI 的 `tsc` 仍负责类型检查。
- **Biome 2 的 `noFloatingPromises` 是稳定规则吗**：不是。即使在 2.6.8 中，它仍属于 Nursery 组，官方文档说明它处于实验阶段，行为可能变化。
- **启用 `noFloatingPromises` 后检查时间增加了多少**：在我当前的代码中，仅运行 lint 时耗时为 122～160ms，增加此规则后为 225～262ms。
- **Biome 的 `noUnresolvedImports` 能替代 ESLint 检查吗**：我判断在自己的代码中很难做到。即使连接了 `node_modules`，553 条诊断也都不是真正的错误；不连接时，约 700ms 会产生 4,136 条诊断。
- **升级到 Biome 2 会产生大量代码变更吗**：在我的代码中，322 个文件出现 import 排序诊断，15 个文件出现格式差异。
- **Biome 的自动修复都会保留代码含义吗**：不会。safe 修复保证不改变含义，但 unsafe 修复可能改变含义，需要使用 `--write --unsafe`。
- **`biome ci` 会修改代码吗**：不会。它检查 format、lint 和 assist，不会修改文件。
- **可以原样使用现有 ESLint 插件吗**：GritQL 插件无法访问 Biome Rust 规则使用的 semantic model，而 JavaScript 插件仍处于 developer preview 阶段。现有 ESLint 插件生态无法原样迁移。

## 结论

在我的两个服务中，Biome 将实际生效的配置集中到了一处；即使文件数接近翻倍，完整检查仍在 0.2 秒左右。这个结果并不意味着规则组合与 ESLint 相同。还需要一并考虑迁移时缺失的检查，例如 import 检查、Hook 调用位置和文件夹名称规则，以及我在 Biome 2 的 project 规则中发现的并非实际错误的诊断。

Biome 2 扩展了类型信息规则和支持范围，但在我的代码中，迁移造成了 322 个文件的 import 排序变更和 15 个文件的格式差异。如果你正在考虑迁移，我建议同时检查速度与配置整合、当前实际生效的规则、迁移后缺失的检查，以及真实的转换 diff。

:::ref
- [docs] [Biome，Biome v2](https://biomejs.dev/blog/biome-v2/)
- [docs] [Biome，迁移到 Biome v2](https://biomejs.dev/guides/upgrade-to-biome-v2/)
- [docs] [Biome，从 ESLint 和 Prettier 迁移](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [docs] [Biome，架构](https://biomejs.dev/internals/architecture/)
- [docs] [Biome，Linter](https://biomejs.dev/linter/)
- [docs] [Biome，Linter domains](https://biomejs.dev/linter/domains/)
- [docs] [Biome，noFloatingPromises](https://biomejs.dev/linter/rules/no-floating-promises/)
- [docs] [Biome，noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/)
- [docs] [Biome，抑制规则](https://biomejs.dev/analyzer/suppressions/)
- [docs] [Biome，CLI](https://biomejs.dev/reference/cli/)
- [docs] [Biome，与 Prettier 的差异](https://biomejs.dev/formatter/differences-with-prettier/)
:::