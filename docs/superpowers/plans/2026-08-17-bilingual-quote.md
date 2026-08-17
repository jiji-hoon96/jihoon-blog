# Bilingual Quote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render English-source quotations with a primary Korean translation above a smaller, muted English original, and migrate every qualifying existing post.

**Architecture:** A focused remark plugin converts a `quote` container containing one `translation` and one `original` child directive into semantic HTML. Existing prose CSS styles only the generated classes, while the content migration changes verified English-source quotations and leaves ordinary blockquotes untouched.

**Tech Stack:** Next.js 16, Contentlayer, unified/remark directives, TypeScript, Node test runner, CSS

**Spec:** `docs/superpowers/specs/2026-08-17-bilingual-quote-design.md`

## Global Constraints

- Authors enter both the Korean translation and English original manually.
- Korean appears first at normal reading prominence; English appears below at `0.8125rem` in a muted color.
- No divider appears between the two languages.
- Each `quote` has exactly one non-empty `translation` and one non-empty `original`; invalid content fails the build.
- Existing ordinary blockquotes and unrelated directives retain their behavior.
- English text comes from the linked primary source, never reverse translation or guessing.
- Preserve all unrelated dirty-worktree changes and stage only files owned by each task.

---

### Task 1: Directive transformation and validation

**Files:**
- Create: `src/lib/remark-bilingual-quote.ts`
- Create: `src/lib/remark-bilingual-quote.test.mjs`
- Modify: `contentlayer.config.ts`

**Interfaces:**
- Consumes: remark AST nodes produced by `remark-directive`
- Produces: `remarkBilingualQuote(): (tree: AstNode) => void`
- Produces HTML properties: `blockquote.bilingual-quote`, `.quote-translation[lang=ko]`, `.quote-original[lang=en]`

- [ ] **Step 1: Write the failing transformation test**

Create a real directive-shaped AST with a `quote` parent and both child directives. Run the transformer and assert the literal `hName` and `hProperties` values:

```js
test('turns a complete quote directive into a bilingual blockquote', () => {
  const tree = quoteTree({
    translation: [{ type: 'paragraph', children: [{ type: 'text', value: '한국어 번역' }] }],
    original: [{ type: 'paragraph', children: [{ type: 'text', value: 'English original' }] }],
  })

  remarkBilingualQuote()(tree)

  const quote = tree.children[0]
  assert.deepEqual(quote.data, {
    hName: 'blockquote',
    hProperties: { className: ['bilingual-quote'] },
  })
  assert.deepEqual(quote.children[0].data, {
    hName: 'div',
    hProperties: { className: ['quote-translation'], lang: 'ko' },
  })
  assert.deepEqual(quote.children[1].data, {
    hName: 'div',
    hProperties: { className: ['quote-original'], lang: 'en' },
  })
})
```

- [ ] **Step 2: Write failing validation and isolation tests**

Add table-driven cases for missing, duplicate, and empty children. Each must throw `Invalid bilingual quote: expected exactly one non-empty translation and original`. Add an ordinary `{ type: 'blockquote' }` fixture and assert it remains deeply equal to a pre-transform copy.

- [ ] **Step 3: Run the focused test and confirm RED**

Run: `node --test src/lib/remark-bilingual-quote.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `remark-bilingual-quote.ts`.

- [ ] **Step 4: Implement the minimal transformer**

Use local structural types so the plugin adds no dependency and introduces no `any`:

```ts
import { visit } from 'unist-util-visit'

type AstData = {
  hName?: string
  hProperties?: Record<string, unknown>
}

type AstNode = {
  type: string
  name?: string
  value?: string
  children?: AstNode[]
  data?: AstData
}

const ERROR_MESSAGE =
  'Invalid bilingual quote: expected exactly one non-empty translation and original'

function hasContent(node: AstNode): boolean {
  if (typeof node.value === 'string' && node.value.trim()) return true
  return node.children?.some(hasContent) ?? false
}

export function remarkBilingualQuote() {
  return (tree: AstNode) => {
    visit(tree, 'containerDirective', (node: AstNode) => {
      if (node.name !== 'quote') return

      const translations = node.children?.filter(
        child => child.type === 'containerDirective' && child.name === 'translation',
      ) ?? []
      const originals = node.children?.filter(
        child => child.type === 'containerDirective' && child.name === 'original',
      ) ?? []

      if (
        translations.length !== 1 ||
        originals.length !== 1 ||
        !hasContent(translations[0]) ||
        !hasContent(originals[0])
      ) {
        throw new Error(ERROR_MESSAGE)
      }

      node.data = {
        hName: 'blockquote',
        hProperties: { className: ['bilingual-quote'] },
      }
      translations[0].data = {
        hName: 'div',
        hProperties: { className: ['quote-translation'], lang: 'ko' },
      }
      originals[0].data = {
        hName: 'div',
        hProperties: { className: ['quote-original'], lang: 'en' },
      }
    })
  }
}
```

- [ ] **Step 5: Register the plugin after `remarkDirective`**

Import `remarkBilingualQuote` in `contentlayer.config.ts` and append it after the existing directive-aware remark plugins so it sees parsed directive nodes without affecting rehype behavior.

- [ ] **Step 6: Verify GREEN and type safety**

Run:

```bash
node --test src/lib/remark-bilingual-quote.test.mjs
npx tsc --noEmit
npx eslint src/lib/remark-bilingual-quote.ts src/lib/remark-bilingual-quote.test.mjs
```

Expected: all exit 0; the focused test reports all transformation, validation, and isolation cases passing.

- [ ] **Step 7: Commit only Task 1 files**

```bash
git add src/lib/remark-bilingual-quote.ts src/lib/remark-bilingual-quote.test.mjs contentlayer.config.ts
git commit -m "feat: add bilingual quote directive"
```

### Task 2: Bilingual quote visual hierarchy

**Files:**
- Modify: `src/styles/prose.css`

**Interfaces:**
- Consumes: classes emitted by `remarkBilingualQuote`
- Produces: Korean-first visual hierarchy in light and dark themes

- [ ] **Step 1: Add class-scoped styles beside the existing blockquote rules**

Add selectors with no changes to the base blockquote rules:

```css
.prose .bilingual-quote .quote-translation {
  color: var(--color-light-black80);
  font-size: 1rem;
}

