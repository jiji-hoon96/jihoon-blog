---
emoji: '🧭'
title: 'Two Years of Using Biome: A Review'
seoTitle: 'Two Years with Biome and ESLint: A Review'
date: '2026-11-15'
categories: frontend JavaScript
description: 'After nearly two years with Biome, I measured config and check speed, missing ESLint checks, type-aware rule costs, and Biome 2 migration differences.'
keywords: 'Biome, ESLint, Prettier, Biome 2, migration, JavaScript linting, frontend tooling, static analysis'
locale: en
translationOf: '261115'
sourceHash: feec0e755ce7548b6041920f4a0c6c5c69e93f2b62859ef17347e02523e41d8a
---

For developers using ESLint and Prettier who are considering moving to Biome or upgrading from Biome 1 to 2, I’m sharing measurements from my code and the migration results. I introduced Biome 1.9.4 to two of my company’s frontend services in November 2024 and January 2025. [Could Biome replace ESLint and Prettier?](/241201) is an introduction I wrote just after adopting it.

To start with the conclusion, Biome brought configuration together in one place for both services, and full checks took around 0.2 seconds even after the number of files had nearly doubled. Along the way, I lost some ESLint checks, and upgrading to Biome 2 produced a large diff, including import sorting. I’ll distinguish what Biome does and doesn’t handle based on what I observed.

## Consolidated configuration and check speed

Before switching, the configuration wasn’t managed in one place. The ESLint settings were split between `.eslintrc.js` and `package.json`’s `eslintConfig`, but ESLint 8 read only one configuration file in the same folder. The `package.json` settings included an Airbnb extension, but the Airbnb configuration wasn’t even installed. Rules that weren’t applied were listed as if they were.

Prettier options were also split between `.prettierrc` and ESLint’s `prettier/prettier` rule, while import sorting was configured separately in ESLint. Biome sets linting, formatting, and import sorting in a single `biome.json`. Development dependencies related to linting and formatting fell from 12 to 1 in one service and from 10 to 1 in the other. With one source of truth for deciding which settings apply, there was less chance that listed rules differed from the rules actually applied.

I compared the speed by checking the 751 files in `src` from just before adoption without a cache, on an Apple M2 Max with 12 cores. The ESLint 8.57 stack took 10.34–10.93 seconds, while Biome 1.9.4’s `check` took 0.21–0.22 seconds, including linting, formatting, and import sorting. I measured each five times. However, the two tools didn’t check the same set of rules.

Turning off ESLint’s `prettier/prettier` rule reduced the time by about half, to 5.31–5.35 seconds. Running Prettier as a lint rule meant parsing each file again, accounting for half the time. Once ESLint’s `--cache` was populated, it took 0.85–0.91 seconds. When I limited Biome to one thread, it took 1.26 seconds.

From these results, I reverse-inferred that of Biome’s 0.22 seconds, parallel processing accounted for about a 6x speedup, while the remaining roughly 8x came from the native binary and the design in which linting and formatting share a tree parsed once. These figures weren’t measured by controlling each factor separately; they are an inference based on the measurements above.

As of November 2026, the same services had grown to 1,457 files in `src`. Biome 1.9.4 `check` reported its own time as 220–275ms, and Biome 2.6.8 reported 215–236ms. I measured each three times. The reported check time was almost unchanged despite the number of files nearly doubling. For me, being able to run a full check without managing a separate cache was a practical benefit.

## Biome’s parsing and execution structure

Biome’s parser is designed to recover even when there are syntax errors. According to the official architecture documentation, the parse result is a CST (concrete syntax tree), and it implements the green/red tree pattern using an internal fork of the rowan library. The CST preserves comments and whitespace.

Invalid syntax is marked with Bogus nodes. This prevents rules and the formatter from treating those parts as valid syntax. The official documentation explains that the Biome parser is deliberately stricter than the Prettier parser, and that the formatter outputs Bogus nodes as-is without fixing them. My team’s configuration has `formatWithErrors: true`, so it formats files that contain syntax errors too.

Biome also has a server and client structure. A background daemon handles editor and CLI requests, and the editor extension passes LSP messages to the daemon through `biome lsp-proxy`. The official documentation also introduces the `biome inspect` command for examining the formatter’s intermediate representation (IR). This command has been available since 2.6.

