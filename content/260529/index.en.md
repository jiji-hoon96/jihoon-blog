---
emoji: 🧭
title: 'Context Files'
seoTitle: "CLAUDE.md, AGENTS.md, SKILL.md: AI Agent Context Files"
date: '2026-05-29'
updatedAt: "2026-10-08"
locale: en
translationOf: '260529'
sourceHash: fed5bdb321dec9666f12273f4c77b5c082799acd8ee57d2aeddff7096e128221
categories: AI Developer-Tools Claude MCP CodeGraph
description: "How agents load CLAUDE.md, AGENTS.md, SKILL.md, and Cursor rules, why instructions get lost, and what an ETH Zurich study says to put in context files."
keywords: "CLAUDE.md, AGENTS.md, SKILL.md, MEMORY.md, Cursor rules, copilot-instructions.md, context files, AI coding agents, Claude Code, ETH Zurich AGENTS.md study"
---

In this post, I want to talk about **the context files that AI coding agents read**.

This is for developers whose projects have piled up `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, and `.cursor/rules` side by side, and who are unsure when each is read and what should go in it. By the end, you will know how the files differ, how agents load them, and a rule of thumb backed by an ETH Zurich study: write down only what the agent cannot infer.

As a frontend developer, I use Claude in my day-to-day work. At some point, that meant a `CLAUDE.md` appeared at the project root, an `AGENTS.md` created by someone else sat beside it, a `.cursorrules` file lingered elsewhere, and I even created a `.claude/skills/` directory after following an article I had come across. (By the time I stopped to take stock, I had about five files containing roughly the same information.)


## Agents Without Persistent Memory

AI coding agents have a fundamental limitation: **they have no persistent memory**. Every session starts from a blank slate. In the next conversation, they cannot remember a convention you agreed on yesterday or a directory structure you explained an hour ago. Context files are the simplest mechanism for addressing this problem. If a project contains a file that is read automatically whenever a session starts, you no longer need to repeat the same explanation every time.

The problem is that each tool created its own file around the same basic idea. Claude Code reads `CLAUDE.md`, Cursor reads `.cursorrules` (now deprecated, with `.cursor/rules` recommended instead), GitHub Copilot reads `.github/copilot-instructions.md`, and OpenAI Codex reads `AGENTS.md`. When a team uses several tools, it can end up copying the same information into four different places.


### CLAUDE.md

`CLAUDE.md` is a file that Claude Code reads automatically at the start of a session. According to Anthropic’s official documentation (`code.claude.com/docs/en/memory`), Claude Code looks for `CLAUDE.md` at the following three levels.

- **User memory** (`~/.claude/CLAUDE.md`): global defaults that apply to every project on the machine
- **Project memory** (`CLAUDE.md` at the project root): committed to git and shared across the team
- **Local memory** (`CLAUDE.md` in a subdirectory): loaded in addition to the others only when working in that directory

When all three levels exist, Claude **reads and concatenates all of them**. It does not choose only one according to precedence; instead, more specific instructions are layered on top, much like the CSS cascade. (This is a merge, not an override.) As a result, scattering rules about the same topic across several levels can create conflicts. (Anthropic’s official documentation explicitly states that behavior is not guaranteed when instructions conflict.)

There is one frequently overlooked detail here: Claude **reads every `CLAUDE.md` it encounters while walking from the current working directory up to the repository root**. If you work inside `packages/ui/` in a monorepo, both the root `CLAUDE.md` and `packages/ui/CLAUDE.md` are loaded. (That is powerful, but it also means the context can quietly expand without you noticing.)


### AGENTS.md

`AGENTS.md` is a standard created to address the proliferation of tool-specific files described above. In December 2025, OpenAI donated this standard to the Linux Foundation’s **Agentic AI Foundation (AAIF)**. According to the [Linux Foundation’s announcement](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation), the AAIF was co-founded by Anthropic, Block, and OpenAI, and its founding projects are three: Anthropic’s MCP (the protocol that connects agents to external systems), Block’s goose, and OpenAI’s `AGENTS.md`. The official site (`agents.md`) states that **more than 60,000 open-source repositories have adopted the file**.

The list of supported tools makes the picture even clearer. It includes OpenAI Codex, Google Jules, VS Code, GitHub Copilot, Cursor, JetBrains Junie, Aider, Devin, Zed, Factory, Warp, goose, opencode, Amp, RooCode, Gemini CLI, Kilo Code, Phoenix, Semgrep, Ona, Windsurf, and Augment Code, among many others. GitHub Copilot began supporting `AGENTS.md` natively in August 2025. One interesting detail is that **native `AGENTS.md` support in Claude Code is still an active feature request**. Claude Code continues to treat `CLAUDE.md` as its primary file.

You might still wonder whether this supposed standard is actually being adopted. The strongest evidence is **dogfooding**—the organizations behind the standard using it themselves.

- The canary branch of **Vercel/Next.js** has an `AGENTS.md` at its root. It is actually a symbolic link to `CLAUDE.md`, whose contents cover the monorepo structure, one-to-two-second iteration with `pnpm --filter=next dev`, testing guidance for both Turbopack and Webpack, the `pr-status` script, and rules for handling environment variables and secrets. The fact that `create-next-app` now generates both `AGENTS.md` and `CLAUDE.md` for new projects reflects the same trend.
- The **OpenAI/codex** repository maintains its own `AGENTS.md`.

A conventional strategy is beginning to emerge: use **`AGENTS.md` as the single source of truth**, while keeping `CLAUDE.md` minimal, with a one-line reference to `AGENTS.md` plus instructions specific to Claude Code. This eliminates duplication, and because Claude Code reads both files, nothing is lost.


### SKILL.md

`SKILL.md` belongs to a different category from the two files above. Whereas `CLAUDE.md` and `AGENTS.md` are **persistent instructions that are always present in the context**, a Skill is an **on-demand capability invoked only when needed**.

A Skill is organized as a directory. The directory contains one `SKILL.md`, scripts executed by the Skill, and any additional Markdown documents. Claude loads that directory only when the current task matches the Skill’s `description`. This is called **progressive disclosure**, a concept established in the UX field by Jakob Nielsen in 1995: advanced or rarely used functions are deferred to secondary screens so users can focus on one task at a time, reducing cognitive load and errors. In the context of Claude Skills, it refers to the mechanism of bringing a Skill’s body into the context only when needed. The result can be a dramatic reduction in context-window costs.

The frontmatter in `SKILL.md` includes several distinctive fields.

- **`description`**: explains when the Skill is needed and acts as the trigger the model uses to decide whether to invoke it
- **`allowed-tools`**: restricts which tools may be used inside the Skill (for example, `"Read, Glob, Grep, Bash(python:*)"`)
- **`disable-model-invocation: true`**: prevents the model from invoking the Skill; only the user can trigger it with a slash command. This is used for operations with side effects, such as deployments and commits
- **`user-invocable: false`**: hides the Skill from the user’s slash-command menu and allows only Claude to invoke it autonomously, for use as background knowledge

Claude Skills launched simultaneously across Claude.ai, Claude Code, the API, and Agent SDK on October 16, 2025. Then, on December 18, 2025, Anthropic published the Skills specification itself as an open standard (`agentskills.io`). Simon Willison even called it “**Skills are awesome, maybe a bigger deal than MCP**,” citing the format’s dramatic simplicity compared with MCP and its use of progressive disclosure to address context-window costs.

MCP (Model Context Protocol), which Skills were compared against here, is a standard protocol that connects an agent to external systems such as Slack, GitHub, or a database so it can call them. If context files are about what to tell the agent, MCP is about what to enable the agent to do. How MCP differs from function calling is covered separately in [MCP and Function Calling](/260524).

The tools that cut the cost of an agent finding relevant code (Repomix, Aider, CodeGraph, Serena) cut different costs depending on how deeply they understand the code. That comparison is covered separately in [Four Tiers of Code Intelligence](/260526).


### Files Used by Other Tools

Cursor’s `.cursorrules` has been **deprecated since version 0.43**. The current official recommendation is to use the `.cursor/rules/` directory and place multiple `.mdc` files inside it. Each `.mdc` file has YAML frontmatter.

- **`description`**: information the agent uses to judge whether the rule is relevant
- **`globs`**: automatically attaches the rule when a matching file is included in the conversation (auto-attach)
- **`alwaysApply`**: when `true`, includes the rule in every conversation without exception (`globs` is ignored in this case)

GitHub Copilot has evolved in a similar direction. Repository-wide instructions live in `.github/copilot-instructions.md`; instructions that require path-specific scope go in `.github/instructions/*.instructions.md`, with globs specified through the frontmatter key `applyTo:`. (Copilot code review has officially supported path-scoped instructions since September 2025.)

Tools beyond Cursor and Copilot are converging on similar patterns. The following table summarizes them.

| Tool | File/Directory | Key Characteristics |
|------|--------------|------|
| **Claude Code** | `CLAUDE.md` (three levels) | Merged along the directory tree |
| **Cursor** | `.cursor/rules/*.mdc` | File-pattern scoping with `globs` |
| **GitHub Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | Supports `applyTo` globs |
| **Cline** | `.clinerules/` directory | Combines all `.md`/`.txt` files; conditional activation with `paths` globs |
| **Continue.dev** | `.continue/rules/*.md` | `name`/`globs`/`alwaysApply` frontmatter |
| **Aider** | `CONVENTIONS.md` + `.aider.conf.yml` | Included with every request; **200 lines or fewer recommended** |
| **Windsurf** | `.windsurfrules` + `global_rules.md` | Two levels: global and project |
| **Standard** | `AGENTS.md` (AAIF) | Adopted by 60,000+ repositories |

**Aider’s `CONVENTIONS.md` is particularly interesting**. Because the official documentation says this entire file is included in the context with every request, it explicitly instructs users to **“keep it under 200 lines.”** (In effect, Aider recognized this limitation early and tells users about it directly.)


### MEMORY.md

Separate from the files above, another pattern is appearing with increasing frequency: `MEMORY.md`. It is not an official standard, but an organically developed community convention for **recording decisions and mistakes over time**.

```markdown
## 2026-04-10
Pages Router에서 App Router로 이전. 신규 라우트는 App Router 컨벤션 사용.

## 2026-04-22
Prisma 쿼리 결과에 optional chaining 쓰지 말 것 — null은 if-check로 명시적 처리.
(이전에 옵셔널 체이닝으로 null을 흘려보내 프로덕션 이슈 발생.)
```

If `CLAUDE.md` or `AGENTS.md` records **the rules as they stand today**, `MEMORY.md` records **the history of why those rules were created**. (The two are complementary, not interchangeable.)


### How Agents Read These Files

So far, we have cataloged the files that exist. But one surprisingly common question remains unanswered: **where, exactly, do agents load these files, and how?** Understanding this mechanism makes it easier to see why the ETH Zurich results discussed later—showing that context-file instructions are not followed reliably—emerged.

First, one essential fact: **`CLAUDE.md` is injected as a user message, not as part of the system prompt.** Anthropic’s official documentation states the following.

::::quote
:::translation
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::

:::original
CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance.
:::
::::

In other words, it is contextual guidance rather than an enforced rule. The official guidance recommends using a separate mechanism, such as a `PreToolUse` hook, when you need to enforce a specific behavior.

The load order progresses from broad → specific. More precisely, it is managed policy (organization-level settings) → the user’s global file (`~/.claude/CLAUDE.md`) → the project file (`./CLAUDE.md`) → the local file (`./CLAUDE.local.md`). Within the same directory, `CLAUDE.md` comes before `CLAUDE.local.md`. By taking advantage of the fact that **the nearest instructions are read last**, you can make more specific rules exert a stronger influence, thanks to the LLM’s recency bias.

The `@import` syntax is especially interesting. If you put `@path/to/file` anywhere in the body of CLAUDE.md, that file is expanded in place and loaded with it. **The maximum recursion depth is 4 hops**, and relative paths are resolved from the file containing the import statement. That is why the official recommendation is to bridge to `@AGENTS.md`. If you leave `CLAUDE.md` almost empty and put only `@AGENTS.md` in it, Claude Code will naturally read AGENTS.md as well. (Given that Claude Code does not yet support AGENTS.md natively, this is the cleanest workaround.)

The token implications also deserve attention. CLAUDE.md has no explicit token limit, so **the entire file is loaded if it exists**. The official recommendation, however, is to keep **each file under 200 lines**. Beyond 200 lines, it is said to “consume more context and may reduce adherence.” Interestingly, in Claude 4.x, **merely enabling tool use automatically adds 346 tokens via a special system prompt** (with `tool_choice: auto`). Context leaks away in ways that are easy to miss.

Cursor takes a different approach. Rules in `.cursor/rules/*.mdc` operate in four modes.

- **Always Apply**: included in every chat without exception; ignores globs/description
- **Apply Intelligently** (Agent Requested): the agent reads `description`, determines relevance, and pulls in the rule
- **Apply to Specific Files** (Auto Attached): activated when a file matching the glob pattern enters the context
- **Apply Manually**: explicitly invoked by the user with `@rule-name`

Other tools differ again. OpenAI Codex walks from the git repository root toward cwd, collects every `AGENTS.md`, and injects them **immediately before the user prompt**. GitHub Copilot inserts `.github/copilot-instructions.md` at a middle priority within the context window: “after edit context and explicit references, but before loosely related open files.” Because the load timing, precedence, and merge rules vary by tool even for the same `AGENTS.md` file, **there is no guarantee that three tools will interpret it in exactly the same way.**

That leaves a more fundamental question: **why does a model follow only some instructions that are present in its context?** Simply saying “because the instructions are long” is not enough. The phenomenon is rooted in structural limitations of LLMs.

### Hallucination and Context Forgetting

If you have ever seen an AI agent confuse the conversational context or forget something that was clearly stated earlier, that is a form of **hallucination**. People usually think of hallucination first as “making up facts that do not exist,” but the academic literature divides it into three categories. A 2023 survey by Yue Zhang and colleagues (“Siren’s Song in the AI Ocean”) classifies them as **input-conflicting** (generating something inconsistent with what the user explicitly provided), **context-conflicting** (contradicting something the model previously generated), and **fact-conflicting** (disagreeing with world knowledge). Ignoring instructions in a context file belongs to the **first category**, not the third. The model processes the input while treating part of its information as though it were not there.

The deeper problem is that hallucination **cannot be eliminated in principle**. A research team at the National University of Singapore proved this mathematically using learning theory. No LLM can learn every computable function; therefore, as long as it is used as a general-purpose problem solver, it must hallucinate at some point.

Position effects matter as well. Stanford researchers demonstrated experimentally that models reference relevant information most effectively when it appears **at the beginning or end of the context window**, while performance drops sharply when that information is **buried in the middle**. This maps directly onto context files. `CLAUDE.md` is inserted somewhere in the middle by the load order, and as a conversation grows longer, its instructions are pushed further into the “middle” of the context. This also connects to the other side of the recency bias mentioned earlier: within the primacy-recency effect, **the middle is the weakest region**.

Taken together, these phenomena form a coherent picture. A context file is merely **additional text inserted outside the system prompt before the LLM’s first user turn**. It is not a mechanism that forces the model’s decisions; it is simply another block of tokens dropped into the context window. The longer the file and the longer the conversation, the farther its instructions drift toward the “middle,” and the less reliably they are referenced. The ETH Zurich results quantitatively confirm this structural limitation.


### The ETH Zurich Study

Many people may have thought, “Then I should put as much as possible into these files.” A recent study directly challenges that intuition: the ETH Zurich research referenced throughout the preceding section.

The paper, “Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?”, was published by an ETH Zurich research team in February 2026. The researchers evaluated four agents—Claude Code (Sonnet-4.5), Codex (GPT-5.2 / GPT-5.1 mini), and Qwen Code—on a benchmark of 138 real-world Python software-engineering tasks (AGENTBENCH) and on SWE-bench Lite. The results were unexpected.

- **LLM-generated context files** actually **reduced task success rates** by about 0.5% on SWE-bench Lite and 2% on AGENTBENCH
- Even **human-authored files** produced only a modest average improvement of about 4%
- Adding a context file **increased inference costs by more than 20% per instance**
- Context files had an even smaller effect on the stronger model (GPT-5.2), because more capable models already have sufficient parametric knowledge and additional context can become noise

There was one exception: **specifying a nonstandard tool**. When the Python package manager `uv` was named in the context, for example, the agent’s use of `uv` rose from 0.01 times per instance to 1.6 times—an increase of **roughly 160×**.

Aider’s “200-line recommendation”—keep the file short because it enters the context every time—is practical guidance, while the ETH Zurich study quantitatively demonstrates that long context files reduce performance statistically. I see the following practical implications in the research.

- **A huge, automatically generated context file can do more harm than good**. If you cram coding standards, architecture, and workflows into a 300-line `CLAUDE.md`, the agent will follow some of them and ignore the rest. That inconsistency can produce worse results than having no context at all.
- **What absolutely belongs in the file is information that cannot be inferred**. This includes nonstandard tools, project-specific conventions, and past failure cases. The model already knows general coding best practices.
- Use AGENTS.md as the single source, keep CLAUDE.md limited to brief tool-specific instructions, and move detailed workflows into Skills.


## So, What Does This Mean?

Context files differ from tool to tool in name, location, and when they are read. This article alone covered CLAUDE.md, AGENTS.md, SKILL.md, Cursor rules, copilot-instructions.md, and MEMORY.md, and which tool supports which file keeps changing. Memorizing a list of files goes stale quickly.

That is why my goal here was not to recommend a particular file format, but to develop **an eye for how agents actually read these files**. Once you understand why CLAUDE.md is injected as a user message, why different tools read the same AGENTS.md differently, and why instructions weaken in the middle of the context, a new context file format becomes much easier to read: “This is when it gets loaded, and this is how strongly it acts.”

What remains, ultimately, is one intuition from the ETH Zurich study: **the model already knows a great deal**. Stuffing a context file with everything you can think of does not make the agent follow it more faithfully. It is better to keep only what the model is unlikely to know—project-specific conventions, nonstandard tools, and past mistakes—and remove the rest. Writing a long context file and writing a good one are different problems.

Rather than expanding CLAUDE.md to hundreds of lines right away, I encourage readers to dig, at least once, into when, where, and how strongly the tools they already use read that file. I believe that understanding provides a stable foundation, however file formats change.


## References

:::ref
- [docs] [Claude Code Memory, Anthropic](https://code.claude.com/docs/en/memory)
- [docs] [Anthropic Tool Use Overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [docs] [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [paper] [ETH Zurich, "Evaluating AGENTS.md" (2602.11988)](https://arxiv.org/abs/2602.11988)
- [paper] [Yue Zhang et al., "Siren's Song" (2309.01219)](https://arxiv.org/abs/2309.01219)
- [paper] [Ziwei Xu et al., "Hallucination is Inevitable" (2401.11817)](https://arxiv.org/abs/2401.11817)
- [paper] [Nelson F. Liu et al., "Lost in the Middle" (2307.03172)](https://arxiv.org/abs/2307.03172)
- [article] [Simon Willison, "Claude Skills are awesome"](https://simonwillison.net/2025/Oct/16/claude-skills/)
:::