.dark .prose .bilingual-quote .quote-translation {
  color: var(--color-dark-black80);
}

.prose .bilingual-quote .quote-original {
  margin-top: 0.75rem;
  color: var(--color-light-gray60);
  font-size: 0.8125rem;
  line-height: 1.65;
}

.dark .prose .bilingual-quote .quote-original {
  color: var(--color-dark-gray60);
}
```

- [ ] **Step 2: Verify the stylesheet and unchanged base blockquote behavior**

Run: `npx eslint src/lib/remark-bilingual-quote.ts && git diff --check -- src/styles/prose.css`

Expected: exit 0 and no whitespace errors. Inspect the diff to confirm there is no border or divider declaration and all selectors begin with `.bilingual-quote`.

- [ ] **Step 3: Commit only the stylesheet**

```bash
git add src/styles/prose.css
git commit -m "style: emphasize Korean in bilingual quotes"
```

### Task 3: Migrate verified English-source quotations

**Files:**
- Modify: `content/251117/index.md`
- Modify: `content/260104/index.md`
- Modify: `content/260302/index.md`
- Modify: `content/260418/index.md`
- Modify: `content/260529/index.md`
- Modify: `content/260703/index.md`
- Modify: `content/260723/index.md`

**Interfaces:**
- Consumes: the four-level `::::quote` syntax defined in the spec
- Produces: complete Korean-first bilingual quotation content

- [ ] **Step 1: Build and classify the final inventory**

Run: `rg -n -B 2 -A 2 '^> ' content/*/index.md`

Classify the confirmed English-source quotations as follows:

| Post | Expected bilingual quotes | Source family |
|---|---:|---|
| `251117` | 1 | React documentation |
| `260104` | 1 | TanStack Query documentation |
| `260302` | 1 | Andrej Karpathy original post |
| `260418` | 5 | Evans, Fowler, Jason Swett, Alex Bespoyasov sources already named in the post |
| `260529` | 1 | Anthropic documentation |
| `260703` | 5 | Charity Majors, OpenTelemetry, Gray Failure paper, DORA, METR |
| `260723` | 5 | Fowler, Evans, Clark/Brennan, Argyris, DORA/Westrum |

Keep Korean dialogue, author-written emphasis, and Korean-source quotations as ordinary `>` blocks.

- [ ] **Step 2: Verify every English original against its linked primary source**

Open the source link already adjacent to each quotation. Record no new prose: copy only the exact quoted English already present or the exact English corresponding to an existing Korean translation. If a source cannot confirm the sentence, leave that block unchanged and report it instead of inventing an original.

- [ ] **Step 3: Convert each confirmed block to the directive**

Use this exact ordering for every migrated quote:

```md
::::quote
:::translation
완전한 한국어 번역문
:::

:::original
Exact English original, preserving links and emphasis where present.
:::
::::
```

Translate meaning rather than English word order, preserve technical names such as Error Boundary, query key, zero-code instrumentation, and differential observability, and do not add claims absent from the original.

- [ ] **Step 4: Check migration completeness and directive balance**

Run:

```bash
rg -n '^> [A-Za-z]' content/*/index.md
rg -n '^::::quote|^:::translation|^:::original|^::::$' content/*/index.md
```

Expected: the first command returns no qualifying English-source quotation left in a plain blockquote. Review any remaining hits as code, dialogue, or intentionally unchanged content. Each `quote`, `translation`, and `original` opening has a matching close.

- [ ] **Step 5: Commit only migrated posts**

```bash
git add content/251117/index.md content/260104/index.md content/260302/index.md content/260418/index.md content/260529/index.md content/260703/index.md content/260723/index.md
git commit -m "content: add Korean-first bilingual quotes"
```

### Task 4: End-to-end content verification

**Files:**
- Verify only; fix only files owned by Tasks 1-3 if a verification failure traces to this feature

**Interfaces:**
- Consumes: registered plugin, scoped styles, migrated Markdown
- Produces: build evidence that all content compiles and renders in the intended order

- [ ] **Step 1: Run the complete automated checks**

Run:

```bash
npm test
npx tsc --noEmit
npx eslint src/lib/remark-bilingual-quote.ts src/lib/remark-bilingual-quote.test.mjs
npm run build
git diff --check
```

Expected: tests, types, targeted lint, build, and diff check all exit 0. If repository-wide lint is run, separate pre-existing failures from files changed by this feature.

- [ ] **Step 2: Inspect representative generated HTML**

Check generated output for post `260703`. Confirm the Korean translation text occurs before the matching English original, the wrapper has `class="bilingual-quote"`, and the child elements have `lang="ko"` and `lang="en"` respectively.

- [ ] **Step 3: Review final scope**

Run: `git status --short` and `git diff HEAD~3 --stat`.

Expected: feature commits touch only the plugin, its test, Contentlayer configuration, prose styles, the seven migrated posts, and this plan/spec documentation. Unrelated pre-existing worktree changes remain unstaged and intact.