The scanner isn’t always part of the default run; it’s opt-in. When project domain rules or type-aware rules are enabled, the scanner finds nested `biome.json` files and `.gitignore` files, then indexes `package.json` and source files. The official FAQ says that for about 2,000 files, a run takes about 800ms without the scanner and about 2 seconds with it enabled. I consider the measurements for the default `check` and for a run with type-aware rules enabled to cover different scopes.

## Rules and the scope of fixes

Biome’s lint rules are divided into eight groups: Accessibility, Complexity, Correctness, Nursery, Performance, Security, Style, and Suspicious. Since v2, every rule has a default severity, and the Style group produces warnings by default. Unlike stable rules, Nursery rules must be enabled directly in the configuration.

Rules don’t only produce diagnostics; some also fix code. Safe fixes are guaranteed not to change the meaning of the code and are applied with `--write`. Unsafe fixes can change its meaning, so they require `--write --unsafe`. The fix for `noFloatingPromises` is unsafe.

Biome’s suppression comments include a reason in their syntax. For example, use the format `// biome-ignore lint/<그룹>/<규칙>: <이유>`. Use `biome-ignore-all` at the top of the file to suppress a whole file, and `biome-ignore-start` and `biome-ignore-end` to suppress a specific range. Unused suppression comments are reported as `suppression/unused` diagnostics.

In my code, 326 warnings remain for the recommended `useExhaustiveDependencies` rule, which checks React hook dependency arrays. The team leaves them as warnings rather than errors.

## Type information and project rules

Biome isn’t a type checker. As the official documentation explains, it supports type-aware lint rules without the `typescript` package. In both of my services, `tsc` inside the build command continues to handle type checking in CI.

Biome 1’s rules only looked at the syntax of a single file, so they couldn’t perform checks that need to know whether a called function returns a Promise. Biome 2 introduced type-aware lint rules that don’t depend on the TypeScript compiler. It reported that its first rule, `noFloatingPromises`, caught about 75% of the cases caught by typescript-eslint in preliminary tests. It said that in v2.1, it had improved type inference to raise that rate to about 85%, and added seven rules, including `noMisusedPromises`.

When I enabled `noFloatingPromises` on my current code in 2.6.8, it reported 22 cases. One example was code that called a confirmation callback returning a Promise without `await`, then immediately closed the window. This rule is still in the Nursery group in 2.6.8. The official documentation describes Nursery as experimental and says its behavior may change at any time. Its default severity is info, and enabling it increases check time because the scanner that traverses project files and the type inference engine run.

Project domain rules look at the dependencies in `package.json` and automatically enable groups of rules. For example, they activate relevant rules based on React 16 or later, Next 14 or later, and testing tools such as Vitest. I measured the current code directly with 1,438 files in `src` on an Apple M2 Max using 2.6.8. With the current configuration and linting alone, it took 122–160ms; enabling just `noFloatingPromises`, which uses type inference, raised that to 225–262ms.

`noImportCycles` is a rule in the Suspicious group, with a default severity of warning. The official documentation says it has a high computational cost. In my code, a run with this rule enabled took 253–264ms and produced 88 warnings.

`noUnresolvedImports` is a rule in the Correctness group, with a default severity of error. It checks whether imported names are actually exported. It doesn’t check dynamic `import()` or `require()`. A run with the actual `node_modules` linked took 243–253ms and produced 553 errors. The code builds and passes tests, but none of those 553 errors were actual errors.

Of those, 499 cases were names such as `describe`, `it`, `expect`, and `vi` imported from Vitest; 28 were `Fragment` and `Suspense` from React; and 25 were imports with Vite’s `?url` and `?worker` suffixes. The remaining case was a single package. The React package’s entry file exports through CommonJS `module.exports`. It is my inference that Biome couldn’t statically find exports of this kind.

Running the same rule without linking `node_modules` produced 4,136 cases in about 700ms. Based on this result, I concluded that it would be difficult to restore ESLint’s `import/no-unresolved` check with project rules in my current code. This conclusion is limited to results from my code.

