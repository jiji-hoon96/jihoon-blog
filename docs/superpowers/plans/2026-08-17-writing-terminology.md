# Writing Guidance and Terminology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop destructive over-translation, standardize technical terms, and incorporate writing-as-research guidance into authoring and refinement workflows.

**Architecture:** A repository glossary is the machine-readable source for preserved and first-use terms. The three existing authoring guides state the same policy at different levels, and a content audit corrects recent posts without rewriting unrelated prose.

**Tech Stack:** Markdown, YAML, Node test runner, ripgrep

**Spec:** `docs/superpowers/specs/2026-08-17-global-multilingual-blog-design.md`

## Global Constraints

- Preserve user changes already present in all three guide files.
- Do not translate identifiers, product names, code symbols, or clearer industry English.
- Normalize `Computer Science`; reject `computer siense` case-insensitively.
- First-use explanations are optional and must improve understanding.

---

### Task 1: Versioned terminology policy

**Files:**
- Create: `content/terminology.yml`
- Create: `scripts/validate-terminology.mjs`
- Create: `scripts/validate-terminology.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm content:terms`, which rejects banned spellings and known destructive calques while allowing first-use explanations.

- [ ] **Step 1: Write failing validator tests**

Fixtures cover `computer siense`, `벽시계 경과`, valid `Computer Science`, and valid `wall-clock time(실제 경과 시간)`.

- [ ] **Step 2: Confirm failure**

Run: `node --test scripts/validate-terminology.test.mjs`

Expected: FAIL because the validator is absent.

- [ ] **Step 3: Add glossary entries and validator**

The initial glossary includes `wall-clock time`, `Computer Science`, `OpenTelemetry`, `React Server Components`, `ubiquitous language`, API, SDK, LLM, MCP, and SEO. Each entry records `preserve`, optional locale forms, and banned spellings.

- [ ] **Step 4: Add and verify the package command**

Run: `pnpm content:terms`

Expected: initially FAIL on current recent-post occurrences, proving the audit is required.

- [ ] **Step 5: Commit policy tooling**

```bash
git add content/terminology.yml scripts/validate-terminology.mjs scripts/validate-terminology.test.mjs package.json
git commit -m "feat: add technical terminology policy"
```

### Task 2: Authoring and refinement guide changes

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.claude/commands/write-post.md`
- Modify: `.claude/commands/refine-post.md`

**Interfaces:**
- Consumes: `content/terminology.yml`.
- Produces: consistent authoring and review instructions.

- [ ] **Step 1: Replace mandatory translation language**

Replace “전문 용어는 반드시 풀이 병기” and equivalent checklist text with the approved preservation, first-use explanation, searchability, and precision rules.

- [ ] **Step 2: Add writing-as-research workflow**

Add question, initial hypothesis, challengeable claim, original problem, mind-change evidence, fact/inference/opinion separation, conclusion-first intro rewrite, learning signal, expertise limits, and non-destructive review guidance.

- [ ] **Step 3: Preserve existing dirty-file additions**

Review `git diff -- CLAUDE.md .claude/commands/write-post.md .claude/commands/refine-post.md` and confirm the pre-existing quote-density, visual-material, and first-party-depth sections remain intact.

- [ ] **Step 4: Run terminology and literal guidance checks**

Run: `rg -n "반드시 풀이 병기|영어 약어/전문 용어는 반드시" CLAUDE.md .claude/commands`

Expected: no matches.

- [ ] **Step 5: Commit only the intended guide hunks**

Stage guide changes carefully without dropping or rewriting unrelated user changes.

### Task 3: Recent and existing Korean-post terminology audit

**Files:**
- Modify: `content/260703/index.md`
- Audit and modify only confirmed findings in: `content/240706/index.md`, `content/240818/index.md`, `content/241201/index.md`, `content/250520/index.md`, `content/251117/index.md`, `content/260104/index.md`, `content/260201/index.md`, `content/260302/index.md`, `content/260328/index.md`, `content/260418/index.md`, `content/260518/index.md`, `content/260529/index.md`, `content/260610/index.md`, `content/260611/index.md`, `content/260617/index.md`, `content/260622/index.md`, and `content/260723/index.md`

**Interfaces:**
- Produces: Korean source posts that pass `pnpm content:terms` and retain precise searchable technical terms.

- [ ] **Step 1: Generate the audit report**

Run the validator over all Korean `index.md` files and review English identifiers translated into uncommon Korean calques.

- [ ] **Step 2: Correct wall-clock terminology surgically**

At the first occurrence use `wall-clock time(실제 경과 시간)` and use `wall-clock time` thereafter. Preserve the article's claim and measurements.

- [ ] **Step 3: Correct other confirmed over-translations**

Only change glossary-backed findings. Do not globally replace ordinary Korean words or rewrite authorial voice.

- [ ] **Step 4: Verify all Korean sources**

Run: `pnpm content:terms && pnpm test && pnpm build`

Expected: PASS.

- [ ] **Step 5: Commit the terminology audit**

```bash
git add content/*/index.md
git commit -m "docs: preserve precise technical terminology"
```