I checked rule-by-rule times with `--profile-rules`, available since v2.4. This method excludes preprocessing time and adds up rule execution time across threads. In my measurements, `useExhaustiveDependencies` took the longest at 54.6ms and ran 24,086 times. Next were `noFallthroughSwitchClause` at 13.0ms, `noUnusedVariables` at 9.3ms, and `useImportType` at 8.7ms. The full `check` took 215–236ms, including formatting and import sorting. My inference is that the difference from the 122–160ms for linting alone comes from formatting and assist. I also tried to measure oxlint on the same code, but couldn’t measure it this time, so I’m not including it in the speed comparison.

## Features added over two years

The 1.9.4 version I adopted was released on npm on October 17, 2024. v2.0.0 was released on June 17, 2025, and v2.6.8 on November 15, 2026. In between, Biome expanded its support and execution tools in addition to type-aware linting.

v2 added GritQL plugins and monorepo support for keeping multiple configuration files.

v2.3 added experimental support for Vue, Svelte, and Astro, along with new ignore syntax that excludes patterns with `!` and parsing for Tailwind v4 directives. v2.4 checks CSS and GraphQL fragments inside JavaScript and added 15 HTML accessibility rules. `--profile-rules` for measuring rule-by-rule times also arrived in this version.

In v2.5, the number of lint rules passed 500, and `--watch` mode was added. GritQL plugins also gained the ability to suggest code fixes. v2.6 supports Markdown, SCSS, and YAML, and released JavaScript plugins as a developer preview.

The ESLint plugin ecosystem can’t be carried over as-is. GritQL plugins can’t access the semantic model used by Biome’s Rust rules. JavaScript plugins are a developer preview and can change even in patch releases. So there’s no basis for assuming that existing ESLint plugins can be brought over as-is.

According to Biome’s official homepage as of November 15, 2026, Biome is 97% compatible with Prettier and has 816 lint rules. The official documentation doesn’t say how the 97% was measured.

Biome’s downloads have also grown. Comparing npm weekly downloads from November 11–17, 2024, and November 9–15, 2026, Biome increased from 1.24 million to 27.39 million. Over the same periods, ESLint went from 48.06 million to 207.05 million, Prettier from 43.79 million to 184.72 million, and oxlint from 90,000 to 4.828 million.

There are also specific cases where formatting differs from Prettier. When removing quotes from object and class properties, Prettier targets only ES5 identifiers, while Biome removes quotes from identifiers introduced after ES2015 as well. For assignment expressions inside computed keys, Biome removes the parentheses.

## Checks missing from ESLint migration

Some checks were actually lost when I moved to Biome. `import/no-unresolved` and `import/named` weren’t available in Biome 1.9 to check import paths and names, so `tsc` handles this instead in my services. However, based on the `noUnresolvedImports` measurements in the previous section, I concluded that the false diagnostics made it difficult to replace them with project rules.

The check for hook call locations was also lost. It was an error in ESLint, but at adoption time, I left Biome’s `useHookAtTopLevel` disabled. File and folder naming rules were also lost. ESLint’s `check-file` had flagged 336 cases at the time, but Biome only has `useFilenamingConvention` for file names and has no folder naming rule.

Biome 1 also had no check for unhandled Promises. Knowing whether a function’s return value is a Promise requires type information, but Biome 1’s rules only looked at the syntax of a single file. Error monitoring that listens for the browser’s `unhandledrejection` was a safety net that caught only some cases. Biome 2 added `noFloatingPromises`, but it belongs to the Nursery group, and enabling it increases run time.

## Biome 2 migration

Both services still use Biome 1.9.4. I ran `biome migrate --write` on a copy of the current code to check configuration changes and diagnostic differences. `files.include` and `ignore` are combined into `includes`, and exclusion patterns start with `!`. `organizeImports` moves to `assist.actions.source.organizeImports`. Some rules also change names or groups. For example, `noMultipleSpacesInRegularExpressionLiterals` becomes `noAdjacentSpacesInRegex`, and `noWith` and `noVar` move to the Suspicious group.

According to the official upgrade guide, the import sorting method has changed, so it can’t produce exactly the same order as 1.x. There is also a change that removes the need to put `**/` before globs. After migrating the configuration with `biome migrate --write` and running checks, diagnostics for different import sorting appeared in 322 files, and formatting differences appeared in 15 files. Upgrading to Biome 2 requires a commit that fixes these differences all at once.

`biome migrate eslint --write` migrates ESLint rules, globals, overrides, and ignore patterns. It reads both old eslintrc and flat config and follows extends. It sets the rule preset to none and enables only the migrated rules. By default, it migrates only equivalent rules; adding `--include-inspired` migrates similar rules too. The official guide also says to review the result before using it.

`biome migrate prettier --write` explicitly writes all Prettier options to preserve the current output.

## CI checks

In my development workflow, Biome fixes and checks code on editor save and just before a commit. In CI for pull requests and deployment pipelines, `biome ci` checks formatting, linting, and assist without changing files. Commit hooks can be skipped, so CI determines whether the changes pass.

`biome ci --changed` checks only committed changed files by comparing them with the default branch or a base specified with `--since`, and is intended for CI. `--staged` checks only staged files and is intended for local use. You can choose github, gitlab, junit, checkstyle, sarif, rdjson, or summary as the reporter; json is experimental.

## Frequently asked questions

- **Does Biome replace type checking**: No. Type-aware lint rules are available, but in my two services, CI’s `tsc` handles type checking.
- **Is Biome 2’s `noFloatingPromises` a stable rule**: No. It’s still in the Nursery group in 2.6.8, and the official documentation describes it as experimental, with behavior that may change.
- **How much did enabling `noFloatingPromises` increase check time**: In my current code, linting alone took 122–160ms, and adding this rule raised that to 225–262ms.
- **Can Biome’s `noUnresolvedImports` replace the ESLint check**: I concluded that it would be difficult in my code. Even with `node_modules` linked, it produced 553 diagnostics that weren’t actual errors; without it linked, it produced 4,136 cases in about 700ms.
- **Does upgrading to Biome 2 cause large code changes**: In my code, import sorting diagnostics appeared in 322 files, and formatting differences in 15 files.
- **Do all Biome automatic fixes preserve meaning**: No. Safe fixes are guaranteed not to change meaning, but unsafe fixes can, and require `--write --unsafe`.
- **Does `biome ci` change code**: No. It checks formatting, linting, and assist without changing files.
- **Can I use existing ESLint plugins as-is**: GritQL plugins can’t access the semantic model used by Biome’s Rust rules, and JavaScript plugins are a developer preview. The existing ESLint plugin ecosystem can’t be carried over as-is.

## Conclusion

In my two services, Biome brought the settings that actually apply together in one place, and full checks remained around 0.2 seconds even after the number of files had nearly doubled. That result doesn’t mean the set of rules was the same as ESLint’s. You need to consider the checks lost during migration, such as import checks, hook call locations, and folder naming rules, along with the false diagnostics I found in Biome 2’s project rules.

Biome 2 expanded type-aware rules and its support, but on my code the migration changed import sorting in 322 files and formatting in 15 files. If you’re considering switching, I recommend looking at the rules currently applied, the checks you would lose, and the actual conversion diff, as well as speed and configuration consolidation.

:::ref
- [docs] [Biome, Biome v2](https://biomejs.dev/blog/biome-v2/)
- [docs] [Biome, Migrate to Biome v2](https://biomejs.dev/guides/upgrade-to-biome-v2/)
- [docs] [Biome, Migrate from ESLint and Prettier](https://biomejs.dev/guides/migrate-eslint-prettier/)
- [docs] [Biome, Architecture](https://biomejs.dev/internals/architecture/)
- [docs] [Biome, Linter](https://biomejs.dev/linter/)
- [docs] [Biome, Linter domains](https://biomejs.dev/linter/domains/)
- [docs] [Biome, noFloatingPromises](https://biomejs.dev/linter/rules/no-floating-promises/)
- [docs] [Biome, noUnresolvedImports](https://biomejs.dev/linter/rules/no-unresolved-imports/)
- [docs] [Biome, Suppressions](https://biomejs.dev/analyzer/suppressions/)
- [docs] [Biome, CLI](https://biomejs.dev/reference/cli/)
- [docs] [Biome, Differences with Prettier](https://biomejs.dev/formatter/differences-with-prettier/)
:::